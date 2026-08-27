#!/usr/bin/env bash
# PreToolUse(Bash) hook: refuse to CREATE a git branch while the working
# directory is a repo's shared checkout.
#
# Order is worktree -> branch -> work. Branching in the shared checkout races
# whichever session is sitting in it: on 2026-08-25 the twd monorepo checkout
# switched to another session's branch mid-task and the DEV-129 working files
# vanished from the tree. Prose in CLAUDE.local.md did not prevent that twice
# in one session; this does.
#
# Allowed everywhere: checking out or switching to an existing branch,
# deleting, renaming, listing, and `git worktree add -b` itself (the recovery
# path). Only branch CREATION is refused, and only in the PRIMARY worktree of a
# repo that has a .claude directory -- linked worktrees and scratch clones are
# untouched.
#
# Known gap: `git -C <path> checkout -b` is not detected, since the regexes
# anchor `git` immediately before the subcommand. That form targets another
# repo, where this hook's cwd test would be wrong anyway.
#
# Always exits 0 -- a refusal is expressed in JSON, never as a hook crash.
# BSD grep (macOS) does not backtrack `(^|[[:space:]])` mid-pattern, so the
# alternation lives in the leading command-position group instead.

set -u

payload=$(cat)
cmd=$(printf '%s' "$payload" | jq -r '.tool_input.command // empty' 2>/dev/null) || exit 0
[ -n "$cmd" ] || exit 0

cwd=$(printf '%s' "$payload" | jq -r '.cwd // empty' 2>/dev/null)
[ -n "$cwd" ] && [ -d "$cwd" ] && cd "$cwd" 2>/dev/null

G='(^|[;&|(])[[:space:]]*git[[:space:]]+'
creates=""
printf '%s' "$cmd" | grep -Eq "${G}checkout([[:space:]]+[^;&|]*)?[[:space:]]+-[bB]([[:space:]]|\$)" && creates="git checkout -b"
printf '%s' "$cmd" | grep -Eq "${G}switch([[:space:]]+[^;&|]*)?[[:space:]]+(-[cC]|--create)([[:space:]]|\$)" && creates="git switch -c"
printf '%s' "$cmd" | grep -Eq "${G}branch[[:space:]]+[^-;&|[:space:]]" && creates="git branch <name>"
[ -n "$creates" ] || exit 0

git rev-parse --git-dir >/dev/null 2>&1 || exit 0
gitdir=$(git rev-parse --absolute-git-dir 2>/dev/null) || exit 0
commondir=$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null) || exit 0
[ "$gitdir" = "$commondir" ] || exit 0   # linked worktree: allowed

root=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
[ -d "$root/.claude" ] || exit 0

jq -nc --arg cmd "$creates" --arg root "$root" '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "deny",
    permissionDecisionReason: ("Refused: `" + $cmd + "` in the SHARED checkout " + $root +
      ". The worktree comes first -- before the branch, before the first edit. Create a sibling worktree on its own branch: `git worktree add -b sean/<slug> ../twd-worktrees/<slug> origin/main` (allowed here), then EnterWorktree({path: \"<absolute worktree path>\"}) to move in. To adopt an EXISTING branch instead: `git worktree add ../twd-worktrees/<slug> <branch>` (allowed here), then EnterWorktree({path}). Branching in this checkout races whichever session is sitting in it.")
  }
}'

exit 0
