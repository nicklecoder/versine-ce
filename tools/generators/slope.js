/**
 * Catalogue authoring tool: builds the problem library for slope.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 *
 * Every `text` carries the two points (or the table) the slope comes from,
 * so scripts/check-answers.py can work out rise over run for itself.
 */
import * as T from '../terms.js';
import { minus, signed } from '../../web/ui/dom.js';
import { ratio, show, clip } from '../lines.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/slope.js';

const SPAN = 10;
const PLANE = { xRange: [-SPAN, SPAN], yRange: [-SPAN, SPAN], grid: 1 };
const LINE = 'var(--vec-1)';
const after = (n, unit) => `${n} ${n === 1 ? unit.replace(/s$/, '') : unit}`;
const pt = ([x, y]) => `(${minus(x)}, ${minus(y)})`;
const ptPlain = ([x, y]) => `(${x}, ${y})`;

/**
 * An unsimplified rise over run is still the slope: 4/6 is right, and
 * refusing it would mark the reading correct and the arithmetic wrong in one
 * breath. So simplest form is not required; the explanation shows it.
 */
const slopeAnswer = (rise, run) => ({ type: 'frac', value: ratio(rise, run), requireSimplest: false });

function said(rise, run) {
  const written = `${minus(rise)}/${minus(run)}`;
  const m = show(ratio(rise, run));
  return written === m ? m : `${written}, which is ${m}`;
}

/**
 * A line through two lattice points, drawn across the whole grid with the
 * two points marked. On reveal, the run and the rise between them.
 */
function fromGraph(rng, falling) {
  const run = rng.int(1, 5);
  const rise = (falling ? -1 : 1) * rng.int(1, 6);
  const x1 = rng.int(-8, 8 - run);
  const y1 = rng.int(-8, 8);
  const p2 = [x1 + run, y1 + rise];
  if (Math.abs(p2[1]) > 8) return fromGraph(rng, falling);
  const p1 = [x1, y1];
  const m = ratio(rise, run);
  const b = ratio(y1 * run - rise * x1, run);
  const corner = [p2[0], y1];
  return {
    prompt: [T.prose('What is the slope of this line?')],
    text: `slope from graph ${ptPlain(p1)} ${ptPlain(p2)}`,
    answer: slopeAnswer(rise, run),
    visual: {
      kind: 'plane', ...PLANE,
      marks: [{ kind: 'segment', from: clip(m, b, SPAN)[0], to: clip(m, b, SPAN)[1], tone: LINE },
              { kind: 'point', at: p1, tone: LINE }, { kind: 'point', at: p2, tone: LINE }],
      answer: [{ kind: 'segment', from: p1, to: corner, label: `run ${run}` },
               { kind: 'segment', from: corner, to: p2, label: `rise ${minus(rise)}` }],
    },
    explain: `From ${pt(p1)} to ${pt(p2)} the line goes ${run} along and `
      + `${falling ? `${-rise} down, so the rise is ${minus(rise)}` : `${rise} up`}. `
      + `Slope is rise over run: ${said(rise, run)}.`
      + (falling ? ' Negative, because the line falls as it goes right.' : ''),
  };
}

/**
 * Two points and no picture. Half the time the second point is to the left
 * of the first, which is where students subtract in two different orders;
 * the explanation subtracts in the order given and shows the signs agree.
 */
function fromTwo(rng) {
  const p1 = [rng.int(-12, 12), rng.int(-12, 12)];
  const p2 = [rng.int(-12, 12), rng.int(-12, 12)];
  if (p1[0] === p2[0] || p1[1] === p2[1]) return fromTwo(rng);
  const rise = p2[1] - p1[1], run = p2[0] - p1[0];
  const m = ratio(rise, run);
  if (Math.abs(m.n) > 12 || m.d > 9) return fromTwo(rng);
  return {
    prompt: [T.prose(`What is the slope of the line through ${pt(p1)} and ${pt(p2)}?`)],
    text: `slope ${ptPlain(p1)} ${ptPlain(p2)}`,
    answer: slopeAnswer(rise, run),
    visual: null,
    explain: `Subtract in the same order, second point minus first. Rise: ${minus(p2[1])} − ${signed(p1[1])} `
      + `= ${minus(rise)}. Run: ${minus(p2[0])} − ${signed(p1[0])} = ${minus(run)}. `
      + `Slope: ${said(rise, run)}.`
      + (run < 0 ? ' Subtracting the other way round gives the same slope, because both signs change.' : ''),
  };
}

const KINDS = [
  { id: 'positive', label: 'Positive', note: 'rises going right' },
  { id: 'negative', label: 'Negative', note: 'falls going right' },
  { id: 'zero', label: 'Zero', note: 'flat' },
  { id: 'undefined', label: 'Undefined', note: 'straight up and down' },
];

function zeroOrUndefined(rng) {
  // requiem: catalogue/library/choice-answers-balanced
  // A quarter each: with zero and undefined twice as likely, a student who
  // only ever chose between those two scored two in three.
  const kind = rng.pick(['zero', 'undefined', 'positive', 'negative']);
  const p1 = [rng.int(-9, 9), rng.int(-9, 9)];
  let p2;
  if (kind === 'zero') p2 = [p1[0] + rng.nonZero(-8, 8), p1[1]];
  else if (kind === 'undefined') p2 = [p1[0], p1[1] + rng.nonZero(-8, 8)];
  else {
    const run = rng.nonZero(-8, 8), rise = Math.abs(rng.nonZero(-8, 8)) * Math.sign(run) * (kind === 'positive' ? 1 : -1);
    p2 = [p1[0] + run, p1[1] + rise];
  }
  const rise = p2[1] - p1[1], run = p2[0] - p1[0];
  const why = {
    zero: () => `Both points have y = ${minus(p1[1])}, so the rise is 0 and the slope is 0/${minus(run)} = 0. The line is flat.`,
    undefined: () => `Both points have x = ${minus(p1[0])}, so the run is 0. Rise over run would be ${minus(rise)}/0, `
      + 'and nothing can be divided by zero: the line is vertical, and its slope is undefined.',
    positive: () => `Rise ${minus(rise)}, run ${minus(run)}: the same sign, so the slope ${show(ratio(rise, run))} is positive.`,
    negative: () => `Rise ${minus(rise)}, run ${minus(run)}: opposite signs, so the slope ${show(ratio(rise, run))} is negative.`,
  }[kind]();
  return {
    prompt: [T.prose(`What kind of slope does the line through ${pt(p1)} and ${pt(p2)} have?`)],
    text: `kind of slope ${ptPlain(p1)} ${ptPlain(p2)}`,
    answer: { type: 'choice', value: kind, options: KINDS },
    visual: null,
    explain: why,
  };
}

/**
 * A table whose x steps by more than one, so "how much does y go up each
 * row" is not yet the slope: it is the rise for a run of the step. The
 * working column on reveal writes each row's change as a division.
 */
function fromTable(rng) {
  const dx = rng.pick([1, 2, 2, 3, 4, 5]);
  const dy = rng.nonZero(-12, 12);
  const x0 = rng.int(-6, 4), y0 = rng.int(-15, 15);
  const xs = [0, 1, 2, 3].map((i) => x0 + i * dx);
  const ys = [0, 1, 2, 3].map((i) => y0 + i * dy);
  const m = ratio(dy, dx);
  return {
    prompt: [T.prose('These points lie on a line. What is its slope?')],
    text: `slope table ${xs.map((x, i) => `${x}→${ys[i]}`).join(', ')}`,
    answer: slopeAnswer(dy, dx),
    visual: { kind: 'table', cols: ['x', 'y'], rows: xs.map((x, i) => [minus(x), minus(ys[i])]),
      workingCol: 'change', working: xs.map((_, i) => (i === 0 ? '' : `${signed(dy)} ÷ ${dx}`)) },
    explain: `Each row, x goes up by ${dx} and y changes by ${minus(dy)}. Slope is the change in y over the `
      + `change in x: ${said(dy, dx)}.`
      + (dx > 1 ? ` The change in y alone is not the slope: it is the rise for a run of ${dx}.` : ''),
  };
}

/**
 * The same slope with units on the axes. Some of these fall, and the
 * negative sign is part of the answer: a tank losing 15 liters a minute is
 * changing at −15 liters per minute.
 */
const RATES = [
  { id: 'hiker', t: 'hours', q: 'km', s: (a, b) => `A hiker is ${a[1]} km from the start after ${after(a[0], 'hours')}, and `
    + `${b[1]} km from it after ${after(b[0], 'hours')}. At what rate is the hiker walking, in km per hour?`,
  up: true, per: 'km per hour', rate: [2, 6],
  // Walking from the start: about as far as the time at that speed allows.
  start: (rate, t1, rng) => rate * t1 + rng.int(0, 2) },
  { id: 'tank', t: 'minutes', q: 'liters', s: (a, b) => `A tank holds ${a[1]} liters after ${after(a[0], 'minutes')} and `
    + `${b[1]} liters after ${b[0]} minutes. At what rate is the amount changing, in liters per minute?`,
  up: false, per: 'liters per minute' },
  { id: 'battery', t: 'hours', q: '%', s: (a, b) => `A phone is at ${a[1]}% after ${after(a[0], 'hours')} and ${b[1]}% after `
    + `${b[0]} hours. At what rate is the battery changing, in % per hour?`, up: false, per: '% per hour',
  rate: [2, 12], start: (rate, t1, rng) => rng.int(40, 100) },
  { id: 'savings', t: 'weeks', q: 'dollars', s: (a, b) => `A savings account holds $${a[1]} after ${after(a[0], 'weeks')} and `
    + `$${b[1]} after ${b[0]} weeks. At what rate is it growing, in dollars per week?`, up: true,
  per: 'dollars per week', rate: [5, 40] },
  { id: 'plant', t: 'days', q: 'cm', s: (a, b) => `A plant is ${a[1]} cm tall on day ${a[0]} and ${b[1]} cm tall on `
    + `day ${b[0]}. At what rate is it growing, in cm per day?`, up: true, per: 'cm per day', rate: [1, 5] },
  // requiem: catalogue/content/units-both-systems
  // The same three in US units, at speeds that are true in them: a walker
  // makes 2 to 4 miles an hour, and a bean sprout an inch or two a day.
  { id: 'hikerMiles', t: 'hours', q: 'miles', s: (a, b) => `A hiker is ${a[1]} miles from the start after `
    + `${after(a[0], 'hours')}, and ${b[1]} miles from it after ${after(b[0], 'hours')}. At what rate is the `
    + 'hiker walking, in miles per hour?',
  up: true, per: 'miles per hour', rate: [2, 4],
  start: (rate, t1, rng) => rate * t1 + rng.int(0, 2) },
  { id: 'tankGallons', t: 'minutes', q: 'gallons', s: (a, b) => `A tank holds ${a[1]} gallons after `
    + `${after(a[0], 'minutes')} and ${b[1]} gallons after ${b[0]} minutes. At what rate is the amount `
    + 'changing, in gallons per minute?',
  up: false, per: 'gallons per minute' },
  { id: 'plantInches', t: 'days', q: 'inches', s: (a, b) => `A plant is ${a[1]} inches tall on day ${a[0]} and `
    + `${b[1]} inches tall on day ${b[0]}. At what rate is it growing, in inches per day?`,
  up: true, per: 'inches per day', one: 'inch per day', rate: [1, 2], start: (rate, t1, rng) => rng.int(2, 20) },
];

function rateWithUnits(rng, s = rng.pick(RATES)) {
  // The situation is kept through redraws, so the one redrawn most (a
  // battery cannot pass 100%) is not the one asked least.
  const t1 = rng.int(1, 5), t2 = t1 + rng.int(2, 6);
  const rate = rng.int(...(s.rate ?? [2, 15])) * (s.up ? 1 : -1);
  const start = s.start ? s.start(rate, t1, rng) : s.up ? rng.int(1, 40) : rng.int(t2 * 15 + 10, t2 * 15 + 60);
  const v1 = start, v2 = start + rate * (t2 - t1);
  if (s.id === 'battery' && (v1 > 100 || v2 < 0)) return rateWithUnits(rng, s);
  if (v2 <= 0) return rateWithUnits(rng, s);
  return {
    prompt: [T.prose(s.s([t1, v1], [t2, v2]))],
    text: `rate ${s.id} (${t1}, ${v1}) (${t2}, ${v2})`,
    answer: slopeAnswer(v2 - v1, t2 - t1),
    visual: null,
    explain: `The points are (${t1}, ${v1}) and (${t2}, ${v2}), with time across. The change is `
      + `${v2} − ${v1} = ${minus(v2 - v1)}${s.q === '%' ? '%' : ` ${s.q}`} over ${t2} − ${t1} = ${t2 - t1} ${s.t}: `
      + `${minus(v2 - v1)} ÷ ${t2 - t1} = ${minus(rate)} ${Math.abs(rate) === 1 && s.one ? s.one : s.per}.`
      + (rate < 0 ? ' Negative, because the amount is going down.' : ''),
  };
}

const CONTENT = [(rng) => fromGraph(rng, false), (rng) => fromGraph(rng, true), fromTwo,
  zeroOrUndefined, fromTable, rateWithUnits];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  // The mixed level deals from every level. Zero and Undefined is the one
  // choice, and its question names its own kind of answer, so the switch to
  // buttons says nothing the question had not.
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
