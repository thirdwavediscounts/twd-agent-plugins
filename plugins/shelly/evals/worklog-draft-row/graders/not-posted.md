---
type: regex
pattern: "(row|entry) (has been |was |is )?(posted|appended|added|logged) (to|in)"
flags: i
match: not_contains
target: last_message
---
Does not claim the row was posted.
