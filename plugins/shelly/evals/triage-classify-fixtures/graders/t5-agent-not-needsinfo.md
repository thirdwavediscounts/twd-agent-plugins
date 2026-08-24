---
type: regex
pattern: "^\\W*T5\\W*\\|\\s*Ready for Agent\\s*\\|\\s*[23]\\b"
flags: im
match: contains
target: last_message
---
Unclear cause from a minified trace still goes to Ready for Agent (investigate deep-dives), never Needs Info.
