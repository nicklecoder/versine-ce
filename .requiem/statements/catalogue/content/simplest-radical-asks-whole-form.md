---
id: simplest-radical-asks-whole-form
namespace: catalogue/content
kind: decision
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T03:21:38.551000811Z
---

roots L4 Simplest Radical Form asks for the whole simplified radical as an expression (√1000 = 10√10), not the coefficient beside a radicand shown in the prompt. Showing what is left under the root told the student the largest square factor, so nobody could stop early at 2√250 and the level tested nothing Pulling Out Squares (L3) had not. The roots answer type is not used because it compares by value and would accept 2√250; the expr type compares by form, so a partly simplified radical is refused, and the checker requires the radicand square-free.
