---
name: work
description: Take ONE Linear ticket from Ready-for-Agent to a merged PR — its own worktree (the session moves into it), the investigation plan as the build brief, the agent team to implement, real gates, PR, and the Linear status transitions (In Progress → In Review → Done). Use when Sean says /work DEV-123, "work ticket DEV-123", or "pick up DEV-123". One ticket per session.
---

# /work — take one ticket to `main`

**One ticket per session.** This session *is* `DEV-xxx`'s workspace: its
worktree, its branch, its build, its PR. Runs the pipeline `/investigate` set
up; `/ship` does the git mechanics; this skill owns the Linear status.

Stop at the first red gate — a failure is information for Sean, not an obstacle
to route around. Never weaken a test or skip a gate to get green.

Load the Linear tools once, up front:
`ToolSearch "select:mcp__linear__get_issue,mcp__linear__list_issues,mcp__linear__save_issue,mcp__linear__save_comment,mcp__linear__list_issue_statuses"`

## Slack evidence thread (autonomous cloud runs)

When `SLACK_TICKET_CHANNEL` is set (the Sean Dev cloud env), each transition
below posts to **one Slack thread per ticket**, so the run is watchable with
evidence. The helper is a silent no-op when that env is unset, so local runs are
unaffected. Never gate work on it and never let a Slack failure stop the
pipeline — fire it and move on.

Post with (auto-creates the thread on the first call, threads every later one):
`node "$CLAUDE_PLUGIN_ROOT/bin/ticket-slack.mjs" post DEV-xxx <step> "<text>" [--file <webm>]`

| transition | `<step>` | when |
|---|---|---|
| run start | `start` | §2, right after In Progress (creates the thread) |
| triaged | `triage` | if `/triage` ran first — its verdict |
| built | `build` | §4, implementation complete |
| verified | `verify` | §4, after gates + `verify-work` pass |
| live proof | `verify-live` | the recorded `.webm`, with `--file` |
| PR opened | `pr` | §5, after In Review + PR |
| checks green | `ci` | §5, after Actions pass |
| merged | `merged` | §6, after merge |
| blocked | `blocked` | any red gate — post what failed, then stop |

**Auto-merge — this pipeline only.** §5 normally stops for Sean. When
`SHELLY_AUTO_MERGE=1` is *also* set (Sean pre-authorized it for autonomous cloud
runs), §5 does not stop: poll `gh pr checks <PR> --watch`, post `ci` on green (or
`blocked` + stop on red), then run §6 closeout and post `merged`. Flag unset →
the default holds: stop at the PR, Sean merges. Auto-merge still requires every
gate + Actions green first; a red gate is never routed around.

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

Update the base ref first, then create a **sibling worktree** off fresh
`origin/main` and move the session into it:

```
git fetch origin
git worktree add -b sean/<ticket>-<slug> ../twd-worktrees/<ticket-lower> origin/main
```

Then switch the session in with the absolute path git just created
(`<checkout-parent>/twd-worktrees/<ticket-lower>` — run `git worktree list` to
see it):

```
EnterWorktree({ path: "<absolute worktree path>" })
```

- Lands at `<checkout-parent>/twd-worktrees/<ticket-lower>` — a sibling of the
  main checkout (e.g. `~/Code/twd-worktrees/dev-101`), outside the repo, so
  nothing about it reaches a commit or a Vercel build. `git worktree add -b`
  auto-creates the `twd-worktrees/` parent, and the branch-guard hook allows it
  even from the shared checkout.
- The branch is created as `sean/<ticket>-<slug>` directly — no rename step.
  `<slug>` = 3–5 kebab words from the title.
- Path-entered worktrees are cleaned up explicitly (`git worktree remove`) —
  `ExitWorktree` never removes them; `/ship` already does the removal.
- After this the session cwd **is** the worktree — plain `pnpm`, `git`, and file
  edits act on it, and every subagent inherits it as cwd. No `git -C`, no path
  juggling; that indirection is what let past sessions edit the main checkout by
  accident.
- Prove it before the first edit: `pwd` + `git branch --show-current` must show
  the worktree path and `sean/<ticket>-<slug>`.
- Resumed session already inside a worktree? Don't nest — switch into the
  existing one with `EnterWorktree({ path: "<absolute worktree path>" })`.

Then `mcp__linear__save_issue({id, state: "In Progress", assignee: <me>})`.

Slack: `… ticket-slack.mjs post DEV-xxx start "<one-line ticket title>"` — opens
the thread (no-op when unconfigured).

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
- **In-process teammates**: only when Sean explicitly asks to watch lanes live
  via SendMessage/ListAgents. `/team` is the one place teammates get created by
  default.

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

**Every state-changing action names its visible effect in the brief.** "Row
leaves the list", "row greys", "toast" — pick one and write it down before the
first edit; inheriting the existing semantics silently is a decision Sean did
not make (DEV-167: "mark analyzed" inherited "drain the queue", read as
nothing happening, cost two rounds).

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
  behavior: blind fresh-context verifiers (Opus, Sonnet, Fable) re-derive the
  repro from the claim alone, never the diff, and drive the real surface; the
  recorded artifact goes on the ticket and in the PR body. Skip only for
  changes with no runtime behavior (docs, comments) — state the skip.
- **Independent second opinion — only if Sean says yes.** Ask him at this
  stage ("Want a second opinion on this diff?"); never run it unprompted — it
  costs minutes. On his yes, spawn a fresh-context Fable reviewer via the
  Agent tool (`subagent_type: "shelly:code-reviewer"`, `model: "fable"`) given
  the diff and the ticket summary; size the session effort to the diff first
  — `medium` for docs/one-liners, `high` for app logic, `xhigh` for anything
  touching packages/*, a DB migration/RPC/trigger, root config, or a frozen
  runtime contract. Then post its findings as a ticket comment headed
  `**Independent review (Fable):**` — the second pass lives on the ticket,
  not just in the session. Real findings get fixed before the PR; rejected
  ones get a one-line why in the same comment.
- Fix findings in the open engineer threads; re-verify only what changed.
- Slack: after the build lands post `build "<what shipped, N files>"`; after the
  gates + `verify-work` pass post `verify "<gate results>"`; the `verify-work`
  recording posts as `verify-live "<claim>" --file <webm>`. Any red gate →
  `blocked "<what failed>"`, then stop (do not proceed to §5).
- **UI ticket from a requester (Cedric, Jake): offer the local run before
  `/ship hold`.** Code-review green is not product green; the gate is someone
  who uses the page clicking it. Launch recipe: memory
  `worktree-session-mechanics` → "Dev server in a worktree".

## 5. Open the PR — In Review

From the worktree, `/ship hold` (it rebases onto `origin/main`, re-runs the
gates, pushes, opens the PR). The PR body must include **`Closes DEV-xxx`** so
merge auto-links, plus the real gate output and any unchecked verify item.

Then `mcp__linear__save_issue({id, state: "In Review"})` and post a comment
linking the PR. Slack: `… post DEV-xxx pr "PR #N opened — <url>"`.

**Default (`SHELLY_AUTO_MERGE` unset): stop here and report the PR URL** — Sean
reviews before merge. A ticket is never Done from an open PR. The gate is gates
green + Actions check green + In Review; Sean asks for a local look himself if
he wants one.

**Autonomous (`SHELLY_AUTO_MERGE=1`): do not stop.** Run these as written — each
Slack post is chained to its action with `&&` so it cannot be skipped (`$TS`
= `node "$CLAUDE_PLUGIN_ROOT/bin/ticket-slack.mjs"`):

1. Wait + post `ci` on green, in one command:
   `gh pr checks <PR> --watch && $TS post DEV-xxx ci "checks passed — merging"`
2. Red instead? `$TS post DEV-xxx blocked "<failing check>"`, leave the PR In
   Review, stop with the failure. Never merge or route around a red check.
3. On green, go to §6 — post `merged` in the same breath as the merge (§6 step 1).

- **Scope added after a runbook already ran in prod** → write a NEW cumulative
  `PROD_` file for the delta (never edit the applied one) and keep handlers
  tolerant of the missing column (`COALESCE`, optional select) until it runs —
  otherwise the deployed app 500s against prod mid-review (DEV-142 shipped
  three runbooks for one ticket, 2026-08-26).

**The boxes describe what shipped.** When review rounds changed the product,
rewrite the acceptance criteria to the shipped behaviour before ticking — a
ticked box describing a control that no longer exists is what the next reader
trusts (DEV-167 shipped a floating bar under boxes that still said "toolbar
button, disabled at 0").

**Every acceptance box is tickable today, or says when.** Before the transition,
walk the unchecked boxes: force each surface that has not happened yet
(`/shelly:verify-work` Step 2b) or annotate the box `time-gated, earliest <date>`
with what it is waiting for. A box like "next Sat/Sun" with no annotation leaves
In Review meaning both "waiting on Sean" and "waiting on the calendar", and the
calendar ones sit there decaying.

**Release the build team now.** In-process teammates (if any) get a shutdown
request — never leave one running through the review wait. In-process subagent
threads need no explicit kill; just stop messaging them. If Sean's PR review
comes back with fixes, dispatch fresh — a cold respawn with the review comment
as brief beats a stale thread's drifted context.

## 6. Closeout — only when the PR is merged

The trigger is Sean merging (or telling you to) — or, under `SHELLY_AUTO_MERGE=1`,
Actions going green in §5. Do NOT do this from an open PR with checks unfinished
or red.

1. `/ship` (no `hold`) from the worktree — merges with the Vercel-safe
   `sean/ <title>` subject and deletes the remote branch. When it reaches its
   **cleanup** step, call `ExitWorktree({ action: "keep" })` first: `git checkout
   main` and `git worktree remove` cannot run from inside the worktree they are
   deleting. Use `keep` — a path-entered worktree can only be exited with `keep`;
   `/ship` then removes the sibling worktree (`git worktree remove
   ../twd-worktrees/<name>`) and deletes the branch. **The moment the merge
   lands, post it** (autonomous runs — do this before anything else in closeout,
   it is the step most often skipped):
   `node "$CLAUDE_PLUGIN_ROOT/bin/ticket-slack.mjs" post DEV-xxx merged "merged to main — <sha>, DEV-xxx Done"`.
2. `mcp__linear__save_issue({id, state: "Done"})` — this is the **only** place
   the ticket goes Done. Close any still-open sub-issues that the PR resolved.
3. **Project status update.** If the ticket belongs to a Linear project,
   post one (`save_status_update`, type `project`): what just shipped (PR #),
   what that leaves in review / up next in this project. The project page must
   tell the story without opening tickets — a ticket going Done with no
   project update is the gap this step closes.
4. **Name the next ticket.** `mcp__linear__get_issue({id, includeRelations: true})`
   → for each issue in `blocks`, re-fetch it: if every remaining `blockedBy` is
   Done, it is now unblocked. Also list the parent's other children
   (`list_issues({parentId})`) that are Ready for Agent with no open blockers.
   End the report with "Next: `/work DEV-N` — <why>", preferring tickets in the
   **same Linear project** first. Nothing unblocked in this project/tree? Say
   the project is done for now, then list the open Ready-for-Agent tickets
   **grouped by project** (`list_issues` filtered by state) so Sean picks
   without cross-project confusion. If the only thing left is a post-deploy
   verify checklist on a symptom ticket, say that instead — verify is not a
   `/work` target; it is a `/shelly:verify-live` run.

## Report

What merged (PR #), the gate results, the ticket's new status, and anything left
open — an unchecked post-deploy verify item, a migration Sean still has to run
(merging a migration file does not run it), a follow-up sub-issue. Be plain about
what is proven vs still pending.
