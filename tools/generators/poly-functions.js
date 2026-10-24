/**
 * Catalogue authoring tool: builds the problem library for poly-functions.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 *
 * A formula's `text` is P in the ASCII the expression box reads. A drawn
 * graph's `text` lists its heights at the whole numbers in view, which the
 * student reads off the labelled zeros and the grid, so
 * scripts/check-answers.py can rebuild P from those readings alone and ask
 * which option it is, or how often it turns.
 */
import * as T from '../terms.js';
import { minus } from '../../web/ui/dom.js';
import { previewOf } from '../../web/ui/express.js';
import { normalize, formatSet } from '../../web/math/solutions.js';
import { fracAnswer } from './chance.js';
import { tenths } from './trig.js';
import { LINE } from './figures.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/poly-functions.js';

const optionIds = ['a', 'b', 'c', 'd'];
const SUP = { 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶' };

/** A polynomial, coefficients from x^0 up, written out: 2x³ - 7x + 1. */
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
const X = (r) => [-r, 1];
const at = (c, x) => c.reduce((s, a, i) => s + a * x ** i, 0);

/*
 * A factored polynomial: a leading number k and zeros, each with its
 * multiplicity. { k, fs: [{ r, m }] }
 */
const coeffs = ({ k, fs }) => fs.reduce((acc, { r, m }) => {
  let out = acc;
  for (let i = 0; i < m; i += 1) out = mul(out, X(r));
  return out;
}, [k]);
const degree = ({ fs }) => fs.reduce((s, { m }) => s + m, 0);
const facOf = (r, fancy) => (r === 0 ? 'x' : `(x${r < 0 ? ` + ${-r}` : fancy ? ` − ${r}` : ` - ${r}`})`);
function factored(P, fancy = false) {
  const lead = P.k === 1 ? '' : P.k === -1 ? (fancy ? '−' : '-') : fancy ? minus(P.k) : String(P.k);
  const body = [...P.fs].sort((p, q) => (p.r === 0 ? -1 : q.r === 0 ? 1 : p.r - q.r))
    .map(({ r, m }) => `${facOf(r, fancy)}${m > 1 ? (fancy ? SUP[m] : `^${m}`) : ''}`).join('');
  return `${lead}${body}`;
}
/** Distinct zeros in a range, each with a multiplicity. */
function randomP(rng, { n = rng.pick([2, 3, 3]), lo = -6, hi = 6, mults = [1, 1, 2, 2, 3], maxDeg = 5, leads = [1, 1, -1, 2, -2, 3] } = {}) {
  for (;;) {
    const rs = new Set();
    while (rs.size < n) rs.add(rng.int(lo, hi));
    const fs = [...rs].map((r) => ({ r, m: rng.pick(mults) }));
    const P = { k: rng.pick(leads), fs };
    if (degree(P) <= maxDeg) return P;
  }
}

function drawn(src) {
  const r = previewOf(src);
  if (!r.ok) throw new Error(`poly-functions: cannot draw ${src}: ${r.error}`);
  return r.terms;
}

function choice(prompt, head, opts, explain, visual = null, shuffle = true) {
  if (new Set(opts.map(([, l]) => l)).size !== opts.length || new Set(opts.map(([b]) => b)).size !== opts.length) return null;
  return (rng) => {
    const order = shuffle ? rng.shuffle(opts.map((_, i) => i)) : opts.map((_, i) => i);
    return {
      prompt,
      text: `${head}; options ${order.map((j, i) => `${optionIds[i]}: ${opts[j][0]}`).join(' | ')}`,
      answer: { type: 'choice', value: optionIds[order.indexOf(0)], options: order.map((j, i) => ({ id: optionIds[i], label: opts[j][1] })) },
      visual,
      explain,
    };
  };
}

const setOf = (xs) => {
  const parts = [...new Set(xs)].sort((p, q) => p - q).map((x) => ({ lo: { n: x, d: 1 }, loIn: true, hi: { n: x, d: 1 }, hiIn: true }));
  return { type: 'solutions', value: { letter: 'x', parts: normalize(parts) } };
};
const ord = (m) => ({ 1: 'once', 2: 'twice', 3: 'three times' }[m]);
const times = (k) => ({ 0: 'no times', 1: 'once', 2: 'twice' }[k] ?? `${k} times`);
const byX = (fs) => [...fs].sort((p, q) => p.r - q.r);

// --- Zeros & Multiplicity --------------------------------------------------

// requiem: catalogue/content/poly-graph-read-from-heights
function zeros(rng) {
  for (;;) {
    const kind = rng.pick(['list', 'list', 'expanded', 'mult', 'touch', 'touch']);
    if (kind === 'expanded') {
      // x times a quadratic, multiplied out: take out the x first.
      const a = rng.nonZero(-6, 6), b = rng.nonZero(-6, 6), k = rng.pick([1, 1, 2, -1]);
      if (a === b && rng.chance(0.7)) continue;
      const P = { k, fs: a === b ? [{ r: 0, m: 1 }, { r: a, m: 2 }] : [{ r: 0, m: 1 }, { r: a, m: 1 }, { r: b, m: 1 }] };
      const c = coeffs(P);
      const xs = [0, a, b];
      return {
        prompt: [T.prose('P(x) ='), ...drawn(write(c)), T.prose('. Find every zero of P.')],
        text: `poly zeros: ${write(c)}`,
        answer: setOf(xs),
        visual: null,
        explain: `Every term has an x, so take it out: P(x) = ${k === 1 ? '' : k === -1 ? '−' : k}x(${write(coeffs({ k: 1, fs: P.fs.filter(({ r }) => r !== 0) }), true)}). `
          + `The bracket factors, so P(x) = ${factored(P, true)}. Each factor is 0 at one x. So ${formatSet(setOf(xs).value)}.`,
      };
    }
    const P = randomP(rng);
    const c = coeffs(P), src = factored(P), show = factored(P, true);
    if (c.some((v) => Math.abs(v) > 3000)) continue;
    const head = [T.prose('P(x) ='), ...drawn(src)];
    if (kind === 'list') {
      const xs = P.fs.map(({ r }) => r);
      return {
        prompt: [...head, T.prose('. Find every zero of P.')],
        text: `poly zeros: ${src}`,
        answer: setOf(xs),
        visual: null,
        explain: `A product is 0 when one of its factors is: ${byX(P.fs).map(({ r }) => `${facOf(r, true)} at x = ${minus(r)}`).join(', ')}. `
          + `A power does not add zeros, only repeats one. So ${formatSet(setOf(xs).value)}.`,
      };
    }
    if (kind === 'mult') {
      const { r, m } = rng.pick(P.fs);
      return {
        prompt: [...head, T.prose(`. What is the multiplicity of the zero x = ${minus(r)}?`)],
        text: `multiplicity: ${src}; at ${r}`,
        answer: fracAnswer(m, 1),
        visual: null,
        explain: `The factor for x = ${minus(r)} is ${facOf(r, true)}, and it appears ${ord(m)} in ${show}${m > 1 ? `, as its power ${m} says` : ''}. So the multiplicity is ${m}.`,
      };
    }
    // Cross or touch: the answer chosen first, so neither pays alone.
    const want = rng.chance(0.5) ? 'crosses' : 'touches';
    const fits = P.fs.filter(({ m }) => (m % 2 === 1) === (want === 'crosses'));
    if (!fits.length) continue;
    const { r, m } = rng.pick(fits);
    const opts = [['crosses', 'It crosses the x-axis'], ['touches', 'It touches the x-axis and turns back']];
    return {
      prompt: [...head, T.prose(`. At x = ${minus(r)}, does the graph cross the x-axis or touch it and turn back?`)],
      text: `cross or touch: ${src}; at ${r}; options a: crosses | b: touches`,
      answer: { type: 'choice', value: want === 'crosses' ? 'a' : 'b', options: opts.map(([, label], i) => ({ id: optionIds[i], label })) },
      visual: null,
      explain: `The zero x = ${minus(r)} has multiplicity ${m}. ${m % 2 ? `An odd power changes sign as x passes ${minus(r)}, so the graph crosses.` : `An even power never goes negative, so P keeps its sign either side of ${minus(r)}: the graph touches the axis and turns back.`}`,
    };
  }
}

// --- End Behavior ----------------------------------------------------------

const ENDS = [
  ['up up', 'Up on the left, up on the right'],
  ['down down', 'Down on the left, down on the right'],
  ['down up', 'Down on the left, up on the right'],
  ['up down', 'Up on the left, down on the right'],
];

function ends(rng) {
  for (;;) {
    // The answer is chosen first and P built to have it, so the four come out even.
    const want = rng.pick(ENDS);
    const even = want[0] === 'up up' || want[0] === 'down down';
    const up = want[0] === 'up up' || want[0] === 'down up';
    const P = randomP(rng, { n: rng.pick([1, 2, 3]), mults: [1, 1, 2, 3], maxDeg: 6 });
    const n = degree(P);
    if ((n % 2 === 0) !== even || n < 2) continue;
    if ((P.k > 0) !== up) continue;
    const c = coeffs(P);
    if (c.some((v) => Math.abs(v) > 5000)) continue;
    const asF = rng.chance(0.6);
    const src = asF ? factored(P) : write(c);
    const lead = `${P.k === 1 ? '' : P.k === -1 ? '−' : minus(P.k)}x${SUP[n]}`;
    const make = choice([T.prose('P(x) ='), ...drawn(src), T.prose('. Which way do the ends of its graph go?')],
      `poly ends: ${src}`, [want, ...ENDS.filter((e) => e !== want)],
      `${asF ? `Multiplying out, the x's in the factors give degree ${P.fs.map(({ m }) => m).join(' + ')} = ${n}, and the leading coefficient is ${minus(P.k)}: the leading term is ${lead}. ` : `The leading term is ${lead}. `}`
      + `${n} is ${even ? 'even, so both ends go the same way' : 'odd, so the ends go opposite ways'}, and ${P.k > 0 ? 'a positive' : 'a negative'} leading coefficient sends the right end ${up ? 'up' : 'down'}. So: ${want[1].toLowerCase()}.`);
    if (make) return make(rng);
  }
}

// --- Graphs: Sketch From Factors and Turning Points -------------------------

/**
 * P drawn on a plane: x across the zeros and one to two beyond, y wide
 * enough for every bump between them, the curve cut where it leaves the
 * frame, and each zero a labelled dot. Returns the visual and the heights at
 * the whole numbers in view, which the text carries.
 */
function graph(P) {
  const c = coeffs(P);
  const rs = P.fs.map(({ r }) => r);
  const x0 = Math.min(...rs) - 2, x1 = Math.max(...rs) + 2;
  let bump = 0;
  for (let x = Math.min(...rs); x <= Math.max(...rs); x += 0.05) bump = Math.max(bump, Math.abs(at(c, x)));
  const Y = Math.max(4, Math.ceil(bump * 1.4));
  const paths = [];
  let run = [];
  for (let i = 0; i <= (x1 - x0) * 10; i += 1) {
    const x = x0 + i / 10, y = at(c, x);
    if (Math.abs(y) <= Y) run.push([x, y]);
    else if (run.length) { paths.push(run); run = []; }
  }
  if (run.length) paths.push(run);
  const readings = [];
  for (let x = x0; x <= x1; x += 1) if (Math.abs(at(c, x)) <= Y) readings.push([x, at(c, x)]);
  const visual = tenths({
    kind: 'plane', xRange: [x0, x1], yRange: [-Y, Y], grid: Y <= 10 ? 1 : 0,
    marks: [
      ...paths.filter((p) => p.length > 1).map((points) => ({ kind: 'path', points, tone: LINE })),
      ...rs.map((r) => ({ kind: 'point', at: [r, 0], tone: LINE, label: minus(r) })),
    ],
    answer: [],
  });
  return { visual, readings };
}
const listed = (readings) => readings.map(([x, y]) => `(${x}, ${y})`).join(' ');

function sketch(rng) {
  for (;;) {
    const P = randomP(rng, { n: rng.pick([2, 3, 3]), lo: -4, hi: 4, mults: [1, 1, 2], maxDeg: 4, leads: [1, -1] });
    const rs = P.fs.map(({ r }) => r).sort((p, q) => p - q);
    if (rs.some((r, i) => i && r - rs[i - 1] < 2)) continue;
    const { visual, readings } = graph(P);
    if (readings.length < degree(P) + 2) continue;
    // The slips: the sign turned over, one multiplicity changed, one zero's sign turned.
    const flip = { k: -P.k, fs: P.fs };
    const i = rng.int(0, P.fs.length - 1);
    const remult = { k: P.k, fs: P.fs.map((f, j) => (j === i ? { r: f.r, m: f.m === 1 ? 2 : 1 } : f)) };
    const movable = P.fs.filter(({ r }) => r !== 0 && !rs.includes(-r));
    if (!movable.length) continue;
    const mv = rng.pick(movable);
    const mirror = { k: P.k, fs: P.fs.map((f) => (f === mv ? { r: -f.r, m: f.m } : f)) };
    const opts = [P, flip, remult, mirror].map((Q) => [factored(Q), factored(Q, true)]);
    const crossings = byX(P.fs).map(({ r, m }) => `${m === 1 ? 'crosses' : 'touches'} at ${minus(r)}`).join(', ');
    const n = degree(P);
    const make = choice([T.prose('Which polynomial has this graph?')], `sketch: graph ${listed(readings)}`, opts,
      `Read the graph: it ${crossings}, so ${byX(P.fs).map(({ r, m }) => `${facOf(r, true)}${m > 1 ? '²' : ''}`).join(', ')} are the factors, `
      + `an odd power where it crosses and an even one where it touches. The degree is ${n}, and the right end goes ${P.k > 0 ? 'up' : 'down'}, so the leading coefficient is ${P.k > 0 ? 'positive' : 'negative'}: ${factored(P, true)}.`,
      visual);
    if (make) return make(rng);
  }
}

function turning(rng) {
  const kind = rng.pick(['most', 'most', 'count', 'least']);
  if (kind === 'most') {
    for (;;) {
      const P = randomP(rng, { n: rng.pick([1, 2, 3]), mults: [1, 1, 2, 3], maxDeg: 6 });
      const n = degree(P);
      if (n < 2) continue;
      const c = coeffs(P);
      if (c.some((v) => Math.abs(v) > 5000)) continue;
      const asF = rng.chance(0.5);
      const src = asF ? factored(P) : write(c);
      return {
        prompt: [T.prose('P(x) ='), ...drawn(src), T.prose('. At most how many turning points can its graph have?')],
        text: `most turning points: ${src}`,
        answer: fracAnswer(n - 1, 1),
        visual: null,
        explain: `${asF ? `Its degree is the sum of the powers, ${P.fs.map(({ m }) => m).join(' + ')} = ${n}. ` : `Its degree is ${n}. `}A degree-${n} polynomial turns at most ${n} − 1 = ${n - 1} times.`,
      };
    }
  }
  for (;;) {
    const P = randomP(rng, { n: rng.pick([2, 3, 3]), lo: -4, hi: 4, mults: [1, 1, 2], maxDeg: 4, leads: [1, -1] });
    const rs = P.fs.map(({ r }) => r).sort((p, q) => p - q);
    if (rs.some((r, i) => i && r - rs[i - 1] < 2)) continue;
    const { visual, readings } = graph(P);
    if (readings.length < degree(P) + 2) continue;
    // With every zero real, P turns once between each pair of zeros and once at each touching zero.
    const turns = (P.fs.length - 1) + P.fs.filter(({ m }) => m === 2).length;
    const n = degree(P);
    if (kind === 'count') {
      return {
        prompt: [T.prose('How many turning points does this graph have?')],
        text: `turning count: graph ${listed(readings)}`,
        answer: fracAnswer(turns, 1),
        visual,
        explain: `A turning point is where the graph changes from rising to falling or back. It turns once between each pair of neighboring zeros${P.fs.some(({ m }) => m === 2) ? ', and once at each zero where it touches the axis and turns back' : ''}: ${turns} in all.`,
      };
    }
    return {
      prompt: [T.prose('What is the least degree a polynomial with this graph can have?')],
      text: `least degree: graph ${listed(readings)}`,
      answer: fracAnswer(n, 1),
      visual,
      explain: `The graph turns ${times(turns)}, and a degree-n polynomial turns at most n − 1 times, so n is at least ${turns + 1}. `
        + `Its ends go ${n % 2 === 0 ? 'the same way, which an even degree gives' : 'opposite ways, which an odd degree gives'}, and ${turns + 1} is ${n % 2 === 0 ? 'even' : 'odd'}. So the least degree is ${n}.`,
    };
  }
}

// --- Polynomial & Quadratic Inequalities -----------------------------------

const OPS = { '>': (v) => v > 0, '<': (v) => v < 0, '>=': (v) => v >= 0, '<=': (v) => v <= 0 };
const OPF = { '>': '>', '<': '<', '>=': '≥', '<=': '≤' };

/** The answer set of P op 0 from P's zeros and its sign between them. */
function solveSign(c, zs, op) {
  const pts = [...zs].sort((p, q) => p - q);
  const test = OPS[op];
  const parts = [];
  const edges = [-Infinity, ...pts, Infinity];
  for (let i = 0; i + 1 < edges.length; i += 1) {
    const lo = edges[i], hi = edges[i + 1];
    const mid = lo === -Infinity && hi === Infinity ? 0 : lo === -Infinity ? hi - 1 : hi === Infinity ? lo + 1 : (lo + hi) / 2;
    if (test(at(c, mid))) parts.push({ lo: lo === -Infinity ? null : { n: lo, d: 1 }, loIn: false, hi: hi === Infinity ? null : { n: hi, d: 1 }, hiIn: false });
  }
  if (test(0)) for (const z of pts) parts.push({ lo: { n: z, d: 1 }, loIn: true, hi: { n: z, d: 1 }, hiIn: true });
  return { type: 'solutions', value: { letter: 'x', parts: normalize(parts) } };
}

// requiem: catalogue/content/none-offered-on-every-row
function inequality(rng) {
  for (;;) {
    const op = rng.pick(['>', '<', '>=', '<=']);
    const kind = rng.pick(['quad', 'quad', 'poly', 'poly', 'poly', 'never']);
    let c, zs, src, how;
    if (kind === 'never') {
      // x² + m or −x² − m: no zeros, one sign everywhere.
      const m = rng.int(1, 9), s = rng.pick([1, -1]);
      c = [s * m, 0, s];
      zs = [];
      src = write(c);
      how = `${write(c, true)} has no zeros: x² is never negative, so it is ${s > 0 ? 'positive' : 'negative'} for every x.`;
    } else {
      const P = kind === 'quad'
        ? randomP(rng, { n: rng.pick([2, 2, 1]), mults: [1], maxDeg: 2, leads: [1, 1, -1] })
        : randomP(rng, { n: rng.pick([2, 3]), mults: [1, 1, 2], maxDeg: 4, leads: [1, -1, 2] });
      if (kind === 'quad' && degree(P) === 1) P.fs = [{ r: P.fs[0].r, m: 2 }];
      c = coeffs(P);
      zs = P.fs.map(({ r }) => r);
      const asF = kind === 'poly' || rng.chance(0.3);
      src = asF ? factored(P) : write(c);
      const sorted = [...zs].sort((p, q) => p - q);
      how = `${asF ? '' : `It factors as ${factored(P, true)}. `}${sorted.length === 1 ? 'Its zero is' : 'Its zeros are'} ${sorted.map(minus).join(', ')}. `
        + `Testing a number in each piece of the line between them: ${signs(c, sorted)}.`;
    }
    const ans = solveSign(c, zs, op);
    return {
      prompt: [T.prose('Solve'), ...drawn(`${src} ${op} 0`), T.prose('.'), T.prose('Give every solution, or none if there is no solution.')],
      text: `poly ineq: ${src} ${op} 0`,
      answer: ans,
      visual: null,
      explain: `${how} ${!zs.length ? '' : op.includes('=') ? `The ${zs.length === 1 ? 'zero itself counts' : 'zeros themselves count'}, since the inequality allows 0. ` : `The ${zs.length === 1 ? 'zero does' : 'zeros do'} not count, since the inequality is strict. `}`
        + `So ${formatSet(ans.value)}.`,
    };
  }
}
/** "x < −2: positive; −2 < x < 1: negative; …" */
function signs(c, pts) {
  const edges = [-Infinity, ...pts, Infinity];
  const out = [];
  for (let i = 0; i + 1 < edges.length; i += 1) {
    const lo = edges[i], hi = edges[i + 1];
    const mid = lo === -Infinity && hi === Infinity ? 0 : lo === -Infinity ? hi - 1 : hi === Infinity ? lo + 1 : (lo + hi) / 2;
    const where = lo === -Infinity ? `x < ${minus(hi)}` : hi === Infinity ? `x > ${minus(lo)}` : `${minus(lo)} < x < ${minus(hi)}`;
    out.push(`${where}: ${at(c, mid) > 0 ? 'positive' : 'negative'}`);
  }
  return out.join('; ');
}

const CONTENT = [zeros, ends, sketch, turning, inequality];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
