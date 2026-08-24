---
name: shelly-mode
description: Single entry point for any non-trivial task. Reads the prompt or a DEV-n Linear ticket, matches it to a playbook (investigation, bug fix, feature, refactor, review, babysit, ship, triage, plan, pickup, pause, autonomous run), and routes to the shelly skills and the pstack ports as the steps need them. Use for /shelly-mode, and stay in it for the rest of the session once invoked.
---

# shelly-mode

Adaptation of pstack's `poteto-mode` (github.com/cursor/plugins), 2026-08-24, for the twd fleet.

Sticky: once invoked, apply it on every later turn that matches a playbook or needs rigor; stay out of the way on casual turns. the user opts out by saying so. The repo's CLAUDE.md, CLAUDE.local.md, and memory rules always win over anything here (push/PR/merge approval per change, prod read-only, `sean/` prefixes, runbook shape, secrets never in the transcript).

## Non-negotiables

1. **Todo list first.** For any multi-step task, open a todo list whose items are the matched playbook's steps, copied verbatim, before task-specific todos. A step you skip stays in the list as `skip: <reason>`. Silent skips are the failure mode this exists for.
2. **Principles once per session.** Read `principles.md` (same directory) the first time shelly-mode fires in a session, not per task. Cite a principle in a reply only when it changed a decision, and name the decision. No citation ceremony.
3. **Observable facts are not questions.** Before AskUserQuestion on a "which approach / what should this do" fork, classify it. If running something would answer it (behavior, timing, layout, output, perf), sketch it via `/shelly:prototype` and let the result decide. Ask only for a product or preference call no experiment can settle.
4. **Name the data shape first** for any code, and its organizing structure (state machine, typed model, table, reducer) before a delegate writes logic.
5. **Delegate bulk, keep judgment** per `/shelly:efficient-fable`: research, mechanical edits, test runs, log reduction → subagents on sonnet/haiku; design, synthesis, verdicts, final diff review → this session. Own every delegate's work: read the diff, write your own summary. If the Agent tool fails trying to open a terminal pane (this session's teammateMode isn't in-process), fall back to headless workers: `claude -p --model sonnet --dangerously-skip-permissions --no-session-persistence "<packet>" > log &`, packet written as a file first, read the log when it exits.
6. **Every prose surface is unslopped** (`/shelly:unslop` rules), including the reply. Comments: only a non-obvious *why*; never phase narration in scripts or tests.
7. **Prove it before saying done.** Real runtime path, falsified once; delegate summaries are leads, not evidence.

## Intake

**A `DEV-n` argument** → fetch it (`mcp__linear__get_issue` with relations, plus `list_comments`) and route on its state and content, not its title:
- Triage → `/shelly:triage` for that ticket.
- Backlog / Todo → not ready. Say so; offer to promote it (Ready for Agent) or run Investigation first. Never start building from Backlog.
- Ready for Agent, label Bug, and the description has no verified root cause → Investigation via `/investigate` (posts findings + sub-issues to the ticket), then stop; building is a second invocation.
- Ready for Agent with a root cause or acceptance criteria in the description (features from `/to-tickets` arrive this way; reference-doc comments are not a plan but the description is) → `/shelly:work DEV-n`, one ticket per session.
- A parent with children (epic) → `/shelly:team DEV-n`; a child whose `blockedBy` is open → say what blocks it.
- In Progress with a `gitBranchName` and no work in this session → `/session-pickup` on that branch, then continue as Feature / Bug fix.
- In Review, PR open → Babysit; PR merged and the description carries an unchecked verify checklist → report which boxes are still waiting on a date or event, check any that can be verified now (read-only), and stop. Review only when the user asks.
- Done / Canceled → say so, nothing to do.

**A prose prompt** → match the playbook below by what the deliverable is (an answer, a diff, a verdict, a merged PR, a plan). A large or cross-cutting effort, or work the user steps away from, routes to `/figure-it-out` even when a narrower playbook fits.

## Playbooks

Match the task, open the playbook file, copy its numbered steps verbatim into the todo list. One line here per playbook; the file is the contract.

- **Investigation.** Read-only: how does X work, why was Y built this way, are we sure, X or Y? → `/how` (Explain or Critique mode); motivation questions add `/why`; a cross-system symptom with an unknown cause → `/investigate`, which also posts the plan to Linear. `playbooks/investigation.md`
- **Bug fix.** Every shipped line traces to runtime evidence. `playbooks/bug-fix.md`
- **Feature.** New or changed behavior, built from a named data shape; `/how` → `/architect` → delegate → verify → PR. `playbooks/feature.md`
- **Refactoring.** Behavior unchanged, structure changes. `playbooks/refactoring.md`
- **Prototype.** A throwaway sketch that settles one question by running it. `playbooks/prototype.md`
- **Plan something big.** The user drives these (they're user-invoked): suggest `/shelly:grill-with-docs` (or `/shelly:wayfinder` when questions keep chaining) → `/shelly:to-spec` → `/shelly:to-tickets`. `playbooks/plan-something-big.md`
- **Review a diff.** `/interrogate` (Claude standards reviewer + Codex cross-model + security auditor + one opus reviewer; lead judgment here) and `/shelly:blast-radius` when the diff touches a shared surface. `playbooks/review-a-diff.md`
- **Babysit a PR.** "Check on PR N", "get it green", "anything outstanding" → `/babysit-pr`. `playbooks/babysit-a-pr.md`
- **Ship.** "Ship it", "push and merge" → `/shelly:ship` after a shared-surface check. `playbooks/ship.md`
- **Triage.** `/shelly:triage` (interactive or `auto`). `playbooks/triage.md`
- **Autonomous run.** "Run until done", "going to bed", `/loop until X`. `playbooks/autonomous-run.md`
- **Session pickup.** Resuming a prior session's branch, worktree, or transcript → `/session-pickup`. `playbooks/session-pickup.md`
- **Pause safely.** Explicit pause, going offline, or imminent context compaction → `/pause-safely`. `playbooks/pause-safely.md`
- **Verify an app.** No scripted way to prove an app's behavior → `/create-verification-skill` (feature map + verify skill inside `apps/<x>/`); drifted → `/maintain-verification-skill`. `playbooks/verify-an-app.md`
- **Authoring a skill.** `/shelly:writing-for-agents`; test a behavior change with `plugins/shelly/evals/run.py <case>` before promoting it. `playbooks/authoring-a-skill.md`

## Always pause

Push, PR, merge (per change, never standing), any prod write, deploy, deletion, outward message (Linear comments are fine; customer-facing anything is not). "Going to bed" widens autonomy on reversible work only.

## Reply

Lead with the result. Short declarative sentences. Frame for the consumer first (who this is for, what changes for them) and then the maintainer (what the next engineer inherits). Keep every section the playbook names. File paths as plain absolute `path:line`. PR links as `https://github.com/<owner>/<repo>/pull/<n>`. Never fabricate a link or citation. End with the next step as a one-line offer. If the session held a correction from the user, a recipe that took real effort to find, or a playbook step that turned out wrong or missing, that offer is `/shelly:reflect` (user-invoked; never run it yourself).
