---
id: meeting-picture-on-reveal
namespace: catalogue/visuals
kind: design
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-25T07:23:01.719385378Z
relationships:
    - to: play/visuals/reveal-is-structural
      type: refines
      via: link
    - to: catalogue/visuals/curves-split-at-window
      type: depends_on
      via: link
---

Where two curves meet (systems-2's Line Meets Parabola, Line Meets Circle and Two Curves, and their rows in All Together), the answer brings a plane with both curves, each in its own color, and the meeting points marked in gold and labeled when they are far enough apart to read; all of it is in the answer layer, since curves drawn while the question is open would let the lattice meeting points be read off the grid, which answers the question without the algebra. The window comes from what the question gives, never from the answer: a circle's own box with a unit to spare and at least 8 across (and the origin, so the axes are drawn), or one window shared by the whole level for parabolas (x from −8 to 8, y from −10 to 10) and for xy = k (−10 to 10 both ways); the level's meeting points are built to fall inside it, and a parabola that never reaches it is not dealt, so the picture always has both curves. Choice rows (How Many Intersections, No Solution or Infinitely Many) carry no picture. check-answers.py draws nothing before the answer, finds every stretch on one of the text's two equations and inside the window, ended on its edge unless it closes on itself, both curves drawn, and the marked points exactly the answer's.
