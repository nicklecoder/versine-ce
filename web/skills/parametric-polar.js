/**
 * Parametric & Polar: curves traced by a third number, and points named by
 * a distance and an angle.
 *
 * A parametric curve gives x and y each as a function of t, so a point is
 * found by putting a value of t into both, and the curve's equation in x and
 * y by solving one for t and putting that into the other -- or, when they
 * are a cosine and a sine, by cos² t + sin² t = 1. A thrown ball is the same
 * thing with t as time. A polar point (r, θ) is r along the direction θ, so
 * x = r cos θ and y = r sin θ; going back, r is the distance from the origin
 * and θ the direction, put in the right quadrant. An equation converts the
 * same way, and r = a cos nθ, r = a ± b cos θ and r = a cos θ draw roses,
 * limaçons and circles.
 */

export const LEVELS = [
  { name: 'Plot Parametric', slug: 'plot-parametric',
    blurb: 'Put t into both equations: the point is (x(t), y(t)). Going the other way, solve x(t) for t.',
    // cos t and sin t at 0°, 90°, 180° and 270° are read off the unit circle.
    dependsOn: [{ skill: 'unit-circle', level: 2 }] },
  { name: 'Eliminate the Parameter', slug: 'eliminate-the-parameter',
    blurb: 'Solve one equation for t and substitute it into the other; for cos t and sin t, use cos² t + sin² t = 1.',
    // A cosine and a sine eliminate to an ellipse in standard form.
    dependsOn: [{ skill: 'conics', level: 2 }] },
  { name: 'Parametric Motion', slug: 'parametric-motion',
    blurb: 'A thrown ball: x = (v cos θ)t and y = h + (v sin θ)t − 16t², in feet and seconds.',
    // The two speeds are a velocity's components, and the landing time is a
    // root of the height.
    dependsOn: [{ skill: 'vectors', level: 2 }, { skill: 'quadratic-formula', level: 2 }] },
  { name: 'Polar to Rectangular', slug: 'polar-to-rectangular',
    blurb: 'x = r cos θ and y = r sin θ, exactly, from the unit circle.',
    dependsOn: [{ skill: 'unit-circle', level: 0 }, { skill: 'radians', level: 1 }] },
  { name: 'Rectangular to Polar', slug: 'rectangular-to-polar',
    blurb: 'r = √(x² + y²), and θ by the inverse tangent, put in the quadrant the point is in.',
    // The same two steps as a vector's magnitude and direction.
    dependsOn: [{ skill: 'vectors', level: 1 }] },
  { name: 'Converting Equations', slug: 'converting-equations',
    blurb: 'Replace r cos θ with x, r sin θ with y and r² with x² + y², multiplying through by r where it helps.',
    dependsOn: [{ skill: 'circles', level: 5 }] },
  { name: 'Polar Graphs', slug: 'polar-graphs',
    blurb: 'r = a cos nθ is a rose of n petals, 2n when n is even; r = a ± b cos θ is a limaçon, a cardioid when a = b; r = a cos θ is a circle.' },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [40, 55, 75, 50, 55, 50, 50, 60];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'parametric-polar',
  name: 'Parametric & Polar',
  category: 'vectors-polar',
  glyph: 'r',
  blurb: 'Parametric curves and motion, eliminating the parameter, polar coordinates both ways, converting equations, and roses, limaçons and circles.',
  answerInput: 'pair',
  // Points on the unit circle, ellipses in standard form, a thrown ball's
  // components and landing time, a polar point's r and θ as a vector's
  // magnitude and direction, radians, and circles' equations.
  dependsOn: ['unit-circle', 'conics', 'vectors', 'quadratic-formula', 'radians', 'circles'],
  levels: LEVELS,
};
