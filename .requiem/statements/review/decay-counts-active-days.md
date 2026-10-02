---
id: decay-counts-active-days
namespace: review
kind: rule
modality: must
status: proposed
provenance:
    type: dialogue
created_at: 2026-10-01T17:24:15.498608712Z
relationships:
    - to: review/upkeep-decay
      type: refines
      via: batch
      unconfirmed: true
    - to: server/day-is-local
      type: depends_on
      via: link
---

Decay counts only active days (days the student plays at all), never calendar days, so vacations and sick days cost nothing; pressure falls only on coming in and choosing not to review.
