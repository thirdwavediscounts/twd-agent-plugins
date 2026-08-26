---
name: team
description: Orchestrate one Linear parent ticket's tree across agent teammates — a pane teammate per ready child/grandchild running /work, dispatch gated by parent status + blockedBy relations, Sean's sign-off and a serial merge queue as the barriers, teardown per ticket. Use when Sean says /team DEV-123, "team up on DEV-123", or "delegate DEV-123's children". Needs agent teams enabled (teammateMode iterm2); one parent per session.
---

# /team — orchestrate one ticket tree

This session is the **team-lead**: it schedules, monitors, and tears down.
It never edits code, never enters a worktree, never merges — teammates do the
work, Sean approves it, **Linear is the only source of truth** for what's done
(never this session's memory — that's what survives a lead crash).

Load once, up front:
`ToolSearch "select:mcp__linear__get_issue,mcp__linear__list_issues,mcp__linear__save_comment,SendMessage"`

## 0. Refuse the wrong input

- **Exactly one** parent `DEV-xxx`. Zero or several → stop and ask which.
- `get_issue({id, includeRelations: true})`, then the tree:
  `list_issues({parentId})` for children, again per child for grandchildren,
  and `get_issue(..., includeRelations: true)` per ticket for `blockedBy`.
- **No children?** It's a single ticket — point Sean at `/work` and stop.
- Teams not enabled (spawn returns an ordinary subagent, no mailbox line) →
  stop and say so; the fix is the settings flag + session restart.

## 1. Compute the ready set

A ticket is **ready** when ALL hold:

1. Status is Ready for Agent (a Todo/unstarted ticket without an
   investigation or spec isn't ready — `/work` will refuse it; run
   `/investigate` lanes first).
2. Every `blockedBy` relation points at a `statusType: completed` ticket.
3. Its parent-in-tree is Done — **unless** the parent is a pure container
   (spec/epic with no code of its own; the description tells you).
4. **App-disjoint** from every ticket currently running: different App label
   than all active teammates. A ticket touching `packages/*`, root config, or
   `pnpm-lock.yaml` is disjoint from **nothing** — it runs alone, with no
   siblings active.

Post the computed schedule (waves of tickets) as a comment on the parent
ticket before dispatching, so the plan survives this session.

## 2. Dispatch

- **Cap: 3 concurrent teammates** — Sean's review bandwidth is the ceiling,
  not compute. Fewer when tickets are heavy.
- Spawn via the Agent tool: `name` = ticket id lowercased (`dev-101`),
  `model: "claude-opus-4-8[1m]"` (Fable leads, Opus 4.8 builds — never Opus 5 — Sean can override).
- The teammate prompt, verbatim skeleton:

  > Run `/work DEV-nnn` end to end. You were spawned by a `/team` lead: build
  > with subagent threads or an internal Workflow only — NEVER spawn pane
  > teammates of your own (panes never nest). Hard preconditions: you must be inside
  > the ticket's own worktree (`EnterWorktree({name})` →
  > `.claude/worktrees/dev-nnn`) before reading app
  > source or editing anything — if worktree creation or EnterWorktree fails,
  > STOP and report to team-lead, do not edit in place. Stop at the first red
  > gate. Sean's localhost sign-off and push approval happen in YOUR pane —
  > never ask team-lead to approve anything on his behalf. Before your merge,
  > ask team-lead for your merge turn and rebase onto latest origin/main
  > first. SendMessage team-lead at each transition: worktree entered, gates
  > green, awaiting Sean, PR open, merged, or blocked (with why).

## 3. Monitor

React to teammate messages; between them, hold a light loop:

- **Merge queue is serial.** One merge turn at a time. Grant a turn only when
  no other teammate is mid-merge; after any merge to `main`, message every
  open teammate: rebase onto latest `origin/main` before your own merge
  (stale-base deploys are the 2026-08-11 incident — the rebase is mandatory,
  `deploy.sh`'s guard is only the backstop).
- **On a ticket reaching Done in Linear** (verify with `get_issue`, don't
  trust the message alone): recompute the ready set, dispatch newly unblocked
  tickets into free slots.
- **Liveness:** a teammate silent 15+ min with no idle notification →
  ListAgents; if gone, note where Linear says the ticket stands and respawn
  a fresh teammate to resume from that state.
- **Escalations flow to Sean, not around him.** A teammate reporting a denied
  permission, a red gate, or a scope conflict gets surfaced in the lead's
  output for Sean — never worked around by the lead or another teammate.
- **Linear is always current.** Every state change lands in Linear the moment
  it happens, not in a batch at the end: teammates move ticket status
  (In Progress → In Review → Done, per `/work`) and comment blockers on their
  ticket; the lead comments schedule changes on the parent. When the tree
  belongs to a Linear **project**, the lead also posts a project status update
  (`save_status_update`) at each wave boundary — tickets finished, what's
  running, what's parked — so the project page tells the story without
  opening tickets.

## 4. Teardown — per ticket, then the tree

Per merged ticket: `shutdown_request` to its teammate, then the standard
cleanup (worktree remove + prune, delete local and remote `sean/` branch —
CLAUDE.local.md "Worktree & Branch Cleanup").

Tree exhausted (every child/grandchild Done or explicitly parked): final
summary to Sean — per ticket: PR, status, anything parked and why — then
offer `/worklog`. Stray teammates still in ListAgents get shutdown requests.

## Crash recovery

Lead died mid-tree: rerun `/team DEV-xxx`. Re-read Linear (truth), check
ListAgents for orphaned teammates — shut down any whose ticket is Done,
re-adopt or respawn the rest. Teammates have no `/resume`; a respawned
teammate starts fresh from the ticket's Linear state, which is why status
transitions land in Linear immediately, not at the end.

## First run

The untested seam is `/work`'s own subagent pipeline running *inside* a pane
teammate. Pilot = **one teammate, one real ticket**, watched end to end.
Fan out to 2–3 only after that pilot merges clean.
