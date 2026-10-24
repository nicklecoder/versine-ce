/**
 * Catalogue authoring tool: builds the problem library for exponential functions.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 *
 * Every `text` carries the model in plain ASCII, or the numbers of the story,
 * after a prefix naming what is asked, so scripts/check-answers.py can work
 * each answer out again. Arithmetic is exact: every factor is a fraction, and
 * a problem whose answer would not end within a few decimal places is never
 * made, so nothing is ever rounded.
 */
import * as T from '../terms.js';
import { minus } from '../../web/ui/dom.js';
import { previewOf } from '../../web/ui/express.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/exponential.js';

const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const Q = (n, d = 1) => { const g = gcd(n, d) * Math.sign(d); return { n: n / g, d: d / g }; };
const mul = (a, b) => Q(a.n * b.n, a.d * b.d);
const add = (a, b) => Q(a.n * b.d + b.n * a.d, a.d * b.d);
const pow = (b, k) => (k === 0 ? Q(1) : k < 0 ? pow(Q(b.d, b.n), -k) : mul(b, pow(b, k - 1)));
const num = (q) => q.n / q.d;

/** q as a decimal answer, or null when it would run past `places` places. */
function decimal(q, places = 3) {
  for (let k = 0, p = 1; k <= places; k++, p *= 10) {
    if ((q.n * p) % q.d === 0) return { n: (q.n * p) / q.d, d: p };
  }
  return null;
}
/** q written out for prose: 1.05, −4, 0.125, and 1/3 for one that never ends. */
function said(q) {
  const v = decimal(q, 6);
  return v ? minus(String(v.n / v.d)) : `${minus(q.n)}/${q.d}`;
}
/** Dollars as money is written: 665.50, 1250. */
const dollars = (q) => (q.d === 1 ? said(q) : (q.n / q.d).toFixed(2));
/** An ASCII model as it is set in prose: (1/3)ˣ, −2(2)ˣ. */
const pretty = (src) => src.replace(/\^\(-x\)/g, '⁻ˣ').replace(/\^x/g, 'ˣ').replace(/\^t/g, 'ᵗ').replace(/-/g, '−');
const answerOf = (q) => ({ type: 'decimal', value: decimal(q) });

const SPAN = 8;
const PLANE = { xRange: [-SPAN, SPAN], yRange: [-SPAN, SPAN], grid: 1 };
const LINE = 'var(--vec-1)';
const MARK = 'var(--vec-2)';

function curve(f, step = 0.05) {
  const pts = [];
  for (let x = -SPAN; x <= SPAN + 1e-9; x += step) {
    const y = f(x);
    if (y >= -SPAN - 1 && y <= SPAN + 1) pts.push([+x.toFixed(2), +y.toFixed(3)]);
  }
  return pts;
}

/** A base as it is written after a number: 2, 0.5, (1/2). */
const baseText = (b, asFraction = false) => ((asFraction || !decimal(b, 6)) && b.d !== 1 ? `(${b.n}/${b.d})` : said(b).replace('−', '-'));
/** a·bˣ in ASCII: 3(2)^x, 500(1.04)^x, 0.8^x, (1/2)^x. */
function model(a, b, { exp = 'x', fraction = false, letter = 'x' } = {}) {
  const base = baseText(b, fraction);
  const e = exp.replace('x', letter);
  // After a number the base is bracketed, so 3(2)^x is not read as 32^x.
  const power = `${base.startsWith('(') || num(a) === 1 || num(a) === -1 ? base : `(${base})`}^${e}`;
  if (num(a) === 1) return power;
  return `${num(a) === -1 ? '-' : said(a).replace('−', '-')}${power}`;
}

function equation(src, ask, left = 'y') {
  const r = previewOf(`${left} = ${src}`);
  if (!r.ok) throw new Error(`exponential: cannot draw "${src}" — ${r.error}`);
  return [...r.terms, T.prose(ask)];
}

const GROW = [Q(2), Q(3), Q(3, 2), Q(4), Q(105, 100), Q(12, 10), Q(11, 10), Q(5, 4)];
const DECAY = [Q(1, 2), Q(1, 3), Q(8, 10), Q(9, 10), Q(1, 4), Q(3, 4), Q(95, 100), Q(6, 10)];

const KINDS = [
  { id: 'growth', label: 'Growth' },
  { id: 'decay', label: 'Decay' },
];

function growthOrDecay(rng) {
  const grows = rng.chance(0.5);
  // Half the time the exponent is −x, which turns the base over.
  const flipped = rng.chance(0.3);
  const b = rng.pick(grows !== flipped ? GROW : DECAY);
  const a = rng.pick([Q(1), Q(1), Q(2), Q(3), Q(5), Q(100), Q(1, 2), Q(4)]);
  const fraction = b.d !== 1 && rng.chance(0.5) && b.d < 10;
  const src = model(a, b, { exp: flipped ? '(-x)' : 'x', fraction });
  const shown = said(b);
  let why;
  if (flipped) {
    why = `bˣ with −x is (1/b)ˣ: ${shown} turned over is ${said(Q(b.d, b.n))}, which is ${grows ? 'more than 1' : 'between 0 and 1'}`;
  } else {
    why = `The base is ${shown}, which is ${grows ? 'more than 1' : 'between 0 and 1'}`;
  }
  const small = num(a) <= 5;
  const f = (x) => num(a) * num(b) ** (flipped ? -x : x);
  return {
    prompt: equation(src, '— growth or decay?'),
    text: `grows or decays: ${src}`,
    answer: { type: 'choice', value: grows ? 'growth' : 'decay', options: KINDS },
    visual: small ? { kind: 'plane', ...PLANE, marks: [], answer: [{ kind: 'path', points: curve(f), tone: LINE }] } : null,
    explain: `${why}, so each step ${grows ? 'multiplies it up' : 'cuts it down'}: ${grows ? 'growth' : 'decay'}.`
      + `${num(a) !== 1 ? ` The ${said(a)} in front is only where it starts.` : ''}`,
  };
}

function readAB(rng) {
  const a = rng.pick([2, 3, 4, 5, 10, 20, 50, 100, 200, 500, 1000].map((n) => Q(n)));
  const b = rng.pick([Q(2), Q(3), Q(1, 2), Q(3, 2), Q(11, 10), Q(9, 10), Q(12, 10), Q(8, 10), Q(105, 100)]);
  const ask = rng.pick(['start', 'factor', 'value', 'value']);
  const src = model(a, b);
  if (ask === 'start') {
    return {
      prompt: equation(src, '— its value when x = 0?'),
      text: `start: ${src}`,
      answer: answerOf(a),
      visual: null,
      explain: `At x = 0 the power is ${said(b)}⁰ = 1, so y is the number in front: ${said(a)}.`,
    };
  }
  if (ask === 'factor') {
    return {
      prompt: equation(src, '— it is multiplied by what each time x goes up 1?'),
      text: `growth factor: ${src}`,
      answer: answerOf(b),
      visual: null,
      explain: `One more x is one more factor of the base: ${said(b)}.`,
    };
  }
  const k = rng.int(1, 3);
  const want = mul(a, pow(b, k));
  if (!decimal(want, 2) || num(want) > 100000) return readAB(rng);
  const steps = [];
  for (let i = 1, v = a; i <= k; i++) { v = mul(v, b); steps.push(said(v)); }
  return {
    prompt: equation(src, `— its value when x = ${k}?`),
    text: `value at ${k}: ${src}`,
    answer: answerOf(want),
    visual: null,
    explain: `Start at ${said(a)} and multiply by ${said(b)} ${['', 'once', 'twice', 'three times'][k]}: ${steps.join(', ')}.`,
  };
}

const RISING = ['A town’s population', 'A savings balance', 'The number of users of an app', 'A price'];
const FALLING = ['A car’s value', 'The number of fish in a lake', 'A phone’s battery charge', 'The amount of a medicine in the blood'];

function percentFactor(rng) {
  const up = rng.chance(0.5);
  // Small rates more often: 1.02 against 1.2 is the slip worth drilling.
  const r = rng.chance(0.4) ? rng.int(1, 9) : up ? rng.pick([rng.int(10, 60), 75, 100, 150]) : rng.int(10, 90);
  const b = Q(100 + (up ? r : -r), 100);
  if (rng.chance(0.5)) {
    const thing = rng.pick(up ? RISING : FALLING);
    return {
      prompt: [T.prose(`${thing} ${up ? 'grows' : 'falls'} by ${r}% each year. Written as y = a · bᵗ, what is b?`)],
      text: `factor for: ${up ? 'up' : 'down'} ${r}`,
      answer: answerOf(b),
      visual: null,
      explain: `${up ? `Growing ${r}% keeps the whole 100% and adds ${r}%` : `Falling ${r}% leaves 100% − ${r}%`}: `
        + `${100 + (up ? r : -r)}% = ${said(b)}.${up && r < 10 ? ` Not 1.${r}: that would be ${r}0%.` : ''}`,
    };
  }
  const a = rng.pick([50, 100, 200, 300, 1200, 5000, 20000]);
  const src = model(Q(a), b, { letter: 't' });
  return {
    prompt: equation(src, `— by what percent does it ${up ? 'grow' : 'fall'} each step?`),
    text: `percent for: ${baseText(b)}`,
    answer: answerOf(Q(r)),
    visual: null,
    explain: `Each step multiplies by ${said(b)}, which is ${100 + (up ? r : -r)}%: `
      + `${up ? `${r}% more than` : `${r}% less than`} the 100% it started as. So ${r}%.`,
  };
}

function compound(rng) {
  const up = rng.chance(0.6);
  const P = rng.pick(up ? [100, 200, 400, 500, 800, 1000, 1500, 2000, 2500, 4000, 5000, 8000, 10000]
    : [2000, 4000, 5000, 8000, 10000, 12000, 15000, 16000, 20000, 25000]);
  const r = rng.pick(up ? [2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 50] : [5, 10, 15, 20, 25, 40, 50]);
  const t = rng.pick([2, 2, 3]);
  const b = Q(100 + (up ? r : -r), 100);
  const want = mul(Q(P), pow(b, t));
  // Whole cents, and no more than three steps of long multiplication.
  if (!decimal(want, 2) || (t === 3 && ![10, 20, 50].includes(r))) return compound(rng);
  const steps = [];
  for (let i = 1, v = Q(P); i <= t; i++) { v = mul(v, b); steps.push(said(v)); }
  const prompt = up
    ? `$${P} is saved at ${r}% interest a year, added on at the end of each year. How much is in the account after ${t} years, in dollars?`
    : `A car bought for $${P} loses ${r}% of its value each year. What is it worth after ${t} years, in dollars?`;
  return {
    prompt: [T.prose(prompt)],
    text: `compound: ${P} ${up ? 'up' : 'down'} ${r} for ${t}`,
    answer: answerOf(want),
    visual: null,
    explain: `Each year multiplies by ${said(b)}, the whole amount, last year’s ${up ? 'interest' : 'loss'} included: `
      + `${P} → ${steps.join(' → ')}. So $${dollars(want)}.`,
  };
}

const STORIES = {
  2: { what: (A, D) => `A culture of ${A} bacteria doubles every ${D} hours.`, unit: 'hours', count: 'bacteria are there', word: 'doubling' },
  3: { what: (A, D) => `A video has ${A} views, and the number triples every ${D} days.`, unit: 'days', count: 'views does it have', word: 'tripling' },
  0.5: { what: (A, D) => `A sample of ${A} mg of a medicine has a half-life of ${D} hours.`, unit: 'hours', count: 'mg are left', word: 'halving' },
};

function repeated(rng) {
  const f = rng.pick([Q(2), Q(2), Q(3), Q(1, 2), Q(1, 2)]);
  const story = STORIES[num(f)];
  const n = rng.int(1, num(f) === 3 ? 4 : 6);
  const D = rng.pick([2, 3, 4, 5, 6, 8, 10, 12]);
  const A = num(f) < 1 ? rng.pick([40, 64, 80, 100, 160, 200, 320, 400, 500, 640, 800, 1000])
    : rng.pick([5, 10, 20, 25, 50, 100, 150, 200, 300]);
  const end = mul(Q(A), pow(f, n));
  if (!decimal(end, 3)) return repeated(rng);
  const times = `${n} ${story.word}${n === 1 ? '' : 's'}`;
  if (rng.chance(0.4)) {
    return {
      prompt: [T.prose(`${story.what(A, D)} After how many ${story.unit} are there ${said(end)}${num(f) < 1 ? ' mg left' : ''}?`)],
      text: `repeated until: ${A} times ${baseText(f)} every ${D} reach ${baseText(end)}`,
      answer: answerOf(Q(n * D)),
      visual: null,
      explain: `${said(end)} ÷ ${A} = ${said(pow(f, n))}${n > 1 ? ` = ${said(f)}${'⁰¹²³⁴⁵⁶⁷⁸⁹'[n]}` : ''}, which is ${times}. `
        + `${n} × ${D} = ${n * D} ${story.unit}.`,
    };
  }
  return {
    prompt: [T.prose(`${story.what(A, D)} How many ${story.count} after ${n * D} ${story.unit}?`)],
    text: `repeated: ${A} times ${baseText(f)} every ${D} for ${n * D}`,
    answer: answerOf(end),
    visual: null,
    explain: `${n * D} ${story.unit} is ${n * D} ÷ ${D} = ${times}: ${A} × ${said(f)}${n > 1 ? `^${n}`.replace(/\^(\d)/, (_, d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]) : ''} = ${said(end)}.`,
  };
}

const SHAPES = [
  { id: 'linear', label: 'Linear: the same amount each step' },
  { id: 'exponential', label: 'Exponential: the same factor each step' },
  { id: 'neither', label: 'Neither' },
];

function seq(rng, id) {
  if (id === 'linear') {
    const a = rng.int(-20, 60), m = rng.nonZero(-15, 15);
    return [0, 1, 2, 3].map((i) => Q(a + m * i));
  }
  if (id === 'exponential') {
    // Each base with the smallest start that keeps three steps whole.
    const [unit, b] = rng.pick([[1, Q(2)], [1, Q(3)], [1, Q(4)], [1, Q(5)], [8, Q(1, 2)], [27, Q(1, 3)], [8, Q(3, 2)],
      [27, Q(2, 3)], [125, Q(4, 5)], [125, Q(6, 5)], [100, Q(11, 10)], [100, Q(9, 10)]]);
    const k = rng.int(1, 40);
    return [0, 1, 2, 3].map((i) => mul(Q(unit * k), pow(b, i)));
  }
  // Neither: the differences grow by a step of their own, as squares do.
  const c = rng.int(-10, 30), p = rng.int(1, 3), q = rng.int(-2, 6);
  const s = [0, 1, 2, 3].map((i) => Q(p * i * i + q * i + c));
  return s;
}
const diffs = (s) => s.slice(1).map((v, i) => add(v, Q(-s[i].n, s[i].d)));
const ratios = (s) => (s.some((v) => v.n === 0) ? null : s.slice(1).map((v, i) => Q(v.n * s[i].d, v.d * s[i].n)));
const same = (xs) => xs && xs.every((x) => x.n === xs[0].n && x.d === xs[0].d);

const CHANGES = {
  linear: [
    (rng) => { const k = rng.int(2, 30); return [`A tank loses ${k} litres of water every hour.`, `-${k} per 1`]; },
    (rng) => { const k = 10 * rng.int(2, 30); return [`Rent goes up by $${k} every year.`, `+${k} per 1`]; },
    (rng) => { const k = rng.int(2, 30); return [`A plant grows ${k} cm taller each week.`, `+${k} per 1`]; },
    (rng) => { const k = rng.int(2, 20); return [`A candle burns ${k} mm shorter every 10 minutes.`, `-${k} per 10`]; },
  ],
  exponential: [
    (rng) => { const k = rng.int(1, 30); return [`A town grows by ${k}% every year.`, `*${(100 + k) / 100} per 1`]; },
    (rng) => { const k = rng.int(2, 30); return [`A colony of ants doubles every ${k} weeks.`, `*2 per ${k}`]; },
    (rng) => { const k = rng.int(2, 40); return [`A car loses ${k}% of its value every year.`, `*${(100 - k) / 100} per 1`]; },
    (rng) => { const k = rng.int(2, 30); return [`A sample of a radioactive element halves every ${k} hours.`, `*0.5 per ${k}`]; },
  ],
};

function linearOrExp(rng, again = null) {
  const id = again ?? rng.pick(SHAPES).id;
  if (id !== 'neither' && rng.chance(0.3)) {
    const [story, change] = rng.pick(CHANGES[id])(rng);
    return {
      prompt: [T.prose(`${story} Linear or exponential?`)],
      text: `change: ${change}`,
      answer: { type: 'choice', value: id, options: SHAPES },
      visual: null,
      explain: id === 'linear'
        ? 'The same amount is added or taken away each time: linear.'
        : 'A percent, a doubling or a halving multiplies by the same factor each time: exponential.',
    };
  }
  const s = seq(rng, id);
  if (s.some((v) => !decimal(v, 3) || Math.abs(num(v)) > 100000)) return linearOrExp(rng, id);
  const d = diffs(s), r = ratios(s);
  // A sequence must be the kind it was made as and no other: 5, 5, 5, 5 is both.
  const kind = same(d) ? 'linear' : same(r) ? 'exponential' : 'neither';
  if (kind !== id || same(d) && same(r)) return linearOrExp(rng, id);
  const list = (xs) => xs.map(said).join(', ');
  return {
    prompt: [T.prose(`At x = 0, 1, 2, 3, y is ${list(s)}. Linear or exponential?`)],
    text: `table kind: ${s.map((v) => baseText(v)).join(', ')}`,
    answer: { type: 'choice', value: id, options: SHAPES },
    visual: null,
    explain: `The differences are ${list(d)}${same(d) ? ': the same each step, so linear.' : ', not the same'}`
      + (same(d) ? '' : r ? `; the ratios are ${list(r)}${same(r) ? ': the same factor each step, so exponential.' : ', not the same either, so neither.'}`
        : '; and a 0 in the middle means no factor goes from one to the next, so neither.'),
  };
}

function asymptote(rng) {
  const a = Q(rng.pick([1, 2, 3, 4, -1, -2, -3]));
  const b = rng.pick([Q(2), Q(3), Q(1, 2), Q(1, 3)]);
  const k = rng.int(-6, 6);
  const fraction = rng.chance(0.6);
  const src = `${model(a, b, { fraction })}${k ? ` ${k < 0 ? '-' : '+'} ${Math.abs(k)}` : ''}`;
  const askLine = rng.chance(0.6);
  const f = (x) => num(a) * num(b) ** x + k;
  const flat = num(b) > 1 ? 'to the left' : 'to the right';
  // The line in two halves, labelled on the side the curve has left, so the
  // label never sits on the curve where it hugs the line.
  const steep = num(b) > 1 ? SPAN : -SPAN;
  const line = [{ kind: 'segment', from: [-steep, k], to: [0, k], tone: MARK, dashed: true },
    { kind: 'segment', from: [0, k], to: [steep, k], tone: MARK, dashed: true, label: `y = ${minus(k)}` }];
  return {
    prompt: equation(src, askLine ? '— the line it gets ever closer to is y = ?' : '— it crosses the y-axis at y = ?'),
    text: `${askLine ? 'asymptote' : 'y-intercept'}: ${src}`,
    answer: answerOf(askLine ? Q(k) : add(a, Q(k))),
    visual: { kind: 'plane', ...PLANE, marks: [], answer: [{ kind: 'path', points: curve(f), tone: LINE },
      ...(askLine ? line : [{ kind: 'point', at: [0, num(a) + k], label: `(0, ${minus(num(a) + k)})`, tone: MARK }])] },
    explain: askLine
      ? `${pretty(model(a, b, { fraction }))} gets ever closer to 0 ${flat}, and never reaches it. `
        + (k ? `So y gets ever closer to 0 ${k < 0 ? '−' : '+'} ${Math.abs(k)} = ${minus(k)}.` : 'With nothing added, the line is y = 0, the x-axis.')
      : `At x = 0 the power is 1, so y = ${said(a)}${k ? ` ${k < 0 ? '−' : '+'} ${Math.abs(k)} = ${said(add(a, Q(k)))}` : ''}.`,
  };
}

const CONTENT = [growthOrDecay, readAB, percentFactor, compound, repeated, linearOrExp, asymptote];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
