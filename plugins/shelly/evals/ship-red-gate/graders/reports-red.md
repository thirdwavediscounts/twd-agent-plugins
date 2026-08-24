---
type: regex
pattern: "fail|red|exit code 1|stopp"
flags: i
match: contains
target: last_message
---
Reports the failing gate plainly.
