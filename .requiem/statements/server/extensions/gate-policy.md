---
id: gate-policy
namespace: server/extensions
kind: design
status: active
provenance:
    type: dialogue
created_at: 2026-10-03T06:40:03.727822983Z
relationships:
    - to: server/extensions/extension-points
      type: refines
      via: batch
    - to: catalogue/graph/depends-on-gates-skills
      type: depends_on
      via: batch
    - to: catalogue/graph/gate-guards-every-route
      type: depends_on
      note: every route that asks whether a skill is open asks through the policy
      via: link
---

One socket decides which skills a student may open: a gate policy receives the skill, the student's progress and the blockers the gate itself names, and returns the blockers that still apply. With no policy -- every home install -- the answer is the gate's, unchanged (catalogue/graph/depends-on-gates-skills), and every place the app asks whether a skill is open asks through it, so a policy cannot be half applied. It exists so another edition can open more of the catalogue, or less, in a setting of its own, such as a demo, without a second copy of the gate; a policy that closes skills explains them with a lock note (server/extensions/lock-note).
