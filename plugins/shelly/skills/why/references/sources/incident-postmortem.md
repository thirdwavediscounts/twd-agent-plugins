# Incident & Postmortem Context

Not a separate source, a **cross-cutting angle**. Incidents often motivate defensive code ("we added this check after the retry storm"), so if the target looks defensive (null checks, retry logic, timeout handling, rate limiting, feature flags), specifically hunt for incident history across every reachable source:

- **Linear**: look for tickets labeled incident/reliability, or a ticket originating from a Bugsink error (most Dev-triage tickets do)
- **Bugsink**: issues whose first-seen/last-seen window aligns with the target's ship date; stack traces through the target
- **VPS journal**: restart loops, crash storms, or timer failures on argus-engine units around the target's ship date
- **Supabase audit logs**: a burst of writes or corrections to an affected table right around the incident window
- **Git**: commits with messages like "fix for incident", "add defensive check", "revert" followed by "re-apply with..." are strong signals

If you find an incident link, fetch the full context. When multiple sources corroborate (a Bugsink issue ID appears in a Linear ticket description, which appears in a commit message, and the VPS journal shows the restart loop stopped after the deploy), the evidence is especially strong.

Worth spending time on when the code's defensive character makes an incident-driven origin plausible. Skip it for code that doesn't look defensive.
