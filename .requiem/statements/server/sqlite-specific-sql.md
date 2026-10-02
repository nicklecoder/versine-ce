---
id: sqlite-specific-sql
namespace: server
kind: decision
status: active
provenance:
    type: dialogue
created_at: 2026-10-02T05:17:25.504064726Z
relationships:
    - to: server/database-engine
      type: supersedes
      via: batch
    - to: server/self-hosted-lan
      type: refines
      via: batch
    - to: server/api-contract
      type: depends_on
      via: batch
---

The community server's SQL stays SQLite-specific and is not kept portable to other databases. A server over other storage implements server/api-contract with its own queries instead of reusing these, so portability would cost every query and buy nothing.
