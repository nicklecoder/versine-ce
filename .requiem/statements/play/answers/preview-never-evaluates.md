---
id: preview-never-evaluates
namespace: play/answers
kind: rule
modality: must_not
status: active
tags:
    - reveal
provenance:
    type: dialogue
created_at: 2026-10-01T16:48:04.122278109Z
relationships:
    - to: principles/no-answer-before-commit
      type: refines
      via: batch
      unconfirmed: true
    - to: play/answers/free-entry-sparingly
      type: refines
      via: batch
      unconfirmed: true
---

The free-entry live preview renders structure only and never evaluates or simplifies (4/8 stays 4/8, 2+3 stays 2+3); the parser returns a tree, never a value. A preview that simplifies does the student's work.
