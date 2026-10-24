/**
 * Radians: measuring an angle by the arc it cuts off, in radii.
 *
 * One radian is the angle whose arc is as long as the radius. A full turn's
 * arc is 2πr, so a full turn is 2π radians and 180° is π: multiply by π/180
 * to go from degrees to radians, and by 180/π to come back. With the angle
 * in radians, an arc is simply s = rθ and a sector ½r²θ; the π/180 the
 * degree formulas carry is already inside θ.
 *
 * Angles that differ by whole turns share a terminal side (coterminal), and
 * every angle's reference angle is the acute angle its terminal side makes
 * with the x-axis -- the angle the unit circle's values are read from.
 * Angular speed is radians per unit of time; a point on the rim moves rω.
 *
 * Exact answers keep π, written as a fraction times π; a decimal answer is
 * rounded only at the end, with the calculator's π.
 */

export const LEVELS = [
  { name: 'Degrees to Radians', slug: 'degrees-to-radians',
    blurb: 'Multiply by π/180: 180° is π, so 30° is π/6 and 135° is 3π/4.' },
  { name: 'Radians to Degrees', slug: 'radians-to-degrees',
    blurb: 'Multiply by 180/π: π/6 is 30°, and 1 radian is about 57.3°.' },
  { name: 'Coterminal Angles', slug: 'coterminal-angles',
    blurb: 'Add or take away whole turns, 360° or 2π, until the angle lands in one turn.' },
  { name: 'Reference Angles', slug: 'reference-angles', libraryCap: 400,
    blurb: 'The acute angle to the x-axis: 180° − θ in quadrant II, θ − 180° in III, 360° − θ in IV.' },
  { name: 'Arc Length s = rθ', slug: 'arc-length',
    blurb: 'With θ in radians, the arc is the radius times the angle. Convert degrees first.',
    // Arc length as a fraction of the circumference is circles' Arc Length.
    dependsOn: [{ skill: 'circles', level: 0 }] },
  { name: 'Sector Area ½r²θ', slug: 'sector-area',
    blurb: 'With θ in radians, a sector is ½r²θ: the full circle πr² is θ = 2π of it.',
    dependsOn: [{ skill: 'circles', level: 1 }] },
  { name: 'Angular Speed', slug: 'angular-speed',
    blurb: 'Turns per minute times 2π is radians per minute; a point on the rim moves rω.' },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [25, 25, 30, 35, 40, 40, 55, 40];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'radians',
  name: 'Radians',
  category: 'unit-circle',
  glyph: 'π/6',
  blurb: 'Degrees and radians, coterminal and reference angles, arc length and sector area in radians, and angular speed.',
  answerInput: 'frac',
  // Arcs and sectors as a share of the circle are circles' work, and the
  // reference angle is the acute angle of a right triangle (trig-ratios).
  dependsOn: ['circles', 'trig-ratios'],
  levels: LEVELS,
};
