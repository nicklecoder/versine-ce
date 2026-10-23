/**
 * Linear models: lines that describe something.
 *
 * Every earlier line skill hands over numbers. Here the numbers come from a
 * situation, and the work is the translation both ways -- a fixed amount and
 * a rate become b and m, and m and b in someone else's equation have to be
 * read back as "the joining fee" and "the cost per month". That reading is
 * what the standards mean by interpreting a function, and it is the reason
 * linear equations are taught at all.
 *
 * From Two Readings is the level that makes this modelling rather than
 * substitution: two measurements are all anyone ever has, and the line
 * comes from them.
 *
 * Linear or Not asks the question that decides whether a line is the right
 * model at all: does the quantity change by the same amount each step, or
 * by the same multiple? The second is exponential growth, met properly
 * later, and seeing a table that is not linear now is what makes that a
 * contrast rather than a surprise.
 *
 * Simple interest is here because it is a linear model a student will
 * meet with money attached, and Texas names it. A Graph's Story reads
 * the shape of a distance-time graph, steeper meaning faster and flat
 * meaning stopped, without any equation at all.
 */

export const LEVELS = [
  { name: 'Start and Rate', slug: 'start-and-rate',
    blurb: 'A fixed amount is b. An amount for each one is m. Write y = mx + b.' },
  { name: 'What m and b Mean', slug: 'what-m-and-b-mean',
    blurb: 'Read an equation back into the situation: which number is the rate, which the start?' },
  { name: 'From Two Readings', slug: 'from-two-readings',
    blurb: 'Two measurements are two points. The line through them is the model.' },
  { name: 'Linear or Not', slug: 'linear-or-not',
    blurb: 'Linear means the same change every step. Doubling is not linear.' },
  { name: 'Simple Interest', slug: 'simple-interest',
    blurb: 'The same interest every year: principal × rate × years.' },
  { name: 'Comparing Two Functions', slug: 'comparing-two-functions',
    blurb: 'One is a table, one an equation. Find each rate and start, then compare.' },
  { name: "A Graph's Story", slug: 'a-graphs-story',
    blurb: 'Steeper is faster. Flat is stopped. Going down is coming back.' },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [24, 16, 32, 18, 22, 26, 16, 26];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'linear-models',
  name: 'Linear Models',
  category: 'coordinates',
  glyph: '$/h',
  blurb: 'Lines that describe a situation: writing them, reading them, and knowing when one fits.',
  answerInput: 'linear',
  dependsOn: ['linear-eq', 'percents'],
  levels: LEVELS,
};
