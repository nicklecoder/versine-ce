---
id: exact-length-wording-uniform
namespace: catalogue/content
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-25T09:21:18.988032263Z
relationships:
    - to: catalogue/content/one-input-per-level
      type: refines
      via: batch
---

An exact length in vectors (a magnitude) and parametric-polar (a polar r) is asked 'Give it exactly, with any radical in simplest form' on every row, whole or not, rather than 'in simplest radical form' only when the length has a root. A prompt that named the radical form only when there was one would tell the student whether the length is whole before any working (catalogue/content/one-input-per-level), and 'in simplest radical form' on a length of 13 reads as wrong.
