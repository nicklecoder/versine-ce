---
id: expression-prompts-name-the-form
namespace: catalogue/content
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T03:21:37.860794817Z
relationships:
    - to: play/answers/expr-canonical-order-only
      type: depends_on
      via: link
---

A prompt whose answer is an expression says what form the answer must take -- Collect like terms, Expand, Factor fully, Simplify with positive powers only, in simplest radical form, with the exponent in lowest terms -- whenever more than one equivalent form would be marked differently. Expression answers are judged by canonical form (play/answers/expr-canonical-order-only), so 10a + 14 and 2(5a + 7) are different answers, and a level name is not enough to say which is wanted: in an All Together level it is not shown at all, and the student who types back an equivalent form is marked wrong with no way to know why.
