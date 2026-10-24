---
id: choice-answers-balanced
namespace: catalogue/library
kind: rule
modality: should
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T03:22:23.218217665Z
relationships:
    - to: principles/no-answer-before-commit
      type: refines
      via: link
---

A choice level's right answers should come out close to evenly across its options in the built library, measured there rather than in the generator's weights, because the build draws until a thousand distinct texts and a small pool for one answer gets drowned by a large pool for another: Linear or Not shipped 480 linear tables to 78 not, so always pressing Linear scored 86%. Widen the thin answer's pool, or choose the answer first and redraw until a problem has it.
