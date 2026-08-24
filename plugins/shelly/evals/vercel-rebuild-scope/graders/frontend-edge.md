---
type: llm
criteria: "The answer must mention that whether apps/ccg/frontend changes trigger the ccg project depends on apps/ccg declaring its frontend package in dependencies (not devDependencies), or explicitly that a frontend-only change can be silently skipped otherwise. PASS if the dependencies-edge condition is stated."
---
Names the frontend dependencies edge.
