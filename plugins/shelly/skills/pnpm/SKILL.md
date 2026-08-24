---
name: pnpm
description: Fleet-specific pnpm/workspace rules for the twd monorepo. Load BEFORE editing pnpm-workspace.yaml, catalogs, pnpm-lock.yaml, or any package.json dependency change, and when a module-resolution or type error reproduces on Vercel but not locally. Generic pnpm CLI/config questions go to find-docs, not here.
---

# pnpm — what matters in this repo

Generic pnpm usage is not in this file; use `find-docs`. Every item below is a repo rule or a real incident.

## Rules

- **pnpm only.** Never `npm install` anywhere. Per app: `pnpm --filter <app> run <task>`; fleet: `pnpm turbo run <task>`.
- **Dependencies live where they're imported.** pnpm's strict layout exposes the phantom deps npm's hoisting hid. Never bump root or shared versions as a side effect of app work.
- **`pnpm-lock.yaml` changes only as a consequence of a requested dependency change.** Never regenerate it wholesale. `pnpm add` can flip unrelated peer-variant keys — inspect the lockfile diff before committing.
- **Package names must be unique across the workspace** (Vercel's affected-project graph keys on them).
- **Inter-package edges go in `dependencies`, not `devDependencies`.** Each `apps/<x>` must depend on its `<x>-frontend` package or frontend-only changes are silently skipped by Vercel. The `*-dev-host` server packages are deliberately NOT depended on. `apps/product-research/tests/vercelSkipPolicy.test.ts` pins this. Details: the `vercel` skill.
- **Root config is fleet-wide.** `pnpm-workspace.yaml`, root `package.json`, `turbo.json` — change only when that IS the task, then `pnpm turbo run build test` across every consumer.

## Incidents

- **Type error on Vercel only, not locally.** A leftover real directory in `node_modules/<scope>/` (not a symlink, unknown to `pnpm ls`) was satisfying a phantom dep. With `skipLibCheck` on, the only symptom was "Property X does not exist on type Y" — a broken *resolution*, not a broken type. Check `ls -l node_modules/<scope>/`, move the stray aside to reproduce CI honestly, declare the dep where it's imported. (WMA, 2026-07-26)
- **Gate fails in files you never touched right after a pull.** A new `packages/*` landed; `package.json` and the lockfile know it but the symlink doesn't exist. `pnpm install` before investigating. Turbo's summary hides the real `ERR_MODULE_NOT_FOUND` — run the test file directly.
- **Two copies of a package under strict layout.** `@testing-library/dom` and `@testing-library/react`'s bundled copy are different modules; configuring one does nothing for the other. When a library's config "doesn't take", check which copy the code under test resolves.
