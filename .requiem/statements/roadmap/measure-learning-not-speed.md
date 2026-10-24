---
id: measure-learning-not-speed
namespace: roadmap
kind: question
status: proposed
provenance:
    type: dialogue
created_at: 2026-10-24T14:54:42.756020592Z
relationships:
    - to: roadmap/coverage-then-experiments
      type: depends_on
      via: link
---

Open question: what does an experiment measure as 'successful learning'? First-try accuracy and time per problem are cheap but reward variants that make problems easier now; learning shows as retention and transfer -- accuracy on the same skill days later, and on the skills built on it. Candidates: delayed re-tests (the proposed review/decay mechanics), accuracy on dependent skills, levels finished per hour of practice, and return rate. What hangs on it: which events the server must start recording before experiments begin, so a baseline exists.
