---
id: set-comma-after-not-equal
namespace: play/answers
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T21:06:32.504781545Z
relationships:
    - to: play/answers/set-judged-as-set
      type: refines
      via: batch
---

In the solutions box a comma beside a ≠ means 'and': x ≠ −2, 6 is every number but −2 and 6, and x ≥ −1, x ≠ 1 is a ray with a hole. Elsewhere a comma between inequalities is still refused as ambiguous, because there it could mean either and reading it as 'or' made x > −2, x < 5 every number; beside a ≠ it cannot mean 'or' (x ≠ −2 or x ≠ 6 is every number). It is read that way only when there is a ≠, no 'or', and at most one other inequality, so nothing is guessed. A number alone after a ≠ ('x ≠ −2 and 6') is one more left out, and x ≠ ±2 leaves out both.
