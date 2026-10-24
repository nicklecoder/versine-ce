/**
 * Radical Equations: solving with a root, or a fractional power, in them.
 *
 * Get the root on its own, then undo it: square a square root, cube a cube
 * root, raise a power p/q to q/p. Squaring both sides can make a false
 * equation true, since −3 and 3 square to the same 9, so every answer from
 * a square root goes back into the original equation, and one that fails is
 * extraneous and thrown away. A cube root takes negatives as they come and
 * never adds a false answer.
 */

export const LEVELS = [
  { name: 'Isolate & Square', slug: 'isolate-and-square',
    blurb: 'Get the root alone first, then square both sides: 2√(x + 1) − 3 = 5 becomes √(x + 1) = 4, then x + 1 = 16.',
    // Undoing the + and × around the root is a two-step equation; √ undone is a perfect square.
    dependsOn: [{ skill: 'equations', level: 2 }, { skill: 'roots', level: 0 }] },
  { name: 'Extraneous Roots', slug: 'extraneous-roots',
    blurb: 'Squaring √(x + 7) = x + 1 gives a quadratic with two answers; check both, since a root is never negative.',
    dependsOn: [{ skill: 'quadratic-eq', level: 1 }] },
  { name: 'Both Sides Radical', slug: 'both-sides-radical',
    blurb: 'A root each side, or a multiple of one: square both and solve, then check that neither root is of a negative.' },
  // Added: squaring twice had been 2% of Both Sides Radical, which promised it.
  { name: 'Square Twice', slug: 'square-twice',
    blurb: 'A number beside a root leaves a root after squaring: get it alone and square again, then check every answer.' },
  { name: 'Cube Roots', slug: 'cube-roots',
    blurb: 'Cube both sides to undo ∛. A cube root of a negative is negative, so nothing is extraneous.',
    dependsOn: [{ skill: 'roots', level: 4 }] },
  { name: 'Rational Exponents', slug: 'rational-exponents',
    blurb: 'x^(p/q) = c: raise both sides to q/p. An even p gives ± two answers; an even q means the base cannot be negative.',
    dependsOn: [{ skill: 'rational-exponents', level: 2 }] },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [45, 90, 70, 100, 40, 60, 70];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'radical-eq',
  name: 'Radical Equations',
  category: 'equations',
  glyph: '√x = 3',
  blurb: 'Isolating and squaring, extraneous answers, roots on both sides, squaring twice, cube roots and fractional powers.',
  answerInput: 'solutions',
  // Solving from equations and quadratic-eq; roots and powers from their skills.
  dependsOn: ['equations', 'roots', 'quadratic-eq', 'rational-exponents'],
  levels: LEVELS,
};
