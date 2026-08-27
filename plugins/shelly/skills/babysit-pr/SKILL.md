---
name: babysit-pr
description: Drive a single PR to merge-ready — resolve conflicts, triage review comments, get CI green — then stop for the user's go-ahead. Use for "babysit this", "get it green", "all green", "merge-ready", "watch CI", "address the review comments", or "check on PR X".
---

# Babysit a PR

Local port of pstack `babysit` (github.com/cursor/plugins), 2026-08-24. This fleet ships one PR per unit of work, not Graphite stacks — this port drops every stack/`gt` mechanic from the original and drives a single PR against GitHub Actions + Vercel checks.

Babysitting starts when the user asks for it, normally once a PR is open, not automatically. Building and babysitting compete for the same agent, so finish the change, then babysit it, then hand off to `/shelly:ship`.

Babysitting fails the same few ways every time. Each step below exists because that failure cost time.

1. **Declare the mode in your first line, before any poll.** `drive` runs the loop to merge-ready, for "babysit this", "get it green", "merge-ready". `background` triages without blocking, for a PR still accumulating pushes. `threads-only` answers review comments and touches nothing else, for "address the review comments". `check` is one status pass and a report, for "check on X" and "is it green". Undeclared defaults to `drive`. Small or docs-only PRs get `check`, not `drive`.

2. **Work this PR and nothing else.** If the user names one PR, stay on it. Don't drift into fixing an unrelated PR's threads at the cost of restarting this one's checks.

3. **One babysitter per PR.** Before starting, check nothing else is already watching it (another loop, another session).

4. **Never force-push over someone else's commits, never rewrite pushed history without asking.** A one-line fix goes on top as a new commit; only rebase/amend when the branch is yours alone and nobody else has fetched it.

5. **Order is conflicts, then review threads, then CI.** Conflicts and thread fixes both require a push that restarts checks, so doing CI work first throws it away. Batch every known fix into one push wave. A merge conflict against `main` needs a rebase (`git fetch origin && git rebase origin/main`) — resolve it per `shelly:resolving-merge-conflicts` if it's non-trivial.

6. **Trust GitHub's own verdict, not a green check list you assembled by eye.** Poll with `gh pr checks <PR> --watch` for CI state, `gh pr view <PR> --comments` for the discussion, and `gh api repos/<owner>/<repo>/pulls/<PR>/comments` for inline review threads (Vercel's preview-deploy check shows up in `gh pr checks` like any other check). A cancelled or skipped check still blocks merge even if the list looks clean at a glance — read the actual conclusion field, not just the emoji. The `CI / verify` check is expected on every PR now; a run GitHub refused to start for quota reasons ("your spending limit needs to be increased") is not a red gate on the code — say so and fall back to `${CLAUDE_PLUGIN_ROOT}/bin/ci-local.sh` locally (never in a cloud session).

   Run `drive` and `background` under `/loop` in dynamic-interval mode: check, act if anything moved, then schedule the next wakeup instead of polling in a tight loop. In `check` mode, poll once and report — no loop.

   Stop at `READY`: CI green, no unresolved required threads, no conflicts, i.e. GitHub itself says the PR can merge. Report that and stop polling — landing it is `/shelly:ship`'s job, not this skill's.

7. **Classify CI failures before retriggering anything.** A failure with no relation to the diff (touches code this PR never changed) means a stale base — rebase, don't retry. A failure inside the diff's own code gets a real fix and a new commit. Flake earns one fresh rerun (`gh run rerun <run-id>` for the whole run, not job-by-job) — an identical second failure means it wasn't flake; reclassify and read the logs.

8. **Review comments are triaged skeptically, always** — this applies to CodeRabbit, Copilot review, Bugbot-style bots, and human reviewers alike. Classify each thread before acting:
   - **fix** — plausible correctness, security, privacy, data-loss, auth, billing, migration, idempotency, or race issue. Fix it, push, then reply citing the commit and resolve the thread via `gh api` with the body passed as data (`-f body=@file` or a JSON payload), never shell-interpolated from the comment text.
   - **dismiss** — matches a known low-risk noisy pattern and the current code disproves the concern. Reply with the concrete disproof and resolve the thread.
   - **ask** — novel, high-severity, security/privacy/data-related, or ambiguous. Surface it to the user instead of guessing.

   When in doubt, ask. Skipping a noisy style comment is cheap; skipping a real data or security bug is not. Never churn code just to quiet a bot.

9. **Stop at the user's line.** Babysitting never authorizes merging. Only an explicit "merge it" / "ship it" / "land it" does, and that routes to `/shelly:ship`, which needs the user's explicit go — never merge from inside this skill. Owner approval and required reviews are a wait, not a blocker to fix around. After `READY`, sweep the run's triage decisions once so the reply is a clean summary, then stop.

**Reply:** the mode, the PR's current state (conflicts / open threads / CI), what you fixed versus dismissed with reasons, what's still pending, and what needs Sean.

## Watching

`scripts/watch-pr.sh <pr> [seconds]` emits one line whenever the PR's state, mergeability, review decision, open review-thread count, or any check changes, and exits on merged/closed (0), merge-ready (0), or a failed check (2). Run it under the Monitor tool so each line arrives as a notification instead of polling by hand; a `/loop` heartbeat is the fallback when Monitor isn't available.
