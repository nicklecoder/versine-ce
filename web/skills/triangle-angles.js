/**
 * Angles in triangles and polygons: what the corners of a shape must add to.
 *
 * A triangle's angles make a straight line when torn off and laid side by
 * side, so they add to 180°, and every other level follows from that. The
 * exterior angle at a corner makes a straight line with the interior one, so
 * it equals the two far interior angles added -- the slip is adding the
 * near one. An isosceles triangle has two equal base angles, the ones
 * beside the third side, not beside the equal sides' meeting point.
 *
 * A polygon of n sides cuts into n − 2 triangles from one corner, so its
 * angles add to (n − 2) × 180°; a regular one shares that out equally. The
 * exterior angles of any convex polygon add to 360°, one full turn walking
 * round it, which is the quick way to a regular polygon's angles and back
 * to its number of sides. The triangle inequality closes it: the two
 * shorter sides must together be longer than the longest, or they lie flat.
 *
 * Every number answer is whole, typed in the integer box; Triangle
 * Inequality is a yes or no.
 */

export const LEVELS = [
  { name: 'Angle Sum', slug: 'angle-sum',
    blurb: 'The three angles of a triangle add to 180°.' },
  { name: 'Exterior Angle', slug: 'exterior-angle',
    blurb: 'An exterior angle equals the two far interior angles added.' },
  // Capped so the 132 whole-number cases are not drowned by the ones in x.
  { name: 'Isosceles Triangles', slug: 'isosceles-triangles', libraryCap: 400,
    blurb: 'Two equal sides, two equal base angles. Equilateral: all 60°.' },
  { name: 'Polygon Angle Sum', slug: 'polygon-angle-sum',
    blurb: 'n sides cut into n − 2 triangles: (n − 2) × 180°.' },
  { name: 'Regular Polygons', slug: 'regular-polygons',
    blurb: 'Equal angles: share the sum out, or turn 360° ÷ n at each corner.' },
  { name: 'The Exterior Sum', slug: 'the-exterior-sum',
    blurb: 'Walk round any polygon and you turn once: the exterior angles add to 360°.' },
  { name: 'Triangle Inequality', slug: 'triangle-inequality',
    blurb: 'The two shorter sides must add to more than the longest, or they lie flat.' },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [18, 20, 20, 30, 30, 25, 18, 30];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'triangle-angles',
  name: 'Triangles and Polygons',
  category: 'angles',
  glyph: '△°',
  blurb: 'Angle sums in triangles and polygons, exterior angles, isosceles and regular shapes, and the triangle inequality.',
  answerInput: 'int',
  // A straight line is 180° (the exterior angle), and the angle sums are
  // solved for x the way angles' Solve for x is.
  dependsOn: ['angles'],
  levels: LEVELS,
};
