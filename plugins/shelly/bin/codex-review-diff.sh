#!/bin/bash
# Codex adversarial review of the branch diff (merge-base with origin/main → working tree).
# Ported from twd-retool-apps' codex-review.sh: plain `codex exec`, structured verdict,
# validated output — no plugin/companion dependency.
#
# Usage: bash codex-review-diff.sh [one-line ticket context]
# Run from anywhere inside the repo/worktree under review.
# Prints the review to stdout. Exit 0 = review complete with a valid verdict.
# Exit 1 = pre-check failure, codex failure, or no valid verdict line.

set -uo pipefail

command -v codex &>/dev/null || { echo "ERROR: codex CLI not found." >&2; exit 1; }
git rev-parse --git-dir &>/dev/null || { echo "ERROR: not inside a git repo." >&2; exit 1; }

BASE=$(git merge-base origin/main HEAD) || { echo "ERROR: no merge-base with origin/main." >&2; exit 1; }

if [ -z "$(git diff "$BASE" --stat)" ]; then
  echo "ERROR: no diff between merge-base ($BASE) and the working tree — nothing to review." >&2
  exit 1
fi

CONTEXT="${*:-none provided}"

PROMPT="You are an adversarial senior reviewer giving a cross-model second opinion with a strict, evidence-based posture.

Review the diff between commit $BASE and the current working tree in this repository: run 'git diff $BASE' yourself and read any touched file you need for context. Ticket context: $CONTEXT

Challenge the implementation approach, hunt correctness bugs, hidden assumptions, and contract breaks (routes, env vars, DB grants, test weakening). Repo rules live in CLAUDE.md — flag violations of them. Do NOT fix anything; report only.

Structure your review exactly as:

# Codex Adversarial Review

## Verdict
One of: APPROVE | APPROVE_WITH_NOTES | REQUEST_CHANGES

## Findings
Numbered, most severe first, each with file:line, the defect, and a concrete failure scenario. 'None' if clean.

## Questions for the author
Anything you could not verify from the diff alone.

The Verdict section must contain exactly one of the three tokens on its own line."

OUT=$(codex exec --sandbox read-only "$PROMPT" 2>&1)
STATUS=$?
echo "$OUT"

[ $STATUS -eq 0 ] || { echo "ERROR: codex exec exited $STATUS." >&2; exit 1; }
grep -qE '^(APPROVE|APPROVE_WITH_NOTES|REQUEST_CHANGES)$' <<<"$OUT" || {
  echo "ERROR: no valid verdict token in review output." >&2
  exit 1
}
