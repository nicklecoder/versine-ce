---
id: pin-threat-model
namespace: server
kind: rule
modality: must
status: active
tags:
    - auth
provenance:
    type: dialogue
created_at: 2026-10-01T16:48:04.555152953Z
relationships:
    - to: server/self-hosted-lan
      type: depends_on
      via: batch
      unconfirmed: true
---

PINs are hashed and rate-limited after five wrong tries in 60 seconds: enough to stop a bored sibling, which is the real threat model on a home network.
