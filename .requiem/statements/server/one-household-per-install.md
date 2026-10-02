---
id: one-household-per-install
namespace: server
kind: decision
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-02T04:11:53.662892396Z
relationships:
    - to: server/self-hosted-lan
      type: refines
      via: batch
---

The open core serves one household per install: one teacher-run group of students in one database. Serving many separate households from one deployment is not part of the core; a downstream distribution can add it through the core's extension points, so the core stays small and the home-network install stays simple.
