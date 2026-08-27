### Bug fix

Every shipped line traces to runtime evidence.
1. Reproduce it yourself on the matching surface (`/shelly:webapp-testing`, browser tools, `tsx --env-file` against staging, ssh + journalctl); force it if it won't fire. From a cloud session (claude.ai/code), `--env-file` and ssh are not reachable (no .env files, no ssh key) — record that surface as a blind spot and keep the conclusion provisional rather than faking the probe.
2. Binary-search the cause: `/shelly:diagnosing-bugs` loop, seeded by `/how` over the subsystem and `/why` for regression history; confirm the mechanism with runtime evidence before designing the fix.
3. Crosses a function boundary → `/architect` first; delegate the fix with a specific scope; review the diff.
4. Verify on the same surface, the original repro now passes; then `/shelly:verify-work` — blind verifiers prove the fix independently of you (they get the claim, never your diff).
5. Failing test lands before the fix in history (`/shelly:tdd` when a cheap local test exists).
6. Bugs in warehouse picking, sales linking, returns → read `packages/guidelines/SALES-LIFECYCLE.md` before step 2.
7. Open the PR; wait for the user's go before push. Reply: what was broken, root cause, fix, verification, failing-then-passing output verbatim. A root cause that surprised you or a wrong first hypothesis is a `/shelly:reflect` trigger; offer it.
