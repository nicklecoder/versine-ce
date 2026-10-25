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
/** ASCII, for the text: -3/4. */
const qa = (p) => (p.d === 1 ? String(p.n) : `${p.n}/${p.d}`);
/** Prose: −3/4. */
const qs = (p) => (p.d === 1 ? commas(p.n) : `${minus(p.n)}/${p.d}`);
/** A whole number as US prose writes it: −12,500. */
const commas = (n) => minus(n).replace(/\d{4,}/, (m) => Number(m).toLocaleString('en-US'));
/** In brackets when negative or a fraction, for a product: 3(−2), 5(1/2). */
const qb = (p) => (p.n < 0 || p.d !== 1 ? `(${qs(p)})` : qs(p));
const answer = (p) => ({ type: 'frac', value: Q(p.n, p.d), requireSimplest: false });

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
    if (big(S)) continue;
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
function geoWork(a, r, n) {
  const rn = pw(r, n), top = sub(Q(1), rn), bot = sub(Q(1), r);
  const S = div(mul(a, top), bot);
  return {
    S,
    said: `S${sub_(n)} = a₁(1 − rⁿ)/(1 − r) = ${qs(a)}(1 − ${qb(r)}${sup(n)})/(1 − ${qb(r)}). `
      + `${qb(r)}${sup(n)} = ${qs(rn)}, so this is ${qs(a)}(${qs(top)})/(${qs(bot)}) = ${qs(S)}.`,
  };
}

function geometric(rng) {
  const kind = rng.pick(['first', 'first', 'first', 'first', 'to', 'to', 'to', 'ends', 'ends', 'ends']);
  for (;;) {
    const [a, r] = geoSeed(rng);
    const n = rng.int(4, isInt(r) ? (Math.abs(r.n) >= 4 ? 6 : 9) : 8);
    const ts = geoTerms(a, r, n), l = ts[n - 1];
    const { S, said } = geoWork(a, r, n);
    if (big(S) || ts.some(big) || (!isInt(r) && Math.abs(r.n) > r.d && n > 6)) continue;
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

function sigma(rng) {
  const kind = rng.pick(['lin', 'lin', 'lin', 'geo', 'geo', 'sq', 'sq', 'count', 'count', 'which', 'which', 'which']);
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
  // Writing a sum in sigma notation is asked by choosing the series a sigma
  // writes out: Σ is read here, never typed.
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
    if (big(S) || ts.some(big)) continue;
    const n = hi - lo + 1;
    let how;
    if (kind === 'lin') {
      how = `The terms go ${rule.p.a > 0 ? 'up' : 'down'} by ${Math.abs(rule.p.a)} each time, an arithmetic series of ${hi} − ${lo} + 1 = ${n} terms from ${qs(ts[0])} to ${qs(ts[n - 1])}. `
        + `Paired first with last, S = ${n}(${qs(ts[0])} + ${qb(ts[n - 1])})/2 = ${qs(S)}.`;
    } else if (kind === 'geo') {
      const r = rule.p.r;
      how = `The terms are ${listed(ts.slice(0, 3))}, …: a geometric series of ${n} terms with first term ${qs(ts[0])} and ratio ${qs(r)}. `
        + `S = ${qs(ts[0])}(1 − ${qb(r)}${sup(n)})/(1 − ${qb(r)}) = ${qs(S)}.`;
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
  return { S, said: `Since −1 < ${qs(r)} < 1, the terms shrink toward 0 and the sum settles: S = a₁/(1 − r) = ${qs(a)}/(1 − ${qb(r)}) = ${qs(a)}/(${qs(sub(Q(1), r))}) = ${qs(S)}.` };
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
    explain: `The repeating part has first term ${terms[0]} = ${qs(a)} and ratio ${qs(r)}, so it adds to ${qb(a)}/(1 − ${qs(r)}) = ${qs(div(a, sub(Q(1), r)))}.`
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
    if (big(S) || S.d > 20) return infinite(rng);
    if (rng.chance(0.5)) {
      return {
        prompt: [T.prose(`An infinite geometric series has sum ${qs(S)} and common ratio ${qs(r)}. What is its first term?`)],
        text: `infinite first: sum ${qa(S)}, r ${qa(r)}`,
        answer: answer(a),
        visual: null,
        explain: `S = a₁/(1 − r), so a₁ = S(1 − r) = ${qb(S)}(1 − ${qb(r)}) = ${qs(S)} · ${qb(sub(Q(1), r))} = ${qs(a)}. So the first term is ${qs(a)}.`,
      };
    }
    return {
      prompt: [T.prose(`An infinite geometric series has first term ${qs(a)} and sum ${qs(S)}. What is its common ratio?`)],
      text: `infinite ratio: first ${qa(a)}, sum ${qa(S)}`,
      answer: answer(r),
      visual: null,
      explain: `S = a₁/(1 − r), so 1 − r = a₁/S = ${qs(a)}/${qb(S)} = ${qs(div(a, S))}, and r = 1 − ${qb(div(a, S))} = ${qs(r)}. It is between −1 and 1, as it must be for a sum. So the ratio is ${qs(r)}.`,
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
        + `Paired front with back, S = ${rows}(${first} + ${last})/2 = ${S.toLocaleString('en-US')}. So there are ${S.toLocaleString('en-US')} seats.`,
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
        + `S = ${weeks}(${first} + ${last})/2 = ${S.toLocaleString('en-US')}. So ${who} has saved $${S.toLocaleString('en-US')}.`,
    };
  }
  if (kind === 'growing') {
    const first = rng.pick([1, 2, 3, 5]), times = rng.pick([2, 2, 3]), days = rng.int(5, times === 2 ? 14 : 9);
    const S = (first * (times ** days - 1)) / (times - 1);
    const who = rng.pick(NAMES);
    const word = times === 2 ? 'twice' : 'three times';
    return {
      prompt: [T.prose(`${who} saves ${first}¢ on day 1, and each day saves ${word} as much as the day before. How many cents has ${who} saved after ${days} days?`)],
      text: `growing: ${first} first, times ${times}, ${days} days`,
      answer: answer(Q(S)),
      visual: null,
      explain: `The days make a geometric series: ${first} + ${first * times} + ${first * times * times} + … for ${days} terms, ratio ${times}. `
        + `S = ${first}(1 − ${times}${sup(days)})/(1 − ${times}) = ${first}(${times ** days} − 1)/${times - 1} = ${S.toLocaleString('en-US')}. So ${who} has saved ${S.toLocaleString('en-US')}¢.`,
    };
  }
  if (kind === 'salary') {
    const pct = rng.pick([10, 20]), years = rng.int(3, 5), pay = rng.int(2, 6) * 10000;
    const r = Q(100 + pct, 100);
    const ts = geoTerms(Q(pay), r, years);
    const S = sumOf(ts);
    return {
      prompt: [T.prose(`A job pays $${pay.toLocaleString('en-US')} in its first year, and the pay rises ${pct}% each year. How many dollars does it pay in all over ${years} years?`)],
      text: `salary: ${pay} first, ${pct} percent, ${years} years`,
      answer: answer(S),
      visual: null,
      explain: `Rising ${pct}% multiplies the pay by ${(100 + pct) / 100} each year, so the years make a geometric series: ${ts.map((t) => (t.n / t.d).toLocaleString('en-US')).join(' + ')}, ratio ${(100 + pct) / 100}. `
        + `S = ${pay.toLocaleString('en-US')}(${(100 + pct) / 100}${sup(years)} − 1)/(${(100 + pct) / 100} − 1) = ${(S.n / S.d).toLocaleString('en-US')}. So it pays $${(S.n / S.d).toLocaleString('en-US')} in all.`,
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
      explain: `It falls ${qs(h)} ${unit}, then each bounce goes up and comes back down the same height. The heights it rises are ${qs(mul(h, r))} + ${qs(mul(h, mul(r, r)))} + …, an infinite geometric series with ratio ${qs(r)}, adding to ${qs(mul(h, r))}/(1 − ${qs(r)}) = ${qs(up)}. `
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
      const a = rng.int(-6, 15), d = rng.int(1, 8), n = rng.int(5, 25);
      const S = (n * (2 * a + (n - 1) * d)) / 2;
      if (S <= 0) continue;
      // The partial sums must reach S for the first time at n.
      let s = 0, first = 0;
      for (let k = 1; k <= n; k++) { s += a + (k - 1) * d; if (s === S && !first) first = k; }
      if (first !== n) continue;
      const ts = arithTerms(Q(a), Q(d), 3);
      // n(2a + (n − 1)d)/2 = S: dn² + (2a − d)n − 2S = 0.
      const B = 2 * a - d;
      return {
        prompt: [T.prose(`How many terms of the arithmetic series ${added(ts, true)} add up to ${S}?`)],
        text: `terms to sum: ${al(ts)} make ${S}`,
        answer: answer(Q(n)),
        visual: null,
        explain: `With a₁ = ${minus(a)} and d = ${d}, Sₙ = n(2a₁ + (n − 1)d)/2 = n(${minus(2 * a)} + ${d}(n − 1))/2 = ${S}. Multiplied out, ${d === 1 ? '' : d}n²${B === 0 ? '' : ` ${B < 0 ? '−' : '+'} ${Math.abs(B) === 1 ? '' : Math.abs(B)}n`} − ${2 * S} = 0, `
          + `whose roots are n = ${n} and n = ${qs(Q(-B - d * n, d))}. A count of terms cannot be negative. So ${n} terms add up to ${S}.`,
      };
    }
  }
  if (kind === 'count-g') {
    for (;;) {
      const a = rng.pick([1, 2, 3, 4, 5, 6, 7]), r = rng.pick([2, 2, 3, 3, 4, 5]), n = rng.int(3, r === 2 ? 11 : 7);
      const S = (a * (r ** n - 1)) / (r - 1);
      if (S > 200000) continue;
      const ts = geoTerms(Q(a), Q(r), 3);
      return {
        prompt: [T.prose(`How many terms of the geometric series ${added(ts, true)} add up to ${S.toLocaleString('en-US')}?`)],
        text: `terms to sum: ${al(ts)} make ${S}`,
        answer: answer(Q(n)),
        visual: null,
        explain: `Sₙ = ${a}(${r}ⁿ − 1)/(${r} − 1) = ${S}, so ${r}ⁿ − 1 = ${(S * (r - 1)) / a} and ${r}ⁿ = ${r ** n} = ${r}${sup(n)}. So ${n} terms add up to ${S.toLocaleString('en-US')}.`,
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
          prompt: [T.prose(`An arithmetic series has ${n} terms, first term ${minus(a)} and sum ${minus(S)}. What is its common difference?`)],
          text: `find difference: ${n} terms, first ${a}, sum ${S}`,
          answer: answer(Q(d)),
          visual: null,
          explain: `Sₙ = n(a₁ + aₙ)/2, so ${minus(S)} = ${n}(${minus(a)} + a${sub_(n)})/2 and the last term is a${sub_(n)} = 2(${minus(S)})/${n} − ${signedP(a)} = ${minus(a + (n - 1) * d)}. `
            + `From ${minus(a)} to ${minus(a + (n - 1) * d)} is ${n - 1} steps of d: ${n - 1}d = ${minus((n - 1) * d)}. So the common difference is ${minus(d)}.`,
        };
      }
      return {
        prompt: [T.prose(`An arithmetic series has ${n} terms, common difference ${minus(d)} and sum ${minus(S)}. What is its first term?`)],
        text: `find first: ${n} terms, difference ${d}, sum ${S}`,
        answer: answer(Q(a)),
        visual: null,
        explain: `Sₙ = n(2a₁ + (n − 1)d)/2, so 2a₁ + (n − 1)d = 2Sₙ/n = 2(${minus(S)})/${n} = ${minus((2 * S) / n)}. Here (n − 1)d = ${n - 1}(${minus(d)}) = ${minus((n - 1) * d)}, so 2a₁ = ${minus((2 * S) / n)} − ${signedP((n - 1) * d)} = ${minus(2 * a)}. So the first term is ${minus(a)}.`,
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
      + `S${sub_(n)} = ${minus(at(n))}, S${sub_(n - 1)} = ${minus(at(n - 1))}, and ${minus(at(n))} − ${at(n - 1) < 0 ? `(${minus(at(n - 1))})` : at(n - 1)} = ${minus(v)}. So a${sub_(n)} = ${minus(v)}.`,
  };
}
const signedP = (a) => (a < 0 ? `(${minus(a)})` : String(a));

const CONTENT = [arithmetic, geometric, sigma, infinite, context, backward];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
