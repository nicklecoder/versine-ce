---
id: decline-is-success
namespace: deploy
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-01T16:48:04.615353522Z
relationships:
    - to: principles/working-app-for-a-kid
      type: refines
      via: batch
      unconfirmed: true
---

When an update is declined (no remote, no network, diverged branch, nothing new) the script exits 0; non-zero exit is reserved for genuine failures worth looking at.
