---
id: no-calendar-decay
namespace: rating
kind: rule
modality: must_not
status: active
provenance:
    type: dialogue
created_at: 2026-10-01T16:48:04.466158717Z
relationships:
    - to: rating/level-is-present-ability
      type: refines
      via: batch
      unconfirmed: true
---

The Level must never decay with calendar time; it falls only when a lower standard is shown, because decay would guess at what happened while nobody was looking.
