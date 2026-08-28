---
name: shelly-mode
description: Single entry point for any non-trivial task. Reads the prompt or a DEV-n Linear ticket, matches it to a playbook (investigation, bug fix, feature, refactor, review, babysit, ship, triage, plan, pickup, pause, autonomous run), and routes to the shelly skills as the steps need them. Use for /shelly-mode, and stay in it for the rest of the session once invoked.
---

# shelly-mode

Adapted from pstack's `poteto-mode` (github.com/cursor/plugins), 2026-08-24. Built around the repo owner's workflow: per-change go before push/PR/merge, `sean/` prefixes. A teammate adapts **Always pause** to their own rules. The repo's CLAUDE.md, CLAUDE.local.md, and memory always win over anything here.

**Sticky.** On invocation run `mkdir -p ~/.claude/shelly-mode && touch ~/.claude/shelly-mode/$(basename "$PWD") && echo "cwd=$PWD"` — echo the cwd, since that first command is where a phantom worktree header gets caught; the plugin's `UserPromptSubmit` hook (`hooks/hooks.json`) re-injects the mode after compaction while that marker exists. When the user opts out, delete the marker.

## Rules

1. **Todo list first.** Open a todo list whose items are the matched playbook's numbered steps, copied verbatim, before task-specific todos (TodoWrite when the harness offers it, else a scratchpad checklist echoed in the first reply). A skipped step stays listed as `skip: <reason>`.
2. **Observable facts are not questions.** Before AskUserQuestion on a "which approach" fork: if running something would answer it, sketch it via `/shelly:prototype` and let the result decide. Ask only for a product or preference call no experiment settles.
3. **Delegate bulk, keep judgment** (`/shelly:efficient-fable`). A lane writes to the repo unless the brief forbids it — "read real files" authorizes reading, not writing. Every report-only lane gets **"Read-only: report findings, edit nothing; return code as text"** verbatim, and any lane that must write gets `isolation: "worktree"`; concurrent lanes otherwise read each other's uncommitted edits and their verdicts stop being independent. For headless workers: write the packet to a file, then `claude -p --model sonnet --dangerously-skip-permissions --no-session-persistence "$(cat packet.md)" > log 2>&1 < /dev/null; echo "EXIT $?" >> log` in the background, and wait on the `EXIT` line.
4. **Principles are steering names.** Say one to redirect; cite one in a reply only when it changed a decision.

| Build less | Architecture | Proof | Delegation |
|---|---|---|---|
| laziness protocol · subtract before you add · minimize reader load · redesign from first principles · outcome-oriented execution · experience first · exhaust the design space · build the lever · foundational thinking | model the domain · boundary discipline · type-system discipline · make operations idempotent · migrate callers then delete legacy APIs · separate before serializing shared state | prove it works · fix root causes · sequence verifiable units | guard the context window · never block on the human · encode lessons in structure |
5. **A denied Bash call is a rule, not the user.** With no hook output, dump `permissions.deny`/`ask` from all four settings files and glob-test each against the full command text — heredoc bodies and quoted strings included — before any retry; an explicit go never overrides a deny. Long text (PR bodies, SQL) goes in a file via Write and `--body-file <path>`.

## Intake

**`DEV-n`** → `mcp__linear__get_issue` (with relations) + `list_comments`; route on state and content, not title:
- Triage → `/shelly:triage` for that ticket. **A ticket whose description already carries a verified root cause or acceptance criteria is Ready-for-Agent in substance — say so and promote it (one Linear write) before building, never build from Triage silently.** An agent-filed ticket routinely lands here fully formed; spending a workflow on one the board still calls unaccepted is the cost this prevents. **A spec that lives in an attachment you cannot read (expired Linear image, Slack screenshot) is not fully formed:** ask Sean for it — one question — or write the UX boxes as `provisional` and leave them unticked until he or the requester has clicked the page (DEV-167: criteria authored from code, six boxes ticked, four product rounds followed).
- Backlog / Todo → not ready. Say so; offer to promote it or run Investigation first.
- Ready for Agent, label Bug, no verified root cause in the description → `/investigate`, then stop; building is a second invocation.
- Ready for Agent with a root cause or acceptance criteria in the description (reference-doc comments are not a plan; the description is) → `/shelly:work DEV-n`, one ticket per session.
- Parent with children → `/shelly:team DEV-n`; a child whose `blockedBy` is open → name the blocker.
- In Progress with a `gitBranchName` and no work in this session → `/shelly:session-pickup` on that branch, then Feature / Bug fix.
- In Review, PR open → Babysit. PR merged with an unchecked verify checklist → report what each box waits on, tick what can be verified read-only now, stop.
- Done / Canceled → say so.

**Prose** → match a playbook by deliverable (answer, diff, verdict, merged PR, plan). A large or cross-cutting effort, or work the user steps away from → `/shelly:figure-it-out` even when a narrower playbook fits.

## Playbooks

Open the file, copy its numbered steps into the todo list.

- **Investigation** — an answer, no code change. `playbooks/investigation.md`
- **Bug fix** — every shipped line traces to runtime evidence. `playbooks/bug-fix.md`
- **Feature** — named data shape; how → architect → delegate → verify → PR. `playbooks/feature.md`
- **Refactoring** — structure changes, behavior pinned. `playbooks/refactoring.md`
- **Prototype** — a throwaway that settles one question by running. `playbooks/prototype.md`
- **Plan something big** — user-driven grill → spec → tickets; the mode does the groundwork. `playbooks/plan-something-big.md`
- **Review a diff** — `/shelly:interrogate` + `/shelly:blast-radius` on shared surfaces. `playbooks/review-a-diff.md`
- **Babysit a PR** — `/shelly:babysit-pr`. `playbooks/babysit-a-pr.md`
- **Ship** — `/shelly:ship` after a shared-surface check. `playbooks/ship.md`
- **Triage** — `/shelly:triage`. `playbooks/triage.md`
- **Autonomous run** — exit predicate first, decision trail every iteration. `playbooks/autonomous-run.md`
- **Session pickup** — `/shelly:session-pickup`. `playbooks/session-pickup.md`
- **Pause safely** — `/shelly:pause-safely`. `playbooks/pause-safely.md`
- **Verify an app** — `/shelly:verify-live` after a merge, `/shelly:create-verification-skill`, `/shelly:maintain-verification-skill`. `playbooks/verify-an-app.md`
- **Authoring a skill** — `/shelly:writing-for-agents`, dry-run, eval. `playbooks/authoring-a-skill.md`

## Always pause

Push, PR, merge (per change, never standing), any prod write, deploy, deletion, customer-facing message. "Going to bed" widens autonomy on reversible work only.

**This list is exhaustive.** Anything not on it proceeds without asking — Linear status moves and comments, branches, commits, staging writes, local gates, worktrees. A sub-skill's interactive or confirm-first mode is scoped to its own standalone invocation and never adds a pause here: when shelly-mode routed to it, run its autonomous path and report the move. Never end a turn with a menu when no item on the list is next — decide, act, say what you did.

## Reply

Lead with the result. Consumer first (who this is for, what changes for them), then maintainer (what the next engineer inherits). Keep every section the playbook names. Paths as plain absolute `path:line`; PR links as `https://github.com/<owner>/<repo>/pull/<n>`; never a fabricated link. End with the next step as a one-line offer — `/shelly:reflect` when the session held a correction, a hard-won recipe, or a wrong playbook step.
