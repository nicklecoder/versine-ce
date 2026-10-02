---
id: review-opens-the-day
namespace: review
kind: design
status: active
provenance:
    type: dialogue
created_at: 2026-10-02T00:33:03.973828257Z
relationships:
    - to: review/why-upkeep
      type: refines
      via: batch
    - to: play/modes/done-for-the-day
      type: depends_on
      via: batch
    - to: review/skill-review-schedule
      type: depends_on
      via: batch
    - to: roadmap/daily-mix
      type: refines
      note: the session-start review offer is a first, single-skill form of the daily mix
      via: batch
---

When a student starts a session with a skill due for review, the most overdue one is offered first as a one-tap Time Trial of its last level, and passing it ticks that skill done for the day like any last-level pass. Review is pulled in by the start of the session and by done-for-the-day, a reward the self-reviewing student visibly chases, rather than pushed by a penalty. The students play every school morning, so a prompt at session start reaches the one who never goes back to a finished skill, where a card she has no reason to look at may not.
