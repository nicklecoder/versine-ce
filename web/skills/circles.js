/**
 * Circles: arcs and sectors as fractions of the whole circle, the angles
 * that stand on an arc, tangents, and the circle's equation on the plane.
 *
 * An arc or a sector is the central angle's share of 360°, applied to the
 * circumference or the area; the slips are using the wrong one of the two,
 * or the diameter for the radius. An inscribed angle is half the central
 * angle on the same arc, so a semicircle's is 90° and a cyclic
 * quadrilateral's opposite angles add to 180°. A tangent meets the radius
 * at a right angle, which turns tangent questions into Pythagoras. On the
 * plane, (x − h)² + (y − k)² = r² is that same Pythagoras, and completing
 * the square brings it out of x² + y² + Dx + Ey + F = 0.
 */

export const LEVELS = [
  { name: 'Arc Length', slug: 'arc-length',
    blurb: 'The central angle’s share of 360°, times the circumference 2πr.',
    dependsOn: [{ skill: 'area', level: 3 }] },
  { name: 'Sector Area', slug: 'sector-area',
    blurb: 'The central angle’s share of 360°, times the area πr².',
    dependsOn: [{ skill: 'area', level: 4 }] },
  { name: 'Central & Inscribed Angles', slug: 'central-and-inscribed-angles',
    blurb: 'An angle at the circle is half the angle at the center on the same arc.' },
  { name: 'Semicircles & Cyclic Quadrilaterals', slug: 'semicircles-and-cyclic-quadrilaterals',
    blurb: 'An angle in a semicircle is 90°; opposite angles of a cyclic quadrilateral add to 180°.' },
  { name: 'Tangents', slug: 'tangents',
    blurb: 'A tangent meets the radius at 90°, and two tangents from one point are equal.',
    dependsOn: [{ skill: 'pythagoras', level: 1 }] },
  { name: 'Equation of a Circle', slug: 'equation-of-a-circle',
    blurb: '(x − h)² + (y − k)² = r²: the center is (h, k), and the right side is r squared.',
    dependsOn: [{ skill: 'pythagoras', level: 4 }] },
  { name: 'Complete the Square for Center', slug: 'complete-the-square-for-center',
    blurb: 'Group the x terms and the y terms, complete each square, and read off the center and radius.',
    dependsOn: [{ skill: 'quadratic-formula', level: 1 }] },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [40, 40, 30, 35, 40, 35, 60, 45];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'circles',
  name: 'Circles',
  category: 'shapes',
  glyph: '◯',
  blurb: 'Arc length, sector area, inscribed angles, tangents and the equation of a circle.',
  answerInput: 'decimal',
  // Circumference and area come from area; the angle sums from
  // triangle-angles; tangents and the equation from pythagoras; finding the
  // center by completing the square from quadratic-formula.
  dependsOn: ['area', 'triangle-angles', 'pythagoras', 'quadratic-formula'],
  levels: LEVELS,
};
