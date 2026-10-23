/**
 * Scientific notation.
 *
 * One idea, met from four sides: a number is a digit-and-a-bit times a power
 * of ten. Writing one, reading one back, putting an untidy one right and
 * comparing two are all that idea, and they come before any arithmetic so the
 * arithmetic has a form to land in.
 *
 * Conversions ask for the exponent, not the whole thing. "4 500 000 = 4.5 ×
 * 10^?" is the part a student gets wrong -- the digits are just the digits --
 * and asking for it keeps every answer a single box, the same as Powers &
 * Exponent Rules asking for the exponent rather than the value.
 *
 * Tidy It Up is its own level, ahead of the arithmetic, because multiplying
 * 3 × 10⁴ by 5 × 10² lands on 15 × 10⁶, and putting that right is the step
 * students skip. Met first on its own it is an idea; met first in the middle
 * of a product it is a trap.
 *
 * Multiplying and dividing share a level: the exponent rules are already
 * owned by Powers & Exponent Rules, and what is new here is only the split
 * into front number and power, and the tidy at the end -- the same for both.
 */

export const LEVELS = [
  { name: 'Big Numbers', slug: 'big-numbers',
    blurb: 'Slide the point until one digit is in front. The slide is the power of ten.' },
  {
    name: 'Small Numbers', slug: 'small-numbers',
    blurb: 'Less than one, so the point slides the other way and the power goes negative.',
    // 10⁻⁴ is a tenth of a tenth of a tenth of a tenth only if a negative
    // exponent already means one over the positive one.
    dependsOn: [{ skill: 'exponents', level: 4 }],
  },
  {
    name: 'Back to Standard', slug: 'back-to-standard',
    blurb: 'Read one back. The power says how far the point slides, and which way.',
    dependsOn: [{ skill: 'decimals', level: 0 }],
  },
  { name: 'Tidy It Up', slug: 'tidy-it-up',
    blurb: 'Forty-five is not a digit. Move a ten from the front into the power.' },
  { name: 'Which Is Bigger', slug: 'which-is-bigger',
    blurb: 'The power decides first. The front number only breaks a tie.' },
  {
    name: 'Multiplying and Dividing', slug: 'multiplying-and-dividing',
    blurb: 'Front numbers together, powers together, then tidy what you get.',
    dependsOn: [{ skill: 'exponents', level: 2 }, { skill: 'decimals', level: 3 }],
  },
  {
    name: 'Adding and Taking Away', slug: 'adding-and-taking-away',
    blurb: 'No rule for this. Match the powers first, then it is ordinary decimals.',
    dependsOn: [{ skill: 'decimals', level: 2 }],
  },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [16, 18, 18, 18, 12, 26, 28, 24];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'sci-notation',
  name: 'Scientific Notation',
  category: 'powers',
  glyph: '10ⁿ',
  blurb: 'Very big and very small numbers, written so you can see their size.',
  answerInput: 'int',
  dependsOn: ['exponents', 'decimals'],
  levels: LEVELS,

  /** One line of working per step, the same as the exponent rules. */
  lesson(problem) {
    // Which Is Bigger carries no visual and falls back to the sentences of
    // `explain`, which for a comparison is the whole argument.
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
