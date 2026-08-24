---
name: diag-wma-cycle-count
tags: [diagnosing-bugs, incident]
runs: 3
max_turns: 6
timeout_seconds: 240
allowed_tools: []
---
/shelly:diagnosing-bugs

You have NO access to the codebase, the database, or any environment in this session — only the report below. Respond with your diagnosis plan and, if you can, the cause.

Bug report (warehouse-mobile-app, Vite + Vercel serverless, Supabase):
Warehouse staff (Lilly, Jake) say cycle-count scans "just vanish": they scan a shelf unit, see a red toast "eBay verify failed", and the unit shows no cycle_count_checked_at afterwards. Nothing in audit_logs for those scans. Started ~2026-07-24, after the app moved to a new Vercel project.
Vercel runtime logs show 8 occurrences of `502 ebay_verify_failed` on `POST /api/ebay/verify-listing` in the last 48h, each completing in 48–171 ms.
Known: the eBay Browse call normally takes 300–900 ms. The page's scan handler calls verifyListingViaApi() and then saveCycleCount(). Retool's older version of this screen saved the scan even when eBay was unreachable.
Env note: the backend reads `process.env.EBAY_CLIENT_ID ?? process.env.EBAY_OAUTH_CLIENT_ID`; `.env.example` documents one spelling, the old `.env.local` the other.
