---
name: verify-live
description: Prove a merged change on the DEPLOYED app with its data target switched to staging, then read the row back — instead of waiting for a real upload, order, or cron. Use after a merge lands ("verify it live", "test it on staging", "can't we just test it"), for the post-deploy half of a ticket's acceptance, or when a claim "needs a real event". Writes only to staging; fails closed otherwise.
---

# Verify live

The merged unit tests proved the code; this proves the deployment. Drive the
production build at `https://<app>.apps.repsxi.com` with the app's data target
flipped to **staging**, exercise the real user path, read the result back from
the staging database, and show production took no write. Same build Jake uses,
different database — that is what makes it evidence rather than a local proxy.

`verify-work` is the pre-PR blind panel on a dev server; this runs after the
merge, on the deployed surface, by you. `create-verification-skill` builds a
per-app feature map; this is the thin fleet recipe that map plugs into.

## 1. Pick the trigger

Every claim has exactly one of three triggers. "Wait for the next real one" is
never an answer.

- **User-triggerable** (an upload, a click, a form) → drive it now, steps 2–6.
- **Engine-triggerable** (a cron, a queue consumer, a TL ingest, a Wave tick) →
  fire one bounded run yourself with the smallest input that hits the exact
  branch; memory `controlled-repro-verification` is the procedure. Engine paths
  run against production only (`EW_ACTIVE_ENVS=production`), so the outward
  call needs Sean's one-line go and the input must be one the system rejects or
  idempotently absorbs.
- **Prod-only** (a vendor's response, a customer event, eBay quota) → name it
  as unverifiable in the PR or ticket, do the read-only post-deploy check, stop.

## 2. Doctor — fail closed before any write

Read [`apps.md`](apps.md) for the app's row. An app without a row is not driven
until you add one (URL, switch key, staging-only fixture, tables, cleanup).

1. **Signed in as the verify account.** Drives run as
   `sean+verify@thirdwavediscounts.com` (prod auth; allowlisted on both projects
   for the apps in `apps.md`; `is_twd_user()` passes by domain) — never as
   Sean's live session. The session lives in a saved Playwright storageState at
   `~/.claude/private/verify-live/state.json` (outside every repo and
   transcript), reused by every run. First read the signed-in email from the
   profile menu; if it is **not** the verify account (missing or expired
   state), rebuild it headlessly and retry once — no human step:

   ```
   NODE_PATH=<monorepo>/apps/product-research/node_modules \
     node <skill>/scripts/bootstrap-session.mjs
   ```

   That reads a password from `~/.claude/private/verify-live/creds.json` (chmod
   600, `{email,password}`, set once by Sean), calls `signInWithPassword`, and
   writes `state.json`. This is the whole login: no magic link per run, no
   Google, no cookie hand-built by hand — `bootstrap-session.mjs` captures the
   exact string the app's own client persists and `synth-session-cookie.mjs`
   lays it into the `twd-auth.*` cookie the app reads. Run
   `node scripts/synth-session-cookie.mjs` any time for the format self-test. Every write the drive makes carries
   `updated_by = sean+verify@…`, which is also the cleanup key.
2. **Build is the merge.** `gh pr view <N> --json mergeCommit` and
   `gh api repos/thirdwavediscounts/twd-apps-monorepo/commits/<sha>/status -q .state`
   must read `success`; `curl -s https://<app>.apps.repsxi.com/api/health` answers.
3. **Data target is staging — asserted, not assumed.** Open the app, set the
   switch (`localStorage.setItem('<key>','staging')`), reload, then read back
   BOTH the key and the **staging-only fixture**: a record (name + id) that
   exists on staging and returns nothing on production. The page rendered an
   empty shell, not an error, when this was skipped (2026-08-26: doc 239 loaded
   on production with the key still `production`). A miss aborts the run.
4. **Record the start instant** (`date -u`) — the prod no-write proof keys on it.

### Expiry

The session rebuilds itself: on a stale `state.json` the doctor re-runs
`bootstrap-session.mjs` and retries once, unattended. The refresh token is fresh
from each password login, so expiry costs nothing. The password is set **once**
by Sean (Supabase → Authentication → Users → `sean+verify@…` → set a password,
then drop `{email,password}` into `~/.claude/private/verify-live/creds.json`);
that file and `state.json` never enter a repo or transcript, same discipline as
`.env`. A magic-link capture is only the fallback if no password is set.

## 3. Fixture

Input comes from the real upstream producer, never hand-authored: a file from
Jake's actual extension ZIP, a real CSV export, a real order id. Copy one file
into the session scratchpad (the browser `file_upload` tool accepts that path)
and use the smallest unit — one CSV, not the 22-file ZIP.

## 4. Drive

Chrome tools (`tabs_context_mcp` → your own tab). Stable handles: `find` the
element and act on its `ref` in the **next** call — refs from an earlier batch
go stale after a file upload. Prefer the real write path over previews
(`Import Preview` parses client-side and writes nothing). Screenshot the
action and the resulting state, not just the final screen.

## 5. Evidence — capture before cleanup

- Read the written rows back with `mcp__supabase-staging__execute_sql`; quote
  the exact stored values in the report.
- Prove production untouched with `mcp__supabase-production__execute_sql`:
  `select count(*) from <table> where created_at > '<start instant>'` for every
  table in the app's row. This proves **no inserts**; say so — updates to
  pre-existing rows need an `updated_at` check on the specific ids the claim
  touches.
- Scope the claim to **synchronous** writes. Anything the drive queued (sold
  comps, workflows, analysis) runs on engine infrastructure against production
  and is outside this proof.
- Staging drifts from production (schema, RLS, seeded fixtures). A green run
  proves the deployed code against staging's schema; when the claim rides a
  table or function that recently changed, confirm the object matches on
  production before calling it done.

## 6. Cleanup

Run the app's cleanup SQL from `apps.md` for the ids you created, reset the
switch (`localStorage.setItem('<key>','production')`), close your tab. The
drive rode the signed-in user's live session; leaving the switch on staging
changes what they see next. Evidence survives cleanup — the report carries the
values, not a pointer to deleted rows.

## 7. Report

Claim → trigger → doctor witnesses (sha, fixture name) → drive → stored values
→ prod count → cleanup done. If the ticket has a post-deploy checklist, tick it
with this evidence and move the ticket; hold `/worklog` for the shipped change,
not for the verification.
