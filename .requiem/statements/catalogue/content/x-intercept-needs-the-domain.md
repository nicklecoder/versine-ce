---
id: x-intercept-needs-the-domain
namespace: catalogue/content
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-25T02:19:13.831354668Z
relationships:
    - to: catalogue/content/asymptote-or-hole-by-multiplicity
      type: refines
      via: link
---

In rational-functions an x-intercept is a number where f is 0, so the top is 0 there and the bottom is not: a zero the top shares with the bottom is a hole, however the factors cancel, and is never an intercept. The Intercepts level makes that the trap in about a third of its x-intercept rows, has rows with none (a constant top, or a top whose only zero cancels), which every prompt offers, and asks the y-intercept as the point (0, f(0)) only where 0 is in the domain. check-answers.py takes the top's zeros and keeps those at which the bottom, as written, is not 0.
