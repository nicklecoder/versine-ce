---
id: poly-graph-read-from-heights
namespace: catalogue/content
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T23:03:22.272984443Z
relationships:
    - to: catalogue/library/strategy-not-from-surface
      type: refines
      via: link
---

A poly-functions graph is drawn from its polynomial and every height it shows at a whole-number x inside the window is listed in the row's text, so the drawing and the text say the same thing. check-answers.py never reads the generator's polynomial for a graph question: it rebuilds the polynomial from those heights by interpolation, takes a sketch option as right only when it hits every listed height, counts turning points from sign changes of the derivative, and takes the least degree from that count with its parity fixed by the ends. A polynomial on a graph level has degree at most the number of listed heights less one, so the heights pin it down.
