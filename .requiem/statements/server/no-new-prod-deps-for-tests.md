---
id: no-new-prod-deps-for-tests
namespace: server
kind: rule
modality: must_not
status: active
tags:
    - checks
provenance:
    type: dialogue
created_at: 2026-10-01T16:48:04.591800385Z
---

Do not add production dependencies just for testing (e.g. httpx for FastAPI's TestClient); checks call endpoints as plain functions.
