---
id: quotient-typed-when-exact
namespace: catalogue/content
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T22:12:02.18198637Z
relationships:
    - to: play/answers/equivalent-judged-by-value
      type: refines
      via: link
---

In poly-division's Long Division, a quotient is typed only when the division is exact, judged by value with the equivalent answer type so any finished way of writing it is right; when there is a remainder, the quotient and remainder are chosen together from four options, because Q + r/(x − c) is not a single finished quotient and two typed boxes for one answer would split it. The wrong options are the slips the method invites, each worked through: dividing by x + c, leaving out a missing power's 0, bringing the numbers down unchanged, and the remainder's sign turned round. Synthetic division's bottom row is a choice for the same reason, and remainders, k and zeros are numbers or sets, so no poly-division answer depends on matching an expression's form. check-answers.py divides again by long division from the top term down, not by the generator's synthetic division.
