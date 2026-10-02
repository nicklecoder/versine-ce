---
id: offer-card-atop-map
namespace: review
kind: design
status: active
provenance:
    type: dialogue
created_at: 2026-10-02T14:44:18.791600787Z
relationships:
    - to: review/review-opens-the-day
      type: refines
      via: batch
    - to: server/day-is-local
      type: depends_on
      via: batch
---

The session-start offer is the first card on the map whenever a review is due: it names the most overdue skill and its last level, says that passing also finishes the skill for today, and offers Start (straight into that last level's Time Trial) or Not today. Not today hides the offer until the student's next local day; passing the review removes it. A card rather than a screen after sign-in, so it is the first thing seen without standing in the way of a student who came to do something else.
