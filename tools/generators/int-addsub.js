/**
 * Catalogue authoring tool: builds the problem library for int-addsub.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding -- when a
 * systematic fault affects too many rows to correct by hand, or when a level
 * is redesigned. Individual bad problems are fixed in the library directly.
 *
 * Run via: node scripts/build-library.mjs
 */
import { niceBounds } from '../../web/ui/numberline.js';
import { signed, minus } from '../../web/ui/dom.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/int-addsub.js';
import * as T from '../terms.js';
/** @param {number} level @returns {{a:number, op:string, b:number}} */
function draw(rng, level) {
  switch (level) {
    case 0:
      return { a: rng.int(-9, 9), op: rng.pick(['+', '-']), b: rng.int(1, 9) };
    case 1:
      return { a: rng.int(-10, 10), op: '+', b: -rng.int(1, 12) };
    case 2:
      return { a: rng.int(-12, 12), op: '-', b: rng.chance(0.75) ? -rng.int(1, 12) : rng.int(1, 12) };
    case 3:
      return { a: rng.nonZero(-25, 25), op: rng.pick(['+', '-']), b: rng.nonZero(-25, 25) };
    default:
      return { a: rng.nonZero(-20, 20), op: rng.pick(['+', '-']), b: rng.nonZero(-15, 15) };
  }
}
const apply = (a, op, b) => (op === '+' ? a + b : a - b);
/** Human-readable reason, shown on demand in Practice. */
function explain(a, op, b, answer) {
  const A = minus(a), B = Math.abs(b);
  if (op === '-' && b < 0) {
    return `Subtracting a negative is the same as adding. ${A} − (−${B}) becomes ${A} + ${B}, which is ${minus(answer)}.`;
  }
  if (op === '+' && b < 0) {
    return `Adding a negative moves you left. ${A} + (−${B}) becomes ${A} − ${B}, which is ${minus(answer)}.`;
  }
  if (op === '-') {
    return `Start at ${A} and move ${B} to the left. You land on ${minus(answer)}.`;
  }
  return `Start at ${A} and move ${B} to the right. You land on ${minus(answer)}.`;
}
/** Two terms: 4 + (−7) = ? */
function twoTerm(rng, level) {
  let a, op, b, answer;
  // Reject degenerate problems (b = 0, or an answer that gives nothing away).
  for (let i = 0; i < 40; i++) {
    ({ a, op, b } = draw(rng, level));
    answer = apply(a, op, b);
    if (b !== 0 && !(a === 0 && level > 0)) break;
  }
  const delta = op === '+' ? b : -b;
  const bounds = niceBounds([a, answer, 0]);
  return {
    prompt: T.asks(T.num(minus(a), 1), T.op(op === '+' ? '+' : '−'), T.num(signed(b), 2)),
    text: `${minus(a)} ${op === '+' ? '+' : '−'} ${signed(b)}`,
    answer: { type: 'int', value: answer },
    visual: {
      kind: 'numberline',
      ...bounds,
      answer,
      steps: [
        { from: 0, to: a, label: a === 0 ? '' : `${a > 0 ? '+' : '−'}${Math.abs(a)}` },
        { from: a, to: answer, label: `${delta > 0 ? '+' : '−'}${Math.abs(delta)}` },
      ],
    },
    explain: explain(a, op, b, answer),
  };
}
/** Three terms: −6 + (−3) − (−8) = ? */
function threeTerm(rng) {
  const a = rng.nonZero(-15, 15);
  const op1 = rng.pick(['+', '-']);
  const b = rng.nonZero(-12, 12);
  const op2 = rng.pick(['+', '-']);
  const c = rng.nonZero(-12, 12);
  const mid = apply(a, op1, b);
  const answer = apply(mid, op2, c);
  const d1 = op1 === '+' ? b : -b;
  const d2 = op2 === '+' ? c : -c;
  return {
    prompt: T.asks(
      T.num(minus(a), 1),
      T.op(op1 === '+' ? '+' : '−'), T.num(signed(b), 2),
      T.op(op2 === '+' ? '+' : '−'), T.num(signed(c), 3)),
    text: `${minus(a)} ${op1 === '+' ? '+' : '−'} ${signed(b)} ${op2 === '+' ? '+' : '−'} ${signed(c)}`,
    answer: { type: 'int', value: answer },
    visual: {
      kind: 'numberline',
      ...niceBounds([a, mid, answer, 0]),
      answer,
      steps: [
        { from: 0, to: a, label: `${a > 0 ? '+' : '−'}${Math.abs(a)}` },
        { from: a, to: mid, label: `${d1 > 0 ? '+' : '−'}${Math.abs(d1)}` },
        { from: mid, to: answer, label: `${d2 > 0 ? '+' : '−'}${Math.abs(d2)}` },
      ],
    },
    explain: `Work left to right. ${minus(a)} ${op1 === '+' ? '+' : '−'} ${signed(b)} = ${minus(mid)}, `
      + `then ${minus(mid)} ${op2 === '+' ? '+' : '−'} ${signed(c)} = ${minus(answer)}.`,
  };
}
/**
 * Situations a negative number is actually about.
 *
 * Two shapes, because they are two different questions and only one of them
 * is easy. "It was −6 and rose 9, what is it now?" is an addition with a
 * story on it. "It was −6 and is now 3, how much did it rise?" is a
 * subtraction across zero, which is where 3 − (−6) comes from and the only
 * place in this skill where a student can see *why* subtracting a negative
 * adds: the gap from −6 up to 3 is plainly nine, whatever the rule says.
 *
 * Each context carries its own units and its own words for up and down. A
 * thermometer rises and falls, a lift goes up and down, a balance is paid
 * into and taken out of -- and using the wrong verb for the wrong object is
 * what makes a word problem read as a translation exercise.
 */
const SITUATIONS = [
  { noun: 'The temperature', at: (v) => `${minus(v)}°C`, now: 'What is it now?',
    change: (n, up) => `${up ? 'rises' : 'falls'} ${n} degrees`,
    moved: (up) => (up ? 'risen' : 'fallen') },
  { noun: 'The lift', at: (v) => `floor ${minus(v)}`, now: 'Which floor is it on now?',
    change: (n, up) => `goes ${up ? 'up' : 'down'} ${n} floors`,
    moved: (up) => (up ? 'gone up' : 'gone down') },
  { noun: 'The account', at: (v) => `£${minus(v)}`, now: 'What is the balance now?',
    change: (n, up) => (up ? `has £${n} paid in` : `has £${n} taken out`),
    moved: (up) => (up ? 'gone up' : 'gone down') },
  { noun: 'The diver', at: (v) => `${minus(v)} m`, now: 'What depth are they at now?',
    change: (n, up) => `${up ? 'rises' : 'descends'} ${n} m`,
    moved: (up) => (up ? 'risen' : 'descended') },
];

function situations(rng) {
  const s = rng.pick(SITUATIONS);
  const start = rng.nonZero(-15, 12);
  const delta = rng.nonZero(-14, 14);
  const end = start + delta;
  if (end === start || Math.abs(end) > 25) return situations(rng);
  // At least one end of the move has to be below zero. A level about what a
  // negative number means, a third of whose rows never show one, is a level
  // about addition with a story on it.
  if (start > 0 && end > 0) return situations(rng);
  const askEnd = rng.chance(0.6);
  const sentence = askEnd
    ? `${s.noun} is at ${s.at(start)}, then ${s.change(Math.abs(delta), delta > 0)}. ${s.now}`
    : `${s.noun} was at ${s.at(start)} and is now at ${s.at(end)}. `
      + `How far has it ${s.moved(delta > 0)}?`;
  const answer = askEnd ? end : Math.abs(delta);
  const line = askEnd
    ? [{ from: 0, to: start, label: minus(start) },
       { from: start, to: end, label: `${delta > 0 ? '+' : '−'}${Math.abs(delta)}` }]
    : [{ from: 0, to: start, label: minus(start) },
       { from: start, to: end, label: '?' }];

  return {
    prompt: [T.prose(sentence)],
    text: askEnd
      ? `${s.noun} ${minus(start)} then ${delta > 0 ? '+' : '−'}${Math.abs(delta)}`
      : `${s.noun} ${minus(start)} to ${minus(end)}, how far`,
    answer: { type: 'int', value: answer },
    visual: {
      kind: 'numberline',
      ...niceBounds([start, end, 0]),
      answer: end,
      steps: line,
    },
    explain: askEnd
      ? `Start at ${minus(start)} and move ${delta > 0 ? 'up' : 'down'} `
        + `${Math.abs(delta)}: ${minus(start)} ${delta > 0 ? '+' : '−'} ${Math.abs(delta)} `
        + `= ${minus(end)}.`
      : `From ${minus(start)} to ${minus(end)} is ${minus(end)} − ${signed(start)} = `
        + `${Math.abs(delta)}. Counting the gap on the line gives the same `
        + `${Math.abs(delta)}, which is why subtracting a negative adds.`,
  };
}

/**
 * Absolute value, three ways: of one number, of a difference, and as the
 * distance between two points on the line.
 *
 * The order trap is built in rather than left to chance. −12 is less than
 * −3, but it is further from zero, and a student who reads |−12| as "small
 * because negative" has confused size with position -- so one number in
 * every pair is negative, and the explanation says which is further out.
 */
function absoluteValue(rng) {
  const shape = rng.pick(['one', 'one', 'difference', 'apart', 'apart']);
  if (shape === 'one') {
    const a = rng.int(1, 30) * (rng.chance(0.7) ? -1 : 1);
    const v = Math.abs(a);
    return {
      prompt: T.asks(T.num(`|${minus(a)}|`, 1)),
      text: `|${minus(a)}|`,
      answer: { type: 'int', value: v },
      visual: {
        kind: 'numberline', ...niceBounds([a, 0]), answer: a,
        steps: [{ from: 0, to: a, label: '?' }],
      },
      explain: a < 0
        ? `${minus(a)} is ${v} steps to the left of zero. Absolute value counts the steps and `
          + `ignores the direction, so |${minus(a)}| = ${v}.`
        : `${a} is ${v} steps to the right of zero, so |${a}| = ${v}.`,
    };
  }
  let a = rng.nonZero(-15, 15), b = rng.nonZero(-15, 15);
  while (a === b || (a > 0 && b > 0)) { a = rng.nonZero(-15, 15); b = rng.nonZero(-15, 15); }
  const v = Math.abs(a - b);
  if (shape === 'difference') {
    return {
      prompt: T.asks(T.num('|', 1), T.num(minus(a), 1), T.op('−'), T.num(signed(b), 2), T.num('|', 1)),
      text: `|${minus(a)} − ${signed(b)}|`,
      answer: { type: 'int', value: v },
      visual: {
        kind: 'numberline', ...niceBounds([a, b, 0]), answer: a,
        steps: [{ from: b, to: a, label: '?' }],
      },
      explain: `Work inside the bars first: ${minus(a)} − ${signed(b)} = ${minus(a - b)}. `
        + `Then take the distance from zero, so |${minus(a - b)}| = ${v}.`,
    };
  }
  return {
    prompt: [T.prose(`How far apart are ${minus(a)} and ${minus(b)} on the number line?`)],
    text: `distance from ${minus(a)} to ${minus(b)}`,
    answer: { type: 'int', value: v },
    visual: {
      kind: 'numberline', ...niceBounds([a, b, 0]), answer: b,
      steps: [{ from: a, to: b, label: '?' }],
    },
    explain: `The distance between two numbers is the absolute value of their difference: `
      + `|${minus(b)} − ${signed(a)}| = |${minus(b - a)}| = ${v}.`
      + (a * b < 0 ? ` Across zero that is ${Math.abs(a)} on one side and ${Math.abs(b)} on the other, `
        + `${Math.abs(a)} + ${Math.abs(b)} = ${v}.` : ` Counting along the line gives the same ${v}.`),
  };
}

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */

  /** @param {import('../engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  // Level 4 is Above and Below Zero, 5 Absolute Value, 6 Chains.
  const build = (lv) => (lv === 4 ? situations(rng)
    : lv === 5 ? absoluteValue(rng)
    : lv === 6 ? threeTerm(rng)
    : twoTerm(rng, lv));
  if (level >= LAST_LEVEL) {
    // Mixed review: pick any earlier level at random, so they can't settle
    // into one shape and coast.
    const problem = build(rng.int(0, LAST_LEVEL - 1));
    problem.parSeconds = PAR_SECONDS[LAST_LEVEL];
    return problem;
  }
  const problem = build(level);
  problem.parSeconds = PAR_SECONDS[level];
  return problem;
}
