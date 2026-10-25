/**
 * Conic Sections: the parabola, the ellipse and the hyperbola, read from
 * their equations and drawn on the plane.
 *
 * Which conic an equation is comes from its squared terms: one letter
 * squared is a parabola, both with one sign an ellipse (a circle when the
 * two match), and opposite signs a hyperbola. A parabola is every point as
 * far from its focus as from its directrix, so (x − h)² = 4p(y − k) puts
 * the focus p above the vertex and the directrix p below it. An ellipse
 * keeps a² under its long direction and c² = a² − b² finds the foci; a
 * hyperbola keeps a² under its positive term, and c² = a² + b². Completing
 * the square brings each out of general form, as it does for a circle.
 */

export const LEVELS = [
  { name: 'Which Conic?', slug: 'which-conic',
    blurb: 'Look at the squared terms: one letter squared, both with one sign, or opposite signs.',
    // A circle's equation, and what makes one, is circles' Equation of a Circle.
    dependsOn: [{ skill: 'circles', level: 5 }] },
  { name: 'Parabola Focus & Directrix', slug: 'parabola-focus-and-directrix',
    blurb: 'In (x − h)² = 4p(y − k), the focus is p from the vertex inside the curve, and the directrix p outside it.',
    // Reading a vertex off (x − h)² is graphs of quadratics' Vertex Form.
    dependsOn: [{ skill: 'quadratic-graphs', level: 1 }] },
  { name: 'Ellipses', slug: 'ellipses',
    blurb: 'a² is the bigger denominator, under the long direction; c² = a² − b² puts the foci inside.' },
  { name: 'Hyperbolas', slug: 'hyperbolas',
    blurb: 'a² sits under the positive term, which says which way it opens; c² = a² + b², and the asymptotes rise b over a.' },
  { name: 'Writing the Equation', slug: 'writing-the-equation',
    blurb: 'From the center, a vertex and a focus: find a and c, then b, and put a² under the direction the vertex lies in.' },
  { name: 'Completing the Square', slug: 'completing-the-square',
    blurb: 'Group the x terms and the y terms, take out what multiplies each square, and complete them to find the center or vertex.',
    // Completing the square on x and y together is circles' Complete the
    // Square for Center.
    dependsOn: [{ skill: 'circles', level: 6 }] },
  { name: 'Match the Graph', slug: 'match-the-graph',
    blurb: 'Read the center, the way it opens and how far it reaches, then find the equation that says so.' },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [30, 50, 55, 55, 70, 70, 60, 60];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'conics',
  name: 'Conic Sections',
  category: 'coordinates',
  glyph: '⊃',
  blurb: 'Parabolas, ellipses and hyperbolas: which is which, their foci, vertices and asymptotes, their equations, and their graphs.',
  answerInput: 'pair',
  // A circle's equation and completing the square for its center from
  // circles; a parabola's vertex form from quadratic-graphs.
  dependsOn: ['circles', 'quadratic-graphs'],
  levels: LEVELS,
};
