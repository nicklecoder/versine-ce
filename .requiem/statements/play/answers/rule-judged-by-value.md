---
id: rule-judged-by-value
namespace: play/answers
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-23T23:29:53.833600955Z
relationships:
    - to: play/answers/line-judged-as-line
      type: refines
      via: link
---

An nth-term rule answer (the rule type) is judged by the terms it gives, read exactly as m·n + b, not by its spelling: 3 + 4(n − 1), 4n − 1 and aₙ = 4n − 1 are all accepted for 3, 7, 11, … The formula hands a student the bracketed form and tidying it is not what the level asks, so refusing it would mark a right rule wrong. A rule with a square or power of n is refused with a hint as not an arithmetic rule, rather than marked as a wrong one, the same way a curve is refused where a line is asked.
