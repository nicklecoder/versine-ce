---
id: skill-tags-replace-level-flags
namespace: review
kind: decision
status: active
provenance:
    type: dialogue
created_at: 2026-10-02T14:44:18.761713358Z
relationships:
    - to: review/level-staleness-vs-skill-review
      type: supersedes
      via: batch
    - to: rating/review-not-decay
      type: supersedes
      via: batch
    - to: review/skill-review-schedule
      type: refines
      via: batch
    - to: principles/one-name-per-thing
      type: refines
      via: batch
---

Per-skill review tags are the only review mark: the per-level fresh/due/stale flags on Level-breakdown rows, the 'levels not practised lately' banner and level staleness itself are removed, and the warm-up on a skill page now points at a direct dependency that is due for review rather than a level untouched for a while. Two different 'due' marks on one screen, one of them also labelled 'needs review', would break one-name-per-thing, and the level flags lived in the Level panel that the student who finishes and moves on does not read. Time passing still never lowers the Level (rating/no-calendar-decay).
