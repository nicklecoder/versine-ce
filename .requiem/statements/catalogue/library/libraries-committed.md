---
id: libraries-committed
namespace: catalogue/library
kind: rule
modality: must
abstract: true
status: active
provenance:
    type: dialogue
created_at: 2026-10-25T04:43:17.21631093Z
---

The built problem libraries (web/library/*.json and the manifest) stay committed in the repo, not built at deploy. A checkout is playable as it stands, every problem a student can be dealt is reviewable in history, and build-library.mjs --check holds the committed files to the generators.
