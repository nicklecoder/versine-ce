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

/**
 * "Solve:" and the equation drawn as the expression box draws it. Where a
 * level can have no solution, every row of it says so may be the answer,
 * so the wording gives nothing away; a cube root always has one.
 */
// requiem: catalogue/content/none-offered-on-every-row
function ask(lhs, rhs, none) {
  const drawn = previewOf(`${lhs} = ${rhs}`);
  if (!drawn.ok) throw new Error(`radical-eq: cannot draw ${lhs} = ${rhs}: ${drawn.error}`);
  return [T.prose(none ? 'Solve, or say there is none:' : 'Solve:'), ...drawn.terms];
}
const problem = (lhs, rhs, xs, explain, none = true) => ({
  prompt: ask(lhs, rhs, none),
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
  const kind = rng.pick(['equal', 'equal', 'scaled', 'twice']);
  if (kind === 'twice') {
    // √(x + k) = √x + m: squaring once leaves a root, so square again.
    const m = rng.int(1, 3), t = rng.int(0, 7), k = 2 * m * t + m * m;
    return problem(`sqrt(x + ${k})`, `sqrt(x) + ${m}`, [t * t],
      `Square both sides: x + ${k} = x + ${2 * m}√x + ${m * m}, since (√x + ${m})² has a middle term. The x's cancel: ${2 * m}√x = ${k - m * m}, so √x = ${t}. `
      + `Square again: x = ${t * t}. Check: √(${t * t + k}) = ${t + m} and √${t * t} + ${m} = ${t + m}.`);
  }
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
        + `${v < 0 ? `Both sides are then ∛(${minus(v)}), and a cube root of a negative is a real, negative number, so it stands.` : 'A cube root takes any number, so there is nothing to throw away.'}`, false);
    }
    const r = rng.int(-4, 4);
    const b = r ** 3 - a * x;
    const inside = lin(a, b), insideF = lin(a, b, true);
    if (kind === 'isolate') {
      const k = rng.pick([2, 3, -2]), d = rng.nonZero(-9, 9);
      return problem(`${k}root(3, ${inside})${tail(d)}`, String(k * r + d), [x],
        `Get the root alone: ${d > 0 ? 'subtract' : 'add'} ${Math.abs(d)}, then divide by ${minus(k)}: ∛(${insideF}) = ${minus(r)}. `
        + `Cube both sides: ${insideF} = ${minus(r ** 3)}, so x = ${minus(x)}.${r < 0 ? ` (∛ of a negative is negative: (${minus(r)})³ = ${minus(r ** 3)}, so nothing is extraneous.)` : ''}`, false);
    }
    return problem(`root(3, ${inside})`, String(r), [x],
      `Cube both sides to undo the cube root: ${insideF} = ${minus(r)}³ = ${minus(r ** 3)}, so x = ${minus(x)}. `
      + `${r < 0 ? 'A cube root can be negative, unlike a square root, so this is not a no-solution case.' : 'Cubing never lets in a false answer, so this one needs no throwing away.'}`, false);
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

const CONTENT = [isolate, extraneous, bothSides, cube, rational];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
