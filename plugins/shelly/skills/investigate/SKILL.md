---
name: investigate
description: "Evidence-first root-cause diagnosis across the twd fleet for a symptom or one or more Linear Dev tickets: parallel read-only probes across Supabase, monorepo code, Argus/VPS, and Vercel; one synthesis; adversarial refutation; a remediation plan posted to the ticket. Use for /investigate DEV-123, a cross-system symptom whose cause is unknown, several explicit ticket IDs, or a bare call to list Ready-for-Agent tickets. Read-only against every system except Linear."
---

# Investigate fleet issues

The whole procedure — stages, modes, evidence contract, refutation quorum, plan
shape, and Linear reporting — lives in the plugin workflow
`workflows/investigate.js`. This skill launches it; do not reimplement the
stages by hand.

## Launch

```
Workflow({ name: "shelly:investigate", args: <args> })
```

`args` forms:

- a string — one symptom, no ticket
- `{ symptom, ticket }` — one lane, findings posted to that ticket
- `{ tickets: ["DEV-12", "DEV-34"] }` — one lane per ticket
- `{ all: true }` — every Ready-for-Agent ticket; state the fan-out size first
  and proceed only when the request explicitly authorized all tickets
- omitted — list Ready-for-Agent tickets sorted by priority then age, no agents

Never let a BugSink identifier such as `CUSTOMER-SERVICE-DASHBOARD-2` pass as a
Linear `DEV-123` identifier.

## Context the workflow assumes

- `docs/agents/pipeline.md` (plugin root) — ticket lifecycle and status ownership.
- `docs/agents/issue-tracker.md` — Linear team, labels, mutation semantics.
- `packages/guidelines/SALES-LIFECYCLE.md` in the monorepo before any sales,
  picking, linking, returns, or relist symptom.

## Reachability

A probe's layer is reachable only when the probe proves it with the exact
command or query and its real output. From a cloud session the Argus VPS
(ssh) and per-app `.env` probes are not reachable; the workflow records that as
a blind spot and the diagnosis stays provisional. An unreachable layer is never
evidence that the layer is clean.

## Ticket creation

The workflow proposes sub-issues; creating them stays behind the operator's
per-ticket approval rule (see the operator rules). Never file a ticket the
operator has not approved.

## Return

What was proven, what remains provisional, every Linear mutation completed,
and any error verbatim.
