---
id: server-has-no-js
namespace: server
kind: rule
modality: must_not
status: active
provenance:
    type: dialogue
created_at: 2026-10-01T16:48:04.578590546Z
---

The Python server and deploy gate must not need a JavaScript runtime; what they need from the JS catalogue (level order, schemas) is published into the library manifest.
