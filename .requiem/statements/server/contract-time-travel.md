---
id: contract-time-travel
namespace: server
kind: design
status: active
provenance:
    type: dialogue
created_at: 2026-10-03T06:23:47.517485206Z
relationships:
    - to: server/api-contract
      type: refines
      via: batch
    - to: server/contract-edition-adapter
      type: refines
      via: batch
---

Rules that unfold over days -- review coming due, the interval growing, credit from dependent work, the cap on tags, review health -- are checked by an optional time-travel suite in the contract, for editions whose adapter can move a student's history into the past (Edition.age). Over HTTP alone a suite cannot make a week pass, so these rules were checked only against the community server's own database; with the hook, any server is held to the same review timeline, which is how server behaviour is pinned without sharing server code (server/api-contract).
