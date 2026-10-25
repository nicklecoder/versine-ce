/**
 * Logarithms: the exponent a base must be raised to.
 *
 * log_b v = e says the same as b^e = v. The laws of exponents become laws
 * of logs: a product adds, a quotient subtracts, a power multiplies. log
 * alone is base 10 and ln is base e, and the change of base formula turns
 * any log into a quotient of either. A log undoes its own base's power,
 * which solves an exponential equation -- 2ˣ = 3ˣ⁻¹ as readily as 2ˣ = 8 --
 * and the time a growth or decay story takes; a log equation is solved by
 * writing it as a power, then every answer is checked, since a log of a
 * number that is not positive does not exist. And y = log_b x is a function,
 * the inverse of y = bˣ: its graph is that one reflected in y = x, through
 * (1, 0) and (b, 1), taking only positive numbers and giving every real one.
 */

export const LEVELS = [
  { name: 'Log as Exponent', slug: 'log-as-exponent',
    blurb: 'log₂ 8 = 3 says 2³ = 8: the log is the exponent.',
    dependsOn: [{ skill: 'exponents', level: 4 }] },
  { name: 'Evaluate', slug: 'evaluate',
    blurb: 'What power of the base gives the number? Whole, negative or a fraction, like log₈ 4 = 2/3. log alone is base 10, and ln is base e.',
    // Fractional and negative exponents are the answers here, and ln is the
    // log to base e, which exponential functions' e level introduces.
    dependsOn: [{ skill: 'rational-exponents', level: 3 }, { skill: 'exponential', level: 7 }] },
  { name: 'Product, Quotient & Power', slug: 'product-quotient-power',
    blurb: 'log xy = log x + log y, log x/y = log x − log y, log xᵏ = k log x: combine into one log, or expand into many.',
    // The three laws are the exponent rules read the other way.
    dependsOn: [{ skill: 'exponents', level: 2 }, { skill: 'exponents', level: 3 }] },
  { name: 'ln & Change of Base', slug: 'ln-and-change-of-base',
    blurb: 'Any log is ln of the number over ln of the base, and a base raised to its own log gives the number back.' },
  { name: 'Solve Exponential Equations', slug: 'exponential-equations',
    blurb: 'Write both sides as powers of one base when you can; otherwise take the log of both sides. Then: how long until it doubles?',
    // Solving for the time asks for the growth, half-life and continuous
    // models those levels set up.
    dependsOn: [{ skill: 'equations', level: 2 }, { skill: 'exponential', level: 4 }, { skill: 'exponential', level: 7 }] },
  { name: 'Solve Log Equations', slug: 'log-equations',
    blurb: 'Combine into one log, write it as a power, solve, then check each answer: a log needs a positive number.',
    dependsOn: [{ skill: 'quadratic-eq', level: 1 }, { skill: 'radical-eq', level: 1 }] },
  // requiem: catalogue/content/log-functions-in-logarithms
  { name: 'Log Functions', slug: 'log-functions',
    blurb: 'y = log₂ x is the inverse of 2ˣ: its graph is the reflection in y = x, through (1, 0) and (2, 1). It takes only positive numbers, gives every real one, and runs down beside the line where its inside is 0.',
    // The reflection in y = x, a point (a, b) becoming (b, a), is inverses'
    // Graph Reflection; reading log_b v = e as b^e = v is Log as Exponent,
    // earlier in this skill, and the stretch rows use ln & Change of Base.
    dependsOn: [{ skill: 'inverses', level: 4 }] },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [35, 40, 60, 60, 75, 90, 55, 65];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'logarithms',
  name: 'Logarithms',
  category: 'powers',
  glyph: 'log₂ 8',
  blurb: 'Logs as exponents, the laws of logs, ln and change of base, solving exponential and log equations, and the graph of log_b x as the inverse of bˣ.',
  answerInput: 'frac',
  // Powers from exponents and rational-exponents; solving from equations, exponential, quadratic-eq and radical-eq;
  // the log as the inverse of bˣ from inverses.
  dependsOn: ['exponents', 'rational-exponents', 'equations', 'exponential', 'quadratic-eq', 'radical-eq', 'inverses'],
  levels: LEVELS,
};
