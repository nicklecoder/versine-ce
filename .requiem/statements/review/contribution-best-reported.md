---
id: contribution-best-reported
namespace: review
kind: design
status: active
provenance:
    type: dialogue
created_at: 2026-10-03T01:46:34.266010514Z
relationships:
    - to: review/card-shows-points
      type: refines
      via: batch
    - to: play/comparisons-stay-in-the-group
      type: depends_on
      via: batch
    - to: server/server-has-no-js
      type: depends_on
      via: batch
---

A skill's best-ever contribution to the Level is reported by the browser, which is where contributions are computed (rating.js, from reference paces in the JavaScript catalogue the server cannot read), and the server keeps the maximum per student per skill. The first report after this ships seeds it from the current contribution. It is self-reported and the server only bounds it (a skill the catalogue has, and a finite, non-negative value under a generous ceiling of 50 per level, where no level today is worth more than about 11), which is enough because a contribution is only ever compared within the family (play/comparisons-stay-in-the-group).
