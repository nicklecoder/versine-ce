/**
 * Graphs of Sine and Cosine: the sinusoid y = a sin(b(x − h)) + k.
 *
 * Each number moves the parent wave one way. |a| is the amplitude, half the
 * distance from a peak to a trough, and a negative a turns the wave upside
 * down. b squeezes it: one cycle takes 2π/b instead of 2π. h slides it
 * right, once b has been factored out, and k lifts it, so y = k is the
 * midline the wave rises and falls about, with maximum k + |a| and minimum
 * k − |a|.
 *
 * Reading a graph runs the same rules backward: the amplitude and midline
 * from the peak and trough, the period from one peak to the next. A model
 * of a Ferris wheel, a tide or a year of temperatures is a sinusoid whose
 * numbers mean something.
 */

export const LEVELS = [
  { name: 'Amplitude', slug: 'amplitude', libraryCap: 400,
    blurb: 'Half the height from trough to peak: |a| in y = a sin x, never negative.' },
  { name: 'Period', slug: 'period', libraryCap: 400,
    blurb: 'One full cycle: 2π divided by b, so sin 2x repeats every π and sin(x/2) every 4π.' },
  { name: 'Midline', slug: 'midline', libraryCap: 400,
    blurb: 'y = k, halfway between the maximum and the minimum, which are k + |a| and k − |a|.' },
  { name: 'Phase Shift', slug: 'phase-shift',
    blurb: 'Factor b out first: sin(2x − π/3) is sin(2(x − π/6)), π/6 to the right.',
    // A horizontal shift moves against the sign: transforming functions' Left and Right.
    dependsOn: [{ skill: 'transformations-f', level: 1 }] },
  { name: 'Equation From a Graph', slug: 'equation-from-a-graph', libraryCap: 300,
    blurb: 'Read the midline, the amplitude and the period off the picture, and whether it starts at a peak.' },
  { name: 'Sinusoidal Models', slug: 'sinusoidal-models',
    blurb: 'Ferris wheels, tides, springs and the seasons: the numbers in the story are the amplitude, midline and period.' },
  { name: 'All Together', slug: 'all-together', libraryCap: 600,
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [25, 35, 30, 45, 60, 55, 45];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'trig-graphs',
  name: 'Graphs of Sine & Cosine',
  category: 'unit-circle',
  glyph: '∿',
  blurb: 'Amplitude, period, midline and phase shift, from an equation and from a graph, and sinusoidal models.',
  answerInput: 'frac',
  // The wave is the unit circle's y-coordinate unrolled, and each change to
  // it is a transformation of a parent function.
  dependsOn: ['unit-circle', 'transformations-f'],
  levels: LEVELS,
};
