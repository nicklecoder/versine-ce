---
id: equivalent-finished-form
namespace: play/answers
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T21:06:32.441204475Z
relationships:
    - to: play/answers/equivalent-judged-by-value
      type: refines
      via: batch
    - to: play/answers/value-and-form-separate
      type: refines
      via: batch
---

An equivalent-type answer equal to the key is finished when, read from its tree as typed: it is one quotient or a polynomial (one division by something with the letter in it at most, and no fraction inside a fraction); its numeric fractions are in lowest terms (2/4 and (2x − 6)/4 are not, nor (2x + 4)/(2x + 6)); top and bottom share no polynomial factor; and like terms are collected (each sum is of single terms, one per power, so 2(x + 1) − (3x + 8) on top is not). A shared factor is found by degree: once the values agree the typed denominator can only be the key's times a common factor, so a greater degree than the key's (reduced) denominator means one was left in. Factored and multiplied-out tops and bottoms are both finished, a minus sign may sit anywhere, and a decimal such as 0.5x is right wherever it is the exact coefficient. An answer that is right but not finished gets the hint 'x/4 − 2/4 is right, but it isn't in its simplest form yet.', and like every form check it costs the attempt (play/answers/rounding-keeps-places).
