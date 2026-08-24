### Refactoring

Behavior unchanged, structure changes.
1. Pin the contract: `/how`, then a characterization test or equivalence harness before anything moves; typecheck is not a pin.
2. Name the missing structure (model the domain).
3. Name the target shape; crosses a boundary → `/architect`.
4. Subtract first: dead weight, one-caller wrappers, orphans.
5. Small steps, pin stays green; migrate every caller and delete the old API in one wave; spot-check renames in strings and prose.
6. Prove equivalence on the real artifact.
7. Reader load must drop or the diff reverts.
8. Ordered commits; PR. Reply: what changed, the pin, the proof, the reader-load delta, what reverted.
