---
id: lock-note
namespace: server/extensions
kind: design
modality: may
status: active
provenance:
    type: dialogue
created_at: 2026-10-04T01:56:43.835672841Z
relationships:
    - to: server/extensions/gate-policy
      type: refines
      via: link
---

An extension may supply the sentence that explains why a skill is locked, through setLockNote, and the map's tile and the skill screen then show that sentence instead of 'opens once you have finished X' and its buttons to go there. A gate policy that closes skills for a reason of its own -- not unfinished prerequisites -- would otherwise be described by an untrue sentence. With no note, or a note that returns null, every lock reads exactly as the gate says, so a home install is unchanged.
