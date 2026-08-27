---
name: blast-radius
description: Find what a change could break somewhere else before it ships — beyond the diff — and prove the one fact it's safe because of by running real code. Use for 'blast radius of X', 'what could this break', reviewing a diff you don't trust, and BEFORE opening a PR whose diff touches packages/*, a database migration/RPC/trigger, a root-level config file, or any frozen runtime contract (env-var names, public routes, health-check identities).
---

# Blast radius

Find what a change breaks somewhere else, before it ships. Listing the callers is not the job — grep finds those in a second. The job is the breakage grep won't show you.

In this fleet, "somewhere else" is bigger than the repo: one Supabase database serves 12 apps plus the Argus engine on the VPS; `packages/*` deploys everywhere; a merge that touches a root-level file rebuilds every Vercel project. That's why this runs BEFORE the PR — every merge spends build CPU, so the discovery has to be finished before the merge, not after.

## Don't trust your own writeup

A blast-radius writeup that sounds right is worthless — it reads as convincing whether or not it's true. Don't hand back the writeup. Find the one or two facts the whole thing depends on and prove them by running code. Words are where you start, not what you ship.

### How sure are you

For each fact the change's safety depends on, get it as far down this list as is cheap, and say where it stopped:

1. You said so. Worthless on its own.
2. You pointed at the line. A real `file:line`, or the library's own source.
3. You showed the bad case can't happen. You walked the failure step by step and it doesn't reach.
4. You ran it. A script or test that calls the real code and fails loud if you're wrong.
5. You reproduced it in the running app.

Any safety fact you can't get to step 4, say so out loud — don't write it up as settled. Step 4 here is usually cheap: `tsx --env-file=<repo>/.env` against staging, a real `createDb` connection, calling the actual handler. Never a mock standing in for the runtime path.

## Steps

1. **Read the change.** The diff, the symbols it adds/changes/deletes, and what it now does differently — including the part the diff doesn't spell out.
2. **Find the one fact it's safe because of.** Most scary-looking changes are safe because of a single fact ("this RPC is only called by the quote flow, and the quote flow always passes a UUID"). Find that fact; if it holds, most scary cases die at once. Spend your time here, not on a long list of maybes.
3. **Look where grep stops.** In this fleet that means:
   - **The database**: triggers, RPCs, functions, RLS policies, and default privileges that fire on the tables you touch — read them live via the Supabase MCP, don't infer. Another app or the engine may write the same rows.
   - **Sibling apps**: every `apps/*` that reads the same tables, env vars, or shared packages — read them, they're all in this checkout.
   - **The engine**: workers on the VPS reading the same tables/queues (`ssh` + `journalctl` if behavior matters).
   - **Frozen runtime contracts**: health-check `service:` identities, OAuth origins, public routes, env-var names, cron endpoints — anything an external system calls or reads.
   - **Vercel scoping**: does this diff touch a root-level file or a `packages/*` (fleet rebuild / fleet deploy), and are the `dependencies` edges right so the affected apps actually rebuild?
   - The usual invisible couplings: JSON shapes an API returns, wire formats, feature flags, code three hops downstream, pinned library versions.
4. **Be honest about each risk.** A real chance of happening and a real cost if it does. Keep confirmed risks; list checked-and-cleared separately. Cite real `file:line`; a search that finds nothing is still an answer; never invent a caller or an API.
5. **Prove the one fact.** Write a script or test that runs the real code, run it, paste what happened. **Falsify it too**: break the input deliberately (wrong cert, wrong id, missing row) and confirm the failure — an assertion that cannot fail is not evidence. If you can't prove it cheaply, mark it unproven. Don't round up.
6. For a big or wide change, get a second independent read: dispatch a fresh-context Claude Fable reviewer (Agent tool, `general-purpose`, model `fable`) on the same question. Size its effort to the diff — `medium` for docs/one-liners, `high` for app logic, `xhigh` for anything touching packages/*, a DB migration/RPC/trigger, root config, or a frozen runtime contract — and set the session effort accordingly before spawning it. A fresh, uninvested pass catches things the first pass's assumptions hid.

## What to hand back

- **What it does.** What changed, including the part that isn't obvious.
- **The one fact it's safe because of.** State it, say which evidence step you reached, show the proof. If unproven, write unproven.
- **Risks.** Only real ones: how it breaks, `file:line`, likelihood, cost, how to check.
- **Cleared.** What you checked and why it's fine.
- **Before you merge.** The cheapest test or repro that catches the real bug, including the script you wrote.

Run the writeup through `unslop`. Name the unverifiable part BEFORE the merge, not after.
