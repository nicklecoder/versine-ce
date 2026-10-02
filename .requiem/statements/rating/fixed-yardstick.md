---
id: fixed-yardstick
namespace: rating
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-01T16:48:04.480107933Z
relationships:
    - to: rating/level-is-present-ability
      type: refines
      via: batch
      unconfirmed: true
---

Rating measures pace against the level's fixed authored reference pace, never the student's adaptive clock; otherwise everyone converges on similar Levels and comparisons become meaningless. The gate adapts; the yardstick does not.
