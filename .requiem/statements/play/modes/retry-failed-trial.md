---
id: retry-failed-trial
namespace: play/modes
kind: rule
modality: should
status: active
provenance:
    type: dialogue
created_at: 2026-10-01T16:48:04.384079981Z
relationships:
    - to: play/answers/keyboard-first
      type: refines
      via: link
---

A failed Time Trial's summary offers 'Try again' showing the clock the retry will run on, bound to R rather than Enter because the last answer's Enter lands just after the summary appears.
