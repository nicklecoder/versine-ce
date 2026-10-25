---
id: long-division-beyond-monic
namespace: catalogue/content
kind: decision
status: active
provenance:
    type: dialogue
created_at: 2026-10-25T02:19:25.933834646Z
relationships:
    - to: catalogue/content/quotient-typed-when-exact
      type: refines
      via: link
---

poly-division's Long Division divides by more than x − c, which made it synthetic division written longhand: about half its rows divide by x − c, a quarter by ax − b (2x − 1, 3x + 2), and a quarter by a quadratic, x² + k or one like x² − x + 4 that does not factor, a quartic over it with a remainder that can be a whole line, 3x − 58. The explanation says the division stops when what is left has a lower degree than the divisor. Synthetic stays by x − c. check-answers.py divides again by long division over any divisor, in exact fractions.
