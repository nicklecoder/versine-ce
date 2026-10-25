/**
 * Solving equations.
 *
 * One idea, applied until it is automatic: whatever you do to one side you do
 * to the other, and you undo the operations in the reverse of the order they
 * were applied. That reversal is the part worth drilling — a student who has
 * only been told "do the opposite" will subtract before dividing on 3(x+4)=19
 * and be wrong, because the bracket makes the multiplication outermost.
 *
 * Every solution here is a whole number. Not to be gentle: the widget follows
 * the answer's type, so a level mixing whole and fractional answers would show
 * two boxes exactly when the answer is a fraction, and a student would read it
 * off the input before solving anything. Fractional solutions get their own
 * level in the follow-on skill, where they are the whole level.
 *
 * Whole, but not necessarily positive. Answers Below Zero exists because a
 * student who has only ever seen solutions come out positive learns to read a
 * negative as evidence of a slip and goes hunting for an error that is not
 * there -- the same habit that made a fractional answer look wrong, and it
 * wants the same cure. The mixed level deals from it too: a negative answer
 * that only ever turns up in the level named after it has been quarantined,
 * not taught. That costs this skill the numeric keypad on two levels, since
 * no iPhone pad carries a minus, and it is worth it.
 *
 * The harder half — unknowns on both sides, brackets, non-whole answers —
 * lives in `equations-both`, which depends on this.
 */

export const LEVELS = [
  { name: 'Undo by Adding', slug: 'undo-by-adding',
    blurb: 'Something was added to x or taken from it. Undo it on both sides.' },
  { name: 'Undo by Multiplying', slug: 'undo-by-multiplying',
    blurb: 'x was multiplied or divided. Do the opposite to both sides.' },
  { name: 'Two Steps', slug: 'two-steps',
    blurb: 'Both at once. Undo them in the reverse of the order they were done.' },
  { name: 'Negatives in the Way', slug: 'negatives-in-the-way',
    blurb: 'A minus in front of x, or a negative to undo. Same rule, more care.' },
  {
    name: 'Answers Below Zero', slug: 'answers-below-zero',
    blurb: 'Most answers come out negative. That is an answer, not a mistake.',
    // The sign rules are int-muldiv's, and this is the first place in the
    // skill where getting one wrong changes the answer rather than the
    // working.
    dependsOn: [{ skill: 'int-muldiv', level: 0 }],
  },
  {
    name: 'Which Step First?', slug: 'which-step-first', kind: 'strategy',
    blurb: 'Subtract or divide first? What the brackets are doing decides.',
    // After both moves are available, which is the first point at which
    // choosing the wrong one costs anything.
    dependsOn: [{ skill: 'order-ops', level: 2 }],
  },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [14, 14, 18, 20, 20, 16, 20];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'equations',
  name: 'Solving Equations',
  category: 'equations',
  glyph: 'x=',
  blurb: 'Undoing what was done to x, one side at a time.',
  answerInput: 'int',
  dependsOn: ['simplify', 'int-muldiv', 'order-ops'],
  levels: LEVELS,

  /** One line of working per move, naming what was done to both sides. */
  lesson(problem) {
    // The strategy level carries no visual, so it falls back to the
    // sentences of `explain` -- which for a judgement question is the
    // whole of the argument anyway.
    if (problem.visual?.kind !== 'evalmodel') return null;
    const { lines, rules } = problem.visual;
    const steps = [{ caption: problem.visual.hint ?? 'What has been done to x?', opts: { reveal: 1 } }];
    rules.forEach((rule, i) => {
      steps.push({
        caption: i === rules.length - 1 ? `Which leaves ${lines[i + 1]}.` : `${rule}: ${lines[i + 1]}.`,
        opts: { reveal: i + 2 },
      });
    });
    return steps;
  },
};
