---
id: venn-diagrams-compact
namespace: catalogue/content
kind: design
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T10:18:02.564008989Z
---

Compound probability opens with a Venn Diagrams level that the Phase 3 plan did not list. S-CP.1 describes events as unions, intersections and complements, and the two circles show the overlap that the addition rule takes off once. The level's library is capped at 500 problems (libraryCap). Each circle is drawn with 48 points to one decimal place, so it reads as round at desktop width, on an 80 by 58 grid. The frame is drawn muted, the circles in one cool tone and the counts in the text color, so neither event looks like the answer before reveal. A Venn is the largest visual in the probability skills, at about 2.3 KB a problem (the level about 1.15 MB), which matters with the libraries near 350 MB. On reveal, the diagram adds the regions it counted as answer text, for example 12 + 6 = 18 of 29. It does not shade the regions, which would need region polygons for unions and holes.
