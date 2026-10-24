---
id: set-letter-told
namespace: play/answers
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T05:06:35.572885584Z
relationships:
    - to: play/answers/set-judged-as-set
      type: refines
      via: link
---

A solution set typed with a different letter from the question's (y > 2 for x > 2, x for t) is refused with the hint 'The question is about t: write it with t, not y.' rather than accepted. sameSet compares the numbers only, so it was marked right, but the letter is what the set is a set of, and a student who swapped it has answered a different question. Only a letter actually typed is held to this: interval notation, no solution and all real numbers name none and pass. It is a generic formHint hook on the answer type, checked by the session after the value matches.
