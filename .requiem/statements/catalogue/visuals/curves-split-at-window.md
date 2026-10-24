---
id: curves-split-at-window
namespace: catalogue/visuals
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T03:07:57.774814135Z
relationships:
    - to: play/visuals/renderers-compute-nothing
      type: refines
      via: link
---

A curve on the plane is given as one polyline per stretch that lies inside the grid, each ending exactly on the window's edge (found by bisection on the function), never as one polyline of the in-window samples. One list joins the last sample before a stretch leaves the window to the first after it returns, so a parabola whose vertex is off the grid was drawn with a long flat floor it does not have -- a false shape in the picture meant to teach the shape. Ending on the edge, rather than keeping a sample past it, also keeps the line from running past the plot frame, since the plane renderer does not clip. The splitting is done in the generator, consistent with renderers computing nothing.
