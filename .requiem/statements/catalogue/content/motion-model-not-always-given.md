---
id: motion-model-not-always-given
namespace: catalogue/content
kind: rule
modality: should
status: active
provenance:
    type: dialogue
created_at: 2026-10-25T09:21:18.65542148Z
relationships:
    - to: catalogue/content/model-equation-only-to-evaluate
      type: refines
      via: batch
---

Parametric Motion prints the path x = (v cos θ)t, y = h + (v sin θ)t − 16t² in about half of its numeric rows; the others give only the speed, the angle and the height, and say that gravity pulls the ball down 16t² ft in t seconds, so the student writes the model before using it; and a quarter of the level asks which pair of equations models a throw, four options crossing two slips (cos and sin traded between x and y, gravity's whole 32 where half of it belongs). TEKS P.3C asks students to use parametric equations to model problems, and a model printed in every prompt reduced the level to substitution. Besides height, distance, landing time and time at the top, it asks the range (how far when it lands) and the greatest height. The text of a row whose path is printed ends 'with its path', and check-answers.py holds the prompt to it.
