### Verify an app

1. No scripted way to prove the app's behavior → `/shelly:create-verification-skill` (feature map + verify skill inside `apps/<x>/.claude/skills/`).
2. Verify skill exists but its feature map has drifted → `/shelly:maintain-verification-skill`.
3. Prove the skill on one real feature before relying on it.
