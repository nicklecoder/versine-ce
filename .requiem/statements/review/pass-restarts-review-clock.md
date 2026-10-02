---
id: pass-restarts-review-clock
namespace: review
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-02T00:33:03.889260228Z
relationships:
    - to: review/skill-review-schedule
      type: refines
      via: batch
---

Any pass of a finished skill's last level in a Time Trial restarts its review clock, due or not, but the interval grows at most once per interval: only a pass at least one full interval after the last growth moves it to the next step. A student who replays finished skills unprompted is reviewing and must never be tagged for it, yet daily replays must not inflate the interval. In the 2026-10-01 server snapshot (commit 3e5eacf) one student passed int-addsub's last level on 13 days in four weeks; counting every pass as growth took four skills to the 120-day cap within a month, while this rule kept them at 14-30 days and never tagged that student.
