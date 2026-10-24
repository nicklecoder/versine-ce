---
id: set-all-but-points-shown
namespace: play/answers
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T21:06:32.572683407Z
relationships:
    - to: play/answers/set-judged-as-set
      type: refines
      via: batch
---

A solution set that is every number but a few is formatted, and so revealed, as 'x ≠ −2 and x ≠ 6' rather than as the rays and gap between them ('x < −2 or −2 < x < 6 or x > 6'), which is the same set said the long way round. The formatted text parses back to the same set, as every reveal must, and counts as combined for a level that asks for the simplest form.
