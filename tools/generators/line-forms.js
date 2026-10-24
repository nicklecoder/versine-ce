/**
 * Catalogue authoring tool: builds the problem library for forms of a line.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 *
 * Every `text` carries the given line or lines as plain ASCII equations, so
 * scripts/check-answers.py can solve them for itself.
 */
import * as T from '../terms.js';
import { minus, signed } from '../../web/ui/dom.js';
import { previewOf } from '../../web/ui/express.js';
import { ratio, show, plain, lineText } from '../lines.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/line-forms.js';

const pt = ([x, y]) => `(${minus(x)}, ${minus(y)})`;
const ptPlain = ([x, y]) => `(${x}, ${y})`;
/** An equation for a sentence: one unbroken piece of maths among the words. */
const terms = (src) => [T.math(previewOf(src).terms)];
const whole = (n) => ({ n, d: 1 });
const lineAnswer = (m, b) => ({ type: 'linear', value: { m: ratio(m.n, m.d), b: ratio(b.n, b.d) } });
const rhsOf = (m, b) => lineText(m, b, { ascii: true }).slice(4);
/** The slope as it stands in front of x in running text: (1/2)x, not 1/2x. */
const coef = (m) => (m.d === 1 ? (m.n === 1 ? '' : m.n === -1 ? '−' : minus(m.n)) : `(${show(m)})`);
const tm = (s) => s.replace(/-/g, '−');
/** A whole coefficient in front of a letter in running text: 3, −2, and nothing for 1 or just − for −1. */
const coefOf = (k) => (k === 1 ? '' : k === -1 ? '−' : minus(k));
/** Ax + By = C as it is written: x − y = 1, not 1x − 1y = 1. */
const standardText = (A, B, C) => `${A === 1 ? '' : A === -1 ? '-' : A}x ${B < 0 ? '-' : '+'} ${Math.abs(B) === 1 ? '' : Math.abs(B)}y = ${C}`;

/** A slope a student can work with: whole, or over 2, 3 or 4. */
function slope(rng) {
  const d = rng.pick([1, 1, 1, 2, 2, 3, 4]);
  let n = rng.nonZero(-4, 4);
  if (d > 1) while (n % d === 0 || Math.abs(n) > 2 * d) n = rng.nonZero(-2 * d, 2 * d);
  return ratio(n, d);
}

/** "y - 3", "y + 2", "y" -- one side of a point-slope equation. */
const shifted = (v, by) => (by === 0 ? v : `${v} ${by < 0 ? '+' : '-'} ${Math.abs(by)}`);
const times = (m) => (m.d === 1 ? (m.n === 1 ? '' : m.n === -1 ? '-' : String(m.n)) : `${m.n}/${m.d}`);

/** Point-slope back to slope-intercept: expand the bracket, then move the number. */
function pointSlope(rng) {
  const m = slope(rng);
  // A slope of 1 or −1 would leave a bare bracket, y + 1 = (x − 3), which
  // no textbook writes; those lines are no different to practise otherwise.
  if (m.d === 1 && Math.abs(m.n) === 1) return pointSlope(rng);
  const x1 = m.d * rng.nonZero(-4, 4);
  const y1 = rng.nonZero(-9, 9);
  const b = y1 - (m.n * x1) / m.d;
  const eq = `${shifted('y', y1)} = ${times(m)}(${shifted('x', x1)})`;
  const mx1 = (m.n * x1) / m.d;
  return {
    prompt: [T.prose('Write'), ...terms(eq), T.prose('in the form y = mx + b.')],
    text: `point-slope ${eq}`,
    answer: lineAnswer(m, whole(b)),
    visual: null,
    explain: `This line has slope ${show(m)} and passes through ${pt([x1, y1])}. Expand the bracket: `
      + `${tm(shifted('y', y1))} = ${lineText(m, whole(-mx1)).slice(4)}. `
      + `${y1 > 0 ? `Add ${y1} to` : `Take ${-y1} from`} both sides: ${lineText(m, whole(b))}.`,
  };
}

/** Standard form back to slope-intercept: move the x term, then divide by y's number. */
function standard(rng) {
  const A = rng.int(1, 6);
  const B = rng.nonZero(-5, 5);
  const b = rng.int(-6, 6);
  const C = B * b;
  const m = ratio(-A, B);
  const eq = `${A === 1 ? '' : A}x ${B < 0 ? '-' : '+'} ${Math.abs(B) === 1 ? '' : Math.abs(B)}y = ${C}`;
  const moved = `${coefOf(B)}y = ${coefOf(-A)}x${C === 0 ? '' : ` ${C < 0 ? '−' : '+'} ${Math.abs(C)}`}`;
  return {
    prompt: [T.prose('Write'), ...terms(eq), T.prose('in the form y = mx + b.')],
    text: `standard ${eq}`,
    answer: lineAnswer(m, whole(b)),
    visual: null,
    explain: B === 1
      ? `Take ${A === 1 ? '' : A}x from both sides, and y is left on its own: ${lineText(m, whole(b))}.`
      : `Take ${A === 1 ? '' : A}x from both sides: ${moved}. Divide everything by ${minus(B)}: ${lineText(m, whole(b))}.`,
  };
}

/** Flat lines are y = c; upright lines are x = c, and have no slope to write. */
function flatOrUpright(rng) {
  const p = [rng.int(-9, 9), rng.int(-9, 9)];
  const shape = rng.pick(['horizontal', 'vertical', 'same-y', 'same-x']);
  if (shape === 'horizontal' || shape === 'vertical') {
    const flat = shape === 'horizontal';
    return {
      prompt: [T.prose(`What is the equation of the ${shape} line through ${pt(p)}? Write it as y = … or x = ….`)],
      text: `${shape} through ${ptPlain(p)}`,
      answer: flat ? lineAnswer(whole(0), whole(p[1])) : { type: 'linear', value: { x: whole(p[0]) } },
      visual: null,
      explain: flat
        ? `A horizontal line keeps the same y everywhere along it. This one has y = ${minus(p[1])} at ${pt(p)}, `
          + `so it is y = ${minus(p[1])}, whatever x is. Its slope is 0.`
        : `A vertical line keeps the same x all the way up. This one has x = ${minus(p[0])} at ${pt(p)}, `
          + `so it is x = ${minus(p[0])}, whatever y is. It has no slope, so it cannot be written as y = …`,
    };
  }
  const flat = shape === 'same-y';
  const q = flat ? [p[0] + rng.nonZero(-6, 6), p[1]] : [p[0], p[1] + rng.nonZero(-6, 6)];
  return {
    prompt: [T.prose(`What is the equation of the line through ${pt(p)} and ${pt(q)}? Write it as y = … or x = ….`)],
    text: `line through ${ptPlain(p)} ${ptPlain(q)}`,
    answer: flat ? lineAnswer(whole(0), whole(p[1])) : { type: 'linear', value: { x: whole(p[0]) } },
    visual: null,
    explain: flat
      ? `Both points have y = ${minus(p[1])}, so the line is flat: y = ${minus(p[1])}.`
      : `Both points have x = ${minus(p[0])}, so the line goes straight up: x = ${minus(p[0])}. `
        + 'The run is 0, so there is no slope to put into y = mx + b.',
  };
}

/** A given line in either form, as ASCII and as the slope a student must read from it. */
function givenLine(rng, m) {
  if (m.d === 1 || rng.chance(0.7)) {
    const b = whole(rng.int(-8, 8));
    return { eq: `y = ${rhsOf(m, b)}`, b };
  }
  // Standard form, for a slope -A/B: the slope has to be found before it can be used.
  let A = -m.n, B = m.d;
  if (A < 0) { A = -A; B = -B; }
  const b = rng.int(-5, 5);
  return { eq: `${A === 1 ? '' : A}x ${B < 0 ? '-' : '+'} ${Math.abs(B) === 1 ? '' : Math.abs(B)}y = ${B * b}`,
    b: whole(b), standard: true };
}

// requiem: catalogue/content/prompt-names-wanted-form
function parallel(rng) {
  const m = slope(rng);
  const base = givenLine(rng, m);
  const x = m.d * rng.nonZero(-4, 4);
  const b = rng.int(-9, 9);
  if (b === base.b.n) return parallel(rng);
  const y = (m.n * x) / m.d + b;
  if (Math.abs(y) > 15) return parallel(rng);
  return {
    prompt: [T.prose(`Write the line through ${pt([x, y])} parallel to`), ...terms(base.eq),
      T.prose('in the form y = mx + b.')],
    text: `parallel to ${base.eq} through ${ptPlain([x, y])}`,
    answer: lineAnswer(m, whole(b)),
    visual: null,
    explain: `${base.standard ? `Solved for y, the given line is ${lineText(m, base.b)}, so its` : 'Its'} slope is `
      + `${show(m)}, and a parallel line has the same slope. Put ${pt([x, y])} into y = ${coef(m)}x + b: `
      + `${minus(y)} = ${minus((m.n * x) / m.d)} + b, so b = ${minus(b)}. The line is ${lineText(m, whole(b))}.`,
  };
}

function perpendicular(rng) {
  const m = slope(rng);
  const p = ratio(-m.d, m.n);
  const base = givenLine(rng, m);
  const x = p.d * rng.nonZero(-4, 4);
  const b = rng.int(-9, 9);
  const y = (p.n * x) / p.d + b;
  if (Math.abs(y) > 15) return perpendicular(rng);
  return {
    prompt: [T.prose(`Write the line through ${pt([x, y])} perpendicular to`), ...terms(base.eq),
      T.prose('in the form y = mx + b.')],
    text: `perpendicular to ${base.eq} through ${ptPlain([x, y])}`,
    answer: lineAnswer(p, whole(b)),
    visual: null,
    explain: `${base.standard ? `Solved for y, the given line is ${lineText(m, base.b)}, so its` : 'Its'} slope is `
      + `${show(m)}. A perpendicular slope is flipped and has its sign changed: ${show(p)}, since `
      + `${show(m)} × ${show(p).startsWith('−') ? `(${show(p)})` : show(p)} = −1. `
      + `Put ${pt([x, y])} into y = ${coef(p)}x + b: ${minus(y)} = ${minus((p.n * x) / p.d)} + b, so b = ${minus(b)}. `
      + `The line is ${lineText(p, whole(b))}.`,
  };
}

const RELATIONS = [
  { id: 'parallel', label: 'Parallel', note: 'the same slope' },
  { id: 'perpendicular', label: 'Perpendicular', note: 'slopes multiply to −1' },
  { id: 'neither', label: 'Neither', note: 'some other pair of slopes' },
];

/**
 * Two lines, and how they meet. The "neither" pairs are the near-misses:
 * flipped without the sign change, the sign changed without the flip, or
 * the same intercept mistaken for a relationship.
 */
function relation(rng) {
  const m = slope(rng);
  // requiem: catalogue/library/choice-answers-balanced
  // The answer first, a third each, then which near-miss a "neither" is.
  const want = rng.pick(['parallel', 'perpendicular', 'neither']);
  const kind = want === 'neither' ? rng.pick(['flip-only', 'sign-only', 'same-b']) : want;
  const m2 = {
    parallel: m, perpendicular: ratio(-m.d, m.n), 'flip-only': ratio(m.d, m.n),
    'sign-only': ratio(-m.n, m.d), 'same-b': ratio(m.n + m.d, m.d),
  }[kind];
  if (kind === 'flip-only' && Math.abs(m.n) === m.d) return relation(rng);    // 1 flipped is still 1
  if (kind === 'sign-only' && m.n * m.n === m.d * m.d) return relation(rng);  // −1 and 1 ARE perpendicular
  const b1 = rng.int(-8, 8);
  let b2 = kind === 'same-b' ? b1 : rng.int(-8, 8);
  if (kind === 'parallel' && b2 === b1) b2 = b1 + rng.nonZero(-4, 4);
  const e1 = `y = ${rhsOf(m, whole(b1))}`, e2 = `y = ${rhsOf(m2, whole(b2))}`;
  const answer = m2.n * m.d === m.n * m2.d ? 'parallel' : m.n * m2.n === -m.d * m2.d ? 'perpendicular' : 'neither';
  const product = ratio(m.n * m2.n, m.d * m2.d);
  return {
    prompt: [T.prose('Are'), ...terms(e1), T.prose('and'), ...terms(e2),
      T.prose('parallel, perpendicular or neither?')],
    text: `relation: ${e1} and ${e2}`,
    answer: { type: 'choice', value: answer, options: RELATIONS },
    visual: null,
    explain: `The slopes are ${show(m)} and ${show(m2)}. `
      + (answer === 'parallel' ? 'They are equal, so the lines are parallel.'
        : `Multiplied, they make ${show(product)}${answer === 'perpendicular' ? ', so the lines are perpendicular.'
          : `, not −1, and they are not equal, so neither${kind === 'same-b' ? ': sharing an intercept only means they cross on the y-axis' : ''}.`}`),
  };
}

const FORMS = [
  { id: 'slope-intercept', label: 'Slope-intercept', note: 'y = mx + b' },
  { id: 'point-slope', label: 'Point-slope', note: 'y − y₁ = m(x − x₁)' },
  { id: 'standard', label: 'Standard', note: 'Ax + By = C' },
];

/**
 * Which form is quickest, from what is known and what is wanted. Each
 * scenario has one form that turns the givens into the goal with no
 * working at all, or the least. The form is chosen first, a third each,
 * so pressing one button every time scores no better than guessing.
 */
function whichForm(rng) {
  const m = slope(rng);
  const b = rng.int(-9, 9);
  const p = [rng.nonZero(-6, 6), rng.int(-9, 9)];
  const q = [p[0] + rng.nonZero(-5, 5), p[1] + rng.nonZero(-5, 5)];
  const A = rng.int(1, 9), B = rng.nonZero(-5, 5), C = rng.nonZero(-6, 6) * Math.abs(A * B);
  const other = rng.int(-9, 9);
  const given = `y = ${rhsOf(m, whole(other))}`;
  const cases = {
    'slope-intercept': [
      { say: [T.prose(`You know the slope is ${show(m)} and the line crosses the y-axis at ${minus(b)}, and you need its equation.`)],
        key: `slope ${plain(m)}, y-intercept ${b}`,
        why: 'A slope and a y-intercept are exactly m and b: y = mx + b can be written down at once.' },
      { say: [T.prose('A line is parallel to'), ...terms(given),
        T.prose(`and crosses the y-axis at ${minus(b)}, and you need its equation.`)],
        key: `parallel to ${given}, y-intercept ${b}`,
        why: `A parallel line has the same slope, ${show(m)}, and the y-intercept is given: those are m and b, `
          + 'so y = mx + b can be written down at once.' },
    ],
    'point-slope': [
      { say: [T.prose(`You know the slope is ${show(m)} and the line passes through ${pt(p)}, and you need its equation.`)],
        key: `slope ${plain(m)}, point ${ptPlain(p)}`,
        why: 'A slope and a point fill in y − y₁ = m(x − x₁) directly, with nothing to work out first.' },
      { say: [T.prose(`You know the line passes through ${pt(p)} and ${pt(q)}, and you need its equation.`)],
        key: `points ${ptPlain(p)} ${ptPlain(q)}`,
        why: 'Two points give the slope, and then either point goes straight into y − y₁ = m(x − x₁). '
          + 'Slope-intercept would need b worked out as an extra step.' },
    ],
    standard: [
      { say: [T.prose('You need both places where'), ...terms(standardText(A, B, C)), T.prose('crosses the axes.')],
        key: `intercepts of ${A}x + ${B}y = ${C}`,
        why: 'In Ax + By = C, setting x = 0 gives the y-intercept and setting y = 0 gives the x-intercept, '
          + 'one division each. Rearranging first is extra work.' },
    ],
  };
  const want = rng.pick(['slope-intercept', 'point-slope', 'standard']);
  const c = rng.pick(cases[want]);
  return {
    prompt: [...c.say, T.prose('Which form of a line gets you there with the least work?')],
    text: `which form: ${c.key}`,
    answer: { type: 'choice', value: want, options: FORMS },
    visual: null,
    explain: c.why,
  };
}

const CONTENT = [pointSlope, standard, flatOrUpright, parallel, perpendicular, relation, whichForm];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  // The mixed level deals from the five levels that ask for a line. The
  // judgement and the strategy levels stay out: both are answered with
  // buttons, and a line question turning into buttons would say something.
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, 4) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
