---
id: card-shows-points
namespace: review
kind: design
status: active
provenance:
    type: dialogue
created_at: 2026-10-01T17:24:15.587706757Z
relationships:
    - to: review/why-upkeep
      type: refines
      via: batch
      unconfirmed: true
---

Each map card shows the points that skill currently contributes to the Level and the student's personal-best points on it. Unfinished skills show 'worth up to +X' to pull students forward, deeper skills visibly being worth more. Personal best is stored persistently, not recomputed.
