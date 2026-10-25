---
id: none-offered-on-every-row
namespace: catalogue/content
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T21:27:21.233143907Z
relationships:
    - to: catalogue/library/strategy-not-from-surface
      type: refines
      via: link
---

When a level can have no solution, the prompt of every row on it offers none, not only the rows whose answer is none, and the solutions box accepts none and no solution as that answer. A prompt that offered it only when it was the answer would give the answer away, and one that never offered it leaves a student who has found nothing unsure whether the box can say so. A level that always has a solution keeps a plain prompt unless its skill words every prompt alike. The words are radical-eq's, which name a spelling the box reads as the empty set (radical-eq-asks-for-none): 'Give every solution, or none if there is no solution.', or for a list of numbers that are not solutions, '…, or none if there is none.' rational-eq words every equation that way, on every level, because All Together mixes Extraneous rows, which can come out empty, with Clear Denominators and Proportions rows, which cannot, and a prompt worded only on the first would tell the student which rows need the excluded-value check. rational-functions' Vertical Asymptotes and x-intercept rows, and poly-functions' Polynomial & Quadratic Inequalities and Rational Inequalities, word every prompt alike.
