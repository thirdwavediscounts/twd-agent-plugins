---
type: regex
pattern: "node@?24|node 24|node v?24"
flags: i
match: contains
target: last_message
---
Points at Node 24 / the Node 26 jsdom break.
