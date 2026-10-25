/**
 * Combining Functions: adding, multiplying and composing them.
 *
 * (f + g)(x) is f(x) + g(x), worked term by term; (f − g)(x) takes away
 * every term of g, not just the first; (f · g)(x) multiplies them out. A
 * composition f(g(x)) feeds g's output into f: work from the inside out,
 * so f(g(2)) is g(2) first, then f of that. Written as a formula, f(g(x))
 * is f with every x replaced by the whole of g(x). The order matters: f(g(x))
 * and g(f(x)) are usually different. Run backwards, a complicated function
 * can be seen as an inside function g and an outside function f.
 */

export const LEVELS = [
  { name: '(f + g)(x)', slug: 'f-plus-g',
    blurb: 'Add, subtract or multiply the two rules: (f − g)(x) takes away every term of g, so brackets first.',
    // f(x) read as a rule is functions' Function Notation; (f · g)(x) of a
    // line and a quadratic, (4x − 9)(2x² − 2x − 9), is polynomials' Trinomial
    // Times Binomial, after the Binomial Times Binomial that f(g(x)) needs too.
    dependsOn: [{ skill: 'functions', level: 2 }, { skill: 'polynomials', level: 6 }] },
  { name: 'f(g(2))', slug: 'f-of-g-of-2',
    blurb: 'Inside out: work out g(2) first, then put that number into f. From formulas or from a table.' },
  { name: 'f(g(x))', slug: 'f-of-g-of-x',
    blurb: 'Replace every x in f with the whole of g(x), in brackets, then multiply out and collect.' },
  { name: 'Not Commutative', slug: 'not-commutative', libraryCap: 600,
    blurb: 'f(g(x)) and g(f(x)) are usually different: the inside function is the one applied first.' },
  { name: 'Decompose', slug: 'decompose',
    blurb: 'See h(x) as an outside f and an inside g: in (3x − 1)³ the inside is 3x − 1 and the outside cubes it.' },
  // Added: which x a composition takes, the inside's limit and the outside's.
  { name: 'Domain of f(g(x))', slug: 'domain-of-f-of-g', libraryCap: 400,
    blurb: 'x must suit g, and g(x) must suit f: for √(g(x)), g(x) ≥ 0; and simplifying first can hide the limit.',
    // A root's and a denominator's limits on x: domain and range's Domain of √ and Fractions.
    dependsOn: [{ skill: 'domain-range', level: 0 }] },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [45, 30, 70, 45, 50, 45, 55];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'composition',
  name: 'Combining Functions',
  category: 'functions',
  glyph: 'f∘g',
  blurb: 'Sums, differences and products of functions, f(g(2)) and f(g(x)), why the order matters, taking a function apart, and its domain.',
  answerInput: 'expr',
  // Function notation from functions; multiplying out from polynomials;
  // where a root or a fraction is defined from domain and range.
  dependsOn: ['functions', 'polynomials', 'domain-range'],
  levels: LEVELS,
};
