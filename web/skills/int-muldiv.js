/**
 * Multiplying and dividing positive and negative integers.
 *
 * Levels are ordered by the *idea*, not the size of the numbers. "Two
 * negatives make a positive" is the counter-intuitive one, so it gets a level
 * to itself rather than being mixed in from the start.
 */

export const LEVELS = [
  {
    name: 'Sign Rules', slug: 'sign-rules',
    blurb: 'One negative flips the answer negative.',
    // Knowing how a negative number behaves comes first.
    dependsOn: [{ skill: 'int-addsub', level: 1 }],
  },
  { name: 'Two Negatives', slug: 'two-negatives', blurb: 'The odd one: two negatives make a positive.' },
  { name: 'Dividing', slug: 'dividing',      blurb: 'Same sign rules, sharing instead of grouping.' },
  { name: 'Bigger Facts', slug: 'bigger-facts',  blurb: 'Both operations, both signs, further up the tables.' },
  {
    name: 'Owing and Falling', slug: 'owing-and-falling',
    blurb: 'A loss repeated, and a loss shared out. Where a negative product comes from.',
    // The situations only make sense once both sign rules are known.
    dependsOn: [{ skill: 'int-addsub', level: 4 }],
  },
  {
    name: 'Chains', slug: 'chains',
    blurb: 'Three at a time — count the negatives.',
    trial: { duration: 180 },
    // Evaluating three terms left to right is the same habit either way.
    dependsOn: [{ skill: 'int-addsub', level: 6 }],
  },
  { name: 'All Together', slug: 'all-together',  blurb: 'Everything mixed, with no warning which is coming. '
    + 'Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;

export const PAR_SECONDS = [10, 11, 13, 13, 20, 21, 15];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'int-muldiv',
  name: 'Integer Multiply & Divide',
  category: 'integers',
  glyph: '×',
  blurb: 'Sign rules for times and divide.',
  // Soft: a nudge about what this builds on, not a gate.
  dependsOn: ['int-addsub'],
  answerInput: 'int',
  levels: LEVELS,

};
