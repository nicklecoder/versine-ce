---
id: expression-name-prefix-stripped
namespace: play/answers
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T21:06:32.474373244Z
relationships:
    - to: play/answers/permissive-input-canonical-display
      type: refines
      via: batch
---

An expression box (expr and equivalent) takes off a leading 'y =', 'f(x) =' or 'f⁻¹(x) =' (also f^-1(x), and any one-letter function of one letter) before reading the expression, the way the rule type takes off aₙ =: that is how the answer is written on paper, and the question already named what the expression is. Checked when it was added: no level asks for an equation in an expression box (no expr answer contains '='), so the name never carries meaning there; levels that want an equation use the linear or halfplane types, which read their own equals sign.
