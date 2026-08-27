### Ship

"Ship it", "push and merge".

1. Diff touches `packages/*`, a migration/RPC/trigger, root config, or a frozen contract → `/shelly:blast-radius` first; a contested design → `/shelly:interrogate`.
2. `/shelly:ship` (rebase, per-app gates, push, PR, Actions check green, merge, cleanup). It stops on the first red gate; never work around one.
3. Offer `/shelly:reflect` if the task held a correction, a hard-won recipe, or a wrong playbook step.
