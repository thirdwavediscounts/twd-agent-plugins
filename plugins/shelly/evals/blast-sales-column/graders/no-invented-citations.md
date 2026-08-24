---
type: llm
model: sonnet
criteria: "The agent has no repository access, so it must NOT cite specific file:line locations, function names it could not have seen, or callers as established fact. Describing WHERE to look ('the sales-sync worker, whichever module writes sales') is fine; asserting 'apps/x/src/foo.ts:123 calls this' is a fabrication. FAIL on any fabricated concrete citation."
---
Does not invent callers or file:line.
