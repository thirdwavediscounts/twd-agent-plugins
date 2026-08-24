#!/usr/bin/env bash
#
# Run the CI `verify` job locally, in an ephemeral Linux container.
#
# LOCAL ONLY — lives under .claude/ (gitignored) on purpose. Per Sean, the
# pipeline tooling is not pushed to GitHub. Nothing here may be moved into the
# tracked tree.
#
# WHY THIS EXISTS
#   Running the gates in your working tree does not prove much: the tree is the
#   dirty thing. Two real bugs in one day made the point — a stale
#   node_modules/@supabase/auth-js directory hid a type error that only failed
#   on a clean install, and leftover .next/ files produce ~14,600 lint errors
#   that exist on no other machine. This runs against a fresh clone with
#   node_modules rebuilt from the lockfile alone, on Linux, so neither happens.
#
#   It is also the answer to an exhausted GitHub Actions allowance: a verify
#   run costs ~10 minutes of a 2,000-minute monthly budget. Measured
#   2026-07-27: this takes 3m39s against GitHub's ~9m40s, and costs nothing.
#
# THE PINNING IS LOAD-BEARING
#   --cpuset-cpus/--memory pin the container to GitHub's standard runner (2
#   cores, 7 GB) so timing-marginal tests fail HERE the way they fail THERE.
#   Do NOT "simplify" this to --cpus=2: that caps CPU time but leaves nproc
#   reporting the host's core count, so vitest and turbo size their worker
#   pools for a machine the container does not have. The resulting
#   oversubscription produced a spurious RED on a commit that changed only a
#   vercel.json and a markdown file — and was 2x slower (305s vs 155s).
#
# WHAT IT STILL CANNOT DO
#   It runs on the host's CPU architecture — arm64 on Apple Silicon, where
#   GitHub is x86_64 — so native-binary differences (sharp, esbuild) can hide.
#   Pass --amd64 to close that via emulation; much slower, worth it before a
#   risky merge rather than on every run. And it only runs when invoked, so it
#   cannot gate Dependabot PRs or branches nobody looks at.
#
# USAGE
#   ci-local.sh                 # HEAD
#   ci-local.sh my-branch       # any ref
#   ci-local.sh HEAD --amd64    # emulate GitHub's x86_64
#   ci-local.sh HEAD --skip-parity
set -uo pipefail

REF="HEAD"
PLATFORM=""
SKIP_PARITY=""
for arg in "$@"; do
  case "$arg" in
    --amd64) PLATFORM="--platform=linux/amd64" ;;
    --skip-parity) SKIP_PARITY=1 ;;
    -h|--help) sed -n '2,44p' "$0"; exit 0 ;;
    *) REF="$arg" ;;
  esac
done

REPO="$(git rev-parse --show-toplevel)" || exit 1
SHA="$(git -C "$REPO" rev-parse "$REF")" || { echo "unknown ref: $REF"; exit 1; }

# --- parity self-check --------------------------------------------------------
# This script is a hand-maintained copy of .github/workflows/ci.yml. A copy that
# silently rots is worse than none, because it reports GREEN for a gate that no
# longer exists. Normally this would be a committed guard test; since the
# tooling stays out of the repo, the check lives here and runs every time.
if [ -z "$SKIP_PARITY" ]; then
  PARITY="$(node -e '
    const fs = require("node:fs");
    const yml = fs.readFileSync(process.argv[1], "utf8");
    const sh = fs.readFileSync(process.argv[2], "utf8");
    const body = yml.slice(yml.indexOf("jobs:"));
    const cmds = [...new Set(
      [...body.matchAll(/^\s*(?:- )?(?:run: )?(pnpm [^\n\\]+?)\s*\\?$/gm)].map((m) => m[1].trim()),
    )];
    if (cmds.length < 8) { console.log("BROKEN"); process.exit(0); }
    const missing = cmds.filter((c) => !sh.includes(c));
    console.log(missing.length ? "MISSING\n" + missing.join("\n") : "OK");
  ' "$REPO/.github/workflows/ci.yml" "$0" 2>/dev/null)"

  case "$PARITY" in
    OK) ;;
    BROKEN)
      echo "!!! parity self-check could not parse .github/workflows/ci.yml." >&2
      echo "!!! Re-check it by hand, or re-run with --skip-parity." >&2
      exit 2 ;;
    *)
      echo "!!! DRIFT: .github/workflows/ci.yml runs commands this script does not:" >&2
      echo "$PARITY" | tail -n +2 | sed 's/^/!!!   /' >&2
      echo "!!! A green here would NOT mean a green there. Add them, or --skip-parity." >&2
      exit 2 ;;
  esac
fi
# -----------------------------------------------------------------------------

if ! docker info >/dev/null 2>&1; then
  echo "Docker daemon is not running. Start Docker Desktop and retry." >&2
  exit 1
fi

NODE_TAG="node:$(tr -d ' \n' < "$REPO/.nvmrc")-bookworm"
echo "### ephemeral CI  ref=$REF  sha=${SHA:0:8}  image=$NODE_TAG ${PLATFORM:+($PLATFORM)}"
echo "### container is --rm; only the pnpm/playwright cache volumes persist"

# shellcheck disable=SC2086
docker run --rm -i $PLATFORM \
  --cpuset-cpus="0,1" --memory=7g \
  -v "$REPO:/host-repo:ro" \
  -v twd-ci-pnpm-store:/pnpm-store \
  -v twd-ci-pw-cache:/pw-cache \
  "$NODE_TAG" bash -s -- "$SHA" <<'INNER'
set -uo pipefail
SHA="$1"
fail=0
step() {
  local name="$1"; shift
  local t0=$SECONDS
  echo "::::: STEP: $name"
  if "$@" > /tmp/step.log 2>&1; then
    echo "::::: PASS: $name ($((SECONDS-t0))s)"
  else
    echo "::::: FAIL: $name ($((SECONDS-t0))s)"
    tail -40 /tmp/step.log
    fail=1
  fi
}

echo "::::: $(uname -srm) | node $(node -v) | nproc=$(nproc) | mem=$(free -g | awk '/Mem:/{print $2}')G"
git clone -q /host-repo /work && cd /work && git checkout -q "$SHA"
echo "::::: HEAD $(git log --oneline -1)"

corepack enable >/dev/null 2>&1
pnpm config set store-dir /pnpm-store >/dev/null 2>&1
export PLAYWRIGHT_BROWSERS_PATH=/pw-cache
START=$SECONDS

# --- steps mirror .github/workflows/ci.yml `verify`, in order -----------------
step "Install"                          pnpm install --frozen-lockfile
step "No tracked server node_modules"   bash -c "test -z \"\$(git ls-files 'apps/*/server/node_modules' 'apps/*/node_modules')\""
step "Build, test, typecheck, lint"     pnpm turbo run build test typecheck lint
step "Install Chromium"                 pnpm --filter product-research exec playwright install --with-deps chromium
step "Unauthenticated browser smoke"    pnpm --filter product-research run test:e2e:unauth
step "Coverage ratchet"                 pnpm --filter product-research run test:coverage
step "Backend registry is up to date"   bash -c "pnpm --filter product-research run gen:registry && git diff --exit-code apps/product-research/backend/registry.generated.ts"
step "Audit production dependencies"    pnpm audit --prod --audit-level=high
step "Audit the full dependency graph"  pnpm audit --audit-level=high
step "Validate the dependency tree"     pnpm ls -r --depth Infinity
# -----------------------------------------------------------------------------

echo "::::: TOTAL $((SECONDS-START))s"
echo "::::: OVERALL: $([ $fail -eq 0 ] && echo GREEN || echo RED)"
exit $fail
INNER
