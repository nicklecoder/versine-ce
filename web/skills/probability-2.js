/**
 * Compound probability: "or", "and" when one event changes the other, and
 * probability "given" something already known.
 *
 * Everything here is still a count over a count, but the whole changes. For
 * "A or B" the overlap would be counted twice, so it is taken off once:
 * P(A or B) = P(A) + P(B) − P(A and B). For "A given B" the whole shrinks to
 * B alone: P(A | B) = P(A and B) ÷ P(B), which in a two-way table is a cell
 * over its row or column total, not over everyone. Drawing without
 * replacement changes the second draw's whole, so the second fraction has
 * one fewer on the bottom. And two events are independent exactly when
 * knowing one leaves the other's probability where it was: P(A | B) = P(A),
 * or P(A and B) = P(A) × P(B).
 *
 * Fractions are accepted in any equivalent form, as in probability.
 */

export const LEVELS = [
  { name: 'Venn Diagrams', slug: 'venn-diagrams', libraryCap: 500,
    blurb: 'And is the overlap, or is everything in either circle, and neither is outside both.' },
  { name: 'Addition Rule', slug: 'addition-rule',
    blurb: 'P(A or B) = P(A) + P(B) − P(A and B): the overlap is in both, so take it off once.' },
  { name: 'Conditional From a Table', slug: 'conditional-from-a-table',
    blurb: '"Given" shrinks the whole to one row or column. Divide by its total, not by everyone.',
    // Reading a two-way table, and its row and column totals, is taught there.
    dependsOn: [{ skill: 'bivariate', level: 6 }] },
  { name: 'Without Replacement', slug: 'without-replacement',
    blurb: 'Once one is taken, there is one fewer: the second fraction has a smaller whole.' },
  { name: 'P(A | B)', slug: 'conditional-formula',
    blurb: 'P(A | B) = P(A and B) ÷ P(B), and back again: P(A and B) = P(B) × P(A | B).' },
  { name: 'Independent or Not', slug: 'independent-or-not',
    blurb: 'Independent when knowing one leaves the other unchanged: P(A and B) = P(A) × P(B).' },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [30, 40, 40, 45, 35, 45, 45];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'probability-2',
  name: 'Compound Probability',
  category: 'probability',
  glyph: 'P(A|B)',
  blurb: 'Venn diagrams, the addition rule, conditional probability, drawing without replacement and independence.',
  answerInput: 'frac',
  // Every level is probability's count over a count with a different whole,
  // and the conditional levels read a two-way table (bivariate).
  dependsOn: ['probability', 'bivariate'],
  levels: LEVELS,
};
