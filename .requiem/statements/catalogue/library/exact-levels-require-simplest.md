---
id: exact-levels-require-simplest
namespace: catalogue/library
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T03:10:10.287371815Z
relationships:
    - to: play/answers/value-and-form-separate
      type: refines
      via: link
---

A level whose name or blurb asks for a simplified exact answer (quadratic-formula's Exact Radical Answers, pythagoras's Exact Answers and Distance Between Points) sets requireSimplest on its rows, including those rows when they appear in All Together, so √20 or (−8 ± √32)/2 is answered 'right, but not simplest yet' instead of accepted. Without it the level never tests the skill it is named for. Levels that only use roots on the way (Completing the Square, The Formula) do not set it: their skill is the method, and their answers are built already simplest.
