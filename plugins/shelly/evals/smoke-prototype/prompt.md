---
name: smoke-prototype
tags: [smoke, prototype]
runs: 1
max_turns: 3
timeout_seconds: 150
allowed_tools: []
---
/shelly:prototype

No tools this session. I want to sanity-check whether this state model for warehouse returns feels right: received → inspected → (relisted | refunded | scrapped), with 'inspected' allowed to loop back to 'received' once. Which prototype branch applies and what would you build?
