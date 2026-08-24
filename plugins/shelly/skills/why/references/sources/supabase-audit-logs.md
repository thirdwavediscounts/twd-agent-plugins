# Supabase Audit Logs

## What this source contains

The shared production database's `audit_logs` table, one row per tracked write across the monorepo's apps. Queried read-only through the `supabase-production` MCP. This is a data-change trail, not a decision trail: it tells you *what changed and when*, not *who decided it or why*, so treat it as circumstantial support rather than direct motivation evidence.

- Row-level change records: table, row id, old/new values, timestamp
- `updated_by`: the identity that made the write. This is the **last toucher**, not necessarily the person who decided the change — a migration script, a cron job, or a teammate applying someone else's decision can all show up here. Don't cite it as authorship without saying so.

## How to search it

Use the `supabase-production` MCP (read-only). Query `audit_logs` filtered by table name and a time window around the target's ship date:

```sql
select *
from audit_logs
where table_name = '<target_table>'
  and changed_at between '<start>' and '<end>'
order by changed_at;
```

Narrow by row id if the target code operates on a known entity. Cross-reference `changed_at` against the target's commit/PR merge date for temporal correlation, the same pattern used for Bugsink issue windows.

## What good evidence looks like here

- A cluster of writes to a table right after a migration or backfill PR merged, consistent with the PR's stated intent
- A `updated_by` value matching a known automation (a specific service role, a cron job identity) that corroborates "this is a scheduled backfill, not a one-off manual fix"
- A gap in writes before a certain date and a step-change after, consistent with a feature or migration having shipped

## Common pitfalls

- **`updated_by` is not authorship.** It's the last process or identity to write the row, which may differ from whoever decided the change should happen. Frame findings accordingly ("the write is attributed to X" not "X decided this").
- **Only tracked tables appear here.** A table with no audit trigger produces no rows; a null result may just mean the table isn't audited, not that nothing changed. Say which is the case if you can tell.
- **Read-only.** Never attempt writes against `supabase-production` from this investigation.

## What to return

- The table(s) and time window queried
- Row-level findings: timestamp, `updated_by`, what changed (old → new), row id
- Whether the change pattern correlates with the target's ship date
- Explicit note on `updated_by` ambiguity if it's used as evidence
