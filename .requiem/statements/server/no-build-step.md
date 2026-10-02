---
id: no-build-step
namespace: server
kind: rule
modality: must_not
status: active
provenance:
    type: dialogue
created_at: 2026-10-01T16:48:04.529109432Z
relationships:
    - to: server/self-hosted-lan
      type: refines
      via: batch
      unconfirmed: true
---

The frontend has no build step or toolchain: the browser loads ES modules from web/ directly, so a change is live on refresh.
