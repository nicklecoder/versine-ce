---
id: explain-true-for-row
namespace: catalogue/content
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T03:12:24.114427638Z
relationships:
    - to: catalogue/content/read-generated-problems
      type: refines
      via: link
---

An explanation must be true for the exact numbers in its own row. A general remark that a generator appends (more digits do not make a decimal bigger; the answer is bigger than what you divided; you cannot multiply the whole and the part separately; the reciprocal of a negative is negative) is emitted only when its condition holds for that problem, and working shown in it must be correct arithmetic, never a sign dropped to match the asked-for size. Remarks appended unconditionally were false in hundreds of rows each (review October 2026), and a false sentence in the walkthrough is taught at the moment a student most needs the reasoning.
