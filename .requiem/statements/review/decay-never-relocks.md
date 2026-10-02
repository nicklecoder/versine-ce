---
id: decay-never-relocks
namespace: review
kind: rule
modality: must_not
status: proposed
provenance:
    type: dialogue
created_at: 2026-10-01T17:24:15.563862142Z
relationships:
    - to: review/upkeep-decay
      type: refines
      via: batch
      unconfirmed: true
    - to: catalogue/graph/begun-skill-stays-open
      type: refines
      via: batch
      unconfirmed: true
---

Decay and re-certification never close any skill: skills that depend on a decayed one stay open, including ones not yet begun. Re-certification state is therefore kept separately from 'finished' (mastered last level), which continues to drive the gate.
