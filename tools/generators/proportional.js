/**
 * Catalogue authoring tool: builds the problem library for proportional
 * relationships.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 */
import * as T from '../terms.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/proportional.js';

/**
 * Exact throughout: every quantity is a whole number of hundredths, so a
 * constant of 2.5 is 250 and nothing here is ever a float.
 */
const hund = (h) => ({ n: h, d: 100 });
/**
 * The answer box takes a decimal and refuses 3/4, so a question whose answer
 * is not whole says which form it wants: a student who found k = 18/24 = 3/4
 * had done the mathematics and was told only "type a decimal".
 */
const asDecimal = (h) => (h % 100 === 0 ? '' : ' Give it as a decimal.');

function show(h) {
  const neg = h < 0, a = Math.abs(h);
  const whole = Math.floor(a / 100), rem = a % 100;
  const frac = rem ? `.${String(rem).padStart(2, '0').replace(/0$/, '')}` : '';
  return `${neg ? '−' : ''}${whole}${frac}`;
}
/** Constants a student can hold: wholes, halves and quarters. */
const constant = (rng) => rng.pick([
  ...[2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15].map((k) => k * 100),
  50, 150, 250, 350, 450, 25, 75, 125,
]);

const YESNO = [
  { id: 'yes', label: 'Proportional', note: 'y is always the same multiple of x' },
  { id: 'no', label: 'Not proportional', note: 'the multiple changes' },
];

/** y ÷ x written exactly: a decimal when it ends within two places, else a fraction. */
function quotient(yH, x) {
  if (yH % x === 0) return show(yH / x);
  const g = gcd(yH, 100 * x);
  return `${yH / g}/${(100 * x) / g}`;
}
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));

/** Distinct x values for a table, in order. */
function xs(rng, count, max = 12, min = 1) {
  const set = new Set();
  while (set.size < count) set.add(rng.int(min, max));
  return [...set].sort((a, b) => a - b);
}

/**
 * Is a table proportional? The decoy is the one students accept: a table
 * that goes up by the same amount each step, but would not pass through
 * zero -- y = 2x + 3 rises steadily and is not proportional.
 */
function tableTest(rng) {
  const yes = rng.chance(0.5);
  const k = rng.pick([2, 3, 4, 5, 6, 7, 8]) * 100;
  const x = xs(rng, rng.int(3, 4));
  const offset = yes ? 0 : rng.nonZero(-4, 6) * 100;
  const ys = x.map((v) => v * k + offset);
  if (ys.some((y) => y <= 0)) return tableTest(rng);
  const ratios = x.map((v, i) => `${show(ys[i])} ÷ ${v} = ${quotient(ys[i], v)}`).join(', ');
  return {
    prompt: [T.prose('Is y proportional to x in this table?')],
    text: `proportional: ${x.map((v, i) => `${v}→${show(ys[i])}`).join(', ')}`,
    answer: { type: 'choice', value: yes ? 'yes' : 'no', options: YESNO },
    visual: { kind: 'table', cols: ['x', 'y'], rows: x.map((v, i) => [String(v), show(ys[i])]),
      workingCol: 'y ÷ x', working: x.map((v, i) => quotient(ys[i], v)) },
    explain: yes
      ? `Divide each y by its x: ${ratios}. The same every time, so y = ${show(k)}x. Proportional.`
      : `Divide each y by its x: ${ratios}. Not all the same. It goes up steadily, but y = ${show(k)}x ${offset > 0 ? '+' : '−'} `
        + `${show(Math.abs(offset))} does not pass through zero. Not proportional.`,
  };
}

/** The constant itself, read off a proportional table. */
function theConstant(rng) {
  const k = constant(rng);
  // x values that make every y a whole number of hundredths at worst.
  // Never x = 1: that row would be the answer, written in the table.
  const x = xs(rng, 3, 12, 2).map((v) => (k % 100 === 0 ? v : v * (k % 50 === 0 ? 2 : 4)));
  const ys = x.map((v) => v * k);
  const first = `${show(ys[0])} ÷ ${x[0]} = ${show(k)}`;
  return {
    prompt: [T.prose('y is proportional to x. What is the constant of proportionality, k, in y = kx?'
      + asDecimal(k))],
    text: `k from ${x.map((v, i) => `${v}→${show(ys[i])}`).join(', ')}`,
    answer: { type: 'decimal', value: hund(k) },
    visual: { kind: 'table', cols: ['x', 'y'], rows: x.map((v, i) => [String(v), show(ys[i])]),
      workingCol: 'y ÷ x', working: x.map(() => show(k)) },
    explain: `k is how much y there is for each 1 of x, so divide any y by its x: ${first}. `
      + `Every row gives the same, so k = ${show(k)}.`,
  };
}

/** One pair gives k, and k gives everything else -- in either direction. */
function useK(rng) {
  const k = constant(rng);
  const step = k % 100 === 0 ? 1 : k % 50 === 0 ? 2 : 4;
  const x0 = step * rng.int(1, 6);
  const y0 = x0 * k;
  let x1 = rng.int(1, 15);
  while (x1 === x0) x1 = rng.int(1, 15);
  const findY = rng.chance(0.6);
  if (findY) {
    const y1 = x1 * k;
    return {
      prompt: [T.prose(`y is proportional to x, and y = ${show(y0)} when x = ${x0}. What is y when x = ${x1}?`
        + asDecimal(y1))],
      text: `y = kx, ${x0}→${show(y0)}, y at x = ${x1}`,
      answer: { type: 'decimal', value: hund(y1) },
      visual: { kind: 'table', cols: ['x', 'y'], rows: [[String(x0), show(y0)], [String(x1), '?']], fill: show(y1) },
      explain: `First k: ${show(y0)} ÷ ${x0} = ${show(k)}, so y = ${show(k)}x. `
        + `Then at x = ${x1}, y = ${show(k)} × ${x1} = ${show(y1)}.`,
    };
  }
  // Asked backwards: the y is given and x is wanted, so the division goes the other way.
  const xAns = step * rng.int(1, 8);
  if (xAns === x0) return useK(rng);
  const y1 = xAns * k;
  return {
    prompt: [T.prose(`y is proportional to x, and y = ${show(y0)} when x = ${x0}. What is x when y = ${show(y1)}?`)],
    text: `y = kx, ${x0}→${show(y0)}, x at y = ${show(y1)}`,
    answer: { type: 'decimal', value: hund(xAns * 100) },
    visual: { kind: 'table', cols: ['x', 'y'], rows: [[String(x0), show(y0)], ['?', show(y1)]], fill: String(xAns) },
    explain: `First k: ${show(y0)} ÷ ${x0} = ${show(k)}, so y = ${show(k)}x. `
      + `Then ${show(y1)} = ${show(k)} × x, so x = ${show(y1)} ÷ ${show(k)} = ${xAns}.`,
  };
}

const SPAN = 10;
const PLANE = { xRange: [0, SPAN], yRange: [0, SPAN], grid: 1 };

/** Where a line y = (rise/run)x + c leaves the 10 × 10 grid. */
function edge(rise, run, c = 0) {
  // Exits through the top if it gets there before x = 10.
  const xTop = ((SPAN - c) * run) / rise;
  return xTop <= SPAN ? [xTop, SPAN] : [SPAN, c + (rise * SPAN) / run];
}

/** The height of a proportional line at x = 1, read from one lattice point on it. */
function readGraph(rng) {
  const run = rng.pick([2, 2, 4, 5]);
  const rise = rng.int(1, 10);
  if (rise % run === 0 && rise / run === 1) return readGraph(rng);
  const kH = (rise * 100) / run;
  if (!Number.isInteger(kH)) return readGraph(rng);
  // Usually the height at 1, which is k itself; sometimes another x, which
  // is k put to use -- and which the picture cannot simply be read for.
  let at = rng.chance(0.5) ? 1 : rng.int(2, 15);
  if (at === run) at = 1;
  const yH = kH * at;
  return {
    prompt: [T.prose(`This graph shows a proportional relationship. What is y when x = ${at}?` + asDecimal(yH))],
    text: `graph through (${run}, ${rise}), y at x = ${at}`,
    answer: { type: 'decimal', value: hund(yH) },
    visual: {
      kind: 'plane', ...PLANE,
      marks: [{ kind: 'segment', from: [0, 0], to: edge(rise, run), tone: 'var(--vec-1)' },
              { kind: 'point', at: [run, rise], label: `(${run}, ${rise})`, tone: 'var(--vec-1)' }],
      // The height at 1 is k, which any other x is worked out from, and the
      // point asked about is marked beside it whenever it is on the grid --
      // marking only (1, k) answered a question nobody had asked.
      answer: [{ kind: 'point', at: [1, kH / 100], label: `(1, ${show(kH)})` },
               ...(at !== 1 && at <= SPAN && yH <= SPAN * 100
                 ? [{ kind: 'point', at: [at, yH / 100], label: `(${at}, ${show(yH)})` }] : [])],
    },
    explain: `The line passes through (${run}, ${rise}), so y is ${rise} ÷ ${run} = ${show(kH)} times x `
      + `everywhere on it. At x = ${at}, y = ${at === 1 ? '' : `${show(kH)} × ${at} = `}${show(yH)}.`,
  };
}

/** Proportional or not, from a picture: straight, and through the origin. */
function graphTest(rng) {
  const kind = rng.pick(['yes', 'yes', 'offset', 'offset', 'curve']);
  const run = rng.pick([1, 2, 3, 4, 5]);
  const rise = rng.int(1, 8);
  // On reveal, the mark that decided it: where the line meets the y-axis,
  // or for the curve, the straight line it would have to be.
  let marks, answer, text, why;
  if (kind === 'yes') {
    marks = [{ kind: 'segment', from: [0, 0], to: edge(rise, run), tone: 'var(--vec-1)' }];
    answer = [{ kind: 'point', at: [0, 0], label: '(0, 0)', tone: 'var(--vec-2)' }];
    text = `line through (0, 0) and (${run}, ${rise})`;
    why = `It is a straight line and it starts at the origin, so y is always ${rise === run ? 'equal to' : 'the same multiple of'} x. Proportional.`;
  } else if (kind === 'offset') {
    const c = rng.int(1, 4);
    marks = [{ kind: 'segment', from: [0, c], to: edge(rise, run, c), tone: 'var(--vec-1)' }];
    answer = [{ kind: 'point', at: [0, c], label: `(0, ${c})`, tone: 'var(--vec-2)' }];
    text = `line through (0, ${c}) and (${run}, ${c + rise})`;
    why = `It is straight, but at x = 0 it is already at ${c}, not 0. Doubling x does not double y, `
      + 'so the multiple changes along the line. Not proportional.';
  } else {
    const a = rng.pick([4, 5, 8, 10]);
    const pts = [];
    for (let x = 0; x <= SPAN; x += 0.5) if ((x * x) / a <= SPAN) pts.push([x, (x * x) / a]);
    marks = [{ kind: 'path', points: pts, tone: 'var(--vec-1)' }];
    answer = [{ kind: 'segment', from: [0, 0], to: pts[pts.length - 1], label: 'straight', tone: 'var(--vec-2)' }];
    text = `curve y = x^2/${a}`;
    why = 'It starts at the origin, but it curves. A proportional relationship grows by the same '
      + 'amount for every step in x, which draws a straight line. Not proportional.';
  }
  return {
    prompt: [T.prose('Does this graph show a proportional relationship?')],
    text: `graph proportional: ${text}`,
    answer: { type: 'choice', value: kind === 'yes' ? 'yes' : 'no', options: YESNO },
    visual: { kind: 'plane', ...PLANE, marks, answer },
    explain: why,
  };
}

/**
 * Units. Each conversion is y = kx with a constant everyone knows; the
 * direction is the whole difficulty, and the explanation checks it with
 * size: a bigger unit needs fewer of them.
 */
const UNITS = [
  ['m', 'cm', 100], ['km', 'm', 1000], ['kg', 'g', 1000], ['L', 'mL', 1000],
  ['h', 'min', 60], ['min', 's', 60], ['ft', 'in', 12], ['yd', 'ft', 3], ['day', 'h', 24],
  ['cm', 'mm', 10],
  // requiem: catalogue/content/units-both-systems
  // Weight and capacity in customary units too, beside feet and yards.
  ['lb', 'oz', 16], ['gal', 'qt', 4],
];
const NAMES = { m: 'meter', cm: 'centimeter', km: 'kilometer', kg: 'kilogram', g: 'gram', L: 'liter',
  mL: 'milliliter', h: 'hour', min: 'minute', s: 'second', ft: 'foot', in: 'inch', yd: 'yard',
  day: 'day', mm: 'millimeter', lb: 'pound', oz: 'ounce', gal: 'gallon', qt: 'quart' };

function convert(rng) {
  const [big, small, k] = rng.pick(UNITS);
  const down = rng.chance(0.5);                  // big unit into small: multiply
  // Amounts in hundredths of the big unit, chosen so the other side is exact.
  let bigH;
  if (down) bigH = rng.pick([rng.int(1, 20) * 100, rng.int(1, 40) * 50, rng.int(1, 80) * 25]);
  else {
    // Small into big: the small amount must divide into a terminating decimal.
    const unit = k % 4 === 0 ? 25 : k % 2 === 0 ? 50 : 100;
    bigH = unit * rng.int(1, 40);
    if ((bigH * k) % 100 !== 0) return convert(rng);
  }
  const smallH = bigH * k;
  if (smallH % 100 !== 0 && !down) return convert(rng);
  const [from, fromU, to, toU, ans] = down
    ? [show(bigH), big, show(smallH), small, smallH]
    : [show(smallH), small, show(bigH), big, bigH];
  return {
    prompt: [...(ans % 100 === 0 ? [] : [T.prose('As a decimal:')]),
             T.num(`${from} ${fromU}`, 1), T.op('='), T.blank(), T.prose(toU)],
    text: `${from} ${fromU} to ${toU}`,
    answer: { type: 'decimal', value: hund(ans) },
    visual: null,
    explain: down
      ? `1 ${NAMES[big]} is ${k} ${small}, so ${from} ${big} is ${from} × ${k} = ${to} ${small}. `
        + `A smaller unit needs more of them, so the number goes up.`
      : `1 ${NAMES[big]} is ${k} ${small}, so ${from} ${small} is ${from} ÷ ${k} = ${to} ${big}. `
        + `A bigger unit needs fewer of them, so the number goes down.`,
  };
}

const CONTENT = [tableTest, theConstant, useK, readGraph, graphTest, convert];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  // The mixed level deals from every level; each is asked in a shape of its
  // own, so the widget that arrives with it says nothing new.
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
