---
id: percent-typed-as-decimal
namespace: play/answers
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T11:17:02.511380652Z
---

A decimal answer flagged percent: true (the box is followed by %) answered with the same amount as a decimal -- 0.34 for 34 -- is refused with '0.34 is the decimal. The question asks for a percent.' rather than a bare 'Not quite', because it is the commonest slip on percent questions and the student has done the arithmetic right. Generators set percent on rows whose answer is a percent.
