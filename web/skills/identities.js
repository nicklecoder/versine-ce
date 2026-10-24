/**
 * Trigonometric Identities: equations true for every angle.
 *
 * sin²θ + cos²θ = 1 is the Pythagorean theorem on the unit circle, and
 * dividing it by cos²θ or sin²θ gives the other two. The reciprocal and
 * quotient identities are the definitions of the six functions. Cosine is
 * even and sine odd, because reflecting θ in the x-axis keeps x and negates
 * y; a function of θ equals its cofunction of the complement. The sum and
 * difference formulas give exact values at 15° and 75°, and the double-angle
 * formulas are the sum formulas with both angles the same.
 *
 * An identity holds wherever both sides are defined: one angle where they
 * differ disproves an equation, and no number of angles where they agree
 * proves one. A proof rewrites one side, a step at a time, each step one
 * identity or one piece of algebra, until it reads as the other side.
 */

export const LEVELS = [
  { name: 'Pythagorean', slug: 'pythagorean',
    blurb: 'sin²θ + cos²θ = 1, and divided through: 1 + tan²θ = sec²θ and 1 + cot²θ = csc²θ.' },
  { name: 'Reciprocal & Quotient', slug: 'reciprocal-and-quotient',
    blurb: 'tan θ = sin θ / cos θ, and sec, csc and cot are 1 over cos, sin and tan.' },
  { name: 'Even & Odd', slug: 'even-and-odd',
    blurb: 'cos(−θ) = cos θ, but sin(−θ) = −sin θ and tan(−θ) = −tan θ.' },
  { name: 'Cofunction', slug: 'cofunction',
    blurb: 'sin θ = cos(90° − θ), and tan with cot, sec with csc, in degrees or π/2.',
    // Complementary angles in a right triangle: trig-ratios' Complementary sin/cos.
    dependsOn: [{ skill: 'trig-ratios', level: 6 }] },
  { name: 'Sum & Difference', slug: 'sum-and-difference',
    blurb: 'sin(α ± β) = sin α cos β ± cos α sin β, and cos(α ± β) = cos α cos β ∓ sin α sin β.' },
  { name: 'Double Angle', slug: 'double-angle',
    blurb: 'sin 2θ = 2 sin θ cos θ, and cos 2θ = cos²θ − sin²θ = 1 − 2 sin²θ = 2 cos²θ − 1.' },
  // requiem: catalogue/content/identity-or-not-by-counterexample
  { name: 'Identity or Not?', slug: 'identity-or-not', libraryCap: 200,
    blurb: 'An identity holds wherever both sides are defined. One angle where they differ disproves it; agreeing at a few angles proves nothing, only a derivation can.' },
  { name: 'Next Step in a Proof', slug: 'next-step-in-a-proof', libraryCap: 300,
    blurb: 'Rewrite one side a step at a time: which step keeps it equal and moves it toward the other side?' },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [35, 35, 30, 30, 70, 60, 30, 45, 50];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'identities',
  name: 'Trig Identities',
  category: 'identities',
  glyph: 'sin²θ',
  blurb: 'Pythagorean, reciprocal, even and odd, cofunction, sum and difference and double-angle identities, telling an identity from an equation that only sometimes holds, and the next step in a proof.',
  answerInput: 'frac',
  // Every identity is a fact about the unit circle's coordinates; the
  // cofunctions began as complementary angles in trig-ratios.
  dependsOn: ['unit-circle', 'trig-ratios'],
  levels: LEVELS,
  longerBecause: 'Six families of identities are six techniques, each its own level, and two levels then work with them as a whole: Identity or Not? asks whether an equation holds for every angle, settled by a counterexample or not at all by trying angles, and Next Step in a Proof is the derivation that does settle it. The first is why the second is needed, so they sit side by side, and All Together makes nine.',
};
