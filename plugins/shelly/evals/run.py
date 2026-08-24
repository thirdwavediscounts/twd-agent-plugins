#!/usr/bin/env python3
"""Minimal stand-in for `claude plugin eval` (early-access gated).
Reads evals/<case>/prompt.md (+ graders/*.md, regex type only), runs `claude -p`
with the plugin, scores each run, prints a table. Same layout as the official
tool so cases migrate unchanged. Usage: evals/run.py [case-glob] [--runs N]"""
import glob, json, os, re, subprocess, sys, yaml
HERE = os.path.dirname(os.path.abspath(__file__)); PLUGIN = os.path.dirname(HERE)
def fm(path):
    t = open(path).read(); m = re.match(r"---\n(.*?)\n---\n?(.*)", t, re.S)
    return (yaml.safe_load(m.group(1)) or {}, m.group(2).strip()) if m else ({}, t)
pat = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith("--") else "*"
runs_override = int(sys.argv[sys.argv.index("--runs") + 1]) if "--runs" in sys.argv else None
total_fail = 0
for case in sorted(glob.glob(f"{HERE}/{pat}/prompt.md")):
    meta, prompt = fm(case); cdir = os.path.dirname(case); name = meta.get("name", os.path.basename(cdir))
    graders = [(os.path.basename(g)[:-3], *fm(g)) for g in sorted(glob.glob(f"{cdir}/graders/*.md"))]
    runs = runs_override or meta.get("runs", 3); scores = []
    for i in range(runs):
        cmd = ["claude", "-p", prompt, "--plugin-dir", PLUGIN, "--output-format", "json",
               "--max-turns", str(meta.get("max_turns", 10)), "--allowedTools", ",".join(meta.get("allowed_tools", []))]
        if meta.get("model"): cmd += ["--model", meta["model"]]
        out = subprocess.run(cmd, capture_output=True, text=True, timeout=meta.get("timeout_seconds", 300)).stdout
        try: res = json.loads(out); text = res.get("result", ""); cost = res.get("total_cost_usd", 0)
        except json.JSONDecodeError: text, cost = out, 0
        verdicts = {}
        for gname, g, _ in graders:
            if g.get("type") != "regex": verdicts[gname] = None; continue
            fl = g.get("flags", ""); hit = re.search(g["pattern"], text, (re.I if "i" in fl else 0) | (re.M if "m" in fl else 0)) is not None
            verdicts[gname] = hit if g.get("match", "contains") == "contains" else not hit
        passed = [v for v in verdicts.values() if v is not None]; score = sum(passed) / len(passed) if passed else 0
        scores.append(score); total_fail += score < 1
        print(f"{name} run {i+1}: {score:.2f}  ${cost:.3f}  " + " ".join(f"{k}={'✓' if v else '✗' if v is not None else '?'}" for k, v in verdicts.items()))
        if score < 1: print("   output:", text.replace("\n", " ")[:300])
    print(f"== {name}: mean {sum(scores)/len(scores):.2f} over {runs} runs")
sys.exit(1 if total_fail else 0)
