---
id: roots-judged-exactly
namespace: play/answers
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T01:02:57.532639949Z
relationships:
    - to: play/answers/set-judged-as-set
      type: refines
      via: link
---

A quadratic's roots are typed exactly, with ± allowed, and judged as a set of numbers a + b√r evaluated in exact arithmetic: (−3 ± √17)/4, −3/4 ± √17/4 and (−6 ± √68)/8 are one answer, and a decimal however close is not. ± is read as two entries, one per sign, rather than given to the parser as an operator, and the preview draws both so a student sees how it was read. One radicand per answer, since a quadratic with whole coefficients never needs two.
