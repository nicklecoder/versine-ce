---
id: unlike-bases-by-logs
namespace: catalogue/content
kind: decision
status: active
provenance:
    type: dialogue
created_at: 2026-10-25T02:16:35.417622453Z
relationships:
    - to: catalogue/content/trig-rounding-agrees
      type: refines
      via: link
---

Solve Exponential Equations includes equations whose two sides are powers of bases that are not powers of one number, 2ˣ = 3ˣ⁻¹ or 5^(2x + 1) = 7^(x − 2): take ln of both sides, bring both powers down, multiply out and gather the x terms, x(p ln a − r ln b) = s ln b − q ln a. The answer is rounded to the places the question names, and a row is drawn again when the answer worked with 4-place logs would round differently. Without them every rounded row had a power on one side and a number on the other, which can be done by dividing logs without ever gathering x terms. check-answers.py solves the linear equation in x again from the question's two exponents.
