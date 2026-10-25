/**
 * Catalogue authoring tool: builds the problem library for binomial.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 *
 * Every `text` carries the binomial and its power in ASCII, (2x - 3)^5, or a
 * row's opening numbers, or a probability story's n, p and count, so
 * scripts/check-answers.py can multiply the brackets out one at a time,
 * build Pascal's triangle by adding, and list every run of successes and
 * failures, none of which is the C(n, k) this file uses.
 */
import * as T from '../terms.js';
import { minus } from '../../web/ui/dom.js';
import { previewOf } from '../../web/ui/express.js';
import { fracAnswer, fracText } from './chance.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/binomial.js';

const C = (n, k) => {
  if (k < 0 || k > n) return 0;
  let v = 1;
  for (let i = 1; i <= k; i++) v = (v * (n - k + i)) / i;
  return Math.round(v);
};
const row = (n) => Array.from({ length: n + 1 }, (_, k) => C(n, k));
const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const sup = (n) => String(n).replace(/./g, (c) => SUP[c]);
const ORD = ['zeroth', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth', 'thirteenth', 'fourteenth', 'fifteenth', 'sixteenth', 'seventeenth', 'eighteenth', 'nineteenth', 'twentieth'];
const intAnswer = (v) => ({ type: 'int', value: v });
const commas = (n) => minus(n).replace(/\d{4,}/, (m) => Number(m).toLocaleString('en-US'));
/** Drawn as the expression box draws it, kept in one piece in a sentence. */
const drawn = (src) => {
  const r = previewOf(src);
  if (!r.ok) throw new Error(`cannot draw ${src}`);
  return T.math(r.terms);
};

// --- Monomials and their powers ---------------------------------------------------

/** c·xᵖyᵠ, with p negative for c/x. */
const mono = (c, px = 0, py = 0) => ({ c, px, py });

/** A letter and its power: x, x^2, y^3. */
const letterAscii = (v, p) => (p === 0 ? '' : p === 1 ? v : `${v}^${p}`);

/** One monomial in ASCII, its sign left off: 2x, x^2, 3/x, 4y. */
function monoAscii({ c, px, py }) {
  const a = Math.abs(c);
  if (px < 0) return `${a}/${letterAscii('x', -px)}`;
  const letters = letterAscii('x', px) + letterAscii('y', py);
  return letters ? `${a === 1 ? '' : a}${letters}` : String(a);
}
/** (2x - 3)^5: the binomial in ASCII, the first term's sign kept. */
const binAscii = (m1, m2, n) => `(${m1.c < 0 ? '-' : ''}${monoAscii(m1)} ${m2.c < 0 ? '-' : '+'} ${monoAscii(m2)})^${n}`;

/** The expansion of (m1 + m2)ⁿ: a map from "px,py" to its coefficient. */
function expand(m1, m2, n) {
  const out = new Map();
  for (let k = 0; k <= n; k++) {
    const key = `${m1.px * (n - k) + m2.px * k},${m1.py * (n - k) + m2.py * k}`;
    out.set(key, (out.get(key) ?? 0) + C(n, k) * m1.c ** (n - k) * m2.c ** k);
  }
  return out;
}

/** An expanded polynomial in ASCII, highest power of x first. */
function polyAscii(map) {
  const terms = [...map.entries()].filter(([, c]) => c !== 0)
    .map(([key, c]) => [key.split(',').map(Number), c])
    .sort(([[a1, b1]], [[a2, b2]]) => a2 - a1 || b1 - b2);
  return terms.map(([[px, py], c], i) => {
    const body = monoAscii(mono(c, px, py));
    return i === 0 ? `${c < 0 ? '-' : ''}${body}` : ` ${c < 0 ? '-' : '+'} ${body}`;
  }).join('');
}

/** A monomial in prose, its sign kept, bracketed for a power unless a lone letter: (2x), (−3), x. */
const piece = (m) => {
  const body = `${m.c < 0 ? '−' : ''}${pretty(monoAscii(m))}`;
  return /^[xy]$/.test(body) ? body : `(${body})`;
};

/** The asked term's letters as ASCII: x^3, x^2y^4, the constant. */
const powerAscii = (px, py) => letterAscii('x', px) + letterAscii('y', py);
/** In prose, with the powers raised: x³, x²y⁴. */
const pretty = (s) => s.replace(/\^(\d+)/g, (_, d) => sup(d)).replace(/ - /g, ' − ').replace(/(^|\()-/g, '$1−');

// --- Pascal's Triangle -----------------------------------------------------------

function pascal(rng) {
  const kind = rng.pick(['next', 'next', 'next', 'sum', 'sum', 'mirror', 'mirror', 'power', 'coefficient', 'coefficient', 'coefficient']);
  if (kind === 'next') {
    const n = rng.int(4, 10), r = row(n), next = row(n + 1);
    const k = rng.int(1, n); // the (k + 1)th number of the next row, not an end
    return {
      prompt: [T.prose(`One row of Pascal's triangle is ${r.join(', ')}. What is the ${ORD[k + 1]} number in the row below it?`)],
      text: `pascal next: ${r.join(', ')}; number ${k + 1}`,
      answer: intAnswer(next[k]),
      visual: null,
      explain: `Each number is the two above it added. The row below starts 1, and its ${ORD[k + 1]} number sits under the ${ORD[k]} and ${ORD[k + 1]} of this row: ${r[k - 1]} + ${r[k]} = ${next[k]}. So it is ${next[k]}.`,
    };
  }
  if (kind === 'sum') {
    const n = rng.int(3, 18), r = row(n);
    return {
      prompt: [T.prose(`A row of Pascal's triangle begins ${r.slice(0, 3).join(', ')}, …. What do all the numbers in that row add up to?`)],
      text: `pascal sum: begins ${r.slice(0, 3).join(', ')}`,
      answer: intAnswer(2 ** n),
      visual: null,
      explain: `A row beginning 1, ${n} is row ${n}, the coefficients of (a + b)${sup(n)}. Putting a = b = 1 adds them all: (1 + 1)${sup(n)} = 2${sup(n)} = ${commas(2 ** n)}. (Each row adds to twice the row above.) So they add up to ${commas(2 ** n)}.`,
    };
  }
  if (kind === 'mirror') {
    const n = rng.int(8, 16), r = row(n), half = Math.floor(n / 2) + 1;
    const k = rng.int(half, n - 2); // past the middle, so the mirror is needed
    return {
      prompt: [T.prose(`A row of Pascal's triangle begins ${r.slice(0, half).map(commas).join(', ')}, …. What is its ${ORD[k + 1]} number?`)],
      text: `pascal mirror: begins ${r.slice(0, half).join(', ')}; number ${k + 1}`,
      answer: intAnswer(r[k]),
      visual: null,
      explain: `The row reads the same from either end. It begins 1, ${n}, so it has ${n + 1} numbers, and the ${ORD[k + 1]} from the start is the ${ORD[n - k + 1]} from the end, which is the ${ORD[n - k + 1]} from the start: ${commas(r[n - k])}. So it is ${commas(r[k])}.`,
    };
  }
  if (kind === 'power') {
    const n = rng.int(3, 20), r = row(n);
    return {
      prompt: [T.prose(`Multiplied out, (a + b)ⁿ has the coefficients ${r.slice(0, 3).map(commas).join(', ')}, …. What is n?`)],
      text: `pascal power: begins ${r.slice(0, 3).join(', ')}`,
      answer: intAnswer(n),
      visual: null,
      explain: `The coefficients of (a + b)ⁿ are row n of Pascal's triangle, which begins 1, n: the second term is n·aⁿ⁻¹b, one b from any of the n brackets. So n = ${n}.`,
    };
  }
  const n = rng.int(3, 10), k = rng.int(1, n - 1), r = row(n);
  const term = `a${n - k === 1 ? '' : sup(n - k)}b${k === 1 ? '' : sup(k)}`;
  return {
    prompt: [T.prose(`Use Pascal's triangle: what is the coefficient of ${term} in (a + b)${sup(n)} multiplied out?`)],
    text: `coefficient: ${powerAscii(n - k, 0).replace(/x/g, 'a')}${powerAscii(0, k).replace(/y/g, 'b')} in (a + b)^${n}`,
    answer: intAnswer(r[k]),
    visual: null,
    explain: `Row ${n} of Pascal's triangle is ${r.join(', ')}: the coefficients of a${sup(n)}, a${sup(n - 1)}b, … , b${sup(n)} in turn. ${term} has b to the power ${k}, so it is number ${k + 1} along. So the coefficient is ${r[k]}.`,
  };
}

// --- Coefficients by Combinations --------------------------------------------------

function combos(rng) {
  const kind = rng.pick(['choose', 'choose', 'choose', 'same', 'same', 'one', 'one', 'one', 'two', 'two', 'two']);
  if (kind === 'choose' || kind === 'same') {
    const n = rng.int(5, 16), k = rng.int(2, n - 2);
    if (C(n, k) > 99999) return combos(rng);
    if (kind === 'same') {
      if (2 * k === n) return combos(rng);
      return {
        prompt: [T.prose(`C(${n}, ${k}) is equal to C(${n}, k) for one other whole number k. What is k?`)],
        text: `choose same: ${n}, ${k}`,
        answer: intAnswer(n - k),
        visual: null,
        explain: `Choosing ${k} of ${n} to take is the same as choosing the ${n - k} to leave, so C(${n}, ${k}) = C(${n}, ${n - k}); in Pascal's triangle, the row reads the same from either end. So k = ${n - k}.`,
      };
    }
    const top = Array.from({ length: k }, (_, i) => n - i);
    return {
      prompt: [T.prose(`Evaluate C(${n}, ${k}).`)],
      text: `choose: ${n}, ${k}`,
      answer: intAnswer(C(n, k)),
      visual: null,
      explain: `C(${n}, ${k}) = ${n}!/(${k}! · ${n - k}!): the ${k} biggest factors of ${n}! over ${k}!, ${top.join(' × ')}/${k}! = ${commas(top.reduce((a, b) => a * b, 1))}/${commas([...Array(k)].reduce((a, _, i) => a * (i + 1), 1))} = ${commas(C(n, k))}. So C(${n}, ${k}) = ${commas(C(n, k))}.`,
    };
  }
  const n = rng.int(4, 12), k = rng.int(1, n - 1);
  if (C(n, k) > 99999) return combos(rng);
  if (kind === 'one') {
    const asked = powerAscii(k, 0);
    return {
      prompt: [T.prose('What is the coefficient of'), drawn(asked), T.prose('in'), drawn(`(x + 1)^${n}`), T.prose('multiplied out?')],
      text: `coefficient: ${asked} in (x + 1)^${n}`,
      answer: intAnswer(C(n, k)),
      visual: null,
      explain: `Each of the ${n} brackets gives an x or a 1, and x${k === 1 ? '' : sup(k)} comes from choosing which ${k} give the x: C(${n}, ${k}) ways, and the 1s multiply to 1. So the coefficient is ${commas(C(n, k))}.`,
    };
  }
  const asked = powerAscii(n - k, k);
  return {
    prompt: [T.prose('What is the coefficient of'), drawn(asked), T.prose('in'), drawn(`(x + y)^${n}`), T.prose('multiplied out?')],
    text: `coefficient: ${asked} in (x + y)^${n}`,
    answer: intAnswer(C(n, k)),
    visual: null,
    explain: `Each of the ${n} brackets gives an x or a y, and ${pretty(asked)} takes y from ${k} of them: C(${n}, ${k}) = ${commas(C(n, k))} ways. (C(${n}, ${n - k}), choosing the x's, is the same number.) So the coefficient is ${commas(C(n, k))}.`,
  };
}

// --- A Given Term ------------------------------------------------------------------

/** The term with the second monomial to the power k, worked in words. */
function termWork(m1, m2, n, k) {
  const coef = C(n, k) * m1.c ** (n - k) * m2.c ** k;
  const f1 = m1.c === 1 ? '' : `(${minus(m1.c)})${sup(n - k)}`;
  const f2 = m2.c === 1 ? '' : `(${minus(m2.c)})${sup(k)}`;
  const parts = [`C(${n}, ${k}) = ${C(n, k)}`];
  if (f1) parts.push(`${f1} = ${commas(m1.c ** (n - k))}`);
  if (f2) parts.push(`${f2} = ${commas(m2.c ** k)}`);
  return { coef, said: `${parts.join(', ')}, and their product is ${commas(coef)}` };
}

function given(rng) {
  const kind = rng.pick(['ax+b', 'ax+b', 'ax+b', 'ax+b', 'nth', 'nth', 'nth', 'two', 'two', 'two', 'square', 'square']);
  for (;;) {
    const n = rng.int(3, 8);
    const a = kind === 'nth' ? rng.pick([1, 1, 2]) : rng.pick([1, 2, 2, 3]);
    const b = rng.pick([1, 2, 3, -1, -2, -3, 4, -4, 5]);
    const m1 = kind === 'square' ? mono(a, 2) : mono(a, 1);
    const m2 = kind === 'two' ? mono(b, 0, 1) : mono(b);
    const k = rng.int(kind === 'nth' ? 1 : 1, n - 1);
    const { coef, said } = termWork(m1, m2, n, k);
    if (Math.abs(coef) > 999999 || Math.abs(coef) < 2) continue;
    if (Math.abs(a) === 1 && Math.abs(b) === 1) continue;
    const src = binAscii(m1, m2, n);
    const px = m1.px * (n - k), py = m2.py * k;
    if (kind === 'nth') {
      return {
        prompt: [T.prose('When'), drawn(src), T.prose(`is multiplied out in descending powers of x, what is the coefficient of its ${ORD[k + 1]} term?`)],
        text: `term number: ${k + 1} of ${src}`,
        answer: intAnswer(coef),
        visual: null,
        explain: `The terms run C(${n}, 0), C(${n}, 1), …, the second number's power rising from 0, so the ${ORD[k + 1]} term has it to the power ${k}: C(${n}, ${k})${piece(m1)}${sup(n - k)}${piece(m2)}${sup(k)}. `
          + `${said}. So the coefficient is ${commas(coef)}.`,
      };
    }
    const asked = powerAscii(px, py);
    return {
      prompt: [T.prose('What is the coefficient of'), drawn(asked), T.prose('in'), drawn(src), T.prose('multiplied out?')],
      text: `coefficient: ${asked} in ${src}`,
      answer: intAnswer(coef),
      visual: null,
      explain: `${pretty(asked)} comes from the term with the second number to the power ${k}${kind === 'square' ? `, since (x²)${sup(n - k)} = x${sup(2 * (n - k))}` : ''}: C(${n}, ${k})${piece(m1)}${sup(n - k)}${piece(m2)}${sup(k)}. `
        + `Its number is ${said}, signs and all. So the coefficient is ${commas(coef)}.`,
    };
  }
}

// --- Full Expansion ----------------------------------------------------------------

/** One term of the expansion before it is worked out: 4(3x)³(−4). */
function rawTerm(m1, m2, n, k) {
  const c = C(n, k);
  const pow = (m, e) => (e === 0 ? '' : `${piece(m)}${e === 1 ? '' : sup(e)}`);
  return `${c === 1 ? '' : c}${pow(m1, n - k)}${pow(m2, k)}`;
}

function full(rng) {
  const kind = rng.pick(['x+b', 'x+b', 'x+b', 'ax+b', 'ax+b', 'ax+b', 'two', 'two', 'two', 'square']);
  for (;;) {
    const n = kind === 'x+b' ? rng.int(3, 6) : kind === 'square' ? rng.int(3, 5) : rng.int(3, 4);
    const a = kind === 'x+b' || kind === 'square' ? 1 : rng.pick([2, 3, 2, 4, 5]);
    const b = rng.pick(n >= 5 ? [1, 2, -1, -2, 3, -3] : [1, 2, 3, -1, -2, -3, 4, -4, 5, -5]);
    // (3x + 3)³ is 27(x + 1)³: a common factor would hide the binomial asked for.
    const shared = (p, q) => (q ? shared(q, p % q) : Math.abs(p));
    if (kind === 'ax+b' && shared(a, b) > 1) continue;
    let m1 = kind === 'square' ? mono(1, 2) : mono(a, 1);
    let m2 = mono(b);
    if (kind === 'two') {
      // x and a multiple of y, or a multiple of x and y, sharing no factor.
      [m1, m2] = rng.chance(0.5) ? [mono(1, 1), mono(rng.pick([2, 3, 4, -2, -3, -4]), 0, 1)] : [mono(a, 1), mono(rng.pick([1, -1]), 0, 1)];
    }
    const map = expand(m1, m2, n);
    if ([...map.values()].some((c) => Math.abs(c) > 9999)) continue;
    const src = binAscii(m1, m2, n);
    const ans = polyAscii(map);
    const raw = Array.from({ length: n + 1 }, (_, k) => rawTerm(m1, m2, n, k));
    return {
      prompt: [T.prose('Expand and simplify:'), ...previewOf(src).terms],
      text: `expand: ${src}`,
      answer: { type: 'expr', value: ans },
      visual: null,
      explain: `Row ${n} of Pascal's triangle, ${row(n).join(', ')}, gives the coefficients; the power of ${piece(m1)} falls from ${n} as the power of ${piece(m2)} rises from 0: `
        + `${raw.join(' + ')}. Working each out, signs and all, gives ${pretty(ans)}. So it is ${pretty(ans)}.`,
    };
  }
}

// --- The Constant Term --------------------------------------------------------------

function constant(rng) {
  // requiem: catalogue/content/shape-picked-before-retry
  // Chosen once, so that a draw with no constant term retries the same kind.
  const ask = rng.pick(['zero', 'zero', 'zero', 'which', 'which', 'which', 'power', 'power']);
  for (;;) {
    const p1 = rng.pick([1, 1, 2, 2, 3]), p2 = rng.pick([-1, -1, -2, -3]);
    const c1 = rng.pick([1, 1, 2, 3, 4]), c2 = rng.pick([1, 2, 3, 4, -1, -2, -3, -4]);
    const n = rng.int(3, 10);
    const m1 = mono(c1, p1), m2 = mono(c2, p2);
    // The power of x in the term with m2 to the power k: p1(n − k) + p2·k.
    const zero = Array.from({ length: n + 1 }, (_, k) => k).find((k) => p1 * (n - k) + p2 * k === 0);
    const askZero = ask !== 'power';
    const k = askZero ? zero : rng.int(1, n - 1);
    if (k === undefined) continue;
    if (ask === 'which') {
      // Which term is the constant one: the count along, not the number in it.
      const src = binAscii(m1, m2, n);
      const each = `${p1 === 1 ? '' : p1}(${n} − k) − ${-p2 === 1 ? '' : -p2}k`;
      return {
        prompt: [T.prose('Multiplied out in descending powers of x,'), drawn(src), T.prose('has one constant term. Counting from the first term, which term is it? Give its number: 1 for the first.')],
        text: `constant term number: ${src}`,
        answer: intAnswer(k + 1),
        visual: null,
        explain: `The term with ${piece(m2)} to the power k has x to the power ${each} = ${p1 * n} − ${p1 - p2 === 1 ? '' : p1 - p2}k, which is 0 when k = ${k}. `
          + `k counts up from 0 at the first term, so k = ${k} is term ${k + 1}. So it is term ${k + 1}.`,
      };
    }
    const power = p1 * (n - k) + p2 * k;
    if (!askZero && power === 0) continue;
    const coef = C(n, k) * c1 ** (n - k) * c2 ** k;
    if (Math.abs(coef) > 99999 || Math.abs(coef) < 2) continue;
    if (c1 === 1 && Math.abs(c2) === 1 && rng.chance(0.6)) continue;
    const src = binAscii(m1, m2, n);
    const xp = power === 1 ? 'x' : `x^${power}`;
    const each = `${p1 === 1 ? '' : p1}(${n} − k) − ${-p2 === 1 ? '' : -p2}k`;
    const { said } = termWork(m1, m2, n, k);
    const named = power === 0 ? 'the constant term' : `the coefficient of x${power === 1 ? '' : sup(power)}`;
    return {
      prompt: power === 0
        ? [T.prose('What is the constant term of'), drawn(src), T.prose('multiplied out?')]
        : [T.prose('What is the coefficient of'), drawn(xp), T.prose('in'), drawn(src), T.prose('multiplied out?')],
      text: `coefficient: ${power === 0 ? 'x^0' : xp} in ${src}`,
      answer: intAnswer(coef),
      visual: null,
      explain: `The term with ${piece(m2)} to the power k has x to the power ${each} = ${p1 * n} − ${p1 - p2 === 1 ? '' : p1 - p2}k, which is ${minus(power)} when k = ${k}. `
        + `That term is ${rawTerm(m1, m2, n, k)}, and its number is ${said}. So ${named} is ${commas(coef)}.`,
    };
  }
}

// --- Binomial Probability -----------------------------------------------------------

/** A count and its noun: 1 head, 3 heads. */
const many = (k, one, more) => `${k} ${k === 1 ? one : more}`;

const STORIES = [
  { p: [1, 2], tag: 'coin', say: (n) => `A fair coin is tossed ${n} times.`, win: (k) => many(k, 'head', 'heads'), lose: (k) => many(k, 'tail', 'tails') },
  { p: [1, 6], tag: 'die', say: (n) => `A fair number cube is rolled ${n} times.`, win: (k) => many(k, 'six', 'sixes'), lose: (k) => many(k, 'roll that is not a six', 'rolls that are not sixes') },
  { p: [2, 3], tag: 'shots', say: (n) => `A basketball player makes 2/3 of her free throws, each one independent of the others. She takes ${n}.`, win: (k) => many(k, 'basket', 'baskets'), lose: (k) => many(k, 'miss', 'misses') },
  { p: [3, 4], tag: 'seeds', say: (n) => `Each seed in a packet sprouts with probability 3/4, independently of the others. ${n} seeds are planted.`, win: (k) => many(k, 'seed sprouting', 'seeds sprouting'), lose: (k) => many(k, 'seed that does not', 'seeds that do not') },
  { p: [1, 4], tag: 'guess', say: (n) => `A quiz has ${n} questions, each with 4 choices, and a student guesses every answer.`, win: (k) => many(k, 'right answer', 'right answers'), lose: (k) => many(k, 'wrong answer', 'wrong answers') },
  { p: [3, 5], tag: 'rain', say: (n) => `On each of the next ${n} days, the chance of rain is 3/5, independently of the other days.`, win: (k) => many(k, 'rainy day', 'rainy days'), lose: (k) => many(k, 'dry day', 'dry days') },
  { p: [1, 3], tag: 'spinner', say: (n) => `A spinner lands on red with probability 1/3. It is spun ${n} times.`, win: (k) => many(k, 'red', 'reds'), lose: (k) => many(k, 'spin that is not red', 'spins that are not red') },
];

function chance(rng) {
  const story = rng.pick([STORIES[0], STORIES[0], STORIES[1], STORIES[2], STORIES[3], STORIES[4], STORIES[5], STORIES[6]]);
  const [pn, pd] = story.p;
  const n = rng.int(3, story.tag === 'die' ? 5 : story.tag === 'coin' ? 8 : 6);
  const how = rng.pick(['exactly', 'exactly', 'at least', 'at most']);
  // At least 1 and at most n − 1 are one minus a single order's chance.
  const k = how === 'exactly' ? rng.int(1, n - 1) : how === 'at least' ? rng.pick([1, n - 2, n - 1]) : rng.pick([1, 2, n - 1]);
  const ks = how === 'exactly' ? [k] : how === 'at least' ? Array.from({ length: n - k + 1 }, (_, i) => k + i) : Array.from({ length: k + 1 }, (_, i) => i);
  const qn = pd - pn, bot = pd ** n;
  if (bot > 10 ** 7) return chance(rng);
  const tops = ks.map((j) => C(n, j) * pn ** j * qn ** (n - j));
  const top = tops.reduce((a, b) => a + b, 0);
  const p = fracText(pn, pd), q = fracText(qn, pd);
  // Each kept over the same bottom, so the terms add as they stand.
  const one = (j) => `C(${n}, ${j})(${p})${sup(j)}(${q})${sup(n - j)} = ${C(n, j)} × ${pn ** j * qn ** (n - j)}/${bot} = ${C(n, j) * pn ** j * qn ** (n - j)}/${bot}`;
  return {
    prompt: [T.prose(`${story.say(n)} What is the probability of ${how} ${story.win(k)}?`)],
    text: `binomial chance: n ${n}, p ${p}, ${how} ${k}; ${story.tag}`,
    answer: fracAnswer(top, bot),
    visual: null,
    explain: (how === 'exactly'
      ? `Any one order of ${story.win(k)} and ${story.lose(n - k)} has probability (${p})${sup(k)}(${q})${sup(n - k)}, and there are C(${n}, ${k}) = ${C(n, k)} orders: ${one(k)}.`
      : `${how === 'at least' ? 'At least' : 'At most'} ${k} means ${ks.join(' or ')}, each the number of orders times the chance of one order: ${ks.map(one).join('; ')}. `
        + `Added, ${tops.join(' + ')} = ${top}, over ${bot}.`
        + (how === 'at least' && k === 1 ? ` (Or one minus the chance of none: 1 − (${q})${sup(n)} = ${bot - qn ** n}/${bot}.)`
          : how === 'at most' && k === n - 1 ? ` (Or one minus the chance of all ${n}: 1 − (${p})${sup(n)} = ${bot - pn ** n}/${bot}.)` : ''))
      + ` So the probability is ${fracText(top, bot)}.`,
  };
}

const CONTENT = [pascal, combos, given, full, constant, chance];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  // requiem: catalogue/content/one-input-per-level
  // A coefficient or count goes in the whole-number box, a probability in
  // the fraction box and an expansion in the expression box; each question
  // says which ("the coefficient", "the probability", "Expand").
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
