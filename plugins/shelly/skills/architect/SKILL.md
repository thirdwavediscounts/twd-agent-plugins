---
name: architect
description: Sketch types, signatures, and module structure before code, then stay in the loop while implementation fills in. Use for "architect this", "design this", or non-trivial work where jumping to code would lock in the wrong shape.
---

# Architect

Local port of pstack `architect` (github.com/cursor/plugins), 2026-08-24.

Design before implementing. Sketch types, function signatures, class shapes, and module boundaries with `not implemented` bodies and pseudocode. Synthesize across multiple parallel design attempts, then fill in code against the chosen sketch. If implementation proves the sketch wrong, throw it out and redesign.

## Start

Open a todolist with one entry per phase before starting. Autonomous work without checkpoints needs the list to show phase position and keep phases from silently disappearing.

1. Ground
2. Sketch
3. Agree
4. Implement
5. Scrap

## Phase A: Ground the problem

Build a real mental model of every system the new code touches. Spawn the `shelly:code-analyst` agent to trace the relevant subsystems and report file:line references, not a summary of file names.

Naming a file isn't grounding. If the design redefines ownership or layering between existing modules, have code-analyst also trace why the current shape looks the way it does, so the rationale becomes a constraint on the new design, not a guess.

Skip Phase A only when the work is genuinely greenfield with no surrounding system to integrate.

## Phase B: Sketch

Run the **arena** skill (`../arena/SKILL.md`) with the design-sketch task and the Phase A grounding artifacts. Pass `references/runner-prompt.md` as each runner's prompt. Each candidate produces a design package shaped per `references/rationale-template.md`: the caller's usage written first, then the type sketch, function signatures, module map, and prose rationale derived from it.

Spawn runners with the Agent tool, model `sonnet` or `opus`. Use the Workflow tool when you want N runners fanned out deterministically (one `agent()` call per candidate, same prompt, isolated output paths) instead of hand-tracking N parallel Agent calls. Fable (this session) does the cross-candidate judgment and synthesis.

Design it twice. Require at least two structurally distinct candidates before synthesis, even when the first looks sufficient — exhaust the design space before picking. Whole-shape alternatives, not point fixes inside one shape.

Screen every candidate against [`references/design-red-flags.md`](references/design-red-flags.md) before synthesis. Reject or revise shallow modules, information leakage, temporal decomposition, and pass-through methods.

Compare viable candidates on interface depth. Prefer the design that hides more complexity behind a smaller, simpler public surface. A rich interface can keep call chains short by concentrating capability instead of scattering it across layers.

Arena returns one synthesized design package. The synthesis decision populates the rationale's "Synthesis decision" section.

## Phase C: Agree (opt-in)

Default: proceed directly to implementation with the synthesized design. No human checkpoint.

Opt in to a checkpoint when the invoker explicitly asks: "architect with checkpoint," "stop and show me before implementing," or similar. Then surface the synthesized design via the AskUserQuestion tool and pause for sign-off.

The synthesis can ship as its own commit either way, so later commits read as filling in bodies against a stable contract. Planned and scoped breakage during fill-in is fine. For adversarial pressure on the design before implementing, run the **interrogate** skill (`../interrogate/SKILL.md`) on the synthesized sketch.

If the human pushes back on the shape (in a checkpoint or after the fact), treat that as Phase A evidence. Re-ground and re-run Phase B before writing more code.

## Phase D: Implement against the sketch

Replace `not implemented` bodies with code, pseudocode with logic. The synthesized sketch is the contract.

Deviations from the sketch are signal worth surfacing, not friction to absorb silently. If a function needs a parameter the sketch didn't anticipate, ask whether the sketch was wrong, the requirement was missed, or the implementation is overreaching. Surface it; don't bolt it on.

## Phase E: Scrap when the architecture is wrong

If implementation keeps producing friction the sketch can't absorb, throw the sketch out. Don't bolt fixes onto a wrong design — redesign from first principles and fix the root cause, not the symptom.

The signal is a *pattern*, not single instances. Tells:

- The same shape of workaround appearing repeatedly across unrelated code.
- Multiple unrelated edge cases that all need special-case branches.
- Types that need escape hatches (`any`, casts, optional fields always set in practice) to compile.
- The "we need a lock" reflex when the sketch said the state wasn't shared.
- Callers having to know the abstraction's internal rules to use it.
- Two or more independent Phase D deviations of the same shape across the implementation. Surfacing deviations is Phase D's job; a repeated pattern of them is Phase E's trigger.

Use judgment. A few edge cases don't condemn an architecture. Some problems are legitimately complex; complexity in the data is not complexity in the design. The rewrite signal is repeated friction of the same shape, not single hard cases.

When you scrap:

1. Re-run Phase A's grounding over what's been built. The implementation lessons enter the new design as inputs, not vibes.
2. Redesign as if the new constraints had been day-one assumptions.
3. Subtract before adding — the new sketch should be smaller than the old one before it grows.
4. Return to Phase B and re-run arena.

## Outputs

The caller's usage is written first and the type sketch derived from it. One file with new types and signatures for small changes; module map plus type definitions for larger work. The rationale ships alongside, shaped per `references/rationale-template.md`, including the usage sketch and the synthesis decision.
