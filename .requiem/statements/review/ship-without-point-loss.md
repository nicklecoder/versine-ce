---
id: ship-without-point-loss
namespace: review
kind: decision
abstract: true
status: active
provenance:
    type: dialogue
created_at: 2026-10-02T00:33:04.012019105Z
relationships:
    - to: review/why-upkeep
      type: refines
      via: batch
---

Review ships first with card tags, the session-start offer and done-for-the-day credit, and no point loss: upkeep decay and everything built on it (lost-to-review on cards, restore on review, re-certification) are left out of the first release, and rating's no-decay rules stay in force. Simulated against the 2026-10-01 server snapshot (commit 3e5eacf), decay as specified reached the student it was designed for on at most one day in four weeks (max 5%), because her forward work always touched a dependent skill, and never reached the student who self-reviews; its cost (four rating overrides, Levels no longer comparable between students) bought almost nothing. The cheaper pull is tried and measured first.
