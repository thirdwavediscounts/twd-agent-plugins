---
type: regex
pattern: "^#+ .*\\b[A-Z][a-z]+ [A-Z][a-z]+ [A-Z][a-z]+"
flags: m
match: not_contains
target: last_message
---
Headings use sentence case.
