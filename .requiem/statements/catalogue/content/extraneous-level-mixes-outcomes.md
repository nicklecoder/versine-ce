---
id: extraneous-level-mixes-outcomes
namespace: catalogue/content
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T19:28:35.320089332Z
relationships:
    - to: catalogue/library/strategy-not-from-surface
      type: refines
      via: link
---

In radical-eq's Extraneous Roots, squaring √(px + q) = x + s always gives two candidates, but which survive varies: about three in five rows keep one, one in five keeps both, and one in five keeps neither, so the answer is no solution. If every row threw exactly one away, 'drop one of the two' would score full marks without checking anything, which is the habit the level exists to replace. check-answers.py does not use the generator's verdicts: it finds the solutions by trying every whole number from -1000 to 1000 in the original equation, so an extraneous candidate is out because it fails there, and it fails a row whose equation changes sign between two whole numbers, a solution off the grid.
