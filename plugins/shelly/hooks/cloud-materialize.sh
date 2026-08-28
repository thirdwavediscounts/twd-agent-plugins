#!/usr/bin/env bash
# SessionStart (cloud only): turn the Sean Dev environment variables into the
# files local sessions already have. The setup script cannot do this — it runs
# before the env vars exist and its result is snapshot-cached for ~7 days.
# Every value is gated on its env var, so local sessions (vars unset) no-op.
# Prints a one-line status with sizes/counts only; never a secret.
set -u
[ -n "${ARGUS_SSH_KEY:-}${INFISICAL_CLIENT_ID:-}${VERIFY_LIVE_CREDS:-}" ] || exit 0
out=()

# Git author: cloud commits otherwise default to the base image's
# `Claude <noreply@anthropic.com>`, which Vercel's team-author gate rejects on
# merge. The setup script cannot fix this — it runs as root, writing
# /root/.gitconfig, while the session commits as user `user` reading
# ~/.gitconfig. This hook runs as the session user, so set it here. Only stamp
# when the identity is unset or the Anthropic default, never over a real one.
cur_email=$(git config --global user.email 2>/dev/null || true)
case "$cur_email" in
  ""|*@anthropic.com|*noreply*)
    git config --global user.name "ThirdWaveDiscounts"
    git config --global user.email "claude@thirdwavediscounts.com"
    out+=("git-author $(git config --global user.email)")
    ;;
esac

if [ -n "${ARGUS_SSH_KEY:-}" ]; then
  mkdir -p ~/.ssh && chmod 700 ~/.ssh
  printf '%s\n' "$ARGUS_SSH_KEY" > ~/.ssh/argus && chmod 600 ~/.ssh/argus
  [ -n "${ARGUS_KNOWN_HOST:-}" ] && ! grep -qF "$ARGUS_KNOWN_HOST" ~/.ssh/known_hosts 2>/dev/null \
    && printf '%s\n' "$ARGUS_KNOWN_HOST" >> ~/.ssh/known_hosts
  {
    printf 'Host ken-ai-agents\n  HostName %s\n  User root\n  Port %s\n  IdentityFile ~/.ssh/argus\n  IdentitiesOnly yes\n' "${ARGUS_HOST:-204.168.143.179}" "${ARGUS_PORT:-22}"
    # Cloud egress is an HTTP CONNECT proxy only; raw TCP times out. Tunnel ssh
    # through it (needs netcat-openbsd from the setup script).
    if [ -n "${HTTPS_PROXY:-}" ]; then
      px="${HTTPS_PROXY#http://}"; px="${px#https://}"; px="${px%/}"
      printf '  ProxyCommand nc -X connect -x %s %%h %%p\n' "$px"
    fi
  } > ~/.ssh/config
  n=$(wc -c < ~/.ssh/argus | tr -d " "); [ "$n" -gt 100 ] && out+=("ssh key ${n}B") || out+=("ssh key EMPTY(${n}B)")
fi

if [ -n "${VERIFY_LIVE_CREDS:-}" ]; then
  d=~/.claude/private/verify-live; mkdir -p "$d" && chmod 700 "$d"
  printf '%s\n' "$VERIFY_LIVE_CREDS" > "$d/creds.json" && chmod 600 "$d/creds.json"
  out+=("creds.json $(wc -c < "$d/creds.json" | tr -d " ")B")
fi

if [ -n "${INFISICAL_CLIENT_ID:-}" ]; then
  repo="${CLAUDE_PROJECT_DIR:-$PWD}"
  if ! command -v infisical >/dev/null 2>&1; then
    out+=(".env SKIPPED: infisical CLI missing (setup script: npm i -g @infisical/cli)")
  else
    tok=$(infisical login --method=universal-auth --client-id="$INFISICAL_CLIENT_ID" --client-secret="${INFISICAL_CLIENT_SECRET:-}" --plain --silent 2>/dev/null || true)
    if [ -z "$tok" ]; then
      out+=(".env FAILED: infisical login refused")
    else
      for pair in "/:.env" "/product-research:apps/product-research/.env" "/argus-console-frontend:apps/argus-console/frontend/.env"; do
        folder="${pair%%:*}"; file="$repo/${pair#*:}"
        if INFISICAL_TOKEN="$tok" infisical export --projectId="${INFISICAL_PROJECT_ID:-}" --env=dev --path="$folder" --format=dotenv > "$file.tmp" 2>/dev/null && [ -s "$file.tmp" ]; then
          mv "$file.tmp" "$file" && chmod 600 "$file"
          out+=("${pair#*:} $(grep -c '^[A-Za-z_][A-Za-z0-9_]*=' "$file") keys")
        else
          rm -f "$file.tmp"; out+=("${pair#*:} FAILED")
        fi
      done
    fi
    unset tok
  fi
fi

# Keep the plugin current: the setup script's install is snapshot-cached, so
# refresh in the background for the NEXT session (never blocks this one).
if command -v claude >/dev/null 2>&1; then
  (claude plugin marketplace update twd >/dev/null 2>&1 && claude plugin update shelly@twd >/dev/null 2>&1) &
fi

printf 'cloud-materialize: %s\n' "$(IFS="|"; echo "${out[*]}" | sed "s#|#; #g")"
exit 0
