---
id: auto-update
namespace: deploy
kind: design
status: active
provenance:
    type: dialogue
created_at: 2026-10-01T16:48:04.603710154Z
relationships:
    - to: principles/working-app-for-a-kid
      type: refines
      via: batch
      unconfirmed: true
---

The server auto-updates at boot and 04:30 via systemd: take a lock, fetch, back up the database with sqlite's backup API (WAL-safe, ten kept), fast-forward only, rebuild only when Dockerfile/requirements/compose change, run the checks, and roll back if /api/health is not healthy within 90 s.
