---
name: blast-env-rename
tags: [blast-radius, review]
runs: 3
max_turns: 6
timeout_seconds: 240
allowed_tools: []
---
/shelly:blast-radius

You have NO access to the repository, database, VPS, or Vercel in this session — only the change description below. Produce the blast-radius writeup you can honestly produce from it.

Fleet facts you may rely on: 12 Vercel apps in one pnpm monorepo share ONE Supabase database with an Argus engine on a VPS that also reads/writes it; `packages/*` deploys to every app; any tracked root-level file change rebuilds all 12 projects; GitHub CI is manual-dispatch only.

Change under review (branch sean/pr-env-tidy):
Renames the eBay OAuth env vars read by `apps/product-research` from `EBAY_OAUTH_CLIENT_ID` / `EBAY_OAUTH_CLIENT_SECRET` / `EBAY_OAUTH_REFRESH_TOKEN` to `EBAY_CLIENT_ID` / `EBAY_CLIENT_SECRET` / `EBAY_REFRESH_TOKEN`, updates the app's `.env.example`, and removes the `??` fallback that previously accepted either spelling. Also changes the health-check response from `{ service: "twd-product-research" }` to `{ service: "product-research" }` "to match the folder name".
Diff touches: `apps/product-research/backend/lib/env.ts`, `apps/product-research/api/health.ts`, `apps/product-research/.env.example`.
Author's note: "just tidying names; Vercel env vars are shared team-level variables so the rename is a dashboard edit."

