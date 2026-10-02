---
id: graph-acyclic
namespace: catalogue/graph
kind: requirement
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-01T16:48:03.696197554Z
relationships:
    - to: principles/fail-visibly
      type: refines
      via: batch
      unconfirmed: true
---

The skill and level graphs must be acyclic. Map ordering, the gate and depthOf all walk these edges and mean nothing on a loop. validateGraph reports cycles by name, check-catalogue fails on them (and peels the level graph via Kahn's algorithm as a second proof), and build-library refuses to write anything.
