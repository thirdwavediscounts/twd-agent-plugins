# Source playbooks

The why skill spawns one investigator per reachable evidence category, each reading a single source-specific playbook below.

| Category | Playbook | Reached via |
|---|---|---|
| Source control history | [`code-archaeology.md`](./sources/code-archaeology.md) | git, `gh` |
| Issue tracker | [`linear.md`](./sources/linear.md) | `mcp__linear__*` (team Dev, `DEV-nnn`) |
| Error tracking | [`bugsink.md`](./sources/bugsink.md) | `ssh` to the VPS, `bugsink-manage shell` (Sentry-compatible, self-hosted — no MCP) |
| Supabase audit logs | [`supabase-audit-logs.md`](./sources/supabase-audit-logs.md) | `supabase-production` MCP, read-only, `audit_logs` table |
| VPS journal | [`vps-journal.md`](./sources/vps-journal.md) | `ssh ken-ai-agents`, `journalctl -u <unit>` (argus-engine timers) |

Cross-cutting:

- [`incident-postmortem.md`](./sources/incident-postmortem.md). Add this if the target code looks defensive (null checks, retry, timeout, rate limit, feature flag, egress guard, OOM handler).

From a cloud session (claude.ai/code), Bugsink and the VPS journal are not reachable — both go over `ssh`, and cloud has no ssh key. Record as a blind spot and mark any conclusion that leans on them provisional; don't fake the probe.
