/**
 * Right-triangle trigonometry: the three ratios of a right triangle's sides,
 * named from one of its acute angles.
 *
 * Every right triangle with the same acute angle is similar, so the ratio of
 * any two of its sides depends on that angle alone: sine is opposite over
 * hypotenuse, cosine adjacent over hypotenuse, tangent opposite over
 * adjacent. Knowing an angle and a side, a ratio gives another side; knowing
 * two sides, the inverse ratio gives the angle. The two special triangles,
 * 45-45-90 and 30-60-90, have ratios exact enough to keep with a root. The
 * two acute angles share their sides with the roles swapped, so the sine of
 * one is the cosine of the other.
 *
 * The trap on every level is the side's name: "opposite" and "adjacent"
 * change with the angle, and the hypotenuse never does.
 *
 * Calculator answers are rounded only at the end, and every problem is kept
 * only where 4-place working gives the same rounded answer.
 */

export const LEVELS = [
  { name: 'Opposite & Adjacent', slug: 'opposite-and-adjacent', libraryCap: 400,
    blurb: 'The hypotenuse faces the right angle. Opposite faces the angle; adjacent touches it.' },
  { name: 'Ratios', slug: 'ratios', libraryCap: 500,
    blurb: 'SOH CAH TOA: sine is opposite over hypotenuse, cosine adjacent over hypotenuse, tangent opposite over adjacent.' },
  { name: 'Missing Side', slug: 'missing-side', libraryCap: 500,
    blurb: 'Pick the ratio that joins the side you know to the side you want, then solve.' },
  { name: 'Missing Angle', slug: 'missing-angle', libraryCap: 500,
    blurb: 'Two sides make a ratio; the inverse sine, cosine or tangent turns it into the angle.' },
  { name: '45-45-90', slug: '45-45-90', libraryCap: 400,
    blurb: 'Legs equal, hypotenuse leg × √2. Going back, divide by √2.',
    // Simplifying and rationalizing a root is taught on Exact Answers.
    dependsOn: [{ skill: 'pythagoras', level: 3 }] },
  { name: '30-60-90', slug: '30-60-90', libraryCap: 400,
    blurb: 'Short leg s, hypotenuse 2s, long leg s√3: the long leg faces the 60°.' },
  { name: 'Complementary sin/cos', slug: 'complementary-sin-cos', libraryCap: 500,
    blurb: 'The acute angles add to 90°, and sin A = cos B: one angle\'s opposite is the other\'s adjacent.' },
  { name: 'Elevation & Bearings', slug: 'elevation-and-bearings', libraryCap: 500,
    blurb: 'Heights, distances and courses: draw the right triangle, then it is a missing side or angle.' },
  { name: 'All Together', slug: 'all-together', libraryCap: 600,
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [15, 30, 45, 45, 35, 40, 30, 55, 45];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'trig-ratios',
  name: 'Trigonometric Ratios',
  category: 'right-triangles',
  glyph: 'sin',
  blurb: 'Sine, cosine and tangent in right triangles: missing sides and angles, the special triangles, and elevation and bearings.',
  answerInput: 'decimal',
  // The ratios are defined by similar right triangles (similarity), and a
  // missing third side or an exact length is the Pythagorean theorem's.
  dependsOn: ['pythagoras', 'similarity'],
  longerBecause: 'The plan names eight levels, each its own technique: naming the sides, the ratios, a missing side, a missing angle, the two special triangles with their different exact ratios, the cofunctions, and the applied problems. Merging any two would teach one of them in passing, and All Together makes nine.',
  levels: LEVELS,
};
