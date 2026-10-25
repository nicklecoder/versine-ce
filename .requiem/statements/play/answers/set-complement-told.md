---
id: set-complement-told
namespace: play/answers
kind: rule
modality: should
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T21:06:32.537649836Z
relationships:
    - to: play/answers/set-judged-as-set
      type: refines
      via: batch
---

A solutions answer that is exactly the complement of the key -- where the expression is defined, typed for where it is not -- is refused with a hint rather than a bare 'not quite': 'That is where it is defined. The question asks where it is not.' on rational-expr Excluded Values (the answer spec's complementHint), or a general one elsewhere. It is still wrong and costs the attempt. It is told only where one of the two sets is a few numbers: for an inequality, the complement of x < 3 is x ≥ 3, and saying so would hand over the answer.
