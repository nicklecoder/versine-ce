---
id: generators-are-build-tools
namespace: catalogue/library
kind: rule
modality: must_not
status: active
provenance:
    type: dialogue
created_at: 2026-10-01T16:48:03.771913746Z
relationships:
    - to: catalogue/library/libraries-are-the-catalogue
      type: refines
      via: batch
      unconfirmed: true
---

Generators live in tools/generators/ and nothing the server serves imports them. They write a library's first draft and rebuild one wholesale only for systematic faults or redesigns.
