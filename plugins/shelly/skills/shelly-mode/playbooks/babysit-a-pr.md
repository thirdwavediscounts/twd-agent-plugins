### Babysit a PR

"Check on PR N", "get it green", "anything outstanding".

1. `/shelly:babysit-pr` on that PR only; declare the mode (drive / check / threads-only).
2. Order: conflicts → review threads → CI. Watch with `babysit-pr/scripts/watch-pr.sh <pr>` under the Monitor tool.
3. Stop at merge-ready. Merging is `/shelly:ship` on the user's go.
