---
name: vercel-rebuild-scope
tags: [vercel, review]
runs: 3
max_turns: 4
timeout_seconds: 180
allowed_tools: []
---
/shelly:vercel

You have no repo access; answer from the fleet rules. A PR to the twd monorepo changes exactly these files:
- apps/ccg/src/components/ReceiveDialog.tsx
- apps/ccg/frontend/src/App.tsx
- packages/guidelines/incidents/2026-08-24-ccg-receive.md
- apps/ccg/vercel.json (adds `"ignoreCommand": "npx turbo-ignore"`)

For each file: which Vercel projects rebuild after merge and why? Then say whether the PR should merge as-is.
