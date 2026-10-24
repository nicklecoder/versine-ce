---
id: inverse-formula-judged-by-value
namespace: catalogue/content
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T21:06:32.663150958Z
relationships:
    - to: catalogue/content/inverse-formula-forms-listed
      type: supersedes
      via: batch
    - to: play/answers/equivalent-judged-by-value
      type: depends_on
      via: batch
---

In inverses' Solve for x ↔ y, and the formula rows of All Together, f⁻¹(x) is typed in the equivalent box, so any finished form of the inverse is right -- (x + 5)/3 from solving, x/3 + 5/3 from splitting the fraction, (1/3)(x + 5), 0.5x − 1.5 -- and the answer stores one form instead of listing them. check-answers.py composes the stored form with f both ways and requires x back at every sample point (in floats to a billionth where a cube root is involved).
