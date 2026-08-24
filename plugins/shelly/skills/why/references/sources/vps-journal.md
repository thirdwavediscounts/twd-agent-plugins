# VPS Journal

## What this source contains

Operational logs for services running on the VPS, most relevantly the argus-engine timers and other long-running units. Reached only over `ssh`, no MCP. This is the operational-reality layer: crash loops, timer failures, restart storms, and deploy-time log lines that a defensive change may have responded to.

## How to search it

```bash
ssh ken-ai-agents

# List units to find the right name if unsure
systemctl list-units --type=service,timer | grep -i argus

# Logs for a specific unit, with a time window
journalctl -u <unit> --since "2026-06-01" --until "2026-06-15"

# Grep for an error signature across a unit's history
journalctl -u <unit> | grep -i "<error string or exception class>"

# Boot-to-boot restart history (crash-loop signal)
journalctl -u <unit> --list-boots
```

Common units to check: argus-engine timers, and any other systemd-managed background job the target code's fix would plausibly affect (schedulers, backfill jobs, health-check runners).

## What good evidence looks like here

- A cluster of failure log lines for a unit that stop right after the target's deploy date, consistent with the fix addressing them
- A restart-loop pattern (`systemd` repeatedly restarting the same unit) that lines up with an incident window referenced in a Linear ticket or Bugsink issue
- A log line whose exact error string is quoted in the target's commit message or a linked ticket

## Common pitfalls

- **ssh reachability.** If `ken-ai-agents` doesn't respond this session, that's a gap to report, not a silent skip.
- **Log retention.** `journalctl` only holds what's still on disk; older incidents may already be gone. Note the retention gap if the window you need predates what's available.
- **Correlation isn't causation.** A log pattern stopping after a deploy is circumstantial, same caveat as Bugsink release correlation — another change in the same deploy window could be the real cause.

## What to return

- The unit(s) and time window checked
- Relevant log excerpts (verbatim, with timestamps)
- Whether the pattern correlates with the target's ship date
- Any gaps from log retention or ssh unreachability
