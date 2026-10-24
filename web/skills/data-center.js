/**
 * Center and spread: what a typical value is, and how far the data strays
 * from it.
 *
 * The mean shares the total out equally and the median is the middle once
 * the data is in order, and the slip each level is built to catch is the
 * one people make: the median read off an unsorted list, a zero left out of
 * the count. A missing value for a mean is the total turned round: a mean of
 * 12 over five numbers is a total of 60. Quartiles are medians of the two
 * halves, with the middle value of an odd count in neither half, and the
 * interquartile range is the spread of the middle half, set beside the range
 * so the two are not confused. The mean absolute deviation is the typical
 * distance from the mean, every distance counted as positive.
 *
 * Samples is the reason any of this can be said about a whole population
 * from part of it: a sample stands for the population only when every
 * member had the same chance of being in it, and then what is true of the
 * sample scales up. Which Measure closes it: an outlier drags the mean and
 * leaves the median where it was, so data with one is described by the
 * median and the IQR, and data without by the mean and the MAD.
 *
 * Which Measure is a choice between measures, but not a strategy level:
 * everything it chooses between is taught here, in this skill, so there is
 * no earlier skill whose need it arbitrates.
 *
 * Every number is typed as a decimal, whole or not, so the box never says
 * whether a median will land between two values.
 */

export const LEVELS = [
  { name: 'The Mean', slug: 'the-mean',
    blurb: 'Add them all, then share the total out: divide by how many there are.' },
  { name: 'The Median', slug: 'the-median',
    blurb: 'Put them in order first. The middle one, or halfway between the middle two.' },
  { name: 'Missing Value for a Mean', slug: 'missing-value-for-a-mean',
    blurb: 'A mean of 12 over 5 numbers is a total of 60. Work from the total, to find one that is missing or the mean once one more joins.' },
  { name: 'Quartiles and the IQR', slug: 'quartiles-and-the-iqr',
    blurb: 'The medians of the lower and upper halves; the IQR is the gap between them.' },
  { name: 'Mean Absolute Deviation', slug: 'mean-absolute-deviation',
    blurb: 'How far each value is from the mean, all counted positive, then averaged.' },
  { name: 'Samples', slug: 'samples',
    blurb: 'Chosen at random from the whole group? Then it stands for the group, and scales up.' },
  { name: 'Which Measure?', slug: 'which-measure',
    blurb: 'An outlier drags the mean but not the median. Median and IQR then; otherwise mean and MAD.' },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [30, 25, 35, 45, 60, 25, 25, 40];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'data-center',
  name: 'Center and Spread',
  category: 'statistics',
  glyph: 'x̄',
  blurb: 'Mean, median, quartiles, IQR and MAD; samples that stand for a population; and which measure fits.',
  answerInput: 'decimal',
  // Means come out as decimals (79 ÷ 5 = 15.8), and scaling a sample up to
  // its population is scaling a ratio.
  dependsOn: ['decimals', 'ratio'],
  levels: LEVELS,
};
