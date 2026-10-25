---
id: prices-answered-in-dollars
namespace: catalogue/content
kind: decision
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-25T07:22:53.008258195Z
relationships:
    - to: catalogue/content/us-notation
      type: refines
      via: link
---

A question that asks for prices in dollars has its answer held as dollars and written as a store writes them: the points key of systems-2's snack-stand and paired-price stories reads ($4.50, $1.00, $0.75), in the reveal and in the walkthrough, never (9/2, 1, 3/4), which is the right number in a form no price is ever written in. The value carries money: true, which changes only how it is written; the points box takes the prices with or without their dollar signs, and as fractions too, since they are the same numbers. Every price is written with two decimal places, $1.00 beside $4.50, so a list of prices reads alike. The working may be done in cents, where every number is whole, and ends by saying the prices in dollars. check-answers.py fails a points answer that is money without its question saying in dollars, or the reverse, and a story total missing from its question.
