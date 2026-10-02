---
id: keyboard-first
namespace: play/answers
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-01T16:48:04.161910989Z
---

The answer field keeps focus for the whole run: buttons suppress mousedown, clicking the card or any stray keystroke returns focus. During a run Enter submits and skips the reveal, ? explains, Esc quits. On the summary Enter or Esc dismisses back to the skill (Enter is ignored for the first 700 ms so the last answer's keystroke cannot skip the score), and R retries a failed Time Trial.
