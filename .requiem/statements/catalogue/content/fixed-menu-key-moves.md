---
id: fixed-menu-key-moves
namespace: catalogue/content
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-25T04:31:50.361042409Z
relationships:
    - to: catalogue/content/decoys-cross-two-slips
      type: refines
      note: 'what the rule leaves fixed menus to: the key moves among the menu''s labels'
      via: link
    - to: catalogue/library/strategy-not-from-surface
      type: refines
      via: link
---

On a fixed menu -- choice labels that recur across a level's rows with the key moving among them (Higher / Lower / Equal, the five likelihood words, They are the same, Not enough, Up 3 / Down 3 / Left 3 / Right 3, True / False / It could be either) -- every option is the key in some rows, and none is the key far more often than its share unless the mathematics makes it so, because the menu is read before the question: an option never right is struck unread and one nearly always right is picked unread, and either way a test-wise student beats a guess without the mathematics. Probability's more-trials menu keyed 'get closer' in every row; transformations-f's Up and Down offered left and right and never keyed them; reasoning keyed 'It could be either' in 68-75% of its truth-follows rows and never a negated clause on Hypothesis & Conclusion; congruence keyed Not enough in 44% of Enough or Not and SSS, ASA and HL in 8% each, and its Missing Fact offered parts of the wrong kind, which the criterion's letters ruled out. The key is made to move: the answer drawn first and the row built to fit (higher, lower and equal a third each; inside, on and outside a third each), the question asked both ways (the mean beside the standard deviation, which an added number does move; area beside perimeter), rows added where the rare option is right (a negated conclusion a square breaks; stories of change that are neither linear nor exponential). An option no row can honestly key is dropped (bivariate's reverse cause, linear-models' 'the number of hours', inverses' All real numbers, the sines and cosines more than 1 among sum-and-difference values). A rarer key is kept where the content demands it, with the reason in a comment where it is drawn: congruence's Not enough is a quarter of its rows, more than each criterion, because SSA and AAA are the look-alikes the level is about. scripts/measure-medoid.py finds a level's menu labels from the library -- labels in a third or more of the rows or of a question shape's rows, and the labels of any label set keyed more than one way -- and check-answers.py fails a level, in any skill, where a menu label is offered in 50 rows or more and never the key, unless its MENU_NEVER_KEYED table maps that skill, level slug and label to the requiem statement saying why. The table lives in the checker, not on the level in web/skills/, because skill files ship to the browser and describe what the student sees, and an exception names a recorded decision rather than a free-text reason so requiem trace finds every one.
