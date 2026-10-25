---
id: no-skip-in-time-trials
namespace: play/modes
kind: rule
modality: must_not
status: active
provenance:
    type: dialogue
created_at: 2026-10-25T04:43:17.626822572Z
relationships:
    - to: play/modes/skip-in-trials
      type: supersedes
      via: link
---

A Time Trial does not let a student skip a problem. Needing to skip means the student does not yet understand that question, and failing to answer it is part of failing to pass the trial. Practice is where a stuck student gets help (the walkthrough after three misses). This may be revisited later, depending on what trials with real users show.
