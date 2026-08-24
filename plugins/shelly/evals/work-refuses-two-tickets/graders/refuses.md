---
type: regex
pattern: "(one|single|exactly one) ticket|which (one|ticket)|pick one|one at a time"
flags: i
match: contains
target: last_message
---
Refuses two tickets and asks which.
