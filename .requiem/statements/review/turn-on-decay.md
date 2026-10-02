---
id: turn-on-decay
namespace: review
kind: question
status: proposed
provenance:
    type: dialogue
created_at: 2026-10-02T00:33:04.039673033Z
relationships:
    - to: review/measure-review-health
      type: depends_on
      via: batch
---

Open question: after 2-4 weeks of review running without point loss, should upkeep decay be turned on? Compare review/measure-review-health against the 2026-10-01 baseline; if the student who never reviewed is still not reviewing, adopt review/upkeep-decay (without any exemption for days spent on dependent skills). What hangs on it: superseding rating/no-calendar-decay, rating/review-not-decay, rating/level-is-present-ability and rating/fixed-yardstick, and adopting decay-counts-active-days, review-restores-fully, recertify-with-last-level, decay-never-relocks and card-shows-lost-to-review.
