---
id: value-and-form-separate
namespace: play/answers
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-01T16:48:04.027426788Z
relationships:
    - to: play/answers/typed-answers-not-strings
      type: refines
      via: batch
      unconfirmed: true
---

Value and form are separate checks: a level may set requireSimplest, and a right value in the wrong form is refused with the reason ('3/9 is right, but it isn't in lowest terms yet').
