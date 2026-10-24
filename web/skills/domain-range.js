/**
 * Domain & Range: every input a function takes, and every output it gives.
 *
 * A formula's domain is every x it can be worked out at: nothing under a
 * square root may be negative, and no denominator may be zero. A graph's
 * domain is the shadow it casts on the x-axis and its range the shadow on
 * the y-axis, with a filled dot in, an open dot out, and an arrow running on
 * forever. The parent functions' ranges move with their transformations: a
 * vertical stretch or flip and a shift up or down change the range, and a
 * shift sideways never does. A piecewise function uses one rule on each part
 * of its domain, a step function is constant on each step, and in a story
 * the domain is what the quantity can really be: a count or a measure, from
 * where it starts to where it stops.
 */

export const LEVELS = [
  { name: 'Domain of √ and Fractions', slug: 'domain-of-roots-and-fractions', libraryCap: 600,
    blurb: 'Nothing negative under a square root and no zero denominator: everything else is in the domain.' },
  { name: 'From a Graph', slug: 'from-a-graph', libraryCap: 400,
    blurb: 'Domain is the shadow on the x-axis, range the shadow on the y-axis; open dots are out, arrows go on forever.',
    // Reading a whole graph's domain and range: functions' Domain and Range.
    dependsOn: [{ skill: 'functions', level: 5 }] },
  { name: 'Ranges of Parents', slug: 'ranges-of-parents', libraryCap: 600,
    blurb: 'x² and |x| give y ≥ 0, 2ˣ gives y > 0, 1/x never gives 0; flips and shifts up or down move the range.',
    // A range moves with a flip, a stretch and a shift: transforming functions' Combined.
    dependsOn: [{ skill: 'transformations-f', level: 4 }] },
  { name: 'Piecewise', slug: 'piecewise', libraryCap: 600,
    blurb: 'Find the piece whose condition x meets, then use only that rule; at a boundary, ≤ or a filled dot says which.' },
  { name: 'Step Functions', slug: 'step-functions', libraryCap: 600,
    blurb: '⌊x⌋ is the greatest integer at or below x, so ⌊−2.4⌋ = −3; "each hour or part of one" rounds up.' },
  // Added for F-IF.5: the plan's levels read domains but never from a story.
  { name: 'Domain in Context', slug: 'domain-in-context', libraryCap: 400,
    blurb: 'A count takes whole numbers and a measure every value between; the story says where it starts and stops.' },
  { name: 'All Together', slug: 'all-together', libraryCap: 600,
    blurb: 'Every domain and range mixed: formulas, graphs, parents and stories. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [40, 45, 40, 30, 35, 40, 45];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'domain-range',
  name: 'Domain & Range',
  category: 'functions',
  glyph: 'x ≥ 0',
  blurb: 'Domains of roots and fractions, domain and range from a graph, ranges of the parents, piecewise and step functions, and domains in context.',
  answerInput: 'solutions',
  // Domain and range first appear in functions; the parents and how they
  // move are transforming functions'.
  dependsOn: ['functions', 'transformations-f'],
  levels: LEVELS,
};
