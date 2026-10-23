/**
 * Systems of two linear equations.
 *
 * Two lines, one point on both. The levels start with the picture -- where
 * two drawn lines cross -- because that is what a solution to a system
 * means, and every method after it is a way of finding that point without
 * drawing. Substitution comes first because it is one equation put into
 * another, which a student who can solve one equation already owns;
 * elimination second, first where adding the equations already cancels a
 * letter, then where one has to be multiplied before anything cancels.
 *
 * None or Infinitely Many is the system version of the level of the same
 * name in Equations Both Sides: parallel lines never meet, and the same line
 * written twice meets itself everywhere. The answer is a judgement, so it is
 * a choice, and it is asked of equations rather than pictures so that the
 * algebra has to say it.
 *
 * Which Method is the strategy level, and comes after every method has been
 * practised: a letter already on its own says substitute; matching numbers
 * say eliminate; neither says multiply first. The answer is always a pair
 * (x, y), typed into two boxes in that order.
 */

export const LEVELS = [
  { name: 'Where Lines Cross', slug: 'where-lines-cross',
    blurb: 'A solution is on both lines at once. Read off where they cross.' },
  { name: 'Substitution', slug: 'substitution',
    blurb: 'One equation says what y is. Put that into the other.' },
  { name: 'Elimination', slug: 'elimination',
    blurb: 'Add or subtract the equations so one letter cancels out.' },
  { name: 'Scale First', slug: 'scale-first',
    blurb: 'Nothing cancels yet. Multiply one equation so that something will.' },
  { name: 'None or Infinitely Many', slug: 'none-or-infinitely-many',
    blurb: 'Parallel lines never meet. The same line twice meets everywhere.' },
  { name: 'From Words', slug: 'from-words',
    blurb: 'Two unknowns need two facts. Write one equation for each, then solve.' },
  {
    name: 'Which Method?', slug: 'which-method', kind: 'strategy',
    blurb: 'Substitute, eliminate, or scale first? The equations say which is least work.',
    // Every method ends in a one-letter equation, sometimes with the letter
    // on both sides after substituting: that is what is being saved work on.
    dependsOn: [{ skill: 'equations-both', level: 1 }],
  },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [16, 32, 32, 42, 22, 44, 14, 36];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'systems',
  name: 'Systems of Equations',
  category: 'equations',
  glyph: '⋈',
  blurb: 'Two equations, two unknowns, one point that fits both.',
  answerInput: 'pair',
  dependsOn: ['linear-eq', 'equations-both', 'word-equations'],
  levels: LEVELS,
};
