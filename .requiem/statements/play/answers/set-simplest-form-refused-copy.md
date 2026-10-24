---
id: set-simplest-form-refused-copy
namespace: play/answers
kind: rule
modality: should
status: proposed
provenance:
    type: dialogue
created_at: 2026-10-24T03:27:42.26228283Z
relationships:
    - to: play/answers/value-and-form-separate
      type: refines
      via: link
---

A solution-set level that asks for the simplest form (compound-ineq And or Or?) should refuse, with a hint rather than a mark, an answer whose written pieces outnumber the pieces of the set it names (x < -1 and x < -2 typed for x < -2, x < 5 or x >= -7 for all real numbers), because the solutions type judges by the set and so accepts the question copied back, and combining the two conditions is the whole skill. It needs parseSet to report how many pieces were written and the level to opt in (requireSimplest, with a hint of its own rather than the fraction one); the generator already leaves out the rows whose simplest form is the question itself.
