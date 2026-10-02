---
id: published-vocabularies
namespace: catalogue/library
kind: rule
modality: must
status: active
tags:
    - checks
provenance:
    type: dialogue
created_at: 2026-10-01T16:48:03.845825577Z
relationships:
    - to: principles/fail-visibly
      type: refines
      via: batch
      unconfirmed: true
    - to: server/server-has-no-js
      type: depends_on
      via: batch
      unconfirmed: true
---

Answer types, visual schemas, prompt term kinds and blank fields are published from the code that defines them into web/library/schemas.json, and the Python deploy gate validates against that, never a hand-maintained copy that drifts.
