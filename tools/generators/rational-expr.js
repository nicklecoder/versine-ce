/**
 * Catalogue authoring tool: builds the problem library for rational-expr.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 *
 * Every `text` is the question's expression in ASCII with every fraction
 * bracketed, so scripts/check-answers.py can evaluate it and compare it with
 * the answer by value, and then ask whether the answer is finished: nothing
 * left that cancels.
 */
import * as T from '../terms.js';
import { minus } from '../../web/ui/dom.js';
import { previewOf } from '../../web/ui/express.js';
import { normalize } from '../../web/math/solutions.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/rational-expr.js';

const SUP = { 2: '²', 3: '³' };
function write(poly, fancy = false) {
  const live = poly.filter(([c]) => c !== 0);
  if (!live.length) return '0';
  return live.map(([c, p], i) => {
    const letter = p === 0 ? '' : p === 1 ? 'x' : fancy ? `x${SUP[p]}` : `x^${p}`;
    const body = `${Math.abs(c) === 1 && letter ? '' : Math.abs(c)}${letter}`;
    if (i === 0) return c < 0 ? `${fancy ? '−' : '-'}${body}` : body;
    return `${c < 0 ? (fancy ? ' − ' : ' - ') : ' + '}${body}`;
  }).join('');
}
const pretty = (poly) => write(poly, true);
function collect(poly) {
  const by = new Map();
  for (const [c, p] of poly) by.set(p, (by.get(p) ?? 0) + c);
  return [...by].filter(([, c]) => c !== 0).map(([p, c]) => [c, p]).sort((a, b) => b[1] - a[1]);
}
const times = (a, b) => collect(a.flatMap(([c, p]) => b.map(([d, q]) => [c * d, p + q])));
const X = (c) => [[1, 1], [c, 0]];
/** (x + 3), (x − 2), x: one linear factor, bracketed unless it is x. */
const fac = (c, fancy = true) => (c === 0 ? 'x' : `(${write(X(c), fancy)})`);
const prod = (cs) => cs.reduce((acc, c) => times(acc, X(c)), [[1, 0]]);
const distinct = (...xs) => new Set(xs).size === xs.length;

/** Drawn as the expression box draws it. */
function draw(src) {
  const r = previewOf(src);
  if (!r.ok) throw new Error(`rational-expr: cannot draw ${src}: ${r.error}`);
  return r.terms;
}
const exprAnswer = (forms) => ({ type: 'expr', value: forms[0], ...(forms.length > 1 ? { accept: forms.slice(1) } : {}) });
const over = (n, d) => `(${n})/(${d})`;
/** The answer N/D, with every way of writing a bracketed factor listed. */
// requiem: catalogue/content/rational-answer-lowest-terms
function answerForms(num, den) {
  if (!den.length) return [num];
  return den.map((d) => `${/^-?(\d+|x)$/.test(num) ? num : `(${num})`}/${d}`);
}

// --- Simplify --------------------------------------------------------------

function simplify(rng) {
  for (;;) {
    const kind = rng.pick(['cancel', 'cancel', 'cancel', 'scaled', 'poly', 'opposite']);
    const a = rng.nonZero(-7, 7), b = rng.int(-7, 7), c = rng.int(-7, 7);
    if (!distinct(a, b, c)) continue;
    let N, D, forms, outShow, work;
    if (kind === 'cancel') {
      N = prod([a, b]); D = prod([a, c]);
      forms = answerForms(write(X(b)), [fac(c, false)]);
      outShow = `${fac(b)}/${fac(c)}`;
      work = `${pretty(N)} = ${fac(a)}${fac(b)} and ${pretty(D)} = ${fac(a)}${fac(c)}`;
    } else if (kind === 'scaled') {
      const k = rng.pick([2, 3, 4, 5, -2]);
      N = times([[k, 0]], X(a)); D = prod([a, c]);
      forms = [`${k}/${fac(c, false)}`];
      outShow = `${minus(k)}/${fac(c)}`;
      work = `${pretty(N)} = ${minus(k)}${fac(a)} and ${pretty(D)} = ${fac(a)}${fac(c)}`;
    } else if (kind === 'poly') {
      N = prod([a, b]); D = X(a);
      forms = [write(X(b))];
      outShow = pretty(X(b));
      work = `${pretty(N)} = ${fac(a)}${fac(b)}`;
    } else {
      // (−a − x) on top is −1 times (x + a) underneath.
      N = [[-1, 1], [-a, 0]]; D = prod([a, c]);
      forms = [`-1/${fac(c, false)}`, `1/(${write([[-1, 1], [-c, 0]])})`];
      outShow = `−1/${fac(c)}`;
      work = `${pretty(N)} = −${fac(a)}, the same factor with the sign taken out, and ${pretty(D)} = ${fac(a)}${fac(c)}`;
    }
    if (c === 0 && kind !== 'poly' && kind !== 'scaled') continue;
    const src = over(write(N), write(D));
    const excluded = kind === 'poly' ? [-a] : [-a, -c];
    return {
      prompt: [T.prose('Simplify:'), ...draw(src)],
      text: `rational: ${src}`,
      answer: exprAnswer(forms),
      visual: null,
      explain: `Factor first: ${work}. Cancel the factor ${fac(a)}, which is on the top and the bottom. `
        + `(Only a whole factor cancels: crossing out the x's, or the x², of terms is not allowed.) `
        + `So ${outShow}, for x ≠ ${excluded.map(minus).join(' and ')}.`,
    };
  }
}

// --- Excluded Values -------------------------------------------------------

function excluded(rng) {
  for (;;) {
    const kind = rng.pick(['factored', 'quadratic', 'quadratic', 'linear', 'cancels']);
    const a = rng.int(-8, 8), c = rng.int(-8, 8), e = rng.nonZero(-9, 9);
    if (a === c) continue;
    let N, D, Dshow, zeros, note = '';
    if (kind === 'linear') {
      const k = rng.pick([1, 2, 3, 4]);
      if (a % k !== 0) continue;
      N = X(e); D = [[k, 1], [a, 0]];
      zeros = [-a / k];
      Dshow = pretty(D);
    } else if (kind === 'cancels') {
      // The factor cancels, and its zero stays excluded.
      N = prod([a, e]); D = prod([a, c]);
      if (e === c || e === a) continue;
      zeros = [-a, -c];
      Dshow = pretty(D);
      note = ` (${fac(a)} cancels from the top and bottom, but x = ${minus(-a)} still makes the original denominator zero, so it stays excluded.)`;
    } else {
      if (e === a || e === c) continue;
      N = X(e); D = prod([a, c]);
      zeros = [-a, -c];
      Dshow = pretty(D);
    }
    const src = over(write(N), write(D));
    const shown = kind === 'factored' ? `(${pretty(N)})/(${fac(a)}${fac(c)})` : src;
    const text = kind === 'factored' ? `excluded: (${write(N)})/(${fac(a, false)}${fac(c, false)})` : `excluded: ${src}`;
    const parts = [...new Set(zeros)].sort((p, q) => p - q).map((x) => ({ lo: { n: x, d: 1 }, loIn: true, hi: { n: x, d: 1 }, hiIn: true }));
    return {
      prompt: [T.prose('For which values of x is this undefined?'), ...draw(kind === 'factored' ? shown.replace(/−/g, '-') : src)],
      text,
      answer: { type: 'solutions', value: { letter: 'x', parts: normalize(parts) } },
      visual: null,
      explain: `It is undefined where the denominator is zero. ${kind === 'linear' ? `${Dshow} = 0 gives x = ${minus(zeros[0])}` : `${kind === 'factored' ? '' : `${Dshow} factors as ${fac(a)}${fac(c)}, and `}${fac(a)}${fac(c)} = 0 when x = ${minus(-a)} or x = ${minus(-c)}`}.`
        + `${note} The numerator does not matter: a zero on top just makes the value 0. So x = ${zeros.map(minus).join(' and x = ')} ${zeros.length > 1 ? 'are' : 'is'} excluded.`,
    };
  }
}

// --- Multiply & Divide -----------------------------------------------------

function mulDiv(rng) {
  for (;;) {
    const p = rng.int(-7, 7), q = rng.nonZero(-7, 7), s = rng.nonZero(-7, 7), t = rng.nonZero(-7, 7);
    if (!distinct(p, q, s, t)) continue;
    const divide = rng.chance(0.45);
    // f1 · f2 = (x + p)/(x + q) after (x + s) and (x + t) cancel.
    const f1 = [prod([p, s]), X(t)];
    const f2 = divide ? [prod([s, q]), X(t)] : [X(t), prod([s, q])];
    const show = (f) => over(write(f[0]), write(f[1]));
    const src = `(${show(f1)}) ${divide ? '÷' : '*'} (${show(f2)})`;
    return {
      prompt: [T.prose('Simplify:'), ...draw(show(f1)), T.op(divide ? '÷' : '·'), ...draw(show(f2))],
      text: `rational: ${src}`,
      answer: exprAnswer(answerForms(write(X(p)), [fac(q, false)])),
      visual: null,
      explain: `${divide ? `Dividing is multiplying by the reciprocal: flip the second fraction to (${pretty(f2[1])})/(${pretty(f2[0])}). ` : ''}`
        + `Factor everything: ${pretty(f1[0])} = ${fac(p)}${fac(s)} and ${pretty(prod([s, q]))} = ${fac(s)}${fac(q)}. `
        + `Multiply across, then cancel ${fac(s)} and ${fac(t)}, each once on top and once underneath. So ${fac(p)}/${fac(q)}.`,
    };
  }
}

// --- Common Denominator ----------------------------------------------------

/** Ax + B with its common factor taken out, when there is one: 3(x − 1). */
function contentForms(A, B) {
  const g = gcdInt(A, B) * (A < 0 ? -1 : 1);
  const plain = write(collect([[A, 1], [B, 0]]));
  if (Math.abs(g) <= 1 || A === 0) return [plain];
  return [plain, `${g}(${write(collect([[A / g, 1], [B / g, 0]]))})`];
}
function gcdInt(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; }

function common(rng) {
  for (;;) {
    const c = rng.nonZero(-7, 7);
    const a1 = rng.int(1, 6), b1 = rng.int(-9, 9), a2 = rng.int(0, 5), b2 = rng.int(-9, 9);
    const minusIt = rng.chance(0.6);
    const sg = minusIt ? -1 : 1;
    const A = a1 + sg * a2, B = b1 + sg * b2;
    if (A === 0 && B === 0) continue;
    const n1 = collect([[a1, 1], [b1, 0]]), n2 = collect([[a2, 1], [b2, 0]]);
    if (n2.length === 0) continue;
    const d = write(X(c));
    const src = `(${over(write(n1), d)}) ${minusIt ? '-' : '+'} (${over(write(n2), d)})`;
    let forms, out, why;
    if (A !== 0 && B === A * c) {
      // The numerator is a multiple of the denominator: it all cancels.
      forms = [String(A)]; out = minus(A);
      why = `${pretty([[A, 1], [B, 0]])} = ${minus(A)}${fac(c)}, so the ${fac(c)} cancels, leaving ${minus(A)}`;
    } else {
      forms = contentForms(A, B).flatMap((n) => answerForms(n, [fac(c, false)]));
      if (A === 0) forms = [`${B}/${fac(c, false)}`];
      out = `(${pretty(collect([[A, 1], [B, 0]]))})/${fac(c)}`;
      why = `nothing on top is a factor of ${fac(c)}, so that is as simple as it gets`;
    }
    return {
      prompt: [T.prose('Simplify:'), ...draw(over(write(n1), d)), T.op(minusIt ? '−' : '+'), ...draw(over(write(n2), d))],
      text: `rational: ${src}`,
      answer: exprAnswer(forms),
      visual: null,
      explain: `The denominators match, so combine the numerators over ${fac(c)}: `
        + `${minusIt ? `(${pretty(n1)}) − (${pretty(n2)}), where the minus takes away every term of the second, = ` : `(${pretty(n1)}) + (${pretty(n2)}) = `}${pretty(collect([[A, 1], [B, 0]]))}. `
        + `Then simplify: ${why}. So ${out}.`,
    };
  }
}

// --- Unlike Denominators ---------------------------------------------------

function unlike(rng) {
  for (;;) {
    const p = rng.int(-6, 6), q = rng.int(-6, 6);
    if (p === q) continue;
    const a = rng.int(1, 6), b = rng.int(1, 6);
    const minusIt = rng.chance(0.45);
    const sb = minusIt ? -b : b;
    const A = a + sb, B = a * q + sb * p;
    // The numerator must share no factor with (x + p)(x + q).
    if (A === 0 && B === 0) continue;
    if (A !== 0 && (B === A * p || B === A * q)) continue;
    const num = A === 0 ? String(B) : null;
    const den = [`(${fac(p, false)}${fac(q, false)})`, `(${write(prod([p, q]))})`];
    const nums = num ? [num] : contentForms(A, B);
    const forms = nums.flatMap((n) => den.map((d) => `${/^-?\d+$/.test(n) ? n : `(${n})`}/${d}`));
    const f1 = over(String(a), write(X(p))), f2 = over(String(b), write(X(q)));
    const k = (n) => (n === 1 ? '' : String(n));
    const top = A === 0 ? minus(B) : pretty(collect([[A, 1], [B, 0]]));
    return {
      prompt: [T.prose('Write as one fraction:'), ...draw(`${a}/(${write(X(p))})`), T.op(minusIt ? '−' : '+'), ...draw(`${b}/(${write(X(q))})`)],
      text: `rational: (${f1}) ${minusIt ? '-' : '+'} (${f2})`,
      answer: exprAnswer(forms),
      visual: null,
      explain: `The common denominator is ${fac(p)}${fac(q)}. Multiply each fraction up to it: ${k(a)}${fac(q)} over it, ${minusIt ? 'minus' : 'plus'} ${k(b)}${fac(p)} over it. `
        + `Combine the numerators${minusIt ? ', the minus taking away all of the second' : ''}: ${k(a)}${fac(q)} ${minusIt ? '−' : '+'} ${k(b)}${fac(p)} = ${top}. `
        + `So ${A === 0 ? top : `(${top})`}/(${fac(p)}${fac(q)}), which is the same as ${A === 0 ? top : `(${top})`}/(${pretty(prod([p, q]))}) with the bottom multiplied out.`,
    };
  }
}

// --- Complex Fractions -----------------------------------------------------

function complex(rng) {
  const kind = rng.pick(['ones', 'ones', 'halves', 'squares']);
  if (kind === 'ones') {
    const a = rng.nonZero(-9, 9), b = rng.nonZero(-9, 9);
    if (a === b) return complex(rng);
    const src = `(1 ${a < 0 ? '-' : '+'} ${Math.abs(a)}/x)/(1 ${b < 0 ? '-' : '+'} ${Math.abs(b)}/x)`;
    return {
      prompt: [T.prose('Simplify:'), ...draw(src)],
      text: `rational: ${src}`,
      answer: exprAnswer(answerForms(write(X(a)), [fac(b, false)])),
      visual: null,
      explain: `The small fractions share the denominator x, so multiply the top and the bottom by x: x(1 ${a < 0 ? '−' : '+'} ${Math.abs(a)}/x) = ${pretty(X(a))}, and x(1 ${b < 0 ? '−' : '+'} ${Math.abs(b)}/x) = ${pretty(X(b))}. `
        + `So ${fac(a)}/${fac(b)}.`,
    };
  }
  if (kind === 'halves') {
    const a = rng.int(2, 9);
    const src = `(1/x + 1/${a})/(1/x - 1/${a})`;
    return {
      prompt: [T.prose('Simplify:'), ...draw(src)],
      text: `rational: ${src}`,
      answer: exprAnswer([`(x + ${a})/(${a} - x)`, `(x + ${a})/(-x + ${a})`, `(-x - ${a})/(x - ${a})`, `-(x + ${a})/(x - ${a})`]),
      visual: null,
      explain: `The small fractions have denominators x and ${a}, so multiply the top and bottom by ${a}x: ${a}x(1/x + 1/${a}) = ${a} + x, and ${a}x(1/x − 1/${a}) = ${a} − x. `
        + `So (x + ${a})/(${a} − x).`,
    };
  }
  const a = rng.int(1, 9);
  const src = `(x - ${a * a}/x)/(x - ${a})`;
  return {
    prompt: [T.prose('Simplify:'), ...draw(src)],
    text: `rational: ${src}`,
    answer: exprAnswer([`(x + ${a})/x`]),
    visual: null,
    explain: `Multiply the top and the bottom by x: x(x − ${a * a}/x) = x² − ${a * a}, and x(x − ${a}) = x(x − ${a}). `
      + `x² − ${a * a} is a difference of squares, (x + ${a})(x − ${a}), so the (x − ${a}) cancels. So (x + ${a})/x.`,
  };
}

const CONTENT = [simplify, excluded, mulDiv, common, unlike, complex];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  // requiem: catalogue/content/one-input-per-level
  // Excluded values are a set and everything else an expression; the
  // question says which ("for which values", "simplify"), so All Together
  // deals from every level.
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
