---
id: begun-skill-stays-open
namespace: catalogue/graph
kind: rule
modality: must
status: active
tags:
    - gate
provenance:
    type: dialogue
created_at: 2026-10-01T16:48:03.669710524Z
relationships:
    - to: catalogue/graph/depends-on-gates-skills
      type: refines
      via: batch
      unconfirmed: true
---

A skill a student has already begun stays open even if a new dependency is later added to it. Adding a dependency is normal catalogue work and must not retroactively lock someone out of work in progress; since locked skills cannot be started, this cannot leak.
