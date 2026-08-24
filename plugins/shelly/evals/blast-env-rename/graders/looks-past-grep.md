---
type: llm
model: sonnet
criteria: "The writeup must name at least THREE of these places grep does not reach: database triggers/RPCs/RLS on the touched table, sibling apps reading the same table or env var, the Argus engine on the VPS, frozen runtime contracts (env-var names / public routes / health-check ids), Vercel rebuild scoping (root-level file or packages/* means fleet rebuild)."
---
Covers the fleet-specific places beyond the diff.
