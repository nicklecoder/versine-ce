/**
 * Catalogue authoring tool: builds the problem library for series.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 *
 * Every `text` carries the series as its terms, its rule or its story's
 * numbers in ASCII, so scripts/check-answers.py can add the terms up one by
 * one rather than by the formula this file uses, and an infinite series by
 * its partial sums far out.
 */
import * as T from '../terms.js';
import { minus } from '../../web/ui/dom.js';
import { previewOf } from '../../web/ui/express.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/series.js';

const optionIds = ['a', 'b', 'c', 'd'];
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));

// --- Exact fractions ---------------------------------------------------------

/** n/d in lowest terms, the sign on top. */
const Q = (n, d = 1) => {
  if (d < 0) { n = -n; d = -d; }
  const g = gcd(n, d) || 1;
  return { n: n / g, d: d / g };
};
const add = (p, q) => Q(p.n * q.d + q.n * p.d, p.d * q.d);
const sub = (p, q) => Q(p.n * q.d - q.n * p.d, p.d * q.d);
const mul = (p, q) => Q(p.n * q.n, p.d * q.d);
const div = (p, q) => Q(p.n * q.d, p.d * q.n);
const pw = (p, k) => (k >= 0 ? Q(p.n ** k, p.d ** k) : Q(p.d ** -k, p.n ** -k));
const isInt = (p) => p.d === 1;
const big = (p) => Math.abs(p.n) > 999999 || p.d > 99999;
// requiem: catalogue/library/frac-answer-fits-its-boxes
// The fraction box takes four characters on top, a minus among them, and
// four below (web/ui/fracinput.js): an answer wider than that cannot be typed.
const fits = (p) => String(p.n).length <= 4 && String(p.d).length <= 4;
/** ASCII, for the text: -3/4. */
const qa = (p) => (p.d === 1 ? String(p.n) : `${p.n}/${p.d}`);
/** Prose: −3/4, with comma thousands top and bottom: 1,533/256. */
const qs = (p) => (p.d === 1 ? commas(p.n) : `${commas(p.n)}/${commas(p.d)}`);
/** A whole number as US prose writes it: −12,500. */
const commas = (n) => minus(n).replace(/\d{4,}/, (m) => Number(m).toLocaleString('en-US'));
/** In brackets when negative or a fraction, for a product: 3(−2), 5(1/2). */
const qb = (p) => (p.n < 0 || p.d !== 1 ? `(${qs(p)})` : qs(p));
/** In brackets when a fraction, for the top of a division: (5/3)/(1 − 1/3). */
const qf = (p) => (p.d !== 1 ? `(${qs(p)})` : qs(p));
const answer = (p) => ({ type: 'frac', value: Q(p.n, p.d), requireSimplest: false });

/** A fraction whose bottom divides a power of 10, as an exact decimal: −0.331. */
function dec(p) {
  let k = 0;
  while ((10 ** k) % p.d !== 0) if (++k > 9) throw new Error(`${qa(p)} does not end`);
  const N = Math.abs(p.n) * (10 ** k / p.d);
  const whole = Math.floor(N / 10 ** k), part = String(N % 10 ** k).padStart(k, '0').replace(/0+$/, '');
  return `${p.n < 0 ? '−' : ''}${commas(whole)}${part ? `.${part}` : ''}`;
}
/** A list of terms, as prose: 5, 2, −1, −4. */
const listed = (ts) => ts.map(qs).join(', ');
/** A term after a plus sign: 4, (−3). */
const tsum = (t) => (t.n < 0 ? `(${qs(t)})` : qs(t));
/** Terms added, as prose: 5 + 2 + (−1) + … + (−22). */
function added(ts, more = false, last = null) {
  let s = [qs(ts[0]), ...ts.slice(1).map(tsum)].join(' + ');
  if (more) s += ' + …';
  if (last) s += ` + ${tsum(last)}`;
  return s;
}
/** ASCII terms for the text: 5, 2, -1. */
const al = (ts) => ts.map(qa).join(', ');

function choice(prompt, head, opts, explain) {
  if (new Set(opts.map(([, l]) => l)).size !== opts.length || new Set(opts.map(([b]) => b)).size !== opts.length) return null;
  return (rng) => {
    const order = rng.shuffle(opts.map((_, i) => i));
    return {
      prompt,
      text: `${head}; options ${order.map((j, i) => `${optionIds[i]}: ${opts[j][0]}`).join(' | ')}`,
      answer: { type: 'choice', value: optionIds[order.indexOf(0)], options: order.map((j, i) => ({ id: optionIds[i], label: opts[j][1] })) },
      visual: null,
      explain,
    };
  };
}

const sumOf = (ts) => ts.reduce(add, Q(0));
const arithTerms = (a, d, n) => Array.from({ length: n }, (_, i) => add(a, mul(d, Q(i))));
const geoTerms = (a, r, n) => Array.from({ length: n }, (_, i) => mul(a, pw(r, i)));
const sub_ = (n) => String(n).replace(/\d/g, (c) => '₀₁₂₃₄₅₆₇₈₉'[c]);
const sup = (n) => String(n).replace(/./g, (c) => ({ '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' })[c]);

// --- Arithmetic Sums -----------------------------------------------------------

/** A first term and difference, sometimes in halves. */
function arithSeed(rng) {
  if (rng.chance(0.2)) {
    const a = Q(rng.int(-20, 30), 2), d = Q(rng.pick([-5, -3, -1, 1, 3, 5]), 2);
    return [a, d];
  }
  return [Q(rng.int(-25, 40)), Q(rng.pick([-9, -7, -6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]))];
}

/** The pairing sentence: n terms from a to l. */
function paired(n, a, l) {
  const S = div(mul(Q(n), add(a, l)), Q(2));
  return { S, said: `Pair the first term with the last: S${sub_(n)} = n(a₁ + a${sub_(n)})/2 = ${n}(${qs(a)} + ${qb(l)})/2 = ${n}(${qs(add(a, l))})/2 = ${qs(S)}.` };
}

function arithmetic(rng) {
  const kind = rng.pick(['first', 'first', 'first', 'to', 'to', 'to', 'ends', 'ends', 'natural', 'natural']);
  if (kind === 'natural') {
    const form = rng.pick(['whole', 'even', 'odd', 'multiples']);
    const N = rng.int(form === 'multiples' ? 10 : 20, form === 'whole' ? 200 : 100);
    const m = form === 'multiples' ? rng.int(3, 12) : 1;
    const [a, d, words] = {
      whole: [Q(1), Q(1), `the whole numbers from 1 to ${N}`],
      even: [Q(2), Q(2), `the first ${N} even numbers, 2 + 4 + 6 + …`],
      odd: [Q(1), Q(2), `the first ${N} odd numbers, 1 + 3 + 5 + …`],
      multiples: [Q(m), Q(m), `the multiples of ${m} from ${m} to ${m * N}`],
    }[form];
    const ts = arithTerms(a, d, N), l = ts[N - 1];
    const { S, said } = paired(N, a, l);
    if (!fits(S)) return arithmetic(rng);
    return {
      prompt: [T.prose(`Find the sum of ${words}.`)],
      text: `arith sum: ${al(ts.slice(0, 3))} to ${qa(l)}; ${form}`,
      answer: answer(S),
      visual: null,
      explain: `They are an arithmetic series of ${N} terms with difference ${qs(d)}, from ${qs(a)} to ${qs(l)}. ${said} So the sum is ${qs(S)}.`,
    };
  }
  for (;;) {
    const [a, d] = arithSeed(rng);
    const n = rng.int(8, 40);
    const ts = arithTerms(a, d, n), l = ts[n - 1];
    const { S, said } = paired(n, a, l);
    if (!fits(S)) continue;
    const nth = `The last term is a${sub_(n)} = a₁ + ${n - 1}d = ${qs(a)} + ${n - 1}(${qs(d)}) = ${qs(l)}.`;
    if (kind === 'first') {
      return {
        prompt: [T.prose(`Find the sum of the first ${n} terms of the arithmetic sequence ${listed(ts.slice(0, 4))}, ….`)],
        text: `arith sum: first ${n} of ${al(ts.slice(0, 3))}`,
        answer: answer(S),
        visual: null,
        explain: `The difference is ${qs(d)}. ${nth} ${said} So the sum is ${qs(S)}.`,
      };
    }
    if (kind === 'to') {
      return {
        prompt: [T.prose(`Find the sum ${added(ts.slice(0, 3), true, l)}.`)],
        text: `arith sum: ${al(ts.slice(0, 3))} to ${qa(l)}`,
        answer: answer(S),
        visual: null,
        explain: `Count the terms first. The difference is ${qs(d)}, so ${qs(l)} = ${qs(a)} + (n − 1)(${qs(d)}), which gives n − 1 = ${n - 1} and n = ${n}. ${said} So the sum is ${qs(S)}.`,
      };
    }
    // ends: the count and both ends, or the count, the first and the difference.
    if (rng.chance(0.5)) {
      return {
        prompt: [T.prose(`An arithmetic series has ${n} terms. Its first term is ${qs(a)} and its last term is ${qs(l)}. What is its sum?`)],
        text: `arith sum: ${n} terms, first ${qa(a)}, last ${qa(l)}`,
        answer: answer(S),
        visual: null,
        explain: `${said} So the sum is ${qs(S)}.`,
      };
    }
    return {
      prompt: [T.prose(`An arithmetic series has first term a₁ = ${qs(a)} and common difference d = ${qs(d)}. Find S${sub_(n)}, the sum of its first ${n} terms.`)],
      text: `arith sum: ${n} terms, first ${qa(a)}, difference ${qa(d)}`,
      answer: answer(S),
      visual: null,
      explain: `${nth} ${said} So S${sub_(n)} = ${qs(S)}.`,
    };
  }
}

// --- Finite Geometric -----------------------------------------------------------

const WHOLE_R = [2, 3, 4, 5, -2, -3, -4];
const PART_R = [[1, 2], [-1, 2], [1, 3], [-1, 3], [2, 3], [-2, 3], [3, 2], [-3, 2], [1, 4], [3, 4], [1, 5], [2, 5]];

/** A first term and ratio whose first three terms are whole. */
function geoSeed(rng, wholeShare = 0.55) {
  if (rng.chance(wholeShare)) return [Q(rng.pick([1, 2, 3, 4, 5, 6, 7, 10, -1, -2, -3, -5])), Q(rng.pick(WHOLE_R))];
  const [n, d] = rng.pick(PART_R);
  return [Q(rng.pick([1, 1, 2, 3, 5, -1, -2]) * d * d * rng.pick([1, 1, 2, 4])), Q(n, d)];
}

/** The working of a₁(1 − rⁿ)/(1 − r). */
// requiem: catalogue/content/series-one-geometric-form
function geoWork(a, r, n) {
  const rn = pw(r, n), top = sub(Q(1), rn), bot = sub(Q(1), r);
  const S = div(mul(a, top), bot);
  return {
    S,
    said: `S${sub_(n)} = a₁(1 − rⁿ)/(1 − r) = ${qs(a)}(1 − ${qb(r)}${sup(n)})/(1 − ${tsum(r)}). `
      + `${qb(r)}${sup(n)} = ${qs(rn)}, so this is ${qs(a)}(${qs(top)})/${qb(bot)} = ${qs(S)}.`,
  };
}

function geometric(rng) {
  const kind = rng.pick(['first', 'first', 'first', 'first', 'to', 'to', 'to', 'ends', 'ends', 'ends']);
  for (;;) {
    const [a, r] = geoSeed(rng);
    const n = rng.int(4, isInt(r) ? (Math.abs(r.n) >= 4 ? 6 : 9) : 8);
    const ts = geoTerms(a, r, n), l = ts[n - 1];
    const { S, said } = geoWork(a, r, n);
    // requiem: catalogue/content/series-hand-sized
    // rⁿ small enough to work by hand, and a total the box takes with a
    // bottom under 100.
    const rn = pw(r, n);
    if (!fits(S) || S.d >= 100 || ts.some(big) || rn.d > 256 || Math.abs(rn.n) > 3125) continue;
    if (kind === 'first') {
      return {
        prompt: [T.prose(`Find the sum of the first ${n} terms of the geometric sequence ${listed(ts.slice(0, 3))}, ….`)],
        text: `geo sum: first ${n} of ${al(ts.slice(0, 3))}`,
        answer: answer(S),
        visual: null,
        explain: `The ratio is ${qs(ts[1])} ÷ ${qb(ts[0])} = ${qs(r)}. ${said} So the sum is ${qs(S)}.`,
      };
    }
    if (kind === 'to') {
      if (l.d > 64) continue;
      return {
        prompt: [T.prose(`Find the sum ${added(ts.slice(0, 3), true, l)}.`)],
        text: `geo sum: ${al(ts.slice(0, 3))} to ${qa(l)}`,
        answer: answer(S),
        visual: null,
        explain: `The ratio is ${qs(r)}. Count the terms: ${qs(l)} = ${qs(a)} · ${qb(r)}${sup(n - 1)}, so the last term is the ${n}th. ${said} So the sum is ${qs(S)}.`,
      };
    }
    return {
      prompt: [T.prose(`A geometric series has first term ${qs(a)} and common ratio ${qs(r)}. Find the sum of its first ${n} terms.`)],
      text: `geo sum: first ${n}, a1 ${qa(a)}, r ${qa(r)}`,
      answer: answer(S),
      visual: null,
      explain: `${said} So the sum is ${qs(S)}.`,
    };
  }
}

// --- Sigma Notation ----------------------------------------------------------------

/** A linear rule ak + b, ASCII and as terms. */
const linRule = (a, b) => `${a === 1 ? '' : a === -1 ? '-' : a}k${b === 0 ? '' : b < 0 ? ` - ${-b}` : ` + ${b}`}`;
/** c(r)^(k - s): a geometric rule. */
const geoRule = (c, r, s) => {
  const power = s === 0 ? 'k' : `(k - ${s})`;
  // 2^k alone; 3(2)^k with a number in front, the bracket on the base.
  if (c.n === 1 && c.d === 1) return `${isInt(r) && r.n > 0 ? r.n : `(${qa(r)})`}^${power}`;
  return `${qa(c)}(${qa(r)})^${power}`;
};
/** The body drawn as the expression box draws it, in brackets when it is a sum. */
function body(src, bracket) {
  const r = previewOf(src);
  if (!r.ok) throw new Error(`cannot draw ${src}`);
  return bracket ? [T.group(r.terms)] : r.terms;
}
/** Evaluate a rule in k exactly. */
function ruleAt(kind, p, k) {
  if (kind === 'lin') return Q(p.a * k + p.b);
  if (kind === 'sq') return Q(k * k + p.b * k + p.c);
  return mul(p.c, pw(p.r, k - p.s));
}
const sqRule = (b, c) => `k^2${b === 0 ? '' : b < 0 ? ` - ${b === -1 ? '' : -b}k` : ` + ${b === 1 ? '' : b}k`}${c === 0 ? '' : c < 0 ? ` - ${-c}` : ` + ${c}`}`;

function sigmaRule(rng, kind) {
  if (kind === 'lin') {
    const a = rng.pick([-5, -4, -3, -2, 2, 3, 4, 5, 6, 7, 1, 10]), b = rng.int(-9, 9);
    return { p: { a, b }, src: linRule(a, b), bracket: b !== 0 };
  }
  if (kind === 'sq') {
    const b = rng.pick([0, 0, -1, 1, 2, -2]), c = rng.pick([0, 1, -1, 2, 3, -3, 5]);
    if (b === 0 && c === 0) return sigmaRule(rng, kind);
    return { p: { b, c }, src: sqRule(b, c), bracket: true };
  }
  const r = rng.pick([Q(2), Q(3), Q(-2), Q(1, 2), Q(-1, 2), Q(1, 3)]), s = rng.pick([0, 1, 1]);
  const c = isInt(r) ? Q(rng.pick([1, 1, 2, 3, 4, 5, -2, -3])) : Q(rng.pick([1, 2, 3]) * r.d ** 4);
  return { p: { c, r, s }, src: geoRule(c, r, s), bracket: false };
}

/** A rule as a choice label spells it: (2k + 1), 3(2)ᵏ⁻¹. */
const ruleLabel = (rule) => (rule.bracket ? `(${previewText(rule.src)})` : previewText(rule.src));

/** Σc = nc, Σk = n(n + 1)/2 and Σk² = n(n + 1)(2n + 1)/6, worked for one n. */
const sumK = (n) => ({ v: (n * (n + 1)) / 2, said: `Σk = n(n + 1)/2 = ${n}(${n + 1})/2 = ${commas((n * (n + 1)) / 2)}` });
const sumK2 = (n) => ({ v: (n * (n + 1) * (2 * n + 1)) / 6, said: `Σk² = n(n + 1)(2n + 1)/6 = ${n}(${n + 1})(${2 * n + 1})/6 = ${commas((n * (n + 1) * (2 * n + 1)) / 6)}` });

/** The sum rules: a constant, a number times a sum, Σk and Σk². */
// requiem: catalogue/content/sigma-sum-rules-asked
function sumRules(rng, kind) {
  if (kind === 'const') {
    const lo = rng.pick([1, 1, 1, 0, 2, 3]), hi = lo + rng.int(4, 30), c = rng.pick([2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, -2, -3, -4, -5, -6, -8]);
    const n = hi - lo + 1, S = Q(n * c);
    return {
      prompt: [T.prose('Evaluate'), T.sigma(`k = ${lo}`, hi, body(String(c), false)), T.prose('.')],
      text: `sigma: k=${lo}..${hi} of ${c}`,
      answer: answer(S),
      visual: null,
      explain: `The rule has no k in it, so every term is ${minus(c)}. k runs from ${lo} to ${hi}, which is ${hi} − ${lo} + 1 = ${n} terms, and Σc = nc = ${n}(${minus(c)}) = ${qs(S)}. So the sum is ${qs(S)}.`,
    };
  }
  if (kind === 'scale') {
    for (;;) {
      const n = rng.int(6, 30), V = rng.pick([-1, 1, 1, 1]) * rng.int(5, 90), c = rng.pick([2, 3, 4, 5, 6, 10, -2, -3, -4]), b = rng.pick([0, 0, 1, 2, 3, 5, -1, -2, -4]);
      const S = Q(c * V + b * n);
      if (!fits(S)) continue;
      const a = T.letter('aₖ');
      const times = { t: 'juxt', terms: [T.num(minus(c)), a] };
      const rule = b === 0 ? [times] : [T.group([times, T.op(b < 0 ? '−' : '+'), T.num(Math.abs(b))])];
      const shown = `${minus(c)}aₖ${b === 0 ? '' : ` ${b < 0 ? '−' : '+'} ${Math.abs(b)}`}`;
      return {
        prompt: [T.prose('If'), T.sigma('k = 1', n, [a]), T.prose(`= ${minus(V)}, what is`), T.sigma('k = 1', n, rule), T.prose('?')],
        text: `sigma scale: k=1..${n}, sum ${V}, times ${c}, plus ${b}`,
        answer: answer(S),
        visual: null,
        explain: `The ${minus(c)} multiplies every term, so it comes out of the sum: Σ${c < 0 ? `(${minus(c)}aₖ)` : `${c}aₖ`} = ${minus(c)}Σaₖ = ${minus(c)}(${minus(V)}) = ${commas(c * V)}. `
          + (b === 0 ? '' : `The ${Math.abs(b)} ${b < 0 ? 'taken from' : 'added to'} each of the ${n} terms is Σ${b < 0 ? `(${minus(b)})` : b} = ${n}(${minus(b)}) = ${commas(b * n)}, so Σ(${shown}) = ${commas(c * V)} ${b < 0 ? '−' : '+'} ${commas(Math.abs(b * n))} = ${qs(S)}. `)
          + `So the sum is ${qs(S)}.`,
    };
    }
  }
  if (kind === 'sumk') {
    const sq = rng.chance(0.4), n = sq ? rng.int(5, 30) : rng.int(10, 140);
    const { v, said } = sq ? sumK2(n) : sumK(n);
    return {
      prompt: [T.prose('Evaluate'), T.sigma('k = 1', n, body(sq ? 'k^2' : 'k', false)), T.prose('.')],
      text: `sigma: k=1..${n} of ${sq ? 'k^2' : 'k'}`,
      answer: answer(Q(v)),
      visual: null,
      explain: `${sq ? 'The squares 1 + 4 + 9 + …' : 'The whole numbers 1 + 2 + 3 + …'} up to ${sq ? `${n}² = ${commas(n * n)}` : n}: ${said}. So the sum is ${commas(v)}.`,
    };
  }
  // rules: split a polynomial rule into its sums.
  for (;;) {
    const quadratic = rng.chance(0.7);
    const p = quadratic ? rng.pick([1, 1, 2, 3, -1, -2]) : 0, q = rng.pick(quadratic ? [0, 1, 2, -1, -2, -3, 4] : [2, 3, 4, 5, 6, -2, -3, -4]), c = rng.pick([0, 1, 2, 3, 5, -1, -2, -4]);
    if (quadratic ? q === 0 && c === 0 : c === 0) continue;
    const n = quadratic ? rng.int(5, 15) : rng.int(10, 40);
    const src = polyK(p, q, c);
    const k1 = sumK(n), k2 = sumK2(n);
    const S = Q(p * k2.v + q * k1.v + c * n);
    if (!fits(S)) continue;
    const parts = [[p, 'Σk²', k2.v], [q, 'Σk', k1.v], [c, `Σ${Math.abs(c)}`, null]].filter(([m]) => m !== 0);
    const split = parts.map(([m, what], i) => `${i === 0 ? (m < 0 ? '−' : '') : m < 0 ? ' − ' : ' + '}${Math.abs(m) === 1 || what.startsWith('Σ') && !what.includes('k') ? '' : Math.abs(m)}${what}`).join('');
    const vals = parts.map(([m, , v], i) => {
      const term = v === null ? `${n}(${Math.abs(m)})` : Math.abs(m) === 1 ? commas(v) : `${Math.abs(m)}(${commas(v)})`;
      return `${i === 0 ? (m < 0 ? '−' : '') : m < 0 ? ' − ' : ' + '}${term}`;
    }).join('');
    const said = [p !== 0 ? `${k2.said}` : '', q !== 0 ? `${k1.said}` : '', c !== 0 ? `Σ${Math.abs(c)} = ${n}(${Math.abs(c)}) = ${n * Math.abs(c)}` : ''].filter(Boolean);
    return {
      prompt: [T.prose('Evaluate'), T.sigma('k = 1', n, body(src, true)), T.prose('.')],
      text: `sigma: k=1..${n} of ${src}`,
      answer: answer(S),
      visual: null,
      explain: `Split it with the sum rules, each number in front coming out of its sum: Σ(${previewText(src)}) = ${split}. `
        + `For k = 1 to ${n}, ${said.length > 1 ? `${said.slice(0, -1).join(', ')} and ${said[said.length - 1]}` : said[0]}. `
        + `So it is ${vals} = ${qs(S)}.`,
    };
  }
}

/** pk² + qk + c in ASCII: 3k^2 - 2k + 5. */
function polyK(p, q, c) {
  const out = [];
  const put = (m, x) => {
    if (m === 0) return;
    const mag = Math.abs(m) === 1 && x ? '' : String(Math.abs(m));
    out.push(out.length === 0 ? `${m < 0 ? '-' : ''}${mag}${x}` : `${m < 0 ? '-' : '+'} ${mag}${x}`);
  };
  put(p, 'k^2'); put(q, 'k'); put(c, '');
  return out.join(' ');
}

function sigma(rng) {
  const kind = rng.pick(['lin', 'lin', 'geo', 'geo', 'sq', 'count', 'count', 'which', 'which', 'write', 'write', 'write', 'const', 'scale', 'scale', 'sumk', 'sumk', 'rules', 'rules']);
  if (['const', 'scale', 'sumk', 'rules'].includes(kind)) return sumRules(rng, kind);
  if (kind === 'write') return writeSigma(rng);
  if (kind === 'count') {
    const lo = rng.int(0, 9), hi = lo + rng.int(3, 40);
    const rule = sigmaRule(rng, rng.pick(['lin', 'lin', 'sq', 'geo']));
    return {
      prompt: [T.prose('How many terms are added in'), T.sigma(`k = ${lo}`, hi, body(rule.src, rule.bracket)), T.prose('?')],
      text: `sigma terms: k=${lo}..${hi} of ${rule.src}`,
      answer: answer(Q(hi - lo + 1)),
      visual: null,
      explain: `k takes every whole value from ${lo} to ${hi}, both ends included: ${hi} − ${lo} + 1 = ${hi - lo + 1}. (${hi} − ${lo} = ${hi - lo} leaves out one end.) So ${hi - lo + 1} terms are added.`,
    };
  }
  // requiem: catalogue/content/sigma-read-not-typed
  // Reading a sigma is asked by choosing the series it writes out, and
  // writing one by choosing among four sigmas (writeSigma): Σ is read here,
  // never typed.
  if (kind === 'which') {
    for (;;) {
      const rk = rng.pick(['lin', 'lin', 'geo']);
      const rule = sigmaRule(rng, rk);
      const lo = rk === 'geo' ? 1 : rng.pick([1, 1, 1, 2, 3]);
      const hi = lo + rng.int(rk === 'geo' ? 4 : 5, rk === 'geo' ? 6 : 14);
      const at = (k) => ruleAt(rk, rule.p, k);
      // requiem: catalogue/content/decoys-cross-two-slips
      // Two slips crossed: starting a term early (counting from one below
      // the bottom number) and stopping a term early (as if the top number
      // were left out), alone and together.
      const runs = [[lo, hi], [lo - 1, hi], [lo, hi - 1], [lo - 1, hi - 1]];
      const label = ([p, q]) => added([at(p), at(p + 1), at(p + 2)], true, at(q));
      const ascii = ([p, q]) => `${al([at(p), at(p + 1), at(p + 2)])} ... ${qa(at(q))}`;
      const ts = runs.map(([p, q]) => Array.from({ length: q - p + 1 }, (_, i) => at(p + i)));
      if (ts.some((t) => t.some(big))) continue;
      const opts = runs.map((run) => [ascii(run), label(run)]);
      const ask = choice([T.prose('Which series is'), T.sigma(`k = ${lo}`, hi, body(rule.src, rule.bracket)), T.prose('?')],
        `sigma which: k=${lo}..${hi} of ${rule.src}`, opts,
        `Put each k from ${lo} to ${hi} into ${previewText(rule.src)}: k = ${lo} gives ${qs(at(lo))}, k = ${lo + 1} gives ${qs(at(lo + 1))}, k = ${lo + 2} gives ${qs(at(lo + 2))}, and the last, k = ${hi}, gives ${qs(at(hi))}. `
        + `(Starting at k = ${minus(lo - 1)} adds ${qs(at(lo - 1))} in front, and stopping at k = ${hi - 1} leaves off the last term.) So it is ${opts[0][1]}.`);
      if (ask) return ask(rng);
    }
  }
  for (;;) {
    const rule = sigmaRule(rng, kind);
    const lo = kind === 'geo' ? rng.pick([0, 1, 1]) : rng.pick([1, 1, 1, 0, 2, 3]);
    const hi = lo + (kind === 'lin' ? rng.int(4, 29) : kind === 'sq' ? rng.int(3, 6) : rng.int(3, 7));
    const ts = Array.from({ length: hi - lo + 1 }, (_, i) => ruleAt(kind, rule.p, lo + i));
    const S = sumOf(ts);
    if (!fits(S) || S.d >= 100 || ts.some(big)) continue;
    const n = hi - lo + 1;
    let how;
    if (kind === 'lin') {
      how = `The terms go ${rule.p.a > 0 ? 'up' : 'down'} by ${Math.abs(rule.p.a)} each time, an arithmetic series of ${hi} − ${lo} + 1 = ${n} terms from ${qs(ts[0])} to ${qs(ts[n - 1])}. `
        + `Paired first with last, S = ${n}(${qs(ts[0])} + ${qb(ts[n - 1])})/2 = ${qs(S)}.`;
    } else if (kind === 'geo') {
      const r = rule.p.r;
      how = `The terms are ${listed(ts.slice(0, 3))}, …: a geometric series of ${n} terms with first term ${qs(ts[0])} and ratio ${qs(r)}. `
        + `S = ${qs(ts[0])}(1 − ${qb(r)}${sup(n)})/(1 − ${tsum(r)}) = ${qs(S)}.`;
    } else {
      how = `Neither arithmetic nor geometric, so write the ${n} terms out and add: ${added(ts)} = ${qs(S)}.`;
    }
    return {
      prompt: [T.prose('Evaluate'), T.sigma(`k = ${lo}`, hi, body(rule.src, rule.bracket)), T.prose('.')],
      text: `sigma: k=${lo}..${hi} of ${rule.src}`,
      answer: answer(S),
      visual: null,
      explain: `${how} So the sum is ${qs(S)}.`,
    };
  }
}

// requiem: catalogue/content/sigma-written-as-a-choice
// Writing a series in sigma notation: four sigmas for one written-out
// series, as one-line labels spelled Σ from k = 1 to 10 of (2k + 1), since a
// choice label is a plain string and cannot stack its limits.
function writeSigma(rng) {
  for (;;) {
    const rk = rng.pick(['lin', 'lin', 'geo']);
    const rule = sigmaRule(rng, rk);
    const lo = rk === 'geo' ? (rule.p.s === 1 ? 1 : rng.pick([0, 1])) : rng.pick([1, 1, 1, 0, 2]);
    const hi = lo + rng.int(rk === 'geo' ? 4 : 5, rk === 'geo' ? 6 : 14);
    const at = (k) => ruleAt(rk, rule.p, k);
    const last = at(hi);
    // requiem: catalogue/content/decoys-cross-two-slips
    // Two slips crossed, one at each limit, alone and together. At the
    // bottom: starting a term early (or late, from habit, at 1 for a series
    // from 0). At the top: the last term written as the top number, the
    // count of terms written there when k does not start at 1, or the last
    // term's power read as k when the power is k − 1.
    const lo2 = lo === 0 ? 1 : lo - 1;
    let hi2, why2;
    if (rk === 'lin' && isInt(last) && last.n > 0 && last.n <= 99 && last.n !== hi && last.n !== hi + 1 && last.n !== hi - 1) {
      hi2 = last.n; why2 = `${last.n} is the last term, not the last value of k`;
    } else if (lo !== 1) {
      hi2 = hi - lo + 1; why2 = `there are ${hi - lo + 1} terms, but k starts at ${lo}, so it ends at ${hi}`;
    } else if (rk === 'geo' && rule.p.s === 1) {
      hi2 = hi - 1; why2 = `the last term's power is ${hi - 1}, but the power is k − 1, so k = ${hi}`;
    } else {
      hi2 = hi - 1; why2 = `stopping at k = ${hi - 1} leaves off the last term, ${qs(last)}`;
    }
    if (hi2 < lo2 + 2) continue;
    const runs = [[lo, hi], [lo2, hi], [lo, hi2], [lo2, hi2]];
    const ts = Array.from({ length: hi - lo + 1 }, (_, i) => at(lo + i));
    if (ts.some(big) || runs.some(([p, q]) => [p, q].some((k) => big(at(k))))) continue;
    const opts = runs.map(([p, q]) => [`${p}..${q} of ${rule.src}`, `Σ from k = ${p} to ${q} of ${ruleLabel(rule)}`]);
    const why1 = lo2 < lo ? `starting at k = ${lo2} adds ${qs(at(lo2))} in front` : `starting at k = ${lo2} leaves off the first term, ${qs(at(lo))}`;
    const ask = choice([T.prose(`Which writes ${added(ts.slice(0, 3), true, last)} in sigma notation?`)],
      `sigma write: ${al(ts.slice(0, 3))} to ${qa(last)}`, opts,
      `Each option has the rule ${previewText(rule.src)}; what differs is where k starts and stops. k = ${lo} gives the first term, ${qs(at(lo))}, and k = ${hi} gives the last, ${qs(last)}. `
        + `(${why1[0].toUpperCase()}${why1.slice(1)}, and ${why2}.) So it is ${opts[0][1]}.`);
    if (ask) return ask(rng);
  }
}

/** A rule as prose: 3k − 2, 5(1/2)ᵏ. */
function previewText(src) {
  return src.replace(/\^\(k - (\d)\)/g, (_, s) => `ᵏ⁻${sup(s)}`).replace(/\^k/g, 'ᵏ').replace(/k\^2/g, 'k²')
    .replace(/ - /g, ' − ').replace(/(^|\()-/g, '$1−');
}

// --- Infinite Geometric ------------------------------------------------------------

const SHRINK = [[1, 2], [-1, 2], [1, 3], [-1, 3], [2, 3], [-2, 3], [1, 4], [3, 4], [-1, 4], [-3, 4], [2, 5], [3, 5], [4, 5], [1, 5], [-2, 5]];
const GROW = [[1, 1], [-1, 1], [3, 2], [-3, 2], [2, 1], [-2, 1], [4, 3], [5, 4], [-5, 4], [5, 3], [3, 1]];

/** A first term making the first three terms whole. */
const wholeStart = (rng, r) => Q(rng.pick([1, 2, 3, 4, 5, 6, 7, 8, 9, -1, -2, -3, -4, -5]) * r.d * r.d);

function infiniteSays(a, r) {
  const S = div(a, sub(Q(1), r));
  return { S, said: `Since −1 < ${qs(r)} < 1, the terms shrink toward 0 and the sum settles: S = a₁/(1 − r) = ${qf(a)}/(1 − ${tsum(r)}) = ${qf(a)}/(${qs(sub(Q(1), r))}) = ${qs(S)}.` };
}

/** 0.(27) or 0.1(6): the digits before and inside the repeat. */
function repeating(rng) {
  const len = rng.pick([1, 1, 2, 2, 2, 3]);
  const lead = rng.chance(0.3) ? String(rng.int(1, 9)) : '';
  let block = '';
  for (let i = 0; i < len; i++) block += String(rng.int(0, 9));
  if (/^(\d)\1*$/.test(block) && len > 1) return repeating(rng);
  if (block === '0' || block === '9' || /^0+$/.test(block)) return repeating(rng);
  // 0.8(48) is 0.(84) written the long way: a lead digit equal to the
  // block's last is part of the repeat.
  if (lead && lead === block[len - 1]) return repeating(rng);
  // The number: lead/10^m + block/(10^m (10^len − 1)).
  const m = lead.length, ten = 10 ** m;
  const value = add(Q(Number(lead || 0), ten), Q(Number(block), ten * (10 ** len - 1)));
  const a = Q(Number(block), ten * 10 ** len), r = Q(1, 10 ** len);
  const shown = `0.${lead}${block.repeat(len === 1 ? 4 : len === 2 ? 3 : 2)}…`;
  const terms = [0, 1, 2].map((i) => {
    const t = mul(a, pw(r, i));
    return (t.n / t.d).toFixed(m + len * (i + 1));
  });
  return {
    prompt: [T.prose(`${shown} repeats the ${len === 1 ? 'digit' : 'digits'} ${block} forever${lead ? ` after the ${lead}` : ''}. `
      + (lead ? `It is 0.${lead} + ${terms.join(' + ')} + …, where everything after 0.${lead} is a geometric series. ` : `It is the geometric series ${terms.join(' + ')} + …. `)
      + `Write ${shown} as a fraction.`)],
    text: `repeating: 0.${lead}(${block})`,
    answer: answer(value),
    visual: null,
    explain: `The repeating part has first term ${terms[0]} = ${qs(a)} and ratio ${qs(r)}, so it adds to ${qf(a)}/(1 − ${qs(r)}) = ${qs(div(a, sub(Q(1), r)))}.`
      + `${lead ? ` Add the 0.${lead} in front: ${qs(Q(Number(lead), ten))} + ${qs(div(a, sub(Q(1), r)))} = ${qs(value)}.` : ''} So ${shown} = ${qs(value)}.`,
  };
}

function infinite(rng) {
  const kind = rng.pick(['sum', 'sum', 'sum', 'sum', 'sum', 'sigma', 'sigma', 'sigma', 'sigma', 'decimal', 'decimal', 'decimal', 'which', 'which', 'which', 'which', 'back', 'back', 'back', 'back']);
  if (kind === 'decimal') return repeating(rng);
  if (kind === 'sum') {
    const r = Q(...rng.pick(SHRINK)), a = wholeStart(rng, r);
    const ts = geoTerms(a, r, 3);
    const { S, said } = infiniteSays(a, r);
    return {
      prompt: [T.prose(`Find the sum of the infinite geometric series ${added(ts, true)}.`)],
      text: `infinite sum: ${al(ts)}`,
      answer: answer(S),
      visual: null,
      explain: `The ratio is ${qs(ts[1])} ÷ ${qb(ts[0])} = ${qs(r)}. ${said} So the sum is ${qs(S)}.`,
    };
  }
  if (kind === 'sigma') {
    const r = Q(...rng.pick(SHRINK));
    const c = Q(rng.pick([1, 2, 3, 4, 5, 6, 8, 10, 12, -2, -3]));
    // From k = 1 with k − 1 in the power, from k = 0 with k, or from k = 1
    // with k, whose first term is already c·r.
    const [lo, s] = rng.pick([[1, 1], [1, 1], [0, 0], [1, 0]]);
    const src = geoRule(c, r, s);
    const a = mul(c, pw(r, lo - s));
    const { S, said } = infiniteSays(a, r);
    return {
      prompt: [T.prose('Find the sum'), T.sigma(`k = ${lo}`, '∞', body(src, false)), T.prose('.')],
      text: `infinite sigma: k=${lo} of ${src}`,
      answer: answer(S),
      visual: null,
      explain: `The first term is at k = ${lo}: ${qs(c)} · ${qb(r)}${sup(lo - s)} = ${qs(a)}${lo - s === 1 ? `, not ${qs(c)}` : ''}. Each term is ${qs(r)} times the one before. ${said} So the sum is ${qs(S)}.`,
    };
  }
  if (kind === 'back') {
    const r = Q(...rng.pick(SHRINK)), a = Q(rng.pick([1, 2, 3, 4, 5, 6, 8, 9, 10, 12, 15, 18, 20, 24, 30]) * rng.pick([1, r.d]));
    const S = div(a, sub(Q(1), r));
    if (!fits(S) || S.d > 20) return infinite(rng);
    if (rng.chance(0.5)) {
      return {
        prompt: [T.prose(`An infinite geometric series has sum ${qs(S)} and common ratio ${qs(r)}. What is its first term?`)],
        text: `infinite first: sum ${qa(S)}, r ${qa(r)}`,
        answer: answer(a),
        visual: null,
        explain: `S = a₁/(1 − r), so a₁ = S(1 − r) = ${qb(S)}(1 − ${tsum(r)}) = ${qs(S)} · ${qb(sub(Q(1), r))} = ${qs(a)}. So the first term is ${qs(a)}.`,
      };
    }
    return {
      prompt: [T.prose(`An infinite geometric series has first term ${qs(a)} and sum ${qs(S)}. What is its common ratio?`)],
      text: `infinite ratio: first ${qa(a)}, sum ${qa(S)}`,
      answer: answer(r),
      visual: null,
      explain: `S = a₁/(1 − r), so 1 − r = a₁/S = ${qs(a)}/${qb(S)} = ${qs(div(a, S))}, and r = 1 − ${tsum(div(a, S))} = ${qs(r)}. It is between −1 and 1, as it must be for a sum. So the ratio is ${qs(r)}.`,
    };
  }
  // requiem: catalogue/content/no-sum-asked-as-choice
  // which: one series of four has a sum, or one has none.
  for (;;) {
    const has = rng.chance(0.5);
    const pickR = (pool, k) => rng.shuffle(pool.slice()).slice(0, k).map((p) => Q(...p));
    const rs = has ? [...pickR(SHRINK, 1), ...pickR(GROW, 3)] : [...pickR(GROW, 1), ...pickR(SHRINK, 3)];
    const series = rs.map((r) => geoTerms(wholeStart(rng, r), r, 3));
    const opts = series.map((ts) => [al(ts), added(ts, true)]);
    const r0 = rs[0];
    const why = has
      ? `Its ratio is ${qs(r0)}, between −1 and 1, so its terms shrink toward 0 and it adds to ${qs(div(series[0][0], sub(Q(1), r0)))}. The others have ratios ${rs.slice(1).map(qs).join(', ')}: their terms never shrink, so they have no sum.`
      : `Its ratio is ${qs(r0)}, ${Math.abs(r0.n) === r0.d ? `so its terms never shrink` : 'outside −1 to 1, so its terms grow'} and it has no sum. The others have ratios ${rs.slice(1).map(qs).join(', ')}, all between −1 and 1, so each adds to a number.`;
    const ask = choice([T.prose(has ? 'Which of these infinite geometric series has a sum?' : 'Which of these infinite geometric series has no sum?')],
      `infinite which: ${has ? 'has sum' : 'no sum'}`, opts,
      `An infinite geometric series has a sum only when its ratio is between −1 and 1. ${why} So it is ${opts[0][1]}.`);
    if (ask) return ask(rng);
  }
}

// --- Series in Context -----------------------------------------------------------

const NAMES = ['Maya', 'Leo', 'Ava', 'Sam', 'Nora', 'Eli', 'Zoe', 'Omar', 'Ivy', 'Jon'];

function context(rng) {
  const kind = rng.pick(['seats', 'seats', 'seats', 'stack', 'stack', 'savings', 'savings', 'savings', 'growing', 'growing', 'growing', 'salary', 'salary', 'pendulum', 'pendulum', 'pendulum', 'ball', 'ball', 'ball', 'ball', 'bounces', 'bounces', 'bounces']);
  if (kind === 'seats') {
    const rows = rng.int(10, 40), first = rng.int(10, 30), more = rng.int(1, 4);
    const last = first + (rows - 1) * more;
    const S = (rows * (first + last)) / 2;
    return {
      prompt: [T.prose(`A theater has ${rows} rows of seats. The front row has ${first} seats, and each row has ${more} more than the row in front of it. How many seats are in the theater?`)],
      text: `seats: ${rows} rows, ${first} first, ${more} more each`,
      answer: answer(Q(S)),
      visual: null,
      explain: `The rows make an arithmetic series: ${first} + ${first + more} + ${first + 2 * more} + … for ${rows} terms. The back row has ${first} + ${rows - 1} × ${more} = ${last} seats. `
        + `Paired front with back, S = ${rows}(${first} + ${last})/2 = ${commas(S)}. So there are ${commas(S)} seats.`,
    };
  }
  if (kind === 'stack') {
    const bottom = rng.int(8, 30), top = rng.int(1, bottom - 4);
    const rows = bottom - top + 1, S = (rows * (bottom + top)) / 2;
    const what = rng.pick([['Logs', 'logs'], ['Cans', 'cans'], ['Oranges', 'oranges'], ['Bricks', 'bricks']]);
    return {
      prompt: [T.prose(`${what[0]} are stacked with ${bottom} in the bottom row, and each row above has one fewer than the row below it. The top row has ${top}. How many ${what[1]} are in the stack?`)],
      text: `stack: ${bottom} bottom, 1 fewer, ${top} top; ${what[1]}`,
      answer: answer(Q(S)),
      visual: null,
      explain: `The rows are ${bottom} + ${bottom - 1} + ${bottom - 2} + … + ${top}, an arithmetic series of ${bottom} − ${top} + 1 = ${rows} rows. `
        + `Paired bottom with top, S = ${rows}(${bottom} + ${top})/2 = ${S}. So there are ${S} ${what[1]}.`,
    };
  }
  if (kind === 'savings') {
    const first = rng.pick([5, 10, 12, 15, 20, 25, 30]), more = rng.pick([1, 2, 3, 4, 5, 10]), weeks = rng.int(8, 30);
    const last = first + (weeks - 1) * more, S = (weeks * (first + last)) / 2;
    const who = rng.pick(NAMES);
    return {
      prompt: [T.prose(`${who} saves $${first} the first week, and each week saves $${more} more than the week before. How many dollars has ${who} saved after ${weeks} weeks?`)],
      text: `savings: ${first} first, ${more} more, ${weeks} weeks`,
      answer: answer(Q(S)),
      visual: null,
      explain: `The weeks make an arithmetic series: ${first} + ${first + more} + ${first + 2 * more} + … for ${weeks} terms. Week ${weeks} saves ${first} + ${weeks - 1} × ${more} = $${last}. `
        + `S = ${weeks}(${first} + ${last})/2 = ${commas(S)}. So ${who} has saved $${commas(S)}.`,
    };
  }
  if (kind === 'growing') {
    const first = rng.pick([1, 2, 3, 5]), times = rng.pick([2, 2, 3]), days = rng.int(5, times === 2 ? 14 : 9);
    const S = (first * (times ** days - 1)) / (times - 1);
    if (!fits(Q(S))) return context(rng);
    const who = rng.pick(NAMES);
    const word = times === 2 ? 'twice' : 'three times';
    return {
      prompt: [T.prose(`${who} saves ${first}¢ on day 1, and each day saves ${word} as much as the day before. How many cents has ${who} saved after ${days} days?`)],
      text: `growing: ${first} first, times ${times}, ${days} days`,
      answer: answer(Q(S)),
      visual: null,
      explain: `The days make a geometric series: ${first} + ${first * times} + ${first * times * times} + … for ${days} terms, ratio ${times}. `
        + `S = ${first}(1 − ${times}${sup(days)})/(1 − ${times}) = ${first}(${commas(1 - times ** days)})/(${minus(1 - times)}) = ${commas(S)}. So ${who} has saved ${commas(S)}¢.`,
    };
  }
  if (kind === 'salary') {
    // Whole dollars every month: the first a multiple of 10 (or 5) to the
    // power of the months after it, and the total small enough to type.
    const pct = rng.pick([10, 20]), months = rng.int(3, 5), first = rng.int(4, 12) * 250;
    const r = Q(100 + pct, 100);
    const ts = geoTerms(Q(first), r, months);
    const S = sumOf(ts);
    if (!ts.every(isInt) || !fits(S)) return context(rng);
    const rn = pw(r, months);
    const who = rng.pick(['food truck', 'lemonade stand', 'bakery', 'bike shop']);
    // requiem: catalogue/content/series-one-geometric-form
    // requiem: catalogue/content/worked-steps-exact
    // The taught form, a₁(1 − rⁿ)/(1 − r), with every decimal exact.
    return {
      prompt: [T.prose(`A ${who} takes in $${commas(first)} in its first month, and each month it takes in ${pct}% more than the month before. How many dollars does it take in over its first ${months} months?`)],
      text: `takings: ${first} first, ${pct} percent, ${months} months`,
      answer: answer(S),
      visual: null,
      explain: `Rising ${pct}% multiplies the takings by ${dec(r)} each month, so the months make a geometric series: ${ts.map(qs).join(' + ')}, ratio ${dec(r)}. `
        + `S = a₁(1 − rⁿ)/(1 − r) = ${commas(first)}(1 − ${dec(r)}${sup(months)})/(1 − ${dec(r)}). ${dec(r)}${sup(months)} = ${dec(rn)}, so this is ${commas(first)}(${dec(sub(Q(1), rn))})/(${dec(sub(Q(1), r))}) = ${commas(first)}(${dec(div(sub(Q(1), rn), sub(Q(1), r)))}) = ${qs(S)}. `
        + `So it takes in $${qs(S)} in all.`,
    };
  }
  if (kind === 'pendulum') {
    // Whole centimeters every swing: the first is a multiple of the ratio's
    // bottom to the power of the swings after it.
    const [rn, rd] = rng.pick([[1, 2], [2, 3], [3, 4], [4, 5], [3, 5], [9, 10]]), swings = rng.int(3, rd >= 5 ? 3 : rd === 4 ? 4 : 5);
    const first = rng.int(1, 9) * rd ** (swings - 1);
    if (first < 12 || first > 200) return context(rng);
    const r = Q(rn, rd), ts = geoTerms(Q(first), r, swings), S = sumOf(ts);
    return {
      prompt: [T.prose(`A pendulum's first swing covers ${first} cm, and each swing after covers ${qs(r)} of the one before. How many centimeters do its first ${swings} swings cover in all?`)],
      text: `pendulum: ${first} first, ${qa(r)} each, ${swings} swings`,
      answer: answer(S),
      visual: null,
      explain: `The swings make a geometric series: ${listed(ts.slice(0, 3))}, …, ratio ${qs(r)}, ${swings} terms. `
        + `S = ${first}(1 − (${qs(r)})${sup(swings)})/(1 − ${qs(r)}) = ${first}(${qs(sub(Q(1), pw(r, swings)))})/(${qs(sub(Q(1), r))}) = ${qs(S)}. So they cover ${qs(S)} cm.`,
    };
  }
  // A dropped ball, rising a fraction of each fall.
  const [rn, rd] = rng.pick([[1, 2], [2, 3], [3, 4], [3, 5], [4, 5], [1, 3], [2, 5], [1, 4]]);
  const r = Q(rn, rd);
  const h = Q(rng.int(1, kind === 'ball' ? 12 : 6) * rd ** (kind === 'ball' ? 1 : 3));
  const unit = rng.pick(['feet', 'feet', 'meters']);
  if (h.n > 400) return context(rng);
  if (kind === 'ball') {
    const up = div(mul(h, r), sub(Q(1), r));
    const S = add(h, mul(Q(2), up));
    return {
      prompt: [T.prose(`A ball is dropped from ${qs(h)} ${unit}. Each time it lands, it bounces back up ${qs(r)} of the height it fell. How many ${unit} does it travel, up and down, before it comes to rest?`)],
      text: `ball: ${qa(h)} drop, ${qa(r)} rebound; ${unit}`,
      answer: answer(S),
      visual: null,
      explain: `It falls ${qs(h)} ${unit}, then each bounce goes up and comes back down the same height. The heights it rises are ${qs(mul(h, r))} + ${qs(mul(h, mul(r, r)))} + …, an infinite geometric series with ratio ${qs(r)}, adding to ${qf(mul(h, r))}/(1 − ${qs(r)}) = ${qs(up)}. `
        + `Up and down doubles that: ${qs(h)} + 2(${qs(up)}) = ${qs(S)}. So it travels ${qs(S)} ${unit}.`,
    };
  }
  const hits = rng.int(3, 5);
  const ups = geoTerms(mul(h, r), r, hits - 1);
  const S = add(h, mul(Q(2), sumOf(ups)));
  return {
    prompt: [T.prose(`A ball is dropped from ${qs(h)} ${unit}. Each time it lands, it bounces back up ${qs(r)} of the height it fell. How many ${unit} has it traveled, up and down, when it lands for the ${['', '', 'second', 'third', 'fourth', 'fifth'][hits]} time?`)],
    text: `ball: ${qa(h)} drop, ${qa(r)} rebound, ${hits} landings; ${unit}`,
    answer: answer(S),
    visual: null,
    explain: `It falls ${qs(h)} ${unit} to land the first time. Each of the next ${hits - 1} landings comes after a bounce up and the same height down; the bounces rise ${listed(ups)}. `
      + `So the distance is ${qs(h)} + 2(${ups.map(qs).join(' + ')}) = ${qs(h)} + 2(${qs(sumOf(ups))}) = ${qs(S)}. So it has traveled ${qs(S)} ${unit}.`,
  };
}

// --- Working Backward -------------------------------------------------------------

function backward(rng) {
  const kind = rng.pick(['count-a', 'count-a', 'count-a', 'count-a', 'count-g', 'count-g', 'count-g', 'count-g', 'diff', 'diff', 'diff', 'first', 'first', 'first', 'sn', 'sn', 'sn', 'sn', 'sn', 'sn']);
  if (kind === 'count-a') {
    for (;;) {
      const a = rng.int(-6, 15), d = rng.pick([1, 1, 2, 2, 2, 3, 4, 4, 5, 6]), n = rng.int(5, 25);
      const S = (n * (2 * a + (n - 1) * d)) / 2;
      if (S <= 0) continue;
      // The partial sums must reach S for the first time at n.
      let s = 0, first = 0;
      for (let k = 1; k <= n; k++) { s += a + (k - 1) * d; if (s === S && !first) first = k; }
      if (first !== n) continue;
      // requiem: catalogue/content/count-of-terms-factors-by-hand
      // n(2a + (n − 1)d)/2 = S: dn² + (2a − d)n − 2S = 0, its common factor
      // divided out, and kept to what quadratic-eq's By Factoring factors:
      // a leading coefficient up to 3 and a constant up to 150.
      const g = gcd(gcd(d, Math.abs(2 * a - d)), 2 * S);
      const [A, B, C] = [d / g, (2 * a - d) / g, (-2 * S) / g];
      if (A > 3 || Math.abs(C) > 150) continue;
      // A(n − N)(n − m) with m = −B/A − N: the second factor is An + (B + AN).
      const M = B + A * n, other = Q(-M, A);
      const ts = arithTerms(Q(a), Q(d), 3);
      const lead = (k) => (k === 1 ? '' : String(k));
      return {
        prompt: [T.prose(`How many terms of the arithmetic series ${added(ts, true)} add up to ${commas(S)}?`)],
        text: `terms to sum: ${al(ts)} make ${S}`,
        answer: answer(Q(n)),
        visual: null,
        explain: `With a₁ = ${minus(a)} and d = ${d}, Sₙ = n(2a₁ + (n − 1)d)/2 = n(${minus(2 * a)} + ${d}(n − 1))/2 = ${commas(S)}. `
          + `Multiplied out, ${quad(d, 2 * a - d, -2 * S)} = 0${g === 1 ? '' : `; divided by ${g}, ${quad(A, B, C)} = 0`}. `
          + `It factors as (n − ${n})(${lead(A)}n ${M < 0 ? '−' : '+'} ${Math.abs(M)}) = 0, so n = ${n} or n = ${qs(other)}. A count of terms cannot be negative. So ${n} terms add up to ${commas(S)}.`,
      };
    }
  }
  if (kind === 'count-g') {
    for (;;) {
      const a = rng.pick([1, 2, 3, 4, 5, 6, 7]), r = rng.pick([2, 2, 3, 3, 4, 5]), n = rng.int(3, r === 2 ? 11 : 7);
      const S = (a * (r ** n - 1)) / (r - 1);
      if (S > 30000) continue;
      const ts = geoTerms(Q(a), Q(r), 3);
      return {
        prompt: [T.prose(`How many terms of the geometric series ${added(ts, true)} add up to ${commas(S)}?`)],
        text: `terms to sum: ${al(ts)} make ${S}`,
        answer: answer(Q(n)),
        visual: null,
        // requiem: catalogue/content/series-one-geometric-form
        // The taught form, a₁(1 − rⁿ)/(1 − r), read backward.
        explain: `Sₙ = a₁(1 − rⁿ)/(1 − r) = ${a}(1 − ${r}ⁿ)/(${minus(1 - r)}) = ${commas(S)}, so 1 − ${r}ⁿ = ${commas(S)}(${minus(1 - r)})/${a} = ${commas(1 - r ** n)} and ${r}ⁿ = ${commas(r ** n)} = ${r}${sup(n)}. So ${n} terms add up to ${commas(S)}.`,
      };
    }
  }
  if (kind === 'diff' || kind === 'first') {
    for (;;) {
      const n = rng.int(6, 25), a = rng.int(-15, 30), d = rng.pick([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7]);
      const S = (n * (2 * a + (n - 1) * d)) / 2;
      if (!Number.isInteger(S) || S === 0) continue;
      if (kind === 'diff') {
        return {
          prompt: [T.prose(`An arithmetic series has ${n} terms, first term ${commas(a)} and sum ${commas(S)}. What is its common difference?`)],
          text: `find difference: ${n} terms, first ${a}, sum ${S}`,
          answer: answer(Q(d)),
          visual: null,
          explain: `Sₙ = n(a₁ + aₙ)/2, so ${commas(S)} = ${n}(${commas(a)} + a${sub_(n)})/2 and the last term is a${sub_(n)} = 2(${commas(S)})/${n} − ${signedP(a)} = ${commas(a + (n - 1) * d)}. `
            + `From ${commas(a)} to ${commas(a + (n - 1) * d)} is ${n - 1} steps of d: ${n - 1}d = ${commas((n - 1) * d)}. So the common difference is ${commas(d)}.`,
        };
      }
      return {
        prompt: [T.prose(`An arithmetic series has ${n} terms, common difference ${commas(d)} and sum ${commas(S)}. What is its first term?`)],
        text: `find first: ${n} terms, difference ${d}, sum ${S}`,
        answer: answer(Q(a)),
        visual: null,
        explain: `Sₙ = n(2a₁ + (n − 1)d)/2, so 2a₁ + (n − 1)d = 2Sₙ/n = 2(${commas(S)})/${n} = ${commas((2 * S) / n)}. Here (n − 1)d = ${n - 1}(${commas(d)}) = ${commas((n - 1) * d)}, so 2a₁ = ${commas((2 * S) / n)} − ${signedP((n - 1) * d)} = ${commas(2 * a)}. So the first term is ${commas(a)}.`,
      };
    }
  }
  // A term from two sums: aₙ = Sₙ − Sₙ₋₁.
  const exp = rng.chance(0.35);
  let src, at, shown;
  if (exp) {
    const b = rng.pick([2, 3, 4, 5]), c = rng.pick([1, 2, 3]);
    src = `${c === 1 ? '' : `${c}*`}${b}^n - ${c}`;
    shown = `${c === 1 ? '' : c}·${b}ⁿ − ${c}`.replace(/^·/, '');
    at = (n) => c * b ** n - c;
  } else {
    const p = rng.pick([1, 1, 2, 3, -1]), q = rng.pick([-5, -3, -2, -1, 1, 2, 3, 4, 5, 6]);
    src = `${p === 1 ? '' : p === -1 ? '-' : p}n^2 ${q < 0 ? '-' : '+'} ${Math.abs(q) === 1 ? '' : Math.abs(q)}n`;
    shown = `${p === 1 ? '' : p === -1 ? '−' : p}n² ${q < 0 ? '−' : '+'} ${Math.abs(q) === 1 ? '' : Math.abs(q)}n`;
    at = (n) => p * n * n + q * n;
  }
  const n = rng.int(exp ? 2 : 3, exp ? 6 : 12);
  const v = at(n) - at(n - 1);
  if (Math.abs(at(n)) > 100000) return backward(rng);
  return {
    prompt: [T.prose(`The sum of the first n terms of a sequence is Sₙ = ${shown}. What is a${sub_(n)}?`)],
    text: `term from sums: ${src}, a${n}`,
    answer: answer(Q(v)),
    visual: null,
    explain: `The first ${n} terms add to S${sub_(n)} and the first ${n - 1} to S${sub_(n - 1)}, so a${sub_(n)} is what S${sub_(n)} has that S${sub_(n - 1)} does not: `
      + `S${sub_(n)} = ${commas(at(n))}, S${sub_(n - 1)} = ${commas(at(n - 1))}, and ${commas(at(n))} − ${signedP(at(n - 1))} = ${commas(v)}. So a${sub_(n)} = ${commas(v)}.`,
  };
}
const signedP = (a) => (a < 0 ? `(${commas(a)})` : commas(a));
/** An² + Bn + C as prose: 2n² + 13n − 819. */
function quad(A, B, C) {
  const tail = (k, x) => (k === 0 ? '' : ` ${k < 0 ? '−' : '+'} ${Math.abs(k) === 1 && x ? '' : commas(Math.abs(k))}${x}`);
  return `${A === 1 ? '' : A}n²${tail(B, 'n')}${tail(C, '')}`;
}

const CONTENT = [arithmetic, geometric, sigma, infinite, context, backward];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  let p;
  // requiem: catalogue/library/frac-answer-fits-its-boxes
  do p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  while (p.answer.type === 'frac' && !fits(p.answer.value));
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
