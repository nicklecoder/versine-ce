/**
 * Functions.
 *
 * Everything so far has been a line, and a line is a function, but the word
 * has not been needed. It is needed now, because the rest of algebra and
 * all of calculus are about functions that are not lines, and the idea that
 * survives the change of shape is the definition: each input gets exactly
 * one output. The first two levels ask that question of pairs and of
 * pictures, so the vertical line test arrives as the definition drawn,
 * rather than as a rule to remember.
 *
 * Function notation is then just a way of writing "the output for this
 * input", and the levels after it use it three ways: forwards (f(4)),
 * read off a graph, and backwards (when is f(x) = 17?). Domain and range
 * read the same graph for which inputs and outputs occur at all.
 *
 * What f(a) = b Means is the interpretation standard: h(3) = 20 is a
 * sentence about a height and a time, and the common misreading swaps them.
 */

export const LEVELS = [
  { name: 'One Output Each', slug: 'one-output-each',
    blurb: 'A function gives every input exactly one output. Look for an input used twice.' },
  { name: 'The Vertical Line Test', slug: 'the-vertical-line-test',
    blurb: 'On a graph, one input is one vertical line. Does any of them meet it twice?' },
  { name: 'Function Notation', slug: 'function-notation',
    blurb: 'f(4) means: put 4 in for x and work out what comes out.' },
  { name: 'Reading f off a Graph', slug: 'reading-f-off-a-graph',
    blurb: 'f(3) is the height of the graph at x = 3.' },
  { name: 'Solving f(x) = k', slug: 'solving-f-x-equals-k',
    blurb: 'Backwards: which input gives this output? Set f(x) equal to it and solve.' },
  { name: 'Domain and Range', slug: 'domain-and-range',
    blurb: 'The domain is every x the graph uses. The range is every y it reaches.' },
  { name: 'What f(a) = b Means', slug: 'what-f-a-equals-b-means',
    blurb: 'The number in the brackets is the input. The number after the equals is the output.' },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [14, 12, 14, 14, 20, 16, 16, 18];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'functions',
  name: 'Functions',
  category: 'functions',
  glyph: 'f(x)',
  blurb: 'One input, one output: notation, graphs, domain and range.',
  answerInput: 'int',
  dependsOn: ['linear-eq', 'exponents'],
  levels: LEVELS,
};
