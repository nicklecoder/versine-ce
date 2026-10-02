---
id: depends-on-gates-skills
namespace: catalogue/graph
kind: rule
modality: must
status: active
tags:
    - gate
provenance:
    type: dialogue
created_at: 2026-10-01T16:48:03.643788777Z
relationships:
    - to: play/modes/done-for-the-day
      type: depends_on
      note: '''finished'' means last level cleared in a Time Trial'
      via: batch
      unconfirmed: true
---

A skill is closed until every skill it depends on is finished, meaning that skill's last level cleared in a Time Trial. Gating acts as a placement test that is also practice: cheap for a confident student, and informative if it is not quick.
