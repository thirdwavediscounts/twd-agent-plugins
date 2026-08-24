---
name: domain-modeling
description: Build and sharpen a project's domain model. Use when discussing codebase terminology, writing or editing a CONTEXT.md, recording or editing an ADR, or capturing decision docs during a grilling/wayfinder session.
---

# Domain Modeling

Actively build and sharpen the project's domain model as you design. This is the *active* discipline — challenging terms, inventing edge-case scenarios, and writing the glossary and decisions down the moment they crystallise. (Merely *reading* `CONTEXT.md` for vocabulary is not this skill.)

## Where docs go

Repo config wins: if `docs/agents/domain.md` (or a `CONTEXT-MAP.md`) exists, follow its layout for CONTEXT.md and ADRs. In the twd monorepo that means root `CONTEXT-MAP.md` → per-app `apps/<x>/CONTEXT.md` + `apps/<x>/docs/adr/`, created lazily.

**Session docs** (decision notes, open questions, the eventual spec) live in the feature's own docs folder, created at the start of the work and appended to as the session proceeds:

- Feature belongs to one app → `apps/<x>/docs/<feature>/` (git-tracked, and inside the app so it never triggers a fleet rebuild).
- Cross-cutting or still-exploratory → `docs/<project-or-feature>/` at the repo root (gitignored: no rebuild, but **local-only** — say so when you put something there, and promote it to an app's docs folder or `packages/guidelines/` when it needs to be shared).
- Never create a new tracked root-level path — that rebuilds all 12 Vercel projects.

One folder per project/feature; subfolders are fine. Keep a `decisions.md` (running log, one dated bullet per settled decision) so the folder accumulates the brainstorm as Sean asked, instead of decisions living only in chat scrollback.

Create files lazily — only when you have something to write.

## During the session

### Challenge against the glossary

When the user uses a term that conflicts with the existing language in `CONTEXT.md`, call it out immediately. "Your glossary defines 'cancellation' as X, but you seem to mean Y — which is it?"

### Sharpen fuzzy language

When the user uses vague or overloaded terms, propose a precise canonical term. "You're saying 'account' — do you mean the Customer or the User? Those are different things."

### Discuss concrete scenarios

Stress-test domain relationships with specific scenarios that probe edge cases and force precision about the boundaries between concepts.

### Cross-reference with code

When the user states how something works, check whether the code (and in this repo, the live database via the Supabase MCP) agrees. Surface contradictions: "Your code cancels entire Orders, but you just said partial cancellation is possible — which is right?"

### Update CONTEXT.md and decisions.md inline

When a term is resolved, update `CONTEXT.md` right there; when a decision lands, append it to the feature folder's `decisions.md`. Don't batch these up. Use the format in [CONTEXT-FORMAT.md](./CONTEXT-FORMAT.md).

`CONTEXT.md` is a glossary and nothing else — no implementation details, no spec content. Spec and implementation decisions belong in the feature folder and `/to-spec`.

### Offer ADRs sparingly

Only offer to create an ADR when all three are true:

1. **Hard to reverse** — the cost of changing your mind later is meaningful
2. **Surprising without context** — a future reader will wonder "why did they do it this way?"
3. **The result of a real trade-off** — there were genuine alternatives and you picked one for specific reasons

If any of the three is missing, skip the ADR. Use the format in [ADR-FORMAT.md](./ADR-FORMAT.md).
