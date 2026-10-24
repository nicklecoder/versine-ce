/**
 * Volume and surface area: how much a solid holds, and how much it takes to
 * wrap it.
 *
 * Every volume here is a base times a height. A prism or a cylinder is its
 * base area stacked up its length; a pyramid or a cone fills a third of the
 * prism or cylinder around it, and the slip it is built around is leaving
 * out that third. A cone's slant is drawn and labelled beside its height, so
 * which length is the height is a choice, as it was for the parallelogram.
 * A sphere is 4/3 πr³, and half of that for a hemisphere.
 *
 * Surface area is the area of every face added, which is what a net shows:
 * a box has three pairs of rectangles, a cylinder two circles and a
 * rectangle rolled round, as long as the circumference. An open cylinder
 * has one circle, not two. A cone's curved part is πrl with the slant l --
 * here the height is the length to pass over -- and a sphere's is 4πr², the
 * area of four of its great circles.
 *
 * Answers in π are typed as the number of π, into a blank before a π the
 * question writes; with 3.14 they are plain decimals. Each question says
 * which.
 */

export const LEVELS = [
  { name: 'Prisms', slug: 'prisms',
    blurb: 'The area of the end, times the length. A box is length × width × height.' },
  { name: 'Cylinders', slug: 'cylinders',
    blurb: 'A circle for the base, πr², times the height.' },
  { name: 'Cones and Pyramids', slug: 'cones-and-pyramids',
    blurb: 'A third of the prism or cylinder they fit in. The height, not the slant.' },
  { name: 'Spheres', slug: 'spheres',
    blurb: 'Four thirds π r cubed, and half of it for a hemisphere.' },
  { name: 'Surface Area: Prisms', slug: 'surface-area-prisms',
    blurb: 'Add the area of every face: a box has three pairs.' },
  { name: 'Surface Area: Cylinders', slug: 'surface-area-cylinders',
    blurb: 'Two circles, and a rectangle as long as the circumference.' },
  { name: 'Cones and Spheres', slug: 'cones-and-spheres',
    blurb: 'πr² for a base, πrl round a cone, 4πr² round a sphere.' },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [30, 30, 35, 35, 45, 40, 40, 40];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'volume',
  name: 'Volume and Surface Area',
  category: 'measure',
  glyph: 'V',
  blurb: 'Prisms, cylinders, cones, pyramids and spheres: what they hold, and what covers them.',
  answerInput: 'decimal',
  // Every volume starts from a base's area, and every surface is areas added.
  dependsOn: ['area'],
  levels: LEVELS,
};
