/**
 * Using expressions: putting numbers into them, and writing them from words.
 *
 * Simplifying Expressions rearranges an expression without ever asking what
 * it is worth. This is the other half: an expression is a rule for a number,
 * and substituting is running the rule. Formulas are the same thing with a
 * name attached, and they are where most students first meet algebra doing
 * a job.
 *
 * Negatives get their own level for one reason: x² at x = −3 is 9, and −x²
 * at x = −3 is −9, and a student who has only ever substituted positives has
 * never had to decide which is which.
 *
 * Writing from words comes in two parts. Typed answers are judged by form,
 * so the level that asks a student to type an expression uses only phrases
 * with one natural written form -- "7 less than twice n" -- while the
 * phrases that could fairly be written bracketed or expanded ("three times
 * the sum of n and 4") are asked as a choice between expressions, which is
 * where the wrong readings can be put side by side.
 */

export const LEVELS = [
  { name: 'Substitute a Number', slug: 'substitute-a-number',
    blurb: 'The letter stands for a number. Put it in and do the arithmetic, in order.' },
  {
    name: 'Substitute a Negative', slug: 'substitute-a-negative',
    blurb: 'Brackets round the negative, every time. Squaring it is where they earn their keep.',
    dependsOn: [{ skill: 'int-muldiv', level: 1 }],
  },
  { name: 'Formulas', slug: 'formulas',
    blurb: 'A formula is an expression with a job. Several letters, one answer.' },
  { name: 'Words Into Symbols', slug: 'words-into-symbols',
    blurb: '"Less than" turns the order around. Read the whole phrase before writing.' },
  { name: 'Which Expression Fits', slug: 'which-expression-fits',
    blurb: 'A situation and four expressions. Only one says what the words say.' },
  {
    name: 'Equivalent or Not', slug: 'equivalent-or-not',
    blurb: 'Equal for every value, or only for some? One number can prove they differ.',
    dependsOn: [{ skill: 'simplify', level: 2 }],
  },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [16, 18, 22, 22, 20, 18, 22];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'evaluate',
  name: 'Using Expressions',
  category: 'expressions',
  glyph: 'x=3',
  blurb: 'Putting numbers into expressions, and writing expressions from words.',
  answerInput: 'int',
  dependsOn: ['order-ops', 'int-muldiv', 'simplify'],
  levels: LEVELS,

  /** Substitution is a sequence of lines, so it steps like order of operations. */
  lesson(problem) {
    if (problem.visual?.kind !== 'evalmodel') return null;
    const { lines, rules } = problem.visual;
    const steps = [{ caption: problem.visual.hint ?? 'What is this asking?', opts: { reveal: 1 } }];
    rules.forEach((rule, i) => {
      steps.push({
        caption: i === rules.length - 1
          ? `Which leaves ${lines[i + 1]}.`
          : `${i === 0 ? 'First' : 'Then'} ${rule}: ${lines[i + 1]}.`,
        opts: { reveal: i + 2 },
      });
    });
    return steps;
  },
};
