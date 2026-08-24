---
type: regex
pattern: "turbo-ignore[^\\n]*(remove|drop|never|deprecated|don.t|do not|must not|reject|shouldn.t)|(remove|drop|never|deprecated|don.t|do not|must not|reject)[^\\n]*turbo-ignore"
flags: i
match: contains
target: last_message
---
Says the ignoreCommand must come out.
