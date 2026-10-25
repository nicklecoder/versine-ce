/**
 * Polynomials: adding, taking away and multiplying them.
 *
 * Nothing here is a new rule. Adding is collecting like terms, which
 * Simplifying taught; multiplying is distributing, with Monomials' rule for
 * the powers. What is new is the size: a trinomial times a binomial is six
 * products and a collection, and the skill is doing every one of them and
 * missing none. So the levels grow by one product at a time.
 *
 * Special Products is the exception, and the reason it has a level: (x + 5)²
 * is the single most common wrong expansion in algebra, x² + 25. Squaring a
 * bracket is not squaring its parts, and seeing the middle term 10x come out
 * of (x + 5)(x + 5) every time is what fixes it.
 *
 * Answers are typed expanded and collected, in any order: x^2 + 8x + 15.
 */

export const LEVELS = [
  { name: 'Degree and Standard Form', slug: 'degree-and-standard-form',
    blurb: 'Highest power first. The degree is that power; its number leads.' },
  { name: 'Adding', slug: 'adding',
    blurb: 'Collect the like terms: x² with x², x with x, numbers with numbers.' },
  { name: 'Taking Away', slug: 'taking-away',
    blurb: 'A minus before a bracket changes every sign inside it.' },
  { name: 'Monomial Times Polynomial', slug: 'monomial-times-polynomial',
    blurb: 'Multiply every term inside by the one outside. Powers add.' },
  { name: 'Binomial Times Binomial', slug: 'binomial-times-binomial',
    blurb: 'Each term of one times each term of the other: four products, then collect.' },
  { name: 'Special Products', slug: 'special-products',
    blurb: '(x + 5)² is not x² + 25. Where does the middle term come from?' },
  { name: 'Trinomial Times Binomial', slug: 'trinomial-times-binomial',
    blurb: 'Six products. Miss none, then collect.' },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [14, 24, 28, 24, 30, 28, 45, 32];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'polynomials',
  name: 'Polynomials',
  category: 'expressions',
  glyph: '(x+1)²',
  blurb: 'Adding, taking away and multiplying polynomials, and the products worth knowing.',
  answerInput: 'expr',
  dependsOn: ['monomials'],
  levels: LEVELS,
};
