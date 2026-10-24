---
id: within-skill-choice-not-strategy
namespace: catalogue/strategy
kind: rule
modality: should
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T02:50:03.804084459Z
relationships:
    - to: catalogue/strategy/never-first-meeting
      type: refines
      via: link
---

A choice between methods or measures that are all taught in the same skill is a plain choice level, not a strategy level, even where the plan tagged it (strategy). A strategy level must name, by a level-precise dependsOn, an earlier skill whose need it arbitrates; inventing one to satisfy that would put a false gating edge in the graph. data-center's Which Measure? (mean or median, IQR or MAD) is the first case: every measure it chooses between is met in data-center itself.
