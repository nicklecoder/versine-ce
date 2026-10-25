---
id: decompose-every-inside-accepted
namespace: catalogue/content
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T17:47:54.49270611Z
relationships:
    - to: catalogue/library/every-level-checked
      type: refines
      via: link
---

In composition's Decompose, an answer is right when it rebuilds h, not when it matches the one decomposition the generator started from. So the outside function f is asked only when the given inside g makes f unique (a linear g, or a polynomial g taking infinitely many values), and when the inside is asked under an even power, as in (3x − 1)² or 2(3x − 1)² + 5, both 3x − 1 and −3x + 1 are accepted, because squaring removes the sign. check-answers.py holds every accepted form to the same test: it substitutes the answer into the given function and compares the result with h by value at many rational points, rather than comparing strings.
