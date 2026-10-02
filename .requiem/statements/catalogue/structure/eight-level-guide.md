---
id: eight-level-guide
namespace: catalogue/structure
kind: rule
modality: should
status: active
provenance:
    type: dialogue
created_at: 2026-10-01T16:48:03.512485658Z
relationships:
    - to: principles/fail-visibly
      type: refines
      via: batch
      unconfirmed: true
    - to: catalogue/graph/fix-cycle-by-splitting
      type: depends_on
      note: both bound skill size, from different directions
      via: batch
      unconfirmed: true
---

About eight levels is the guide length for a skill. A longer skill is usually two skills; split by depth (foundations stay, harder work becomes a dependent skill) so a student finishes something. Exceeding it requires a declared longerBecause reason, which check-catalogue prints; without one it fails.
