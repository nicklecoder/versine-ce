/**
 * Transformations of functions: one graph moved, stretched and flipped.
 *
 * Every family met so far -- x², |x|, √x, x³ -- moves the same way, and
 * that is the point of the skill: learn it once. A number outside the
 * function moves the graph up or down, as it reads; a number inside moves
 * it left or right, against the sign, because f(x − 3) reaches each height
 * 3 later. Multiplying outside stretches the heights; multiplying inside
 * squashes the widths. A minus outside flips it over the x-axis, inside
 * over the y-axis.
 *
 * Each move is asked two ways: compare two graphs by their equations, and
 * follow one point of y = f(x) to where it lands. The second is the one
 * that sticks, since it works for any f. Combined puts the moves together
 * on one point. Name the Parent reads the family through its moves, and
 * Even or Odd is the symmetry a reflection leaves unchanged.
 */

export const LEVELS = [
  { name: 'Up and Down', slug: 'up-and-down',
    blurb: 'f(x) + 3 is the graph lifted 3. Outside, it moves as it reads.' },
  { name: 'Left and Right', slug: 'left-and-right',
    blurb: 'f(x − 3) moves right 3, not left: inside, it moves against the sign.' },
  { name: 'Stretch and Squash', slug: 'stretch-and-squash',
    blurb: '2f(x) doubles every height; f(2x) halves every width.' },
  { name: 'Reflect', slug: 'reflect',
    blurb: '−f(x) flips over the x-axis, f(−x) over the y-axis.' },
  { name: 'Combined', slug: 'combined',
    blurb: 'Follow one point through every move: −2f(x − 3) + 1.' },
  { name: 'Name the Parent', slug: 'name-the-parent',
    blurb: 'However it is moved, a parabola is still x² underneath.' },
  { name: 'Even or Odd', slug: 'even-or-odd',
    blurb: 'Even if f(−x) = f(x), odd if f(−x) = −f(x), and most are neither.' },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [12, 14, 18, 14, 25, 12, 20, 22];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'transformations-f',
  name: 'Transforming Functions',
  category: 'functions',
  glyph: 'f(x−h)',
  blurb: 'Shifts, stretches and reflections of x², |x|, √x and x³, and even and odd functions.',
  answerInput: 'pair',
  dependsOn: ['quadratic-graphs', 'abs-value', 'roots'],
  levels: LEVELS,
};
