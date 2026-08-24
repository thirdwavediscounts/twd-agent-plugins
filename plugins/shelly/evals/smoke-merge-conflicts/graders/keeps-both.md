---
type: regex
pattern: "Math\\.round[\\s\\S]*currency|currency[\\s\\S]*Math\\.round"
flags: i
match: contains
target: last_message
---
Keeps both the rounding and the currency param.
