---
type: regex
pattern: "pnpm-lock\\.yaml"
flags: i
match: contains
target: last_message
---
Names the lockfile as an expected change.
