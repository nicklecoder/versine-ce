---
id: dependent-work-credit
namespace: review
kind: design
status: active
provenance:
    type: dialogue
created_at: 2026-10-01T17:24:15.46516291Z
relationships:
    - to: review/skill-review-schedule
      type: refines
      via: batch
      unconfirmed: true
    - to: rating/review-not-decay
      type: refines
      via: batch
      unconfirmed: true
---

Each active day on which the student passes a Time Trial in a skill that directly depends on this one pushes this skill's review due date out by w x its current interval: w = 0.25 for a skill-level edge, 0.5 when the passed level has a level-precise edge naming this skill. A passed trial is the test rather than an accuracy threshold, because a pass already weighs accuracy and pace together and 'accuracy' must not gain a second meaning (runs store first-try accuracy, rating uses share of answers right; an 80% bar would credit 1 to 6 days of the same four weeks depending on which). Postponement is capped at 2x the interval since the last real review so every skill eventually gets a direct review. Only direct dependencies get credit. w is the tuning knob.
