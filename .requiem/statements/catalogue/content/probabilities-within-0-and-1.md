---
id: probabilities-within-0-and-1
namespace: catalogue/content
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T13:27:45.789369456Z
---

No generated probability may lie outside [0, 1], and mutually exclusive events must have P(A) + P(B) at most 1; in the addition rule, P(A and B) must be at most the smaller of P(A) and P(B), and P(A or B) at most 1. A review found exclusive events with P(A) + P(B) = 1.06, an impossible setup. The checker asserts every probability answer in the probability skills lies in [0, 1], so a generator change that breaks this fails the gate.
