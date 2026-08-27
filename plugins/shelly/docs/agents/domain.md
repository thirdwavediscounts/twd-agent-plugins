# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

This is a **multi-context** repo: a root `CONTEXT-MAP.md` points at one `CONTEXT.md` per context. Contexts here are the apps under `apps/*` (and shared `packages/*`), not `src/<context>/` folders.

## Before exploring, read these

- **`CONTEXT-MAP.md`** at the repo root — it points at one `CONTEXT.md` per context. Read each one relevant to the topic.
- The per-context **`CONTEXT.md`** for the app/package you're working in (e.g. `apps/product-research/CONTEXT.md`).
- **`docs/adr/`** — read ADRs that touch the area you're about to work in. Context-scoped decisions live under `apps/<app>/docs/adr/` (the repo already keeps app docs inside their owning app).

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill creates them lazily when terms or decisions actually get resolved.

## File structure (this repo)

```
/
├── CONTEXT-MAP.md                       ← the map (local-only; see note)
├── apps/
│   ├── product-research/
│   │   ├── CONTEXT.md                    ← per-app glossary (created lazily)
│   │   └── docs/adr/                     ← app-scoped decisions
│   └── <other apps>/…
└── packages/
    └── <shared package>/CONTEXT.md       ← if a package earns its own model
```

> Placement note: root `docs/` and `CONTEXT.md` are gitignored in this repo, and any *tracked* root-level file rebuilds all 12 Vercel projects on merge. These agent-config docs (and `CONTEXT-MAP.md`) are kept **local-only / untracked** — they never enter a commit, so they never deploy. Per-app `CONTEXT.md` / `docs/adr/` files, if committed, rebuild only their owning app. To share any of this with teammates without a fleet rebuild, move it under `packages/guidelines/` (that package has no dependents).

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in the relevant `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 — but worth reopening because…_
