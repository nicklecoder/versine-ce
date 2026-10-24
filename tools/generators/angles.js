/**
 * Catalogue authoring tool: builds the problem library for angle relationships.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 *
 * Every `text` names the relationship and gives the sizes, or the positions
 * of the angles in the figure, so scripts/check-answers.py can apply the
 * relationship again: a full turn from what it says is a full turn, an angle
 * in the same position at the other crossing from where it says it is.
 *
 * Figures are drawn to scale on the plane, without axes. The angle asked
 * about carries its letter while the question is open, and its size only
 * once it is answered.
 */
import * as T from '../terms.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/angles.js';

import {
  LINE, GIVEN, ASKED, RAD, r2, toward, FRAME, ray, arc, square, reach, text, angleMarks, figure, fit,
  linear, ascii, sized, putIn,
} from './figures.js';

const LETTERS = ['a', 'b', 'c', 'x', 'y', 'p', 'q'];
const deg = (n) => `${n}°`;
const sumOf = (xs) => xs.reduce((s, v) => s + v, 0);
const joined = (xs) => (xs.length === 1 ? deg(xs[0]) : `${xs.slice(0, -1).map(deg).join(', ')} and ${deg(xs[xs.length - 1])}`);

/** Parts that make up `total`, each at least `least`, the last one asked for. */
function parts(rng, total, count, least) {
  for (;;) {
    const cuts = Array.from({ length: count - 1 }, () => rng.int(least, total - least)).sort((a, b) => a - b);
    const sizes = [...cuts, total].map((v, i, a) => v - (i ? a[i - 1] : 0));
    if (sizes.every((s) => s >= least)) return sizes;
  }
}

/**
 * Angles that fill a right angle or a straight line, drawn as rays from one
 * corner, with the last part asked for.
 */
function filled(rng, total, kind) {
  const count = kind === 'three' ? 3 : 2;
  const sizes = parts(rng, total, count, total === 90 ? 12 : 20);
  const want = sizes[count - 1], given = sizes.slice(0, -1);
  const letter = rng.pick(LETTERS);
  const base = rng.pick([0, 0, 90, 180, 270, rng.int(0, 359)]);
  const marks = [ray(base), ray(base + total)];
  if (total === 180) marks.push(ray(base + 180));
  if (total === 90) marks.push(square(base, [0, 0], 0.3));
  let at = base;
  const pieces = sizes.map((s, i) => {
    const last = i === count - 1;
    const m = angleMarks(at, at + s, { label: last ? letter : deg(s), asked: last, answer: last ? deg(s) : null });
    at += s;
    if (!last) marks.push(ray(at));
    return m;
  });
  return { sizes, want, given, letter, visual: figure([...marks, ...pieces]) };
}

function complementary(rng) {
  const kind = rng.pick(['word', 'pair', 'figure', 'figure', 'three']);
  const { want, given, letter, visual } = filled(rng, 90, kind);
  const prompt = {
    word: `What is the complement of ${deg(given[0])}?`,
    pair: `Angles ${letter} and ${letter === 'a' ? 'b' : 'a'} are complementary, and ${letter === 'a' ? 'b' : 'a'} = ${deg(given[0])}. What is ${letter}?`,
    figure: `The two angles make a right angle. What is ${letter}?`,
    three: `The three angles make a right angle. What is ${letter}?`,
  }[kind];
  return {
    prompt: [T.prose(prompt)],
    text: `complement: ${given.join(', ')} (${kind})`,
    answer: { type: 'int', value: want },
    visual: kind === 'figure' || kind === 'three' ? visual : null,
    explain: `Complementary angles make a right angle, so they add to 90°: `
      + `${kind === 'three' ? `${given.join(' + ')} = ${sumOf(given)}, and ` : ''}90 − ${sumOf(given)} = ${want}. `
      + `(Not 180 − ${sumOf(given)}: 180° is a straight line, and that would be the supplement.) So ${kind === 'word' ? 'the complement is' : `${letter} =`} ${deg(want)}.`,
  };
}

function supplementary(rng) {
  const kind = rng.pick(['word', 'pair', 'figure', 'figure', 'three']);
  const { want, given, letter, visual } = filled(rng, 180, kind);
  const other = letter === 'a' ? 'b' : 'a';
  const prompt = {
    word: `What is the supplement of ${deg(given[0])}?`,
    pair: `Angles ${letter} and ${other} are supplementary, and ${other} = ${deg(given[0])}. What is ${letter}?`,
    figure: `The two angles make a straight line. What is ${letter}?`,
    three: `The three angles make a straight line. What is ${letter}?`,
  }[kind];
  return {
    prompt: [T.prose(prompt)],
    text: `supplement: ${given.join(', ')} (${kind})`,
    answer: { type: 'int', value: want },
    visual: kind === 'figure' || kind === 'three' ? visual : null,
    explain: `Supplementary angles make a straight line, so they add to 180°: `
      + `${kind === 'three' ? `${given.join(' + ')} = ${sumOf(given)}, and ` : ''}180 − ${sumOf(given)} = ${want}. `
      + `${given[0] < 90 && kind !== 'three' ? `(Not 90 − ${given[0]}: that would be the complement.) ` : ''}`
      + `So ${kind === 'word' ? 'the supplement is' : `${letter} =`} ${deg(want)}.`,
  };
}

/**
 * Two lines crossing: four angles, numbered round from the first line.
 * Angles 0 and 2 have the size given as `theta`, 1 and 3 its supplement.
 */
function crossing(rng) {
  const theta = rng.int(15, 165);
  if (theta === 90) return crossing(rng);
  const base = rng.int(0, 179);
  const dirs = [base, base + theta, base + 180, base + theta + 180, base + 360];
  const size = (i) => (i % 2 ? 180 - theta : theta);
  const given = rng.int(0, 3);
  // Opposite and beside equally often: equal, or 180 take away.
  const asked = (given + rng.pick([2, 1, 3, 2])) % 4;
  const letter = rng.pick(LETTERS);
  const want = size(asked);
  const visual = figure([
    { kind: 'segment', from: toward(base, 3.8), to: toward(base + 180, 3.8), tone: LINE },
    { kind: 'segment', from: toward(base + theta, 3.8), to: toward(base + theta + 180, 3.8), tone: LINE },
    angleMarks(dirs[given], dirs[given + 1], { label: deg(size(given)) }),
    angleMarks(dirs[asked], dirs[asked + 1], { label: letter, asked: true, answer: deg(want) }),
  ]);
  const opposite = (asked - given + 4) % 4 === 2;
  return {
    prompt: [T.prose(`Two straight lines cross. What is ${letter}?`)],
    text: `crossing: ${size(given)} at ${given}, find ${asked}`,
    answer: { type: 'int', value: want },
    visual,
    explain: opposite
      ? `${letter} is opposite the ${deg(size(given))} angle: they are vertical angles, and vertical angles are equal. `
        + `(Each makes a straight line with the same angle between them.) So ${letter} = ${deg(want)}.`
      : `${letter} is beside the ${deg(size(given))} angle, on the same straight line, so the two add to 180°: `
        + `180 − ${size(given)} = ${want}. So ${letter} = ${deg(want)}.`,
  };
}

function aroundPoint(rng) {
  const count = rng.int(3, 5);
  let sizes = parts(rng, 360, count, 25);
  // A right angle among them now and then, marked as one.
  const right = rng.chance(0.3) && count > 3 ? rng.int(0, count - 2) : -1;
  if (right >= 0) {
    const rest = parts(rng, 270, count - 1, 25);
    sizes = [...rest.slice(0, right), 90, ...rest.slice(right)];
  }
  if (sizes.some((s) => s >= 180)) return aroundPoint(rng);
  const asked = rng.int(0, count - 1);
  const want = sizes[asked];
  const letter = rng.pick(LETTERS);
  const base = rng.int(0, 359);
  const marks = [];
  let at = base;
  const pieces = sizes.map((s, i) => {
    marks.push(ray(at));
    const m = angleMarks(at, at + s, {
      label: i === asked ? letter : deg(s), asked: i === asked, answer: i === asked ? deg(s) : null, right: i === right && i !== asked,
    });
    at += s;
    return m;
  });
  const given = sizes.filter((_, i) => i !== asked);
  return {
    prompt: [T.prose(right >= 0 && right !== asked
      ? `Rays from a point make these angles; the square marks a right angle. What is ${letter}?`
      : `Rays from a point make these angles. What is ${letter}?`)],
    text: `around a point: ${given.join(', ')}`,
    answer: { type: 'int', value: want },
    visual: figure([...marks, ...pieces]),
    explain: `All the way round a point is a full turn, 360°. The others add to ${given.join(' + ')} = ${sumOf(given)}, `
      + `so ${letter} = 360 − ${sumOf(given)} = ${want}. (Not 180: that is only a straight line, half a turn.) So ${letter} = ${deg(want)}.`,
  };
}

/**
 * Two parallel lines and a transversal. At each crossing the four angles are
 * named by where they sit: TL, TR, BL, BR. The transversal leaves the right
 * of each line at `dir` degrees, so TR and BL are `dir` and TL and BR are
 * 180 − dir, at both crossings alike.
 */
const SPOTS = ['TL', 'TR', 'BL', 'BR'];
const H = 2;
function spotSize(spot, dir) { return spot === 'TR' || spot === 'BL' ? dir : 180 - dir; }
function spotArms(spot, dir) {
  return { TR: [0, dir], TL: [dir, 180], BL: [180, 180 + dir], BR: [180 + dir, 360] }[spot];
}
/** What the two angles are to each other, by where they sit. */
function pairName(a, b) {
  if (a.line === b.line) return a.spot[0] !== b.spot[0] && a.spot[1] !== b.spot[1] ? 'vertical' : 'linear pair';
  if (a.spot === b.spot) return 'corresponding';
  const [top, bottom] = a.line === 'top' ? [a, b] : [b, a];
  const inside = top.spot[0] === 'B' && bottom.spot[0] === 'T';
  const outside = top.spot[0] === 'T' && bottom.spot[0] === 'B';
  const sameSide = top.spot[1] === bottom.spot[1];
  if (inside) return sameSide ? 'same-side interior' : 'alternate interior';
  if (outside) return sameSide ? 'same-side exterior' : 'alternate exterior';
  return null;
}
const PAIR_RULE = {
  vertical: ['vertical angles', 'equal'], 'linear pair': ['a linear pair, on one straight line', '180'],
  corresponding: ['corresponding angles: in the same position at each crossing', 'equal'],
  'alternate interior': ['alternate interior angles: between the parallel lines, on opposite sides of the transversal', 'equal'],
  'alternate exterior': ['alternate exterior angles: outside the parallel lines, on opposite sides of the transversal', 'equal'],
  'same-side interior': ['same-side interior angles: between the parallel lines, on the same side of the transversal', '180'],
  'same-side exterior': ['same-side exterior angles: outside the parallel lines, on the same side of the transversal', '180'],
};

function transversalFigure(dir, given, asked, { givenLabel, askedLabel, askedAnswer = null, givenAnswer = null, askedTone = true }) {
  const crossAt = (line) => [r2((line === 'top' ? H : -H) / Math.tan(dir * RAD)), line === 'top' ? H : -H];
  const long = String(givenLabel).length > 5;
  const reachFor = (spot) => {
    const [from, to] = spotArms(spot, dir);
    let out = reach(to - from, long ? 1.9 : 1.05);
    // Keep a label between the arms and off the other line.
    const dy = Math.abs(Math.sin(((from + to) / 2) * RAD));
    if (dy * (out + 0.85) > H * 2 - 0.6) out = Math.max(0.9, (H * 2 - 0.6) / dy - 0.85);
    return out;
  };
  const marksFor = (a, label, asked_, answer) => {
    const c = crossAt(a.line);
    const [from, to] = spotArms(a.spot, dir);
    const mid = (from + to) / 2, out = reachFor(a.spot);
    return {
      marks: [arc(from, to, 0.55, c, asked_ ? ASKED : GIVEN), text(toward(mid, out, c), label, asked_ ? ASKED : GIVEN)],
      reveal: answer ? [text(toward(mid, out + 0.85, c), answer, 'var(--result)')] : [],
    };
  };
  const chevron = (y) => ({ kind: 'path', tone: LINE, points: [[-3.7, y + 0.22], [-3.45, y], [-3.7, y - 0.22]] });
  return fit({
    ...FRAME,
    marks: [
      { kind: 'segment', from: [-4.8, H], to: [4.8, H], tone: LINE },
      { kind: 'segment', from: [-4.8, -H], to: [4.8, -H], tone: LINE },
      chevron(H), chevron(-H),
      text([4.95, H + 0.3], 'ℓ', LINE), text([4.95, -H + 0.3], 'm', LINE),
      { kind: 'segment', from: toward(dir, 4.1 / Math.sin(dir * RAD)), to: toward(dir + 180, 4.1 / Math.sin(dir * RAD)), tone: LINE },
      ...[marksFor(given, givenLabel, false, givenAnswer), marksFor(asked, askedLabel, askedTone, askedAnswer)].flatMap((p) => p.marks),
    ],
    answer: [marksFor(given, givenLabel, false, givenAnswer), marksFor(asked, askedLabel, askedTone, askedAnswer)].flatMap((p) => p.reveal),
  }, 1.2);
}

function parallel(rng) {
  const dir = rng.chance(0.5) ? rng.int(35, 80) : rng.int(100, 145);
  const pick = () => ({ line: rng.pick(['top', 'bottom']), spot: rng.pick(SPOTS) });
  let given = pick(), asked = pick();
  const name = pairName(given, asked);
  // Mostly the named pairs across the two lines; now and then two steps.
  if (given.line === asked.line && given.spot === asked.spot) return parallel(rng);
  if (name === 'vertical' || name === 'linear pair') { if (rng.chance(0.75)) return parallel(rng); }
  if (name === null && rng.chance(0.6)) return parallel(rng);
  const g = spotSize(given.spot, dir), want = spotSize(asked.spot, dir);
  const letter = rng.pick(LETTERS);
  let why;
  if (name) {
    const [said, rule] = PAIR_RULE[name];
    why = `The two are ${said}. ${rule === 'equal' ? `With the lines parallel these are equal, so ${letter} = ${g}.`
      : `These add to 180°, so ${letter} = 180 − ${g} = ${want}.`}`;
  } else {
    // Two steps: across to the same position, then along the line.
    const via = { line: asked.line, spot: given.spot };
    why = `Move the ${deg(g)} angle to the other crossing first: in the same position there, it is a corresponding angle, also ${deg(g)}. `
      + `${PAIR_RULE[pairName(via, asked)][1] === 'equal' ? `That one and ${letter} are vertical angles, so ${letter} = ${g}.`
        : `That one and ${letter} make a straight line, so ${letter} = 180 − ${g} = ${want}.`}`;
  }
  return {
    prompt: [T.prose(`Lines ℓ and m are parallel, cut by a transversal. What is ${letter}?`)],
    text: `parallel: ${g} at ${given.line} ${given.spot}, find ${asked.line} ${asked.spot}`,
    answer: { type: 'int', value: want },
    visual: transversalFigure(dir, given, asked, { givenLabel: deg(g), askedLabel: letter, askedAnswer: deg(want) }),
    explain: `${why} So ${letter} = ${deg(want)}.`,
  };
}

/**
 * Two angles as expressions in x, made to agree with a relationship at a
 * whole x: equal, or adding to 90 or 180.
 */
function expressions(rng, rule) {
  for (;;) {
    const x = rng.int(4, 40);
    const A = rule === '90' ? rng.int(15, 75) : rng.int(25, 155);
    const B = rule === 'equal' ? A : Number(rule) - A;
    const a1 = rng.int(1, 6);
    let a2 = rng.int(1, 6);
    if (rule === 'equal' && a2 === a1) continue;
    if (rule === 'equal' && rng.chance(0.5) && a2 < a1) a2 = a1 + rng.int(1, 3);
    const b1 = A - a1 * x, b2 = B - a2 * x;
    if (Math.abs(b1) > 60 || Math.abs(b2) > 60 || B < 10) continue;
    return { x, A, B, e1: [a1, b1], e2: [a2, b2] };
  }
}

/** The working for the equation a relationship gives, ending on x. */
function solving(rule, [a1, b1], [a2, b2], x) {
  const e1 = linear(a1, b1), e2 = linear(a2, b2);
  const num = (n) => (n < 0 ? `−${-n}` : String(n));
  const steps = [];
  if (rule === 'equal') {
    const [hi, lo] = a1 > a2 ? [[a1, b1], [a2, b2]] : [[a2, b2], [a1, b1]];
    const k = hi[0] - lo[0], rhs = lo[1] - hi[1];
    steps.push(`${e1} = ${e2}`, `Take ${linear(lo[0], 0)} from both sides: ${linear(k, hi[1])} = ${num(lo[1])}`);
    if (hi[1] !== 0) steps.push(`${hi[1] > 0 ? `Take ${hi[1]} from` : `Add ${-hi[1]} to`} both sides: ${linear(k, 0)} = ${num(rhs)}`);
    if (k !== 1) steps.push(`Divide by ${k}: x = ${x}`);
    return steps.join('. ');
  }
  const k = a1 + a2, c = b1 + b2, S = Number(rule);
  return `(${e1}) + (${e2}) = ${S}. Collect: ${linear(k, c)} = ${S}`
    + `${c === 0 ? '' : `, so ${linear(k, 0)} = ${S - c}`}${k === 1 ? '' : `, and x = ${S - c} ÷ ${k} = ${x}`}`;
}

/** Where two angles with a relationship sit, and the figure that shows them. */
const SETTINGS = {
  vertical: { rule: 'equal', words: 'are vertical angles', why: 'Vertical angles are equal, so set them equal' },
  corresponding: { rule: 'equal', words: 'are corresponding angles on parallel lines',
    why: 'Corresponding angles on parallel lines are equal, so set them equal' },
  'alternate interior': { rule: 'equal', words: 'are alternate interior angles on parallel lines',
    why: 'Alternate interior angles on parallel lines are equal, so set them equal' },
  'linear pair': { rule: '180', words: 'make a straight line', why: 'Angles that make a straight line add to 180°' },
  'same-side interior': { rule: '180', words: 'are same-side interior angles on parallel lines',
    why: 'Same-side interior angles on parallel lines add to 180°, they are not equal' },
  complementary: { rule: '90', words: 'make a right angle', why: 'Angles that make a right angle add to 90°' },
};
const PAIRS_AT = {
  corresponding: [{ line: 'top', spot: 'TR' }, { line: 'bottom', spot: 'TR' }],
  'alternate interior': [{ line: 'top', spot: 'BL' }, { line: 'bottom', spot: 'TR' }],
  'same-side interior': [{ line: 'top', spot: 'BR' }, { line: 'bottom', spot: 'TR' }],
};

function exprFigure(setting, A, B, l1, l2, answer) {
  const base = 0;
  if (setting === 'vertical') {
    return figure([
      { kind: 'segment', from: toward(base, 3.8), to: toward(base + 180, 3.8), tone: LINE },
      { kind: 'segment', from: toward(base + A, 3.8), to: toward(base + A + 180, 3.8), tone: LINE },
      angleMarks(base, base + A, { label: l1, answer: answer && deg(A) }),
      angleMarks(base + 180, base + 180 + A, { label: l2, answer: answer && deg(B) }),
    ]);
  }
  if (setting === 'linear pair' || setting === 'complementary') {
    const total = setting === 'complementary' ? 90 : 180;
    const start = 0;
    return figure([
      ray(start), ray(start + total), ...(total === 180 ? [] : [square(start, [0, 0], 0.3)]), ray(start + A),
      angleMarks(start, start + A, { label: l1, answer: answer && deg(A) }),
      angleMarks(start + A, start + total, { label: l2, answer: answer && deg(B) }),
    ]);
  }
  // On parallel lines the expressions sit on the pair's two spots. TR and
  // BL measure the transversal's direction, BR its supplement.
  const [p, q] = PAIRS_AT[setting];
  const d = p.spot === 'BR' ? 180 - A : A;
  return transversalFigure(d, p, q, { givenLabel: l1, askedLabel: l2, givenAnswer: answer && deg(A),
    askedAnswer: answer && deg(B), askedTone: false });
}

function solveForX(rng, setting = rng.pick(Object.keys(SETTINGS))) {
  const { rule, words, why } = SETTINGS[setting];
  const { x, A, B, e1, e2 } = expressions(rng, rule);
  const askAngle = rng.chance(0.3);
  const s1 = sized(e1), s2 = sized(e2);
  const check = rule === 'equal' ? `both come to ${A}` : `${A} + ${B} = ${rule}`;
  return {
    // The figure carries letters, the prompt the expressions: an expression
    // written inside a narrow angle runs across its arms.
    prompt: [T.prose(`Angles p = ${s1} and q = ${s2} ${words}. ${askAngle ? 'How big is p?' : 'What is x?'}`)],
    text: `angle equation: ${setting}, ${ascii(...e1)}, ${ascii(...e2)}, find ${askAngle ? ascii(...e1) : 'x'}`,
    answer: { type: 'int', value: askAngle ? A : x },
    visual: exprFigure(setting, A, B, 'p', 'q', true),
    explain: `${why}: ${solving(rule, e1, e2, x)}. `
      + (askAngle ? `That is x, not p: put it back in, p = ${putIn(...e1, x)} = ${A}. So p = ${deg(A)}.`
        : `Check: ${putIn(...e1, x)} = ${A} and ${putIn(...e2, x)} = ${B}, and ${check}. So x = ${x}.`),
  };
}

const CHOICES = [
  { id: 'equal', label: 'Set them equal' },
  { id: '180', label: 'Add them to 180°' },
  { id: '90', label: 'Add them to 90°' },
  { id: 'none', label: 'No equation: nothing ties them' },
];
/** Relationships in words, and which equation each gives. */
const SAID = {
  equal: [
    ['are vertical angles', 'Vertical angles are equal'],
    ['are corresponding angles on parallel lines', 'Corresponding angles on parallel lines are equal'],
    ['are alternate interior angles on parallel lines', 'Alternate interior angles on parallel lines are equal'],
    ['are alternate exterior angles on parallel lines', 'Alternate exterior angles on parallel lines are equal'],
  ],
  180: [
    ['form a linear pair', 'A linear pair makes a straight line, 180°'],
    ['are supplementary', 'Supplementary angles add to 180°'],
    ['are same-side interior angles on parallel lines', 'Same-side interior angles on parallel lines add to 180°, they are not equal'],
    ['are same-side exterior angles on parallel lines', 'Same-side exterior angles on parallel lines add to 180°'],
  ],
  90: [
    ['are complementary', 'Complementary angles add to 90°'],
    ['together make a right angle', 'Together they are a right angle, 90°'],
  ],
  none: [
    ['are corresponding angles on two lines that are not parallel', 'Corresponding angles are equal only when the lines are parallel, and these are not'],
    ['are alternate interior angles on two lines that are not parallel', 'Alternate interior angles are equal only when the lines are parallel, and these are not'],
    ['are same-side interior angles on two lines that are not parallel', 'Same-side interior angles add to 180° only when the lines are parallel, and these are not'],
    ['share a vertex and a side', 'Sharing a vertex and a side says nothing about their sizes'],
  ],
};

function whichEquation(rng) {
  const rule = rng.pick(['equal', '180', '90', 'none']);
  const at = rng.int(0, SAID[rule].length - 1);
  const [words, reason] = SAID[rule][at];
  const { e1, e2 } = expressions(rng, rule === 'none' ? rng.pick(['equal', '180']) : rule);
  const s1 = sized(e1), s2 = sized(e2);
  const conclusion = {
    equal: `so set them equal: ${linear(...e1)} = ${linear(...e2)}`,
    180: `so add them to 180: (${linear(...e1)}) + (${linear(...e2)}) = 180`,
    90: `so add them to 90: (${linear(...e1)}) + (${linear(...e2)}) = 90`,
    none: 'so no equation can be written from that alone',
  }[rule];
  return {
    prompt: [T.prose(`Angles of ${s1} and ${s2} ${words}. Which equation finds x?`)],
    text: `which equation: ${words}, ${ascii(...e1)}, ${ascii(...e2)}`,
    answer: { type: 'choice', value: rule, options: CHOICES },
    visual: null,
    explain: `${reason}, ${conclusion}.`,
  };
}

const CONTENT = [complementary, supplementary, crossing, aroundPoint, parallel, (rng) => solveForX(rng), whichEquation];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
