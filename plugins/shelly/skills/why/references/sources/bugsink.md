# Bugsink Error History

## What this source contains

Bugsink is the self-hosted, Sentry-compatible error tracker for this fleet — not the Sentry SaaS product, and there is no Bugsink MCP. For defensive, corrective, or error-handling code, it often holds the direct motivation: the specific exceptions, stack traces, and frequencies that pushed someone to add a check, catch, retry, or fallback.

- **Issues.** Grouped errors with counts, first/last seen timestamps, affected releases, and comments
- **Events.** Individual error instances within an issue (stack traces, tags, context)
- **Releases.** Deployment records with associated issues (useful for "which version fixed this?")

The most valuable thing Bugsink provides is **temporal correlation**: "issue X first seen 2026-06-02, peaked, stopped appearing after the deploy that shipped the defensive check."

Most Dev-triage Linear tickets originate from a Bugsink error ticket, so if a `DEV-nnn` ticket exists for the target, its description usually links the originating Bugsink issue directly.

## How to search it

From a cloud session (claude.ai/code), `ssh ken-ai-agents` is not reachable — cloud has no ssh key or secrets store. Record Bugsink as a blind spot and mark any conclusion that leans on it provisional; don't fake the probe.

Reached over `ssh` to the VPS, via Django's management shell:

```bash
ssh ken-ai-agents
cd /home/bugsink && sudo -u bugsink env -i HOME=/home/bugsink PATH=/home/bugsink/venv/bin:/usr/bin:/bin bugsink-manage shell
bugsink-manage shell
```

Inside the shell, query the Bugsink/Sentry-compatible ORM models directly (issues, events, releases) — the schema follows Sentry's self-hosted data model, so filter by project, error message/exception class, first_seen/last_seen, and release. Typical shape:

```python
from issues.models import Issue
from events.models import Event

# Search by exception class / message substring
Issue.objects.filter(title__icontains="TimeoutError")

# Narrow to a project and time window
Issue.objects.filter(project__slug="repricingdashboard", first_seen__gte="2026-06-01")

# Pull events for a specific issue to see stack traces
Event.objects.filter(issue_id=<id>).order_by("-timestamp")[:5]
```

Adjust model names to whatever the installed Bugsink version exposes; inspect with `Issue._meta.get_fields()` if unsure. Non-interactive: the same `sudo -u bugsink env -i … bugsink-manage shell -c "…"` line over ssh. Issue ids in the UI are `friendly_id()` = `<PROJECT-SLUG-UPPER>-<digest_order>`, so look one up with `Issue.objects.get(project__slug="atlas", digest_order=1)`. Read-only here; state changes (`IssueStateManager.resolve`) are a separate, authorised action.

For a suspected issue, check:
- **First seen.** When did the error start appearing?
- **Last seen.** When did it stop? Does it line up with the target's ship date?
- **Frequency trajectory.** Did it spike, then get resolved?

## What good evidence looks like here

- An issue whose **first seen** is shortly before the target's PR and **last seen** shortly after, suggesting the target addressed this error
- Stack traces that pass through or land on the target function, showing the exact failure mode being defended against
- A comment on the issue describing the fix
- The target's PR description, commit message, or linked `DEV-nnn` ticket referencing a Bugsink issue ID or URL
- An issue with high event counts that stops after the deploy containing the target

## Common pitfalls

- **Grouping drift.** Errors are grouped by fingerprint. Refactors or renames can track the "same" error under a new issue ID. If an issue ends abruptly, check for a new issue immediately after.
- **Silent fixes.** Sometimes the error stops because upstream changed, not because of the defensive code. The correlation suggests the fix; it doesn't prove authorship.
- **Resolved != fixed.** Issues can be marked resolved manually without any code change. Treat that as a human marker, not evidence that code fixed it.
- **ssh reachability.** If `ken-ai-agents` doesn't respond this session, that's a gap to report, not a silent skip.

## What to return

For each relevant issue:
- Issue ID/title and project
- First seen / last seen timestamps
- Event count
- A representative stack trace snippet showing relevance to the target (verbatim excerpt, not summary)
- First/last-seen correlation with the target's ship date
- Any comments or resolution notes
- Linked `DEV-nnn` ticket, if the issue has one
