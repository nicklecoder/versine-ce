/**
 * Catalogue authoring helper: the things the probability skills draw from
 * and the events asked about them.
 *
 * A source is a list of equally likely outcomes with the words for it: the
 * faces of a number cube, the sections of a spinner, numbered cards, marbles
 * in a bag, letter tiles. An event is a named test on one outcome, with a
 * `code` written into a problem's text (`even`, `gt 4`, `is red or blue`)
 * that scripts/check-answers.py reads with its own definitions.
 */

export const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
/** n/d in lowest terms, as an answer value. */
export const reduce = (n, d) => { const g = gcd(n, d) || 1; return { n: n / g, d: d / g }; };
// requiem: catalogue/content/probability-fractions-any-form
export const fracAnswer = (n, d) => ({ type: 'frac', value: reduce(n, d), requireSimplest: false });
/** A fraction as written in prose and text: 3/8, 1, 0. */
export const fracText = (n, d) => { const q = reduce(n, d); return q.d === 1 ? String(q.n) : `${q.n}/${q.d}`; };
/** n/d, and its lowest terms after it when they differ: "6/36 = 1/6". */
export const fracWork = (n, d) => { const q = reduce(n, d); return q.d === d ? `${n}/${d}` : `${n}/${d} = ${fracText(n, d)}`; };

const isPrime = (n) => n > 1 && [...Array(Math.floor(Math.sqrt(n)) + 1).keys()].slice(2).every((k) => n % k);

/** An event on numbered outcomes from 1 to max: its text code, its words, its test. */
export function numberEvent(rng, max) {
  const k = rng.int(2, max - 1);
  const m = rng.int(3, Math.max(3, Math.min(6, Math.floor(max / 2))));
  return rng.pick([
    { code: 'even', words: 'an even number', test: (x) => x % 2 === 0 },
    { code: 'odd', words: 'an odd number', test: (x) => x % 2 === 1 },
    { code: 'prime', words: 'a prime number', test: isPrime },
    { code: `gt ${k}`, words: `a number greater than ${k}`, test: (x) => x > k },
    { code: `lt ${k}`, words: `a number less than ${k}`, test: (x) => x < k },
    { code: `at least ${k}`, words: `${k} or more`, test: (x) => x >= k },
    { code: `at most ${k}`, words: `${k} or less`, test: (x) => x <= k },
    { code: `multiple of ${m}`, words: `a multiple of ${m}`, test: (x) => x % m === 0 },
  ]);
}

/** An event on named outcomes: one of them, or either of two. */
export function nameEvent(rng, names, word = (x) => x) {
  const kinds = [...new Set(names)];
  if (kinds.length > 2 && rng.chance(0.35)) {
    const [a, b] = rng.shuffle(kinds).slice(0, 2);
    return { code: `is ${a} or ${b}`, words: `${word(a)} or ${word(b)}`, test: (x) => x === a || x === b };
  }
  const a = rng.pick(kinds);
  return { code: `is ${a}`, words: word(a), test: (x) => x === a };
}

const COLORS = ['red', 'blue', 'green', 'yellow', 'purple'];
const WORDS = ['MISSISSIPPI', 'BANANA', 'TENNESSEE', 'PROBABILITY', 'STATISTICS', 'COMMITTEE', 'ALABAMA', 'BOOKKEEPER'];

/**
 * A source of equally likely outcomes. `outcomes` is the list as written in
 * text, `what` describes it, `verb` is the action ("rolling", "drawing"),
 * and `event` draws an event on it.
 */
export function source(rng, kinds = ['cube', 'die', 'spinner', 'cards', 'marbles', 'letters']) {
  const kind = rng.pick(kinds);
  if (kind === 'cube' || kind === 'die' || kind === 'spinner' || kind === 'cards') {
    const n = { cube: 6, die: rng.pick([4, 8, 10, 12, 20]), spinner: rng.pick([5, 6, 8, 10, 12]), cards: rng.pick([10, 12, 15, 20, 25, 30]) }[kind];
    const outcomes = Array.from({ length: n }, (_, i) => i + 1);
    return {
      kind, outcomes, numbers: true,
      what: { cube: 'A fair number cube, numbered 1 to 6, is rolled once.', die: `A fair ${n}-sided die, numbered 1 to ${n}, is rolled once.`,
        spinner: `A spinner has ${n} equal sections, numbered 1 to ${n}. It is spun once.`, cards: `Cards numbered 1 to ${n} are shuffled, and one is drawn at random.` }[kind],
      verb: { cube: 'rolling', die: 'rolling', spinner: 'landing on', cards: 'drawing' }[kind],
      event: () => numberEvent(rng, n),
      one: { cube: 'roll', die: 'roll', spinner: 'spin', cards: 'draw' }[kind],
    };
  }
  if (kind === 'marbles') {
    const colors = rng.shuffle(COLORS).slice(0, rng.int(2, 4));
    const counts = colors.map(() => rng.int(1, 9));
    const outcomes = colors.flatMap((c, i) => Array(counts[i]).fill(c));
    const list = colors.map((c, i) => `${counts[i]} ${c}`);
    return {
      kind, outcomes, numbers: false, colors, counts,
      what: `A bag holds ${list.slice(0, -1).join(', ')}${list.length > 2 ? ',' : ''} and ${list[list.length - 1]} marbles. One is picked at random.`,
      verb: 'picking', one: 'pick',
      event: () => nameEvent(rng, outcomes, (c) => `a ${c} marble`),
    };
  }
  const word = rng.pick(WORDS);
  const outcomes = word.split('');
  return {
    kind: 'letters', outcomes, numbers: false, word,
    what: `The letters of ${word} are written on ${word.length} tiles, and one tile is picked at random.`,
    verb: 'picking', one: 'pick',
    event: () => nameEvent(rng, outcomes, (c) => `an ${c}`.replace(/^an ([^AEFHILMNORSX])/, 'a $1')),
  };
}

/** How the outcomes of a source are written in a problem's text. */
export const outcomesText = (S) => S.outcomes.join(' ');
