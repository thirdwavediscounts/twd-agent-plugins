---
type: regex
pattern: "^(here|sure|i've|i have|below)"
flags: i
match: not_contains
target: last_message
---
Outputs the text only, no chatbot preamble.
