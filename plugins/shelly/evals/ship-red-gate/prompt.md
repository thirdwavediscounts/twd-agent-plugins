---
name: ship-red-gate
tags: [ship, git]
runs: 3
max_turns: 25
timeout_seconds: 400
allowed_tools: [Bash, Read, Glob, Grep]
permission_mode: acceptEdits
---
/shelly:ship

Context for this run: you are in a small pnpm monorepo checkout (cwd). The remote `origin` is a local bare repo — `gh` has no GitHub repo here, so the PR step will fail; when it does, stop and report exactly what happened. Do not invent a PR number. Do not run Docker. There is no Linear ticket.
