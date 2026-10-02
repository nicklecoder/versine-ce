---
id: database-engine
namespace: server
kind: question
status: superseded
provenance:
    type: dialogue
created_at: 2026-10-02T04:10:12.141640723Z
---

Open question: does the core's SQL stay SQLite-specific, or is it kept portable to Postgres? What hangs on it: server/self-hosted-lan and server/extensions/database-per-request assume SQLite files, while a downstream distribution may want a database server with managed backups, point-in-time restore and failover; portability would make every query carry it.
