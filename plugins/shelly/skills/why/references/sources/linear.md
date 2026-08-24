# Linear Tickets

## What this source contains

- Issues describing features, bugs, and their motivation (team Dev, IDs like `DEV-123`)
- Project docs attached to issues (often specs)
- Parent/sub-issue relationships (broader initiative → specific tickets)
- Comments on issues (clarifications, scope changes, "why we're doing this" rationale)
- Labels that signal the type of motivation
- Status updates that explain scope changes
- Attachments and linked GitHub PRs

Linear is where the product/operational context often lives: the "we're doing this because X broke in production" or "this unblocks Y" layer. Most Dev-triage tickets originate from Bugsink error tickets, so an issue's description or first comment often already cites the underlying error.

## How to search it

Use the `mcp__linear__*` tools.

1. **Start with linked tickets.** If the seed commits or PRs reference a `DEV-nnn` ID, fetch it with `get_issue`. Read the full issue including comments.
2. **List related issues by keyword.** Use `list_issues` with text search for the feature name, key symbol, or business term. Try multiple phrasings.
3. **Walk the issue tree.** If you land on a sub-issue, fetch its parent. Sub-issues are tactical; parents often carry the "why."
4. **Read project docs.** If the issue belongs to a project, use `get_project` and check attached docs.
5. **Check labels and milestones.** Labels hint at the category of motivation (e.g. bug, incident-followup). Milestones tie work to deadlines, which often reveal motivation.

## What good evidence looks like here

- An issue description stating the operational problem: "Backfill job kept crash-looping on argus-engine, this fixes the retry"
- A comment recording a decision: "went with approach B because approach A would need a Supabase migration"
- A parent issue titled like an initiative
- An attached spec
- A description that links a Bugsink issue ID or stack trace

## Common pitfalls

- **Scope drift.** The ticket the PR references may have been closed and reopened with a different scope. Read the whole history.
- **Mechanical templates.** Some teams require "Why" sections but fill them with boilerplate. Generic text ("improve reliability") is probably not a real answer.
- **Stale tickets.** Old tickets often reflect a version of the plan that changed. Check dates and cross-reference with the code's ship date.
- **Closed-as-duplicate chains.** Follow the duplicate-of relationships back to the canonical ticket.

## What to return

For each relevant ticket:
- Ticket ID and title
- The problem/motivation quoted from the description or comments (not paraphrased; the synthesizer needs the exact text to cite)
- Labels, parent issue, project
- Author, created date, closed date
- Link to the ticket if available
