/**
 * Forms of a line, and lines related to other lines.
 *
 * Linear Equations writes every line as y = mx + b. Two other forms are in
 * every Algebra I course because each is the natural one somewhere:
 * point-slope is what you can write down the moment you know a slope and a
 * point, and standard form is how a line arrives from a situation with two
 * quantities in it (3 adults' tickets and 2 children's cost $24). Both
 * levels ask for the line back as y = mx + b, so the rearranging is the
 * skill and the answer is judged the same way as everywhere else.
 *
 * Horizontal and vertical lines get their own level because they are the
 * two places the slope-intercept form gives out: y = 3 has slope 0, and
 * x = 3 has no slope at all and cannot be written as y = anything.
 *
 * Parallel and perpendicular are slope facts -- same slope; slopes that
 * multiply to −1 -- and are asked first as lines to write and then as a
 * judgement between two given lines, since recognizing a negative
 * reciprocal is the half students find hardest.
 *
 * Which Form is the strategy level: given what is known, which form gets to
 * the answer with the least work. It comes last, after every form has been
 * met, as a strategy level must.
 */

export const LEVELS = [
  { name: 'Point-Slope Form', slug: 'point-slope-form',
    blurb: 'y − y₁ = m(x − x₁) is a slope and a point. Expand it to get y = mx + b.' },
  { name: 'Standard Form', slug: 'standard-form',
    blurb: 'Ax + By = C. Get y on its own: move the x term, then divide.' },
  { name: 'Horizontal and Vertical', slug: 'horizontal-and-vertical',
    blurb: 'Flat lines are y = a number. Upright lines are x = a number, and have no slope.' },
  { name: 'Parallel Lines', slug: 'parallel-lines',
    blurb: 'Parallel lines never meet, so they climb at the same rate: the same slope.' },
  { name: 'Perpendicular Lines', slug: 'perpendicular-lines',
    blurb: 'At right angles, the slope flips and changes sign: 2 becomes −1/2.' },
  { name: 'Parallel, Perpendicular or Neither', slug: 'parallel-perpendicular-or-neither',
    blurb: 'Compare the slopes. Equal, or multiplying to −1, or neither.' },
  {
    name: 'Which Form?', slug: 'which-form', kind: 'strategy',
    blurb: 'What you know decides which form is quickest to write.',
    // The choice is between writing y = mx + b at once and working from a
    // point, which is what Slope and a Point and Two Points practise.
    dependsOn: [{ skill: 'linear-eq', level: 3 }],
  },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [26, 28, 14, 28, 32, 18, 14, 28];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'line-forms',
  name: 'Forms of a Line',
  category: 'coordinates',
  glyph: 'Ax+By',
  blurb: 'Point-slope and standard form, flat and upright lines, parallel and perpendicular.',
  answerInput: 'linear',
  dependsOn: ['linear-eq'],
  levels: LEVELS,
};
