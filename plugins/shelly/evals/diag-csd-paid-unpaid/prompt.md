---
name: diag-csd-paid-unpaid
tags: [diagnosing-bugs, incident]
runs: 3
max_turns: 6
timeout_seconds: 240
allowed_tools: []
---
/shelly:diagnosing-bugs

You have NO access to the codebase, the database, or any environment in this session — only the report below. Respond with your diagnosis plan and, if you can, the cause.

Bug report (customer-service-dashboard, Next.js + Supabase):
CS agent Lester approved two cancellations on 2026-08-13/14 (eBay orders 5449932988 $149.99 and 5449941071 $62.69) that the Cancelled tab showed as "Unpaid". After approval, two `sales` rows appeared with listing_id = '20' that match no product; hours later the regular ebay-sales-sync created the real sales rows for the same orders (different unique_key), so the orders now exist twice and one copy is junk.
Known: the Cancelled tab merges two queries — orphan cancellations (no matching `sales` row yet) and synced ones. The Paid/Unpaid tag is derived from which list a row came from. ebay-sales-sync runs 7×/day with an 11-hour overnight gap. `ebay_resolutions.data` (raw eBay payload) is stored for every cancellation.
Approving an orphan runs confirmOrphanCancellation, which builds a sales row from split_part(order_id, '-', 1).
