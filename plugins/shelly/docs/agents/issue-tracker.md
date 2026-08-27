# Issue tracker: Linear

Issues and specs for this repo live in **Linear**, team **Dev** (`id 23714355-a6d9-4b41-86ec-bea8634b4a4f`, issue keys like `DEV-123`). Drive it with the Linear MCP tools (`mcp__linear__*`) — **not** the `gh` CLI. GitHub PRs still carry the code; Linear carries the work items.

Resolve the team at runtime with `mcp__linear__list_teams` if the id above ever changes. The other team, `Pricing Team`, is not the dev issue tracker.

## Conventions

- **Create an issue**: `mcp__linear__save_issue` with `team: "Dev"`, `title`, `description` (Markdown; send real newlines, not `\n`), and `labels` (see label taxonomy below).
- **Read an issue**: `mcp__linear__get_issue` by id or identifier (`DEV-123`), then `mcp__linear__list_comments` for the thread.
- **List issues**: `mcp__linear__list_issues` scoped with `team: "Dev"` and `label` / `state` / `assignee` / `query` filters. Use `includeArchived: false`.
- **Comment on an issue**: `mcp__linear__save_comment` with the issue id/identifier and `body`.
- **Apply / change labels**: `mcp__linear__save_issue` with the issue id and the **full** `labels` array (Linear replaces the set, it doesn't append) — read current labels first with `get_issue`. Create a missing label with `mcp__linear__create_issue_label`.
- **Close**: `mcp__linear__save_issue` setting `state` to a Done/Canceled status. Resolve valid statuses with `mcp__linear__list_issue_statuses` (`team: "Dev"`).

## Label taxonomy (existing in the Dev team)

- **`App/<name>`** — a child of the `App` parent label, one per app (`product-research`, `warehouse-mobile-app`, `argus-console`, `ccg`, `atlas`, `cardscout`, `home`, `lookout`, `inventory-management-system`, `pricers-hub`, `po-profitability`, `management-kpi`, `customer-service-dashboard`, `warehouse-inventory-base`, `ebay-auctions`, `argus-engine`). Tag every issue with the app it belongs to.
- **`Database`** — shared Supabase work (schema, RLS, functions, triggers); cuts across apps, so pair it with an `App/*` label.
- **`Bug` / `Feature` / `Improvement`** — issue type.
- **Triage state** is a **workflow status**, not a label — `Triage` → `Needs Info` → `Ready for Agent` / `Ready for Human` → `In Progress`/`In Review` → `Done`, with `Canceled` = wontfix. `/triage` moves an issue by setting its `state`. See `docs/agents/triage-labels.md` for the role→status map. New issues land in `Triage`.

## When a skill says "publish to the issue tracker"

Create a Linear issue in team **Dev** via `mcp__linear__save_issue`, tagged with the relevant `App/*` label (and `Database` if it touches shared Supabase).

## When a skill says "fetch the relevant ticket"

`mcp__linear__get_issue` for the identifier (e.g. `DEV-123`), then `mcp__linear__list_comments`.

## PRs as a request surface

**No.** External GitHub PRs are not part of the triage queue; work is triaged in Linear.
