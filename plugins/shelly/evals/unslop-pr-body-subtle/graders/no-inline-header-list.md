---
type: regex
pattern: "\\*\\*(Root Cause|Performance|Testing)\\s*:?\\*\\*\\s*:?"
flags: i
match: not_contains
target: last_message
---
No bold-label-colon lines that restate themselves.
