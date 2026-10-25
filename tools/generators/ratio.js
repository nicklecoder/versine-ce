/**
 * Catalogue authoring tool: builds the problem library for ratio.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding -- when a
 * systematic fault affects too many rows to correct by hand, or when a level
 * is redesigned. Individual bad problems are fixed in the library directly.
 *
 * Run via: node scripts/build-library.mjs
 */
import * as T from '../terms.js';
import { LEVELS, LAST_LEVEL, PAR_SECONDS } from '../../web/skills/ratio.js';

const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
const range = (a, b) => Array.from({ length: Math.max(0, b - a + 1) }, (_, i) => a + i);
const ordinal = (k) => ['', '', 'half', 'third', 'quarter', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth'][k];

/** "1 part", "3 parts" -- a unit ratio is common and reads badly pluralised. */
const parts = (k) => `${k} part${k === 1 ? '' : 's'}`;

/**
 * The ratios a level starts from: both parts small, unequal, and sharing no
 * factor.
 *
 * Unequal because 2 : 2 teaches nothing and reads as a mistake, and coprime
 * because a ratio that is not yet in simplest form has a second question
 * hiding inside it -- which is a level of its own, later, rather than noise
 * in this one.
 */
const SIMPLE = [];
for (let a = 1; a <= 9; a++) {
  for (let b = 1; b <= 9; b++) if (a !== b && gcd(a, b) === 1) SIMPLE.push([a, b]);
}

/** A bar cut finer than this is a row of hairlines rather than a picture. */
const MAX_PARTS = 48;

/**
 * Scaling a ratio, with one of the four numbers missing.
 *
 * The missing number is as often on the left as the right. Always asking for
 * the second part turns the level into "multiply the right-hand number",
 * performed without ever looking at what it was multiplied by.
 */
function equivalentRatios(rng) {
  const [a, b] = rng.pick(SIMPLE);
  const k = rng.int(2, Math.min(8, Math.floor(MAX_PARTS / (a + b))));
  const [A, B] = [a * k, b * k];
  const askSecond = rng.chance(0.5);

  return {
    prompt: askSecond
      ? [T.num(a, 1), T.op(':'), T.num(b, 2), T.op('='), T.num(A, 1), T.op(':'), T.blank()]
      : [T.num(a, 1), T.op(':'), T.num(b, 2), T.op('='), T.blank(), T.op(':'), T.num(B, 2)],
    text: askSecond ? `${a} : ${b} = ${A} : ?` : `${a} : ${b} = ? : ${B}`,
    answer: { type: 'int', value: askSecond ? B : A },
    visual: {
      kind: 'ratiomodel',
      a, b, to: { a: A, b: B }, by: `× ${k} on both parts`,
      note: `${parts(a)} to ${b}. Both parts grow by the same amount or it is a different ratio.`,
    },
    explain: `Both parts are multiplied by the same number. ${a} became ${A}, which is × ${k}, `
      + `so ${b} becomes ${b} × ${k} = ${B}.`,
  };
}

/** The same move downwards, which is where the greatest common factor earns itself. */
function simplestForm(rng) {
  const [a, b] = rng.pick(SIMPLE);
  const k = rng.int(2, Math.min(8, Math.floor(MAX_PARTS / (a + b))));
  const [A, B] = [a * k, b * k];
  const askSecond = rng.chance(0.5);

  return {
    prompt: askSecond
      ? [T.num(A, 1), T.op(':'), T.num(B, 2), T.op('='), T.num(a, 1), T.op(':'), T.blank()]
      : [T.num(A, 1), T.op(':'), T.num(B, 2), T.op('='), T.blank(), T.op(':'), T.num(b, 2)],
    text: askSecond ? `${A} : ${B} = ${a} : ?` : `${A} : ${B} = ? : ${b}`,
    answer: { type: 'int', value: askSecond ? b : a },
    visual: {
      kind: 'ratiomodel',
      a: A, b: B, to: { a, b }, by: `÷ ${k} on both parts`,
      note: `${parts(A)} to ${B}. The same ratio can be told in fewer parts.`,
    },
    explain: `${A} and ${B} share a factor of ${k}, and dividing both by it is the same ratio in `
      + `fewer parts. ${A} ÷ ${k} = ${a}, so the other part is ${B} ÷ ${k} = ${b}.`,
  };
}

/**
 * Two multipliers of the same base ratio, neither a whole number of times the
 * other -- 6 : 8 against 9 : 12, both of them 3 : 4.
 *
 * Equivalent Ratios and Simplest Form both start from a coprime pair, which
 * means one multiplication or one division always does it and the level can
 * be cleared by spotting a factor. Here there is no factor to spot, and the
 * only way across is simplest form. Same shape as frac-equiv's Through
 * Simplest Form, in the other notation, on purpose.
 */
function awkwardPair(rng, parts) {
  const fits = [];
  for (let j = 2; j <= 6; j++) {
    for (let k = 2; k <= 6; k++) {
      if (j === k || j % k === 0 || k % j === 0) continue;
      if (parts * Math.max(j, k) <= MAX_PARTS) fits.push([j, k]);
    }
  }
  return fits.length ? rng.pick(fits) : null;
}

function notInSimplestForm(rng) {
  let base, pair;
  do {
    base = rng.pick(SIMPLE.filter(([x, y]) => x + y <= 8));
    pair = awkwardPair(rng, base[0] + base[1]);
  } while (!pair);
  const [p, q] = base;
  const [j, k] = pair;
  const [a, b] = [p * j, q * j];
  const [A, B] = [p * k, q * k];
  const askSecond = rng.chance(0.5);

  return {
    prompt: askSecond
      ? [T.num(a, 1), T.op(':'), T.num(b, 2), T.op('='), T.num(A, 1), T.op(':'), T.blank()]
      : [T.num(a, 1), T.op(':'), T.num(b, 2), T.op('='), T.blank(), T.op(':'), T.num(B, 2)],
    text: askSecond ? `${a} : ${b} = ${A} : ?` : `${a} : ${b} = ? : ${B}`,
    answer: { type: 'int', value: askSecond ? B : A },
    visual: {
      kind: 'ratiomodel',
      a, b, to: { a: A, b: B }, via: { a: p, b: q },
      note: `${parts(a)} to ${b}. Is that already as few parts as it could be?`,
    },
    explain: `${a} : ${b} is not ${A} : ${B} by any whole number of times, so simplify. `
      + `Both are ${p} : ${q} (${a} ÷ ${j} = ${p} and ${A} ÷ ${k} = ${p}), `
      + `so the missing part is ${askSecond ? `${q} × ${k} = ${B}` : `${p} × ${k} = ${A}`}.`,
  };
}

/**
 * Situations for the part-and-whole level. Two names, so the question can ask
 * for either share and the ratio has to be read in the right order.
 */
const SHARES = [
  { items: 'counters', one: 'red', two: 'blue' },
  { items: 'candies', one: 'mint', two: 'lemon' },
  { items: 'beads', one: 'wooden', two: 'glass' },
  { items: 'tiles', one: 'plain', two: 'patterned' },
  { items: 'cards', one: 'red', two: 'black' },
];

/**
 * Part-to-part against part-to-whole, which is the mistake this skill is
 * built around.
 *
 * Told that red to blue is 3 : 5, the wrong answer is three fifths of the
 * pile and it is wrong for an understandable reason: a ratio written down
 * looks exactly like a fraction. The right reading is three parts in every
 * eight, and the bar shows both at once so the difference can be seen rather
 * than remembered.
 */
function partAndWhole(rng) {
  const [a, b] = rng.pick(SIMPLE.filter(([x, y]) => x + y <= 12));
  const m = rng.int(2, Math.floor(MAX_PARTS / (a + b)));
  const total = (a + b) * m;
  const s = rng.pick(SHARES);
  const first = rng.chance(0.5);
  const want = first ? a : b;
  const name = first ? s.one : s.two;

  return {
    // Non-breaking spaces round the colon, or a narrow screen wraps the
    // ratio itself onto two lines.
    prompt: [T.prose(`${s.one[0].toUpperCase()}${s.one.slice(1)} and ${s.two} ${s.items} are in the `
      + `ratio ${a}\u00a0:\u00a0${b}. There are ${total} ${s.items} altogether. How many are ${name}?`)],
    text: `${a} : ${b} of ${total}, ${first ? 'first' : 'second'} share`,
    answer: { type: 'int', value: want * m },
    visual: {
      kind: 'ratiomodel',
      a, b, to: { a: a * m, b: b * m }, by: `× ${m}, to make ${total} in all`,
      // The note is all the ask-state caption says. "4 parts to 1 is 5 parts
      // in all" was the step the level is about, given before the answer.
      note: `${parts(a)} to ${b}. All ${total} ${s.items} fill the bar.`,
    },
    explain: `${a} : ${b} means ${a + b} equal parts: ${a} ${s.one} for every ${b} ${s.two}. `
      + (a < b ? `It is not ${a}/${b} of the ${s.items}, because a ratio compares the parts with `
        + 'each other, not a part with the whole. ' : '')
      + `${total} ÷ ${a + b} = ${m} in each part, and ${name} is ${want} of them, `
      + `so ${want} × ${m} = ${want * m}. `
      + `Which is the same as taking ${want}/${a + b} of ${total}: a share of a total is a `
      + `fraction of a quantity, and ${want}/${a + b} × ${total} = ${want * m} either way.`,
  };
}

/** What one is worth, which every other rate question is answered through. */
const RATES = [
  // requiem: catalogue/content/units-both-systems
  { many: 'km', per: 'hours', ask: 'How far in one hour?', unit: 'km' },
  { many: 'miles', per: 'hours', ask: 'How far in one hour?', unit: 'miles' },
  { many: 'pages', per: 'minutes', ask: 'How many in one minute?', unit: 'pages' },
  { many: 'liters', per: 'tanks', ask: 'How much in one tank?', unit: 'liters' },
  { many: 'gallons', per: 'tanks', ask: 'How much in one tank?', unit: 'gallons' },
  { many: 'words', per: 'lines', ask: 'How many on one line?', unit: 'words' },
  { many: 'grams', per: 'scoops', ask: 'How much in one scoop?', unit: 'grams' },
];

function unitRate(rng) {
  const one = rng.int(5, 60);
  const n = rng.int(2, 9);
  const total = one * n;
  const r = rng.pick(RATES);

  return {
    prompt: [T.prose(`${total} ${r.many} in ${n} ${r.per}. ${r.ask}`)],
    text: `unit rate of ${total} per ${n}`,
    answer: { type: 'int', value: one },
    visual: {
      kind: 'evalmodel',
      lines: [`${total} ${r.many} in ${n} ${r.per}`, `${total} ÷ ${n}`, `${one} ${r.unit} in one`],
      rules: [`split it into ${n} equal ${r.per}`, `which is ${one} each`],
      hint: 'What would one of them be?',
    },
    explain: `${n} equal ${r.per} share the ${total} ${r.many} between them, so one of them is `
      + `${total} ÷ ${n} = ${one} ${r.unit}.`,
  };
}

/** Things bought in quantity, where the price of one is the way through. */
const GOODS = ['tickets', 'books', 'pens', 'batteries', 'tiles', 'cables'];

/**
 * The full proportion: from one quantity to another, through the value of
 * one.
 *
 * The target is deliberately not always a whole number of lots of what is
 * given. When it is, one multiplication does the whole thing; when it is not,
 * there is nothing to multiply by and the unit rate is the only way in. Both
 * appear here so that the strategy level after it has something to arbitrate.
 */
function scaling(rng) {
  const one = rng.int(3, 25);
  const from = rng.int(2, 9);
  let to = rng.int(2, 12);
  if (to === from) to = from + 1;
  const cost = one * from;
  const g = rng.pick(GOODS);
  // A whole number of lots either way: 3 is a third of 9, and dividing the
  // price by 3 is one step, the same as multiplying it would be.
  const up = to % from === 0;
  const down = from % to === 0;
  const clean = up || down;
  const by = up ? to / from : from / to;
  const scaled = up ? `$${cost} × ${by}` : `$${cost} ÷ ${by}`;

  return {
    prompt: [T.prose(`${from} ${g} cost $${cost}. What do ${to} cost?`)],
    text: `${cost} for ${from}, then ${to}`,
    answer: { type: 'int', value: one * to },
    visual: {
      kind: 'evalmodel',
      lines: clean
        ? [`${from} for $${cost}`, up ? `${to} is ${by} × ${from}` : `${to} is ${from} ÷ ${by}`, scaled,
           `$${one * to}`]
        : [`${from} for $${cost}`, `$${cost} ÷ ${from} = $${one} each`, `$${one} × ${to}`,
           `$${one * to}`],
      rules: clean
        ? [up ? `${to} is a whole number of lots of ${from}` : `${from} is a whole number of lots of ${to}`,
           'so scale the price the same way', 'which comes to']
        : ['find what one costs', `then take ${to} of them`, 'which comes to'],
      hint: 'Can you get there in one step, or do you need the price of one?',
    },
    explain: clean
      ? (up ? `${to} is exactly ${by} lots of ${from}` : `${to} is ${from} ÷ ${by}, a ${ordinal(by)} of ${from}`)
        + `, so the price scales the same way: ${scaled} = $${one * to}.`
      : `${to} and ${from} are not whole numbers of lots of each other, so go through one: `
        + `$${cost} ÷ ${from} = $${one} each, and $${one} × ${to} = $${one * to}.`,
  };
}

/**
 * The strategic layer: whether the shortcut is available at all.
 *
 * Scaling in one step is faster and is what a confident student reaches for,
 * and it works exactly when the target is a whole number of lots of what you
 * have. When it is not, there is no whole number to multiply by, and reaching
 * for one anyway produces either a wrong answer or an awkward fraction that
 * the unit rate would have avoided. The discriminator is a divisibility
 * question, which is why this level leans on factor pairs.
 */
function scaleOrFindOne(rng) {
  const from = rng.int(2, 12);
  const one = rng.int(2, 20);
  const cost = one * from;
  const g = rng.pick(GOODS);
  // Half the rows a clean multiple, half not, so neither answer is the habit.
  // The clean half scales down as well as up: 4 of 12 is a third of the
  // price, one division, which is a scale and not a trip through one.
  const smaller = range(2, from - 1).filter((t) => from % t === 0);
  const to = rng.chance(0.5)
    ? (smaller.length && rng.chance(0.4) ? rng.pick(smaller) : from * rng.int(2, 5))
    : from * rng.int(1, 4) + rng.int(1, from - 1 || 1);
  const clean = (to % from === 0 || from % to === 0) && to !== from;

  return {
    prompt: [T.prose(`${from} ${g} cost $${cost}. You need ${to} of them.`)],
    text: `${from} ${g} at $${cost}, need ${to}`,
    answer: {
      type: 'choice',
      value: clean ? 'scale' : 'unit',
      options: rng.shuffle([
        { id: 'scale', label: 'Scale the whole thing in one step',
          note: 'multiply or divide both by the same number' },
        { id: 'unit', label: 'Find what one costs first',
          note: 'divide down to one, then multiply up' },
      ]),
    },
    visual: null,
    explain: clean
      ? (to > from
        ? `${to} is exactly ${to / from} lots of ${from}, so multiplying by ${to / from} gets there `
        : `${to} is ${from} ÷ ${from / to}, so dividing by ${from / to} gets there `)
        + `in one step. Dividing down to one first would be an extra step for nothing.`
      : `${to} and ${from} are not whole numbers of lots of each other, so scaling in one step `
        + `means multiplying by a fraction. Finding what one costs is the shorter way in.`,
  };
}

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  const build = (lv) => {
    switch (lv) {
      case 0: return equivalentRatios(rng);
      case 1: return simplestForm(rng);
      case 2: return notInSimplestForm(rng);
      case 3: return partAndWhole(rng);
      case 4: return unitRate(rng);
      case 5: return scaling(rng);
      case 6: return scaleOrFindOne(rng);
      default: return rng.pick([equivalentRatios, simplestForm, notInSimplestForm, partAndWhole,
                                unitRate, scaling])(rng);
    }
  };
  const p = build(level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 2) : level);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
