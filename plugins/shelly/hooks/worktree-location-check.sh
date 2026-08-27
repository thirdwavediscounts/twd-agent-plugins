#!/usr/bin/env bash
# SessionStart hook: say out loud when the session is sitting in a repo's
# SHARED checkout rather than a linked (sibling) worktree.
#
# A session's launch header can name a worktree primary working directory that
# does not exist, while the shell is really in the shared checkout (2026-08-25:
# DEV-129 was branched and built in ~/Code/twd-apps-monorepo, which another
# session then switched to a different branch mid-task, and the files vanished
# from the tree). A hook cannot read that header, so it reports the situation
# from the other side: here is where you actually are.
#
# Scoped to Claude-managed repos (a .claude directory at the repo root) so
# scratch clones stay quiet. Always exits 0 -- a session must never fail to
# start because of this check.

set -u

git rev-parse --git-dir >/dev/null 2>&1 || exit 0

gitdir=$(git rev-parse --absolute-git-dir 2>/dev/null) || exit 0
commondir=$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null) || exit 0

# A linked worktree has its own gitdir under <common>/worktrees/<name>. Already
# isolated: nothing to warn about.
[ "$gitdir" = "$commondir" ] || exit 0

root=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
[ -d "$root/.claude" ] || exit 0

branch=$(git branch --show-current 2>/dev/null || echo "detached")

printf '{"systemMessage":"Shared checkout (%s, on %s) - create a worktree before the first write","hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"This session is in the SHARED checkout %s (branch: %s), not a .claude/worktrees/ worktree -- whatever the launch header claims. The shared checkout belongs to whichever session is sitting in it, so branching or editing here races another session, which can switch the tree out from under this one mid-task. Before the first write for any task that will produce a branch: create a sibling worktree first (`git worktree add -b sean/<slug> ../twd-worktrees/<slug> origin/main` then EnterWorktree({path})) -- worktree and branch in one step -- then the work. Read-only questions need no worktree."}}' \
  "$(basename "$root")" "$branch" "$root" "$branch"

exit 0
