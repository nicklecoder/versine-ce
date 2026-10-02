---
id: renderers-compute-nothing
namespace: play/visuals
kind: rule
modality: must_not
status: active
tags:
    - reveal
provenance:
    type: dialogue
created_at: 2026-10-01T16:48:04.223424073Z
relationships:
    - to: principles/no-answer-before-commit
      type: refines
      via: batch
      unconfirmed: true
---

Renderers draw only the data given; curves are polylines from the catalogue, never functions evaluated by the renderer, so a picture cannot quietly solve the problem.
