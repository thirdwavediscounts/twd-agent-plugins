---
name: figure-it-out
description: "Design an auditable playbook when no narrower skill fits: a large migration, an ambitious multi-part change, or work the user reviews after stepping away. Scales rigor to the task, runs a hypothesis loop, and leaves a decision trail. Use for '/figure-it-out', 'figure it out', a large migration, or when no narrower skill applies."
---

# Figure it out

Local port of pstack `figure-it-out` (github.com/cursor/plugins), 2026-08-24.

When the task matches no narrower skill, design one. The deliverable before any code is the workflow itself: a sequence of phases that scales rigor to the task, runs the scientific method, and leaves a decision trail a human can audit after stepping away. Bias toward more rigor. The cost of building the wrong thing dwarfs the cost of being careful.

Don't reinvent a playbook that already exists. A focused single-unit task routes to a narrower skill: a bug fix to `/shelly:diagnosing-bugs`, a design question to `/shelly:prototype`, a risky diff to `/shelly:blast-radius`, a ticket to `/shelly:work`. But a large or cross-cutting version of one of those (a migration across many call sites, an ambitious multi-part change), or work reviewed after stepping away, belongs here even though a single-unit version would route elsewhere. The rigor and the audit trail are the point.

## Start

Open a todolist with the phases below as items.

## Phase A: Frame

Ground first, then commit. Don't start the run until you can state:

- The definition of done as a falsifiable predicate: a check you can actually run and get a pass/fail from, not "done well" left as a vibe.
- Scope, quantified: rough units and effort, plus any blockers surfaced by grounding. Raise them before spending hours, not after fifty doomed commits.
- The rigor level, biased high. One-way doors and high blast radius get more; reversible low-stakes steps get less. Rigor is gates and artifacts, not "try harder."

Present the framing and tradeoffs before committing to a long run. Reversible work can proceed without waiting on a go-ahead; a multi-hour or one-way-door run earns one checkpoint with the user first.

## Phase B: Design the workflow

Decompose into atomic, independently-landable units. Sequence riskiest-unknown-first so option value stays high. Build scaffolding and verification before features — a harness you can trust is worth more early than a feature you can't yet check.

- Build the verification harness before the work, with the baseline captured from the pre-change state, so the check reads as "old value vs new value."
- For one-way-door design decisions, run the `/architect` skill (it can call `/arena` for diverse, isolated, opinionated candidates judged by a separate read-only pass) rather than committing to the first shape that comes to mind. Skip it for mechanical work whose shape is already concrete — a second arena over a settled design is wasted motion.
- Decide what fans out. Parallelize only across genuine seams, and give each parallel worker its own worktree or branch so their writes can't collide. Don't over-fan.
- Write the designed phase list down. That list is what the human reviews.

Then put the design into motion. Add its steps to the todolist as concrete items, after the Phase C entry and before Phase D. Run each under the Phase C loop discipline, and weave the Phase D log through them, a row as each step lands, rather than saving the whole trail for the end.

## Phase C: Run the loop

Each unit is an experiment: state the hypothesis, make the smallest change, measure against the predicate on the real artifact, keep it if it advanced, revert it if it didn't. Verify each unit before starting the next instead of batching checks at the end — a failure two units back is much cheaper to find than one ten units back.

- Verify by inspecting the artifact, never a self-report. When something passes too easily, suspect the observation method before the system. A blank screenshot passes a lazy gate.
- Pair delegated work (subagents, Workflow) with a judge and audit the delegates' artifacts yourself before trusting them. If a worker games the gate, reset and harden the contract. If the gate itself is wrong, fix the gate in its own change rather than routing around it.
- A verdict is VERIFIED, NOT VERIFIED, or INCONCLUSIVE. Inconclusive is not a pass. Don't hide a negative.

## Phase D: Keep the audit trail

Log the run via the `/show-me-your-work` skill, one canonical TSV with a row per decision and per unit, evidence as links. figure-it-out's work is usually ambitious enough to commit the trail so the reviewer can read it in the PR; commit it when confidence has to be shown. Prefer evidence produced by committed scripts so a reviewer can re-run it. The trail plus the diff is what lets the human come back and trust the work.

## Phase E: Verify and hand back

Check the whole against the Phase A predicate on the real product, not just the harness. If a correction recurs during the run, encode it as a gate, lint rule, check, or script so the win can't silently regress — and consider `/shelly:reflect` to capture the durable lesson for future sessions.

**Reply:** the playbook you designed, the rigor level and why, the decision-trail path, what's verified against the predicate, and what's still open.
