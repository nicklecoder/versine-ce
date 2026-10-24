/**
 * Catalogue authoring tool: builds the problem library for radical-eq.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 *
 * Every `text` is the equation in the ASCII the expression box reads,
 * sqrt(), root(3, ) and ^(p/q) included, so scripts/check-answers.py can
 * evaluate both sides and find every solution itself, extraneous ones left
 * out because they do not satisfy it.
 */
import * as T from '../terms.js';
import { minus } from '../../web/ui/dom.js';
import { previewOf } from '../../web/ui/express.js';
import { normalize, formatSet } from '../../web/math/solutions.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/radical-eq.js';

const pm = (k, fancy = true) => (k < 0 ? `${fancy ? ' − ' : ' - '}${-k}` : ` + ${k}`);
/** ax + b: 3x - 5, -x + 2, 2x. */
function lin(a, b, fancy = false) {
  const lead = a === 0 ? '' : a === 1 ? 'x' : a === -1 ? (fancy ? '−x' : '-x') : `${fancy ? minus(a) : a}x`;
  if (!lead) return fancy ? minus(b) : String(b);
  return b === 0 ? lead : `${lead}${pm(b, fancy)}`;
}
const coef = (a) => (a === 1 ? '' : a === -1 ? '-' : String(a));
const coefF = (a) => (a === 1 ? '' : a === -1 ? '−' : minus(a));
const tail = (d) => (d === 0 ? '' : pm(d, false));
const tailF = (d) => (d === 0 ? '' : pm(d));

const setOf = (xs) => {
  const parts = [...new Set(xs)].sort((p, q) => p - q).map((x) => ({ lo: { n: x, d: 1 }, loIn: true, hi: { n: x, d: 1 }, hiIn: true }));
  return { type: 'solutions', value: { letter: 'x', parts: normalize(parts) } };
};
const said = (xs) => (xs.length ? formatSet(setOf(xs).value) : 'no solution');

// requiem: catalogue/content/radical-eq-asks-for-none
/**
 * "Solve", the equation drawn as the expression box draws it, and that
 * there may be none: a fifth of these have no solution, and the solutions
 * box reads "none" and "no solution" as the empty set.
 */
function ask(lhs, rhs) {
  const drawn = previewOf(`${lhs} = ${rhs}`);
  if (!drawn.ok) throw new Error(`radical-eq: cannot draw ${lhs} = ${rhs}: ${drawn.error}`);
  return [T.prose('Solve'), ...drawn.terms, T.prose('.'), T.prose('Give every solution, or say there is none.')];
}
const problem = (lhs, rhs, xs, explain) => ({
  prompt: ask(lhs, rhs),
  text: `radical: ${lhs} = ${rhs}`,
  answer: setOf(xs),
  visual: null,
  explain: `${explain} So ${said(xs)}.`,
});

// --- Isolate & Square ------------------------------------------------------

function isolate(rng) {
  const b = rng.pick([1, 1, 2, 3, -1, 4, 5]);
  const x = rng.int(-10, 15), r = rng.int(0, 8);
  const c = r * r - b * x;
  const inside = lin(b, c), insideF = lin(b, c, true);
  const a = rng.pick([1, 1, 2, 3, 4, 5]), d = rng.chance(0.6) ? rng.nonZero(-9, 9) : 0;
  const lhs = `${coef(a)}sqrt(${inside})${tail(d)}`;
  if (rng.chance(0.12)) {
    // The root would have to be negative: no solution, however it squares.
    const m = rng.int(1, 6);
    const rhs = String(-a * m + d);
    return problem(lhs, rhs, [],
      `Get the root on its own: ${d ? `${d > 0 ? 'subtract' : 'add'} ${Math.abs(d)}, ` : ''}${a !== 1 ? `divide by ${a}, ` : ''}which leaves √(${insideF}) = −${m}. `
      + `A square root is never negative, so nothing works. (Squaring anyway gives ${insideF} = ${m * m}, an answer that fails when it is put back.)`);
  }
  const rhs = String(a * r + d);
  return problem(lhs, rhs, [x],
    `Get the root on its own first: ${d ? `${d > 0 ? 'subtract' : 'add'} ${Math.abs(d)}${a !== 1 ? ', then ' : ''}` : ''}${a !== 1 ? `divide by ${a}` : ''}${d || a !== 1 ? ': ' : ''}√(${insideF}) = ${r}. `
    + `Square both sides: ${insideF} = ${r * r}, so x = ${minus(x)}. Check: √(${minus(b * x + c)}) = ${r}, which works.`);
}

// --- Extraneous Roots ------------------------------------------------------

/** (x − r)(x − s), the factored quadratic, written out. */
const factor = (r) => (r === 0 ? 'x' : `(${lin(1, -r, true)})`);
const factors = (r1, r2) => (r2 === 0 ? `${factor(r2)}${factor(r1)}` : `${factor(r1)}${factor(r2)}`);

// requiem: catalogue/content/extraneous-level-mixes-outcomes
function extraneous(rng) {
  for (;;) {
    const r1 = rng.int(-8, 10), r2 = rng.int(-8, 10), s = rng.int(-6, 6);
    if (r1 >= r2) continue;
    const ok1 = r1 + s >= 0, ok2 = r2 + s >= 0;
    const kind = rng.pick(['one', 'one', 'one', 'both', 'none']);
    if ((kind === 'one') !== (ok1 !== ok2) || (kind === 'both' && !(ok1 && ok2)) || (kind === 'none' && (ok1 || ok2))) continue;
    const p = 2 * s + r1 + r2, q = s * s - r1 * r2;
    if (p === 0) continue;
    const inside = lin(p, q), insideF = lin(p, q, true);
    const right = lin(1, s), rightF = lin(1, s, true);
    const B = 2 * s - p, C = s * s - q;
    const qText = `x²${B === 0 ? '' : B === 1 ? ' + x' : B === -1 ? ' − x' : `${pm(B)}x`}${C === 0 ? '' : pm(C)}`;
    const check = (r, ok) => `x = ${minus(r)}: √(${minus(p * r + q)}) = ${Math.abs(r + s)}, and the right side is ${minus(r + s)}, ${ok ? 'so it works' : 'so it is extraneous'}`;
    const xs = [ok1 ? r1 : null, ok2 ? r2 : null].filter((v) => v !== null);
    const moved = rng.chance(0.3);
    const lhs = moved ? `sqrt(${inside})${tail(-s)}` : `sqrt(${inside})`;
    const rhs = moved ? 'x' : right;
    return problem(lhs, rhs, xs,
      `${moved ? `Get the root on its own: √(${insideF}) = ${rightF}. ` : ''}Square both sides: ${insideF} = ${s === 0 ? 'x²' : `(${rightF})², which is ${insideF} = x²${pm(2 * s)}x${pm(s * s)}`}`
      + `. Collect on one side: ${qText} = 0, which factors as ${factors(r1, r2)} = 0, so x = ${minus(r1)} or x = ${minus(r2)}. `
      + `Squaring can let in an answer that makes the right side negative, so check both in the original: ${check(r1, ok1)}; ${check(r2, ok2)}.`);
  }
}

// --- Both Sides Radical ----------------------------------------------------

function bothSides(rng) {
  const kind = rng.pick(['equal', 'equal', 'scaled']);
  for (;;) {
    const x = rng.int(-8, 12);
    const v = rng.chance(0.25) ? rng.int(-9, -1) : rng.int(0, 30);
    if (kind === 'scaled') {
      const k = rng.pick([2, 3]), a = rng.pick([1, 2, 3, 5, 6, 7, -1]);
      if (a === k * k) continue;
      const c = v - x, b = k * k * v - a * x;
      const L = lin(a, b), R = lin(1, c);
      const ok = v >= 0;
      return problem(`sqrt(${L})`, `${k}sqrt(${R})`, ok ? [x] : [],
        `Square both sides: ${lin(a, b, true)} = ${k * k}(${lin(1, c, true)}), since (${k}√(…))² = ${k * k}(…). So ${lin(a, b, true)} = ${lin(k * k, k * k * c, true)}, and x = ${minus(x)}. `
        + (ok ? `Check: both roots are of numbers 0 or more: √${b + a * x} = ${k}√${v}.`
          : `Check: then ${lin(1, c, true)} = ${minus(v)}, and a square root of a negative is not a real number, so x = ${minus(x)} is extraneous.`));
    }
    const a = rng.pick([1, 2, 3, 4, 5, -1, -2]), c = rng.pick([1, 2, 3, 4, 5, -1, -3]);
    if (a === c) continue;
    const b = v - a * x, d = v - c * x;
    const ok = v >= 0;
    return problem(`sqrt(${lin(a, b)})`, `sqrt(${lin(c, d)})`, ok ? [x] : [],
      `Square both sides: ${lin(a, b, true)} = ${lin(c, d, true)}, so ${a - c === 1 ? '' : `${lin(a - c, 0, true)} = ${minus(d - b)} and `}x = ${minus(x)}. `
      + (ok ? `Check: both sides are √${v}, which is a real number.`
        : `Check: both sides become √(${minus(v)}), the square root of a negative, which is not a real number. So x = ${minus(x)} is extraneous.`));
  }
}

// --- Square Twice ----------------------------------------------------------

/** √(x + b), or √x, as the box reads it and as it is shown. */
const rootA = (b) => (b === 0 ? 'sqrt(x)' : `sqrt(${lin(1, b)})`);
const rootF = (b) => (b === 0 ? '√x' : `√(${lin(1, b, true)})`);

// requiem: catalogue/content/square-twice-level
/**
 * Squaring once leaves a root behind, so it is got alone and squared again.
 * Four shapes: √(x + a) = √(x + b) + c and the same as a difference, the x's
 * cancelling; √(px + a) = √(x + b) + c, which leaves a quadratic in
 * u = √(x + b); and √x + √(x + a) = c, a sum. Each is built from u, the
 * second root's value, so a u below 0 is an answer the second squaring lets
 * in and the check throws out.
 */
function squareTwice(rng) {
  for (;;) {
    const kind = rng.pick(['cancel', 'cancel', 'difference', 'quadratic', 'quadratic', 'sum']);
    const b = rng.chance(0.4) ? 0 : rng.nonZero(-6, 6);
    const B = rootF(b), BA = rootA(b), inner = lin(1, b, true);
    if (kind === 'cancel' || kind === 'difference') {
      // √(x + a) = √(x + b) + c, with √(x + b) = u: a − b = 2cu + c².
      const c = rng.int(1, 4), u = rng.chance(0.2) ? -rng.int(1, 3) : rng.int(0, 6);
      const a = b + 2 * c * u + c * c;
      if (a === b) continue;
      const x = u * u - b;
      const ok = u >= 0;
      const lhs = kind === 'cancel' ? rootA(a) : `${rootA(a)} - ${BA}`;
      const rhs = kind === 'cancel' ? `${BA} + ${c}` : String(c);
      const first = kind === 'cancel' ? '' : `Move one root across first, so that squaring leaves only one: ${rootF(a)} = ${B} + ${c}. `;
      return problem(lhs, rhs, ok ? [x] : [],
        `${first}Square both sides: ${lin(1, a, true)} = ${inner} + ${2 * c}${B} + ${c * c}, since (${B} + ${c})² has a middle term, 2 · ${c} · ${B}. `
        + `The x's cancel: ${2 * c}${B} = ${minus(a - b - c * c)}, so ${B} = ${minus(u)}. `
        + (ok ? `Square again: ${inner} = ${u * u}${b === 0 ? '' : `, so x = ${minus(x)}`}. Check: ${rootF(a)} = √${u * u + a - b} = ${u + c}, and ${B} + ${c} = ${u} + ${c} = ${u + c}, which works.`
          : `A square root is never negative, so nothing works. (Squaring again gives x = ${minus(x)}, but then ${rootF(a)} = ${Math.abs(u + c)} while ${B} + ${c} = ${Math.abs(u) + c}: it is extraneous.)`));
    }
    if (kind === 'quadratic') {
      // √(px + a) = √(x + b) + c: with u = √(x + b), (p − 1)u² − 2cu + (a − pb − c²) = 0.
      const p = rng.pick([2, 2, 3]), c = rng.int(1, 3);
      const sum = (2 * c) / (p - 1);
      if (!Number.isInteger(sum)) continue;
      const u1 = rng.int(-2, sum + 2), u2 = sum - u1;
      if (u1 > u2 || (u1 < 0 && u2 < 0)) continue;
      const a = (p - 1) * u1 * u2 + p * b + c * c;
      const cands = [...new Set([u1, u2])];
      const xs = cands.filter((u) => u >= 0).map((u) => u * u - b);
      const L = lin(p, a, true);
      const qA = p - 1, qB = -2 * c, qC = a - p * b - c * c;
      const lead = qA === 1 ? '' : String(qA);
      const quad = `${lead}u²${pm(qB)}u${qC === 0 ? '' : pm(qC)}`;
      const fac = (u) => (u === 0 ? 'u' : `(u${pm(-u)})`);
      const facs = cands.length === 1 ? `${lead}(u${pm(-u1)})²` : `${lead}${fac(u1)}${fac(u2)}`;
      const check = (u) => (u >= 0
        ? `u = ${u} gives x = ${minus(u * u - b)}, where √${p * (u * u - b) + a} = ${u + c} and ${B} + ${c} = ${u} + ${c} = ${u + c}, so it works`
        : `u = ${minus(u)} would be a square root below 0, so x = ${minus(u * u - b)} is extraneous`);
      return problem(`sqrt(${lin(p, a)})`, `${BA} + ${c}`, xs,
        `Square both sides: ${L} = ${inner} + ${2 * c}${B} + ${c * c}. A root is still left, ${B}, so call it u: then x = u²${b === 0 ? '' : pm(-b)} and ${L} = ${p}u²${a - p * b === 0 ? '' : pm(a - p * b)}. `
        + `So ${p}u²${a - p * b === 0 ? '' : pm(a - p * b)} = u² + ${2 * c}u + ${c * c}, which is ${quad} = 0, or ${facs} = 0. `
        + `Check each in the original: ${cands.map(check).join('; ')}.`);
    }
    // √x + √(x + a) = c: √(x + a) = c − √x, squared, a = c² − 2c√x.
    const c = rng.int(2, 7), t = rng.chance(0.25) ? -rng.int(1, 2) : rng.int(0, c - 1);
    const a = c * c - 2 * c * t;
    if (a === 0) continue;
    const x = t * t, ok = t >= 0;
    return problem(`sqrt(x) + ${rootA(a)}`, String(c), ok ? [x] : [],
      `Get one root alone: ${rootF(a)} = ${c} − √x. Square both sides: x${pm(a)} = ${c * c} − ${2 * c}√x + x. `
      + `The x's cancel: ${2 * c}√x = ${minus(c * c - a)}, so √x = ${minus(t)}. `
      + (ok ? `Square again: x = ${x}. Check: √${x} + √${x + a} = ${t} + ${c - t} = ${c}, which works.`
        : `A square root is never negative, so nothing works. (Squaring again gives x = ${x}, but then √${x} + √${x + a} = ${Math.abs(t)} + ${Math.abs(c - t)} = ${Math.abs(t) + Math.abs(c - t)}, not ${c}: it is extraneous.)`));
  }
}

// --- Cube Roots ------------------------------------------------------------

function cube(rng) {
  const kind = rng.pick(['plain', 'plain', 'isolate', 'both']);
  for (;;) {
    const x = rng.int(-10, 12), a = rng.pick([1, 1, 2, 3, -1, 4]);
    if (kind === 'both') {
      const c = rng.pick([1, 2, 3, -1, 5]), v = rng.int(-30, 30);
      if (a === c) continue;
      const b = v - a * x, d = v - c * x;
      return problem(`root(3, ${lin(a, b)})`, `root(3, ${lin(c, d)})`, [x],
        `Cube both sides: ${lin(a, b, true)} = ${lin(c, d, true)}, so ${a - c === 1 ? '' : `${lin(a - c, 0, true)} = ${minus(d - b)} and `}x = ${minus(x)}. `
        + `${v < 0 ? `Both sides are then ∛(${minus(v)}), and a cube root of a negative is a real, negative number, so it stands.` : 'A cube root takes any number, so there is nothing to throw away.'}`);
    }
    const r = rng.int(-4, 4);
    const b = r ** 3 - a * x;
    const inside = lin(a, b), insideF = lin(a, b, true);
    if (kind === 'isolate') {
      const k = rng.pick([2, 3, -2]), d = rng.nonZero(-9, 9);
      return problem(`${k}root(3, ${inside})${tail(d)}`, String(k * r + d), [x],
        `Get the root alone: ${d > 0 ? 'subtract' : 'add'} ${Math.abs(d)}, then divide by ${minus(k)}: ∛(${insideF}) = ${minus(r)}. `
        + `Cube both sides: ${insideF} = ${minus(r ** 3)}, so x = ${minus(x)}.${r < 0 ? ` (∛ of a negative is negative: (${minus(r)})³ = ${minus(r ** 3)}, so nothing is extraneous.)` : ''}`);
    }
    return problem(`root(3, ${inside})`, String(r), [x],
      `Cube both sides to undo the cube root: ${insideF} = ${minus(r)}³ = ${minus(r ** 3)}, so x = ${minus(x)}. `
      + `${r < 0 ? 'A cube root can be negative, unlike a square root, so this is not a no-solution case.' : 'Cubing never lets in a false answer, so this one needs no throwing away.'}`);
  }
}

// --- Rational Exponents ----------------------------------------------------

const POWERS = [[3, 2], [3, 2], [1, 2], [2, 3], [2, 3], [1, 3], [3, 4], [4, 3]];

function rational(rng) {
  for (;;) {
    const [p, q] = rng.pick(POWERS);
    const b = rng.chance(0.5) ? 0 : rng.nonZero(-6, 6);
    const base = b === 0 ? 'x' : `(${lin(1, b)})`, baseF = b === 0 ? 'x' : `(${lin(1, b, true)})`;
    const bare = lin(1, b, true);
    const k = rng.pick([1, 1, 1, 2, 3]), d = rng.chance(0.4) ? rng.nonZero(-9, 9) : 0;
    const lhs = `${coef(k)}${base}^(${p}/${q})${tail(d)}`;
    const iso = d || k !== 1 ? `Get the power alone: ${d ? `${d > 0 ? 'subtract' : 'add'} ${Math.abs(d)}` : ''}${d && k !== 1 ? ', then ' : ''}${k !== 1 ? `divide by ${k}` : ''}. ` : '';
    if (rng.chance(0.12) && (p % 2 === 0 || q % 2 === 0)) {
      // An even root, or an even power, can never be negative.
      const c = -rng.int(1, 9);
      return problem(lhs, String(k * c + d), [],
        `${iso}${baseF}^(${p}/${q}) = ${minus(c)}. ${q % 2 === 0 ? `The ${q === 2 ? 'square' : 'fourth'} root of a number is never negative, so neither is its power` : `This is a cube root raised to the even power ${p}, which is never negative`}. No x works.`);
    }
    // t is the root of the base: base = t^q, and the value is t^p.
    const t = q % 2 === 0 ? rng.int(0, 4) : rng.nonZero(-4, 4);
    if (Math.abs(t ** q) > 300 || Math.abs(t ** p) > 300) continue;
    const c = t ** p;
    const bases = p % 2 === 0 && q % 2 === 1 ? [t ** q, -(t ** q)] : [t ** q];
    const xs = [...new Set(bases.map((v) => v - b))];
    return problem(lhs, String(k * c + d), xs,
      `${iso}${baseF}^(${p}/${q}) = ${minus(c)}. Raise both sides to the power ${q}/${p}, which undoes ${p}/${q}`
      + `${p % 2 === 0 && q % 2 === 1 ? `, and since ${p} is even, ${minus(c)} = (±${Math.abs(t)})^${p}: both the positive and the negative root count` : ''}: `
      + `${bases.map((v) => `${bare} = ${minus(v)}`).join(' or ')}${b ? `, so ${xs.map((v) => `x = ${minus(v)}`).join(' or ')}` : ''}. `
      + `${q % 2 === 0 ? `An even root needs a base of 0 or more, and ${minus(t ** q)} is.` : 'An odd root takes negatives, so every answer stands.'}`);
  }
}

const CONTENT = [isolate, extraneous, bothSides, squareTwice, cube, rational];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
