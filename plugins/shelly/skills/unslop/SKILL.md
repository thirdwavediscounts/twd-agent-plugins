---
name: unslop
description: Cut AI tells from any writing that leaves the session — docs, specs, tickets, PR descriptions, Linear comments, artifacts, README/CLAUDE.md edits. Always apply before publishing prose; also use on request ("unslop this") for any existing text.
---

# Unslop

Edit text to remove AI patterns and keep a human voice. Adapted from pstack's unslop for how we work.

## Scope

- **Always** on prose that leaves the session: specs, tickets, Linear comments, PR titles/bodies, commit messages, docs, artifacts, README/CLAUDE.md/skill edits.
- Terminal replies to Sean follow his reporting style first (extremely concise, grammar optional) — unslop's *pattern bans* still apply there, but don't "add soul" to a status report.
- Code comments: the repo's comment rules win; unslop only strips the tells (bold labels, emoji, filler).

## Process

1. Scan for the patterns below.
2. Rewrite. Preserve meaning, match intended tone.
3. For docs/long-form only: add soul (next section).
4. Self-audit: "What makes this obviously AI generated?" Fix remaining tells.

## Adding soul (docs and long-form only)

Removing patterns is half the job. Sterile, voiceless writing is just as obvious.

- **Have opinions.** React to facts instead of neutrally listing pros and cons.
- **Vary rhythm.** Short sentences. Then longer ones that take their time.
- **Acknowledge complexity.** "Impressive but also kind of unsettling" beats "impressive."
- **Use "I" when it fits.** First person isn't unprofessional.
- **Let some mess in.** Perfect structure looks machine-made.
- **Be specific.** Not "this is concerning" but the concrete thing that concerns you.

## Patterns to detect and fix

### Content

1. **Puffery.** "pivotal moment", "testament to", "evolving landscape", "setting the stage for". Cut it, state what happened.
2. **Superficial -ing phrases.** "highlighting...", "ensuring...", "reflecting...", "showcasing...", "fostering...". Delete or expand with real facts.
3. **Promotional language.** "vibrant", "groundbreaking", "renowned", "stunning", "seamless", "robust". Use neutral descriptions.
4. **Vague attributions.** "Experts believe", "Industry reports suggest". Name the source or delete.
5. **Formulaic challenges.** "Despite challenges... continues to thrive." Replace with specific facts.

### Language

6. **AI vocabulary.** Additionally, crucial, delve, enduring, enhance, fostering, garner, interplay, intricate, landscape (abstract), pivotal, showcase, tapestry, testament, underscore, vibrant. Replace with plain words.
7. **Fancy ways to say "is".** "serves as", "stands as", "boasts", "features". Just say "is" or "has".
8. **"Not just X, but Y."** State the point directly.
9. **Rule of three.** Forcing ideas into groups of three. Use the natural number.
10. **Synonym cycling.** Pick one word for a thing and repeat it.
11. **False ranges.** "from X to Y" where X and Y aren't on a meaningful scale. List the topics directly.

### Style

12. **Em dash overuse.** Prefer periods and commas. If a thought needs separation, end the sentence. (In terminal replies a rare em dash is fine; in published docs, avoid them.)
13. **Colon overuse.** Fine before a list or example. Not as a mid-sentence connector.
14. **Boldface overuse.** Don't bold every proper noun or acronym.
15. **Inline-header lists.** The tell is a bold label and colon that restates the line: "**Performance:** Performance improved...". Convert to prose. A bold lead-in followed by genuinely new detail is fine.
16. **Title Case Headings.** Use sentence case.
17. **Decorative emojis.** Remove from headings and bullets. (Exception: the ❓/➡️ markers in the grilling question format — those are functional.)
18. **Curly quotes.** Replace with straight quotes.

### Communication artifacts

19. **Chatbot phrases.** "I hope this helps!", "Let me know if...", "Of course!", "Found the smoking gun!" Remove.
20. **Sycophancy.** "Great question! You're absolutely right!" Respond directly.
21. **Cutoff disclaimers.** "While specific details are limited..." Find the fact or remove.

### Filler

22. **Filler phrases.** "In order to" → "To". "Due to the fact that" → "Because". "It is important to note that" → delete.
23. **Excessive hedging.** "could potentially possibly" → "may".
24. **Generic conclusions.** "The future looks bright." State specific plans or facts.

### Jargon

25. **Abstract metaphor nouns.** Substrate, wedge, vector, locus, nexus, primitive (as noun), harness (as metaphor), surface (as in "API surface"), bedrock, scaffolding (as metaphor), paradigm, north star, flywheel. Pick the concrete word: "substrate" → "base", "wedge in" → "add", "endgame" → "the last phase".

### Plain speech

26. **Say what it does, not how it feels.** "SQL you can read" names a feeling; the fix names the mechanism or a number: "a column rename fails the build". If you can't restate a sentence as a concrete instruction, fact, or number, cut it. And if the sentence could appear unchanged in another project's docs, it says nothing about this one — cut it.
27. **One idea per sentence.** If the reader backtracks to parse it, split it.
28. **Active voice.** "queries are validated" → "the compiler validates queries". Passive only when the actor is unknown or genuinely doesn't matter.
29. **Cut adverbs, or use a stronger verb.** "significantly improves" → the measured delta.
30. **Prefer the plain word.** "utilize" → "use", "leverage" → "use", "facilitate" → "help", "numerous" → "many".
