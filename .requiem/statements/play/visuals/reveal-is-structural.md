---
id: reveal-is-structural
namespace: play/visuals
kind: rule
modality: must
status: active
tags:
    - reveal
provenance:
    type: dialogue
created_at: 2026-10-01T16:48:04.198957786Z
relationships:
    - to: principles/no-answer-before-commit
      type: refines
      via: batch
      unconfirmed: true
    - to: play/visuals/visual-registry
      type: depends_on
      via: batch
      unconfirmed: true
---

Answer-bearing schema fields are marked phase: 'answer' and stripped by visuals.js before the renderer runs, so a renderer cannot leak what it was never given. check-reveal.mjs renders every problem asking and revealed and checks nothing answer-bearing reached the renderer.
