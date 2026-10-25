/**
 * The shape of a whole data set: box plots and histograms to see it, the
 * standard deviation to measure its spread, and the normal curve, where
 * that spread turns into percents.
 *
 * Center and spread (data-center) works on a list. This skill works on the
 * pictures and on the measures that need them: a box plot is the five-number
 * summary drawn, each part a quarter of the data however long it looks; a
 * histogram's bars are counts of intervals, not of single values; and the
 * standard deviation is the typical distance from the mean, squared, averaged
 * and rooted back. The traps the levels are built around are reading a long
 * whisker as more data, taking the tallest bar for the median, and treating a
 * skewed set with the mean and standard deviation, which an outlier drags.
 *
 * The standard deviation here divides by n, the number of values, and every
 * set is chosen so that it comes out whole: the working is the point, not
 * the square root.
 */

export const LEVELS = [
  { name: 'Box Plots', slug: 'box-plots',
    blurb: 'Five numbers: the least, Q1, the median, Q3, the greatest. Each part holds a quarter of the data. A value more than 1.5 × IQR beyond a quartile is an outlier.',
    dependsOn: [{ skill: 'data-center', level: 3 }] },
  { name: 'Histograms', slug: 'histograms',
    blurb: 'Each bar counts the values in an interval. Add bars for a range; find the middle by counting.' },
  { name: 'Shape & Center', slug: 'shape-and-center',
    blurb: 'A long tail to the right pulls the mean past the median. Symmetric data has them together.' },
  { name: 'Standard Deviation', slug: 'standard-deviation',
    blurb: 'Distances from the mean, squared, averaged, then square-rooted: the typical distance.',
    dependsOn: [{ skill: 'roots', level: 0 }] },
  { name: 'Normal Curve Percents', slug: 'normal-curve-percents',
    blurb: '68% within one standard deviation, 95% within two, 99.7% within three. Halve for one side.',
    dependsOn: [{ skill: 'percents', level: 2 }] },
  { name: 'z-Scores', slug: 'z-scores',
    blurb: 'How many standard deviations above or below the mean: z = (x − mean) ÷ SD.' },
  { name: 'Which Spread', slug: 'which-spread',
    blurb: 'Skewed or with an outlier: the IQR, with the median. Roughly symmetric: the standard deviation, with the mean. Q1 and Q3 are the medians of the lower and upper halves.' },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [25, 35, 25, 75, 35, 35, 30, 45];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'distributions',
  name: 'Distributions',
  category: 'statistics',
  glyph: 'σ',
  blurb: 'Box plots and histograms, shape, standard deviation, the normal curve and z-scores.',
  answerInput: 'decimal',
  // Quartiles and the IQR come from data-center; the standard deviation ends
  // in a square root (roots); normal-curve counts are a percent of a number
  // (percents).
  dependsOn: ['data-center', 'roots', 'percents'],
  levels: LEVELS,
};
