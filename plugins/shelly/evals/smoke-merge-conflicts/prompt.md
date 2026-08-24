---
name: smoke-merge-conflicts
tags: [smoke, resolving-merge-conflicts]
runs: 1
max_turns: 3
timeout_seconds: 150
allowed_tools: []
---
/shelly:resolving-merge-conflicts

No tools this session. Resolve this hunk from `apps/ccg/src/price.ts`; the merge goal is to keep main's rounding fix AND our new currency parameter. Output the resolved code only.

```ts
<<<<<<< HEAD
export function formatPrice(cents: number) {
  return (Math.round(cents) / 100).toFixed(2);
}
=======
export function formatPrice(cents: number, currency = 'USD') {
  return `${currency} ${(cents / 100).toFixed(2)}`;
}
>>>>>>> sean/currency-param
```
