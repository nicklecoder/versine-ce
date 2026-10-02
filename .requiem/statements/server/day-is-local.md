---
id: day-is-local
namespace: server
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-02T05:28:20.294686257Z
relationships:
    - to: server/api-contract
      type: depends_on
      via: link
---

A 'day' (done for the day, streaks, practice and completed days, the streak strip, active days for review) is the student's local calendar day in the time zone their browser reports with every request, never the UTC date and never the server's own zone. Timestamps stay stored in UTC; one helper turns a timestamp into a local day and is used by both SQL and Python, so the two can never disagree. A server running in UTC (as the Docker container does) otherwise counted evening play toward the next day, and SQL using UTC dates beside Python using the server's zone made a check fail every evening. Taking the zone from the browser needs no configuration on a home server and stays right for households in different zones.
