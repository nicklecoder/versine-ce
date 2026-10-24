/**
 * Catalogue authoring tool: builds the problem library for rational-eq.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 *
 * Every equation's `text` is the equation in the ASCII the expression box
 * reads, with every numerator and denominator bracketed where it is more
 * than one token, so scripts/check-answers.py can put it over one
 * denominator and find every solution itself. Variation and work questions
 * carry their numbers, from which the checker writes its own equation.
 */
import * as T from '../terms.js';
import { minus } from '../../web/ui/dom.js';
import { previewOf } from '../../web/ui/express.js';
import { normalize, formatSet } from '../../web/math/solutions.js';
import { fracAnswer, fracText, reduce } from './chance.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/rational-eq.js';

const pm = (k, fancy = true) => (k < 0 ? `${fancy ? ' − ' : ' - '}${-k}` : ` + ${k}`);
/** ax + b: 3x - 5, -x + 2, 2x, 7. */
function lin(a, b, fancy = false) {
  const lead = a === 0 ? '' : a === 1 ? 'x' : a === -1 ? (fancy ? '−x' : '-x') : `${fancy ? minus(a) : a}x`;
  if (!lead) return fancy ? minus(b) : String(b);
  return b === 0 ? lead : `${lead}${pm(b, fancy)}`;
}
const fancy = (s) => s.replace(/-/g, '−');
/** x + c as a factor: bracketed, or bare x. */
const fac = (c, f = false) => (c === 0 ? 'x' : `(${lin(1, c, f)})`);
/** A quadratic x² + bx + c, written out. */
const quad = (b, c) => `x²${b === 0 ? '' : b === 1 ? ' + x' : b === -1 ? ' − x' : `${pm(b)}x`}${c === 0 ? '' : pm(c)}`;
/** (x − r)(x − s), with a bare x first. */
const factors = (r, s) => (s === 0 ? `${fac(-s, true)}${fac(-r, true)}` : `${fac(-r, true)}${fac(-s, true)}`);
const gcd = (a, b) => (b === 0 ? Math.abs(a) : gcd(b, a % b));
const lcm = (a, b) => (a / gcd(a, b)) * b;
/** A coefficient in front of a bracket or x: nothing for 1, − for −1. */
/** A number in a product, bracketed when negative. */
const br = (n) => (n < 0 ? `(${minus(n)})` : String(n));
const coefF = (a) => (a === 1 ? '' : a === -1 ? '−' : minus(a));

const setOf = (xs) => {
  const parts = [...new Set(xs)].sort((p, q) => p - q).map((x) => ({ lo: { n: x, d: 1 }, loIn: true, hi: { n: x, d: 1 }, hiIn: true }));
  return { type: 'solutions', value: { letter: 'x', parts: normalize(parts) } };
};
const said = (xs) => (xs.length ? formatSet(setOf(xs).value) : 'no solution');

/**
 * "Solve:" and the equation drawn as the expression box draws it. Where a
 * level can have no solution, every row of it says so may be the answer,
 * so the wording gives nothing away.
 */
function ask(lhs, rhs, none) {
  const drawn = previewOf(`${lhs} = ${rhs}`);
  if (!drawn.ok) throw new Error(`rational-eq: cannot draw ${lhs} = ${rhs}: ${drawn.error}`);
  return [T.prose(none ? 'Solve, or say there is none:' : 'Solve:'), ...drawn.terms];
}
const equation = (lhs, rhs, xs, explain, none = false) => {
  if (!xs.length && !none) throw new Error('rational-eq: no solution where the prompt does not offer it');
  if (xs.some((x) => !Number.isInteger(x) || Math.abs(x) > 60)) throw new Error(`rational-eq: ${xs} off the number line`);
  return {
    prompt: ask(lhs, rhs, none),
    text: `rational eq: ${lhs} = ${rhs}`,
    answer: setOf(xs),
    visual: null,
    explain: `${explain} So ${said(xs)}.`,
  };
};
const worded = (words, text, n, d, explain) => ({
  prompt: [T.prose(words)],
  text,
  answer: fracAnswer(n, d),
  visual: null,
  explain,
});
/** "a + b" or "a − b", the second term's sign folded in. */
const plus = (a, b) => (b.startsWith('-') ? `${a} - ${b.slice(1)}` : `${a} + ${b}`);

// --- Clear Denominators ----------------------------------------------------

function clear(rng) {
  const kind = rng.pick(['twoX', 'twoX', 'shifted', 'shifted', 'overX', 'overX2']);
  for (;;) {
    if (kind === 'twoX') {
      const [a, b] = rng.shuffle([2, 3, 4, 5, 6]).slice(0, 2);
      const L = lcm(a, b), sub = rng.chance(0.35);
      const x = L * rng.nonZero(-3, 4);
      if (Math.abs(x) > 60) continue;
      const A = L / a, B = sub ? -(L / b) : L / b;
      const c = x / a + (sub ? -x / b : x / b);
      return equation(`x/${a} ${sub ? '-' : '+'} x/${b}`, String(c), [x],
        `The least common denominator of ${a} and ${b} is ${L}. Multiply every term by ${L}: ${A === 1 ? '' : A}x ${sub ? '−' : '+'} ${Math.abs(B) === 1 ? '' : Math.abs(B)}x = ${minus(c * L)}. `
        + `Collect: ${lin(A + B, 0, true)} = ${minus(c * L)}.`);
    }
    if (kind === 'shifted') {
      const [a, b] = rng.shuffle([2, 3, 4, 5]).slice(0, 2);
      const x = rng.int(-12, 15), r1 = rng.int(-5, 6), r2 = rng.int(-5, 6);
      const p = a * r1 - x, q = b * r2 - x;
      if (p === 0 || q === 0 || Math.abs(p) > 12 || Math.abs(q) > 12) continue;
      const sub = rng.chance(0.5), L = lcm(a, b);
      const c = sub ? r1 - r2 : r1 + r2;
      const A = L / a, B = sub ? -(L / b) : L / b;
      if (A + B === 0) continue;
      const k = A * p + B * q;
      return equation(`(${lin(1, p)})/${a} ${sub ? '-' : '+'} (${lin(1, q)})/${b}`, String(c), [x],
        `The least common denominator of ${a} and ${b} is ${L}. Multiply every term by ${L}: ${coefF(A)}(${lin(1, p, true)}) ${sub ? '−' : '+'} ${coefF(Math.abs(B))}(${lin(1, q, true)}) = ${minus(c * L)}. `
        + `Expand and collect: ${lin(A + B, k, true)} = ${minus(c * L)}, so ${lin(A + B, 0, true)} = ${minus(c * L - k)}.`);
    }
    if (kind === 'overX') {
      const x = rng.nonZero(-12, 12), t = rng.nonZero(-6, 6), m = rng.nonZero(-9, 9);
      const k = t * x, n = m + t;
      return equation(plus(`${k}/x`, String(m)), String(n), [x],
        `x cannot be 0. ${m > 0 ? 'Subtract' : 'Add'} ${Math.abs(m)}: ${minus(k)}/x = ${minus(t)}. `
        + `Multiply both sides by x: ${minus(k)} = ${lin(t, 0, true)}.`);
    }
    // a/x + b/(dx) = c: the least common denominator is dx.
    const d = rng.pick([2, 3]), x = rng.nonZero(-10, 10), c = rng.nonZero(-4, 4), a = rng.nonZero(-9, 9);
    const b = d * c * x - d * a;
    if (b === 0 || Math.abs(b) > 40) continue;
    return equation(plus(`${a}/x`, `${b}/(${d}x)`), String(c), [x],
      `x cannot be 0. The least common denominator of x and ${d}x is ${d}x. Multiply every term by ${d}x: ${minus(d * a)} ${b < 0 ? '−' : '+'} ${Math.abs(b)} = ${lin(d * c, 0, true)}. `
      + `So ${minus(d * a + b)} = ${lin(d * c, 0, true)}.`);
  }
}

// --- Extraneous ------------------------------------------------------------

// requiem: catalogue/content/rational-extraneous-mixes-outcomes
function extraneous(rng) {
  const kind = rng.pick(['one', 'one', 'one', 'both', 'none']);
  if (kind === 'none' && rng.chance(0.5)) {
    // ax/(x − r) = ar/(x − r) + k clears to (a − k)(x − r) = 0: only the excluded value.
    for (;;) {
      const r = rng.nonZero(-7, 8), a = rng.pick([1, 2, 3, 4, -1, -2, 5]), k = rng.nonZero(-5, 5);
      if (k === a) continue;
      const top = a === 1 ? 'x' : `(${lin(a, 0)})`;
      return equation(`${top}/(${lin(1, -r)})`, plus(`${a * r}/(${lin(1, -r)})`, String(k)), [],
        `x cannot be ${minus(r)}, since that makes x ${r < 0 ? '+' : '−'} ${Math.abs(r)} zero. Multiply every term by (${lin(1, -r, true)}): ${lin(a, 0, true)} = ${minus(a * r)} ${k < 0 ? '−' : '+'} ${Math.abs(k)}(${lin(1, -r, true)}). `
        + `Collect: ${lin(a - k, 0, true)} = ${minus((a - k) * r)}, so x = ${minus(r)}. But that is the excluded value: it makes a denominator 0 in the original, so it is extraneous.`, true);
    }
  }
  for (;;) {
    // x/(x − r) − k/(x + t) = M/((x − r)(x + t)) clears to x² + (t − k)x + (kr − M) = 0.
    const r = rng.nonZero(-6, 7), t = rng.nonZero(-6, 6);
    if (r === -t) continue;
    const poles = [r, -t];
    let roots;
    if (kind === 'none') roots = poles;
    else if (kind === 'one') {
      const s = rng.int(-8, 9);
      if (poles.includes(s)) continue;
      roots = [rng.pick(poles), s];
    } else {
      const s1 = rng.int(-8, 9), s2 = rng.int(-8, 9);
      if (s1 === s2 || poles.includes(s1) || poles.includes(s2)) continue;
      roots = [s1, s2];
    }
    roots.sort((p, q) => p - q);
    const [s1, s2] = roots;
    const k = s1 + s2 + t, M = k * r - s1 * s2;
    if (k === 0 || M === 0) continue;
    const den = `(${lin(1, -r)})(${lin(1, t)})`, denF = `(${lin(1, -r, true)})(${lin(1, t, true)})`;
    const lhs = k > 0 ? `x/(${lin(1, -r)}) - ${k}/(${lin(1, t)})` : `x/(${lin(1, -r)}) + ${-k}/(${lin(1, t)})`;
    const xs = roots.filter((s) => !poles.includes(s));
    const verdict = (s) => (poles.includes(s) ? `x = ${minus(s)} is excluded, so it is extraneous` : `x = ${minus(s)} is not excluded, so it stands`);
    return equation(lhs, `${M}/(${den})`, xs,
      `First the excluded values: x cannot be ${minus(r)} or ${minus(-t)}, where a denominator is 0. Multiply every term by ${denF}: `
      + `x(${lin(1, t, true)}) ${k > 0 ? '−' : '+'} ${Math.abs(k)}(${lin(1, -r, true)}) = ${minus(M)}. `
      + `Expand and collect: ${quad(t - k, k * r - M)} = 0, which factors as ${factors(s1, s2)} = 0, so x = ${minus(s1)} or x = ${minus(s2)}. `
      + `${verdict(s1)}; ${verdict(s2)}.`, true);
  }
}

// --- Proportions With x ----------------------------------------------------

function proportion(rng) {
  const kind = rng.pick(['xden', 'xden', 'consts', 'quad', 'quad', 'square']);
  for (;;) {
    if (kind === 'xden') {
      // a/(x + b) = c/(x + d), built from x + b = u and x + d = v with a/u = c/v.
      const x = rng.int(-10, 12), u = rng.nonZero(-8, 8), v = rng.nonZero(-8, 8), g = rng.pick([1, 2, 3, 4, -1, -2]);
      if (u === v) continue;
      const a = g * u, c = g * v, b = u - x, d = v - x;
      return equation(`${a}/${fac(b)}`, `${c}/${fac(d)}`, [x],
        `x cannot be ${minus(-b)} or ${minus(-d)}. Cross-multiply: ${minus(a)}${fac(d, true)} = ${minus(c)}${fac(b, true)}. `
        + `Expand: ${lin(a, a * d, true)} = ${lin(c, c * b, true)}, so ${lin(a - c, 0, true)} = ${minus(c * b - a * d)}. `
        + `Check: x = ${minus(x)} makes the bottoms ${minus(u)} and ${minus(v)}, neither 0.`);
    }
    if (kind === 'consts') {
      // (x + a)/b = (x + c)/d, with x + a = bk and x + c = dk.
      const [b, d] = rng.shuffle([2, 3, 4, 5, 6, 7]).slice(0, 2);
      const x = rng.int(-10, 14), k = rng.nonZero(-4, 5);
      const a = b * k - x, c = d * k - x;
      if (Math.abs(a) > 20 || Math.abs(c) > 20 || a === 0 || c === 0) continue;
      return equation(`(${lin(1, a)})/${b}`, `(${lin(1, c)})/${d}`, [x],
        `Cross-multiply: ${d}(${lin(1, a, true)}) = ${b}(${lin(1, c, true)}). Expand: ${lin(d, d * a, true)} = ${lin(b, b * c, true)}, `
        + `so ${lin(d - b, 0, true)} = ${minus(b * c - d * a)}.`);
    }
    if (kind === 'quad') {
      // (x + a)/b = c/(x + d) cross-multiplies to (x + a)(x + d) = bc, a quadratic.
      const s1 = rng.int(-9, 9), s2 = rng.int(-9, 9), a = rng.nonZero(-6, 6);
      if (s1 >= s2) continue;
      const d = -(s1 + s2) - a, bc = a * d - s1 * s2;
      if (bc === 0) continue;
      const bs = [2, 3, 4, 5, 6].filter((b) => bc % b === 0 && Math.abs(bc / b) <= 30);
      if (!bs.length) continue;
      const b = rng.pick(bs), c = bc / b;
      return equation(`(${lin(1, a)})/${b}`, `${c}/${fac(d)}`, [s1, s2],
        `Cross-multiply: (${lin(1, a, true)})${fac(d, true)} = ${minus(bc)}. Expand: ${quad(a + d, a * d)} = ${minus(bc)}, `
        + `so ${quad(a + d, a * d - bc)} = 0, which factors as ${factors(s1, s2)} = 0: x = ${minus(s1)} or x = ${minus(s2)}. `
        + `Neither makes ${lin(1, d, true)} zero, since the product is ${minus(bc)}, not 0, so both stand.`);
    }
    // x/b = c/x cross-multiplies to x² = bc.
    const s = rng.int(1, 9), bs = [2, 3, 4, 5, 6, 8, 9].filter((b) => (s * s) % b === 0 && b !== s * s);
    if (!bs.length) continue;
    const b = rng.pick(bs), c = (s * s) / b;
    return equation(`x/${b}`, `${c}/x`, [-s, s],
      `x cannot be 0. Cross-multiply: x² = ${b} · ${c} = ${s * s}, so x = ${s} or x = −${s}: a square has two square roots. Neither is 0, so both stand.`);
  }
}

// --- Inverse Variation -----------------------------------------------------

const STORIES = [
  // [the setup, given its x and y; the question, given the new x; what x and y are]
  { set: (x, y) => `${x} workers take ${y} days to build a wall.`, ask: (x) => `At the same rate, how many days do ${x} workers take?`, xs: 'workers', ys: 'days' },
  { set: (x, y) => `At ${x} miles per hour, a trip takes ${y} hours.`, ask: (x) => `How many hours does the same trip take at ${x} miles per hour?`, xs: 'speed', ys: 'hours' },
  { set: (x, y) => `When ${x} friends share the cost of a gift, each pays $${y}.`, ask: (x) => `How much does each pay when ${x} friends share it?`, xs: 'friends', ys: 'dollars each' },
  { set: (x, y) => `A tank drains in ${y} minutes through ${x} open valves.`, ask: (x) => `How many minutes does it take through ${x} valves?`, xs: 'valves', ys: 'minutes' },
];

function variation(rng) {
  for (;;) {
    const kind = rng.pick(['y', 'y', 'x', 'k', 'story', 'story']);
    if (kind === 'story') {
      const st = rng.pick(STORIES);
      const x1 = rng.int(2, 12), y1 = rng.int(2, 15), k = x1 * y1;
      const x2s = [];
      for (let v = 2; v <= 60; v += 1) if (k % v === 0 && v !== x1) x2s.push(v);
      if (!x2s.length) continue;
      const x2 = rng.pick(x2s), y2 = k / x2;
      return worded(`${st.set(x1, y1)} ${st.ask(x2)}`, `inverse variation: y = ${y1} when x = ${x1}; y when x = ${x2}`, y2, 1,
        `The ${st.xs} and the ${st.ys} vary inversely: their product stays the same. ${x1} × ${y1} = ${k}, so the answer is ${k} ÷ ${x2} = ${y2}.`);
    }
    const x1 = rng.nonZero(-9, 12), y1 = rng.nonZero(-9, 12), k = x1 * y1;
    const head = `y varies inversely with x, and y = ${minus(y1)} when x = ${minus(x1)}.`;
    const findK = `Inversely means y = k/x, so k = xy = ${br(x1)} × ${br(y1)} = ${minus(k)}.`;
    if (kind === 'k') {
      return worded(`${head} Find k in y = k/x.`, `inverse variation: y = ${y1} when x = ${x1}; k`, k, 1, findK);
    }
    const v = rng.nonZero(-12, 12);
    if (v === x1 || v === y1) continue;
    const got = fracText(k * Math.sign(v), Math.abs(v));
    if (kind === 'y') {
      return worded(`${head} Find y when x = ${minus(v)}.`, `inverse variation: y = ${y1} when x = ${x1}; y when x = ${v}`, k * Math.sign(v), Math.abs(v),
        `${findK} Then y = k/x = ${minus(k)} ÷ ${br(v)} = ${fancy(got)}.`);
    }
    return worded(`${head} Find x when y = ${minus(v)}.`, `inverse variation: y = ${y1} when x = ${x1}; x when y = ${v}`, k * Math.sign(v), Math.abs(v),
      `${findK} Then x = k/y = ${minus(k)} ÷ ${br(v)} = ${fancy(got)}.`);
  }
}

// --- Work & Rate -----------------------------------------------------------

/** Pairs of times whose combined time is a whole number of hours. */
const PAIRS = [];
for (let a = 2; a <= 40; a += 1) for (let b = a + 1; b <= 90; b += 1) if ((a * b) % (a + b) === 0) PAIRS.push([a, b]);

function work(rng) {
  const kind = rng.pick(['together', 'alone', 'drain', 'current']);
  for (;;) {
    if (kind === 'together') {
      const a = rng.int(2, 30), b = rng.int(2, 30);
      if (a === b) continue;
      if (reduce(a * b, a + b).d > 5) continue;
      const t = fracText(a * b, a + b);
      return worded(`Ana can paint a fence in ${a} hours. Ben can paint it in ${b} hours. How many hours does it take them working together?`,
        `work together: ${a}, ${b}`, a * b, a + b,
        `Ana paints 1/${a} of the fence each hour and Ben 1/${b}. Rates add: 1/${a} + 1/${b} = ${fracText(a + b, a * b)} of the fence each hour. `
        + `The time is the whole job divided by the rate: 1 ÷ (${fracText(a + b, a * b)}) = ${t} hours.`);
    }
    if (kind === 'alone') {
      const [p, q] = rng.pick(PAIRS), t = (p * q) / (p + q);
      const [a, b] = rng.chance(0.5) ? [p, q] : [q, p];
      return worded(`Working together, two pumps empty a pool in ${t} hours. The first alone takes ${a} hours. How many hours does the second take alone?`,
        `work alone: together ${t}, ${a}`, b, 1,
        `Together they do 1/${t} of the job each hour, and the first does 1/${a}. So the second does 1/${t} − 1/${a} = ${fracText(a - t, a * t)} each hour, `
        + `which is the whole job in ${b} hours.`);
    }
    if (kind === 'drain') {
      const a = rng.int(2, 20), b = rng.int(a + 1, 40);
      if (reduce(a * b, b - a).d > 5) continue;
      const t = fracText(a * b, b - a);
      return worded(`A pipe fills a tank in ${a} hours. A drain empties the full tank in ${b} hours. With both open, how many hours does the empty tank take to fill?`,
        `fill drain: ${a}, ${b}`, a * b, b - a,
        `The pipe fills 1/${a} of the tank each hour and the drain takes away 1/${b}. Together: 1/${a} − 1/${b} = ${fracText(b - a, a * b)} each hour, `
        + `so the tank takes 1 ÷ (${fracText(b - a, a * b)}) = ${t} hours.`);
    }
    const v = rng.int(6, 20), c = rng.int(1, v - 2), m = rng.int(1, 4);
    const down = m * (v + c), up = m * (v - c);
    return worded(`A boat goes ${v} miles per hour in still water. It travels ${down} miles downstream in the same time it travels ${up} miles upstream. How fast is the current, in miles per hour?`,
      `current: speed ${v}, downstream ${down}, upstream ${up}`, c, 1,
      `Call the current c. Downstream the boat goes ${v} + c, upstream ${v} − c, and time is distance over speed. The times are equal: ${down}/(${v} + c) = ${up}/(${v} − c). `
      + `Cross-multiply: ${down}(${v} − c) = ${up}(${v} + c), so ${down * v - up * v} = ${down + up}c and c = ${c}.`);
  }
}

const CONTENT = [clear, extraneous, proportion, variation, work];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
