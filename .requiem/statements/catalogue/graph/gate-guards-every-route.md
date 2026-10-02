---
id: gate-guards-every-route
namespace: catalogue/graph
kind: rule
modality: must
status: active
tags:
    - gate
provenance:
    type: dialogue
created_at: 2026-10-01T16:48:03.681713899Z
relationships:
    - to: catalogue/graph/depends-on-gates-skills
      type: refines
      via: batch
      unconfirmed: true
---

The skill gate is enforced in the router's dispatch, so every route into a locked skill (map, skill, mode, play, bookmarked URL) lands on the same explanation. Teachers are exempt because they inspect the catalogue rather than work through it.
