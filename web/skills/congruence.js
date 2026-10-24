/**
 * Congruent triangles: which parts match, which facts are enough to prove
 * two triangles congruent, and what a congruence then gives you.
 *
 * A congruence statement is a matching: △ABC ≅ △QRP pairs A with Q, B with
 * R and C with P, whatever way round the second triangle is drawn. Reading
 * it off by position on the page, or in alphabetical order, is the slip the
 * first two levels are built on.
 *
 * The criteria are told apart by where the parts sit: an angle between the
 * two sides (SAS) or not (SSA, which proves nothing), a side between the
 * two angles (ASA) or not (AAS), and in a right triangle the hypotenuse and
 * a leg (HL). Three angles fix the shape but not the size. The last levels
 * turn the matching into equations: equal sides in an isosceles triangle,
 * and corresponding parts of congruent triangles.
 */

export const LEVELS = [
  { name: 'Corresponding Parts', slug: 'corresponding-parts',
    blurb: 'The order of the letters is the matching: in △ABC ≅ △QRP, B goes with R.' },
  { name: 'Name the Congruence', slug: 'name-the-congruence',
    blurb: 'Pair the corners by the marks, then write them in the same order.' },
  { name: 'Which Criterion', slug: 'which-criterion',
    blurb: 'SSS, SAS, ASA, AAS or HL: is the angle between the sides, the side between the angles?' },
  { name: 'Enough or Not', slug: 'enough-or-not',
    blurb: 'An angle not between its two sides (SSA), or three angles alone, proves nothing.' },
  { name: 'The Missing Fact', slug: 'the-missing-fact',
    blurb: 'Two parts are known. Which third one completes the criterion asked for?' },
  { name: 'Isosceles & Equilateral', slug: 'isosceles-and-equilateral',
    blurb: 'Equal sides face equal angles. Set the equal parts equal and solve.' },
  { name: 'Use the Congruence', slug: 'use-the-congruence',
    blurb: 'Corresponding parts of congruent triangles are equal: match them, then solve.' },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [25, 30, 25, 25, 30, 40, 45, 35];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'congruence',
  name: 'Congruent Triangles',
  category: 'shapes',
  glyph: '≅',
  blurb: 'Matching parts, the SSS, SAS, ASA, AAS and HL criteria, and solving with equal sides and angles.',
  answerInput: 'int',
  // A missing angle comes from the angle sum, and the isosceles level
  // builds on base angles and solving with x on both sides, all taught there.
  dependsOn: ['triangle-angles'],
  levels: LEVELS,
};
