/**
 * Adding and subtracting fractions.
 *
 * The levels walk the one idea that matters: you can only add matching units.
 * Same denominator first, then one denominator that already divides the other
 * (only one side has to change), then genuinely unlike denominators, then
 * subtraction, then simplifying.
 *
 * From the "Simplify" level onward, simplest form is required — declared per
 * level rather than hardcoded, so the requirement arrives exactly when it has
 * been taught and stays required after that.
 *
 * Two levels here are the common denominator doing jobs other than addition.
 * Which Is Bigger? is the same rewrite used to compare rather than combine,
 * and it is the reason to bother: a student who can find a common denominator
 * but still guesses at whether 1/3 beats 3/8 has learned a procedure without
 * its use. It comes twice, with the bar model and then without it, because
 * the picture is a better answer to the question than the arithmetic is --
 * two bars of the same length show you which reaches further and never make
 * you find a common denominator to see it. Teach it with the picture, then
 * ask for it again once the picture is gone.
 *
 * Crossing Zero takes away more than there was, which is the first
 * time in the fractions strand that a negative appears at all — the integer
 * skills teach the sign rules and then nothing else in the catalogue used
 * them, so the arithmetic was quietly being taught as a thing that only
 * happens to whole numbers.
 */

export const LEVELS = [
  { name: 'Same Denominator', slug: 'same-denominator', blurb: 'Matching pieces add straight across.' },
  { name: 'One Fits the Other', slug: 'one-fits-the-other', blurb: 'One denominator already divides the other — only one side changes.' },
  {
    name: 'Unlike Denominators', slug: 'unlike-denominators',
    blurb: 'The real thing: both sides rewritten before they combine.',
    // The denominator both sides are rewritten into is their lowest common
    // multiple, whether or not it is being called that yet.
    dependsOn: [{ skill: 'factors', level: 4 }],
  },
  {
    name: 'Which Is Bigger?', slug: 'which-is-bigger',
    blurb: 'A third or three eighths? Match the pieces and then just count them.',
    // The comparison is the common denominator doing a second job, so it
    // belongs immediately after the level that builds one.
    dependsOn: [{ skill: 'factors', level: 4 }],
  },
  {
    name: 'Without the Picture', slug: 'without-the-picture',
    blurb: 'The same question with the bars taken away. Work it out, do not look at it.',
    // Two bars of the same length answer the previous level for you: you can
    // see which one reaches further without having found a common
    // denominator at all, which is fine while the picture is what is being
    // taught and useless as a test of whether the method took. Same problems,
    // no picture until the answer is in.
    dependsOn: [{ skill: 'factors', level: 4 }],
  },
  { name: 'Taking Away', slug: 'taking-away', blurb: 'Subtraction, same rules.' },
  {
    name: 'Crossing Zero', slug: 'crossing-zero',
    blurb: 'Take away more than you had. The answer is a negative fraction.',
    // The arithmetic is int-addsub's, done on numerators.
    dependsOn: [{ skill: 'int-addsub', level: 2 }],
  },
  {
    name: 'Simplify the Answer', slug: 'simplify-the-answer',
    blurb: 'Right value, lowest terms. From here on, simplest form is expected.',
    requireSimplest: true,
  },
  {
    name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed, in simplest form. Clear this against the clock '
      + 'to finish the skill for the day.',
    requireSimplest: true,
  },
];

export const LAST_LEVEL = LEVELS.length - 1;

export const PAR_SECONDS = [12, 16, 20, 18, 24, 20, 22, 22, 22];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'frac-addsub',
  name: 'Add & Subtract Fractions',
  category: 'fractions',
  glyph: '⁄',
  blurb: 'Matching the pieces before you combine them.',
  answerInput: 'frac',
  dependsOn: ['int-addsub', 'factors'],
  // Nine levels, past the guide of eight. The extra one is Without the
  // Picture, which is Which Is Bigger? with the bar model taken away: the two
  // are one lesson in two sittings and would teach nothing standing apart in
  // different skills. Splitting the skill to get back under the number would
  // move the second half onto its own map tile, behind its own gate, for no
  // reason a student could see.
  longerBecause: 'the comparison is taught twice, once with the bar model and '
    + 'once without it, and the pair only works side by side',
  levels: LEVELS,

};
