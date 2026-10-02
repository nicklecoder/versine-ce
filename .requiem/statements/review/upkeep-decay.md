---
id: upkeep-decay
namespace: review
kind: design
status: proposed
provenance:
    type: dialogue
created_at: 2026-10-01T17:24:15.483428704Z
relationships:
    - to: review/why-upkeep
      type: refines
      via: batch
      unconfirmed: true
    - to: review/skill-review-schedule
      type: depends_on
      via: batch
      unconfirmed: true
    - to: rating/no-calendar-decay
      type: conflicts_with
      note: 'deliberate override: once adopted, supersede no-calendar-decay'
      via: batch
      unconfirmed: true
    - to: rating/review-not-decay
      type: conflicts_with
      note: 'deliberate override: once adopted, supersede review-not-decay (review becomes enforced by points)'
      via: batch
      unconfirmed: true
    - to: rating/level-is-present-ability
      type: conflicts_with
      note: Level becomes ability x upkeep; update that body on adoption
      via: batch
      unconfirmed: true
    - to: rating/fixed-yardstick
      type: conflicts_with
      note: Levels stop being purely comparable between students
      via: batch
      unconfirmed: true
    - to: review/turn-on-decay
      type: depends_on
      via: batch
---

Once a review is 3 active days overdue, the skill's Level contribution loses 5% of its full value for each further active day without a review (about 20 ignored days to zero). Work in dependent skills protects a skill only through review/dependent-work-credit, which postpones the due date up to a cap; decay is never suspended for a day spent on a dependent skill.
