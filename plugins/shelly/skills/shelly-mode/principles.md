# Principles — steering vocabulary

Adapted from pstack's 21 principle skills (github.com/cursor/plugins), collapsed to one page. Read once per session. Say a name to redirect the work; cite one in a reply only when it changed a decision, and say which.

The repo CLAUDE.md's four rules already cover most of these: Think before coding (foundational thinking, model the domain, exhaust the design space), Simplicity first (laziness, subtract, minimize reader load), Surgical changes (boundary discipline, migrate-then-delete), Goal-driven execution (prove it works, sequence verifiable units). The rest are named here so they can be invoked.

## Core — how much to build, when to rethink
- **Laziness protocol.** The smallest change that solves it; bias to deletion; no layers, flags, or signal threading for one caller.
- **Foundational thinking.** Core types and data structures before logic; scaffold before feature; name what concurrent actors share.
- **Redesign from first principles.** A new requirement is integrated as if it had been there from day one, not bolted on.
- **Subtract before you add.** Delete dead weight first, then build on the simpler base.
- **Minimize reader load.** Count layers and hidden state; collapse one-caller wrappers; shrink mutable scope. The success measure of a refactor.
- **Outcome-oriented execution.** Rewrites converge on the target design; no throwaway compatibility states preserved.
- **Experience first.** The user's result over implementation convenience.
- **Exhaust the design space.** No precedent → 2–3 competing prototypes before committing (`/arena`, `/architect`).
- **Build the lever.** For non-trivial work, build the script/codemod that does or proves it; the tool is what a reviewer reruns.

## Architecture — where state, validation, compatibility live
- **Model the domain.** Repeated conditionals or shape assumptions → one structure: state machine, typed model, table/registry, reducer, the right collection.
- **Boundary discipline.** Validate at system boundaries (zod at the edge), trust internal types, keep business logic pure.
- **Type-system discipline.** Illegal states unrepresentable; brand primitives; parse external data at the boundary.
- **Make operations idempotent.** Commands, lifecycle steps, and loops that run amid retries converge on the same end state.
- **Migrate callers, then delete legacy APIs.** One wave: migrate every caller and delete the old path. No shims, no parallel old-and-new.
- **Separate before serializing shared state.** Concurrent writers to one file/branch/key → eliminate the sharing first (worktrees, split targets); locks only for real invariants.

## Verification — what counts as proof
- **Prove it works.** The real artifact, not a proxy: run the path, read the value, inspect the diff. Falsify the check once. "It compiles" and a delegate's summary are not evidence.
- **Fix root causes.** Reproduce first; ask why until the mechanism is confirmed by runtime evidence; belt-and-suspenders "might help" changes get reverted.
- **Sequence verifiable units.** Small units, each ending in a check, verified before the next; commits ordered so the history proves itself (failing test lands before the fix).

## Delegation
- **Guard the context window.** Bulk reads, long logs, fan-out planning → subagents; summaries in the main thread (`/shelly:efficient-fable`).
- **Never block on the human.** Reversible work proceeds; present the result. Ask only for irreversible actions, product/preference calls no experiment settles, or a real dead end. An observable fact is prototyped, not asked.

## Meta
- **Encode lessons in structure.** Writing the same instruction a second time → make it a lint, test, script, or metadata flag instead of more prose (`/shelly:reflect`).
