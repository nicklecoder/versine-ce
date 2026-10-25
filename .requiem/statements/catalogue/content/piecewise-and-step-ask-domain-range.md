---
id: piecewise-and-step-ask-domain-range
namespace: catalogue/content
kind: rule
modality: should
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T21:09:13.60105077Z
relationships:
    - to: catalogue/content/one-input-per-level
      type: refines
      via: link
---

domain-range's Piecewise and Step Functions levels ask for a domain or range in about three rows in ten, not only for a value, because a skill named Domain & Range that only evaluated these two families never asked what they are about: a piecewise function defined on bounded pieces (perhaps with a gap) has its conditions for a domain and every height its pieces reach for a range, and a step function's range on a stretch of x is separate values (⌊x⌋ on 0 ≤ x < 3 is 0, 1 and 2). The answer goes in the solutions box, and the question says so ('Write it with y, listing every value'), so the different box beside the level's number box gives nothing away. check-answers.py finds a range by evaluating each piece at every twelfth its condition allows.
