---
name: to-spec
description: Turn the current conversation into a spec — saved to the feature's docs folder and published to Linear. No interview, just synthesis of what was already discussed.
disable-model-invocation: true
---

# To Spec

Take the current conversation context and codebase understanding and produce a spec. Do NOT interview the user — grilling already happened; this is synthesis. If big questions are genuinely unresolved, say so and offer another grilling round instead of guessing.

Tracker: Linear, team **Dev** (keys `DEV-n`), via the `mcp__linear__*` tools.

## Process

1. Explore the repo to understand the current state of the codebase, if you haven't already. Use the project's domain glossary vocabulary throughout, and respect any ADRs in the area you're touching.

2. Sketch the seams at which the feature will be tested. Prefer existing seams; use the highest seam possible; the fewer new seams the better — the ideal number is one. Check with the user that these seams match their expectations.

3. Write the spec using the template below, run it through the `unslop` skill, then deliver it to BOTH homes:
   - **File**: `spec.md` in the feature's docs folder (per domain-modeling's "Where docs go": `apps/<x>/docs/<feature>/spec.md` for app-scoped work, `docs/<project>/spec.md` for cross-cutting). State the final path.
   - **Linear**: a parent issue in team Dev carrying the spec as its body, labeled `ready-for-agent`. If a Linear Project already exists for this work, attach the issue to it. (Project creation itself is `/to-tickets`' job — don't create one here.)

4. Close with the next step: _"Spec's up — slice it into tickets? (`/to-tickets`)"_

<spec-template>

## Problem Statement

The problem the user is facing, from the user's perspective.

## Solution

The solution, from the user's perspective.

## User Stories

A LONG, numbered list: "As an <actor>, I want <feature>, so that <benefit>". Extensive — cover all aspects of the feature.

## Implementation Decisions

The decisions that were made: modules built/modified and their interfaces, architectural decisions, schema changes, API contracts, specific interactions. Do NOT include specific file paths or code snippets — they go stale fast. Exception: a prototype-produced snippet that encodes a decision more precisely than prose (state machine, reducer, schema, type shape) — inline the decision-rich part and note it came from a prototype.

## Testing Decisions

What makes a good test here (external behavior only), which modules get tested, prior art for the tests in this codebase.

## Out of Scope

What this spec deliberately excludes.

## Further Notes

Anything else that matters.

</spec-template>
