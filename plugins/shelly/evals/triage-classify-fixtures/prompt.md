---
name: triage-classify-fixtures
tags: [triage, classification]
runs: 3
max_turns: 4
timeout_seconds: 180
allowed_tools: []
---
/shelly:triage auto

EVAL MODE: Linear is not available. The six tickets below ARE the Triage queue (listing + comments already read). Do not call any tool. Classify each one exactly as the skill says, then output ONLY a table, one line per ticket, format:

<ticket id> | <status> | <priority digit>

where status is one of: Ready for Agent, Ready for Human, Canceled, Duplicate, Needs Info, Triage.

---
T1 — [BugSink] TypeError: Cannot read properties of null (reading 'unit_id') — warehouse-mobile-app, pick confirm handler
App label: warehouse-mobile-app. 212 events, first seen 3 days ago, last seen 20 minutes ago. Trace: PickConfirm.tsx → linkSaleToUnit() → supabase rpc fn_link_sale_unit. Comment (Jake): "pickers say the sale shows as picked but the unit never gets linked, so returns can't find it."

T2 — [BugSink] FetchError: ECONNRESET api.ebay.com — argus-console
App label: argus-console. 1 event, first seen 12 days ago, last seen 12 days ago. No comments.

T3 — Add CSV export to the Repricing table
App label: ccg. Filed by Jake. Body: "Would be great to download the filtered repricing view as CSV so I can share with the supplier." No error, no trace, no comments.

T4 — [BugSink] PostgrestError: permission denied for table prv2.offer_evidence — product-research
App label: product-research. 58 events/day for 4 days. Trace: api/backend.ts → getOfferEvidence(). Comment (Sean): "the table was created last week without the GRANT to authenticated; the fix is a grant + RLS policy on prod."

T5 — [BugSink] TypeError: undefined is not a function — argus-console Runs tab
App label: argus-console. 40 events/day, ongoing for 6 days. Trace is minified: RunsTable.tsx:1:8812. No comments. Cause not obvious from the trace.

T6 — [BugSink] ValueError: offer evidence resolver returned 0 rows — product-research
App label: product-research. 15 events, ongoing. Comment (Sean): "same as DEV-92, already being fixed there, close this."
