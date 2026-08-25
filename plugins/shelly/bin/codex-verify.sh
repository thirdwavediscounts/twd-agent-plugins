#!/bin/bash
# Codex seat of /shelly:verify-work — blind runtime verification of a claim.
# Same shape as codex-review-diff.sh: plain `codex exec`, structured verdict,
# validated output. Sandbox is workspace-write with network access so the
# verifier can run tests/tsx/curl against a local or staging surface.
#
# Usage: bash codex-verify.sh "<behavior claim>" "<surface: how to reach it>"
# Run from inside the worktree under verification.
# Prints the verification to stdout. Exit 0 = a valid verdict came back.
# Exit 1 = pre-check failure, codex failure, or no valid verdict line.

set -uo pipefail

command -v codex &>/dev/null || { echo "ERROR: codex CLI not found." >&2; exit 1; }
git rev-parse --git-dir &>/dev/null || { echo "ERROR: not inside a git repo." >&2; exit 1; }
[ $# -ge 2 ] || { echo "Usage: codex-verify.sh \"<claim>\" \"<surface>\"" >&2; exit 1; }

CLAIM="$1"
SURFACE="$2"

TEMPLATE=$(cat <<'PROMPT_EOF'
You are an independent runtime verifier giving a cross-model attestation. Someone claims this repository's current working tree makes a specific behavior true. Prove or refute it by running the real thing — you did not build it and have no stake in it passing.

Blind rules: do NOT run 'git diff', 'git log', or 'git show', and do not hunt for what changed. Reading source is allowed only to find how to reach the surface, never to decide the verdict. The verdict comes from executed output.

Claim: __CLAIM__

Surface (how to reach the running thing): __SURFACE__

Protocol:
1. Derive the smallest repro of the claim from the claim alone and run it on the surface; capture output verbatim.
2. Falsify: break the input deliberately (wrong id, missing field, the pre-fix condition) and confirm the check fails. An assertion that cannot fail is not evidence.
3. Command-line only (tests, tsx, curl) — you have no browser. Write scratch files only under a temp directory; leave the worktree untouched. Production is read-only. Never read, cat, grep, sed, or head any `.env*` file — env reaches a process only via `--env-file=<abs path>` or the app's own loader; variable names live in `.env.example`. A redaction filter is a backstop, never permission to read.
4. If a command fails twice for environmental reasons, stop and report COULD_NOT_VERIFY with the failure — do not improvise around the surface.

Structure your report exactly as:

# Codex Verification

## Verdict
One of: VERIFIED | NOT_VERIFIED | COULD_NOT_VERIFY

## Repro
The commands you ran, in order.

## Evidence
Verbatim output of the repro and the falsification run.

## Notes
Blockers, flakiness, surprising behavior beside the claim. 'None' if clean.

The Verdict section must contain exactly one of the three tokens on its own line.
PROMPT_EOF
)
# Inject args via literal pattern-substitution so backticks in the template and
# any shell metacharacters in the claim/surface are never interpreted (the old
# double-quoted assignment ran the template's `.env` backticks as commands).
PROMPT="${TEMPLATE//__CLAIM__/$CLAIM}"
PROMPT="${PROMPT//__SURFACE__/$SURFACE}"

OUT=$(codex exec --sandbox workspace-write -c 'model_reasoning_effort="high"' -c sandbox_workspace_write.network_access=true "$PROMPT" 2>&1)
STATUS=$?
echo "$OUT"

[ $STATUS -eq 0 ] || { echo "ERROR: codex exec exited $STATUS." >&2; exit 1; }
grep -qE '^(VERIFIED|NOT_VERIFIED|COULD_NOT_VERIFY)$' <<<"$OUT" || {
  echo "ERROR: no valid verdict token in verification output." >&2
  exit 1
}
