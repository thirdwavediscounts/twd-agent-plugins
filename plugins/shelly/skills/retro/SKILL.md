---
name: retro
description: Retrospective hygiene pass on the agent's environment — prune no-op rules, split bloated CLAUDE.md / CLAUDE.local.md / MEMORY.md, move prose into hooks/policy tests, push standards onto the review agents, add navigation pointers, streamline expensive tool calls. Use when Sean says retro, or periodically when the steering surface has grown large. Adapted from Matt Pocock's retro.
disable-model-invocation: true
---

# Retro

Improve the **environment** future sessions run in, not the lessons in it. `reflect` grows the steering surface — it captures what a session learned into skills, memory, and CLAUDE.md. Retro is the counterweight: read a session (or the accumulated steering) and cut, consolidate, and relocate so the surface stays legible and cheap. Reach for `reflect` to capture a learning; reach for retro to keep the pile that captures into from crushing every future turn.

## The two loads every instruction spends

- **Context load** — always-loaded material on every agent's window: a CLAUDE.md line, a skill description, a MEMORY.md hook. It spends tokens and attention every turn whether or not it fires.
- **Review-time material** — read only when it's needed: a review agent's rules, a doc behind a pointer, a policy test that runs in CI.

The implementer agent is context-starved — it explores, writes, and debugs under the most pressure. The review agent gets a clean diff and the least pressure. So **standards belong on the review agent, and CLAUDE.md belongs to navigation pointers, not rules.** Every rule you can move off the always-loaded surface and onto a reviewer, a hook, or a policy test is load returned to the implementer. (Background on both loads and on context pointers: the `writing-for-agents` skill.)

## Steps

1. Read the primary source. Default to the current session; if Sean names another, find it in the session logs on this machine. Read what actually happened — the dead ends, the searches, the corrections — not a summary of it.

2. Walk every lever below against that session and against the steering files it touched. Each lever names *when it fires* — only report a candidate you have real evidence for.

3. Present candidates to Sean, ranked by severity, one line each, using the grilling format if any is his call. This skill proposes; it does not silently edit steering. Apply approved edits directly (load `writing-for-agents` before a non-trivial skill or CLAUDE.md edit); file repo-enforceable changes as backlog needing a branch and his go-ahead.

## The levers

- **No-ops** — an instruction the model already obeys by default. The test is model-relative: does the line change behavior versus no line? Delete the whole sentence when it fails, don't trim it. *Fires when* CLAUDE.local.md or a skill has grown long and parts of it merely restate the default.
- **Bloat / sprawl** — a steering file so long attention thins across it, even where each line is live. CLAUDE.md, CLAUDE.local.md, and MEMORY.md are the usual suspects here — they only grow. *Fires when* a file is too long to hold in one read; the cure is to disclose reference behind a pointer or split by topic.
- **Prose → structural enforcement** — a rule enforced more reliably by a hook, a policy test (`apps/*/tests/*Policy.test.ts`), a lint, or `ci-local` than by words. Text is the weakest enforcement. *Fires when* the session broke a rule that prose was supposed to hold, or an existing hook/test over- or under-fired.
- **Standards → review agent** — a coding rule sitting in always-loaded steering that the review agents (`plugins/shelly/agents/code-reviewer.md`, `codex-reviewer.md`, `qa-gate.md`, `security-auditor.md`) or `packages/guidelines/EXAMPLES.md` should own instead. *Fires when* a defect slipped past review, or an implementer-facing rule is really a review concern.
- **Navigation** — the session spent turns hunting for a file, a DB object, or a cross-app dependency. A one-line **navigation pointer** in the nearest CLAUDE.md (or a `CONTEXT.md`) would have named it. *Fires when* finding a piece of information took real digging.
- **Tool economy** — an expensive or repeated tool sequence that a helper script, a saved query, or a tighter invocation would collapse. *Fires when* the agent burned tokens on a call pattern it will repeat.
- **Information access** — a fact the agent needed but couldn't reach: an untee'd dev-server log, a service it had no read path to, a DB object it inferred instead of querying. *Fires when* a crucial piece of information was out of reach and a standing access path would fix it.

## Where an accepted edit goes

- A rule about how to work → the owning skill, else CLAUDE.md / CLAUDE.local.md at the narrowest scope. A rule the review agents should enforce → their prompts or `packages/guidelines/EXAMPLES.md`, and off the implementer's surface.
- A fact or state → a memory file (one fact per file, update the MEMORY.md index).
- A repo-enforceable rule → a hook, a policy test, or `ci-local` — filed as backlog, never silently applied.
- A no-op or a dead line → deleted, with the reason named in the summary.
