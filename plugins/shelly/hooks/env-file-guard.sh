#!/usr/bin/env bash
# PreToolUse(Bash) hook: refuse commands that READ a .env file or dump the
# shell environment. Env values reach a process only via `--env-file=<path>`
# or the app's own loader; variable names live in .env.example.
#
# Two leaks in seven days (2026-08-18 grep|sed fallthrough, 2026-08-25 a
# subagent's `cat .env | grep -v postgres://` missing `postgresql://`) showed
# prose does not stop the reflexive read. Hooks fire for subagents too.
#
# Allowed: `--env-file=.env` / `--env-file .env`, `.env.example`,
# `git check-ignore`, `cp`/`ls`/`test -f`/`stat`/`wc`/`touch`/`rm` on the file.
# Known gap: `cat "$F"` with the path in a variable; python open(".env").
#
# Always exits 0 -- a refusal is JSON, never a hook crash.

set -u

payload=$(cat)
cmd=$(printf '%s' "$payload" | jq -r '.tool_input.command // empty' 2>/dev/null) || exit 0
[ -n "$cmd" ] || exit 0

refuse() {
  jq -n --arg r "$1" '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$r}}'
  exit 0
}

# Bare `env` / `printenv` dumps every secret in the shell.
if printf '%s' "$cmd" | grep -Eq '(^|[;&|(][[:space:]]*)(env|printenv)[[:space:]]*($|[;&|)])'; then
  refuse "env-file-guard: bare env/printenv dumps the shell environment into the transcript. Check one variable by name with 'test -n \"\$VAR\"' or read names from .env.example."
fi

# Strip the allowed forms, then look for any remaining .env reference.
stripped=$(printf '%s' "$cmd" \
  | sed -E 's/--env-file(=|[[:space:]]+)[^[:space:]]+//g' \
  | sed -E "s/[^[:space:]\"']*\\.env\\.example//g" \
  | sed -E 's/check-ignore[^;&|]*//g')

# Deny only when a content-reading verb sits in command position AND a .env
# path is present; `cp`, `ls`, `git commit -m "… .env …"` stay allowed.
if printf '%s' "$stripped" | grep -Eq "(^|[[:space:]\"'=/])\\.env(\\.[A-Za-z0-9_.-]+)?([[:space:]\"'|;&)]|\$)"; then
  if printf '%s' "$stripped" | grep -Eq '(^|[;&|(][[:space:]]*)(cat|head|tail|less|more|grep|egrep|rg|sed|awk|cut|sort|strings|xxd|od|bat|source|\.|python3?[[:space:]]+-c|node[[:space:]]+-e)[[:space:]]'; then
    refuse "env-file-guard: reading a .env file puts secrets in the transcript. Pass it to the process with --env-file=<abs path> or the app's own loader; variable names live in .env.example."
  fi
fi
exit 0
