---
id: signs-lifted-out
namespace: play/answers
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T00:14:26.093631042Z
relationships:
    - to: play/answers/expr-canonical-order-only
      type: refines
      via: link
---

Before an expression answer is canonicalised for order, its sign is lifted out of products, double negations, quotients and sums, so −2x + 3 matches 3 − 2x, −4/x², −(4/x²) and 4/(−x²) are one answer, and −(x + 6), −x − 6 and (−x − 6)/(x + 4) against −(x + 6)/(x + 4) agree. A sum's sign comes out by keeping, of the sum and its negation, the spelling with fewer negative terms (the lesser string at a tie), so a sum and its negation always land on one body with opposite signs. Where the minus is written is not a form a level can ask for: moving it is not arithmetic, and refusing it marked right answers wrong — first for a leading minus in a sum, then for a negative power finished below the bar in Monomials, then for −(x + 6)/(x + 4) typed for (−x − 6)/(x + 4) in rational-expr.
