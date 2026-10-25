---
id: vector-typed-in-angle-brackets
namespace: play/answers
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-25T07:39:13.967809684Z
relationships:
    - to: play/answers/symbols-typed-on-a-keyboard
      type: refines
      via: link
    - to: play/answers/answer-syntax
      type: refines
      via: link
---

A vector answer is typed in component form with < and > for the angle brackets, <3, -4> for ⟨3, −4⟩, because ⟨ ⟩ are on no keyboard and < > are the nearest keys a textbook's notation maps to; the box's key guide says so, and ⟨ ⟩ or 〈 〉 typed or pasted are read too. Each component is a whole number, fraction or decimal compared exactly (⟨3/5, −4/5⟩ is ⟨0.6, −0.8⟩), and the unit-vector form 3i − 4j is read as the same vector, since textbooks write both. A pair in round brackets, (3, −4), is refused as invalid with the hint to use angle brackets rather than marked wrong: round brackets name a point, so it is the notation that is wrong, not the vector, the same way the points box asks again for x = 3, y = 4. This does not touch play/answers/answer-syntax: < > mean angle brackets only in the vector box, which reads no inequality.
