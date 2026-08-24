---
name: reflect
description: Mine the current session for durable learnings and route each into a concrete edit — a skill, a memory file, or a CLAUDE.md correction. Use when Sean says reflect, after a correction mid-task, or when a hard-won recipe from this session is worth keeping.
disable-model-invocation: true
---

# Reflect

Mine the current conversation for durable learnings, then route them into edits on the things that shape future sessions: skills (`~/Code/twd-agent-plugins/plugins/shelly/skills/*`), memory files, CLAUDE.md / CLAUDE.local.md, and agent prompts (`.claude/agents/*`).

## When it's worth running

- Sean said "reflect".
- Sean corrected the approach mid-task (the trigger the self-improvement loop already names).
- A complex task just landed and the recipe generalizes.
- The session hit dead ends before finding the working path, and the path generalizes.

Skip when the session is trivial, or the lesson is already captured somewhere that future sessions load. One-offs are not learnings.

## Process

### 1. Three parallel reviewers

Spawn three `fork` subagents in one message — forks inherit this conversation, so no transcript hunting. Each is read-only: it reports findings, never edits.

- **Judgment lens**: where did reasoning go wrong or right — a misdiagnosis, a wrong default, a decision that should have been asked vs. made? What rule would have prevented the miss or reproduced the win?
- **Tooling lens**: which tool paths were wasteful, which commands/flags/sequences turned out to be the right recipe, what did we look up that should be written down (paths, invocations, gotchas)?
- **Divergent lens**: what would a skeptic say we still got wrong or left unexamined? What almost became a lesson but is actually a one-off?

Each reviewer returns: finding, evidence from the session, proposed routing (which file, what edit, roughly what text), and a confidence.

### 2. Synthesize

You (the parent) merge the three reports into **Accepted / Rejected / Backlog**:

- Reject one-offs, restatements of rules that already exist, and anything the session actually followed correctly.
- **Structural-enforcement check**: if a lesson would be enforced more reliably by a hook, policy test, script, or lint than by prose, route it there (Backlog: a repo change) instead of adding words to a skill. Text is the weakest enforcement.
- Route each accepted item precisely:
  - Fact about how something works, state of ongoing work → **memory file** (follow the memory instructions: one fact per file, update the index).
  - Rule about how to work → the **owning skill** if one exists (a skill that should have fired but didn't gets its *description* tuned, not its body), else **CLAUDE.md / CLAUDE.local.md** at the narrowest scope that covers it.
  - Repo-enforceable → Backlog as a proposed repo change (needs a branch and Sean's go-ahead).

### 3. Approve, then apply

Present Accepted / Rejected / Backlog to Sean — one line each, using the grilling format if any routing is genuinely his call — and wait for approval. Skill and CLAUDE.md edits shape every future session; never auto-apply.

For approved items: apply memory/skill/CLAUDE.md edits directly (load `writing-for-agents` before non-trivial skill edits). Backlog repo changes get filed or offered, not silently made.

### 4. Summarize

Short list, no preamble: edits applied (path + one line), backlog filed/offered, dropped findings with the reason.
