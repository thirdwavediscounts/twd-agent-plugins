#!/usr/bin/env python3
"""Stand-in for `claude plugin eval` (early-access gated). Same layout:
evals/<case>/prompt.md (+ case.yaml context.scaffold_script) + graders/*.md.
Graders: regex, tool_used, tool_order, llm. Usage: evals/run.py [case-glob] [--runs N] [--baseline]
--baseline runs the no-plugin arm (skill invocation stripped, plugin disabled)."""
import glob, json, os, re, subprocess, sys, tempfile, shutil, yaml
HERE = os.path.dirname(os.path.abspath(__file__)); PLUGIN = os.path.dirname(HERE)
PLUGIN_NAME = json.load(open(f"{PLUGIN}/.claude-plugin/plugin.json"))["name"]
def fm(path):
    t = open(path).read(); m = re.match(r"---\n(.*?)\n---\n?(.*)", t, re.S)
    return (yaml.safe_load(m.group(1)) or {}, m.group(2).strip()) if m else ({}, t)
def flags(g): f = g.get("flags", "") or ""; return (re.I if "i" in f else 0) | (re.M if "m" in f else 0)
def run_claude(prompt, meta, cwd, baseline):
    cmd = ["claude", "-p", prompt, "--output-format", "stream-json", "--verbose",
           "--max-turns", str(meta.get("max_turns", 10)), "--allowedTools", ",".join(meta.get("allowed_tools", []))]
    if meta.get("permission_mode"): cmd += ["--permission-mode", meta["permission_mode"]]
    if meta.get("model"): cmd += ["--model", meta["model"]]
    if baseline: cmd += ["--settings", json.dumps({"enabledPlugins": {f"{PLUGIN_NAME}@twd": False}})]
    else: cmd += ["--plugin-dir", PLUGIN]
    out = subprocess.run(cmd, capture_output=True, text=True, timeout=meta.get("timeout_seconds", 300), cwd=cwd).stdout
    tools, text, cost = [], "", 0.0
    for line in out.splitlines():
        try: ev = json.loads(line)
        except json.JSONDecodeError: continue
        if ev.get("type") == "assistant":
            for b in ev.get("message", {}).get("content", []):
                if b.get("type") == "tool_use": tools.append((b["name"], json.dumps(b.get("input", {}))))
        elif ev.get("type") == "result": text, cost = ev.get("result", ""), ev.get("total_cost_usd", 0) or 0
    return text, tools, cost
def grade(g, text, tools, cwd):
    t = g.get("type")
    if t == "regex":
        hit = re.search(g["pattern"], text, flags(g)) is not None
        return hit if g.get("match", "contains") == "contains" else not hit
    if t == "tool_used":
        n = sum(1 for name, inp in tools if name == g["tool"] and re.search(g.get("input_match", ""), inp, re.S))
        return g.get("min", 0 if g.get("max") == 0 else 1) <= n <= g.get("max", 10**6)
    if t == "tool_order":
        idx = lambda pat: [i for i, (_, inp) in enumerate(tools) if re.search(pat, inp, re.S)]
        b, a = idx(g["before"]), idx(g["after"])
        return bool(b) and bool(a) and min(b) < max(a) and (not g.get("strict") or max(b) < min(a))
    if t == "llm":
        judge = subprocess.run(["claude", "-p", f"You are a strict grader. Criteria: {g['criteria']}\n\nTask the agent was given (facts in it count as known to the agent):\n<<<\n{PROMPT_TEXT[:3000]}\n>>>\n\nAgent output:\n<<<\n{text[:6000]}\n>>>\nAnswer with exactly PASS or FAIL on the first line, then one sentence why.",
                                "--model", g.get("model", "haiku"), "--allowedTools", "", "--output-format", "text"], capture_output=True, text=True, timeout=120).stdout.strip()
        REASONS.append((judge.upper().startswith("PASS"), judge.split("\n",1)[-1].strip()[:200]))
        return judge.upper().startswith("PASS")
    return None
REASONS = []; PROMPT_TEXT = ""
args = sys.argv[1:]; baseline = "--baseline" in args
DUMP = os.environ.get("EVAL_DUMP"); DUMP and os.makedirs(DUMP, exist_ok=True)
runs_override = int(args[args.index("--runs") + 1]) if "--runs" in args else None
pat = next((a for a in args if not a.startswith("--") and not a.isdigit()), "*")
total_fail = 0
for case in sorted(glob.glob(f"{HERE}/{pat}/prompt.md")):
    meta, prompt = fm(case); cdir = os.path.dirname(case); name = meta.get("name", os.path.basename(cdir))
    cy = yaml.safe_load(open(f"{cdir}/case.yaml")) if os.path.exists(f"{cdir}/case.yaml") else {}
    scaffold = (cy.get("context") or {}).get("scaffold_script")
    if baseline:
        prompt = re.sub(rf"/{PLUGIN_NAME}:([a-z-]+)\b", lambda m: (cy.get("baseline_prompt") or {}).get(m.group(1), ""), prompt).strip()
    graders = [(os.path.basename(g)[:-3], *fm(g)) for g in sorted(glob.glob(f"{cdir}/graders/*.md"))]
    runs = runs_override or meta.get("runs", 3); scores = []
    for i in range(runs):
        cwd = None
        if scaffold:
            cwd = tempfile.mkdtemp(prefix="eval-"); subprocess.run(["bash", os.path.join(cdir, scaffold)], cwd=cwd, check=True, capture_output=True)
            if os.path.isdir(f"{cwd}/repo"): cwd = f"{cwd}/repo"
        text, tools, cost = run_claude(prompt, meta, cwd, baseline)
        REASONS.clear(); PROMPT_TEXT = prompt; verdicts = {gname: grade(g, text, tools, cwd) for gname, g, _ in graders}
        if DUMP: open(f"{DUMP}/{name}{'-baseline' if baseline else ''}-run{i+1}.md", "w").write(text)
        passed = [v for v in verdicts.values() if v is not None]; score = sum(passed) / len(passed) if passed else 0
        scores.append(score); total_fail += score < 1
        print(f"{name}{' [baseline]' if baseline else ''} run {i+1}: {score:.2f}  ${cost:.3f}  {len(tools)} tool calls  " + " ".join(f"{k}={'✓' if v else '✗' if v is not None else '?'}" for k, v in verdicts.items()))
        if score < 1:
            print("   output:", text.replace("\n", " ")[:300])
            for n, inp in tools[:6]: print("   tool:", n, inp.replace("\n", " ")[:220])
            for ok, why in REASONS:
                if not ok: print("   judge:", why)
        if cwd and "--keep-temp" not in args: shutil.rmtree(os.path.dirname(cwd) if cwd.endswith("/repo") else cwd, ignore_errors=True)
    print(f"== {name}{' [baseline]' if baseline else ''}: mean {sum(scores)/len(scores):.2f} over {runs} runs")
sys.exit(1 if total_fail else 0)
