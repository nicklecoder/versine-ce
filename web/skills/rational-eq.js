/**
 * Rational Equations: solving with x in a denominator.
 *
 * Multiply every term by the least common denominator and the fractions are
 * gone, leaving a linear or quadratic equation. But that multiplication is
 * by something that is 0 at the excluded values, so an answer that lands on
 * one of them is extraneous: it makes a denominator 0 in the original and is
 * thrown away. Proportions clear by cross-multiplying; inverse variation and
 * work-and-rate problems are rational equations in words.
 */

export const LEVELS = [
  { name: 'Clear Denominators', slug: 'clear-denominators',
    blurb: 'Multiply every term by the least common denominator: x/3 + x/4 = 7 becomes 4x + 3x = 84.',
    // The least common denominator is from adding unlike fractions; what is left is a two-step equation.
    dependsOn: [{ skill: 'rational-expr', level: 4 }, { skill: 'equations', level: 2 }] },
  { name: 'Extraneous', slug: 'extraneous',
    blurb: 'Clearing can give an answer that makes a denominator 0. Find the excluded values first, and throw out any answer that is one.',
    dependsOn: [{ skill: 'rational-expr', level: 1 }, { skill: 'quadratic-eq', level: 1 }] },
  { name: 'Proportions With x', slug: 'proportions-with-x',
    blurb: 'One fraction equal to another: cross-multiply. With x on both bottoms, or top and bottom, it can become a quadratic.',
    dependsOn: [{ skill: 'quadratic-eq', level: 2 }] },
  { name: 'Inverse Variation', slug: 'inverse-variation',
    blurb: 'y = k/x: as one doubles, the other halves. Find k from one pair, since xy = k, then use it for any other.',
    dependsOn: [{ skill: 'proportional', level: 2 }] },
  { name: 'Work & Rate', slug: 'work-and-rate',
    blurb: 'A job in 6 hours is 1/6 of it each hour. Rates add, and time is the job divided by the rate.',
    // Equal times, set one equal to the other; a job per hour is a unit rate.
    dependsOn: [{ skill: 'word-equations', level: 4 }, { skill: 'ratio', level: 4 }] },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [60, 90, 75, 45, 75, 75];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'rational-eq',
  name: 'Rational Equations',
  category: 'equations',
  glyph: '1/x = 2',
  blurb: 'Clearing denominators, extraneous answers, proportions with x, inverse variation, and work and rate.',
  answerInput: 'solutions',
  // Fractions with x from rational-expr; what is left is solved as in equations and quadratic-eq.
  dependsOn: ['rational-expr', 'equations', 'quadratic-eq', 'proportional', 'word-equations', 'ratio'],
  levels: LEVELS,
};
