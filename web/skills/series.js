/**
 * Series: the sum of a sequence's terms.
 *
 * An arithmetic series is paired from both ends, Sₙ = n(a₁ + aₙ)/2, since
 * the first and last, the second and second-last, all make the same total.
 * A geometric series is multiplied by its ratio and taken from itself, which
 * leaves only the ends: Sₙ = a₁(1 − rⁿ)/(1 − r). Sigma notation writes either
 * as a rule and a range of k. An infinite geometric series has a sum only
 * when |r| < 1, when rⁿ shrinks to nothing and the sum is a₁/(1 − r); a
 * repeating decimal is one. Then the stories series tell, and the formulas
 * read the other way: how many terms make a total, what the difference was,
 * and a term found from two sums.
 */

export const LEVELS = [
  { name: 'Arithmetic Sums', slug: 'arithmetic-sums',
    blurb: 'Pair the first term with the last: each pair makes the same total, so Sₙ = n(a₁ + aₙ)/2.',
    // The last term is the nth term of the sequence.
    dependsOn: [{ skill: 'sequences', level: 1 }] },
  { name: 'Finite Geometric', slug: 'finite-geometric',
    blurb: 'Sₙ = a₁(1 − rⁿ)/(1 − r): multiply the series by r and take it away, and only the ends are left.',
    dependsOn: [{ skill: 'sequences', level: 4 }] },
  { name: 'Sigma Notation', slug: 'sigma-notation',
    blurb: 'Σ says: put each k from the bottom number to the top into the rule, and add. Read one, write one, and use Σc = nc, Σk = n(n + 1)/2 and Σk² = n(n + 1)(2n + 1)/6.' },
  { name: 'Infinite Geometric', slug: 'infinite-geometric',
    blurb: 'When −1 < r < 1 the terms shrink to nothing and the sum settles at a₁/(1 − r); otherwise there is no sum. A repeating decimal is one.' },
  { name: 'Series in Context', slug: 'series-in-context',
    blurb: 'Seats row on row, savings week on week, a bouncing ball: add up what the story adds up.' },
  { name: 'Working Backward', slug: 'working-backward',
    blurb: 'Given the sum, find how many terms, the difference or the first term; given Sₙ, a term is Sₙ − Sₙ₋₁.',
    // How many terms make a total is a quadratic in n.
    dependsOn: [{ skill: 'quadratic-eq', level: 1 }] },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [60, 75, 70, 60, 80, 80, 75];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'series',
  name: 'Series',
  category: 'sequences',
  glyph: 'Σ',
  blurb: 'Adding up sequences: arithmetic and geometric sums, sigma notation, infinite series, and working back from a total.',
  answerInput: 'frac',
  // Terms from sequences; the count of terms from a sum from quadratic-eq.
  dependsOn: ['sequences', 'quadratic-eq'],
  levels: LEVELS,
};
