/**
 * The Pythagorean theorem: a² + b² = c² in a right triangle, and back.
 *
 * The squares on the two shorter sides add to the square on the longest,
 * and every level is that one fact turned a different way. Finding the
 * hypotenuse adds the squares; finding a leg takes one away, and the slip
 * worth catching is adding them anyway. Is It Right runs the theorem
 * backwards, as a test, with the longest side not always written last.
 *
 * Most triangles do not come out whole, so Exact Answers leaves the root as
 * a root and simplifies it: legs of 2 and 4 give √20 = 2√5. Distance
 * Between Points is the theorem on a grid, the run and the rise as the
 * legs; the 3D diagonal is the theorem twice. Spot the Triple is the
 * shortcut: 45 and 60 are 3 and 4 times 15, so the answer is 75 without
 * squaring anything.
 *
 * Whole-number levels take a number; the exact levels take a root, typed
 * 2sqrt(5), and their whole answers are typed the same way so the box never
 * says which kind is coming. The root must be simplified: sqrt(20) is
 * answered as right but not finished.
 */

export const LEVELS = [
  { name: 'The Hypotenuse', slug: 'the-hypotenuse',
    blurb: 'Square the legs, add, and take the root: 3, 4, 5.' },
  { name: 'A Missing Leg', slug: 'a-missing-leg',
    blurb: 'Take the square of the leg from the square of the hypotenuse. Not add.' },
  { name: 'Is It Right?', slug: 'is-it-right',
    blurb: 'Do the two shorter sides square and add to the longest? Then it has a right angle.' },
  { name: 'Exact Answers', slug: 'exact-answers',
    blurb: 'Most are not whole. Leave the root and simplify it: √20 = 2√5.' },
  { name: 'Distance Between Points', slug: 'distance-between-points',
    blurb: 'The run and the rise are the legs; the distance is the hypotenuse.' },
  { name: 'The 3D Diagonal', slug: 'the-3d-diagonal',
    blurb: 'Across the floor of the box, then up: the theorem twice, or √(l² + w² + h²).' },
  { name: 'Spot the Triple', slug: 'spot-the-triple',
    blurb: '45 and 60 are 3 and 4 times 15, so 75. No squaring needed.' },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [20, 25, 25, 40, 35, 40, 18, 35];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'pythagoras',
  name: 'The Pythagorean Theorem',
  category: 'right-triangles',
  glyph: 'a²+b²',
  blurb: 'Missing sides, the converse, exact roots, distance on a grid, and the 3D diagonal.',
  answerInput: 'int',
  dependsOn: ['roots', 'coords'],
  levels: LEVELS,
};
