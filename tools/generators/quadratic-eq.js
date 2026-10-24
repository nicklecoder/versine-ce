/**
 * Catalogue authoring tool: builds the problem library for quadratic equations.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 *
 * Texts are `quadratic: EQUATION` and `method: EQUATION` in plain ASCII, so
 * scripts/check-answers.py can solve each equation by its own route.
 */
import * as T from '../terms.js';
import { minus } from '../../web/ui/dom.js';
import { previewOf } from '../../web/ui/express.js';
import { formatSet } from '../../web/math/solutions.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/quadratic-eq.js';

const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const sup = (n) => String(n).replace(/\d/g, (c) => SUP[c]);
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const isSquare = (n) => n >= 0 && Number.isInteger(Math.sqrt(n));

/** A polynomial as [[coefficient, power], ...], highest power first. */
function write(poly, v, { pretty = false } = {}) {
  const live = poly.filter(([c]) => c !== 0);
  if (!live.length) return '0';
  return live.map(([c, p], i) => {
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
const minusPoly = (a, b) => {
  const by = new Map();
  for (const [c, p] of a) by.set(p, (by.get(p) ?? 0) + c);
  for (const [c, p] of b) by.set(p, (by.get(p) ?? 0) - c);
  return [...by].filter(([, c]) => c).map(([p, c]) => [c, p]).sort((x, y) => y[1] - x[1]);
};

/** A root as an exact fraction, n/d in lowest terms with d > 0. */
const root = (n, d = 1) => { const g = gcd(n, d) * Math.sign(d); return { n: n / g, d: d / g }; };
const shown = ({ n, d }) => (d === 1 ? minus(n) : `${minus(n)}/${d}`);
const answerOf = (v, roots) => {
  const seen = new Map(roots.map((r) => [`${r.n}/${r.d}`, r]));
  const parts = [...seen.values()].sort((a, b) => a.n / a.d - b.n / b.d)
    .map((r) => ({ lo: r, loIn: true, hi: r, hiIn: true }));
  return { type: 'solutions', value: { letter: v, parts } };
};
const said = (v, roots) => formatSet(answerOf(v, roots).value);

/** "Solve (x − 3)(x + 5) = 0." with the equation drawn. */
function solve(src) {
  const r = previewOf(src);
  if (!r.ok) throw new Error(`quadratic-eq: cannot draw "${src}" — ${r.error}`);
  return [T.prose('Solve'), ...r.terms, T.prose('.')];
}

/** The root of a·x + b = 0, and the sentence that finds it. */
function zeroOf([[a], [b]], v) {
  const r = root(-b, a);
  const eq = `${pretty(linear(a, b), v)} = 0`;
  return { r, step: a === 1 ? `${eq} gives ${v} = ${shown(r)}` : `${eq} gives ${pretty([[a, 1]], v)} = ${minus(-b)}, so ${v} = ${shown(r)}` };
}

const LETTERS = ['x', 'x', 'x', 'a', 'n', 't'];

function zeroProduct(rng) {
  const v = rng.pick(LETTERS);
  const shape = rng.pick(['two', 'two', 'two', 'x', 'lead']);
  let factors;
  if (shape === 'x') factors = [[[1, 1]], linear(1, rng.nonZero(-12, 12))];
  else if (shape === 'lead') factors = [linear(rng.int(2, 5), rng.nonZero(-9, 9)), linear(1, rng.nonZero(-9, 9))];
  else factors = [linear(1, rng.nonZero(-12, 12)), linear(1, rng.nonZero(-12, 12))];
  if (shape === 'lead' && gcd(factors[0][0][0], factors[0][1][0]) !== 1) return zeroProduct(rng);
  const src = `${factors.map((f) => (f.length === 1 ? v : `(${write(f, v)})`)).join('')} = 0`;
  const steps = factors.map((f) => (f.length === 1 ? { r: root(0), step: `${v} = 0` } : zeroOf(f, v)));
  return {
    prompt: solve(src),
    text: `quadratic: ${src}`,
    answer: answerOf(v, steps.map((s) => s.r)),
    visual: null,
    explain: `A product is 0 only when one of its factors is 0, so set each to 0: ${steps.map((s) => s.step).join('; ')}. `
      + `So ${said(v, steps.map((s) => s.r))}.`,
  };
}

/** A quadratic that factors, with its factors and roots. */
function factorable(rng) {
  const shape = rng.pick(['monic', 'monic', 'monic', 'common', 'squares', 'lead']);
  if (shape === 'common') {
    const g = rng.int(1, 5), p = rng.nonZero(-12, 12);
    return { factors: [[[g, 1]], linear(1, p)], how: `take out ${g === 1 ? 'x' : `${g}x`}` };
  }
  if (shape === 'squares') {
    const b = rng.int(1, 12);
    return { factors: [linear(1, b), linear(1, -b)], how: `a difference of squares, x² − ${b}²` };
  }
  if (shape === 'lead') {
    const a = rng.pick([2, 3, 5]), q = rng.nonZero(-9, 9), s = rng.nonZero(-9, 9);
    if (gcd(a, q) !== 1) return factorable(rng);
    return { factors: [linear(a, q), linear(1, s)], how: 'the brackets start with the factors of the first term' };
  }
  const p = rng.nonZero(-12, 12), q = rng.nonZero(-12, 12);
  if (Math.abs(p * q) > 120) return factorable(rng);
  return { factors: [linear(1, p), linear(1, q)], how: `two numbers that multiply to ${minus(p * q)} and add to ${minus(p + q)}` };
}

function rootsOf(factors, v) {
  return factors.map((f) => (f.length === 1 ? { r: root(0), step: `${v === 'x' ? 'x' : v} = 0` } : zeroOf(f, v)));
}
const factoredText = (factors, v) => factors.map((f) => (f.length === 1 ? pretty(f, v) : `(${pretty(f, v)})`)).join('');

function byFactoring(rng) {
  const v = rng.pick(LETTERS);
  const { factors, how } = factorable(rng);
  const poly = times(...factors);
  const src = `${write(poly, v)} = 0`;
  const steps = rootsOf(factors, v);
  return {
    prompt: solve(src),
    text: `quadratic: ${src}`,
    answer: answerOf(v, steps.map((s) => s.r)),
    visual: null,
    explain: `Factor the left side (${how.replace(/x/g, v)}): ${factoredText(factors, v)} = 0. `
      + `Then each factor to 0: ${steps.map((s) => s.step).join('; ')}. So ${said(v, steps.map((s) => s.r))}.`,
  };
}

function rearrange(rng) {
  const v = rng.pick(LETTERS);
  const p = rng.nonZero(-9, 9), q = rng.nonZero(-9, 9);
  if (p === q) return rearrange(rng);
  const factors = [linear(1, p), linear(1, q)];
  const poly = times(...factors);
  if (poly.length !== 3) return rearrange(rng);
  const shape = rng.pick(['product', 'product', 'moved', 'moved', 'both']);
  let left, right, warn = '';
  if (shape === 'product') {
    // x(x + k) = m: the trap is to set each factor to m.
    const k = poly[1][0], m = -poly[2][0];
    left = `${v}(${write(linear(1, k), v)})`;
    right = [[m, 0]];
    warn = ` Not ${v} = ${minus(m)} or ${pretty(linear(1, k), v)} = ${minus(m)}: endless pairs of numbers multiply to ${minus(m)}, `
      + 'but a product is 0 only when a factor is, so splitting into factors works only for 0.';
  } else {
    // Some of the polynomial's terms moved to the right-hand side.
    const keep = shape === 'both' ? [poly[0]] : poly.slice(0, 2);
    const moved = minusPoly(keep, poly);
    if (!moved.length) return rearrange(rng);
    left = write(keep, v);
    right = moved;
  }
  const src = `${left} = ${write(right, v)}`;
  const steps = rootsOf(factors, v);
  return {
    prompt: solve(src),
    text: `quadratic: ${src}`,
    answer: answerOf(v, steps.map((s) => s.r)),
    visual: null,
    explain: `Everything to one side first: ${pretty(poly, v)} = 0.${warn} Factor: ${factoredText(factors, v)} = 0. `
      + `Each factor to 0: ${steps.map((s) => s.step).join('; ')}. So ${said(v, steps.map((s) => s.r))}.`,
  };
}

function squareRoots(rng) {
  const v = rng.pick(LETTERS);
  const shape = rng.pick(['plain', 'plain', 'scaled', 'shifted', 'shifted', 'none', 'one']);
  let src, roots, how;
  if (shape === 'plain') {
    const r = rng.int(1, 15), c = rng.chance(0.5);
    src = c ? `${v}^2 - ${r * r} = 0` : `${v}^2 = ${r * r}`;
    roots = [root(r), root(-r)];
    how = `${c ? `${v}² = ${r * r}. ` : ''}Root both sides, and keep both roots: ${r}² and (−${r})² are both ${r * r}`;
  } else if (shape === 'scaled') {
    const a = rng.int(2, 6), r = rng.int(1, 10), k = rng.pick([0, rng.int(1, 20)]);
    src = `${a}${v}^2${k ? ` + ${k}` : ''} = ${a * r * r + k}`;
    roots = [root(r), root(-r)];
    how = `${k ? `Take away ${k}: ${a}${v}² = ${a * r * r}. ` : ''}Divide by ${a}: ${v}² = ${r * r}. Root both sides, both signs`;
  } else if (shape === 'shifted') {
    const h = rng.nonZero(-9, 9), r = rng.int(1, 10);
    src = `(${write(linear(1, -h), v)})^2 = ${r * r}`;
    roots = [root(h + r), root(h - r)];
    how = `Root both sides: ${pretty(linear(1, -h), v)} = ${r} or ${pretty(linear(1, -h), v)} = −${r}. `
      + `Then ${h > 0 ? `add ${h}` : `take away ${-h}`}`;
  } else if (shape === 'one') {
    const h = rng.nonZero(-9, 9);
    src = `(${write(linear(1, -h), v)})^2 = 0`;
    roots = [root(h)];
    how = `Only 0 squares to 0, so ${pretty(linear(1, -h), v)} = 0: one solution`;
  } else {
    const k = rng.chance(0.5) ? rng.int(1, 12) ** 2 : rng.int(1, 50);
    src = rng.chance(0.5) ? `${v}^2 + ${k} = 0` : `${v}^2 = -${k}`;
    roots = [];
    how = `${v}² = −${k}, but no number squared is negative`;
  }
  return {
    prompt: solve(src),
    text: `quadratic: ${src}`,
    answer: answerOf(v, roots),
    visual: null,
    explain: `${how}. So ${roots.length ? said(v, roots) : 'no solution'}.`,
  };
}

const METHODS = [
  { id: 'roots', label: 'Take square roots' },
  { id: 'factor', label: 'Factor it' },
  { id: 'neither', label: 'Neither works yet' },
];

function whichMethod(rng, again = null) {
  const v = rng.pick(LETTERS);
  // A rejected draw is drawn again as the same method, so each is as common.
  const id = again ?? rng.pick(METHODS).id;
  let src, why;
  if (id === 'roots') {
    const shape = rng.pick(['plain', 'shifted', 'squares']);
    if (shape === 'shifted') {
      const h = rng.nonZero(-9, 9), k = rng.int(2, 40);
      src = `(${write(linear(1, -h), v)})^2 = ${k}`;
      why = 'A square equal to a number: root both sides, and nothing needs multiplying out.';
    } else if (shape === 'squares') {
      const r = rng.int(2, 12);
      src = `${v}^2 - ${r * r} = 0`;
      why = `There is no term in ${v}, so it is ${v}² = ${r * r}: square roots in one step. It factors too, but that is the long way.`;
    } else {
      const a = rng.int(1, 5), k = rng.int(2, 60);
      src = `${a === 1 ? '' : a}${v}^2 = ${k}`;
      why = `No term in ${v}: get ${v}² alone and root both sides.`;
    }
  } else {
    // One that factors is built from its roots, so the two pools are alike in size.
    let b, c;
    if (id === 'factor') {
      const p = rng.nonZero(-12, 12), q = rng.nonZero(-12, 12);
      [b, c] = [p + q, p * q];
    } else {
      [b, c] = [rng.nonZero(-12, 12), rng.nonZero(-30, 30)];
      if (isSquare(b * b - 4 * c)) return whichMethod(rng, id);
    }
    if (b === 0 || c === 0 || Math.abs(c) > 60) return whichMethod(rng, id);
    const poly = [[1, 2], [b, 1], [c, 0]];
    src = `${write(poly, v)} = 0`;
    why = id === 'factor'
      ? `There is a term in ${v}, so square roots will not do it directly, but two whole numbers multiply to ${minus(c)} and add to ${minus(b)}.`
      : `There is a term in ${v}, and no two whole numbers multiply to ${minus(c)} and add to ${minus(b)}. `
        + 'It needs completing the square or the quadratic formula.';
  }
  return {
    prompt: [...solve(src).slice(0, -1), T.prose('— which way is quickest?')],
    text: `method: ${src}`,
    answer: { type: 'choice', value: id, options: METHODS },
    visual: null,
    explain: why,
  };
}

const CONTENT = [zeroProduct, byFactoring, rearrange, squareRoots, whichMethod];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
