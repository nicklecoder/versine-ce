---
id: rational-extraneous-mixes-outcomes
namespace: catalogue/content
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T20:39:40.569455343Z
relationships:
    - to: catalogue/content/extraneous-level-mixes-outcomes
      type: refines
      via: link
---

In rational-eq's Extraneous level, clearing the denominators of x/(x − r) − k/(x + t) = M/((x − r)(x + t)) gives a quadratic whose two roots may each land on an excluded value or not: about three in five rows keep one root, one in five keeps both, and one in five keeps neither (half of those a linear equation whose only answer is the excluded value), so the answer is no solution. If every row threw exactly one away, 'drop one' would score without the student finding the excluded values, which is the habit the level teaches. check-answers.py does not use the generator's verdicts: it puts both sides over one denominator, finds the numerator's zeros exactly by the rational root theorem, asserts nothing irrational is left, and keeps a zero only where the question as written evaluates in exact arithmetic without dividing by 0.
