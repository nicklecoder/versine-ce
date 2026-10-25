/**
 * Polynomial Division: dividing by x − c, and what the remainder says.
 *
 * Long division takes the leading term each time, multiplies back and
 * subtracts, with a 0 for any missing power, by x − c, 2x − 1 or x² + 1
 * alike. Synthetic division is the same arithmetic by x − c with only the
 * numbers. The remainder on dividing by x − c is P(c), so P(c) = 0 means
 * x − c is a factor. The rational root theorem lists the only rational
 * zeros there can be, and one zero divides out to leave a quadratic that
 * gives the rest.
 */

export const LEVELS = [
  { name: 'Long Division', slug: 'long-division',
    blurb: 'Divide the leading terms, multiply back, subtract, bring down. A missing power goes in as 0, and you stop when what is left has a lower degree than the divisor.',
    // Each step is a monomial division, then a monomial times a binomial taken away.
    dependsOn: [{ skill: 'monomials', level: 1 }, { skill: 'polynomials', level: 4 }] },
  { name: 'Synthetic', slug: 'synthetic',
    blurb: 'Only the numbers: c in the box, bring down, multiply by c, add. The last number is the remainder.' },
  { name: 'Remainder Theorem', slug: 'remainder-theorem',
    blurb: 'The remainder on dividing by x − c is P(c), so substituting finds it without dividing.',
    dependsOn: [{ skill: 'evaluate', level: 1 }] },
  { name: 'Factor Theorem', slug: 'factor-theorem',
    blurb: 'x − c is a factor exactly when P(c) = 0. Test one, or choose k to make it so.' },
  // requiem: catalogue/content/rational-root-candidates-listed
  { name: 'Rational Root Theorem', slug: 'rational-root-theorem',
    blurb: 'A rational zero p/q has p dividing the constant term and q the leading coefficient. List them, then test.' },
  { name: 'All Zeros From One', slug: 'all-zeros-from-one',
    blurb: 'One zero given: divide it out, factor the quadratic that is left, and list every real zero.',
    dependsOn: [{ skill: 'quadratic-eq', level: 1 }] },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [120, 60, 45, 50, 90, 90, 80];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'poly-division',
  name: 'Polynomial Division',
  category: 'expressions',
  glyph: 'P ÷ (x − c)',
  blurb: 'Long and synthetic division, the remainder, factor and rational root theorems, and every zero from one.',
  answerInput: 'choice',
  // Multiplying out from polynomials and monomials; zeros from quadratic-eq.
  dependsOn: ['monomials', 'polynomials', 'evaluate', 'quadratic-eq'],
  levels: LEVELS,
};
