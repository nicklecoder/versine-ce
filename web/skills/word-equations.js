/**
 * Writing equations from situations.
 *
 * Every equations skill so far hands the student the equation. This is the
 * step before it, and the one that decides whether algebra is ever used for
 * anything: reading a situation, naming the unknown, and writing down the
 * claim the situation makes about it. Solving is the part already owned.
 *
 * Which Equation sits second, straight after the first puzzles, because it
 * isolates the writing from the solving: three equations, one situation, and
 * the wrong two are the misreadings students actually make. After that the
 * situations get their own levels by shape -- a fixed amount plus a rate,
 * parts of a whole, two things becoming equal -- since each shape is a
 * template a student can learn to recognize.
 *
 * At Least / At Most is here, rather than in Inequalities, because a
 * situation is where an inequality's answer has to be read: the fewest weeks
 * to save $200 is 11 even when the algebra says 10.67, and "at most" and "at
 * least" round in opposite directions for reasons the words supply.
 *
 * No visual: the working would begin with the equation, which is the answer
 * to the part of the question this skill exists to ask.
 */

export const LEVELS = [
  { name: 'Number Puzzles', slug: 'number-puzzles',
    blurb: 'Call the number n. Write down what was done to it, then undo it.' },
  { name: 'Which Equation?', slug: 'which-equation',
    blurb: 'Three equations, one situation. Only one says what the words say.' },
  { name: 'Fixed Plus Per-Unit', slug: 'fixed-plus-per-unit',
    blurb: 'A charge once, and a charge for each one. The each goes with the letter.' },
  { name: 'Parts of a Whole', slug: 'parts-of-a-whole',
    blurb: 'Several pieces, each written in terms of one unknown, adding to a total.' },
  {
    name: 'Two Things Equal', slug: 'two-things-equal',
    blurb: 'Two plans, two savers, two tanks. When are they the same? Set one equal to the other.',
    dependsOn: [{ skill: 'equations-both', level: 1 }],
  },
  {
    name: 'At Least, At Most', slug: 'at-least-at-most',
    blurb: 'An inequality, and then a whole number. The words say which way to round.',
    dependsOn: [{ skill: 'inequalities', level: 2 }],
  },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [24, 22, 28, 32, 32, 34, 32];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'word-equations',
  name: 'Writing Equations',
  category: 'equations',
  glyph: '“=”',
  blurb: 'Turning a situation into an equation, then solving it.',
  answerInput: 'int',
  dependsOn: ['equations-both', 'evaluate', 'inequalities'],
  levels: LEVELS,
};
