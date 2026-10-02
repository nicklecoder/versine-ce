---
id: preserve-local-edits
namespace: deploy
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-01T16:48:04.627731293Z
relationships:
    - to: principles/working-app-for-a-kid
      type: refines
      via: batch
      unconfirmed: true
---

Local uncommitted edits on the server are stashed around the pull and reapplied, with the carried files logged; if reapplying conflicts or a later step fails, it falls back to the old commit with local changes intact.
