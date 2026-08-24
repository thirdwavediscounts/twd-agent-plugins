---
name: work
description: Take ONE Linear ticket from Ready-for-Agent to a merged PR — its own worktree (the session moves into it), the investigation plan as the build brief, the agent team to implement, real gates, a localhost check Sean signs off on, PR, and the Linear status transitions (In Progress → In Review → Done). Use when Sean says /work DEV-123, "work ticket DEV-123", or "pick up DEV-123". One ticket per session.
---

# /work — take one ticket to `main`

**One ticket per session.** This session *is* `DEV-xxx`'s workspace: its
worktree, its branch, its build, its PR. Runs the pipeline `/investigate` set
up; `/ship` does the git mechanics; this skill owns the Linear status.

Stop at the first red gate — a failure is information for Sean, not an obstacle
to route around. Never weaken a test or skip a gate to get green.

Load the Linear tools once, up front:
`ToolSearch "select:mcp__linear__get_issue,mcp__linear__list_issues,mcp__linear__save_issue,mcp__linear__save_comment,mcp__linear__list_issue_statuses"`

## 0. Refuse the wrong input

- **Exactly one** `DEV-xxx`. Zero or more than one → stop and ask which.
- `mcp__linear__get_issue({id})`. Read its **team, App label, priority,
  assignee, status, description**, and its sub-issues
  (`mcp__linear__list_issues({parentId})`) and the investigation **findings
  comment** (`mcp__linear__list_comments`).
- **No investigation yet?** (no findings comment, no fix sub-issues, no
  `## Verify` section.) Stop and offer to run `investigate` first — building
  blind is how scope creep and wrong fixes happen. Sean may override for a
  clear, self-contained ticket. **Exception:** a spec ticket — one
  `/to-tickets` created under a `/to-spec` parent (parent issue holds the spec,
  ticket has "What to build" + acceptance criteria). The parent spec is the
  brief; read it + the ticket's blocking siblings and proceed.
- Status already `In Progress`/`In Review`/`Done` → say so; resume or refuse
  rather than starting a second worktree.

## 1. One app, one scope

The ticket's **App label is single-select** — that names the owning app. Every
file this session touches lives under that one `apps/<x>` (or `packages/<x>`).
A task for `apps/<x>` does **not** edit `apps/<y>` — no drive-by fixes. If the
work genuinely needs a second app, stop and ask.

## 2. Worktree — create it and move in, before any work

Project instruction: **this session works in a worktree.** Do it now — before
reading app source, dispatching an agent, or editing a line, not after.

Update the base ref first, then create the worktree with Claude's native
worktree tool — it branches off fresh `origin/main` and moves the session in:

```
git fetch origin
```

```
EnterWorktree({ name: "<ticket-lower>" })
```

- Lands at `<main checkout>/.claude/worktrees/<ticket-lower>`, which is
  gitignored — nothing about it reaches a commit or a Vercel build.
- **Never `git worktree add ~/Code/twd-<name>-wt`** — the `~/Code` sibling
  convention is retired.
- The tool names the branch `worktree-<name>`. Rename it to ours immediately,
  from inside the worktree, before the first commit:
  `git branch -m sean/<ticket>-<slug>` (`<slug>` = 3–5 kebab words from the
  title). After the rename `ExitWorktree` can no longer delete the branch, so
  cleanup deletes it explicitly — `/ship` already does.
- After this the session cwd **is** the worktree — plain `pnpm`, `git`, and file
  edits act on it, and every subagent inherits it as cwd. No `git -C`, no path
  juggling; that indirection is what let past sessions edit the main checkout by
  accident.
- Prove it before the first edit: `pwd` + `git branch --show-current` must show
  the worktree path and `sean/<ticket>-<slug>`.
- Resumed session already inside a worktree? Don't nest — switch into the
  existing one with `EnterWorktree({ path: "<absolute worktree path>" })`.

Then `mcp__linear__save_issue({id, state: "In Progress", assignee: <me>})`.

## 3. Build — the plan is the brief

The investigation's sub-issues + findings comment ARE the spec. Don't re-derive
it.

**Pick the build mechanism first** — one deliberate choice, stated in one line
of the session output before the first dispatch:

- **Subagent threads** (default): domain-roster subagents
  (`backend-engineer` / `frontend-engineer`) via the Agent tool, threads kept
  open via SendMessage. Right when sub-issues share files, evolve a contract,
  or will need the qa/review fix loop — which is most tickets.
- **Dynamic Workflow**: one internal `Workflow` fanning engineers out with
  `isolation: 'worktree'`. Right only when several sub-issues are
  **independent** (no shared files, no contract dependency) AND mechanical
  enough to brief completely up front — a Workflow agent's thread dies with
  the run, so iterative fixes mean respawning cold. Sequence anything that
  doesn't meet the bar.
- **Pane teammates**: only when Sean explicitly asks to watch lanes live in
  panes. **Forbidden when this session was itself spawned by a `/team` lead**
  (your spawn prompt says so) — panes never nest; fall back to the two options
  above. `/team` is the one place pane teammates get created by default.

Then orchestrate, scoped to this ticket:

1. **Scout** — `code-analyst` finds reuse targets + the smallest change surface
   (skip if `investigate` already mapped it in the findings comment).
2. **Implement** — per sub-issue via the chosen mechanism, each engineer given
   explicit file ownership + the findings evidence. As each sub-issue lands,
   tick it toward Done in Linear.
3. Keep engineer threads open for the qa/review fix loops (Workflow lanes:
   route fixes to fresh subagent threads instead).

Adapt to the ticket — a one-line fix does not need the full team. State any
stage you skip and why. Never skip one just to save time.

**Bug tickets: no fix until a red-capable repro command has actually run.**
Before the first fix edit, run a command that reproduces the failure (failing
test, curl script, tsx against staging — the `diagnosing-bugs` skill ranks the
techniques) and paste its red output. The same command going green is then the
proof the fix works. A fix without a repro is a guess with a diff.

## 4. Verify — the ticket's own checklist

- Run the app's real gates (you are already in the worktree):
  `pnpm --filter <app> run typecheck | test | build` (plus
  `<app>-frontend` tests if that package exists; `test:e2e:unauth` for
  product-research UI/auth; a non-Pacific `TZ=` run for date/time changes).
- Run every item in the ticket's `## Verify` checklist that a PR *can* prove;
  tick them in the ticket description. Items that need a post-deploy/prod check
  stay unchecked and get called out in the PR body.
- `qa-gate` for an independent confirmation; `code-reviewer` on the diff,
  `security-auditor` if it touches auth/RLS/secrets/input handling.
- `/shelly:verify-work` — independent runtime proof of the ticket's claimed
  behavior: blind fresh-context verifiers (Opus, Sonnet, Codex) re-derive the
  repro from the claim alone, never the diff, and drive the real surface; the
  recorded artifact goes on the ticket and in the PR body. Skip only for
  changes with no runtime behavior (docs, comments) — state the skip.
- **Codex second opinion — only if Sean says yes.** Ask him at this stage
  ("Want a Codex review on this diff?"); never run it unprompted — it costs
  minutes and an external model call. On his yes, run from the worktree:
  `bash <repo-root>/codex-review-diff.sh (plugin bin) "<one-line ticket
  summary>"` (dispatch via the `codex-reviewer` agent to keep the transcript
  out of this session, or run it directly — the script is the single source
  of truth either way; exit 0 = a valid verdict came back). Then post the
  review as a ticket comment headed `**Codex (GPT-5.4) review:**` — the
  cross-model perspective lives on the ticket, not just in the session.
  Real findings get fixed before the PR; rejected ones get a one-line why
  in the same comment.
- Fix findings in the open engineer threads; re-verify only what changed.

## 5. Show it on localhost — Sean looks before anything ships

The gates prove it compiles; they do not prove it looks and behaves right. Sean
sees it running locally **before** the PR, while a change is still cheap — a
tweak now costs nothing, the same tweak after merge costs a full prod build.

- Start it from the worktree, in the background:
  `pnpm --filter <app> run dev` (every app has this script; `/run` covers the
  awkward launches). The worktree server and the main checkout's fight over the
  same port — if it's taken, start on a free one and say which.
- Drive it yourself first (`/run`, or the Chrome tools) so you hand him a
  working page, not a guess. Then report the **URL plus the exact screen/path**
  to open, what changed, and what to try.
- **Stop and wait for his OK.** Fold his feedback in here, on the branch, and
  re-run only the gates the change touched.
- Nothing to see locally (migration, worker, cron, pure backend)? Say that
  explicitly and name the real proof you ran instead — never skip his look
  silently.
- Kill the dev server before moving on.

## 6. Open the PR — In Review

From the worktree, `/ship hold` (it rebases onto `origin/main`, re-runs the
gates, pushes, opens the PR). The PR body must include **`Closes DEV-xxx`** so
merge auto-links, plus the real gate output and any unchecked verify item.

Then `mcp__linear__save_issue({id, state: "In Review"})` and post a comment
linking the PR. **Stop here and report the PR URL** — Sean reviews before merge.
A ticket is never Done from an open PR.

**Release the build team now.** Pane teammates (if any) get a shutdown request
— never leave a pane idling through the review wait. In-process subagent
threads need no explicit kill; just stop messaging them. If Sean's PR review
comes back with fixes, dispatch fresh — a cold respawn with the review comment
as brief beats a stale thread's drifted context.

## 7. Closeout — only when the PR is merged

The trigger is Sean merging (or telling you to). Do NOT do this from an open PR.

1. `/ship` (no `hold`) from the worktree — merges with the Vercel-safe
   `sean/ <title>` subject and deletes the remote branch. When it reaches its
   **cleanup** step, call `ExitWorktree({ action: "keep" })` first: `git checkout
   main` and `git worktree remove` cannot run from inside the worktree they are
   deleting. Use `keep`, never `remove` — `remove` refuses whenever the worktree
   still holds commits it thinks are unmerged, and it cannot delete the renamed
   `sean/…` branch anyway. `/ship` removes the worktree and deletes the branch.
2. `mcp__linear__save_issue({id, state: "Done"})` — this is the **only** place
   the ticket goes Done. Close any still-open sub-issues that the PR resolved.
3. **Project status update.** If the ticket belongs to a Linear project,
   post one (`save_status_update`, type `project`): what just shipped (PR #),
   what that leaves in review / up next in this project. The project page must
   tell the story without opening tickets — a ticket going Done with no
   project update is the gap this step closes.
4. `/worklog` — draft the row, get Sean's OK, post it.
5. **Name the next ticket.** `mcp__linear__get_issue({id, includeRelations: true})`
   → for each issue in `blocks`, re-fetch it: if every remaining `blockedBy` is
   Done, it is now unblocked. Also list the parent's other children
   (`list_issues({parentId})`) that are Ready for Agent with no open blockers.
   End the report with "Next: `/work DEV-N` — <why>", preferring tickets in the
   **same Linear project** first. Nothing unblocked in this project/tree? Say
   the project is done for now, then list the open Ready-for-Agent tickets
   **grouped by project** (`list_issues` filtered by state) so Sean picks
   without cross-project confusion. If the only thing left is a post-deploy
   verify checklist on a symptom ticket, say that instead — verify is not a
   `/work` target.

## Report

What merged (PR #), the gate results, the ticket's new status, and anything left
open — an unchecked post-deploy verify item, a migration Sean still has to run
(merging a migration file does not run it), a follow-up sub-issue. Be plain about
what is proven vs still pending.
