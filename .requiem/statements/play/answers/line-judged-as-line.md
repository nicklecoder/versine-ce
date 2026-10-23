---
id: line-judged-as-line
namespace: play/answers
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-23T23:08:52.241639201Z
relationships:
    - to: play/answers/permissive-input-canonical-display
      type: refines
      via: link
---

A line answer (the linear type) is judged as a line, by its exact slope and intercept, not by its spelling: y = x/2 + 3, y = 0.5x + 3 and y = 3 + 1/2x are one answer, because finding the slope and intercept is what the levels ask and the spelling is not. The typed right-hand side is evaluated exactly over fractions at seven values of x; unequal steps mean it is not a line and it is refused with a hint rather than marked wrong. Expression answers stay judged by canonical form, because there the arithmetic is the thing being asked. What a line answer must still do is put y on its own (y = ... or x = c for a vertical line): 2y = 4x + 6 is the same line but gets a hint, since isolating y is part of what the line levels teach.
