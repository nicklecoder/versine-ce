/**
 * Catalogue authoring tool: builds the problem library for linear models.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 *
 * Every `text` carries the numbers the answer is built from -- the start and
 * rate, the two readings, the table, the graph's corners -- so
 * scripts/check-answers.py can rebuild the answer without the story.
 */
import * as T from '../terms.js';
import { minus, signed } from '../../web/ui/dom.js';
import { previewOf } from '../../web/ui/express.js';
import { ratio, show, lineText } from '../lines.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/linear-models.js';

/** An equation for a sentence: one unbroken piece of maths among the words. */
const terms = (src) => [T.math(previewOf(src).terms)];
const whole = (n) => ({ n, d: 1 });
const lineAnswer = (m, b) => ({ type: 'linear', value: { m: ratio(m, 1), b: ratio(b, 1) } });
const money = (n) => `$${n}`;
/** 1 day, 2 days: a count with its noun, singular for one. */
const count = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * Situations with a start and a rate. Each says what x and y are, because
 * naming the variables is part of writing a model, and a falling one says
 * so with a negative rate rather than hiding it in the wording.
 */
const SITUATIONS = [
  { id: 'plumber', about: "the cost, in dollars, of a plumber's visit lasting x hours", start: [30, 90, 5], rate: [20, 60, 5], x: 'hours', y: 'cost in dollars',
    say: (s, r) => `A plumber charges ${money(s)} to come out, plus ${money(r)} for each hour of work.`,
    b: 'the call-out fee', m: 'the cost for each hour' },
  { id: 'gym', about: "the total cost, in dollars, of x months at a gym", start: [20, 80, 10], rate: [10, 40, 5], x: 'months', y: 'total cost in dollars',
    say: (s, r) => `A gym charges ${money(s)} to join and ${money(r)} a month.`,
    b: 'the joining fee', m: 'the cost for each month' },
  { id: 'candle', about: "the height, in cm, of a candle after it has burned for x hours", start: [20, 40, 2], rate: [-4, -1, 1], x: 'hours it has burned', y: 'height in cm',
    say: (s, r) => `A candle is ${s} cm tall and burns down ${-r} cm every hour.`,
    b: 'the starting height', m: 'the change in height each hour' },
  { id: 'saver', about: "Rae's savings, in dollars, after x weeks", start: [0, 200, 10], rate: [5, 30, 5], x: 'weeks', y: 'savings in dollars',
    say: (s, r) => `Rae has ${money(s)} saved and adds ${money(r)} every week.`,
    b: 'the savings at the start', m: 'the amount saved each week' },
  { id: 'tank', about: "the litres left in a tank after it has drained for x minutes", start: [200, 600, 50], rate: [-25, -5, 5], x: 'minutes', y: 'litres in the tank',
    say: (s, r) => `A tank holds ${s} litres and drains ${-r} litres a minute.`,
    b: 'the starting amount', m: 'the change in litres each minute' },
  { id: 'phone', about: "a monthly phone bill, in dollars, when x gigabytes are used", start: [0, 30, 5], rate: [1, 5, 1], x: 'gigabytes used', y: 'monthly bill in dollars',
    say: (s, r) => `A phone plan costs ${money(s)} a month plus ${money(r)} for each gigabyte used.`,
    b: 'the monthly charge', m: 'the cost for each gigabyte' },
];

const between = (rng, [lo, hi, step]) => lo + step * rng.int(0, Math.floor((hi - lo) / step));

function startAndRate(rng) {
  const s = rng.pick(SITUATIONS);
  const b = between(rng, s.start), m = between(rng, s.rate);
  if (m === 0) return startAndRate(rng);
  return {
    prompt: [T.prose(`${s.say(b, m)} Write an equation for y, the ${s.y}, when x is the number of ${s.x}.`)],
    text: `model ${s.id} start ${b} rate ${m}`,
    answer: lineAnswer(m, b),
    visual: null,
    explain: `The amount for each one is the rate, ${minus(m)}${m < 0 ? ', negative because it goes down' : ''}: `
      + `that is m. The amount there before any x is the start, ${b}: that is b. So ${lineText(whole(m), whole(b))}.`,
  };
}

/** Which number in someone else's equation is which part of the story. */
function meaning(rng) {
  const s = rng.pick(SITUATIONS);
  const b = between(rng, s.start), m = between(rng, s.rate);
  if (m === 0 || b === 0 || Math.abs(m) === b) return meaning(rng);
  const ask = rng.pick(['m', 'b']);
  const asked = ask === 'm' ? m : b;
  const rhs = lineText(whole(m), whole(b), { ascii: true }).slice(4);
  const options = [
    { id: 'start', label: s.b[0].toUpperCase() + s.b.slice(1), note: 'what y is when x is 0' },
    { id: 'rate', label: s.m[0].toUpperCase() + s.m.slice(1), note: 'how much y changes for each 1 of x' },
    { id: 'x', label: `The number of ${s.x}`, note: 'the input' },
  ];
  return {
    prompt: [T.prose('The equation'), ...terms(`y = ${rhs}`), T.prose(`gives ${s.about}. What does the ${minus(asked)} tell you?`)],
    text: `meaning: ${s.id} y = ${rhs}, the ${asked}`,
    answer: { type: 'choice', value: ask === 'm' ? 'rate' : 'start', options },
    visual: null,
    explain: ask === 'm'
      ? `${minus(m)} multiplies x, so it is how much y changes for each one of x`
        + `${m < 0 ? ', negative because y goes down' : ''}: ${s.m}.`
      : `${b} stands on its own, so it is y when x is 0, before anything has happened: ${s.b}.`,
  };
}

/** Two measurements, and the line through them. */
const READINGS = [
  { id: 'taxi', x: 'miles', y: 'fare in dollars', rate: [2, 4], start: [3, 8],
    say: (a, b) => `A ${a[0]}-mile taxi ride costs ${money(a[1])}, and a ${b[0]}-mile ride costs ${money(b[1])}.` },
  { id: 'spring', x: 'kg hung on it', y: 'length in cm', rate: [2, 5], start: [10, 30],
    say: (a, b) => `A spring is ${a[1]} cm long with ${a[0]} kg hung on it, and ${b[1]} cm long with ${b[0]} kg.` },
  { id: 'car', x: 'hours', y: 'litres of fuel left', rate: [-9, -4], start: [45, 60],
    say: (a, b) => `A car has ${a[1]} litres of fuel left after ${count(a[0], 'hour')} of driving, and ${b[1]} litres after ${count(b[0], 'hour')}.` },
  { id: 'hire', x: 'days', y: 'cost in dollars', rate: [15, 40], start: [10, 50],
    say: (a, b) => `Hiring a bike costs ${money(a[1])} for ${count(a[0], 'day')} and ${money(b[1])} for ${count(b[0], 'day')}.` },
];

function fromReadings(rng) {
  const s = rng.pick(READINGS);
  const m = rng.int(...s.rate), b = rng.int(...s.start);
  const x1 = rng.int(1, 4), x2 = x1 + rng.int(1, 4);
  const p1 = [x1, m * x1 + b], p2 = [x2, m * x2 + b];
  if (p2[1] <= 0) return fromReadings(rng);
  return {
    prompt: [T.prose(`${s.say(p1, p2)} Assuming a straight line, write an equation for y, the ${s.y}, when x is the number of ${s.x}.`)],
    text: `model from (${p1[0]}, ${p1[1]}) (${p2[0]}, ${p2[1]})`,
    answer: lineAnswer(m, b),
    visual: null,
    explain: `The readings are the points (${p1[0]}, ${p1[1]}) and (${p2[0]}, ${p2[1]}). The rate is `
      + `(${p2[1]} − ${p1[1]}) ÷ (${p2[0]} − ${p1[0]}) = ${minus(p2[1] - p1[1])} ÷ ${x2 - x1} = ${minus(m)}. `
      + `Then from (${p1[0]}, ${p1[1]}): ${p1[1]} = ${minus(m)} × ${x1} + b, so b = ${b}. `
      + `The model is ${lineText(whole(m), whole(b))}.`,
  };
}

const LINEAR = [
  { id: 'linear', label: 'Linear', note: 'the same change every step' },
  { id: 'not', label: 'Not linear', note: 'the change itself changes' },
];

/**
 * A table whose x goes up in ones. Half are linear, rising or falling; the
 * other half are the decoys that grow convincingly -- doubling and tripling,
 * whose changes multiply, squares, whose changes step by the same amount,
 * and a line with one change knocked off by one, which looks steady at a
 * glance. Each pool is wide, so the build does not drown one answer in the
 * other.
 */
function linearOrNot(rng) {
  const yes = rng.chance(0.5);
  const kind = yes ? rng.pick(['linear', 'falling']) : rng.pick(['doubling', 'tripling', 'squares', 'uneven']);
  const x0 = ['doubling', 'tripling'].includes(kind) ? rng.int(0, kind === 'tripling' ? 1 : 2) : rng.int(-2, 3);
  const xs = [0, 1, 2, 3].map((i) => x0 + i);
  const a = rng.int(1, kind === 'tripling' ? 3 : kind === 'doubling' ? 5 : 9), c = rng.int(-5, 10);
  const s = rng.pick([1, 1, 2, 3, -1, -2]);
  let ys;
  if (kind === 'uneven') {
    const bump = rng.int(0, 2), by = rng.pick([1, -1]) * (a === 1 ? 1 : rng.pick([1, 1, 2]));
    const steps = [0, 1, 2].map((i) => a + (i === bump ? by : 0));
    if (steps.some((d) => d === 0)) return linearOrNot(rng);
    ys = [c];
    steps.forEach((d) => ys.push(ys[ys.length - 1] + d));
  } else {
    const f = {
      linear: (x) => a * x + c, falling: (x) => -a * x + 20 + c,
      doubling: (x) => a * 2 ** x + c, tripling: (x) => a * 3 ** x + c, squares: (x) => s * x * x + c,
    }[kind];
    ys = xs.map(f);
  }
  const diffs = ys.slice(1).map((y, i) => y - ys[i]);
  if (!yes && new Set(diffs).size === 1) return linearOrNot(rng);
  const square = `${s === 1 ? '' : s === -1 ? '−' : s}x²${c === 0 ? '' : ` ${c < 0 ? '−' : '+'} ${Math.abs(c)}`}`;
  const why = {
    linear: 'The same every time, so it is linear.',
    falling: 'The same every time, so it is linear.',
    doubling: 'The change doubles every step, so it is not linear.',
    tripling: 'The change triples every step, so it is not linear.',
    // The change of a square steps by the same amount, 2 each time for x²:
    // what is true for every one of these, offset or not.
    squares: `The change itself goes ${s > 0 ? 'up' : 'down'} by ${Math.abs(2 * s)} each time, the pattern of a square `
      + `(y = ${square} here), so it is not linear.`,
    uneven: 'Not every change is the same, so it is not linear.',
  }[kind];
  return {
    prompt: [T.prose('Is this relationship linear?')],
    text: `linear table: ${xs.map((x, i) => `${x}→${ys[i]}`).join(', ')}`,
    answer: { type: 'choice', value: yes ? 'linear' : 'not', options: LINEAR },
    visual: { kind: 'table', cols: ['x', 'y'], rows: xs.map((x, i) => [minus(x), minus(ys[i])]),
      workingCol: 'change', working: ['', ...diffs.map(signed)] },
    explain: `x goes up by 1 each row. y changes by ${diffs.map(minus).join(', then ')}. ${why}`,
  };
}

/** I = Prt, for whole-dollar answers, sometimes asked as the total at the end. */
function simpleInterest(rng) {
  const P = rng.pick([200, 300, 400, 500, 600, 800, 1000, 1200, 1500, 2000, 2500]);
  const r = rng.pick([2, 3, 4, 5, 6, 8, 10]);
  const t = rng.int(1, 6);
  if ((P * r * t) % 100 !== 0) return simpleInterest(rng);
  const I = (P * r * t) / 100, each = (P * r) / 100;
  const total = rng.chance(0.4);
  return {
    prompt: [T.prose(`${money(P)} is saved at ${r}% simple interest a year. `
      + (total ? `How much is in the account after ${t} year${t > 1 ? 's' : ''}?`
        : `How much interest does it earn in ${t} year${t > 1 ? 's' : ''}?`))],
    text: `interest ${P} at ${r}% for ${t} ${total ? 'total' : 'interest'}`,
    answer: { type: 'int', value: total ? P + I : I },
    visual: null,
    explain: `${r}% of ${money(P)} is ${money(each)}, earned every year. Over ${t} year${t > 1 ? 's' : ''} that is `
      + `${each} × ${t} = ${money(I)}${total ? `, so the account holds ${P} + ${I} = ${money(P + I)}` : ''}. `
      + `It is linear: the balance is y = ${each}x + ${P} after x years.`,
  };
}

const AB = [
  { id: 'A', label: 'Function A', note: 'the table' },
  { id: 'B', label: 'Function B', note: 'the equation' },
];

/** One function as a table, one as an equation: compare a rate or a start. */
function compare(rng) {
  const mA = rng.nonZero(-6, 8), bA = rng.int(-8, 12);
  let mB = rng.nonZero(-6, 8), bB = rng.int(-8, 12);
  const ask = rng.pick(['rate', 'start']);
  if (ask === 'rate' && mA === mB) mB += 1;
  if (ask === 'start' && bA === bB) bB += 2;
  if (mB === 0) return compare(rng);
  const x0 = rng.int(1, 3), step = rng.pick([1, 2]);
  const xs = [0, 1, 2].map((i) => x0 + i * step);
  const rhs = lineText(whole(mB), whole(bB), { ascii: true }).slice(4);
  const bigger = ask === 'rate' ? (mA > mB ? 'A' : 'B') : (bA > bB ? 'A' : 'B');
  return {
    prompt: [T.prose('Function B is'), ...terms(`y = ${rhs}`),
      T.prose(`and Function A is shown in the table. Which has the greater ${ask === 'rate' ? 'rate of change' : 'y-intercept'}?`)],
    text: `compare ${ask}: ${xs.map((x) => `${x}→${mA * x + bA}`).join(', ')} vs y = ${rhs}`,
    answer: { type: 'choice', value: bigger, options: AB },
    visual: { kind: 'table', cols: ['x', 'y'], rows: xs.map((x) => [String(x), minus(mA * x + bA)]),
      workingCol: 'change', working: ['', ...xs.slice(1).map(() => (step === 1 ? signed(mA) : `${signed(mA * step)} ÷ ${step}`))] },
    explain: `In the table, x goes up by ${step} and y by ${minus(mA * step)}, so A's rate is ${minus(mA)}`
      + `${ask === 'start' ? `; going back to x = 0 gives A's y-intercept, ${minus(bA)}` : ''}. `
      + `B's ${ask === 'rate' ? `rate is ${minus(mB)}` : `y-intercept is ${minus(bB)}`}. `
      + `${minus(ask === 'rate' ? Math.max(mA, mB) : Math.max(bA, bB))} is greater`
      // A greater rate is the larger number, not the steeper line: −4 is
      // greater than −5, and a student reading "greater" as "faster" needs
      // to be told so on exactly the rows where the two disagree.
      + `${ask === 'rate' && Math.abs(Math.min(mA, mB)) > Math.abs(Math.max(mA, mB))
        ? `, even though ${bigger === 'A' ? 'B' : 'A'} is steeper: a greater rate of change is the larger number, sign and all`
        : ''}, so Function ${bigger}.`,
  };
}

/**
 * A journey drawn as distance from home against time: three straight
 * pieces, labelled A, B and C. The question picks out one by its shape.
 */
function graphStory(rng, want = rng.int(0, 2)) {
  // Which part answers is chosen first and kept through every redraw, so
  // A, B and C each answer a third of the time; left to the shapes, the
  // middle part answered nearly half.
  const ask = rng.pick(['fastest', 'stopped', 'returning']);
  const slopes = ask === 'stopped' ? [rng.int(1, 3), 0, rng.int(1, 3)]
    : ask === 'returning' ? [rng.int(1, 3), rng.int(1, 2), -rng.int(1, 3)]
      : [rng.int(1, 3), 0, rng.int(1, 4)];
  const order = rng.int(0, 2);
  // Rotate so the piece that answers is not always in the same place.
  const rot = [...slopes.slice(order), ...slopes.slice(0, order)];
  // Neighbouring parts with the same slope would draw as one piece.
  if (rot[0] === rot[1] || rot[1] === rot[2]) return graphStory(rng, want);
  // Sometimes the ride starts away from home, at a friend's, so the first
  // part can be a stop or the way back as often as the others can.
  const away = rng.chance(0.7) ? rng.int(2, 5) : 0;
  if (rot[0] < 0 && away === 0) return graphStory(rng, want);
  const widths = rot.map(() => rng.int(1, 3));
  const pts = [[0, away]];
  for (let i = 0; i < 3; i++) {
    const [x, y] = pts[i];
    pts.push([x + widths[i], y + rot[i] * widths[i]]);
  }
  if (pts.some(([, y]) => y < 0 || y > 10)) return graphStory(rng, want);
  // A flat part at distance 0 lies along the axis line and cannot be seen.
  if (rot.some((m, i) => m === 0 && pts[i][1] === 0)) return graphStory(rng, want);
  const top = Math.max(...rot.map(Math.abs));
  const pick = {
    fastest: rot.filter((m) => Math.abs(m) === top).length === 1 ? rot.findIndex((m) => Math.abs(m) === top) : -1,
    stopped: rot.indexOf(0),
    returning: rot.findIndex((m) => m < 0),
  }[ask];
  if (pick !== want) return graphStory(rng, want);
  const name = 'ABC'[pick];
  const options = ['A', 'B', 'C'].map((id) => ({ id, label: `Part ${id}` }));
  const speed = (m) => `${Math.abs(m)} km per hour`;
  return {
    prompt: [T.prose(`The graph shows a cyclist's distance from home, in km, over ${pts[3][0]} hours. `
      + { fastest: 'In which part are they going fastest?', stopped: 'In which part have they stopped?',
        returning: 'In which part are they heading back towards home?' }[ask])],
    text: `story graph ${ask}: ${pts.map(([x, y]) => `(${x}, ${y})`).join(' ')}`,
    answer: { type: 'choice', value: name, options },
    visual: {
      // Fitted to the journey, so a short one is not squeezed into a corner.
      kind: 'plane', xRange: [0, pts[3][0] + 1], yRange: [0, Math.max(4, ...pts.map(([, y]) => y)) + 1], grid: 1,
      titles: { x: 'hours', y: 'km from home' },
      marks: [0, 1, 2].map((i) => ({ kind: 'segment', from: pts[i], to: pts[i + 1], label: 'ABC'[i],
        tone: 'var(--vec-1)' })),
      answer: [{ kind: 'segment', from: pts[pick], to: pts[pick + 1],
        // Led by the part's own letter, which then lands exactly on the
        // letter already drawn there instead of colliding with it.
        label: `${name}: ${rot[pick] === 0 ? 'flat' : speed(rot[pick])}`, tone: 'var(--vec-2)' }],
    },
    explain: `The steepness of each part is the speed. ${rot.map((m, i) => `${'ABC'[i]}: ${m === 0 ? 'flat'
      : `${m < 0 ? 'down' : 'up'} ${Math.abs(m)} km each hour`}`).join('; ')}. `
      + { fastest: `The steepest is ${name}, so that is the fastest.`,
        stopped: `${name} is flat: the distance is not changing, so they have stopped.`,
        returning: `${name} goes down: the distance from home is shrinking, so they are heading back.` }[ask],
  };
}

const CONTENT = [startAndRate, meaning, fromReadings, linearOrNot, simpleInterest, compare, graphStory];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  // The mixed level deals from every level. Each choice level asks its own
  // shape of question -- what a number means, whether a table is linear,
  // which function, which part -- so the buttons arriving say nothing the
  // question had not.
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
