---
id: never-first-meeting
namespace: catalogue/strategy
kind: rule
modality: must_not
status: active
provenance:
    type: dialogue
created_at: 2026-10-01T16:48:03.995019294Z
relationships:
    - to: catalogue/strategy/strategy-levels
      type: refines
      via: batch
      unconfirmed: true
---

A strategy level must never be where a topic is first met; if it needs a topic, its skill depends on it and the level declares a level-precise dependsOn naming the skill that creates the need. validateGraph enforces this.
