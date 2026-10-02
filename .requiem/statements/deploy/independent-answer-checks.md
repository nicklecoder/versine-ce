---
id: independent-answer-checks
namespace: deploy
kind: rule
modality: must
status: active
tags:
    - checks
provenance:
    type: dialogue
created_at: 2026-10-01T16:48:04.674928496Z
relationships:
    - to: principles/fail-visibly
      type: refines
      via: batch
      unconfirmed: true
---

check-answers.py re-derives answers in exact rationals by routes independent of the generators, so a generator agreeing with itself is never the only evidence a row is right. Coverage gaps where rows silently fall out of checking count as failures to fix.
