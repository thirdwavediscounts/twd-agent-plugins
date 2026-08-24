---
name: unslop-pr-body-subtle
tags: [unslop, text]
runs: 3
max_turns: 3
timeout_seconds: 150
allowed_tools: []
---
/shelly:unslop Rewrite the following PR description for publishing. Output only the rewritten text, nothing else.

---
## Audit Trigger Performance Improvement

This PR serves as a fix for the audit trigger on the `sales` table, which was significantly slowing down every write. In order to address this, the trigger’s `TG_TABLE_NAME` comparison was changed so that the existing `audit_logs` index is actually leveraged by the planner.

**Root Cause:** The root cause was a type mismatch (`name` vs `text`) that defeated the index.
**Performance:** Performance is greatly improved — roughly 37 ms per row before, about 2 ms after, as measured with `EXPLAIN ANALYZE` on staging.
**Testing:** Testing was done via the new `audit_trigger_index.test.ts` and the existing suite.

The change could potentially affect anything from the sales sync to warehouse picking to the returns flow, so the whole API surface was reviewed. It is worth noting that this establishes a solid foundation for future work, ensuring our audit pipeline remains fast, reliable, and scalable going forward. “Measure, then fix” was the guiding principle here.
