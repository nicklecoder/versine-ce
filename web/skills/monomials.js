/**
 * Monomials: the exponent rules with letters in them.
 *
 * Exponents taught the rules on numbers, where 2³ × 2⁴ could always be
 * checked by working both out. With letters there is nothing to work out,
 * so the rule is all there is: same letter, add the powers; dividing,
 * subtract them; a power of a power, multiply. The numbers in front follow
 * their own, ordinary arithmetic, and keeping the two apart -- 3x² · 4x⁵ is
 * 12x⁷, not 7x¹² -- is most of the skill.
 *
 * Zero and Negative Powers asks for the answer with positive powers only,
 * which is how a negative power is finished: x⁻³ is not wrong, it is not
 * done. The Usual Mistakes is a choice between the right answer and the
 * wrong ones students actually write, each the slip of one rule for another.
 *
 * Answers are typed as expressions, letters side by side: 12x^7, −3a^2b.
 */

export const LEVELS = [
  { name: 'Multiplying', slug: 'multiplying',
    blurb: 'Multiply the numbers. Same letter: add the powers. 3x² · 4x⁵ = 12x⁷.' },
  { name: 'Dividing', slug: 'dividing',
    blurb: 'Divide the numbers. Same letter: take the powers away.' },
  { name: 'A Power of a Monomial', slug: 'a-power-of-a-monomial',
    blurb: 'Everything inside is raised: (2x³)⁴ is 2⁴ times x¹².' },
  { name: 'Zero and Negative Powers', slug: 'zero-and-negative-powers',
    blurb: 'x⁰ = 1, and x⁻³ = 1/x³. Finish with positive powers only.' },
  { name: 'Simplest Form', slug: 'simplest-form',
    blurb: 'Several rules in one. Work it down to one number and each letter once.' },
  { name: 'The Usual Mistakes', slug: 'the-usual-mistakes',
    blurb: 'One answer is right. The others each use the wrong rule. Which is which?' },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [16, 18, 18, 20, 32, 16, 24];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'monomials',
  name: 'Monomials',
  category: 'expressions',
  glyph: 'x²·x³',
  blurb: 'The exponent rules with letters: multiplying, dividing and powers of monomials.',
  answerInput: 'expr',
  dependsOn: ['exponents', 'simplify'],
  levels: LEVELS,
};
