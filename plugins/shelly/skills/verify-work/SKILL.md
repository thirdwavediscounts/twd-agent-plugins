---
name: verify-work
description: Use after an implementation lands, before the PR — "verify the work", "verify the fix", "prove it works", or whenever an agent-built fix or feature needs independent runtime proof. Blind fresh-context verifiers on three models (Opus, Sonnet, Codex) re-derive a repro from the claim alone — never the diff — and prove the behavior on the running surface, with a recorded artifact.
---

# Verify Work

`interrogate` judges the code; `qa-gate` runs the gates; neither executes the
claimed behavior. Verify-work is the runtime attestation stage: independent
proof that the work does what it claims — a fix or a new implementation alike.
The implementer's own red→green repro is necessary but it is the author grading
their own homework; attestation comes from verifiers who never saw the fix.

**Blind verification is the whole mechanism.** Each verifier receives the claim
and the surface — never the diff, the commits, or the implementer's reasoning.
A verifier that read the diff verifies the code's intention; a blind verifier
verifies the behavior. The verifier prompt forbids `git diff`/`git log`;
withhold them from the brief too.

The deliverable is a verdict table plus a recorded artifact. Do NOT fix
anything yourself — findings go back to the implementer.

## Step 1, State the Claim

Write one checkable behavior claim per item under verification, derived from
the ticket, bug report, or user ask. A claim is repro-shaped, not code-shaped:

- Repro-shaped: "declining a 3-day-expired offer returns 409 and writes no row"
- Code-shaped (reject): "the handler now checks offer status"

If the work can't be phrased as a checkable claim, stop and tell the user what
observable behavior is missing from the ask.

## Step 2, Prepare the Surface

You do setup so verifiers verify instead of fighting launches:

- Web surface: start the dev server from the worktree in the background
  (`pnpm --filter <app> run dev`), note the port — and **prove the port is
  yours**: check nothing else already listens there (`lsof -nP -iTCP:<port>`,
  IPv6 included — a twin server from another session's worktree can hold the
  IPv6 socket while yours binds IPv4, silently splitting traffic), then
  confirm with a request only your instance can answer. Verifiers verifying
  someone else's server is the failure this prevents.
- Command surface: name the exact entry (`tsx --env-file` against staging, a
  curl base URL, a test command).
- Create an evidence directory in the scratchpad; each verifier writes only
  there.
- Snapshot `git status --short` for the residue check in Step 5.

## Step 3, Spawn the Panel

Launch all seats in a single message, each a fresh context:

| Seat | Runner | Brief |
|------|--------|-------|
| A | `general-purpose`, model `opus` | Drives the surface like a user — `/shelly:webapp-testing` Playwright or the Chrome tools — and records the passing drive (Step 5) |
| B | `general-purpose`, model `sonnet` | Same brief as A, independently |
| C | Codex (`gpt-5.6-sol`, high effort) via `bash <plugin>/bin/codex-verify.sh "<claim>" "<surface>"` | Command-line repro only (tests, tsx, curl) — Codex has no browser tools |

Seats A and B get `references/verifier-prompt.md` filled with the claim, the
surface, and the evidence directory; the filled template is their entire brief.
Seat C's prompt lives inside the script; pass claim and surface as arguments
and treat exit 0 as "a valid verdict came back", nothing more.

Scale to the task: no drivable UI → A and B go command-line too; a trivial
mechanical change → two seats. Never one seat, and never one model family —
a lone verifier is the same bias once removed.

## Step 4, Merge Verdicts

- All seats `VERIFIED` → the work is **work-verified**.
- Any `NOT_VERIFIED` → treat as real: hand the verifier's repro command and
  output to the implementer. After the fix, re-run **every** seat — the
  behavior changed, so the old attestation is void.
- `COULD_NOT_VERIFY` → resolve the blocker (surface down, missing fixture) and
  re-run that seat, or report the item honestly as unverified. It never counts
  as green.
- Seats disagree on one claim → re-run the red seat's exact repro yourself; the
  command's output decides, not the vote count.

## Step 5, Evidence and Residue

- **Recording:** seat A records the passing drive — Playwright
  `record_video_dir` on the browser context (webm lands on context close), or
  the Chrome `gif_creator` tool when driving through Chrome. Name the file
  after the claim.
- Attach the recording to the Linear ticket (attachment upload tools) and link
  it in the PR body beside the gate output.
- Residue: `git status --short` matches the Step 2 snapshot, the dev server is
  killed, and the evidence directory still holds every cited artifact — check
  it at its named location, don't assume.

## Output Format

```
### Verify-work: <ticket or branch>

Claim: <the claim(s) from Step 1>

| Seat | Model | Verdict | Repro |
|------|-------|---------|-------|
| A | opus | VERIFIED | <one-line repro> |
| B | sonnet | VERIFIED | <one-line repro> |
| C | gpt-5.6-sol | VERIFIED | <one-line repro> |

Overall: work-verified
Evidence: <recording path / ticket attachment>
```

During `/work`, post this as a ticket comment; the PR body carries the Overall
line and the evidence link.
