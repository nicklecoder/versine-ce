/**
 * The laws of sines and cosines: solving a triangle that has no right angle.
 *
 * The law of sines, a/sin A = b/sin B = c/sin C, pairs each side with the
 * angle across from it, so it works whenever one such pair is known: two
 * angles and a side, or two sides and an angle not between them. The law of
 * cosines, c² = a² + b² − 2ab cos C, is the Pythagorean theorem with a
 * correction for C not being 90°, and works where sines cannot: two sides and
 * the angle between them, or all three sides. Which one to reach for is
 * decided by what is known, not by what is asked.
 *
 * Two sides and an angle not between them can fit no triangle, one, or two,
 * since the side opposite the angle can swing to meet the base in two places.
 * Every Sines: Angle problem says which triangle it means.
 *
 * Calculator answers round only at the end, and are kept only where 4-place
 * working gives the same rounded answer.
 */

export const LEVELS = [
  { name: 'Sines: Side', slug: 'sines-side', libraryCap: 400,
    blurb: 'a/sin A = b/sin B: with an angle and the side across from it, any other side follows.' },
  { name: 'Sines: Angle', slug: 'sines-angle', libraryCap: 400,
    blurb: 'sin B = b sin A / a, then the inverse sine. Watch for a second, obtuse answer.' },
  { name: 'Cosines: Side', slug: 'cosines-side', libraryCap: 400,
    blurb: 'Two sides and the angle between them: c² = a² + b² − 2ab cos C.' },
  { name: 'Cosines: Angle', slug: 'cosines-angle', libraryCap: 400,
    blurb: 'All three sides: cos C = (a² + b² − c²) / 2ab. A negative cosine means an obtuse angle.' },
  { name: 'Which Law?', slug: 'which-law', kind: 'strategy', libraryCap: 400,
    blurb: 'An angle with the side across from it means sines. Two sides and the angle between them, or three sides, mean cosines.',
    // Choosing a tool by what is known starts with a right triangle's
    // missing side, where the ratio is picked from the sides in play.
    dependsOn: [{ skill: 'trig-ratios', level: 2 }] },
  { name: 'How Many Triangles?', slug: 'how-many-triangles', libraryCap: 400,
    blurb: 'Two sides and an angle not between them: compare the side across from the angle with the height it must reach.' },
  { name: '½ab sin C', slug: 'half-ab-sin-c', libraryCap: 400,
    blurb: 'Two sides and the angle between them give the area: ½ab sin C, since b sin C is the height.' },
  { name: 'All Together', slug: 'all-together', libraryCap: 500,
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [50, 55, 55, 55, 20, 45, 45, 55];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'laws-sines-cosines',
  name: 'Laws of Sines & Cosines',
  category: 'right-triangles',
  glyph: 'a/sin A',
  blurb: 'The law of sines, the law of cosines, which to use, the ambiguous case, and ½ab sin C.',
  answerInput: 'decimal',
  // Sine and cosine, and solving with an inverse, are the ratios' work.
  dependsOn: ['trig-ratios'],
  levels: LEVELS,
};
