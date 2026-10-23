/**
 * Equations with the unknown in more than one place.
 *
 * The follow-on to Solving Equations, split off rather than bolted on: a
 * fourteen-level skill is a list that never ends, and a student should be able
 * to finish something. The foundations stay there, the harder work is here,
 * and this depends on that.
 *
 * The idea that carries all of it is *gathering*. Once x appears twice, you
 * cannot undo your way to it — you have to collect it on one side first, and
 * choosing which side is the first genuinely strategic decision in algebra.
 * Collecting on the side with more of them avoids a negative coefficient,
 * which is not a rule so much as a kindness a student can do for themselves.
 *
 * The level of non-whole answers exists because a student who has only ever
 * seen equations come out to integers learns to treat a fraction as evidence
 * of a mistake, and then hunts for an error that is not there.
 */

export const LEVELS = [
  { name: 'Unknowns Both Sides', slug: 'unknowns-both-sides',
    blurb: 'The letter appears twice. Collect it on one side before undoing anything.' },
  { name: 'Gather Then Undo', slug: 'gather-then-undo',
    blurb: 'Numbers on both sides too. Gather each kind, then finish as before.' },
  { name: 'Brackets First', slug: 'brackets-first',
    blurb: 'A bracket around the unknown. Divide by it, or open it — either works.' },
  { name: 'Answers That Are Not Whole', slug: 'answers-that-are-not-whole',
    blurb: 'A fraction is an answer, not a mistake. Leave it exact.' },
  {
    // 3(x + 2) = 3x + 6 is true for every x and 3x + 6 = 3x + 5 for none.
    // A student who has only met equations with one answer reads the
    // vanishing letter as a mistake and hunts for it; this is where they
    // learn it is the answer.
    name: 'No Answer or Every Answer', slug: 'no-answer-or-every-answer',
    blurb: 'Sometimes the letters cancel. What is left says whether any number works.',
  },
  {
    name: 'Which Side?', slug: 'which-side', kind: 'strategy',
    blurb: 'Collect the unknowns left or right? One choice avoids a negative.',
    dependsOn: [{ skill: 'equations', level: 2 }],
  },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [22, 26, 26, 24, 22, 18, 28];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'equations-both',
  name: 'Unknowns on Both Sides',
  category: 'equations',
  glyph: 'x↔x',
  blurb: 'When the letter appears twice, gather before you undo.',
  answerInput: 'int',
  dependsOn: ['equations', 'simplify'],
  levels: LEVELS,

  lesson(problem) {
    // The strategy level carries no visual, so it falls back to the
    // sentences of `explain` -- which for a judgement question is the
    // whole of the argument anyway.
    if (problem.visual?.kind !== 'evalmodel') return null;
    const { lines, rules } = problem.visual;
    const steps = [{ caption: problem.visual.hint ?? 'Where does the letter appear?', opts: { reveal: 1 } }];
    rules.forEach((rule, i) => {
      steps.push({
        caption: i === rules.length - 1 ? `Which leaves ${lines[i + 1]}.` : `${rule}: ${lines[i + 1]}.`,
        opts: { reveal: i + 2 },
      });
    });
    return steps;
  },
};
