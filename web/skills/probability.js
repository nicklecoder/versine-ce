/**
 * Probability: how likely something is, as a number from 0 to 1.
 *
 * When every outcome is equally likely, a probability is a count over a
 * count: the outcomes you want, out of all of them. Everything else on these
 * levels follows from that. The complement is what is left of 1. A sample
 * space lists the outcomes of two or more steps, so the counting cannot miss
 * any. Two independent events happen together with the product of their
 * probabilities. An expected count is the probability times the number of
 * trials. Experimental probability is what actually happened, which wanders
 * around the theoretical value and settles toward it over many trials.
 *
 * The trap each level is built around is a wrong whole: counting the
 * outcomes wanted against the outcomes not wanted (3 red to 9 blue is 3/12,
 * not 3/9), adding where independent events multiply, and treating one
 * short run of trials as the truth.
 *
 * Fractions are accepted in any equivalent form: 3/12 is the same
 * probability as 1/4, and simplifying is fractions' lesson, not this one's.
 */

export const LEVELS = [
  { name: 'Likelihood', slug: 'likelihood',
    blurb: '0 is impossible and 1 is certain. Below 1/4 is unlikely, above 3/4 likely, and 1/2 is a toss-up.' },
  { name: 'Single Event', slug: 'single-event',
    blurb: 'The outcomes you want over all the outcomes, when each is equally likely.' },
  { name: 'Complement', slug: 'complement',
    blurb: 'The chance it does not happen is what is left: 1 − P, or 100% − P.' },
  { name: 'Sample Spaces', slug: 'sample-spaces',
    blurb: 'List every outcome of two or more steps. Heads then tails is not tails then heads.' },
  { name: 'Independent "And"', slug: 'independent-and',
    blurb: 'When one result cannot change the other, multiply their probabilities.',
    dependsOn: [{ skill: 'frac-muldiv', level: 1 }] },
  { name: 'Expected Frequency', slug: 'expected-frequency',
    blurb: 'Probability times the number of trials: about how many times to expect it.',
    dependsOn: [{ skill: 'frac-muldiv', level: 2 }] },
  { name: 'Experimental vs Theoretical', slug: 'experimental-vs-theoretical',
    blurb: 'What happened, over the trials made, against what should happen. More trials bring them closer.' },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [20, 30, 25, 35, 35, 30, 35, 35];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'probability',
  name: 'Probability',
  category: 'probability',
  glyph: '⚄',
  blurb: 'Likelihood, single events, complements, sample spaces, independent events and expected counts.',
  answerInput: 'frac',
  // Independent events multiply fractions, and an expected count is a
  // fraction of a quantity (frac-muldiv); a chance can be given as a
  // percent, and its complement is then 100% less it (percents).
  dependsOn: ['frac-muldiv', 'percents'],
  levels: LEVELS,
};
