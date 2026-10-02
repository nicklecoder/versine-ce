---
id: no-downstream-stubs
namespace: server/extensions
kind: rule
modality: must_not
abstract: true
status: proposed
provenance:
    type: dialogue
created_at: 2026-10-02T04:10:12.179253122Z
relationships:
    - to: server/extensions/extension-points
      type: refines
      via: batch
---

The core must not contain stubs, disabled screens or placeholders for features that only a downstream distribution provides: the open core is a complete product on its own, and extension points are the only seam.
