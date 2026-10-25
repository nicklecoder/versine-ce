/**
 * Catalogue authoring tool: builds the problem library for two-variable
 * data.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 *
 * Every `text` carries what scripts/check-answers.py needs to work the
 * answer out again: the data points for a question about a scatter plot,
 * the line of fit as `y = mx + b` for a prediction or a residual, r for a
 * question about strength, the study's design for one about cause, and the
 * four counts for a two-way table. Choice options are written by what they
 * mean (`rate-up`, `associated`) so the checker can decide which is right
 * without reading the sentences.
 */
import * as T from '../terms.js';
import { LINE, ASKED, r2 } from './figures.js';
import { chart, niceAxis, DOT } from './charts.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/bivariate.js';

// ── Numbers ─────────────────────────────────────────────────────────────

const clean = (v) => Math.round(v * 1e6) / 1e6;
/** As written in prose: 2,500, −1.5, 0.25. */
const said = (v) => clean(v).toLocaleString('en-US', { maximumFractionDigits: 6 }).replace('-', '−');
/** A number after an operator: a negative one in parentheses, so no "− −4" or "÷ −4". */
const opd = (v) => (clean(v) < 0 ? `(${said(v)})` : said(v));
/** As written in `text`: plain ASCII. */
const asc = (v) => String(clean(v));
/** A decimal answer over the smallest power of ten that holds it, to three places at most. */
function decimal(v) {
  for (let d = 1; d <= 1000; d *= 10) {
    const n = Math.round(v * d);
    if (Math.abs(n - v * d) < 1e-6) return { n, d };
  }
  throw new Error(`${v} runs past three places`);
}
const lineSaid = (m, b) => `y = ${m === 1 ? '' : m === -1 ? '−' : said(m)}x ${b < 0 ? '−' : '+'} ${said(Math.abs(b))}`;
const lineAsc = (m, b) => `y = ${asc(m)}x + ${asc(b)}`;
const stepsOf = (lo, hi, step) => Array.from({ length: Math.round((hi - lo) / step) + 1 }, (_, i) => clean(lo + i * step));
const LETTERS = ['a', 'b', 'c', 'd'];
const money = (v) => (Number.isInteger(v) ? `$${said(v)}` : `$${v.toFixed(2)}`);

/** Pearson's r, for choosing data; the checker works its own out. */
function pearson(pts) {
  const n = pts.length;
  const mx = pts.reduce((s, p) => s + p[0], 0) / n, my = pts.reduce((s, p) => s + p[1], 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (const [x, y] of pts) { sxy += (x - mx) * (y - my); sxx += (x - mx) ** 2; syy += (y - my) ** 2; }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0;
}
/** The least-squares line through pts, drawn on reveal to show the trend the answer names. */
function trend(pts) {
  const n = pts.length;
  const mx = pts.reduce((s, p) => s + p[0], 0) / n, my = pts.reduce((s, p) => s + p[1], 0) / n;
  let sxy = 0, sxx = 0;
  for (const [x, y] of pts) { sxy += (x - mx) * (y - my); sxx += (x - mx) ** 2; }
  const m = sxy / sxx;
  return (x) => my + m * (x - mx);
}
/** A standard normal draw. */
const normal = (rng) => Math.sqrt(-2 * Math.log(1 - rng.float())) * Math.cos(2 * Math.PI * rng.float());

// ── Contexts ────────────────────────────────────────────────────────────

// requiem: catalogue/content/units-both-systems
// Each model is a story with x starting at 0, so its intercept means
// something: a slope and intercept drawn from the grids given, data drawn
// around the line, and the words for its rate and its value at 0. Lengths,
// heights and temperatures come in both systems.
const MODELS = [
  { id: 'study', xName: 'hours studied', yName: 'test score (points)', x: [0, 8], m: [3, 7, 0.5], b: [45, 60, 1], yStep: 1,
    xOf: (v) => `${said(v)} hour${v === 1 ? '' : 's'}`, yOf: (v) => `${said(v)} points`,
    what: 'the predicted score', each: 'for each extra hour studied', zero: 'for a student who does not study',
    at: (v) => `for a student who studies ${said(v)} hour${v === 1 ? '' : 's'}`, ask: 'how many hours of study' },
  { id: 'car', xName: 'age (years)', yName: 'value ($)', x: [0, 8], m: [-3000, -1500, 500], b: [25000, 32000, 1000], yStep: 500,
    xOf: (v) => `${said(v)} year${v === 1 ? '' : 's'}`, yOf: (v) => money(v),
    what: 'the predicted value', each: 'for each year older', zero: 'for a new car',
    at: (v) => `for a car ${said(v)} year${v === 1 ? '' : 's'} old`, ask: 'how old a car, in years,' },
  { id: 'taxi-mi', xName: 'distance (miles)', yName: 'fare ($)', x: [0, 12], m: [2, 3.5, 0.25], b: [2.5, 5, 0.5], yStep: 0.5,
    xOf: (v) => `${said(v)} mile${v === 1 ? '' : 's'}`, yOf: money,
    what: 'the predicted fare', each: 'for each extra mile', zero: 'for a ride of 0 miles, as the meter starts',
    at: (v) => `for a ${said(v)}-mile ride`, ask: 'how long a ride, in miles,' },
  { id: 'taxi-km', xName: 'distance (km)', yName: 'fare ($)', x: [0, 20], m: [1.25, 2.25, 0.25], b: [2.5, 5, 0.5], yStep: 0.5,
    xOf: (v) => `${said(v)} km`, yOf: money,
    what: 'the predicted fare', each: 'for each extra kilometer', zero: 'for a ride of 0 km, as the meter starts',
    at: (v) => `for a ${said(v)} km ride`, ask: 'how long a ride, in km,' },
  { id: 'plant-in', xName: 'weeks after planting', yName: 'height (in)', x: [0, 8], m: [0.5, 1.5, 0.25], b: [1, 4, 0.5], yStep: 0.25,
    xOf: (v) => `${said(v)} week${v === 1 ? '' : 's'}`, yOf: (v) => `${said(v)} inch${v === 1 ? '' : 'es'}`,
    what: 'the predicted height', each: 'for each extra week', zero: 'on the day it is planted',
    at: (v) => `${said(v)} week${v === 1 ? '' : 's'} after planting`, ask: 'how many weeks after planting' },
  { id: 'plant-cm', xName: 'weeks after planting', yName: 'height (cm)', x: [0, 8], m: [1.5, 3.5, 0.5], b: [3, 10, 1], yStep: 0.5,
    xOf: (v) => `${said(v)} week${v === 1 ? '' : 's'}`, yOf: (v) => `${said(v)} cm`,
    what: 'the predicted height', each: 'for each extra week', zero: 'on the day it is planted',
    at: (v) => `${said(v)} week${v === 1 ? '' : 's'} after planting`, ask: 'how many weeks after planting' },
  { id: 'hike-ft', signed: true, xName: 'elevation (thousands of ft)', yName: 'temperature (°F)', x: [0, 10], m: [-4, -3, 0.5], b: [55, 75, 1], yStep: 1,
    xOf: (v) => `${said(v * 1000)} ft`, xKey: (v) => `${said(v)} (thousand feet), which is ${said(v * 1000)} ft`, yOf: (v) => `${said(v)}°F`,
    what: 'the predicted temperature', each: 'for each 1,000 ft climbed', zero: 'at sea level',
    at: (v) => `at ${said(v * 1000)} ft`, ask: 'what elevation, in thousands of feet,' },
  { id: 'hike-m', signed: true, xName: 'elevation (km)', yName: 'temperature (°C)', x: [0, 4], m: [-7, -6, 0.5], b: [15, 25, 1], yStep: 0.5,
    xOf: (v) => `${said(v)} km`, yOf: (v) => `${said(v)}°C`,
    what: 'the predicted temperature', each: 'for each kilometer climbed', zero: 'at sea level',
    at: (v) => `at ${said(v)} km up`, ask: 'what elevation, in km,' },
  { id: 'screen', xName: 'screen time (hours a day)', yName: 'sleep (hours)', x: [0, 8], m: [-0.75, -0.25, 0.25], b: [8, 9.5, 0.5], yStep: 0.25,
    xOf: (v) => `${said(v)} hour${v === 1 ? '' : 's'} of screen time`, yOf: (v) => `${said(v)} hours of sleep`,
    what: 'the predicted sleep', each: 'for each extra hour of screen time', zero: 'for no screen time at all',
    at: (v) => `for ${said(v)} hour${v === 1 ? '' : 's'} of screen time a day`, ask: 'how many hours of screen time a day' },
];

// Pairs of things with nothing to do with each other.
const UNRELATED = [
  { xName: 'shoe size', yName: 'quiz score (points)', x: [5, 12, 0.5], y: [60, 100, 1] },
  { xName: 'day of the month born', yName: 'height (in)', x: [1, 31, 1], y: [56, 70, 0.5] },
  { xName: 'day of the month born', yName: 'height (cm)', x: [1, 31, 1], y: [140, 178, 1] },
  { xName: 'last digit of phone number', yName: 'minutes to get to school', x: [0, 9, 1], y: [5, 40, 1] },
  { xName: 'house number', yName: 'number of pets', x: [1, 99, 1], y: [0, 6, 1] },
];

/** A line drawn from the grids of model M. */
function lineOf(rng, M) {
  const m = rng.pick(stepsOf(...M.m)), b = rng.pick(stepsOf(...M.b));
  return { m, b };
}

/** Points scattered about y = mx + b over M's x range, kept only if r is strong. */
function scatterAbout(rng, M, { m, b }) {
  const [x0, x1] = M.x;
  // Each miss draws the next set a little tighter, so a shallow line still finds one.
  for (let tries = 0; ; tries++) {
    const n = rng.int(10, 14);
    const xs = rng.shuffle(stepsOf(x0, x1, (x1 - x0) / 16)).slice(0, n).sort((p, q) => p - q);
    const spread = (Math.abs(m) * (x1 - x0) * 0.08 + M.yStep * 0.5) * 0.95 ** tries;
    const pts = xs.map((x) => [x, clean(Math.round((m * x + b + normal(rng) * spread) / M.yStep) * M.yStep)]);
    if (!M.signed && pts.some(([, y]) => y <= 0)) continue;
    if (Math.abs(pearson(pts)) >= 0.85) return pts;
  }
}

/** The scatter plot of pts, with the line of fit if given. */
function plot(M, pts, line = null, extra = []) {
  const ends = line ? [line.b + line.m * M.x[0], line.b + line.m * M.x[1]] : [];
  const ys = [...pts.map(([, y]) => y), ...ends, ...extra.map(([, y]) => y)];
  const yAxis = niceAxis(Math.min(...ys), Math.max(...ys), 6);
  const xAxis = niceAxis(M.x[0], M.x[1], 8, true);
  const c = chart({ x: xAxis, y: yAxis, titles: { x: M.xName, y: M.yName } });
  if (line) c.spec.marks.push({ kind: 'segment', from: c.at([M.x[0], ends[0]]), to: c.at([M.x[1], ends[1]]), tone: LINE });
  for (const p of pts) c.spec.marks.push({ kind: 'point', at: c.at(p), tone: DOT });
  return c;
}

const ptsAsc = (pts) => pts.map(([x, y]) => `(${asc(x)}, ${asc(y)})`).join(' ');

// ── Association ─────────────────────────────────────────────────────────

// ── Pattern features: curves, clusters and outliers (8.SP.1) ───────────

// requiem: catalogue/content/scatter-features-from-points
// A quarter of Association asks which pattern a scatter plot shows: one
// straight line, a curve, two clusters, or a line with one outlier. Each
// plot is drawn so that only its own feature shows, tested on the points:
// no x gap wider than an eighth of the range unless it is the clusters' gap,
// a quadratic fitting far better than a line only for a curve, and one point
// far from the curve through the others only for an outlier.
const FEATURE_OPTIONS = [
  { id: 'linear', label: 'One straight-line pattern, with no gap or outlier' },
  { id: 'curved', label: 'A curved (nonlinear) pattern' },
  { id: 'clusters', label: 'Two separate clusters' },
  { id: 'outlier', label: 'A straight-line pattern with one outlier' },
];
const CURVES = [
  { xName: 'speed (mph)', yName: 'stopping distance (ft)', x: [20, 70], f: (x) => 0.055 * x * x + 1.1 * x, step: 1, sd: 6,
    how: 'rise slowly at first and then more and more steeply' },
  { xName: 'time (s)', yName: 'height of a thrown ball (ft)', x: [0, 4], f: (x) => 5 + 64 * x - 16 * x * x, step: 1, sd: 2.5,
    how: 'rise and then fall again' },
  { xName: 'age of a puppy (months)', yName: 'weight (lb)', x: [0, 12], f: (x) => 4 + 56 * (1 - Math.exp(-x / 3.5)), step: 1, sd: 1.5,
    how: 'rise quickly and then level off' },
  { xName: 'time (min)', yName: 'temperature of a cup of tea (°F)', x: [0, 40], f: (x) => 70 + 110 * Math.exp(-x / 12), step: 1, sd: 2,
    how: 'fall quickly and then level off' },
];
const CLUSTERS = [
  { xName: 'weight (lb)', yName: 'height (in)', who: 'small dogs and large dogs', a: { x: [8, 25], y: [9, 15] }, b: { x: [60, 90], y: [22, 28] }, xs: 1, ys: 0.5, x: [0, 100] },
  { xName: 'wait before an eruption (min)', yName: 'eruption length (min)', who: 'short and long eruptions of a geyser', a: { x: [45, 58], y: [1.6, 2.4] }, b: { x: [72, 92], y: [3.8, 4.9] }, xs: 1, ys: 0.1, x: [40, 100] },
  { xName: 'screen size (in)', yName: 'price ($)', who: 'phones and tablets', a: { x: [5, 6.8], y: [200, 500] }, b: { x: [10, 13], y: [450, 900] }, xs: 0.1, ys: 10, x: [4, 14] },
  { xName: 'hours of practice a week', yName: 'score (points)', who: 'beginners and club players', a: { x: [0, 3], y: [40, 58] }, b: { x: [8, 12], y: [78, 95] }, xs: 0.5, ys: 1, x: [0, 12] },
];

/** Least-squares polynomial of degree 1 or 2 through pts: its value at x. */
function polyFit(pts, deg) {
  const k = deg + 1;
  const A = Array.from({ length: k }, () => Array(k + 1).fill(0));
  for (const [x, y] of pts) {
    for (let i = 0; i < k; i++) {
      for (let j = 0; j < k; j++) A[i][j] += x ** (i + j);
      A[i][k] += y * x ** i;
    }
  }
  for (let i = 0; i < k; i++) {
    const p = A[i][i];
    for (let j = i; j <= k; j++) A[i][j] /= p;
    for (let r = 0; r < k; r++) if (r !== i) { const f = A[r][i]; for (let j = i; j <= k; j++) A[r][j] -= f * A[i][j]; }
  }
  const c = A.map((row) => row[k]);
  return (x) => c.reduce((s, ci, i) => s + ci * x ** i, 0);
}
const sse = (pts, f) => pts.reduce((s, [x, y]) => s + (y - f(x)) ** 2, 0);
/** How much better a curve fits than a line: quadratic error over linear error. */
const curveRatio = (pts) => sse(pts, polyFit(pts, 2)) / sse(pts, polyFit(pts, 1));
/** The widest x gap, as a share of the x range. */
const widestGap = (pts) => {
  const xs = pts.map((p) => p[0]).sort((p, q) => p - q);
  return Math.max(...xs.slice(1).map((x, i) => x - xs[i])) / (xs[xs.length - 1] - xs[0]);
};
/** The point furthest from the curve through the others, and how far, in RMS misses of the others. */
function loneOut(pts) {
  let best = { i: -1, z: 0 };
  pts.forEach((p, i) => {
    const rest = pts.filter((_, j) => j !== i), f = polyFit(rest, 2);
    const rms = Math.sqrt(sse(rest, f) / rest.length) || 1e-9;
    const z = Math.abs(p[1] - f(p[0])) / rms;
    if (z > best.z) best = { i, z };
  });
  return best;
}
const ySpan = (pts) => Math.max(...pts.map((p) => p[1])) - Math.min(...pts.map((p) => p[1]));
/** x values spread over [x0, x1] with no gap of more than two of sixteen steps. */
function spreadXs(rng, x0, x1) {
  const grid = stepsOf(x0, x1, (x1 - x0) / 16);
  const keep = grid.filter((_, i) => i % 2 === 0 || rng.chance(0.5));
  return keep;
}

function feature(rng) {
  const kind = rng.pick(['linear', 'curved', 'clusters', 'outlier']);
  for (;;) {
    let pts, xName, yName, xr, detail = {};
    if (kind === 'curved') {
      const C = rng.pick(CURVES);
      pts = spreadXs(rng, ...C.x).map((x) => [x, clean(Math.round((C.f(x) + normal(rng) * C.sd) / C.step) * C.step)]);
      ({ xName, yName } = C); xr = C.x; detail = C;
    } else if (kind === 'clusters') {
      const K = rng.pick(CLUSTERS);
      const box = (B, n) => Array.from({ length: n }, () => [
        clean(Math.round((B.x[0] + rng.float() * (B.x[1] - B.x[0])) / K.xs) * K.xs),
        clean(Math.round((B.y[0] + rng.float() * (B.y[1] - B.y[0])) / K.ys) * K.ys)]);
      pts = [...box(K.a, rng.int(5, 7)), ...box(K.b, rng.int(5, 7))].sort((p, q) => p[0] - q[0]);
      ({ xName, yName } = K); xr = K.x; detail = K;
    } else {
      const M = rng.pick(MODELS);
      const line = lineOf(rng, M);
      const [x0, x1] = M.x;
      const spread = Math.abs(line.m) * (x1 - x0) * 0.04 + M.yStep * 0.5;
      pts = spreadXs(rng, x0, x1).map((x) => [x, clean(Math.round((line.m * x + line.b + normal(rng) * spread) / M.yStep) * M.yStep)]);
      if (kind === 'outlier') {
        // One point well inside the range moved far off the line, up or down.
        const i = rng.int(2, pts.length - 3), off = Math.abs(line.m) * (x1 - x0) * rng.int(35, 50) / 100;
        const [x, y] = pts[i];
        pts[i] = [x, clean(Math.round((y + (y - off < 0 && !M.signed ? 1 : rng.sign()) * off) / M.yStep) * M.yStep)];
        detail = { at: pts[i] };
      }
      if (!M.signed && pts.some(([, y]) => y <= 0)) continue;
      ({ xName, yName } = M); xr = M.x;
    }
    if (new Set(pts.map((p) => `${p[0]},${p[1]}`)).size < pts.length) continue;
    // Each plot shows its own feature and no other, by the tests the checker repeats with its own margins.
    const gap = widestGap(pts), ratio = curveRatio(pts), lone = loneOut(pts);
    if (kind === 'clusters' ? gap < 0.3 : gap > 0.13) continue;
    if (kind !== 'clusters') {
      if (kind === 'curved' ? ratio > 0.2 : ratio < 0.6) continue;
      if (kind === 'outlier' ? lone.z < 8 || Math.abs(pts[lone.i][1] - polyFit(pts.filter((_, j) => j !== lone.i), 1)(pts[lone.i][0])) < 0.25 * ySpan(pts) : lone.z > 3.5) continue;
      if (kind === 'linear' && Math.abs(pearson(pts)) < 0.9) continue;
    }
    const yAxis = niceAxis(Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[1])), 6);
    const xAxis = niceAxis(xr[0], xr[1], 8, xr[0] === 0);
    const c = chart({ x: xAxis, y: yAxis, titles: { x: xName, y: yName } });
    for (const p of pts) c.spec.marks.push({ kind: 'point', at: c.at(p), tone: DOT });
    const x0 = Math.min(...pts.map((p) => p[0])), x1 = Math.max(...pts.map((p) => p[0]));
    const xBare = xName.replace(/ \(.*\)$/, ''), yBare = yName.replace(/ \(.*\)$/, '');
    let how;
    // Revealed: the curve or line the points follow, the two groups, or the lone point.
    if (kind === 'curved') {
      const f = polyFit(pts, 2);
      c.spec.answer.push({ kind: 'path', points: stepsOf(x0, x1, (x1 - x0) / 24).map((x) => c.at([x, f(x)])), dashed: true });
      how = `The points ${detail.how}, so no one straight line runs through them all. (${cap(xBare)} and ${yBare} are still related, just not along a line: that is a nonlinear association.)`;
    } else if (kind === 'clusters') {
      const lo = pts.filter((p) => p[0] <= detail.a.x[1]), hi = pts.filter((p) => p[0] >= detail.b.x[0]);
      for (const g of [lo, hi]) {
        const gx = g.map((p) => p[0]), gy = g.map((p) => p[1]);
        const [a, b, d, e] = [Math.min(...gx), Math.max(...gx), Math.min(...gy), Math.max(...gy)];
        const px = (xAxis[1] - xAxis[0]) * 0.03, py = (yAxis[1] - yAxis[0]) * 0.05;
        c.spec.answer.push({ kind: 'path', points: [[a - px, d - py], [b + px, d - py], [b + px, e + py], [a - px, e + py], [a - px, d - py]].map(c.at), dashed: true });
      }
      const gapLo = Math.max(...lo.map((p) => p[0])), gapHi = Math.min(...hi.map((p) => p[0]));
      how = `The points fall into two groups, with nothing between ${xBare} ${said(gapLo)} and ${said(gapHi)}. (Each group is a cluster; here they are ${detail.who}.)`;
    } else {
      const rest = kind === 'outlier' ? pts.filter((p) => p !== detail.at) : pts;
      const f = polyFit(rest, 1);
      c.spec.answer.push({ kind: 'segment', from: c.at([x0, f(x0)]), to: c.at([x1, f(x1)]), dashed: true });
      if (kind === 'outlier') {
        c.spec.answer.push({ kind: 'text', at: c.at([detail.at[0], detail.at[1] + (detail.at[1] > f(detail.at[0]) ? 1 : -1) * (yAxis[1] - yAxis[0]) * 0.09]), label: 'outlier' });
        how = `All the points but one follow a straight line; the point (${said(detail.at[0])}, ${said(detail.at[1])}) sits far from it. (One point far from the pattern is an outlier; the others still make a line.)`;
      } else {
        how = `The points ${f(x1) > f(x0) ? 'rise' : 'fall'} along one straight line, with no gap splitting them and none far from the rest. (A straight-line pattern is a linear association.)`;
      }
    }
    const label = FEATURE_OPTIONS.find((o) => o.id === kind).label;
    return {
      prompt: [T.prose(`The scatter plot shows ${yBare} against ${xBare}. Which best describes the pattern?`)],
      text: `scatter feature: ${ptsAsc(pts)}`,
      answer: { type: 'choice', value: kind, options: FEATURE_OPTIONS },
      visual: c.spec,
      explain: `${how} So ${label.charAt(0).toLowerCase()}${label.slice(1)}.`,
    };
  }
}

function association(rng) {
  // requiem: catalogue/content/scatter-features-from-points
  if (rng.chance(0.25)) return feature(rng);
  const kind = rng.pick(['positive', 'negative', 'none']);
  let pts, xName, yName, xr;
  if (kind === 'none') {
    const U = rng.pick(UNRELATED);
    for (;;) {
      const n = rng.int(10, 14);
      pts = rng.shuffle(stepsOf(...U.x)).slice(0, n).sort((p, q) => p - q).map((x) => [x, rng.pick(stepsOf(...U.y))]);
      if (Math.abs(pearson(pts)) <= 0.15) break;
    }
    ({ xName, yName } = U);
    xr = U.x;
  } else {
    const M = rng.pick(MODELS.filter((md) => (md.m[0] > 0) === (kind === 'positive')));
    pts = scatterAbout(rng, M, lineOf(rng, M));
    ({ xName, yName } = M);
    xr = M.x;
  }
  const options = [{ id: 'positive', label: 'Positive association' }, { id: 'negative', label: 'Negative association' },
    { id: 'none', label: 'No association' }];
  const yAxis = niceAxis(Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[1])), 6);
  const xAxis = niceAxis(xr[0], xr[1], 8, xr[0] === 0);
  const c = chart({ x: xAxis, y: yAxis, titles: { x: xName, y: yName } });
  for (const p of pts) c.spec.marks.push({ kind: 'point', at: c.at(p), tone: DOT });
  // Revealed: the trend, flat when there is none.
  const f = trend(pts), x0 = Math.min(...pts.map((p) => p[0])), x1 = Math.max(...pts.map((p) => p[0]));
  c.spec.answer.push({ kind: 'segment', from: c.at([x0, f(x0)]), to: c.at([x1, f(x1)]), dashed: true });
  const visual = c.spec;
  const xBare = xName.replace(/ \(.*\)$/, ''), yBare = yName.replace(/ \(.*\)$/, '');
  const how = {
    positive: `As ${xBare} goes up, ${yBare} tends to go up too: the points rise from left to right.`,
    negative: `As ${xBare} goes up, ${yBare} tends to go down: the points fall from left to right.`,
    none: 'The points form a shapeless cloud: knowing one value tells you nothing about the other, whichever x you look at.',
  }[kind];
  return {
    prompt: [T.prose(`The scatter plot shows ${yBare} against ${xBare}. What kind of association is there?`)],
    text: `association: ${ptsAsc(pts)}`,
    answer: { type: 'choice', value: kind, options },
    visual,
    explain: `${how} (${kind === 'negative' ? 'Falling points are still an association, only a negative one.'
      : kind === 'none' ? 'A few points that happen to line up do not make an association; the whole cloud decides.'
        : 'Not every point has to be higher than the last: it is the trend across all of them.'}) So ${options.find((o) => o.id === kind).label.toLowerCase()}.`,
  };
}
const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);

// ── Line-of-fit predictions ─────────────────────────────────────────────

// An axis title read aloud: "height (in)" is height in inches.
const UNIT_WORDS = { $: 'dollars', in: 'inches', ft: 'feet', 'thousands of ft': 'thousands of feet' };
const unitOf = (name) => { const u = name.match(/\((.*)\)$/)?.[1]; return u ? UNIT_WORDS[u] ?? u : name; };
const inWords = (name) => name.replace(/ \((.*)\)$/, (_, u) => ` in ${UNIT_WORDS[u] ?? u}`);

function intro(M, line) {
  return `A line of fit for the data is ${lineSaid(line.m, line.b)}, where x is ${inWords(M.xName)} and y is ${inWords(M.yName)}.`;
}

function predictions(rng) {
  const M = rng.pick(MODELS), line = lineOf(rng, M);
  const x = rng.int(M.x[0] + 1, M.x[1] - 1), y = clean(line.m * x + line.b);
  if (y <= 0) return predictions(rng);
  const pts = scatterAbout(rng, M, line);
  const backward = rng.chance(0.4);
  const c = plot(M, pts, line);
  c.spec.answer.push({ kind: 'point', at: c.at([x, y]) });
  if (!backward) {
    return {
      prompt: [T.prose(`${intro(M, line)} Use it to predict ${M.what.replace('predicted ', '')} ${M.at(x)}.`)],
      text: `predict y at x=${asc(x)}: ${lineAsc(line.m, line.b)}`,
      answer: { type: 'decimal', value: decimal(y) },
      visual: c.spec,
      explain: `Put x = ${said(x)} into the line: ${said(line.m)} × ${said(x)} ${line.b < 0 ? '−' : '+'} ${said(Math.abs(line.b))} = ${said(y)}. `
        + `(It is a prediction from the trend, not what any one point shows: the points sit around the line, not on it.) So ${M.yOf(y)}.`,
    };
  }
  return {
    prompt: [T.prose(`${intro(M, line)} For ${M.yOf(y)}, ${M.ask} does the line predict?`)],
    text: `predict x at y=${asc(y)}: ${lineAsc(line.m, line.b)}`,
    answer: { type: 'decimal', value: decimal(x) },
    visual: c.spec,
    explain: `Set y = ${said(y)} and solve: ${said(line.m)}x = ${said(y)} − ${opd(line.b)} = ${said(y - line.b)}, so x = ${said(y - line.b)} ÷ ${opd(line.m)} = ${said(x)}. `
      + `(Putting ${said(y)} in for x answers a different question.) So ${(M.xKey ?? M.xOf)(x)}.`,
  };
}

// ── Slope and intercept in context ──────────────────────────────────────

function meaning(rng) {
  const M = rng.pick(MODELS), line = lineOf(rng, M);
  if (Math.abs(line.m) === Math.abs(line.b)) return meaning(rng);
  if (rng.chance(0.55)) {
    const askSlope = rng.chance(0.55);
    const v = askSlope ? line.m : line.b, mag = Math.abs(v);
    const right = askSlope ? (line.m > 0 ? 'rate-up' : 'rate-down') : 'start';
    const opts = rng.shuffle([
      ['rate-up', `${cap(M.what)} goes up by ${M.yOf(mag)} ${M.each}.`],
      ['rate-down', `${cap(M.what)} goes down by ${M.yOf(mag)} ${M.each}.`],
      ['start', `${cap(M.what)} is ${M.yOf(mag)} ${M.zero}.`],
    ]).map(([id, label], i) => ({ id: LETTERS[i], meaning: id, label }));
    const want = opts.find((o) => o.meaning === right).id;
    return {
      prompt: [T.prose(`${intro(M, line)} What does the ${said(v)} tell you?`)],
      text: `meaning of ${asc(v)} in ${lineAsc(line.m, line.b)}; options ${opts.map((o) => `${o.id}=${o.meaning}`).join(', ')}`,
      answer: { type: 'choice', value: want, options: opts.map(({ id, label }) => ({ id, label })) },
      visual: null,
      explain: askSlope
        ? `${said(v)} multiplies x, so it is the slope: the change in the prediction for each 1 of x. It is ${v > 0 ? 'positive, so the prediction rises' : 'negative, so the prediction falls'}. `
          + `(The number on its own, b, is the value at x = 0.) So ${opts.find((o) => o.id === want).label.charAt(0).toLowerCase()}${opts.find((o) => o.id === want).label.slice(1)}`
        : `${said(v)} is added on its own, so it is the intercept: the prediction when x = 0. `
          + `(The number multiplying x is the rate.) So ${opts.find((o) => o.id === want).label.charAt(0).toLowerCase()}${opts.find((o) => o.id === want).label.slice(1)}`,
    };
  }
  // From two points on the line of fit: the slope, or the value at 0.
  const xs = rng.shuffle(stepsOf(M.x[0] + 1, M.x[1], 1)).slice(0, 2).sort((p, q) => p - q);
  const A = [xs[0], clean(line.m * xs[0] + line.b)], B = [xs[1], clean(line.m * xs[1] + line.b)];
  if (A[1] <= 0 || B[1] <= 0) return meaning(rng);
  const askSlope = rng.chance(0.55);
  const pts = scatterAbout(rng, M, line);
  const c = plot(M, pts, line);
  c.spec.marks.push({ kind: 'point', at: c.at(A), tone: ASKED }, { kind: 'point', at: c.at(B), tone: ASKED });
  const rise = clean(B[1] - A[1]), run = B[0] - A[0];
  if (askSlope) {
    c.spec.answer.push({ kind: 'segment', from: c.at(A), to: c.at([B[0], A[1]]), dashed: true },
      { kind: 'segment', from: c.at([B[0], A[1]]), to: c.at(B), dashed: true });
  } else c.spec.answer.push({ kind: 'point', at: c.at([0, line.b]) });
  const given = `A line of fit for the data, with x in ${unitOf(M.xName)} and y in ${unitOf(M.yName)}, passes through (${said(A[0])}, ${said(A[1])}) and (${said(B[0])}, ${said(B[1])}).`;
  return {
    prompt: [T.prose(askSlope
      ? `${given} What is its slope, the predicted change in y ${M.each}?`
      : `${given} What does it predict at x = 0, ${M.zero}?`)],
    text: `${askSlope ? 'slope' : 'intercept'} through (${asc(A[0])}, ${asc(A[1])}) (${asc(B[0])}, ${asc(B[1])})`,
    answer: { type: 'decimal', value: decimal(askSlope ? line.m : line.b) },
    visual: c.spec,
    explain: `The slope is rise over run: (${said(B[1])} − ${opd(A[1])}) ÷ (${said(B[0])} − ${opd(A[0])}) = ${said(rise)} ÷ ${opd(run)} = ${said(line.m)}. `
      + (askSlope
        ? `(Run over rise, ${said(run)} ÷ ${opd(rise)}, turns it upside down.) So ${said(line.m)}.`
        : `Go back from x = ${said(A[0])} to 0: ${said(A[1])} − ${line.m < 0 ? `(${said(line.m)})` : said(line.m)} × ${said(A[0])} = ${said(line.b)}. (The first y given is not the intercept unless its x is 0.) So ${said(line.b)}.`),
  };
}

// ── Residuals ───────────────────────────────────────────────────────────

function residuals(rng) {
  const M = rng.pick(MODELS), line = lineOf(rng, M);
  const x = rng.int(M.x[0] + 1, M.x[1] - 1), pred = clean(line.m * x + line.b);
  const off = clean(rng.nonZero(-6, 6) * M.yStep);
  const y = clean(pred + off);
  if (pred <= 0 || y <= 0) return residuals(rng);
  const res = clean(y - pred);
  if (rng.chance(0.6)) {
    const pts = scatterAbout(rng, M, line).filter(([px]) => px !== x);
    const c = plot(M, pts, line, [[x, y]]);
    c.spec.marks.push({ kind: 'point', at: c.at([x, y]), tone: ASKED, label: 'P' });
    c.spec.answer.push({ kind: 'segment', from: c.at([x, y]), to: c.at([x, pred]), dashed: true });
    return {
      prompt: [T.prose(`${intro(M, line)} Point P shows an actual value of ${M.yOf(y)} ${M.at(x)}. What is its residual?`)],
      text: `residual: ${lineAsc(line.m, line.b)} at (${asc(x)}, ${asc(y)})`,
      answer: { type: 'decimal', value: decimal(res) },
      visual: c.spec,
      explain: `The line predicts ${said(line.m)} × ${said(x)} + ${said(line.b)} = ${said(pred)}. The residual is actual minus predicted: ${said(y)} − ${said(pred)} = ${said(res)}. `
        + `(Predicted minus actual gives the right size with the wrong sign.) ${res > 0 ? 'Positive: P is above the line.' : 'Negative: P is below the line.'} So ${said(res)}.`,
    };
  }
  const above = res > 0;
  const opts = [
    { id: 'above', label: 'Above the line: the line predicts too low there' },
    { id: 'below', label: 'Below the line: the line predicts too high there' },
  ];
  return {
    prompt: [T.prose(`${intro(M, line)} One data point is ${M.yOf(y)} ${M.at(x)}. Where is it, and what does that say about the line?`)],
    text: `fit check: ${lineAsc(line.m, line.b)} at (${asc(x)}, ${asc(y)})`,
    answer: { type: 'choice', value: above ? 'above' : 'below', options: opts },
    visual: null,
    explain: `The line predicts ${said(line.m)} × ${said(x)} + ${said(line.b)} = ${said(pred)}, and the actual value is ${said(y)}: a residual of ${said(y)} − ${said(pred)} = ${said(res)}. `
      + `(A point above the line is one the line underestimates, not overestimates.) So ${above ? 'above, and the line predicts too low' : 'below, and the line predicts too high'}.`,
  };
}

// ── Correlation strength ────────────────────────────────────────────────

// requiem: catalogue/content/bivariate-residuals-and-r-bands
// Bands by the size of r: strong from 0.7, moderate from 0.4, weak from 0.1,
// and none below. Only values well inside a band are asked about.
const STRENGTH = {
  'strong-positive': 'Strong positive', 'moderate-positive': 'Moderate positive', 'weak-positive': 'Weak positive',
  'strong-negative': 'Strong negative', 'moderate-negative': 'Moderate negative', 'weak-negative': 'Weak negative', none: 'No correlation',
};
const BANDS = 'strong is 0.7 or more, moderate 0.4 to 0.7, weak 0.1 to 0.4, and below 0.1 is none';
const rSaid = (r) => `r = ${said(r)}`;

function strength(rng) {
  const mode = rng.pick(['describe', 'describe', 'strongest', 'match']);
  if (mode === 'describe') {
    const band = rng.pick(Object.keys(STRENGTH));
    const size = band === 'none' ? rng.int(0, 4) / 100 : band.startsWith('strong') ? rng.int(80, 99) / 100
      : band.startsWith('moderate') ? rng.int(50, 62) / 100 : rng.int(18, 32) / 100;
    const r = band.endsWith('negative') ? -size : size;
    const others = rng.shuffle(Object.keys(STRENGTH).filter((k) => k !== band)).slice(0, 3);
    const opts = rng.shuffle([band, ...others]).map((k, i) => ({ id: LETTERS[i], band: k, label: STRENGTH[k] }));
    const want = opts.find((o) => o.band === band).id;
    return {
      prompt: [T.prose(`A scatter plot has a correlation coefficient of ${rSaid(r)}. How would you describe the correlation?`)],
      text: `describe r=${asc(r)}; options ${opts.map((o) => `${o.id}=${o.band}`).join(', ')}`,
      answer: { type: 'choice', value: want, options: opts.map(({ id, label }) => ({ id, label })) },
      visual: null,
      explain: `The sign gives the direction and the size, ignoring the sign, gives the strength: ${BANDS}. `
        + `Here the size is ${said(size)}, so ${band === 'none' ? 'there is no correlation' : `it is ${band.split('-')[0]}`}. `
        + `(${r < 0 ? 'A negative r is not a weak one: −0.9 is as strong as 0.9.' : 'A positive r only says the points rise; its size says how tightly.'}) So ${STRENGTH[band].toLowerCase()}.`,
    };
  }
  if (mode === 'strongest') {
    // Four r values with one clearly largest in size, which is often negative.
    for (;;) {
      const rs = Array.from({ length: 4 }, () => rng.sign() * rng.int(5, 97) / 100);
      const sizes = rs.map(Math.abs).sort((p, q) => q - p);
      if (sizes[0] - sizes[1] < 0.04 || new Set(rs).size < 4) continue;
      const top = rs.find((r) => Math.abs(r) === sizes[0]);
      if (top > 0 && rng.chance(0.6)) continue;
      const opts = rs.map((r, i) => ({ id: LETTERS[i], label: rSaid(r) }));
      const want = LETTERS[rs.indexOf(top)];
      const biggest = Math.max(...rs);
      return {
        prompt: [T.prose('Which correlation coefficient shows the strongest linear association?')],
        text: `strongest r: ${rs.map((r, i) => `${LETTERS[i]}=${asc(r)}`).join(', ')}`,
        answer: { type: 'choice', value: want, options: opts },
        visual: null,
        explain: `Strength is the size of r, its distance from 0, whatever the sign. The sizes are ${rs.map((r) => said(Math.abs(r))).join(', ')}, and the largest is ${said(sizes[0])}. `
          + `(${biggest !== top ? `${said(biggest)} is the biggest number, but ${said(top)} is further from 0.` : 'The largest number happens to be the strongest here, because of its size, not its sign.'}) So ${rSaid(top)}.`,
      };
    }
  }
  // Match a scatter plot to the nearest of four r values.
  const choices = [-0.9, -0.5, 0, 0.5, 0.9];
  const target = rng.pick(choices);
  let pts;
  for (;;) {
    const n = rng.int(16, 22);
    const raw = Array.from({ length: n }, () => { const a = normal(rng); return [a, target * a + Math.sqrt(1 - target * target) * normal(rng)]; });
    const lo = Math.min(...raw.map((p) => p[1])), hi = Math.max(...raw.map((p) => p[1]));
    const xl = Math.min(...raw.map((p) => p[0])), xh = Math.max(...raw.map((p) => p[0]));
    pts = raw.map(([a, b]) => [r2(0.5 + ((a - xl) / (xh - xl)) * 9), r2(0.5 + ((b - lo) / (hi - lo)) * 9)]).map(([a, b]) => [Math.round(a * 10) / 10, Math.round(b * 10) / 10]);
    if (Math.abs(pearson(pts) - target) <= 0.06) break;
  }
  const opts4 = rng.shuffle([target, ...rng.shuffle(choices.filter((v) => v !== target)).slice(0, 3)]).sort((p, q) => p - q);
  const opts = opts4.map((r, i) => ({ id: LETTERS[i], label: rSaid(r) }));
  // Kept short, so the plot and its four choices fit a phone screen together.
  const c = chart({ x: [0, 10, 2], y: [0, 10, 2], titles: { x: 'x', y: 'y' }, W: 9, H: 6, yTicks: true });
  for (const p of pts) c.spec.marks.push({ kind: 'point', at: c.at(p), tone: DOT });
  const f = trend(pts);
  c.spec.answer.push({ kind: 'segment', from: c.at([0.5, f(0.5)]), to: c.at([9.5, f(9.5)]), dashed: true });
  return {
    prompt: [T.prose('Which value of r best fits the scatter plot?')],
    text: `closest r: ${ptsAsc(pts)}; options ${opts4.map((r, i) => `${LETTERS[i]}=${asc(r)}`).join(', ')}`,
    answer: { type: 'choice', value: LETTERS[opts4.indexOf(target)], options: opts },
    visual: c.spec,
    explain: (target === 0
      ? 'The points make no line, rising or falling: r is near 0. '
      : `The points ${target > 0 ? 'rise' : 'fall'} from left to right, so r is ${target > 0 ? 'positive' : 'negative'}, and they keep ${Math.abs(target) > 0.7 ? 'close to a line, so it is near ' : 'only loosely to a line, so it is well short of '}${target > 0 ? '1' : '−1'}. `)
      + `(${Math.abs(target) > 0.7 ? 'A steep line is not what makes r large; the points keeping close to it is.' : target === 0 ? 'A few points that line up by chance do not make a trend.' : 'Loose points can still lean one way; that leaning is a moderate correlation, not none.'}) So ${rSaid(target)}.`,
  };
}

// ── Correlation vs causation ────────────────────────────────────────────

// Observational: two things measured, both driven by a third.
const OBSERVED = [
  { x: 'ice cream sales', y: 'sunburn cases', sign: 1, how: 'A beach town recorded ice cream sales and sunburn cases each day of the summer.',
    cause: 'Eating ice cream causes sunburn.', reverse: 'Getting sunburned makes people buy ice cream.', lurking: 'hot, sunny weather' },
  { x: 'shoe size', y: 'reading score', sign: 1, how: 'A school measured the shoe size and reading score of every student in grades 1 to 6.',
    cause: 'Bigger feet make students better readers.', reverse: 'Reading well makes feet grow.', lurking: 'age' },
  { x: 'firefighters sent', y: 'damage done', sign: 1, how: 'A city compared the number of firefighters sent to each fire with the damage, in dollars.',
    cause: 'Sending more firefighters causes more damage.', reverse: 'More damage makes firefighters arrive.', lurking: 'how big the fire was' },
  { x: 'umbrellas sold', y: 'car accidents', sign: 1, how: 'A town recorded umbrella sales and car accidents each day for a year.',
    cause: 'Selling umbrellas causes car accidents.', reverse: 'Car accidents make people buy umbrellas.', lurking: 'rain' },
  { x: 'heating bills', y: 'hot cocoa sales', sign: 1, how: 'A store compared local heating bills with its hot cocoa sales, week by week.',
    cause: 'Higher heating bills make people buy cocoa.', reverse: 'Buying cocoa raises heating bills.', lurking: 'cold weather' },
  { x: 'hours of daylight', y: 'coats sold', sign: -1, how: 'A store recorded the hours of daylight and the number of coats it sold each week of the year.',
    cause: 'Shorter days make people buy coats.', reverse: 'Buying coats makes the days shorter.', lurking: 'the season and its temperature' },
  { x: 'lifeguards on duty', y: 'swimmers rescued', sign: 1, how: 'A beach recorded the lifeguards on duty and the swimmers rescued each day.',
    cause: 'Having more lifeguards on duty causes more rescues.', reverse: 'More rescues put more lifeguards on duty.', lurking: 'how crowded the beach was' },
];
// Experiments: the amount of x was assigned at random.
const ASSIGNED = [
  { x: 'fertilizer', y: 'plant height', sign: 1, how: 'Researchers randomly assigned 40 plots to get 0, 1, 2 or 3 scoops of fertilizer, then measured the plants.',
    cause: 'More fertilizer causes taller plants.', reverse: 'Taller plants cause more fertilizer.' },
  { x: 'hours of sleep', y: 'reaction time', sign: -1, how: 'Researchers randomly assigned 60 volunteers to sleep 5, 6, 7 or 8 hours, then timed their reactions.',
    cause: 'More sleep causes faster reactions.', reverse: 'Faster reactions cause more sleep.' },
  { x: 'minutes of practice', y: 'typing speed', sign: 1, how: 'A class was randomly split into groups that practiced typing for 0, 10, 20 or 30 minutes a day for a month.',
    cause: 'More practice causes faster typing.', reverse: 'Faster typing causes more practice.' },
  { x: 'water', y: 'tomatoes picked', sign: 1, how: 'A farm randomly assigned rows of tomato plants to get 1, 2, 3 or 4 quarts (about 1 to 4 liters) of water a day.',
    cause: 'More water causes more tomatoes.', reverse: 'More tomatoes cause more water.' },
];

// Observed pairs with nothing linking them, where a correlation near 0 is
// what a real study would find. A lurking variable is only offered with a
// real correlation, since a third thing driving both would make one.
const UNLINKED = [
  { x: 'house number', y: 'number of pets', how: 'A survey asked 60 families for their house number and how many pets they have.',
    cause: 'A higher house number causes more pets.', reverse: 'Having more pets raises the house number.' },
  { x: 'shoe size', y: 'quiz score', how: 'A teacher recorded the shoe size and the quiz score of every student in one 8th-grade class.',
    cause: 'Bigger feet cause higher quiz scores.', reverse: 'Higher quiz scores make feet grow.' },
  { x: 'day of the month born', y: 'height', how: 'A club recorded the day of the month each member was born and each member’s height.',
    cause: 'Being born later in the month makes people taller.', reverse: 'Being taller changes the day people were born.' },
  { x: 'last digit of phone number', y: 'minutes to get to school', how: 'A class recorded the last digit of each student’s phone number and how many minutes they take to get to school.',
    cause: 'A higher last digit causes a longer trip.', reverse: 'A longer trip changes the phone number.' },
];

function causation(rng) {
  if (rng.chance(0.2)) {
    // Which study could show a cause at all?
    const S = rng.pick(ASSIGNED);
    const opts = rng.shuffle([
      ['survey', `Survey people about their ${S.x} and ${S.y}, and find the correlation.`],
      ['records', `Look up past records of ${S.x} and ${S.y}, and compare them.`],
      ['experiment', `Randomly assign different amounts of ${S.x}, then measure ${S.y}.`],
    ]).map(([design, label], i) => ({ id: LETTERS[i], design, label }));
    const want = opts.find((o) => o.design === 'experiment').id;
    return {
      prompt: [T.prose(`Which study could show whether ${S.x} affects ${S.y}?`)],
      text: `design for cause (${S.x}): options ${opts.map((o) => `${o.id}=${o.design}`).join(', ')}`,
      answer: { type: 'choice', value: want, options: opts.map(({ id, label }) => ({ id, label })) },
      visual: null,
      explain: `Only random assignment makes the groups alike in everything except ${S.x}, so a difference in ${S.y} can be put down to it. `
        + `(A survey or old records, however large, only show that the two go together: something else could drive both.) So the experiment that randomly assigns ${S.x}.`,
    };
  }
  const experiment = rng.chance(0.4);
  const real = rng.chance(0.8);
  const S = rng.pick(experiment ? ASSIGNED : real ? OBSERVED : UNLINKED);
  const r = (real ? S.sign * rng.int(70, 95) / 100 : rng.sign() * rng.int(0, 6) / 100) || 0;
  const right = !real ? 'none' : experiment ? 'cause' : 'associated';
  const opts = rng.shuffle([
    ['cause', S.cause], ['reverse', S.reverse],
    ['associated', `${cap(S.x)} and ${S.y} are associated, but this does not show that one causes the other.`],
    ['none', `${cap(S.x)} and ${S.y} show no association.`],
  ]).map(([meaningId, label], i) => ({ id: LETTERS[i], meaning: meaningId, label }));
  const want = opts.find((o) => o.meaning === right).id;
  const why = !real
    ? `r = ${said(r)} is next to 0: there is no linear association to explain, ${experiment ? 'even with random assignment' : 'which is what two unrelated things should show'}.`
    : experiment
      ? `The amounts of ${S.x} were assigned at random, so the groups differ only in ${S.x}, and a strong r of ${said(r)} shows its effect. (Here the experiment, not the size of r, is what earns the word "causes".)`
      : `r = ${said(r)} is a strong association, but nothing was assigned: ${S.lurking} could drive both. (A strong correlation from data that was only observed never shows a cause, however strong.)`;
  return {
    prompt: [T.prose(`${S.how} The correlation between ${S.x} and ${S.y} was r = ${said(r)}. Which conclusion does this support?`)],
    text: `causation: design=${experiment ? 'experiment' : 'observational'} r=${asc(r)}; options ${opts.map((o) => `${o.id}=${o.meaning}`).join(', ')}`,
    answer: { type: 'choice', value: want, options: opts.map(({ id, label }) => ({ id, label })) },
    visual: null,
    explain: `${why} So “${opts.find((o) => o.id === want).label}”`,
  };
}

// ── Two-way tables ──────────────────────────────────────────────────────

// Each survey: two rows and two columns, with the words to ask about them.
const SURVEYS = [
  { rows: ['7th grade', '8th grade'], cols: ['Soccer', 'Basketball'], who: 'students', vars: ['grade', 'favorite sport'],
    row: ['7th graders', '8th graders'], col: ['prefer soccer', 'prefer basketball'], colWho: ['students who prefer soccer', 'students who prefer basketball'] },
  { rows: ['Has a pet', 'No pet'], cols: ['Walks to school', 'Rides to school'], who: 'students', vars: ['having a pet', 'how they get to school'],
    row: ['students with a pet', 'students with no pet'], col: ['walk to school', 'ride to school'], colWho: ['students who walk to school', 'students who ride to school'] },
  { rows: ['Plays an instrument', 'Does not'], cols: ['In choir', 'Not in choir'], who: 'students', vars: ['playing an instrument', 'being in choir'],
    row: ['students who play an instrument', 'students who do not play an instrument'], col: ['are in choir', 'are not in choir'], colWho: ['students in choir', 'students not in choir'] },
  { rows: ['Adults', 'Teens'], cols: ['Prefers email', 'Prefers texting'], who: 'people', vars: ['age group', 'how they prefer to send messages'],
    row: ['adults', 'teens'], col: ['prefer email', 'prefer texting'], colWho: ['people who prefer email', 'people who prefer texting'] },
  { rows: ['Morning', 'Evening'], cols: ['Bought coffee', 'Bought tea'], who: 'customers', vars: ['time of day', 'what they bought'],
    row: ['morning customers', 'evening customers'], col: ['bought coffee', 'bought tea'], colWho: ['customers who bought coffee', 'customers who bought tea'] },
];

const pct = (part, whole) => (100 * part) / whole;
/** A percent as an answer: exact if it ends within one place, else rounded to one. */
function percentAnswer(part, whole) {
  const tenths = (1000 * part) / whole;
  if (Number.isInteger(tenths)) return { value: decimal(tenths / 10), rounded: false, shown: said(tenths / 10) };
  // Half up, on integers.
  const q = Math.floor((2000 * part + whole) / (2 * whole));
  return { value: { n: q, d: 10, places: 1 }, rounded: true, shown: (q / 10).toFixed(1) };
}

// requiem: catalogue/content/two-way-totals-always-shown
// Every count table shows its row and column totals while the question is
// open, so the whole a percent is taken of is always on the page; a working
// column, when there is one, is added beside them on reveal.
function grid(S, c, hide = null, fill = null, working = null) {
  const [[a, b], [d, e]] = c;
  const cells = [[a, b, a + b], [d, e, d + e], [a + d, b + e, a + b + d + e]];
  const rows = cells.map((r, i) => [i < 2 ? S.rows[i] : 'Total', ...r.map((v, j) => (hide && hide[0] === i && hide[1] === j ? '?' : String(v)))]);
  return { kind: 'table', cols: ['', ...S.cols, 'Total'], rows, ...(fill ? { fill } : {}),
    ...(working ? { workingCol: working[0], working: working[1] } : {}) };
}

/**
 * A relative frequency table: each row (or each column) as percents of its
 * own total, so a row reads across to 100%. `hide` is the cell asked for.
 */
function relativeGrid(S, by, pc, hide = null) {
  const cell = (i, j) => (hide && hide[0] === i && hide[1] === j ? '?' : `${pc[i][j]}%`);
  if (by === 'row') {
    return { kind: 'table', cols: ['', ...S.cols, 'Total'], rows: [0, 1].map((i) => [S.rows[i], cell(i, 0), cell(i, 1), '100%']),
      ...(hide ? { fill: `${pc[hide[0]][hide[1]]}%` } : {}) };
  }
  return { kind: 'table', cols: ['', ...S.cols], rows: [...[0, 1].map((i) => [S.rows[i], cell(i, 0), cell(i, 1)]), ['Total', '100%', '100%']],
    ...(hide ? { fill: `${pc[hide[0]][hide[1]]}%` } : {}) };
}

function relative(rng, S) {
  const by = rng.pick(['row', 'col']);
  const linked = rng.chance(0.5);
  // Percents of the first column (by row) or of the first row (by column), whole and clear of the edges.
  let p, q;
  for (;;) {
    p = rng.int(2, 18) * 5; q = rng.int(2, 18) * 5;
    if (linked ? Math.abs(p - q) >= 25 : Math.abs(p - q) <= 5) break;
  }
  const pc = by === 'row' ? [[p, 100 - p], [q, 100 - q]] : [[p, q], [100 - p, 100 - q]];
  const whole = (i, j) => (by === 'row' ? `the ${S.row[i]}` : `the ${S.colWho[j]}`);
  const intro = by === 'row'
    ? `The table shows a survey of ${S.who}, with each row as percents of that row's total.`
    : `The table shows a survey of ${S.who}, with each column as percents of that column's total.`;
  if (rng.chance(0.55)) {
    const i = rng.int(0, 1), j = rng.int(0, 1);
    const v = pc[i][j];
    const other = by === 'row' ? pc[i][1 - j] : pc[1 - i][j];
    const ask = by === 'row' ? `of the ${S.row[i]} ${S.col[j]}` : `of the ${S.colWho[j]} are ${S.row[i]}`;
    return {
      prompt: [T.prose(`${intro} What percent ${ask}?`)],
      text: `two-way relative missing: ${by} ${pc.map((r, a) => r.map((x, b) => (a === i && b === j ? '?' : x)).join(' ')).join(' / ')}`,
      answer: { type: 'decimal', value: decimal(v), percent: true },
      visual: relativeGrid(S, by, pc, [i, j]),
      explain: `Each ${by === 'row' ? 'row' : 'column'} is percents of its own total, so its two cells add to 100%. ${cap(whole(i, j))} are split ${other}% and ?%: 100% − ${other}% = ${v}%. `
        + `(The percents in a ${by === 'row' ? 'column' : 'row'} of this table need not add to 100%: they are shares of different wholes.) So ${v}%.`,
    };
  }
  const [x, y] = by === 'row' ? [pc[0][0], pc[1][0]] : [pc[0][0], pc[0][1]];
  return {
    prompt: [T.prose(`${intro} Is there an association between ${S.vars[0]} and ${S.vars[1]}?`)],
    text: `two-way relative association: ${by} ${pc.map((r) => r.join(' ')).join(' / ')}`,
    answer: { type: 'choice', value: linked ? 'yes' : 'no', options: [{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }] },
    // Revealed: the percents compared, as the count table's association rows show them.
    visual: { ...relativeGrid(S, by, pc), ...(by === 'row'
      ? { workingCol: `% ${S.cols[0].toLowerCase()}`, working: [`${x}%`, `${y}%`] }
      : { workingCol: 'gap', working: [`${Math.abs(x - y)} points`, `${Math.abs(x - y)} points`, ''] }) },
    explain: (by === 'row'
      ? `Compare the rows: ${x}% of the ${S.row[0]} ${S.col[0]}, against ${y}% of the ${S.row[1]}. `
      : `Compare the columns: ${x}% of the ${S.colWho[0]} are ${S.row[0]}, against ${y}% of the ${S.colWho[1]}. `)
      + `${linked ? 'Those are far apart, so knowing one variable changes what to expect of the other.' : 'Those are nearly the same, so one variable tells you nothing about the other.'} `
      + `(Percents of each ${by === 'row' ? 'row' : 'column'} already allow for groups of different sizes, so they can be compared directly.) So ${linked ? 'yes' : 'no'}.`,
  };
}

function twoWay(rng) {
  const S = rng.pick(SURVEYS);
  const mode = rng.pick(['missing', 'percent', 'percent', 'association', 'relative']);
  if (mode === 'relative') return relative(rng, S);
  let c;
  if (mode === 'association') {
    const linked = rng.chance(0.5);
    for (;;) {
      c = [[rng.int(8, 60), rng.int(8, 60)], [rng.int(8, 60), rng.int(8, 60)]];
      const gap = Math.abs(pct(c[0][0], c[0][0] + c[0][1]) - pct(c[1][0], c[1][0] + c[1][1]));
      if (linked ? gap >= 20 : gap <= 4) break;
    }
    const p1 = pct(c[0][0], c[0][0] + c[0][1]), p2 = pct(c[1][0], c[1][0] + c[1][1]);
    const about = (v) => `${Math.round(v)}%`;
    return {
      prompt: [T.prose(`The two-way table shows a survey of ${S.who}. Is there an association between ${S.vars[0]} and ${S.vars[1]}?`)],
      text: `two-way association: ${c[0][0]} ${c[0][1]} / ${c[1][0]} ${c[1][1]}`,
      answer: { type: 'choice', value: linked ? 'yes' : 'no', options: [{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }] },
      visual: grid(S, c, null, null, [`% ${S.cols[0].toLowerCase()}`,
        [about(p1), about(p2), about(pct(c[0][0] + c[1][0], c[0][0] + c[0][1] + c[1][0] + c[1][1]))]]),
      explain: `Compare the rows as percents, since they have different totals: of the ${S.row[0]}, ${c[0][0]} of ${c[0][0] + c[0][1]} ≈ ${about(p1)} ${S.col[0]}; `
        + `of the ${S.row[1]}, ${c[1][0]} of ${c[1][0] + c[1][1]} ≈ ${about(p2)}. `
        + `${linked ? 'Those are far apart, so knowing the row changes what to expect in the column.' : 'Those are nearly the same, so the row tells you nothing about the column.'} `
        + `(Comparing the counts ${c[0][0]} and ${c[1][0]} alone ignores that the rows are different sizes.) So ${linked ? 'yes' : 'no'}.`,
    };
  }
  c = [[rng.int(6, 70), rng.int(6, 70)], [rng.int(6, 70), rng.int(6, 70)]];
  const [[a, b], [d, e]] = c;
  const cells = [[a, b, a + b], [d, e, d + e], [a + d, b + e, a + b + d + e]];
  if (mode === 'missing') {
    // Hide one cell, with enough of the rest shown to find it.
    const hide = [rng.int(0, 2), rng.int(0, 2)];
    const v = cells[hide[0]][hide[1]];
    const shown = cells.map((r, i) => r.map((x, j) => (i === hide[0] && j === hide[1] ? '?' : String(x))));
    const [i, j] = hide;
    const how = j < 2 ? 'Down its column' : 'Across its row';
    const work = j < 2
      ? (i === 2 ? `${cells[0][j]} + ${cells[1][j]} = ${v}` : `${cells[2][j]} − ${cells[1 - i][j]} = ${v}`)
      : (`${cells[i][0]} + ${cells[i][1]} = ${v}`);
    return {
      prompt: [T.prose(`The two-way table shows a survey of ${S.who}. What number is missing?`)],
      text: `two-way missing: ${shown.map((r) => r.join(' ')).join(' / ')}`,
      answer: { type: 'decimal', value: decimal(v) },
      visual: grid(S, c, hide, String(v)),
      explain: `Every row and every column adds up to its total. ${how}: ${work}. `
        + `(The grand total in the corner is the sum of either total row or total column, not of everything in the table.) So ${v}.`,
    };
  }
  // A percent: of everyone, of one row, or of one column.
  const total = a + b + d + e;
  const kind = rng.pick(['joint', 'row', 'col', 'given-row', 'given-row', 'given-col']);
  const i = rng.int(0, 1), j = rng.int(0, 1);
  const rowT = cells[i][2], colT = cells[2][j], cell = cells[i][j];
  const [part, whole, ask, words] = {
    joint: [cell, total, `of all ${total} ${S.who} are ${S.row[i]} who ${S.col[j]}`, `cell r${i + 1} c${j + 1} of all`],
    row: [rowT, total, `of all ${total} ${S.who} are ${S.row[i]}`, `row r${i + 1} of all`],
    col: [colT, total, `of all ${total} ${S.who} are ${S.colWho[j]}`, `col c${j + 1} of all`],
    'given-row': [cell, rowT, `of the ${S.row[i]} ${S.col[j]}`, `col c${j + 1} within row r${i + 1}`],
    'given-col': [cell, colT, `of the ${S.colWho[j]} are ${S.row[i]}`, `row r${i + 1} within col c${j + 1}`],
  }[kind];
  const A = percentAnswer(part, whole);
  const tail = A.rounded ? ' Round to the nearest tenth of a percent.' : '';
  const wholeName = { joint: `all ${total}`, row: `all ${total}`, col: `all ${total}`, 'given-row': `the ${cells[i][0]} + ${cells[i][1]} = ${rowT} ${S.row[i]}`, 'given-col': `the ${colT} ${S.colWho[j]}` }[kind];
  return {
    prompt: [T.prose(`The two-way table shows a survey of ${S.who}. What percent ${ask}?${tail}`)],
    text: `two-way percent ${words}: ${a} ${b} / ${d} ${e}${A.rounded ? ' to 1 dp' : ''}`,
    answer: { type: 'decimal', value: A.value, percent: true },
    visual: grid(S, c, null, null, ['Part ÷ whole',
      [0, 1, 2].map((r) => (r === (kind === 'col' || kind === 'given-col' ? 2 : i) ? `${part} ÷ ${whole}` : ''))]),
    explain: `The whole is ${wholeName}, and the part is ${kind === 'row' ? `${cells[i][0]} + ${cells[i][1]} = ${part}` : part}: ${part} ÷ ${whole} × 100 = ${A.rounded ? `${(pct(part, whole)).toFixed(3)}…, which is ${A.shown} to 1 dp` : A.shown}. `
      + `(${kind.startsWith('given') ? `“Of the ${kind === 'given-row' ? S.row[i] : S.colWho[j]}” makes that ${kind === 'given-row' ? 'row' : 'column'} the whole, not the grand total.` : `Out of everyone, the whole is all ${total}, not a row or a column total.`}) So ${A.shown}%.`,
  };
}

const CONTENT = [association, predictions, meaning, residuals, strength, causation, twoWay];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
