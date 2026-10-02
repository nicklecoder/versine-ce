---
id: typed-answers-not-strings
namespace: play/answers
kind: design
status: active
provenance:
    type: dialogue
created_at: 2026-10-01T16:48:04.016617017Z
---

Answers are typed (int, frac, mixed, decimal, choice, expr) and compared by type in web/math/answer.js, never string-compared; the input widget follows the problem, not the skill.
