/**
 * Counting without listing: how many ways a choice can be made, and the
 * probabilities that come from those counts.
 *
 * Every count here is the multiplication principle in some form. A choice
 * made in steps multiplies the number of options at each step. Arranging n
 * things uses every one of them, n!. Arranging r of n stops after r steps,
 * nPr. When the order of the r makes no difference, every group has been
 * counted r! times over, so nCr = nPr ÷ r!. The question each problem asks
 * first is the strategy level's: does a different order make a different
 * outcome? President and treasurer do; a committee does not.
 *
 * Restrictions are dealt with at the step they limit: a first digit that
 * cannot be 0 has 9 choices, and a digit that cannot repeat has one fewer
 * each time. A probability by counting is two counts: the ways wanted over
 * all the ways, both counted the same way.
 */

export const LEVELS = [
  { name: 'Multiplication Principle', slug: 'multiplication-principle',
    blurb: 'A choice made in steps: multiply the number of options at each step.' },
  { name: 'Factorials', slug: 'factorials',
    blurb: 'n! = n × (n − 1) × … × 1: the ways to put n different things in order.' },
  { name: 'Permutations', slug: 'permutations',
    blurb: 'Order r of n things: n × (n − 1) × … for r steps. Gold, silver, bronze.' },
  { name: 'Combinations', slug: 'combinations',
    blurb: 'Choose r of n when order does not matter: nPr ÷ r!, since each group was counted r! times.' },
  { name: 'Does Order Matter?', slug: 'does-order-matter', kind: 'strategy',
    blurb: 'Would swapping two of the chosen make a different outcome? Then permutations; if not, combinations.',
    // Order first makes a difference in a sample space, where heads then
    // tails and tails then heads are two outcomes, not one.
    dependsOn: [{ skill: 'probability', level: 3 }] },
  { name: 'Restrictions', slug: 'restrictions',
    blurb: 'Deal with the limited step first: a first digit that cannot be 0, digits that cannot repeat.' },
  { name: 'Probability by Counting', slug: 'probability-by-counting',
    blurb: 'Count the ways wanted and all the ways, the same way, and divide.' },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [25, 30, 35, 40, 15, 40, 50, 40];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'counting',
  name: 'Counting',
  category: 'probability',
  glyph: 'n!',
  blurb: 'The multiplication principle, factorials, permutations and combinations, and probability by counting.',
  answerInput: 'int',
  // Counting is how a sample space is measured once it is too big to list,
  // and Probability by Counting is probability's count over a count.
  dependsOn: ['probability'],
  levels: LEVELS,
};
