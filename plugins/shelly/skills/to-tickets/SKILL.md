---
name: to-tickets
description: Break a plan, spec, or the current conversation into tracer-bullet tickets in Linear — a Project (when the work is a real project), a parent ticket, children and grandchildren where needed, native blocking links, ready-for-agent labels.
disable-model-invocation: true
---

# To Tickets

Break a plan, spec, or conversation into **tickets** — tracer-bullet vertical slices, each declaring the tickets that **block** it — structured in Linear so nothing blurs across projects.

Tracker: Linear, team **Dev** (keys `DEV-n`), via the `mcp__linear__*` tools. Repo triage labels may be defined in `docs/agents/triage-labels.md`.

## Process

### 1. Gather context

Work from what's already in the conversation. If the user passes a reference (a spec path, a `DEV-n`, a Linear URL), fetch it and read its full body and comments.

### 2. Explore the codebase (if you haven't)

Ticket titles and descriptions use the project's domain glossary vocabulary and respect ADRs in the area. Look for prefactoring opportunities — "make the change easy, then make the easy change."

### 3. Draft vertical slices

<vertical-slice-rules>

- Each slice cuts a narrow but COMPLETE path through every layer (schema, API, UI, tests) — vertical, NOT a horizontal slice of one layer
- A completed slice is demoable or verifiable on its own
- Each slice is sized to fit in a single fresh `/work` session
- Any prefactoring is its own ticket, done first

</vertical-slice-rules>

Give each ticket its **blocking edges** — the tickets that must complete before it can start. A ticket with no blockers can start immediately.

**Wide refactors are the exception to vertical slicing.** A wide refactor is one mechanical change (rename a column, retype a shared symbol) whose blast radius fans across the codebase, so no vertical slice can land green. Sequence it as **expand–contract**: expand (add the new form beside the old), migrate call sites in batches sized by blast radius (each batch its own ticket blocked by the expand), contract (delete the old form, blocked by every migrate batch). If even batches can't stay green alone, share an integration branch that all block a final integrate-and-verify ticket.

### 4. Decide the Linear structure

- **Ask the user: is this a real project?** (Multi-ticket, worth tracking as a unit → yes.) If yes, create a Linear **Project** and put every ticket in it. If it's one or two tickets, skip the Project.
- **Parent ticket**: one per coherent piece of work — carries the spec (link the spec.md path and/or the `/to-spec` issue) and acts as the tree root `/team` can orchestrate.
- **Children**: the tracer-bullet slices, as sub-issues of the parent.
- **Grandchildren**: only when a child genuinely decomposes further (e.g. an expand–contract sequence inside one slice). Don't force a third level.
- **Blocking edges**: use Linear's native blockedBy relations, never prose-only.

### 5. Quiz the user

Present the proposed breakdown as a numbered list — use the grilling question format for the open choices. For each ticket show **Title**, **Blocked by**, **What it delivers** (the end-to-end behaviour, from the user's perspective). Ask: granularity right? edges correct? merge or split anything? Iterate until approved.

### 6. Publish

Create the Project (if agreed), then the parent, then children/grandchildren in dependency order (blockers first) so edges reference real `DEV-n` identifiers. Set native blockedBy relations. Label tickets `ready-for-agent` unless instructed otherwise — they're agent-grabbable by construction (they came from a spec, so `/work` accepts them without a separate investigation). Run ticket bodies through `unslop`.

Do NOT close or modify any pre-existing parent issue.

<issue-template>

## Parent

Reference to the parent issue (omit on the parent itself; the parent links the spec instead).

## What to build

The end-to-end behaviour this ticket makes work, from the user's perspective — not layer-by-layer implementation.

## Acceptance criteria

- [ ] Criterion 1
- [ ] Criterion 2

## Blocked by

- Each blocking `DEV-n`, or "None — can start immediately".

</issue-template>

Avoid specific file paths or code snippets — they go stale. Exception: a prototype-produced snippet that encodes a decision (state machine, schema, type shape) — inline the decision-rich part and note its origin.

### 7. Close with the next step

_"Tickets are up under <project/parent>. Work the frontier: `/work DEV-nnn` for one, `/team DEV-parent` for the tree."_
