---
id: pascal-rows-above-the-asked
namespace: catalogue/visuals
kind: design
status: active
provenance:
    type: dialogue
created_at: 2026-10-25T07:12:14.817836317Z
---

Pascal's Triangle's next-row and coefficient questions draw a table of the up-to-four rows above the asked row, each labeled with its row number and its numbers spaced in one cell, so the student sees the two numbers to add; the asked row is a ? whose numbers (the fill) and the sum that makes the asked number (the working column) are answer-phase fields, withheld until an answer is committed. Rows stop at 8, the widest that fits a phone, so those two shapes ask about rows 3 to 8; the row-sum, mirror and which-power questions, whose rows run to 16 or 20, draw nothing, since a drawn row there would be too wide or would print the n asked for. check-answers.py checks every drawn row is the triangle's own row with its number, the held-back row is the asked one, and the working adds the two above the asked number to the answer.
