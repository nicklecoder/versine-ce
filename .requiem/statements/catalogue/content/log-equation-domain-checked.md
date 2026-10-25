---
id: log-equation-domain-checked
namespace: catalogue/content
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-25T00:50:51.209136565Z
relationships:
    - to: catalogue/content/none-offered-on-every-row
      type: refines
      via: link
---

A log equation's answer keeps only the roots at which every log in the question, on both sides and before combining, is of a positive number. Combining logs widens the domain -- log(x − 5) + log(x − 1) becomes log((x − 5)(x − 1)), which also exists at x = 0 where neither log does -- so a root of the combined equation can be extraneous, and the levels mix rows with one solution, two, and none, every prompt offering none as radical-eq's do. check-answers.py clears the logs into a polynomial of its own (logs added multiply, logs subtracted divide, equal logs are of equal numbers), takes its rational zeros, and tests each against every original log, never the generator's chosen root. Exact logs elsewhere in the skill are found from prime factors, log_b v being the one ratio between v's exponents and b's, with logs to one base combined into one product before any is evaluated, so log_6 4 + log_6 9 is read as log_6 36.
