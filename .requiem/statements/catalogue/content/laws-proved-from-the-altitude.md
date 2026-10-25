---
id: laws-proved-from-the-altitude
namespace: catalogue/content
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T17:58:48.540661018Z
relationships:
    - to: catalogue/content/proof-step-is-new-and-equal
      type: refines
      via: link
---

laws-sines-cosines proves both laws (G-SRT.10) inside its ½ab sin C level, renamed ½ab sin C & the Proofs with its slug kept, rather than in a ninth level: the proofs and the area rest on the same altitude, and the skill stays at eight levels. About four rows in ten are a step of a proof, the rest the area as before. Each step shows the construction (the altitude h from a corner to the line of the other two, meeting it at D, and for the law of cosines x = PD, signed, so DQ = r − x) and the lines so far, and asks for the next line among two slips made at that step crossed -- each alone and both together, so the right line is not the one nearest the others (decoys-cross-two-slips): a cosine for a sine with the wrong side or the equation solved upside down (h = b cos A, h = c sin A, h = sin A/b), the sides swapped (a sin A = b sin B), (c + x)² for (c − x)² with − h², a dropped 2 or a +2cx, x = c cos A, +2bc cos A with a dropped 2 or a sine -- and, in about half the rows, a fifth option, a line already written. The law of sines runs sin A = h/b, h = b sin A, sin B = h/a, h = a sin B, b sin A = a sin B, a/sin A = b/sin B; the law of cosines runs b² = x² + h², a² = (c − x)² + h², a² = c² − 2cx + x² + h², a² = b² + c² − 2cx, x = b cos A, a² = b² + c² − 2bc cos A, each with its corners relabeled six ways. The altitude facts are geometric, so check-answers.py checks every line on eight concrete triangles, acute and obtuse, built on coordinates, with h and x measured off them; the right option is the one that holds on every triangle and is not a line already written, and there must be exactly one. The steps are choice questions and carry no figure.
