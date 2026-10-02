---
id: failed-review-leaves-due
namespace: review
kind: rule
modality: must_not
status: active
provenance:
    type: dialogue
created_at: 2026-10-02T00:33:03.919557397Z
relationships:
    - to: review/skill-review-schedule
      type: refines
      via: batch
---

A failed or quit review attempt must not shrink a skill's review interval; the skill simply stays due until it is passed. Failures on finished skills reflect the Time Trial clock, not forgetting: in the 2026-10-01 server snapshot (commit 3e5eacf) a student passed finished last levels on the first try about half the time whether the gap was 1-2 days or 3-6, and of all trials 142 passed, 127 ran out of time (several at 100% accuracy) and 71 were quit. Shrinking on failure would have shortened the interval on roughly every other review.
