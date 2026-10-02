---
id: migrate-without-loss
namespace: review
kind: requirement
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-01T17:24:15.613273276Z
relationships:
    - to: review/skill-review-schedule
      type: depends_on
      via: batch
---

Deploying review must not cost any existing student points or access. Existing finished skills get schedules seeded from the deploy date (not from historical last-played dates, which would make most skills overdue at once), staggered oldest-first so reviews come due gradually; personal best is seeded from the current contribution; mastered progress is untouched. The migration is idempotent, runs after update.sh's pre-update backup, and check-server.py simulates upgrading a pre-review database.
