---
name: blast-sales-column
tags: [blast-radius, review]
runs: 3
max_turns: 6
timeout_seconds: 240
allowed_tools: []
---
/shelly:blast-radius

You have NO access to the repository, database, VPS, or Vercel in this session — only the change description below. Produce the blast-radius writeup you can honestly produce from it.

Fleet facts you may rely on: 12 Vercel apps in one pnpm monorepo share ONE Supabase database with an Argus engine on a VPS that also reads/writes it; `packages/*` deploys to every app; any tracked root-level file change rebuilds all 12 projects; GitHub CI is manual-dispatch only.

Change under review (branch sean/sales-cost-basis):
1. Migration adds `public.sales.cost_basis numeric NOT NULL DEFAULT 0` and a CHECK (cost_basis >= 0).
2. `apps/po-profitability` starts writing `cost_basis` when it links a sale to a purchase-order line.
3. Root `.env.example` gains `PO_COST_BASIS_SOURCE=purchase_orders` (the app reads it to choose the source table).
Diff touches: `apps/po-profitability/db/2026-08-24_sales_cost_basis.sql`, `apps/po-profitability/src/link.ts`, `.env.example`.
Author's note: "purely additive, default 0, nothing else reads the column."

