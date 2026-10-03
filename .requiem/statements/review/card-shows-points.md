---
id: card-shows-points
namespace: review
kind: design
status: active
provenance:
    type: dialogue
created_at: 2026-10-01T17:24:15.587706757Z
relationships:
    - to: review/why-upkeep
      type: refines
      via: batch
      unconfirmed: true
    - to: principles/one-name-per-thing
      type: refines
      via: batch
---

Each map card shows, in Level units, what that skill contributes to the student's Level now, out of the most it could ('+7.4 of 10.2'), and the best it has ever contributed when that is higher. A skill with no cleared level shows 'worth up to +X' instead, deeper skills visibly worth more, to pull students forward; locked skills show it too, dimmed, so the value of what lies ahead is visible past the next open skill. Level units rather than 'points', because points and personal best already mean a run's score (the summary's 'New personal best', the leaderboard), and one card must not use one word for two things. The best is stored persistently, not recomputed.
