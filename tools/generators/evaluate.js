/**
 * Catalogue authoring tool: builds the problem library for using expressions.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 */
import * as T from '../terms.js';
import { previewOf } from '../../web/ui/express.js';
import { minus } from '../../web/ui/dom.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/evaluate.js';

const VARS = ['x', 'y', 'n', 'a', 't'];

/** An expression drawn as the prompt draws it everywhere else. */
function terms(src) {
  const r = previewOf(src);
  if (!r.ok) throw new Error(`evaluate: cannot draw "${src}" — ${r.error}`);
  // One unbroken piece among the words of the question.
  return [T.math(r.terms)];
}

/** A value as it goes into an expression: negatives always in brackets. */
const put = (v) => (v < 0 ? `(−${-v})` : String(v));
/** Working written with a true minus. */
const tm = (s) => s.replace(/-/g, '−');

/**
 * The shapes substitution is drilled on. Each knows its source, the line
 * with the number put in, and the arithmetic in order -- so the working is
 * the expression's own, not a generic "plug it in".
 */
const SHAPES = [
  { src: (a, b, v) => `${a}${v} + ${b}`,
    work: (a, b, x) => [`${a} × ${put(x)} + ${b}`, `${minus(a * x)} + ${b}`], value: (a, b, x) => a * x + b },
  { src: (a, b, v) => `${a}${v} - ${b}`,
    work: (a, b, x) => [`${a} × ${put(x)} − ${b}`, `${minus(a * x)} − ${b}`], value: (a, b, x) => a * x - b },
  { src: (a, b, v) => `${a}(${v} + ${b})`,
    work: (a, b, x) => [`${a} × (${minus(x)} + ${b})`, `${a} × ${put(x + b)}`], value: (a, b, x) => a * (x + b) },
  { src: (a, b, v) => `${v}^2 + ${b}`,
    work: (a, b, x) => [`${put(x)}² + ${b}`, `${x * x} + ${b}`], value: (a, b, x) => x * x + b },
  { src: (a, b, v) => `${a}${v}^2`,
    work: (a, b, x) => [`${a} × ${put(x)}²`, `${a} × ${x * x}`], value: (a, b, x) => a * x * x },
  { src: (a, b, v) => `${b} - ${a}${v}`,
    work: (a, b, x) => [`${b} − ${a} × ${put(x)}`, `${b} − ${put(a * x)}`], value: (a, b, x) => b - a * x },
];

/**
 * −x² is the negative of x², not the square of −x: the power is done first,
 * by the same order of operations as everywhere else. Only asked once
 * negatives are being substituted, because with a positive x it is the
 * same question as 5 − x².
 */
const NEG_SQUARE = { src: (a, b, v) => `${b} - ${v}^2`,
  work: (a, b, x) => [`${b} − ${put(x)}²`, `${b} − ${x * x}`], value: (a, b, x) => b - x * x };

function substitute(rng, negative) {
  const v = rng.pick(VARS);
  const shapes = negative ? [...SHAPES, NEG_SQUARE, NEG_SQUARE] : SHAPES;
  const shape = rng.pick(shapes);
  const a = rng.int(2, 9), b = rng.int(1, 15);
  const x = negative ? -rng.int(1, 9) : rng.int(1, 10);
  const src = shape.src(a, b, v);
  const [line, mid] = shape.work(a, b, x);
  const value = shape.value(a, b, x);
  const squared = src.includes('^2');
  return {
    prompt: [T.prose('Work out'), ...terms(src), T.prose(`when ${v} = ${minus(x)}.`)],
    text: `${src} at ${v} = ${x}`,
    answer: { type: 'int', value },
    visual: {
      kind: 'evalmodel',
      lines: [tm(src), line, mid, minus(value)],
      rules: [`put ${minus(x)} in place of ${v}`,
              squared ? 'the power first' : 'multiply first', 'then finish'],
      hint: negative ? 'Where does the minus go when the number goes in?' : 'Put the number in. What comes first?',
    },
    explain: `Put ${put(x)} where ${v} was: ${line}. `
      + (negative && squared
        ? `The power comes before anything else, and ${put(x)}² = ${x * x}: a negative squared is positive. `
        : '')
      + `That is ${mid}, which is ${minus(value)}.`,
  };
}

/**
 * Formulas: an expression with a job, and usually more than one letter.
 * Values are chosen so the answers are whole, since the difficulty here is
 * reading the formula, not the arithmetic it lands on.
 */
const FORMULAS = [
  () => ({ name: 'The perimeter of a rectangle', out: 'P', src: '2(l + w)',
    vals: (rng) => ({ l: rng.int(2, 20), w: rng.int(1, 15) }),
    value: ({ l, w }) => 2 * (l + w),
    work: ({ l, w }) => [`2(${l} + ${w})`, `2 × ${l + w}`] }),
  () => ({ name: 'The area of a triangle', out: 'A', src: 'b*h/2',
    vals: (rng) => { const b = rng.int(2, 20); return { b, h: b % 2 ? 2 * rng.int(1, 9) : rng.int(1, 18) }; },
    value: ({ b, h }) => (b * h) / 2,
    work: ({ b, h }) => [`${b} × ${h} ÷ 2`, `${b * h} ÷ 2`] }),
  () => ({ name: 'Distance from speed and time', out: 'd', src: 'r*t',
    vals: (rng) => ({ r: rng.int(3, 70), t: rng.int(2, 9) }),
    value: ({ r, t }) => r * t,
    work: ({ r, t }) => [`${r} × ${t}`, `${r * t}`] }),
  () => ({ name: 'Celsius into Fahrenheit', out: 'F', src: '9C/5 + 32',
    vals: (rng) => ({ C: 5 * rng.int(-8, 20) }),
    value: ({ C }) => (9 * C) / 5 + 32,
    work: ({ C }) => [`9 × ${put(C)} ÷ 5 + 32`, `${minus((9 * C) / 5)} + 32`] }),
  () => ({ name: 'Average speed', out: 's', src: 'd/t',
    vals: (rng) => { const t = rng.int(2, 8); return { d: t * rng.int(3, 60), t }; },
    value: ({ d, t }) => d / t,
    work: ({ d, t }) => [`${d} ÷ ${t}`, `${d / t}`] }),
  () => ({ name: 'Two letters at once', out: null, src: 'a + 2b',
    vals: (rng) => ({ a: rng.int(-12, 12), b: rng.nonZero(-9, 9) }),
    value: ({ a, b }) => a + 2 * b,
    work: ({ a, b }) => [`${minus(a)} + 2 × ${put(b)}`, `${minus(a)} + ${put(2 * b)}`] }),
  () => ({ name: 'Two letters at once', out: null, src: '3x - y',
    vals: (rng) => ({ x: rng.int(-9, 9), y: rng.nonZero(-12, 12) }),
    value: ({ x, y }) => 3 * x - y,
    work: ({ x, y }) => [`3 × ${put(x)} − ${put(y)}`, `${minus(3 * x)} − ${put(y)}`] }),
];

function formula(rng) {
  const f = rng.pick(FORMULAS)();
  const vals = f.vals(rng);
  const value = f.value(vals);
  const given = Object.entries(vals).map(([k, v]) => `${k} = ${minus(v)}`);
  const list = given.length === 2 ? given.join(' and ') : given.join(', ');
  const head = f.out ? [T.prose(`${f.name}:`), T.letter(f.out), T.op('=')] : [T.prose('Work out')];
  const [line, mid] = f.work(vals);
  return {
    prompt: [...head, ...terms(f.src), T.prose(f.out ? `Find ${f.out} when ${list}.` : `when ${list}.`)],
    text: `${f.src} at ${Object.entries(vals).map(([k, v]) => `${k} = ${v}`).join(', ')}`,
    answer: { type: 'int', value },
    visual: {
      kind: 'evalmodel',
      lines: [tm(f.src).replace(/\*/g, ' × '), line, mid, minus(value)],
      rules: ['each letter gets its number', 'in order', 'giving'],
      hint: 'Which number goes with which letter?',
    },
    explain: `Each letter takes its number: ${line}. That is ${mid}`
      + (mid === String(value) ? '.' : `, which is ${minus(value)}.`),
  };
}

/**
 * Words into an expression. Every phrase here has one natural written form,
 * because a typed answer is judged by form. The traps are the reversals:
 * "5 less than n" is n − 5, and "n less than 5" is 5 − n.
 */
const PHRASES = [
  (k, v) => ({ words: `${k} more than ${v}`, expr: `${v} + ${k}`,
    why: `"${k} more than ${v}" starts from ${v} and adds ${k}` }),
  (k, v) => ({ words: `${k} less than ${v}`, expr: `${v} - ${k}`,
    why: `"${k} less than ${v}" starts from ${v} and takes ${k} away, so ${v} comes first — `
      + `${k} − ${v} would be "${v} less than ${k}"` }),
  (k, v) => ({ words: `${v} less than ${k}`, expr: `${k} - ${v}`,
    why: `"${v} less than ${k}" starts from ${k} and takes ${v} away` }),
  (k, v) => ({ words: `${v} taken away from ${k}`, expr: `${k} - ${v}`,
    why: `taking ${v} away from ${k} starts with ${k}` }),
  (k, v) => ({ words: `the product of ${k} and ${v}`, expr: `${k}${v}`,
    why: `a product is a multiplication, written ${k}${v}` }),
  (k, v) => ({ words: `${v} divided by ${k}`, expr: `${v}/${k}`,
    why: `${v} is the one being divided, so it goes on top` }),
  (k, v) => ({ words: `the square of ${v}, plus ${k}`, expr: `${v}^2 + ${k}`,
    why: `square ${v} first, then add ${k}` }),
  (k, v, j) => ({ words: `${k} less than ${j} times ${v}`, expr: `${j}${v} - ${k}`,
    why: `start from ${j} times ${v}, which is ${j}${v}, then take ${k} away` }),
  (k, v, j) => ({ words: `${j} times ${v}, increased by ${k}`, expr: `${j}${v} + ${k}`,
    why: `${j} times ${v} is ${j}${v}, and increasing it by ${k} adds ${k}` }),
  (k, v) => ({ words: `twice ${v}, decreased by ${k}`, expr: `2${v} - ${k}`,
    why: `twice ${v} is 2${v}, and decreasing it by ${k} takes ${k} away` }),
  (k, v, j) => ({ words: `${v} divided by ${j}, then ${k} taken away`, expr: `${v}/${j} - ${k}`,
    why: `${v} divided by ${j} is ${v}/${j}, and then ${k} comes off` }),
];

function wordsIntoSymbols(rng) {
  const v = rng.pick(VARS);
  const k = rng.int(2, 15);
  let j = rng.int(2, 9);
  while (j === k) j = rng.int(2, 9);
  const p = rng.pick(PHRASES)(k, v, j);
  return {
    prompt: [T.prose(`Write as an expression: ${p.words}.`)],
    text: `words: ${p.words}`,
    answer: { type: 'expr', value: p.expr },
    visual: null,
    explain: `Read the whole phrase before writing: ${p.why}. That gives ${tm(p.expr).replace('^2', '²')}.`,
  };
}

/**
 * A situation and three expressions. The wrong two are the readings
 * students actually produce: the numbers swapped, and the bracket put
 * round the wrong thing.
 */
const SITUATIONS = [
  (rng) => {
    const each = rng.int(3, 15);
    let fee = rng.int(2, 9);
    while (fee === each) fee = rng.int(2, 9);   // equal, the swapped reading is the right one
    return { story: `Tickets cost $${each} each, plus a $${fee} booking fee for the whole order. `
      + 'What do t tickets cost?', right: `${each}t + ${fee}`,
    wrong: [`${fee}t + ${each}`, `${each}(t + ${fee})`],
    why: `Each ticket adds $${each}, so t of them is ${each}t, and the fee is paid once: ${each}t + ${fee}.` };
  },
  (rng) => {
    const start = rng.int(30, 90), spend = rng.int(3, 9);
    return { story: `You have $${start} and spend $${spend} every week. How much is left after w weeks?`,
      right: `${start} − ${spend}w`, wrong: [`${spend}w − ${start}`, `(${start} − ${spend})w`],
      why: `You start with ${start} and ${spend} goes each week, so ${spend}w has gone after w weeks: ${start} − ${spend}w.` };
  },
  (rng) => {
    const k = rng.int(2, 6), tip = rng.int(5, 20);
    return { story: `${['Two', 'Three', 'Four', 'Five', 'Six'][k - 2]} friends split a bill of b dollars `
      + `and a $${tip} tip equally. What does each pay?`, right: `(b + ${tip})/${k}`,
    wrong: [`b/${k} + ${tip}`, `${k}(b + ${tip})`],
    why: `The tip is shared too, so the whole of b + ${tip} is divided by ${k}: (b + ${tip})/${k}.` };
  },
  (rng) => {
    const boxes = rng.int(3, 9);
    let loose = rng.int(2, 9);
    while (loose === boxes) loose = rng.int(2, 9);
    return { story: `Each box holds n pens. There are ${boxes} full boxes and ${loose} loose pens. `
      + 'How many pens altogether?', right: `${boxes}n + ${loose}`,
    wrong: [`${loose}n + ${boxes}`, `${boxes}(n + ${loose})`],
    why: `${boxes} boxes of n is ${boxes}n, and the ${loose} loose pens are added once: ${boxes}n + ${loose}.` };
  },
  (rng) => {
    const k = rng.int(2, 6), add = rng.int(2, 12);
    const times = ['twice', 'three times', 'four times', 'five times', 'six times'][k - 2];
    return { story: `Which expression is ${times} the sum of n and ${add}?`, right: `${k}(n + ${add})`,
    wrong: [`${k}n + ${add}`, `n + ${k * add}`],
    why: `The adding happens first and the whole sum is multiplied, so it needs a bracket: ${k}(n + ${add}).` };
  },
  (rng) => {
    const longer = rng.int(2, 9);
    return { story: `A rectangle is w cm wide and ${longer} cm longer than it is wide. What is its perimeter?`,
      right: `2w + 2(w + ${longer})`, wrong: [`w(w + ${longer})`, `2w + ${longer}`],
      why: `The length is w + ${longer}. A perimeter goes round all four sides, two of each: `
        + `2w + 2(w + ${longer}). w(w + ${longer}) is the area.` };
  },
];

function whichFits(rng) {
  const s = rng.pick(SITUATIONS)(rng);
  // Listed in a fixed order -- shortest first -- so the right one is not
  // always in the same place and nothing about its position is a clue.
  const options = [s.right, ...s.wrong]
    .sort((p, q) => p.length - q.length || (p < q ? -1 : 1))
    .map((e) => ({ id: e, label: e }));
  return {
    prompt: [T.prose(s.story)],
    text: `fits: ${s.story}`,
    answer: { type: 'choice', value: s.right, options },
    visual: null,
    explain: s.why,
  };
}

/**
 * Equivalent or not. Each pair is a real mistake set beside the rewrite it
 * imitates. "Not equal" is proved by one number; "equal" needs the rewrite,
 * since agreeing at a few numbers proves nothing.
 */
const PAIRS = [
  (a, b, v) => ({ left: `${a}(${v} + ${b})`, right: `${a}${v} + ${a * b}`, same: true,
    why: `Multiplying out the bracket gives ${a} × ${v} + ${a} × ${b} = ${a}${v} + ${a * b}. Always equal.` }),
  (a, b, v) => ({ left: `${a}(${v} + ${b})`, right: `${a}${v} + ${b}`, same: false, at: 1,
    why: (x) => `Try ${v} = ${x}: ${a}(${x} + ${b}) = ${a * (x + b)} but ${a} × ${x} + ${b} = ${a * x + b}. `
      + `The ${a} has to multiply the ${b} as well. Not always equal.` }),
  (a, b, v) => ({ left: `${a}${v} + ${b}${v}`, right: `${a + b}${v}`, same: true,
    why: `${a} lots of ${v} and ${b} more lots of ${v} are ${a + b} lots of ${v}. Always equal.` }),
  (a, b, v) => ({ left: `${a}${v} + ${b}${v}`, right: `${a + b}${v}^2`, same: false, at: 2,
    why: (x) => `Try ${v} = ${x}: ${a} × ${x} + ${b} × ${x} = ${(a + b) * x} but ${a + b} × ${x}² = `
      + `${(a + b) * x * x}. Adding like terms never changes the power. Not always equal.` }),
  (a, b, v) => ({ left: `${v} + ${v}`, right: `${v}^2`, same: false, at: 3,
    why: (x) => `Try ${v} = ${x}: ${x} + ${x} = ${2 * x} but ${x}² = ${x * x}. ${v} + ${v} is 2${v}. Not always equal.` }),
  (a, b, v) => ({ left: `${v}*${v}`, right: `${v}^2`, same: true,
    why: `${v}² means ${v} × ${v}, by definition. Always equal.` }),
  (a, b, v) => ({ left: `${a + b + 5} - (${v} + ${b})`, right: `${a + 5} - ${v}`, same: true,
    why: `Taking away a bracket takes away everything in it: ${a + b + 5} − ${v} − ${b} = ${a + 5} − ${v}. Always equal.` }),
  (a, b, v) => ({ left: `${a + b + 5} - (${v} + ${b})`, right: `${a + b + 5} - ${v} + ${b}`, same: false, at: 1,
    why: (x) => `Try ${v} = ${x}: ${a + b + 5} − (${x} + ${b}) = ${a + 5 - x} but ${a + b + 5} − ${x} + ${b} = `
      + `${a + 2 * b + 5 - x}. The minus in front of a bracket applies to all of it. Not always equal.` }),
  (a, b, v) => ({ left: `(${v} + ${b})^2`, right: `${v}^2 + ${b * b}`, same: false, at: 1,
    why: (x) => `Try ${v} = ${x}: (${x} + ${b})² = ${(x + b) ** 2} but ${x}² + ${b * b} = ${x * x + b * b}. `
      + `Squaring a sum is not squaring each part. Not always equal.` }),
  (a, b, v) => ({ left: `${a}${v} - ${a * b}`, right: `${a}(${v} - ${b})`, same: true,
    why: `${a} goes into both terms: ${a}${v} − ${a * b} = ${a}(${v} − ${b}). Always equal.` }),
];

function equivalent(rng) {
  const v = rng.pick(VARS);
  const a = rng.int(2, 7), b = rng.int(1, 9);
  const p = rng.pick(PAIRS)(a, b, v);
  const [l, r] = rng.chance(0.5) ? [p.left, p.right] : [p.right, p.left];
  const show = (e) => tm(e).replace(/\^2/g, '²').replace(/\*/g, ' × ');
  return {
    prompt: [T.prose('Are'), ...terms(l), T.prose('and'), ...terms(r), T.prose('equal for every value of ' + v + '?')],
    text: `same: ${l} and ${r}`,
    answer: {
      type: 'choice', value: p.same ? 'same' : 'different',
      options: [
        { id: 'same', label: 'Always equal', note: 'for every value of the letter' },
        { id: 'different', label: 'Not always equal', note: 'some value tells them apart' },
      ],
    },
    visual: null,
    explain: show(typeof p.why === 'function' ? p.why(p.at) : p.why),
  };
}

const CONTENT = [(r) => substitute(r, false), (r) => substitute(r, true), formula,
  wordsIntoSymbols, whichFits, equivalent];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  // The mixed level deals from every level. Each is asked in its own shape
  // -- "work out ... when", "write as an expression", a story with three
  // expressions, a pair to compare -- so the widget that comes with each
  // says nothing the question has not.
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
