---
id: halfplane-judged-as-region
namespace: play/answers
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T00:04:15.143900442Z
relationships:
    - to: play/answers/line-judged-as-line
      type: refines
      via: link
---

A linear-inequality answer in x and y (the halfplane type) is judged by the half of the plane it keeps, not by its spelling: y < 2x + 1, 2x + 1 > y and 2x − y > −1 are one answer. It is read exactly as a·x + b·y + c against zero, and the sign turns when y's side is divided by a negative, the way a student must do it on paper. An equals sign is refused with a hint, since it names the boundary and not the shading, and so is a curved edge.
