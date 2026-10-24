/**
 * Two variables at once: whether they move together, the line that sums the
 * pattern up, how strongly the points keep to it, what it can and cannot
 * say about cause, and the same questions asked of categories in a
 * two-way table.
 *
 * A line of fit is a linear model read off data, so its slope and intercept
 * mean what they meant in linear-models: a rate and a starting value. What
 * is new is that the points miss it, by a residual, actual minus predicted,
 * and that r measures how closely they keep to it. The traps are taking a
 * strong negative r as weak, reading a residual the wrong way round, and
 * believing a correlation from an observational study shows a cause.
 */

export const LEVELS = [
  { name: 'Association', slug: 'association',
    blurb: 'Rising left to right is positive, falling is negative, and a shapeless cloud is no association. A pattern can also curve, split into two clusters, or have an outlier far from the rest.' },
  { name: 'Line-of-Fit Predictions', slug: 'line-of-fit-predictions',
    blurb: 'Put x into the line of fit to predict y, or solve it for the x that gives a y.' },
  { name: 'Slope & Intercept in Context', slug: 'slope-and-intercept-in-context',
    blurb: 'The slope is the predicted change in y for each 1 of x; the intercept is the prediction at x = 0.',
    dependsOn: [{ skill: 'linear-models', level: 1 }] },
  { name: 'Residuals', slug: 'residuals',
    blurb: 'Actual minus predicted. Positive means the point is above the line, so the line predicted too low.' },
  { name: 'Correlation Strength', slug: 'correlation-strength',
    blurb: 'Its sign says which way. Its size says how tight: 0.7 or more is strong, 0.4 to 0.7 moderate, 0.1 to 0.4 weak, under 0.1 none.' },
  { name: 'Correlation vs Causation', slug: 'correlation-vs-causation',
    blurb: 'Only an experiment with random assignment shows a cause. Otherwise a third thing may drive both.' },
  { name: 'Two-Way Tables', slug: 'two-way-tables',
    blurb: 'Fill in from the totals, and pick the right whole: all of them, one row, or one column. A relative frequency table is already in percents of its rows or columns.',
    dependsOn: [{ skill: 'percents', level: 3 }] },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [20, 35, 35, 35, 25, 30, 45, 40];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'bivariate',
  name: 'Two-Variable Data',
  category: 'statistics',
  glyph: '⋰',
  blurb: 'Scatter plots, lines of fit and residuals, correlation and causation, and two-way tables.',
  answerInput: 'decimal',
  // A line of fit's slope and intercept are a linear model's rate and start
  // (linear-models), and a two-way table's relative frequencies are a part
  // as a percent of a whole (percents).
  dependsOn: ['linear-models', 'percents'],
  levels: LEVELS,
};
