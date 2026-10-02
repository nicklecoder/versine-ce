---
id: asymmetric-adaptation
namespace: play/clock
kind: design
status: active
provenance:
    type: dialogue
created_at: 2026-10-01T16:48:04.423924428Z
relationships:
    - to: play/clock/clock-self-calibrates
      type: refines
      via: batch
      unconfirmed: true
---

After a trial the clock loosens 15% on a timeout, tightens 10% when more than 20% was left, and stays put on a narrow finish. Asymmetric so a struggling student is helped quickly and a strong one squeezed gently; bounded to 3-40 s per problem and rounded to 5 s.
