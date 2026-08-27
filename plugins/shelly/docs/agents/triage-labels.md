# Triage roles → Linear mapping

In this workspace the triage **state** machine is modeled as Linear **workflow statuses** (board columns), not labels. The triage **category** is a label. `/triage` sets the status to move an issue through the machine; it does not create triage labels.

## State roles → Linear statuses (team Dev)

| Triage state role | Linear status | Status type |
|---|---|---|
| needs-triage | `Triage` | unstarted (team **default** — new issues land here) |
| needs-info | `Needs Info` | unstarted |
| ready-for-agent | `Ready for Agent` | unstarted |
| ready-for-human | `Ready for Human` | unstarted |
| (in progress) | `In Progress` / `In Review` | started |
| (resolved) | `Done` | completed |
| wontfix | `Canceled` | canceled |

To move a role: `mcp__linear__save_issue` with `state: "<status name>"`. New issues should land in `Triage`.

## Category roles → labels

| Triage category | Linear label |
|---|---|
| bug | `Bug` |
| enhancement | `Feature` or `Improvement` |

Every issue also carries its `App/<name>` label (and `Database` when it touches shared Supabase). Category/app labels are orthogonal to the state status — an issue has one status *and* its category + app labels.

> The four state statuses (`Triage`, `Needs Info`, `Ready for Agent`, `Ready for Human`) were created in the Linear UI (Settings → Team Dev → Issue statuses) under the Unstarted category, and the old generic `Todo` was removed. `Triage` is the team default. The MCP API is read-only for statuses, so any further status changes are UI-only.
