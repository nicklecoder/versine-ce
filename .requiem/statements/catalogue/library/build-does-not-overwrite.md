---
id: build-does-not-overwrite
namespace: catalogue/library
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-01T16:48:03.790265869Z
relationships:
    - to: catalogue/library/libraries-are-the-catalogue
      type: refines
      via: batch
      unconfirmed: true
---

build-library.mjs never overwrites an existing library without --force; by default it reports what it would change, so regenerating (and discarding hand corrections) is deliberate.
