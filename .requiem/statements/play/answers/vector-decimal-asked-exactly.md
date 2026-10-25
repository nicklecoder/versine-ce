---
id: vector-decimal-asked-exactly
namespace: play/answers
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-25T09:21:19.1081381Z
relationships:
    - to: play/answers/vector-typed-in-angle-brackets
      type: refines
      via: batch
---

When a vector answer has a component that is a fraction with no ending decimal (5/13), a vector typed with a decimal in it is refused, not marked, with 'Give it exactly, with fractions like <5/13, −12/13>, not decimals.' -- the same as the roots box asking again for a rounded root. A decimal there can only be a rounding, near the key and never equal, and marking it wrong while ⟨0.6, 0.8⟩ is right for ⟨3/5, 4/5⟩ looks arbitrary. The refusal is decided by the key's form and by what was typed, never by whether the digits are right (the session's refuseHint hook).
