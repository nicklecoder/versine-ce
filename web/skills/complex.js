/**
 * Complex Numbers: i, where i² = −1, and arithmetic with a + bi.
 *
 * The powers of i go round in fours. Add and subtract by parts, multiply as
 * binomials and replace i² by −1. The conjugate a − bi turns a + bi into the
 * real a² + b², which is how a division is cleared. A real quadratic whose
 * discriminant is negative has two complex roots, a conjugate pair.
 */

export const LEVELS = [
  { name: 'Powers of i', slug: 'powers-of-i',
    blurb: 'i, −1, −i, 1, and round again: divide the power by 4 and keep the remainder.',
    // i^a · i^b adds the powers, and i^(−n) is a negative power.
    dependsOn: [{ skill: 'exponents', level: 1 }, { skill: 'exponents', level: 4 }] },
  { name: 'Add & Subtract', slug: 'add-and-subtract',
    blurb: 'Real parts with real parts, i parts with i parts, as with like terms.',
    dependsOn: [{ skill: 'polynomials', level: 1 }] },
  { name: 'Multiply', slug: 'multiply',
    blurb: 'Multiply out as two binomials, then replace i² by −1 and collect.',
    dependsOn: [{ skill: 'polynomials', level: 4 }] },
  { name: 'Conjugates & Divide', slug: 'conjugates-and-divide',
    blurb: '(a + bi)(a − bi) = a² + b², a real number. Multiply top and bottom by the bottom\'s conjugate to divide.',
    // The conjugate product is the difference of two squares with i² = −1.
    dependsOn: [{ skill: 'polynomials', level: 5 }] },
  { name: 'Complex Roots of Quadratics', slug: 'complex-roots',
    blurb: 'A negative discriminant: √(−d) = i√d, and the two roots are a conjugate pair, p ± qi.',
    dependsOn: [{ skill: 'quadratic-formula', level: 3 }] },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [30, 35, 50, 70, 70, 55];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'complex',
  name: 'Complex Numbers',
  category: 'powers',
  glyph: 'a + bi',
  blurb: 'Powers of i, adding, multiplying and dividing a + bi, and the complex roots of a quadratic.',
  answerInput: 'complex',
  // Like terms and binomials from polynomials; the discriminant from quadratic-formula.
  dependsOn: ['exponents', 'polynomials', 'quadratic-formula'],
  levels: LEVELS,
};
