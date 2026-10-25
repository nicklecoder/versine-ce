/**
 * Rational Functions: the shape of N(x)/D(x) from its formula.
 *
 * Where the bottom is 0 the graph breaks: a vertical asymptote if the top
 * is not 0 there too, a hole if the factor cancels. Far out, the degrees
 * decide: top lower and f falls to 0, the same and it levels off at the
 * ratio of the leading coefficients, one higher and it follows a slanted
 * line, the quotient of the division. The graph crosses the x-axis where
 * the top is 0 and the bottom is not, and all of it together picks the
 * formula out from its graph.
 */

export const LEVELS = [
  { name: 'Vertical Asymptotes', slug: 'vertical-asymptotes',
    blurb: 'Factor the bottom: each zero is a vertical asymptote, unless the same factor is on top and cancels.',
    // The zeros of the bottom are the excluded values; the domain of a fraction is everything else.
    dependsOn: [{ skill: 'rational-expr', level: 1 }, { skill: 'domain-range', level: 0 }] },
  { name: 'Horizontal by Degree', slug: 'horizontal-by-degree',
    blurb: 'Compare degrees. Top lower: y = 0. The same: the ratio of the leading coefficients. Top higher: none.',
    // requiem: catalogue/graph/asymptote-met-in-rational-functions
    // Degree and leading coefficient from standard form. What an asymptote is
    // was met on Vertical Asymptotes, so exponentials need not come first.
    dependsOn: [{ skill: 'polynomials', level: 0 }] },
  { name: 'Holes', slug: 'holes',
    blurb: 'A factor on top and bottom cancels and leaves a single missing point. Its height comes from the cancelled form.',
    dependsOn: [{ skill: 'rational-expr', level: 0 }] },
  { name: 'Oblique', slug: 'oblique',
    blurb: 'Top one degree higher: divide, and the quotient is the slanted line the graph follows; the remainder fades away.',
    // The slant line is the quotient of a long division.
    dependsOn: [{ skill: 'poly-division', level: 0 }] },
  { name: 'End Behavior', slug: 'end-behavior',
    blurb: 'Far out, only the leading terms matter: f behaves like (a/b)x^(n − d), towards 0, a number, or off to ±∞.' },
  { name: 'Intercepts', slug: 'intercepts',
    blurb: 'x-intercepts are where the top is 0 and the bottom is not: a shared zero is a hole. The y-intercept is f(0).' },
  { name: 'Match the Graph', slug: 'match-the-graph',
    blurb: 'Read the graph: where it crosses, where it breaks and which way it goes, any hole, where it levels off. Then pick the formula.' },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [50, 45, 60, 70, 45, 50, 75, 60];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'rational-functions',
  name: 'Rational Functions',
  category: 'functions',
  glyph: 'N/D',
  blurb: 'Vertical and horizontal asymptotes, holes, slant asymptotes, end behavior, intercepts, and reading the graph.',
  answerInput: 'choice',
  // Factoring and excluded values from rational-expr; degree from polynomials; dividing from poly-division.
  dependsOn: ['rational-expr', 'domain-range', 'polynomials', 'poly-division'],
  levels: LEVELS,
};
