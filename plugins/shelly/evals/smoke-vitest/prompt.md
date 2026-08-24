---
name: smoke-vitest
tags: [smoke, vitest]
runs: 1
max_turns: 3
timeout_seconds: 150
allowed_tools: []
---
/shelly:vitest

A warehouse-mobile-app test is red on CI with `TypeError: Cannot read properties of undefined (reading 'clear')` at `window.localStorage.clear()` in the test setup file, and green on my laptop. CI's runner image just moved to Node 26. No tools this session — what is it and what do I do?
