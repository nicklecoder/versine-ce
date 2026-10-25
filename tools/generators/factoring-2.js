/**
 * Catalogue authoring tool: builds the problem library for factoring II.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 *
 * Texts are `factor: POLYNOMIAL`, the same as Factoring's, so
 * scripts/check-answers.py multiplies every answer back out and tests each
 * factor by the same rule.
 */
import * as T from '../terms.js';
import { minus, signed } from '../../web/ui/dom.js';
import { previewOf } from '../../web/ui/express.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/factoring-2.js';

const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const sup = (n) => String(n).replace(/\d/g, (c) => SUP[c]);
const LETTERS = ['x', 'x', 'x', 'a', 'y', 'n'];
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const isSquare = (n) => n >= 0 && Number.isInteger(Math.sqrt(n));

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
function times(...polys) {
  return polys.reduce((acc, b) => {
    const by = new Map();
    for (const [c, p] of acc) for (const [d, q] of b) by.set(p + q, (by.get(p + q) ?? 0) + c * d);
    return [...by].filter(([, c]) => c).map(([p, c]) => [c, p]).sort((x, y) => y[1] - x[1]);
  });
}

/**
 * A product written out, ASCII and pretty: a monomial in front, if any, then
 * each factor in a bracket, a repeated one as a square. Also every other way
 * the same product is finished -- a square written as two brackets.
 */
function product(front, factors, v) {
  const counted = [];
  for (const f of factors) {
    const key = write(f, v), seen = counted.find((c) => c.key === key);
    if (seen) seen.n++; else counted.push({ key, f, n: 1 });
  }
  const lead = front ? write(front, v) : '';
  const ascii = lead + counted.map((c) => `(${c.key})${c.n > 1 ? `^${c.n}` : ''}`).join('');
  const shown = (front ? pretty(front, v) : '') + counted.map((c) => `(${pretty(c.f, v)})${c.n > 1 ? sup(c.n) : ''}`).join('');
  const spelled = lead + factors.map((f) => `(${write(f, v)})`).join('');
  return { ascii, shown, accept: spelled !== ascii ? [spelled] : [] };
}

function asks(poly, v) {
  const r = previewOf(write(poly, v));
  if (!r.ok) throw new Error(`factoring-2: cannot draw "${write(poly, v)}" — ${r.error}`);
  // requiem: catalogue/content/expression-prompts-name-the-form
  // Said every time: in All Together nothing else says the answer is a product.
  return [T.prose('Factor completely:'), ...r.terms, T.op('='), T.blank()];
}

const problem = (poly, v, front, factors, explain) => {
  const p = product(front, factors, v);
  return {
    prompt: asks(poly, v),
    text: `factor: ${write(poly, v)}`,
    answer: { type: 'expr', value: p.ascii, ...(p.accept.length ? { accept: p.accept } : {}) },
    visual: null,
    explain: `${explain} So ${p.shown}.`,
  };
};

/** Two brackets (px + q)(rx + s) with no common factor in either. */
function brackets(rng, leads) {
  const a = rng.pick(leads);
  const ps = [];
  for (let p = 1; p <= a; p++) if (a % p === 0) ps.push(p);
  const p = rng.pick(ps), r = a / p;
  const q = rng.nonZero(-9, 9), s = rng.nonZero(-9, 9);
  if (gcd(p, q) !== 1 || gcd(r, s) !== 1) return brackets(rng, leads);
  const poly = times(linear(p, q), linear(r, s));
  if (poly.length < 3) return brackets(rng, leads);
  return { a, p, q, r, s, poly };
}

function trial(rng) {
  const v = rng.pick(LETTERS);
  const { a, p, q, r, s, poly } = brackets(rng, [2, 3, 5, 7]);
  const b = poly[1][0], c = poly[2][0];
  const first = (k) => (k === 1 ? v : `${k}${v}`);
  return problem(poly, v, null, [linear(p, q), linear(r, s)].sort((x, y) => y[0][0] - x[0][0]),
    `${pretty([[a, 2]], v)} can only come from ${first(Math.max(p, r))} × ${first(Math.min(p, r))}, so the brackets start (${first(Math.max(p, r))} …)(${first(Math.min(p, r))} …). `
    + `The last numbers multiply to ${minus(c)}; try each pair in each order until the outside and inside products add to ${pretty([[b, 1]], v)}: `
    + `${first(p)} × ${signed(s)} and ${minus(q)} × ${first(r)} give ${pretty([[p * s, 1]], v)} and ${pretty([[q * r, 1]], v)}, which make ${pretty([[b, 1]], v)}.`);
}

/** The AC method: a × c, the pair, split the middle, and group. */
function ac(rng) {
  const v = rng.pick(LETTERS);
  const { p, q, r, s, poly } = brackets(rng, [4, 6, 6, 8, 9, 10, 12]);
  if (poly[0][1] !== 2 || poly.length !== 3) return ac(rng);
  const [[a], [b], [c]] = poly;
  // The pair is p·s and q·r, in whichever order lets the first two terms
  // and the last two share a bracket.
  const split = [[p * s, q * r], [q * r, p * s]].map(([m, n]) => {
    const G1 = gcd(a, m), B = [a / G1, m / G1], g2 = n / B[0];
    return { m, n, G1, B, g2, ok: Number.isInteger(g2) && g2 * B[1] === c };
  }).find((x) => x.ok);
  if (!split) return ac(rng);
  const { m, n, G1, B, g2 } = split;
  const head = pretty([[G1, 1]], v);
  return problem(poly, v, null, [linear(G1, g2), linear(B[0], B[1])],
    `a × c = ${a} × ${signed(c)} = ${minus(a * c)}. Two numbers that multiply to ${minus(a * c)} and add to ${minus(b)}: ${minus(m)} and ${minus(n)}. `
    + `Split the middle with them: ${pretty([[a, 2], [m, 1], [n, 1], [c, 0]], v)}. `
    + `Group in pairs: ${head}(${pretty(linear(B[0], B[1]), v)}) ${g2 < 0 ? '−' : '+'} ${Math.abs(g2)}(${pretty(linear(B[0], B[1]), v)}). `
    + `The bracket is shared, and comes out.`);
}

function completely(rng) {
  const v = rng.pick(LETTERS);
  const shape = rng.pick(['trinomial', 'trinomial', 'squares', 'square', 'fourth']);
  const g = rng.pick([2, 3, 4, 5]), k = rng.int(0, 1);
  const front = [[g, k]];
  const F = pretty(front, v);
  if (shape === 'fourth') {
    const a = rng.pick([1, 1, 1, 2]), b = rng.pick([1, 2, 3]);
    if (gcd(a, b) !== 1) return completely(rng);
    const factors = [[[a * a, 2], [b * b, 0]], linear(a, b), linear(a, -b)];
    const poly = times(...factors);
    const A = a === 1 ? v : `${a}${v}`;
    return problem(poly, v, null, factors,
      `No common factor, but it is a difference of squares: (${pretty([[a * a, 2]], v)})² − ${b * b}², which is `
      + `(${pretty([[a * a, 2], [b * b, 0]], v)})(${pretty([[a * a, 2], [-b * b, 0]], v)}). The second bracket is a difference of squares again, `
      + `(${A} + ${b})(${A} − ${b}). The first, a sum of squares, does not factor.`);
  }
  let factors, inside;
  if (shape === 'trinomial') {
    const p = rng.nonZero(-9, 9), q = rng.nonZero(-9, 9);
    if (p === q || p + q === 0) return completely(rng);
    factors = [linear(1, Math.min(p, q)), linear(1, Math.max(p, q))];
    inside = `a trinomial: two numbers that multiply to ${minus(p * q)} and add to ${minus(p + q)}, ${minus(Math.min(p, q))} and ${minus(Math.max(p, q))}`;
  } else if (shape === 'squares') {
    const b = rng.int(1, 9);
    factors = [linear(1, b), linear(1, -b)];
    inside = `a difference of squares, ${v}² − ${b}²`;
  } else {
    const b = rng.nonZero(-9, 9);
    factors = [linear(1, b), linear(1, b)];
    inside = `a perfect square: ${v}² and ${b * b} = ${Math.abs(b)}², with twice ${Math.abs(b)}${v} in the middle`;
  }
  const rest = times(...factors);
  const poly = times(front, rest);
  return problem(poly, v, front, factors,
    `Common factor first: ${F}. What is left, ${pretty(rest, v)}, is ${inside}.`);
}

function grouping(rng) {
  const v = rng.pick(LETTERS);
  const a = rng.pick([1, 1, 1, 2, 3]), p = rng.nonZero(-9, 9), q = rng.nonZero(-9, 9), c = rng.pick([1, 1, 2]);
  // The quadratic bracket must not factor again: a sum, or a difference that is not of squares.
  if (gcd(a, p) !== 1 || gcd(c, q) !== 1 || (p < 0 && isSquare(-p) && isSquare(a))) return grouping(rng);
  const quad = [[a, 2], [p, 0]], lin = linear(c, q);
  const poly = times(quad, lin);
  if (poly.length !== 4) return grouping(rng);
  const [t1, t2, t3, t4] = poly;
  const lead = pretty([[a, 2]], v);
  return problem(poly, v, null, [lin, quad],
    `Group in pairs, ${pretty([t1, t2], v)} and ${pretty([t3, t4], v)}. `
    + `Take ${lead} out of the first and ${minus(p)} out of the second: ${lead}(${pretty(lin, v)}) ${p < 0 ? '−' : '+'} ${Math.abs(p)}(${pretty(lin, v)}). `
    + `Both have (${pretty(lin, v)}), so it comes out, leaving ${pretty(quad, v)}.`);
}

function cubes(rng) {
  const v = rng.pick(LETTERS);
  const a = rng.pick([1, 1, 1, 2, 3]), b = rng.int(1, 10), plus = rng.chance(0.5);
  if (gcd(a, b) !== 1 || a * b > 15) return cubes(rng);
  const sign = plus ? 1 : -1;
  const lin = linear(a, sign * b), quad = [[a * a, 2], [-sign * a * b, 1], [b * b, 0]];
  const poly = times(lin, quad);
  const A = a === 1 ? v : `${a}${v}`;
  return problem(poly, v, null, [lin, quad],
    `${pretty([[a ** 3, 3]], v)} is ${a === 1 ? `${v}³` : `(${A})³`} and ${b ** 3} is ${b}³: a ${plus ? 'sum' : 'difference'} of cubes. `
    + `The first bracket keeps the sign, (${A} ${plus ? '+' : '−'} ${b}). The second squares both, with their product between `
    + `at the opposite sign: ${pretty(quad, v)}. It does not factor again.`);
}

const CONTENT = [trial, ac, completely, grouping, cubes];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
