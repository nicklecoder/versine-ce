/**
 * Vectors: arrows with a length and a direction, written as ⟨a, b⟩.
 *
 * A vector is how far across and how far up its tip is from its tail, so
 * its components are the terminal point less the initial point. Its length
 * is the Pythagorean theorem on those two legs, and its direction the angle
 * it makes counterclockwise from the positive x-axis, found by the inverse
 * tangent and then put in the right quadrant. Going back, a length r at an
 * angle θ is ⟨r cos θ, r sin θ⟩. Vectors add tip to tail, component by
 * component; a scalar stretches each component; dividing by the length
 * leaves a unit vector; and forces and velocities add the same way, which
 * is what a resultant is.
 */

export const LEVELS = [
  { name: 'Components', slug: 'components',
    blurb: 'Terminal point minus initial point: how far across, then how far up.' },
  { name: 'Magnitude & Direction', slug: 'magnitude-and-direction',
    blurb: '|⟨a, b⟩| = √(a² + b²); the direction is the angle from the positive x-axis, in the quadrant the vector points into.',
    // The length is the distance formula on the two components, kept exact;
    // the angle is an inverse tangent; past 90° it is placed by its
    // reference angle.
    dependsOn: [{ skill: 'pythagoras', level: 4 }, { skill: 'trig-ratios', level: 3 }, { skill: 'unit-circle', level: 2 }] },
  { name: 'From Magnitude & Direction', slug: 'from-magnitude-and-direction',
    blurb: 'A length r at an angle θ is ⟨r cos θ, r sin θ⟩: the cosine gives across, the sine gives up.',
    // A side from the hypotenuse and an angle is trig-ratios' Missing Side.
    dependsOn: [{ skill: 'trig-ratios', level: 2 }] },
  { name: 'Adding & Subtracting', slug: 'adding-and-subtracting',
    blurb: 'Tip to tail: add the across parts and the up parts. To subtract, add the opposite.' },
  { name: 'Scalar Multiples', slug: 'scalar-multiples',
    blurb: 'k⟨a, b⟩ = ⟨ka, kb⟩: the same direction stretched, or turned round when k is negative.' },
  { name: 'Unit Vectors', slug: 'unit-vectors',
    blurb: 'Divide a vector by its length to get length 1 in the same direction; multiply that by any length you want.' },
  { name: 'Resultants', slug: 'resultants',
    blurb: 'Forces and velocities add as vectors: break each into components, add, and find the length and direction of the sum.' },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [35, 50, 45, 40, 45, 55, 90, 55];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'vectors',
  name: 'Vectors',
  category: 'vectors-polar',
  glyph: '→',
  blurb: 'Component form, magnitude and direction, adding, scaling, unit vectors, and the resultant of forces and velocities.',
  answerInput: 'vector',
  // Magnitude from the Pythagorean theorem, direction and components from
  // the trig ratios, and angles past 90° from the unit circle.
  dependsOn: ['pythagoras', 'trig-ratios', 'unit-circle'],
  levels: LEVELS,
};
