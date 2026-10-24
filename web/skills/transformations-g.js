/**
 * Moving shapes on the coordinate plane: translations, reflections,
 * rotations and dilations, one at a time and one after another, and what
 * each keeps.
 *
 * Every move is a rule on coordinates, and each level is one rule worked
 * on the corners of a shape drawn on the grid. A translation adds the same
 * amounts to every point. A reflection over an axis changes the sign of one
 * coordinate -- the slip is changing the other one -- and over a line like
 * x = 2 it keeps the distance to the line; over y = x it swaps the two. A
 * rotation about the origin swaps and changes a sign, and which sign is the
 * whole question: 90° counterclockwise takes (x, y) to (−y, x). A dilation
 * multiplies every distance from its centre.
 *
 * Sequences put two of these together, in order, which matters. The last
 * level names a move from its picture, and sorts a move or a sequence into
 * congruent (rigid moves only), similar (a dilation in it), or neither, as
 * a stretch in one direction is.
 */

export const LEVELS = [
  { name: 'Translate', slug: 'translate',
    blurb: 'Slide every point the same way: add to x, add to y.' },
  { name: 'Reflect Over an Axis', slug: 'reflect-over-an-axis',
    blurb: 'Over the x-axis, y changes sign. Over a line like x = 2, keep the distance to it.' },
  { name: 'Reflect Over y = x', slug: 'reflect-over-y-equals-x',
    blurb: 'Over y = x the coordinates swap. Over y = −x they swap and both change sign.' },
  { name: 'Rotate', slug: 'rotate',
    blurb: '90° counterclockwise about the origin takes (x, y) to (−y, x).' },
  { name: 'Dilate', slug: 'dilate',
    blurb: 'Multiply each distance from the centre by the scale factor.' },
  { name: 'Sequences', slug: 'sequences',
    blurb: 'One move, then the next, in that order.' },
  { name: 'Which Transformation?', slug: 'which-transformation',
    blurb: 'Name the move from the picture, and say whether the image is congruent or only similar.' },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [15, 18, 18, 22, 22, 30, 20, 25];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'transformations-g',
  name: 'Transformations',
  category: 'coordinates',
  glyph: '↻',
  blurb: 'Translate, reflect, rotate and dilate shapes on the grid, and tell congruent from similar.',
  answerInput: 'pair',
  // Points in all four quadrants, read and written as pairs.
  dependsOn: ['coords'],
  levels: LEVELS,
};
