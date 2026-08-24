---
name: shelly-mode-intake
tags: [shelly-mode, routing]
runs: 3
max_turns: 6
timeout_seconds: 240
allowed_tools: [Read]
permission_mode: default
---
/shelly:shelly-mode

Linear is unreachable in this run, so the three tickets are given inline. For EACH, state the single route the intake rules pick (name the skill you would invoke or the action you would take) and one sentence why. Do not invoke anything; this is a dry run.

Ticket A — DEV-201, status **Ready for Agent**, label Feature. Description: "Add a `paid_at` column to `sales`, backfill from `paymentStatus`, show it in the CS dashboard order table. Acceptance: migration on staging, column visible, tests green." No comments.

Ticket B — DEV-202, status **In Review**, label Bug. Attachment: PR #700 (merged). Description ends with a checklist: "- [ ] next Monday's cron posts no degraded-day  - [x] runbook applied". No comments.

Ticket C — DEV-203, status **Backlog**, label Improvement. Description: "Explore moving the auction comps scraper to Playwright." No comments.
