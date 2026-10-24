/**
 * Similar figures: the same shape at another size. Every length is
 * multiplied by one scale factor, and the angles do not change.
 *
 * The factor comes from one pair of matching sides, matched by the letters
 * of the similarity statement and not by where the sides sit on the page,
 * and then it finds any other side. Adding the difference instead of
 * multiplying is the slip that comes first; dividing two sides that do not
 * match is the next.
 *
 * Similarity is proved by two equal angles (the third follows), by three
 * sides in one ratio, or by two sides in one ratio with the angle between
 * them equal. A scale drawing is a similarity with the factor written as a
 * scale. Areas grow by the square of the factor and volumes by its cube. A
 * line parallel to one side of a triangle cuts off a similar triangle, which
 * splits the other two sides in one ratio, and the altitude to a right
 * triangle's hypotenuse cuts it into two triangles similar to it.
 */

export const LEVELS = [
  { name: 'Scale Factor', slug: 'scale-factor',
    blurb: 'Divide a side of the new triangle by the side it matches in the old one.' },
  { name: 'Missing Side', slug: 'missing-side',
    blurb: 'Find the factor from one matching pair, then multiply. Never add the difference.' },
  { name: 'Similar or Not?', slug: 'similar-or-not',
    blurb: 'Two equal angles are enough. Sides must all be in one ratio.' },
  { name: 'Scale Drawings', slug: 'scale-drawings',
    blurb: '1 cm stands for so much: multiply to go out to the real thing, divide to come back.' },
  { name: 'Area & Volume Scale', slug: 'area-and-volume-scale',
    blurb: 'Lengths by k, areas by k², volumes by k³.' },
  { name: 'Side Splitter', slug: 'side-splitter',
    blurb: 'A line parallel to one side splits the other two in the same ratio.' },
  { name: 'Altitude to Hypotenuse', slug: 'altitude-to-hypotenuse',
    blurb: 'The altitude is the geometric mean of the two pieces of the hypotenuse.',
    dependsOn: [{ skill: 'roots', level: 0 }] },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [25, 35, 35, 30, 30, 40, 40, 35];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'similarity',
  name: 'Similar Figures',
  category: 'shapes',
  glyph: '∼',
  blurb: 'Scale factors, missing sides, proving similarity, scale drawings, area and volume, and the side splitter.',
  answerInput: 'decimal',
  // Every level is a ratio scaled up or down, and the matching of sides is
  // read from the statement the way congruence reads it. Only the altitude
  // level takes square roots, and says so on its own dependsOn; the graph
  // requires the skill to be named here as well.
  dependsOn: ['ratio', 'congruence', 'roots'],
  levels: LEVELS,
};
