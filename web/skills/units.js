/**
 * Units of measure, US customary and metric, and moving between them.
 *
 * Customary units are learned as a handful of facts -- 12 inches to the
 * foot, 16 ounces to the pound, 4 quarts to the gallon -- and metric ones as
 * prefixes that each shift the decimal point. Going to a smaller unit takes
 * more of them, so the number goes up: that one idea settles multiply or
 * divide, and getting it backwards is the slip every level is built against.
 *
 * Between the systems the factor is given (1 in = 2.54 cm), and the same
 * rule decides which way to use it. Temperature is the exception: its scales
 * start at different zeros, so a conversion is a multiplication and a shift.
 * Chains and rates are converted with unit fractions, each one equal to 1,
 * placed so the unit to cancel sits on the other side of the line. Square
 * and cubic units scale by the factor squared and cubed.
 *
 * A minority of questions in each level ask for a feel for sizes instead --
 * which is longer, about how heavy -- because a student who knows a mile is
 * longer than a kilometer can catch a conversion that went the wrong way.
 * Science courses convert in metric constantly, and daily life in the US is
 * customary, so both systems are taught, and taught together.
 */

export const LEVELS = [
  { name: 'Customary Length', slug: 'customary-length',
    blurb: '12 in to the foot, 3 ft to the yard, 5,280 ft to the mile.' },
  { name: 'Customary Weight & Capacity', slug: 'customary-weight-and-capacity',
    blurb: '16 oz to the pound; 8 fl oz to the cup, 2 cups to the pint, 2 pints to the quart, 4 quarts to the gallon.' },
  { name: 'Metric Units', slug: 'metric-units',
    blurb: 'Kilo is 1,000, centi a hundredth, milli a thousandth. Move the decimal point.' },
  { name: 'Between the Systems', slug: 'between-the-systems',
    blurb: 'The factor is given. Into the smaller unit, multiply; into the bigger one, divide.' },
  { name: 'Temperature', slug: 'temperature',
    blurb: 'F = (9/5)C + 32, and back: take the 32 off first.',
    dependsOn: [{ skill: 'frac-signed', level: 3 }] },
  { name: 'Unit Fractions', slug: 'unit-fractions',
    blurb: 'Chain factors that each equal 1, so the unit you want gone cancels.',
    dependsOn: [{ skill: 'ratio', level: 4 }] },
  { name: 'Square & Cubic Units', slug: 'square-and-cubic-units',
    blurb: '3 ft to the yard makes 9 ft² to the square yard and 27 ft³ to the cubic yard.',
    dependsOn: [{ skill: 'area', level: 0 }, { skill: 'volume', level: 0 }] },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [25, 25, 25, 35, 35, 50, 35, 35];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'units',
  name: 'Units & Conversions',
  category: 'measure',
  glyph: '⚖',
  blurb: 'US customary and metric units, converting within and between them, temperature, rates, and square and cubic units.',
  answerInput: 'decimal',
  // Every conversion multiplies or divides decimals, and metric ones shift
  // the point. Temperature, rates and square units need more, and name it
  // on their own levels; the graph wants those skills named here as well.
  // requiem: catalogue/content/units-not-after-proportional
  // `proportional` is not one: its Converting Units reads the same move as
  // a constant of proportionality, which this skill neither needs nor uses.
  dependsOn: ['decimals', 'frac-signed', 'ratio', 'area', 'volume'],
  levels: LEVELS,
};
