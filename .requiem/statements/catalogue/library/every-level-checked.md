---
id: every-level-checked
namespace: catalogue/library
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T01:50:39.502839977Z
---

Every level in the library must have at least one answer that check-answers.py re-derives, and the checker fails a level whose texts no rule reads. A rule keyed on a text prefix goes silent, rather than failing, when the generator spells the prefix differently: Spot the Triple's 212 problems passed unread because the rule expected a setting in brackets that those texts did not carry. Levels built before this rule are named in NOT_YET_READ in check-answers.py; the list can only shrink, since a listed level that gains a reader fails until it is taken off.
