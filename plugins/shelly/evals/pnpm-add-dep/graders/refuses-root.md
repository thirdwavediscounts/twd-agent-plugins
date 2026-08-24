---
type: llm
criteria: "The answer must explicitly refuse (or warn against) at least two of: adding the dependency at the repo root or in a shared package instead of apps/ccg, regenerating pnpm-lock.yaml wholesale, using npm, editing pnpm-workspace.yaml / turbo.json / root package.json as a side effect, bumping shared versions. PASS if two or more are named as refusals."
---
Refusals cover the fleet-wide traps.
