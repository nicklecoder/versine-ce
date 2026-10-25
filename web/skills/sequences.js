/**
 * Sequences.
 *
 * An arithmetic sequence is a linear function whose inputs are 1, 2, 3, …,
 * and a geometric one is the first exponential a student meets. Both are
 * here, before either kind of function has a skill of its own, because the
 * list of numbers is the friendlier door: 3, 7, 11, 15 shows its step in a
 * way y = 4x − 1 does not.
 *
 * The arithmetic levels go step, any term, rule: find the difference, use
 * it to reach the 50th term (or work back to which term a number is), then
 * write the rule in n. The rule is judged by the terms it gives, so
 * 3 + 4(n − 1) and 4n − 1 are both right. The geometric levels go step,
 * then any term; a geometric rule needs exponents written in n, which the
 * answer box does not take yet, so it is asked as a term.
 *
 * Recursive Rules is the other way of saying how a sequence goes: from the
 * term before, not from n. Which Kind is the strategy level: differences
 * first, then ratios, and neither is an answer too. It comes after both
 * kinds have been met, and leans on Linear or Not, where a constant change
 * first meant a line.
 */

export const LEVELS = [
  { name: 'Common Difference', slug: 'common-difference',
    blurb: 'An arithmetic sequence adds the same number every time. Find it, or use it to fill a gap.' },
  { name: 'Any Term', slug: 'any-term',
    blurb: 'The 50th term is the first plus 49 steps, not 50: aₙ = a₁ + (n − 1)d.' },
  { name: 'Writing the Rule', slug: 'writing-the-rule',
    blurb: 'Write the nth term as a rule in n, so any term is one sum away.' },
  { name: 'Common Ratio', slug: 'common-ratio',
    blurb: 'A geometric sequence multiplies by the same number every time.' },
  { name: 'Geometric Terms', slug: 'geometric-terms',
    blurb: 'The nth term is the first times the ratio n − 1 times: a₁ · rⁿ⁻¹.' },
  { name: 'Recursive Rules', slug: 'recursive-rules',
    blurb: 'Each term from the one before it. Build up one term at a time.' },
  {
    name: 'Which Kind?', slug: 'which-kind', kind: 'strategy',
    blurb: 'Check the differences, then the ratios. Neither is an answer too.',
    // A constant difference is a constant rate of change: the test this
    // level opens with is the one Linear or Not taught on a table.
    dependsOn: [{ skill: 'linear-models', level: 3 }],
  },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [10, 24, 26, 12, 26, 24, 12, 22];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'sequences',
  name: 'Sequences',
  category: 'sequences',
  glyph: 'aₙ',
  blurb: 'Arithmetic and geometric sequences, their terms and their rules.',
  answerInput: 'int',
  dependsOn: ['linear-models', 'exponents'],
  levels: LEVELS,
};
