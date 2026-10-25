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

In poly-division's Long Division, a quotient is typed only when the division is exact, judged by value with the equivalent answer type so any finished way of writing it is right; when there is a remainder, the quotient and remainder are chosen together from four options, because Q + r/(x − c) is not a single finished quotient and two typed boxes for one answer would split it. The wrong options are the slips the method invites, worked through and crossed two at a time (decoys-crossed-not-centred): the divisor's other signs turned on every step, on the first step only, or on every step but the first (dividing by x + c for x − c), and a missing power's 0 left out. Every option has its own quotient; the remainder's sign turned round was dropped as a slip because it printed the right quotient twice, the right answer always one of the pair, and the numbers brought down unchanged because that option was the dividend copied out. Synthetic division's bottom row is a choice for the same reason, its slips -c in the box, a missing 0 left out, and c multiplied by the number above instead of the one brought down. Remainders, k and zeros are numbers or sets, so no poly-division answer depends on matching an expression's form. check-answers.py divides again by long division from the top term down, over any divisor, not by the generator's synthetic division.
