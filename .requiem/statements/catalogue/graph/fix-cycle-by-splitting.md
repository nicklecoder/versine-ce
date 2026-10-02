---
id: fix-cycle-by-splitting
namespace: catalogue/graph
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-01T16:48:03.722001491Z
relationships:
    - to: catalogue/graph/graph-acyclic
      type: refines
      via: batch
      unconfirmed: true
---

A dependency cycle is fixed by splitting a skill, never by deleting whichever edge closed the loop: a cycle says two skills each need the whole of the other, which nearly always means one is two skills, and deleting a true edge makes the catalogue lie about what rests on what.
