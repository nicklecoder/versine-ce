---
id: edge-only-when-needed-to-do
namespace: catalogue/graph
kind: rule
modality: should
status: active
provenance:
    type: dialogue
created_at: 2026-10-01T16:48:03.734898979Z
relationships:
    - to: catalogue/graph/depends-on-gates-skills
      type: refines
      via: batch
      unconfirmed: true
---

Declare a dependency edge only when the second skill is genuinely needed to do the first; say looser connections in words in the explanation. Because edges gate access, a merely connective edge can bury a beginner skill (Coordinates once sat behind eight skills via Ratio).
