---
id: client-scores-with-cap
namespace: server
kind: design
status: active
provenance:
    type: dialogue
created_at: 2026-10-01T16:48:04.566004481Z
relationships:
    - to: play/comparisons-stay-in-the-group
      type: depends_on
      note: self-scoring is acceptable because no result is compared beyond the group
      via: batch
---

The client scores itself, and the server caps awards as a speed bump against casual cheating, not as security.
