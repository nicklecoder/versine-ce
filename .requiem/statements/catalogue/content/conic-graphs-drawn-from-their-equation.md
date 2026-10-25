---
id: conic-graphs-drawn-from-their-equation
namespace: catalogue/content
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-25T07:06:49.810898251Z
relationships:
    - to: catalogue/content/wave-graphs-drawn-from-their-equation
      type: refines
      via: link
    - to: catalogue/visuals/curves-split-at-window
      type: depends_on
      via: link
---

A conic drawn on the plane is the student's only copy of its equation, so check-answers.py reads every conic equation back as a polynomial in x and y off a grid, never from the center and squares it was built from, and holds the drawing to it: every point of the curve lies on the equation (value over slope within 0.01), each vertex is on the drawing, and once answered every dot is the focus, vertex or center its label names and every dashed line is the directrix or an asymptote. An ellipse and a hyperbola are walked by an angle or a hyperbolic parameter and a parabola by a parameter along its axis, each cut at the window's edge, since none is a function of x. In Match the Graph the key is the one option every drawn point lies on, found from the picture; the four options are two slips crossed (the shape turned: a² and b² swapped, the other term positive, or 4p's sign; and the center's signs turned), and since the same four equations are offered for four different graphs, the row's text names the drawn center and vertices (or vertex and focus) so the four are four problems.
