/**
 * Catalogue authoring tool: builds the problem library for compound-ineq.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 *
 * Every `text` carries the inequalities in plain ASCII (<= for ≤), or the
 * set in interval notation, so scripts/check-answers.py can solve each one
 * for itself.
 */
import * as T from '../terms.js';
import { minus } from '../../web/ui/dom.js';
import { parseSet, formatSet } from '../../web/math/solutions.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/compound-ineq.js';

const LINE = { min: -10, max: 10 };
const SIGN = { '<': '<', '<=': '≤', '>': '>', '>=': '≥' };
const FLIP = { '<': '>', '<=': '>=', '>': '<', '>=': '<=' };
const pretty = (s) => s.replace(/<=/g, '≤').replace(/>=/g, '≥').replace(/-/g, '−');

/** A run with whole-number ends, as the renderer and the answer both want it. */
const run = (lo, loIn, hi, hiIn) => ({ lo, loIn, hi, hiIn });
const asFrac = (v) => (v === null ? null : { n: v, d: 1 });
const answerOf = (parts) => ({
  type: 'solutions',
  value: { letter: 'x', parts: parts.map((p) => ({ lo: asFrac(p.lo), loIn: p.loIn, hi: asFrac(p.hi), hiIn: p.hiIn })) },
});
/** The answer as written: −2 < x ≤ 5. */
const written = (parts) => formatSet(answerOf(parts).value);
/** A set back as whole-number runs, from what the shared parser makes of it. */
const runsOf = (value) => value.parts.map((p) => run(p.lo && p.lo.n / p.lo.d, p.loIn, p.hi && p.hi.n / p.hi.d, p.hiIn));

/** Interval notation in ASCII, for the checker: (-2, 5], (-inf, -1) U (3, inf). */
const ascii = (parts) => parts.map((p) => `${p.loIn ? '[' : '('}${p.lo ?? '-inf'}, ${p.hi ?? 'inf'}${p.hiIn ? ']' : ')'}`).join(' U ');
/** The same, set properly: (−2, 5], (−∞, −1) ∪ (3, ∞). */
const notation = (parts, { lo = '(', hi = ')' } = {}) => parts.map((p) => `${p.lo === null ? lo : p.loIn ? '[' : '('}`
  + `${p.lo === null ? '−∞' : minus(p.lo)}, ${p.hi === null ? '∞' : minus(p.hi)}${p.hi === null ? hi : p.hiIn ? ']' : ')'}`).join(' ∪ ');

const bothEnds = (rng) => {
  const lo = rng.int(-8, 5);
  return [lo, rng.int(lo + 2, Math.min(9, lo + 10))];
};

const lowWord = (inc) => (inc ? 'at least' : 'greater than');
const highWord = (inc) => (inc ? 'at most' : 'less than');

function between(rng) {
  const [lo, hi] = bothEnds(rng);
  const loIn = rng.chance(0.5), hiIn = rng.chance(0.5);
  const parts = [run(lo, loIn, hi, hiIn)];
  const ends = `${minus(lo)} is ${loIn ? 'in, so ≤' : 'out, so <'}; ${minus(hi)} is ${hiIn ? 'in, so ≤' : 'out, so <'}`;
  if (rng.chance(0.4)) {
    const words = `x is ${lowWord(loIn)} ${minus(lo)} and ${highWord(hiIn)} ${minus(hi)}`;
    return {
      prompt: [T.prose(`Write as one inequality: ${words}.`)],
      text: `words: ${words.replace(/−/g, '-')}`,
      answer: answerOf(parts),
      visual: null,
      explain: `Both at once, so x is between them, smaller number on the left: ${ends}. `
        + `That is ${written(parts)}.`,
    };
  }
  return {
    prompt: [T.prose('Write the inequality the number line shows.')],
    text: `graph set: ${ascii(parts)}`,
    answer: answerOf(parts),
    visual: { kind: 'intervals', ...LINE, rows: [{ parts }], answer: [{ parts, label: written(parts) }], answerRows: 1 },
    explain: `The shading runs between ${minus(lo)} and ${minus(hi)}, so x is between them: `
      + `${ends}. A filled dot is in, a hollow one is out. That is ${written(parts)}.`,
  };
}

function eitherSide(rng) {
  const [lo, hi] = bothEnds(rng);
  const loIn = rng.chance(0.5), hiIn = rng.chance(0.5);
  const parts = [run(null, false, lo, loIn), run(hi, hiIn, null, false)];
  if (rng.chance(0.4)) {
    const words = `x is ${highWord(loIn)} ${minus(lo)} or ${lowWord(hiIn)} ${minus(hi)}`;
    return {
      prompt: [T.prose(`Write as an inequality: ${words}.`)],
      text: `words: ${words.replace(/−/g, '-')}`,
      answer: answerOf(parts),
      visual: null,
      explain: `Either one will do, so it stays two pieces with "or" between: ${written(parts)}. `
        + 'No single number can be both, so it cannot be squeezed into one chain.',
    };
  }
  return {
    prompt: [T.prose('Write the inequality the number line shows.')],
    text: `graph set: ${ascii(parts)}`,
    answer: answerOf(parts),
    visual: { kind: 'intervals', ...LINE, rows: [{ parts }], answer: [{ parts, label: written(parts) }], answerRows: 1 },
    explain: `Two rays pointing apart: below ${minus(lo)}, or above ${minus(hi)}. A number on either one works, `
      + `so it is an "or": ${written(parts)}. ${loIn ? `${minus(lo)} is filled, so ≤` : `${minus(lo)} is hollow, so <`}; `
      + `${hiIn ? `${minus(hi)} is filled, so ≥` : `${minus(hi)} is hollow, so >`}.`,
  };
}

/** m·x + b written plainly: 2x + 1, x − 4, 3x. */
const linear = (m, b) => `${m === 1 ? '' : m === -1 ? '-' : m}x${b === 0 ? '' : ` ${b < 0 ? '-' : '+'} ${Math.abs(b)}`}`;
/** b − m·x, the middle that needs the flip: 3 - 2x. */
const falling = (m, b) => `${b} - ${m === 1 ? '' : m}x`;

const strictOf = (inc) => (inc ? '<=' : '<');

function solveDouble(rng) {
  const [lo, hi] = bothEnds(rng);
  const loIn = rng.chance(0.5), hiIn = rng.chance(0.5);
  const parts = [run(lo, loIn, hi, hiIn)];
  let chain, steps;
  const fraction = rng.chance(0.25);
  if (fraction) {
    // A fraction in the middle: multiply all three parts first.
    const k = rng.pick([2, 3, 4]), c = rng.nonZero(-6, 6);
    // (x + c)/k between (lo + c)/k and (hi + c)/k: pick ends that divide.
    const L = lo + c, H = hi + c;
    if (L % k || H % k) return solveDouble(rng);
    chain = `${L / k} ${strictOf(loIn)} (x ${c < 0 ? '-' : '+'} ${Math.abs(c)})/${k} ${strictOf(hiIn)} ${H / k}`;
    steps = `Multiply all three parts by ${k}: ${minus(L)} ${SIGN[strictOf(loIn)]} x ${c < 0 ? '−' : '+'} ${Math.abs(c)} `
      + `${SIGN[strictOf(hiIn)]} ${minus(H)}. Then ${c < 0 ? 'add' : 'take'} ${Math.abs(c)} ${c < 0 ? 'to' : 'from'} all three.`;
  } else {
    const m = rng.int(1, 5), b = rng.nonZero(-9, 9);
    const L = m * lo + b, H = m * hi + b;
    chain = `${L} ${strictOf(loIn)} ${linear(m, b)} ${strictOf(hiIn)} ${H}`;
    // With x alone after one step, the chain it leaves is the answer, said once.
    steps = m === 1
      ? `${b > 0 ? 'Take' : 'Add'} ${Math.abs(b)} ${b > 0 ? 'from' : 'to'} all three parts, and x is left on its own:`
      : `${b > 0 ? 'Take' : 'Add'} ${Math.abs(b)} ${b > 0 ? 'from' : 'to'} all three parts: `
        + `${minus(L - b)} ${SIGN[strictOf(loIn)]} ${m}x ${SIGN[strictOf(hiIn)]} ${minus(H - b)}. `
        + `Divide all three by ${m}. The middle is x on its own:`;
  }
  if (fraction) steps += ' The middle is x on its own:';
  return {
    prompt: [T.prose(`Solve ${pretty(chain)}.`)],
    text: `solve: ${chain}`,
    answer: answerOf(parts),
    visual: null,
    explain: `${steps} ${written(parts)}.`,
  };
}

/** One half of an "or": an inequality whose solution is x op v. Half need the flip. */
function half(rng, op, v) {
  const m = rng.nonZero(-4, 5), b = rng.int(-8, 8);
  // x ≥ 1 is already solved, and "x ≥ 1 gives x ≥ 1" is no step at all.
  if (m === 1 && b === 0) return half(rng, op, v);
  const shown = m < 0 ? FLIP[op] : op;
  const src = `${linear(m, b)} ${shown} ${m * v + b}`;
  const how = `${pretty(src)} gives x ${SIGN[op]} ${minus(v)}`
    + (m < 0 ? `, the sign turning as you divide by ${minus(m)}` : '');
  return { src, how };
}

function solveOr(rng) {
  const [lo, hi] = bothEnds(rng);
  const loIn = rng.chance(0.5), hiIn = rng.chance(0.5);
  const parts = [run(null, false, lo, loIn), run(hi, hiIn, null, false)];
  const a = half(rng, loIn ? '<=' : '<', lo), b = half(rng, hiIn ? '>=' : '>', hi);
  const [first, second] = rng.chance(0.5) ? [a, b] : [b, a];
  return {
    prompt: [T.prose(`Solve ${pretty(first.src)} or ${pretty(second.src)}.`)],
    text: `solve: ${first.src} or ${second.src}`,
    answer: answerOf(parts),
    visual: null,
    explain: `Each half alone: ${first.how}; ${second.how}. Keep the "or": ${written(parts)}.`,
  };
}

function negativeMiddle(rng) {
  const [lo, hi] = bothEnds(rng);
  const loIn = rng.chance(0.5), hiIn = rng.chance(0.5);
  const parts = [run(lo, loIn, hi, hiIn)];
  const m = rng.int(1, 5), b = rng.nonZero(-9, 9);
  const f = (x) => b - m * x;
  // b − m·x falls as x grows, so the high end of x makes the low end of the chain.
  const chain = `${f(hi)} ${strictOf(hiIn)} ${falling(m, b)} ${strictOf(loIn)} ${f(lo)}`;
  const after = `${minus(f(hi) - b)} ${SIGN[strictOf(hiIn)]} ${m === 1 ? '−' : `−${m}`}x ${SIGN[strictOf(loIn)]} ${minus(f(lo) - b)}`;
  return {
    prompt: [T.prose(`Solve ${pretty(chain)}.`)],
    text: `solve: ${chain}`,
    answer: answerOf(parts),
    visual: null,
    explain: `${b > 0 ? 'Take' : 'Add'} ${Math.abs(b)} ${b > 0 ? 'from' : 'to'} all three: ${after}. `
      + `Divide all three by ${m === 1 ? '−1' : `−${m}`}, and both signs turn: `
      + `${minus(hi)} ${hiIn ? '≥' : '>'} x ${loIn ? '≥' : '>'} ${minus(lo)}. `
      + `In order, smallest first: ${written(parts)}.`,
  };
}

/**
 * Two simple conditions and the set they make together, asked so that the
 * answer is never the question copied back: every pair overlaps, nests or
 * misses, so combining them leaves something simpler -- one chain, one
 * ray, no solution or all real numbers. Two rays pointing apart joined by
 * "or" are left out, because their simplest form is the question itself.
 *
 * requiem: play/answers/set-simplest-form-refused-copy
 * The answer box judges the set, so it would accept the two conditions
 * retyped; requireSimplest has it refuse them, with a hint, instead.
 */
function andOr(rng) {
  const kind = rng.pick(['and-chain', 'and-none', 'and-ray', 'or-ray', 'or-all']);
  const join = kind.startsWith('and') ? 'and' : 'or';
  const up = () => rng.pick(['>', '>=']), down = () => rng.pick(['<', '<=']);
  let a = rng.int(-7, 7), b = rng.int(-7, 7);
  let opA, opB;
  if (kind === 'and-ray' || kind === 'or-ray') {
    // Pointing the same way; now and then from the same number, where only
    // the strictness differs: x ≤ 3 or x < 3 is x ≤ 3.
    const dir = rng.chance(0.5) ? up : down;
    opA = dir(); opB = dir();
    if (rng.chance(0.15)) { b = a; if (opA === opB) opB = opA.length === 1 ? `${opA}=` : opA[0]; }
    else if (a === b) b += rng.pick([2, 3, -2, -3]);
  } else {
    // Pointing towards each other: a lower bound (x > lo) and an upper one
    // (x < hi). "and" keeps the stretch between, or nothing if they miss;
    // "or" with the rays overlapping covers the whole line.
    let lo = Math.min(a, b), hi = Math.max(a, b);
    if (lo === hi) hi += rng.int(1, 4);
    if (kind === 'and-none') [lo, hi] = [hi, lo];
    const low = [up(), lo], high = [down(), hi];
    [[opA, a], [opB, b]] = rng.chance(0.5) ? [low, high] : [high, low];
  }
  const p = `x ${opA} ${a}`, q = `x ${opB} ${b}`;
  const both = parseSet(`${p} ${join} ${q}`).value;
  const parts = runsOf(both);
  // The generator's own guard on what it promised: never two rays apart.
  if (parts.length === 2) return andOr(rng);
  const [one, two] = [parseSet(p).value, parseSet(q).value].map(runsOf);
  const result = written(parts);
  const why = join === 'and'
    ? (parts.length === 0 ? 'The two rays do not overlap anywhere, so no number passes both: no solution.'
      : `Keep only where both are shaded: ${result}.`)
    : (parts.length === 1 && parts[0].lo === null && parts[0].hi === null
      ? 'Between them the two rays cover the whole line, so every number passes one or the other: all real numbers.'
      : `Keep everything shaded on either line: ${result}.`);
  return {
    prompt: [T.prose(`What is ${pretty(p)} ${join} ${pretty(q)} in its simplest form?`)],
    text: `combine: ${p} ${join} ${q}`,
    answer: { type: 'solutions', value: both, requireSimplest: true },
    visual: { kind: 'intervals', ...LINE,
      rows: [{ parts: one, label: pretty(p) }, { parts: two, label: pretty(q) }],
      answer: [{ parts, label: result }], answerRows: 1 },
    explain: `"${join}" ${join === 'and' ? 'keeps the numbers that pass both' : 'keeps the numbers that pass either'}. ${why}`,
  };
}

/** A set, and the bracket slips students make writing it. */
function intervalNotation(rng) {
  const shape = rng.pick(['between', 'between', 'ray', 'or']);
  const [lo, hi] = bothEnds(rng);
  const loIn = rng.chance(0.5), hiIn = rng.chance(0.5);
  const parts = shape === 'between' ? [run(lo, loIn, hi, hiIn)]
    : shape === 'or' ? [run(null, false, lo, loIn), run(hi, hiIn, null, false)]
      : rng.chance(0.5) ? [run(lo, loIn, null, false)] : [run(null, false, hi, hiIn)];
  const toggle = (i, end) => parts.map((p, j) => (j === i ? { ...p, [end]: !p[end] } : p));
  const finite = parts.flatMap((p, i) => [p.lo !== null ? [i, 'loIn'] : null, p.hi !== null ? [i, 'hiIn'] : null]).filter(Boolean);
  const wrong = [
    notation(toggle(...finite[0])),
    // Infinity "included" is the slip worth naming; a double one, if there is no infinity.
    parts.some((p) => p.lo === null || p.hi === null)
      ? notation(parts, { lo: '[', hi: ']' })
      : notation(toggle(...finite[1]).map((p, i) => (i === finite[0][0] ? { ...p, [finite[0][1]]: !p[finite[0][1]] } : p))),
    notation(finite.length > 1 ? toggle(...finite[1]) : parts.map((p) => ({ lo: p.hi, loIn: p.hiIn, hi: p.lo, hiIn: p.loIn }))),
  ];
  const right = notation(parts);
  const labels = [...new Set([right, ...wrong])];
  if (labels.length < 3) return intervalNotation(rng);
  const back = rng.chance(0.4);
  if (back) {
    // The other way: interval notation given, the inequality asked for.
    const ineqs = [written(parts), ...wrong.map((w) => {
      const r = parseSet(w.replace(/−∞/g, '-inf').replace(/∞/g, 'inf').replace(/∪/g, 'U').replace(/−/g, '-'));
      return r.ok ? formatSet(r.value) : null;
    }).filter(Boolean)];
    const opts = [...new Set(ineqs)];
    if (opts.length < 3) return intervalNotation(rng);
    return {
      prompt: [T.prose(`Which inequality is ${right}?`)],
      text: `inequality for: ${ascii(parts)}`,
      answer: { type: 'choice', value: written(parts), options: rng.shuffle(opts.slice(0, 4)).map((label) => ({ id: label, label })) },
      visual: null,
      explain: `A square bracket keeps its end in (≤ or ≥); a round one leaves it out (< or >). So ${right} is ${written(parts)}.`,
    };
  }
  return {
    prompt: [T.prose(`Which is ${written(parts)} in interval notation?`)],
    text: `interval for: ${ascii(parts)}`,
    answer: { type: 'choice', value: right, options: rng.shuffle(labels.slice(0, 4)).map((label) => ({ id: label, label })) },
    visual: null,
    explain: `≤ and ≥ keep the end in: a square bracket. < and > leave it out: a round one. `
      + `${parts.some((p) => p.lo === null || p.hi === null) ? 'An end at ∞ is never a number you reach, so it always takes a round bracket. ' : ''}`
      + `So ${written(parts)} is ${right}.`,
  };
}

const CONTENT = [between, eitherSide, solveDouble, solveOr, negativeMiddle, andOr, intervalNotation];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  // The mixed level deals from every level. Interval Notation is a choice,
  // and its question says so -- "which is this in interval notation?" --
  // so the buttons tell a student nothing the words had not.
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
