/**
 * Angle relationships: what two angles must be, because of where they sit.
 *
 * Every level is one of three facts, or a pair of them. Angles that make a
 * right angle add to 90°, angles that make a straight line add to 180°, and
 * angles all the way round a point add to 360°; vertical angles, opposite
 * each other where two lines cross, are equal because each makes a straight
 * line with the same neighbour. The slip each level names is the one people
 * make: 180 used for a complement, 180 for a full turn.
 *
 * Parallel lines cut by a transversal make only two sizes of angle, one
 * acute and one obtuse unless both are right, so any angle in the picture
 * is either equal to the one given or makes 180° with it, and the names --
 * corresponding, alternate interior, same-side interior -- say which. Solve
 * for x puts expressions on the angles and asks for the equation the
 * relationship gives: equal ones set equal, ones on a line added to 180.
 *
 * Which Equation? is that choice alone, with no picture: equal, add to 180,
 * add to 90, or nothing at all, because corresponding angles on lines that
 * are not parallel are not equal.
 *
 * Every figure is drawn on the plane without axes: an angle has no
 * coordinates, and drawing it on a grid invites reading them off.
 */

export const LEVELS = [
  // Capped: there are only so many whole-degree complements, and an uncapped
  // library would fill up with the three-part kind once the two-part ones ran out.
  { name: 'Complementary', slug: 'complementary', libraryCap: 400,
    blurb: 'Together they make a right angle: 90°. Not 180°.' },
  { name: 'Supplementary', slug: 'supplementary', libraryCap: 600,
    blurb: 'Together they make a straight line: 180°.' },
  { name: 'Vertical Angles', slug: 'vertical-angles',
    blurb: 'Where two lines cross, opposite angles are equal and neighbours add to 180°.' },
  { name: 'Around a Point', slug: 'around-a-point',
    blurb: 'All the way round is a full turn: 360°.' },
  { name: 'Parallel Lines', slug: 'parallel-lines',
    blurb: 'A transversal across parallel lines makes two sizes of angle: equal, or adding to 180°.' },
  { name: 'Solve for x', slug: 'solve-for-x',
    blurb: 'Equal angles set equal; angles on a line add to 180. Then solve.' },
  {
    name: 'Which Equation?', slug: 'which-equation',
    kind: 'strategy',
    blurb: 'Set them equal, add them to 180 or to 90, or no equation at all?',
    // Gather Then Undo is where ax + b = cx + d is solved; this is choosing
    // to write it, or a sum, from the relationship alone.
    dependsOn: [{ skill: 'equations-both', level: 1 }],
  },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [15, 15, 18, 25, 25, 50, 20, 30];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'angles',
  name: 'Angle Relationships',
  category: 'angles',
  glyph: '∠',
  blurb: 'Complementary, supplementary and vertical angles, a full turn, parallel lines, and solving for x.',
  answerInput: 'int',
  // Solve for x is ax + b = cx + d, or a sum of two such, set to 180.
  dependsOn: ['equations-both'],
  levels: LEVELS,
};
