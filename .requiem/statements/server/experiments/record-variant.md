---
id: record-variant
namespace: server/experiments
kind: rule
modality: must
status: proposed
provenance:
    type: dialogue
created_at: 2026-10-02T04:10:12.198447283Z
relationships:
    - to: review/turn-on-decay
      type: refines
      note: decay on/off is the first candidate for a recorded variant
      via: batch
    - to: server/extensions/extension-points
      type: depends_on
      via: link
---

When a motivation feature is tried in more than one form, each student's assigned variant is recorded alongside their play data, and an assignment is never rewritten after the fact; the server decides which variant a student gets (default: everyone on the default). Without the record, months of play data cannot say which variant caused what. Motivation design is meant to be adjusted from real data across many students, not guessed.
