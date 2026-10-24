/**
 * Geometry worked in coordinates: where a segment's middle is, how far round
 * a shape is, where a point splits a segment, how much a shape on the grid
 * covers, and what slopes and lengths say about a shape.
 *
 * Each level is one tool applied to figures on the grid. The midpoint is the
 * average of the ends, and the slip is averaging an end with the middle when
 * an end is asked for. A perimeter adds side lengths, each slanted one found
 * by the distance formula -- Pythagoras on the run and the rise. A point
 * partway along is the start plus that fraction of the trip, and a ratio of
 * 1:2 is a third of the way, not a half. An area on the grid is a box with
 * right triangles cut from its corners.
 *
 * Slopes settle shape questions: equal for parallel sides, multiplying to
 * −1 for a right angle. With lengths they classify a triangle, and the
 * fourth corner of a parallelogram is where the same slide lands again.
 */

export const LEVELS = [
  { name: 'Midpoint', slug: 'midpoint',
    blurb: 'Average the x’s and average the y’s. To find an end, go as far again.' },
  { name: 'Perimeter on a Grid', slug: 'perimeter-on-a-grid',
    blurb: 'Add the sides; a slanted side is √(run² + rise²).' },
  { name: 'Partition in a Ratio', slug: 'partition-in-a-ratio',
    blurb: 'A ratio of 1:2 is a third of the way along. Start plus that much of the trip.' },
  { name: 'Area on a Grid', slug: 'area-on-a-grid',
    blurb: 'Draw the box around it and cut off the right triangles at the corners.' },
  { name: 'Slopes in Shapes', slug: 'slopes-in-shapes',
    blurb: 'Parallel sides have equal slopes; perpendicular ones multiply to −1.' },
  { name: 'Classify a Triangle', slug: 'classify-a-triangle',
    blurb: 'Equal sides make it isosceles; a slope product of −1 makes a right angle.' },
  { name: 'Complete the Parallelogram', slug: 'complete-the-parallelogram',
    blurb: 'The slide from B to A takes C to D: D = A + C − B.' },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [18, 45, 30, 40, 35, 40, 25, 35];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'coord-geometry',
  name: 'Coordinate Geometry',
  category: 'coordinates',
  glyph: '⌖',
  blurb: 'Midpoints, perimeters, partitions and areas on the grid, and shapes judged by their slopes and sides.',
  answerInput: 'pair',
  // Distances between points are Pythagoras on the grid, and right angles
  // and parallel sides come from perpendicular and parallel slopes.
  dependsOn: ['pythagoras', 'line-forms'],
  levels: LEVELS,
};
