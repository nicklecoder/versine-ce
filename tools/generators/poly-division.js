/**
 * Catalogue authoring tool: builds the problem library for poly-division.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 *
 * Every `text` carries P(x) in the ASCII the expression box reads, and the
 * divisor x - c, so scripts/check-answers.py can divide again by long
 * division, term by term from the top, rather than by the synthetic
 * division this file uses. No answer is an expression typed out: quotients
 * are chosen from options, and the rest are numbers or sets of zeros.
 */
import * as T from '../terms.js';
import { minus } from '../../web/ui/dom.js';
import { previewOf } from '../../web/ui/express.js';
import { normalize, formatSet } from '../../web/math/solutions.js';
import { fracAnswer } from './chance.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/poly-division.js';

const optionIds = ['a', 'b', 'c', 'd'];
const SUP = { 2: '²', 3: '³', 4: '⁴' };

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
const div = (c) => `x${c < 0 ? ` + ${-c}` : ` - ${c}`}`;
const divF = (c) => `x${c < 0 ? ` + ${-c}` : ` − ${c}`}`;
const br = (n) => (n < 0 ? `(${minus(n)})` : String(n));

/**
 * Synthetic division of P (from x^0 up) by x − c: the bottom row, quotient
 * coefficients from the top down, then the remainder.
 */
function synthetic(c, P) {
  const top = [...P].reverse();
  const row = [top[0]];
  for (const a of top.slice(1)) row.push(a + c * row[row.length - 1]);
  return { q: row.slice(0, -1), r: row[row.length - 1] };
}
const fromTop = (q) => [...q].reverse();
const at = (P, c) => P.reduce((s, a, i) => s + a * c ** i, 0);

/** P(x) = … drawn as the expression box draws it. */
function shown(P) {
  const drawn = previewOf(write(P));
  if (!drawn.ok) throw new Error(`poly-division: cannot draw ${write(P)}: ${drawn.error}`);
  return drawn.terms;
}

/** A cubic (sometimes a quadratic) with small coefficients, sometimes one missing. */
function dividend(rng) {
  const deg = rng.chance(0.8) ? 3 : 2;
  for (;;) {
    const P = Array.from({ length: deg + 1 }, (_, i) => (i === deg ? rng.pick([1, 1, 2, 3, -1, 2]) : rng.int(-9, 9)));
    if (deg === 3 && rng.chance(0.35)) P[rng.int(1, 2)] = 0;
    if (P[0] === 0 && rng.chance(0.7)) continue;
    return P;
  }
}

function choice(prompt, head, opts, explain) {
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

// --- Long Division ---------------------------------------------------------

/** P with every power written, a 0 where one is missing: x³ + 0x² − 7x + 6. */
function withZeros(P) {
  return [...P].reverse().map((a, j) => {
    const i = P.length - 1 - j;
    const letter = i === 0 ? '' : i === 1 ? 'x' : `x${SUP[i]}`;
    const body = `${Math.abs(a) === 1 && letter ? '' : Math.abs(a)}${letter}`;
    if (j === 0) return a < 0 ? `−${body}` : body;
    return `${a < 0 ? ' − ' : ' + '}${body}`;
  }).join('');
}
const hasGap = (P) => P.slice(1, -1).some((a) => a === 0);
/** P with its missing powers closed up, as if their 0s were never written. */
const packed = (P) => P.filter((a, i) => a !== 0 || i === 0 || i === P.length - 1);

/**
 * Long division of P by D (both from x^0 up), from the top term down. The
 * slips are worked through the same steps: `flip` subtracts with the
 * divisor's other terms' signs turned (every step, or only the first, or
 * every one but the first), and `close` divides P with its missing
 * powers' 0s left out. Null where a slip would leave a fraction in the
 * quotient, which no student writes by accident.
 */
function longDivide(P, D, { flip = null, close = false } = {}) {
  const rest = close ? packed(P) : [...P];
  const n = rest.length - 1, m = D.length - 1;
  if (n < m) return null;
  const q = Array(n - m + 1).fill(0);
  const steps = [];
  let step = 0;
  for (let p = n; p >= m; p -= 1) {
    const lead = rest[p] / D[m];
    if (!Number.isInteger(lead)) return null;
    q[p - m] = lead;
    const turned = flip === 'all' || (flip === 'first' && step === 0) || (flip === 'rest' && step > 0);
    for (let j = 0; j <= m; j += 1) rest[p - m + j] -= lead * (j === m || !turned ? D[j] : -D[j]);
    steps.push({ p: p - m, lead });
    step += 1;
  }
  const r = rest.slice(0, m);
  while (r.length > 1 && r[r.length - 1] === 0) r.pop();
  return { q, r, steps };
}
const quotLine = ({ q, r }) => [`${write(q)}, remainder ${write(r)}`, `${write(q, true)}, remainder ${write(r, true)}`];

/** The long division in words: each term of the quotient times the divisor, taken away. */
function longSteps(P, D) {
  // A step whose quotient term is 0 only brings the next term down, and is not said.
  return longDivide(P, D).steps.filter(({ lead }) => lead !== 0).map(({ p, lead }) => `${write([...Array(p).fill(0), lead], true)} × (${write(D, true)})`);
}

/**
 * A divisor: x − c most often, then ax − b with a of 2 or 3, then a
 * quadratic, x² + k or x² + bx + c, whose remainder can be a whole line.
 */
// requiem: catalogue/content/long-division-beyond-monic
function divisor(rng, kind) {
  if (kind === 'monic') return X(rng.nonZero(-5, 5));
  if (kind === 'linear') {
    for (;;) {
      const a = rng.pick([2, 3]), b = rng.nonZero(-5, 5);
      if (gcdOf(a, b) === 1) return [-b, a];
    }
  }
  if (rng.chance(0.5)) return [rng.pick([1, 2, 3, 4, 5, -1, -2, -3]), 0, 1];
  for (;;) {
    const b = rng.nonZero(-3, 3), c = rng.nonZero(-5, 5);
    // One that does not factor over the integers, or the division is two easy ones.
    const disc = b * b - 4 * c;
    if (disc >= 0 && Number.isInteger(Math.sqrt(disc))) continue;
    return [c, b, 1];
  }
}
const gcdOf = (a, b) => (b === 0 ? Math.abs(a) : gcdOf(b, a % b));
const divText = (D) => write(D);
const divShow = (D) => write(D, true);

// requiem: catalogue/content/quotient-typed-when-exact
function exactDivision(rng) {
  for (;;) {
    const kind = rng.pick(['monic', 'monic', 'linear', 'quad']);
    const D = divisor(rng, kind);
    const Q = kind === 'quad'
      ? (rng.chance(0.5) ? [rng.int(-9, 9), rng.pick([1, 1, 2, 3, -1, -2])] : [rng.int(-6, 6), rng.int(-5, 5), rng.pick([1, 1, 2, -1])])
      : [rng.int(-9, 9), rng.int(-6, 6), rng.pick([1, 1, 2, 3, -1, -2])];
    if (kind !== 'quad' && rng.chance(0.25)) Q[1] = 0;
    if (Q[0] === 0 && rng.chance(0.7)) continue;
    const P = mul(D, Q);
    if (P.some((a) => Math.abs(a) > 60)) continue;
    return {
      prompt: [T.prose('Divide'), ...shown(P), T.prose(`by ${divShow(D)}. It divides exactly: what is the quotient?`)],
      text: `quotient: ${write(P)}; ${divText(D)}`,
      // Judged by value: any finished way of writing the quotient is right.
      answer: { type: 'equivalent', value: write(Q), requireSimplest: true },
      visual: null,
      explain: `${hasGap(P) ? `Write the missing power with a 0 first: ${withZeros(P)}. ` : ''}`
        + `Divide the leading term each time, multiply back and subtract: ${longSteps(P, D).join(', then ')}. `
        + `Nothing is left over, so the quotient is ${write(Q, true)}. Check: (${divShow(D)})(${write(Q, true)}) = ${write(P, true)}.`,
    };
  }
}

/**
 * Two slips, crossed. The four options are the division done right, with
 * one slip, with the other, and with both, so every option is one slip from
 * two others and the right one sits no nearer the middle of the four than a
 * wrong one does. Every option has its own quotient: a slip that changed
 * only the remainder would print the right quotient twice, and the right
 * answer would always be one of that pair.
 */
// Stopping a step early was tried as a slip too, and dropped: its remainder
// is as long as the divisor, so the right option was never the longest and
// rarely the one nearest the rest, and could be found by its look.
const SLIPS = ['all', 'first', 'close'];
const slipped = (P, D, set) => longDivide(P, D, {
  flip: set.has('all') && set.has('first') ? 'rest' : set.has('all') ? 'all' : set.has('first') ? 'first' : null,
  close: set.has('close'),
});

// requiem: catalogue/content/decoys-crossed-not-centred
function longDivision(rng) {
  if (rng.chance(0.4)) return exactDivision(rng);
  const kind = rng.pick(['monic', 'monic', 'linear', 'quad']);
  const gap = rng.chance(0.35);
  for (;;) {
    const D = divisor(rng, kind);
    // Over x² + k the turned signs change the quotient alike, so the second
    // slip there is a missing power's 0 left out, and the dividend has one.
    if (D.length === 3 && D[1] === 0 && !gap) continue;
    // A cubic over a line, or a quartic over a quadratic, its numbers drawn
    // at random rather than built from a small quotient: built, the right
    // option had the smallest numbers of the four and could be picked by size.
    const deg = D.length === 3 ? 4 : 3;
    const P = Array.from({ length: deg + 1 }, (_, i) => (i === deg ? rng.pick([1, 1, 2, -1, 3]) * D[D.length - 1] : rng.int(-9, 9)));
    if (gap) P[rng.int(1, deg - 1)] = 0;
    if (P[0] === 0 || hasGap(P) !== gap) continue;
    const right = longDivide(P, D);
    if (!right || right.r.every((v) => v === 0)) continue;
    // Two slips crossed; any pair whose four divisions stay whole and keep four
    // quotients apart will do, and none may claim the division is exact.
    const pairs = [];
    for (let i = 0; i < SLIPS.length; i += 1) {
      for (let j = i + 1; j < SLIPS.length; j += 1) {
        const [A, B] = [SLIPS[i], SLIPS[j]];
        if ((A === 'close' || B === 'close') && !gap) continue;
        const all = [right, slipped(P, D, new Set([A])), slipped(P, D, new Set([B])), slipped(P, D, new Set([A, B]))];
        if (all.some((o) => !o || o.r.every((v) => v === 0))) continue;
        if (new Set(all.map((o) => JSON.stringify(o.q))).size !== 4) continue;
        if (all.some((o) => o.q.some((v) => Math.abs(v) > 99) || o.r.some((v) => Math.abs(v) > 999))) continue;
        pairs.push(all);
      }
    }
    if (!pairs.length) continue;
    const opts = rng.pick(pairs).map(quotLine);
    const make = choice(
      [T.prose('Divide'), ...shown(P), T.prose(`by ${divShow(D)}. Which is the quotient and remainder?`)],
      `long division: ${write(P)}; ${divText(D)}`, opts,
      `${hasGap(P) ? `Write the missing power with a 0 first: ${withZeros(P)}. ` : ''}`
      + `Divide the leading term each time, multiply back and subtract: ${longSteps(P, D).join(', then ')}. `
      + `What is left, ${write(right.r, true)}, has a lower degree than ${divShow(D)}, so it is the remainder, and the quotient is ${write(right.q, true)}. `
      + `Check: (${divShow(D)})(${write(right.q, true)}) + ${right.r.length > 1 || right.r[0] < 0 ? `(${write(right.r, true)})` : write(right.r, true)} = ${write(P, true)}.`);
    if (make) return make(rng);
  }
}

// --- Synthetic -------------------------------------------------------------

/**
 * The bottom row of synthetic division by x − c, worked with the slips it
 * invites: `sign` puts −c in the box for x − c, `close` leaves out a
 * missing power's 0, and `above` multiplies c by the number above in the
 * top row instead of the one just brought down.
 */
function syntheticRow(c, P, { sign = false, close = false, above = false } = {}) {
  const top = [...(close ? packed(P) : P)].reverse();
  const k = sign ? -c : c;
  const row = [top[0]];
  for (let i = 1; i < top.length; i += 1) row.push(top[i] + k * (above ? top[i - 1] : row[i - 1]));
  return { q: row.slice(0, -1), r: row[row.length - 1] };
}
const rowLine = ({ q, r }) => [`${q.join(', ')} r ${r}`, `${q.map(minus).join(', ')} | ${minus(r)}`];

// requiem: catalogue/content/decoys-crossed-not-centred
function syntheticLevel(rng) {
  for (;;) {
    const P = dividend(rng), c = rng.nonZero(-5, 5);
    const right = synthetic(c, P);
    const can = ['sign', 'above', ...(hasGap(P) ? ['close'] : [])];
    const [A, B] = rng.shuffle(can).slice(0, 2);
    const all = [right, syntheticRow(c, P, { [A]: true }), syntheticRow(c, P, { [B]: true }), syntheticRow(c, P, { [A]: true, [B]: true })];
    // Every option its own quotient numbers, not only its own remainder.
    if (new Set(all.map((o) => o.q.join(','))).size !== 4) continue;
    const top = fromTop(P);
    const steps = [];
    for (let i = 1; i < top.length; i += 1) {
      const prev = [...right.q, right.r][i - 1];
      const below = c * prev;
      steps.push(`${br(c)} × ${br(prev)} = ${minus(below)}, and ${minus(top[i])} + ${br(below)} = ${minus(top[i] + below)}`);
    }
    const make = choice(
      [T.prose('Use synthetic division to divide'), ...shown(P), T.prose(`by ${divF(c)}. Which is the bottom row, quotient numbers then remainder?`)],
      `synthetic: ${write(P)}; ${div(c)}`, all.map(rowLine),
      `Put ${minus(c)} in the box, since ${c < 0 ? `${divF(c)} is x − (${minus(c)})` : `the divisor is ${divF(c)}`}, and write the coefficients ${top.map(minus).join(', ')}${top.includes(0) ? ', a 0 for each missing power' : ''}. `
      + `Bring down ${minus(top[0])}. Then multiply each number just brought down by ${minus(c)} and add it to the next: ${steps.join('; ')}. The last number is the remainder: ${rowLine(right)[1]}.`);
    if (make) return make(rng);
  }
}

// --- Remainder Theorem -----------------------------------------------------

function remainder(rng) {
  const P = dividend(rng), c = rng.nonZero(-5, 5);
  const r = at(P, c);
  const terms = P.map((a, i) => [a, i]).filter(([a]) => a).reverse();
  const sub = terms.map(([a, i]) => (i === 0 ? br(a) : `${a === 1 ? '' : `${br(a)} · `}${br(c)}${i > 1 ? SUP[i] : ''}`)).join(' + ');
  const asked = rng.chance(0.5);
  return {
    prompt: asked
      ? [T.prose('What is the remainder when'), ...shown(P), T.prose(`is divided by ${divF(c)}?`)]
      : [T.prose('P(x) ='), ...shown(P), T.prose(`. Use the remainder theorem: what is P(${minus(c)})?`)],
    text: `remainder: ${write(P)}; ${div(c)}`,
    answer: fracAnswer(r, 1),
    visual: null,
    explain: `The remainder theorem: dividing by ${divF(c)} leaves P(${minus(c)}) over. P(${minus(c)}) = ${sub} = ${minus(r)}. `
      + `Synthetic division by ${minus(c)} gives the same last number, ${minus(synthetic(c, P).r)}.`,
  };
}

// --- Factor Theorem --------------------------------------------------------

function factorTheorem(rng) {
  if (rng.chance(0.5)) {
    // Is x − c a factor? Yes and no drawn half each, so neither answer pays alone.
    const yes = rng.chance(0.5);
    for (;;) {
      const c = rng.nonZero(-5, 5);
      let P;
      if (yes) {
        const Q = [rng.int(-9, 9), rng.int(-6, 6), rng.pick([1, 1, 2, -1])];
        P = mul(X(c), Q);
      } else P = dividend(rng);
      if (P.some((a) => Math.abs(a) > 60)) continue;
      const r = at(P, c);
      if ((r === 0) !== yes) continue;
      const opts = [['yes', `Yes: P(${minus(c)}) = 0`], ['no', `No: P(${minus(c)}) ≠ 0`]];
      return {
        prompt: [T.prose(`Is ${divF(c)} a factor of`), ...shown(P), T.prose('?')],
        text: `is factor: ${write(P)}; ${div(c)}; options a: yes | b: no`,
        answer: { type: 'choice', value: yes ? 'a' : 'b', options: opts.map(([, label], i) => ({ id: optionIds[i], label })) },
        visual: null,
        explain: `The factor theorem: ${divF(c)} is a factor exactly when P(${minus(c)}) = 0. Here P(${minus(c)}) = ${minus(r)}, `
          + (yes ? 'so it is a factor: the division leaves nothing over.' : `so it is not: dividing leaves a remainder of ${minus(r)}.`),
      };
    }
  }
  // Find k so that x − c is a factor: P(c) = 0 is one equation in k.
  for (;;) {
    const c = rng.nonZero(-4, 4), a = rng.int(-6, 6), b = rng.int(-9, 9), lead = rng.pick([1, 1, 2]);
    const where = rng.pick(['constant', 'constant', 'x']);
    const known = where === 'constant' ? [0, b, a, lead] : [rng.nonZero(-9, 9), 0, a, lead];
    const rest = at(known, c);
    const k = where === 'constant' ? -rest : -rest / c;
    if (!Number.isInteger(k) || k === 0 || Math.abs(k) > 99) continue;
    const d = known[0];
    const src = where === 'constant' ? `${write(known)} + k` : `${write([0, 0, a, lead])} + kx ${d < 0 ? '-' : '+'} ${Math.abs(d)}`;
    const drawn = previewOf(src);
    if (!drawn.ok) throw new Error(`poly-division: cannot draw ${src}: ${drawn.error}`);
    return {
      prompt: [T.prose(`Find k so that ${divF(c)} is a factor of`), ...drawn.terms, T.prose('.')],
      text: `factor k: ${src}; ${div(c)}`,
      answer: fracAnswer(k, 1),
      visual: null,
      explain: `${divF(c)} is a factor exactly when P(${minus(c)}) = 0. Put x = ${minus(c)} in: `
        + (where === 'constant' ? `${minus(rest)} + k = 0, so k = ${minus(k)}.` : `${minus(rest)} ${c < 0 ? '−' : '+'} ${Math.abs(c) === 1 ? '' : Math.abs(c)}k = 0, so k = ${minus(k)}.`),
    };
  }
}

// --- Rational Root Theorem -------------------------------------------------

/** Characters to change, add or drop to turn one label into another. */
function editDistance(a, b) {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i += 1) {
    const cur = [i];
    for (let j = 1; j <= b.length; j += 1) cur.push(Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)));
    prev = cur;
  }
  return prev[b.length];
}
const divisorsOf = (n) => Array.from({ length: Math.abs(n) }, (_, i) => i + 1).filter((d) => n % d === 0);
/**
 * Every p/q the theorem allows, p dividing the constant term and q the
 * leading coefficient, in lowest terms: by size, each just before its negative.
 */
function candidates(P) {
  const seen = new Map();
  for (const n of divisorsOf(P[0])) {
    for (const d of divisorsOf(P[P.length - 1])) {
      const g = gcdOf(n, d);
      seen.set(`${n / g}/${d / g}`, [n / g, d / g]);
    }
  }
  return [...seen.values()].sort((u, v) => u[0] / u[1] - v[0] / v[1]).flatMap(([n, d]) => [[n, d], [-n, d]]);
}
const qShow = ([n, d]) => (d === 1 ? minus(n) : `${minus(n)}/${d}`);
const qBody = ([n, d]) => (d === 1 ? String(n) : `${n}/${d}`);
/** P(n/d) as a fraction, exactly: P's terms over d to the degree. */
function atQ(P, [n, d]) {
  const deg = P.length - 1;
  const top = P.reduce((acc, a, i) => acc + a * n ** i * d ** (deg - i), 0);
  return fracAnswer(top, d ** deg).value;
}
const qSaid = ({ n, d }) => (d === 1 ? minus(n) : `${minus(n)}/${d}`);
const listQ = (qs) => qs.map((q) => (q[0] < 0 ? null : `±${qShow(q)}`)).filter(Boolean).join(', ');

// requiem: catalogue/content/rational-root-candidates-listed
function rationalRoots(rng) {
  if (rng.chance(0.4)) {
    // Which does the theorem rule out? Three it allows, and one it does not.
    // The rank it is to take is drawn once, before any redraw, so the redraws
    // cannot favour the ranks that are easy to reach.
    const rank = rng.int(0, 3);
    for (;;) {
      const an = rng.pick([2, 3, 4, 6]), a0 = rng.pick([1, 2, 3, 4, 5, 6, 8, 9, -2, -3, -4, -6]);
      const P = [a0, rng.int(-9, 9), rng.int(-9, 9), an * rng.pick([1, -1])];
      const L = candidates(P);
      const inL = (q) => L.some(([n, d]) => n * q[1] === d * q[0]);
      const outs = [];
      // The slips: the fraction upside down, a factor of the leading
      // coefficient taken for the constant's, a denominator from the constant.
      for (const [n, d] of L) if (n > 0 && d > 1 && !inL([d, n])) outs.push([rng.pick([d, -d]), n].map((v, i) => (i === 1 ? Math.abs(v) : v)));
      for (const v of divisorsOf(an)) if (v > 1 && !inL([v, 1])) outs.push([rng.pick([v, -v]), 1]);
      for (const v of divisorsOf(a0)) if (v > 1 && !inL([1, v])) outs.push([rng.pick([1, -1]), v]);
      const fix = (q) => { const g = gcdOf(q[0], q[1]); return [q[0] / g, q[1] / g]; };
      const key = outs.length ? fix(rng.pick(outs)) : null;
      if (!key || inL(key)) continue;
      // The three it allows look like the one it does not: fractions beside a
      // fraction, whole numbers beside a whole number. A number off the list
      // still tends to look unlike the rest, so the set is chosen to put it
      // at a rank drawn at random among the four by how far each option's
      // label is from the others': nearest, farthest or between, evenly, so
      // it is found by the theorem and not by its look.
      const alike = L.filter(([n, d]) => (d > 1) === (key[1] > 1) && !(Math.abs(n) === 1 && d === 1));
      const pool = alike.length >= 3 ? alike : L.filter(([n, d]) => !(Math.abs(n) === 1 && d === 1));
      if (pool.length < 3) continue;
      let ins = null;
      for (let t = 0; t < 12 && !ins; t += 1) {
        const tryIns = rng.shuffle(pool).slice(0, 3);
        const labels = [key, ...tryIns].map(qShow);
        const totals = labels.map((l) => labels.reduce((sum, m) => sum + editDistance(l, m), 0));
        const below = totals.filter((v) => v < totals[0]).length, tied = totals.filter((v) => v === totals[0]).length;
        if (rank >= below && rank < below + tied) ins = tryIns;
      }
      if (!ins) continue;
      const opts = [key, ...ins].map((q) => [qBody(q), qShow(q)]);
      const make = choice(
        [T.prose('P(x) ='), ...shown(P), T.prose('. Which of these does the rational root theorem rule out as a zero of P?')],
        `not a candidate: ${write(P)}`, opts,
        `A rational zero p/q in lowest terms has p dividing the constant term, ${minus(P[0])}, and q dividing the leading coefficient, ${minus(P[P.length - 1])}. `
        + `So the only candidates are ${listQ(L)}. ${qShow(key)} is not one of them${key[1] > 1 && !divisorsOf(P[P.length - 1]).includes(key[1]) ? `: ${key[1]} does not divide ${minus(P[P.length - 1])}` : !divisorsOf(P[0]).includes(Math.abs(key[0])) ? `: ${Math.abs(key[0])} does not divide ${minus(P[0])}` : ''}. `
        + `The others are on the list; that does not make them zeros, only possible ones.`);
      if (make) return make(rng);
    }
  }
  for (;;) {
    // Exactly one rational zero n/d: (dx − n) times a quadratic with none.
    const d = rng.pick([1, 1, 2, 3]), n = rng.nonZero(-6, 6);
    if (gcdOf(n, d) !== 1) continue;
    const b = rng.int(-5, 5), c = rng.nonZero(-7, 7);
    const disc = b * b - 4 * c;
    if (disc >= 0 && Number.isInteger(Math.sqrt(disc))) continue;
    const P = mul([-n, d], [c, b, 1]);
    if (P.some((a) => Math.abs(a) > 60)) continue;
    const L = candidates(P);
    const tests = [];
    for (const q of L) {
      const v = atQ(P, q);
      tests.push(`P(${qShow(q)}) = ${qSaid(v)}`);
      if (v.n === 0) break;
    }
    const shownTests = tests.length > 6 ? [...tests.slice(0, 3), '…', ...tests.slice(-2)] : tests;
    return {
      prompt: [T.prose('P(x) ='), ...shown(P), T.prose('has exactly one rational zero. Use the rational root theorem to find it.')],
      text: `rational zero: ${write(P)}`,
      answer: fracAnswer(n, d),
      visual: null,
      explain: `A rational zero p/q in lowest terms has p dividing the constant term, ${minus(P[0])}, and q dividing the leading coefficient, ${minus(P[3])}. `
        + `So the candidates are ${listQ(L)}. Test them: ${shownTests.join(', ')}. `
        + `Dividing out leaves ${write([c * d, b * d, d], true)}${d === 1 ? '' : `, which is ${d}(${write([c, b, 1], true)})`}, and ${write([c, b, 1], true)} has discriminant ${minus(disc)}, ${disc < 0 ? 'negative, so no real zeros at all' : 'not a perfect square, so its zeros are irrational'}. `
        + `So the one rational zero is ${qShow([n, d])}.`,
    };
  }
}

// --- All Zeros From One ----------------------------------------------------

const setOf = (xs) => {
  const parts = [...new Set(xs)].sort((p, q) => p - q).map((x) => ({ lo: { n: x, d: 1 }, loIn: true, hi: { n: x, d: 1 }, hiIn: true }));
  return { type: 'solutions', value: { letter: 'x', parts: normalize(parts) } };
};
const facText = (r) => (r === 0 ? 'x' : `(${divF(r)})`);

function allZeros(rng) {
  for (;;) {
    const c = rng.nonZero(-5, 5), lead = rng.pick([1, 1, 1, 2, -1]);
    const kind = rng.pick(['two', 'two', 'two', 'double', 'none']);
    let Q, zeros, how;
    if (kind === 'none') {
      const m = rng.int(1, 9);
      Q = [lead * m, 0, lead];
      zeros = [c];
      how = `${write(Q, true)} = 0 needs x² = −${m}, and no real number squares to a negative, so it has no real zeros`;
    } else {
      const r1 = rng.int(-6, 6), r2 = kind === 'double' ? r1 : rng.int(-6, 6);
      if (kind === 'two' && r1 === r2) continue;
      Q = mul([lead], mul(X(r1), X(r2)));
      zeros = [c, r1, r2];
      const f = kind === 'double' ? `${lead === 1 ? '' : lead === -1 ? '−' : lead}${facText(r1)}²` : `${lead === 1 ? '' : lead === -1 ? '−' : lead}${facText(r1)}${facText(r2)}`;
      how = `${write(Q, true)} factors as ${f}, so x = ${kind === 'double' ? `${minus(r1)} (twice)` : `${minus(r1)} or x = ${minus(r2)}`}`;
    }
    const P = mul(X(c), Q);
    if (P.some((a) => Math.abs(a) > 99)) continue;
    const xs = [...new Set(zeros)].sort((p, q) => p - q);
    return {
      prompt: [T.prose(`x = ${minus(c)} is a zero of P(x) =`), ...shown(P), T.prose('. Find every real zero.')],
      text: `all zeros: ${write(P)}; given ${c}`,
      answer: setOf(xs),
      visual: null,
      explain: `Since x = ${minus(c)} is a zero, ${divF(c)} is a factor. Divide it out with synthetic division: P(x) = (${divF(c)})(${write(Q, true)}). `
        + `Then ${how}. So ${formatSet(setOf(xs).value)}.`,
    };
  }
}

const CONTENT = [longDivision, syntheticLevel, remainder, factorTheorem, rationalRoots, allZeros];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
