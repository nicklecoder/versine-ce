---
id: review-tags-capped
namespace: review
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-02T00:33:03.944099244Z
relationships:
    - to: review/skill-review-schedule
      type: refines
      via: batch
---

The map shows 'needs review' on at most two cards at once, most overdue first; other due skills wait their turn. A migration or a week away can make many skills due together, and a wall of prompts reads as debt, the fastest way to lose a kid.
