/**
 * Catalogue authoring tool: builds the problem library for transforming functions.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 *
 * Texts carry the equations in ASCII, |..| for absolute value and sqrt(..)
 * for the root, after a prefix naming the question, so that
 * scripts/check-answers.py can test the answer on the functions themselves:
 * a graph moved up 3 is one whose every height is 3 more.
 */
import * as T from '../terms.js';
import { minus } from '../../web/ui/dom.js';
import { previewOf } from '../../web/ui/express.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/transformations-f.js';

const SPAN = 8;
const PLANE = { xRange: [-SPAN, SPAN], yRange: [-SPAN, SPAN], grid: 1 };
const LINE = 'var(--vec-1)';
const FAINT = 'var(--vec-2)';

function curve(f, step = 0.05) {
  const pts = [];
  for (let x = -SPAN; x <= SPAN + 1e-9; x += step) {
    const y = f(x);
    if (Number.isFinite(y) && y >= -SPAN - 1 && y <= SPAN + 1) pts.push([+x.toFixed(2), +y.toFixed(3)]);
  }
  return pts;
}

/** The four families, each as text around an inside and as a function. */
const PARENTS = {
  quadratic: { label: 'y = x²', src: (u) => (u === 'x' ? 'x^2' : `(${u})^2`), f: (t) => t * t },
  abs: { label: 'y = |x|', src: (u) => `|${u}|`, f: Math.abs },
  sqrt: { label: 'y = √x', src: (u) => `sqrt(${u})`, f: (t) => (t >= 0 ? Math.sqrt(t) : NaN) },
  cubic: { label: 'y = x³', src: (u) => (u === 'x' ? 'x^3' : `(${u})^3`), f: (t) => t ** 3 },
};
const FAMILY = Object.keys(PARENTS);

const fracText = (q) => (Number.isInteger(q) ? String(q) : `1/${Math.round(1 / q)}`);
const signedFrac = (q) => `${q < 0 ? '-' : ''}${fracText(Math.abs(q))}`;
/** kx − c, written as it is read: x − 3, 2x + 1, −x, 1/2x. */
function inside(k, c) {
  const kx = k === 1 ? 'x' : k === -1 ? '-x' : `${signedFrac(k)}x`;
  return `${kx}${c === 0 ? '' : ` ${c > 0 ? '-' : '+'} ${Math.abs(c)}`}`;
}
const front = (a) => (a === 1 ? '' : a === -1 ? '-' : signedFrac(a));
const tail = (v) => (v === 0 ? '' : ` ${v < 0 ? '-' : '+'} ${Math.abs(v)}`);

/** a·P(kx − c) + v, as text and as a function. */
function moved(family, { a = 1, k = 1, c = 0, v = 0 } = {}) {
  const P = PARENTS[family];
  return {
    src: `${front(a)}${P.src(inside(k, c))}${tail(v)}`,
    f: (x) => a * P.f(k * x - c) + v,
  };
}

/** ASCII to what the parser draws: the bars become abs(). */
const drawable = (src) => src.replace(/\|([^|]+)\|/g, 'abs($1)');
function eq(src) {
  const r = previewOf(`y = ${drawable(src)}`);
  if (!r.ok) throw new Error(`transformations-f: cannot draw "${src}" — ${r.error}`);
  return r.terms;
}

/**
 * Two graphs by their equations, and what took one to the other. The one it
 * started from is drawn faint once it is answered, the moved one bold.
 */
function compare(base, g, ask, options, value, why, prefix) {
  return {
    prompt: [...eq(g.src), T.prose('compared with'), ...eq(base.src), T.prose(`— ${ask}`)],
    text: `${prefix}: ${base.src} -> ${g.src}`,
    answer: { type: 'choice', value, options },
    visual: { kind: 'plane', ...PLANE, marks: [], answer: [
      { kind: 'path', points: curve(base.f), tone: FAINT, dashed: true },
      { kind: 'path', points: curve(g.f), tone: LINE },
    ] },
    explain: why,
  };
}

const DIRECTIONS = (n) => [
  { id: 'up', label: `Up ${n}` }, { id: 'down', label: `Down ${n}` },
  { id: 'left', label: `Left ${n}` }, { id: 'right', label: `Right ${n}` },
];

/** y = a·f(u) + v drawn by hand, since the parser reads f(x) as f times x. */
function fOf(a, u, v) {
  const coef = a === 1 ? [] : a === -1 ? [T.op('−')] : previewOf(signedFrac(a)).terms;
  const rest = v === 0 ? [] : [T.op(v < 0 ? '−' : '+'), T.num(Math.abs(v))];
  // One piece: short enough always to fit, and never parted from its y =.
  return T.math([T.letter('y'), T.op('='), ...coef, T.letter('f'), T.group(previewOf(u).terms), ...rest]);
}
const at = ([x, y]) => `(${minus(x)}, ${minus(y)})`;

/** Where (p, q) on y = f(x) lands on y = a·f(k(x − h)) + v; k and h are never both set. */
function image(rng, { a = 1, k = 1, h = 0, v = 0 }, why) {
  // Whole numbers throughout: f(2x) needs an even x to halve, ½f(x) an even height.
  const p = Number.isInteger(k) && Math.abs(k) > 1 ? k * rng.int(-3, 3) : rng.int(-6, 6);
  let q = rng.int(-6, 6);
  if (!Number.isInteger(a) && q % Math.round(1 / a) !== 0) q = Math.round(1 / a) * rng.nonZero(-3, 3);
  const X = Math.round(p / k) + h, Y = Math.round(a * q) + v;
  const u = inside(k, k * h);
  return {
    prompt: [T.prose(`The point ${at([p, q])} is on the graph of y = f(x). Where does it land on`), fOf(a, u, v), T.prose('?')],
    text: `image of ${p}, ${q}: ${front(a)}f(${u})${tail(v)}`,
    answer: { type: 'pair', value: { x: { n: X, d: 1 }, y: { n: Y, d: 1 } } },
    visual: null,
    explain: `${why} So ${at([p, q])} lands on ${at([X, Y])}.`,
  };
}

/** A graph to start from: one of the families, perhaps already moved a little. */
function start(rng, { shift = true, lift = true } = {}) {
  const family = rng.pick(FAMILY);
  const plain = rng.chance(0.4);
  return { family, c: plain || !shift ? 0 : rng.int(-4, 4), v: plain || !lift ? 0 : rng.int(-4, 4) };
}

function upDown(rng) {
  const dv = rng.nonZero(-6, 6);
  if (rng.chance(0.5)) {
    return image(rng, { v: dv }, `Adding ${minus(dv)} outside changes every height by ${minus(dv)} and no x.`);
  }
  const s = start(rng);
  // Both graphs turn on the grid, so the move can be seen once it is answered.
  if (Math.abs(s.v + dv) > 6) return upDown(rng);
  return compare(moved(s.family, s), moved(s.family, { ...s, v: s.v + dv }), 'how is it moved?',
    DIRECTIONS(Math.abs(dv)), dv > 0 ? 'up' : 'down',
    `Only the number outside changed, by ${minus(dv)}, and that is added to every height: `
    + `${dv > 0 ? 'up' : 'down'} ${Math.abs(dv)}, as it reads.`, 'moved');
}

function leftRight(rng) {
  const h = rng.nonZero(-6, 6);
  if (rng.chance(0.5)) {
    return image(rng, { h }, `Inside, x ${h > 0 ? '−' : '+'} ${Math.abs(h)} gives f's own x when x is ${Math.abs(h)} ${h > 0 ? 'more' : 'less'}: `
      + `every x moves ${h > 0 ? 'right' : 'left'} ${Math.abs(h)}, against the sign.`);
  }
  const s = start(rng);
  if (Math.abs(s.c + h) > 6) return leftRight(rng);
  const base = moved(s.family, s), g = moved(s.family, { ...s, c: s.c + h });
  return compare(base, g, 'how is it moved?', DIRECTIONS(Math.abs(h)), h > 0 ? 'right' : 'left',
    `Only the number inside changed, ${h > 0 ? `${Math.abs(h)} more taken from` : `${Math.abs(h)} more added to`} x. `
    + `The new graph reaches each height when x is ${Math.abs(h)} ${h > 0 ? 'more' : 'less'}, so it moves `
    + `${h > 0 ? 'right' : 'left'} ${Math.abs(h)}: against the sign.`, 'moved');
}

function stretch(rng) {
  const n = rng.pick([2, 3, 4]);
  const outside = rng.chance(0.5);
  const factor = rng.chance(0.5) ? n : 1 / n;
  if (rng.chance(0.45)) {
    return image(rng, outside ? { a: factor } : { k: factor }, outside
      ? `Multiplying outside multiplies every height by ${fracText(factor)}; x stays.`
      : `Inside, ${fracText(factor)}x is f's own x when x is ${fracText(1 / factor)} times as much: `
        + `every x is multiplied by ${fracText(1 / factor)}, and the height stays.`);
  }
  // Stretched about the axes: the graph starts on the x-axis, perhaps moved
  // sideways, so multiplying its heights does not move it as well.
  const s = start(rng, { lift: false });
  // 2|x| is |2x|: a stretch that is also a squash is not asked.
  if (s.family === 'abs' && s.c === 0) return stretch(rng);
  const base = moved(s.family, s);
  const g = moved(s.family, outside ? { ...s, a: factor } : { ...s, k: factor });
  const options = [
    { id: 'v-stretch', label: `Stretched upward, × ${n}` }, { id: 'v-squash', label: `Squashed down, × 1/${n}` },
    { id: 'h-stretch', label: `Stretched sideways, × ${n}` }, { id: 'h-squash', label: `Squashed sideways, × 1/${n}` },
  ];
  const value = outside ? (factor > 1 ? 'v-stretch' : 'v-squash') : (factor > 1 ? 'h-squash' : 'h-stretch');
  return compare(base, g, 'how is it changed?', options, value, outside
    ? `The ${fracText(factor)} is outside, multiplying every height: ${factor > 1 ? `stretched upward × ${n}` : `squashed down × 1/${n}`}.`
    : `The ${fracText(factor)} multiplies x, inside, and works against itself: each height now comes at `
      + `${fracText(1 / factor)} times the x, so it is ${factor > 1 ? `squashed sideways × 1/${n}` : `stretched sideways × ${n}`}.`,
  `stretched ${n}`);
}

const FLIPS = [
  { id: 'x-axis', label: 'Reflected in the x-axis' },
  { id: 'y-axis', label: 'Reflected in the y-axis' },
  { id: 'same', label: 'The same graph' },
];

function reflect(rng, again = null) {
  if (!again && rng.chance(0.45)) {
    const outside = rng.chance(0.5);
    return image(rng, outside ? { a: -1 } : { k: -1 }, outside
      ? 'A minus outside turns every height to its opposite: the x stays.'
      : 'A minus inside reaches each height at the opposite x: the height stays.');
  }
  const kind = again ?? rng.pick(['x-axis', 'x-axis', 'y-axis', 'y-axis', 'same']);
  const s = start(rng);
  // (−x)² is x², and −x³ is (−x)³: a reflection that changes nothing, or
  // that is also the other reflection, is only asked as the same graph.
  const symmetric = s.c === 0 && (s.family === 'quadratic' || s.family === 'abs');
  const odd = s.c === 0 && s.v === 0 && s.family === 'cubic';
  if (odd || (kind === 'same') !== symmetric) return reflect(rng, kind);
  // The same graph comes from so few starts that a number in front widens it.
  if (kind === 'same') s.a = rng.pick([1, 2, 3, -1, -2, 1 / 2]);
  const base = moved(s.family, s);
  const g = kind === 'x-axis' ? moved(s.family, { ...s, a: -1, v: -s.v }) : moved(s.family, { ...s, k: -1 });
  const why = kind === 'x-axis'
    ? 'Everything is multiplied by −1, outside: every height turns to its opposite, reflected in the x-axis.'
    : kind === 'y-axis'
      ? 'x is replaced by −x, inside: each height now comes at the opposite x, reflected in the y-axis.'
      : 'x is replaced by −x, which reflects it in the y-axis, but this graph is the same on both sides of the y-axis: the same graph.';
  return compare(base, g, 'how is it changed?', FLIPS, kind, why, 'reflected');
}

function combined(rng) {
  const a = rng.pick([1, -1, 2, -2, 3, -3, 1 / 2, -1 / 2]);
  const h = rng.nonZero(-5, 5), v = rng.nonZero(-6, 6);
  const step = `Inside first: x moves ${h > 0 ? 'right' : 'left'} ${Math.abs(h)}. Then outside: the height is `
    + `${a === 1 ? '' : a === -1 ? 'turned to its opposite, ' : `multiplied by ${a < 0 ? '−' : ''}${fracText(Math.abs(a))}, `}`
    + `then ${v > 0 ? 'raised' : 'lowered'} ${Math.abs(v)}.`;
  return image(rng, { a, h, v }, step);
}

const FAMILIES = FAMILY.map((id) => ({ id, label: PARENTS[id].label }));
const LOOKS = {
  quadratic: 'A U shape, curved at the bottom and the same on both sides of its turning point: a parabola, y = x² moved.',
  abs: 'A V with a sharp corner and straight sides: y = |x| moved.',
  sqrt: 'It starts at a point and runs off one way, rising ever more slowly: y = √x moved.',
  cubic: 'It runs from one corner to the opposite, flattening as it passes through its middle point: y = x³ moved.',
};
const CORE = { quadratic: 'a bracket squared', abs: 'absolute value bars', sqrt: 'a square root', cubic: 'a bracket cubed' };

function nameParent(rng) {
  const family = rng.pick(FAMILY);
  const a = rng.pick([1, -1, 2, -2, 3, 1 / 2, -3]);
  const g = moved(family, { a, c: rng.int(-4, 4), v: rng.int(-5, 5) });
  const graph = rng.chance(0.4);
  if (graph && curve(g.f).length < 30) return nameParent(rng);
  return {
    prompt: graph ? [T.prose('Which family is this graph from?')] : [...eq(g.src), T.prose('— which family is it from?')],
    text: `parent: ${g.src}`,
    answer: { type: 'choice', value: family, options: FAMILIES },
    // Once answered, the parent it came from is drawn faint beside it.
    visual: graph ? { kind: 'plane', ...PLANE, marks: [{ kind: 'path', points: curve(g.f), tone: LINE }],
      answer: [{ kind: 'path', points: curve(PARENTS[family].f), tone: FAINT, dashed: true }] } : null,
    explain: graph ? LOOKS[family]
      : `Take away the number in front, the number added and the shift inside, and what is left is ${CORE[family]}: ${PARENTS[family].label}.`,
  };
}

const PARITIES = [
  { id: 'even', label: 'Even: f(−x) = f(x)' },
  { id: 'odd', label: 'Odd: f(−x) = −f(x)' },
  { id: 'neither', label: 'Neither' },
];

/** c·xᵖ terms in ASCII, the first sign bare. */
function poly(terms) {
  return terms.map(([c, p], i) => {
    const body = p === 0 ? String(Math.abs(c)) : `${Math.abs(c) === 1 ? '' : Math.abs(c)}x${p === 1 ? '' : `^${p}`}`;
    return i === 0 ? `${c < 0 ? '-' : ''}${body}` : ` ${c < 0 ? '-' : '+'} ${body}`;
  }).join('');
}
/** The same text worked out at x, for checking the kind before it is asked. */
function valueAt(src, x) {
  const js = src.replace(/\|([^|]+)\|/g, 'Math.abs($1)').replace(/x\^(\d)/g, 'Math.pow(x, $1)')
    .replace(/(\d)(x|Math)/g, '$1 * $2');
  return Function('x', `return ${js};`)(x);
}

function evenOdd(rng, again = null) {
  const want = again ?? rng.pick(PARITIES).id;
  const c = () => rng.nonZero(-6, 6);
  const shape = rng.int(0, 2);
  const src = {
    even: () => [poly([[c(), 4], [c(), 2], [c(), 0]]), poly([[c(), 2], [c(), 0]]), `${rng.int(1, 5)}x^2 + |x|`],
    odd: () => [poly([[c(), 3], [c(), 1]]), poly([[c(), 5], [c(), 3]]), poly([[c(), 3], [c(), 1]])],
    // Neither: an odd and an even power together, or odd ones with a number
    // added, which looks odd and is not.
    neither: () => [poly([[c(), 3], [c(), 2]]), poly([[c(), 3], [c(), 1], [c(), 0]]), `|x - ${rng.int(1, 4)}|`],
  }[want]()[shape];
  const f = (x) => valueAt(src, x);
  const kind = [1, 2, 3].every((x) => f(-x) === f(x)) ? 'even' : [1, 2, 3].every((x) => f(-x) === -f(x)) ? 'odd' : 'neither';
  if (kind !== want) return evenOdd(rng, want);
  return {
    // f(x) by hand: the parser would read it as f times x.
    prompt: [{ t: 'juxt', terms: [T.letter('f'), T.group([T.letter('x')])] }, T.op('='), ...previewOf(drawable(src)).terms,
      T.prose('— even, odd or neither?')],
    text: `parity: ${src}`,
    answer: { type: 'choice', value: want, options: PARITIES },
    visual: null,
    explain: `Try x = 2 and x = −2: f(2) = ${minus(f(2))} and f(−2) = ${minus(f(-2))}. `
      + (want === 'even' ? 'The same, as for every x: x only ever comes in even powers, or inside |x|. Even, and symmetric in the y-axis.'
        : want === 'odd' ? 'Opposites, as for every x: every power of x is odd. Odd, and symmetric about the origin.'
          : `Neither the same nor opposites, so neither.${shape === 1 ? ' The odd powers alone would be odd, but the number added does not change sign.' : ''}`),
  };
}

const CONTENT = [upDown, leftRight, stretch, reflect, combined, nameParent, evenOdd];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
