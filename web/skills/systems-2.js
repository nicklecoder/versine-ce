/**
 * Systems of Equations II: curves that meet, and three letters at once.
 *
 * Where a line meets a parabola or a circle, one equation is put into the
 * other and a quadratic is left: its two roots are two points, a double root
 * is a line that only touches, and no real root means they miss, which the
 * discriminant tells without solving. Two curves meet the same way, a
 * parabola in a parabola, a circle and a parabola through x², xy = k and a
 * line. A system in x, y and z is cut to two letters by elimination, then to
 * one; three equations can still fail to fix a point, when one is the others
 * added up -- the same left side with a different right is no solution, and
 * with the same right, infinitely many. Then stories in three unknowns.
 */

export const LEVELS = [
  { name: 'Line Meets Parabola', slug: 'line-meets-parabola',
    blurb: 'Put the line into the parabola, solve the quadratic, and find each y on the line: two points, one, or none.',
    // Putting one equation into the other is systems' Substitution, and the
    // quadratic left is solved by factoring.
    dependsOn: [{ skill: 'systems', level: 1 }, { skill: 'quadratic-eq', level: 1 }] },
  { name: 'How Many Intersections', slug: 'how-many-intersections',
    blurb: 'The discriminant of the quadratic left over counts the points: positive two, zero one, negative none.',
    // b² − 4ac counting real roots is the quadratic formula's The Discriminant.
    dependsOn: [{ skill: 'quadratic-formula', level: 3 }] },
  { name: 'Line Meets Circle', slug: 'line-meets-circle',
    blurb: 'Solve the line for one letter, put it into the circle, and solve: a line crosses a circle twice, touches it once, or misses.',
    // (x − h)² + (y − k)² = r² is circles' Equation of a Circle.
    dependsOn: [{ skill: 'circles', level: 5 }] },
  // A circle and a parabola meeting at whole points run out at a few
  // hundred, where two parabolas do not; at this cap none is over about 2/5.
  { name: 'Two Curves', slug: 'two-curves', libraryCap: 450,
    blurb: 'Two parabolas, a circle and a parabola, or xy = k and a line: substitute what one gives, and find every point.' },
  { name: 'Three Variables', slug: 'three-variables',
    blurb: 'Use one equation to take a letter out of the other two, solve the pair, then go back for the third letter.',
    // Taking a letter out of two equations is systems' Elimination.
    dependsOn: [{ skill: 'systems', level: 2 }] },
  { name: 'No Solution or Infinitely Many', slug: 'no-solution-or-infinitely-many',
    blurb: 'When one equation is the others added up, the left sides match: a different right side is no solution, the same is infinitely many.',
    dependsOn: [{ skill: 'systems', level: 4 }] },
  { name: 'Three-Variable Word Problems', slug: 'three-variable-word-problems',
    blurb: 'Tickets, coins and orders in three kinds: name the three amounts, write three equations, and solve.',
    dependsOn: [{ skill: 'systems', level: 5 }] },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [90, 45, 100, 110, 120, 60, 150, 100];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'systems-2',
  name: 'Systems of Equations II',
  category: 'equations',
  glyph: '∩',
  blurb: 'Where lines, parabolas and circles meet, how many times they can, and systems in three unknowns, from equations and from stories.',
  answerInput: 'points',
  // Substitution, elimination and the special systems from systems;
  // factoring and the discriminant from quadratic-eq and quadratic-formula;
  // a circle's equation from circles.
  dependsOn: ['systems', 'quadratic-eq', 'quadratic-formula', 'circles'],
  levels: LEVELS,
};
