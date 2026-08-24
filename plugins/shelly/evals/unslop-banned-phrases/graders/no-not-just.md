---
type: regex
pattern: "not just .{1,60}(but|—)"
flags: i
match: not_contains
target: last_message
---
No "not just X but Y" construction.
