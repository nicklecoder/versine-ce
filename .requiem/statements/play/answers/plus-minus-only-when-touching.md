---
id: plus-minus-only-when-touching
namespace: play/answers
kind: decision
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-25T02:16:35.220859415Z
relationships:
    - to: play/answers/symbols-typed-on-a-keyboard
      type: refines
      via: link
---

In the complex box, ± is typed +- with the two signs touching (2 +- 3i, 2+-3i) or +/-, and a plus and a minus with a space between, 3 + -2i, is plus a negative, 3 − 2i, with the signs combined. Students are taught +- for ±, and a student meaning 3 − 2i types 3 + -2i; reading every +- as ± turned that into a conjugate pair and marked it wrong on every question with one answer. Touching signs straight before the number, 3+-2i, could be either, so on a question whose key is one number, not a pair, it is refused with the reason ('+- touching is read as ±, two numbers, and this question has one answer') rather than marked; on a pair question it is ±. The refusal is decided by the question's key being a pair or not and never by whether either reading is right, so it says nothing about the answer (principles/no-answer-before-commit): every non-pair question in the complex skill is a simplify or conjugate question, where one answer is plain from the question. The preview draws the pair for touching +-, so what is read is shown before it is sent. The session gains a type hook, refuseHint(parsed, spec), for a typing the type reads but cannot be what the question asks for.
