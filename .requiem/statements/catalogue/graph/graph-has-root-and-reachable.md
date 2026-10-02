---
id: graph-has-root-and-reachable
namespace: catalogue/graph
kind: requirement
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-01T16:48:03.70903341Z
relationships:
    - to: principles/fail-visibly
      type: refines
      via: batch
      unconfirmed: true
    - to: catalogue/graph/depends-on-gates-skills
      type: refines
      via: batch
      unconfirmed: true
---

At least one skill has no dependencies, every skill is reachable from an empty account through the real lockedBy gate, and clearing all but a skill's last level does not open its dependents. Otherwise nothing is open on day one or the gate accepts attendance instead of completion.
