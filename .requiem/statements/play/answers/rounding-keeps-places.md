---
id: rounding-keeps-places
namespace: play/answers
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T03:58:59.870537064Z
relationships:
    - to: play/answers/value-and-form-separate
      type: refines
      via: link
---

An answer rounded to a stated number of places is written to that place, zeros kept: 1.6 to 2 decimal places is 1.60, and sqrt(99) to 1 dp is 10.0. The decimal answer value carries places, the decimal type formats (and the reveal shows) it padded, and the session refuses the right number typed to a different number of places with the hint '1.6 is right, but to 2 decimal places it is written 1.60.' The trailing zero is what 'to 2 d.p.' means -- it says the number is known as far as that column -- so accepting 1.6 taught that the place does not matter, while the explanation and picture already wrote 1.60. It is a form check on a right value, like requireSimplest, so it costs the attempt. check-answers asserts places and the first accepted form agree with the place asked.
