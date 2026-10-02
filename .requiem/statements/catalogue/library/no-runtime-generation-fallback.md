---
id: no-runtime-generation-fallback
namespace: catalogue/library
kind: rule
modality: must_not
status: active
provenance:
    type: dialogue
created_at: 2026-10-01T16:48:03.781407484Z
relationships:
    - to: principles/fail-visibly
      type: refines
      via: batch
      unconfirmed: true
    - to: catalogue/library/libraries-are-the-catalogue
      type: refines
      via: batch
      unconfirmed: true
---

A level whose library will not load fails visibly; the session must not fall back to generating problems at runtime, because that substitutes unreviewed problems for reviewed ones.
