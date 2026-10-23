/**
 * Catalogue authoring tool: builds the problem library for sequences.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 *
 * Every `text` carries the terms or the rule in plain ASCII, so
 * scripts/check-answers.py can work each answer out for itself.
 */
import * as T from '../terms.js';
import { minus, signed } from '../../web/ui/dom.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/sequences.js';

const SUB = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉' };
/** a₁, a₂₀: a term's name, as written on paper. */
const a = (n) => `a${String(n).replace(/\d/g, (c) => SUB[c])}`;
const list = (terms) => `${terms.map(minus).join(', ')}, …`;
const ascii = (terms) => terms.join(', ');

/** The n | aₙ table every level draws, with the step on reveal. */
function table(terms, { from = 1, working, ask } = {}) {
  const rows = terms.map((t, i) => [String(from + i), minus(t)]);
  // The row asked about: its term (aₙ = ?), or for "which term is", its n.
  if (ask) rows.push(['⋮', '⋮'], ask.back ? ['?', minus(ask.value)] : [String(ask.n), '?']);
  return {
    kind: 'table', cols: ['n', 'aₙ'], rows,
    ...(ask ? { fill: ask.back ? String(ask.n) : minus(ask.value) } : {}),
    ...(working ? { workingCol: 'step', working: [...working, ...(ask ? ['', ''] : [])] } : {}),
  };
}

const arithmetic = (first, d, count = 4) => Array.from({ length: count }, (_, i) => first + i * d);
const plus = (v) => (v < 0 ? `−${-v}` : `+${v}`);
const adds = (terms) => ['', ...terms.slice(1).map((t, i) => plus(t - terms[i]))];
/** 1st, 2nd, 3rd, 11th, 21st. */
const nth = (n) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
const times = (r) => (count) => ['', ...Array.from({ length: count - 1 }, () => `× ${r.n < 0 ? `(${r.label})` : r.label}`)];

/** A first term and a difference that is never zero. */
function arith(rng) {
  return { first: rng.int(-15, 30), d: rng.nonZero(-9, 12) };
}

function difference(rng) {
  const { first, d } = arith(rng);
  const terms = arithmetic(first, d, rng.int(4, 5));
  if (rng.chance(0.3)) {
    // A gap in the middle: the step is still there between the terms either side.
    const gap = rng.int(1, terms.length - 2);
    const shown = terms.map((t, i) => (i === gap ? '?' : minus(t)));
    return {
      prompt: [T.prose(`What is the missing term? ${shown.join(', ')}, …`)],
      text: `missing in ${terms.map((t, i) => (i === gap ? '?' : t)).join(', ')}`,
      answer: { type: 'int', value: terms[gap] },
      visual: { kind: 'table', cols: ['n', 'aₙ'], rows: terms.map((t, i) => [String(i + 1), i === gap ? '?' : minus(t)]),
        fill: minus(terms[gap]), workingCol: 'step', working: adds(terms) },
      explain: `Find the step from two terms side by side: ${minus(terms[gap === 1 ? 2 : 0])} to `
        + `${minus(terms[gap === 1 ? 3 : 1])} is ${d > 0 ? 'up' : 'down'} ${Math.abs(d)}. `
        + `So the missing term is ${minus(terms[gap - 1])} ${d > 0 ? '+' : '−'} ${Math.abs(d)} = ${minus(terms[gap])}.`,
    };
  }
  return {
    prompt: [T.prose(`What is the common difference? ${list(terms)}`)],
    text: `difference of ${ascii(terms)}`,
    answer: { type: 'int', value: d },
    visual: table(terms, { working: adds(terms) }),
    explain: `Take any term from the one after it: ${minus(terms[1])} − ${signed(terms[0])} = ${minus(d)}. `
      + `${d < 0 ? 'The sequence is falling, so the difference is negative' : 'Every step is the same'}: ${minus(d)}.`,
  };
}

function anyTerm(rng) {
  const { first, d } = arith(rng);
  const terms = arithmetic(first, d);
  const n = rng.int(10, 60);
  const value = first + (n - 1) * d;
  if (rng.chance(0.3)) {
    // Backwards: which term is this number? The same formula, solved for n.
    return {
      prompt: [T.prose(`In the sequence ${list(terms)} which term is ${minus(value)}?`)],
      text: `which term is ${value} in ${ascii(terms)}`,
      answer: { type: 'int', value: n },
      visual: table(terms, { working: adds(terms), ask: { n, value, back: true } }),
      explain: `aₙ = ${minus(first)} + (n − 1)·${signed(d)}. Set that equal to ${minus(value)}: `
        + `(n − 1)·${signed(d)} = ${minus(value - first)}, so n − 1 = ${(value - first) / d}, and n = ${n}. `
        + `It is term ${n}.`,
    };
  }
  const given = rng.chance(0.4);
  return {
    prompt: given
      ? [T.prose(`An arithmetic sequence has ${a(1)} = ${minus(first)} and common difference ${minus(d)}. What is ${a(n)}?`)]
      : [T.prose(`What is the ${nth(n)} term of ${list(terms)}`)],
    text: given ? `term ${n} with a1 = ${first} d = ${d}` : `term ${n} of ${ascii(terms)}`,
    answer: { type: 'int', value },
    visual: table(terms, { working: adds(terms), ask: { n, value } }),
    explain: `From ${a(1)} to ${a(n)} is ${n - 1} steps, not ${n}: the first term takes none. `
      + `${a(n)} = ${minus(first)} + ${n - 1} × ${signed(d)} = ${minus(first)} ${d < 0 ? '−' : '+'} ${Math.abs((n - 1) * d)} = ${minus(value)}.`,
  };
}

/** b + m·n as written: 4n − 1, −2n + 10, 3n. */
function ruleText(m, b) {
  const lead = `${m === 1 ? '' : m === -1 ? '−' : minus(m)}n`;
  return b === 0 ? lead : `${lead} ${b < 0 ? '−' : '+'} ${Math.abs(b)}`;
}

function writeRule(rng) {
  const { first, d } = arith(rng);
  const terms = arithmetic(first, d);
  const b = first - d;
  return {
    prompt: [T.prose(`Write a rule for the nth term: ${list(terms)}`)],
    text: `rule for ${ascii(terms)}`,
    answer: { type: 'rule', value: { m: { n: d, d: 1 }, b: { n: b, d: 1 } } },
    visual: table(terms, { working: adds(terms) }),
    explain: `The difference is ${minus(d)}, so aₙ = ${minus(first)} + ${signed(d)}(n − 1). `
      + `Multiplying out gives ${ruleText(d, b)}. Check: n = 1 gives `
      + `${b === 0 ? minus(d) : `${minus(d)} ${b < 0 ? '−' : '+'} ${Math.abs(b)}`} = ${minus(first)}.`,
  };
}

/**
 * A ratio as a fraction n/d, and as it is written. Fractional ratios come
 * with a first term that keeps every term whole: 48, 24, 12, 6 for a half,
 * 16, 24, 36, 54 for three halves.
 */
function ratio(rng) {
  const [n, d] = rng.pick([[2, 1], [2, 1], [3, 1], [3, 1], [-2, 1], [-3, 1], [4, 1], [5, 1],
    [1, 2], [-1, 2], [1, 3], [3, 2]]);
  return { n, d, r: n / d, label: d === 1 ? minus(n) : `${minus(n)}/${d}` };
}

function geometric(first, r, count) {
  const out = [first];
  for (let i = 1; i < count; i++) out.push(out[i - 1] * r.n / r.d);
  return out;
}

/** A first term that keeps `count` terms whole for this ratio. */
function start(rng, r, count) {
  if (r.d === 1) return rng.pick([1, 2, 3, 4, 5, 6, 7, 10, -1, -2, -3, -4, -5]);
  return rng.pick([1, 2, 3, 5, -1, -3]) * r.d ** (count - 1);
}

function commonRatio(rng) {
  const r = ratio(rng);
  const count = Math.abs(r.r) >= 4 ? 4 : rng.int(4, 5);
  const terms = geometric(start(rng, r, count), r, count);
  return {
    prompt: [T.prose(`What is the common ratio? ${list(terms)}`)],
    text: `ratio of ${ascii(terms)}`,
    // Always a fraction box, a whole ratio typed with the bottom left empty:
    // a box that changed shape for 1/2 would say so before the division did.
    answer: { type: 'frac', value: { n: r.n, d: r.d } },
    visual: table(terms, { working: times(r)(count) }),
    explain: `Divide any term by the one before it: ${minus(terms[1])} ÷ ${signed(terms[0])} = ${r.label}. `
      + (r.r < 0 ? 'The signs take turns, which is a negative ratio.'
        : Math.abs(r.r) < 1 ? 'The terms are shrinking, so the ratio is less than 1.'
          : r.d > 1 ? 'Not a whole number: each term is one and a half times the last.'
          : 'Every step multiplies by the same number.'),
  };
}

function geometricTerm(rng) {
  const r = ratio(rng);
  // Three terms are shown, so the fourth would only be the next one.
  const n = Math.abs(r.r) >= 4 ? 5 : Math.abs(r.r) === 3 || r.d > 2 || r.n === 3 ? rng.int(5, 7) : rng.int(6, 9);
  const first = start(rng, r, n);
  const all = geometric(first, r, n);
  const terms = all.slice(0, 3);
  const value = all[n - 1];
  const given = rng.chance(0.4);
  const power = `${r.d === 1 ? signed(r.n) : `(${r.label})`}${String(n - 1).replace(/\d/g, (c) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[c])}`;
  return {
    prompt: given
      ? [T.prose(`A geometric sequence has ${a(1)} = ${minus(first)} and common ratio ${r.label}. What is ${a(n)}?`)]
      : [T.prose(`What is the ${nth(n)} term of ${list(terms)}`)],
    text: given ? `term ${n} with a1 = ${first} r = ${r.n}/${r.d}` : `term ${n} of ${ascii(terms)}`,
    answer: { type: 'int', value },
    visual: table(terms, { working: times(r)(3), ask: { n, value } }),
    explain: `From ${a(1)} to ${a(n)} the ratio is used ${n - 1} times. `
      + `${a(n)} = ${minus(first)} × ${power} = ${minus(first)} ${r.d === 1 ? `× ${signed(r.n ** (n - 1))}`
        : Math.abs(r.n) === 1 ? `÷ ${signed(r.n ** (n - 1) * r.d ** (n - 1))}`
          : `× ${signed(r.n ** (n - 1))} ÷ ${r.d ** (n - 1)}`} = ${minus(value)}.`,
  };
}

/** Each term from the last: a one-step rule, or a two-term one like Fibonacci's. */
function recursive(rng) {
  const ask = rng.int(4, 6);
  if (rng.chance(0.3)) {
    const t = [rng.int(-3, 5), rng.int(1, 6)];
    while (t.length < ask) t.push(t[t.length - 1] + t[t.length - 2]);
    return {
      prompt: [T.prose(`${a(1)} = ${minus(t[0])}, ${a(2)} = ${minus(t[1])}, and each term after is the sum of the two before it: `
        + `aₙ = aₙ₋₁ + aₙ₋₂. What is ${a(ask)}?`)],
      text: `recursive ${t[0]}, ${t[1]} | p + q | term ${ask}`,
      answer: { type: 'int', value: t[ask - 1] },
      visual: { kind: 'table', cols: ['n', 'aₙ'],
        rows: t.map((v, i) => [String(i + 1), i < 2 ? minus(v) : i === ask - 1 ? '?' : '']),
        fill: minus(t[ask - 1]), workingCol: 'from the two before',
        working: t.map((v, i) => (i < 2 ? '' : `${minus(t[i - 2])} + ${signed(t[i - 1])} = ${minus(v)}`)) },
      explain: `Build it up: ${t.slice(2).map((v, i) => `${a(i + 3)} = ${minus(t[i])} + ${signed(t[i + 1])} = ${minus(v)}`).join('; ')}.`,
    };
  }
  const k = rng.pick([2, 2, 3, -1, 1, 1]);
  const c = k === 1 ? rng.nonZero(-7, 9) : rng.int(-5, 5);
  const t = [rng.int(-4, 6)];
  while (t.length < ask) t.push(k * t[t.length - 1] + c);
  if (Math.abs(t[ask - 1]) > 400) return recursive(rng);
  const rule = `${k === 1 ? '' : k === -1 ? '−' : k}aₙ₋₁${c === 0 ? '' : ` ${c < 0 ? '−' : '+'} ${Math.abs(c)}`}`;
  const prev = (v) => (k === 1 ? minus(v) : k === -1 ? `−${signed(v)}` : `${k} × ${signed(v)}`);
  const step = (v, i) => `${a(i + 2)} = ${prev(t[i])}${c === 0 ? '' : ` ${c < 0 ? '−' : '+'} ${Math.abs(c)}`} = ${minus(v)}`;
  return {
    prompt: [T.prose(`${a(1)} = ${minus(t[0])} and aₙ = ${rule}. What is ${a(ask)}?`)],
    text: `recursive ${t[0]} | ${k}p + ${c} | term ${ask}`,
    answer: { type: 'int', value: t[ask - 1] },
    visual: { kind: 'table', cols: ['n', 'aₙ'],
      rows: t.map((v, i) => [String(i + 1), i === 0 ? minus(v) : i === ask - 1 ? '?' : '']),
      fill: minus(t[ask - 1]), workingCol: 'from the one before',
      working: t.map((v, i) => (i === 0 ? '' : `${prev(t[i - 1])}${c === 0 ? '' : ` ${c < 0 ? '−' : '+'} ${Math.abs(c)}`} = ${minus(v)}`)) },
    explain: `aₙ₋₁ is the term before. Start at ${a(1)} = ${minus(t[0])} and apply the rule `
      + `${ask - 1} times: ${t.slice(1).map((v, i) => step(v, i)).join('; ')}.`,
  };
}

const KINDS = [
  { id: 'arithmetic', label: 'Arithmetic', note: 'adds the same each time' },
  { id: 'geometric', label: 'Geometric', note: 'multiplies by the same' },
  { id: 'neither', label: 'Neither' },
];

/**
 * Which kind? The not-either cases are the ones a student meets and has to
 * resist: squares (the differences grow steadily), a step that itself
 * steps, and a two-term rule.
 */
function whichKind(rng) {
  const pick = rng.pick(['arithmetic', 'geometric', 'neither']);
  let terms, why;
  if (pick === 'arithmetic') {
    // Fewer of these than there could be, so that the three answers come up
    // about equally: there are far more arithmetic sequences than geometric.
    const first = rng.int(-6, 12), d = rng.nonZero(-5, 6);
    terms = arithmetic(first, d, 5);
    why = `The differences are all ${minus(d)}: arithmetic.`;
  } else if (pick === 'geometric') {
    const r = ratio(rng);
    const count = Math.abs(r.r) >= 4 ? 4 : rng.int(4, 5);
    // Any whole start for a whole ratio, so there are about as many of these as of the others.
    terms = geometric(r.d === 1 ? rng.nonZero(-8, 12) : start(rng, r, count), r, count);
    const diffs = terms.slice(1).map((t, i) => t - terms[i]);
    why = `The differences are ${diffs.map(minus).join(', ')}: not the same. `
      + `But each term is the one before times ${r.label}: geometric.`;
  } else {
    const shape = rng.pick(['squares', 'growing', 'two-term']);
    if (shape === 'squares') {
      const s = rng.int(1, 5), sh = rng.int(-3, 5);
      terms = Array.from({ length: 5 }, (_, i) => (s + i) ** 2 + sh);
    } else if (shape === 'growing') {
      const first = rng.int(-3, 8), d0 = rng.int(1, 4), dd = rng.nonZero(-2, 2);
      terms = [first];
      for (let i = 0; i < 4; i++) terms.push(terms[i] + d0 + i * dd);
    } else {
      terms = [rng.int(1, 4), rng.int(2, 6)];
      while (terms.length < 6) terms.push(terms[terms.length - 1] + terms[terms.length - 2]);
    }
    const diffs = terms.slice(1).map((t, i) => t - terms[i]);
    why = `The differences are ${diffs.map(minus).join(', ')}, which change, so it is not arithmetic. `
      + `${minus(terms[1])} ÷ ${signed(terms[0])} and ${minus(terms[2])} ÷ ${signed(terms[1])} are not the same either, `
      + 'so it is not geometric. Neither.';
    // A difference that is constant after all, or a ratio that is, would be a mislabel.
    const geo = terms.slice(1, -1).every((t, i) => t * t === terms[i] * terms[i + 2]);
    if (new Set(diffs).size === 1 || terms.some((t) => t === 0) || geo) return whichKind(rng);
  }
  return {
    prompt: [T.prose(`What kind of sequence is ${list(terms)}`)],
    text: `kind of ${ascii(terms)}`,
    answer: { type: 'choice', value: pick, options: KINDS },
    visual: table(terms, { working: adds(terms) }),
    explain: `Differences first, then ratios. ${why}`,
  };
}

const CONTENT = [difference, anyTerm, writeRule, commonRatio, geometricTerm, recursive, whichKind];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  // The mixed level deals from every level, Which Kind included: its
  // question names its own answers, and the rule level asks for a rule in
  // words, so no question is answered by the box it comes with.
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
