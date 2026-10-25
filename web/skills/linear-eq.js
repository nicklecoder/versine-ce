/**
 * Linear equations: y = mx + b.
 *
 * Slope says how steep a line is. This skill gives the line a name: one
 * equation that every point on it satisfies and no other point does. The
 * levels go from reading the two numbers out of an equation, to writing the
 * equation from what is known -- a picture, a slope and a point, two points
 * -- and then back the other way, to where the line crosses the axes and
 * whether a point is on it at all.
 *
 * Reading m and b is first and gets a level of its own because the equation
 * is not always written in the order the name promises: y = 4 − 2x has slope
 * −2 and intercept 4, and a student who reads "the first number is the
 * slope" will be wrong for the rest of the skill.
 *
 * Answers are typed as equations and judged as lines, so y = x/2 + 3 and
 * y = 0.5x + 3 are both right. What the levels ask for is y on its own,
 * which is the form the name of the skill promises.
 */

export const LEVELS = [
  { name: 'Reading m and b', slug: 'reading-m-and-b',
    blurb: 'The number with x is the slope; the number on its own is where it crosses the y-axis.' },
  { name: 'From a Graph', slug: 'from-a-graph',
    blurb: 'Where does it cross the y-axis? How steep is it? That is the whole equation.' },
  { name: 'Slope and a Point', slug: 'slope-and-a-point',
    blurb: 'Put the point into y = mx + b and the only unknown left is b.' },
  { name: 'Two Points', slug: 'two-points',
    blurb: 'Slope from the two points first, then b from either one.' },
  { name: 'Crossing the x-Axis', slug: 'crossing-the-x-axis',
    blurb: 'On the x-axis, y is 0. Set it to 0 and solve.' },
  { name: 'On the Line?', slug: 'on-the-line',
    blurb: 'A point is on a line exactly when its numbers make the equation true.' },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [12, 26, 26, 32, 20, 16, 26];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'linear-eq',
  name: 'Linear Equations',
  category: 'coordinates',
  glyph: 'mx+b',
  blurb: 'Writing a line as y = mx + b, and reading one back.',
  answerInput: 'linear',
  dependsOn: ['slope', 'evaluate', 'equations'],
  levels: LEVELS,
};
