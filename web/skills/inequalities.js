/**
 * Inequalities.
 *
 * The skill that was missing from the map rather than merely absent from it:
 * every other empty corner of the catalogue has a category declared and
 * waiting, and this one had nothing at all. It sits beside Solving Equations
 * and reuses every move in it, which is probably why it slipped through — an
 * inequality is an equation until the very last step, and then it is not.
 *
 * There is exactly one new rule, and the whole skill is arranged around it:
 * multiplying or dividing by a negative turns the sign around. That rule
 * cannot be taught to a student who has never met a negative outside the
 * integer skills, which is the other reason this waited.
 *
 * The answers are whole numbers, not ranges. "x > 4" is the honest answer to
 * an inequality and there is no widget in this app that can take it, so the
 * questions ask for the smallest or largest whole number that works instead.
 * That is not a workaround: it is the reading that catches a student who has
 * solved correctly and then not thought about what the answer means, and it
 * makes the difference between > and ≥ worth something rather than decorative.
 */

export const LEVELS = [
  { name: 'Which Numbers Work', slug: 'which-numbers-work',
    blurb: 'x > 3 is not one number, it is all of them past a point. Which is the first?' },
  {
    name: 'Undo by Adding', slug: 'undo-by-adding',
    blurb: 'Add or subtract on both sides. The sign does not care.',
    // The same move, and the point is that it really is the same move.
    dependsOn: [{ skill: 'equations', level: 0 }],
  },
  {
    name: 'Undo by Multiplying', slug: 'undo-by-multiplying',
    blurb: 'Multiply or divide by a positive. Still nothing new.',
    dependsOn: [{ skill: 'equations', level: 1 }],
  },
  {
    name: 'The Flip', slug: 'the-flip',
    blurb: 'Divide by a negative and the sign turns around. The one rule that is new.',
    // Why it flips is the sign rules: multiplying by a negative reverses
    // order on the number line, which is a fact about negatives, not about
    // inequalities.
    dependsOn: [{ skill: 'int-muldiv', level: 1 }],
  },
  {
    // The equations-both move with a relation in the middle. Gathering on
    // the side with more letters keeps the coefficient positive and so never
    // needs the flip -- which is the cleanest argument there is for which
    // side to gather on.
    name: 'Unknowns Both Sides', slug: 'unknowns-both-sides',
    blurb: 'Letters on both sides. Gather where there are more and the sign never turns.',
    dependsOn: [{ skill: 'equations', level: 2 }],
  },
  {
    name: 'Does It Flip?', slug: 'does-it-flip', kind: 'strategy',
    blurb: 'Sometimes the sign turns and sometimes it does not. What decides is not the minus.',
    // Sits after both cases exist, which is the first point at which
    // flipping when you should not have costs anything.
    dependsOn: [{ skill: 'int-muldiv', level: 0 }],
  },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [14, 18, 18, 22, 28, 16, 24];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'inequalities',
  name: 'Inequalities',
  category: 'inequalities',
  glyph: '<',
  blurb: 'Solving for a range instead of a point, and the one rule that changes.',
  answerInput: 'int',
  dependsOn: ['equations', 'int-muldiv'],
  levels: LEVELS,

  /** The same line-at-a-time walkthrough the equation skills use. */
  lesson(problem) {
    if (problem.visual?.kind !== 'evalmodel') return null;
    const { lines, rules } = problem.visual;
    const steps = [{ caption: problem.visual.hint ?? 'What is being asked?', opts: { reveal: 1 } }];
    rules.forEach((rule, i) => {
      steps.push({
        caption: i === rules.length - 1 ? `Which leaves ${lines[i + 1]}.` : `${rule}: ${lines[i + 1]}.`,
        opts: { reveal: i + 2 },
      });
    });
    return steps;
  },
};
