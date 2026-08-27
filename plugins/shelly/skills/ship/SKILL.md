---
name: ship
description: Ship the current branch end to end — rebase onto origin/main, run the owning app's real gates (typecheck, test, build), run local CI in Docker (ci-local.sh, the clean-clone verify job — skippable only for markdown-only diffs), push, open the PR, merge with the Vercel-safe subject, and clean up the branch. Use when Sean says /ship, "ship it", "push and merge", or asks to take a finished branch to main. Stops on the first red gate rather than working around it.
---

# /ship — take the current branch to `main`

The sequence Sean would otherwise type every time. Run it in order and **stop at
the first failure** — a red gate is information for him, not an obstacle to
route around.

`/ship hold` → do everything up to and including opening the PR, then stop and
report the PR URL. Use this when the change wants a human look before merge.

## 0. Refuse to ship the wrong thing

- `git branch --show-current`. If it is `main`, **stop** — this repo never
  commits or merges directly to `main`.
- If the branch does not start with `sean/`, **stop and ask.** Cedric's
  branches (`wib/`, `atlas/`, `CS/`, `claude/…`) are never shipped from here.
- `git status --short`. Uncommitted files inside the change's scope → ask
  whether to include them. Files **outside** the owning app → they get reverted,
  not committed.

## 1. Sync — mandatory, never skip

```
git fetch origin
git rev-list --count HEAD..origin/main
```

**Nonzero means STOP and rebase** (`git pull --rebase origin main`), resolve
conflicts, then re-run the gates from scratch. A green build on a stale base
proves nothing, and merging a stale, unrebased branch can silently revert
everyone else's merged work.

After rebasing, the count must read `0` before anything is pushed.

## 2. Identify the owning app

Every changed file should live under one `apps/<x>` (or one `packages/<x>`):

```
git diff --name-only origin/main...HEAD | cut -d/ -f1-2 | sort -u
```

- One app → that is the owner; use its name for the filters below.
- More than one → **stop and ask.** Cross-app changes are not routine; the
  scope guardrails say a task for `apps/<x>` does not edit `apps/<y>`.
- A `packages/*` or root-config change is fleet-wide: verify every consumer
  (`pnpm turbo run build test`), not just one app.

## 3. Gates — run them, report the real output

```
pnpm --filter <app> run typecheck
pnpm --filter <app> run test
pnpm --filter <app> run build
```

Notes that have bitten before:

- **Some apps split the frontend into its own workspace package.** If
  `apps/<x>/frontend/package.json` exists, its tests do **not** run under
  `--filter <x>` — also run `pnpm --filter <x>-frontend run test`.
- For product-research UI or auth changes, also `pnpm run test:e2e:unauth`.
- If the change touches date/time rendering, run the suite under a non-Pacific
  zone too (`TZ=Asia/Manila pnpm --filter <app> run test`) — that is the
  regression that a Pacific-only run cannot see.
- Never delete, skip, or weaken a failing test to get green. A red policy test
  means the change broke a guarantee this repo pins on purpose.

Report actual output. Do not claim a gate passed that you did not run.

## 3b. Local CI — the clean-clone gate, after the per-app gates

There are no GitHub Actions on push (`ci.yml` is manual-dispatch only), so this
is the only run against a clean install. The per-app gates above run in the
dirty working tree; `ci-local.sh` clones the committed state
fresh in a Linux container and runs the full `verify` job (fleet-wide
`turbo build test typecheck lint`, product-research e2e + coverage + registry,
dependency audits). It catches what the dirty tree hides: stale
`node_modules`, leftover build artifacts, lockfile drift, cross-app breakage.

```
cd <main checkout root>
ci-local.sh <branch sha>
```

- **Works from a worktree since 2026-08-26**: the script resolves the main
  checkout via `git rev-parse --git-common-dir` and clones that (worktrees share
  the object store), while the ref resolves in the invoking checkout, so a bare
  `ci-local.sh` inside `../twd-worktrees/<name>` tests THAT worktree's HEAD. An
  older copy of the script still fails from a worktree as
  `ERR_PNPM_AUDIT_NO_LOCKFILE` / `pnpm ls` OOM — a fake dependency error; `cd` to
  the main checkout and pass the sha.
- **Committed state only.** The clone sees commits, not the working tree —
  anything uncommitted is untested. Step 0 already forces this.
- Needs Docker Desktop running; the script says so and exits if not.
- ~4 min on a warm pnpm cache. Add `--amd64` before a risky merge
  (native-binary deps changed) — slower, emulates GitHub's x86_64.
- **Skip allowed only for markdown-only diffs** (`git diff --name-only
  origin/main...HEAD` shows nothing but `*.md`): no build, test, or lint reads
  them. Anything touching code, config, `package.json`, or the lockfile runs
  the container. When skipping, say so in the PR body.
- A red here with green per-app gates is the environment difference talking —
  believe the container, it matches CI and a clean checkout.

## 4. Push and open the PR

```
git push -u origin <branch>
gh pr create --title "<title>" --body "<body>"
```

Body: what changed and why, how it was verified (the real gate output), and any
follow-up left open. End with:

```

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

All `gh` work stays authenticated as **`thirdwavediscounts`** — Vercel refuses
to deploy a commit whose git author is not a team member. Never switch accounts
mid-task.

**If invoked as `/ship hold`, stop here** and report the PR URL.

## 5. Merge — set the subject explicitly

```
gh pr merge <N> --merge --delete-branch -t "sean/ <PR title>"
```

From a worktree this merges, then fails on its local checkout-main step
(`fatal: 'main' is already used by worktree at …`). Do not re-run it: confirm with
`gh pr view <N> --json state,mergeCommit`, then `git push origin --delete <branch>`.

Vercel labels each deployment with the first line of the merge commit and
truncates it early, so GitHub's default (`Merge pull request #454 from
thirdwavediscounts/sean/…`) renders as an unreadable wall. The `sean/ ` prefix
plus the real title must lead. Keep the PR number out of the subject — GitHub
still records the link, and the digits eat characters Vercel needs.

Only `sean/` branches get the prefix. Leave Cedric's and Jake's merges alone.

## 5b. Close the linked Linear ticket (only if the branch names one)

A `/work` branch is `sean/DEV-123-…` and its PR body says `Closes DEV-123` —
only for the ticket this PR completes. A parent/container ticket (spec, epic) gets
`Refs DEV-n`: `Closes` on a parent auto-closes it with children still open. If —
and only if — the branch or PR references a `DEV-xxx`, the merge that just landed
is what makes that ticket Done (a ticket is Done nowhere else). Skip this whole
step for branches that carry no ticket id.

`ToolSearch "select:mcp__linear__get_issue,mcp__linear__list_issues,mcp__linear__save_issue"`, then:

- `mcp__linear__save_issue({id: "DEV-123", state: "Done"})`.
- Close any still-open sub-issues (`mcp__linear__list_issues({parentId})`) that
  this PR resolved; leave genuinely separate follow-ups open.
- If the ticket has a `## Verify (post-deploy)` checklist with items that a merge
  can't prove, do NOT mark it Done: leave it `In Review`, comment "merged +
  deployed, not yet proven in prod", then prove it with `/shelly:verify-live`
  (drive the deployed build against staging; no waiting for a real event) and
  only then flip it Done (Sean, 2026-08-17: "verify it's working on prod first
  before we mark done").
- **Bugsink:** if the ticket cites a Bugsink issue (`PRODUCT-RESEARCH-1`,
  `CCG-12`, …), open it in the browser (real URL is
  `https://bugsink.repsxi.com/issues/issue/<uuid>/event/last/` — the bare
  `/issues/issue/<uuid>/` link the ticket carries 404s) and choose **Resolve ▾ →
  "Resolved in next release"**. Any event from the newly deployed release then
  auto-reopens it as a regression, which is the Bugsink half of the post-deploy
  verify. Note the state change in the Linear ticket comment.

## 6. Clean up

```
git checkout main && git pull origin main
git branch -D <branch>            # -d refuses after a squash merge
git worktree remove ../twd-worktrees/<name>    # if the branch had one
git worktree prune
```

The remote branch is already gone via `--delete-branch`; if not,
`git push origin --delete <branch>`.

## 7. Report

State plainly: what merged, the PR number, the gate results, and anything left
open (a migration Sean still has to run, a follow-up branch, an unanswered
question). If a DB migration is part of the change, say explicitly that
production is still **not** migrated — merging a migration file does not run it.
