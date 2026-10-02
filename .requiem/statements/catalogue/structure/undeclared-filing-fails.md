---
id: undeclared-filing-fails
namespace: catalogue/structure
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-01T16:48:03.588946724Z
relationships:
    - to: principles/fail-visibly
      type: refines
      via: batch
      unconfirmed: true
---

A skill filed under an undeclared category, or a category under an undeclared subject, is a failing check, because the map is built by walking declared names and such a skill would vanish from the map silently.
