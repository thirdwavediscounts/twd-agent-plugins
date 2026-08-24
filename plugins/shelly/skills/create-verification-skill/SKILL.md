---
name: create-verification-skill
description: Generate an app-local verification skill that drives a twd app the way a user does. Use for "/create-verification-skill", "make a control skill for this app", or when an app has no scripted way to prove UI/CLI/service behavior.
---

# Create a verification skill

Local port of pstack `create-verification-skill` (github.com/cursor/plugins), 2026-08-24.

Every serious app needs a scripted way to drive the real thing, exercise a feature the way a user would, and capture evidence. This skill generates that as an app-local skill. Write the generator's output for the next agent, not for a human: it will be read cold, mid-task, by an agent that has never seen the app.

The generated skill must live inside the target app, at `apps/<x>/.claude/skills/verify-<x>/`. Never generate it at the monorepo root — root-level files there trigger a rebuild of all 12 Vercel projects.

## 1. Interview the repo, not the user

Answer these from the codebase and only ask the user what you cannot observe:

- **Surface:** what does a user actually touch? The three Vite apps (product-research, argus-console, warehouse-mobile-app) and the two Next.js apps (ccg, customer-service-dashboard) are web UIs. repricingdashboard is also Next.js. Some apps also expose an API surface (e.g. repricingdashboard's `route.ts` handlers) worth noting even if the UI is primary.
- **Run:** how does the app start locally? Prefer the app's own `package.json` dev script. Note ports, env vars, seed data, auth (most apps sit behind the shared Supabase auth).
- **Drive:** how can an agent interact with it programmatically?
  - Web apps: Playwright via `/shelly:webapp-testing`, or the claude-in-chrome browser tools.
  - Backends / APIs: plain `node`/`tsx` scripts hitting the routes directly, or `curl`.
  - Prefer stable handles (ARIA labels, data attributes, route paths) over coordinates and tab order, either way.
- **Observe:** what evidence can be captured? Screenshots, terminal transcripts, response bodies, logs, exit codes, Supabase row state (via the `supabase-staging` MCP, read-only against `supabase-production`).
- **Isolate:** can two instances run side by side (ports, data dirs, profiles)? If not, say so in the generated skill: refusing to double-drive a shared instance beats corrupting the user's session.

If the checkout doesn't build or start as-is, fix that first (or report it precisely) before generating; a skill written against a broken base teaches wrong steps. When an irrelevant missing asset blocks startup (a static dir the API never serves, a sample config), the generated skill may create it, clearly marked as verification scaffolding, and remove it in cleanup.

## 2. Generate the skill

Write `apps/<x>/.claude/skills/verify-<x>/SKILL.md` with YAML frontmatter (`name: verify-<x>` and a `description` that names the app, the surface, and when to reach for it — without frontmatter the skill never registers) and these sections, each grounded in what the interview actually found (no placeholders left):

- **Launch:** the exact command that starts the app for verification, and how to tell it's ready (a log line, a port answering, a prompt). Include teardown. For a short-lived script there is no server to keep alive: launch means install deps once, then run each drive fresh.
- **Doctor:** one read-only check that answers "is this instance worth driving?" — process up, right version/build, port owned by us, auth valid. An agent runs this first whenever anything looks off.
- **Drive:** the harness recipe with real selectors/commands from this app, not examples. Playwright commands for the Vite/Next.js apps, plain script invocations for backends.
- **Evidence:** what to capture for a proof and where it goes. State the proof standards: exercise the real user path, not internal setters or test-only endpoints; capture the action and the resulting state, not just the final screen; verify side effects (rows inserted, files written) alongside what's visible; mocks only where a production boundary already isolates the external system. When the safe path is a dry-run or test mode, verify what it actually skips by observing (files, network, DB rows) rather than trusting its name.
- **Cleanup:** how to tear down instances the run created. Never kill by process name; kill what you started. Cleanup removes instances and scratch state, never the evidence: proof artifacts survive the teardown, in a location the skill names.
- **Helpers:** any script the skill ships is executable and its invocation is shown in the skill body. A helper the reader has to reverse-engineer is not a helper.

## 3. Seed the feature map

Create `apps/<x>/.claude/skills/verify-<x>/features/README.md` plus one file per user-facing feature you can identify (aim for the top 3-5 to start, from routes, pages, or docs). Follow the shape in [`references/feature-map-example/`](references/feature-map-example/), with a README index and one file per feature. Each file answers, from the user's point of view: what the feature is, how to reach it, how to drive it with the harness, and what observable end state proves it works. The four H2s are `Sub-features`, `How to get to it (user POV)`, `Driving it with <harness>`, and `Gotchas`. The map is the app's maintained verification source; a proof that drives one convenient entry point is incomplete when the map lists others.

## 4. Prove the generated skill before handing it over

Run its own instructions end to end once: launch, doctor, drive ONE mapped feature (one is enough; the map exists so later runs can cover the rest), capture evidence, clean up. After cleanup, confirm the evidence still exists at the named location — a cleanup that eats the proof fails this step. Fix what fails, and run the generated cleanup after every failed iteration too, so broken attempts don't strand processes and ports. A generated skill that was never executed is a draft, not a deliverable.

## 5. Offer the maintenance loop

Point the user at `maintain-verification-skill` for keeping the map honest as the app changes. Suggest a cadence only if they ask.
