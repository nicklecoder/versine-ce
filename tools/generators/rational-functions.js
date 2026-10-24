/**
 * Catalogue authoring tool: builds the problem library for rational-functions.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 *
 * Every `text` carries f as "TOP over BOTTOM" in the ASCII the expression
 * box reads, so scripts/check-answers.py can read both polynomials, find
 * the bottom's zeros and how often each divides the top, and evaluate f far
 * out, by its own route rather than this file's.
 */
import * as T from '../terms.js';
import { minus } from '../../web/ui/dom.js';
import { previewOf } from '../../web/ui/express.js';
import { normalize, formatSet } from '../../web/math/solutions.js';
import { reduce } from './chance.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/rational-functions.js';

const optionIds = ['a', 'b', 'c', 'd'];
const SUP = { 2: '²', 3: '³', 4: '⁴' };

/** A polynomial, coefficients from x^0 up, written out: 2x² - 3x + 1. */
function write(c, fancy = false) {
  const out = [];
  for (let p = c.length - 1; p >= 0; p -= 1) {
    const a = c[p];
    if (!a) continue;
    const letter = p === 0 ? '' : p === 1 ? 'x' : fancy ? `x${SUP[p]}` : `x^${p}`;
    const body = `${Math.abs(a) === 1 && letter ? '' : Math.abs(a)}${letter}`;
    if (!out.length) out.push(a < 0 ? `${fancy ? '−' : '-'}${body}` : body);
    else out.push(`${a < 0 ? (fancy ? ' − ' : ' - ') : ' + '}${body}`);
  }
  return out.length ? out.join('') : '0';
}
const mul = (a, b) => {
  const o = Array(a.length + b.length - 1).fill(0);
  a.forEach((x, i) => b.forEach((y, j) => { o[i + j] += x * y; }));
  return o;
};
const add = (a, b) => Array.from({ length: Math.max(a.length, b.length) }, (_, i) => (a[i] ?? 0) + (b[i] ?? 0));
/** x − r. */
const X = (r) => [-r, 1];
const prod = (rs, k = 1) => rs.reduce((acc, r) => mul(acc, X(r)), [k]);
const fac = (r, fancy = false) => (r === 0 ? 'x' : `(${write(X(r), fancy)})`);
/** k(x − r)(x − s), factored. */
function factored(rs, k = 1, fancy = false) {
  if (!rs.length) return fancy ? minus(k) : String(k);
  const lead = k === 1 ? '' : k === -1 ? (fancy ? '−' : '-') : fancy ? minus(k) : String(k);
  const body = rs.map((r) => fac(r, fancy)).join('');
  return `${lead}${body}`;
}
/** One polynomial: its coefficients and how the question writes it. */
const poly = (rs, k, asFactors) => {
  const c = prod(rs, k);
  return { c, text: asFactors ? factored(rs, k) : write(c), show: asFactors ? factored(rs, k, true) : write(c, true) };
};
const random = (deg, lead, rng) => {
  const c = Array.from({ length: deg + 1 }, (_, i) => (i === deg ? lead : rng.int(-9, 9)));
  if (deg > 0 && c[0] === 0) c[0] = rng.nonZero(-9, 9);
  return { c, text: write(c), show: write(c, true) };
};
const qOf = (n, d) => { const r = reduce(n, d); return r.d < 0 ? { n: -r.n, d: -r.d } : r; };
const qText = ({ n, d }) => (d === 1 ? String(n) : `${n}/${d}`);
/** The same, with a true minus sign, for the student to read. */
const qShow = (q) => qText(q).replace('-', '−');

/** f(x) = the fraction, drawn as the expression box draws it, then the question. */
function ask(top, bottom, question) {
  const wrap = (s) => (/^(-?\d+|x|\([^()]*\))$/.test(s) ? s : `(${s})`);
  const src = `${wrap(top.text)}/${wrap(bottom.text)}`;
  const drawn = previewOf(src);
  if (!drawn.ok) throw new Error(`rational-functions: cannot draw ${src}: ${drawn.error}`);
  return [T.prose('f(x) ='), ...drawn.terms, T.prose(question)];
}
const over = (top, bottom) => `${top.text} over ${bottom.text}`;

function choice(prompt, head, opts, explain) {
  // opts[0] is the key; each is [body, label].
  if (new Set(opts.map(([, l]) => l)).size !== opts.length || new Set(opts.map(([b]) => b)).size !== opts.length) return null;
  return (rng) => {
    const order = rng.shuffle([0, 1, 2, 3]);
    return {
      prompt,
      text: `${head}; options ${order.map((j, i) => `${optionIds[i]}: ${opts[j][0]}`).join(' | ')}`,
      answer: { type: 'choice', value: optionIds[order.indexOf(0)], options: order.map((j, i) => ({ id: optionIds[i], label: opts[j][1] })) },
      visual: null,
      explain,
    };
  };
}

// --- Vertical Asymptotes ---------------------------------------------------

const setOf = (xs) => {
  const parts = [...new Set(xs)].sort((p, q) => p - q).map((x) => ({ lo: { n: x, d: 1 }, loIn: true, hi: { n: x, d: 1 }, hiIn: true }));
  return { type: 'solutions', value: { letter: 'x', parts: normalize(parts) } };
};
const list = (xs) => [...xs].sort((p, q) => p - q).map((x) => `x = ${minus(x)}`).join(' or ');

// requiem: catalogue/content/asymptote-or-hole-by-multiplicity
function vertical(rng) {
  for (;;) {
    const kind = rng.pick(['two', 'two', 'cancel', 'cancel', 'single', 'none']);
    const a = rng.int(-7, 7), b = rng.int(-7, 7), n = rng.int(-7, 7);
    if (new Set([a, b, n]).size < 3) continue;
    const asF = rng.chance(0.5);
    let top, bottom, vas, why;
    if (kind === 'two') {
      top = rng.chance(0.3) ? poly([], rng.pick([1, 2, 3, 5, -4]), true) : poly([n], 1, true);
      bottom = poly([a, b], 1, asF);
      vas = [a, b];
      why = `${asF ? '' : `The bottom factors as ${factored([a, b], 1, true)}. `}It is 0 at x = ${minus(a)} and x = ${minus(b)}, and the top is not 0 at either, so both are vertical asymptotes.`;
    } else if (kind === 'cancel') {
      top = poly([a, n], 1, asF);
      bottom = poly([a, b], 1, asF);
      vas = [b];
      why = `${asF ? '' : `Factor both: the top is ${factored([a, n], 1, true)} and the bottom ${factored([a, b], 1, true)}. `}`
        + `The bottom is 0 at x = ${minus(a)} and x = ${minus(b)}, but ${fac(a, true)} is a factor of the top too, so it cancels: x = ${minus(a)} is a hole, not an asymptote. Only x = ${minus(b)} is left.`;
    } else if (kind === 'single') {
      top = rng.chance(0.5) ? poly([], rng.nonZero(-6, 6), true) : poly([n], rng.pick([1, 2, 3]), true);
      bottom = poly([a], rng.pick([1, 1, 2]), true);
      vas = [a];
      why = `The bottom is 0 only at x = ${minus(a)}, where the top is not, so that is the one vertical asymptote.`;
    } else if (rng.chance(0.5)) {
      const m = rng.int(1, 9);
      top = rng.chance(0.5) ? poly([], rng.nonZero(-6, 6), true) : poly([n], 1, true);
      bottom = { c: [m, 0, 1], text: `x^2 + ${m}`, show: `x² + ${m}` };
      vas = [];
      why = `x² + ${m} is never 0, since x² is never negative, so the bottom has no zeros and the graph has no vertical asymptote.`;
    } else {
      top = poly([a, n], 1, asF);
      bottom = poly([a], 1, true);
      vas = [];
      why = `${asF ? '' : `The top factors as ${factored([a, n], 1, true)}. `}The bottom's only zero is x = ${minus(a)}, and ${fac(a, true)} cancels with the top, so x = ${minus(a)} is a hole. No vertical asymptote is left: f is the line ${write(X(n), true)} with one point missing.`;
    }
    return {
      prompt: ask(top, bottom, '. Find every vertical asymptote, as x = …, or say there is none.'),
      text: `vertical asymptotes: ${over(top, bottom)}`,
      answer: setOf(vas),
      visual: null,
      explain: `${why} So ${vas.length ? list(vas) : 'there is none'}.`,
    };
  }
}

// --- Horizontal by Degree --------------------------------------------------

const DEGREES = [[0, 1], [1, 2], [0, 2], [2, 3], [1, 1], [1, 1], [2, 2], [2, 2], [3, 3], [2, 1], [3, 2], [3, 1]];
const LEADS = [1, 2, 3, 4, 5, 6, -1, -2, -3];

function degrees(rng) {
  const [n, d] = rng.pick(DEGREES);
  const top = random(n, rng.pick(LEADS), rng), bottom = random(d, rng.pick(LEADS.filter((v) => v > 0 || rng.chance(0.3))), rng);
  return { n, d, top, bottom, a: top.c[n], b: bottom.c[d] };
}
const yIs = (q) => [`y = ${qText(q)}`, `y = ${qShow((q))}`];
const NONE_H = ['none', 'No horizontal asymptote'];

function horizontal(rng) {
  for (;;) {
    const { n, d, top, bottom, a, b } = degrees(rng);
    const ratio = qOf(a, b);
    const key = n < d ? yIs({ n: 0, d: 1 }) : n === d ? yIs(ratio) : NONE_H;
    const pool = [yIs({ n: 0, d: 1 }), yIs(ratio), NONE_H, yIs(qOf(top.c[0], bottom.c[0] || 1)), yIs(qOf(b, a)), yIs({ n: a, d: 1 })]
      .filter(([body]) => body !== key[0]);
    const seen = new Set([key[0]]), decoys = [];
    for (const o of pool) if (!seen.has(o[0]) && decoys.length < 3) { seen.add(o[0]); decoys.push(o); }
    if (decoys.length < 3) continue;
    const explain = `Compare the degrees: the top has degree ${n} and the bottom ${d}. `
      + (n < d ? 'The bottom grows faster, so f falls towards 0 far out: the asymptote is y = 0.'
        : n === d ? `They match, so far out f is close to the ratio of the leading coefficients, ${minus(a)}/${minus(b)} = ${qShow((ratio))}: the asymptote is y = ${qShow((ratio))}.`
          : 'The top grows faster, so f does not level off: there is no horizontal asymptote.')
      + (n === d ? ' The constant terms do not decide it: they matter only near x = 0.' : '');
    const make = choice(ask(top, bottom, '. What is its horizontal asymptote?'), `horizontal asymptote: ${over(top, bottom)}`, [key, ...decoys], explain);
    if (make) return make(rng);
  }
}

// --- Holes -----------------------------------------------------------------

function holes(rng) {
  for (;;) {
    const kind = rng.pick(['both', 'both', 'line', 'number']);
    const a = rng.int(-7, 7), p = rng.int(-7, 7), q = rng.int(-7, 7);
    const asF = rng.chance(0.5);
    let top, bottom, y, left;
    if (kind === 'both') {
      if (new Set([a, p, q]).size < 3) continue;
      top = poly([a, p], 1, asF); bottom = poly([a, q], 1, asF);
      y = qOf(a - p, a - q);
      left = `${fac(p, true)}/${fac(q, true)}`;
    } else if (kind === 'line') {
      if (a === p) continue;
      top = poly([a, p], 1, asF); bottom = poly([a], 1, true);
      y = qOf(a - p, 1);
      left = write(X(p), true);
    } else {
      const k = rng.nonZero(-6, 6);
      if (a === q) continue;
      top = poly([a], k, true); bottom = poly([a, q], 1, asF);
      y = qOf(k, a - q);
      left = `${minus(k)}/${fac(q, true)}`;
    }
    const yShow = qShow((y));
    return {
      prompt: ask(top, bottom, '. Its graph has a hole. Give the point (x, y) where it is.'),
      text: `hole: ${over(top, bottom)}`,
      answer: { type: 'pair', value: { x: { n: a, d: 1 }, y } },
      visual: null,
      explain: `${asF || kind === 'number' ? '' : 'Factor first. '}The top and the bottom share the factor ${fac(a, true)}, so it cancels, leaving ${left}, `
        + `but f is still undefined at x = ${minus(a)}. The hole is at that x, at the height the cancelled form gives there: ${yShow}. So the hole is (${minus(a)}, ${yShow}).`,
    };
  }
}

// --- Oblique ---------------------------------------------------------------

const line = (m, b) => [`y = ${write([b, m])}`, `y = ${write([b, m], true)}`];

function oblique(rng) {
  for (;;) {
    const m = rng.pick([1, 1, 2, 3, -1, -2]), b = rng.int(-8, 8), r = rng.nonZero(-9, 9), c = rng.nonZero(-6, 6);
    const bottom = poly([c], 1, true);
    const top = { c: add(mul(X(c), [b, m]), [r]) };
    top.text = write(top.c); top.show = write(top.c, true);
    if (top.c.some((v) => Math.abs(v) > 40)) continue;
    // Dividing by x + c instead of x − c, a slip of the sign in synthetic division.
    const slip = top.c[1] + top.c[2] * -c;
    const opts = [line(m, b), line(m, slip), line(m, 0), line(m, b + r)];
    const make = choice(ask(top, bottom, '. What is its slant (oblique) asymptote?'), `oblique asymptote: ${over(top, bottom)}`, opts,
      `The top's degree is one more than the bottom's, so divide: ${top.show} = ${fac(c, true)}(${write([b, m], true)}) ${r < 0 ? '−' : '+'} ${Math.abs(r)}. `
      + `So f(x) = ${write([b, m], true)} ${r < 0 ? '−' : '+'} ${Math.abs(r)}/${fac(c, true)}, and the fraction shrinks to 0 as x grows either way: f follows the line ${line(m, b)[1]}.`);
    if (make) return make(rng);
  }
}

// --- End Behavior ----------------------------------------------------------

/** The leading term a·xⁿ, written out. */
const term = (a, n) => (n === 0 ? minus(a) : `${a === 1 ? '' : a === -1 ? '−' : minus(a)}x${n > 1 ? SUP[n] : ''}`);

function ends(rng) {
  for (;;) {
    const { n, d, top, bottom, a, b } = degrees(rng);
    const right = rng.chance(0.6);
    const ratio = qOf(a, b);
    let key;
    if (n < d) key = ['0', '0'];
    else if (n === d) key = [qText(ratio), qShow((ratio))];
    else {
      const up = (a / b > 0) === (right || (n - d) % 2 === 0);
      key = up ? ['inf', '∞'] : ['-inf', '−∞'];
    }
    const all = [['0', '0'], [qText(ratio), qShow((ratio))], ['inf', '∞'], ['-inf', '−∞']];
    const opts = [key, ...all.filter(([body]) => body !== key[0])];
    if (opts.length !== 4) continue;
    const dir = right ? '∞' : '−∞';
    const lead = `${qShow((ratio)) === '1' ? '' : qShow((ratio)) === '−1' ? '−' : `(${qShow((ratio))})`}`;
    const like = n - d === 0 ? qShow((ratio)) : n - d > 0 ? `${lead}x${n - d > 1 ? SUP[n - d] : ''}` : `${qShow((ratio))}/x${d - n > 1 ? SUP[d - n] : ''}`;
    const explain = `Far out only the leading terms matter: f(x) behaves like ${term(a, n)} over ${term(b, d)}, which is ${like}. `
      + (n < d ? `As x → ${dir} that shrinks to 0.`
        : n === d ? `That is a number, so f levels off at ${qShow((ratio))}.`
          : `As x → ${dir}, x${n - d > 1 ? SUP[n - d] : ''} is ${right || (n - d) % 2 === 0 ? 'large and positive' : 'large and negative'}, so f heads to ${key[1]}.`);
    const make = choice(ask(top, bottom, `. As x → ${dir}, what does f(x) approach?`), `end behavior: ${over(top, bottom)}; x to ${right ? 'inf' : '-inf'}`, opts, explain);
    if (make) return make(rng);
  }
}

const CONTENT = [vertical, horizontal, holes, oblique, ends];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
