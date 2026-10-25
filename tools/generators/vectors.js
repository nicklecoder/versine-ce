/**
 * Catalogue authoring tool: builds the problem library for vectors.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 *
 * Every `text` carries the vectors in ASCII (<3, -4>), the points, or the
 * lengths and angles a question gives, so scripts/check-answers.py can work
 * each answer out again: component by component in exact fractions, a
 * length by the Pythagorean theorem kept exact, and an angle or a rounded
 * component by its own calculator working, with every trig value also
 * copied to 4 places as a student copies a screen.
 */
import * as T from '../terms.js';
import { minus } from '../../web/ui/dom.js';
import { cosD, sinD, atanD, acosD, four, at4, safeRound, roundedAnswer, roundedText, rootAnswer, rootText } from './trig.js';
import { arrowhead } from './curves.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/vectors.js';

const LINE = 'var(--vec-1)';
const MARK = 'var(--vec-2)';
const ASKED = 'var(--gold)';

const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const Q = (n, d = 1) => {
  if (d < 0) { n = -n; d = -d; }
  const g = gcd(n, d) || 1;
  return { n: n / g, d: d / g };
};
const qs = (p) => `${minus(p.n)}${p.d === 1 ? '' : `/${p.d}`}`;
const qa = (p) => (p.d === 1 ? String(p.n) : `${p.n}/${p.d}`);
const asQ = (v) => (typeof v === 'number' ? Q(v) : v);

/** ⟨3, −4⟩ as printed, and <3, -4> as the text carries it. */
const vec = (a, b) => `⟨${qs(asQ(a))}, ${qs(asQ(b))}⟩`;
const vecA = (a, b) => `<${qa(asQ(a))}, ${qa(asQ(b))}>`;
const pt = (x, y) => `(${minus(x)}, ${minus(y)})`;
const ptA = (x, y) => `(${x}, ${y})`;
const vectorAnswer = (a, b) => ({ type: 'vector', value: { x: asQ(a), y: asQ(b) } });
const pairAnswer = (x, y) => ({ type: 'pair', value: { x: Q(x), y: Q(y) } });
/** x − y written out with brackets round a negative: 4 − (−2). */
const less = (x, y) => `${minus(x)} − ${y < 0 ? `(${minus(y)})` : y}`;
const more = (x, y) => `${minus(x)} + ${y < 0 ? `(${minus(y)})` : y}`;
/** x² written with brackets round a negative: (−3.5)². */
const sq = (x) => (four(x) < 0 ? `(${at4(x)})²` : `${at4(x)}²`);

// --- Drawing ----------------------------------------------------------------------

/** A window holding the origin and every point, whole numbers, a margin round it. */
function windowAround(points, margin = 1) {
  const xs = [0, ...points.map((p) => p[0])], ys = [0, ...points.map((p) => p[1])];
  return { x0: Math.floor(Math.min(...xs)) - margin, x1: Math.ceil(Math.max(...xs)) + margin,
    y0: Math.floor(Math.min(...ys)) - margin, y1: Math.ceil(Math.max(...ys)) + margin };
}
/** An arrow from tail to tip: the shaft and a head at the tip. */
const arrow = (from, to, tone = LINE, extra = {}) => [{ kind: 'segment', from, to, tone, ...extra }, arrowhead(to, from, tone, 0.45)];
function plane(win, marks, answer) {
  return { kind: 'plane', xRange: [win.x0, win.x1], yRange: [win.y0, win.y1], grid: 1, marks, answer };
}
/** The two legs of an arrow, dashed, labelled with how far across and how far up. */
function legs(from, to) {
  const corner = [to[0], from[1]];
  return [
    { kind: 'segment', from, to: corner, tone: ASKED, dashed: true, label: minus(to[0] - from[0]) },
    { kind: 'segment', from: corner, to, tone: ASKED, dashed: true, label: minus(to[1] - from[1]) },
  ];
}

// --- Components ---------------------------------------------------------------------

const NAMES = [['P', 'Q'], ['A', 'B'], ['M', 'N'], ['R', 'S']];

function twoPoints(rng, span = 8) {
  for (;;) {
    const P = [rng.int(-span, span), rng.int(-span, span)], R = [rng.int(-span, span), rng.int(-span, span)];
    const a = R[0] - P[0], b = R[1] - P[1];
    // A component of 0 now and then, never both.
    if ((!a && !b) || ((!a || !b) && !rng.chance(0.15))) continue;
    return [P, R];
  }
}

function components(rng) {
  const shape = rng.pick(['points', 'points', 'points', 'points', 'drawn', 'drawn', 'drawn', 'end', 'end']);
  if (shape === 'points') {
    const [P, R] = twoPoints(rng);
    const [n1, n2] = rng.pick(NAMES);
    return {
      prompt: [T.prose(`What is the vector from ${n1}${pt(...P)} to ${n2}${pt(...R)}, in component form?`)],
      text: `vector from ${ptA(...P)} to ${ptA(...R)}`,
      answer: vectorAnswer(R[0] - P[0], R[1] - P[1]),
      visual: null,
      explain: `Terminal point minus initial point, ${n2} − ${n1}: ⟨${less(R[0], P[0])}, ${less(R[1], P[1])}⟩ = ${vec(R[0] - P[0], R[1] - P[1])}. So it is ${vec(R[0] - P[0], R[1] - P[1])}.`,
    };
  }
  if (shape === 'drawn') {
    const [P, R] = twoPoints(rng, 5);
    const win = windowAround([P, R], 1);
    const a = R[0] - P[0], b = R[1] - P[1];
    return {
      prompt: [T.prose('What is the vector drawn, in component form?')],
      text: `vector drawn from ${ptA(...P)} to ${ptA(...R)}`,
      answer: vectorAnswer(a, b),
      visual: plane(win, [...arrow(P, R), { kind: 'point', at: P, tone: LINE }], legs(P, R)),
      explain: `It starts at ${pt(...P)} and ends at ${pt(...R)}. From tail to tip it goes ${Math.abs(a)} ${a < 0 ? 'left' : 'right'} and ${Math.abs(b)} ${b < 0 ? 'down' : 'up'}, so it is ${vec(a, b)}.`,
    };
  }
  const [P, R] = twoPoints(rng);
  const a = R[0] - P[0], b = R[1] - P[1];
  if (rng.chance(0.5)) {
    return {
      prompt: [T.prose(`The vector ${vec(a, b)} starts at ${pt(...P)}. Where does it end? Give the point.`)],
      text: `end of ${vecA(a, b)} from ${ptA(...P)}`,
      answer: pairAnswer(...R),
      visual: null,
      explain: `Add the components to the starting point: (${more(P[0], a)}, ${more(P[1], b)}) = ${pt(...R)}. So it ends at ${pt(...R)}.`,
    };
  }
  return {
    prompt: [T.prose(`The vector ${vec(a, b)} ends at ${pt(...R)}. Where does it start? Give the point.`)],
    text: `start of ${vecA(a, b)} to ${ptA(...R)}`,
    answer: pairAnswer(...P),
    visual: null,
    explain: `Take the components away from the end point: (${less(R[0], a)}, ${less(R[1], b)}) = ${pt(...P)}. So it starts at ${pt(...P)}.`,
  };
}

// --- Magnitude & Direction --------------------------------------------------------------

/** √n as (s)√r with r free of squares. */
function surd(n) {
  let s = 1, r = n;
  for (let k = 2; k * k <= r; k++) while (r % (k * k) === 0) { r /= k * k; s *= k; }
  return { s, r };
}
const TRIPLES = [[3, 4], [5, 12], [8, 15], [7, 24], [6, 8], [9, 12], [20, 21]];

/** The quadrant rule for a direction from its reference angle. */
function placed(a, b, ref) {
  if (a > 0 && b >= 0) return { theta: ref, how: `It points into quadrant I, so θ is the reference angle` };
  if (a < 0 && b >= 0) return { theta: 180 - ref, how: `It points into quadrant II, so θ = 180° − ${at4(ref)}°` };
  if (a < 0) return { theta: 180 + ref, how: `It points into quadrant III, so θ = 180° + ${at4(ref)}°` };
  return { theta: 360 - ref, how: `It points into quadrant IV, so θ = 360° − ${at4(ref)}°` };
}

function magnitude(rng) {
  if (rng.chance(0.5)) {
    let a, b;
    if (rng.chance(0.35)) {
      const [p, q] = rng.pick(TRIPLES);
      [a, b] = rng.chance(0.5) ? [p, q] : [q, p];
    } else {
      do { a = rng.int(1, 12); b = rng.int(1, 12); } while (Number.isInteger(Math.sqrt(a * a + b * b)) && !rng.chance(0.2));
    }
    a *= rng.sign(); b *= rng.sign();
    const fromPoints = rng.chance(0.35);
    const n = a * a + b * b, { s, r } = surd(n);
    let P, R, where, text;
    if (fromPoints) {
      P = [rng.int(-6, 6), rng.int(-6, 6)];
      R = [P[0] + a, P[1] + b];
      where = `the vector from ${pt(...P)} to ${pt(...R)}`;
      text = `magnitude from ${ptA(...P)} to ${ptA(...R)}`;
    } else {
      where = `v = ${vec(a, b)}`;
      text = `magnitude: ${vecA(a, b)}`;
    }
    const first = fromPoints ? `Its components are ⟨${less(R[0], P[0])}, ${less(R[1], P[1])}⟩ = ${vec(a, b)}. ` : '';
    const simplified = r === 1 ? `√${n} = ${s}` : s === 1 ? `√${n}` : `√${n} = √(${s * s} × ${r}) = ${rootText(s, 1, r)}`;
    return {
      // Said alike whether or not the length is whole, so the wording never
      // tells which it is.
      prompt: [T.prose(`What is the magnitude of ${where}? Give it exactly, with any radical in simplest form.`)],
      text,
      // requiem: play/answers/roots-preview-names-the-asked-letter
      answer: { ...rootAnswer('|v|', s, 1, r), requireSimplest: true },
      visual: null,
      explain: `${first}|v| = √(${a < 0 ? `(${minus(a)})` : a}² + ${b < 0 ? `(${minus(b)})` : b}²) = √(${a * a} + ${b * b}) = ${simplified}. So |v| = ${rootText(s, 1, r)}.`,
    };
  }
  // A direction: the reference angle by the inverse tangent, then the quadrant.
  // requiem: catalogue/content/direction-angle-stated
  for (;;) {
    const a = rng.int(-15, 15), b = rng.int(-15, 15);
    if (!a || !b) continue;
    const ref = atanD(Math.abs(b / a));
    const { theta, how } = placed(a, b, ref);
    // The reference angle is copied from the screen to 4 places, as the
    // explanation shows it, so θ must round the same from that copy.
    const q = safeRound(theta, 1, placed(a, b, four(ref)).theta);
    if (q === null) continue;
    const drawn = Math.max(Math.abs(a), Math.abs(b)) <= 8 && rng.chance(0.6);
    const win = windowAround([[a, b]], 1);
    const tip = [a, b];
    // Once answered: the positive x-axis the angle is measured from, and θ
    // written beside the arrow.
    const answerMarks = [{ kind: 'segment', from: [0, 0], to: [win.x1, 0], tone: ASKED, dashed: true },
      { kind: 'text', at: [a / 2, b / 2 + (b > 0 ? 0.8 : -0.8)], label: `θ ≈ ${roundedText(q, 1)}°`, tone: ASKED }];
    return {
      prompt: [T.prose(`${drawn ? `The vector drawn is ${vec(a, b)}. What is its direction angle` : `What is the direction angle of ${vec(a, b)}`}, measured counterclockwise from the positive x-axis, in degrees from 0 to 360? Give it to 1 decimal place.`)],
      text: `direction: ${vecA(a, b)} to 1 dp`,
      answer: roundedAnswer(q, 1),
      visual: drawn ? plane(win, arrow([0, 0], tip), answerMarks) : null,
      explain: `The reference angle is tan⁻¹(${Math.abs(b)}/${Math.abs(a)}) ≈ ${at4(ref)}°. ${how}${a > 0 && b >= 0 ? '' : ` ≈ ${at4(theta)}°`}. So θ ≈ ${roundedText(q, 1)}°.`,
    };
  }
}

// --- From Magnitude & Direction --------------------------------------------------------

const CONTEXTS = [
  { what: (r, t) => `A ball is kicked at ${r} m/s at ${t}° above the ground`, part: ['horizontal', 'vertical'], unit: 'm/s', r: [8, 30], t: [15, 75] },
  { what: (r, t) => `A rope pulls a sled with a force of ${r} N at ${t}° above the ground`, part: ['horizontal', 'vertical'], unit: 'N', r: [20, 150], t: [10, 60] },
  { what: (r, t) => `A drone flies at ${r} ft/s in the direction ${t}° counterclockwise from east`, part: ['eastward', 'northward'], unit: 'ft/s', r: [10, 40], t: [1, 359] },
];

function fromMagnitude(rng) {
  const want = rng.pick(['x', 'y']);
  for (;;) {
    const story = rng.chance(0.3) ? rng.pick(CONTEXTS) : null;
    const r = story ? rng.int(...story.r) : rng.int(2, 40);
    const t = story ? rng.int(...story.t) : rng.int(1, 359);
    if (t % 90 === 0) continue;
    const f = want === 'x' ? cosD : sinD;
    const q = safeRound(r * f(t), 1, r * four(f(t)));
    if (q === null) continue;
    const fn = want === 'x' ? 'cos' : 'sin';
    const part = story ? story.part[want === 'x' ? 0 : 1] : want === 'x' ? 'horizontal' : 'vertical';
    const lead = story ? `${story.what(r, t)}. What is the ${part} component of ${story.unit === 'N' ? 'the force' : 'its velocity'}, in ${story.unit}` : `A vector has magnitude ${r} and direction angle ${t}°. What is its ${part} component`;
    return {
      prompt: [T.prose(`${lead}, to 1 decimal place?`)],
      text: `component: ${want} of ${r} at ${t} degrees to 1 dp`,
      answer: roundedAnswer(q, 1),
      visual: null,
      explain: `The ${part} component is r ${fn} θ = ${r} ${fn} ${t}° ≈ ${r} × ${four(f(t)) < 0 ? `(${at4(f(t))})` : at4(f(t))} ≈ ${at4(r * four(f(t)))}. So it is ${minus(roundedText(q, 1))}${story ? ` ${story.unit}` : ''}.`,
    };
  }
}

// --- Adding & Subtracting --------------------------------------------------------------------

function pairOf(rng, span = 9) {
  for (;;) {
    const u = [rng.int(-span, span), rng.int(-span, span)], v = [rng.int(-span, span), rng.int(-span, span)];
    if ((!u[0] && !u[1]) || (!v[0] && !v[1]) || (u[0] === v[0] && u[1] === v[1])) continue;
    return [u, v];
  }
}

function adding(rng) {
  const shape = rng.pick(['add', 'add', 'add', 'sub', 'sub', 'sub', 'drawn', 'drawn', 'drawn']);
  if (shape === 'drawn') {
    const [u, v] = pairOf(rng, 4);
    const tip = [u[0] + v[0], u[1] + v[1]];
    const win = windowAround([u, tip], 1);
    return {
      prompt: [T.prose('The arrows show u, from the origin, and v, drawn from the tip of u. What is u + v, in component form?')],
      text: `drawn sum: ${vecA(...u)} + ${vecA(...v)}`,
      answer: vectorAnswer(...tip),
      visual: plane(win, [...arrow([0, 0], u, LINE, { label: 'u' }), ...arrow(u, tip, MARK, { label: 'v' })],
        arrow([0, 0], tip, ASKED, { dashed: true, label: `u + v = ${vec(...tip)}` })),
      explain: `Read each arrow: u = ${vec(...u)} and v = ${vec(...v)}. Tip to tail, u + v goes from the tail of u to the tip of v: ${vec(...u)} + ${vec(...v)} = ⟨${more(u[0], v[0])}, ${more(u[1], v[1])}⟩ = ${vec(...tip)}.`,
    };
  }
  const [u, v] = pairOf(rng);
  const [n1, n2] = rng.pick([['u', 'v'], ['a', 'b'], ['p', 'q']]);
  if (shape === 'add') {
    const s = [u[0] + v[0], u[1] + v[1]];
    return {
      prompt: [T.prose(`${n1} = ${vec(...u)} and ${n2} = ${vec(...v)}. What is ${n1} + ${n2}?`)],
      text: `add: ${vecA(...u)} + ${vecA(...v)}`,
      answer: vectorAnswer(...s),
      visual: null,
      explain: `Add the across parts and the up parts: ⟨${more(u[0], v[0])}, ${more(u[1], v[1])}⟩ = ${vec(...s)}. So ${n1} + ${n2} = ${vec(...s)}.`,
    };
  }
  const flip = rng.chance(0.4);
  const [A, B, nA, nB] = flip ? [v, u, n2, n1] : [u, v, n1, n2];
  const d = [A[0] - B[0], A[1] - B[1]];
  return {
    prompt: [T.prose(`${n1} = ${vec(...u)} and ${n2} = ${vec(...v)}. What is ${nA} − ${nB}?`)],
    text: `subtract: ${vecA(...A)} - ${vecA(...B)}`,
    answer: vectorAnswer(...d),
    visual: null,
    explain: `Take each part of ${nB} from the same part of ${nA}: ⟨${less(A[0], B[0])}, ${less(A[1], B[1])}⟩ = ${vec(...d)}. So ${nA} − ${nB} = ${vec(...d)}.`,
  };
}

// --- Scalar Multiples ----------------------------------------------------------------------

/** k as written in front of a vector: 3, −2, 1/2, −, nothing. */
const lead = (k) => (k === 1 ? '' : k === -1 ? '−' : minus(k));

function scalar(rng) {
  const shape = rng.pick(['scale', 'scale', 'scale', 'combo', 'combo', 'combo', 'combo', 'combo', 'k', 'k']);
  if (shape === 'scale') {
    for (;;) {
      const u = [rng.int(-9, 9), rng.int(-9, 9)];
      if (!u[0] && !u[1]) continue;
      const half = rng.chance(0.25);
      const k = half ? Q(rng.sign(), rng.pick([2, 3])) : Q(rng.sign() * rng.int(2, 6));
      if (half && (u[0] % k.d || u[1] % k.d)) continue;
      const out = [Q(u[0] * k.n, k.d), Q(u[1] * k.n, k.d)];
      const kT = qs(k), kA = qa(k);
      return {
        prompt: [T.prose(`v = ${vec(...u)}. What is ${k.d === 1 ? minus(k.n) : `(${kT})`}v?`)],
        text: `scale: ${kA} times ${vecA(...u)}`,
        answer: vectorAnswer(...out),
        visual: null,
        explain: `Multiply each component by ${kT}: ⟨${kT} × ${u[0] < 0 ? `(${minus(u[0])})` : u[0]}, ${kT} × ${u[1] < 0 ? `(${minus(u[1])})` : u[1]}⟩ = ${vec(...out)}${k.n < 0 ? `, pointing the opposite way` : ''}. So it is ${vec(...out)}.`,
      };
    }
  }
  if (shape === 'combo') {
    const [u, v] = pairOf(rng, 6);
    const p = rng.sign() * rng.int(1, 4), q = rng.sign() * rng.int(1, 4);
    if (Math.abs(p) === 1 && Math.abs(q) === 1) return scalar(rng);
    const out = [p * u[0] + q * v[0], p * u[1] + q * v[1]];
    const name = `${lead(p)}u ${q < 0 ? '−' : '+'} ${Math.abs(q) === 1 ? '' : Math.abs(q)}v`;
    return {
      prompt: [T.prose(`u = ${vec(...u)} and v = ${vec(...v)}. What is ${name}?`)],
      text: `combo: ${p}${vecA(...u)} + ${q}${vecA(...v)}`,
      answer: vectorAnswer(...out),
      visual: null,
      explain: `${lead(p)}u = ${vec(p * u[0], p * u[1])} and ${lead(q)}v = ${vec(q * v[0], q * v[1])}. Add them: ⟨${more(p * u[0], q * v[0])}, ${more(p * u[1], q * v[1])}⟩ = ${vec(...out)}. So ${name} = ${vec(...out)}.`,
    };
  }
  for (;;) {
    const u = [rng.int(-6, 6), rng.int(-6, 6)];
    if (!u[0] || !u[1]) continue;
    const half = rng.chance(0.3);
    const k = half ? Q(rng.sign() * rng.pick([1, 3, 5]), 2) : Q(rng.sign() * rng.int(2, 5));
    if (half && (u[0] % 2 || u[1] % 2)) continue;
    const w = [u[0] * k.n / k.d, u[1] * k.n / k.d];
    if (w.some((c) => !Number.isInteger(c))) continue;
    return {
      prompt: [T.prose(`${vec(...w)} = k${vec(...u)}. What is k?`)],
      text: `find k: ${vecA(...w)} = k${vecA(...u)}`,
      answer: { type: 'frac', value: k, requireSimplest: false },
      visual: null,
      explain: `Each component is multiplied by the same k: ${minus(w[0])} ÷ ${u[0] < 0 ? `(${minus(u[0])})` : u[0]} = ${qs(k)}, and ${minus(w[1])} ÷ ${u[1] < 0 ? `(${minus(u[1])})` : u[1]} = ${qs(k)} too. So k = ${qs(k)}.`,
    };
  }
}

// --- Unit Vectors ---------------------------------------------------------------------------

const UNIT_TRIPLES = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29], [12, 35, 37], [9, 40, 41]];

// requiem: catalogue/content/unit-vectors-asked-exactly
// The unit vector itself, a length along, and a length against are 40, 30
// and 30 of every hundred rows; every one says "exactly", since a length
// along a vector is a fraction with no ending decimal as often as not.
function unitVectors(rng) {
  const [p, q, c] = rng.pick(UNIT_TRIPLES);
  const [a0, b0] = rng.chance(0.5) ? [p, q] : [q, p];
  const sa = rng.sign(), sb = rng.sign();
  // The unit vectors themselves are fewer than the lengths along and
  // against, and the build keeps distinct rows only, so they are drawn more
  // often and over more multiples for the built level to come out 40/30/30.
  const shape = rng.pick(['unit', 'unit', 'unit', 'unit', 'unit', 'unit', 'along', 'along', 'along', 'against', 'against', 'against']);
  if (shape === 'unit') {
    const m = rng.int(1, 10);
    const v = [sa * a0 * m, sb * b0 * m], len = c * m;
    const u = [Q(v[0], len), Q(v[1], len)];
    return {
      prompt: [T.prose(`What is the unit vector in the direction of ${vec(...v)}? Give it exactly.`)],
      text: `unit: ${vecA(...v)}`,
      answer: vectorAnswer(...u),
      visual: null,
      explain: `Its length is √(${v[0] * v[0]} + ${v[1] * v[1]}) = √${len * len} = ${len}. Divide each component by ${len}: ${vec(...u)}, which has length 1. So it is ${vec(...u)}.`,
    };
  }
  const v = [sa * a0, sb * b0];
  const L = rng.pick([2 * c, 3 * c, c * rng.int(2, 6), rng.int(2, 30)]);
  if (L === c) return unitVectors(rng);
  const against = shape === 'against';
  const s = against ? -1 : 1;
  const out = [Q(s * L * v[0], c), Q(s * L * v[1], c)];
  return {
    prompt: [T.prose(`What vector has magnitude ${L} and points ${against ? 'in the direction opposite to' : 'in the same direction as'} ${vec(...v)}? Give it exactly.`)],
    text: `length ${L} ${against ? 'against' : 'along'} ${vecA(...v)}`,
    answer: vectorAnswer(...out),
    visual: null,
    explain: `${vec(...v)} has length √(${v[0] * v[0]} + ${v[1] * v[1]}) = ${c}, so its unit vector is ${vec(Q(v[0], c), Q(v[1], c))}. Multiply by ${against ? `−${L}` : L}${against ? ' to point the other way' : ''}: ${vec(...out)}. So it is ${vec(...out)}.`,
  };
}

// --- Dot Product ---------------------------------------------------------------------------

/**
 * u · v = ac + bd, the angle between two vectors from cos θ = u · v / (|u||v|),
 * and orthogonality as u · v = 0. Orthogonal, Parallel and Neither are a
 * fixed menu, the answer drawn first so each is the key a third of the time.
 */
// requiem: catalogue/content/dot-product-level
function dotProduct(rng) {
  const shape = rng.pick(['dot', 'dot', 'dot', 'angle', 'angle', 'angle', 'which', 'which', 'which', 'k', 'k']);
  const nz = (span) => { for (;;) { const w = [rng.int(-span, span), rng.int(-span, span)]; if (w[0] || w[1]) return w; } };
  const dot = (u, v) => u[0] * v[0] + u[1] * v[1];
  const term = (x, y) => `${x < 0 ? `(${minus(x)})` : x}(${minus(y)})`;
  const [n1, n2] = rng.pick([['u', 'v'], ['a', 'b'], ['p', 'q']]);
  if (shape === 'dot') {
    const u = nz(9), v = nz(9);
    const d = dot(u, v);
    return {
      prompt: [T.prose(`${n1} = ${vec(...u)} and ${n2} = ${vec(...v)}. What is ${n1} · ${n2}?`)],
      text: `dot: ${vecA(...u)} . ${vecA(...v)}`,
      answer: { type: 'frac', value: Q(d), requireSimplest: false },
      visual: null,
      explain: `Multiply the across parts and the up parts, and add: ${term(u[0], v[0])} + ${term(u[1], v[1])} = ${minus(u[0] * v[0])} + ${u[1] * v[1] < 0 ? `(${minus(u[1] * v[1])})` : u[1] * v[1]} = ${minus(d)}. So ${n1} · ${n2} = ${minus(d)}.`,
    };
  }
  if (shape === 'angle') {
    for (;;) {
      const u = nz(8), v = nz(8);
      const d = dot(u, v), uu = dot(u, u), vv = dot(v, v);
      const c = d / Math.sqrt(uu * vv);
      // Not along one line: 0° and 180° are the parallel cases, asked below.
      if (Math.abs(Math.abs(c) - 1) < 1e-9) continue;
      const exact = acosD(c);
      const q = safeRound(exact, 1, acosD(four(c)));
      if (q === null) continue;
      return {
        prompt: [T.prose(`What is the angle between ${vec(...u)} and ${vec(...v)}, in degrees from 0 to 180, to 1 decimal place?`)],
        text: `angle between: ${vecA(...u)} and ${vecA(...v)} to 1 dp`,
        answer: roundedAnswer(q, 1),
        visual: null,
        explain: `cos θ = u · v / (|u||v|). u · v = ${term(u[0], v[0])} + ${term(u[1], v[1])} = ${minus(d)}, |u| = √${uu} and |v| = √${vv}, so cos θ = ${minus(d)}/√${uu * vv} ≈ ${at4(c)}. θ = cos⁻¹(${at4(c)}) ≈ ${at4(acosD(four(c)))}°. So θ ≈ ${roundedText(q, 1)}°.`,
      };
    }
  }
  if (shape === 'which') {
    // requiem: catalogue/content/fixed-menu-key-moves
    // Orthogonal pairs repeat more often than the others, so they are drawn
    // a little more for each answer to be the key about a third of the time.
    const kind = rng.pick(['orthogonal', 'orthogonal', 'orthogonal', 'orthogonal', 'parallel', 'parallel', 'parallel', 'neither', 'neither', 'neither']);
    for (;;) {
      const u = nz(6);
      let v;
      if (kind === 'orthogonal') { const m = rng.sign() * rng.int(1, 3); v = [-m * u[1], m * u[0]]; }
      else if (kind === 'parallel') {
        // A whole multiple, or a half when both components are even.
        const half = rng.chance(0.3) && u.every((x) => x % 2 === 0);
        const m = rng.sign() * (half ? 0.5 : rng.int(1, 3));
        v = [m * u[0], m * u[1]];
      }
      else v = nz(9);
      const d = dot(u, v), cr = u[0] * v[1] - u[1] * v[0];
      const is = d === 0 ? 'orthogonal' : cr === 0 ? 'parallel' : 'neither';
      if (is !== kind || (u[0] === v[0] && u[1] === v[1])) continue;
      const why = is === 'orthogonal' ? 'That is 0, so they are at right angles'
        : is === 'parallel' ? `That is not 0, but ${vec(...v)} is ${qs(Q(v[0] || v[1], u[0] || u[1]))} × ${vec(...u)}, a multiple of it, so they lie along one line`
          : `That is not 0, so they are not at right angles, and ${vec(...v)} is no multiple of ${vec(...u)}, so they are not along one line`;
      return {
        prompt: [T.prose(`Are ${vec(...u)} and ${vec(...v)} orthogonal, parallel, or neither?`)],
        text: `orthogonal or parallel: ${vecA(...u)} and ${vecA(...v)}`,
        answer: { type: 'choice', value: is, options: [{ id: 'orthogonal', label: 'Orthogonal' }, { id: 'parallel', label: 'Parallel' }, { id: 'neither', label: 'Neither' }] },
        visual: null,
        explain: `The dot product is ${term(u[0], v[0])} + ${term(u[1], v[1])} = ${minus(d)}. ${why}. So they are ${is}.`,
      };
    }
  }
  for (;;) {
    // ⟨a, k⟩ · ⟨c, d⟩ = 0: ac + kd = 0, so k = −ac/d.
    const a = rng.sign() * rng.int(1, 8), c = rng.sign() * rng.int(1, 8), d = rng.sign() * rng.int(1, 8);
    const k = Q(-a * c, d);
    if (k.d > 4) continue;
    const kFirst = rng.chance(0.5);
    const u = kFirst ? `⟨k, ${minus(a)}⟩` : `⟨${minus(a)}, k⟩`;
    const v = kFirst ? vec(d, c) : vec(c, d);
    const uA = kFirst ? `<k, ${a}>` : `<${a}, k>`;
    const vA = kFirst ? vecA(d, c) : vecA(c, d);
    return {
      prompt: [T.prose(`For what value of k are ${u} and ${v} orthogonal?`)],
      text: `orthogonal k: ${uA} and ${vA}`,
      answer: { type: 'frac', value: k, requireSimplest: false },
      visual: null,
      explain: `Orthogonal means the dot product is 0: ${kFirst ? `${d < 0 ? `(${minus(d)})` : d}k + ${term(a, c)}` : `${term(a, c)} + ${d < 0 ? `(${minus(d)})` : d}k`} = 0, so ${minus(d)}k = ${minus(-a * c)} and k = ${qs(k)}. So k = ${qs(k)}.`,
    };
  }
}

// --- Resultants -------------------------------------------------------------------------------

const STORIES = [
  {
    // A boat steered straight across a current: the two at right angles.
    make(rng) {
      const boat = rng.int(4, 18), current = rng.int(2, 8);
      const head = rng.pick([['north', 90], ['south', 270]]), flow = rng.pick([['east', 0], ['west', 180]]);
      return { vs: [[boat, head[1]], [current, flow[1]]], unit: 'mph',
        words: `A boat heads due ${head[0]} at ${boat} mph across a river whose current flows due ${flow[0]} at ${current} mph.`,
        what: ['resultant speed', 'direction of travel'] };
    },
  },
  {
    make(rng) {
      const air = rng.int(15, 50) * 10, wind = rng.int(2, 12) * 5;
      const h = rng.int(0, 35) * 10, w = rng.int(0, 71) * 5;
      if (h === w || Math.abs(h - w) === 180) return null;
      return { vs: [[air, h], [wind, w]], unit: 'mph',
        words: `A plane flies at ${air} mph in the direction ${h}°, and a wind blows at ${wind} mph toward ${w}°, both measured counterclockwise from east.`,
        what: ['resultant speed', 'direction of travel'] };
    },
  },
  {
    make(rng) {
      const f1 = rng.int(2, 30) * 5, f2 = rng.int(2, 30) * 5;
      const t1 = rng.int(0, 35) * 10, t2 = rng.int(0, 71) * 5;
      if (t1 === t2 || Math.abs(t1 - t2) === 180) return null;
      return { vs: [[f1, t1], [f2, t2]], unit: 'N',
        words: `Two forces act on a crate: ${f1} N at ${t1}° and ${f2} N at ${t2}°, both measured counterclockwise from the positive x-axis.`,
        what: ['magnitude of the resultant force', 'direction of the resultant force'] };
    },
  },
];

/** A bearing as navigators write it: three digits, 060°. */
const bearing = (b) => `${String(b).padStart(3, '0')}°`;

/**
 * Two legs or a heading and a wind given as bearings, clockwise from north:
 * a bearing b is east r sin b and north r cos b, and the resultant's
 * bearing is found from its east and north parts the same way.
 */
// requiem: catalogue/content/resultants-on-bearings
const BEARING_STORIES = [
  (rng) => {
    const d1 = rng.int(4, 40) * 5, d2 = rng.int(4, 40) * 5, b1 = rng.int(0, 71) * 5, b2 = rng.int(0, 71) * 5;
    return { legs: [[d1, b1], [d2, b2]], unit: 'mi',
      words: `A ship sails ${d1} mi on a bearing of ${bearing(b1)}, then ${d2} mi on a bearing of ${bearing(b2)}.`,
      ask: ['How far is it from where it started, in miles', 'On what bearing is it from where it started'] };
  },
  (rng) => {
    const air = rng.int(15, 50) * 10, wind = rng.int(2, 12) * 5, b1 = rng.int(0, 71) * 5, b2 = rng.int(0, 71) * 5;
    return { legs: [[air, b1], [wind, b2]], unit: 'mph',
      words: `A plane flies at ${air} mph on a bearing of ${bearing(b1)}, and a wind blows at ${wind} mph toward a bearing of ${bearing(b2)}.`,
      ask: ['What is its resultant speed, in mph', 'On what bearing does it actually travel'] };
  },
];

function bearings(rng) {
  const want = rng.pick(['magnitude', 'bearing']);
  for (;;) {
    const st = rng.pick(BEARING_STORIES)(rng);
    const [[r1, b1], [r2, b2]] = st.legs;
    if (b1 === b2 || Math.abs(b1 - b2) === 180) continue;
    const E = r1 * sinD(b1) + r2 * sinD(b2), N = r1 * cosD(b1) + r2 * cosD(b2);
    const E4 = r1 * four(sinD(b1)) + r2 * four(sinD(b2)), N4 = r1 * four(cosD(b1)) + r2 * four(cosD(b2));
    if (Math.hypot(E, N) < 1) continue;
    const brg = (e, n) => ((Math.atan2(e, n) * 180) / Math.PI + 360) % 360;
    const exact = want === 'magnitude' ? Math.hypot(E, N) : brg(E, N);
    const alt = want === 'magnitude' ? Math.hypot(E4, N4) : brg(E4, N4);
    // requiem: catalogue/content/direction-angle-stated
    if (want === 'bearing' && (exact < 0.1 || exact > 359.9)) continue;
    const q = safeRound(exact, 1, alt);
    if (q === null) continue;
    const parts = st.legs.map(([r, b]) => `${r} on ${bearing(b)} is ${r} sin ${b}° ≈ ${at4(r * four(sinD(b)))} east and ${r} cos ${b}° ≈ ${at4(r * four(cosD(b)))} north`).join('; ');
    const ref = atanD(Math.abs(E4 / N4));
    const place = N4 > 0 && E4 >= 0 ? 'east of north, so the bearing is that angle'
      : N4 < 0 && E4 >= 0 ? `east of south, so the bearing is 180° − ${at4(ref)}°`
        : N4 < 0 ? `west of south, so the bearing is 180° + ${at4(ref)}°` : `west of north, so the bearing is 360° − ${at4(ref)}°`;
    const finish = want === 'magnitude'
      ? `Its length is √(${sq(E4)} + ${sq(N4)}) ≈ ${at4(Math.hypot(E4, N4))}. So it is ${roundedText(q, 1)} ${st.unit}.`
      : `From north, tan⁻¹(${at4(Math.abs(E4))}/${at4(Math.abs(N4))}) ≈ ${at4(ref)}° ${place}${N4 > 0 && E4 >= 0 ? '' : ` ≈ ${at4(alt)}°`}. So it is ${roundedText(q, 1)}°.`;
    const ask = want === 'magnitude' ? `${st.ask[0]}, to 1 decimal place?`
      : `${st.ask[1]}, in degrees clockwise from north, from 0 to 360, to 1 decimal place?`;
    return {
      prompt: [T.prose(`${st.words} ${ask}`)],
      text: `resultant ${want === 'magnitude' ? 'distance' : 'bearing'}: ${st.legs.map(([r, b]) => `${r} on bearing ${b}`).join('; ')} to 1 dp`,
      answer: roundedAnswer(q, 1),
      visual: null,
      explain: `Break each into east and north parts: ${parts}. Adding, ${at4(E4)} east and ${at4(N4)} north. ${finish}`,
    };
  }
}

function resultants(rng) {
  // A quarter of the level is on bearings, navigation's own measure.
  if (rng.chance(0.25)) return bearings(rng);
  const want = rng.pick(['magnitude', 'direction']);
  for (;;) {
    const s = rng.pick(STORIES).make(rng);
    if (!s) continue;
    const xs = s.vs.map(([r, t]) => r * cosD(t)), ys = s.vs.map(([r, t]) => r * sinD(t));
    const x4 = s.vs.map(([r, t]) => r * four(cosD(t))), y4 = s.vs.map(([r, t]) => r * four(sinD(t)));
    const X = xs[0] + xs[1], Y = ys[0] + ys[1], X4 = x4[0] + x4[1], Y4 = y4[0] + y4[1];
    if (Math.hypot(X, Y) < 1) continue;
    const angle = (x, y) => ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
    const exact = want === 'magnitude' ? Math.hypot(X, Y) : angle(X, Y);
    const alt = want === 'magnitude' ? Math.hypot(X4, Y4) : angle(X4, Y4);
    // requiem: catalogue/content/direction-angle-stated
    // An angle near 0° could round to 360.0 one way and 0.0 the other.
    if (want === 'direction' && (exact < 0.1 || exact > 359.9)) continue;
    const q = safeRound(exact, 1, alt);
    if (q === null) continue;
    const parts = s.vs.map(([r, t]) => `${r} at ${t}° is ⟨${r} cos ${t}°, ${r} sin ${t}°⟩ ≈ ⟨${at4(r * four(cosD(t)))}, ${at4(r * four(sinD(t)))}⟩`).join('; ');
    const sum = `Adding, the resultant is about ⟨${at4(X4)}, ${at4(Y4)}⟩.`;
    const finish = want === 'magnitude'
      ? `Its length is √(${sq(X4)} + ${sq(Y4)}) ≈ ${at4(Math.hypot(X4, Y4))}. So it is ${roundedText(q, 1)} ${s.unit}.`
      : `Its reference angle is tan⁻¹(${at4(Math.abs(Y4))}/${at4(Math.abs(X4))}) ≈ ${at4(atanD(Math.abs(Y4 / X4)))}°; ${placed(X4, Y4, atanD(Math.abs(Y4 / X4))).how.replace(/^It points/, 'the resultant points')}${X4 > 0 && Y4 >= 0 ? '' : ` ≈ ${at4(alt)}°`}. So it is ${roundedText(q, 1)}°.`;
    const ask = want === 'magnitude' ? `What is the ${s.what[0]}, in ${s.unit}, to 1 decimal place?`
      : `What is the ${s.what[1]}, in degrees counterclockwise from ${s.unit === 'N' ? 'the positive x-axis' : 'east'}, from 0 to 360, to 1 decimal place?`;
    return {
      prompt: [T.prose(`${s.words} ${ask}`)],
      text: `resultant ${want}: ${s.vs.map(([r, t]) => `${r} at ${t}`).join('; ')} to 1 dp`,
      answer: roundedAnswer(q, 1),
      visual: null,
      explain: `Break each into components: ${parts}. ${sum} ${finish}`,
    };
  }
}

const CONTENT = [components, magnitude, fromMagnitude, adding, scalar, unitVectors, dotProduct, resultants];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  // requiem: catalogue/content/one-input-per-level
  // Every vector goes in the vector box; a point is asked "Give the point"
  // and goes in the pair box; an exact length is asked "exactly, in
  // simplest radical form"; an angle or a rounded component says "to 1
  // decimal place"; and k, the one scalar asked, is a number the question
  // names.
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
