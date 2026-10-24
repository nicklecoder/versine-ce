---
id: graph-pieces-drawn-as-told
namespace: catalogue/content
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T17:13:43.487308683Z
relationships:
    - to: catalogue/library/every-level-checked
      type: refines
      via: link
---

When a domain or range is read from a graph (domain-range's From a Graph and piecewise graphs), the graph is the student's only copy of the function. So check-answers.py derives the answer from the pieces written in the problem's text and then checks that the drawn visual is exactly those pieces: a curve through each piece's corners in order, and at each end a filled dot, an open dot or an arrowhead as the text says, with no extra dots. Without that check a correct answer could be keyed to a function the picture does not show, and a dot drawn open where the text meant closed would put the endpoint in or out of the set unseen. Refines every-level-checked.
