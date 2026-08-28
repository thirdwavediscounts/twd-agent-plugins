#!/usr/bin/env bash
# PostToolUse(Bash): when an autonomous /work run's `gh pr merge` succeeds, post
# `ci` + `merged` into the ticket's Slack thread — deterministically, so the two
# final evidence posts can't be skipped by the model in the wrap-up phase.
#
# Gated to the pipeline: only fires when SLACK_TICKET_CHANNEL and SHELLY_AUTO_MERGE=1
# are set (the autonomous cloud run), so ordinary local merges post nothing.
set -euo pipefail

payload=$(cat 2>/dev/null || true)
[ -n "$payload" ] || exit 0
command -v jq >/dev/null 2>&1 || exit 0

cmd=$(printf '%s' "$payload" | jq -r '.tool_input.command // ""' 2>/dev/null || echo "")
case "$cmd" in *"gh pr merge"*) ;; *) exit 0 ;; esac

# Pipeline-only gate.
[ -n "${SLACK_TICKET_CHANNEL:-}" ] && [ "${SHELLY_AUTO_MERGE:-}" = "1" ] || exit 0

# Confirm the merge actually succeeded (don't post on a failed/conflicted merge).
resp=$(printf '%s' "$payload" | jq -r '.tool_response // "" | if type=="object" then tostring else . end' 2>/dev/null || echo "")
printf '%s' "$resp" | grep -qiE 'Merged pull request|✓ *Merged|Squashed and merged|Rebased and merged' || exit 0

# PR number from the command; ticket from the PR's head branch (survives --delete-branch).
prn=$(printf '%s' "$cmd" | grep -oE 'pr merge[[:space:]]+#?[0-9]+' | grep -oE '[0-9]+' | head -1)
[ -n "$prn" ] || exit 0
ref=$(gh pr view "$prn" --json headRefName -q .headRefName 2>/dev/null || echo "")
tick=$(printf '%s' "$ref" | grep -oiE 'dev-[0-9]+' | head -1 | tr '[:lower:]' '[:upper:]')
[ -n "$tick" ] || exit 0

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
H="$ROOT/bin/ticket-slack.mjs"
[ -f "$H" ] || exit 0

# ci (checks were green — the merge implies it) then merged. Never block the session.
node "$H" post "$tick" ci "checks passed" >/dev/null 2>&1 || true
node "$H" post "$tick" merged "merged to main — PR #$prn, $tick Done" >/dev/null 2>&1 || true
exit 0
