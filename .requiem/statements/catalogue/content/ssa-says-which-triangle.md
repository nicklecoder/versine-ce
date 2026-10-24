---
id: ssa-says-which-triangle
namespace: catalogue/content
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T12:07:43.372395278Z
---

In laws-sines-cosines, every Sines: Angle problem (two sides and an angle not between them, solving for an angle with the law of sines) is unambiguous. About 30% of rows are the ambiguous case, two triangles, split between asking for the acute B and the obtuse one, and the prompt says that two triangles fit and names the one meant. The rest have exactly one triangle and the prompt says nothing about it: with one triangle 'find B' has one answer, and a sentence saying 'since a ≥ b there is only one' did the student's check for them. An inverse sine gives only the acute angle, so a question that left the ambiguous case open would have two right answers and mark one of them wrong; check-answers.py builds every B that fits and requires one when no triangle is named and two when one is. The separate How Many Triangles? level asks for the count itself, with an obtuse A in about a quarter of rows, as often with no triangle as with one. Its rows keep a clear of the height b sin A by at least 0.3, unless a equals the height exactly (A = 30°, a = b/2), so the count is never a rounding judgment.
