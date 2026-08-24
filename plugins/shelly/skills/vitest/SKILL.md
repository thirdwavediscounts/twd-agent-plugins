---
name: vitest
description: Fleet-specific vitest traps for the Vite apps (product-research, argus-console, warehouse-mobile-app). Load BEFORE creating or editing any *.test.* / *.spec.* file, vitest.config.*, or test setup file, and when a vitest run fails in CI but not locally (or vice versa). Generic vitest API questions go to find-docs, not here.
---

# vitest — what has burned us here

Generic vitest/Testing-Library API is not in this file; use `find-docs` for that. Every item below is a real incident.

## Writing tests

- **`beforeEach(() => mock.mockReset())` is a bug.** `mockReset()` returns the mock, and vitest treats a function returned from `beforeEach` as a cleanup hook — the mock gets a phantom extra call after each test. With a rejecting implementation that surfaces as an unhandled rejection blamed on the test, showing the mock's own error. Always braces: `beforeEach(() => { mock.mockReset(); })`. Signature: a stack through `callCleanupHooks`. (product-research `tests/processSheetBatching.test.ts`, 2026-07-29)
- **`testTimeout` does not govern `findBy*`/`waitFor`.** Testing-Library's `asyncUtilTimeout` defaults to 1s regardless. Set it in the setup file with `configure({ asyncUtilTimeout })` imported from **`@testing-library/react`** — importing `configure` from `@testing-library/dom` configures a different copy under pnpm's strict layout and silently does nothing. (WMA, 2026-07-26)
- **jsdom's React scheduler is `setImmediate`, browsers use `MessageChannel`.** A component that waits for a React commit with `setTimeout(0)` can lose that race in jsdom while being fine in a browser. A lost state update is an ordering bug — raising timeouts never fixes it. Raising a `findBy` budget with assertions unchanged is not weakening a test.

## Diagnosing a failing run

- **Host Node 26 breaks jsdom `localStorage`.** `Cannot read properties of undefined (reading 'clear')` on `window.localStorage` plus `ExperimentalWarning: localStorage` = environment, not code. Packages want Node 22/24. Run through `.claude/scripts/ci-local.sh` (Node 24 container) or pin host node to 24 before diagnosing anything.
- **CI-red / local-green:** re-run the identical commit first. Deterministic → your change; non-deterministic → load (WMA suite: ~9s local, ~500s CI). Then ask which clock ran out (budget vs ordering, above).
- **Failures in files outside your diff right after a pull:** a new `packages/*` arrived and the workspace symlink doesn't exist yet. `pnpm install` first; read the individual test file's output, not turbo's summary (it truncates the real `ERR_MODULE_NOT_FOUND`).
- **Never delete or weaken a red test to get green** — a policy test pins a repo guarantee. Replace it only with an equivalent assertion and say so.

## Gates

- `pnpm --filter <app> run test`; the only merge gate is `.claude/scripts/ci-local.sh` from the main checkout on committed state.
- CI's verify job masks later steps: a red test step hides dep-audit/coverage.
