---
type: regex
pattern: "apps/argus-console/docs/[a-z0-9./_-]+\\.md"
flags: i
match: contains
target: last_message
---
Places the file under apps/argus-console/docs/.
