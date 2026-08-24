---
type: regex
pattern: "packages/guidelines[^\\n]*(all 12|every project|fleet|all twelve)|(all 12|every project|fleet|all twelve)[^\\n]*packages/guidelines"
flags: i
match: contains
target: last_message
---
packages/* → all 12 projects rebuild.
