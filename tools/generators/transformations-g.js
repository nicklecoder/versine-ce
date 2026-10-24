/**
 * Catalogue authoring tool: builds the problem library for transformations
 * of the plane.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 *
 * Every `text` names the point and the move in a small fixed vocabulary --
 * `reflect x-axis`, `rotate 90 ccw`, `dilate 3/2 about (1, -2)` -- so
 * scripts/check-answers.py can apply the move again from its own rules. A
 * figure question gives both triangles, and the checker names the move from
 * the coordinates alone: same size, same way round, same direction.
 *
 * Each question is drawn: the triangle, its letters, the mirror or the
 * centre, and on reveal the image, primed.
 */
import * as T from '../terms.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/transformations-g.js';

const LINE = 'var(--vec-1)', GIVEN = 'var(--vec-2)', ASKED = 'var(--gold)', RESULT = 'var(--result)';
const SPAN = 9;
const PLANE = { kind: 'plane', xRange: [-SPAN, SPAN], yRange: [-SPAN, SPAN], grid: 1 };

const minus = (n) => (n < 0 ? `−${-n}` : `${n}`);
const pt = ([x, y]) => `(${minus(x)}, ${minus(y)})`;
const ascii = ([x, y]) => `(${x}, ${y})`;
const pairAnswer = ([x, y]) => ({ type: 'pair', value: { x: { n: x, d: 1 }, y: { n: y, d: 1 } } });
const fits = (P, lim = SPAN - 1) => P.every(([x, y]) => Math.abs(x) <= lim && Math.abs(y) <= lim);
const NAMES = ['A', 'B', 'C'];
const prime = (n) => `${n}′`;
/** A fraction as it is written in the text: 3/2, 2. */
const kText = ([n, d]) => (d === 1 ? `${n}` : `${n}/${d}`);
const kSaid = ([n, d]) => (d === 1 ? `${n}` : `${n}/${d}`);

/** Twice the signed area: positive when A, B, C run counterclockwise. */
const turn = ([A, B, C]) => (B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]);

/** A scalene triangle on the grid, not too thin, with no two sides alike, inside `lim`. */
function triangle(rng, lim = 6) {
  for (;;) {
    const P = Array.from({ length: 3 }, () => [rng.int(-lim, lim), rng.int(-lim, lim)]);
    const d2 = (p, q) => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2;
    const sides = [d2(P[0], P[1]), d2(P[1], P[2]), d2(P[2], P[0])];
    if (Math.abs(turn(P)) < 8 || new Set(sides).size < 3 || Math.min(...sides) < 5) continue;
    return P;
  }
}

/** The marks for a triangle: its sides and its lettered corners. */
function shape(P, tone, names, asked = -1) {
  return [{ kind: 'path', points: [...P, P[0]], tone },
    ...P.map((p, i) => ({ kind: 'point', at: p, label: names[i], tone: i === asked ? ASKED : tone }))];
}
/** A mirror line across the whole grid. */
function mirror(kind, k = 0) {
  const e = SPAN;
  const ends = { 'x-axis': [[-e, 0], [e, 0]], 'y-axis': [[0, -e], [0, e]], 'x =': [[k, -e], [k, e]], 'y =': [[-e, k], [e, k]],
    'y = x': [[-e, -e], [e, e]], 'y = -x': [[-e, e], [e, -e]] }[kind];
  return { kind: 'segment', from: ends[0], to: ends[1], tone: GIVEN, dashed: true };
}
const centre = (c) => ({ kind: 'point', at: c, label: c[0] === 0 && c[1] === 0 ? 'O' : 'centre', tone: GIVEN });

/** The figure for one corner's image: the triangle, what it moves by, and the image on reveal. */
function figure(P, image, asked, extra = []) {
  return { ...PLANE, marks: [...extra, ...shape(P, LINE, NAMES, asked)],
    answer: [{ kind: 'point', at: image[asked], label: prime(NAMES[asked]), tone: 'var(--result)' },
      { kind: 'path', points: [...image, image[0]], tone: 'var(--result)' },
      ...image.map((p, i) => (i === asked ? null : { kind: 'point', at: p, label: prime(NAMES[i]), tone: 'var(--result)' })).filter(Boolean)] };
}

/**
 * Draw a triangle that, moved by `move`, stays on the grid, and pick the
 * corner to ask about -- one the move actually moves.
 */
function setUp(rng, move, lim = 6) {
  for (;;) {
    const P = triangle(rng, lim);
    const image = P.map(move);
    if (!fits(image)) continue;
    const moved = [0, 1, 2].filter((i) => image[i][0] !== P[i][0] || image[i][1] !== P[i][1]);
    if (moved.length < 2) continue;
    return { P, image, asked: rng.pick(moved) };
  }
}

const ask = (P, asked, what) => [T.prose(`Triangle ABC is ${what}. ${NAMES[asked]} is at ${pt(P[asked])}. Where does it land?`)];

// ── Translate ───────────────────────────────────────────────────────────

const across = (a) => (a === 0 ? '' : `${Math.abs(a)} ${a > 0 ? 'right' : 'left'}`);
const upDown = (b) => (b === 0 ? '' : `${Math.abs(b)} ${b > 0 ? 'up' : 'down'}`);
const slide = (a, b) => [across(a), upDown(b)].filter(Boolean).join(' and ');
const plus = (n) => (n < 0 ? ` − ${-n}` : ` + ${n}`);

function translate(rng) {
  const a = rng.int(-7, 7), b = rng.int(-7, 7);
  if (a === 0 && b === 0) return translate(rng);
  const move = ([x, y]) => [x + a, y + b];
  const { P, image, asked } = setUp(rng, move);
  const Q = P[asked], R = image[asked];
  if (rng.chance(0.35)) {
    // The move shown by one corner, and asked of another.
    const other = [0, 1, 2].find((i) => i !== asked);
    return {
      prompt: [T.prose(`Triangle ABC is translated so that ${NAMES[other]} ${pt(P[other])} lands on ${prime(NAMES[other])} ${pt(image[other])}. `
        + `Where does ${NAMES[asked]} ${pt(Q)} land?`)],
      text: `translate ${ascii(Q)} like ${ascii(P[other])} -> ${ascii(image[other])}`,
      answer: pairAnswer(R),
      visual: figure(P, image, asked, [{ kind: 'point', at: image[other], label: prime(NAMES[other]), tone: GIVEN }]),
      explain: `${NAMES[other]} went from ${pt(P[other])} to ${pt(image[other])}: x from ${minus(P[other][0])} to ${minus(image[other][0])}, a change of ${minus(a)}, `
        + `and y from ${minus(P[other][1])} to ${minus(image[other][1])}, a change of ${minus(b)}. A translation moves every point the same way, so ${NAMES[asked]} goes ${slide(a, b)} too: `
        + `(${minus(Q[0])}${plus(a)}, ${minus(Q[1])}${plus(b)}) = ${pt(R)}. So ${pt(R)}.`,
    };
  }
  const asRule = rng.chance(0.4);
  return {
    prompt: ask(P, asked, asRule ? `moved by the rule (x, y) → (x${plus(a)}, y${plus(b)})`.replace(' + 0', '').replace(' − 0', '')
      : `translated ${slide(a, b)}`),
    text: `translate ${ascii(Q)} by ${ascii([a, b])}`,
    answer: pairAnswer(R),
    visual: figure(P, image, asked),
    explain: `${a ? `${across(a)} ${a > 0 ? 'adds' : 'takes'} ${Math.abs(a)} ${a > 0 ? 'to' : 'from'} x` : 'x does not change'}, `
      + `and ${b ? `${upDown(b)} ${b > 0 ? 'adds' : 'takes'} ${Math.abs(b)} ${b > 0 ? 'to' : 'from'} y` : 'y does not change'}: `
      + `(${minus(Q[0])}${plus(a)}, ${minus(Q[1])}${plus(b)}) = ${pt(R)}. `
      + `(Across is x and up is y: the two never mix.) So ${pt(R)}.`,
  };
}

// ── Reflect ─────────────────────────────────────────────────────────────

const REFLECT = {
  'x-axis': { move: ([x, y]) => [x, -y], said: 'the x-axis' },
  'y-axis': { move: ([x, y]) => [-x, y], said: 'the y-axis' },
  'y = x': { move: ([x, y]) => [y, x], said: 'the line y = x' },
  'y = -x': { move: ([x, y]) => [-y, -x], said: 'the line y = −x' },
};
const lineMove = (kind, k) => (kind === 'x =' ? ([x, y]) => [2 * k - x, y] : ([x, y]) => [x, 2 * k - y]);

function reflectAxis(rng) {
  const roll = rng.int(0, 9);
  if (roll >= 6) {
    const kind = roll >= 8 ? 'y =' : 'x =';
    const k = rng.nonZero(-4, 4);
    const move = lineMove(kind, k);
    const { P, image, asked } = setUp(rng, move);
    const Q = P[asked], R = image[asked];
    const i = kind === 'x =' ? 0 : 1, d = Q[i] - k;
    const name = `${kind[0]} = ${minus(k)}`;
    return {
      prompt: ask(P, asked, `reflected over the line ${name}`),
      text: `reflect ${ascii(Q)} over ${kind[0]} = ${k}`,
      answer: pairAnswer(R),
      visual: figure(P, image, asked, [{ ...mirror(kind, k), label: name }]),
      explain: `The line ${name} is ${kind === 'x =' ? 'upright' : 'level'}, so only ${kind[0]} changes. `
        + `${NAMES[asked]} is ${Math.abs(d)} ${kind === 'x =' ? (d > 0 ? 'to the right of' : 'to the left of') : (d > 0 ? 'above' : 'below')} it, `
        + `so its image is ${Math.abs(d)} ${kind === 'x =' ? (d > 0 ? 'to the left' : 'to the right') : (d > 0 ? 'below' : 'above')}: ${minus(k)} ${d > 0 ? '−' : '+'} ${Math.abs(d)} = ${minus(R[i])}. `
        + `(Just changing the sign, to ${minus(-Q[i])}, reflects over ${kind[0]} = 0, the ${kind === 'x =' ? 'y' : 'x'}-axis, not over this line.) So ${pt(R)}.`,
    };
  }
  const kind = roll < 3 ? 'x-axis' : 'y-axis';
  const { move, said } = REFLECT[kind];
  const { P, image, asked } = setUp(rng, move);
  const Q = P[asked], R = image[asked];
  const keep = kind === 'x-axis' ? 'x' : 'y', flip = kind === 'x-axis' ? 'y' : 'x';
  return {
    prompt: ask(P, asked, `reflected over ${said}`),
    text: `reflect ${ascii(Q)} over ${kind}`,
    answer: pairAnswer(R),
    visual: figure(P, image, asked, [mirror(kind)]),
    explain: `The ${kind} is the mirror. ${kind === 'x-axis'
      ? `${NAMES[asked]} is ${Math.abs(Q[1])} ${Q[1] > 0 ? 'above' : 'below'} it, so its image is ${Math.abs(Q[1])} ${Q[1] > 0 ? 'below' : 'above'}`
      : `${NAMES[asked]} is ${Math.abs(Q[0])} ${Q[0] > 0 ? 'to the right of' : 'to the left of'} it, so its image is ${Math.abs(Q[0])} ${Q[0] > 0 ? 'to the left' : 'to the right'}`}: `
      + `${keep} stays and ${flip} changes sign, ${pt(Q)} → ${pt(R)}. (The axis named is the mirror, and points on it stay put: over the ${kind} it is ${flip} that changes, not ${keep}.) So ${pt(R)}.`,
  };
}

function reflectDiagonal(rng) {
  const kind = rng.chance(0.6) ? 'y = x' : 'y = -x';
  const { move, said } = REFLECT[kind];
  const { P, image, asked } = setUp(rng, move);
  const Q = P[asked], R = image[asked];
  return {
    prompt: ask(P, asked, `reflected over ${said}`),
    text: `reflect ${ascii(Q)} over ${kind}`,
    answer: pairAnswer(R),
    visual: figure(P, image, asked, [{ ...mirror(kind), label: kind === 'y = x' ? 'y = x' : 'y = −x' }]),
    explain: (kind === 'y = x'
      ? `The line y = x runs through every point whose two coordinates are equal, and reflecting over it swaps them: (x, y) → (y, x). `
      : `The line y = −x runs through every point whose coordinates are opposites, and reflecting over it swaps them and changes both signs: (x, y) → (−y, −x). `)
      + `${pt(Q)} → ${pt(R)}. `
      + (kind === 'y = x' ? `(Changing a sign is a reflection over an axis; here nothing changes sign.) ` : `(Swapping without the signs is y = x, the other diagonal.) `)
      + `So ${pt(R)}.`,
  };
}

// ── Rotate ──────────────────────────────────────────────────────────────

const ROTATE = {
  '90 ccw': { move: ([x, y]) => [-y, x], said: '90° counterclockwise', rule: '(x, y) → (−y, x)' },
  '180': { move: ([x, y]) => [-x, -y], said: '180°', rule: '(x, y) → (−x, −y)' },
  '90 cw': { move: ([x, y]) => [y, -x], said: '90° clockwise', rule: '(x, y) → (y, −x)' },
  '270 ccw': { move: ([x, y]) => [y, -x], said: '270° counterclockwise', rule: '(x, y) → (y, −x)' },
};
const about = (move, [h, k]) => ([x, y]) => { const [a, b] = move([x - h, y - k]); return [a + h, b + k]; };

function rotate(rng) {
  const turnKind = rng.pick(['90 ccw', '90 ccw', '180', '90 cw', '90 cw', '270 ccw']);
  const { move, said, rule } = ROTATE[turnKind];
  const c = rng.chance(0.2) ? [rng.nonZero(-3, 3), rng.nonZero(-3, 3)] : [0, 0];
  const atOrigin = c[0] === 0 && c[1] === 0;
  const { P, image, asked } = setUp(rng, about(move, c), atOrigin ? 6 : 5);
  const Q = P[asked], R = image[asked], rel = [Q[0] - c[0], Q[1] - c[1]], relR = move(rel);
  const fig = figure(P, image, asked, [centre(c), { kind: 'segment', from: c, to: Q, tone: GIVEN, dashed: true }]);
  fig.answer.push({ kind: 'segment', from: c, to: R, tone: 'var(--result)', dashed: true });
  return {
    prompt: ask(P, asked, `rotated ${said} about ${atOrigin ? 'the origin' : pt(c)}`),
    text: `rotate ${ascii(Q)} by ${turnKind} about ${ascii(c)}`,
    answer: pairAnswer(R),
    visual: fig,
    explain: (atOrigin ? '' : `Measured from the centre ${pt(c)}, ${NAMES[asked]} is ${pt(rel)} away. `)
      + `A turn of ${said} is ${rule}${turnKind === '270 ccw' ? ', the same as 90° clockwise' : ''}: ${pt(rel)} → ${pt(relR)}. `
      + (atOrigin ? '' : `Add the centre back: ${pt(relR)} + ${pt(c)} = ${pt(R)}. `)
      + (turnKind === '180' ? '(A half turn changes both signs and swaps nothing.) '
        : `(Check the direction with (1, 0): this turn takes it to ${pt(move([1, 0]))}. The rule ${turnKind === '90 ccw' ? '(y, −x)' : '(−y, x)'} turns the other way.) `)
      + `So ${pt(R)}.`,
  };
}

// ── Dilate ──────────────────────────────────────────────────────────────

const FACTORS = [[2, 1], [2, 1], [3, 1], [1, 2], [1, 2], [3, 2], [1, 3]];

function dilate(rng) {
  const [n, d] = rng.pick(FACTORS);
  const c = rng.chance(0.3) ? [rng.int(-3, 3), rng.int(-3, 3)] : [0, 0];
  const atOrigin = c[0] === 0 && c[1] === 0;
  for (;;) {
    // Every corner a whole number of steps of d from the centre, so the image is on the grid.
    const raw = triangle(rng, n > d ? 4 : 8);
    const P = raw.map(([x, y]) => [c[0] + Math.round((x - c[0]) / d) * d, c[1] + Math.round((y - c[1]) / d) * d]);
    if (Math.abs(turn(P)) < 6 || !fits(P) || P.some((p, i) => P.findIndex((q) => q[0] === p[0] && q[1] === p[1]) !== i)) continue;
    const move = ([x, y]) => [c[0] + ((x - c[0]) * n) / d, c[1] + ((y - c[1]) * n) / d];
    const image = P.map(move);
    if (!fits(image)) continue;
    const moved = [0, 1, 2].filter((i) => image[i][0] !== P[i][0] || image[i][1] !== P[i][1]);
    if (moved.length < 3) continue;
    const asked = rng.pick(moved), Q = P[asked], R = image[asked], rel = [Q[0] - c[0], Q[1] - c[1]];
    const k = kSaid([n, d]);
    const times = (v) => `${minus(v)} × ${k}`;
    const fig = figure(P, image, asked, [centre(c)]);
    return {
      prompt: ask(P, asked, `dilated by a scale factor of ${k} about ${atOrigin ? 'the origin' : pt(c)}`),
      text: `dilate ${ascii(Q)} by ${kText([n, d])} about ${ascii(c)}`,
      answer: pairAnswer(R),
      visual: fig,
      explain: (atOrigin
        ? `About the origin, a dilation multiplies both coordinates by the scale factor: (${times(Q[0])}, ${times(Q[1])}) = ${pt(R)}. `
        : `Measure from the centre first: ${NAMES[asked]} is ${pt(rel)} from ${pt(c)}. Multiply that by ${k}: ${pt(rel.map((v) => (v * n) / d))}, `
          + `then add the centre back: ${pt(R)}. (Multiplying ${pt(Q)} itself would dilate about the origin instead.) `)
      + (n < d ? `A factor under 1 shrinks the triangle towards the centre. ` : `A factor over 1 stretches the triangle away from the centre. `)
      + `So ${pt(R)}.`,
    };
  }
}

// ── Sequences ───────────────────────────────────────────────────────────

/** Steps in the text's own words, with what they do and how they are said. */
const STEPS = {
  'reflect x-axis': { move: REFLECT['x-axis'].move, said: 'reflected over the x-axis', imp: 'reflect over the x-axis', how: 'y changes sign' },
  'reflect y-axis': { move: REFLECT['y-axis'].move, said: 'reflected over the y-axis', imp: 'reflect over the y-axis', how: 'x changes sign' },
  'reflect y = x': { move: REFLECT['y = x'].move, said: 'reflected over y = x', imp: 'reflect over y = x', how: 'the coordinates swap' },
  'rotate 90 ccw': { move: ROTATE['90 ccw'].move, said: 'rotated 90° counterclockwise about the origin', imp: 'rotate 90° counterclockwise', how: '(x, y) → (−y, x)' },
  'rotate 180': { move: ROTATE['180'].move, said: 'rotated 180° about the origin', imp: 'rotate 180°', how: 'both signs change' },
  'rotate 90 cw': { move: ROTATE['90 cw'].move, said: 'rotated 90° clockwise about the origin', imp: 'rotate 90° clockwise', how: '(x, y) → (y, −x)' },
  'dilate 2': { move: ([x, y]) => [2 * x, 2 * y], said: 'dilated by 2 about the origin', imp: 'dilate by 2', how: 'both double' },
};
function translateStep(rng) {
  const a = rng.nonZero(-5, 5), b = rng.nonZero(-5, 5);
  return { key: `translate (${a}, ${b})`, move: ([x, y]) => [x + a, y + b], said: `translated ${slide(a, b)}`, imp: `translate ${slide(a, b)}`,
    how: `add ${minus(a)} to x and ${minus(b)} to y` };
}

function sequence(rng) {
  const keys = Object.keys(STEPS);
  const named = (key) => ({ key, ...STEPS[key] });
  const pickStep = () => (rng.chance(0.35) ? translateStep(rng) : named(rng.pick(keys)));
  for (;;) {
    const s1 = pickStep(), s2 = pickStep();
    if (s1.key === s2.key) continue;
    if (s1.key.startsWith('translate') && s2.key.startsWith('translate')) continue;
    const move = (p) => s2.move(s1.move(p));
    const P = triangle(rng, 5), image = P.map(move);
    const mid = P.map(s1.move);
    if (!fits(image) || !fits(mid, SPAN)) continue;
    const asked = rng.int(0, 2), Q = P[asked], M = mid[asked], R = image[asked];
    // Each step has to move the corner asked about, or the first one teaches nothing.
    if ((R[0] === Q[0] && R[1] === Q[1]) || (M[0] === Q[0] && M[1] === Q[1]) || (M[0] === R[0] && M[1] === R[1])) continue;
    const other = s1.move(s2.move(Q));
    const order = other[0] !== R[0] || other[1] !== R[1];
    return {
      prompt: [T.prose(`Triangle ABC is ${s1.said}, then ${s2.said}. ${NAMES[asked]} is at ${pt(Q)}. Where does it end up?`)],
      text: `sequence ${ascii(Q)}: ${s1.key}; ${s2.key}`,
      answer: pairAnswer(R),
      visual: figure(P, image, asked),
      explain: `One at a time, in order. First ${s1.imp}: ${s1.how}, ${pt(Q)} → ${pt(M)}. `
        + `Then ${s2.imp}: ${s2.how}, ${pt(M)} → ${pt(R)}. `
        + (order ? `(In the other order it ends at ${pt(other)}: the order matters.) ` : '(Here the other order happens to end in the same place.) ')
        + `So ${pt(R)}.`,
    };
  }
}

// ── Which transformation, and congruent or similar ──────────────────────

const vec = (p, q) => pt([q[0] - p[0], q[1] - p[1]]);
const way = (P) => (turn(P) > 0 ? 'counterclockwise' : 'clockwise');
/** Why the picture is the move it is: size from a side, way round from the corners, direction from the side again. */
function reason(P, image, want, how) {
  const side = `AB goes ${vec(P[0], P[1])} and A′B′ goes ${vec(image[0], image[1])}`;
  if (want === 'dilation') {
    const k = Math.hypot(image[1][0] - image[0][0], image[1][1] - image[0][1]) / Math.hypot(P[1][0] - P[0][0], P[1][1] - P[0][1]);
    return `Compare a side: ${side}, ${k > 1 ? `${Math.round(k)} times as long` : `${k === 0.5 ? 'half' : `1/${Math.round(1 / k)}`} as long`}. `
      + 'The size has changed, and a dilation is the only move that changes size.';
  }
  const same = `Compare a side: ${side}, the same length, so the size is kept. `;
  if (want === 'translation') return `${same}It points the same way too, and ${how}: a slide, with no turn and no flip.`;
  if (want === 'reflection') {
    return `${same}But A → B → C runs ${way(P)} and A′ → B′ → C′ runs ${way(image)}: the triangle has been turned over. `
      + 'A rotation never does that, however far it turns; only a reflection flips a shape.';
  }
  return `${same}A → B → C and A′ → B′ → C′ both run ${way(P)}, so it has not been flipped, but the side points a new way: it has turned.`;
}

const MOVES = [
  { id: 'translation', label: 'A translation' },
  { id: 'reflection', label: 'A reflection' },
  { id: 'rotation', label: 'A rotation' },
  { id: 'dilation', label: 'A dilation' },
];

function whichMove(rng, want = rng.pick(['translation', 'reflection', 'rotation', 'dilation'])) {
  // `reveal` draws, with the answer, what does the moving: the slide, the
  // mirror, the centre of the turn or of the dilation.
  let move, how, reveal, n = 1, d = 1;
  if (want === 'translation') {
    const a = rng.int(-6, 6), b = rng.int(-6, 6);
    if (Math.abs(a) + Math.abs(b) < 4) return whichMove(rng, want);
    move = ([x, y]) => [x + a, y + b];
    how = `every corner moved ${slide(a, b)}`;
    reveal = (P, image) => P.map((p, i) => ({ kind: 'segment', from: p, to: image[i], tone: RESULT, dashed: true }));
  } else if (want === 'reflection') {
    const kind = rng.pick(['x-axis', 'y-axis', 'y = x', 'y = -x', 'x =', 'y =']);
    const k = rng.nonZero(-3, 3);
    move = kind === 'x =' || kind === 'y =' ? lineMove(kind, k) : REFLECT[kind].move;
    const name = kind === 'x =' || kind === 'y =' ? `${kind[0]} = ${minus(k)}` : kind === 'y = -x' ? 'y = −x' : kind;
    reveal = () => [{ ...mirror(kind, k), tone: RESULT, label: name }];
  } else if (want === 'rotation') {
    const t = rng.pick(['90 ccw', '180', '90 cw']);
    const c = rng.chance(0.3) ? [rng.int(-2, 2), rng.int(-2, 2)] : [0, 0];
    move = about(ROTATE[t].move, c);
    reveal = (P, image) => [{ ...centre(c), tone: RESULT, label: `turned ${ROTATE[t].said}` },
      { kind: 'segment', from: c, to: P[0], tone: RESULT, dashed: true }, { kind: 'segment', from: c, to: image[0], tone: RESULT, dashed: true }];
  } else {
    [n, d] = rng.pick([[2, 1], [3, 1], [1, 2]]);
    move = ([x, y]) => [(x * n) / d, (y * n) / d];
    // Rays from the centre through each corner and its image.
    reveal = (P, image) => [{ ...centre([0, 0]), tone: RESULT, label: `× ${n > d ? n : `1/${d}`}` },
      ...P.map((p, i) => ({ kind: 'segment', from: [0, 0], to: n > d ? image[i] : p, tone: RESULT, dashed: true }))];
  }
  for (let tries = 0; tries < 200; tries++) {
    // Halving needs even corners; tripling needs small ones.
    const P = triangle(rng, n > d ? 2 : want === 'dilation' ? 3 : 6).map((p) => p.map((v) => v * d));
    const image = P.map(move);
    if (!fits(P) || !fits(image) || image.some((p) => p.some((v) => !Number.isInteger(v)))) continue;
    // The two triangles must not overlap so much that they cannot be told apart.
    if (image.some((p, i) => p[0] === P[i][0] && p[1] === P[i][1]) && want !== 'reflection') continue;
    const said = (Q) => Q.map(ascii).join(', ');
    return {
      prompt: [T.prose('Which single move takes triangle ABC to triangle A′B′C′?')],
      text: `which move: ${said(P)} -> ${said(image)}`,
      answer: { type: 'choice', value: want, options: MOVES },
      visual: { ...PLANE, marks: [...shape(P, LINE, NAMES), ...shape(image, GIVEN, NAMES.map(prime))], answer: reveal(P, image) },
      explain: `${reason(P, image, want, how)} So ${MOVES.find((m) => m.id === want).label.toLowerCase()}.`,
    };
  }
  return whichMove(rng, want);
}

const KINDS = [
  { id: 'congruent', label: 'Congruent' },
  { id: 'similar', label: 'Similar, not congruent' },
  { id: 'neither', label: 'Neither' },
];
/** v + c as a rule writes it: x + 3, y − 2, x. */
const shifted = (v, c) => (c === 0 ? v : `${v}${plus(c)}`);
/** k·v with k whole, or v/2 for a half. */
const scaled = (k, v) => (k < 0 ? `−${scaled(-k, v)}` : k === 0.5 ? `${v}/2` : k === 1 ? v : `${k}${v}`);
/**
 * Rules on coordinates, built from small numbers so there are plenty, each
 * with its verdict and why. `a` and `b` are slides, `k` and `m` different
 * factors other than 1.
 */
const RULES = [
  ['congruent', ({ a, b }) => [`(${shifted('x', a)}, ${shifted('y', b)})`, 'adds to each coordinate: a translation']],
  ['congruent', ({ a }) => [`(${shifted('−x', a)}, y)`, 'changes the sign of x, then slides: a reflection and a translation']],
  ['congruent', ({ b }) => [`(x, ${shifted('−y', b)})`, 'changes the sign of y, then slides: a reflection and a translation']],
  ['congruent', ({ a }) => [`(${shifted('y', a)}, x)`, 'swaps the coordinates, then slides: a reflection over y = x and a translation']],
  ['congruent', ({ a, b }) => [`(${shifted('−y', a)}, ${shifted('x', b)})`, 'is a 90° rotation about the origin, then a slide']],
  ['congruent', ({ a, b }) => [`(${shifted('−x', a)}, ${shifted('−y', b)})`, 'is a 180° rotation about the origin, then a slide']],
  ['similar', ({ k }) => [`(${scaled(k, 'x')}, ${scaled(k, 'y')})`, `multiplies both coordinates by ${k === 0.5 ? '1/2' : k}: a dilation`]],
  ['similar', ({ k, a, b }) => [`(${shifted(scaled(k, 'x'), a)}, ${shifted(scaled(k, 'y'), b)})`, `multiplies both coordinates by ${k === 0.5 ? '1/2' : k}, then slides: a dilation and a translation`]],
  ['similar', ({ k }) => [`(${scaled(-k, 'x')}, ${scaled(k, 'y')})`, `multiplies both by ${k === 0.5 ? '1/2' : k} and changes the sign of x: a dilation and a reflection`]],
  ['similar', ({ k }) => [`(${scaled(k, 'y')}, ${scaled(k, 'x')})`, `swaps the coordinates and multiplies both by ${k === 0.5 ? '1/2' : k}: a reflection and a dilation`]],
  ['neither', ({ k, b }) => [`(${scaled(k, 'x')}, ${shifted('y', b)})`, `multiplies x by ${k === 0.5 ? '1/2' : k} but leaves y alone: a stretch one way only`]],
  ['neither', ({ k, a }) => [`(${shifted('x', a)}, ${scaled(k, 'y')})`, `multiplies y by ${k === 0.5 ? '1/2' : k} but leaves x alone: a stretch one way only`]],
  ['neither', ({ k, m }) => [`(${scaled(k, 'x')}, ${scaled(m, 'y')})`, `multiplies x by ${k === 0.5 ? '1/2' : k} and y by ${m === 0.5 ? '1/2' : m}: two different stretches`]],
  ['neither', ({ k }) => [`(x + ${scaled(k, 'y')}, y)`, 'slides each point across by an amount that grows with its height: a shear, which slants the shape']],
];
const VERDICT = {
  congruent: 'Only rigid moves -- translations, reflections, rotations -- so every length is kept: congruent.',
  similar: 'A dilation by a factor other than 1 changes every length by that factor and keeps the angles: similar, but not congruent.',
  neither: 'Similar figures need every length scaled by the same factor. Here lengths in different directions change by different amounts, so the angles change too: neither. (A stretch one way is not a dilation.)',
};

/** Sequences in words, and their keys for the checker. */
const SEQ_STEPS = [
  ['reflect x-axis', 'reflect over the x-axis', true],
  ['reflect y-axis', 'reflect over the y-axis', true],
  ['reflect y = x', 'reflect over y = x', true],
  ['rotate 90 ccw', 'rotate 90° counterclockwise about the origin', true],
  ['rotate 180', 'rotate 180° about the origin', true],
  ['translate (3, -1)', 'translate 3 right and 1 down', true],
  ['translate (-2, 4)', 'translate 2 left and 4 up', true],
  ['dilate 2', 'dilate by 2 about the origin', false],
  ['dilate 3', 'dilate by 3 about the origin', false],
  ['dilate 1/2', 'dilate by 1/2 about the origin', false],
];

function congruentOrSimilar(rng) {
  if (rng.chance(0.7)) {
    const [want, make] = rng.pick(RULES);
    const k = rng.pick([2, 3, 0.5]);
    const [rule, why] = make({ a: rng.int(-6, 6), b: rng.int(-6, 6), k, m: rng.pick([2, 3, 0.5].filter((v) => v !== k)) });
    return {
      prompt: [T.prose(`A triangle is moved by the rule (x, y) → ${rule}. Is the image congruent to the triangle, similar but not congruent, or neither?`)],
      text: `congruent or similar: (x, y) -> ${rule.replace(/−/g, '-')}`,
      answer: { type: 'choice', value: want, options: KINDS },
      visual: null,
      explain: `The rule ${why}. ${VERDICT[want]}`,
    };
  }
  for (;;) {
    const a = rng.pick(SEQ_STEPS), b = rng.pick(SEQ_STEPS);
    if (a === b) continue;
    // The pair of dilations that undo each other is the interesting case: keep it common.
    const undo = rng.chance(0.15);
    const [s1, s2] = undo ? [SEQ_STEPS[7], SEQ_STEPS[9]] : [a, b];
    const factor = [s1, s2].reduce((k, s) => k * (s[0] === 'dilate 2' ? 2 : s[0] === 'dilate 3' ? 3 : s[0] === 'dilate 1/2' ? 0.5 : 1), 1);
    const want = factor === 1 ? 'congruent' : 'similar';
    return {
      prompt: [T.prose(`A triangle is moved: ${s1[1]}, then ${s2[1]}. Is the image congruent to the triangle, or similar but not congruent?`)],
      text: `congruent or similar: ${s1[0]}; ${s2[0]}`,
      answer: { type: 'choice', value: want, options: KINDS.slice(0, 2) },
      visual: null,
      explain: factor === 1
        ? (s1[2] && s2[2] ? 'Translations, reflections and rotations are rigid: they never change a length. With only those, the image is congruent.'
          : 'Dilating by 2 and then by 1/2 multiplies every length by 2 × 1/2 = 1: the size comes back, so the image is congruent.')
        : `There is a dilation in it, and the lengths end up ${factor > 1 ? `${factor} times as long` : `${factor === 0.5 ? 'half' : `1/${1 / factor}`} as long`}. The angles are kept, so the image is similar, but not congruent.`,
    };
  }
}

function which(rng) {
  return rng.chance(0.45) ? whichMove(rng) : congruentOrSimilar(rng);
}

const CONTENT = [translate, reflectAxis, reflectDiagonal, rotate, dilate, sequence, which];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
