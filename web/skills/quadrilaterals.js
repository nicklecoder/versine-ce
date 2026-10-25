/**
 * Quadrilaterals: what a parallelogram's sides, angles and diagonals must
 * do, what a rectangle, rhombus or square adds, and how much has to be
 * known before a shape earns one of those names.
 *
 * The properties are used, not just listed: equal opposite sides and
 * angles, adjacent angles adding to 180°, diagonals that bisect each
 * other, are equal (rectangle) or cross at right angles (rhombus). The
 * trap on every level is borrowing a property the shape does not have,
 * such as equal adjacent angles in a parallelogram, or equal diagonals in a
 * rhombus. Trapezoids, kites and the triangle midsegment follow, and the
 * last level decides a shape's name from its coordinates.
 *
 * Every naming question is asked so the inclusive and exclusive readings of
 * "trapezoid" and "kite" give the same answer.
 */

export const LEVELS = [
  { name: 'Parallelogram Properties', slug: 'parallelogram-properties',
    blurb: 'Opposite sides and opposite angles are equal; angles next to each other add to 180°.' },
  { name: 'Diagonals', slug: 'diagonals',
    blurb: 'They bisect each other in a parallelogram, are equal in a rectangle, cross at 90° in a rhombus.' },
  { name: 'Angles with Diagonals', slug: 'angles-with-diagonals',
    blurb: 'Chase the angles a diagonal makes in a rectangle or a rhombus, from its isosceles triangles.' },
  { name: 'Which Special Quadrilateral', slug: 'which-special-quadrilateral',
    blurb: 'What do the facts prove? The most specific name the shape must have, or none.' },
  { name: 'Trapezoids & Kites', slug: 'trapezoids-and-kites',
    blurb: 'The midsegment is the average of the bases; an isosceles trapezoid and a kite each have equal angles.' },
  { name: 'Triangle Midsegment', slug: 'triangle-midsegment',
    blurb: 'Joining two midpoints gives a segment parallel to the third side and half as long.' },
  { name: 'Verify on Coordinates', slug: 'verify-on-coordinates',
    blurb: 'Slopes for parallel and perpendicular sides, lengths for equal ones: name the shape.',
    // It reads slopes and side lengths off the grid, as coord-geometry's
    // Classify a Triangle does.
    dependsOn: [{ skill: 'coord-geometry', level: 5 }] },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [35, 40, 45, 30, 40, 35, 60, 45];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'quadrilaterals',
  name: 'Quadrilaterals',
  category: 'shapes',
  glyph: '▱',
  blurb: 'Parallelograms, rectangles, rhombuses, squares, trapezoids and kites: their sides, angles and diagonals.',
  answerInput: 'int',
  // The properties are proved by congruent triangles, and the algebra and
  // angle facts come with congruence's own prerequisites. The coordinates
  // level needs slopes and lengths from coord-geometry.
  dependsOn: ['congruence', 'coord-geometry'],
  levels: LEVELS,
};
