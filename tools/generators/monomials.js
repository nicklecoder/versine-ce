/**
 * Catalogue authoring tool: builds the problem library for monomials.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 *
 * Every `text` is the expression to simplify in plain ASCII, so
 * scripts/check-answers.py can compare the answer with it by value.
 */
import * as T from '../terms.js';
import { minus, signed } from '../../web/ui/dom.js';
import { previewOf } from '../../web/ui/express.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/monomials.js';

const LETTERS = [['x'], ['x'], ['a'], ['n'], ['x', 'y'], ['a', 'b'], ['m', 'n']];
const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const sup = (n) => String(n).replace(/[-\d]/g, (c) => SUP[c]);

/**
 * A monomial c·x^p·y^q as { c, pow: { x: p, y: q } }. Written in ASCII for
 * answers and texts (12x^5y^2), or set with superscripts for prose (12x⁵y²).
 * A power of 0 drops the letter; a power of 1 is unwritten.
 */
function write({ c, pow }, { pretty = false } = {}) {
  const letters = Object.entries(pow).filter(([, p]) => p !== 0)
    .map(([v, p]) => (p === 1 ? v : pretty ? `${v}${sup(p)}` : `${v}^${p}`)).join('');
  const sign = c < 0 ? (pretty ? '−' : '-') : '';
  const size = Math.abs(c) === 1 && letters ? '' : String(Math.abs(c));
  return `${sign}${size}${letters}`;
}

/**
 * The finished form of c·x^p…, with any negative power moved below a
 * fraction bar: 4x^-2 is 4/x^2, and 3a^-2b is 3b/a^2.
 */
function finished({ c, pow }) {
  const up = {}, down = {};
  for (const [v, p] of Object.entries(pow)) {
    if (p > 0) up[v] = p;
    if (p < 0) down[v] = -p;
  }
  const top = write({ c, pow: up });
  if (!Object.keys(down).length) return top;
  const bottom = write({ c: 1, pow: down });
  return `${top}/${Object.keys(down).length > 1 ? `(${bottom})` : bottom}`;
}

const term = (m) => `(${write(m)})`;
const powers = (rng, letters, lo, hi) => Object.fromEntries(letters.map((v) => [v, rng.int(lo, hi)]));
const coeff = (rng, lo, hi) => rng.nonZero(lo, hi);

function asks(src) {
  const r = previewOf(src);
  if (!r.ok) throw new Error(`monomials: cannot draw "${src}" — ${r.error}`);
  return [...r.terms, T.op('='), T.blank()];
}

const product = (a, b) => ({ c: a.c * b.c,
  pow: Object.fromEntries(Object.keys({ ...a.pow, ...b.pow }).map((v) => [v, (a.pow[v] ?? 0) + (b.pow[v] ?? 0)])) });

/** "add the powers of x: 2 + 5 = 7", for each letter. */
const sums = (a, b, op) => Object.keys({ ...a.pow, ...b.pow })
  .map((v) => `${v}: ${a.pow[v] ?? 0} ${op === '+' ? '+' : '−'} ${b.pow[v] ?? 0} = ${minus(op === '+' ? (a.pow[v] ?? 0) + (b.pow[v] ?? 0) : (a.pow[v] ?? 0) - (b.pow[v] ?? 0))}`)
  .join(', ');

function multiplying(rng) {
  const letters = rng.pick(LETTERS);
  const a = { c: coeff(rng, -9, 9), pow: powers(rng, letters, 1, 7) };
  const b = { c: coeff(rng, -9, 9), pow: powers(rng, letters, 0, 6) };
  if (Object.values(b.pow).every((p) => p === 0)) b.pow[letters[0]] = 1;
  const out = product(a, b);
  const src = `${term(a)}${term(b)}`;
  return {
    prompt: asks(src),
    text: `simplify: ${src}`,
    answer: { type: 'expr', value: write(out) },
    visual: null,
    explain: `Multiply the numbers: ${minus(a.c)} × ${signed(b.c)} = ${minus(out.c)}. `
      + `Same letter, add the powers (${sums(a, b, '+')}). `
      + `${letters.some((v) => b.pow[v] === 1) ? 'A letter with no power written has power 1. ' : ''}`
      + `So ${write(out, { pretty: true })}.`,
  };
}

function dividing(rng) {
  const letters = rng.pick(LETTERS);
  const q = { c: coeff(rng, -9, 9), pow: powers(rng, letters, 1, 6) };
  const d = { c: coeff(rng, -6, 6), pow: powers(rng, letters, 0, 5) };
  if (Math.abs(d.c) === 1 && Object.values(d.pow).every((p) => p === 0)) return dividing(rng);
  const top = product(q, d);
  const src = `(${write(top)})/(${write(d)})`;
  return {
    prompt: asks(src),
    text: `simplify: ${src}`,
    answer: { type: 'expr', value: write(q) },
    visual: null,
    explain: `Divide the numbers: ${minus(top.c)} ÷ ${signed(d.c)} = ${minus(q.c)}. `
      + `Same letter, take the powers away (${sums(top, d, '-')}). So ${write(q, { pretty: true })}.`,
  };
}

function power(rng) {
  const letters = rng.pick(LETTERS);
  const n = rng.int(2, 4);
  const base = { c: rng.pick([1, 2, 3, -1, -2, -3, 4, 5].filter((c) => Math.abs(c) ** n <= 256)),
    pow: powers(rng, letters, 1, 5) };
  const out = { c: base.c ** n, pow: Object.fromEntries(letters.map((v) => [v, base.pow[v] * n])) };
  const src = `(${write(base)})^${n}`;
  return {
    prompt: asks(src),
    text: `simplify: ${src}`,
    answer: { type: 'expr', value: write(out) },
    visual: null,
    explain: `Everything inside is raised to the ${n}. The number: ${signed(base.c)}${sup(n)} = ${minus(out.c)}`
      + `${base.c < 0 ? (n % 2 ? ', negative, since the power is odd' : ', positive, since the power is even') : ''}. `
      + `Each letter, multiply the powers: ${letters.map((v) => `${v}: ${base.pow[v]} × ${n} = ${out.pow[v]}`).join(', ')}. `
      + `So ${write(out, { pretty: true })}.`,
  };
}

/** Negative and zero powers, finished with positive powers only. */
function zeroNegative(rng) {
  const letters = rng.pick(LETTERS);
  const shape = rng.pick(['negative', 'negative', 'mixed', 'zero', 'below', 'quotient']);
  let src, out, why;
  if (shape === 'zero') {
    const m = { c: coeff(rng, -9, 9), pow: powers(rng, letters, 1, 5) };
    const v = letters[letters.length - 1];
    const zeroed = { ...m, pow: { ...m.pow, [v]: 0 } };
    // The rest of the term, then the letter with its 0 written: 5x^2y^0, or -y^0.
    const rest = write({ c: m.c, pow: Object.fromEntries(letters.map((l) => [l, l === v ? 0 : m.pow[l]])) });
    const lead = /[a-z]/.test(rest) || Math.abs(m.c) !== 1 ? rest : rest.replace('1', '');
    src = rng.chance(0.5) ? `${lead}${v}^0` : `(${write(m)})^0`;
    out = src.includes(')^0') ? { c: 1, pow: {} } : zeroed;
    why = src.includes(')^0') ? 'Anything (but 0) to the power 0 is 1, and the bracket makes the whole thing the base.'
      : `${v}⁰ = 1, so the ${v} goes and nothing else changes.`;
  } else if (shape === 'below') {
    const v = letters[0], p = rng.int(1, 6);
    src = `1/${v}^-${p}`;
    out = { c: 1, pow: { [v]: p } };
    why = `1 over ${v}⁻${sup(p).slice(1)} is ${v}${sup(p)}: a negative power below the line is a positive one above it.`;
  } else if (shape === 'quotient') {
    const v = letters[0];
    const a = rng.int(1, 5), b = rng.int(a + 1, 9), c = rng.nonZero(-6, 6);
    src = `(${write({ c, pow: { [v]: a } })})/${v}^${b}`;
    out = { c, pow: { [v]: a - b } };
    why = `Take the powers away: ${a} − ${b} = ${minus(a - b)}, so ${v}${sup(a - b)}, which is 1 over ${v}${sup(b - a)}.`;
  } else {
    const m = { c: coeff(rng, -9, 9), pow: powers(rng, letters, -6, -1) };
    if (shape === 'mixed' && letters.length > 1) m.pow[letters[0]] = rng.int(1, 5);
    src = write(m);
    out = m;
    why = 'A negative power is one over the positive power: move each letter with a negative power below the line, '
      + 'and leave the number where it is.';
  }
  return {
    prompt: asks(src),
    text: `positive powers: ${src}`,
    answer: { type: 'expr', value: finished(out) },
    visual: null,
    explain: `${why} So ${finished(out).replace(/\^(\d+)/g, (_, p) => sup(p)).replace(/-/g, '−')}.`,
  };
}

/** Two or three rules in a row, ending in one term. */
function simplest(rng) {
  const letters = rng.pick([['x'], ['a'], ['x', 'y'], ['a', 'b']]);
  const shape = rng.pick(['power-times', 'power-over', 'times-over']);
  const n = rng.int(2, 3);
  const base = { c: rng.pick([1, 2, 3, -1, -2]), pow: powers(rng, letters, 1, 4) };
  const raised = { c: base.c ** n, pow: Object.fromEntries(letters.map((v) => [v, base.pow[v] * n])) };
  const other = { c: coeff(rng, -6, 6), pow: powers(rng, letters, 0, 4) };
  let src, out, steps;
  if (shape === 'power-times') {
    src = `(${write(base)})^${n}${term(other)}`;
    out = product(raised, other);
    steps = `The power first: (${write(base, { pretty: true })})${sup(n)} = ${write(raised, { pretty: true })}. `
      + `Then multiply: ${write(out, { pretty: true })}.`;
  } else {
    const top = shape === 'power-over' ? raised : product(base, other);
    // The divisor goes into the top exactly, number and letters, so the answer is one whole term.
    const div = { c: rng.pick([1, 2, -2, 3].filter((c) => top.c % c === 0)) || 1,
      pow: Object.fromEntries(letters.map((v) => [v, rng.int(0, top.pow[v])])) };
    // The top in its own bracket, so it is drawn as one fraction and not a term times one.
    src = shape === 'power-over' ? `(${write(base)})^${n}/(${write(div)})` : `(${term(base)}${term(other)})/(${write(div)})`;
    out = { c: top.c / div.c, pow: Object.fromEntries(letters.map((v) => [v, top.pow[v] - div.pow[v]])) };
    steps = `${shape === 'power-over' ? `The power first: ${write(raised, { pretty: true })}` : `Multiply the top: ${write(top, { pretty: true })}`}. `
      + `Then divide by ${write(div, { pretty: true })}: ${write(out, { pretty: true })}.`;
  }
  if (Math.abs(out.c) > 500) return simplest(rng);
  return {
    prompt: asks(src),
    text: `simplify: ${src}`,
    answer: { type: 'expr', value: write(out) },
    visual: null,
    explain: steps,
  };
}

/** The right answer and the slips students make, each a rule swapped for another. */
function mistakes(rng) {
  const letters = rng.pick([['x'], ['a'], ['x', 'y']]);
  const v = letters[0];
  const shape = rng.pick(['product', 'power', 'coefficient']);
  let src, right, wrong, why;
  if (shape === 'product') {
    const a = rng.int(2, 6), b = rng.int(2, 6), c = rng.int(2, 6), d = rng.int(2, 6);
    src = `(${c}${v}^${a})(${d}${v}^${b})`;
    right = `${c * d}${v}${sup(a + b)}`;
    // Multiplying the powers; adding the numbers; and both.
    wrong = [`${c * d}${v}${sup(a * b)}`, `${c + d}${v}${sup(a + b)}`, `${c + d}${v}${sup(a * b)}`];
    why = `Multiplying: the numbers multiply (${c} × ${d} = ${c * d}) and the powers add (${a} + ${b} = ${a + b}).`;
  } else if (shape === 'power') {
    const a = rng.int(2, 5), n = rng.int(2, 4);
    src = `(${v}^${a})^${n}`;
    right = `${v}${sup(a * n)}`;
    wrong = [`${v}${sup(a + n)}`, `${v}${sup(a ** n)}`, `${n}${v}${sup(a)}`];
    why = `A power of a power multiplies: ${a} × ${n} = ${a * n}.`;
  } else {
    const c = rng.int(2, 5), a = rng.int(2, 4), n = rng.int(2, 3);
    src = `(${c}${v}^${a})^${n}`;
    right = `${c ** n}${v}${sup(a * n)}`;
    wrong = [`${c}${v}${sup(a * n)}`, `${c * n}${v}${sup(a * n)}`, `${c ** n}${v}${sup(a + n)}`];
    why = `The number is raised too: ${c}${sup(n)} = ${c ** n}. The power of ${v} multiplies: ${a} × ${n} = ${a * n}.`;
  }
  const labels = [...new Set([right, ...wrong])];
  if (labels.length < 4) return mistakes(rng);
  return {
    prompt: [...asks(src).slice(0, -2), T.prose('— which is right?')],
    text: `which is: ${src}`,
    answer: { type: 'choice', value: right, options: rng.shuffle(labels).map((label) => ({ id: label, label })) },
    visual: null,
    explain: `${why} So ${right}.`,
  };
}

const CONTENT = [multiplying, dividing, power, zeroNegative, simplest, mistakes];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  // The mixed level deals from every level. The Usual Mistakes is a choice,
  // and asks "which is right?" in words, so the buttons are no surprise.
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
