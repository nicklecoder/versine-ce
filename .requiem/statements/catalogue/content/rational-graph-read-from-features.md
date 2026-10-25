---
id: rational-graph-read-from-features
namespace: catalogue/content
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-25T02:18:51.746715199Z
relationships:
    - to: catalogue/content/poly-graph-read-from-heights
      type: refines
      via: link
---

rational-functions Match the Graph draws f and asks which of four formulas it is. The picture shows the curve, cut at the window's edge and at the hole, the x-intercepts as labelled dots and the hole as an open circle; the asymptotes are not drawn until an answer is in, when the dashed lines x = v and y = level and the hole's coordinates appear, because the question is to read them from the curve. The row's text lists exactly those readings: the x-intercepts, the holes, each vertical asymptote with the way f goes just left and just right of it, and the level far out. check-answers.py works each option's readings out from its formula alone (zeros where the bottom is not 0, poles and holes by multiplicity, the sides by exact values a millionth either side, the level at x = ±10^12), requires exactly one to match, and holds the drawing to that one: every curve point on it to within 0.06, the dots at its intercepts, the circles at its holes and heights, and the revealed dashed lines at its asymptotes. Every feature is at least two apart so each is plain on the grid. Wrong options are two of four slips crossed (decoys-crossed-not-centred): the leading sign turned, a top and a bottom zero swapped, an asymptote's factor mirrored, the hole and an asymptote swapped.
