---
id: inverse-formula-forms-listed
namespace: catalogue/content
kind: rule
modality: must
status: superseded
provenance:
    type: dialogue
created_at: 2026-10-24T19:27:47.11020778Z
relationships:
    - to: play/answers/permissive-input-canonical-display
      type: refines
      via: link
---

In inverses' Solve for x ↔ y, f⁻¹(x) is typed in the expression box, which compares by form, so each answer lists every form a student writes for the same line: (x + 5)/3 from solving, x/3 + 5/3 from splitting the fraction, and 1/3x + 5/3 in slope-intercept form, with the sign moved to the top when the slope is negative. The linear type was not used: it would refuse (x + 5)/3, the form the swap-and-solve method produces, as unfinished. check-answers.py holds each listed form to the same test, composing it with f both ways and requiring x back at every sample point, so a wrong form cannot be listed.
