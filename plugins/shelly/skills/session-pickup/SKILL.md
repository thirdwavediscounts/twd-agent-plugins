---
name: session-pickup
description: Resume or take over a prior agent's in-flight work from a transcript, cloud-agent URL, or pushed branch. Use for "take over this", "resume this conversation", "continue from <transcript path>", "you're taking over", "pick up where X left off", or a pushed branch you're meant to continue.
---

# Session pickup

Local port of pstack `session-pickup` (github.com/cursor/plugins), 2026-08-24.

**You own the resume point. Read the prior trail, don't redo it.**

A pickup is inheritance. The prior agent already paid the cost of reading the code, running the repros, making the design choices. Redoing loses the bias check and burns context. Resist the urge to re-derive; read.

1. Locate the prior trail: a transcript, a cloud-agent URL, or a pushed branch. Read the metadata overview and last messages first, then scan back for the decision points. If a `show-me-your-work` decision log exists for the run, it's authoritative and faster to read than the raw transcript. For a long transcript, delegate the read to a subagent and keep the reduced timeline in the main thread rather than inlining the whole thing.
2. Reconstruct operational state. The branch and worktree, what already landed (`git log`, `git diff` against the base), the open todos, the decisions made. The prior trail is authoritative input. Resist the bias to re-derive it.
3. Diff done vs pending. Compare what shipped against what was planned, name the resume point, do not re-run the prior repro or redo completed work. A "let me verify from scratch" pass is the tell that you're treating the trail as untrustworthy when it's actually authoritative.
4. Route the remaining work to whatever this task actually is: continue the implementation, ship a finished recommendation, ratify or override a prior conclusion, or write up a postmortem for a failed run. The pickup ends here; the rest is a normal task.
5. Verify the inherited claims against the original goal on the real artifact — run the tests, load the page, hit the endpoint. A passing prior self-report is not the proof.

**Reply:** where the prior agent stopped, what you inherited vs redid (ideally nothing redone), the resume point, and the outcome.
