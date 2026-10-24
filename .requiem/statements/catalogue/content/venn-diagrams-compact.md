---
id: venn-diagrams-compact
namespace: catalogue/content
kind: design
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T10:18:02.564008989Z
---

Compound probability opens with a Venn Diagrams level that the Phase 3 plan did not list. S-CP.1 describes events as unions, intersections and complements, and the two circles show the overlap that the addition rule takes off once. The level's library is capped at 500 problems (libraryCap), and each diagram is drawn with whole-number points on an 80 by 58 grid with 28 points per circle. A Venn is the largest visual in the probability skills, so this keeps it to about 1.4 KB a problem, which matters with the libraries near 350 MB. On reveal, the diagram adds the regions it counted as answer text, for example 12 + 6 = 18 of 29. It does not shade the regions, which would need region polygons for unions and holes.
