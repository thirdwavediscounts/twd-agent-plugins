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

Worked run, 2026-08-26 (DEV-137 / PR #697): fixture
`ACE_Tools,-Outdoor-Power-Equip-NEW-1000.csv` from Jake's 08/25 extension ZIP →
Import & Start Analysis on doc 239 → sheet 4518 `end_time = 2026-08-26T17:00:00.000Z`
(10:00 AM PDT on the upload day); prod count since start = 0; sheet deleted.
