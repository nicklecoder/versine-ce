/**
 * Polynomial Division: dividing by x − c, and what the remainder says.
 *
 * Long division takes the leading term each time, multiplies back and
 * subtracts, with a 0 for any missing power. Synthetic division is the same
 * arithmetic with only the numbers. The remainder on dividing by x − c is
 * P(c), so P(c) = 0 means x − c is a factor, and one known zero divides out
 * to leave a quadratic that gives the rest.
 */

export const LEVELS = [
  { name: 'Long Division', slug: 'long-division',
    blurb: 'Divide the leading terms, multiply back, subtract, bring down. A missing power goes in as 0.',
    // Each step is a monomial division, then a monomial times a binomial taken away.
    dependsOn: [{ skill: 'monomials', level: 1 }, { skill: 'polynomials', level: 4 }] },
  { name: 'Synthetic', slug: 'synthetic',
    blurb: 'Only the numbers: c in the box, bring down, multiply by c, add. The last number is the remainder.' },
  { name: 'Remainder Theorem', slug: 'remainder-theorem',
    blurb: 'The remainder on dividing by x − c is P(c), so substituting finds it without dividing.',
    dependsOn: [{ skill: 'evaluate', level: 1 }] },
  { name: 'Factor Theorem', slug: 'factor-theorem',
    blurb: 'x − c is a factor exactly when P(c) = 0. Test one, or choose k to make it so.',
    dependsOn: [{ skill: 'quadratic-eq', level: 0 }] },
  { name: 'All Zeros From One', slug: 'all-zeros-from-one',
    blurb: 'One zero given: divide it out, factor the quadratic that is left, and list every real zero.',
    dependsOn: [{ skill: 'quadratic-eq', level: 1 }] },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [90, 60, 45, 50, 90, 70];

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
  blurb: 'Long and synthetic division, the remainder and factor theorems, and every zero from one.',
  answerInput: 'choice',
  // Multiplying out from polynomials and monomials; zeros from quadratic-eq.
  dependsOn: ['monomials', 'polynomials', 'evaluate', 'quadratic-eq'],
  levels: LEVELS,
};
