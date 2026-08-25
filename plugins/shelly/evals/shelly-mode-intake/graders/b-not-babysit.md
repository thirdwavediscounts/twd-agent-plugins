---
type: llm
criteria: "The route the answer PICKS for DEV-202 must not be babysitting the PR. Naming babysit only to rule it out ('not babysit — the PR is already merged', 'rather than babysitting') is the correct answer and PASSES. FAIL only if the answer actually routes DEV-202 to babysit-pr / says it would watch or babysit that PR, or gives no route for DEV-202 at all."
---
B must NOT route to babysit (PR already merged). Judged rather than
pattern-matched: the previous regex banned the substring `babysit` within 300
characters of `DEV-202`, so a correct refusal failed for naming what it was
declining.
