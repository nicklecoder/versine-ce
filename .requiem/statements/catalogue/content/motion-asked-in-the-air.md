---
id: motion-asked-in-the-air
namespace: catalogue/content
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-25T09:21:18.55661918Z
---

A thrown ball's height or horizontal distance after t seconds (parametric-polar's Parametric Motion and All Together) is asked only for a t before the ball lands, the landing time being the positive root of h + (v sin θ)t − 16t² = 0. Asked after it, the model keeps counting distance through the ground: 79 of 245 distance rows asked how far a golf ball had gone at 2 s when it landed at 1.3 s, and the answer keyed was the model's, not the ball's. The generator guards every time-based shape, and check-answers.py works the landing time out again and fails any height or distance row whose t is not before it, so the gate catches a dropped guard.
