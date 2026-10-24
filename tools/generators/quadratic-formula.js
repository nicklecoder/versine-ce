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
  // Exactly: a decimal is not what these levels want, and saying so up front
  // beats marking 0.65 wrong.
  return [T.prose('Solve'), ...r.terms, T.prose('exactly.')];
}
/** The equation and a question about it, with no "Solve" in front. */
function asked(src, ask) {
  const r = previewOf(src);
  if (!r.ok) throw new Error(`quadratic-formula: cannot draw "${src}" — ${r.error}`);
  return [...r.terms, T.prose(ask)];
}
/** √n, and its simplest form when that is different: √45 = 3√5. */
function rootShown(n) {
  const [k, m] = squarePart(n);
  if (k === 1) return `√${n}`;
  return m === 1 ? `√${n} = ${k}` : `√${n} = ${k}√${m}`;
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
      + `which is (${inner})² = ${k}. Root both sides: ${inner} = ±√${k}`
      + `${squarePart(k)[0] > 1 ? `, and ${rootShown(k)}` : ''}. So ${shownRoots(v, 1, b, c)}.`,
  };
}

/** The formula applied, with the discriminant worked out on the way. */
function formulaWorking(a, b, c, v) {
  const D = b * b - 4 * a * c;
  return `a = ${minus(a)}, b = ${minus(b)}, c = ${minus(c)}. `
    + `b² − 4ac = ${b * b} − 4 × ${signed(a)} × ${signed(c)} = ${minus(D)}. `
    + `Into the formula: ${v} = (−(${minus(b)}) ± √${D}) / (2 × ${signed(a)}) = (${minus(-b)} ± √${D}) / ${2 * a}`;
}

function formula(rng) {
  const v = rng.pick(LETTERS);
  const a = rng.pick([1, 2, 2, 3, 3, 4, 5]), b = rng.nonZero(-9, 9), c = rng.nonZero(-9, 9);
  const D = b * b - 4 * a * c;
  // A root that simplifies is the next level but one, so √D is either
  // square-free or whole. Whole roots let an even b in, which a square-free
  // D never does (an even b makes D a multiple of 4).
  const whole = isSquare(D);
  if (D <= 0 || (!whole && squarePart(D)[0] > 1) || gcd(gcd(a, b), c) !== 1) return formula(rng);
  if (whole && rng.chance(0.6)) return formula(rng);
  const src = `${quad(a, b, c, v)} = 0`;
  const r = Math.sqrt(D);
  const finish = whole
    ? `, and √${D} = ${r}: ${v} = (${minus(-b)} + ${r}) / ${2 * a} = ${minus(-b + r)}/${2 * a}`
      + ` or ${v} = (${minus(-b)} − ${r}) / ${2 * a} = ${minus(-b - r)}/${2 * a}. So, in lowest terms, ${shownRoots(v, a, b, c)}.`
    : `. Nothing divides out, so ${shownRoots(v, a, b, c)}.`;
  return {
    prompt: solve(src),
    text: `roots: ${src}`,
    answer: answerOf(v, a, b, c),
    visual: null,
    explain: `${formulaWorking(a, b, c, v)}${finish}`,
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
  const src = `${quad(a, b, c, v)} = 0`;
  // requiem: catalogue/library/exact-levels-require-simplest
  const answer = { ...answerOf(v, a, b, c), requireSimplest: true };
  if (b === 0) {
    // No term in the letter: square roots, not the formula. Only when the
    // square comes out whole, so the root to simplify is of a whole number.
    if (c % a !== 0) return exact(rng);
    const n = -c / a;
    const [p, q] = squarePart(n);
    // Square roots straight away leave nothing to simplify in √11: the
    // level is the simplifying, so only roots that have some are kept.
    if (p === 1) return exact(rng);
    return {
      prompt: solve(src),
      text: `roots: ${src}`,
      answer,
      visual: null,
      explain: `No term in ${v}, so no formula needed: ${a === 1 ? '' : `divide by ${a}: `}${v}² = ${n}, and ${v} = ±√${n}. `
        + `Simplify the root: √${n} = √(${p * p} × ${q}) = ${p}√${q}. So ${shownRoots(v, a, b, c)}.`,
    };
  }
  const g = gcd(gcd(b, k), 2 * a);
  return {
    prompt: solve(src),
    text: `roots: ${src}`,
    answer,
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

/**
 * Which way is least work. Every choice has to be read off the equation's
 * structure, not off a surface feature: there are non-monic equations that
 * factor and monic ones with an odd middle that do not, so neither "a > 1
 * means the formula" nor "a = 1 means factor" scores. Every equation here
 * has real roots, since one with none needs no method at all.
 */
// requiem: catalogue/library/strategy-not-from-surface
function whichMethod(rng, again = null) {
  const v = rng.pick(LETTERS);
  const id = again ?? rng.pick(METHODS).id;
  let a = 1, b, c, why;
  const retry = () => whichMethod(rng, id);
  if (id === 'roots') {
    a = rng.int(1, 5); b = 0; c = -rng.int(2, 60);
    why = `No term in ${v}: ${v}² on its own, then root both sides.`;
  } else if (id === 'factor') {
    if (rng.chance(0.5)) {
      const p = rng.nonZero(-12, 12), q = rng.nonZero(-12, 12);
      [b, c] = [p + q, p * q];
      if (b === 0) return retry();
      why = `It factors: ${minus(Math.min(p, q))} and ${minus(Math.max(p, q))} multiply to ${minus(c)} and add to ${minus(b)}.`;
    } else {
      // (p·v + q)(r·v + s) with something in front: it still factors.
      const p = rng.int(2, 5), q = rng.nonZero(-9, 9), r = rng.int(1, 3), s = rng.nonZero(-9, 9);
      if (gcd(p, q) !== 1 || gcd(r, s) !== 1) return retry();
      [a, b, c] = [p * r, p * s + q * r, q * s];
      if (b === 0 || gcd(gcd(a, b), c) !== 1) return retry();
      const bracket = (m, n) => `(${m === 1 ? '' : m}${v} ${n < 0 ? '−' : '+'} ${Math.abs(n)})`;
      why = `It factors, even with ${a}${v}² in front: ${said(a, b, c, v)} = ${bracket(p, q)}${bracket(r, s)}. Two quick equations from there.`;
    }
  } else if (id === 'complete') {
    b = 2 * rng.nonZero(-8, 8); c = rng.nonZero(-20, 20);
    const D = b * b - 4 * c;
    if (D <= 0 || isSquare(D)) return retry();
    why = `It does not factor (b² − 4ac = ${D} is not a square), but ${v}² stands alone and ${minus(b)} is even: half of it is a whole number, so the square is quick to complete.`;
  } else {
    // Either a monic one with an odd middle, or one with a number in front.
    const monic = rng.chance(0.4);
    a = monic ? 1 : rng.int(2, 5);
    b = monic ? rng.pick([1, 3, 5, 7, 9, 11]) * rng.sign() : rng.nonZero(-9, 9);
    c = rng.nonZero(-12, 12);
    const D = b * b - 4 * a * c;
    if (D <= 0 || isSquare(D) || gcd(gcd(a, b), c) !== 1) return retry();
    why = `It does not factor (b² − 4ac = ${D} is not a square), and `
      + (monic ? `the middle, ${minus(b)}, is odd, so completing the square means halves all the way through.`
        : `with ${a}${v}² in front, completing the square means dividing by ${a} first, and fractions.`)
      + ' The formula does it in one go.';
  }
  const src = `${quad(a, b, c, v)} = 0`;
  return {
    prompt: asked(src, '— which method is least work?'),
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
