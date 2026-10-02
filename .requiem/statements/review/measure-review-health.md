---
id: measure-review-health
namespace: review
kind: design
status: active
provenance:
    type: dialogue
created_at: 2026-10-01T17:24:15.632309682Z
relationships:
    - to: review/why-upkeep
      type: refines
      via: batch
      unconfirmed: true
---

The teacher console shows per-student review health: finished skills fresh or due, reviews done in the last 30 days, and overdue days at review. The baseline is the 2026-10-01 server snapshot (commit 3e5eacf): reviews of finished skills in the prior 30 days were 0 for one student (3 finished skills) and 23 for the other (5). Compare after 2-4 weeks of review running; that comparison decides review/turn-on-decay.
