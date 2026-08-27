# Ticket Pipeline (personal)

Sean's personal issue→ship pipeline. **Local-only / untracked** (`docs/` is
gitignored except `docs/superpowers/specs/`), so nothing here triggers a Vercel
fleet rebuild. Not team config — to share any piece, move it under
`packages/guidelines/`.

The spine: an error becomes a Linear ticket, a ticket gets investigated, a
ticket gets worked in isolation, and a ticket is Done only when its PR is on
`main`. Each stage has one owner tool and one status transition.

## Linear Dev workflow states

`Backlog → Triage → {Needs Info, Ready for Agent, Ready for Human} → In Progress
→ In Review → Done` (+ Canceled, Duplicate). Ready-* are `unstarted`; In
Progress / In Review are `started`; Done is `completed`.

## The stages

| # | Stage | Trigger | Owner tool | Isolation | Status after |
|---|-------|---------|-----------|-----------|--------------|
| 0 | **Ingest** | BugSink new issue-group webhook | plain service on the VPS, **no Claude** | — | **Triage** |
| 1 | **Triage** | scheduled routine | `/triage` (auto-move) | — | Ready for Agent / Human / Needs Info / Canceled |
| 2 | **Investigate** | you pick tickets | `investigate` Workflow (read-only, N parallel lanes) | none needed | **unchanged** (stays Ready for Agent) |
| 3 | **Work** | one ticket / session | `/work` skill (session-scoped orchestrator) | **worktree** | In Progress → In Review (PR open) |
| 4 | **Close** | PR merged to `main` | `/ship` closeout | — | **Done** + worktree removed |

Separate **greenfield track** for new features/products (not bug-driven) —
mattpocock's plugin skills, each suggesting the next:
`/grill-with-docs` (or `/wayfinder` if too foggy for one session) →
[`/prototype` via `/handoff` if a question needs runnable proof] →
`/to-spec` → `/to-tickets` → `/work DEV-n` per ticket (fresh session each) →
`/ship`. Keep steps up to `/to-tickets` in one context window.

## Which skill? — quick router

| Situation | Skill |
|---|---|
| Error tickets piling in Linear `Triage` | `/triage` (yours; `auto` for the routine) |
| Ticket is Ready for Agent, cause unknown | `/investigate` |
| Ticket is Ready for Agent, ready to build | `/work DEV-n` |
| Something's broken, no ticket yet, hard/intermittent | `/mattpocock-skills:diagnosing-bugs` |
| New feature / product idea | `/grill-with-docs` → main flow above |
| Idea too big/foggy for one session | `/wayfinder` → `/to-spec` |
| Build one behaviour test-first, no spec | `/mattpocock-skills:tdd` |
| Review a branch/PR against standards + spec | `/mattpocock-skills:code-review` |
| Read docs / API facts in background | `/research` (placement rule in CLAUDE.local.md) |
| Branch done → main | `/ship`, then `/worklog` |
| Human-only step (creds, dashboards, cutover) | `/wizard` |
| Forgot which plugin skill | `/mattpocock-skills:ask-matt <question>` |

## Stage contracts

### 0. Ingest — BugSink ⇄ Linear (no Claude) — **DEPLOYED**
Standalone Node poller `~/Code/bugsink-linear-ingest/`, live on the VPS as
`bugsink-linear-ingest.timer` (system unit, 10-min cadence, user `bugsink-ingest`).
**Pull, not webhook** — BugSink has no outbound issue-group webhook; the poller
queries `GET /api/canonical/0/issues/?project=<id>&sort=last_seen` and picks up
groups whose `first_seen > watermark`.
- **Forward:** new BugSink group → Linear ticket in **Triage**, title
  `[<app>] <type>: <value>`, body carries culprit/counts/permalink + a
  `<!-- bugsink:<friendly_id> -->` marker. App label from the BugSink project
  name → the single-select `App/*` group; `Bug` label always.
- **Dedup:** state file (`/var/lib/bugsink-linear-ingest/state.json`) maps
  `friendly_id → Linear identifier`; a re-run never re-creates. First run per
  project seeds the watermark to *now* — no history backfill.
- **Backward:** each poll also resolves — for every created ticket now in a
  `completed` (Done) state, `POST /api/canonical/0/issues/<friendly_id>/resolve/`
  (idempotent via an `is_resolved` pre-check). This is where a BugSink issue gets
  marked resolved; `/ship` only flips the Linear ticket.
- `SKIP_PROJECTS=probe` — the health-check project has no App label and is ignored.
- Auth: `Bearer <token>` (confirmed). Secrets in `/etc/bugsink-linear-ingest.env`.
- Proven end-to-end 2026-08-17: `CCG-1 → DEV-40 → Done → CCG-1 resolved`.

### 1. Triage — house-built, replaces mattpocock's
Mattpocock's `/triage` is built for human-filed feature requests + external PRs
(repro from reporter steps, `.out-of-scope/` KB, grilling). Our Triage column is
mostly **BugSink stack traces** — app + dedup already resolved at ingest — so
that machinery is dead weight. We build our own instead.

Run **manually** — `/triage` interactive is the day-to-day; no scheduled
routine (decided 2026-08-17: watch the queue by hand rather than auto-move
unattended). The auto mode below stays in the skill for the day that changes.

Two modes, one skill:
- **Auto** (`/triage auto`, invoked by hand — not on a schedule): classify +
  **move** each Triage-status ticket. Real, recurring, agent-fixable bug → **Ready for Agent** (with a short
  brief). Needs Sean's judgment / external access / physical action / a
  prod-migration → **Ready for Human**. One-off / transient / dead-path noise →
  **Canceled**. Equivalent already open → **Duplicate**. Genuinely ambiguous →
  leave in Triage with a note. A ticket that is really a *feature request* (not
  an error) → Ready for Human for Sean to take into the greenfield track;
  triage never specs features.
- **Interactive** (`/triage`, no arg): the "show me what needs attention" bucket
  view — it recommends, you direct. This is the part of mattpocock's flow worth
  keeping.

Error tickets have no human reporter, so `Needs Info` is rarely used here —
a real-but-unclear error goes to Ready for Agent for `investigate` to deep-dive,
not to Needs Info. Read each ticket's **comments**, not just the listing, before
classifying (the known failure mode of bulk triage).

### 2. Investigate — read-only, multi-ticket (v2 of the existing Workflow)
- Existing `investigate` Workflow is single-symptom. v2: accept a **list** of
  Ready-for-Agent tickets, **ask which subset** before running (guard vs
  running 100 agents), then one investigation lane per ticket in parallel.
- Per ticket, unchanged from today's output contract: findings comment,
  fix/observability **sub-issues** in Ready for Agent, verify tasks as a
  checklist on the parent.
- **Does not change parent status** — annotation only.

### 3. Work — `/work`, one ticket per session
- Exactly one `DEV-xxx`. Refuse 0 or >1.
- Reads the ticket + investigation findings + sub-issues + verify checklist.
- Worktree `~/Code/twd-<ticket>-wt`, branch `sean/<ticket>-<slug>`. Ticket →
  **In Progress**, assigned to self.
- Build via the agent team (code-analyst → engineers → qa-gate → reviewers),
  scoped to this ticket's sub-issues. Independent sub-issues may fan out via an
  internal Workflow with per-sub-issue worktree isolation.
- Verify the ticket's checklist + the app's real gates.
- `/ship hold` opens the PR (body: `Closes DEV-xxx`); ticket → **In Review**.
  Session ends here — Sean reviews.

### 4. Close — on merge
- `/ship` merge is the trigger. After `gh pr merge`, the closeout: linked ticket
  → **Done**, worktree removed + branch pruned (ship already does this), then
  `/worklog`.

## Skill inventory (all built ✓)

- **House pipeline:** `/triage` (interactive; auto mode exists but **run
  manually by choice — no scheduled routine**), `investigate` v2 (multi-ticket),
  `/work`, `/ship` (+ closeout 5b). Plus existing `ship`, `worklog`, `task`,
  `find-docs`.
- **Stage 0 ingest:** standalone poller on the VPS (see Stage 0). Not a skill.

### Mattpocock — plugin removed, 5 skills vendored (owned)
The `mattpocock-skills` plugin is **uninstalled** (deregistered + cache deleted).
Five skills were copied into `~/.claude/skills/` (ours now, edit freely; they
won't auto-update). For the **greenfield track** (features Sean originates — not
the bug pipeline above):
- `grilling` — stress-test a plan/idea (as-is)
- `domain-modeling` — CONTEXT.md + ADRs (config: `docs/agents/domain.md`) (as-is)
- `writing-for-agents` — meta-skill for authoring skills (as-is)
- `wizard` — bash walkthroughs for human-only steps (as-is)
- `research` — **house-adapted**: files land in `apps/<x>/docs` (one app),
  `docs/research/` (personal, untracked), or `packages/guidelines/` (shareable);
  never a tracked root path (rebuilds all 12 projects).
- **Dropped:** `code-review`, `diagnosing-bugs`, `resolving-merge-conflicts`
  (house equivalents), and `tdd`/`prototype`/`codebase-design` (re-vendor from a
  fresh `/plugin install` only if actually used).

## Status
Built & verified: `/triage`, `investigate` v2, `/work`, `/ship` 5b, Stage 0
ingest (**deployed + live**). Parked by decision: auto-triage scheduling (kept
manual). Greenfield track = the 5 vendored skills.
