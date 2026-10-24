/**
 * Catalogue authoring tool: builds the problem library for polynomials.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 *
 * Every `text` carries the polynomial in plain ASCII, brackets and all, so
 * scripts/check-answers.py can work out its coefficients by evaluating it.
 */
import * as T from '../terms.js';
import { minus, signed } from '../../web/ui/dom.js';
import { previewOf } from '../../web/ui/express.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/polynomials.js';

const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const sup = (n) => String(n).replace(/\d/g, (c) => SUP[c]);
const LETTERS = ['x', 'x', 'x', 'a', 'y', 'n'];

/**
 * A polynomial in one letter as [[coefficient, power], ...], kept in the
 * order given: standard form is something the student puts it into, so the
 * generator has to be able to write it out of order too.
 */
const term = ([c, p], v, pretty) => {
  const letter = p === 0 ? '' : p === 1 ? v : pretty ? `${v}${sup(p)}` : `${v}^${p}`;
  return `${Math.abs(c) === 1 && letter ? '' : Math.abs(c)}${letter}`;
};
function write(poly, v, { pretty = false } = {}) {
  const live = poly.filter(([c]) => c !== 0);
  if (!live.length) return '0';
  return live.map(([c, p], i) => {
    const body = term([c, p], v, pretty);
    if (i === 0) return c < 0 ? `${pretty ? '−' : '-'}${body}` : body;
    return `${c < 0 ? (pretty ? ' − ' : ' - ') : ' + '}${body}`;
  }).join('');
}
const pretty = (poly, v) => write(poly, v, { pretty: true });

/** Like terms collected, highest power first. */
function collect(poly) {
  const by = new Map();
  for (const [c, p] of poly) by.set(p, (by.get(p) ?? 0) + c);
  return [...by].filter(([, c]) => c !== 0).map(([p, c]) => [c, p]).sort((a, b) => b[1] - a[1]);
}
const times = (a, b) => a.flatMap(([c, p]) => b.map(([d, q]) => [c * d, p + q]));

function draw(poly, v) {
  const r = previewOf(write(poly, v));
  if (!r.ok) throw new Error(`polynomials: cannot draw "${write(poly, v)}" — ${r.error}`);
  return r.terms;
}
const bracket = (poly, v) => T.group(draw(poly, v));

// requiem: catalogue/content/expression-prompts-name-the-form
// The answer is expanded and collected, and the prompt says so: (x + 3)² is
// an equivalent form too, and only the instruction says it is not the answer.
const SIMPLIFY = 'Simplify:';
const EXPAND = 'Expand and simplify:';

/** A polynomial with `n` terms of distinct powers from 0..top. */
function some(rng, n, top, { constant = null } = {}) {
  const powers = rng.shuffle(Array.from({ length: top + 1 }, (_, i) => i)).slice(0, n);
  if (constant === true && !powers.includes(0)) powers[n - 1] = 0;
  if (constant === false && powers.includes(0)) return some(rng, n, top, { constant });
  return collect(powers.map((p) => [rng.nonZero(-9, 9), p]));
}

/** "x²: 3 + 1 = 4; x: 2 + (−4) = −2", one entry per power, for collecting. */
function collecting(parts, v) {
  const by = new Map();
  for (const [c, p] of parts) by.set(p, [...(by.get(p) ?? []), c]);
  return [...by].sort((a, b) => b[0] - a[0]).filter(([, cs]) => cs.length > 1)
    .map(([p, cs]) => {
      const name = p === 0 ? 'numbers' : p === 1 ? v : `${v}${sup(p)}`;
      const sum = cs.reduce((s, c) => s + c, 0);
      return `${name}: ${cs.map((c, i) => (i ? signed(c) : minus(c))).join(' + ')} = ${minus(sum)}`;
    }).join('; ');
}

const answerOf = (poly, v) => ({ type: 'expr', value: write(collect(poly), v) });

function standardForm(rng) {
  const v = rng.pick(LETTERS);
  const ask = rng.pick(['degree', 'degree', 'leading', 'leading', 'constant', 'coefficient']);
  const poly = some(rng, rng.int(3, 4), rng.int(3, 6), { constant: ask === 'constant' ? true : null });
  // Out of order: the leading term is never written first.
  let shown = rng.shuffle(poly);
  if (shown[0][1] === poly[0][1]) shown = [...shown.slice(1), shown[0]];
  const std = pretty(poly, v);
  const [lead, degree] = poly[0];
  let value, what, why, asked = ask;
  if (ask === 'degree') {
    [value, what, why] = [degree, 'its degree', `The degree is the highest power: ${degree}.`];
  } else if (ask === 'leading') {
    [value, what, why] = [lead, 'its leading coefficient',
      `The leading coefficient is the number on the highest power: ${minus(lead)}.`];
  } else if (ask === 'constant') {
    const c = poly.find(([, p]) => p === 0)[0];
    [value, what, why] = [c, 'its constant term', `The constant term is the one with no ${v}: ${minus(c)}.`];
  } else {
    const [c, p] = rng.pick(poly.filter(([, q]) => q > 0));
    const name = p === 1 ? v : `${v}${sup(p)}`;
    [value, what, why] = [c, `the coefficient of ${name}`, `The number on ${name} is ${minus(c)}.`];
    asked = `coefficient of ${p === 1 ? v : `${v}^${p}`}`;
  }
  return {
    prompt: [...draw(shown, v), T.prose(`— what is ${what}?`)],
    text: `${asked}: ${write(shown, v)}`,
    answer: { type: 'int', value },
    visual: null,
    explain: `In standard form, highest power first: ${std}. ${why}`,
  };
}

function adding(rng) {
  const v = rng.pick(LETTERS);
  const top = rng.int(2, 3);
  const p = some(rng, rng.int(2, 3), top), q = some(rng, rng.int(2, 3), top);
  const out = collect([...p, ...q]);
  if (out.length < 2 || out.length === p.length + q.length) return adding(rng);
  return {
    prompt: [T.prose(SIMPLIFY), bracket(p, v), T.op('+'), bracket(q, v), T.op('='), T.blank()],
    text: `polynomial: (${write(p, v)}) + (${write(q, v)})`,
    answer: answerOf(out, v),
    visual: null,
    explain: `Adding needs no change of sign: just collect like terms. ${collecting([...p, ...q], v)}. `
      + `So ${pretty(out, v)}.`,
  };
}

function takingAway(rng) {
  const v = rng.pick(LETTERS);
  const top = rng.int(2, 3);
  const p = some(rng, rng.int(2, 3), top), q = some(rng, rng.int(2, 3), top);
  const flipped = q.map(([c, k]) => [-c, k]);
  const out = collect([...p, ...flipped]);
  if (out.length < 2 || out.length === p.length + q.length) return takingAway(rng);
  return {
    prompt: [T.prose(SIMPLIFY), bracket(p, v), T.op('−'), bracket(q, v), T.op('='), T.blank()],
    text: `polynomial: (${write(p, v)}) - (${write(q, v)})`,
    answer: answerOf(out, v),
    visual: null,
    explain: `The minus changes every sign in the second bracket: −(${pretty(q, v)}) = ${pretty(flipped, v)}. `
      + `Then collect: ${collecting([...p, ...flipped], v)}. So ${pretty(out, v)}.`,
  };
}

function monomialTimes(rng) {
  const v = rng.pick(LETTERS);
  const m = [[rng.nonZero(-6, 6), rng.int(1, 3)]];
  if (Math.abs(m[0][0]) === 1 && rng.chance(0.5)) m[0][0] *= rng.int(2, 4);
  const p = some(rng, rng.int(2, 3), 3);
  const out = collect(times(m, p));
  const src = `${write(m, v)}(${write(p, v)})`;
  const M = pretty(m, v);
  return {
    prompt: [T.prose(EXPAND), ...previewOf(src).terms, T.op('='), T.blank()],
    text: `polynomial: ${src}`,
    answer: answerOf(out, v),
    visual: null,
    explain: `Multiply every term inside by ${M}, numbers times numbers and powers added: `
      + `${p.map((t) => `${M} × ${signedTerm(t, v)} = ${pretty(times(m, [t]), v)}`).join(', ')}. `
      + `So ${pretty(out, v)}.`,
  };
}

/** A term to multiply by, bracketed when it is negative: 3x², (−5). */
const signedTerm = (t, v) => (t[0] < 0 ? `(${pretty([t], v)})` : pretty([t], v));

/** A binomial ax + b with a small leading number. */
const binomial = (rng, lead = [1, 1, 1, 2, 3]) => [[rng.pick(lead) * (rng.chance(0.15) ? -1 : 1), 1], [rng.nonZero(-9, 9), 0]];

/** Every product of one bracket's terms with the other's, in order. */
const products = (a, b, v) => a.flatMap((s) => b.map((t) => `${signedTerm(s, v)} × ${signedTerm(t, v)} = ${pretty([[s[0] * t[0], s[1] + t[1]]], v)}`)).join(', ');

function binomialTimes(rng) {
  const v = rng.pick(LETTERS);
  const a = binomial(rng), b = binomial(rng);
  if (a[0][0] === b[0][0] && a[1][0] === b[1][0]) return binomialTimes(rng);
  const parts = times(a, b), out = collect(parts);
  const src = `(${write(a, v)})(${write(b, v)})`;
  return {
    prompt: [T.prose(EXPAND), ...previewOf(src).terms, T.op('='), T.blank()],
    text: `polynomial: ${src}`,
    answer: answerOf(out, v),
    visual: null,
    explain: `Each term of the first times each term of the second: ${products(a, b, v)}. `
      + `${out.length < parts.length ? `Collect the ${v} terms: ${collecting(parts, v)}. ` : ''}So ${pretty(out, v)}.`,
  };
}

function special(rng) {
  const v = rng.pick(LETTERS);
  const shape = rng.pick(['plus', 'minus', 'difference', 'difference', 'scaled']);
  const k = rng.int(1, 12), lead = shape === 'scaled' ? rng.int(2, 5) : 1;
  const sign = shape === 'minus' || (shape === 'scaled' && rng.chance(0.5)) ? -1 : 1;
  const a = [[lead, 1], [sign * k, 0]];
  let src, out, why;
  if (shape === 'difference') {
    const b = [[lead, 1], [-k, 0]];
    src = `(${write([[lead, 1], [k, 0]], v)})(${write(b, v)})`;
    out = collect(times([[lead, 1], [k, 0]], b));
    why = `A sum times a difference: the middle terms, ${pretty([[k * lead, 1]], v)} and ${pretty([[-k * lead, 1]], v)}, `
      + `cancel. What is left is a difference of squares: ${pretty([[lead, 1]], v)} squared take away ${k} squared.`;
  } else {
    src = `(${write(a, v)})^2`;
    out = collect(times(a, a));
    const half = lead * sign * k;
    const first = lead === 1 ? v : `${lead}${v}`;
    why = `Squaring a bracket is not squaring its parts. It is (${pretty(a, v)})(${pretty(a, v)}): `
      + `the first term squared, ${lead === 1 ? `${v}²` : `(${first})² = ${pretty([[lead * lead, 2]], v)}`}; `
      + `then ${first} × ${signed(sign * k)} twice, once each way round: ${pretty([[half, 1], [half, 1]], v)} = ${pretty([[2 * half, 1]], v)}; `
      + `and the last squared, ${signed(sign * k)}² = ${k * k}.`;
  }
  return {
    prompt: [T.prose(EXPAND), ...previewOf(src).terms, T.op('='), T.blank()],
    text: `polynomial: ${src}`,
    answer: answerOf(out, v),
    visual: null,
    explain: `${why} So ${pretty(out, v)}.`,
  };
}

function trinomialTimes(rng) {
  const v = rng.pick(LETTERS);
  const a = binomial(rng, [1, 1, 2]);
  const b = [[rng.pick([1, 1, 2, -1]), 2], [rng.nonZero(-6, 6), 1], [rng.nonZero(-9, 9), 0]];
  const parts = times(a, b), out = collect(parts);
  if (out.length < 3) return trinomialTimes(rng);
  const src = `(${write(a, v)})(${write(b, v)})`;
  return {
    prompt: [T.prose(EXPAND), ...previewOf(src).terms, T.op('='), T.blank()],
    text: `polynomial: ${src}`,
    answer: answerOf(out, v),
    visual: null,
    explain: `Each term of the first times each of the three in the second, six products: ${products(a, b, v)}. `
      + `Collect: ${collecting(parts, v)}. So ${pretty(out, v)}.`,
  };
}

const CONTENT = [standardForm, adding, takingAway, monomialTimes, binomialTimes, special, trinomialTimes];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  // The mixed level deals from every level but the first, whose answers are
  // numbers rather than polynomials.
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(1, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
