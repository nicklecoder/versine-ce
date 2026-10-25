---
id: rational-answer-lowest-terms
namespace: catalogue/content
kind: rule
modality: must
status: superseded
provenance:
    type: dialogue
created_at: 2026-10-24T19:29:05.137114021Z
relationships:
    - to: catalogue/content/expression-prompts-name-the-form
      type: refines
      via: link
---

In rational-expr, an answer to Simplify or Write as one fraction is finished only when it is one fraction whose top and bottom share no factor, or a polynomial written out; (2x + 4)/(x + 2) is equal to 2 but not finished, the same as 6/8 for 3/4. check-answers.py tests this with the polynomial gcd of the answer's top and bottom, which must be a constant, after checking the answer equals the question's expression at rational points. Because the expression box compares by form, the answer lists the forms that are equally finished: the denominator factored or multiplied out, and a common number in the numerator taken out or left in, so (5x + 2)/((x + 1)(x + 3)) and (5x + 2)/(x² + 4x + 3) are both right.
