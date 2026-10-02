---
id: api-contract
namespace: server
kind: design
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-02T05:17:25.483717269Z
relationships:
    - to: server/one-household-per-install
      type: depends_on
      via: batch
---

The browser app talks to its server only through a documented HTTP API, and the core ships a contract test suite that any server implementing that API must pass; the community server runs it in CI. Server behaviour the client relies on (done-for-the-day, clock calibration, score caps, review scheduling) is pinned by contract tests rather than by sharing server code. The product lives in the browser app and the skills library, about 7,700 lines and the whole catalogue against a server of about 1,150 lines and 15 endpoints, so a separately written server over different storage reuses everything that matters without forking it. The contract suite speaks plain HTTP using only the Python standard library, so it can run against any server and adds no dependency (server/no-new-prod-deps-for-tests).
