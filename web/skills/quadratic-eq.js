/**
 * Quadratic equations, solved by factoring and by square roots.
 *
 * Everything rests on one fact: a product is zero only when one of its
 * factors is. So (x − 3)(x + 5) = 0 is two small equations, and Factoring
 * becomes a way of solving rather than an end in itself. The fact is also
 * exactly why the equation must be set to zero first: x(x − 4) = 12 does not
 * mean x = 12 or x − 4 = 12, because two numbers can multiply to 12 in
 * endless ways and to 0 in only one. Rearrange to Zero First exists for that
 * mistake.
 *
 * Square Roots handles the equations with no x term, where factoring is the
 * long way round, and is where the second answer stops being forgotten:
 * x² = 49 is x = 7 or x = −7. Which Method is the strategy level, choosing
 * between the two -- and noticing when neither works yet, which is what the
 * quadratic formula is for.
 *
 * Answers are typed as a list of solutions: x = 3 or x = −5, or 3, −5.
 */

export const LEVELS = [
  { name: 'Zero Product', slug: 'zero-product',
    blurb: 'If a product is 0, one of its factors is. Set each to 0.' },
  { name: 'By Factoring', slug: 'by-factoring',
    blurb: 'Factor, then set each factor to 0.' },
  { name: 'Rearrange to Zero First', slug: 'rearrange-to-zero-first',
    blurb: 'Everything to one side first. Only zero splits into factors.' },
  { name: 'Square Roots', slug: 'square-roots',
    blurb: 'No x term: get the square alone, then root both sides. Two answers, or none.' },
  {
    name: 'Which Method?', slug: 'which-method',
    kind: 'strategy',
    blurb: 'Square roots, factoring, or neither yet? Choose before you start.',
    // Choosing a method is choosing a pattern: no x term, or a trinomial that
    // factors, or one that does not.
    dependsOn: [{ skill: 'factoring', level: 5 }],
  },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [20, 32, 38, 26, 16, 32];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'quadratic-eq',
  name: 'Quadratic Equations',
  category: 'equations',
  glyph: 'x²=9',
  blurb: 'Solving quadratics by factoring and by square roots, and choosing between them.',
  answerInput: 'solutions',
  dependsOn: ['factoring', 'equations-both'],
  levels: LEVELS,
};
