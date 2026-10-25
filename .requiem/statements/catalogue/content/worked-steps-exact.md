---
id: worked-steps-exact
namespace: catalogue/content
kind: rule
modality: should
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T09:56:33.656509517Z
relationships:
    - to: catalogue/content/explain-true-for-row
      type: refines
      via: batch
---

A worked conversion writes each step as = when it is exact and ≈ only when it is rounded, and an intermediate value it rounds is shown to one precision throughout (4 places), worked in exact arithmetic so a step never claims equality it does not have. The units L4 explanation printed 47.7273 then 47.727273 for one value, which reads as two different numbers.
