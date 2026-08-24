---
type: regex
pattern: "spawn|dispatch|teammate.*(started|launched)"
flags: i
match: not_contains
target: last_message
---
Dispatches nothing.
