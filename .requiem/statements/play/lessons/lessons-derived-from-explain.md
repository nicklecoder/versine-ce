---
id: lessons-derived-from-explain
namespace: play/lessons
kind: design
status: active
provenance:
    type: dialogue
created_at: 2026-10-01T16:48:04.285543883Z
relationships:
    - to: catalogue/library/explanation-ends-on-conclusion
      type: depends_on
      via: batch
      unconfirmed: true
---

A lesson is a worked example stepped at the student's pace, derived by splitting the level's explain into steps over the level's own visual, which holds its asking state until the last sentence. Every level gets one with no per-level authoring; a skill may override with lesson(), or a level may point at a video.
