---
type: regex
pattern: "^\\W*T3\\W*\\|\\s*Ready for Human\\s*\\|\\s*4\\b"
flags: im
match: contains
target: last_message
---
Feature request in Triage → Ready for Human (greenfield track), Low.
