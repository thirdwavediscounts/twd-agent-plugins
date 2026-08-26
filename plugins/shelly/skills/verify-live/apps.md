# verify-live — per-app table

One row per app the skill may drive. A missing cell means **do not drive that
app yet**: fill it from the code (`src/lib/appEnv.ts` or `frontend/src/lib/appEnv.ts`
holds the switch key), seed the fixture on staging, and commit the row.

The switch flips only what the browser sends (`X-Environment: staging` on
backend calls, or the `/api/pgrest` proxy in ccg). Auth stays production: the
fleet JWT is prod-minted, and `is_twd_user()` on staging still has to know the
signed-in user (memory `fleet-auth-gates`). Engine, workers and crons never
read the switch.

| app | URL | switch key (localStorage) | staging-only fixture | tables the drive writes | cleanup SQL (staging) |
| --- | --- | --- | --- | --- | --- |
| product-research | https://product-research.apps.repsxi.com | `prv2-app-environment` | document **239 "02/30 Bad Date"** (`prv2.research_doc_documents`; absent on prod) | `prv2.research_doc_auction_sheets`, `prv2.research_doc_sheet_rows` | `delete from prv2.research_doc_sheet_rows where sheet_id=$id; delete from prv2.research_doc_auction_sheets where id=$id;` |
| ccg | https://ccg.apps.repsxi.com | `ccg-app-environment` (data goes via `/api/pgrest`) | — | — | — |
| ebay-auctions | https://ebay-auctions.apps.repsxi.com | `ea-app-environment` | — | — | — |
| atlas | https://atlas.apps.repsxi.com | `atlas-app-environment` (no UI switcher; set the key by hand) | — | — | — |
| inventory-management-system | https://inventory-management.apps.repsxi.com | `ims-app-environment` (no UI switcher; set the key by hand) | — | — | — |

Names that cost a round trip before: the documents table is
`prv2.research_doc_documents` (not `research_documents`); the sheet name column
is `name` (not `sheet_name`).

Worked runs, 2026-08-26 (DEV-137 / PR #697), doc 239, both prod-count 0 after:

- claude-in-chrome, Sean's session: `ACE_Tools,-Outdoor-Power-Equip-NEW-1000.csv`
  → sheet 4518 `end_time = 2026-08-26T17:00:00.000Z` (10:00 AM PDT).
- Playwright, saved storageState as `sean+verify@`:
  `ACE_Sporting-Goods,-Tools-UG-1015.csv` → sheet 4519
  `end_time = 2026-08-26T17:15:00.000Z` (10:15 AM PDT), `updated_by =
  sean+verify@thirdwavediscounts.com`. Both sheets deleted.

Playwright driver shape (run from `apps/product-research/.verify-boot/`, a
scratch dir you delete in cleanup — copy the skill's `scripts/*.mjs` in so the
bare `@supabase/supabase-js` / `@playwright/test` imports resolve against the
app's node_modules): `chromium.launch()` → `newContext({ storageState,
recordVideo: { dir, size: { width: 1280, height: 800 } } })` → `addInitScript(()
=> localStorage.setItem("prv2-app-environment","staging"))` →
`goto(<app>/documents/239)` → assert `innerText` contains "02/30 Bad Date" and
the URL is not `/login` → `locator('input[type=file]').setInputFiles(fixture)` →
click **Import & Start Analysis** twice (first mounts the preview, second writes)
→ wait → `page.video().path()` then `context.close()` to finalize the `.webm` →
read the row back over the staging MCP. The "import complete" toast is easy to
miss on timing; trust the DB row, not the banner.
