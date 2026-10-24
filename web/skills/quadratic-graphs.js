/**
 * Graphs of quadratics: the parabola, read from its equation.
 *
 * A quadratic can be written three ways, and each shows one thing on sight.
 * Vertex form, a(x − h)² + k, shows the turning point; factored form,
 * a(x − p)(x − q), the zeros; standard form, ax² + bx + c, the y-intercept.
 * The levels take the three in turn, and the strategy level is the point of
 * it all: asked for a feature, know whether to read it off, substitute, or
 * work for it.
 *
 * Up or Down comes first because it is the sign of a alone, whatever form
 * the equation is in -- and is still missed when the a is hiding, as in
 * (2 − x)(x + 4). Vertex Form is where (x + 3)² gets its vertex at −3, not 3.
 * Max and Min puts the vertex to work: the top of a ball's flight, the
 * largest pen a fence can make.
 *
 * Answers are a point typed as a pair, the zeros as a list, a form typed as
 * an expression, or a number.
 */

export const LEVELS = [
  { name: 'Up or Down', slug: 'up-or-down',
    blurb: 'The sign of the x² term decides: a lowest point, or a highest.' },
  { name: 'Vertex Form', slug: 'vertex-form',
    blurb: 'a(x − h)² + k turns at (h, k). Mind the sign: (x + 3)² turns at −3.' },
  { name: 'Zeros From Factored Form', slug: 'zeros-from-factored-form',
    blurb: 'a(x − p)(x − q) crosses the x-axis at p and q.' },
  { name: 'Vertex From −b/2a', slug: 'vertex-from-b-2a',
    blurb: 'Standard form hides the vertex: x = −b/2a, then put it back in for y.' },
  { name: 'Into Vertex Form', slug: 'into-vertex-form',
    blurb: 'Complete the square to bring the vertex out.' },
  { name: 'Max and Min in Context', slug: 'max-and-min-in-context',
    blurb: 'The highest a ball goes, the biggest pen a fence makes: the vertex, read in words.' },
  {
    name: 'Which Form Shows It?', slug: 'which-form-shows-it',
    kind: 'strategy',
    blurb: 'Vertex, zeros or y-intercept: read it off, or work for it?',
    // Working for the zeros of a standard form is solving it, and choosing
    // how to solve it is that skill's own strategy level.
    dependsOn: [{ skill: 'quadratic-formula', level: 5 }],
  },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [10, 16, 16, 30, 40, 40, 14, 30];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'quadratic-graphs',
  name: 'Graphs of Quadratics',
  category: 'functions',
  glyph: '∪',
  blurb: 'The parabola from its equation: vertex, zeros, direction, and maxima in context.',
  answerInput: 'pair',
  dependsOn: ['quadratic-formula', 'functions'],
  levels: LEVELS,
};
