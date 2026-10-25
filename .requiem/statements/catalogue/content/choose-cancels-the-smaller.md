---
id: choose-cancels-the-smaller
namespace: catalogue/content
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-25T07:12:13.885807629Z
---

A worked C(n, k) is worked from the smaller of k and n − k, C(n, k) = C(n, j) with j = min(k, n − k), and the j factors on top are cancelled against j! before anything is multiplied: C(16, 14) = C(16, 2) = (16 × 15)/(2 × 1), 16/2 = 8, leaving 8 × 15 = 120. Binomial's Coefficients by Combinations once explained C(16, 14) as 16 × 15 × … × 3 over 14!, that is 10,461,394,944,000/87,178,291,200, which is the slip the formula invites and nothing a student would do by hand. Each factor of j! (2 and up) is matched to a top factor it divides, one top factor taking several where they fit (12/(4 × 3) = 1). Evaluate questions are kept to j ≤ 5, since C(15, 7) has no such matching (no top factor that 6 × 4 divides) and seven factors over 7! is past hand arithmetic; check-answers.py re-checks each cancelling step and that what is left multiplies to the triangle's number.
