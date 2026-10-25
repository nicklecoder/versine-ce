---
id: equivalent-judged-by-value
namespace: play/answers
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T21:06:32.394950634Z
relationships:
    - to: play/answers/typed-answers-not-strings
      type: refines
      via: batch
---

A level where the form is not the point opts in to the equivalent answer type, which judges an expression by its value and then by whether it is finished, instead of by canonical form. inverses' Solve for x ↔ y and every rational-expr expression level use it, so x/2 − 3/2, 0.5x − 1.5 and (1/2)(x − 3) are all right for (x − 3)/2 and −(x + 6)/(x + 4) for (−x − 6)/(x + 4), with no list of accepted forms to keep: listing them never finished, and measured against plausible student forms the lists refused 75-82% of inverses problems and 13-20% of rational-expr problems at least once. Equality is exact: both sides are evaluated in BigInt fractions at fixed rational points, skipping the key's poles, and the number of agreeing points needed is computed from the degrees of the two quotients, so agreement is a proof that they are one function, not a sample. A key with a cube root in it is evaluated where its radicand is a perfect cube. The expr type is not loosened: a level about the arithmetic does not opt in, so 5 stays refused for 2 + 3 there (play/answers/accepted-forms-judged and play/answers/expr-canonical-order-only stand).
