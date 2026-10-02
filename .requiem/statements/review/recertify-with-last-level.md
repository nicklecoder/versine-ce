---
id: recertify-with-last-level
namespace: review
kind: rule
modality: must
status: proposed
provenance:
    type: dialogue
created_at: 2026-10-01T17:24:15.539793595Z
relationships:
    - to: review/upkeep-decay
      type: refines
      via: batch
      unconfirmed: true
---

A skill whose contribution decays to zero needs re-certifying: passing its last level in a Time Trial restores it. The earlier levels are not repeated, because the last level mixes them all and proves the skill, the same reasoning the gate uses.
