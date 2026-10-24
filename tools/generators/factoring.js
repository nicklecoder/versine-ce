/**
 * Catalogue authoring tool: builds the problem library for factoring.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 *
 * Every `text` carries the polynomial in plain ASCII, so scripts/check-answers.py
 * can multiply the answer back out and test each factor for itself.
 */
import * as T from '../terms.js';
import { minus, signed } from '../../web/ui/dom.js';
import { previewOf } from '../../web/ui/express.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/factoring.js';

const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const sup = (n) => String(n).replace(/\d/g, (c) => SUP[c]);
const LETTERS = ['x', 'x', 'x', 'a', 'y', 'n'];
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const isSquare = (n) => n >= 0 && Number.isInteger(Math.sqrt(n));
/** A term squared, bracketed only when it is more than a letter: x², (3x)². */
const squared = (A) => (A.length === 1 ? `${A}²` : `(${A})²`);

/** A polynomial as [[coefficient, power], ...], highest power first. */
function write(poly, v, { pretty = false } = {}) {
  return poly.filter(([c]) => c !== 0).map(([c, p], i) => {
    const letter = p === 0 ? '' : p === 1 ? v : pretty ? `${v}${sup(p)}` : `${v}^${p}`;
    const body = `${Math.abs(c) === 1 && letter ? '' : Math.abs(c)}${letter}`;
    if (i === 0) return c < 0 ? `${pretty ? '−' : '-'}${body}` : body;
    return `${c < 0 ? (pretty ? ' − ' : ' - ') : ' + '}${body}`;
  }).join('');
}
const pretty = (poly, v) => write(poly, v, { pretty: true });
const linear = (a, b) => [[a, 1], [b, 0]];
const times = (a, b) => {
  const by = new Map();
  for (const [c, p] of a) for (const [d, q] of b) by.set(p + q, (by.get(p + q) ?? 0) + c * d);
  return [...by].filter(([, c]) => c).map(([p, c]) => [c, p]).sort((x, y) => y[1] - x[1]);
};

function asks(poly, v) {
  const r = previewOf(write(poly, v));
  if (!r.ok) throw new Error(`factoring: cannot draw "${write(poly, v)}" — ${r.error}`);
  // requiem: catalogue/content/expression-prompts-name-the-form
  // Said every time: in All Together nothing else says the answer is a product.
  return [T.prose('Factor completely:'), ...r.terms, T.op('='), T.blank()];
}

/** The factor pairs of c as signed pairs, smaller first: for "two numbers". */
function pairs(c) {
  const out = [];
  for (let p = 1; p * p <= Math.abs(c); p++) {
    if (c % p) continue;
    const q = c / p;
    out.push([p, q], [-p, -q]);
  }
  return out;
}

/** "12: 1 × 12, 2 × 6, 3 × 4. Only 3 and 4 add to 7." */
function search(b, c, p, q) {
  // The signs narrow the search before any multiplying: c positive means
  // the same sign twice, the sign of b; c negative, one of each.
  const same = c > 0;
  const tried = pairs(c).filter(([x]) => !same || Math.sign(x) === Math.sign(b));
  const listed = tried.map(([x, y]) => `${minus(x)} × ${signed(y)}`).join(', ');
  const why = same ? (b > 0 ? 'c is positive and b positive: both numbers are positive. '
    : 'c is positive and b negative: both numbers are negative. ')
    : 'c is negative: one number is positive and one negative. ';
  return `${why}Pairs that multiply to ${minus(c)}: ${listed}. Only ${minus(p)} and ${minus(q)} add to ${minus(b)}.`;
}

const bracketOf = (a, b, v) => `(${write(linear(a, b), v)})`;

function commonFactor(rng) {
  const v = rng.pick(LETTERS);
  const g = rng.pick([1, 2, 2, 3, 3, 4, 5, 6, 7, 8, 9]);
  const k = g === 1 ? rng.int(1, 3) : rng.int(0, 3);
  // The inside: content 1, a constant term, and nothing left to factor.
  const shape = rng.pick(['linear', 'linear', 'quadratic', 'squares']);
  let inner;
  if (shape === 'linear') inner = linear(rng.int(1, 9), rng.nonZero(-9, 9));
  else if (shape === 'squares') inner = [[rng.int(1, 5), 2], [rng.int(1, 9) * (rng.chance(0.5) ? 1 : -1), 0]];
  else inner = [[rng.int(1, 4), 2], [rng.nonZero(-9, 9), 1], [rng.nonZero(-9, 9), 0]];
  const cs = inner.map(([c]) => c);
  if (cs.reduce(gcd) !== 1) return commonFactor(rng);
  if (inner.length === 3 && isSquare(inner[1][0] ** 2 - 4 * inner[0][0] * inner[2][0])) return commonFactor(rng);
  if (inner.length === 2 && inner[0][1] === 2 && isSquare(inner[0][0]) && isSquare(-inner[1][0])) return commonFactor(rng);
  const gcf = [[g, k]];
  const poly = times(gcf, inner);
  const G = pretty(gcf, v);
  const answer = `${write(gcf, v)}(${write(inner, v)})`;
  const parts = [];
  if (g > 1) parts.push(`the biggest number dividing ${poly.map(([c]) => Math.abs(c)).join(', ')} is ${g}`);
  if (k > 0) parts.push(`the lowest power of ${v} in every term is ${k === 1 ? v : `${v}${sup(k)}`}`);
  return {
    prompt: asks(poly, v),
    text: `factor: ${write(poly, v)}`,
    answer: { type: 'expr', value: answer },
    visual: null,
    explain: `${parts.join(', and ').replace(/^./, (c) => c.toUpperCase())}. Take out ${G}, dividing each term by it: `
      + `${poly.map((t, i) => `${pretty([t], v)} ÷ ${G} = ${pretty([inner[i]], v)}`).join(', ')}. `
      + `So ${G}(${pretty(inner, v)}).`,
  };
}

function trinomial(rng, negatives) {
  const v = rng.pick(LETTERS);
  let p, q;
  if (negatives) {
    p = rng.nonZero(-12, 12); q = rng.nonZero(-12, 12);
    if (p > 0 && q > 0) return trinomial(rng, negatives);
  } else {
    p = rng.int(1, 12); q = rng.int(1, 12);
  }
  if (p === q || Math.abs(p * q) > 120 || p + q === 0) return trinomial(rng, negatives);
  [p, q] = p < q ? [p, q] : [q, p];
  const poly = times(linear(1, p), linear(1, q));
  return {
    prompt: asks(poly, v),
    text: `factor: ${write(poly, v)}`,
    answer: { type: 'expr', value: `${bracketOf(1, p, v)}${bracketOf(1, q, v)}` },
    visual: null,
    explain: `Two numbers that multiply to ${minus(p * q)} and add to ${minus(p + q)}. ${search(p + q, p * q, p, q)} `
      + `So (${pretty(linear(1, p), v)})(${pretty(linear(1, q), v)}).`,
  };
}

function squares(rng) {
  const v = rng.pick(LETTERS);
  const a = rng.pick([1, 1, 1, 2, 3, 4, 5]), b = rng.int(1, 12);
  if (gcd(a, b) !== 1) return squares(rng);
  const flipped = rng.chance(0.2);
  const poly = flipped ? [[b * b, 0], [-a * a, 2]] : [[a * a, 2], [-b * b, 0]];
  const A = a === 1 ? v : `${a}${v}`;
  const [plus, less] = flipped
    ? [`(${b} + ${A})`, `(${b} - ${A})`] : [`(${A} + ${b})`, `(${A} - ${b})`];
  return {
    prompt: asks(poly, v),
    text: `factor: ${write(poly, v)}`,
    answer: { type: 'expr', value: `${plus}${less}` },
    visual: null,
    explain: `${flipped ? `${b * b} is ${b}² and ${pretty([[a * a, 2]], v)} is ${squared(A)}` : `${pretty([[a * a, 2]], v)} is ${squared(A)} and ${b * b} is ${b}²`}: `
      + `a square minus a square. Their sum times their difference gives it back, since the middle terms cancel. `
      + `So ${plus.replace('-', '−')}${less.replace('-', '−')}.`,
  };
}

function perfect(rng) {
  const v = rng.pick(LETTERS);
  const a = rng.pick([1, 1, 1, 2, 3, 4]), b = rng.int(1, 12) * (rng.chance(0.45) ? -1 : 1);
  if (gcd(a, b) !== 1) return perfect(rng);
  const poly = times(linear(a, b), linear(a, b));
  const A = a === 1 ? v : `${a}${v}`;
  const base = bracketOf(a, b, v);
  return {
    prompt: asks(poly, v),
    text: `factor: ${write(poly, v)}`,
    answer: { type: 'expr', value: `${base}^2`, accept: [`${base}${base}`] },
    visual: null,
    explain: `The first term is ${squared(A)} and the last is ${b * b} = ${Math.abs(b)}². The middle is twice their product, `
      + `2 × ${A} × ${Math.abs(b)} = ${pretty([[2 * a * Math.abs(b), 1]], v)}, `
      + `${b < 0 ? 'with a minus, so the bracket has a minus' : 'with a plus'}. `
      + `So (${pretty(linear(a, b), v)})².`,
  };
}

const PATTERNS = [
  { id: 'common', label: 'Take out a common factor' },
  { id: 'squares', label: 'A square minus a square' },
  { id: 'perfect', label: 'A perfect square trinomial' },
  { id: 'trinomial', label: 'Another trinomial: two numbers' },
  { id: 'prime', label: 'It will not factor' },
];

function whichPattern(rng, again = null) {
  const v = rng.pick(LETTERS);
  // A draw that is thrown away is drawn again as the same pattern, so the
  // patterns come up equally often whatever each one rejects.
  const id = again ?? rng.pick(PATTERNS).id;
  let poly, why;
  if (id === 'common') {
    const g = rng.int(2, 6);
    const inner = rng.pick([
      () => [[1, 2], [-(rng.int(1, 9) ** 2), 0]],
      () => times(linear(1, rng.nonZero(-9, 9)), linear(1, rng.nonZero(-9, 9))),
      () => linear(rng.int(1, 5), rng.nonZero(-9, 9)),
    ])();
    poly = times([[g, 0]], inner);
    why = `Every term divides by ${g}, so that comes out first: ${g}(${pretty(inner, v)}). `
      + 'Whatever pattern is inside is easier to see, and is missed without it.';
  } else if (id === 'squares') {
    const a = rng.pick([1, 1, 2, 3, 4, 5]), b = rng.int(1, 12);
    if (gcd(a, b) !== 1) return whichPattern(rng, id);
    poly = rng.chance(0.2) ? [[b * b, 0], [-a * a, 2]] : [[a * a, 2], [-b * b, 0]];
    const [first, last] = poly[0][1] === 2 ? [squared(a === 1 ? v : `${a}${v}`), `${b}²`] : [`${b}²`, squared(a === 1 ? v : `${a}${v}`)];
    why = `No common factor. Two terms, both squares, with a minus between: ${first} − ${last}.`;
  } else if (id === 'perfect') {
    const a = rng.pick([1, 1, 2, 3, 4, 5]), b = rng.nonZero(-12, 12);
    if (gcd(a, b) !== 1) return whichPattern(rng, id);
    poly = times(linear(a, b), linear(a, b));
    why = `No common factor. First and last are squares, and the middle is twice their product: `
      + `(${pretty(linear(a, b), v)})².`;
  } else if (id === 'trinomial') {
    const p = rng.nonZero(-9, 9), q = rng.nonZero(-9, 9);
    if (p === q || p + q === 0) return whichPattern(rng, id);
    poly = times(linear(1, p), linear(1, q));
    why = 'No common factor, three terms, and not a perfect square. '
      + `Two numbers that multiply to ${minus(p * q)} and add to ${minus(p + q)}: ${minus(Math.min(p, q))} and ${minus(Math.max(p, q))}.`;
  } else {
    poly = rng.pick([
      () => [[1, 2], [rng.int(1, 10) ** 2, 0]],
      () => [[1, 2], [-rng.pick([2, 3, 5, 6, 7, 8, 10, 11, 12, 15]), 0]],
      () => { const b = rng.nonZero(-9, 9), c = rng.nonZero(-12, 12); return [[1, 2], [b, 1], [c, 0]]; },
    ])();
    const [b, c] = poly.length === 3 ? [poly[1][0], poly[2][0]] : [0, poly[1][0]];
    if (isSquare(b * b - 4 * c)) return whichPattern(rng, id);
    why = poly.length === 2 && c > 0
      ? `A square plus a square does not factor: (${v} + ${Math.sqrt(c)})² has a middle term, and (${v} + ${Math.sqrt(c)})(${v} − ${Math.sqrt(c)}) has a minus.`
      : poly.length === 2 ? `${-c} is not a square, so this is not a difference of squares, and there is no common factor.`
        : `No common factor, and no two whole numbers multiply to ${minus(c)} and add to ${minus(b)}.`;
  }
  return {
    prompt: [...previewOf(write(poly, v)).terms, T.prose('— what do you look for first?')],
    text: `pattern: ${write(poly, v)}`,
    answer: { type: 'choice', value: id, options: PATTERNS },
    visual: null,
    explain: why,
  };
}

const CONTENT = [commonFactor, (rng) => trinomial(rng, false), (rng) => trinomial(rng, true), squares, perfect, whichPattern];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
