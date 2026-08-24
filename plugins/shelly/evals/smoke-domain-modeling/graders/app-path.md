---
type: regex
pattern: "apps/product-research/(CONTEXT\\.md|docs/)"
flags: i
match: contains
target: last_message
---
Puts the files inside apps/product-research.
