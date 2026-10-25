/**
 * Compound inequalities.
 *
 * Two conditions at once. "And" keeps the numbers that pass both, which on
 * a number line is the overlap -- usually a stretch between two numbers,
 * written −2 < x ≤ 5. "Or" keeps the numbers that pass either, usually two
 * rays pointing away from each other. The levels read each kind off a
 * picture first, then solve each, then meet the case students get wrong
 * most: dividing the middle of a double inequality by a negative, which
 * turns both signs at once.
 *
 * And or Or? puts two conditions side by side and asks for the set they
 * make, which is where "no solution" and "all real numbers" stop being
 * trick answers and become what the overlap and the union plainly are.
 *
 * Answers are sets, typed the way they are written -- −2 < x ≤ 5, x < −1 or
 * x > 3 -- and judged as sets, so 5 ≥ x > −2 and (−2, 5] are right too.
 * Interval Notation is the one level that asks about the notation itself,
 * so it is a choice: a typed set would accept the inequality copied back.
 */

export const LEVELS = [
  { name: 'Between Two Numbers', slug: 'between-two-numbers',
    blurb: '"And" is the overlap: a stretch between two numbers, written −2 < x ≤ 5.' },
  { name: 'Either Side', slug: 'either-side',
    blurb: '"Or" is either one: two rays pointing apart, written x < −1 or x > 3.' },
  { name: 'Solving a Double Inequality', slug: 'solving-a-double-inequality',
    blurb: 'Three parts. Do the same thing to all three until x stands alone.' },
  { name: 'Solving an Or', slug: 'solving-an-or',
    blurb: 'Solve each half on its own, then keep the "or" between them.' },
  { name: 'A Negative in the Middle', slug: 'a-negative-in-the-middle',
    blurb: 'Divide the middle by a negative and both signs turn. Then put it back in order.' },
  { name: 'And or Or?', slug: 'and-or-or',
    blurb: 'Two conditions. "And" keeps what passes both; "or" keeps what passes either.' },
  { name: 'Interval Notation', slug: 'interval-notation',
    blurb: 'A round bracket leaves the end out, a square one keeps it in. ∞ is never in.' },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [16, 18, 34, 38, 38, 22, 14, 32];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'compound-ineq',
  name: 'Compound Inequalities',
  category: 'inequalities',
  glyph: 'a<x<b',
  blurb: 'And, or, and the number line: double inequalities and interval notation.',
  answerInput: 'solutions',
  dependsOn: ['inequalities'],
  levels: LEVELS,
};
