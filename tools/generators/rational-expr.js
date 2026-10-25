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
const over = (n, d) => `(${n})/(${d})`;

// requiem: play/answers/equivalent-judged-by-value
// Judged by value and then by being finished, so every finished way of
// writing the answer is right and no list of them is kept: the denominator
// factored or multiplied out, the minus on top, in front or underneath.
const valueAnswer = (key) => ({ type: 'equivalent', value: key, requireSimplest: true });

/** A polynomial at a number. */
const valueOf = (poly, x) => poly.reduce((s, [c, p]) => s + c * x ** p, 0);
/** poly / (x + c), when (x + c) divides it exactly. */
function divideOut(poly, c) {
  const deg = Math.max(...poly.map(([, p]) => p));
  const dense = Array.from({ length: deg + 1 }, (_, i) => poly.filter(([, p]) => p === deg - i).reduce((s, [k]) => s + k, 0));
  const out = [];
  let carry = 0;
  for (let i = 0; i < deg; i++) { carry = dense[i] + carry * -c; out.push([carry, deg - 1 - i]); }
  return collect(out);
}

// requiem: catalogue/content/rational-answer-finished-by-value
/**
 * num over the product of (x + c) for each c in den, every factor the two
 * share cancelled: the finished answer, and what was cancelled.
 */
function lowest(num, den) {
  let top = collect(num);
  const under = [];
  const cancelled = [];
  for (const c of den) {
    if (top.length && valueOf(top, -c) === 0) { top = divideOut(top, c); cancelled.push(c); } else under.push(c);
  }
  return { top, under, cancelled };
}
/** Linear factors side by side, x first: x(x + 2), not (x + 2)x. */
const factors = (cs, fancy = true) => [...cs].sort((a, b) => (a === 0 ? -1 : b === 0 ? 1 : 0)).map((c) => fac(c, fancy)).join('');
/** N/D written out, the denominator in factors: (2x + 5)/((x + 1)(x + 4)). */
function quotientText(top, under, fancy = false) {
  const n = write(top, fancy);
  if (!under.length) return n;
  const single = top.length <= 1;
  const d = under.length === 1 ? fac(under[0], fancy) : `(${factors(under, fancy)})`;
  return `${single ? n : `(${n})`}/${d}`;
}
const keyOf = (num, den) => { const r = lowest(num, den); return quotientText(r.top, r.under); };
const shownOf = (num, den) => { const r = lowest(num, den); return quotientText(r.top, r.under, true); };

// --- Simplify --------------------------------------------------------------

function simplify(rng) {
  for (;;) {
    const kind = rng.pick(['cancel', 'cancel', 'cancel', 'scaled', 'poly', 'opposite']);
    const a = rng.nonZero(-7, 7), b = rng.int(-7, 7), c = rng.int(-7, 7);
    if (!distinct(a, b, c)) continue;
    let N, D, key, outShow, work;
    if (kind === 'cancel') {
      N = prod([a, b]); D = prod([a, c]);
      key = `(${write(X(b))})/${fac(c, false)}`;
      outShow = `${fac(b)}/${fac(c)}`;
      work = `${pretty(N)} = ${fac(a)}${fac(b)} and ${pretty(D)} = ${fac(a)}${fac(c)}`;
    } else if (kind === 'scaled') {
      const k = rng.pick([2, 3, 4, 5, -2]);
      N = times([[k, 0]], X(a)); D = prod([a, c]);
      key = `${k}/${fac(c, false)}`;
      outShow = `${minus(k)}/${fac(c)}`;
      work = `${pretty(N)} = ${minus(k)}${fac(a)} and ${pretty(D)} = ${fac(a)}${fac(c)}`;
    } else if (kind === 'poly') {
      N = prod([a, b]); D = X(a);
      key = write(X(b));
      outShow = pretty(X(b));
      work = `${pretty(N)} = ${fac(a)}${fac(b)}`;
    } else {
      // (−a − x) on top is −1 times (x + a) underneath.
      N = [[-1, 1], [-a, 0]]; D = prod([a, c]);
      key = `-1/${fac(c, false)}`;
      outShow = `−1/${fac(c)}`;
      work = `${pretty(N)} = −${fac(a)}, the same factor with the sign taken out, and ${pretty(D)} = ${fac(a)}${fac(c)}`;
    }
    if (c === 0 && kind !== 'poly' && kind !== 'scaled') continue;
    const src = over(write(N), write(D));
    const excluded = kind === 'poly' ? [-a] : [-a, -c];
    return {
      prompt: [T.prose('Simplify:'), ...draw(src)],
      text: `rational: ${src}`,
      answer: valueAnswer(key),
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
      answer: { type: 'solutions', value: { letter: 'x', parts: normalize(parts) },
        complementHint: 'That is where it is defined. The question asks where it is not.' },
      visual: null,
      explain: `It is undefined where the denominator is zero. ${kind === 'linear' ? `${Dshow} = 0 gives x = ${minus(zeros[0])}` : `${kind === 'factored' ? '' : `${Dshow} factors as ${fac(a)}${fac(c)}, and `}${fac(a)}${fac(c)} = 0 when x = ${minus(-a)} or x = ${minus(-c)}`}.`
        // requiem: catalogue/content/explanation-uses-a-form-the-box-takes
        + `${note} The numerator does not matter: a zero on top just makes the value 0. So it is undefined at x = ${zeros.map(minus).join(' or x = ')}.`,
    };
  }
}

// --- Multiply & Divide -----------------------------------------------------

/*
 * Each shape names its linear factors by letter, top and bottom of each
 * fraction. Dividing, the two denominators differ, so flipping the second
 * fraction is what makes its factors cancel; multiplying, every factor that
 * cancels across is inside a quadratic, so it cancels only once factored.
 */
const MULDIV = {
  divide: [
    // (x² − 9)/(x + 1) ÷ (x + 3)/(x² − 1) = (x − 3)(x − 1)
    [['P', 'S'], ['T'], ['S'], ['T', 'Q']],
    [['P'], ['S', 'T'], ['Q'], ['S']],
    [['P', 'S'], ['T', 'Q'], ['S'], ['T']],
  ],
  times: [
    [['P', 'S'], ['Q', 'T'], ['T'], ['S']],
    [['S'], ['P', 'T'], ['T', 'Q'], ['S', 'U']],
    [['P', 'S'], ['T'], ['T', 'Q'], ['S', 'U']],
  ],
};

/** What is left of top over bottom once each factor shared by both is struck out once. */
function strike(top, bottom) {
  const under = bottom.slice(), left = [], gone = [];
  for (const f of top) {
    const i = under.indexOf(f);
    if (i >= 0) { under.splice(i, 1); gone.push(f); } else left.push(f);
  }
  return { left, under, gone };
}
const poly = (cs) => (cs.length ? prod(cs) : [[1, 0]]);

function mulDiv(rng) {
  for (;;) {
    const divide = rng.chance(0.5);
    const shape = rng.pick(MULDIV[divide ? 'divide' : 'times']);
    const v = { P: rng.int(-7, 7), Q: rng.int(-7, 7), S: rng.nonZero(-7, 7), T: rng.nonZero(-7, 7), U: rng.nonZero(-7, 7) };
    const used = [...new Set(shape.flat())];
    if (!distinct(...used.map((k) => v[k]))) continue;
    const [t1, b1, t2, b2] = shape.map((fs) => fs.map((k) => v[k]));
    const show = (t, b) => over(write(poly(t)), write(poly(b)));
    const f1 = show(t1, b1), f2 = show(t2, b2);
    // Flipped, the second fraction's bottom goes on top.
    const { left, under, gone } = strike([...t1, ...(divide ? b2 : t2)], [...b1, ...(divide ? t2 : b2)]);
    const key = keyOf(poly(left), under);
    const factored = [t1, b1, t2, b2].filter((cs) => cs.length > 1)
      .map((cs) => `${pretty(prod(cs))} = ${cs.map((c) => fac(c)).join('')}`);
    const finalShown = left.length > 1 && !under.length
      ? `${left.map((c) => fac(c)).join('')} = ${pretty(prod(left))}` : shownOf(poly(left), under);
    return {
      prompt: [T.prose('Simplify:'), ...draw(f1), T.op(divide ? '÷' : '·'), ...draw(f2)],
      text: `rational: (${f1}) ${divide ? '÷' : '*'} (${f2})`,
      answer: valueAnswer(key),
      visual: null,
      explain: `${divide ? `Dividing is multiplying by the reciprocal: flip the second fraction to (${pretty(poly(b2))})/(${pretty(poly(t2))}). ` : ''}`
        + `Factor everything: ${factored.join(', ')}. `
        + `Multiply across, then cancel ${gone.map((c) => fac(c)).join(' and ')}, each once on top and once underneath. So ${finalShown}.`,
    };
  }
}

// --- Common Denominator ----------------------------------------------------

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
    let out, why;
    const key = keyOf([[A, 1], [B, 0]], [c]);
    if (A !== 0 && B === A * c) {
      // The numerator is a multiple of the denominator: it all cancels.
      out = minus(A);
      why = `${pretty([[A, 1], [B, 0]])} = ${minus(A)}${fac(c)}, so the ${fac(c)} cancels, leaving ${minus(A)}`;
    } else {
      out = shownOf([[A, 1], [B, 0]], [c]);
      why = `nothing on top is a factor of ${fac(c)}, so that is as simple as it gets`;
    }
    return {
      prompt: [T.prose('Simplify:'), ...draw(over(write(n1), d)), T.op(minusIt ? '−' : '+'), ...draw(over(write(n2), d))],
      text: `rational: ${src}`,
      answer: valueAnswer(key),
      visual: null,
      explain: `The denominators match, so combine the numerators over ${fac(c)}: `
        + `${minusIt ? `(${pretty(n1)}) − (${pretty(n2)}), where the minus takes away every term of the second, = ` : `(${pretty(n1)}) + (${pretty(n2)}) = `}${pretty(collect([[A, 1], [B, 0]]))}. `
        + `Then simplify: ${why}. So ${out}.`,
    };
  }
}

// --- Unlike Denominators ---------------------------------------------------

/** The least common denominator: each factor as often as any one denominator has it. */
function lcd(d1, d2) {
  const out = d1.slice();
  const rest = d1.slice();
  for (const c of d2) {
    const i = rest.indexOf(c);
    if (i >= 0) rest.splice(i, 1); else out.push(c);
  }
  return out;
}
/** What a denominator is short of the common one. */
const missing = (den, all) => strike(all, den).left;

// requiem: catalogue/content/rational-lcd-from-factors
function unlike(rng) {
  for (;;) {
    const kind = rng.pick(['numbers', 'numbers', 'in x', 'in x', 'shared', 'shared', 'shared both']);
    const p = rng.int(-6, 6), q = rng.int(-6, 6), r = rng.int(-6, 6);
    if (!distinct(p, q, r)) continue;
    const minusIt = rng.chance(0.45);
    let n1, n2, d1, d2;
    if (kind === 'numbers') {
      n1 = [[rng.int(1, 6), 0]]; n2 = [[rng.int(1, 6), 0]]; d1 = [p]; d2 = [q];
    } else if (kind === 'in x') {
      // x, or x + b, over one denominator; x + b or a number over the other.
      n1 = rng.chance(0.5) ? [[1, 1]] : X(rng.nonZero(-6, 6));
      n2 = rng.chance(0.5) ? X(rng.nonZero(-6, 6)) : [[rng.int(1, 6), 0]];
      d1 = [p]; d2 = [q];
    } else if (kind === 'shared') {
      // 1/(x² − 4) + 1/(x + 2): the second denominator is a factor of the first already.
      n1 = [[rng.int(1, 6), 0]]; n2 = rng.chance(0.3) ? [[1, 1]] : [[rng.int(1, 6), 0]];
      d1 = [p, q]; d2 = [p];
      if (rng.chance(0.5)) [n1, n2, d1, d2] = [n2, n1, d2, d1];
    } else {
      n1 = [[rng.int(1, 6), 0]]; n2 = [[rng.int(1, 6), 0]];
      d1 = [p, q]; d2 = [p, r];
    }
    n1 = collect(n1); n2 = collect(n2);
    // Neither fraction simplifies on its own before they are added.
    if (d1.some((c) => valueOf(n1, -c) === 0) || d2.some((c) => valueOf(n2, -c) === 0)) continue;
    const all = lcd(d1, d2);
    const up1 = missing(d1, all), up2 = missing(d2, all);
    const num = collect([...times(n1, poly(up1)), ...times([[minusIt ? -1 : 1, 0]], times(n2, poly(up2)))]);
    if (!num.length) continue;
    const { top, under, cancelled } = lowest(num, all);
    // A top that shares a factor with the bottom leaves a last cancel: a few of those, not most.
    if (cancelled.length && rng.chance(0.7)) continue;
    const key = quotientText(top, under);
    const f1 = over(write(n1), write(prod(d1))), f2 = over(write(n2), write(prod(d2)));
    const allShown = factors(all);
    const by1 = factors(up1), by2 = factors(up2);
    const scaled = (n, by) => {
      if (!by) return n.length > 1 ? `(${pretty(n)})` : pretty(n);
      if (n.length > 1) return `(${pretty(n)})${by}`;
      return `${pretty(n) === '1' ? '' : pretty(n)}${by}`;
    };
    const shared = all.length < d1.length + d2.length;
    const factored = [d1, d2].filter((cs) => cs.length > 1).map((cs) => `${pretty(prod(cs))} = ${cs.map((c) => fac(c)).join('')}`);
    return {
      prompt: [T.prose('Write as one fraction:'), ...draw(f1), T.op(minusIt ? '−' : '+'), ...draw(f2)],
      text: `rational: (${f1}) ${minusIt ? '-' : '+'} (${f2})`,
      answer: valueAnswer(key),
      visual: null,
      explain: `${factored.length ? `Factor the denominators: ${factored.join(' and ')}. ` : ''}`
        + `The common denominator is ${allShown}${shared ? ': the factor both denominators have is needed only once, so it is less than their product' : ', the two denominators multiplied, since they share no factor'}. `
        + `Multiply each fraction up to it: ${by1 ? `the first top times ${by1}` : 'the first is over it already'}, ${by2 ? `the second top times ${by2}` : 'the second is over it already'}. `
        + `Combine the numerators${minusIt ? ', the minus taking away all of the second' : ''}: ${scaled(n1, by1)} ${minusIt ? '−' : '+'} ${scaled(n2, by2)} = ${pretty(num)}. `
        + `${cancelled.length ? `That top has the factor ${cancelled.map((c) => fac(c)).join('')} too, which cancels. ` : ''}`
        + `So ${quotientText(top, under, true)}.`,
    };
  }
}

// --- Complex Fractions -----------------------------------------------------

const signed = (k) => `${k < 0 ? '-' : '+'} ${Math.abs(k)}`;
const signedF = (k) => `${k < 0 ? '−' : '+'} ${Math.abs(k)}`;

function complex(rng) {
  const kind = rng.pick(['ones', 'ones', 'ones', 'general', 'general', 'general', 'squares', 'squares', 'inner', 'inner', 'halves']);
  if (kind === 'ones') {
    const a = rng.nonZero(-9, 9), b = rng.nonZero(-9, 9);
    if (a === b) return complex(rng);
    const src = `(1 ${signed(a)}/x)/(1 ${signed(b)}/x)`;
    return {
      prompt: [T.prose('Simplify:'), ...draw(src)],
      text: `rational: ${src}`,
      answer: valueAnswer(keyOf(X(a), [b])),
      visual: null,
      explain: `The small fractions share the denominator x, so multiply the top and the bottom by x: x(1 ${signedF(a)}/x) = ${pretty(X(a))}, and x(1 ${signedF(b)}/x) = ${pretty(X(b))}. `
        + `So ${fac(a)}/${fac(b)}.`,
    };
  }
  if (kind === 'general') {
    // (a + b/x)/(c + d/x) = (ax + b)/(cx + d)
    const a = rng.int(1, 5), c = rng.int(1, 5), b = rng.nonZero(-9, 9), d = rng.nonZero(-9, 9);
    if (a * d === b * c || gcdInt(gcdInt(a, b), gcdInt(c, d)) > 1 || (a === 1 && c === 1)) return complex(rng);
    const src = `(${a} ${signed(b)}/x)/(${c} ${signed(d)}/x)`;
    const top = [[a, 1], [b, 0]], bottom = [[c, 1], [d, 0]];
    return {
      prompt: [T.prose('Simplify:'), ...draw(src)],
      text: `rational: ${src}`,
      answer: valueAnswer(`(${write(top)})/(${write(bottom)})`),
      visual: null,
      explain: `The small fractions share the denominator x, so multiply the top and the bottom by x: x(${a} ${signedF(b)}/x) = ${pretty(top)}, and x(${c} ${signedF(d)}/x) = ${pretty(bottom)}. `
        + `They share no factor, so (${pretty(top)})/(${pretty(bottom)}).`,
    };
  }
  if (kind === 'squares') {
    const shape = rng.pick(['difference', 'difference', 'over x squared', 'over x squared', 'x minus']);
    const a = rng.int(1, 9);
    if (shape === 'difference') {
      // (1 − a²/x²)/(1 ± a/x): times x², (x − a)(x + a) over x(x ± a).
      const s = rng.pick([1, -1]);
      const src = `(1 - ${a * a}/x^2)/(1 ${signed(s * a)}/x)`;
      return {
        prompt: [T.prose('Simplify:'), ...draw(src)],
        text: `rational: ${src}`,
        answer: valueAnswer(`(${write(X(-s * a))})/x`),
        visual: null,
        explain: `The small fractions have denominators x² and x, and x² holds both, so multiply the top and the bottom by x²: x²(1 − ${a * a}/x²) = x² − ${a * a}, and x²(1 ${signedF(s * a)}/x) = x² ${signedF(s * a)}x = x${fac(s * a)}. `
          + `x² − ${a * a} = (x + ${a})(x − ${a}), so the ${fac(s * a)} cancels. So ${fac(-s * a)}/x.`,
      };
    }
    if (shape === 'over x squared') {
      // (1/x + b/x²)/(1 + c/x) = (x + b)/(x(x + c))
      const b = rng.nonZero(-9, 9), c = rng.nonZero(-9, 9);
      if (b === c) return complex(rng);
      const src = `(1/x ${signed(b)}/x^2)/(1 ${signed(c)}/x)`;
      return {
        prompt: [T.prose('Simplify:'), ...draw(src)],
        text: `rational: ${src}`,
        answer: valueAnswer(keyOf(X(b), [0, c])),
        visual: null,
        explain: `The small fractions have denominators x and x², and x² holds both, so multiply the top and the bottom by x²: x²(1/x ${signedF(b)}/x²) = ${pretty(X(b))}, and x²(1 ${signedF(c)}/x) = x² ${signedF(c)}x = x${fac(c)}. `
          + `Nothing cancels, so ${shownOf(X(b), [0, c])}.`,
      };
    }
    const src = `(x - ${a * a}/x)/(x - ${a})`;
    return {
      prompt: [T.prose('Simplify:'), ...draw(src)],
      text: `rational: ${src}`,
      answer: valueAnswer(`(x + ${a})/x`),
      visual: null,
      explain: `Multiply the top and the bottom by x: x(x − ${a * a}/x) = x² − ${a * a}, and x(x − ${a}) = x(x − ${a}). `
        + `x² − ${a * a} is a difference of squares, (x + ${a})(x − ${a}), so the (x − ${a}) cancels. So (x + ${a})/x.`,
    };
  }
  if (kind === 'inner') {
    const c = rng.nonZero(-6, 6);
    const inside = write(X(c)), insideF = pretty(X(c));
    if (rng.chance(0.5)) {
      // (1 + a/(x + c))/(1 + b/(x + c)) = (x + c + a)/(x + c + b)
      const a = rng.nonZero(-7, 7), b = rng.nonZero(-7, 7);
      if (a === b) return complex(rng);
      const src = `(1 ${signed(a)}/(${inside}))/(1 ${signed(b)}/(${inside}))`;
      return {
        prompt: [T.prose('Simplify:'), ...draw(src)],
        text: `rational: ${src}`,
        answer: valueAnswer(keyOf(X(c + a), [c + b])),
        visual: null,
        explain: `The small fractions share the denominator ${fac(c)}, so multiply the top and the bottom by it: ${fac(c)}(1 ${signedF(a)}/${fac(c)}) = ${insideF} ${signedF(a)} = ${pretty(X(c + a))}, and ${fac(c)}(1 ${signedF(b)}/${fac(c)}) = ${insideF} ${signedF(b)} = ${pretty(X(c + b))}. `
          + `So ${shownOf(X(c + a), [c + b])}.`,
      };
    }
    // (a/(x + c))/(b + 1/(x + c)) = a/(b(x + c) + 1)
    const a = rng.int(1, 9), b = rng.int(1, 5);
    const bottom = collect([[b, 1], [b * c + 1, 0]]);
    const src = `(${a}/(${inside}))/(${b} + 1/(${inside}))`;
    return {
      prompt: [T.prose('Simplify:'), ...draw(src)],
      text: `rational: ${src}`,
      answer: valueAnswer(`${a}/(${write(bottom)})`),
      visual: null,
      explain: `The small fractions share the denominator ${fac(c)}, so multiply the top and the bottom by it: the top becomes ${a}, and ${fac(c)}(${b} + 1/${fac(c)}) = ${b === 1 ? '' : b}${fac(c)} + 1 = ${pretty(bottom)}. `
        + `So ${a}/(${pretty(bottom)}).`,
    };
  }
  const a = rng.int(2, 9);
  const src = `(1/x + 1/${a})/(1/x - 1/${a})`;
  return {
    prompt: [T.prose('Simplify:'), ...draw(src)],
    text: `rational: ${src}`,
    answer: valueAnswer(`(x + ${a})/(${a} - x)`),
    visual: null,
    explain: `The small fractions have denominators x and ${a}, so multiply the top and bottom by ${a}x: ${a}x(1/x + 1/${a}) = ${a} + x, and ${a}x(1/x − 1/${a}) = ${a} − x. `
      + `So (x + ${a})/(${a} − x).`,
  };
}

// --- Opposite Factors --------------------------------------------------------

// requiem: catalogue/content/rational-opposite-factors-level
/** a − x meeting x − a: one is the other with its sign taken out, so they cancel to −1. */
function opposite(rng) {
  for (;;) {
    const shape = rng.pick(['squares', 'squares', 'squares', 'over', 'over', 'poly', 'poly', 'bare']);
    const a = rng.int(1, 9), b = rng.int(-7, 7);
    if (b === a || b === -a) continue;
    const bottom = prod([-a, b]);
    let top, under, key, work, outShow;
    if (shape === 'squares') {
      top = `${a * a} - x^2`; under = write(bottom);
      key = `-(${write(X(a))})/${fac(b, false)}`;
      work = `${a * a} − x² = (${a} − x)(${a} + x), and ${pretty(bottom)} = ${fac(-a)}${fac(b)}. ${a} − x is −${fac(-a)}, so the two cancel to leave −1`;
      outShow = `−${fac(a)}/${fac(b)}`;
    } else if (shape === 'over') {
      top = `${a} - x`; under = write(bottom);
      key = `-1/${fac(b, false)}`;
      work = `${pretty(bottom)} = ${fac(-a)}${fac(b)}, and ${a} − x is −${fac(-a)}, so the two cancel to leave −1`;
      outShow = `−1/${fac(b)}`;
    } else if (shape === 'poly') {
      top = write(prod([a, -a])); under = `${a} - x`;
      key = write([[-1, 1], [-a, 0]]);
      work = `${pretty(prod([a, -a]))} = ${fac(a)}${fac(-a)}, and ${a} − x is −${fac(-a)}, so the ${fac(-a)} cancels and leaves −1 underneath`;
      outShow = `−${fac(a)} = ${pretty([[-1, 1], [-a, 0]])}`;
    } else {
      top = write(X(-a)); under = `${a} - x`;
      key = '-1';
      work = `${a} − x is −${fac(-a)}: the top and the bottom are one factor, once with its sign taken out`;
      outShow = '−1';
    }
    const src = over(top, under);
    return {
      prompt: [T.prose('Simplify:'), ...draw(src)],
      text: `rational: ${src}`,
      answer: valueAnswer(key),
      visual: null,
      explain: `Factor first: ${work}. (Cancelling them to 1, as if they were the same factor, is the usual slip.) So ${outShow}.`,
    };
  }
}

const CONTENT = [simplify, excluded, mulDiv, common, unlike, complex, opposite];

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
