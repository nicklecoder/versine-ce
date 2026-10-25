---
id: decoys-cross-two-slips
namespace: catalogue/content
kind: rule
modality: should
status: active
provenance:
    type: dialogue
created_at: 2026-10-25T02:16:35.270278419Z
relationships:
    - to: catalogue/library/strategy-not-from-surface
      type: refines
      via: link
---

A choice question's decoys cross two slips rather than each perturbing the key in one feature: the key, slip A alone, slip B alone, and A and B together. When every decoy is the key with one thing changed, the key is the option nearest all the others -- the medoid, by edit distance between the labels -- and a test-wise student picks it without the mathematics: logarithms' Log as Exponent, condense, change-of-base and All Together choices had the key as the medoid in 98-100% of rows (log₁₀ 100 = 2 against log₁₀ 2 = 100, log₁₀₀ 10 = 2, log₂ 100 = 10), and trigonometric identities' simplify choices in 92-97% (2 sin²θ against 2 cos²θ, −2 sin²θ, 2 sin θ). Crossed, each option is one slip from two others and two from the last, so none sits in the middle, and the key is the medoid about as often as chance (17-34% on four options). The slips are real misreadings (base and exponent swapped, the number raised by the base, a sign dropped, the number in front left as a factor, a sum of logs read as the log of a sum, (ln x)² for ln x², a power spread to every letter, ln(v/b) for ln v / ln b), so knowing one rule narrows four options to two. scripts/measure-medoid.py measures the medoid share, and check-answers.py loads it and fails any choice level in the catalogue, every skill included, above 40% on at least 20 measured rows of three or more options. It measures only options written for the row: a fixed menu (Higher / Lower / Equal, Inside / On / Outside, a label set that recurs with the key moving among its labels) has a medoid set by its wording, so the gate finds such rows itself -- a label set seen with more than one key, or a row left with fewer than three labels once stock labels (those in a third or more of the level's choice rows, or of the rows asking the same shape of question, such as They are the same) are set aside -- and leaves them out; for a fixed menu what matters is that the key moves, not where the decoys sit.
