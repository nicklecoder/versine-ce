/**
 * The Binomial Theorem: (a + b)ⁿ multiplied out without multiplying.
 *
 * Each row of Pascal's triangle is the row above added in pairs, and row n
 * lists the coefficients of (a + b)ⁿ. Those numbers are C(n, k), the ways to
 * choose which k of the n brackets give a b, so the term with bᵏ is
 * C(n, k)aⁿ⁻ᵏbᵏ -- with a and b's own numbers and signs raised along. One
 * term can be found alone, the whole expansion written out, and the
 * constant term of (x + 1/x)ⁿ found where the powers cancel. The same count
 * gives the chance of exactly k successes in n tries.
 */

export const LEVELS = [
  { name: "Pascal's Triangle", slug: 'pascals-triangle',
    blurb: 'Each number is the two above it added. Row n is the coefficients of (a + b)ⁿ, and its numbers add to 2ⁿ.' },
  { name: 'Coefficients by Combinations', slug: 'coefficients-by-combinations',
    blurb: 'C(n, k) = n!/(k!(n − k)!) is the kth number of row n: the coefficient of aⁿ⁻ᵏbᵏ in (a + b)ⁿ.',
    // C(n, k) is the count of committees from counting's Combinations.
    dependsOn: [{ skill: 'counting', level: 3 }] },
  { name: 'A Given Term', slug: 'a-given-term',
    blurb: 'The term with bᵏ is C(n, k)aⁿ⁻ᵏbᵏ: raise the numbers and signs inside along with the letters.',
    // (2x)³ = 8x³ is monomials' A Power of a Monomial.
    dependsOn: [{ skill: 'monomials', level: 2 }] },
  { name: 'Full Expansion', slug: 'full-expansion',
    blurb: 'Every term at once: the row of coefficients, a falling power of the first term and a rising power of the second.',
    // (a + b)² multiplied out is polynomials' Special Products.
    dependsOn: [{ skill: 'polynomials', level: 5 }] },
  // The constant terms run out at a few hundred, where coefficients of
  // other powers do not, so a full library would fill up with the second
  // kind. At this cap the constant term, and which term it is, are most of it.
  { name: 'The Constant Term', slug: 'the-constant-term', libraryCap: 520,
    blurb: 'In (x² + 1/x)ⁿ the powers of x cancel in one term: find which k makes the power 0, or any power asked.',
    // 1/x is x⁻¹, and (x²)ᵏ is x²ᵏ.
    dependsOn: [{ skill: 'exponents', level: 4 }, { skill: 'exponents', level: 3 }] },
  { name: 'Binomial Probability', slug: 'binomial-probability',
    blurb: 'Exactly k successes in n tries: C(n, k) orders, each with chance pᵏ(1 − p)ⁿ⁻ᵏ. At least and at most add them up.',
    // One order's chance multiplies independent events.
    dependsOn: [{ skill: 'probability', level: 4 }] },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
// Full Expansion runs to sixth powers, each of seven terms a product worked by
// hand, so it has the longest par.
export const PAR_SECONDS = [40, 45, 70, 105, 75, 75, 70];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'binomial',
  name: 'The Binomial Theorem',
  category: 'sequences',
  glyph: '(a+b)ⁿ',
  blurb: "Pascal's triangle, C(n, k) as coefficients, one term or the whole expansion of (a + b)ⁿ, and the chance of k successes in n tries.",
  answerInput: 'int',
  // C(n, k) from counting; powers of monomials, expanding and negative
  // powers from monomials, polynomials and exponents; chance from probability.
  dependsOn: ['counting', 'monomials', 'polynomials', 'exponents', 'probability'],
  levels: LEVELS,
};
