---
id: restart-once-per-update
namespace: deploy
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-01T16:48:04.647575568Z
relationships:
    - to: principles/working-app-for-a-kid
      type: refines
      via: batch
      unconfirmed: true
---

Each update recreates the container exactly once, stamped with the commit via VERSINE_VERSION so /api/health reports what is actually serving; the exit trap acts only when nothing is serving.
