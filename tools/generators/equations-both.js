/**
 * Catalogue authoring tool: builds the problem library for equations-both.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. Run via: node scripts/build-library.mjs
 *
 * Every problem is built outwards from its solution rather than inwards from
 * its equation. Solving Equations had a level that did the reverse and 496
 * problems claimed the wrong answer -- the equation and the solution were
 * chosen independently and quietly disagreed.
 */
import * as T from '../terms.js';
import { previewOf } from '../../web/ui/express.js';
import { reduce } from '../../web/math/frac.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/equations-both.js';

const VARS = ['x', 'y', 'n', 'a', 't'];

/** Each side parsed on its own: the parser reads expressions, not relations. */
function ask(src, v) {
  const [lhs, rhs] = src.split(' = ');
  const L = previewOf(lhs);
  const R = previewOf(rhs);
  if (!L.ok) throw new Error(`equations-both: cannot draw "${lhs}" — ${L.error}`);
  if (!R.ok) throw new Error(`equations-both: cannot draw "${rhs}" — ${R.error}`);
  return [...L.terms, T.op('='), ...R.terms, T.op(','), T.letter(v), T.op('='), T.blank()];
}

const term = (k, v) => (k === 1 ? v : k === -1 ? `-${v}` : `${k}${v}`);
const tail = (c) => (c === 0 ? '' : c > 0 ? ` + ${c}` : ` - ${-c}`);

/**
 * ax = bx + c, with a > b so the gathering leaves a positive coefficient.
 *
 * The solution may land either side of zero. By this skill a student has met
 * Answers Below Zero, and the point of having met it is that a negative
 * stops needing its own level and starts turning up wherever the numbers
 * happen to send it -- which is where it turns up in real work.
 */
function bothSides(rng) {
  const v = rng.pick(VARS);
  const x = rng.int(2, 12) * rng.pick([1, 1, -1]);
  const b = rng.int(1, 6);
  const a = b + rng.int(1, 6);
  const c = (a - b) * x;
  const src = `${term(a, v)} = ${term(b, v)}${tail(c)}`;
  return {
    prompt: ask(src, v), text: src,
    answer: { type: 'int', value: x },
    visual: {
      kind: 'evalmodel',
      lines: [src, `${term(a, v)} - ${term(b, v)} = ${c}`, `${term(a - b, v)} = ${c}`, `${v} = ${x}`],
      rules: [`take ${term(b, v)} off both sides`, 'gather the letters', `divide both sides by ${a - b}`],
      hint: 'The letter is on both sides. What has to happen first?',
    },
    explain: `${v} is on both sides. Taking ${term(b, v)} off both leaves `
      + `${term(a - b, v)} = ${c}, so ${v} = ${x}.`,
  };
}

/** ax + p = bx + q. */
function gatherThenUndo(rng) {
  const v = rng.pick(VARS);
  const x = rng.int(2, 12) * rng.pick([1, 1, -1]);
  const b = rng.int(1, 6);
  const a = b + rng.int(1, 6);
  const p = rng.int(1, 15);
  const q = (a - b) * x + p;
  const src = `${term(a, v)}${tail(p)} = ${term(b, v)}${tail(q)}`;
  return {
    prompt: ask(src, v), text: src,
    answer: { type: 'int', value: x },
    visual: {
      kind: 'evalmodel',
      lines: [src, `${term(a - b, v)}${tail(p)} = ${q}`, `${term(a - b, v)} = ${q - p}`, `${v} = ${x}`],
      rules: [`take ${term(b, v)} off both sides`, `take ${p} off both sides`,
              `divide both sides by ${a - b}`],
      hint: 'Two kinds of thing on both sides. Gather each in turn.',
    },
    explain: `Gather the letters: ${term(a, v)} − ${term(b, v)} = ${term(a - b, v)}. `
      + `Gather the numbers: ${q} − ${p} = ${q - p}. `
      + (a - b === 1 ? `That leaves ${v} = ${x}.` : `Then divide by ${a - b}: ${v} = ${x}.`),
  };
}

/**
 * k(x + b) = mx + q: a bracket on one side and the letter on the other too.
 *
 * Dividing by k first, the way Solving Equations taught, now runs into the
 * letter on the right: m/k of it, usually a fraction. Opening the bracket
 * turns it into Gather Then Undo, which is the point -- a bracket in a
 * both-sides equation is opened first, and the earlier levels finish it.
 */
function brackets(rng) {
  const v = rng.pick(VARS);
  const x = rng.int(1, 12) * rng.pick([1, 1, -1]);
  const k = rng.int(2, 8);
  const b = rng.int(1, 12);
  const m = rng.int(1, k - 1);                   // fewer on the right, so gathering stays positive
  const q = k * (x + b) - m * x;
  if (q === 0) return brackets(rng);
  const src = `${k}(${v} + ${b}) = ${term(m, v)}${tail(q)}`;
  const opened = `${term(k, v)} + ${k * b} = ${term(m, v)}${tail(q)}`;
  return {
    prompt: ask(src, v), text: src,
    answer: { type: 'int', value: x },
    visual: {
      kind: 'evalmodel',
      lines: [src, opened, `${term(k - m, v)} + ${k * b} = ${q}`, `${term(k - m, v)} = ${q - k * b}`, `${v} = ${x}`],
      rules: ['open the bracket', `take ${term(m, v)} off both sides`, `take ${k * b} off both sides`,
              `divide both sides by ${k - m}`],
      hint: 'The bracket is in the way of gathering. Open it first.',
    },
    explain: `Open the bracket first: ${opened}. Now it is gather then undo: taking `
      + `${term(m, v)} off both sides leaves ${term(k - m, v)} + ${k * b} = ${q}, taking ${k * b} off `
      + `leaves ${term(k - m, v)} = ${q - k * b}`
      + `${k - m === 1 ? '' : `, and dividing by ${k - m} gives ${v} = ${x}`}. `
      + `Dividing by ${k} first would leave ${m === k ? v : `${m}/${k} of ${v}`} on the right.`,
  };
}

/**
 * ax + p = bx + q where the answer is a fraction, and that is fine -- either
 * sign. Unknowns on both sides like every other level here, so a fraction
 * turns up at the end of real both-sides work rather than in a one-step
 * division.
 */
function notWhole(rng) {
  const v = rng.pick(VARS);
  const b = rng.int(1, 6);
  const d = rng.int(2, 7);                       // what the letters gather to
  const a = b + d;
  let top = rng.int(1, 30);
  if (top % d === 0) top += 1;                   // insist it does not come out whole
  if (rng.chance(0.3)) top = -top;
  const p = rng.int(1, 15);
  const q = p + top;
  const value = reduce({ n: top, d });
  const src = `${term(a, v)}${tail(p)} = ${term(b, v)}${tail(q)}`;
  const shown = `${value.n}/${value.d}`;
  return {
    prompt: ask(src, v), text: src,
    answer: { type: 'frac', value, requireSimplest: true },
    visual: {
      kind: 'evalmodel',
      lines: [src, `${term(d, v)}${tail(p)} = ${q}`, `${term(d, v)} = ${top}`,
              value.d === d ? `${v} = ${top}/${d}` : `${v} = ${top}/${d} = ${shown}`],
      rules: [`take ${term(b, v)} off both sides`, `take ${p} off both sides`,
              `divide both sides by ${d}, in lowest terms`],
      hint: 'It will not divide evenly at the end. That is allowed.',
    },
    explain: `Gather the letters: ${term(a, v)} − ${term(b, v)} = ${term(d, v)}. Gather the numbers: `
      + `${q} − ${p} = ${top}. So ${term(d, v)} = ${top}, and ${top} ÷ ${d} does not come out whole — `
      + `it does not need to: ${v} = ${shown} exactly. A fraction is an answer, not a mistake`
      + `${top < 0 ? ', and neither is a minus sign in front of one' : ''}.`,
  };
}

/**
 * The strategic layer: which side to gather the letters on.
 *
 * Collecting on the side that already has more of them leaves a positive
 * coefficient. Collecting on the other leaves a negative one, which is not
 * wrong but is where sign mistakes come from -- so the choice is a kindness a
 * student can do for themselves.
 */
function whichSide(rng) {
  const v = rng.pick(VARS);
  const b = rng.int(1, 6);
  const a = b + rng.int(1, 6);
  const bigLeft = rng.chance(0.5);
  const lhs = bigLeft ? term(a, v) : term(b, v);
  const rhs = bigLeft ? term(b, v) : term(a, v);
  const src = `${lhs} + ${rng.int(1, 9)} = ${rhs} + ${rng.int(1, 9)}`;
  return {
    prompt: [T.prose(`Solving ${src} — which side should the letters go?`)],
    text: `which side for ${src}`,
    answer: {
      type: 'choice',
      value: bigLeft ? 'left' : 'right',
      // The notes describe the two moves and nothing about this problem.
      // They used to say which side "leaves a positive number of xs", which
      // is the answer stated as fact on one of the two buttons: a student
      // could pick the level clean without ever looking at the equation.
      options: rng.shuffle([
        { id: 'left', label: 'Gather them on the left',
          note: `take the right-hand ${v}s across` },
        { id: 'right', label: 'Gather them on the right',
          note: `take the left-hand ${v}s across` },
      ]),
    },
    visual: null,
    explain: `There are more of ${v} on the ${bigLeft ? 'left' : 'right'}, so gathering `
      + `them there leaves ${term(a - b, v)} — a positive number of them. Gathering on `
      + `the other side gives ${term(b - a, v)}, which is not wrong but is where sign `
      + `mistakes come from.`,
  };
}

/**
 * One answer, none, or every number.
 *
 * Each equation is built to look like the other two: a bracket on one side
 * and a matching-looking expression on the other, differing only where it
 * decides the outcome. When the letters cancel, what is left is a statement
 * about numbers alone, and whether it is true is the whole answer.
 */
const KINDS = [
  { id: 'one', label: 'Exactly one number works', note: 'a single value balances it' },
  { id: 'none', label: 'No number works', note: 'no value balances it' },
  { id: 'every', label: 'Every number works', note: 'any value balances it' },
];

const trueMinus = (s) => s.replace(/-/g, '−');

function noneOrEvery(rng) {
  const v = rng.pick(VARS);
  const kind = rng.pick(['one', 'none', 'none', 'every', 'every']);
  const a = rng.int(2, 6);
  const b = rng.nonZero(-8, 8);
  const inside = `${v}${tail(b)}`;
  const constant = a * b;                       // a(v + b) = av + ab
  let coeff = a, rhsConst = constant, solution = null;
  if (kind === 'none') rhsConst = constant + rng.nonZero(-6, 6);
  if (kind === 'one') {
    coeff = a + rng.pick([-1, 1, 2]);
    solution = rng.int(-6, 6);
    rhsConst = constant + (a - coeff) * solution; // so av + ab = cv + k at v = solution
  }
  // Half the time the right side has to be collected first, so the
  // cancelling is not visible until the work is done.
  const split = rng.chance(0.5) && coeff > 2;
  const part = split ? rng.int(1, coeff - 1) : 0;
  const rhs = split
    ? `${term(part, v)}${tail(rhsConst)} + ${term(coeff - part, v)}`
    : `${term(coeff, v)}${tail(rhsConst)}`;
  const src = `${a}(${inside}) = ${rhs}`;
  const expanded = `${term(a, v)}${tail(constant)} = ${term(coeff, v)}${tail(rhsConst)}`;
  const lines = [src, expanded];
  const rules = [split ? `open the bracket and collect the ${v}s` : 'open the bracket'];
  let explain;
  if (kind === 'one') {
    lines.push(`${term(a - coeff, v)} = ${rhsConst - constant}`, `${v} = ${solution}`);
    rules.push(`take ${term(coeff, v)} and ${constant} off both sides`, 'one value');
    explain = `Opening the bracket gives ${expanded}. The ${v}s do not match, so they do not `
      + `cancel: gathering them leaves ${term(a - coeff, v)} = ${rhsConst - constant}, `
      + `and ${v} = ${solution} is the one number that works.`;
  } else {
    lines.push(`${constant} = ${rhsConst}`, kind === 'every' ? 'always true' : 'never true');
    rules.push(`take ${term(a, v)} off both sides`, 'no letter left to solve for');
    explain = `Opening the bracket gives ${expanded}. Taking ${term(a, v)} off both sides `
      + `removes every ${v}, leaving ${constant} = ${rhsConst}`
      + (kind === 'every'
        ? `, which is true whatever ${v} was. Every number works.`
        : `, which is false whatever ${v} was. No number works.`);
  }
  return {
    prompt: [...ask(src, v).slice(0, -4), T.prose(' How many numbers make it true?')],
    text: `how many solutions: ${src}`,
    answer: { type: 'choice', value: kind, options: KINDS },
    // Working is written with a true minus, as the rest of the catalogue's is.
    visual: {
      kind: 'evalmodel', lines: lines.map(trueMinus), rules,
      hint: 'Open it up and gather. What is left?',
    },
    explain: trueMinus(explain),
  };
}

const CONTENT = [bothSides, gatherThenUndo, brackets, notWhole];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  // The last level redraws from the content levels, but not `notWhole`: its
  // answers are fractions, and mixing them in would swap the answer widget
  // between one and two boxes according to whether this problem's answer
  // happens to be whole -- which tells a student the answer before they solve.
  // Nor No Answer or Every Answer, whose answer is a choice: the buttons
  // would announce that this problem is about whether it has an answer.
  const p = level === 4 ? noneOrEvery(rng)
    : level === 5 ? whichSide(rng)
    : level >= LAST_LEVEL ? rng.pick(CONTENT.slice(0, 3))(rng)
    : CONTENT[level](rng);
  p.parSeconds = PAR_SECONDS[level];
  // Sentences and worked lines with a real minus sign, as noneOrEvery already writes them.
  p.explain = trueMinus(p.explain);
  if (p.visual?.lines) p.visual.lines = p.visual.lines.map(trueMinus);
  return p;
}
