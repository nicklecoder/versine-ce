/**
 * The Unit Circle: sine and cosine as the coordinates of a point.
 *
 * The terminal side of an angle θ crosses the circle of radius 1 at
 * (cos θ, sin θ), which defines both for every angle, not only the acute
 * angles of a right triangle. Each value is the reference angle's value with
 * the sign of the quadrant: x is negative on the left, y below the axis.
 * The special angles 30°, 45° and 60° come from the two special triangles,
 * so their values are exact: 1/2, √2/2, √3/2.
 *
 * tan θ is y/x, and sec, csc and cot are the reciprocals of cos, sin and tan,
 * each undefined where what it divides by is zero. Given one ratio and the
 * quadrant, the reference triangle and x² + y² = r² give the rest.
 */

export const LEVELS = [
  { name: 'Special Angles', slug: 'special-angles',
    blurb: 'At 30°, 45° and 60°, and on the axes: the point is (cos θ, sin θ), with values like 1/2, √2/2 and √3/2.',
    // The values are the sides of the 30-60-90 triangle, with hypotenuse 1.
    dependsOn: [{ skill: 'trig-ratios', level: 5 }] },
  { name: 'Signs by Quadrant', slug: 'signs-by-quadrant',
    blurb: 'All positive in I, sine in II, tangent in III, cosine in IV: x and y each change sign across an axis.' },
  { name: 'Around the Circle', slug: 'around-the-circle', libraryCap: 400,
    blurb: 'Any angle: the reference angle gives the size, the quadrant gives the sign.',
    dependsOn: [{ skill: 'radians', level: 3 }] },
  { name: 'Tangent', slug: 'tangent',
    blurb: 'tan θ = y/x = sin θ / cos θ, undefined where x = 0, at 90° and 270°.' },
  { name: 'sec, csc, cot', slug: 'sec-csc-cot',
    blurb: 'The reciprocals: sec θ = 1/cos θ, csc θ = 1/sin θ, cot θ = 1/tan θ, each keeping its sign.' },
  { name: 'From One Ratio, the Rest', slug: 'from-one-ratio',
    blurb: 'One ratio and the quadrant: draw the reference triangle, find the third side, then give each sign.' },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [25, 20, 35, 35, 40, 60, 40];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'unit-circle',
  name: 'The Unit Circle',
  category: 'unit-circle',
  glyph: '(x, y)',
  blurb: 'Sine and cosine as coordinates: exact values all the way round, their signs, tangent and the reciprocals, and the rest from one ratio.',
  answerInput: 'roots',
  // Angles in radians and their reference angles are radians' work; the
  // exact values come from trig-ratios' special triangles.
  dependsOn: ['radians', 'trig-ratios'],
  levels: LEVELS,
};
