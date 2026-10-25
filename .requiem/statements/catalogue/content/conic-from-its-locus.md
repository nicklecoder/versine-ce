---
id: conic-from-its-locus
namespace: catalogue/content
kind: rule
modality: should
status: active
provenance:
    type: dialogue
created_at: 2026-10-25T09:21:19.028418925Z
relationships:
    - to: catalogue/content/decoys-cross-two-slips
      type: depends_on
      via: batch
---

conics' Writing the Equation asks, in two rows of seven, for the ellipse or hyperbola that is every point whose distances from two given foci add to (or differ by) a given number, the definition of the curve (G-GPE.3, TEKS P.3G). The constant is 2a and the foci give the center and c, so the student turns the definition into a, b and c; the four options cross the same two slips as the level's other rows (b² by the other conic's rule, and a² under the wrong letter). check-answers.py builds the conic again from the foci and the constant.
