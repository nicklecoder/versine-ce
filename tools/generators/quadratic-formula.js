/**
 * Catalogue authoring tool: builds the problem library for the quadratic formula.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 *
 * Texts are the equation in plain ASCII after a prefix -- `roots:`,
 * `real roots:`, `square:`, `quickest:` -- so scripts/check-answers.py can
 * test each answer against the equation by its own arithmetic.
 */
import * as T from '../terms.js';
import { minus, signed } from '../../web/ui/dom.js';
import { previewOf } from '../../web/ui/express.js';
import { formatRoots } from '../../web/math/surds.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/quadratic-formula.js';

const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const isSquare = (n) => n >= 0 && Number.isInteger(Math.sqrt(n));
// Never a, b or c: those name the coefficients in the formula's working.
const LETTERS = ['x', 'x', 'x', 'n', 't', 'y'];

/** ax² + bx + c in ASCII, or set for prose. */
function quad(a, b, c, v, { pretty = false } = {}) {
  const terms = [[a, 2], [b, 1], [c, 0]].filter(([k]) => k !== 0);
  return terms.map(([k, p], i) => {
    const letter = p === 0 ? '' : p === 1 ? v : pretty ? `${v}²` : `${v}^2`;
    const body = `${Math.abs(k) === 1 && letter ? '' : Math.abs(k)}${letter}`;
    if (i === 0) return k < 0 ? `${pretty ? '−' : '-'}${body}` : body;
    return `${k < 0 ? (pretty ? ' − ' : ' - ') : ' + '}${body}`;
  }).join('');
}
const said = (a, b, c, v) => quad(a, b, c, v, { pretty: true });
/** A number squared, bracketed only when negative: 7², (−7)². */
const sq = (h) => (h < 0 ? `(${minus(h)})²` : `${h}²`);

/** The largest square dividing n, and what is left: 32 → [4, 2]. */
function squarePart(n) {
  for (let k = Math.floor(Math.sqrt(n)); k > 1; k--) if (n % (k * k) === 0) return [k, n / (k * k)];
  return [1, n];
}
const Q = (n, d) => { const g = gcd(n, d) * Math.sign(d); return { n: n / g, d: d / g }; };

/** The real roots of ax² + bx + c = 0, exactly, as the roots answer holds them. */
function rootsOf(a, b, c) {
  const D = b * b - 4 * a * c;
  if (D < 0) return [];
  if (D === 0) return [{ a: Q(-b, 2 * a), b: { n: 0, d: 1 }, r: 1 }];
  const [k, m] = squarePart(D);
  if (m === 1) {
    return [Q(-b - k, 2 * a), Q(-b + k, 2 * a)].sort((x, y) => x.n / x.d - y.n / y.d)
      .map((x) => ({ a: x, b: { n: 0, d: 1 }, r: 1 }));
  }
  const s = Math.sign(a);
  return [-1, 1].map((pm) => ({ a: Q(-b, 2 * a), b: Q(pm * s * k, 2 * Math.abs(a)), r: m }))
    .sort((x, y) => x.b.n - y.b.n);
}
const answerOf = (v, a, b, c) => ({ type: 'roots', value: { letter: v, roots: rootsOf(a, b, c) } });
const shownRoots = (v, a, b, c) => formatRoots({ letter: v, roots: rootsOf(a, b, c) });

function solve(src) {
  const r = previewOf(src);
  if (!r.ok) throw new Error(`quadratic-formula: cannot draw "${src}" — ${r.error}`);
  return [T.prose('Solve'), ...r.terms, T.prose('.')];
}

/** What makes x² + bx a square: (b/2)². */
function makeSquare(rng) {
  const v = rng.pick(LETTERS);
  const h = rng.nonZero(-12, 12);
  const b = 2 * h;
  const src = quad(1, b, 0, v);
  const r = previewOf(src);
  return {
    prompt: [...r.terms, T.op('+'), T.blank(), T.prose('is a perfect square')],
    text: `square: ${src}`,
    answer: { type: 'int', value: h * h },
    visual: null,
    explain: `Half of ${minus(b)} is ${minus(h)}, and ${sq(h)} = ${h * h}. `
      + `Then ${said(1, b, h * h, v)} = (${v} ${h < 0 ? '−' : '+'} ${Math.abs(h)})². So ${h * h}.`,
  };
}

function completing(rng) {
  const v = rng.pick(LETTERS);
  const h = rng.nonZero(-8, 8), b = 2 * h;
  const c = rng.nonZero(-20, 20);
  const k = h * h - c;
  if (k <= 0 || isSquare(k) && rng.chance(0.7)) return completing(rng);
  const src = `${quad(1, b, c, v)} = 0`;
  const inner = `${v} ${h < 0 ? '−' : '+'} ${Math.abs(h)}`;
  return {
    prompt: solve(src),
    text: `roots: ${src}`,
    answer: answerOf(v, 1, b, c),
    visual: null,
    explain: `Move the number across: ${said(1, b, 0, v)} = ${minus(-c)}. `
      + `Add half of ${minus(b)}, squared, to both sides: ${sq(h)} = ${h * h}, so ${said(1, b, h * h, v)} = ${k}, `
      + `which is (${inner})² = ${k}. Root both sides: ${inner} = ±√${k}. So ${shownRoots(v, 1, b, c)}.`,
  };
}

/** The formula applied, with the discriminant worked out on the way. */
function formulaWorking(a, b, c, v) {
  const D = b * b - 4 * a * c;
  return `a = ${minus(a)}, b = ${minus(b)}, c = ${minus(c)}. `
    + `b² − 4ac = ${b * b} − 4 × ${signed(a)} × ${signed(c)} = ${minus(D)}. `
    + `${v} = (${minus(-b)} ± √${D}) / ${2 * a}`;
}

function formula(rng) {
  const v = rng.pick(LETTERS);
  const a = rng.pick([1, 2, 2, 3, 3, 4, 5]), b = rng.nonZero(-9, 9), c = rng.nonZero(-9, 9);
  const D = b * b - 4 * a * c;
  // Not a perfect-square discriminant every time, nor one that simplifies:
  // that finishing is the next level but one.
  if (D <= 0 || squarePart(D)[0] > 1 || gcd(gcd(a, b), c) !== 1) return formula(rng);
  const src = `${quad(a, b, c, v)} = 0`;
  return {
    prompt: solve(src),
    text: `roots: ${src}`,
    answer: answerOf(v, a, b, c),
    visual: null,
    explain: `${formulaWorking(a, b, c, v)}${isSquare(D) ? `, and √${D} = ${Math.sqrt(D)}` : ''}. So ${shownRoots(v, a, b, c)}.`,
  };
}

function discriminant(rng, again = null) {
  const v = rng.pick(LETTERS);
  const want = again ?? rng.pick([0, 1, 2]);
  let a = rng.pick([1, 1, 2, 3, 4]), b, c;
  if (want === 1) {
    // A perfect square: b² = 4ac.
    const p = rng.int(1, 6), q = rng.nonZero(-10, 10);
    if (gcd(p, q) !== 1) return discriminant(rng, want);
    [a, b, c] = [p * p, 2 * p * q, q * q];
  } else {
    b = rng.int(-10, 10); c = rng.nonZero(-12, 12);
  }
  const D = b * b - 4 * a * c;
  if ((D > 0 ? 2 : D === 0 ? 1 : 0) !== want) return discriminant(rng, want);
  const src = `${quad(a, b, c, v)} = 0`;
  return {
    prompt: [...previewOf(src).terms, T.prose('— how many real solutions?')],
    text: `real roots: ${src}`,
    answer: { type: 'int', value: want },
    visual: null,
    explain: `b² − 4ac = ${b * b} − 4 × ${signed(a)} × ${signed(c)} = ${minus(D)}. `
      + (want === 2 ? 'Positive: the ± gives two different solutions.'
        : want === 1 ? 'Zero: the ± adds and takes away nothing, so one solution.'
          : 'Negative: no real number is its square root, so no real solutions.'),
  };
}

function exact(rng) {
  const v = rng.pick(LETTERS);
  const a = rng.pick([1, 1, 2, 3]), b = rng.int(-10, 10), c = rng.nonZero(-12, 12);
  const D = b * b - 4 * a * c;
  if (D <= 0 || isSquare(D) || gcd(gcd(a, b), c) !== 1) return exact(rng);
  const [k, m] = squarePart(D);
  if (k === 1) return exact(rng);
  const g = gcd(gcd(b, k), 2 * a);
  const src = `${quad(a, b, c, v)} = 0`;
  return {
    prompt: solve(src),
    text: `roots: ${src}`,
    answer: answerOf(v, a, b, c),
    visual: null,
    explain: `${formulaWorking(a, b, c, v)}. Simplify the root: √${D} = √(${k * k} × ${m}) = ${k}√${m}, `
      + `so ${v} = (${minus(-b)} ± ${k}√${m}) / ${2 * a}`
      + `${g > 1 ? `. Every part divides by ${g}` : ''}. So ${shownRoots(v, a, b, c)}.`,
  };
}

const METHODS = [
  { id: 'roots', label: 'Square roots' },
  { id: 'factor', label: 'Factoring' },
  { id: 'complete', label: 'Completing the square' },
  { id: 'formula', label: 'The formula' },
];

function whichMethod(rng, again = null) {
  const v = rng.pick(LETTERS);
  const id = again ?? rng.pick(METHODS).id;
  let a = 1, b, c, why;
  if (id === 'roots') {
    a = rng.int(1, 5); b = 0; c = -rng.int(2, 60);
    why = `No term in ${v}: ${v}² on its own, then root both sides.`;
  } else if (id === 'factor') {
    const p = rng.nonZero(-12, 12), q = rng.nonZero(-12, 12);
    [b, c] = [p + q, p * q];
    if (b === 0) return whichMethod(rng, id);
    why = `It factors: ${minus(Math.min(p, q))} and ${minus(Math.max(p, q))} multiply to ${minus(c)} and add to ${minus(b)}.`;
  } else if (id === 'complete') {
    b = 2 * rng.nonZero(-8, 8); c = rng.nonZero(-20, 20);
    if (isSquare(b * b - 4 * c)) return whichMethod(rng, id);
    why = `It does not factor, but ${v}² stands alone and ${minus(b)} is even: half of it is a whole number, so the square is quick to complete.`;
  } else {
    a = rng.int(2, 5); b = rng.pick([1, 3, 5, 7, 9]) * (rng.chance(0.5) ? -1 : 1); c = rng.nonZero(-9, 9);
    if (isSquare(b * b - 4 * a * c) || gcd(gcd(a, b), c) !== 1) return whichMethod(rng, id);
    why = `It does not factor, and with ${a}${v}² in front and an odd middle, completing the square means fractions. The formula does it in one go.`;
  }
  const src = `${quad(a, b, c, v)} = 0`;
  return {
    prompt: [...solve(src).slice(0, -1), T.prose('— which way is least work?')],
    text: `quickest: ${src}`,
    answer: { type: 'choice', value: id, options: METHODS },
    visual: null,
    explain: why,
  };
}

const CONTENT = [makeSquare, completing, formula, discriminant, exact, whichMethod];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(1, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
