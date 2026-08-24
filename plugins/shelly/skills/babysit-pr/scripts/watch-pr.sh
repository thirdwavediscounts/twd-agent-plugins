#!/usr/bin/env bash
# Emit one line per change in a PR's merge-readiness; exit when it is merge-ready, merged, closed, or a check failed.
# Built for the Monitor tool: each stdout line is an event. Usage: watch-pr.sh <pr-number> [interval-seconds]
set -u
pr=${1:?pr number}; every=${2:-60}
read -r owner name < <(gh repo view --json owner,name --jq '"\(.owner.login) \(.name)"') || true
[ -n "${owner:-}" ] && [ -n "${name:-}" ] || { echo "cannot resolve owner/repo via gh repo view"; exit 3; }
prev=""
while true; do
  j=$(gh pr view "$pr" --json state,mergeable,mergeStateStatus,reviewDecision,statusCheckRollup 2>/dev/null) || { echo "gh error; retrying"; sleep "$every"; continue; }
  state=$(jq -r .state <<<"$j"); merge=$(jq -r .mergeable <<<"$j"); mss=$(jq -r .mergeStateStatus <<<"$j"); rev=$(jq -r '.reviewDecision // "NONE"' <<<"$j")
  checks=$(jq -r '[.statusCheckRollup[]? | "\(.name // .context): \(.conclusion // .state // "PENDING")"] | sort | join(", ")' <<<"$j")
  threads=$(gh api graphql -f query='query($n:Int!,$o:String!,$r:String!){repository(owner:$o,name:$r){pullRequest(number:$n){reviewThreads(first:100){nodes{isResolved}}}}}' -F n="$pr" -f o="$owner" -f r="$name" --jq '[.data.repository.pullRequest.reviewThreads.nodes[] | select(.isResolved|not)] | length' 2>/dev/null || echo "?")
  cur="state=$state mergeable=$merge mergeState=$mss review=$rev openThreads=$threads checks=[$checks]"
  [ "$cur" != "$prev" ] && echo "$cur"
  prev=$cur
  case "$state" in MERGED|CLOSED) echo "done: $state"; exit 0;; esac
  grep -qE "FAILURE|ERROR|CANCELLED|TIMED_OUT" <<<"$checks" && { echo "failed check"; exit 2; }
  [ "$merge" = MERGEABLE ] && [ "$mss" = CLEAN ] && [ "$threads" = 0 ] && { echo "merge-ready"; exit 0; }
  sleep "$every"
done
