---
id: map-ordered-by-dependency
namespace: catalogue/structure
kind: design
status: active
provenance:
    type: dialogue
created_at: 2026-10-01T16:48:03.599803836Z
relationships:
    - to: catalogue/graph/nodes-are-skills-and-levels
      type: depends_on
      via: batch
      unconfirmed: true
---

mapOrder() walks filing order but lays a skill's dependencies out before it, recursively, only ever moving skills earlier; categories may become non-contiguous. check-catalogue fails a map order that draws a skill before something it builds on, so a student never scrolls past everything that needs a prerequisite before finding it.
