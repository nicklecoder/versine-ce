---
id: round-only-at-the-end
namespace: catalogue/content
kind: rule
modality: should
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T09:56:33.622544976Z
relationships:
    - to: catalogue/content/coord-geometry-distance-as-perimeter
      type: refines
      via: batch
---

A perimeter on the plane that is not whole says 'to 1 decimal place? Round only at the end.', and its rows are chosen so that rounding each side first would give the same total, since the coord-geometry Perimeter level teaches distance, not rounding error. A row where early rounding changes the answer would mark a careful student wrong over a point the level never teaches; a level that wants to teach that point would choose such rows on purpose and say so.
