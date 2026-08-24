---
name: wizard
description: Generate an interactive bash wizard that walks a human through steps only they can perform — provisioning, credentials, CI secrets, third-party dashboards, one-off cutovers. Don't invoke this for steps the agent can perform itself, or for prod SQL (that's a PROD_ runbook).
---

# Wizard

A **wizard** is a bash script that walks a human, step by step, through a manual procedure that's tedious to do by hand and tedious to re-explain to an AI every time. It opens each URL, says exactly what to click and copy, captures the values, writes them where they belong (`.env`, GitHub secrets), confirms at every stage, and shows how many stages are left.

The UX is already solved by [template.sh](template.sh) — stage-by-stage progress, confirmation gates, cross-platform URL opening, hidden secret entry, idempotent `.env` upserts, `gh secret`/`gh variable` writes, and a closing summary. **Your job is only to scope the procedure and author its stages.** The library above the `STAGES` marker is identical in every wizard — never hand-edit it.

A wizard is ephemeral by default — built for one run, saved to the scratchpad or a `scripts/` path, deleted when the job's done. Commit it only when the user wants a repeatable setup path in the repo.

## Fleet rules (these override anything the template implies)

- **Prod SQL is never a wizard.** Migrations for production follow the PROD_ runbook handoff (absolute-path file, SQL-editor chunks, Sean runs it). A wizard may *point* at a runbook stage ("open the runbook, run chunk 1") but never embeds the SQL.
- **Secrets never echo into the transcript.** The wizard runs in Sean's terminal (`! bash <script>` or a separate shell), which is fine — but when *verifying* afterwards, check booleans ("is FOO set y/n"), never print values. Same rule as the env-file memory: parse in Python/scripts, print booleans only.
- **Vercel env vars are shared team-level variables.** A wizard stage that needs a new one says: "Tell Sean the variable name and which projects need it" — it does not walk the Vercel dashboard, because linking is Sean's job. It DOES update `.env.example` (placeholder only) in the same change.
- **`gh` stays authenticated as `thirdwavediscounts`** — a stage must never switch accounts; if a stage requires different auth, stop and flag it.
- **`.env.example` is the contract.** Every value the wizard writes to `.env` gets a placeholder line in the owning app's `.env.example` if it's new.

## Process

### 1. Scope the procedure

Work out every manual step the human must take and every value captured along the way. Read the repo first — don't ask cold:

- For setup: `.env`, `.env.example`, `README`, framework config, `.github/workflows/*` (every `secrets.*` / `vars.*` reference is a value the wizard must produce), and for this fleet: `.mcp.json`, the app's `deploy.sh`.
- For a migration or transition: the current state, the target state, and the irreversible actions between them.

Then show the user the ordered list of stages and the values each produces, and confirm — they may add, drop, or reorder. Use the grilling question format for any open choices.

**Done when:** every stage is named in order, and for each captured value you know (a) where the human gets it, (b) where it's written (`.env`, a GitHub secret, both, or nowhere — some stages are pure actions), and (c) whether it's secret (hidden entry) or public.

### 2. Map each stage's journey

For each stage, write the precise path a human follows: which URL to open, what to do there, where the value is shown, which variable it fills — e.g. "Supabase dashboard → Settings → API → copy service_role key". Where you don't actually know the current UI or exact command, say so and check the docs (`find-docs` skill) or ask — never invent steps that may not exist.

**Done when:** every stage traces to concrete instructions a stranger could follow.

### 3. Author the wizard

Copy `template.sh` to the target path. Replace the example stage with one `stage` per step, in dependency order; set `TOTAL_STAGES`. Use the library helpers — `stage`, `say`/`step`, `open_url`, `ask`/`ask_secret`, `write_env`, `set_secret`/`set_var`, `pause`/`confirm`.

Hold the bar: open the URL before asking for its value, `ask_secret` for anything secret, `write_env` every persisted value, `set_secret` only what CI actually needs, `confirm` before any irreversible action. One focused task per stage.

### 4. Verify and hand off

- `bash -n <script>`; `shellcheck` if available; `chmod +x`.
- Don't run it end-to-end yourself — it opens browsers and blocks on human input. Trace it statically: every value from step 1 is captured and lands where step 1 said; every `set_secret` name matches a `secrets.*` reference in CI; every new `.env` key has an `.env.example` placeholder.
- Tell Sean to run it with `! bash <path>` so the output lands in the session, or in his own terminal.
