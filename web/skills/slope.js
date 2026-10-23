/**
 * Slope.
 *
 * Coordinates ends on Steepness: a whole-number gradient between two points,
 * read as a unit rate. This is the full idea. A slope is usually a fraction,
 * it is negative when the line falls, and it is a rate with units when the
 * axes measure something -- which is the version a student will meet in
 * every science lesson after this one.
 *
 * Reading it off a graph comes first, and rising lines before falling ones,
 * because rise over run is something you can see before it is something you
 * calculate. Two points with no picture come after, since that is where the
 * order of subtraction starts to matter and the picture can no longer catch
 * a sign mistake.
 *
 * Zero and undefined share a level because they are the same question --
 * what happens when one of the two changes is nothing -- with opposite
 * answers. A horizontal line has no rise; a vertical one has no run, and
 * dividing by that is not something any number can be the answer to.
 */

export const LEVELS = [
  { name: 'From a Graph', slug: 'from-a-graph',
    blurb: 'Count the run along, count the rise up. Slope is rise over run.' },
  { name: 'Falling Lines', slug: 'falling-lines',
    blurb: 'Going right, the line goes down. The rise is negative, so the slope is too.' },
  { name: 'From Two Points', slug: 'from-two-points',
    blurb: 'No picture: subtract the ys, subtract the xs, in the same order.' },
  { name: 'Zero and Undefined', slug: 'zero-and-undefined',
    blurb: 'Flat lines have no rise. Vertical lines have no run, and no slope at all.' },
  { name: 'From a Table', slug: 'from-a-table',
    blurb: 'Each row is a point. How much does y change for each change in x?' },
  { name: 'Rate With Units', slug: 'rate-with-units',
    blurb: 'When the axes measure things, the slope is a rate: km per hour, litres per minute.' },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [16, 16, 20, 12, 20, 24, 20];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'slope',
  name: 'Slope',
  category: 'coordinates',
  glyph: '⟋',
  blurb: 'How steep a line is, as a fraction, with a sign, and as a rate.',
  answerInput: 'frac',
  dependsOn: ['coords', 'frac-signed'],
  levels: LEVELS,
};
