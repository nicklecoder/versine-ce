---
id: exact-decimals
namespace: play/answers
kind: rule
modality: must_not
status: active
provenance:
    type: dialogue
created_at: 2026-10-01T16:48:04.038630984Z
relationships:
    - to: play/answers/typed-answers-not-strings
      type: refines
      via: batch
      unconfirmed: true
---

Decimals (and rounding, and answer checks) use exact rationals, an integer over a power of ten, never floats: 0.1 + 0.2 is not 0.3 in binary, and a drill that marks a correct answer wrong once loses the student for the session.
