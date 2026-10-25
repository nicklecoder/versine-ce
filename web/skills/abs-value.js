/**
 * Absolute value equations and inequalities.
 *
 * |x| is distance from zero, which Integers taught as a number. Here it is
 * a condition: |x| = 5 holds at two places, 5 and −5, and |x − 3| = 5 at
 * the two places 5 away from 3. Every level is that one idea, read three
 * ways -- equal to a distance (two points), less than one (between them),
 * more than one (outside them) -- and the case that catches students, an
 * absolute value set equal to a negative, which no distance ever is.
 *
 * The bars are isolated before anything else, the same way x is isolated
 * in an equation, and a level is given to it because splitting into two
 * cases before the bars stand alone is the most common wrong first move.
 *
 * Between or Outside? is the strategy level: before solving, the sign and
 * the side say which shape the answer has, and that decides whether it is
 * written as one chain or as an "or". It leans on And or Or?, where those
 * shapes were first named.
 */

export const LEVELS = [
  { name: 'Distance From Zero', slug: 'distance-from-zero',
    blurb: '|x| = 5 means x is 5 from zero: x = 5 or x = −5.' },
  { name: 'Two Cases', slug: 'two-cases',
    blurb: 'What is inside the bars is either the number or its negative. Solve both.' },
  { name: 'Isolate the Bars First', slug: 'isolate-the-bars-first',
    blurb: 'Get the absolute value on its own before splitting into cases.' },
  { name: 'One, Two or None', slug: 'one-two-or-none',
    blurb: 'A distance is never negative. Equal to zero is one answer; less than zero, none.' },
  { name: 'Less Than Is Between', slug: 'less-than-is-between',
    blurb: '|x − 3| < 5: closer than 5 to 3, so between −2 and 8.' },
  { name: 'Greater Than Is Outside', slug: 'greater-than-is-outside',
    blurb: '|x − 3| > 5: farther than 5 from 3, so below −2 or above 8.' },
  {
    name: 'Between or Outside?', slug: 'between-or-outside', kind: 'strategy',
    blurb: 'Before solving: one stretch, two rays, everything, or nothing?',
    // The four shapes are the four answers And or Or? made from two
    // conditions; this level reads them off the inequality instead.
    dependsOn: [{ skill: 'compound-ineq', level: 5 }],
  },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [12, 26, 32, 24, 30, 30, 14, 30];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'abs-value',
  name: 'Absolute Value',
  category: 'inequalities',
  glyph: '|x|',
  blurb: 'Equations and inequalities with absolute value: two cases, between and outside.',
  answerInput: 'solutions',
  dependsOn: ['compound-ineq'],
  levels: LEVELS,
};
