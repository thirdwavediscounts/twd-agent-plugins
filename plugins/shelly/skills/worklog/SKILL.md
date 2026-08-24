---
name: worklog
description: After a task ships, append one row to Sean's personal Technology Development Tracker (Work Log sheet) — gather the facts from the session and git, draft the row in Jake-readable plain English, get Sean's OK, then post it through the sheet's Apps Script webhook. Also drafts a Database Tables row when the task created or altered a table.
---

# /worklog — log the just-shipped task

One row per task in Sean's **personal copy** of the Technology Development
Tracker (his duplicate, not Cedric's training sheet).

**The Golden Rule: every cell must be understandable by a non-coder (Jake).**
Plain English. No jargon, no file paths or code identifiers in prose cells
without a gloss, no acronyms. If Jake can't understand it, the row doesn't
count as filled out.

**But don't translate the words the company already uses.** The rule targets
things Jake genuinely can't read — `timestamptz`, PostgREST, `AT TIME ZONE`,
RLS, RPC. It does **not** target ordinary business vocabulary, and rewriting
that is a downgrade, not a simplification: it loses precision and stops matching
how people here actually talk.

Use the house term verbatim: **Pacific time / PST / PDT** (never "California
time"), eBay, Temu, UPC, SKU, purchase order / PO, listing, pick, relist. When
unsure whether a term is jargon, ask: would Jake say this himself? If yes, keep
it exactly as-is.

## 1. Gather the facts — from the session and git, never invented

- What shipped: the conversation's task + `git log --oneline` on the branch.
- PR link: `gh pr view --json url,title 2>/dev/null` (or the commit link if no PR).
- Files changed: `git diff --stat main...HEAD` (or the merged PR's file list).
- Database impact: migrations/SQL run this session → which tables, what changed,
  where the data comes from. If nothing changed, the row says "Read-only" or
  "No database changes".
- App touched → "Part of the system" (use the everyday name: product-research,
  repricing dashboard, Retool, Argus, warehouse mobile app, …).

## 2. Draft the row — exactly these 15 columns, in this order

| # | Column | How to fill it |
|---|--------|----------------|
| 1 | Date started | M/D/YYYY — when the work actually started (first commit or session date). |
| 2 | Task name | A few words. |
| 3 | Status | One of: `Idea`, `Waiting for approval`, `Approved`, `In progress`, `Done`, `On hold`. Only `Done` when merged and working. |
| 4 | Approved by | Always leave blank (`""`) — Sean's standing instruction (2026-07-28). Don't ask. |
| 5 | What I'm building or changing | Plain English: what exists or works differently now. |
| 6 | Why (what problem does this fix?) | What was broken, slow, or annoying. |
| 7 | Business use case | Money made, money saved, or time saved — and who uses it. Ask Sean if it isn't obvious; don't invent one. |
| 8 | Part of the system | Tool/app name. |
| 9 | Database tables touched | Comma-separated list of every table read or written. "None" if none. |
| 10 | What's changing in the database | New tables/columns? Where does the data come from? If nothing changes: "Read-only." |
| 11 | Code changed — what and where | Repo + plain-English summary of the change. |
| 12 | Link to code (GitHub) | The PR link (preferred) or commit link. |
| 13 | What could break | Honest risk. "Very low — read-only page" is a fine answer when true. |
| 14 | Date finished | M/D/YYYY when done and working; blank if not finished. |
| 15 | Notes | Anything else worth knowing; usually blank. |

## 3. Show Sean the drafted row and wait for his OK

Render it as a small table (column → value). Apply his corrections, then append.

## 4. Append via the webhook

Read `~/.claude/private/worklog-webhook.txt`: line 1 = webhook URL,
line 2 = secret. POST with curl:

```bash
curl -sS -L '<URL>' -H 'Content-Type: application/json' \
  -d '{"secret":"<SECRET>","sheet":"Work Log","row":[ ...15 values in order... ]}'
```

Do NOT add `-X POST`: Apps Script answers via a 302 to
`script.googleusercontent.com`, and forcing the method re-POSTs to that echo
endpoint, which 405s. `-d` already makes the first request a POST; `-L` must
then be free to switch to GET.

Expect the response `ok`. Report the actual response.

**If the response is `Cannot find script function: doGet`** (broke 2026-07-30 and
again 2026-08-13): the deployed script predates the `doGet` handler in
`apps-script.gs`. The redirect-followed GET has no handler, so Google serves its
error page — **after `doPost` has already appended the row**. Do NOT retry: the
write probably succeeded and a retry duplicates it. Ask Sean to check the sheet,
and fall back to printing the row as TSV. Fix it properly by re-deploying
`apps-script.gs` (Extensions → Apps Script, paste, then **New deployment** — an
existing deployment keeps running the old code). The current version also
de-duplicates against the last 10 rows, which makes retries safe from then on.

`ok` and `duplicate — already logged, skipped` are both success. Anything else,
including an HTML page, means treat delivery as unconfirmed.

**If `~/.claude/private/worklog-webhook.txt` is missing or still contains the placeholder:** print the
row as one tab-separated line in a code block so Sean can paste it into the
sheet himself, and remind him the webhook setup is pending (see
`apps-script.gs` in this directory for the one-time setup).

## Database Tables tab

If the task **created a table or changed an existing table's columns**, also
draft a row for the `Database Tables` tab and append it the same way with
`"sheet":"Database Tables"` — 8 columns in order:

1. Table name
2. Database / project (e.g. "Main Supabase project", "Staging Supabase")
3. What it stores (plain English)
4. Where the data comes from (what creates or updates it)
5. What uses it (tools, dashboards, code that read it)
6. Before changing this, ask (person's name)
7. Last updated (M/D/YYYY)
8. Notes

## Do not

- Log Q&A, research, or personal-config sessions with no shipped change.
- Mark `Done` before it's actually merged and working — use `In progress` and
  leave Date finished blank.
- Fill in "Approved by" — it stays blank, always.
- Guess the business use case — ask in the confirmation step.
- Duplicate a row: if the task already has a row (e.g. logged as `In progress`),
  say so and update Sean instead of appending a second one.
