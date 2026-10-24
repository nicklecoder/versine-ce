---
id: ssa-only-when-ambiguous
namespace: catalogue/content
kind: design
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T05:11:54.043926187Z
---

congruence marks SSA as not enough only on triangles where it truly is: the marked angle is acute and the side facing it is shorter than the marked side next to it, so a second, different triangle carries the same marks. SSA with a right or obtuse angle, or with the facing side the longer, does fix the triangle, and calling it 'not enough' there would teach something false. A right angle with the hypotenuse and a leg is named HL, not SSA.
