/**
 * Catalogue authoring tool: builds the problem library for the Pythagorean theorem.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 *
 * Every `text` names what is asked and lists the lengths or the points, so
 * scripts/check-answers.py can square and add them again.
 */
import * as T from '../terms.js';
import { minus } from '../../web/ui/dom.js';
import { formatRoots } from '../../web/math/surds.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/pythagoras.js';

const LINE = 'var(--vec-1)';
const MARK = 'var(--vec-2)';

/** The primitive triples with a hypotenuse under 60, shortest leg first. */
const PRIMITIVE = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29], [12, 35, 37], [9, 40, 41],
  [28, 45, 53], [11, 60, 61], [33, 56, 65], [16, 63, 65]];
/** Every triple with a hypotenuse up to `top`, scaled ones included. */
function triples(top) {
  const out = [];
  for (const [a, b, c] of PRIMITIVE) for (let k = 1; k * c <= top; k++) out.push([a * k, b * k, c * k, k, [a, b, c]]);
  return out;
}

/** The largest square dividing n, and what is left: 20 → [2, 5]. */
function squarePart(n) {
  for (let k = Math.floor(Math.sqrt(n)); k > 1; k--) if (n % (k * k) === 0) return [k, n / (k * k)];
  return [1, n];
}
const Q = (n) => ({ n, d: 1 });
/** √n exactly, as the roots answer holds it: 10, or 2√5. */
function rootOf(letter, n) {
  const [k, m] = squarePart(n);
  const root = m === 1 ? { a: Q(k), b: Q(0), r: 1 } : { a: Q(0), b: Q(k), r: m };
  return { type: 'roots', value: { letter, roots: [root] } };
}
const shown = (letter, n) => formatRoots(rootOf(letter, n).value).replace(`${letter} = `, '');
/** The simplifying step, or nothing when the root is already simplest. */
function simplified(n) {
  const [k, m] = squarePart(n);
  if (m === 1) return `√${n} = ${k}`;
  if (k === 1) return `√${n} does not simplify: ${n} has no square factor`;
  return `√${n} = √(${k * k} × ${m}) = ${k}√${m}`;
}

/**
 * The triangle on a grid, right angle at the origin, legs along the axes.
 * The side asked for is drawn but labelled only once it is answered.
 */
function triangle(a, b, unknown, answerLabel) {
  // Never smaller than a 6 by 6 grid, so legs of 1 and 1 still read as a triangle.
  const top = Math.max(a, b, 5) + 1;
  const side = (from, to, label) => ({ kind: 'segment', from, to, tone: LINE, ...(label ? { label } : {}) });
  const sides = { a: [[0, 0], [a, 0]], b: [[0, 0], [0, b]], c: [[a, 0], [0, b]] };
  const labels = { a: String(a), b: String(b), c: null };
  return {
    kind: 'plane', xRange: [-1, top], yRange: [-1, top], grid: top > 16 ? 0 : 1,
    marks: Object.entries(sides).map(([k, [f, t]]) => side(f, t, k === unknown ? null : labels[k] ?? null)),
    answer: [{ ...side(...sides[unknown], answerLabel), tone: MARK }],
  };
}

/**
 * Where a right triangle turns up, each with words for its legs and its
 * longest side. The plain triangle is one of them.
 */
const SETTINGS = [
  { id: 'triangle', legs: (p, q) => `A right triangle has legs ${p} and ${q}.`, hyp: 'How long is the hypotenuse?',
    given: (c, k) => `A right triangle has hypotenuse ${c} and one leg ${k}.`, leg: 'How long is the other leg?' },
  { id: 'ladder', legs: (p, q) => `The foot of a ladder is ${p} ft from a wall, and its top rests ${q} ft up the wall.`,
    hyp: 'How long is the ladder, in feet?',
    given: (c, k) => `A ladder ${c} ft long leans on a wall with its foot ${k} ft from the wall.`, leg: 'How high up the wall does it reach, in feet?' },
  { id: 'screen', legs: (p, q) => `A screen is ${p} inches wide and ${q} inches tall.`, hyp: 'How long is its diagonal, in inches?',
    given: (c, k) => `A screen has a ${c}-inch diagonal and is ${k} inches wide.`, leg: 'How tall is it, in inches?' },
  { id: 'walk', legs: (p, q) => `Sam walks ${p} km east, then ${q} km north.`, hyp: 'How far is Sam from the start, in a straight line, in km?',
    given: (c, k) => `A town is ${c} km from home in a straight line. It is ${k} km east of home, and the rest of the way north.`, leg: 'How far north of home is it, in km?' },
  { id: 'ramp', legs: (p, q) => `A ramp rises ${p} m over a run of ${q} m along the ground.`, hyp: 'How long is the ramp’s surface, in m?',
    given: (c, k) => `A ramp ${c} m long rises ${k} m.`, leg: 'How far along the ground does it run, in m?' },
];
const MID = triples(50);
const STEEP = new Set(['ladder', 'ramp']);

function hypotenuse(rng) {
  const [a, b, c] = rng.pick(MID);
  const at = rng.pick(SETTINGS);
  // A ladder's foot is nearer the wall than its top is high, and a ramp
  // rises less than it runs: the shorter leg comes first for those.
  const [p, q] = STEEP.has(at.id) || rng.chance(0.5) ? [a, b] : [b, a];
  return {
    prompt: [T.prose(`${at.legs(p, q)} ${at.hyp}`)],
    text: `hypotenuse: ${p}, ${q} (${at.id})`,
    answer: { type: 'int', value: c },
    visual: at.id === 'triangle' ? triangle(p, q, 'c', String(c)) : null,
    explain: `${at.id === 'triangle' ? '' : 'The two sides at the right angle are the legs, and what is asked is the longest side. '}`
      + `c² = ${p}² + ${q}² = ${p * p} + ${q * q} = ${c * c}, so c = √${c * c} = ${c}.`,
  };
}

function leg(rng) {
  const [a, b, c] = rng.pick(MID);
  const at = rng.pick(SETTINGS);
  const [known, want] = STEEP.has(at.id) || rng.chance(0.5) ? [a, b] : [b, a];
  return {
    prompt: [T.prose(`${at.given(c, known)} ${at.leg}`)],
    text: `leg: ${c}, ${known} (${at.id})`,
    answer: { type: 'int', value: want },
    visual: at.id === 'triangle' ? triangle(known, want, 'b', String(want)) : null,
    explain: `${c} is the longest side, so its square is the sum of the other two: take away. `
      + `b² = ${c}² − ${known}² = ${c * c} − ${known * known} = ${want * want}, so b = ${want}.`
      + ` (Adding would give √${c * c + known * known}, longer than the hypotenuse.)`,
  };
}

const VERDICTS = [
  { id: 'yes', label: 'Yes, it has a right angle' },
  { id: 'no', label: 'No' },
];
const ORDERS = [[0, 1, 2], [1, 0, 2], [2, 0, 1], [0, 2, 1], [2, 1, 0], [1, 2, 0]];

function isRight(rng, again = null) {
  const want = again ?? rng.pick(['yes', 'no']);
  let [x, y, z] = rng.pick(triples(100));
  // A near miss, the longest side one too long or too short, so only the
  // arithmetic tells; in three orders, to the six a right one comes in.
  if (want === 'no') z += rng.sign();
  const order = want === 'no' ? rng.pick(ORDERS.slice(0, 3)) : rng.pick(ORDERS);
  if (z <= y) return isRight(rng, want);
  const sides = order.map((i) => [x, y, z][i]);
  return {
    prompt: [T.prose(`A triangle has sides ${sides.join(', ')}. Does it have a right angle?`)],
    text: `is right: ${sides.join(', ')}`,
    answer: { type: 'choice', value: want, options: VERDICTS },
    visual: null,
    explain: `Test the two shorter sides against the longest, ${z}: ${x}² + ${y}² = ${x * x} + ${y * y} = ${x * x + y * y}, `
      + `and ${z}² = ${z * z}. ${want === 'yes' ? 'They match, so it has a right angle.' : 'They do not match, so it has no right angle.'}`,
  };
}

function exact(rng) {
  const hyp = rng.chance(0.6);
  let p, q, n;
  if (hyp) {
    p = rng.int(1, 11); q = rng.int(1, 11);
    n = p * p + q * q;
  } else {
    q = rng.int(2, 15); p = rng.int(1, q - 1);
    n = q * q - p * p;
  }
  // Mostly roots that simplify, sometimes one that does not, now and then a
  // whole one: the answer has to be worked out to know which.
  const [k, m] = squarePart(n);
  const kind = m === 1 ? 'whole' : k > 1 ? 'simplifies' : 'stays';
  if (rng.chance({ whole: 0.6, simplifies: 0, stays: 0.5 }[kind])) return exact(rng);
  const letter = hyp ? 'c' : 'b';
  return {
    prompt: [T.prose(hyp
      ? `A right triangle has legs ${p} and ${q}. Give the exact length of the hypotenuse.`
      : `A right triangle has hypotenuse ${q} and one leg ${p}. Give the exact length of the other leg.`)],
    text: hyp ? `exact hypotenuse: ${p}, ${q}` : `exact leg: ${q}, ${p}`,
    answer: rootOf(letter, n),
    visual: hyp ? triangle(p, q, 'c', shown(letter, n)) : null,
    explain: `${letter}² = ${hyp ? `${p}² + ${q}² = ${p * p} + ${q * q}` : `${q}² − ${p}² = ${q * q} − ${p * p}`} = ${n}, `
      + `so ${letter} = √${n}. ${simplified(n)}.`,
  };
}

function distance(rng) {
  const exactly = rng.chance(0.5);
  let dx, dy;
  if (exactly) {
    dx = rng.int(1, 8); dy = rng.int(1, 8);
  } else {
    const [a, b] = rng.pick(triples(15));
    [dx, dy] = rng.chance(0.5) ? [a, b] : [b, a];
  }
  const sx = rng.sign(), sy = rng.sign();
  const x1 = rng.int(-7, 7), y1 = rng.int(-7, 7);
  const x2 = x1 + sx * dx, y2 = y1 + sy * dy;
  if (Math.max(Math.abs(x1), Math.abs(x2), Math.abs(y1), Math.abs(y2)) > 9) return distance(rng);
  const n = dx * dx + dy * dy;
  const P = `(${minus(x1)}, ${minus(y1)})`, R = `(${minus(x2)}, ${minus(y2)})`;
  return {
    prompt: [T.prose(`How far apart are ${P} and ${R}? Give the exact distance.`)],
    text: `distance: ${x1}, ${y1}, ${x2}, ${y2}`,
    answer: rootOf('d', n),
    visual: { kind: 'plane', xRange: [-10, 10], yRange: [-10, 10], grid: 1,
      marks: [{ kind: 'point', at: [x1, y1], label: P, tone: LINE }, { kind: 'point', at: [x2, y2], label: R, tone: LINE }],
      answer: [
        { kind: 'segment', from: [x1, y1], to: [x2, y1], tone: MARK, dashed: true, label: String(dx) },
        { kind: 'segment', from: [x2, y1], to: [x2, y2], tone: MARK, dashed: true, label: String(dy) },
        { kind: 'segment', from: [x1, y1], to: [x2, y2], tone: LINE },
      ] },
    explain: `Across, from x = ${minus(x1)} to x = ${minus(x2)} is ${dx}; up or down, from y = ${minus(y1)} to y = ${minus(y2)} is ${dy}: `
      + `the legs of a right triangle. d² = ${dx}² + ${dy}² = ${n}, so d = √${n}. ${simplified(n)}.`,
  };
}

/** Boxes whose corner-to-corner diagonal is whole. */
const BOXES = [[1, 2, 2], [2, 3, 6], [1, 4, 8], [4, 4, 7], [2, 6, 9], [6, 6, 7], [3, 4, 12], [2, 10, 11], [2, 5, 14],
  [8, 9, 12], [1, 12, 12], [4, 8, 19], [6, 10, 15], [3, 6, 22], [4, 13, 16], [9, 12, 20], [2, 14, 23], [12, 16, 21]];

function diagonal(rng) {
  const k = rng.pick([1, 1, 1, 2, 3]);
  const [a, b, c] = rng.shuffle(rng.pick(BOXES).map((s) => s * k));
  const d2 = a * a + b * b + c * c, d = Math.round(Math.sqrt(d2));
  if (d > 60) return diagonal(rng);
  const floor = a * a + b * b;
  return {
    prompt: [T.prose(`A box is ${a} by ${b} by ${c}. How long is the diagonal from one corner to the opposite corner, through the box?`)],
    text: `box diagonal: ${a}, ${b}, ${c}`,
    answer: { type: 'int', value: d },
    visual: null,
    explain: `Across the floor first: ${a}² + ${b}² = ${floor}. That diagonal and the height ${c} are the legs of another `
      + `right triangle: ${floor} + ${c}² = ${floor} + ${c * c} = ${d2}, and √${d2} = ${d}.`,
  };
}

function spot(rng) {
  const big = triples(150).filter(([, , , k]) => k >= 3);
  const [a, b, c, k, [p, q, r]] = rng.pick(big);
  const ask = rng.pick(['c', 'c', 'leg']);
  const [x, y] = rng.chance(0.5) ? [a, b] : [b, a];
  const leg_ = ask === 'leg';
  const known = leg_ ? x : null;
  return {
    prompt: [T.prose(leg_
      ? `A right triangle has hypotenuse ${c} and one leg ${known}. How long is the other leg?`
      : `A right triangle has legs ${x} and ${y}. How long is the hypotenuse?`)],
    text: leg_ ? `leg: ${c}, ${known}` : `hypotenuse: ${x}, ${y}`,
    answer: { type: 'int', value: leg_ ? (known === a ? b : a) : c },
    visual: null,
    explain: `${leg_ ? `${c} and ${known}` : `${x} and ${y}`} are ${k} times ${leg_ ? `${r} and ${known === a ? p : q}` : `${x === a ? p : q} and ${x === a ? q : p}`}: `
      + `the ${p}, ${q}, ${r} triangle made ${k} times as big. So the ${leg_ ? 'other leg' : 'hypotenuse'} is `
      + `${k} × ${leg_ ? (known === a ? q : p) : r} = ${leg_ ? (known === a ? b : a) : c}, with no squaring.`,
  };
}

const CONTENT = [hypotenuse, leg, isRight, exact, distance, diagonal, spot];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
