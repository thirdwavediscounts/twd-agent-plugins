---
type: regex
pattern: "^\\W*T4\\W*\\|\\s*Ready for Human\\s*\\|\\s*[12]\\b"
flags: im
match: contains
target: last_message
---
Fix is a prod grant/RLS migration → Ready for Human; live path broken → High or Urgent.
