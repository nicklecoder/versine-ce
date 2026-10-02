---
id: no-visual-on-strategy
namespace: catalogue/strategy
kind: rule
modality: must_not
status: active
tags:
    - reveal
provenance:
    type: dialogue
created_at: 2026-10-01T16:48:04.00828244Z
relationships:
    - to: principles/no-answer-before-commit
      type: refines
      via: batch
      unconfirmed: true
    - to: catalogue/strategy/strategy-levels
      type: refines
      via: batch
      unconfirmed: true
---

Strategy levels use the choice answer type and carry no visual, because every model leans toward one representation and that answers a question entirely about which way to lean.
