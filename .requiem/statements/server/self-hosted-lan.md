---
id: self-hosted-lan
namespace: server
kind: design
status: active
provenance:
    type: dialogue
created_at: 2026-10-01T16:48:04.516790498Z
---

Versine runs on one machine on the home network (Docker Compose, FastAPI + SQLite, no ORM). Devices reach it with a browser and install nothing; the frontend is vanilla ES modules with no build step, vendored fonts, offline-capable.
