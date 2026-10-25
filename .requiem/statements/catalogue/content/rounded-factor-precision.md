---
id: rounded-factor-precision
namespace: catalogue/content
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T09:56:33.687685322Z
relationships:
    - to: catalogue/content/units-both-systems
      type: refines
      via: batch
---

A units question that gives a rounded factor states it ('Using 1 kg ≈ 2.2 lb') and asks for a precision that factor supports: two significant figures for 2.2, three for 1.61, 28.3 or 3.79. Every row is kept only if the given factor and the exact definition round to the same answer at that place, away from a rounding edge, so a student who knows the exact factor is not marked wrong, and one who uses the given factor gets the key. Exact factors (1 in = 2.54 cm) keep whatever precision is natural. The checker asserts both answers agree.
