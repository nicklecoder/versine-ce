---
id: rational-answer-finished-by-value
namespace: catalogue/content
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T21:06:47.292020499Z
relationships:
    - to: catalogue/content/rational-answer-lowest-terms
      type: supersedes
      via: batch
    - to: play/answers/equivalent-finished-form
      type: depends_on
      via: batch
---

In rational-expr, an answer to Simplify or Write as one fraction is finished only when it is one fraction whose top and bottom share no factor, or a polynomial; (2x + 4)/(x + 2) is equal to 2 but not finished, the same as 6/8 for 3/4. The answer box judges this itself (play/answers/equivalent-finished-form), so the answer stores one finished form and lists no others. check-answers.py holds the stored form to the same rule by its own route: equal to the question's expression at rational points, and the polynomial gcd of its top and bottom a constant (a polynomial answer written expanded).
