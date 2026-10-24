/**
 * Area and the circle: how much flat space a shape covers, and how far round
 * a circle is.
 *
 * Every area here comes back to the rectangle. A parallelogram is one with a
 * triangle moved from one end to the other, so it is base times height, and
 * the height is measured straight across, never along the slanted side --
 * the slip the level is built around, with the slanted side labelled too. A
 * triangle is half the parallelogram on the same base and height, even when
 * its height falls outside it; a trapezoid is the average of its parallel
 * sides times the height.
 *
 * Circumference is π times the diameter, and area is π times the radius
 * squared: the two slips are using the diameter in πr² and mixing the two
 * formulas up. Answers are asked exactly, as a number of π -- the box sits
 * before a π already written -- or with 3.14 for π, which the question says.
 * Composite figures are split into rectangles, triangles and half circles,
 * or taken away from a bigger shape. Missing Dimension runs a formula
 * backwards.
 *
 * Every number is typed as a decimal, whole or not.
 */

export const LEVELS = [
  { name: 'Rectangles and Parallelograms', slug: 'rectangles-and-parallelograms',
    blurb: 'Base times height, the height straight across. Not the slanted side.' },
  { name: 'Triangles', slug: 'triangles',
    blurb: 'Half of base times height: half the parallelogram it sits in.' },
  { name: 'Trapezoids', slug: 'trapezoids',
    blurb: 'Add the parallel sides, halve, times the height.' },
  { name: 'Circumference', slug: 'circumference',
    blurb: 'π times the diameter: C = πd = 2πr.' },
  { name: 'Area of a Circle', slug: 'area-of-a-circle',
    blurb: 'π times the radius squared. Halve a diameter first.' },
  { name: 'Composite Figures', slug: 'composite-figures',
    blurb: 'Split it into shapes you know, or take a piece away from a bigger one.' },
  { name: 'Missing Dimension', slug: 'missing-dimension',
    blurb: 'Run the formula backwards: area 48 on a base of 6 is a height of 8.' },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [18, 22, 30, 25, 30, 50, 30, 35];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'area',
  name: 'Area and Circles',
  category: 'measure',
  glyph: 'A',
  blurb: 'Parallelograms, triangles, trapezoids, circumference and circle area, composite figures and missing sides.',
  answerInput: 'decimal',
  // Lengths like 4.5 and π as 3.14 make every level decimal arithmetic.
  dependsOn: ['decimals'],
  levels: LEVELS,
};
