# Operator rules — Sean

<!-- Injected by hooks/operator-rules.sh at SessionStart when SHELLY_OPERATOR=sean. Source of truth for Sean's personal rules across machines and cloud sessions; the per-machine CLAUDE.local.md is a pointer to this file. -->

# CLAUDE.md

Cross-project rules. A repo's own `CLAUDE.md` is more specific and wins.

**Scale to the task.** A small, reversible task deserves a small response — don't escalate process for its own sake.

## Core principles

1. **Think before coding.** State assumptions. If multiple readings exist, surface them instead of picking silently. If a simpler approach exists, say so. If something is unclear, stop and ask.
2. **Simplicity first.** Minimum code that solves the problem, nothing speculative — no unrequested features, abstractions, configurability, or error handling for impossible cases. If 200 lines could be 50, rewrite it.
3. **Surgical changes.** Touch only what the request requires; match existing style; don't refactor what isn't broken. Remove orphans your change created, nothing else. Every changed line should trace to the request.
4. **Goal-driven execution.** Turn the ask into a checkable condition ("a test reproducing the bug passes"), run the check that proves it once, and report the real output. Don't re-verify what already passed.

**Engineering quality:** simplest fully-correct implementation; right tool for the job; fix root causes, not symptoms; handle realistic failures, not imagined ones.

Worked examples: `~/.claude/EXAMPLES.md` — unless the repo ships its own (the twd monorepo uses `packages/guidelines/EXAMPLES.md`, tracked so every machine has it).

## Autonomous bug fixing

Given a clear bug report, investigate and fix it without hand-holding — use logs, errors, and failing tests to find the root cause. Fix failing CI when that is the task.

## Subagent strategy

Default to doing the work yourself. Delegate only when it genuinely reduces total work — a bounded, independent search or analysis whose answer you need but whose intermediate output you don't. One focused task per subagent. Coordinating several usually costs more than doing the work directly.

## Self-improvement loop

After a user correction, identify the durable pattern that would prevent it recurring. Record it in `tasks/lessons.md` only where that file already exists or project instructions require it — don't create bookkeeping files during a scoped code change.

<!-- BEGIN @agent-native/skills -->
When operating as Claude Fable, use the /efficient-fable skill always.
<!-- END @agent-native/skills -->
`efficient-fable` is Fable-only — never load it under any other model.

## Unslop — always on

Any prose that leaves the session (specs, tickets, Linear comments, PR bodies, commit messages, docs, artifacts, worklog rows, README/CLAUDE.md edits) goes through the `unslop` skill's rules before it's published. Core bans that apply everywhere, including terminal replies: no chatbot phrases or sycophancy, no puffery or AI vocabulary (delve, crucial, showcase, landscape, testament…), no "not just X but Y", no bold-label-colon lists that restate themselves, no filler ("in order to", "it is important to note"), active voice, plain words. For a full pass on a document, invoke the skill.

## Grilling question format

Whenever any skill asks interview-style questions (`grilling`, `grill-with-docs`, `wayfinder`, `triage`, `to-tickets`, …), use the question format defined in the `grilling` skill: ❓ numbered questions, one option per line, recommendation marked twice (`← recommended` + `➡️ Pick`), round ends with how to answer (e.g. *"Reply like `1b 2a 3c`"*).

## Skill flow — always suggest the next step

The workflow skills (ours, in the `shelly` plugin — repo `twd-agent-plugins`) are one flow but don't chain themselves. When one finishes, close the reply with the next step as a one-line offer, e.g. *"Grilling's frontier is empty — want me to write the spec (`/to-spec`)?"*:

`/grill-with-docs` (or `/wayfinder` when the questions keep chaining) → `/to-spec` → `/to-tickets` (Linear project + parent/child tree) → build per ticket in a fresh session (`/clear` between) → ship. Detours: a question needing runnable proof → `/prototype`; something broken in front of you → `/diagnosing-bugs`; cross-system symptom → `/shelly:investigate`; incoming raw issues → `/triage`; risky diff touching shared surfaces → `/blast-radius` before the PR; after a correction or a hard-won recipe → `/reflect`. Suggest, don't start — the user picks the moment. A repo may map a step to its own skill (the twd monorepo builds tickets with `/work` / `/team` and ships with `/ship` — see its CLAUDE.local.md).

---

Fetch current documentation whenever the user asks about a library, framework, SDK, API, CLI tool, or cloud service -- even well-known ones like React, Next.js, Prisma, Express, Tailwind, Django, or Spring Boot. This covers API syntax, configuration, version migration, library-specific debugging, setup instructions, and CLI tool usage. Do this even when you think you know the answer -- training data may not reflect recent changes. Prefer it over web search for library docs.

Do not use for: refactoring, writing scripts from scratch, debugging business logic, code review, or general programming concepts.

The `find-docs` skill carries the procedure (`ctx7 library <name> "<question>"` to resolve an ID, then `ctx7 docs <id> "<question>"`), along with the result-ranking criteria, version-pinned IDs, the 3-command-per-question cap, and quota handling. Invoke it rather than restating those here.

---

## Reporting style

Report extremely concisely, sacrificing grammar for concision — as if teaching a software/AI engineering student.

## Output conventions for Sean

- **File paths: plain absolute `path:1` bullets** — never code-fenced, never `~`- or repo-relative (Sean CMD+clicks them into VS Code). Point at the checkout where the file exists right now (worktree-aware); say where it lands after merge.
- **Commands for Sean (`!` lines): one short command per line, one action each.** A wrapped long line executes its remainder as a separate command (2026-08-14: a wrapped ssh line ran a prod deploy script). Never leave an executable path near a line's end; split read-only checks from mutations; `cd` first to shorten paths.
- **Purchase orders: report `po_number` ("PO #337"), never the row id.** Join `purchase_orders` before replying; id only alongside when a query needs reproducing.
- **Use clear subject/verb/object constructions.** Do not use cleft sentences, contrastive appositives, appended glosses, or trailing clauses.
- **Assume Sean may edit documents himself, especially markdown documents.**
- **Markdown documents must stand alone.** Do not reference conversations or threads a reader would not know about.

## Evidence-first debugging

Investigating a deployed app or workflow: use the operational tools, not source-guessing — VPS/SSH (services, timers, journals, worker logs), Supabase MCP (schema, data, migrations, logs, Edge Functions), Vercel MCP (deployments, build/runtime logs, protection). Trace end to end across every relevant live layer; if a layer isn't reachable, say so and keep conclusions provisional. Production investigations start read-only — no restarts, deploys, config changes, or writes unless Sean explicitly authorizes remediation.

**Never state impact, magnitude, or recoverability from a proxy — measure it.**
A fallback rate is not an estimate-change rate; a related-row count is not the
affected-row count; an inferred join key is not the real one. Before claiming
"this corrupted N rows" or "removing it is safe/unsafe," run the sizing query
that counts the actual thing (2026-08-25: "94.8% already fall back" was a
fallback rate; the real estimate-change rate from dropping the title matcher was
~1% — because comps key on the row's own UPC, independent of the wrong match).

## Secrets never touch the transcript

- **Never pipe an env line through a transform that can fall through** — `grep "^VAR=" | sed …` printed prod+staging pooler passwords when the regex missed (2026-08-18; rotation required). Read one field by parsing in Python and printing only the derived field (`urlparse(v).username`). Confirm presence, never content; prefer `.env.example` for names. **Do not reach for `grep -qc` on an env file either** — `env-file-guard` refuses any read of one, including a boolean probe (2026-08-25); if presence genuinely matters, let the process fail with `--env-file=<abs path>` and read the error.
- **Never `source`/`.` an env file in a shell** — values hold shell metacharacters; a `|` in a token executed the rest of the line into a transcript (2026-08-18). Load env in Python (`k,_,v = line.partition("=")`) or via the unit's own systemd/venv; pipe tool output through `grep -viE "token|secret|key="` before it reaches a transcript.
- **Delegates never read `.env`** — briefs pass `--env-file=<absolute path>` and nothing else; never cat/grep/sed/head an env file; variable names live in `.env.example`. A redaction filter is a backstop, never permission to read: on 2026-08-25 a verify-work subagent catted `.env` through `grep -viE "…|postgres://"` and the prod pooler URL (`postgresql://`, password included) landed in its transcript. Falsify any redaction regex against a known secret line before relying on it; if one is shown at all, make it value-shaped: `grep -viE '://[^[:space:]]*@|token|secret|password|key[[:space:]]*[=:]|^[A-Z][A-Z0-9_]*=.{16,}'`. The `env-file-guard.sh` PreToolUse hook refuses the reflexive `cat .env` mechanically.

## Verify by controlled repro, not waiting

A post-deploy check that "needs a real event" is not blocked — force a bounded, side-effect-free repro (smallest input the system will REJECT for the exact reason under test; Sean's one-line go for the outward call; evidence in one pass). Procedure + DEV-10 example: memory `controlled-repro-verification`.

## Supabase MCP servers

Use `supabase-production` and `supabase-staging` (repo-root `.mcp.json`):

- **`supabase-staging`** — full access. All testing, migrations, and development DB work happens here; apply staging DDL/grants/RLS silently as part of the work.
- **`supabase-production`** — read-only: inspect, debug, verify. Never attempt writes.
- **Staging drifts from prod:** read the real prod schema/data before building against it; confirm in prod after a migration ships.
- **Production migrations are Sean's job:** prove on staging, hand him a PROD_ runbook — procedure in memory `prod-runbook-procedure` (one file, one paste, gates inside the transaction, editor traps, staging-twin ledger). Never apply to prod yourself.
- **Workers/workflows run against prod only.** Staging runs are a deliberate one-off test, never a schedule (`EW_ACTIVE_ENVS=production`); a scheduled staging pass in a journal is a defect to report.

## No fabricated rows in prod business tables

Never write synthetic rows into prod business tables (`sales`, `products`, `purchase_orders`, …) to satisfy a downstream consumer — a fake row corrupts every reader and is indistinguishable from real data once written. Fix the dependency: give the consumer the real second source. An existing fabricate-path gets deleted, not guarded — a guard is only an explicitly-temporary stopgap. Corollary: never infer a fact by proxy ("no `sales` row = unpaid") without checking whether the real fact is already stored (`paymentStatus` was).

## Environment variables

- Vercel env vars are shared team-level variables linked per-project; linking is per-project and a variable does nothing until linked. Need a new one? Tell Sean — he creates and links it; then add it to `.env.example`.
- **Link before merge.** A PR adding env vars to any `.env.example` lists them in the PR body and holds the merge until Sean has linked them — merging first ships the feature dead (2026-08-19, DEV-80). Unlinked vars = red gate.
- Some variables are legitimately per-project on Vercel and won't appear in root `.env.example`.

## Skills

- **Guard hooks ship with the plugin** (`hooks/`): `env-file-guard`, `worktree-branch-guard` (PreToolUse Bash), `git-staleness-check`, `worktree-location-check` (SessionStart), the vitest-skill reminder (Write|Edit), and `operator-rules` (this file, when `SHELLY_OPERATOR=sean`). They fire in cloud sessions too; nothing in `~/.claude/hooks` is load-bearing any more.
- **CI gate is GitHub Actions on the PR** (`gh pr checks`); `${CLAUDE_PLUGIN_ROOT}/bin/ci-local.sh` only when a run is quota-refused or you are offline, never from cloud. No localhost sign-off step — Sean asks for a local look when he wants one.
- **Cloud sessions (Sean Dev)** get the three `.env` files (Infisical export), the verify-live creds and the VPS key from `hooks/cloud-materialize.sh` at SessionStart — its one status line says what landed (sizes/counts only). **But the Anthropic egress proxy is HTTP-CONNECT only and MITMs TLS, so two things DO NOT work from cloud, proven DEV-165 run 4: (1) raw ssh to the VPS — the proxy accepts CONNECT to :22 but never relays the SSH banner (`kex_exchange_identification: Connection closed`); sshd-on-443 won't help (it inspects for TLS, ssh isn't TLS). (2) a real browser over HTTPS — every Chromium/Firefox `https://` navigation is `ERR_CONNECTION_RESET` while curl/node HTTPS and browser `http://` all work; not a cert or creds issue. So `/verify-live`'s browser drive and box-level VPS ops (systemctl, file edits, deploys) stay LOCAL. From cloud: the verify-live doctor + prod-no-write + DB/API half work (Supabase MCP, node fetch). And the cloud→**Argus engine WRITE path is its HTTPS Bearer API** ([[argus-engine-api-trigger-contract]], [[argus-engine-direct-api-direction]]), which DOES traverse the proxy — reach Argus that way from cloud, not by ssh. Raw ssh-over-HTTPS (wstunnel/stunnel on VPS :443) is the only way to get a box-level shell from cloud; it needs a new prod listener, so it's Sean's explicit call, not a default.** Also unreachable from cloud: Docker, a localhost Sean can see. Say so, record the blind spot, keep the conclusion provisional.

- **Describe a skill only after reading its SKILL.md; invoke the matching skill before starting that kind of work, not from memory.**
- **Naming a skill in a plan commits you to invoking it.** Hand-rolling it instead silently drops whatever part of its checklist you did not recall (2026-08-25: named `/blast-radius`, hand-rolled it, and never ran its step 6 cross-model pass — which later found four real defects two same-model reviewers had cleared).
- **No vendored library skills** (doc mirrors removed 2026-08-24). Library/API questions → `find-docs`; shadcn registry work → the shadcn MCP server (product-research and warehouse-mobile-app have `components.json`).
- `vitest` and `pnpm` are fleet gotcha lists: load `vitest` before touching any `*.test.*`/`*.spec.*`/vitest config in the Vite apps (product-research, argus-console, warehouse-mobile-app), `pnpm` before editing workspace/catalog/dependency files. Applies to subagents doing the edit. New trap earned → add it to the skill.
- `/triage` — BugSink/Linear-status sorter with an `auto` mode.
- `/research` file placement: about one app → `apps/<x>/docs/<topic>.md`; personal/cross-cutting (default) → `docs/research/` (gitignored); shareable team reference → `packages/guidelines/`. Never a new tracked root-level path (fleet rebuild). State the final path.
- **`/shelly:shelly-mode <prompt | DEV-n>` is the single entry point** — matches the task to a playbook and routes to the other skills (incl. the pstack ports). Sticky once invoked. `principles.md` beside it is the steering vocabulary.
- **All shared skills and agents live in the `shelly` plugin** (`~/Code/twd-agent-plugins`, GitHub `thirdwavediscounts/twd-agent-plugins`, marketplace `twd`). Invoke as `/shelly:<name>`; a bare `/name` in these docs means the shelly-namespaced skill. Release: bump the version in `plugins/shelly/.claude-plugin/plugin.json` (CI enforces) → merge → `claude plugin marketplace update twd` → `claude plugin update shelly@twd` → `/reload-plugins`; the ✔ prints even when nothing changed — proof is `~/.claude/plugins/cache/twd/shelly/<ver>/`. Evals: `plugins/shelly/evals/run.py <case>`. Editing this repo from a monorepo-rooted session: EnterWorktree binds to the monorepo, so branch/commit in the plugins repo with `git -C ~/Code/twd-agent-plugins …` (you're knowingly on its primary checkout — the `-C` form is the worktree-branch-guard's allowed escape hatch).

## Data tables — fleet standard

Every data table follows `apps/ebay-auctions/docs/TABLE-STANDARD.md`; reference implementation in that app's `src/components/shared/DataTable.tsx` / `EbayAuctionsTable.tsx`. When touching tables in other apps, port the DataTable internals the standard depends on (flush footer band, content-height panels, frozen-column shadow, sticky cells paint `bg-card`, first column `pl-4`, action columns frozen right).

## Agent roster

The `shelly` plugin's domain agents (backend-engineer, frontend-engineer, code-analyst, code-reviewer, e2e-tester, qa-gate, security-auditor) are standing role agents for **any** orchestration — ad hoc Agent-tool delegation, SDD runs, Workflow `agentType` — not just `/task`. Prefer them over general-purpose when the work matches: their prompts carry fleet knowledge. A template saying "general-purpose" is a default, not a constraint. If the task's discipline conflicts with an agent's instinct, state the override in the brief.

Teammate mechanics:

- **Teams run in-process everywhere** — local and cloud (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in settings `env` and in the cloud environment). No panes, no tmux, no iTerm2 mode. Teammates talk through SendMessage/ListAgents; retire them via the shutdown protocol.
- **Second-opinion review is a fresh-context Fable pass; the lead sizes its effort to the diff (medium docs, high app logic, xhigh for packages/DB/root config/frozen contracts) — never a pinned level** (Codex removed 2026-08-27 — no `codex` CLI or OpenAI auth in cloud sessions). Agent defs load at session start — restart after editing one.

## Argus Engine schedules

- **Every engine timer anchors to `America/Los_Angeles`** (`OnCalendar=*-*-* HH:MM America/Los_Angeles`, matching `resources.yaml`): the warehouse day is Pacific; any other anchor drifts at DST.
- **Never derive a fire time from a Retool export** — `crontab` is null, `timezone` is the author's locale, Slack timestamps are AM/PM-ambiguous. Ask Sean for the real cadence.

## Audit attribution

Any write touching an `updated_by`/`created_by`/`applied_by` audit column: Claude-session SQL writes **`Sean by Claude`**; engine processes write **`Argus Engine`**. Never `System`, never a borrowed email.

## Every delegate's output is verified twice

A subagent, teammate, or workflow stage's report is a lead, never evidence (Sean, 2026-08-24). This extends to **agent-filed tickets**: a description's quantitative claims are a delegate's report too, just time-shifted — re-measure before designing against them (2026-08-25: DEV-126 said "16 of the 19 plain migrations"; the real figure was 48 of 123, and a fix shaped for 16 files is the wrong fix for 48). It also cuts the other way: a delegate's *finding* can be wrong in its specifics and right in its substance — verify the claim against the real artifact before accepting OR dismissing it. Before relaying or acting on it: an independent agent that never saw the producer's reasoning (code-reviewer/qa-gate/security-auditor as fits), AND my own read of the real artifact (diff, query result, log line, DB object). Relay both verdicts. Nothing passes on the producer's word alone.

## "Needs <person>" has to earn it

Before labeling a question as needing Jake (or anyone): name what the system
exists to decide, then ask whether the answer changes that output. If it does
not, decide it, record the reasoning where the decision lives, and tell them.
Deferring a question that changes nothing spends someone else's attention and
stalls the work.

2026-08-25, DEV-130: four audit questions were written up as "needs-Jake";
Sean's "aren't we overcomplicating things — Wave is to tell us if we profit or
lose" collapsed three of them on contact, and the fourth was a wording fix. Same
test applies to a proposed ticket: if it can be decided and done in the session,
it is not a ticket.

## Never offer a choice whose branches create tech debt

Wrong rows in a table → fix the writer (engine ingest), never a reader-side
filter. An app filter over bad ingest is a guard, and every other reader still
sees the bad rows (2026-08-26: non-US auctions — the fix was
`itemLocationCountry:US` in the tracker, not `item_location = 'US'` in the app).

Find a defect → fix the defect. No menus where one option is "leave it and guard around it" — that asks Sean to approve debt, and the answer is always no. Redundant code kept "because it's harmless" encodes a misdiagnosis: remove it. A guard scoped around a latent trap is documentation, not a fix. Same defect in a sibling you're already in: fix it, or say plainly why fixing is wrong on the merits. If the genuinely correct answer is to leave something alone, say so with reasoning and make the call. Stop asking "should I?"; report "here is what I did and why".

## Git identity, push approval & merges

- **Never `gh auth switch`.** Every git/GitHub op runs as `thirdwavediscounts`, repo-local author matching — Vercel refuses deploys authored by non-members, and a merge commit is authored by whoever clicks merge. Stranded-commit recovery: an owner-authored commit with a REAL file change inside the app.
- **`sean/` on everything of ours:** branch names (`sean/<slug>`), commit subjects, PR titles (`sean/ <title>`), a marker line in the PR description. Never on Jake's straight-to-`main` desktop commits. Deliberately not in the tracked team doc.
- **Every repo, same rule (twd-agent-plugins included): ask for the go, then run push/PR/merge myself** — never hand Sean commands to type.
- **Push/PR/merge approval is per change, never standing.** Commit locally freely; STOP before `git push`/`gh pr create`/merge until Sean authorizes THAT change, after the work exists. Approving a plan is NOT push approval (burned 2026-07-23, 2026-07-31). Multi-PR programs: one go per PR unless an explicit blanket. Standing exception: deleting a merged-and-done `sean/` branch.
- **Merge with an explicit subject:** `gh pr merge <N> --merge --delete-branch -t "sean/ <PR title>"` — Vercel labels deployments with the merge commit's first line and truncates early; no PR number in the subject. Only `sean/` merges get the prefix.

## Ask before creating a Linear ticket

**Never create a ticket without asking me first.** This covers every new issue —
sub-issues under a parent, follow-ups found mid-task, tickets a skill's workflow
would file on its own (`/triage`, `/investigate`, `/to-tickets`, `/team`). Propose
it in one line, say what it would contain, and wait. This is an addition to
`shelly-mode`'s "Always pause" list, which does not mention ticket creation and
calls itself exhaustive — this rule wins.

Moving, commenting on, and closing EXISTING tickets stays autonomous, as before.
A found-but-unfiled problem goes in the reply and in the relevant ticket's
comments, not into a new ticket.

Prefer fixing it here over filing it. When a follow-up is small and I'm already
in the session, ask whether to just do it now — a ticket is for work that
genuinely has to wait.

Once I approve a ticket, assign it to me (`assignee: "me"`) on creation. Applies
to every ticket-creating skill (`/to-tickets`, `/triage`, `/to-spec`, `/team`).

Tickets from the grill→spec→to-tickets pipeline are agent-ready by construction:
create them directly in the **Ready for Agent** status, never Triage — team Dev has
no `ready-for-agent` label, and `/work` refuses a Triage ticket. Before a child ticket
is worked, commit its `spec.md`/`decisions.md` to the branch and merge to `main`: a child
gets a fresh worktree off `origin/main` and cannot see untracked worktree files.

## Worktree & branch cleanup

**The worktree comes first — before the branch, before the first edit.** Order is worktree → branch → work, never branch-in-the-shared-checkout and relocate later. The shared checkout belongs to whichever session is sitting in it; branching there races another session's tree (2026-08-25: DEV-129 was branched and built in the main checkout, which switched to `sean/dev-48-wave-docs-reconcile` under me mid-task).

**Verify the worktree, never trust the header.** A session's launch context can name a worktree primary working directory that does not exist, while the shell is really in the shared checkout. `pwd` and `git worktree list` before the first write; if `pwd` is the repo root, create the worktree and move there whatever the header claims. `basename "$PWD"` in the first command already tells you.

Worktrees are **siblings** of the checkout, grouped under `../twd-worktrees/<slug>` (e.g. `~/Code/twd-worktrees/dev-101`) — created with `git fetch origin` then `git worktree add -b sean/<slug> ../twd-worktrees/<slug> origin/main` (worktree + branch in one step, allowed by the branch-guard even from the shared checkout), then `EnterWorktree({path})` to move the session in. The branch is named `sean/<slug>` directly — no rename. Do NOT use native `EnterWorktree({name})` — it lands inside the repo at `.claude/worktrees/<name>`, which is not our convention. After a merge, clean up worktree + local + GitHub branch per memory `worktree-cleanup-procedure` (4 steps; ExitWorktree `keep` — a path-entered worktree is never removed by ExitWorktree).

## Agent skills config

Tracked in the plugin at `${CLAUDE_PLUGIN_ROOT}/docs/agents/` (moved 2026-08-27 from the monorepo's untracked `docs/agents/`).

- **Issue tracker:** Linear, team **Dev** (`DEV-123`), via `mcp__linear__*` — not `gh`. See `${CLAUDE_PLUGIN_ROOT}/docs/agents/issue-tracker.md`.
- **Triage labels:** the default five roles as Linear labels; `/triage` creates them on first use. See `${CLAUDE_PLUGIN_ROOT}/docs/agents/triage-labels.md`.
- **Domain docs:** root `CONTEXT-MAP.md` → per-app `apps/<app>/CONTEXT.md` + `docs/adr/`, created lazily by `/domain-modeling`. See `${CLAUDE_PLUGIN_ROOT}/docs/agents/domain.md`.
