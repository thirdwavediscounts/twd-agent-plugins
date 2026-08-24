---
type: regex
pattern: "root[^\\n]*(rebuild|all 12|fleet)|(rebuild|all 12|fleet)[^\\n]*root"
flags: i
match: contains
target: last_message
---
Names the root-level fleet-rebuild rule.
