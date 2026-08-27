---
name: why
description: "Use for 'why does X work this way', 'why we picked Y', design rationale, regressions, postmortems, or data-backed thresholds. Discovers which fleet sources actually respond (git/gh, Linear, Bugsink, Supabase audit logs, VPS journal) and queries each in parallel, then returns a cited read on decisions and tradeoffs. Use how for runtime behavior."
---

# Why

Local port of pstack `why` (github.com/cursor/plugins), 2026-08-24.

Investigate the motivation and intent behind code. Why was it built this way? What edge cases were considered? What product, business, or operational constraints shaped the design? What alternatives were rejected, and why?

Companion to the `how` skill. `how` answers what the code does and how it works. `why` answers what forces led to its shape.

## How this skill works

Historical context in this stack spreads across five evidence categories: source control history, the Linear issue tracker, Bugsink error tracking, the shared Supabase database's audit log, and the VPS's systemd journals. You cannot predict from the question alone which one holds the answer, so the skill checks which of these actually respond at run time, queries all reachable ones in parallel, then synthesizes with explicit confidence calibration. Null results from searched categories are first-class evidence about how the decision was made; report them alongside positive findings. The default is coverage, not minimalism.

## Operating Posture

Operate as a careful, cautious, precise investigator. Think like a detective piecing together a historical case from fragmentary records. When the record is thin, say so.

Concretely:

- **Evidence before narrative.** Collect the pieces first, then see what story they support. Never pick a story and recruit the evidence that fits it.
- **Precision over polish.** Prefer the exact quote and citation over a smooth paraphrase. A reader should be able to follow any claim back to its source and verify it in under a minute.
- **Consider what you haven't seen.** The evidence you find is a sample, not the whole truth. Before concluding, ask what you would expect to see if an alternative explanation were true, and whether you looked for it.
- **Name the gaps.** If a thread goes cold, a source isn't reachable, or a question has no answer, document the gap. Don't paper it over with an authoritative-sounding guess.
- **Hedge on purpose.** When evidence is indirect, your language should signal it ("appears to", "likely", "suggests"). Confidence-matching phrasing is a feature of the output, not a stylistic choice the synthesizer may override.
- **No shortcut by code-reading.** The code tells you what it does, rarely why it exists. Resist inferring intent from code shape.

This posture is the working method, not a disclaimer.

## Core Epistemics

This skill builds a **patchwork understanding** from fragmented historical evidence. Tickets go stale. Commit messages lie. People change their minds between the PR description and the implementation. The original author may have moved on.

Be ruthlessly honest about what you know versus what you're inferring. The goal is not a satisfying story; it is to surface evidence, calibrate confidence, and let the user decide.

Principles:

- **Cite everything.** Every claim about intent should reference a specific commit hash, PR number, ticket ID, log line, or code comment. If you can't cite it, it's inference, not fact, and must be labeled as such.
- **Prefer "appears to" over "because".** Hedge when evidence is indirect. Reserve confident language for direct, explicit evidence.
- **Surface contradictions.** If two sources disagree, show both. Don't quietly pick the one that fits your narrative.
- **Acknowledge gaps.** If a question has no answer in any source you searched, say so. An honest "we couldn't find out why" beats a confident guess.
- **Multiple hypotheses are valid.** When the evidence fits several stories, present them all with the evidence for each. Let the user triangulate.
- **Beware rationalization.** Code that makes sense today may have been written for reasons that no longer apply, or for no good reason at all. Don't retrofit intent.

Read `references/epistemics.md` for the full confidence framework and phrasing guide. The synthesizer must follow it.

## Step 1. Understand the Target and the Question

Parse what the user is asking. The **target** is usually a chunk of code, a pattern, a feature, or a named design decision. The **question** is usually one of:

- "Why was X designed this way?" Design rationale.
- "Why do we do X instead of Y?" Tradeoff or alternatives.
- "What edge cases motivated this?" Defensive reasoning.
- "What product or operational constraint led to this?" External forcing function.
- "Why does this code still exist?" Dead-code territory.
- "What's the history of X?" Broad archaeological sweep.

If the target is vague ("why do we do it this way?" with no clear referent), make your best guess from conversation context (open files, recent edits, what was just discussed). State your interpretation briefly so the user can redirect if you're off, then proceed.

## Step 2. Establish the Code Anchor

Before spawning investigators, anchor the investigation in concrete code. You need:

- The relevant file path(s) and line range(s)
- The key symbols (function names, class names, constants)
- An initial commit list. The last few commits touching the target.
- PR numbers from merge commits (pattern `(#1234)` in the subject line)

Build this inline. It's cheap, and every investigator needs it.

```bash
# Blame target lines for last-touch commits
git blame -L <start>,<end> <file>

# Full file history, with patches, through renames
git log --follow -p -- <file>

# Last N commits touching the file, PR numbers visible
git log --oneline -20 -- <file>

# Extract PR numbers from a commit message
git log -1 --format=%B <commit>
```

Pull PR bodies and discussion via `gh` for any substantive commits:

```bash
gh pr view <number> --json title,body,author,createdAt,mergedAt,labels,closingIssuesReferences,comments,reviews
```

Capture this as seed context (file paths, symbols, commits, PR numbers, linked ticket IDs). Pass it to the investigators so they don't rediscover it.

## Step 3. Spawn Parallel Investigators (default posture)

**Default to the full parallel investigation.** Each evidence category lives in a different system, and you cannot tell from the question alone which one holds the answer without looking. So look across every reachable category, in parallel, by default.

### Discovery

Before spawning investigators, check which of the fleet's sources actually respond right now:

1. Source control: always available (git, `gh`).
2. Linear: check the `mcp__linear__*` tools are reachable (ToolSearch if needed).
3. Bugsink: check `ssh ken-ai-agents` (or the host that runs Bugsink) responds.
4. Supabase audit logs: check the `supabase-production` MCP is connected, read-only.
5. VPS journal: check `ssh ken-ai-agents` responds and the relevant systemd unit exists.

Don't assume; a source configured but unreachable this session is a gap to report, not a silent skip. Record ambiguous or half-reachable cases in the coverage map.

From a cloud session (claude.ai/code), the VPS over ssh is not reachable (no ssh key, no secrets store) — that also takes Bugsink with it, since it's reached over ssh, not an MCP. Record both as a blind spot, mark any conclusion that would have leaned on them provisional, and don't fake the probe.

Launch all matching investigators in a single message so they run concurrently. One investigator per category lets each specialize in one tool's query vocabulary and result shape. Don't ask one agent to cover multiple sources.

Subagent config (each), via the Agent tool:
- `subagent_type`: `general-purpose` for source control, Bugsink, and VPS journal investigators (they work over Bash/ssh). `shelly:code-analyst` is a reasonable alternative for the source-control investigator when the trail is mostly in-repo.
- `model`: `sonnet`.

Each investigator gets:
1. The base prompt from `references/investigator-prompt.md`
2. The category playbook `references/sources/<source>.md` for its assigned category
3. The cross-cutting `references/sources/incident-postmortem.md` **if the target code looks defensive** (null checks, retry logic, timeout handling, rate limiting, feature flags, egress guards, OOM handlers)
4. The code anchor from Step 2 (file paths, symbols, commit hashes, PR numbers, ticket IDs)
5. The user's original question

### Investigator roster. One per available evidence category

Spawn one investigator per category that's reachable. Each owns exactly one source.

1. **Source control investigator**. Git history, `gh` for PRs, code comments, tests. Always spawn; the only guaranteed source. Best at surfacing *implementation-time rationale captured during review*. PR descriptions stating the problem, review threads debating alternatives, inline comments encoding non-obvious constraints, test names that encode motivating edge cases, and commit messages linking tickets or incidents. Most trustworthy because it ties directly to the diff that shipped. Playbook: `references/sources/code-archaeology.md`.

2. **Linear investigator**. Issues, project docs, comments, labels, parent/sub-issue relationships (team Dev, `DEV-123`). Best at surfacing *the product or operational forcing function*: scope changes, incident-followup labels, parent-initiative framing. Strongest when the why is external to the immediate diff. Playbook: `references/sources/linear.md`.

3. **Bugsink investigator**. Self-hosted, Sentry-compatible error tracking, reached over `ssh` to the VPS via `bugsink-manage shell` (not the Sentry SaaS API — there is no Bugsink MCP). Best at surfacing *the specific exceptions and error trajectories that motivated defensive or corrective code*. Strongest for catch blocks, null guards, type checks, retries. Playbook: `references/sources/bugsink.md`.

4. **Supabase audit logs investigator**. The shared production database's `audit_logs` table, queried read-only via the `supabase-production` MCP. Best at surfacing *what data actually changed and when*, as circumstantial support for a migration or backfill's motivation. `updated_by` records the last toucher, not necessarily the actor who decided the change, so don't over-read it as authorship. Playbook: `references/sources/supabase-audit-logs.md`.

5. **VPS journal investigator**. `ssh ken-ai-agents`, `journalctl -u <unit>` for argus-engine timers and other long-running services, reached only over ssh (no MCP). Best at surfacing *operational reality around a ship date*: crash loops, timer failures, restart storms that a fix responded to. Playbook: `references/sources/vps-journal.md`.

### When to skip an investigator

Only skip with an **explicit, written justification** that goes in the final "Sources Consulted" section. Two valid reasons:

- **The source doesn't respond** in this environment (MCP not connected, ssh host unreachable). Flag this as a gap, not a choice. Example: "Bugsink skipped. `ssh ken-ai-agents` did not respond, so the error record was not searchable this session."
- **The source is provably irrelevant**, not just "probably irrelevant." A high bar. Example: "Bugsink skipped. Target is a build-time script with no runtime error path." Not "probably not in Bugsink, it's a feature not an error."

"It's pure feature code, Bugsink won't have anything" is **not** sufficient. Run the search; let the null result speak. The cost of an investigator returning empty is one subagent. The cost of missing a ticket or audit-log trail that actually exists is a wrong answer.

If your scope assessment suggests a single-commit trivial target where the PR description already contains the complete answer, you may answer inline **only after** confirming all reachable category searches would be redundant. Say so explicitly. This should be rare.

## Step 4. Synthesize

Spawn one synthesizer via the Agent tool:

- `subagent_type`: `general-purpose`
- `model`: `fable`

The synthesizer gets:
1. The investigator findings, including any null results and any categories skipped with justification
2. The code anchor from Step 2 (file paths, symbols, commit hashes, PR numbers, ticket IDs)
3. The user's original question
4. The epistemics framework from `references/epistemics.md`
5. The synthesizer prompt template from `references/synthesizer-prompt.md`

Its job is the final output: a confidence-weighted, evidence-cited narrative with clearly separated "what we know" and "what we're inferring" sections, plus honest acknowledgment of gaps and null-result sources.

## Step 5. Present

Take the synthesizer's output and present it to the user. You may lightly edit for clarity or add context from the conversation, but **do not rewrite the confidence language**. The epistemic framing is the product. Dropping the hedges to sound more authoritative is the exact failure mode this skill exists to prevent.

## Output Format

The final output uses this structure. Adapt as needed, but keep the confidence separation intact.

**The Question**. Restate what the user asked, concisely.

**The Code in Question**. File paths, line ranges, and key symbols. One or two lines so the reader is anchored.

**What We Found (direct evidence)**. Claims with explicit citations (PR #, DEV-nnn ticket, Bugsink issue ID, audit_logs row, journal timestamp, commit hash, code comment with file:line). Each bullet is a thing we have textual evidence for. Use present tense and quote or paraphrase the source.

**What We Can Reasonably Infer**. Claims well-supported by indirect evidence or combinations of signals, but not explicitly stated anywhere. Each bullet must explain the inference chain: "Given A and B, it's likely that C." Use hedged language ("appears to", "likely", "suggests").

**Competing Hypotheses**. If the evidence fits multiple stories, list them. For each, give the hypothesis, the evidence for it, and the evidence against it. Don't force a winner when the record doesn't support one. (Skip this section if there's a clear answer.)

**What We Don't Know**. Explicit gaps. Questions the user asked that the evidence didn't answer. Sources we searched and came up empty. Be specific. "We searched Linear for 'rate limit' and found no ticket discussing this specific threshold" is more useful than "we don't know why."

**Sources Consulted**. One line per investigator, including the ones that returned nothing. The reader should see at a glance (a) which sources were queried, (b) which came back empty, and (c) which were skipped and why.

Format each line as: `- <Source>: <what was searched>. <what was found, or "no relevant results," or "skipped. reason">.`

Example:
- Source control (git/gh): `git log --follow apps/repricingdashboard/lib/retry.ts`, PRs #412, #398. Found PR #412 introduced exponential backoff and linked DEV-118.
- Linear: searched for "retry" and DEV-118. Found DEV-118 parent issue but no discussion of backoff parameters.
- Bugsink: `bugsink-manage shell` query for issues first-seen in the two weeks before PR #412. Found issue matching timeout stack trace, last seen the day the PR merged.
- Supabase audit logs: queried `audit_logs` for the affected table around the PR merge date. No rows found (this code path doesn't write to an audited table). Skipped searching further.
- VPS journal: `journalctl -u argus-engine` around the PR merge date. No relevant entries.

After the Sources Consulted block, if the user's `why` question is a precursor to actually changing this code, convert the lineage findings into a Preserve / Change / Avoid / Risk constraint set suitable for planning the change.

## Common Failure Modes to Avoid

- **Confident storytelling**. A plausible narrative built from thin evidence. A bullet with no citation goes in "inferred" or "hypotheses," not "what we found."
- **Citing the code as evidence for its own intent**. "Handles the null case because it checks for null" is mechanics, not motivation. Motivation comes from an external source (PR discussion, ticket, comment, conversation) or is labeled as inference.
- **Recency bias**. Assuming the most recent commit is authoritative. The current shape is often the accretion of many earlier decisions. Trace back.
- **Sycophantic agreement**. If the user suggests a reason ("I assume this is for performance?"), treat it as a hypothesis and check the evidence independently, don't just confirm it.
- **Skipping the gaps section**. An honest accounting of what you couldn't find out is part of the value.
- **Skipping investigators by anticipation**. Deciding up front that "Bugsink probably doesn't have this" or "this isn't an audit-log thing" without checking. A null result is a data point; a skipped search is a blind spot.
- **Collapsing investigators into one agent**. Each source has its own query vocabulary, result shape, and pitfalls; pooling them dilutes specialization and makes coverage harder to reason about. Always one investigator per category.
- **Misreading `audit_logs.updated_by`**. It records the last toucher of a row, not necessarily the person who decided the change. Don't cite it as authorship evidence without saying so.

## Reference Files

- `references/epistemics.md`. Confidence tiers and phrasing guide. The synthesizer must follow it.
- `references/investigator-prompt.md`. Base prompt template for investigator subagents.
- `references/source-playbook.md`. Index pointing at the category playbooks below.
- `references/sources/*.md`. One self-contained playbook per category, plus cross-cutting `incident-postmortem.md`. Give an investigator the single file that matches its category.
- `references/synthesizer-prompt.md`. Prompt template for the synthesizer subagent, including the output format.
