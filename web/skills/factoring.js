/**
 * Factoring: multiplying out, run backwards.
 *
 * Polynomials took (x + 3)(x + 4) to x² + 7x + 12. This skill starts from
 * x² + 7x + 12 and asks where it came from, and the answer is in how it was
 * made: 12 is 3 × 4 and 7 is 3 + 4. So the method is a search, two numbers
 * with that product and that sum, and the working shows the search -- every
 * pair that multiplies to 12, and the one that adds to 7.
 *
 * A common factor comes first and gets its own level, because missing it is
 * the commonest way to factor "correctly" and still be marked wrong: 2x² − 18
 * is 2(x + 3)(x − 3), and a difference of squares never appears until the 2
 * is out. Which Pattern is the strategy level: what to look for, in what
 * order, including the polynomials that do not factor at all -- x² + 9 among
 * them, which looks as if it should.
 *
 * Answers are typed as products: (x + 3)(x + 4), 3x(2x − 5), (x − 7)^2.
 */

export const LEVELS = [
  { name: 'Common Factor Out', slug: 'common-factor-out',
    blurb: 'The biggest number and the lowest power in every term, outside a bracket.' },
  { name: 'x² + bx + c', slug: 'x2-bx-c',
    blurb: 'Two numbers that multiply to c and add to b.' },
  { name: 'Negatives Inside', slug: 'negatives-inside',
    blurb: 'The signs say where to look: c negative means one of each.' },
  { name: 'Difference of Squares', slug: 'difference-of-squares',
    blurb: 'A square minus a square: (a + b)(a − b), and the middle terms cancel.' },
  { name: 'Perfect Squares', slug: 'perfect-squares',
    blurb: 'Square, twice the product, square: x² + 10x + 25 is (x + 5)².' },
  {
    name: 'Which Pattern?', slug: 'which-pattern',
    kind: 'strategy',
    blurb: 'Common factor first, then the shape. And some do not factor at all.',
    // The patterns are the special products read backwards, so they are met
    // multiplied out before they are looked for.
    dependsOn: [{ skill: 'polynomials', level: 5 }],
  },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [22, 24, 28, 20, 22, 16, 26];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'factoring',
  name: 'Factoring',
  category: 'expressions',
  glyph: '(x+3)(x+4)',
  blurb: 'Polynomials back into products: common factors, trinomials and the special patterns.',
  answerInput: 'expr',
  dependsOn: ['polynomials'],
  levels: LEVELS,
};
