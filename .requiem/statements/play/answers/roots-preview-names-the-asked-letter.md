---
id: roots-preview-names-the-asked-letter
namespace: play/answers
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-25T09:21:19.147888302Z
relationships:
    - to: play/answers/roots-judged-exactly
      type: refines
      via: batch
---

The roots box's preview names the letter the question asks for when the student types a bare number: its answer spec carries the letter, so a polar r previews r = 2√5, a y-coordinate y = −3 and a vector's magnitude |v| = 25, not x = for everything as it did when the preview defaulted to x. Generators key each exact answer with its letter (r, x, y or |v|), which also makes the shown accepted answer r = 3√10 rather than x = 3√10; a letter typed is still shown as typed. check-answers.py fails a polar r, x or y and a magnitude keyed with another letter.
