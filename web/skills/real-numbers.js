/**
 * Rational and irrational numbers.
 *
 * The decimals skill showed that every terminating decimal is a fraction.
 * This finishes the thought in both directions: every fraction is a decimal
 * that either ends or repeats, every repeating decimal is a fraction, and the
 * numbers that do neither -- √2, π -- are a different kind of number, not a
 * fraction nobody has found yet.
 *
 * Ends or repeats comes first because it is what decides the rest, and it is
 * decided by the bottom of the fraction in lowest terms, which is a fact
 * about factors rather than about long division. 3/12 ends, because it is
 * 1/4; the 3 in 12 was never really there.
 *
 * Pin It Down is the estimation that makes an irrational number usable:
 * √20 lies between 4.4 and 4.5, and squaring the halfway point settles which
 * it is nearer. No calculator, and no guessing.
 *
 * Sums and products get their own level because the rule a student makes up
 * -- "anything with a root in it is irrational" -- is wrong in exactly the
 * cases that matter later: √2 × √8 is 4, and √3 − √3 is nothing at all.
 */

export const LEVELS = [
  { name: 'Ends or Repeats', slug: 'ends-or-repeats',
    blurb: 'Every fraction is a decimal that stops or cycles. The bottom decides which.' },
  {
    name: 'Repeating Into Fractions', slug: 'repeating-into-fractions',
    blurb: 'Ninths repeat one digit and ninety-ninths repeat two. Work backwards from that.',
    dependsOn: [{ skill: 'frac-equiv', level: 2 }],
  },
  { name: 'Rational or Not', slug: 'rational-or-not',
    blurb: 'A fraction in disguise, or a number no fraction can reach?' },
  { name: 'Which Is Bigger', slug: 'which-is-bigger',
    blurb: 'A root against a decimal, π against its stand-ins. Square both, or expand both.' },
  {
    name: 'Pin It Down', slug: 'pin-it-down',
    blurb: 'Trap a square root between tenths, then square the halfway point.',
    dependsOn: [{ skill: 'roots', level: 1 }, { skill: 'rounding', level: 1 }],
  },
  {
    name: 'Sums and Products', slug: 'sums-and-products',
    blurb: 'Does mixing in a root keep it irrational? Usually. Not always.',
    dependsOn: [{ skill: 'roots', level: 0 }],
  },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [14, 22, 12, 18, 28, 16, 22];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'real-numbers',
  name: 'Rational & Irrational',
  category: 'powers',
  glyph: '√2',
  blurb: 'Which numbers are fractions in disguise, and which never can be.',
  answerInput: 'frac',
  dependsOn: ['decimals', 'frac-equiv', 'roots', 'rounding'],
  levels: LEVELS,

  /** One line of working per step, the same as the other Powers skills. */
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
