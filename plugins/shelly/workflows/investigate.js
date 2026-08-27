export const meta = {
  name: 'investigate',
  description: 'Evidence-first root-cause diagnosis across the twd fleet: a cheap router picks the plausible layers, read-only layer probes run in parallel, one synthesis, adversarial refutation, then a remediation plan posted to the Linear ticket: findings comment, one sub-issue per fix task, verify steps as a checklist in the ticket. Supports single-symptom, multi-ticket parallel lanes, and a bare picker guard that lists Ready-for-Agent tickets without fan-out.',
  whenToUse: 'A cross-system symptom whose cause is unknown and could live in the database, app code, the argus engine on the VPS, or Vercel. Args: string or {symptom, ticket} for a single investigation; {tickets: ["DEV-12", ...]} for parallel lanes; {all: true} for every Ready-for-Agent ticket; bare/empty to list Ready-for-Agent tickets without launching agents. Read-only against every system except Linear: it never writes to prod, restarts, or deploys.',
  phases: [
    { title: 'Route', detail: 'pick the plausible layers — conservative, falls back to all four', model: 'sonnet' },
    { title: 'Probe', detail: 'independent evidence gatherers, one per routed layer', model: 'sonnet (code layer: opus)' },
    { title: 'Synthesize', detail: 'name one root cause from the pooled evidence' },
    { title: 'Refute', detail: 'three fresh-context skeptics try to kill it — skipped only on a high-confidence, fully-covered, fully-explained diagnosis', model: 'sonnet' },
    { title: 'Plan', detail: 'minimal task list with checkable acceptance criteria' },
    { title: 'Report', detail: 'findings comment, fix sub-issues, verify checklist on the Linear ticket' },
  ],
}

// ---------------------------------------------------------------------------
// Shared constants — used by investigateOne and visible to all modes
// ---------------------------------------------------------------------------

// Every probe is read-only. This is the CLAUDE.local.md rule, restated per-node
// because a subagent never sees the parent's system prompt.
const READ_ONLY = `
HARD RULES:
- READ ONLY. Do not write, restart a service, deploy, change config, or mutate data. Not even to "test".
- Use supabase-production read-only. Never apply_migration or execute_sql writes against prod.
- Every finding needs the ACTUAL query/command you ran and its ACTUAL output as evidence. Never assert
  behavior you inferred from source without confirming it. "I read the code and it should X" is not evidence.
- If your layer is not in this problem's execution path, or you cannot reach it, set reachable=false and say why.
  A truthful "not reachable" is worth more than a guess.`

const FINDINGS = {
  type: 'object',
  properties: {
    reachable: { type: 'boolean' },
    unreachableReason: { type: 'string' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          claim: { type: 'string' },
          evidence: { type: 'string', description: 'the exact command/query run and its real output' },
          relevance: { type: 'string', enum: ['direct', 'contributing', 'ruled-out'] },
        },
        required: ['claim', 'evidence', 'relevance'],
      },
    },
  },
  required: ['reachable', 'findings'],
}

const ROOT_CAUSE = {
  type: 'object',
  properties: {
    rootCause: { type: 'string' },
    mechanism: { type: 'string', description: 'the causal chain from trigger to observed symptom' },
    supportingEvidence: { type: 'array', items: { type: 'string' } },
    confirmingCheck: { type: 'string', description: 'one read-only check that would confirm or kill this' },
    unexplained: { type: 'array', items: { type: 'string' } },
    confidence: {
      type: 'string',
      enum: ['high', 'medium', 'low'],
      description: 'high ONLY when every step of the mechanism rests on observed output (not code-reading), nothing is unexplained, and no competing cause fits the same evidence',
    },
  },
  required: ['rootCause', 'mechanism', 'supportingEvidence', 'confirmingCheck', 'confidence'],
}

const VERDICT = {
  type: 'object',
  properties: {
    refuted: { type: 'boolean' },
    reason: { type: 'string' },
    alternative: { type: 'string' },
  },
  required: ['refuted', 'reason'],
}

const LAYERS = [
  {
    key: 'database',
    model: 'sonnet',
    agentType: 'general-purpose',
    brief: `Probe the DATABASE via the supabase-production MCP (read-only). Check, as relevant: table
definitions and RLS, triggers, functions and RPCs, cron jobs, and REAL ROWS for the affected entities.
Use audit_logs for provenance — remember updated_by is only the LAST toucher, not who performed an action.
Check list_migrations for anything that landed near the symptom's onset.`,
  },
  {
    key: 'code',
    model: 'opus',
    agentType: 'code-analyst',
    brief: `Probe the MONOREPO CODE at /Users/shealtiel/Code/twd-apps-monorepo. Every app, shared package, and
cross-system doc is already on disk — read them rather than inferring. Map the data flow across apps/* and
packages/*, not just the one app that looks guilty. If the symptom touches marketplace sales, warehouse
picking, product-to-sale linking, or returns/relist, read packages/guidelines/SALES-LIFECYCLE.md FIRST, and
check packages/guidelines/incidents/ for dated prior evidence. Cite file:line for every claim.`,
  },
  {
    key: 'engine',
    model: 'sonnet',
    agentType: 'general-purpose',
    brief: `Probe the ARGUS ENGINE / VPS over ssh (ken-ai-agents). Inspect systemd timers and units, journalctl
for the relevant services, worker logs, and deployed runtime state. All engine schedules are PT-anchored.
Look for units that are failing, disabled, hung, or last-ran long before the symptom's onset. Read only —
do not restart or reload anything.`,
  },
  {
    key: 'vercel',
    model: 'sonnet',
    agentType: 'general-purpose',
    brief: `Probe VERCEL via the vercel MCP. Check which deployment is actually being served for the relevant
project(s), recent deployments and their build logs, runtime logs and runtime errors, and protection settings.
A stale or failed deploy serving old code is a recurring cause in this fleet.`,
  },
]

// A layer is dropped only on a clear negative signal. `code` never drops: the monorepo is
// on disk, it is the cheapest ground truth we have, and CLAUDE.md requires reading it.
const ALWAYS_PROBE = ['code']

const ROUTE = {
  type: 'object',
  properties: {
    layers: {
      type: 'array',
      items: { type: 'string', enum: LAYERS.map((l) => l.key) },
      description: 'keys of every layer that could plausibly be in this symptom\'s execution path',
    },
    dropped: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          layer: { type: 'string' },
          why: { type: 'string', description: 'the CONCRETE negative signal that rules this layer out of the execution path' },
        },
        required: ['layer', 'why'],
      },
    },
  },
  required: ['layers'],
}

const LENSES = [
  {
    key: 'evidence-sufficiency',
    ask: 'Does the cited evidence actually support each step of the mechanism, or does the chain rely on an unverified inference presented as fact? Check specifically for steps supported by code-reading rather than observed behavior.',
  },
  {
    key: 'alternative-cause',
    ask: 'Find a DIFFERENT cause that explains the same evidence at least as well. Consider the layers that were unreachable or whose probe died — a blind spot is not an exoneration.',
  },
  {
    key: 'provenance-timeline',
    ask: 'Does the timeline hold? Does the proposed cause predate the symptom onset, and does anything in the evidence (audit_logs, deploy times, unit last-run times, migration timestamps) contradict the ordering? Remember updated_by names the last toucher, not the actor.',
  },
]

const PLAN = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: 'plain-English root cause + fix direction a non-coder can follow, 3-6 sentences' },
    tasks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'imperative, <= 80 chars, prefixed with the owning app, e.g. "CCG: reload on vite:preloadError"' },
          description: { type: 'string', description: 'what to change and where (file:line), why, and any traps the evidence surfaced' },
          acceptanceCriteria: { type: 'array', items: { type: 'string' }, description: 'checkable conditions — a command that goes red→green, a row/log that changes, a UI state — never "works correctly"' },
          app: { type: 'string', description: 'apps/<name> or packages/<name> that owns the change' },
          kind: { type: 'string', enum: ['fix', 'verify', 'observability', 'follow-up'] },
          blockedByTaskIndex: { type: 'array', items: { type: 'integer' }, description: '0-based indexes of tasks in this list that must land first' },
        },
        required: ['title', 'description', 'acceptanceCriteria', 'app', 'kind'],
      },
    },
  },
  required: ['summary', 'tasks'],
}

const REPORT = {
  type: 'object',
  properties: {
    commentPosted: { type: 'boolean' },
    commentError: { type: 'string' },
    subIssues: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          identifier: { type: 'string' },
          title: { type: 'string' },
          url: { type: 'string' },
          preexisting: { type: 'boolean', description: 'true if an equivalent sub-issue already existed and was reused instead of created' },
        },
        required: ['identifier', 'title'],
      },
    },
    verifyChecklistAdded: { type: 'boolean', description: 'true if verify tasks were written into the parent description' },
    errors: { type: 'array', items: { type: 'string' } },
  },
  required: ['commentPosted', 'subIssues'],
}

// ---------------------------------------------------------------------------
// Single-investigation lane. All existing logic lives here; `tag` prefixes
// agent labels and phases so concurrent lanes don't collide in the progress
// tree. For legacy single-ticket mode, pass tag: '' to preserve exact labels.
// ---------------------------------------------------------------------------
async function investigateOne({ symptom, ticket, tag }) {
  // Route before probing. Four full probes on a symptom that is plainly one layer's is
  // most of this workflow's cost. The router is cheap and deliberately timid: it drops a
  // layer only on a concrete negative signal, and ANY failure mode (dead agent, empty or
  // over-eager answer) falls back to probing everything.
  const route = await agent(
    `A symptom is about to be investigated across four independent layers of the twd fleet.
Decide which layers could plausibly be IN ITS EXECUTION PATH. You are not diagnosing anything.

SYMPTOM:
${symptom}

THE LAYERS:
${LAYERS.map((l) => `- ${l.key}: ${l.brief.split('\n')[0]}`).join('\n')}

Keep a layer whenever it could plausibly carry the cause. Drop one ONLY when you can name a
concrete negative signal that puts it outside the execution path — "seems unlikely" is not a
signal, and a hunch about which layer is guilty is not a signal. This fleet's recurring causes
are cross-layer (a stale deploy serving old code, a dead systemd timer, an RPC dropped by a
migration), so when in doubt, KEEP the layer. Dropping a guilty layer hides the bug; keeping an
innocent one only costs a probe.`,
    { label: `${tag}route`, phase: `${tag}Route`, schema: ROUTE, model: 'sonnet', effort: 'low' },
  )

  const routed = route && Array.isArray(route.layers) ? route.layers : []
  const keep = new Set([...routed, ...ALWAYS_PROBE])
  // Fall back to the full sweep if the router died or pruned hard enough to look broken.
  const probeLayers = keep.size >= 2 ? LAYERS.filter((l) => keep.has(l.key)) : LAYERS
  const skipped = LAYERS.filter((l) => !probeLayers.includes(l)).map((l) => l.key)

  if (!route) log(`${tag}Router died — falling back to all ${LAYERS.length} layers`)
  else if (skipped.length) log(`${tag}Skipping ${skipped.join(', ')} — ${(route.dropped || []).map((d) => `${d.layer}: ${d.why}`).join(' | ') || 'no reason given'}`)

  log(`${tag}Probing ${probeLayers.length} layer(s) in parallel for: ${symptom}`)

  // Barrier is correct here: synthesis needs every layer's evidence at once, and the
  // zero-evidence early exit below can only be decided after all probes report.
  const probes = await parallel(
    probeLayers.map((layer) => () =>
      agent(
        `${READ_ONLY}

SYMPTOM UNDER INVESTIGATION:
${symptom}

YOUR LAYER:
${layer.brief}

Gather evidence about THIS layer only. Report what you actually observed — including findings that RULE OUT
your layer (relevance: "ruled-out"), which are just as valuable as incriminating ones. Do not speculate about
other layers; other agents cover them.`,
        { label: `${tag}probe:${layer.key}`, phase: `${tag}Probe`, schema: FINDINGS, agentType: layer.agentType, model: layer.model },
      ),
    ),
  )

  // Reduce in plain code. Counting inputs against expectations is the guard against a dead
  // node silently vanishing from the report.
  const byLayer = probeLayers.map((layer, i) => ({ layer: layer.key, result: probes[i] }))
  const dead = byLayer.filter((x) => !x.result).map((x) => x.layer)
  const unreachable = byLayer
    .filter((x) => x.result && !x.result.reachable)
    .map((x) => `${x.layer}: ${x.result.unreachableReason || 'no reason given'}`)
  const evidence = byLayer
    .filter((x) => x.result && x.result.reachable)
    .flatMap((x) => (x.result.findings || []).map((f) => ({ layer: x.layer, ...f })))

  if (dead.length) log(`${tag}WARNING: ${dead.length}/${probeLayers.length} probes died and contributed nothing: ${dead.join(', ')}`)
  if (unreachable.length) log(`${tag}Layers not in the execution path or unreachable: ${unreachable.join(' | ')}`)

  const live = evidence.filter((f) => f.relevance !== 'ruled-out')
  log(`${tag}${evidence.length} findings total, ${live.length} implicating (${evidence.length - live.length} ruled out)`)

  if (!live.length) {
    return {
      rootCause: null,
      note: 'No implicating evidence found in any reachable layer. Every probed layer either ruled itself out or was unreachable — widen the symptom description or name the layer that was not covered.',
      ruledOut: evidence,
      unreachable,
      deadProbes: dead,
      skippedLayers: skipped,
    }
  }

  const diagnosis = await agent(
    `${READ_ONLY}

SYMPTOM:
${symptom}

POOLED EVIDENCE from independent layer probes (each finding carries the command/query that produced it):
${JSON.stringify(live, null, 2)}

RULED OUT by the probes:
${JSON.stringify(evidence.filter((f) => f.relevance === 'ruled-out'), null, 2)}

${unreachable.length ? `NOT COVERED — conclusions touching these layers stay provisional:\n${unreachable.join('\n')}\n` : ''}
${dead.length ? `PROBES THAT DIED (blind spots, not clean layers): ${dead.join(', ')}\n` : ''}
${skipped.length ? `NOT PROBED — routed out of the execution path before the sweep. These are UNEXAMINED, not exonerated; a diagnosis that would change if one of them were guilty is not high confidence: ${skipped.join(', ')}\n` : ''}
Name ONE root cause and the causal chain from it to the observed symptom. Ground every step in a specific
piece of the evidence above — if a step has no evidence behind it, put it in "unexplained" instead of
asserting it. Then give the single read-only check that would most cheaply confirm or kill your diagnosis.`,
    { label: `${tag}synthesize`, phase: `${tag}Synthesize`, schema: ROOT_CAUSE, effort: 'high' },
  )

  // Three hostile skeptics are the expensive half of this workflow. Spend them when the
  // diagnosis has room to be wrong: anything short of high confidence, anything left
  // unexplained, or any layer we did not actually see (dead probe, unreachable, routed out).
  // A high-confidence diagnosis over full coverage with nothing unexplained is already
  // forced by the evidence — refuting it buys nothing.
  const blindSpots = [...dead, ...skipped, ...unreachable.map((u) => u.split(':')[0])]
  const refuteReasons = [
    diagnosis.confidence !== 'high' && `confidence is ${diagnosis.confidence}`,
    (diagnosis.unexplained || []).length && `${diagnosis.unexplained.length} unexplained observation(s)`,
    blindSpots.length && `blind spots: ${[...new Set(blindSpots)].join(', ')}`,
  ].filter(Boolean)

  const votes = !refuteReasons.length
    ? []
    : (
    await parallel(
      LENSES.map((lens) => () =>
        agent(
          `You are a skeptic with NO prior involvement in this diagnosis. Your job is to REFUTE it, not to agree.

SYMPTOM:
${symptom}

PROPOSED DIAGNOSIS:
${JSON.stringify(diagnosis, null, 2)}

EVIDENCE THE DIAGNOSIS WAS BUILT FROM:
${JSON.stringify(live, null, 2)}

YOUR LENS: ${lens.ask}

${READ_ONLY}
You may run your own read-only checks to test the claim — do not take the evidence above on trust.
Default to refuted=true when uncertain. A diagnosis that cannot survive a hostile read should not survive.`,
          { label: `${tag}refute:${lens.key}`, phase: `${tag}Refute`, schema: VERDICT, agentType: 'general-purpose', model: 'sonnet', effort: 'medium' },
        ),
      ),
    )
  ).filter(Boolean)

  const refutedCount = votes.filter((v) => v.refuted).length
  // Unrefuted BY CONSTRUCTION when the gate skipped the panel — never silently, always logged.
  const survives = !refuteReasons.length || (votes.length >= 2 && refutedCount < votes.length / 2)

  if (!refuteReasons.length) {
    log(`${tag}Refutation SKIPPED — high confidence, every layer covered, nothing unexplained. Diagnosis stands unchallenged.`)
  } else {
    log(`${tag}Refuting (${refuteReasons.join('; ')}): ${refutedCount}/${votes.length} skeptics refuted — diagnosis ${survives ? 'SURVIVES' : 'DOES NOT SURVIVE'}`)
  }

  // ---------------------------------------------------------------------------
  // Plan + Report: turn the surviving diagnosis into a task list and write it to
  // the Linear ticket. Skipped when no ticket was named — the diagnosis is still
  // returned so the caller can post it by hand.
  // ---------------------------------------------------------------------------
  const skepticNotes = votes.length
    ? votes.map((v) => [v.reason, v.alternative].filter(Boolean).join('\nALTERNATIVE: ')).join('\n---\n')
    : 'No skeptics were run: the diagnosis came back high-confidence with every layer covered and nothing unexplained, so the refutation panel was gated off. It is UNCHALLENGED, not vindicated — weigh it on its own evidence.'
  const refutationLine = refuteReasons.length
    ? `${survives ? 'survived' : 'DID NOT survive'} adversarial refutation, ${refutedCount}/${votes.length} skeptics refuted it`
    : 'NOT adversarially refuted — the panel was gated off as high-confidence with full coverage'

  let plan = null
  let report = null

  if (!ticket) {
    log(`${tag}No Linear ticket identifier found in args — skipping Plan/Report (pass args: {symptom, ticket: "DEV-123"} to enable)`)
  } else {
    plan = await agent(
      `${READ_ONLY}
You are planning the fix, not applying it. Do not edit files, do not write anywhere.

SYMPTOM (Linear ${ticket}):
${symptom}

DIAGNOSIS (${refutationLine}):
${JSON.stringify(diagnosis, null, 2)}

SKEPTIC NOTES — these often contain the sharpest fix guidance (scoping corrections, traps, "the fix belongs at layer X"):
${skepticNotes}

Produce the MINIMAL set of tasks that resolves the ticket. Rules (these are the repo's CLAUDE.md, restated):
- One task = one PR-sized unit of work inside one app or shared package. Name the owning app.
- Every task carries CHECKABLE acceptance criteria: a test/command that goes red before and green after, a specific
  row/log/status that changes, a specific UI behaviour. "Works correctly" is not a criterion.
- Simplicity first: no speculative tasks, no refactors of adjacent code, no "while we're here". If the skeptics
  narrowed or widened the scope with evidence, follow the evidence.
- If the diagnosis did NOT survive, the first task is the confirming check that settles it; do not plan a fix on
  a refuted diagnosis.
- Include a 'verify' task only when proof needs something the fix PR can't carry (post-deploy check, prod row).
- Sibling tickets that share the same cause should get ONE shared task here that names both, not duplicates.
- Note the correct test harness for the app (e.g. CS uses node --test .mjs, Vite apps use vitest) when you name a command.
- Write the summary so a non-coder can follow it.`,
      { label: `${tag}plan`, phase: `${tag}Plan`, schema: PLAN, effort: 'high' },
    )

    if (!plan) {
      log(`${tag}Plan agent returned nothing — skipping Report`)
    } else {
      log(`${tag}Plan: ${plan.tasks.length} task(s) for ${ticket}`)
      report = await agent(
        `You are writing the investigation results to Linear ticket ${ticket}. This is the ONLY system you may write
to. Do not touch files, databases, Vercel, or the VPS.

TOOLS: load them first with ToolSearch "select:mcp__linear__get_issue,mcp__linear__list_issues,mcp__linear__save_comment,mcp__linear__save_issue".

STEP 1 — read the ticket: mcp__linear__get_issue({id: "${ticket}"}) to learn its team, labels, priority, assignee, and project.

STEP 2 — post ONE findings comment with mcp__linear__save_comment({issueId: "${ticket}", body}). Markdown, real
newlines. Structure:
  ## Investigation findings
  **Root cause** — one paragraph.
  **Mechanism** — numbered causal chain.
  **Evidence** — bullet list, each bullet = the command/query/log and what it showed (keep the file:line refs).
  **Refutation** — "N/N skeptics could not refute" + the notable corrections/caveats they raised.
  **Unexplained / caveats** — bullets.
  **Confirming check** — the one read-only check.
  **Plan** — the summary below, then the sub-issue list (identifiers) once created.
Then, if the ticket's own hypothesis was overturned or narrowed, say so plainly at the top ("Ticket hypothesis
was X; evidence shows Y").

STEP 3 — create sub-issues for kind=fix and kind=observability tasks ONLY. Tasks of kind=verify go into the
parent instead (STEP 3b) and kind=follow-up tasks are listed in the comment under "Follow-up candidates" for a
human to triage — do not create issues for them. First mcp__linear__list_issues({parentId: "${ticket}", limit: 50}) and reuse any
existing sub-issue whose title clearly matches a task (report it with preexisting=true) so a re-run never
duplicates. ALSO: if a task names a sibling ticket (e.g. "(DEV-16, DEV-17)" or "shared with DEV-17"), run
mcp__linear__list_issues({parentId: "<sibling>", limit: 50}) too — sibling tickets are often investigated in
parallel, and if the sibling already carries an equivalent sub-issue, do NOT create a second one and do NOT
settle for a relatedTo link — Sean wants strict parent-child trees, never loose "related" tickets. Instead
put every ticket the shared task fixes under ONE umbrella parent:
  (a) mcp__linear__get_issue the sibling: if it already has a parentId whose issue is an umbrella (title
      names the shared defect, not one app's Bugsink issue), reuse that umbrella. Otherwise create one with
      mcp__linear__save_issue({team, title: "<Apps>: <one-line shared defect>", state: "Ready for Agent",
      priority/assignee: the parent's, labels: ["Bug"] only — no single App label since it spans apps,
      description: 2-3 lines naming the defect + fix order}) and re-parent the sibling under it
      (save_issue({id: sibling, parentId: umbrella})).
  (b) re-parent the shared fix sub-issue(s) — and any helper task they are blockedBy — under the umbrella
      (save_issue({id: <fix>, parentId: umbrella})); a symptom ticket must not own the fix for another app.
  (c) re-parent THIS ticket under the umbrella too (save_issue({id: "${ticket}", parentId: umbrella,
      blockedBy: [<fix>]})) so it closes after the fix, and add the same blockedBy on the sibling.
  Report the reused fix issue with preexisting=true and name the umbrella in the comment.
For each remaining task call mcp__linear__save_issue with:
  team: the parent's team, parentId: "${ticket}", title: task.title,
  description: task.description + "\n\n**Acceptance criteria**\n" + criteria as "- [ ] …" checklist
               + "\n\n**Owning app:** " + task.app,
  labels: the parent's App label plus "Bug"/"Improvement" as appropriate — App labels are a single-select group,
          so exactly ONE App label per issue (a task in a different app gets that app's label instead; a task in
          packages/* keeps the parent's), priority: the parent's priority, assignee: the parent's assignee,
  state: "Ready for Agent",
  project: the parent's project if it has one — Linear does NOT inherit project from parentId, so omitting this
           leaves sub-issues out of the parent's project view.
After all are created, wire blockedBy from blockedByTaskIndex using the identifiers you just got
(mcp__linear__save_issue({id: child, blockedBy: [other]})).

STEP 3b — verify tasks become a checklist on the PARENT, not issues: mcp__linear__save_issue({id: "${ticket}",
patch: [{op: "append", text: "\n\n## Verify (post-deploy)\n" + for each verify task: "**<title>** — <one-line
description>\n" + its acceptance criteria as "- [ ] …" lines}]}). If the parent already has a "## Verify
(post-deploy)" section (re-run), replace it instead of appending a second one.

STEP 4 — update the comment (mcp__linear__save_comment({id: <comment id from step 2>, body})) so the Plan
section lists the fix sub-issue identifiers with their titles, notes that verification steps are the checklist
in the ticket description, and lists any follow-up candidates.

DIAGNOSIS:
${JSON.stringify(diagnosis, null, 2)}

REFUTATION (${refutationLine}):
${skepticNotes}

CAVEATS: layers not probed = ${JSON.stringify(skipped)}; unreachable layers = ${JSON.stringify(unreachable)}; dead probes = ${JSON.stringify(dead)}

PLAN:
${JSON.stringify(plan, null, 2)}

Return exactly what you did: commentPosted, every sub-issue identifier/title/url, and any error verbatim.
If a Linear call fails twice, record the error and continue with the rest — never fabricate an identifier.`,
        { label: `${tag}report:${ticket}`, phase: `${tag}Report`, schema: REPORT, agentType: 'general-purpose' },
      )
      if (report) {
        log(`${tag}Report: comment ${report.commentPosted ? 'posted' : 'FAILED'}, ${report.subIssues.length} sub-issue(s) on ${ticket}${report.errors && report.errors.length ? ` — ${report.errors.length} error(s)` : ''}`)
      } else {
        log(`${tag}Report agent returned nothing — nothing was written to Linear`)
      }
    }
  }

  return {
    symptom,
    ticket,
    diagnosis,
    survives,
    votes,
    confirmingCheck: diagnosis.confirmingCheck,
    caveats: {
      skippedLayers: skipped,
      unreachableLayers: unreachable,
      deadProbes: dead,
      unexplained: diagnosis.unexplained || [],
    },
    plan,
    report,
  }
}

// ---------------------------------------------------------------------------
// Dispatcher: parse args into mode and route
// ---------------------------------------------------------------------------
// `/investigate DEV-55` (or `DEV-x DEV-y`, or `all`) arrives as a bare STRING. A string that is only
// ticket keys carries no symptom text — routing it down the legacy path hands the probes the literal
// "DEV-55" as the symptom (2026-08-18: the code-layer probe bailed for exactly that). Normalise those
// strings into the multi/all shapes, which read the ticket bodies first.
const _bareKeys = typeof args === 'string' && /^\s*([A-Za-z][A-Za-z0-9]*-\d+)(\s+[A-Za-z][A-Za-z0-9]*-\d+)*\s*$/.test(args)
const argv = _bareKeys ? { tickets: args.trim().split(/\s+/).map((k) => k.toUpperCase()) }
  : (typeof args === 'string' && args.trim().toLowerCase() === 'all') ? { all: true }
  : args

const isLegacy = typeof argv === 'string' || (argv && typeof argv === 'object' && argv.symptom)
const isMultiExplicit = argv && typeof argv === 'object' && Array.isArray(argv.tickets) && argv.tickets.length > 0
const isAll = argv && typeof argv === 'object' && argv.all === true
const isEmpty = !argv || (typeof argv === 'object' && !argv.symptom && !argv.tickets && !argv.all && !Array.isArray(argv))

if (isLegacy) {
  // --- LEGACY: single symptom, identical to v1 ---
  const symptom = typeof argv === 'string' ? argv : argv.symptom
  if (!symptom) throw new Error('Pass the symptom as args, e.g. args: "IMS matview has been stale since Jul 13"')
  // Linear ticket to report into: explicit {ticket} wins, else the first DEV-123-style identifier in the symptom.
  // The lookbehind keeps Bugsink keys like CUSTOMER-SERVICE-DASHBOARD-2 from matching as "DASHBOARD-2".
  const ticket =
    (argv && typeof argv === 'object' && argv.ticket) ||
    ((symptom.match(/\bLINEAR\s+([A-Z][A-Z0-9]*-\d+)/i) || symptom.match(/(?<![A-Za-z0-9-])([A-Za-z][A-Za-z0-9]*-\d+)\b/) || [])[1] || '').toUpperCase() ||
    null
  return await investigateOne({ symptom, ticket, tag: '' })
}

if (isEmpty) {
  // --- PICKER: list Ready-for-Agent tickets, fan out nothing ---
  const listed = await agent(
    `List all Linear Dev team tickets currently in status "Ready for Agent".

TOOLS: load them first with ToolSearch "select:mcp__linear__list_issues".

Call mcp__linear__list_issues({team: "Dev", state: "Ready for Agent", limit: 50}).

Return each ticket as {identifier, title, priority, age} where age is a human-readable duration since
creation (e.g. "3d", "12h"). Sort by priority (highest first), then by age (oldest first).`,
    {
      label: 'picker:list',
      schema: {
        type: 'object',
        properties: {
          tickets: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                identifier: { type: 'string' },
                title: { type: 'string' },
                priority: { type: 'number' },
                age: { type: 'string', description: 'human-readable age, e.g. "3d" or "12h"' },
              },
              required: ['identifier', 'title'],
            },
          },
        },
        required: ['tickets'],
      },
    },
  )

  return {
    mode: 'picker',
    tickets: listed && listed.tickets ? listed.tickets : [],
    note: 'Re-invoke as /investigate DEV-x DEV-y or /investigate all',
  }
}

if (!isMultiExplicit && !isAll) {
  throw new Error('Unrecognized args format. Pass a symptom string, {symptom, ticket}, {tickets: ["DEV-12", ...]}, {all: true}, or nothing to list available tickets.')
}

// --- MULTI: resolve ticket list, read symptoms, fan out ---
let ticketList

if (isMultiExplicit) {
  ticketList = argv.tickets
} else {
  // {all: true} — discover every Ready-for-Agent ticket
  const listed = await agent(
    `List all Linear Dev team tickets currently in status "Ready for Agent" and return their identifiers.

TOOLS: load them first with ToolSearch "select:mcp__linear__list_issues".

Call mcp__linear__list_issues({team: "Dev", state: "Ready for Agent", limit: 50}).

Return ONLY the array of identifier strings (e.g. ["DEV-12", "DEV-15", ...]).`,
    {
      label: 'multi:list',
      schema: {
        type: 'object',
        properties: {
          identifiers: { type: 'array', items: { type: 'string' } },
        },
        required: ['identifiers'],
      },
    },
  )
  ticketList = listed && listed.identifiers ? listed.identifiers : []
}

if (!ticketList.length) {
  return {
    mode: 'multi',
    count: 0,
    results: [],
    note: 'No tickets found in Ready for Agent.',
  }
}

// Read each ticket to build a concise symptom string
const readResult = await agent(
  `For each of the following Linear ticket identifiers, load the ticket and its latest comments, then produce
a concise problem statement (the "symptom") from the title, description, and comment content.

TOOLS: load them first with ToolSearch "select:mcp__linear__get_issue,mcp__linear__list_comments".

For each ticket, call mcp__linear__get_issue({id: "<identifier>"}) and mcp__linear__list_comments({issueId: "<identifier>", limit: 10}).
Synthesize the symptom as 1-3 sentences: what is broken, where, and any error message or stack trace summary.

TICKETS: ${JSON.stringify(ticketList)}

Return one entry per ticket.`,
  {
    label: 'multi:read',
    schema: {
      type: 'object',
      properties: {
        pairs: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              ticket: { type: 'string' },
              symptom: { type: 'string' },
            },
            required: ['ticket', 'symptom'],
          },
        },
      },
      required: ['pairs'],
    },
  },
)

const resolvedPairs = readResult && readResult.pairs ? readResult.pairs : []
if (!resolvedPairs.length) {
  return {
    mode: 'multi',
    count: 0,
    results: [],
    note: 'Could not read ticket details — no investigations launched.',
  }
}

log(`Investigating ${resolvedPairs.length} ticket(s) in parallel (~${resolvedPairs.length * 5}-${resolvedPairs.length * 10} agents, depending on how each lane routes and whether its diagnosis needs refuting)`)

const results = (
  await parallel(
    resolvedPairs.map((p) => () =>
      investigateOne({ symptom: p.symptom, ticket: p.ticket, tag: `${p.ticket} · ` }),
    ),
  )
).filter(Boolean)

return {
  mode: 'multi',
  count: results.length,
  results,
}
