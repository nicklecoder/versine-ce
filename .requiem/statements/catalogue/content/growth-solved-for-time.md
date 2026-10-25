---
id: growth-solved-for-time
namespace: catalogue/content
kind: decision
status: active
provenance:
    type: dialogue
created_at: 2026-10-25T02:16:35.466389439Z
relationships:
    - to: catalogue/content/e-met-before-ln
      type: depends_on
      via: link
---

Solve Exponential Equations asks the time a growth or decay story takes (F-LE.4): savings at a yearly rate until they reach an amount or double, a car losing a percent a year, a medicine or a radioactive element with a half-life, and a town or an investment growing continuously as a·e^(kt). Each is set up as the exponential skill's model, divided through, and solved with ln, the time rounded to the places the question names. These stories are why the level depends on exponential functions' Doubling and Half-Life (the half-life model a(1/2)^(t/h)) and its e and Continuous Growth (a·e^(kt)): solving for the time needs the model those levels build. check-answers.py solves A·B^(t/h) = V or A·e^(kt) = V for t again from the numbers in the question.
