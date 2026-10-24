---
id: choice-labels-distinct
namespace: catalogue/content
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T20:59:00.897789458Z
relationships:
    - to: catalogue/content/choice-labels-distinct-catalogue-wide
      type: supersedes
      via: link
---

No two options of a choice question may read the same, in any skill. In trig-equations General Solutions a + 4πk decoy printed as 2πk, so the right family appeared twice and a guess was a half; in probability two slips left the same sample list, and in distributions 'plus 2' and 'times 2' on a standard deviation of 2 both read 'It becomes 4'. A wrong option shown twice wastes a decoy. Options built from sets, lists, families or numbers print alike even when their keys differ, so check-answers.py compares the labels themselves, not only the keys, across every library.
