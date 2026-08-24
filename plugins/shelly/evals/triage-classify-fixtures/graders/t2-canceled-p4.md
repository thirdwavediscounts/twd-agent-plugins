---
type: regex
pattern: "^\\W*T2\\W*\\|\\s*Canceled\\s*\\|\\s*4\\b"
flags: im
match: contains
target: last_message
---
One-off transient ECONNRESET 12 days ago → noise → Canceled, Low.
