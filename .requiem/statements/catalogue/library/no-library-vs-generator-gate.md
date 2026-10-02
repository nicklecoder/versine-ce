---
id: no-library-vs-generator-gate
namespace: catalogue/library
kind: rule
modality: must_not
status: active
tags:
    - checks
provenance:
    type: dialogue
created_at: 2026-10-01T16:48:03.810642119Z
relationships:
    - to: catalogue/library/libraries-are-the-catalogue
      type: refines
      via: batch
      unconfirmed: true
---

The deploy gate must not compare libraries against their generators, because a hand-fixed library is supposed to diverge and such a check would refuse to deploy the correction just made.
