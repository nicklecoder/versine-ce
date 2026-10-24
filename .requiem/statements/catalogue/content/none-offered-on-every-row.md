---
id: none-offered-on-every-row
namespace: catalogue/content
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T21:27:21.233143907Z
relationships:
    - to: catalogue/library/strategy-not-from-surface
      type: refines
      via: link
---

When a level can have no solution, the prompt of every row on it says 'or say there is none', not only the rows whose answer is none, and the solutions box accepts none and no solution as that answer. A prompt that offered it only when it was the answer would give the answer away, and one that never offered it leaves a student who has found nothing unsure whether the box can say so. Levels that always have a solution, such as cube roots, keep plain 'Solve:'. Applies to radical-eq and rational-eq, after trig-equations.
