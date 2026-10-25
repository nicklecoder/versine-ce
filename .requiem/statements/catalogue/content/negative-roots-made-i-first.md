---
id: negative-roots-made-i-first
namespace: catalogue/content
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-25T02:16:35.323042675Z
relationships:
    - to: catalogue/content/complex-judged-exactly
      type: refines
      via: link
---

complex opens with Square Roots of Negatives: i is √−1, so √−n is i√n, and every root of a negative is made an i before anything else is done with it. √−4 · √−9 is 2i · 3i = −6, and (√−n)² is −n; √(ab) would wrongly give 6, because √a · √b = √(ab) only holds when a and b are not both negative, and the explanation says so on every such row. Answers that come out as a + bi with whole or fractional parts (√−16, 3 + √−25, (6 + √−36)/3, √−3 · √−12, √−2 · √8) are typed in the complex box; a root that is not whole, √−18 = 3i√2, is asked as a choice, since the box takes no root, and its decoys cross the two slips that question invites: the lost i (√−18 read as −√18) and the square left unrooted (9√2 for 18 = 9 · 2). The level depends on roots' Pulling Out Squares. check-answers.py evaluates every root of a negative as i times a real root, so it never multiplies under one root.
