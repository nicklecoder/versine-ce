---
id: checks-gate-deploys
namespace: deploy
kind: rule
modality: must
status: active
tags:
    - checks
provenance:
    type: dialogue
created_at: 2026-10-01T16:48:04.661381097Z
relationships:
    - to: principles/fail-visibly
      type: refines
      via: batch
      unconfirmed: true
    - to: principles/working-app-for-a-kid
      type: refines
      via: batch
      unconfirmed: true
---

update.sh runs every check (library, catalogue, reveal, parser, answers, session, server) before starting a new version and rolls back on failure. A check needing a missing runtime is skipped, never reported as a broken catalogue; the Python library check always runs.
