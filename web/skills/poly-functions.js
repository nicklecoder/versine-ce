/**
 * Polynomial Functions: reading a polynomial's graph from its formula.
 *
 * Each factor x − a is a zero at a; its power is the multiplicity, and an
 * odd one crosses the axis where an even one touches and turns back. The
 * leading term decides the ends. A degree-n polynomial turns at most n − 1
 * times, and the sign between its zeros, read off the factors, solves an
 * inequality.
 */

export const LEVELS = [
  { name: 'Zeros & Multiplicity', slug: 'zeros-and-multiplicity',
    blurb: 'Each factor gives a zero; its power is the multiplicity. Odd crosses the x-axis, even touches and turns back.',
    // Zeros read from factors, and a common factor of x taken out first.
    dependsOn: [{ skill: 'quadratic-graphs', level: 2 }, { skill: 'factoring', level: 0 }] },
  { name: 'End Behavior', slug: 'end-behavior',
    blurb: 'Only the leading term matters far out: even degree, both ends the same way; odd, opposite ways. A negative lead flips it.',
    dependsOn: [{ skill: 'polynomials', level: 0 }, { skill: 'quadratic-graphs', level: 0 }] },
  { name: 'Sketch From Factors', slug: 'sketch-from-factors',
    blurb: 'Match a graph to its formula: where it meets the axis, whether it crosses or bounces there, and which way the ends go.',
    dependsOn: [{ skill: 'functions', level: 3 }] },
  { name: 'Turning Points', slug: 'turning-points',
    blurb: 'Degree n turns at most n − 1 times, so a graph with k turns needs degree at least k + 1.',
    dependsOn: [{ skill: 'quadratic-graphs', level: 3 }] },
  { name: 'Polynomial & Quadratic Inequalities', slug: 'polynomial-inequalities',
    blurb: 'Find the zeros, then the sign between them from the factors. Keep the intervals with the sign asked for.',
    // The answer is an "or" of intervals; the zeros come from factoring.
    dependsOn: [{ skill: 'compound-ineq', level: 1 }, { skill: 'quadratic-eq', level: 1 }] },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [40, 35, 60, 40, 90, 60];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'poly-functions',
  name: 'Polynomial Functions',
  category: 'functions',
  glyph: 'x³ − x',
  blurb: 'Zeros and multiplicity, end behavior, graphs from factors, turning points and polynomial inequalities.',
  answerInput: 'choice',
  // Zeros from quadratic-graphs and factoring; degree from polynomials; the sets from compound-ineq.
  dependsOn: ['quadratic-graphs', 'factoring', 'polynomials', 'functions', 'compound-ineq', 'quadratic-eq'],
  levels: LEVELS,
};
