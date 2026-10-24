/**
 * Catalogue authoring tool: builds the problem library for inequalities.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 */
import * as T from '../terms.js';
import { minus } from '../../web/ui/dom.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/inequalities.js';

const VARS = ['x', 'y', 'n', 'a', 't'];

/**
 * The four relations, with what each one asks for once it is solved.
 *
 * `strict` is what makes the question worth asking. The smallest whole number
 * with x > 4 is 5; with x ≥ 4 it is 4. A student who solves correctly and
 * then answers 4 to the first has not finished the question, and no amount of
 * rearranging practice catches that.
 */
const RELATIONS = [
  { sign: '>', strict: true, wantsLargest: false, flipped: '<' },
  { sign: '≥', strict: false, wantsLargest: false, flipped: '≤' },
  { sign: '<', strict: true, wantsLargest: true, flipped: '>' },
  { sign: '≤', strict: false, wantsLargest: true, flipped: '≥' },
];

/** The whole number the question asks for, given a solved boundary. */
function bound(rel, boundary) {
  if (rel.wantsLargest) return rel.strict ? boundary - 1 : boundary;
  return rel.strict ? boundary + 1 : boundary;
}

// "Integer", not "whole number": in American usage the whole numbers start
// at 0, so "the largest whole number below −10" would have no answer.
const asks = (rel) => (rel.wantsLargest
  ? 'What is the largest integer it can be?'
  : 'What is the smallest integer it can be?');

// requiem: catalogue/content/inequality-solved-as-set
/**
 * The solving levels ask for the solution itself, x > 5, judged as a set,
 * rather than its first integer. Asking "the smallest integer" told the
 * student which way the sign pointed -- in The Flip, which way it had
 * turned -- before they had turned it. The sign is now theirs to write.
 */
const SET = { '>': '>', '≥': '>=', '<': '<', '≤': '<=' };
const wants = (v) => `Write the solution as an inequality in ${v}.`;
const solution = (v, rel, boundary) => {
  const end = { n: boundary, d: 1 };
  const op = SET[rel.sign];
  return { type: 'solutions', value: { letter: v, parts: [op[0] === '>'
    ? { lo: end, loIn: op === '>=', hi: null, hiIn: false }
    : { lo: null, loIn: false, hi: end, hiIn: op === '<=' }] } };
};
/** The question in the plain text check-answers.py reads: -3a <= 12. */
const plain = (src) => src.replace(/−/g, '-').replace(/≤/g, '<=').replace(/≥/g, '>=');

/** A solved inequality, read as "which whole numbers actually work". */
function whichWork(rng) {
  const v = rng.pick(VARS);
  const rel = rng.pick(RELATIONS);
  const boundary = rng.nonZero(-12, 12);
  const answer = bound(rel, boundary);

  return {
    prompt: [T.prose(`${v} ${rel.sign} ${minus(boundary)}. ${asks(rel)}`)],
    text: `${v} ${rel.sign} ${minus(boundary)}, ${rel.wantsLargest ? 'largest' : 'smallest'}`,
    answer: { type: 'int', value: answer },
    visual: {
      kind: 'evalmodel',
      lines: [`${v} ${rel.sign} ${minus(boundary)}`,
              rel.strict ? `${minus(boundary)} itself does not count`
                : `${minus(boundary)} itself does count`,
              minus(answer)],
      rules: [rel.strict ? 'the sign has no line under it' : 'the line under the sign includes it',
              'so the first one that works is'],
      hint: 'Does the number on the right count as an answer itself?',
    },
    explain: rel.strict
      ? `${v} ${rel.sign} ${minus(boundary)} means strictly ${rel.wantsLargest ? 'below' : 'above'} `
        + `${minus(boundary)}, so ${minus(boundary)} itself is out and the answer is `
        + `${minus(answer)}. The line under ≥ and ≤ is what lets the number itself count.`
      : `${v} ${rel.sign} ${minus(boundary)} allows ${minus(boundary)} itself — that is what `
        + `the line under the sign means — so the answer is ${minus(answer)}.`,
  };
}

/** x + 4 > 9. Adding and subtracting leave the sign exactly as it is. */
function undoAdd(rng) {
  const v = rng.pick(VARS);
  const rel = rng.pick(RELATIONS);
  const boundary = rng.nonZero(-10, 12);
  const b = rng.int(1, 15);
  const plus = rng.chance(0.6);
  const rhs = plus ? boundary + b : boundary - b;
  const src = `${v} ${plus ? '+' : '−'} ${b} ${rel.sign} ${minus(rhs)}`;

  return {
    prompt: [T.prose(`Solve ${src}. ${wants(v)}`)],
    text: `solve: ${plain(src)}`,
    answer: solution(v, rel, boundary),
    visual: {
      kind: 'evalmodel',
      lines: [src, `${v} ${rel.sign} ${minus(rhs)} ${plus ? '−' : '+'} ${b}`,
              `${v} ${rel.sign} ${minus(boundary)}`],
      rules: [`${plus ? `take ${b} from` : `add ${b} to`} both sides`,
              'the sign is unchanged — adding does not reorder anything'],
      hint: 'Exactly what you would do to an equation.',
    },
    explain: `${plus ? `Take ${b} from` : `Add ${b} to`} both sides. ${plus ? 'Taking the same amount from' : 'Adding the same amount to'} `
      + 'both sides shifts both along the line together, so which one is bigger cannot change — the sign stays put. '
      + `The solution is ${v} ${rel.sign} ${minus(boundary)}.`,
  };
}

/** 3x ≤ 12. Dividing by a positive is still no different from an equation. */
function undoMultiply(rng) {
  const v = rng.pick(VARS);
  const rel = rng.pick(RELATIONS);
  const k = rng.int(2, 9);
  const boundary = rng.nonZero(-9, 9);
  const rhs = k * boundary;
  const src = `${k}${v} ${rel.sign} ${minus(rhs)}`;

  return {
    prompt: [T.prose(`Solve ${src}. ${wants(v)}`)],
    text: `solve: ${plain(src)}`,
    answer: solution(v, rel, boundary),
    visual: {
      kind: 'evalmodel',
      lines: [src, `${v} ${rel.sign} ${minus(rhs)} ÷ ${k}`,
              `${v} ${rel.sign} ${minus(boundary)}`],
      rules: [`divide both sides by ${k}`, 'positive, so the sign is unchanged'],
      hint: 'What is multiplying the letter — and what sign is it?',
    },
    explain: `Divide both sides by ${k}. ${k} is positive, so scaling both sides by it keeps them in the same `
      + `order and the sign does not move. The solution is ${v} ${rel.sign} ${minus(boundary)}.`,
  };
}

/** −2x > 6. The one rule that is new. */
function theFlip(rng) {
  const v = rng.pick(VARS);
  const rel = rng.pick(RELATIONS);
  const k = rng.int(2, 9);
  const boundary = rng.nonZero(-9, 9);
  const rhs = -k * boundary;
  const src = `−${k}${v} ${rel.sign} ${minus(rhs)}`;
  // Dividing by a negative turns the relation around, so the question that
  // gets asked turns around with it.
  const after = RELATIONS.find((r) => r.sign === rel.flipped);

  return {
    prompt: [T.prose(`Solve ${src}. ${wants(v)}`)],
    text: `solve: ${plain(src)}`,
    answer: solution(v, after, boundary),
    visual: {
      kind: 'evalmodel',
      lines: [src, `${v} ${rel.sign} ${minus(rhs)} ÷ (−${k})`,
              `${v} ${after.sign} ${minus(boundary)}`],
      rules: [`divide both sides by −${k}`, 'negative, so the sign turns around'],
      hint: 'What is multiplying the letter, sign and all?',
    },
    explain: `Divide both sides by −${k}. Multiplying or dividing by a negative reverses `
      + 'the order of two numbers — 2 is less than 5, but −2 is more than −5 — so the sign '
      + `turns around: ${rel.sign} becomes ${after.sign}. Keeping ${rel.sign} would give every number that `
      + `does not work and none that does. The solution is ${v} ${after.sign} ${minus(boundary)}.`,
  };
}

/**
 * Does the sign flip?
 *
 * The discriminator is not "is there a minus in the question" -- it is what
 * you divide *by*. x − 7 > 2 has a minus and does not flip; −3x > 12 flips;
 * 3x > −12 has a negative on the right and does not flip. Presenting all
 * three shapes is the level, because a student who has learned "minus means
 * flip" gets two of them wrong and will not notice.
 */
function doesItFlip(rng) {
  const v = rng.pick(VARS);
  const rel = rng.pick(RELATIONS);
  // requiem: catalogue/library/choice-answers-balanced
  // Half flip: −3x > 12, or 12 − 3x > 6 where the negative is not in front.
  const flips = rng.chance(0.5);
  const shape = flips ? rng.pick([0, 3]) : rng.pick([1, 2]);
  const k = rng.int(2, 9);
  const b = rng.int(2, 15);
  const c = rng.int(2, 20);
  const src = shape === 0 ? `−${k}${v} ${rel.sign} ${b}`
    : shape === 1 ? `${v} − ${b} ${rel.sign} ${k}`
    : shape === 2 ? `${k}${v} ${rel.sign} −${b}`
    : `${c} − ${k}${v} ${rel.sign} ${b}`;

  return {
    prompt: [T.prose(`Solving ${src} — does the sign turn around?`)],
    text: `does ${src} flip`,
    answer: {
      type: 'choice',
      value: flips ? 'flip' : 'keep',
      // requiem: catalogue/library/options-in-question-order
      // Yes before no, as the question asks it, rather than shuffled.
      options: [
        { id: 'flip', label: 'Yes, the sign turns around',
          note: 'the last step reverses the order' },
        { id: 'keep', label: 'No, the sign stays as it is',
          note: 'the last step keeps the order' },
      ],
    },
    visual: null,
    explain: shape === 3
      ? `Taking ${c} from both sides leaves the sign alone, but the letter is multiplied by −${k}, `
        + 'so the last step is dividing by a negative — and that reverses the order. The sign turns around.'
      : flips
      ? `The letter is multiplied by −${k}, so the last step is dividing by a negative — `
        + 'and that reverses the order. The sign turns around.'
      : shape === 1
        ? `There is a minus in it, but the step is adding ${b} to both sides, and adding `
          + 'never reorders anything. The sign stays as it is. A minus in the question is '
          + 'not what decides — what you divide by is.'
        : `The −${b} is on the right-hand side, and it is only the number the answer is `
          + `compared to. The step is dividing by ${k}, which is positive, so the sign `
          + 'stays as it is.',
  };
}

/**
 * ax + p > bx + q. Gathered on the side with more letters, so the division
 * at the end is always by a positive: when the letters end up on the right,
 * the answer reads "3 > x", which is the same statement as "x < 3" read from
 * the other end -- not a flip, and the explanation says so.
 */
const coef = (k, v) => (k === 1 ? v : `${k}${v}`);
const plus = (c) => (c === 0 ? '' : c > 0 ? ` + ${c}` : ` − ${-c}`);

function bothSides(rng) {
  const v = rng.pick(VARS);
  const rel = rng.pick(RELATIONS);
  let a = rng.int(1, 8), b = rng.int(1, 8);
  while (a === b) b = rng.int(1, 8);
  const boundary = rng.nonZero(-9, 9);
  const p = rng.int(-12, 12);
  const q = p + (a - b) * boundary;
  const src = `${coef(a, v)}${plus(p)} ${rel.sign} ${coef(b, v)}${plus(q)}`;
  const left = a > b;
  const k = Math.abs(a - b);
  const gathered = left
    ? `${coef(k, v)} ${rel.sign} ${minus(q - p)}`
    : `${minus(p - q)} ${rel.sign} ${coef(k, v)}`;
  const solved = left
    ? `${v} ${rel.sign} ${minus(boundary)}`
    : `${minus(boundary)} ${rel.sign} ${v}`;
  // Read from the letter's end, "3 > x" is "x < 3".
  const after = left ? rel : RELATIONS.find((r) => r.sign === rel.flipped);
  const lines = [src, gathered];
  // "x's", not "xs": a bare plural of the letter a reads as the word "as".
  const rules = [`gather the ${v}'s on the ${left ? 'left' : 'right'}, where there are more`];
  if (k !== 1) { lines.push(solved); rules.push(`divide both sides by ${k}, a positive`); }
  if (!left) { lines.push(`${v} ${after.sign} ${minus(boundary)}`); rules.push(`read it from the ${v} end`); }
  return {
    prompt: [T.prose(`Solve ${src}. ${wants(v)}`)],
    text: `solve: ${plain(src)}`,
    answer: solution(v, after, boundary),
    visual: {
      kind: 'evalmodel', lines, rules,
      hint: 'The letter is on both sides. Which side has more of it?',
    },
    explain: `There are more ${v}'s on the ${left ? 'left' : 'right'}, so gather them there `
      + `and the number in front stays positive: ${gathered}`
      + (k !== 1 ? `, so ${solved}` : '')
      + (left ? '. '
        : `. Read from the other end, that says the same thing — `
          + 'nothing was divided by a negative, so nothing flipped. ')
      + `The solution is ${v} ${after.sign} ${minus(boundary)}.`,
  };
}

const CONTENT = [whichWork, undoAdd, undoMultiply, theFlip, bothSides];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  // The mixed level deals from the four solving levels, whose answers are
  // all a solution set. Which Numbers Work answers with one integer and the
  // strategy level with a button, so either would say what kind of question
  // it was before it was read.
  const p = level === 5 ? doesItFlip(rng)
    : level >= LAST_LEVEL ? rng.pick(CONTENT.slice(1))(rng)
    : CONTENT[level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
