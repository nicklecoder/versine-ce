/**
 * Inverse Functions: the function that undoes f.
 *
 * f⁻¹ sends each output of f back to its input, so f(a) = b means
 * f⁻¹(b) = a, and the steps of f are undone in the reverse order. Written
 * as a formula, f⁻¹ comes from swapping x and y in y = f(x) and solving for
 * y again. Composing checks it: f(f⁻¹(x)) = x and f⁻¹(f(x)) = x. Only a
 * one-to-one function has an inverse, so a parabola has to be cut to half
 * of itself first, and the graph of f⁻¹ is the graph of f reflected in the
 * line y = x: every point (a, b) becomes (b, a). So y = log_b x is the
 * reflection of y = bˣ: it takes only positive numbers, and its graph runs
 * down beside the vertical line where what it takes the log of is 0.
 */

export const LEVELS = [
  { name: 'Undo a Function', slug: 'undo-a-function',
    blurb: 'f(a) = b means f⁻¹(b) = a: find the input that gave the output, from a rule, a table, or its steps undone backwards.',
    // f(a) = b read as a rule is functions' Function Notation; undoing a
    // cube, x³ + 5 = 13, is roots' Cubes and Cube Roots.
    dependsOn: [{ skill: 'functions', level: 2 }, { skill: 'roots', level: 4 }] },
  { name: 'Solve for x ↔ y', slug: 'solve-for-x-y',
    blurb: 'Write y = f(x), swap x and y, and solve for y again: that y is f⁻¹(x). A cube is undone by a cube root, and a fraction by multiplying across it.',
    // Rearranging y = 3x − 5 for x is solving a two-step equation in letters,
    // and y = x³ + 5 is undone by a cube root.
    dependsOn: [{ skill: 'equations', level: 2 }, { skill: 'roots', level: 4 }] },
  { name: 'Check by Composing', slug: 'check-by-composing',
    blurb: 'f and g are inverses when f(g(x)) = x and g(f(x)) = x: put one into the other and see if only x is left.',
    dependsOn: [{ skill: 'composition', level: 2 }] },
  { name: 'Restrict the Domain', slug: 'restrict-the-domain',
    blurb: 'A parabola gives one output for two inputs; keep only one side of the vertex and it has an inverse, a square root.',
    // One output from two inputs is the horizontal form of the vertical line test.
    dependsOn: [{ skill: 'functions', level: 1 }, { skill: 'quadratic-graphs', level: 1 }] },
  { name: 'Graph Reflection', slug: 'graph-reflection',
    blurb: 'The graph of f⁻¹ is the graph of f reflected in y = x: the point (a, b) becomes (b, a).',
    dependsOn: [{ skill: 'functions', level: 3 }] },
  // requiem: catalogue/content/log-functions-in-inverses
  { name: 'Log Functions', slug: 'log-functions',
    blurb: 'y = log₂ x is the inverse of 2ˣ, its graph the reflection in y = x: it takes only positive numbers, and runs down beside the line where its inside is 0.',
    // log_b v = e read as b^e = v is logarithms' Log as Exponent.
    dependsOn: [{ skill: 'logarithms', level: 0 }] },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [35, 60, 50, 50, 40, 50, 50];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'inverses',
  name: 'Inverse Functions',
  category: 'functions',
  glyph: 'f⁻¹',
  blurb: 'Undoing a function: its values, its formula, checking by composing, cutting a parabola to half, the reflection in y = x, and log₂ x as the inverse of 2ˣ.',
  answerInput: 'expr',
  // Notation and graphs from functions; composing from composition; cube
  // roots from roots; a log as an exponent from logarithms.
  dependsOn: ['functions', 'equations', 'composition', 'quadratic-graphs', 'roots', 'logarithms'],
  levels: LEVELS,
};
