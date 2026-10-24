/**
 * Adding and subtracting positive and negative integers.
 *
 * Levels are ordered by the *idea*, not by the size of the numbers:
 * "subtracting a negative" is the hard one, so it gets a level of its own
 * rather than being buried in a general mix.
 *
 * One level asks the questions in words, and it is not decoration. Every
 * other level in this skill is symbols, so a student could clear the whole
 * thing having never once been told what a negative number *is* — and the
 * sign rules are exactly the arithmetic that a student will happily apply
 * backwards if they have no situation to check the answer against. −6 rising
 * by 9 is 3 and obviously not −15, and a thermometer says so faster than a
 * rule does. It sits after the four mechanical levels and before Chains: the
 * rules first, then what they are for, then speed.
 */

export const LEVELS = [
  { name: 'First Steps', slug: 'first-steps',           blurb: 'Positive second number. Find your feet on the line.' },
  { name: 'Adding Negatives', slug: 'adding-negatives',      blurb: 'Adding a negative walks you backwards.' },
  { name: 'Subtracting Negatives', slug: 'subtracting-negatives', blurb: 'The tricky one: subtracting a negative adds. Some take away a positive, so look first.' },
  { name: 'Mixed Integers', slug: 'mixed-integers',        blurb: 'Both operations, both signs, bigger numbers.' },
  {
    name: 'Above and Below Zero', slug: 'above-and-below-zero',
    blurb: 'Temperatures, floors, balances. The same line, with something on it.',
  },
  {
    // How far from zero, and how far apart. The second is the one that
    // matters later: the distance from −4 to 6 is |6 − (−4)|, which is the
    // subtraction this skill teaches with a reason attached, and it is the
    // distance formula's first appearance in one dimension.
    name: 'Absolute Value', slug: 'absolute-value',
    blurb: 'How far from zero, whichever side. Then how far apart two numbers are.',
  },
  {
    name: 'Chains', slug: 'chains',
    blurb: 'Three terms at once, left to right.',
    // Three terms take roughly twice as long to work through as two, so the
    // default two-minute clock made this level near-unpassable.
    trial: { duration: 180 },
  },
  { name: 'All Together', slug: 'all-together', blurb: 'Everything mixed, with no warning which is coming. '
    + 'Clear this against the clock to finish the skill for the day.' },
];

/** The last level is always the mixed review: it draws from every level before it. */
export const LAST_LEVEL = LEVELS.length - 1;

export const PAR_SECONDS = [11, 12, 14, 12, 20, 14, 20, 16];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'int-addsub',
  name: 'Integer Add & Subtract',
  category: 'integers',
  glyph: '±',
  blurb: 'Positive and negative numbers on the line.',
  answerInput: 'int',
  levels: LEVELS,

};
