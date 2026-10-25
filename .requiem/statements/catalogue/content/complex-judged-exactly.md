---
id: complex-judged-exactly
namespace: catalogue/content
kind: decision
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T23:08:15.143395997Z
relationships:
    - to: play/answers/line-judged-as-line
      type: refines
      via: link
---

A complex answer (the complex type) is read into its real and imaginary parts as exact fractions and judged by both parts, so 3 + 2i, 2i + 3 and 3 + 2i typed with a times sign are one answer. Neither expr nor equivalent can do this: they know nothing of i, so they would treat i·i as a letter squared and never reduce it to −1, expr would refuse 2i + 3 for 3 + 2i by form, and equivalent would compare values at sample points of a letter that is not a variable. An answer still holding a power of i or i·i is refused with a hint to work the powers out first, and one holding a root with a hint to work the root out (√−1 is i), since that is the question copied back. A conjugate pair, the roots of a real quadratic, is one answer: p ± qi, or the two typed out, by comma or 'or', each of which may be named (x = 2 + 3i or x = 2 − 3i); ± is typed as play/answers/plus-minus-only-when-touching says. The box also reads what a phone or a student types besides a + bi: capitals (3 − 2I), one bracket round the whole, (3 − 2i), a minus before a bracket, −(7 + 6i)/17, and a bracketed signed coefficient, 3 + (−2)i. An answer equal to the key but not yet one real part and one imaginary part in lowest terms, (6 − 4i)/2, 6/2 − 2i or −(3 − 2i), is right but unfinished; (−1 + 3i)/2 and −(7 + 6i)/17 are finished. check-answers.py works each question out again in exact complex arithmetic of its own, and a quadratic's roots from its own discriminant, whose square root must be exact. 4/5i is read as four fifths of i, as a student typing it means, though strictly it is 4/(5i); the box writes it 4i/5, which cannot be misread.
