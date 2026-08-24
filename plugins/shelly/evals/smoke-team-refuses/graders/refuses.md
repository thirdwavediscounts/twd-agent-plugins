---
type: regex
pattern: "(one|single|exactly one) parent|which (one|parent|ticket)|pick one"
flags: i
match: contains
target: last_message
---
Refuses two parents.
