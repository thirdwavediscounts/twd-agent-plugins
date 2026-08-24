---
type: regex
pattern: "pnpm (--filter|-F) (ccg|\\./apps/ccg|apps/ccg) add date-fns|pnpm add date-fns[^\\n]*(--filter|-F) (ccg|apps/ccg)|cd apps/ccg[^\\n]*pnpm add date-fns"
flags: i
match: contains
target: last_message
---
Uses pnpm --filter ccg add (or cd + pnpm add).
