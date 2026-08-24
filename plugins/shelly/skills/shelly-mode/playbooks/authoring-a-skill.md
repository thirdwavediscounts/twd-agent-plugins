### Authoring a skill

1. `/shelly:writing-for-agents` before writing; the description is the router — one trigger per branch.
2. Renaming or deleting a skill: grep `agents/`, sibling skills, `CLAUDE*.md`, and every `settings*.json` hook (`~/.claude/`, `<repo>/.claude/`) for the old name; fix each.
3. A skill that routes or classifies: dry-run it read-only against live inputs (the Linear queue, real PRs) and list what each would do before merging.
4. A behavior change: `plugins/shelly/evals/run.py <case>` before promoting it.
5. Bump `plugin.json` version in the same PR; after merge `claude plugin marketplace update twd` → `claude plugin update shelly@twd` → `/reload-plugins`. The ✔ prints even when nothing changed; proof is `~/.claude/plugins/cache/twd/shelly/<ver>/`.
