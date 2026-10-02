---
id: rating-weights-and-quality
namespace: rating
kind: design
status: active
provenance:
    type: dialogue
created_at: 2026-10-01T16:48:04.449236048Z
relationships:
    - to: rating/level-is-present-ability
      type: refines
      via: batch
      unconfirmed: true
    - to: catalogue/graph/graph-acyclic
      type: depends_on
      note: depthOf is meaningless on a loop
      via: batch
      unconfirmed: true
---

Weight is +0.5 per step of dependency depth and +0.15 per level position; quality is measured over the last 40 answers at that level, with accuracy multiplying rather than averaging so speed never rescues being wrong. 'Last 40' is ordered by attempt id, not timestamp.
