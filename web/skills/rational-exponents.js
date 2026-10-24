/**
 * Rational exponents: a fraction as a power.
 *
 * The rules already say what a fractional power has to mean. If powers of
 * one base add, then 9^(1/2) × 9^(1/2) = 9¹, so 9^(1/2) is the number that
 * times itself gives 9 -- the square root. Nothing new is being invented; the
 * old rules are being taken at their word. So the skill starts there, with the
 * half power as √, and every later level is the same reading pushed further:
 * the bottom of the fraction is the root, the top is the power, and a minus
 * still means one over.
 *
 * Root, Then Power teaches the order that keeps the numbers small: 27^(4/3)
 * is (∛27)⁴ = 3⁴, never ∛(27⁴). Combine First is the strategy level: √2 and
 * √18 are not whole, but their product is, and putting the bases together
 * before taking the root is the only way to see it.
 *
 * Answers are numbers, a fraction where the power is negative, or a single
 * power of a letter typed as x^(3/4).
 */

export const LEVELS = [
  { name: 'The Half Power', slug: 'the-half-power',
    blurb: 'A power of ½ is a square root: 49^(1/2) = √49 = 7.' },
  { name: 'Other Roots', slug: 'other-roots',
    blurb: 'A power of ⅓ is a cube root, ¼ a fourth root. The bottom says which.' },
  { name: 'Root, Then Power', slug: 'root-then-power',
    blurb: 'The bottom is the root, the top the power. Root first keeps it small.' },
  { name: 'Negative Fractional Powers', slug: 'negative-fractional-powers',
    blurb: 'The minus means one over, and the fraction works as before.' },
  { name: 'Radical to Power', slug: 'radical-to-power',
    blurb: 'Write a root as one power of the letter: ∜x³ is x^(3/4).' },
  { name: 'Rules With Fractions', slug: 'rules-with-fractions',
    blurb: 'Same rules, fraction powers: add them, take them away, multiply them.' },
  {
    name: 'Combine First', slug: 'combine-first',
    kind: 'strategy',
    blurb: 'Often neither one is whole on its own. Put the bases together first.',
    // √2 × √18 = 6 is first met with root signs, as a product of two
    // irrationals that comes out rational.
    dependsOn: [{ skill: 'real-numbers', level: 5 }],
  },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [12, 16, 20, 24, 22, 26, 24, 24];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'rational-exponents',
  name: 'Rational Exponents',
  category: 'powers',
  glyph: 'x¹⁄²',
  blurb: 'A fraction as a power: the bottom is the root, the top the power.',
  answerInput: 'int',
  dependsOn: ['roots', 'real-numbers', 'monomials'],
  levels: LEVELS,
};
