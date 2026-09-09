/**
 * Factors, primes and multiples.
 *
 * This is the foundation the fraction skills were quietly standing on. A
 * student simplifies to lowest terms by dividing out the greatest common
 * factor and finds a common denominator by taking a lowest common multiple,
 * and until now the catalogue asked for both without ever having drilled
 * either. `frac-equiv` and `frac-addsub` now declare the edge, which is why
 * this skill sits early: it is arithmetic that algebra spends years cashing
 * in, first on fractions and later on factoring.
 *
 * The levels ask for the *structure* rather than the arithmetic wherever
 * there is a choice. "How many 2s are in 168?" is a question about
 * factorisation; "what is 168 ÷ 24?" is a question about division wearing a
 * factorisation's clothes, and only the first transfers to x² − 5x + 6.
 *
 * The strategy level is the one this skill exists for. Computing a GCF and
 * computing an LCM are both mechanical; knowing which of the two a situation
 * is asking for is where the marks and the sense go, and confusing them is
 * close to a definition of "bad at fractions".
 */

export const LEVELS = [
  { name: 'Factor Pairs', slug: 'factor-pairs',
    blurb: 'Factors arrive two at a time. Find one and you have found the other.' },
  {
    name: 'Primes', slug: 'primes',
    blurb: 'The smallest prime that divides it — or the number itself, when nothing does.',
    // Testing whether one number goes into another is division, done
    // repeatedly and in your head.
    dependsOn: [{ skill: 'int-muldiv', level: 2 }],
  },
  { name: 'Prime Factorisation', slug: 'prime-factorisation',
    blurb: 'Every number is one pile of primes, and only one. Which piece is missing?' },
  { name: 'Greatest Common Factor', slug: 'greatest-common-factor',
    blurb: 'The biggest number that divides both — what the two have in common.' },
  { name: 'Lowest Common Multiple', slug: 'lowest-common-multiple',
    blurb: 'Count up in each until they land together. The first place they meet.' },
  {
    name: 'GCF or LCM?', slug: 'gcf-or-lcm', kind: 'strategy',
    blurb: 'Both are easy to work out. Which one the question wants is the question.',
    // Sits after both can be computed, which is the first point at which
    // picking the wrong one costs anything -- and the arithmetic that
    // follows the choice is squarely int-muldiv's Bigger Facts.
    dependsOn: [{ skill: 'int-muldiv', level: 3 }],
  },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed, with no warning which is coming. Clear this '
      + 'against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [12, 18, 18, 20, 20, 16, 20];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'factors',
  name: 'Factors & Multiples',
  category: 'factors',
  glyph: '2×3',
  // Names both things outright, because they are what a student scanning
  // the map is looking for. "Taking numbers apart, and finding what two of
  // them share" was true, in voice, and matched nothing anybody searches
  // for -- the skill read as absent from a catalogue it is the floor of.
  blurb: 'Primes, greatest common factor, lowest common multiple — what fractions run on.',
  answerInput: 'int',
  dependsOn: ['int-muldiv'],
  levels: LEVELS,

  /**
   * One line of working per step, as the exponent rules do: breaking a pair
   * of numbers into primes and reading the shared part off is a sequence,
   * and a single derived sentence would lose the middle of it.
   *
   * Strategy levels carry no visual, so they fall back to the sentences of
   * `explain` — which for a judgement question is the whole of the argument.
   */
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
