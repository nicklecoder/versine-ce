/**
 * Logical reasoning: the parts of a conditional, the three statements made
 * from it, which of them always agree, finding a counterexample, and when a
 * conditional and its converse together make a biconditional.
 *
 * Every statement is about numbers, quadrilaterals, triangles or everyday
 * life, so its truth can be tested and not just named. The trap the levels
 * are built around is believing a converse because the statement is true:
 * "every square is a rectangle" does not make every rectangle a square.
 */

export const LEVELS = [
  { name: 'Hypothesis & Conclusion', slug: 'hypothesis-and-conclusion',
    blurb: 'In "if p, then q", p is the hypothesis and q the conclusion, however the sentence is worded.' },
  { name: 'Converse', slug: 'converse',
    blurb: 'Swap the hypothesis and the conclusion. A true statement can have a false converse.' },
  { name: 'Inverse', slug: 'inverse',
    blurb: 'Negate both parts, in place: if not p, then not q.' },
  { name: 'Contrapositive', slug: 'contrapositive',
    blurb: 'Swap and negate: if not q, then not p. It is true exactly when the statement is.' },
  { name: 'Which Is Equivalent', slug: 'which-is-equivalent',
    blurb: 'A statement agrees with its contrapositive; a converse agrees with the inverse. Nothing else is certain.' },
  { name: 'Counterexample', slug: 'counterexample',
    blurb: 'One case where the hypothesis holds and the conclusion fails proves a conditional false.' },
  { name: 'Biconditional', slug: 'biconditional',
    blurb: '"p if and only if q" is true when the statement and its converse both are.' },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [25, 30, 30, 30, 30, 35, 35, 35];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'reasoning',
  name: 'Logical Reasoning',
  category: 'shapes',
  glyph: '⇒',
  blurb: 'Conditionals, converses, inverses and contrapositives, counterexamples and biconditionals.',
  answerInput: 'choice',
  // The statements are tested on divisibility and primes (factors) and on
  // the properties of quadrilaterals and triangles (quadrilaterals, which
  // brings congruence and triangle-angles with it).
  dependsOn: ['factors', 'quadrilaterals'],
  levels: LEVELS,
};
