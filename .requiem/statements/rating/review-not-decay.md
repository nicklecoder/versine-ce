---
id: review-not-decay
namespace: rating
kind: design
status: superseded
provenance:
    type: dialogue
created_at: 2026-10-01T16:48:04.492898411Z
relationships:
    - to: rating/no-calendar-decay
      type: refines
      via: batch
      unconfirmed: true
---

A cleared level is fresh, due (14 days untouched) or stale (35 days). Staleness never affects the Level; it drives map flags and a one-tap warm-up on a stale direct dependency. These are prompts, never locks.
