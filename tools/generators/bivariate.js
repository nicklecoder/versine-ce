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
    xOf: (v) => `${said(v)} week${v === 1 ? '' : 's'}`, yOf: (v) => `${said(v)} inches`,
    what: 'the predicted height', each: 'for each extra week', zero: 'on the day it is planted',
    at: (v) => `${said(v)} week${v === 1 ? '' : 's'} after planting`, ask: 'how many weeks after planting' },
  { id: 'plant-cm', xName: 'weeks after planting', yName: 'height (cm)', x: [0, 8], m: [1.5, 3.5, 0.5], b: [3, 10, 1], yStep: 0.5,
    xOf: (v) => `${said(v)} week${v === 1 ? '' : 's'}`, yOf: (v) => `${said(v)} cm`,
    what: 'the predicted height', each: 'for each extra week', zero: 'on the day it is planted',
    at: (v) => `${said(v)} week${v === 1 ? '' : 's'} after planting`, ask: 'how many weeks after planting' },
  { id: 'hike-ft', signed: true, xName: 'elevation (thousands of ft)', yName: 'temperature (°F)', x: [0, 10], m: [-4, -3, 0.5], b: [55, 75, 1], yStep: 1,
    xOf: (v) => `${said(v * 1000)} ft`, yOf: (v) => `${said(v)}°F`,
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

function association(rng) {
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
    explain: `Set y = ${said(y)} and solve: ${said(line.m)}x = ${said(y)} − ${said(line.b)} = ${said(y - line.b)}, so x = ${said(y - line.b)} ÷ ${said(line.m)} = ${said(x)}. `
      + `(Putting ${said(y)} in for x answers a different question.) So ${M.xOf(x)}.`,
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
    explain: `The slope is rise over run: (${said(B[1])} − ${said(A[1])}) ÷ (${said(B[0])} − ${said(A[0])}) = ${said(rise)} ÷ ${said(run)} = ${said(line.m)}. `
      + (askSlope
        ? `(Run over rise, ${said(run)} ÷ ${said(rise)}, turns it upside down.) So ${said(line.m)}.`
        : `Go back from x = ${said(A[0])} to 0: ${said(A[1])} − ${said(line.m)} × ${said(A[0])} = ${said(line.b)}. (The first y given is not the intercept unless its x is 0.) So ${said(line.b)}.`),
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
const STRENGTH = {
  'strong-positive': 'Strong positive', 'weak-positive': 'Weak positive',
  'strong-negative': 'Strong negative', 'weak-negative': 'Weak negative', none: 'No correlation',
};
const rSaid = (r) => `r = ${said(r)}`;

function strength(rng) {
  const mode = rng.pick(['describe', 'describe', 'strongest', 'match']);
  if (mode === 'describe') {
    const band = rng.pick(Object.keys(STRENGTH));
    const size = band === 'none' ? rng.int(0, 8) / 100 : band.startsWith('strong') ? rng.int(80, 99) / 100 : rng.int(20, 45) / 100;
    const r = band.endsWith('negative') ? -size : size;
    const others = rng.shuffle(Object.keys(STRENGTH).filter((k) => k !== band)).slice(0, 3);
    const opts = rng.shuffle([band, ...others]).map((k, i) => ({ id: LETTERS[i], band: k, label: STRENGTH[k] }));
    const want = opts.find((o) => o.band === band).id;
    return {
      prompt: [T.prose(`A scatter plot has a correlation coefficient of ${rSaid(r)}. How would you describe the correlation?`)],
      text: `describe r=${asc(r)}; options ${opts.map((o) => `${o.id}=${o.band}`).join(', ')}`,
      answer: { type: 'choice', value: want, options: opts.map(({ id, label }) => ({ id, label })) },
      visual: null,
      explain: `The sign gives the direction and the size, ignoring the sign, gives the strength: near 1 is tight to a line, near 0 is no line at all. `
        + `Here the size is ${said(size)}${band === 'none' ? ', next to 0' : band.startsWith('strong') ? ', close to 1' : ', well short of 1'}. `
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
  const c = chart({ x: [0, 10, 2], y: [0, 10, 2], titles: { x: 'x', y: 'y' }, W: 8, H: 8, yTicks: true });
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
      + `(${Math.abs(target) > 0.7 ? 'A steep line is not what makes r large; the points keeping close to it is.' : 'Loose points can still lean one way; that leaning is a weak correlation, not none.'}) So ${rSaid(target)}.`,
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
  const S = rng.pick(experiment ? ASSIGNED : OBSERVED);
  const real = rng.chance(0.8);
  const r = (real ? S.sign * rng.int(70, 95) / 100 : rng.sign() * rng.int(0, 6) / 100) || 0;
  const right = !real ? 'none' : experiment ? 'cause' : 'associated';
  const opts = rng.shuffle([
    ['cause', S.cause], ['reverse', S.reverse],
    ['associated', `${cap(S.x)} and ${S.y} are associated, but this does not show that one causes the other.`],
    ['none', `${cap(S.x)} and ${S.y} show no association.`],
  ]).map(([meaningId, label], i) => ({ id: LETTERS[i], meaning: meaningId, label }));
  const want = opts.find((o) => o.meaning === right).id;
  const why = !real
    ? `r = ${said(r)} is next to 0: there is no linear association to explain, ${experiment ? 'even with random assignment' : 'by a cause or anything else'}.`
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

function grid(S, c, hide = null, fill = null, working = null) {
  const [[a, b], [d, e]] = c;
  const cells = [[a, b, a + b], [d, e, d + e], [a + d, b + e, a + b + d + e]];
  const rows = cells.map((r, i) => [i < 2 ? S.rows[i] : 'Total', ...r.map((v, j) => (hide && hide[0] === i && hide[1] === j ? '?' : String(v)))]);
  return { kind: 'table', cols: ['', ...S.cols, 'Total'], rows, ...(fill ? { fill } : {}),
    ...(working ? { workingCol: working[0], working: working[1] } : {}) };
}

function twoWay(rng) {
  const S = rng.pick(SURVEYS);
  const mode = rng.pick(['missing', 'percent', 'percent', 'association']);
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
  const wholeName = { joint: `all ${total}`, row: `all ${total}`, col: `all ${total}`, 'given-row': `the ${rowT} ${S.row[i]}`, 'given-col': `the ${colT} ${S.colWho[j]}` }[kind];
  return {
    prompt: [T.prose(`The two-way table shows a survey of ${S.who}. What percent ${ask}?${tail}`)],
    text: `two-way percent ${words}: ${a} ${b} / ${d} ${e}${A.rounded ? ' to 1 dp' : ''}`,
    answer: { type: 'decimal', value: A.value },
    visual: grid(S, c, null, null, ['Part ÷ whole',
      [0, 1, 2].map((r) => (r === (kind === 'col' || kind === 'given-col' ? 2 : i) ? `${part} ÷ ${whole}` : ''))]),
    explain: `The whole is ${wholeName}, and the part is ${part}: ${part} ÷ ${whole} × 100 = ${A.rounded ? `${(pct(part, whole)).toFixed(3)}…, which is ${A.shown} to 1 dp` : A.shown}. `
      + `(${kind.startsWith('given') ? `“Of the ${kind === 'given-row' ? S.row[i] : S.colWho[j]}” makes that ${kind === 'given-row' ? 'row' : 'column'} the whole, not the grand total.` : 'Out of everyone, the whole is the grand total in the corner, not a row or a column total.'}) So ${A.shown}%.`,
  };
}

const CONTENT = [association, predictions, meaning, residuals, strength, causation, twoWay];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
