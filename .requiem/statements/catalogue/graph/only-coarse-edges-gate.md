---
id: only-coarse-edges-gate
namespace: catalogue/graph
kind: rule
modality: must
status: active
tags:
    - gate
provenance:
    type: dialogue
created_at: 2026-10-01T16:48:03.658489172Z
relationships:
    - to: catalogue/graph/depends-on-gates-skills
      type: refines
      via: batch
      unconfirmed: true
---

Access is decided by coarse skill edges alone; a level-precise edge never gates a skill, or one level deep inside a skill could close the whole thing. A level may only depend on skills its parent skill declares, so precise edges never contradict coarse ones.
