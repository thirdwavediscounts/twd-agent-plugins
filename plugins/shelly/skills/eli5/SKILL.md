---
name: eli5
description: Explain a topic like I'm five — a dead-simple picture explainer as an HTML artifact, big pictures and few words. Use when Sean types /eli5 <topic> or asks for a visual, jargon-free explanation of how something works.
---

# eli5

Explain like I'm someone who knows nothing about this topic, using an HTML artifact with big pictures and few words. Assume zero prior knowledge. Pictures (inline SVG, diagrams, big icons) carry the explanation; text is a supporting caption, not a paragraph.

Two steps before you write the artifact:

1. **Get the facts right first.** If the topic is a real system in this fleet (an app, a worker, a DB flow), read the ground truth — the calc/spec doc, the code, the DB — before simplifying. An ELI5 that's simple and wrong is worse than no ELI5. Simplify what's true; don't invent a clean story.
2. **Load `artifact-design`** before writing the HTML, as every artifact requires. ELI5 is a real design job: one deliberate palette and type pairing drawn from the subject's world, both themes, no templated look.

Then build one self-contained HTML artifact and publish it.

Topic: $ARGUMENTS
