---
type: regex
pattern: "^\\W*T1\\W*\\|\\s*Ready for Agent\\s*\\|\\s*1\\b"
flags: im
match: contains
target: last_message
---
Recurring data-wrong picking bug in one app → Ready for Agent, Urgent.
