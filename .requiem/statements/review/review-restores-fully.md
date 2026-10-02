---
id: review-restores-fully
namespace: review
kind: rule
modality: must
status: proposed
provenance:
    type: dialogue
created_at: 2026-10-01T17:24:15.515837725Z
relationships:
    - to: review/upkeep-decay
      type: refines
      via: batch
      unconfirmed: true
---

A passed review restores the skill's full contribution immediately and resets decay, so a review feels like a win ('+1.8 restored') rather than paying off debt.
