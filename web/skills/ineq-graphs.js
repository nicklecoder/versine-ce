/**
 * Graphing linear inequalities.
 *
 * y < 2x + 1 is not a line, it is half of the plane: every point below the
 * line y = 2x + 1. The levels go from one point to the whole picture: is
 * this point in the half or not, then how the half is drawn -- a dashed
 * edge when the line itself is left out, a solid one when it is kept, and
 * which side is shaded -- first from y = mx + b, where "less than" plainly
 * means below, then from standard form, where it does not, and a test
 * point settles it.
 *
 * Inequality From a Graph is the same question backwards, answered by
 * typing the inequality, judged by the half it keeps. Systems of
 * Inequalities is where two halves overlap, and From Words is the reason
 * anyone draws one: a budget, or a target, with two quantities in it.
 */

export const LEVELS = [
  { name: 'Is It a Solution?', slug: 'is-it-a-solution',
    blurb: 'Put the point in. If the inequality is true, the point is in the shaded half.' },
  { name: 'Dashed or Solid, Above or Below', slug: 'dashed-or-solid',
    blurb: '< and > leave the line out: dashed. ≤ and ≥ keep it: solid. y > is above.' },
  { name: 'From Standard Form', slug: 'from-standard-form',
    blurb: '2x − 3y < 6 does not say which side. Test a point, like (0, 0).' },
  { name: 'Inequality From a Graph', slug: 'inequality-from-a-graph',
    blurb: 'Read the line, then the edge and the side: write the inequality.' },
  { name: 'Systems of Inequalities', slug: 'systems-of-inequalities',
    blurb: 'Two inequalities at once: only the overlap of the two halves works.' },
  { name: 'From Words', slug: 'from-words',
    blurb: 'A budget or a target with two quantities in it is an inequality in x and y.' },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [16, 14, 24, 28, 24, 30, 24];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'ineq-graphs',
  name: 'Graphing Inequalities',
  category: 'inequalities',
  glyph: 'y<',
  blurb: 'Half-planes: dashed or solid, which side, and where two of them overlap.',
  answerInput: 'halfplane',
  dependsOn: ['linear-eq', 'inequalities'],
  levels: LEVELS,
};
