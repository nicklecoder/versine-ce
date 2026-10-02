---
id: skill-review-schedule
namespace: review
kind: design
status: active
provenance:
    type: dialogue
created_at: 2026-10-01T17:24:15.442835483Z
relationships:
    - to: review/why-upkeep
      type: refines
      via: batch
      unconfirmed: true
    - to: play/modes/done-for-the-day
      type: depends_on
      note: a review is a last-level Time Trial pass, so it also completes that skill's day
      via: batch
      unconfirmed: true
    - to: roadmap/daily-mix
      type: refines
      note: per-skill spaced review is the first concrete form of the daily-mix idea
      via: link
---

Review is per skill: passing its last level in a Time Trial counts as a review, because the last level mixes every earlier one and proves the skill. Each finished skill has a review interval stepping through 7, 14, 30, 60 and 120 days (capped), measured from the last such pass. A skill whose review is due shows 'needs review' on its map card.
