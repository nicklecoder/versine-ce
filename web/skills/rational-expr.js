/**
 * Rational Expressions: fractions with polynomials top and bottom.
 *
 * They follow the rules of number fractions. Simplify by factoring and
 * cancelling whole factors, never terms; a value of x that makes any
 * denominator zero is excluded, even after the factor that caused it has
 * cancelled. Multiply straight across and divide by multiplying by the
 * reciprocal, factoring first so the cancelling is visible. Add over a common
 * denominator, taking the whole of the second numerator away when
 * subtracting, and clear a fraction inside a fraction by multiplying its top
 * and bottom by the denominator they share.
 */

export const LEVELS = [
  { name: 'Simplify', slug: 'simplify',
    blurb: 'Factor the top and the bottom, then cancel a factor they share: only whole factors cancel, never single terms.',
    // Factoring x² + bx + c, top and bottom.
    dependsOn: [{ skill: 'factoring', level: 1 }] },
  { name: 'Excluded Values', slug: 'excluded-values',
    blurb: 'A value that makes a denominator zero is excluded: set the denominator to zero and solve. Cancelling does not bring it back.',
    // Setting a factored denominator to zero is the zero product property.
    dependsOn: [{ skill: 'quadratic-eq', level: 0 }] },
  { name: 'Multiply & Divide', slug: 'multiply-and-divide',
    blurb: 'Factor everything, multiply across, cancel; to divide, flip the second fraction and multiply.',
    dependsOn: [{ skill: 'frac-muldiv', level: 4 }] },
  { name: 'Common Denominator', slug: 'common-denominator',
    blurb: 'Same denominator: combine the numerators over it. Subtracting takes away all of the second numerator, then simplify.',
    dependsOn: [{ skill: 'frac-addsub', level: 0 }] },
  { name: 'Unlike Denominators', slug: 'unlike-denominators',
    blurb: 'Multiply each fraction up to the common denominator, the product of the two, then add the numerators.',
    dependsOn: [{ skill: 'frac-addsub', level: 2 }] },
  { name: 'Complex Fractions', slug: 'complex-fractions',
    blurb: 'A fraction inside a fraction: multiply its top and bottom by the denominator the small fractions share.' },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [60, 45, 75, 50, 75, 70, 70];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'rational-expr',
  name: 'Rational Expressions',
  category: 'expressions',
  glyph: 'P/Q',
  blurb: 'Simplifying, excluded values, multiplying and dividing, adding over a common denominator, and complex fractions.',
  answerInput: 'expr',
  // Factoring from factoring; fraction rules from the fraction skills.
  dependsOn: ['factoring', 'quadratic-eq', 'frac-muldiv', 'frac-addsub'],
  levels: LEVELS,
};
