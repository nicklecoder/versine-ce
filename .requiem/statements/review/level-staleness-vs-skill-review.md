---
id: level-staleness-vs-skill-review
namespace: review
kind: question
status: superseded
provenance:
    type: dialogue
created_at: 2026-10-02T00:33:04.076080254Z
relationships:
    - to: rating/review-not-decay
      type: depends_on
      via: batch
    - to: review/skill-review-schedule
      type: depends_on
      via: batch
---

Open question: what happens to the existing per-level fresh/due/stale flags (rating/review-not-decay, stalenessOf in web/engine/rating.js, shown on the map) once per-skill review tags exist? Two different 'due' marks on one map break one-name-per-thing. Likely answer: the per-skill tag replaces the level flags on the map, and the stale-dependency warm-up either goes or becomes the review offer. What hangs on it: whether rating/review-not-decay is superseded, and what the map shows.
