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

/**
 * The slips a division invites, each worked through: dividing by x + c,
 * leaving out a missing power's 0, bringing every number down unchanged,
 * and the remainder's sign turned round.
 */
function slips(c, P) {
  const right = synthetic(c, P);
  const out = [synthetic(-c, P)];
  const packed = P.filter((a, i) => a !== 0 || i === 0 || i === P.length - 1);
  if (packed.length < P.length) out.push(synthetic(c, packed));
  const top = fromTop(P);
  out.push({ q: top.slice(0, -1), r: top[top.length - 1] });
  if (right.r !== 0) out.push({ q: right.q, r: -right.r });
  return out;
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

const quotLine = ({ q, r }) => [`${write(fromTop(q))}, remainder ${r}`, `${write(fromTop(q), true)}, remainder ${minus(r)}`];

/** The long division, step by step, in words. */
function longSteps(c, P) {
  const steps = [];
  let rest = [...P];
  const n = P.length - 1;
  for (let p = n; p >= 1; p -= 1) {
    const lead = rest[p];
    const term = write([...Array(p - 1).fill(0), lead], true);
    rest = rest.map((a, i) => a - (i === p ? lead : i === p - 1 ? -c * lead : 0));
    rest[p] = 0;
    steps.push(`${term} × (${divF(c)})`);
  }
  return steps;
}

// requiem: catalogue/content/quotient-typed-when-exact
function exactDivision(rng) {
  for (;;) {
    const c = rng.nonZero(-5, 5);
    const Q = [rng.int(-9, 9), rng.int(-6, 6), rng.pick([1, 1, 2, 3, -1, -2])];
    if (rng.chance(0.25)) Q[1] = 0;
    const P = mul(X(c), Q);
    if (P.some((a) => Math.abs(a) > 60)) continue;
    const missing = P.slice(1, -1).some((a) => a === 0);
    return {
      prompt: [T.prose('Divide'), ...shown(P), T.prose(`by ${divF(c)}. It divides exactly: what is the quotient?`)],
      text: `quotient: ${write(P)}; ${div(c)}`,
      // Judged by value: any finished way of writing the quotient is right.
      answer: { type: 'equivalent', value: write(Q), requireSimplest: true },
      visual: null,
      explain: `${missing ? `Write the missing power with a 0 first: ${withZeros(P)}. ` : ''}`
        + `Divide the leading term each time, multiply back and subtract: ${longSteps(c, P).join(', then ')}. `
        + `Nothing is left over, so the quotient is ${write(Q, true)}. Check: (${divF(c)})(${write(Q, true)}) = ${write(P, true)}.`,
    };
  }
}

function longDivision(rng) {
  if (rng.chance(0.4)) return exactDivision(rng);
  for (;;) {
    const P = dividend(rng), c = rng.nonZero(-5, 5);
    const right = synthetic(c, P);
    if (right.r === 0) continue;
    const opts = [quotLine(right), ...slips(c, P).map(quotLine)];
    const seen = new Set(), uniq = [];
    for (const o of opts) if (!seen.has(o[0])) { seen.add(o[0]); uniq.push(o); }
    if (uniq.length < 4) continue;
    const pick = [uniq[0], ...rng.shuffle(uniq.slice(1)).slice(0, 3)];
    const missing = P.slice(1, -1).some((a) => a === 0);
    const make = choice(
      [T.prose('Divide'), ...shown(P), T.prose(`by ${divF(c)}. Which is the quotient and remainder?`)],
      `long division: ${write(P)}; ${div(c)}`, pick,
      `${missing ? `Write the missing power with a 0 first: ${withZeros(P)}. ` : ''}`
      + `Divide the leading term each time, multiply back and subtract: ${longSteps(c, P).join(', then ')}. `
      + `The quotient is ${write(fromTop(right.q), true)} and ${right.r === 0 ? 'nothing is left over: remainder 0' : `${minus(right.r)} is left over: the remainder`}. `
      + `Check: (${divF(c)})(${write(fromTop(right.q), true)}) ${right.r < 0 ? '−' : '+'} ${Math.abs(right.r)} = ${write(P, true)}.`);
    if (make) return make(rng);
  }
}

// --- Synthetic -------------------------------------------------------------

const rowLine = ({ q, r }) => [`${q.join(', ')} r ${r}`, `${q.map(minus).join(', ')} | ${minus(r)}`];

function syntheticRow(rng) {
  for (;;) {
    const P = dividend(rng), c = rng.nonZero(-5, 5);
    const right = synthetic(c, P);
    const opts = [rowLine(right), ...slips(c, P).map(rowLine)];
    const seen = new Set(), uniq = [];
    for (const o of opts) if (!seen.has(o[0])) { seen.add(o[0]); uniq.push(o); }
    if (uniq.length < 4) continue;
    const pick = [uniq[0], ...rng.shuffle(uniq.slice(1)).slice(0, 3)];
    const top = fromTop(P);
    const steps = [];
    for (let i = 1; i < top.length; i += 1) {
      const prev = [...right.q, right.r][i - 1];
      const below = c * prev;
      steps.push(`${br(c)} × ${br(prev)} = ${minus(below)}, and ${minus(top[i])} + ${br(below)} = ${minus(top[i] + below)}`);
    }
    const make = choice(
      [T.prose('Use synthetic division to divide'), ...shown(P), T.prose(`by ${divF(c)}. Which is the bottom row, quotient numbers then remainder?`)],
      `synthetic: ${write(P)}; ${div(c)}`, pick,
      `Put ${minus(c)} in the box, since ${c < 0 ? `${divF(c)} is x − (${minus(c)})` : `the divisor is ${divF(c)}`}, and write the coefficients ${top.map(minus).join(', ')}${top.includes(0) ? ', a 0 for each missing power' : ''}. `
      + `Bring down ${minus(top[0])}. Then ${steps.join('; ')}. The last number is the remainder: ${rowLine(right)[1]}.`);
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

const CONTENT = [longDivision, syntheticRow, remainder, factorTheorem, allZeros];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
