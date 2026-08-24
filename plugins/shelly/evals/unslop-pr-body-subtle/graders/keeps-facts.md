---
type: llm
criteria: "The rewrite must keep ALL of these facts: (1) the sales table audit trigger; (2) TG_TABLE_NAME compared as name vs text defeated the audit_logs index; (3) roughly 37 ms per row before and about 2 ms after; (4) measured with EXPLAIN ANALYZE on staging; (5) audit_trigger_index.test.ts. FAIL if any one is missing."
---
Every concrete fact survives the rewrite.
