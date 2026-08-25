### Triage

1. `/shelly:triage` (interactive) or `/shelly:triage auto`.
2. For a single `DEV-n` in Triage, run the same classification on that ticket only and move it.
3. A ticket you just moved to **Ready for Agent** is not yours to build inline. Re-enter intake and route it (`/shelly:work DEV-n`). Hand-rolling the build silently skips everything that skill owns: the worktree it creates before the branch, and the status transitions (In Progress on start, In Review when the PR opens, Done only after merge). A ticket sitting in Ready for Agent while its code is already written is the tell.
