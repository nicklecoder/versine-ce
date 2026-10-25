/**
 * Factoring II: a leading number, more than one step, and four terms.
 *
 * Factoring found two numbers with a product and a sum when the x² stood
 * alone. With 6x² in front the brackets are no longer (x + ·)(x + ·), and
 * guessing gets slow. The AC method makes it a search again: a × c gives the
 * product, b the sum, and the two numbers found split the middle term so the
 * polynomial falls into two pairs that share a bracket. That pairing is
 * Grouping, which gets its own level, because it is also how four terms are
 * factored with no trinomial in sight.
 *
 * Factor Completely is the habit that matters most: take out the common
 * factor, then factor what is left, and keep going until nothing does.
 * x⁴ − 16 is three factors, not two.
 *
 * Answers are typed as products: (2x + 3)(x − 4), 3x(x + 2)(x − 2).
 */

export const LEVELS = [
  { name: 'ax² + bx + c', slug: 'ax2-bx-c',
    blurb: 'A number in front of x². The brackets start 2x and x, or 3x and x.' },
  { name: 'The AC Method', slug: 'the-ac-method',
    blurb: 'Multiply a by c, find the pair, split the middle, then group.' },
  { name: 'Factor Completely', slug: 'factor-completely',
    blurb: 'Common factor first, then the pattern, until nothing factors.' },
  { name: 'Grouping Four Terms', slug: 'grouping-four-terms',
    blurb: 'Factor each pair. If the brackets match, they come out together.' },
  { name: 'Sums and Differences of Cubes', slug: 'sums-and-differences-of-cubes',
    blurb: 'a³ + b³ = (a + b)(a² − ab + b²). Same sign, opposite sign, always plus.' },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [40, 45, 40, 35, 35, 42];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'factoring-2',
  name: 'Factoring II',
  category: 'expressions',
  glyph: '6x²+7x+2',
  blurb: 'A leading number, factoring completely, grouping four terms, and cubes.',
  answerInput: 'expr',
  dependsOn: ['factoring'],
  levels: LEVELS,
};
