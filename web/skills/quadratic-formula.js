/**
 * Completing the square and the quadratic formula.
 *
 * Quadratic Equations stopped at the ones that factor. Most do not, and
 * completing the square is how every one of them is solved: add the number
 * that makes x² + 6x a square, (x + 3)², and the equation becomes one that
 * square roots finish. The skill builds that number first, on its own,
 * because it is the whole idea -- half of b, squared.
 *
 * The formula is completing the square done once, in general, so it comes
 * second and is never presented as something to take on trust. The
 * discriminant is the part of it under the root, and says before any
 * solving how many solutions there are. Exact Radical Answers is the
 * finishing: (4 ± √32)/2 is right and unfinished, and 2 ± 2√2 is done.
 *
 * Answers are typed exactly, with ±: x = −3 ± √7, x = (−3 ± √17)/4.
 */

export const LEVELS = [
  { name: 'Make a Square', slug: 'make-a-square',
    blurb: 'What makes x² + 6x a perfect square? Half of 6, squared.' },
  { name: 'Completing the Square', slug: 'completing-the-square',
    blurb: 'Make the square, then root both sides. Every quadratic gives way.' },
  { name: 'The Formula', slug: 'the-formula',
    blurb: 'x = (−b ± √(b² − 4ac)) / 2a: completing the square, done once for all.' },
  { name: 'The Discriminant', slug: 'the-discriminant',
    blurb: 'b² − 4ac: positive, two solutions; zero, one; negative, none.' },
  { name: 'Exact Radical Answers', slug: 'exact-radical-answers',
    blurb: 'Simplify the root, then divide everything you can: 2 ± 2√2, not (4 ± √32)/2.' },
  {
    name: 'Which Method?', slug: 'which-method',
    kind: 'strategy',
    blurb: 'Square roots, factoring, completing the square or the formula: which is least work?',
    // The same choice as before with two more ways in it.
    dependsOn: [{ skill: 'quadratic-eq', level: 4 }],
  },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [12, 45, 50, 22, 55, 16, 45];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'quadratic-formula',
  name: 'The Quadratic Formula',
  category: 'equations',
  glyph: '−b ± √',
  blurb: 'Completing the square, the quadratic formula and the discriminant, with exact answers.',
  answerInput: 'roots',
  dependsOn: ['quadratic-eq', 'roots'],
  levels: LEVELS,
};
