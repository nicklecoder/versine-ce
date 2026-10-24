/**
 * Exponential functions: y = a·bˣ, growth by a factor rather than an amount.
 *
 * Linear models add the same amount each step; these multiply by the same
 * factor, and that one idea runs through every level. a is where it starts
 * and b is what it is multiplied by each time x goes up one, so growing 6%
 * is b = 1.06 and losing 15% is b = 0.85 -- the step from a percent to a
 * factor is its own level because 1.2 for 2% is the slip everyone makes.
 *
 * Compound interest, doubling and half-life are the same model in three
 * stories, worked as repeated multiplication so the numbers stay exact.
 * Linear or Exponential is the choice every model starts with: a constant
 * difference or a constant ratio, in a table or in words. The asymptote
 * closes it: y = a·bˣ + k gets ever closer to y = k and never reaches it.
 *
 * Every number is typed as a decimal, whole or not, so the box never says
 * which kind of answer it wants.
 */

export const LEVELS = [
  { name: 'Growth or Decay', slug: 'growth-or-decay',
    blurb: 'b above 1 grows, b between 0 and 1 decays. Watch for 2⁻ˣ.' },
  { name: 'Reading a and b', slug: 'reading-a-and-b',
    blurb: 'a is where it starts; b is what it is multiplied by each step.' },
  { name: 'Percent to Factor', slug: 'percent-to-factor',
    blurb: 'Up 6% is × 1.06, down 15% is × 0.85, and up 2% is 1.02, not 1.2.' },
  { name: 'Compound Interest', slug: 'compound-interest',
    blurb: 'Interest on the interest: multiply by the same factor each year.' },
  { name: 'Doubling and Half-Life', slug: 'doubling-and-half-life',
    blurb: 'Count the doublings, or the halvings, then multiply.' },
  {
    name: 'Linear or Exponential?', slug: 'linear-or-exponential',
    kind: 'strategy',
    blurb: 'The same amount each step, or the same factor? Or neither?',
    // The sequences question again, asked of functions and stories.
    dependsOn: [{ skill: 'sequences', level: 6 }],
  },
  { name: 'The Asymptote', slug: 'the-asymptote',
    blurb: 'a·bˣ + k gets ever closer to y = k and never gets there.' },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [10, 18, 16, 40, 35, 18, 18, 30];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'exponential',
  name: 'Exponential Functions',
  category: 'functions',
  glyph: 'bˣ',
  blurb: 'Growth and decay by a factor: percent rates, compound interest, half-life and asymptotes.',
  answerInput: 'decimal',
  dependsOn: ['functions', 'sequences', 'percents'],
  levels: LEVELS,
};
