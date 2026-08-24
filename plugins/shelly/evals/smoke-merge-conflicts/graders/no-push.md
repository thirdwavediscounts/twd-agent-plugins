---
type: regex
pattern: "git push"
flags: i
match: not_contains
target: last_message
---
Does not push.
