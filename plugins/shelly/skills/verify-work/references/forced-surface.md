# Forcing a surface that hasn't happened yet

Reached from Step 2 when the claim's surface depends on an event that has not
occurred: a weekend, a cron tick, a month of traffic, a customer action.

Start by naming **the quantity the check is actually about**. Wall-clock is
almost never it — "next Saturday" and "24 h after" are proxies. Name the real
quantity and the proxy usually collapses into something you can produce today.

## Predicate checks — lie to the code

The check asks "what time is it / what state is this in". Find the seam and
answer differently. Ranked by how clean the evidence is:

1. **An injected clock or date parameter.** Read the entry point's signature
   before concluding it needs a real event — `grep -n "export async function <entry>"`,
   then read the line. `runIngestHeartbeat(deadlineAt, nowOverride?: Date)` turned
   "wait until Saturday" into "pass a Date"; the seam had been there all along.
2. **A bounding argument that shrinks the run.** An already-expired deadline
   makes a `while (isWithinDeadline())` loop never enter, cutting the run down to
   the phases under test and stranding every outward call inside the loop.
3. **Seeded state** on the staging project.
4. **A naturally-dead resource** picked read-only from prod — an expired offer,
   an answered dispute — that the system will reject for the exact reason under
   test.

## Accumulated-statistic checks — narrow the window, not the clock

The check is about a quantity that accrues with real traffic: a
`pg_stat_statements` mean, a rank in a top-25 list, a scheduler having ticked.
No injected clock produces those. Convert **hours into calls**:

- Snapshot `calls` and `total_exec_time` for the queryid, then take a second
  snapshot and report `(total₂ − total₁) / (calls₂ − calls₁)`. That mean covers
  only the window between them.
- Check `pg_stat_statements_info.stats_reset` first. A lifetime cumulative mean
  over weeks of calls barely moves when a day of faster calls lands — the
  "before vs 24 h after" comparison can pass or fail for reasons unrelated to the
  change. Same trap sinks "not in the top 25": a statement that shipped
  yesterday ranks low on lifetime totals however expensive it is per call.
- `pg_stat_statements_reset(0, 0, <queryid>)` scopes a reset to one statement, so
  the next few hundred calls read as a clean mean. It is a prod write — hand it
  to Sean, never run it.
- A scheduled job splits in two: invoke the function directly for its output, and
  read `cron.job` / `cron.job_run_details` for whether the schedule fires. Before
  calling an empty `job_run_details` a failure, confirm the view is populated for
  other jobs and that the job's first fire time has passed.

## Isolate on staging, not a branch

Seed the fixture on the staging project directly. `create_branch` builds from
Supabase CLI migration history, and this repo has none — `supabase/` holds only
`.temp`, and the real migrations are `apps/<app>/migrations/*.sql` driven by
`scripts/migrate.mjs`. A branch comes up with no fleet schema, so the SQL you
came to execute cannot run.

## Derive the fixture from prod

A fixture you author asserts the shape the code assumes, so it confirms itself.
Copy the real row read-only from prod and mutate **only the field under test**,
then name the mutation in the evidence. The strongest form is an A/B where two
fixtures differ by one field and the predicate fires for exactly one of them —
that difference is the falsification, so no separate negative control is needed.

## Prove the outward effect is inert

Read the fallback branch that runs when the credential is missing and confirm it
logs rather than sends. Unset does not imply silent in general; here
`TL_SLACK_BOT_TOKEN` unset makes the alert path return kinds in `alerts_pending`,
and that is a fact read at `ingestHeartbeat.ts:1228`, not a hope. Check every
outward path, not the first one you find — stage updates and alerts were separate
functions with separate guards.

## Report the seam and the gap

The evidence says which surface was forced and how. It also says which parts of
the box the forced run does **not** cover — a bounded run reaches fewer phases
than the real one, and the untested remainder belongs in the same comment as the
pass, not discovered later.
