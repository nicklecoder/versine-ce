---
id: rational-root-candidates-listed
namespace: catalogue/content
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-25T02:19:13.363880867Z
---

poly-division has a Rational Root Theorem level before All Zeros From One, because there the first zero is always given and nowhere else is a student shown where a first zero comes from. Its rows either ask which of four numbers the theorem rules out (three on the list of p/q, p dividing the constant term and q the leading coefficient, one off it: a fraction upside down, a factor of the leading coefficient taken for the constant's, a denominator from the constant), or give a cubic with exactly one rational zero, the rest irrational or not real, and ask for it. The ruled-out option's look is controlled: the three allowed numbers are of its form (fractions beside a fraction), and of a few draws the set is kept that puts it at a rank among the four, by total edit distance from the others, drawn once at random before any redraw, so it is neither the odd one out nor the one in the middle by appearance. check-answers.py builds the list from the divisors itself and tests every candidate in P exactly.
