---
name: triage
description: Sort the Linear Dev Triage column — mostly BugSink error tickets — into Ready for Agent / Ready for Human / Canceled / Duplicate. Two modes: interactive (/triage → show buckets, recommend, you direct) and auto (/triage auto → classify and move each, for the scheduled routine). Purpose-built for error-driven tickets where app + dedup are already resolved at ingest. Use when Sean says /triage, "triage the queue", or "what needs my attention".
---

# /triage — sort the Triage column

Moves tickets out of the `Triage` status so `investigate`/`work` never spend
agents on noise or dupes. Built for **BugSink error tickets** (app label + dedup
already set at ingest), not human feature requests — those it routes to a human.

Load the tools once:
`ToolSearch "select:mcp__linear__list_issues,mcp__linear__get_issue,mcp__linear__list_comments,mcp__linear__save_issue,mcp__linear__save_comment"`

Every comment this skill posts starts with the AI disclaimer line:
`> _AI-generated during triage._`

## Modes

- **`/triage`** (no arg) — **interactive.** Show the queue in buckets, recommend
  a call per ticket with reasoning, then **wait** for Sean's direction before
  moving anything.
- **`/triage auto`** — **autonomous** (what the `/schedule` routine invokes).
  Classify and move each ticket without waiting. Anything you are not confident
  about stays in `Triage` with a note — never guess a Cancel.

## The queue

`mcp__linear__list_issues({team: "Dev", state: "Triage", limit: 50})`. For each,
**read its comments** (`list_comments`) — not just the listing. The known failure
is triaging off the cheap listing and missing a "already fixed, close this"
comment. Oldest first.

## Classify each ticket

**Step 1 — real, or noise?**
- Recurring error, still occurring, in a live code path → **real**, continue.
- One-off / tiny occurrence count / last seen long ago / a known transient
  (third-party 5xx, network blip, client offline, a bot) → **noise** →
  `Canceled` with a one-line reason.
- An equivalent ticket is already open (dedup should catch this at ingest, but
  verify) → `Duplicate`, linked to the original.

**Step 2 — is it even a bug?**
- A stack trace / error → it's a `Bug`; keep going.
- A *feature request* or improvement that landed in Triage → don't spec it here.
  Label `Improvement`/`Feature`, move to **Ready for Human** with a note that
  Sean takes it into the greenfield (grilling → spec) track.

**Step 3 — agent-fixable, or human?**
- Clear code bug, one owning app, fixable without external access or a judgment
  call → **Ready for Agent**. Post a short brief comment (below).
- Needs Sean's judgment, external access (a dashboard/credential only he has), a
  physical warehouse check, a config/infra change, or a **prod migration** →
  **Ready for Human** (same brief, plus one line on *why* it can't be delegated).
- Real but the cause is unclear from the trace → still **Ready for Agent**;
  `investigate` will deep-dive. Do **not** use `Needs Info` — an error ticket has
  no human reporter to ask. (`Needs Info` is only for a human-filed ticket that's
  genuinely underspecified.)

**Step 4 — labels + priority (every ticket, including Canceled/Duplicate).**
Set exactly one **App label** (single-select) — already present from ingest;
add it if missing. Category label (`Bug` / `Improvement` / `Feature`) alongside
it. Then set **priority** (`save_issue({priority})`, 1–4 — never leave 0):
- **1 Urgent** — money or data wrong (sales, picking, returns, pricing writes),
  fleet-wide outage, security exposure.
- **2 High** — a live user path in one app is broken and recurring; no
  workaround.
- **3 Medium** — recurring but degraded/edge path, or a workaround exists.
- **4 Low** — cosmetic, rare, improvements, and every noise/duplicate Cancel.
When unsure between two, pick the higher and say why in the brief.

## The brief (Ready for Agent / Ready for Human)

One comment, durable (names behaviours + the app, not file:line — the ticket may
sit for weeks while code moves):

```
> _AI-generated during triage._

## Brief
**What's broken** — one or two sentences from the error + culprit.
**Owning app** — apps/<x>.
**Where to look** — the module/behaviour, by name.
**Done when** — a checkable condition.
```
For Ready for Human, add: **Why a human** — the specific reason it can't be delegated.

## Apply

`mcp__linear__save_issue({id, state: "<status>", labels: [...], priority})`, then the brief
comment. In **auto** mode, do this per ticket and log the move. In **interactive**
mode, present all recommendations first, act only on Sean's go-ahead.

## Report

Counts moved to each status, anything left in `Triage` and why, and any ticket
that surfaced a comment contradicting its status (e.g. "already fixed"). Errors
from any Linear call: record verbatim, skip that ticket, continue — never
fabricate a move that didn't happen.

Close with the next step: if any tickets landed in Ready for Agent, offer
*"N tickets are Ready for Agent — diagnose them now? (`/investigate all`)"* —
investigate is the expensive fan-out this triage pass just protected.
