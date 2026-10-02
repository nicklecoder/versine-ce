---
id: expr-canonical-order-only
namespace: play/answers
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-01T16:48:04.082368735Z
relationships:
    - to: play/answers/typed-answers-not-strings
      type: refines
      via: batch
      unconfirmed: true
    - to: play/answers/answer-syntax
      type: refines
      via: batch
      unconfirmed: true
---

Expression answers are canonicalised only for order (addition commutes; subtraction as adding a negative), never evaluated: 2+3 and 5 differ, 2(x+3) is not 2x+6, and division is not rewritten as a reciprocal, so a level can want those forms apart.
