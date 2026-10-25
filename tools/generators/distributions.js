/**
 * Catalogue authoring tool: builds the problem library for distributions.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 *
 * Every `text` carries the data the question is about, so that
 * scripts/check-answers.py can work the answer out again: a box plot as its
 * five numbers, a histogram as its first edge, bin width and counts, a data
 * set as its values, and a normal distribution as its mean and standard
 * deviation. Choice options are written by what they mean.
 */
import * as T from '../terms.js';
import { LINE, ASKED, GIVEN, r2, text as label } from './figures.js';
import { chart, niceAxis, DOT, AXIS } from './charts.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/distributions.js';

// ── Numbers ─────────────────────────────────────────────────────────────

const clean = (v) => Math.round(v * 1e6) / 1e6;
const said = (v) => clean(v).toLocaleString('en-US', { maximumFractionDigits: 6 }).replace('-', '−');
const asc = (v) => String(clean(v));
/** A decimal answer over the smallest power of ten that holds it. */
function decimal(v) {
  for (let d = 1; d <= 1000; d *= 10) {
    const n = Math.round(v * d);
    if (Math.abs(n - v * d) < 1e-6) return { n, d };
  }
  throw new Error(`${v} runs past three places`);
}
const num = (v) => ({ type: 'decimal', value: decimal(v) });
const LETTERS = ['a', 'b', 'c', 'd'];
/** A unit as it reads after "in": in inches, in pounds, in °F. */
const inUnit = (u) => ({ $: 'dollars', in: 'inches', ft: 'feet', lb: 'pounds', oz: 'ounces', g: 'grams' }[u] ?? u);
const sum = (xs) => xs.reduce((s, x) => s + x, 0);
const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
/** 1st, 2nd, 3rd, 11th, 22nd. */
const nth = (n) => `${n}${[11, 12, 13].includes(n % 100) ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
/** A percent: exact if it ends within one place, else rounded half up to one. */
function percentOf(part, whole) {
  const tenths = (1000 * part) / whole;
  if (Number.isInteger(tenths)) return { answer: num(tenths / 10), rounded: false, shown: said(tenths / 10) };
  const q = Math.floor((2000 * part + whole) / (2 * whole));
  return { answer: { type: 'decimal', value: { n: q, d: 10, places: 1 } }, rounded: true, shown: (q / 10).toFixed(1) };
}

// ── Contexts ────────────────────────────────────────────────────────────

// requiem: catalogue/content/units-both-systems
// What a data set measures, in both systems where it has units, with a
// range its values are drawn from.
// `step` is the box plots' tick step: every five-number value is a multiple
// of it, so it sits on a labelled tick. `u` is the spread of a data list.
const MEASURES = [
  { what: 'test scores', unit: 'points', of: (v) => `${said(v)}\u00a0points`, lo: 40, hi: 100, step: 5, u: 3 },
  { what: 'commute times', unit: 'minutes', of: (v) => `${said(v)}\u00a0minutes`, lo: 5, hi: 60, step: 5, u: 3 },
  { what: 'heights of plants', unit: 'in', of: (v) => `${said(v)}\u00a0in`, lo: 4, hi: 30, step: 2, u: 2 },
  { what: 'heights of plants', unit: 'cm', of: (v) => `${said(v)}\u00a0cm`, lo: 10, hi: 75, step: 5, u: 4 },
  { what: 'daily high temperatures', unit: '°F', of: (v) => `${said(v)}°F`, lo: 40, hi: 95, step: 5, u: 3 },
  { what: 'daily high temperatures', unit: '°C', of: (v) => `${said(v)}°C`, lo: 2, hi: 35, step: 2, u: 2 },
  { what: 'prices of a T-shirt at different stores', unit: '$', of: (v) => `$${said(v)}`, lo: 8, hi: 40, step: 2, u: 2 },
  { what: 'weights of apples', unit: 'oz', of: (v) => `${said(v)}\u00a0oz`, lo: 4, hi: 12, step: 1, u: 1 },
  { what: 'weights of apples', unit: 'g', of: (v) => `${said(v)}\u00a0g`, lo: 110, hi: 340, step: 20, u: 12 },
];
const axisTitle = (M) => `${M.what.replace(/ (at|of a) .*$/, '').replace(/^\w/, (c) => c.toUpperCase())} (${M.unit})`;

// ── Box plots ───────────────────────────────────────────────────────────

// requiem: catalogue/content/box-plot-values-on-ticks
/**
 * Five increasing values inside M's range, each a multiple of M.step so it
 * sits on a labelled tick, all within `win` (a stretch of tick positions,
 * [first, last]), spanning at least `least` steps. Two different values are
 * then always a whole step or more apart.
 */
const tickRange = (M) => [Math.ceil(M.lo / M.step), Math.floor(M.hi / M.step)];
function fiveOf(rng, M, win = tickRange(M), least = 5) {
  const [a, b] = win;
  for (;;) {
    const ends = [rng.int(a, b), rng.int(a, b)].sort((p, q) => p - q);
    if (ends[1] - ends[0] < least) continue;
    const inside = rng.shuffle(Array.from({ length: ends[1] - ends[0] - 1 }, (_, i) => ends[0] + 1 + i)).slice(0, 3);
    if (inside.length < 3) continue;
    return [ends[0], ...inside.sort((p, q) => p - q), ends[1]].map((k) => k * M.step);
  }
}
/** A window of at most 10 tick steps for a box plot, or two drawn on one axis. */
function boxWindow(rng, M) {
  const [a, b] = tickRange(M);
  const w = Math.min(10, b - a);
  const s = rng.int(a, b - w);
  return [s, s + w];
}

/**
 * Box plots drawn over one axis, each [name, five], stacked upward. `shown`
 * lists what the answer reveals, each [plot, from, to]: a bar under the box
 * for a stretch, or a line across it for a single value.
 */
function boxPlots(M, plots, shown = []) {
  const all = plots.flatMap(([, f]) => f);
  // Ticked at the values' own step, one step beyond each end.
  const x = [Math.max(0, Math.min(...all) - M.step), Math.max(...all) + M.step, M.step];
  const H = 2.2 * plots.length;
  const c = chart({ x, y: [0, H, 1], titles: { x: axisTitle(M) }, W: 11, H, yTicks: false });
  plots.forEach(([name, f], i) => {
    const y = 1.1 + 2.2 * i, top = y + 0.55, bot = y - 0.55;
    const P = (v, h) => c.at([v, h]);
    const seg = (a, b) => ({ kind: 'segment', from: a, to: b, tone: DOT });
    c.spec.marks.push(
      seg(P(f[0], y), P(f[1], y)), seg(P(f[3], y), P(f[4], y)),
      seg(P(f[0], y - 0.3), P(f[0], y + 0.3)), seg(P(f[4], y - 0.3), P(f[4], y + 0.3)),
      seg(P(f[1], bot), P(f[3], bot)), seg(P(f[1], top), P(f[3], top)),
      seg(P(f[1], bot), P(f[1], top)), seg(P(f[3], bot), P(f[3], top)),
      { kind: 'segment', from: P(f[2], bot), to: P(f[2], top), tone: LINE },
      { kind: 'region', points: [P(f[1], bot), P(f[3], bot), P(f[3], top), P(f[1], top)], tone: DOT },
    );
    if (name) c.spec.marks.push(label([r2(c.X(x[0]) - 0.8), c.Y(y)], name, GIVEN));
  });
  // Revealed: the line or stretch asked about, with its value written above the box.
  for (const [i, a, b, name] of shown) {
    const y = 1.1 + 2.2 * i;
    c.spec.answer.push(a === b
      ? { kind: 'segment', from: c.at([a, y - 0.8]), to: c.at([a, y + 0.8]) }
      : { kind: 'segment', from: c.at([a, y - 0.85]), to: c.at([b, y - 0.85]) });
    c.spec.answer.push({ kind: 'text', at: c.at([(a + b) / 2, y + 1.05]), label: name ?? (a === b ? said(a) : said(b - a)) });
  }
  return c.spec;
}
const fiveAsc = (f) => f.join(' ');

const PARTS = {
  min: ['the least value', (f) => f[0]], q1: ['the first quartile (Q1)', (f) => f[1]], median: ['the median', (f) => f[2]],
  q3: ['the third quartile (Q3)', (f) => f[3]], max: ['the greatest value', (f) => f[4]],
  iqr: ['the interquartile range', (f) => f[3] - f[1]], range: ['the range', (f) => f[4] - f[0]],
};
// What share of the data lies between two of the five numbers.
const SHARES = [['min', 'q1'], ['q1', 'median'], ['median', 'q3'], ['q3', 'max'], ['q1', 'q3'], ['min', 'median'],
  ['median', 'max'], ['min', 'q3'], ['q1', 'max']];
const ORDER = ['min', 'q1', 'median', 'q3', 'max'];

function boxLevel(rng) {
  const M = rng.pick(MEASURES);
  const mode = rng.pick(['read', 'read', 'share', 'outlier', 'compare']);
  if (mode === 'compare') {
    // Two plots; the one with the longer whiskers need not have the wider box.
    const win = boxWindow(rng, M);
    for (;;) {
      const A = fiveOf(rng, M, win, 4), B = fiveOf(rng, M, win, 4);
      const ask = rng.pick(['iqr', 'range', 'median']);
      const [, get] = PARTS[ask];
      if (get(A) === get(B)) continue;
      if (ask === 'iqr' && Math.sign(A[3] - A[1] - (B[3] - B[1])) === Math.sign(A[4] - A[0] - (B[4] - B[0])) && rng.chance(0.7)) continue;
      const want = get(A) > get(B) ? 'A' : 'B';
      const words = { iqr: 'has the greater interquartile range', range: 'has the greater range', median: 'has the greater median' }[ask];
      return {
        prompt: [T.prose(`The box plots show two sets of ${M.what}. Which set ${words}?`)],
        text: `box plots greater ${ask}: A ${fiveAsc(A)} / B ${fiveAsc(B)}`,
        answer: { type: 'choice', value: want, options: [{ id: 'A', label: 'Set A' }, { id: 'B', label: 'Set B' }] },
        visual: boxPlots(M, [['A', A], ['B', B]], [A, B].map((f, i) => (ask === 'median' ? [i, f[2], f[2]] : ask === 'iqr' ? [i, f[1], f[3]] : [i, f[0], f[4]]))),
        explain: `${cap(PARTS[ask][0])}: A ${ask === 'median' ? `is ${A[2]}` : ask === 'iqr' ? `is ${A[3]} − ${A[1]} = ${A[3] - A[1]}` : `is ${A[4]} − ${A[0]} = ${A[4] - A[0]}`}, `
          + `B ${ask === 'median' ? `is ${B[2]}` : ask === 'iqr' ? `is ${B[3]} − ${B[1]} = ${B[3] - B[1]}` : `is ${B[4]} − ${B[0]} = ${B[4] - B[0]}`}. `
          + `(${ask === 'iqr' ? 'The IQR is the width of the box only; the whiskers do not count.' : ask === 'range' ? 'The range runs whisker end to whisker end, not just across the box.' : 'The median is the line inside the box, not the middle of the box.'}) So set ${want}.`,
      };
    }
  }
  const f = fiveOf(rng, M, boxWindow(rng, M));
  const SPAN = { min: [0, 0], q1: [1, 1], median: [2, 2], q3: [3, 3], max: [4, 4], iqr: [1, 3], range: [0, 4] };
  const intro = `The box plot shows ${M.what}, in ${inUnit(M.unit)}.`;
  if (mode === 'read') {
    const ask = rng.pick(['min', 'q1', 'median', 'q3', 'max', 'iqr', 'iqr', 'range']);
    const [words, get] = PARTS[ask];
    const v = get(f);
    const visual = boxPlots(M, [[null, f]], [[0, f[SPAN[ask][0]], f[SPAN[ask][1]]]]);
    return {
      prompt: [T.prose(`${intro} What is ${words}?`)],
      text: `box plot ${ask}: ${fiveAsc(f)}`,
      answer: num(v),
      visual,
      explain: `The five numbers are ${f.join(', ')}: least, Q1, median, Q3, greatest. `
        + ({ iqr: `The IQR is Q3 − Q1 = ${f[3]} − ${f[1]} = ${v}. (The range, ${f[4]} − ${f[0]}, uses the whisker ends instead.)`,
          range: `The range is greatest − least = ${f[4]} − ${f[0]} = ${v}. (The IQR, Q3 − Q1, is only the box.)`,
          median: 'The median is the line inside the box. (It need not sit halfway across the box.)',
          q1: 'Q1 is the left edge of the box. (The left whisker end is the least value.)',
          q3: 'Q3 is the right edge of the box. (The right whisker end is the greatest value.)',
          min: 'The least value is the end of the left whisker. (Q1 is where the box starts.)',
          max: 'The greatest value is the end of the right whisker. (Q3 is where the box ends.)' }[ask])
        + ` So ${said(v)}.`,
    };
  }
  if (mode === 'share') {
    const [a, b] = rng.pick(SHARES);
    const share = 25 * (ORDER.indexOf(b) - ORDER.indexOf(a));
    const at = (k) => f[ORDER.indexOf(k)];
    const visual = boxPlots(M, [[null, f]], [[0, at(a), at(b), `${share}%`]]);
    return {
      prompt: [T.prose(`${intro} About what percent of the values are between ${M.of(at(a))} and ${M.of(at(b))}?`)],
      text: `box plot percent from ${a} to ${b}: ${fiveAsc(f)}`,
      answer: { ...num(share), percent: true },
      visual,
      explain: `${M.of(at(a))} is ${PARTS[a][0]} and ${M.of(at(b))} is ${PARTS[b][0]}. The five numbers cut the data into four parts of 25% each, and ${share / 25} of them ${share === 25 ? 'lies' : 'lie'} between: ${share / 25} × 25% = ${share}%. `
        + `(A longer part is more spread out, not fuller: each holds a quarter.) So ${share}%.`,
    };
  }
  // The 1.5 × IQR rule for an outlier.
  const iqr = f[3] - f[1];
  const above = rng.chance(0.5);
  const fence = above ? f[3] + 1.5 * iqr : f[1] - 1.5 * iqr;
  const out = rng.chance(0.5);
  const v = Math.round(above ? fence + (out ? rng.int(1, 6) : -rng.int(1, 6)) : fence + (out ? -rng.int(1, 6) : rng.int(1, 6)));
  const isOut = above ? v > fence : v < fence;
  if (v < 0 || (above ? v <= f[3] : v >= f[1])) return boxLevel(rng);
  return {
    prompt: [T.prose(`A data set has Q1 = ${f[1]} and Q3 = ${f[3]}. By the 1.5 × IQR rule, is ${v} an outlier?`)],
    text: `outlier rule: q1 ${f[1]} q3 ${f[3]}, value ${v}`,
    answer: { type: 'choice', value: isOut ? 'yes' : 'no', options: [{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }] },
    visual: null,
    explain: `IQR = ${f[3]} − ${f[1]} = ${iqr}, and 1.5 × ${iqr} = ${said(1.5 * iqr)}. `
      + (above ? `The upper fence is Q3 + ${said(1.5 * iqr)} = ${said(fence)}.` : `The lower fence is Q1 − ${said(1.5 * iqr)} = ${said(fence)}.`)
      + ` ${v} is ${isOut ? 'beyond' : 'inside'} it. (The fence is measured from the quartile, not from the median.) So ${isOut ? 'yes' : 'no'}.`,
  };
}

// ── Histograms ──────────────────────────────────────────────────────────

const HIST = [
  { what: 'test scores', unit: 'points', starts: [40, 50], widths: [10] },
  { what: 'commute times', unit: 'minutes', starts: [0, 5], widths: [5, 10] },
  { what: 'heights of students', unit: 'in', starts: [54, 56], widths: [2, 3] },
  { what: 'heights of students', unit: 'cm', starts: [135, 140], widths: [5] },
  { what: 'daily high temperatures', unit: '°F', starts: [40, 50], widths: [5, 10] },
  { what: 'daily high temperatures', unit: '°C', starts: [0, 5], widths: [3, 5] },
  { what: 'weights of packages', unit: 'lb', starts: [0], widths: [2, 4] },
  { what: 'weights of packages', unit: 'kg', starts: [0], widths: [1, 2] },
];

/** Counts of a chosen shape: 'right' (tail to the right), 'left' or 'symmetric'. */
function countsOf(rng, shape, k) {
  if (shape === 'symmetric') {
    const half = Array.from({ length: Math.ceil(k / 2) }, () => 0);
    let v = rng.int(1, 3);
    for (let i = 0; i < half.length; i++) { half[i] = v; v += rng.int(2, 5); }
    return k % 2 ? [...half, ...half.slice(0, -1).reverse()] : [...half, ...[...half].reverse()];
  }
  const peak = rng.int(0, 1);
  const c = [];
  let v = rng.int(9, 16);
  for (let i = 0; i < k; i++) {
    if (i < peak) c.push(rng.int(3, 7));
    else { c.push(Math.max(1, v)); v = Math.max(1, v - rng.int(2, 5)); }
  }
  return shape === 'right' ? c : c.reverse();
}

/** Every value standing at its bar's midpoint: the mean and median the shape is judged by. */
function centers(start, w, counts) {
  const xs = counts.flatMap((n, i) => Array(n).fill(start + w * i + w / 2));
  const n = xs.length;
  const median = n % 2 ? xs[(n - 1) / 2] : (xs[n / 2 - 1] + xs[n / 2]) / 2;
  return { mean: sum(xs) / n, median };
}

/** `short` draws it lower, so a level with long options keeps Check on a phone screen. */
function histogram(H, start, w, counts, { lit = [], lines = [], short = false } = {}) {
  const k = counts.length, top = Math.max(...counts);
  const step = top <= 8 ? 1 : top <= 16 ? 2 : 5;
  const y = [0, Math.ceil(top / step) * step, step];
  const c = chart({ x: [start, start + w * k, w], y, titles: { x: `${H.what.replace(/^\w/, (ch) => ch.toUpperCase())} (${H.unit})`, y: 'frequency' }, ...(short ? { H: 5.5 } : {}) });
  counts.forEach((n, i) => {
    const a = start + w * i, b = a + w;
    const P = [c.at([a, 0]), c.at([b, 0]), c.at([b, n]), c.at([a, n])];
    c.spec.marks.push({ kind: 'region', points: P, tone: DOT },
      { kind: 'segment', from: P[0], to: P[3], tone: DOT }, { kind: 'segment', from: P[3], to: P[2], tone: DOT },
      { kind: 'segment', from: P[2], to: P[1], tone: DOT });
    if (lit.includes(i)) c.spec.answer.push({ kind: 'region', points: P });
  });
  // A center drawn as a dashed line up from the axis, named above it.
  // Two lines are named outward, the lower value's to its left, so the names never cross.
  const order = [...lines].sort((p, q) => p[0] - q[0]);
  order.forEach(([x, name], n) => {
    const shift = order.length === 1 ? 0 : n === 0 ? -1.3 : 1.3;
    c.spec.answer.push({ kind: 'segment', from: c.at([x, 0]), to: c.at([x, y[1]]), dashed: true },
      { kind: 'text', at: [r2(c.X(x) + shift), r2(c.Y(y[1]) + 0.35)], label: name });
  });
  return c.spec;
}
const histAsc = (start, w, counts) => `from ${start} width ${w} counts ${counts.join(' ')}`;
const binName = (start, w, i) => `${said(start + w * i)} to ${said(start + w * (i + 1))}`;

function drawHist(rng, shape = rng.pick(['right', 'left', 'symmetric'])) {
  const H = rng.pick(HIST), start = rng.pick(H.starts), w = rng.pick(H.widths);
  const k = rng.int(5, 7);
  return { H, start, w, counts: countsOf(rng, shape, k), shape };
}

function histLevel(rng, keep = {}) {
  const { H, start, w, counts } = drawHist(rng);
  const k = counts.length, N = sum(counts);
  const draw = (lit) => histogram(H, start, w, counts, { lit });
  const intro = `The histogram shows ${N} ${H.what}, in ${inUnit(H.unit)}. Each bar includes its left edge but not its right.`;
  const mode = keep.mode ?? rng.pick(['count', 'count', 'total', 'percent', 'median']);
  if (mode === 'total') {
    return {
      prompt: [T.prose(`The histogram shows some ${H.what}, in ${inUnit(H.unit)}. How many values are there in all?`)],
      text: `histogram total: ${histAsc(start, w, counts)}`,
      answer: num(N),
      visual: draw(counts.map((_, n) => n)),
      explain: `Each bar's height is how many values fall in its interval, so add the heights: ${counts.join(' + ')} = ${N}. `
        + `(The number of bars, ${k}, counts intervals, not values.) So ${N}.`,
    };
  }
  if (mode === 'median') {
    // Only when both middle values share a bar, so the bar is certain.
    const at = (pos) => { let s = 0; for (let i = 0; i < k; i++) { s += counts[i]; if (pos <= s) return i; } return k - 1; };
    const lo = at(Math.floor((N + 1) / 2)), hi = at(Math.ceil((N + 1) / 2));
    if (lo !== hi) return histLevel(rng, { mode });
    const tallest = counts.indexOf(Math.max(...counts));
    // requiem: catalogue/content/median-bin-key-anywhere
    // The options stay in order along the axis, and the key's place among
    // them is drawn first, so no position is a safe guess; the tallest bar
    // is among the decoys whenever it fits on its side.
    const m = keep.m ?? rng.pick([3, 4]), pos = keep.pos ?? rng.int(0, m - 1);
    const below = Array.from({ length: lo }, (_, i) => i), above = Array.from({ length: k - 1 - lo }, (_, i) => lo + 1 + i);
    if (below.length < pos || above.length < m - 1 - pos) return histLevel(rng, { mode, m, pos });
    const side = (pool, n) => {
      const first = pool.includes(tallest) && n > 0 ? [tallest] : [];
      return [...first, ...rng.shuffle(pool.filter((b) => b !== tallest)).slice(0, n - first.length)];
    };
    const pickBins = [...side(below, pos), lo, ...side(above, m - 1 - pos)].sort((p, q) => p - q);
    const opts = pickBins.map((i, n) => ({ id: LETTERS[n], bin: i, label: binName(start, w, i) }));
    const want = opts.find((o) => o.bin === lo).id;
    let run = 0;
    const where = counts.map((n) => { run += n; return run; });
    return {
      prompt: [T.prose(`${intro} Which interval contains the median?`)],
      text: `histogram median bin: ${histAsc(start, w, counts)}; options ${opts.map((o) => `${o.id}=${o.bin + 1}`).join(', ')}`,
      answer: { type: 'choice', value: want, options: opts.map(({ id, label: l }) => ({ id, label: l })) },
      visual: draw([lo]),
      explain: `With ${N} values, the median is the ${N % 2 ? nth((N + 1) / 2) : `${nth(N / 2)} and ${nth(N / 2 + 1)}`} in order. Counting up the bars: ${where.join(', ')}. `
        + `${N % 2 ? 'It lands' : 'Both land'} in the bar for ${binName(start, w, lo)}. `
        + `(${tallest === lo ? 'Here it is also the tallest bar, but only because the counting says so.' : 'The tallest bar is the most common interval, the mode, not the middle.'}) So ${binName(start, w, lo)}.`,
    };
  }
  // A run of bars, as a count or a percent.
  const i = rng.int(0, k - 2), j = rng.int(i + 1, Math.min(k, i + 3));
  const part = sum(counts.slice(i, j));
  const lo = start + w * i, hi = start + w * j;
  if (mode === 'count') {
    const fromLow = i === 0 && rng.chance(0.5);
    return {
      prompt: [T.prose(fromLow
        ? `The histogram shows some ${H.what}, in ${inUnit(H.unit)}. How many values are less than ${said(hi)}?`
        : `The histogram shows some ${H.what}, in ${inUnit(H.unit)}. Each bar includes its left edge but not its right. How many values are from ${said(lo)} up to ${said(hi)}?`)],
      text: `histogram count from ${asc(lo)} to ${asc(hi)}: ${histAsc(start, w, counts)}`,
      answer: num(part),
      visual: draw(Array.from({ length: j - i }, (_, n) => i + n)),
      explain: `The bars from ${said(lo)} to ${said(hi)} have heights ${counts.slice(i, j).join(', ')}: ${counts.slice(i, j).join(' + ')} = ${part}. `
        + `(Count bar heights, not bars: ${j - i} bar${j - i === 1 ? '' : 's'} hold ${part} values.) So ${part}.`,
    };
  }
  const P = percentOf(part, N);
  return {
    prompt: [T.prose(`${intro} What percent of the values are from ${said(lo)} up to ${said(hi)}?${P.rounded ? ' Round to the nearest tenth of a percent.' : ''}`)],
    text: `histogram percent from ${asc(lo)} to ${asc(hi)}: ${histAsc(start, w, counts)}${P.rounded ? ' to 1 dp' : ''}`,
    answer: { ...P.answer, percent: true },
    visual: draw(Array.from({ length: j - i }, (_, n) => i + n)),
    explain: `${j - i === 1 ? 'That bar holds' : `Those bars hold ${counts.slice(i, j).join(' + ')} =`} ${part} of the ${counts.join(' + ')} = ${N} values: ${part} ÷ ${N} × 100 = ${P.rounded ? `${((100 * part) / N).toFixed(3)}…, which is ${P.shown} to 1 dp` : P.shown}. `
      + `(The whole is every value, all the bars together.) So ${P.shown}%.`,
  };
}

// ── Shape and center ────────────────────────────────────────────────────

/** The mean and median as lines on a histogram, one line when they meet. */
// Both are estimates, each value taken at its bar's midpoint, and labelled so.
const centerLines = (mean, median) => (Math.abs(mean - median) < 1e-9 ? [[mean, 'mean ≈ median']]
  : [[mean, `mean ≈ ${said(Math.round(mean * 10) / 10)}`], [median, `median ≈ ${said(median)}`]]);
const ESTIMATE = 'The dashed lines are estimates, taking each value at the middle of its bar.';

const SHAPES = { right: 'Skewed right', left: 'Skewed left', symmetric: 'Symmetric' };

/** A histogram of the shape asked for, redrawn until its mean and median show it. */
function histOfShape(rng, shape) {
  for (;;) {
    const h = drawHist(rng, shape);
    const { mean, median } = centers(h.start, h.w, h.counts);
    if (shape === 'symmetric' || (Math.abs(mean - median) >= 0.3 * h.w && (mean > median) === (shape === 'right'))) return { ...h, mean, median };
  }
}

function shapeLevel(rng) {
  // The shape is drawn once and kept, so a redraw cannot tilt the keys toward symmetric.
  const shape = rng.pick(['right', 'left', 'symmetric']);
  const { H, start, w, counts, mean, median } = histOfShape(rng, shape);
  const visual = histogram(H, start, w, counts, { lines: centerLines(mean, median), short: true });
  const ask = rng.pick(['shape', 'shape', 'larger', 'center']);
  const tail = shape === 'right' ? 'The bars trail off in a long tail to the right'
    : shape === 'left' ? 'The bars trail off in a long tail to the left' : 'The bars mirror each other about the middle';
  if (ask === 'shape') {
    const opts = Object.entries(SHAPES).map(([id, l]) => ({ id, label: l }));
    return {
      prompt: [T.prose(`The histogram shows some ${H.what}, in ${inUnit(H.unit)}. How would you describe its shape?`)],
      text: `histogram shape: ${histAsc(start, w, counts)}`,
      answer: { type: 'choice', value: shape, options: opts },
      visual,
      explain: `${tail}${shape === 'symmetric' ? '.' : ', and a skew is named for its tail.'} ${ESTIMATE} `
        + `(${shape === 'symmetric' ? 'Symmetric means the two halves match, not that the bars are all the same height.' : `The peak is on the ${shape === 'right' ? 'left' : 'right'}; it is the tail that names it.`}) So ${SHAPES[shape].toLowerCase()}.`,
    };
  }
  if (ask === 'larger') {
    const want = shape === 'symmetric' ? 'equal' : shape === 'right' ? 'mean' : 'median';
    const opts = [{ id: 'mean', label: 'The mean' }, { id: 'median', label: 'The median' }, { id: 'equal', label: 'They are about the same' }];
    return {
      prompt: [T.prose(`The histogram shows some ${H.what}, in ${inUnit(H.unit)}. Which is greater, the mean or the median?`)],
      text: `histogram mean or median: ${histAsc(start, w, counts)}`,
      answer: { type: 'choice', value: want, options: opts },
      visual,
      explain: `${tail}. ${ESTIMATE} ${shape === 'symmetric' ? 'Balanced data has its mean and median together in the middle.'
        : `The few values far out in the tail pull the mean ${shape === 'right' ? 'up' : 'down'}, while the median only counts how many are on each side.`} `
        + `(${shape === 'symmetric' ? 'With no tail, nothing drags the mean off center.' : 'The mean is not nearer the peak: the tail drags it away from it.'}) So ${opts.find((o) => o.id === want).label.toLowerCase()}.`,
    };
  }
  const want = shape === 'symmetric' ? 'mean' : 'median';
  const opts = [{ id: 'mean', label: 'The mean' }, { id: 'median', label: 'The median' }];
  return {
    prompt: [T.prose(`The histogram shows some ${H.what}, in ${inUnit(H.unit)}. Which better describes the center of the data?`)],
    text: `histogram center: ${histAsc(start, w, counts)}`,
    answer: { type: 'choice', value: want, options: opts },
    visual,
    explain: `${tail}. ${ESTIMATE} ${shape === 'symmetric' ? 'With no tail to pull it, the mean uses every value and sits in the middle.'
      : 'The tail pulls the mean away from where most of the data is; the median stays put.'} `
      + `(${shape === 'symmetric' ? 'The median would do too, but the mean is the usual choice for symmetric data.' : 'A skewed set is described by its median, as a set with an outlier is.'}) So the ${want}.`,
  };
}

// ── Standard deviation ──────────────────────────────────────────────────

/** A small data set whose mean and standard deviation (dividing by n) are whole. */
function wholeSd(rng, lo, hi) {
  for (;;) {
    const n = rng.pick([5, 5, 6, 6, 8]);
    const xs = Array.from({ length: n }, () => rng.int(lo, hi));
    const s = sum(xs);
    if (s % n) continue;
    const mean = s / n;
    const ss = sum(xs.map((x) => (x - mean) ** 2));
    if (ss % n) continue;
    const v = ss / n, sd = Math.round(Math.sqrt(v));
    if (sd * sd === v && sd > 0 && new Set(xs).size >= 3) return { xs, mean, ss, v, sd };
  }
}

function sdLevel(rng) {
  const mode = rng.pick(['find', 'find', 'find', 'compare', 'change']);
  if (mode === 'change') {
    // requiem: catalogue/content/fixed-menu-key-moves
    // Some rows ask the same of the mean, which an added number does move:
    // asked only of the standard deviation, "it becomes sd + k" was never
    // the key and could be struck unread. Weighted so stays, plus and times
    // are each keyed about a third of the time.
    const [of, times] = rng.pick([['sd', false], ['sd', false], ['mean', false], ['mean', false], ['sd', true], ['mean', true]]);
    const k = rng.int(2, 9);
    // requiem: catalogue/content/choice-labels-distinct
    // 2 + 2 and 2 × 2 are both 4, which would print one option twice.
    const v = of === 'mean' ? rng.int(k === 2 ? 3 : 2, 40) : k === 2 ? rng.int(3, 9) : rng.int(2, 9);
    const want = times ? 'times' : of === 'mean' ? 'plus' : 'same';
    // requiem: catalogue/content/decoys-crossed-not-centred
    // Bare numbers: worded "It stays v" beside two "It becomes ...", the two
    // that change were each other's nearest and the medoid whenever the key
    // changed, two rows in three.
    const opts = [{ id: 'same', label: `${v}` }, { id: 'plus', label: `${v + k}` }, { id: 'times', label: `${v * k}` }];
    const name = of === 'sd' ? 'standard deviation' : 'mean';
    return {
      prompt: [T.prose(`A data set has a ${name} of ${v}. Every value is ${times ? `multiplied by ${k}` : `increased by ${k}`}. What is the ${name} now?`)],
      text: `${of} change: ${of} ${v}, ${times ? 'times' : 'plus'} ${k}; options same, plus, times`,
      answer: { type: 'choice', value: want, options: opts },
      visual: null,
      explain: of === 'mean'
        ? (times
          ? `Multiplying every value by ${k} multiplies their total by ${k}, and the count stays, so the mean becomes ${k} × ${v} = ${v * k}. So it becomes ${v * k}.`
          : `Adding ${k} to every value adds ${k} × the count to the total, and dividing by the count again leaves ${k} more: ${v} + ${k} = ${v + k}. (The center moves; the spread would not.) So it becomes ${v + k}.`)
        : times
          ? `Multiplying every value by ${k} stretches every distance from the mean by ${k} too, so the spread becomes ${k} × ${v} = ${v * k}. (The mean is multiplied as well, but the spread is about distances.) So it becomes ${v * k}.`
          : `Adding ${k} to every value slides the whole set along: the mean goes up by ${k}, and every distance from it stays the same. (The center moves; the spread does not.) So it stays ${v}.`,
    };
  }
  if (mode === 'compare') {
    // Two sets with the same mean, one more spread than the other.
    for (;;) {
      const A = wholeSd(rng, 2, 20), B0 = wholeSd(rng, 2, 20);
      if (A.sd === B0.sd || A.xs.length !== B0.xs.length) continue;
      // Slid along to A's mean, which moves no distance from it.
      const B = { ...B0, xs: B0.xs.map((x) => x + A.mean - B0.mean), mean: A.mean };
      if (B.xs.some((x) => x <= 0)) continue;
      const want = A.sd > B.sd ? 'A' : 'B';
      const ra = Math.max(...A.xs) - Math.min(...A.xs), rb = Math.max(...B.xs) - Math.min(...B.xs);
      return {
        prompt: [T.prose(`Set A is ${A.xs.join(', ')}. Set B is ${B.xs.join(', ')}. Both have a mean of ${A.mean}. Which has the greater standard deviation?`)],
        text: `greater sd: A ${A.xs.join(' ')} / B ${B.xs.join(' ')}`,
        answer: { type: 'choice', value: want, options: [{ id: 'A', label: 'Set A' }, { id: 'B', label: 'Set B' }] },
        visual: null,
        explain: `The standard deviation is the typical distance from the mean. A's squared distances from ${A.mean} add to ${A.ss}, and B's to ${B.ss}; over ${A.xs.length} values that gives ${A.sd} and ${B.sd}. `
          + `(${(ra > rb) === (A.sd > B.sd) ? 'The wider range agrees here, but it is every distance that counts, not only the two ends.' : 'The set with the wider range is not the more spread out here: every distance counts, not only the two ends.'}) So set ${want}.`,
      };
    }
  }
  const M = rng.pick(MEASURES.filter((m) => m.hi - m.lo <= 70));
  const { xs, mean, ss, v, sd } = wholeSd(rng, M.lo, Math.min(M.hi, M.lo + 30));
  const devs = xs.map((x) => x - mean);
  return {
    prompt: [T.prose(`These are ${xs.length} ${M.what}, in ${inUnit(M.unit)}: ${xs.join(', ')}. Find the standard deviation, dividing by the number of values.`)],
    text: `sd: ${xs.join(' ')}`,
    answer: num(sd),
    visual: { kind: 'table', cols: ['Value'], rows: xs.map((x) => [String(x)]),
      workingCol: 'Squared distance from the mean', working: devs.map((d) => `(${said(d)})² = ${d * d}`) },
    explain: `The mean is ${xs.join(' + ')} = ${sum(xs)}, ÷ ${xs.length} = ${mean}. The distances from it, squared, are ${devs.map((d) => d * d).join(', ')}, which add to ${ss}. `
      + `Divide by ${xs.length}: ${ss} ÷ ${xs.length} = ${v}, and take the square root: √${v} = ${sd}. `
      + `(Without the square root, ${v} is the variance, in squared units.) So ${M.of(sd)}.`,
  };
}

// ── The normal curve ────────────────────────────────────────────────────

// requiem: catalogue/content/distributions-empirical-rule
// The share of a normal distribution in each band of one standard
// deviation, one side of the mean: the 68-95-99.7 rule split in halves.
const BAND = [34, 13.5, 2.35, 0.15];
/** Percent between k1 and k2 standard deviations (−4 and 4 stand for no limit). */
function bandPercent(k1, k2) {
  let p = 0;
  for (let k = k1; k < k2; k++) p += BAND[k < 0 ? -k - 1 : k];
  return clean(p);
}

const NORMALS = [
  { what: 'heights of adult women', unit: 'in', of: (v) => `${said(v)}\u00a0in`, mean: [63, 65], sd: [2, 3] },
  { what: 'heights of adult women', unit: 'cm', of: (v) => `${said(v)}\u00a0cm`, mean: [160, 166], sd: [6, 7] },
  // `wide`: the spread can be twice as large and still be believable.
  { what: 'scores on a test', unit: 'points', of: (v) => `${said(v)}\u00a0points`, mean: [70, 80], sd: [5, 10], wide: true },
  { what: 'battery lives', unit: 'hours', of: (v) => `${said(v)}\u00a0hours`, mean: [20, 40], sd: [2, 5] },
  { what: 'weights of cereal boxes', unit: 'oz', of: (v) => `${said(v)}\u00a0oz`, mean: [16, 20], sd: [1, 1] },
  { what: 'weights of cereal boxes', unit: 'g', of: (v) => `${said(v)}\u00a0g`, mean: [450, 550], sd: [10, 15] },
  { what: 'commute times', unit: 'minutes', of: (v) => `${said(v)}\u00a0minutes`, mean: [25, 40], sd: [4, 6], wide: true },
];

function normalCurve(N, mu, sd, k1, k2) {
  const c = chart({ x: [mu - 3 * sd, mu + 3 * sd, sd], y: [0, 0.45, 0.1], titles: { x: `${N.what.replace(/^\w/, (ch) => ch.toUpperCase())} (${N.unit})` }, W: 11, H: 5, yTicks: false });
  const pdf = (z) => Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI);
  const zs = Array.from({ length: 61 }, (_, i) => -3 + i * 0.1);
  c.spec.marks.push({ kind: 'path', points: zs.map((z) => c.at([mu + z * sd, pdf(z)])), tone: DOT });
  for (let k = -2; k <= 2; k++) {
    c.spec.marks.push({ kind: 'segment', from: c.at([mu + k * sd, 0]), to: c.at([mu + k * sd, pdf(k)]), tone: AXIS, dashed: true });
  }
  const a = Math.max(k1, -3), b = Math.min(k2, 3);
  const under = zs.filter((z) => z >= a - 1e-9 && z <= b + 1e-9);
  const top = under.map((z) => c.at([mu + z * sd, pdf(z)]));
  const region = { kind: 'region', points: [c.at([mu + a * sd, 0]), ...top, c.at([mu + b * sd, 0])] };
  // Revealed: the percent first, where the verdict mark is drawn beside it;
  // the shading twice over and its edge traced, so it reads on a dark screen.
  const mid = (a + b) / 2, inner = Math.abs(mid) > 2.2 ? Math.sign(mid) * 1.6 : mid;
  c.spec.answer.push(
    { kind: 'text', at: c.at([mu + inner * sd, Math.max(0.08, pdf(inner) / 2)]), label: `${said(bandPercent(k1, k2))}%` },
    region, region,
    { kind: 'path', points: [c.at([mu + a * sd, 0]), ...top, c.at([mu + b * sd, 0])] },
  );
  return c.spec;
}

function normalLevel(rng) {
  const N = rng.pick(NORMALS);
  const mu = rng.int(...N.mean), sd = rng.int(...N.sd);
  // Two cut points from −3 to 3 standard deviations, or one side left open.
  const form = rng.pick(['between', 'between', 'above', 'below']);
  let k1, k2;
  if (form === 'between') { k1 = rng.int(-3, 2); k2 = rng.int(k1 + 1, 3); }
  else if (form === 'above') { k1 = rng.int(-2, 3); k2 = 4; }
  else { k1 = -4; k2 = rng.int(-3, 2); }
  const p = bandPercent(k1, k2);
  const v = (k) => mu + k * sd;
  const range = form === 'between' ? `between ${N.of(v(k1))} and ${N.of(v(k2))}` : form === 'above' ? `above ${N.of(v(k1))}` : `below ${N.of(v(k2))}`;
  const lim = (k) => (k === -4 ? '-inf' : k === 4 ? 'inf' : asc(v(k)));
  const ks = []; for (let k = k1; k < k2; k++) ks.push(k);
  const pieces = ks.map((k) => said(BAND[k < 0 ? -k - 1 : k]));
  const intro = `The ${N.what} are normally distributed, with a mean of ${N.of(mu)} and a standard deviation of ${N.of(sd)}.`;
  const working = `${form === 'between' ? `${N.of(v(k1))} is ${k1 === 0 ? 'the mean' : `${Math.abs(k1)} SD ${k1 < 0 ? 'below' : 'above'}`} and ${N.of(v(k2))} is ${k2 === 0 ? 'the mean' : `${Math.abs(k2)} SD ${k2 < 0 ? 'below' : 'above'}`}`
    : form === 'above' ? `${N.of(v(k1))} is ${k1 === 0 ? 'the mean' : `${Math.abs(k1)} SD ${k1 < 0 ? 'below' : 'above'}`}` : `${N.of(v(k2))} is ${k2 === 0 ? 'the mean' : `${Math.abs(k2)} SD ${k2 < 0 ? 'below' : 'above'}`}`}. `
    + `Each band of one SD on one side holds 34%, 13.5%, 2.35% and 0.15% going out from the mean, so this is ${pieces.length > 1 ? `${pieces.join(' + ')} = ` : ''}${said(p)}%.`;
  const trap = '(68%, 95% and 99.7% each count both sides of the mean; one side alone is half.)';
  if (rng.chance(0.3)) {
    // As a count of a whole.
    const total = rng.pick([200, 400, 500, 1000, 2000, 5000, 10000]);
    const count = (p * total) / 100;
    if (!Number.isInteger(clean(count))) return normalLevel(rng);
    return {
      prompt: [T.prose(`${intro} Out of ${said(total)}, about how many are ${range}?`)],
      text: `normal count: ${total} values, mean ${mu} sd ${sd}, from ${lim(k1)} to ${lim(k2)}`,
      answer: num(clean(count)),
      visual: normalCurve(N, mu, sd, k1, k2),
      explain: `${working} ${said(p)}% of ${said(total)} is ${said(p / 100)} × ${said(total)} = ${said(count)}. ${trap} So about ${said(count)}.`,
    };
  }
  return {
    prompt: [T.prose(`${intro} About what percent are ${range}?`)],
    text: `normal percent: mean ${mu} sd ${sd}, from ${lim(k1)} to ${lim(k2)}`,
    answer: { ...num(p), percent: true },
    visual: normalCurve(N, mu, sd, k1, k2),
    explain: `${working} ${trap} So about ${said(p)}%.`,
  };
}

// ── z-scores ────────────────────────────────────────────────────────────

const Z_STEPS = [-3, -2.5, -2, -1.5, -1.25, -1, -0.75, -0.5, -0.25, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3];

function zLevel(rng) {
  const N = rng.pick(NORMALS);
  const mu = rng.int(...N.mean), sd = rng.int(...N.sd) * (N.wide ? rng.pick([1, 2]) : 1);
  const mode = rng.pick(['z', 'z', 'value', 'compare']);
  if (mode === 'compare') {
    // Two people, two different tests: who stands further above their own mean?
    const names = rng.shuffle(['Ava', 'Ben', 'Carmen', 'Dev', 'Elena', 'Femi']).slice(0, 2);
    for (;;) {
      const t = [0, 1].map(() => ({ mu: rng.int(60, 85), sd: rng.int(4, 12), z: rng.pick(Z_STEPS.filter((z) => z > 0)) }));
      if (t[0].z === t[1].z) continue;
      t.forEach((s) => { s.x = s.mu + s.z * s.sd; });
      if (t.some((s) => !Number.isInteger(s.x) || s.x > 100)) continue;
      // The higher raw score should not always be the better one.
      if ((t[0].x > t[1].x) === (t[0].z > t[1].z) && rng.chance(0.6)) continue;
      if (t[0].x === t[1].x) continue;
      const want = t[0].z > t[1].z ? 'a' : 'b';
      const opts = names.map((n, i) => ({ id: LETTERS[i], label: n }));
      return {
        prompt: [T.prose(`${names[0]} scored ${t[0].x} on a test with a mean of ${t[0].mu} and a standard deviation of ${t[0].sd}. `
          + `${names[1]} scored ${t[1].x} on a different test with a mean of ${t[1].mu} and a standard deviation of ${t[1].sd}. Who did better compared with the others who took the same test?`)],
        text: `better z: a=${t[0].x} mean ${t[0].mu} sd ${t[0].sd}, b=${t[1].x} mean ${t[1].mu} sd ${t[1].sd}`,
        answer: { type: 'choice', value: want, options: opts },
        visual: null,
        explain: `Compare z-scores. ${names[0]}: (${t[0].x} − ${t[0].mu}) ÷ ${t[0].sd} = ${said(t[0].z)}. ${names[1]}: (${t[1].x} − ${t[1].mu}) ÷ ${t[1].sd} = ${said(t[1].z)}. `
          + `(The higher raw score is on a different scale; only the z-scores can be compared.) So ${names[want === 'a' ? 0 : 1]}.`,
      };
    }
  }
  const z = rng.pick(Z_STEPS);
  const x = mu + z * sd;
  if (!Number.isInteger(x) || x <= 0) return zLevel(rng);
  const intro = `The ${N.what} have a mean of ${N.of(mu)} and a standard deviation of ${N.of(sd)}.`;
  if (mode === 'z') {
    return {
      prompt: [T.prose(`${intro} What is the z-score of ${N.of(x)}?`)],
      text: `z of ${x}: mean ${mu} sd ${sd}`,
      answer: num(z),
      visual: null,
      explain: `z = (x − mean) ÷ SD = (${x} − ${mu}) ÷ ${sd} = ${said(x - mu)} ÷ ${sd} = ${said(z)}. `
        + `(${z < 0 ? 'Below the mean, z is negative.' : 'Dividing by the mean instead of the SD gives a different number altogether.'}) So ${said(z)}.`,
    };
  }
  return {
    prompt: [T.prose(`${intro} What value has a z-score of ${said(z)}?`)],
    text: `value at z=${asc(z)}: mean ${mu} sd ${sd}`,
    answer: num(x),
    visual: null,
    explain: `A z-score counts standard deviations from the mean: x = mean + z × SD = ${mu} ${z < 0 ? '−' : '+'} ${said(Math.abs(z))} × ${sd} = ${said(x)}. `
      + `(${z < 0 ? 'A negative z is below the mean, so the SDs come off it.' : 'z × SD is added to the mean, not used on its own.'}) So ${N.of(x)}.`,
  };
}

// ── Which spread ────────────────────────────────────────────────────────

/** Q1 and Q3 as data-center finds them: medians of the halves, an odd count's middle in neither. */
function quartiles(xs) {
  const s = [...xs].sort((p, q) => p - q), n = s.length;
  const mid = (ys) => (ys.length % 2 ? ys[(ys.length - 1) / 2] : (ys[ys.length / 2 - 1] + ys[ys.length / 2]) / 2);
  return [mid(s.slice(0, Math.floor(n / 2))), mid(s.slice(Math.ceil(n / 2)))];
}
const hasOutlier = (xs) => {
  const [q1, q3] = quartiles(xs), f = 1.5 * (q3 - q1);
  return xs.some((x) => x < q1 - f || x > q3 + f);
};
const SPREADS = [{ id: 'iqr', label: 'The IQR, with the median' }, { id: 'sd', label: 'The standard deviation, with the mean' }];

function spreadLevel(rng) {
  const mode = rng.pick(['data', 'data', 'shape', 'boxes']);
  if (mode === 'boxes') {
    // Which set is more spread out, by its box or by its whiskers.
    const M = rng.pick(MEASURES);
    const win = boxWindow(rng, M);
    for (;;) {
      const A = fiveOf(rng, M, win, 4), B = fiveOf(rng, M, win, 4);
      const byIqr = rng.chance(0.6);
      const ia = A[3] - A[1], ib = B[3] - B[1], ra = A[4] - A[0], rb = B[4] - B[0];
      if (ia === ib || ra === rb || (ia > ib) === (ra > rb)) continue;
      const want = (byIqr ? ia > ib : ra > rb) ? 'A' : 'B';
      return {
        prompt: [T.prose(`The box plots show two sets of ${M.what}. ${byIqr ? 'Which set has the more spread-out middle half?' : 'Which set spreads further from its least to its greatest value?'}`)],
        text: `wider by ${byIqr ? 'iqr' : 'range'}: A ${fiveAsc(A)} / B ${fiveAsc(B)}`,
        answer: { type: 'choice', value: want, options: [{ id: 'A', label: 'Set A' }, { id: 'B', label: 'Set B' }] },
        visual: boxPlots(M, [['A', A], ['B', B]], [A, B].map((f, i) => (byIqr ? [i, f[1], f[3]] : [i, f[0], f[4]]))),
        explain: `${byIqr ? `The middle half is the box: A's IQR is ${A[3]} − ${A[1]} = ${ia}, B's is ${B[3]} − ${B[1]} = ${ib}.` : `That is the range: A's is ${A[4]} − ${A[0]} = ${ra}, B's is ${B[4]} − ${B[0]} = ${rb}.`} `
          + `(Here the two measures disagree: ${byIqr ? 'the set with the longer whiskers has the narrower box.' : 'the set with the wider box has the shorter whiskers.'}) So set ${want}.`,
      };
    }
  }
  if (mode === 'shape') {
    // Symmetric half the time, so the keys come out even across the level.
    const shape = rng.chance(0.5) ? 'symmetric' : rng.pick(['right', 'left']);
    const { H, start, w, counts, mean, median } = histOfShape(rng, shape);
    const want = shape === 'symmetric' ? 'sd' : 'iqr';
    return {
      prompt: [T.prose(`The histogram shows some ${H.what}, in ${inUnit(H.unit)}. Which measure of spread describes it better?`)],
      text: `histogram spread: ${histAsc(start, w, counts)}`,
      answer: { type: 'choice', value: want, options: SPREADS },
      visual: histogram(H, start, w, counts, { lines: centerLines(mean, median) }),
      explain: `${RULE} `
        + (shape === 'symmetric'
          ? 'The bars mirror each other about the middle, with no tail, so the mean and standard deviation use every value fairly. (The IQR would not be wrong, but it ignores half the data.) So the standard deviation, with the mean.'
          : `The bars trail off to the ${shape}, and the values in that tail pull the mean and stretch the standard deviation. The IQR, built on quartiles, is not moved by them. (The same reasoning as an outlier: a few far values should not set the spread.) So the IQR, with the median.`),
    };
  }
  return spreadList(rng);
}

// requiem: catalogue/content/which-spread-rule
// The rule taught, and keyed: an outlier, or clearly skewed data, takes the
// IQR; data that is symmetric with no outlier takes the standard deviation.
// Symmetric lists are drawn mirrored about their middle, skewed ones with a
// mean at least a quarter of the IQR from the median, and every value stays
// inside the context's believable range.
const RULE = 'The rule: with an outlier, or data that is clearly skewed, use the IQR; with roughly symmetric data and no outlier, use the standard deviation.';
const QUARTILE_METHOD = 'Q1 and Q3 are the medians of the lower and upper halves, leaving out the middle value.';

/** Quartiles the other common way, an odd count's middle value in both halves. */
function quartilesInclusive(xs) {
  const s = [...xs].sort((p, q) => p - q), n = s.length;
  const mid = (ys) => (ys.length % 2 ? ys[(ys.length - 1) / 2] : (ys[ys.length / 2 - 1] + ys[ys.length / 2]) / 2);
  return [mid(s.slice(0, Math.ceil(n / 2))), mid(s.slice(Math.floor(n / 2)))];
}
const outlierBy = (xs, [q1, q3]) => xs.some((x) => x < q1 - 1.5 * (q3 - q1) || x > q3 + 1.5 * (q3 - q1));
const medianOf = (xs) => { const s = [...xs].sort((p, q) => p - q), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };

function spreadList(rng) {
  const M = rng.pick(MEASURES);
  const n = rng.int(8, 11);
  const kind = rng.pick(['symmetric', 'symmetric', 'skewed', 'outlier']);
  const range = M.hi - M.lo;
  // Inside the context's range; only an outlier may run past its top, by half the range at most.
  const inRange = (xs) => xs.every((x) => x >= M.lo && x <= M.hi + (kind === 'outlier' ? range / 2 : 0));
  /** n values mirrored about mid: each distance below matched by one above. */
  const mirrored = (count, mid) => {
    const ds = Array.from({ length: Math.floor(count / 2) }, () => rng.int(1, 4 * M.u));
    return [...ds.map((d) => mid - d), ...ds.map((d) => mid + d), ...(count % 2 ? [mid] : [])];
  };
  for (;;) {
    const mid = rng.int(M.lo + 4 * M.u, M.hi - 4 * M.u);
    let xs;
    if (kind === 'symmetric') xs = mirrored(n, mid);
    else if (kind === 'skewed') {
      const sign = rng.chance(0.5) ? 1 : -1;
      xs = Array.from({ length: n }, () => mid + sign * Math.round(M.u * 8 * rng.float() ** 2));
    } else {
      xs = mirrored(n - 1, mid);
      xs.push(mid + (rng.chance(0.5) ? 1 : -1) * M.u * rng.int(7, 11));
    }
    xs = rng.shuffle(xs);
    if (!inRange(xs) || new Set(xs).size < 4) continue;
    const q = quartiles(xs), iqr = q[1] - q[0];
    if (iqr <= 0) continue;
    const out = outlierBy(xs, q);
    // The verdict must not hang on how the quartiles are found.
    if (out !== outlierBy(xs, quartilesInclusive(xs))) continue;
    const mean = sum(xs) / n, median = medianOf(xs);
    if (kind === 'outlier' && !out) continue;
    if (kind !== 'outlier' && out) continue;
    if (kind === 'skewed' && Math.abs(mean - median) < iqr / 4) continue;
    const s = [...xs].sort((p, q2) => p - q2);
    const [q1, q3] = q, f = 1.5 * iqr;
    const odd = xs.filter((x) => x < q1 - f || x > q3 + f);
    const m1 = Math.round(mean * 10) / 10;
    const meanSaid = `${Math.abs(mean - m1) < 1e-9 ? '' : '≈ '}${said(m1)}`;
    const fences = `In order: ${s.join(', ')}. Q1 = ${said(q1)} and Q3 = ${said(q3)}, so the IQR is ${said(iqr)} and the fences are ${said(q1)} − ${said(f)} = ${said(q1 - f)} and ${said(q3)} + ${said(f)} = ${said(q3 + f)}. `;
    const verdict = {
      outlier: `${[...new Set(odd)].join(' and ')} ${odd.length > 1 ? 'are' : 'is'} outside them, an outlier that would stretch the standard deviation. (The IQR is built on the middle half, so the outlier cannot move it.) So the IQR, with the median.`,
      skewed: `Nothing is outside them, but the data is skewed: the values bunch at the ${mean > median ? 'low' : 'high'} end and trail off toward the ${mean > median ? 'high' : 'low'} end, pulling the mean, ${meanSaid}, ${mean > median ? 'above' : 'below'} the median, ${said(median)}. (A tail stretches the standard deviation just as an outlier does.) So the IQR, with the median.`,
      symmetric: `Nothing is outside them, and the values mirror each other about ${said(median)}: the mean and the median are both ${said(median)}. (With no outlier or tail to drag them, the mean and standard deviation use every value fairly.) So the standard deviation, with the mean.`,
    }[kind];
    return {
      prompt: [T.prose(`These are ${n} ${M.what}, in ${inUnit(M.unit)}: ${xs.join(', ')}. Which measure of spread describes them better?${n % 2 ? ` (${QUARTILE_METHOD})` : ''}`)],
      text: `spread measure: ${xs.join(' ')}`,
      answer: { type: 'choice', value: kind === 'symmetric' ? 'sd' : 'iqr', options: SPREADS },
      visual: null,
      explain: `${RULE} ${fences}${verdict}`,
    };
  }
}

const CONTENT = [boxLevel, histLevel, shapeLevel, sdLevel, normalLevel, zLevel, spreadLevel];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
