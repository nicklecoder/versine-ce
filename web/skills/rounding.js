/**
 * Rounding, and estimating with it.
 *
 * The catalogue could compute exactly in six notations and had no way to say
 * "about". That is a real hole rather than a missing convenience: an estimate
 * is how you find out whether an exact answer is plausible, and a student
 * with no habit of estimating has no defence against a slipped decimal point
 * or a division done upside down. Every other skill here produces answers;
 * this is the one that checks them.
 *
 * Filed under Decimals & Percents because rounding is overwhelmingly met on
 * decimals and depends on place value being solid — the whole skill is "which
 * of the two neighbors in this column is it nearer to", which is unanswerable
 * without knowing what the column counts.
 *
 * Everything here is positive. Rounding a negative is a genuine convention
 * argument — −2.5 goes to −2 under round-half-up and to −3 under
 * round-half-away — and a drill is the wrong place to have it.
 */

export const LEVELS = [
  { name: 'To the Nearest Whole', slug: 'to-the-nearest-whole',
    blurb: 'Which whole number is it closer to? Look at the tenths.' },
  {
    name: 'To a Decimal Place', slug: 'to-a-decimal-place',
    blurb: 'Same question, one column further in.',
    // Which column you are rounding to is a place-value question before it is
    // a rounding one.
    dependsOn: [{ skill: 'decimals', level: 0 }],
  },
  { name: 'Exactly Halfway', slug: 'exactly-halfway',
    blurb: 'Dead between the two. The rule is a convention, and it goes up.' },
  { name: 'Roughly How Much', slug: 'roughly-how-much',
    blurb: 'Round first, then work it out. Close enough, in one step.' },
  {
    name: 'Exact, or Close Enough?', slug: 'exact-or-close-enough', kind: 'strategy',
    blurb: 'Some questions want the number. Some only want the size of it.',
    // The judgement only exists once an estimate can actually be produced,
    // and what it is weighed against is exact decimal arithmetic.
    dependsOn: [{ skill: 'decimals', level: 2 }],
  },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [14, 16, 14, 20, 16, 18];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'rounding',
  name: 'Rounding & Estimating',
  category: 'decimals',
  glyph: '≈',
  blurb: 'Close enough, on purpose — and knowing when that is the right answer.',
  answerInput: 'decimal',
  dependsOn: ['decimals'],
  levels: LEVELS,

  /** The working, a line at a time: which column, which neighbors, which way. */
  lesson(problem) {
    if (problem.visual?.kind !== 'evalmodel') return null;
    const { lines, rules } = problem.visual;
    const steps = [{ caption: problem.visual.hint ?? 'What is being asked?', opts: { reveal: 1 } }];
    rules.forEach((rule, i) => {
      steps.push({
        caption: i === rules.length - 1 ? `Which gives ${lines[i + 1]}.` : `${rule}: ${lines[i + 1]}.`,
        opts: { reveal: i + 2 },
      });
    });
    return steps;
  },
};
