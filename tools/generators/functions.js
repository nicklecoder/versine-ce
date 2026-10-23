/**
 * Catalogue authoring tool: builds the problem library for functions.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 *
 * Every `text` carries what the answer is computed from -- the pairs, the
 * rule in plain ASCII, the corners of a graph -- so scripts/check-answers.py
 * can work it out for itself.
 */
import * as T from '../terms.js';
import { minus, signed } from '../../web/ui/dom.js';
import { previewOf } from '../../web/ui/express.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/functions.js';

const SPAN = 10;
const PLANE = { xRange: [-SPAN, SPAN], yRange: [-SPAN, SPAN], grid: 1 };
const LINE = 'var(--vec-1)';
/**
 * f(x) = rule, in one piece. Built by hand because the expression parser
 * reads f(x) as f times x and drops the brackets, which is right for 2(x)
 * and exactly wrong here.
 */
const defn = (name, arg, src) => T.math([T.letter(name), T.group([arg]), T.op('='), ...previewOf(src).terms]);
const pt = ([x, y]) => `(${minus(x)}, ${minus(y)})`;
const tm = (s) => s.replace(/-/g, '−');

/** mx + b in ASCII, with the 1 and the + 0 unwritten. */
const lin = (m, b) => `${m === 1 ? '' : m === -1 ? '-' : m}x${b === 0 ? '' : ` ${b < 0 ? '-' : '+'} ${Math.abs(b)}`}`;
const tail = (c) => (c === 0 ? '' : ` ${c < 0 ? '-' : '+'} ${Math.abs(c)}`);

const YESNO = [
  { id: 'yes', label: 'A function', note: 'every input has one output' },
  { id: 'no', label: 'Not a function', note: 'some input has two' },
];

/**
 * A set of pairs, sometimes with an input used twice. A repeated pair with
 * the SAME output is no failure -- (2, 5) listed twice is still one output
 * -- so that case is never generated: it would be a trick, not a test.
 */
function oneOutput(rng) {
  const n = rng.int(4, 5);
  const xs = new Set();
  while (xs.size < n) xs.add(rng.int(-6, 9));
  const pairs = [...xs].map((x) => [x, rng.int(-9, 9)]);
  const yes = rng.chance(0.5);
  if (!yes) {
    const [x, y] = rng.pick(pairs);
    let y2 = rng.int(-9, 9);
    while (y2 === y) y2 = rng.int(-9, 9);
    pairs.splice(rng.int(0, pairs.length), 0, [x, y2]);
  }
  const twice = pairs.find(([x], i) => pairs.findIndex(([x2]) => x2 === x) !== i);
  // Outputs repeating is fine, and worth saying: it is the misconception.
  const sameY = new Set(pairs.map(([, y]) => y)).size < pairs.length;
  return {
    prompt: [T.prose(`Is this set of pairs a function? ${pairs.map(pt).join(', ')}`)],
    text: `function? ${pairs.map(([x, y]) => `(${x}, ${y})`).join(', ')}`,
    answer: { type: 'choice', value: yes ? 'yes' : 'no', options: YESNO },
    visual: null,
    explain: yes
      ? `Every input, the first number, appears once, so each has exactly one output: a function.`
        + (sameY ? ' Two inputs sharing an output is fine; it is one input with two outputs that is not.' : '')
      : `The input ${minus(twice[0])} appears twice, with ${pairs.filter(([x]) => x === twice[0]).map(([, y]) => minus(y)).join(' and ')} `
        + 'as outputs. One input with two outputs is not a function.',
  };
}

/** Points along y = f(x), kept to the part inside the grid. */
function curve(f, step = 0.25) {
  const pts = [];
  for (let x = -SPAN; x <= SPAN + 1e-9; x += step) {
    const y = f(x);
    if (y >= -SPAN && y <= SPAN) pts.push([+x.toFixed(2), +y.toFixed(3)]);
  }
  return pts;
}

/**
 * A graph, and whether any vertical line meets it twice. Half are
 * functions, so the answer cannot be guessed from the kind of picture
 * alone: a flat line passes, an upright one fails.
 */
function verticalLine(rng) {
  const fn = rng.chance(0.5);
  const kind = rng.pick(fn ? ['line', 'flat', 'parabola', 'v-shape', 'cubic'] : ['circle', 'sideways', 'sideways', 'upright']);
  const h = rng.int(-3, 3), k = rng.int(-3, 3);
  const turn = rng.sign();
  let marks, probe, crossings, about;
  if (kind === 'circle') {
    const r = rng.int(3, 6);
    const pts = [];
    for (let i = 0; i <= 72; i++) pts.push([+(h + r * Math.cos(i * Math.PI / 36)).toFixed(3), +(k + r * Math.sin(i * Math.PI / 36)).toFixed(3)]);
    marks = [{ kind: 'path', points: pts, tone: LINE }];
    probe = h; crossings = 2; about = `circle centre (${h}, ${k}) radius ${r}`;
  } else if (kind === 'sideways') {
    const w = rng.pick([2, 4, 8]);
    const pts = [];
    for (let y = -SPAN; y <= SPAN; y += 0.25) {
      const x = turn * ((y - k) ** 2) / w + h;
      if (Math.abs(x) <= SPAN) pts.push([+x.toFixed(3), y]);
    }
    marks = [{ kind: 'path', points: pts, tone: LINE }];
    probe = h + turn * 2; crossings = 2; about = `sideways parabola x = ${turn < 0 ? '-' : ''}(y${tail(-k)})^2/${w}${tail(h)}`;
  } else if (kind === 'upright') {
    marks = [{ kind: 'segment', from: [h, -SPAN], to: [h, SPAN], tone: LINE }];
    probe = h; crossings = Infinity; about = `vertical line x = ${h}`;
  } else {
    const m = turn * rng.pick([2, 1, 0.5]);
    const f = {
      line: (x) => m * (x - h) + k,
      flat: () => k,
      parabola: (x) => ((x - h) ** 2) / 2 * turn + k,
      'v-shape': (x) => Math.abs(x - h) * turn + k,
      cubic: (x) => ((x - h) ** 3) / 8 * turn + k,
    }[kind];
    marks = [{ kind: 'path', points: curve(f), tone: LINE }];
    probe = h + 2; crossings = 1;
    about = kind === 'flat' ? `flat line y = ${k}` : `${kind} through (${h}, ${k}) ${kind === 'line' ? `slope ${m}` : turn > 0 ? 'up' : 'down'}`;
  }
  const label = crossings === Infinity ? 'meets it everywhere' : crossings === 2 ? 'meets it twice' : 'meets it once';
  return {
    prompt: [T.prose('Is this the graph of a function?')],
    text: `vertical test: ${about}`,
    answer: { type: 'choice', value: fn ? 'yes' : 'no', options: YESNO },
    visual: { kind: 'plane', ...PLANE, marks,
      answer: [{ kind: 'segment', from: [probe, -SPAN], to: [probe, SPAN], label, tone: 'var(--vec-2)' }] },
    explain: kind === 'flat'
      ? `Every vertical line meets a flat line once: each x has the one output ${minus(k)}. Outputs may repeat, so it is a function.`
      : fn
        ? 'Every vertical line meets it once: each x has one y, so it is a function.'
        : crossings === Infinity
          ? `The graph is itself a vertical line: the one input ${minus(h)} has every y as its output. Not a function.`
          : `The vertical line x = ${minus(probe)} meets it twice, so that x has two y values. Not a function.`,
  };
}

/** A rule a student can evaluate in their head: linear, or with a square. */
function rule(rng) {
  if (rng.chance(0.65)) {
    const m = rng.nonZero(-6, 6), b = rng.int(-9, 9);
    return { src: lin(m, b), f: (x) => m * x + b };
  }
  const a = rng.pick([1, 1, 2, -1]), c = rng.int(-6, 6);
  const src = `${a === 1 ? '' : a === -1 ? '-' : a}x^2${tail(c)}`;
  return { src, f: (x) => a * x * x + c, square: true };
}

function notation(rng) {
  const r = rule(rng);
  const a = rng.int(-5, 6);
  const out = r.f(a);
  if (Math.abs(out) > 80) return notation(rng);
  const name = rng.pick(['f', 'f', 'g', 'h']);
  const put = r.src.replace(/x/g, `(${a})`).replace(/\^2/g, '²');
  return {
    prompt: [defn(name, T.letter('x'), r.src), T.prose(`What is ${name}(${minus(a)})?`)],
    text: `${name}(${a}) for ${name}(x) = ${r.src}`,
    answer: { type: 'int', value: out },
    visual: null,
    explain: `${name}(${minus(a)}) means: put ${minus(a)} in wherever x is. ${name}(${minus(a)}) = ${tm(put)}`
      + `${r.square && a < 0 ? `, and a negative squared is positive: (${minus(a)})² = ${a * a}` : ''}. `
      + `That comes to ${minus(out)}.`,
  };
}

/** The height of a drawn graph at one x. */
function readGraph(rng) {
  const lineCase = rng.chance(0.5);
  let f, src;
  if (lineCase) {
    const m = rng.pick([1, 2, -1, -2, 3, -3]), b = rng.int(-5, 5);
    f = (x) => m * x + b; src = lin(m, b);
  } else {
    const h = rng.int(-3, 3), k = rng.int(-6, 4), up = rng.chance(0.5);
    f = (x) => (up ? 1 : -1) * (x - h) ** 2 + k; src = `${up ? '' : '-'}(x${tail(-h)})^2${tail(k)}`;
  }
  const a = rng.int(-6, 6);
  const out = f(a);
  if (Math.abs(out) > 9) return readGraph(rng);
  return {
    prompt: [T.prose(`The graph shows y = f(x). What is f(${minus(a)})?`)],
    text: `read f(${a}) on y = ${src}`,
    answer: { type: 'int', value: out },
    visual: { kind: 'plane', ...PLANE, marks: [{ kind: 'path', points: curve(f), tone: LINE }],
      answer: [{ kind: 'segment', from: [a, 0], to: [a, out], tone: 'var(--vec-2)' },
               { kind: 'point', at: [a, out], label: pt([a, out]) }] },
    explain: `Go along to x = ${minus(a)}, then ${out === 0 ? 'the graph is right there, on the axis'
      : `${out > 0 ? 'up' : 'down'} to the graph`}: it is at height ${minus(out)}. So f(${minus(a)}) = ${minus(out)}.`,
  };
}

/** Backwards: which input gives this output? Linear rules, so there is one. */
function solveFor(rng) {
  const m = rng.nonZero(-6, 6), b = rng.int(-12, 12);
  const x = rng.int(-8, 10);
  const k = m * x + b;
  const src = lin(m, b);
  return {
    prompt: [defn('f', T.letter('x'), src), T.prose(`For what value of x is f(x) = ${minus(k)}?`)],
    text: `solve f(x) = ${k} for f(x) = ${src}`,
    answer: { type: 'int', value: x },
    visual: null,
    explain: `This asks for the input, not the output. Set the rule equal to ${minus(k)}: ${tm(src)} = ${minus(k)}. `
      + `${b === 0 ? '' : `${b > 0 ? 'Take' : 'Add'} ${Math.abs(b)} ${b > 0 ? 'from' : 'to'} both sides: ${minus(m)}x = ${minus(k - b)}. `}`
      + `Divide by ${minus(m)}: x = ${minus(x)}. Check: f(${minus(x)}) = ${minus(k)}.`,
  };
}

/** A graph made of straight pieces with filled ends: where does it start and stop, how high and low does it go? */
function domainRange(rng) {
  const n = rng.int(3, 4);
  const xs = new Set();
  while (xs.size < n) xs.add(rng.int(-8, 8));
  const sorted = [...xs].sort((a, b) => a - b);
  const pts = sorted.map((x) => [x, rng.int(-8, 8)]);
  const ask = rng.pick(['domain-low', 'domain-high', 'range-low', 'range-high']);
  const ys = pts.map(([, y]) => y);
  const value = { 'domain-low': sorted[0], 'domain-high': sorted[n - 1],
    'range-low': Math.min(...ys), 'range-high': Math.max(...ys) }[ask];
  const where = ask.startsWith('domain')
    ? pts.find(([x]) => x === value) : pts.find(([, y]) => y === value);
  const words = { 'domain-low': 'smallest x in the domain', 'domain-high': 'largest x in the domain',
    'range-low': 'smallest value in the range', 'range-high': 'largest value in the range' }[ask];
  return {
    prompt: [T.prose(`The whole graph of f is shown. What is the ${words}?`)],
    text: `${ask} of ${pts.map(([x, y]) => `(${x}, ${y})`).join(' ')}`,
    answer: { type: 'int', value },
    visual: { kind: 'plane', ...PLANE,
      marks: [{ kind: 'path', points: pts, tone: LINE },
              { kind: 'point', at: pts[0], tone: LINE }, { kind: 'point', at: pts[n - 1], tone: LINE }],
      answer: [{ kind: 'point', at: where, label: pt(where) }] },
    explain: ask.startsWith('domain')
      ? `The domain is the x values the graph uses: from ${minus(sorted[0])} at its left end to `
        + `${minus(sorted[n - 1])} at its right. So the ${words} is ${minus(value)}.`
      : `The range is the y values it reaches: from its lowest point, ${minus(Math.min(...ys))}, up to its `
        + `highest, ${minus(Math.max(...ys))}. So the ${words} is ${minus(value)}.`,
  };
}

const CONTEXTS = [
  { f: 'h', in: 't', out: 'height', inUnit: 'seconds', outUnit: 'm', ins: [1, 6], outs: [8, 40],
    say: 'the height in metres of a ball t seconds after it is thrown',
    rate: (a, b) => `The ball rises ${b} m every ${a} seconds` },
  { f: 'C', in: 'n', out: 'cost', inUnit: 'tickets', outUnit: 'dollars', ins: [2, 12], outs: [15, 90],
    say: 'the cost in dollars of n tickets',
    rate: (a, b) => `The cost goes up ${b} dollars for every ${a} tickets` },
  { f: 'T', in: 'm', out: 'temperature', inUnit: 'minutes', outUnit: '°C', ins: [2, 15], outs: [20, 85],
    say: 'the temperature in °C of a drink m minutes after it is poured',
    rate: (a, b) => `The drink cools ${b}°C every ${a} minutes` },
  { f: 'd', in: 't', out: 'distance', inUnit: 'hours', outUnit: 'km', ins: [2, 9], outs: [60, 600],
    say: 'the distance in km a car has gone after t hours',
    rate: (a, b) => `The car goes ${b} km every ${a} hours` },
];

/** h(3) = 20 is a sentence about a time and a height. The common misreading swaps them. */
function meaning(rng) {
  const c = rng.pick(CONTEXTS);
  const a = rng.int(...c.ins);
  const b = rng.int(...c.outs);
  const unit = (u, n) => (u === '°C' ? `${n}°C` : `${n} ${u}`);
  const phrase = (x, y) => (c.inUnit === 'tickets'
    ? `${x} tickets cost ${y} dollars`
    : `After ${x} ${c.inUnit}, the ${c.out} is ${unit(c.outUnit, y)}`);
  const right = phrase(a, b), swapped = phrase(b, a), rate = c.rate(a, b);
  const options = rng.shuffle([right, swapped, rate]).map((label) => ({ id: label, label }));
  return {
    prompt: [T.prose(`${c.f}(${c.in}) is ${c.say}. What does`), defn(c.f, T.num(a), String(b)), T.prose('mean?')],
    text: `means: ${c.f}(${a}) = ${b} | ${c.inUnit} | ${c.outUnit}`,
    answer: { type: 'choice', value: right, options },
    visual: null,
    explain: `The number in the brackets is the input, ${c.in} = ${a} ${c.inUnit}. The number after the equals `
      + `is the output, the ${c.out}: ${unit(c.outUnit, b)}. So: ${right[0].toLowerCase()}${right.slice(1)}.`,
  };
}

const CONTENT = [oneOutput, verticalLine, notation, readGraph, solveFor, domainRange, meaning];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  // The mixed level deals from every level. The three choice levels each
  // ask a question that names its own answers -- function or not, what it
  // means -- so the buttons say nothing the question had not.
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
