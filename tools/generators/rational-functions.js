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
 * out, by its own route rather than this file's. A drawn graph's `text`
 * lists what the picture shows -- where it crosses, its hole, where it
 * breaks and which way it goes there, and where it levels off -- and the
 * checker holds the drawing to the formula it picks from those readings.
 */
import * as T from '../terms.js';
import { minus } from '../../web/ui/dom.js';
import { previewOf } from '../../web/ui/express.js';
import { normalize, formatSet } from '../../web/math/solutions.js';
import { reduce } from './chance.js';
import { LINE, ASKED } from './figures.js';
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
/** x − r. */
const X = (r) => [-r, 1];
const prod = (rs, k = 1) => rs.reduce((acc, r) => mul(acc, X(r)), [k]);
const fac = (r, fancy = false) => (r === 0 ? 'x' : `(${write(X(r), fancy)})`);
/** k(x − r)(x − s)², factored: a repeated zero is written once, with its power. */
function factored(rs, k = 1, fancy = false) {
  if (!rs.length) return fancy ? minus(k) : String(k);
  const lead = k === 1 ? '' : k === -1 ? (fancy ? '−' : '-') : fancy ? minus(k) : String(k);
  const seen = [];
  for (const r of rs) {
    const f = seen.find((e) => e.r === r);
    if (f) f.m += 1; else seen.push({ r, m: 1 });
  }
  // A bare x goes first: x(x − 2), not (x − 2)x.
  seen.sort((p, q) => (p.r === 0 ? -1 : q.r === 0 ? 1 : 0));
  const body = seen.map(({ r, m }) => `${fac(r, fancy)}${m > 1 ? (fancy ? SUP[m] : `^${m}`) : ''}`).join('');
  return `${lead}${body}`;
}
const gcd = (a, b) => (b === 0 ? Math.abs(a) : gcd(b, a % b));
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
    const kind = rng.pick(['two', 'two', 'cancel', 'cancel', 'single', 'none', 'repeat', 'repeat']);
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
      // No number shared by the top and the bottom: 2(x − 5)/(2(x − 3)) is (x − 5)/(x − 3) unfinished.
      const kt = rng.chance(0.5) ? rng.nonZero(-6, 6) : rng.pick([1, 2, 3]), kb = rng.pick([1, 1, 2]);
      if (gcd(kt, kb) !== 1) continue;
      top = rng.chance(0.5) ? poly([n], kt, true) : poly([], kt, true);
      bottom = poly([a], kb, true);
      vas = [a];
      why = `The bottom is 0 only at x = ${minus(a)}, where the top is not, so that is the one vertical asymptote.`;
    } else if (kind === 'repeat') {
      // A repeated zero of the bottom: an asymptote unless the top has it as often.
      const way = rng.pick(['once', 'square', 'more', 'left']);
      const said = asF ? '' : `The bottom is a perfect square, ${factored([a, a], 1, true)}. `;
      if (way === 'once') {
        top = poly([a], 1, true); bottom = poly([a, a], 1, asF); vas = [a];
        why = `${said}${fac(a, true)} is on the top once and on the bottom twice. One cancels, but one is left on the bottom, so x = ${minus(a)} still makes the bottom 0 where the top is not: an asymptote, not a hole.`;
      } else if (way === 'square') {
        top = rng.chance(0.4) ? poly([], rng.pick([1, 3, -2, 5]), true) : poly([n], 1, true);
        bottom = poly([a, a], 1, asF); vas = [a];
        why = `${said}It is 0 only at x = ${minus(a)}, and the top is not 0 there, so that is a vertical asymptote. The square makes it a zero twice over, but it is still one line.`;
      } else if (way === 'more') {
        top = poly([a, a], 1, true); bottom = poly([a, b], 1, asF); vas = [b];
        why = `${asF ? '' : `The bottom factors as ${factored([a, b], 1, true)}. `}${fac(a, true)} is on the top twice and on the bottom once, so it cancels from the bottom completely: x = ${minus(a)} is a hole. Only x = ${minus(b)} is left.`;
      } else {
        top = poly([a], 1, true); bottom = poly([a, a, b], 1, true); vas = [a, b];
        why = `${fac(a, true)} cancels once, but the bottom has it twice, so one is left: x = ${minus(a)} is still an asymptote, and so is x = ${minus(b)}.`;
      }
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
      // requiem: catalogue/content/none-offered-on-every-row
      prompt: ask(top, bottom, '. Find every vertical asymptote, as x = …, or none if there is none.'),
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
/** a/b, then its lowest terms only when that says something: 3/5, 6/4 = 3/2, −6/1 = −6. */
const ratioWork = (a, b, q) => {
  const over = `${minus(a)}/${b < 0 ? `(${minus(b)})` : b}`;
  return q.n === a && q.d === b && b !== 1 ? over : `${over} = ${qShow(q)}`;
};

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
        : n === d ? `They match, so far out f is close to the ratio of the leading coefficients, ${ratioWork(a, b, ratio)}: the asymptote is y = ${qShow(ratio)}.`
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

/** The quotient and remainder of P (from x^0 up) divided by x − c, synthetically. */
function divide(P, c) {
  const top = [...P].reverse(), row = [top[0]];
  for (const v of top.slice(1)) row.push(v + c * row[row.length - 1]);
  return { q: row.slice(0, -1).reverse(), r: row[row.length - 1] };
}

// requiem: catalogue/content/decoys-crossed-not-centred
function oblique(rng) {
  for (;;) {
    // The top's numbers are drawn, not built from a small quotient: built, the
    // right line had the smallest numbers of the four and could be picked by size.
    const m = rng.pick([1, 1, 2, 3, -1, -2]), c = rng.nonZero(-6, 6);
    const bottom = poly([c], 1, true);
    const top = { c: [rng.int(-15, 15), rng.int(-12, 12), m] };
    top.text = write(top.c); top.show = write(top.c, true);
    const { q: [b], r } = divide(top.c, c);
    if (r === 0) continue;
    // Two slips, crossed: dividing by x + c instead of x − c, and keeping the
    // remainder as if it were part of the line. The four options are every
    // way of making neither, one or both, so no one of them sits in the
    // middle of the others for being the right one.
    const way = (sign, keep) => { const { q, r: left } = divide(top.c, sign * c); return line(q[1], q[0] + (keep ? left : 0)); };
    const opts = [way(1, false), way(-1, false), way(1, true), way(-1, true)];
    const make = choice(ask(top, bottom, '. What is its slant (oblique) asymptote?'), `oblique asymptote: ${over(top, bottom)}`, opts,
      `The top's degree is one more than the bottom's, so divide: ${top.show} = ${fac(c, true)}(${write([b, m], true)}) ${r < 0 ? '−' : '+'} ${Math.abs(r)}. `
      + `So f(x) = ${write([b, m], true)} ${r < 0 ? '−' : '+'} ${Math.abs(r)}/${fac(c, true)}, and the fraction shrinks to 0 as x grows either way, so the remainder is not part of the line: f follows ${line(m, b)[1]}.`);
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
    else if (n === d) key = [qText(ratio), qShow(ratio)];
    else {
      const up = (a / b > 0) === (right || (n - d) % 2 === 0);
      key = up ? ['inf', '∞'] : ['-inf', '−∞'];
    }
    const all = [['0', '0'], [qText(ratio), qShow(ratio)], ['inf', '∞'], ['-inf', '−∞']];
    const opts = [key, ...all.filter(([body]) => body !== key[0])];
    if (opts.length !== 4) continue;
    const dir = right ? '∞' : '−∞';
    // (a/b)x^(n − d) written as it would be by hand: 5x, (3/4)x², 1/(3x²), −3/(4x).
    const power = (k) => `x${k > 1 ? SUP[k] : ''}`;
    const lead = ratio.d !== 1 ? `(${qShow(ratio)})` : ratio.n === 1 ? '' : ratio.n === -1 ? '−' : minus(ratio.n);
    const like = n - d === 0 ? qShow(ratio) : n - d > 0 ? `${lead}${power(n - d)}`
      : ratio.d === 1 ? `${minus(ratio.n)}/${power(d - n)}` : `${minus(ratio.n)}/(${ratio.d}${power(d - n)})`;
    const explain = `Far out only the leading terms matter: f(x) behaves like ${term(a, n)} over ${term(b, d)}, which is ${like}. `
      + (n < d ? `As x → ${dir} that shrinks to 0.`
        : n === d ? `That is a number, so f levels off at ${qShow(ratio)}.`
          : `As x → ${dir}, x${n - d > 1 ? SUP[n - d] : ''} is ${right || (n - d) % 2 === 0 ? 'large and positive' : 'large and negative'}, so f heads to ${key[1]}.`);
    const make = choice(ask(top, bottom, `. As x → ${dir}, what does f(x) approach?`), `end behavior: ${over(top, bottom)}; x to ${right ? 'inf' : '-inf'}`, opts, explain);
    if (make) return make(rng);
  }
}

// --- Intercepts ------------------------------------------------------------

/** "(0 − 3)(0 + 1)", the factors of rs at x = 0 written out. */
const atZero = (rs, k) => {
  const body = rs.map((r) => (r === 0 ? '0' : `(0 ${r < 0 ? '+' : '−'} ${Math.abs(r)})`)).join('');
  if (!rs.length) return minus(k);
  return `${k === 1 ? '' : k === -1 ? '−' : minus(k)}${body}`;
};

// requiem: catalogue/content/x-intercept-needs-the-domain
function intercepts(rng) {
  for (;;) {
    const kind = rng.pick(['x', 'x', 'x', 'y', 'y']);
    const way = rng.pick(['plain', 'plain', 'shared', 'shared', 'none']);
    const r = rng.int(-7, 7), s = rng.int(-7, 7), h = rng.int(-7, 7), v = rng.int(-7, 7);
    const k = rng.pick([1, 1, 2, -1, 3, -2]);
    const asF = rng.chance(0.5);
    let tops, bots, xs, why;
    if (way === 'plain') {
      // One or two zeros on top, none of them the bottom's.
      tops = rng.chance(0.5) ? [r] : [r, s];
      bots = rng.chance(0.5) ? [v] : [v, h];
      if (new Set([...tops, ...bots]).size !== tops.length + bots.length) continue;
      xs = tops;
      why = `The top is 0 at ${list(tops)}, and the bottom is not 0 at ${tops.length > 1 ? 'either' : 'it'}.`;
    } else if (way === 'shared') {
      // The trap: a zero of the top that the bottom shares is a hole, not an intercept.
      tops = [h, r]; bots = [h, v];
      if (new Set([h, r, v]).size !== 3) continue;
      xs = [r];
      why = `The top is 0 at x = ${minus(h)} and x = ${minus(r)}, but x = ${minus(h)} makes the bottom 0 too: ${fac(h, true)} cancels, and x = ${minus(h)} is a hole, where f has no value at all. Only x = ${minus(r)} is left.`;
    } else {
      tops = rng.chance(0.5) ? [] : [h]; bots = tops.length ? [h, v] : [v];
      if (h === v) continue;
      xs = [];
      why = tops.length
        ? `The top is 0 only at x = ${minus(h)}, which makes the bottom 0 too: ${fac(h, true)} cancels and leaves a hole there, not an intercept. f is ${minus(k)}/${fac(v, true)} everywhere else, never 0.`
        : `The top is the number ${minus(k)}, never 0, so f is never 0.`;
    }
    const top = poly(tops, k, asF || tops.length < 2), bottom = poly(bots, 1, asF || bots.length < 2);
    const wrap = (t) => (/^(-?\d+|x|\([^()]*\))$/.test(t) ? t : `(${t})`);
    const facts = asF || (tops.length < 2 && bots.length < 2) ? ''
      : `Factor first: f(x) = ${factored(tops, k, true)}/${wrap(factored(bots, 1, true))}. `;
    if (kind === 'x') {
      return {
        // requiem: catalogue/content/none-offered-on-every-row
        prompt: ask(top, bottom, '. Find every x-intercept, as x = …, or none if there is none.'),
        text: `x-intercepts: ${over(top, bottom)}`,
        answer: setOf(xs),
        visual: null,
        explain: `An x-intercept is where f(x) = 0: the top is 0 there and the bottom is not. ${facts}${why} So ${xs.length ? list(xs) : 'there is none'}.`,
      };
    }
    if (bots.includes(0)) continue;
    const t0 = prod(tops, k)[0], b0 = prod(bots, 1)[0];
    const y = qOf(t0, b0);
    return {
      prompt: ask(top, bottom, '. Give its y-intercept as a point (x, y).'),
      text: `y-intercept: ${over(top, bottom)}`,
      answer: { type: 'pair', value: { x: { n: 0, d: 1 }, y } },
      visual: null,
      explain: `The y-intercept is where x = 0, and 0 is not an excluded value here, since the bottom is ${minus(b0)} there. `
        + `${facts}Put x = 0 in: the top is ${atZero(tops, k)} = ${minus(t0)} and the bottom ${atZero(bots, 1)} = ${minus(b0)}, `
        + `so f(0) = ${minus(t0)}/${b0 < 0 ? `(${minus(b0)})` : b0}${y.d === b0 && y.n === t0 ? '' : ` = ${qShow(y)}`}. So the y-intercept is (0, ${qShow(y)}).`,
    };
  }
}

// --- Match the Graph -------------------------------------------------------

/*
 * f = k · (top zeros)(x − h) / ((bottom zeros)(x − h)): a hole at h when h is
 * not null. { k, zs, ps, h }
 */
/** Factors in order, a bare x first: x(x − 2), not (x − 2)x. */
const xFirst = (p, q) => (p === 0 ? -1 : q === 0 ? 1 : p - q);
const sides = (F) => ({ tops: [...F.zs, ...(F.h === null ? [] : [F.h])].sort(xFirst),
  bots: [...F.ps, ...(F.h === null ? [] : [F.h])].sort(xFirst) });
const valueAt = (F, x) => {
  const { tops, bots } = sides(F);
  return F.k * tops.reduce((acc, r) => acc * (x - r), 1) / bots.reduce((acc, r) => acc * (x - r), 1);
};
/** f with the hole's factor cancelled, which gives the hole its height. */
const cancelled = (F, x) => F.k * F.zs.reduce((acc, r) => acc * (x - r), 1) / F.ps.reduce((acc, r) => acc * (x - r), 1);
const levelOf = (F) => (F.zs.length === F.ps.length ? F.k : 0);
const way = (y) => (y > 0 ? 'up' : 'down');
/** Which way f goes just left and just right of each asymptote. */
const turns = (F) => [...F.ps].sort((p, q) => p - q).map((v) => [v, way(cancelled(F, v - 1e-6)), way(cancelled(F, v + 1e-6))]);
const features = (F) => JSON.stringify([[...F.zs].sort((p, q) => p - q), F.h, turns(F), levelOf(F)]);
const holeHeight = (F) => {
  const { zs, ps, k, h } = F;
  return qOf(k * zs.reduce((acc, r) => acc * (h - r), 1), ps.reduce((acc, r) => acc * (h - r), 1));
};
function formula(F) {
  const { tops, bots } = sides(F);
  const top = poly(tops, F.k, true), bottom = poly(bots, 1, true);
  const wrap = (t) => (/^(-?\d+|x|\([^()]*\))$/.test(t) ? t : `(${t})`);
  return [`${top.text} over ${bottom.text}`, `${top.show}/${wrap(bottom.show)}`];
}
const listOr = (xs) => xs.map(minus).join(' and ');
/** One thing a wrong formula's graph would do that this one does not. */
function differs(K, D) {
  const zk = JSON.stringify([...K.zs].sort((p, q) => p - q)), zd = JSON.stringify([...D.zs].sort((p, q) => p - q));
  if (zk !== zd) return D.zs.length ? `would cross the x-axis at ${listOr([...D.zs].sort((p, q) => p - q))}` : 'would never cross the x-axis';
  if (JSON.stringify([...K.ps].sort()) !== JSON.stringify([...D.ps].sort())) return `would break at x = ${listOr([...D.ps].sort((p, q) => p - q))}`;
  if (K.h !== D.h) return D.h === null ? 'would have no hole' : `would have its hole at x = ${minus(D.h)}`;
  if (levelOf(K) !== levelOf(D)) return `would level off at y = ${minus(levelOf(D))}`;
  return 'would go the other way at its asymptote';
}

/**
 * The plane: x from three left of the leftmost feature to three right of
 * the rightmost, y as far as the level and the hole need. Each stretch of
 * the curve is cut where it leaves the window or meets the hole, found by
 * bisection, so no line is drawn across an asymptote.
 */
// requiem: catalogue/visuals/curves-split-at-window
function graph(F) {
  const xs = [...F.zs, ...F.ps, ...(F.h === null ? [] : [F.h])];
  const x0 = Math.min(...xs) - 3, x1 = Math.max(...xs) + 3;
  const Y = Math.max(5, Math.abs(F.k) + 3);
  const f = (x) => valueAt(F, x);
  const inside = (y) => Number.isFinite(y) && Math.abs(y) <= Y;
  const edge = (xIn, xOut) => {
    for (let i = 0; i < 40; i += 1) {
      const mid = (xIn + xOut) / 2;
      if (inside(f(mid))) xIn = mid; else xOut = mid;
    }
    return xIn;
  };
  const point = (x) => [+x.toFixed(3), +Math.max(-Y, Math.min(Y, f(x))).toFixed(3)];
  const runs = [];
  let run = [], prev = null;
  for (let i = 0; i <= (x1 - x0) * 20; i += 1) {
    const x = (x0 * 20 + i) / 20;
    const now = inside(f(x));
    if (now && prev !== null && !inside(f(prev))) run.push(point(edge(x, prev)));
    if (now) run.push(point(x));
    if (!now && prev !== null && inside(f(prev))) { run.push(point(edge(prev, x))); runs.push(run); run = []; }
    prev = x;
  }
  runs.push(run);
  const level = levelOf(F);
  const marks = [
    ...runs.filter((r) => r.length > 1).map((points) => ({ kind: 'path', points, tone: LINE })),
    ...F.zs.map((z) => ({ kind: 'point', at: [z, 0], tone: LINE, label: minus(z) })),
  ];
  const answer = [
    ...F.ps.map((v) => ({ kind: 'segment', from: [v, -Y], to: [v, Y], dashed: true, tone: ASKED, label: `x = ${minus(v)}` })),
    { kind: 'segment', from: [x0, level], to: [x1, level], dashed: true, tone: ASKED, label: `y = ${minus(level)}` },
  ];
  if (F.h !== null) {
    const y = holeHeight(F);
    marks.push({ kind: 'point', at: [F.h, +(y.n / y.d).toFixed(3)], open: true, tone: LINE });
    answer.push({ kind: 'point', at: [F.h, +(y.n / y.d).toFixed(3)], open: true, tone: ASKED, label: `hole (${minus(F.h)}, ${qShow(y)})` });
  }
  return { kind: 'plane', xRange: [x0, x1], yRange: [-Y, Y], grid: 1, marks, answer };
}

const SLIPS = {
  // The sign of the leading number turned over.
  flip: (F) => ({ ...F, k: -F.k }),
  // A zero of the top and a zero of the bottom traded places.
  swap: (F) => ({ ...F, zs: [F.ps[0], ...F.zs.slice(1)], ps: [F.zs[0], ...F.ps.slice(1)] }),
  // The asymptote's factor written x + v for x − v.
  mirror: (F) => ({ ...F, ps: [-F.ps[0], ...F.ps.slice(1)] }),
  // The hole and an asymptote traded: the other bottom factor cancels.
  hole: (F) => ({ ...F, h: F.ps[0], ps: [F.h, ...F.ps.slice(1)] }),
};

// requiem: catalogue/content/rational-graph-read-from-features
// requiem: catalogue/content/decoys-crossed-not-centred
function match(rng) {
  for (;;) {
    const shape = rng.pick(['level', 'level', 'level', 'zero', 'zero', 'two', 'two', 'two']);
    const k = rng.pick([1, 2, 3, -1, -2, -3]);
    const pickN = (n) => { const out = new Set(); while (out.size < n) out.add(rng.int(-4, 4)); return [...out]; };
    let F;
    if (shape === 'level') {
      const [r, v, h] = pickN(3);
      F = { k, zs: [r], ps: [v], h: rng.chance(0.5) ? h : null };
    } else if (shape === 'zero') {
      const [v, h] = pickN(2);
      F = { k, zs: [], ps: [v], h: rng.chance(0.7) ? h : null };
    } else {
      const [r, v, w] = pickN(3);
      F = { k, zs: [r], ps: [v, w], h: null };
    }
    // Every feature at least two apart, so the picture shows each one plainly.
    const xs = [...F.zs, ...F.ps, ...(F.h === null ? [] : [F.h])].sort((p, q) => p - q);
    if (xs.some((x, i) => i && x - xs[i - 1] < 2)) continue;
    if (F.h !== null) {
      const y = holeHeight(F);
      if (Math.abs(y.n / y.d) > Math.max(5, Math.abs(k) + 3) - 1) continue;
    }
    const can = ['flip'];
    if (F.zs.length) can.push('swap');
    if (F.ps[0] !== 0 && !xs.includes(-F.ps[0])) can.push('mirror');
    if (F.h !== null) can.push('hole');
    if (can.length < 2) continue;
    const [A, B] = rng.shuffle(can).slice(0, 2);
    // Neither slip, one, the other, or both: the four corners of a square, so
    // the right one is no nearer the middle of the others than any wrong one.
    const all = [F, SLIPS[A](F), SLIPS[B](F), SLIPS[B](SLIPS[A](F))];
    if (new Set(all.map(features)).size !== 4) continue;
    const opts = all.map(formula);
    const level = levelOf(F);
    const read = [
      F.zs.length ? `It crosses the x-axis at ${listOr(F.zs)}, so ${factored(F.zs, 1, true)} is on top.` : 'It never crosses the x-axis, so once anything shared has cancelled, the top is never 0.',
      `It breaks at x = ${listOr([...F.ps].sort((p, q) => p - q))}, shooting off the grid, so ${factored(F.ps, 1, true)} is on the bottom; `
        + `${turns(F).map(([v, l, r]) => `at x = ${minus(v)} it goes ${l} on the left and ${r} on the right`).join(', and ')}.`,
      F.h === null ? '' : `The open circle at x = ${minus(F.h)} is a hole: ${fac(F.h, true)} is on the top and the bottom, and cancels.`,
      level === 0 ? 'Far out it falls back to the x-axis, y = 0, so the bottom has the higher degree.'
        : `Far out it levels off at y = ${minus(level)}, so the top and the bottom have the same degree and the ratio of their leading coefficients is ${minus(F.k)}.`,
    ].filter(Boolean).join(' ');
    const others = all.slice(1).map((D) => `${formula(D)[1]} ${differs(F, D)}`).join('; ');
    const head = `match graph: zeros ${F.zs.length ? [...F.zs].sort((p, q) => p - q).join(', ') : 'none'}; holes ${F.h === null ? 'none' : F.h}; `
      + `asymptotes ${turns(F).map(([v, l, r]) => `x = ${v} (${l}, ${r})`).join(', ')}, y = ${level}`;
    const make = choice([T.prose('Which function has this graph?')], head, opts,
      `${read} That is ${opts[0][1]}. The others: ${others}.`);
    if (!make) continue;
    const out = make(rng);
    out.visual = graph(F);
    return out;
  }
}

const CONTENT = [vertical, horizontal, holes, oblique, ends, intercepts, match];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
