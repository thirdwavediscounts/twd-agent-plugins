### Autonomous run

"Run until done", "going to bed", `/loop until X`.
1. State the exit predicate before iterating.
2. Wake mechanism: an event to watch → Monitor or a `/loop` heartbeat sized to when a re-check is worth it.
3. Each iteration: smallest evidence-justified change, verify against the predicate, commit if it advanced, discard if not.
4. Mid-run discoveries are yours; out-of-band fixes go in their own PR. Surface only irreversible actions or a real dead end.
5. Checkpoint every iteration via `/show-me-your-work`.
6. Stop only when the predicate holds; never relax it. Standing limits still hold: no push/merge without a per-change go unless the user gave an explicit blanket ("push all four when green").
