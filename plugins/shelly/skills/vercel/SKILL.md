---
name: vercel
description: Vercel fleet rules for the twd monorepo. Load BEFORE editing any vercel.json or package.json dependency edge, adding/renaming an app or Vercel project, debugging a failed/skipped/missing deployment, reading build logs, or reasoning about why projects rebuilt or what a merge will rebuild.
---

# Vercel — twd fleet rules

Each app is its own Vercel project rooted at `apps/<name>`, under a Pro team,
deploying from `main` only. Build CPU is the largest line on the bill; most of
these rules exist to not spend it by accident.

## What a merge rebuilds (skip-unaffected)

- Mechanism: Vercel's **built-in "skip unaffected projects"** (on by default).
  Never add `"ignoreCommand": "npx turbo-ignore"` — deprecated, overrides the
  built-in, and its cancellation happens AFTER the deployment exists — it still
  burns a deployment and build slot where the built-in never creates one. The dashboard toggle
  (Settings → Build and Deployment → Root Directory → "Skip deployment")
  *disables* the built-in skip — leave it on.
- "Affected" = the project's own source, its **`dependencies`-declared**
  internal packages, or a lockfile change touching its resolved deps.
  - `apps/<x>` MUST depend on `<x>-frontend` in `dependencies` (not
    devDependencies) or frontend-only changes are **silently skipped** — the
    site keeps serving the old build, nothing goes red.
    `apps/product-research/tests/vercelSkipPolicy.test.ts` pins this.
    Known latent: `atlas` still has the edge in devDependencies (Cedric's app).
    (Vercel's docs don't say whether the graph walks devDependencies, so the
    edge lives where behavior is unambiguous — costless for private workspace
    packages.)
  - `apps/*/server` (`*-dev-host`) packages are deliberately NOT depended on —
    the Express dev host is in no deploy path, so dev-host changes correctly skip.
- **Anything outside every workspace package is global** → rebuilds all 12
  projects: root files, `packages/*`, `turbo.json`, root `package.json`,
  `pnpm-workspace.yaml`, `.github/`. DB runbooks and docs live inside
  `apps/<x>/db` and `apps/<x>/docs` for exactly this reason; root `.gitignore`
  ignores `/*` and re-includes a known list, so a new tracked root path needs a
  deliberate `!/name` negation (which itself fleet-builds once).
- A `pnpm-lock.yaml` change does NOT fan out by itself — only packages whose
  resolved deps changed. But `pnpm add` can flip unrelated peer-variant keys
  and pull a sibling app in; verify that app's gates too.
- Local blast-radius measurement lies if the tree is dirty (turbo's `[main]`
  filter counts untracked files). `git status --porcelain` first.

## Branch/deploy config

- `git.deploymentEnabled`: unspecified branches default to **true**, and `*`
  does not cross `/` — so the working per-app form is
  `{"**": false, "main": true}`. Config is read from the commit being deployed,
  so in-flight branches leak previews until rebased.
- Dashboard "Ignored Build Step" must stay **Automatic** — a custom command
  overrides the built-in skip (diagnostic giveaway in build logs:
  `Running "if [ "$VERCEL_ENV" == "production" ]…"`). `pricers-hub` is the
  deliberate holdout (git pushes canceled; deploys by CLI).
- Git author must be a Vercel team member or the deploy is refused — all git
  ops as `thirdwavediscounts`, never switch mid-task.

## vercel.json functions block

**Specific file keys BEFORE globs.** Resolution is first-match in key order;
a glob listed first swallows the specific file, the specific key counts as
"unused", and the deploy is REJECTED (unmatched-function-pattern — #590/#591).
Pin `Object.keys(vercel.functions)` order in a test when a per-file override
matters, and watch `mcp__vercel__list_deployments` (ERROR vs BUILDING) ~30s
after any merge touching this — it only fails post-merge.

## Serverless TypeScript traps

- `@vercel/node` doesn't run `tsc -p`: if the entrypoint-reachable tsconfig's
  raw compilerOptions lack `module`, the builder injects
  `module: NodeNext` + **`strict: false`** (beating `extends`), logs the type
  errors, and **deploys anyway**. Any tsconfig reachable from a serverless
  entrypoint must spell out `module` itself (keep NodeNext/CommonJS —
  ESNext breaks the emitted function at runtime).
- A type error that reproduces on Vercel but not locally is usually a
  **phantom dependency** — a real (non-symlink) leftover dir in local
  node_modules satisfying an undeclared dep. `ls -l node_modules/<scope>/` +
  `pnpm ls <pkg>`; fix by declaring the dep where it's imported.

## Deploying

- Merge to `main` is the deploy path (per-app git autodeploy; every project is
  `git.deploymentEnabled: { "**": false, "main": true }`). **Rebase before any
  push** — `git rev-list --count HEAD..origin/main` nonzero = STOP before merging.
  Prod builds only from what lands on `main`, so a stale branch can't overwrite it
  the way the old manual prebuilt deploy could (the 148-commits-behind CCG incident).
- **Batch small changes**: each merge to `main` is a full prod build of every
  affected app. One PR per coherent unit, not per tweak.
- Merge subject: `sean/ <PR title>` (Vercel labels deployments with the merge
  commit's first line and truncates early).
- Env vars are shared team-level variables linked per-project — new ones go
  through Sean; `.env.example` tracks the contract.

Deep dives (measurements, incident details): memory files
`vercel-build-scoping`, `vercel-functions-key-order-first-match`,
`vercel-node-builder-injects-non-strict`,
`pnpm-phantom-dep-masks-vercel-type-errors`, and
`packages/guidelines/TEAM-GUIDELINES.md`.
