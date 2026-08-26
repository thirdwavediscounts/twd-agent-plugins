### Verify an app

0. A merge landed and the ticket's acceptance needs runtime proof → `/shelly:verify-live` (deployed build, staging data target, read-back; never "wait for the next real upload/cron").
1. No scripted way to prove the app's behavior → `/shelly:create-verification-skill` (feature map + verify skill inside `apps/<x>/.claude/skills/`).
2. Verify skill exists but its feature map has drifted → `/shelly:maintain-verification-skill`.
3. Prove the skill on one real feature before relying on it.
