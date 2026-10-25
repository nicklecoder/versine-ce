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

Every problem in the library must have its answer re-derived by some rule in check-answers.py, and the checker fails any problem no rule reads, naming its text. A rule keyed on a text prefix goes silent, rather than failing, when the generator spells the prefix differently: Spot the Triple's 212 problems passed unread because the rule expected a setting in brackets that those texts did not carry. Checking per level was not enough, since one new shape of question in a level whose other shapes are read would pass the same way. Prose strategy levels are read through a table of situations (numbers taken out) mapped to the option each calls for, written from the situation rather than from the generator; a situation missing from the table fails.
