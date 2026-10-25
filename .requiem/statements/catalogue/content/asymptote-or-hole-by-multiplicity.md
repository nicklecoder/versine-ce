---
id: asymptote-or-hole-by-multiplicity
namespace: catalogue/content
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T21:49:45.657833491Z
relationships:
    - to: catalogue/library/strategy-not-from-surface
      type: refines
      via: link
---

In rational-functions, a zero of the bottom is a vertical asymptote only when it divides the bottom more times than the top; otherwise it is a hole. Vertical Asymptotes therefore mixes rows where both zeros are asymptotes, rows where one factor cancels and leaves a hole, rows with none at all (a bottom like x² + 4 with no real zeros, or one whose only factor cancels), which the student answers 'none' in the solutions box, and rows with a repeated bottom factor: (x − 2)/(x − 2)² is still an asymptote at 2, since one factor is left on the bottom, (x − 2)/((x − 2)²(x + 1)) has two, and (x − 2)²/((x − 2)(x + 1)) has a hole at 2, because 'every zero of the bottom' or 'every factor that appears on top cancels it' would otherwise score without counting. No row carries a number the top and the bottom share, such as 2(x − 5)/(2(x − 3)). check-answers.py reads top and bottom into exact polynomials, finds the bottom's zeros by the rational root search, and compares multiplicities by repeated division; it reads horizontal asymptotes, end behavior and slant lines by evaluating f exactly far out rather than by comparing degrees, the generator's route.
