---
id: thousands-comma-read
namespace: play/answers
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T05:32:10.774154935Z
---

The decimal box keeps commas and a slash as typed and reads them on submit: 4,800 and 1,234,567.5 (groups of three) are thousands, as the prompts and explanations write large numbers; a lone comma otherwise, as in 4,8, is a decimal comma, the decimal key on German and French iPhones. Converting every comma to a point while typing made a right 4,800 into 4.8 and marked it wrong with no hint, and silently dropping a slash made −5/4 into −54. A fraction in the decimal box is refused with the hint 'Give it as a decimal, not a fraction: 3/4 is 0.75.' Ambiguity is settled for thousands: a European 4,800 meaning 4.8 is written 4,8.
