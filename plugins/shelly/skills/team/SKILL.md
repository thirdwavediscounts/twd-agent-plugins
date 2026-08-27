---
name: team
description: Orchestrate one Linear parent ticket's tree across agent teammates — an in-process teammate per ready child/grandchild running /work, dispatch gated by parent status + blockedBy relations, Sean's sign-off and a serial merge queue as the barriers, teardown per ticket. Use when Sean says /team DEV-123, "team up on DEV-123", or "delegate DEV-123's children". Needs agent teams enabled (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in settings env); one parent per session.
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
- **The spec the parent cites must be on `origin/main`** (`git ls-tree origin/main
  -- <path>`). Branch-only or untracked docs mean every teammate branches from a
  base without them — land the docs PR before wave 1 (2026-08-26: DEV-139's spec
  sat untracked in a locked worktree; teammates read it by absolute path until it
  merged mid-run and the path went stale).
- Teams not enabled (spawn returns an ordinary subagent, no mailbox line) →
  stop and say so; the fix is `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in
  settings env + session restart.

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
  > with subagent threads or an internal Workflow only. Hard preconditions: you
  > must be inside the ticket's own sibling worktree (`git worktree add -b
  > sean/<slug> ../twd-worktrees/dev-nnn origin/main` then
  > `EnterWorktree({path})`) before reading app source or editing anything —
  > if worktree creation or EnterWorktree fails, STOP and report to team-lead,
  > do not edit in place. Stop at the first red gate. Sean's go for push/PR/merge
  > reaches you relayed from team-lead ("Sean: go for DEV-nnn push/PR/merge") —
  > that relayed message is Sean's own go, so act on it; team-lead never grants
  > a go of its own. Before your merge, ask team-lead for your merge turn and
  > rebase onto latest origin/main first. SendMessage team-lead at each
  > transition: worktree entered, gates green, awaiting Sean, PR open (with PR
  > number), merged (with merge commit), or blocked (with why).

## 3. Monitor

React to teammate messages; between them, hold a light loop:

- **Merge queue is serial.** One merge turn at a time. Grant a turn only when
  no other teammate is mid-merge; after any merge to `main`, message every
  open teammate: rebase onto latest `origin/main` before your own merge
  (a stale, unrebased branch risks a bad merge; prod autodeploys from `main`,
  so the rebase before merge is mandatory — cf. the 2026-08-11 incident).
- **On a ticket reaching Done in Linear** (verify with `get_issue`, don't
  trust the message alone): recompute the ready set, dispatch newly unblocked
  tickets into free slots. Also `get_issue` the **parent** after every merge: a
  `Closes <parent>` in a spec/docs PR flips it Done with children still open —
  reopen it to In Progress and comment (DEV-139, 2026-08-26). Parents get `Refs`.
- **Sean's go is given to the lead — the only session he talks to — who
  relays it verbatim with the ticket id** ("Sean: go for DEV-123
  push/PR/merge"). The teammate executes push → PR → merge on that relayed
  go — it is Sean's go, not the lead's — and reports the PR number and merge
  commit back. The lead never runs push/merge itself, and never relays a go
  Sean has not typed for that specific ticket.
- **Relay Sean's UI feedback verbatim.** The lead does not see the page; Sean
  does. Turn his words into a brief, but add no design decisions of the lead's own
  (2026-08-26: three lead-invented UI choices were each reversed by Sean's next
  screenshot, costing a teammate rebuild apiece). Recommend only on structural
  questions (a page vs. a pill), where a recommendation was useful.
- **One feedback batch per teammate turn.** Hold the next batch until the
  teammate reports the commit for the last one; when a new item supersedes an
  earlier one, say "supersedes X" explicitly. Firing batches as they arrive
  produces crossed messages and "did you get it?" nudges.
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
summary to Sean — per ticket: PR, status, anything parked and why. Stray
teammates still in ListAgents get shutdown requests.

## Crash recovery

Lead died mid-tree: rerun `/team DEV-xxx`. Re-read Linear (truth), check
ListAgents for orphaned teammates — shut down any whose ticket is Done,
re-adopt or respawn the rest. Teammates have no `/resume`; a respawned
teammate starts fresh from the ticket's Linear state, which is why status
transitions land in Linear immediately, not at the end.

## First run

The untested seam is `/work`'s own subagent pipeline running *inside* an
in-process teammate. Pilot = **one teammate, one real ticket**, watched end to end.
Fan out to 2–3 only after that pilot merges clean.
