/**
 * Proportional relationships.
 *
 * Ratio & Rate scales one ratio to another. This is the same idea seen as a
 * relationship between two quantities that vary together: y is always the
 * same number of times x. That number -- the constant of proportionality --
 * is a unit rate, it is the k in y = kx, and on a graph it is the height of
 * the line at x = 1. Three faces of one number, and the levels walk round
 * them in that order.
 *
 * Tables and graphs both get a "proportional or not" level, because the test
 * is different in each and both are where the mistake lives: a table that
 * goes up steadily is not proportional unless it would pass through zero,
 * and a straight line is not proportional unless it starts at the origin.
 *
 * Converting units is here rather than in Ratio because a conversion is a
 * proportional relationship with a famous constant: centimetres are always
 * a hundred times metres.
 */

export const LEVELS = [
  { name: 'Is It Proportional?', slug: 'is-it-proportional',
    blurb: 'Divide every y by its x. Proportional means you get the same answer every time.' },
  {
    name: 'The Constant', slug: 'the-constant',
    blurb: 'That same answer has a name. It is how much y there is for each 1 of x.',
    dependsOn: [{ skill: 'ratio', level: 4 }],
  },
  { name: 'Using y = kx', slug: 'using-y-equals-kx',
    blurb: 'Find k from one pair, then use it for any other.' },
  {
    name: 'Reading the Graph', slug: 'reading-the-graph',
    blurb: 'A proportional graph is a straight line from the origin. Its height at 1 is k.',
    dependsOn: [{ skill: 'coords', level: 1 }],
  },
  {
    name: 'Proportional or Not: Graphs', slug: 'proportional-or-not-graphs',
    blurb: 'Straight is not enough. It has to start at zero, too.',
    dependsOn: [{ skill: 'coords', level: 1 }],
  },
  { name: 'Converting Units', slug: 'converting-units',
    blurb: 'Every conversion is a constant of proportionality. Bigger unit, fewer of them.' },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [16, 16, 20, 18, 12, 18, 22];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'proportional',
  name: 'Proportional Relationships',
  category: 'ratio',
  glyph: 'y=kx',
  blurb: 'Two quantities that always keep the same ratio, in tables, equations and graphs.',
  answerInput: 'decimal',
  dependsOn: ['ratio', 'coords', 'decimals'],
  levels: LEVELS,
};
