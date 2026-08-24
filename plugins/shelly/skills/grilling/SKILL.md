---
name: grilling
description: Grill the user relentlessly about a plan, decision, or idea. Use when the user wants to stress-test their thinking, uses any 'grill' trigger phrase, or when any other skill needs to run an interview round (wayfinder, triage, to-tickets).
---

# Grilling

Interview the user relentlessly until you reach a shared understanding. Map this as a **design tree**: every decision branches into the decisions that hang off it.

Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are already settled: the questions you can ask _now_ without guessing at answers you haven't heard yet. Ask the whole frontier in one round. A question whose answer depends on another question still open in this round belongs to a _later_ round, not this one.

Finding _facts_ is your job, never the user's. When a frontier question needs a fact from the environment (filesystem, database, Linear, docs), dispatch a sub-agent to find it; don't ask the user for anything you could look up yourself. Don't block on it: a running exploration is an unsettled prerequisite, so only the questions downstream of it wait; ask the rest of the frontier now. The _decisions_ are the user's: put each to them and wait.

The session is done when the frontier is empty: every branch of the design tree visited, nothing left silently assumed. Do not act until the user confirms shared understanding.

## Question format

Every question is scannable, never a wall of text:

```
❓ **Q1 — <short title>**
<one or two sentences; push detail into the options>

   **a)** <option A>
   **b)** <option B>   ← recommended
   **c)** <option C>

➡️ **Pick: (b)** — <one line on why>
```

Rules:

- One option per line, never comma-separated in the stem.
- Short stem; one fact per option; caveats as an indented sub-line under the option.
- Recommendation marked twice: `← recommended` on the option AND a `➡️ Pick` line.
- Blank line between stem, options, and pick; blank line between questions.
- End every round with how to answer, e.g. _"Reply like `1b 2a 3c` (or override in your own words)."_

This format applies to ANY skill that asks interview-style questions (wayfinder, triage, to-tickets granularity quiz), not just this one.

## Closing move

When the frontier empties, offer the next step in one line: for repo work, _"Frontier's empty — want the spec? (`/to-spec`)"_; if the work is still foggy and multi-session, suggest `/wayfinder` instead.
