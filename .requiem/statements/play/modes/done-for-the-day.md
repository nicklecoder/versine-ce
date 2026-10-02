---
id: done-for-the-day
namespace: play/modes
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-01T16:48:04.35864679Z
relationships:
    - to: catalogue/structure/last-level-mixes-all
      type: depends_on
      via: batch
      unconfirmed: true
    - to: server/day-is-local
      type: depends_on
      via: link
---

A skill is done for the day only when its last level is cleared in a Time Trial; practice, practising the last level untimed, or a failed trial do not count. The streak counts consecutive finished days, not days touched.
