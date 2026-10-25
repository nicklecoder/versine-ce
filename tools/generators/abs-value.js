/**
 * Catalogue authoring tool: builds the problem library for abs-value.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 *
 * Every `text` carries the equation or inequality in plain ASCII, bars as
 * |, so scripts/check-answers.py can solve each one for itself.
 */
import * as T from '../terms.js';
import { minus } from '../../web/ui/dom.js';
import { formatSet } from '../../web/math/solutions.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/abs-value.js';

const SIGN = { '<': '<', '<=': '≤', '>': '>', '>=': '≥', '=': '=' };
/** How far, in words, for each sign: |x − 3| ≤ 2 is "at most 2" from 3. */
const HOW = { '<': 'less than', '<=': 'at most', '>': 'more than', '>=': 'at least' };
/** What a distance can never be, for a negative k: "below −6", "−6 or less". */
const NEVER = { '<': (k) => `below ${minus(k)}`, '<=': (k) => `${minus(k)} or less` };
const pretty = (s) => s.replace(/<=/g, '≤').replace(/>=/g, '≥').replace(/-/g, '−');

const frac = (v) => (v === null ? null : { n: v, d: 1 });
const part = (lo, loIn, hi, hiIn) => ({ lo: frac(lo), loIn, hi: frac(hi), hiIn });
const points = (...xs) => [...new Set(xs)].sort((a, b) => a - b).map((x) => part(x, true, x, true));
const answerOf = (parts) => ({ type: 'solutions', value: { letter: 'x', parts } });
const written = (parts) => formatSet({ letter: 'x', parts });

/** m·x + c written plainly: 2x - 3, x + 4, -x. */
const linear = (m, c) => `${m === 1 ? '' : m === -1 ? '-' : m}x${c === 0 ? '' : ` ${c < 0 ? '-' : '+'} ${Math.abs(c)}`}`;

/**
 * What goes inside the bars: m·x + c, built from where it is zero (h) so
 * that every answer is whole. A distance of k = m·t from zero puts x at
 * h ± t.
 */
function inside(rng, { m = rng.pick([1, 1, 1, 2, 3, 4]) } = {}) {
  const h = rng.nonZero(-7, 7);
  return { m, h, c: -m * h, src: linear(m, -m * h) };
}

/** The bars with a number in front and one after: 2|x + 1| - 3. */
function wrap(a, src, b) {
  return `${a === 1 ? '' : a === -1 ? '-' : a}|${src}|${b === 0 ? '' : ` ${b < 0 ? '-' : '+'} ${Math.abs(b)}`}`;
}

/** The isolating sentence, or nothing when the bars already stand alone. */
function isolating(a, b, rhs, k, src) {
  if (a === 1 && b === 0) return '';
  const moved = rhs - b;
  return `${b === 0 ? '' : `${b > 0 ? 'Take' : 'Add'} ${Math.abs(b)} ${b > 0 ? 'from' : 'to'} both sides: `
    + `${a === 1 ? '' : a === -1 ? '−' : minus(a)}|${pretty(src)}| = ${minus(moved)}. `}`
    + `${a === 1 ? '' : `Divide by ${minus(a)}: |${pretty(src)}| = ${minus(k)}. `}`;
}

/** The two cases of |m·x + c| = k, written out. */
function cases({ m, c, src }, k) {
  const hi = (k - c) / m, lo = (-k - c) / m;
  return `${pretty(src)} = ${minus(k)} gives x = ${minus(hi)}; ${pretty(src)} = ${minus(-k)} gives x = ${minus(lo)}`;
}

function distance(rng) {
  const t = rng.chance(0.08) ? 0 : rng.int(1, 40);
  const v = rng.pick(['x', 'x', 'x', 'y', 'n', 'a', 'm']);
  const parts = points(-t, t);
  const said = rng.chance(0.3) ? `${t} = |${v}|` : `|${v}| = ${t}`;
  return {
    prompt: [T.prose(`Solve ${said}.`)],
    text: `solve: ${said}`,
    answer: { type: 'solutions', value: { letter: v, parts } },
    visual: null,
    explain: t === 0 ? `Only 0 is no distance from zero, so there is one answer: ${v} = 0.`
      : `${v} is ${t} from zero, and there are two numbers that far away, one on each side: `
        + `${formatSet({ letter: v, parts })}.`,
  };
}

function twoCases(rng) {
  const g = inside(rng);
  const t = rng.int(1, 8), k = g.m * t;
  const parts = points(g.h - t, g.h + t);
  return {
    prompt: [T.prose(`Solve |${pretty(g.src)}| = ${k}.`)],
    text: `solve: |${g.src}| = ${k}`,
    answer: answerOf(parts),
    visual: null,
    explain: `Whatever is inside the bars is ${k} or −${k}. ${cases(g, k)}. So ${written(parts)}.`,
  };
}

function isolateFirst(rng) {
  const g = inside(rng, { m: rng.pick([1, 1, 2, 3]) });
  const t = rng.int(1, 7), k = g.m * t;
  const a = rng.pick([1, 2, 3, 4, 5, -2, -3]), b = rng.nonZero(-12, 12);
  const rhs = a * k + b;
  const parts = points(g.h - t, g.h + t);
  return {
    prompt: [T.prose(`Solve ${pretty(wrap(a, g.src, b))} = ${minus(rhs)}.`)],
    text: `solve: ${wrap(a, g.src, b)} = ${rhs}`,
    answer: answerOf(parts),
    visual: null,
    explain: `Get the bars alone before splitting. ${isolating(a, b, rhs, k, g.src)}`
      + `Now the two cases: ${cases(g, k)}. So ${written(parts)}.`,
  };
}

/** Two answers, one, or none: the sign of what the bars equal decides. */
function oneTwoNone(rng) {
  const g = inside(rng, { m: rng.pick([1, 1, 2, 3]) });
  const kind = rng.pick(['none', 'none', 'one', 'two', 'two']);
  const t = kind === 'two' ? rng.int(1, 6) : kind === 'one' ? 0 : -rng.int(1, 6);
  const k = g.m * t;
  const a = rng.pick([1, 1, 2, 3]), b = rng.chance(0.6) ? rng.nonZero(-9, 9) : 0;
  const rhs = a * k + b;
  const parts = kind === 'none' ? [] : points(g.h - t, g.h + t);
  const lead = isolating(a, b, rhs, k, g.src) || `The bars are alone: |${pretty(g.src)}| = ${minus(k)}. `;
  return {
    prompt: [T.prose(`Solve ${pretty(wrap(a, g.src, b))} = ${minus(rhs)}.`)],
    text: `solve: ${wrap(a, g.src, b)} = ${rhs}`,
    answer: answerOf(parts),
    visual: null,
    explain: lead + (kind === 'none'
      ? `An absolute value is a distance, and no distance is ${minus(k)}: no solution.`
      : kind === 'one' ? `Only one number makes the inside zero: ${pretty(g.src)} = 0 gives ${written(parts)}.`
        : `Two cases: ${cases(g, k)}. So ${written(parts)}.`),
  };
}

/** |m·x + c| against k, maybe with the bars to isolate first. */
function inequality(rng, side) {
  const g = inside(rng, { m: rng.pick([1, 1, 2, 3]) });
  const op = side === 'less' ? rng.pick(['<', '<=']) : rng.pick(['>', '>=']);
  const negative = rng.chance(0.15);
  const t = negative ? -rng.int(1, 5) : rng.int(1, 7);
  const k = g.m * t;
  const isolate = rng.chance(0.3);
  const a = isolate ? rng.pick([2, 3]) : 1, b = isolate ? rng.nonZero(-9, 9) : 0;
  const rhs = a * k + b;
  const lo = g.h - t, hi = g.h + t, inc = op.length === 2;
  const parts = negative ? (side === 'less' ? [] : [part(null, false, null, false)])
    : side === 'less' ? [part(lo, inc, hi, inc)]
      : [part(null, false, lo, inc), part(hi, inc, null, false)];
  const lead = isolating(a, b, rhs, k, g.src).replace(/ = /g, ` ${SIGN[op]} `);
  const s = SIGN[op];
  const body = negative
    ? (side === 'less' ? `A distance is never negative, so it can never be ${NEVER[op](k)}: nothing works, no solution.`
      : `A distance is never negative, so it is always ${HOW[op]} ${minus(k)}: every number works, all real numbers.`)
    : side === 'less'
      ? `${pretty(g.src)} is ${HOW[op]} ${k} from zero, so it is between −${k} and ${k}: `
        + `−${k} ${s} ${pretty(g.src)} ${s} ${k}. Solve all three parts: ${written(parts)}.`
      : `${pretty(g.src)} is ${HOW[op]} ${k} from zero, so it is below −${k} or above ${k}: `
        + `${pretty(g.src)} ${{ '>': '<', '>=': '≤' }[op]} −${k} or ${pretty(g.src)} ${s} ${k}. `
        + `Solve each: ${written(parts)}.`;
  return {
    prompt: [T.prose(`Solve ${pretty(wrap(a, g.src, b))} ${s} ${minus(rhs)}.`)],
    text: `solve: ${wrap(a, g.src, b)} ${op} ${rhs}`,
    answer: answerOf(parts),
    visual: null,
    explain: lead + body,
  };
}

const SHAPES = [
  { id: 'between', label: 'Between two numbers', note: 'one stretch' },
  { id: 'outside', label: 'Outside two numbers', note: 'two rays, joined by "or"' },
  { id: 'all', label: 'All real numbers' },
  { id: 'none', label: 'No solution' },
];

function shape(rng) {
  const id = rng.pick(['between', 'outside', 'all', 'none']);
  const g = inside(rng, { m: rng.pick([1, 1, 2, 3]) });
  const less = id === 'between' || id === 'none';
  const op = less ? rng.pick(['<', '<=']) : rng.pick(['>', '>=']);
  // Nothing or everything comes from a negative; a zero does it only for < and ≥.
  const k = id === 'between' || id === 'outside' ? rng.int(1, 9)
    : (id === 'none' && op === '<') || (id === 'all' && op === '>=') ? rng.pick([0, -rng.int(1, 6)]) : -rng.int(1, 6);
  const isolate = rng.chance(0.35);
  const a = isolate ? rng.pick([2, 3]) : 1, b = isolate ? rng.nonZero(-9, 9) : 0;
  const rhs = a * k + b;
  const s = SIGN[op];
  const why = {
    between: `${HOW[op]} ${k}, a positive distance: the inside is caught between −${k} and ${k}, one stretch`,
    outside: `${HOW[op]} ${k}, a positive distance: the inside is below −${k} or above ${k}, two rays`,
    all: `${HOW[op]} ${minus(k)}, which every distance is`,
    none: `${HOW[op]} ${minus(k)}, which no distance is`,
  }[id];
  return {
    prompt: [T.prose(`Without solving: what do the solutions of ${pretty(wrap(a, g.src, b))} ${s} ${minus(rhs)} look like?`)],
    text: `shape of: ${wrap(a, g.src, b)} ${op} ${rhs}`,
    answer: { type: 'choice', value: id, options: SHAPES },
    visual: null,
    explain: `${a === 1 && b === 0 ? '' : `With the bars alone it is |${pretty(g.src)}| ${s} ${minus(k)}. `}`
      + `The absolute value is ${why}.`,
  };
}

const CONTENT = [distance, twoCases, isolateFirst, oneTwoNone,
  (rng) => inequality(rng, 'less'), (rng) => inequality(rng, 'more'), shape];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  // The mixed level deals from every level, the strategy level included:
  // its question says "without solving", so the buttons are no surprise.
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
