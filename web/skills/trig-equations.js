/**
 * Trigonometric Equations: the angles that make a trig equation true.
 *
 * sin⁻¹, cos⁻¹ and tan⁻¹ give one angle each, from a range chosen so that
 * every value has exactly one: [−π/2, π/2] for sine and tangent, [0, π] for
 * cosine. An equation asks for every angle, so the inverse is only where
 * solving starts: isolate the function, find the reference angle, and place
 * it in each quadrant where the function has the right sign. Sine and cosine
 * repeat every 2π and tangent every π, so all the solutions are those in one
 * turn plus whole periods. An equation in sin²x, or in sin x and cos x
 * together, factors like a quadratic, and each factor is solved on its own.
 */

export const LEVELS = [
  { name: 'arcsin, arccos, arctan', slug: 'arcsin-arccos-arctan', libraryCap: 400,
    blurb: 'sin⁻¹ and tan⁻¹ answer between −π/2 and π/2, and cos⁻¹ between 0 and π: one angle each.' },
  // Added: a set of angles is typed in degrees, where each one is a number.
  { name: 'Solve in Degrees', slug: 'solve-in-degrees',
    blurb: 'Isolate the function, find the reference angle, then every angle in 0° to 360° with that sign.',
    // Placing an angle by its reference angle: the unit circle's Around the Circle.
    dependsOn: [{ skill: 'unit-circle', level: 2 }] },
  { name: 'Solve on [0, 2π)', slug: 'solve-on-0-2pi', libraryCap: 500,
    blurb: 'The same in radians: one turn is 2π, so a reference angle of π/6 gives π/6, 5π/6, 7π/6 or 11π/6.' },
  { name: 'General Solutions', slug: 'general-solutions', libraryCap: 500,
    blurb: 'Every solution is one in the first turn plus whole periods: + 2πk for sine and cosine, + πk for tangent.',
    // The period of sin(bx) is 2π/b: the graphs of sine and cosine's Period.
    dependsOn: [{ skill: 'trig-graphs', level: 1 }] },
  { name: 'Quadratic-Type', slug: 'quadratic-type', libraryCap: 400,
    blurb: 'Factor as if sin x were a letter, then solve each factor; never divide by sin x, which throws solutions away.',
    // sin²x + cos²x = 1 turns cos²x into sine: the identities' Pythagorean.
    dependsOn: [{ skill: 'identities', level: 0 }] },
  { name: 'All Together', slug: 'all-together', libraryCap: 600,
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [35, 60, 50, 50, 80, 60];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'trig-equations',
  name: 'Trig Equations',
  category: 'identities',
  glyph: 'sin x = ½',
  blurb: 'The inverse functions, solving in one turn in degrees and radians, every solution with + 2πk, and equations that factor.',
  answerInput: 'solutions',
  // Exact values all the way round, the period of each graph, and the
  // Pythagorean identity for the equations that mix sine and cosine.
  dependsOn: ['unit-circle', 'trig-graphs', 'identities'],
  levels: LEVELS,
};
