/**
 * Catalogue authoring tool: builds the problem library for parametric-polar.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 *
 * Every `text` carries the equations in ASCII (x = 2t + 1; y = t^2 - 3,
 * r = 3cos(2θ)), the point, or the numbers a story gives, so
 * scripts/check-answers.py can work each answer out again: a parametric
 * point by putting t in, an eliminated equation by testing every option at
 * points of the curve, a polar point by its own trigonometry, a conversion
 * by putting points of one equation into the other, and a polar graph by
 * sampling the curve.
 */
import * as T from '../terms.js';
import { minus } from '../../web/ui/dom.js';
import { previewOf } from '../../web/ui/express.js';
import { cosD, sinD, atanD, four, at4, safeRound, roundedAnswer, roundedText, rootAnswer, rootText, exactTrig, angleText, fnText } from './trig.js';
import { arrowhead, clipped } from './curves.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/parametric-polar.js';

const LINE = 'var(--vec-1)';
const MARK = 'var(--vec-2)';
const ASKED = 'var(--gold)';

const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const Q = (n, d = 1) => {
  if (d < 0) { n = -n; d = -d; }
  const g = gcd(n, d) || 1;
  return { n: n / g, d: d / g };
};
const qn = (p) => p.n / p.d;
const qs = (p) => `${minus(p.n)}${p.d === 1 ? '' : `/${p.d}`}`;
const qa = (p) => (p.d === 1 ? String(p.n) : `${p.n}/${p.d}`);
const asQ = (v) => (typeof v === 'number' ? Q(v) : v);
const pt = (x, y) => `(${qs(asQ(x))}, ${qs(asQ(y))})`;
const ptA = (x, y) => `(${qa(asQ(x))}, ${qa(asQ(y))})`;
const pairAnswer = (x, y) => ({ type: 'pair', value: { x: asQ(x), y: asQ(y) } });
const fracAnswer = (v) => ({ type: 'frac', value: asQ(v), requireSimplest: false });
const choice = (value, labels) => ({ type: 'choice', value, options: labels.map(([id, label]) => ({ id, label })) });
/** ASCII as it is printed: real minus signs, raised squares, θ kept. */
const pretty = (s) => s.replace(/\^2/g, '²').replace(/-/g, '−').replace(/(cos|sin)\(([^)]*)\)/g, '$1 $2').replace(/\*/g, '');
/** One equation drawn as the expression box draws it. */
const eq = (src) => {
  const r = previewOf(src);
  if (!r.ok) throw new Error(`cannot draw ${src}`);
  return T.math(r.terms);
};
const IDS = ['a', 'b', 'c', 'd'];
/** Four options in a shuffled order: the id of the first, and the listing. */
function shuffled(rng, opts) {
  const order = rng.shuffle([0, 1, 2, 3]);
  return {
    key: IDS[order.indexOf(0)],
    listing: order.map((j, i) => `${IDS[i]}: ${opts[j]}`).join(' | '),
    labels: order.map((j, i) => [IDS[i], pretty(opts[j])]),
  };
}

// --- Writing in t ----------------------------------------------------------------------

/** a·v + b as written: 2t + 1, −t, 3, t − 4. */
function lin(a, b, v = 't') {
  const head = a === 0 ? '' : `${a === 1 ? '' : a === -1 ? '-' : a}${v}`;
  if (!head) return String(b);
  return b === 0 ? head : `${head} ${b < 0 ? '-' : '+'} ${Math.abs(b)}`;
}
/** c·t² + d·t + e as written. */
function quad(c, d, e) {
  if (c === 0) return lin(d, e);
  const head = `${c === 1 ? '' : c === -1 ? '-' : c}t^2`;
  const rest = [[d, 't'], [e, '']].filter(([k]) => k).map(([k, v]) => `${k < 0 ? '-' : '+'} ${Math.abs(k) === 1 && v ? '' : Math.abs(k)}${v}`);
  return [head, ...rest].join(' ');
}
const atT = (c, d, e, t) => c * t * t + d * t + e;

// --- Drawing -------------------------------------------------------------------------------

function windowAround(points, margin = 1) {
  const xs = [0, ...points.map((p) => p[0])], ys = [0, ...points.map((p) => p[1])];
  return { x0: Math.floor(Math.min(...xs)) - margin, x1: Math.ceil(Math.max(...xs)) + margin,
    y0: Math.floor(Math.min(...ys)) - margin, y1: Math.ceil(Math.max(...ys)) + margin };
}
function plane(win, marks, answer) {
  return { kind: 'plane', xRange: [win.x0, win.x1], yRange: [win.y0, win.y1], grid: 1, marks, answer };
}
/**
 * A polar grid out to M: rings a unit apart and spokes every 15°, angles
 * written every 30°, in place of the square grid, so a point or a curve is
 * read by its r and θ rather than its x and y.
 */
// requiem: play/visuals/polar-grid-on-the-plane
function polarPlane(M, marks, answer) {
  return { kind: 'plane', xRange: [-M, M], yRange: [-M, M], grid: 0, polar: { ring: 1, spokes: 15 }, marks, answer };
}
/** A parametric curve, split at the window, with a head on the last piece showing which way t runs. */
function traced(f, t0, t1, win) {
  const pieces = clipped(f, t0, t1, win);
  const marks = pieces.map((points) => ({ kind: 'path', points, tone: LINE }));
  const last = pieces[pieces.length - 1];
  if (last && last.length > 2) marks.push(arrowhead(last[last.length - 1], last[last.length - 3], LINE, 0.45));
  return marks;
}

// --- Plot Parametric --------------------------------------------------------------------------

/** x = at + b, y = ct² + dt + e, never a point at t = 0 on both axes' 0 only. */
function polyCurve(rng) {
  const a = rng.sign() * rng.int(1, 3), b = rng.int(-5, 5);
  const c = rng.chance(0.35) ? 0 : rng.sign() * rng.int(1, 2), d = rng.int(-4, 4), e = rng.int(-5, 5);
  if (c === 0 && d === 0) return polyCurve(rng);
  return { a, b, c, d, e, xs: lin(a, b), ys: quad(c, d, e) };
}

function plotParametric(rng) {
  // requiem: catalogue/content/parametric-orientation-asked
  // Finding a point is two of the five shapes, not most of the level: the
  // way the curve runs as t grows is asked as often as either other shape.
  const shape = rng.pick(['point', 'trig', 'when', 'cross', 'orient']);
  if (shape === 'orient') return orientation(rng);
  if (shape === 'trig') {
    const A = rng.int(2, 6), B = rng.int(2, 6), h = rng.int(-4, 4), k = rng.int(-4, 4);
    const t = rng.pick([0, 90, 180, 270]);
    const c = Math.round(cosD(t)), s = Math.round(sinD(t));
    const X = A * c + h, Y = B * s + k;
    const xs = `${A}cos(t)${h ? ` ${h < 0 ? '-' : '+'} ${Math.abs(h)}` : ''}`, ys = `${B}sin(t)${k ? ` ${k < 0 ? '-' : '+'} ${Math.abs(k)}` : ''}`;
    const drawn = rng.chance(0.5);
    const win = windowAround([[h - A, k - B], [h + A, k + B]], 1);
    return {
      prompt: [T.prose(`A curve is traced by x = ${pretty(xs)} and y = ${pretty(ys)}, with t in degrees. Where is it when t = ${t}°? Give the point.`)],
      text: `param point: x = ${xs}; y = ${ys} at t = ${t} degrees`,
      answer: pairAnswer(X, Y),
      visual: drawn ? plane(win, traced((u) => [A * cosD(u) + h, B * sinD(u) + k], 0, 330, win), [{ kind: 'point', at: [X, Y], tone: ASKED, label: `t = ${t}°` }]) : null,
      explain: `cos ${t}° = ${minus(c)} and sin ${t}° = ${minus(s)}. So x = ${A}(${minus(c)})${h ? ` ${h < 0 ? '−' : '+'} ${Math.abs(h)}` : ''} = ${minus(X)} and y = ${B}(${minus(s)})${k ? ` ${k < 0 ? '−' : '+'} ${Math.abs(k)}` : ''} = ${minus(Y)}: the point ${pt(X, Y)}.`,
    };
  }
  const C = polyCurve(rng);
  const xAt = (t) => C.a * t + C.b, yAt = (t) => atT(C.c, C.d, C.e, t);
  const sub = (src, t) => pretty(src.replace(/(\d)t/g, `$1(${t})`).replace(/-t/g, `-(${t})`).replace(/\bt\b/g, `(${t})`)).replace(/\((−?\d+)\)²/g, '($1)²');
  if (shape === 'point') {
    const t = rng.int(-3, 3);
    const X = xAt(t), Y = yAt(t);
    const drawn = rng.chance(0.5);
    const span = [-3, -2, -1, 0, 1, 2, 3].map((u) => [xAt(u), yAt(u)]);
    const win = windowAround(span, 1);
    return {
      prompt: [T.prose('A curve is traced by'), eq(`x = ${C.xs}`), T.prose('and'), eq(`y = ${C.ys}`), T.prose(`. Where is it when t = ${minus(t)}? Give the point.`)],
      text: `param point: x = ${C.xs}; y = ${C.ys} at t = ${t}`,
      answer: pairAnswer(X, Y),
      visual: drawn ? plane(win, traced((u) => [xAt(u), yAt(u)], -3, 3, win), [{ kind: 'point', at: [X, Y], tone: ASKED, label: `t = ${minus(t)}` }]) : null,
      explain: `Put t = ${minus(t)} into both: x = ${sub(C.xs, t)} = ${minus(X)} and y = ${sub(C.ys, t)} = ${minus(Y)}. So the point is ${pt(X, Y)}.`,
    };
  }
  if (shape === 'when') {
    const t = rng.int(-4, 4);
    const X = xAt(t), Y = yAt(t);
    return {
      prompt: [T.prose('A curve is traced by'), eq(`x = ${C.xs}`), T.prose('and'), eq(`y = ${C.ys}`), T.prose(`. At what value of t is it at ${pt(X, Y)}?`)],
      text: `param when: x = ${C.xs}; y = ${C.ys} at ${ptA(X, Y)}`,
      answer: fracAnswer(t),
      visual: null,
      explain: `x is ${minus(X)} there: ${pretty(C.xs)} = ${minus(X)}, so ${C.a === 1 || C.b === 0 ? '' : `${C.a === -1 ? '−' : minus(C.a)}t = ${minus(X - C.b)} and `}t = ${minus(t)}. Check y: ${sub(C.ys, t)} = ${minus(Y)}, as it should be. So t = ${minus(t)}.`,
    };
  }
  // Where it crosses the y-axis: x = 0 fixes t, which may be a fraction.
  if (C.b === 0) C.b = rng.sign() * rng.int(1, 5), C.xs = lin(C.a, C.b);
  const t = Q(-C.b, C.a);
  const Y = Q(C.c * t.n * t.n + C.d * t.n * t.d + C.e * t.d * t.d, t.d * t.d);
  return {
    prompt: [T.prose('A curve is traced by'), eq(`x = ${C.xs}`), T.prose('and'), eq(`y = ${C.ys}`), T.prose('. Where does it cross the y-axis? Give the point.')],
    text: `param y-axis: x = ${C.xs}; y = ${C.ys}`,
    answer: pairAnswer(0, Y),
    visual: null,
    explain: `On the y-axis x = 0: ${pretty(C.xs)} = 0, so t = ${qs(t)}. Then y = ${sub(C.ys, qs(t).replace('−', '-'))} = ${qs(Y)}. So it crosses at ${pt(0, Y)}.`,
  };
}

const PLACE = { 'right of': 'right', 'left of': 'left', above: 'top', below: 'bottom' };
/** Where a point sits from a center, along an axis: right of, above. */
function sideOf(P, h, k) {
  if (P[0] > h) return 'right of';
  if (P[0] < h) return 'left of';
  return P[1] > k ? 'above' : 'below';
}

/**
 * Which way an ellipse x = ±A cos t + h, y = ±B sin t + k (or with cos and
 * sin traded) is traced as t grows: the menu is Clockwise and
 * Counterclockwise, keyed half each, since a sign or a trade turns it.
 * Asked without a drawing: the arrow a traced curve carries is the answer.
 */
function orientation(rng) {
  const A = rng.int(2, 6), B = rng.int(2, 6), h = rng.int(-4, 4), k = rng.int(-4, 4);
  const xf = rng.pick(['cos', 'sin']), yf = xf === 'cos' ? 'sin' : 'cos';
  const sx = rng.sign(), sy = rng.sign();
  const f = (fn, t) => Math.round(fn === 'cos' ? cosD(t) : sinD(t));
  const at = (t) => [sx * A * f(xf, t) + h, sy * B * f(yf, t) + k];
  const xs = `${sx < 0 ? '-' : ''}${A}${xf}(t)${plusK(h)}`, ys = `${sy < 0 ? '-' : ''}${B}${yf}(t)${plusK(k)}`;
  const P0 = at(0), P1 = at(90);
  const cross = (P0[0] - h) * (P1[1] - k) - (P0[1] - k) * (P1[0] - h);
  const ccw = cross > 0;
  return {
    prompt: [T.prose(`A curve is traced by x = ${pretty(xs)} and y = ${pretty(ys)}, with t in degrees. As t increases from 0° to 360°, which way does it go round?`)],
    text: `param orientation: x = ${xs}; y = ${ys}`,
    answer: choice(ccw ? 'ccw' : 'cw', [['cw', 'Clockwise'], ['ccw', 'Counterclockwise']]),
    visual: null,
    explain: `It goes round the center (${minus(h)}, ${minus(k)}). At t = 0° it is at ${pt(...P0)}, ${sideOf(P0, h, k)} the center; at t = 90° it is at ${pt(...P1)}, ${sideOf(P1, h, k)} it. `
      + `A quarter turn from the ${PLACE[sideOf(P0, h, k)]} to the ${PLACE[sideOf(P1, h, k)]} is ${ccw ? 'counterclockwise' : 'clockwise'}. So it goes round ${ccw ? 'counterclockwise' : 'clockwise'}.`,
  };
}

// --- Eliminate the Parameter ----------------------------------------------------------------

/** A coefficient in front of a bracket: (2/9), −(1/4), −, nothing. */
function lead(q) {
  if (q.n === q.d) return '';
  if (q.n === -q.d) return '-';
  if (q.d === 1) return String(q.n);
  return q.n < 0 ? `-(${-q.n}/${q.d})` : `(${q.n}/${q.d})`;
}
const shifted = (v, c) => (c === 0 ? v : `(${v} ${c < 0 ? '+' : '-'} ${Math.abs(c)})`);
const plusK = (k) => (k === 0 ? '' : ` ${k < 0 ? '-' : '+'} ${Math.abs(k)}`);
const sqOver = (v, c, D) => `${c === 0 ? `${v}^2` : `${shifted(v, c)}^2`}/${D}`;

function eliminate(rng) {
  const shape = rng.pick(['line', 'line', 'parabola', 'parabola', 'ellipse', 'ellipse']);
  if (shape === 'line') {
    for (;;) {
      const a = rng.sign() * rng.int(1, 4), b = rng.int(-6, 6), c = rng.sign() * rng.int(1, 5), d = rng.int(-6, 6);
      const m = Q(c, a), k = Q(d * a - c * b, a);
      if (a === 1 && rng.chance(0.5)) continue;
      const xs = lin(a, b), ys = lin(c, d);
      // t = (x − b)/a, with a negative a's sign in front: −(x + 6)/4.
      const top = b === 0 ? 'x' : `x ${b < 0 ? '+' : '−'} ${Math.abs(b)}`;
      const bracket = b === 0 ? 'x' : `(${top})`;
      const tIs = a === 1 ? top : a === -1 ? `−${bracket}` : `${a < 0 ? '−' : ''}${bracket}/${Math.abs(a)}`;
      const cT = c === 1 ? '' : c === -1 ? '−' : minus(c);
      const yLine = `${qs(m) === '1' ? '' : qs(m) === '−1' ? '−' : m.d === 1 ? qs(m) : `(${qs(m)})`}x${k.n ? ` ${k.n < 0 ? '−' : '+'} ${qs(Q(Math.abs(k.n), k.d))}` : ''}`;
      return {
        prompt: [T.prose('Eliminate the parameter:'), eq(`x = ${xs}`), T.prose('and'), eq(`y = ${ys}`), T.prose('. Write y in terms of x.')],
        text: `eliminate line: x = ${xs}; y = ${ys}`,
        answer: { type: 'linear', value: { m, b: k } },
        visual: null,
        explain: `Solve the first for t: t = ${tIs}. Put that into y = ${pretty(ys)}: y = ${cT}(${tIs})${d ? ` ${d < 0 ? '−' : '+'} ${Math.abs(d)}` : ''} = ${yLine}. So y = ${yLine}.`,
      };
    }
  }
  if (shape === 'parabola') {
    const c = rng.pick([2, 3]), a = rng.sign() * rng.int(1, 3), h = rng.sign() * rng.int(1, 5), k = rng.int(-5, 5);
    const xs = lin(c, h), ys = `${a === 1 ? '' : a === -1 ? '-' : a}t^2${plusK(k)}`;
    // Two slips crossed: t = (x − h)/c solved with the sign of h kept, and
    // the c divided out once instead of squared.
    const make = (sign, once) => `y = ${lead(Q(a, once ? c : c * c))}${shifted('x', sign ? -h : h)}^2${plusK(k)}`;
    const opts = [make(false, false), make(true, false), make(false, true), make(true, true)];
    const { key, listing, labels } = shuffled(rng, opts);
    return {
      prompt: [T.prose('Eliminate the parameter:'), eq(`x = ${xs}`), T.prose('and'), eq(`y = ${ys}`), T.prose('. Which equation in x and y is the same curve?')],
      text: `eliminate: x = ${xs}; y = ${ys}; options ${listing}`,
      answer: choice(key, labels),
      visual: null,
      explain: `From x = ${pretty(xs)}, t = ${pretty(shifted('x', h))}/${c}. Square it and put it into y: y = ${a === 1 ? '' : a === -1 ? '−' : minus(a)}${pretty(shifted('x', h))}²/${c * c}${pretty(plusK(k))}, which is ${pretty(opts[0])}. `
        + `The others: ${pretty(opts[1])} turns the sign in the bracket; ${pretty(opts[2])} divides by ${c} instead of ${c}² = ${c * c}; ${pretty(opts[3])} does both.`,
    };
  }
  for (;;) {
    const A = rng.int(2, 6), B = rng.int(2, 6), h = rng.int(-4, 4), k = rng.int(-4, 4);
    if (A === B || (!h && !k)) continue;
    const xs = `${A}cos(t)${plusK(h)}`, ys = `${B}sin(t)${plusK(k)}`;
    // Two slips crossed: a² and b² under the wrong letters, and the center's
    // signs kept from the parametric equations.
    const make = (swap, sign) => {
      const [X, Y] = swap ? [B * B, A * A] : [A * A, B * B];
      const [hh, kk] = sign ? [-h, -k] : [h, k];
      return `${sqOver('x', hh, X)} + ${sqOver('y', kk, Y)} = 1`;
    };
    const opts = [make(false, false), make(true, false), make(false, true), make(true, true)];
    const { key, listing, labels } = shuffled(rng, opts);
    return {
      prompt: [T.prose(`Eliminate the parameter: x = ${pretty(xs)} and y = ${pretty(ys)}. Which equation in x and y is the same curve?`)],
      text: `eliminate: x = ${xs}; y = ${ys}; options ${listing}`,
      answer: choice(key, labels),
      visual: null,
      explain: `Solve each for its trig function: cos t = ${pretty(shifted('x', h))}/${A} and sin t = ${pretty(shifted('y', k))}/${B}. Since cos² t + sin² t = 1, ${pretty(opts[0])}. `
        + `The others: ${pretty(opts[1])} puts ${A}² under y and ${B}² under x; ${pretty(opts[2])} turns the signs of the center; ${pretty(opts[3])} does both.`,
    };
  }
}

// --- Parametric Motion ------------------------------------------------------------------------

const THROWS = [
  (v, t, h) => `A ball is thrown at ${v} ft/s at ${t}° above the horizontal from ${h} ft above the ground.`,
  (v, t, h) => `An arrow leaves a bow at ${v} ft/s, ${t}° above the horizontal, ${h} ft above the ground.`,
  (v, t, h) => `A water balloon is launched at ${v} ft/s at ${t}° above the horizontal from a height of ${h} ft.`,
  (v, t) => `A golf ball is hit from the ground at ${v} ft/s at ${t}° above the horizontal.`,
];

/** The path as written: x = (40 cos 31°)t and y = 5 + (40 sin 31°)t − 16t². */
const pathOf = (v, th, h) => `x = (${v} cos ${th}°)t and y = ${h ? `${h} + ` : ''}(${v} sin ${th}°)t − 16t²`;

/**
 * A thrown ball, x = (v cos θ)t and y = h + (v sin θ)t − 16t². Half the
 * rows print that path and half give only the speed, the angle and the
 * height, so the student writes it; a quarter of the level asks which
 * equations model the throw. Every time asked about is before it lands.
 */
// requiem: catalogue/content/motion-asked-in-the-air
// requiem: catalogue/content/motion-model-not-always-given
function motion(rng) {
  const want = rng.pick(['height', 'distance', 'landing', 'top', 'range', 'peak', 'model', 'model']);
  if (want === 'model') return motionModel(rng);
  for (;;) {
    const story = rng.int(0, THROWS.length - 1);
    const v = rng.int(4, 18) * 5, th = rng.int(15, 75), h = story === 3 ? 0 : rng.int(1, 8);
    const s = sinD(th), c = cosD(th), s4 = four(s), c4 = four(c);
    const land = (vs) => (vs + Math.sqrt(vs * vs + 64 * h)) / 32;
    const flight = land(v * s), flight4 = land(v * s4);
    const t = rng.pick([0.5, 1, 1.5, 2, 2.5, 3]);
    // After it lands there is no height or distance to ask about.
    if ((want === 'height' || want === 'distance') && t >= flight - 0.1) continue;
    let exact, alt;
    if (want === 'height') { exact = h + v * s * t - 16 * t * t; alt = h + v * s4 * t - 16 * t * t; }
    else if (want === 'distance') { exact = v * c * t; alt = v * c4 * t; }
    else if (want === 'landing') { exact = flight; alt = flight4; }
    else if (want === 'top') { exact = (v * s) / 32; alt = (v * s4) / 32; }
    else if (want === 'range') { exact = v * c * flight; alt = v * c4 * flight4; }
    else { exact = h + (v * s) ** 2 / 64; alt = h + (v * s4) ** 2 / 64; }
    const q = safeRound(exact, 1, alt);
    if (q === null) continue;
    const given = rng.chance(0.5);
    const words = THROWS[story](v, th, h);
    const eqs = given ? `Its path is ${pathOf(v, th, h)}, in feet, with t in seconds.` : 'Gravity pulls it down 16t² ft in t seconds.';
    const ask = {
      height: `How high is it after ${t} s, in feet, to 1 decimal place?`,
      distance: `How far has it gone horizontally after ${t} s, in feet, to 1 decimal place?`,
      landing: 'When does it hit the ground, in seconds, to 1 decimal place?',
      top: 'When is it highest, in seconds, to 1 decimal place?',
      range: 'How far has it gone horizontally when it hits the ground, in feet, to 1 decimal place?',
      peak: 'What is the greatest height it reaches, in feet, to 1 decimal place?',
    }[want];
    const vs = at4(v * s4), vc = at4(v * c4);
    const landing = h ? `y = 0 when 16t² − ${vs}t − ${h} = 0. By the quadratic formula, the positive root is t = (${vs} + √(${vs}² + 64 × ${h}))/32 ≈ ${at4(flight4)}`
      : `y = 0 when t(${vs} − 16t) = 0, so besides t = 0 it lands at t = ${vs}/16 ≈ ${at4(flight4)}`;
    const how = {
      height: `y = ${h ? `${h} + ` : ''}${vs}(${t}) − 16(${t})² ≈ ${at4(alt)}`,
      distance: `x = ${vc}(${t}) ≈ ${at4(alt)}`,
      landing,
      top: `y = ${h ? `${h} + ` : ''}${vs}t − 16t² is a parabola opening down, highest at t = −b/(2a) = ${vs}/32 ≈ ${at4(alt)}`,
      range: `${landing}. Then x = ${vc} × ${at4(flight4)} ≈ ${at4(alt)}`,
      peak: `y = ${h ? `${h} + ` : ''}${vs}t − 16t² is highest at t = ${vs}/32 ≈ ${at4((v * s4) / 32)}, where y = ${h ? `${h} + ` : ''}${vs}²/64 ≈ ${at4(alt)}`,
    }[want];
    const feet = want !== 'landing' && want !== 'top';
    return {
      prompt: [T.prose(`${words} ${eqs} ${ask}`)],
      text: `motion ${want}: v ${v} at ${th} degrees from ${h} ft${want === 'height' || want === 'distance' ? ` after ${t} s` : ''} to 1 dp${given ? ' with its path' : ''}`,
      answer: roundedAnswer(q, 1),
      visual: null,
      explain: `${given ? '' : `Its path is ${pathOf(v, th, h)}. `}${v} sin ${th}° ≈ ${vs} and ${v} cos ${th}° ≈ ${vc}. ${how}. So it is ${roundedText(q, 1)} ${feet ? 'ft' : 's'}.`,
    };
  }
}

/**
 * Which equations model a throw. Two slips crossed: cos and sin traded
 * between x and y, and gravity's 32 ft/s² put in whole where half of it,
 * 16, belongs.
 */
function motionModel(rng) {
  const story = rng.int(0, THROWS.length - 1);
  const v = rng.int(4, 18) * 5, th = rng.int(15, 75), h = story === 3 ? 0 : rng.int(1, 8);
  if (th === 45) return motionModel(rng);
  const make = (swap, g) => `x = (${v}${swap ? 'sin' : 'cos'}(${th}°))t, y = ${h ? `${h} + ` : ''}(${v}${swap ? 'cos' : 'sin'}(${th}°))t - ${g}t^2`;
  const opts = [make(false, 16), make(true, 16), make(false, 32), make(true, 32)];
  const { key, listing, labels } = shuffled(rng, opts);
  const show = (o) => pretty(o).replace(/(\d)(cos|sin)/g, '$1 $2');
  return {
    prompt: [T.prose(`${THROWS[story](v, th, h)} Which equations model its path, with x and y in feet and t in seconds?`)],
    text: `motion model: v ${v} at ${th} degrees from ${h} ft; options ${listing}`,
    answer: choice(key, labels.map(([id, label]) => [id, label.replace(/(\d)(cos|sin)/g, '$1 $2')])),
    visual: null,
    explain: `Across, it keeps the horizontal part of its velocity, ${v} cos ${th}° ft/s; up, it starts with the vertical part, ${v} sin ${th}° ft/s${h ? `, from ${h} ft` : ''}, and gravity's 32 ft/s² takes ½ × 32t² = 16t² off its height. So ${show(opts[0])}. `
      + `The others: ${show(opts[1])} trades cos and sin; ${show(opts[2])} takes off 32t², the whole of gravity's 32 where half belongs; ${show(opts[3])} does both.`,
  };
}

/** (n/d)√r as written, with a real minus sign: −3√2/2, √3, −5, 0. */
function exact(n, d, r) {
  const q = Q(n, d);
  if (q.n === 0) return '0';
  const size = Math.abs(q.n);
  const top = r === 1 ? String(size) : `${size === 1 ? '' : size}√${r}`;
  return `${q.n < 0 ? '−' : ''}${q.d === 1 ? top : `${top}/${q.d}`}`;
}

// --- Polar to Rectangular ---------------------------------------------------------------------

const SPECIAL = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330];

const LETTERS = ['A', 'B', 'C', 'D'];

/**
 * Which of four points on a polar grid is (r, θ). Two slips crossed, each a
 * real misreading: with a negative r, its sign ignored and θ turned
 * clockwise; with a positive r, θ turned clockwise and measured from the
 * positive y-axis. The four letters are the menu and the key moves among
 * them.
 */
// requiem: catalogue/content/polar-points-plotted-on-a-polar-grid
function polarPlot(rng) {
  const neg = rng.chance(0.5);
  const size = rng.int(1, 5), r = neg ? -size : size;
  // A positive r keeps to the 30° family: at 45° clockwise from the y-axis
  // and counterclockwise from the x-axis are one direction.
  const deg = rng.pick(SPECIAL.filter((d) => d % 90 && (neg || d % 30 === 0)));
  const radians = rng.chance(0.4);
  const norm = (d) => ((d % 360) + 360) % 360;
  // The direction each reading puts the point in, at distance |r|.
  const dirs = neg ? [deg + 180, deg, 180 - deg, -deg] : [deg, -deg, 90 + deg, 90 - deg];
  const order = rng.shuffle([0, 1, 2, 3]);
  const at = (d) => [+(size * cosD(d)).toFixed(3), +(size * sinD(d)).toFixed(3)];
  const letterOf = (j) => LETTERS[order.indexOf(j)];
  const marks = order.map((j, i) => ({ kind: 'point', at: at(dirs[j]), tone: LINE, label: LETTERS[i] }));
  const ang = angleText(deg, radians);
  const way = neg
    ? `θ = ${ang} points one way, and a negative r goes ${size} the opposite way, along ${angleText(norm(deg + 180), radians)}`
    : `Turn ${ang} counterclockwise from the positive x-axis and go out ${size}`;
  const others = neg
    ? `${letterOf(1)} ignores the sign of r; ${letterOf(2)} turns θ clockwise; ${letterOf(3)} does both`
    : `${letterOf(1)} turns θ clockwise; ${letterOf(2)} measures θ from the positive y-axis; ${letterOf(3)} turns it clockwise from the positive y-axis`;
  return {
    prompt: [T.prose(`Which point is the polar point (r, θ) = (${minus(r)}, ${ang})?`)],
    // Where each letter is drawn, so two layouts of one point are two rows.
    text: `polar plot: r = ${r} at ${deg} degrees${radians ? ' as radians' : ''}; options ${marks.map((mk) => `${mk.label}: (${mk.at[0]}, ${mk.at[1]})`).join(' | ')}`,
    answer: choice(letterOf(0), LETTERS.map((l) => [l, l])),
    visual: polarPlane(size + 2, marks, [{ kind: 'point', at: at(dirs[0]), tone: ASKED, label: `(${minus(r)}, ${ang})` }]),
    explain: `${way}. That is point ${letterOf(0)}. The others: ${others}. So it is ${letterOf(0)}.`,
  };
}

function polarToRect(rng) {
  // requiem: catalogue/content/polar-points-plotted-on-a-polar-grid
  if (rng.chance(0.25)) return polarPlot(rng);
  for (;;) {
    const want = rng.pick(['x', 'y']);
    const rr = (rng.chance(0.2) ? -1 : 1) * rng.int(1, 10);
    const deg = rng.pick(SPECIAL);
    if (deg % 90 === 0 && !rng.chance(0.3)) continue;
    const radians = rng.chance(0.4);
    const fn = want === 'x' ? 'cos' : 'sin';
    const v = exactTrig(fn, deg);
    const n = rr * v.n, d = v.d, k = v.r;
    const val = exact(n, d, k);
    const ang = angleText(deg, radians);
    return {
      prompt: [T.prose(`What is the ${want}-coordinate of the polar point (r, θ) = (${minus(rr)}, ${ang})? Give it exactly.`)],
      text: `polar ${want}: r = ${rr} at ${radians ? `${deg} degrees as radians` : `${deg} degrees`}`,
      answer: rootAnswer(want, n, d, k),
      visual: null,
      explain: `${want} = r ${fn} θ = ${minus(rr)} × ${fnText(fn, deg, radians)} = ${rr < 0 ? `(${minus(rr)})` : rr} × ${v.n < 0 ? `(${exact(v.n, v.d, v.r)})` : exact(v.n, v.d, v.r)} = ${val}. So ${want} = ${val}.`,
    };
  }
}

// --- Rectangular to Polar ---------------------------------------------------------------------

function surd(n) {
  let s = 1, r = n;
  for (let k = 2; k * k <= r; k++) while (r % (k * k) === 0) { r /= k * k; s *= k; }
  return { s, r };
}
function placed(x, y, ref) {
  if (x > 0 && y >= 0) return [ref, 'In quadrant I, θ is the reference angle'];
  if (x < 0 && y >= 0) return [180 - ref, `In quadrant II, θ = 180° − ${at4(ref)}°`];
  if (x < 0) return [180 + ref, `In quadrant III, θ = 180° + ${at4(ref)}°`];
  return [360 - ref, `In quadrant IV, θ = 360° − ${at4(ref)}°`];
}

/** (n/d)√r with whole n as ASCII the checker reads: -2sqrt(3), 4, 3sqrt(3)/2. */
const exactA = (n, d, r) => `${n < 0 ? '-' : ''}${r === 1 ? Math.abs(n) : `${Math.abs(n) === 1 ? '' : Math.abs(n)}sqrt(${r})`}${d === 1 ? '' : `/${d}`}`;
const refAngleOf = (d) => [d, 180 - d, d - 180, 360 - d][Math.floor(d / 90)];

/**
 * A point at a special angle in exact polar form, θ in degrees or radians:
 * (−1, √3) is (2, 2π/3). Two slips crossed: r left as x² + y², the root
 * forgotten, and θ half a turn out, since the inverse tangent cannot tell
 * (x, y) from (−x, −y).
 */
// requiem: catalogue/content/exact-polar-form-at-special-angles
function exactPolar(rng) {
  const radians = rng.chance(0.5);
  const deg = rng.pick(SPECIAL.filter((d) => d % 90));
  const k = rng.int(1, 4);
  // The 45° family at r = k√2 and the 30° family at r = 2k, so x and y are
  // k or k√3, nothing over 2.
  const fam45 = deg % 45 === 0;
  const R2 = fam45 ? 2 * k * k : 4 * k * k;
  const coord = (fn) => {
    const v = exactTrig(fn, deg);
    // R × (n/d)√m: the √2s meet for the 45s, and 2k over 2 for the 30s.
    if (fam45) return { n: (k * 2 * v.n) / v.d, d: 1, r: 1 };
    return { n: (2 * k * v.n) / v.d, d: 1, r: v.r };
  };
  const X = coord('cos'), Y = coord('sin');
  const rText = fam45 ? `${k === 1 ? '' : k}√2` : String(2 * k);
  const norm = (d) => ((d % 360) + 360) % 360;
  const make = (squared, turned) => `(${squared ? R2 : rText}, ${angleText(turned ? norm(deg + 180) : deg, radians)})`;
  const opts = [make(false, false), make(true, false), make(false, true), make(true, true)];
  const { key, listing, labels } = shuffled(rng, opts);
  const quadrant = deg < 90 ? 'I' : deg < 180 ? 'II' : deg < 270 ? 'III' : 'IV';
  const sq = (v) => v.n * v.n * v.r;
  const shown = (v) => exact(v.n, v.d, v.r);
  const inBr = (v) => (v.n < 0 ? `(${shown(v)})` : shown(v));
  return {
    prompt: [T.prose(`Write the point (${shown(X)}, ${shown(Y)}) in polar form (r, θ), with r > 0 and θ ${radians ? 'in radians from 0 to 2π' : 'in degrees from 0° to 360°'}.`)],
    text: `polar form: (${exactA(X.n, X.d, X.r)}, ${exactA(Y.n, Y.d, Y.r)}) ${radians ? 'radians' : 'degrees'}; options ${listing}`,
    answer: choice(key, labels),
    visual: null,
    explain: `r = √(${inBr(X)}² + ${inBr(Y)}²) = √(${sq(X)} + ${sq(Y)}) = √${R2} = ${rText}. The point is in quadrant ${quadrant}, and its reference angle is ${angleText(refAngleOf(deg), radians)}, so θ = ${angleText(deg, radians)}. So it is ${opts[0]}. `
      + `The others: ${opts[1]} leaves r as x² + y² = ${R2}, without the root; ${opts[2]} is half a turn out, the point (${shown({ ...X, n: -X.n })}, ${shown({ ...Y, n: -Y.n })}), whose tan θ is the same; ${opts[3]} does both.`,
  };
}

/**
 * Another polar name for one point: a negative r half a turn round, or the
 * same r a whole turn round. Two slips crossed: r's sign turned with θ left
 * alone (the point opposite), and θ measured clockwise (the point reflected
 * in the x-axis).
 */
// requiem: catalogue/content/polar-points-have-many-names
function polarNames(rng) {
  const radians = rng.chance(0.5);
  const r = rng.int(1, 9), deg = rng.pick(SPECIAL.filter((d) => d % 90));
  const form = rng.pick(['neg+', 'neg-', 'co+', 'co-']);
  const [kr, kd] = { 'neg+': [-r, deg + 180], 'neg-': [-r, deg - 180], 'co+': [r, deg + 360], 'co-': [r, deg - 360] }[form];
  const opts = [[kr, kd], [-kr, kd], [kr, -kd], [-kr, -kd]];
  const order = rng.shuffle([0, 1, 2, 3]);
  const name = ([rr, d]) => `(${minus(rr)}, ${angleText(d, radians)})`;
  const key = IDS[order.indexOf(0)];
  const listing = order.map((j, i) => `${IDS[i]}: (${opts[j][0]}, ${opts[j][1]})`).join(' | ');
  const half = form.startsWith('neg');
  const turn = radians ? (half ? 'π' : '2π') : (half ? '180°' : '360°');
  const adding = form.endsWith('+') ? 'adding' : 'taking away';
  const why = half
    ? `A negative r goes the opposite way along θ, so turning θ half a turn (${adding} ${turn}) and making r negative lands on the same point`
    : `A whole turn points the same way, so ${adding} ${turn} and keeping r names the same point`;
  return {
    prompt: [T.prose(`Which polar coordinates name the same point as (r, θ) = (${r}, ${angleText(deg, radians)})?`)],
    text: `polar same point: (${r}, ${deg}) ${radians ? 'radians' : 'degrees'}; options ${listing}`,
    answer: choice(key, order.map((j, i) => [IDS[i], name(opts[j])])),
    visual: null,
    explain: `${why}: ${name(opts[0])}. The others: ${name(opts[1])} is the point opposite it, through the origin; ${name(opts[2])} measures the angle clockwise, the point reflected in the x-axis; ${name(opts[3])} does both. So it is ${name(opts[0])}.`,
  };
}

function rectToPolar(rng) {
  const shape = rng.pick(['r', 'r', 'r', 'angle', 'angle', 'angle', 'exact', 'exact', 'names', 'names']);
  if (shape === 'exact') return exactPolar(rng);
  if (shape === 'names') return polarNames(rng);
  if (shape === 'r') {
    let x, y;
    do { x = rng.int(-10, 10); y = rng.int(-10, 10); } while (!x || !y);
    const n = x * x + y * y, { s, r } = surd(n);
    const simplified = r === 1 ? `√${n} = ${s}` : s === 1 ? `√${n}` : `√${n} = ${rootText(s, 1, r)}`;
    return {
      prompt: [T.prose(`The point ${pt(x, y)} is written in polar form (r, θ) with r > 0. What is r? Give it exactly, with any radical in simplest form.`)],
      text: `polar r: ${ptA(x, y)}`,
      // requiem: play/answers/roots-preview-names-the-asked-letter
      answer: { ...rootAnswer('r', s, 1, r), requireSimplest: true },
      visual: null,
      explain: `r is the distance from the origin: r = √(${x < 0 ? `(${minus(x)})` : x}² + ${y < 0 ? `(${minus(y)})` : y}²) = √(${x * x} + ${y * y}) = ${simplified}. So r = ${rootText(s, 1, r)}.`,
    };
  }
  for (;;) {
    const x = rng.int(-10, 10), y = rng.int(-10, 10);
    if (!x || !y) continue;
    const ref = atanD(Math.abs(y / x));
    const [theta, how] = placed(x, y, ref);
    const q = safeRound(theta, 1, placed(x, y, four(ref))[0]);
    if (q === null) continue;
    return {
      prompt: [T.prose(`The point ${pt(x, y)} is written in polar form (r, θ) with r > 0. What is θ, in degrees from 0 to 360, to 1 decimal place?`)],
      text: `polar angle: ${ptA(x, y)} to 1 dp`,
      answer: roundedAnswer(q, 1),
      visual: null,
      explain: `The reference angle is tan⁻¹(${Math.abs(y)}/${Math.abs(x)}) ≈ ${at4(ref)}°. ${how}${x > 0 && y > 0 ? '' : ` ≈ ${at4(theta)}°`}. So θ ≈ ${roundedText(q, 1)}°.`,
    };
  }
}

// --- Converting Equations -----------------------------------------------------------------------

function converting(rng) {
  const fam = rng.pick(['circle-to-rect', 'line-to-polar', 'circle-to-polar']);
  const coef = (n) => (n === 1 ? '' : n === -1 ? '-' : String(n));
  if (fam === 'circle-to-rect') {
    const a = rng.sign() * rng.int(2, 8), fn = rng.pick(['cos', 'sin']);
    const v = fn === 'cos' ? 'x' : 'y', w = fn === 'cos' ? 'y' : 'x';
    // Two slips crossed: cos read as y (sin as x), and a squared.
    const make = (swap, squared) => `x^2 + y^2 = ${coef(squared ? a * a : a)}${swap ? w : v}`;
    const opts = [make(false, false), make(true, false), make(false, true), make(true, true)];
    const { key, listing, labels } = shuffled(rng, opts);
    const src = `r = ${coef(a)}${fn}(θ)`;
    return {
      prompt: [T.prose(`Which rectangular equation is the same curve as ${pretty(src)}?`)],
      text: `to rectangular: ${src}; options ${listing}`,
      answer: choice(key, labels),
      visual: null,
      explain: `Multiply both sides by r: r² = ${minus(a)}r ${fn} θ. Now r² = x² + y² and r ${fn} θ = ${v}, so ${pretty(opts[0])}. `
        + `The others: ${pretty(opts[1])} takes r ${fn} θ for ${w}; ${pretty(opts[2])} squares the ${minus(a)}; ${pretty(opts[3])} does both.`,
    };
  }
  if (fam === 'line-to-polar') {
    const c = rng.sign() * rng.int(2, 9), v = rng.pick(['x', 'y']);
    const fn = v === 'x' ? 'cos' : 'sin', other = v === 'x' ? 'sin' : 'cos';
    // Two slips crossed: x read as r sin θ (y as r cos θ), and r multiplied
    // by the trig function instead of divided.
    const make = (swap, times) => `r = ${times ? `${c}${swap ? other : fn}(θ)` : `${c}/${swap ? other : fn}(θ)`}`;
    const opts = [make(false, false), make(true, false), make(false, true), make(true, true)];
    const { key, listing, labels } = shuffled(rng, opts);
    return {
      prompt: [T.prose(`Which polar equation is the same line as ${v} = ${minus(c)}?`)],
      text: `to polar: ${v} = ${c}; options ${listing}`,
      answer: choice(key, labels),
      visual: null,
      explain: `${v} = r ${fn} θ, so r ${fn} θ = ${minus(c)}, and dividing by ${fn} θ, ${pretty(opts[0])}. `
        + `The others: ${pretty(opts[1])} takes ${v} for r ${other} θ; ${pretty(opts[2])} multiplies by ${fn} θ instead of dividing; ${pretty(opts[3])} does both.`,
    };
  }
  const a = rng.sign() * rng.int(2, 9), v = rng.pick(['x', 'y']);
  const fn = v === 'x' ? 'cos' : 'sin', other = v === 'x' ? 'sin' : 'cos';
  // Two slips crossed: cos and sin traded, and the r divided where it cancels.
  const make = (swap, divided) => `r = ${divided ? `${a}/${swap ? other : fn}(θ)` : `${coef(a)}${swap ? other : fn}(θ)`}`;
  const opts = [make(false, false), make(true, false), make(false, true), make(true, true)];
  const { key, listing, labels } = shuffled(rng, opts);
  const src = `x^2 + y^2 = ${coef(a)}${v}`;
  return {
    prompt: [T.prose(`Which polar equation is the same curve as ${pretty(src)}?`)],
    text: `to polar: ${src}; options ${listing}`,
    answer: choice(key, labels),
    visual: null,
    explain: `x² + y² = r² and ${v} = r ${fn} θ, so r² = ${minus(a)}r ${fn} θ. Divide by r: ${pretty(opts[0])}. `
      + `The others: ${pretty(opts[1])} trades cos and sin; ${pretty(opts[2])} divides by ${fn} θ where the r should cancel; ${pretty(opts[3])} does both.`,
  };
}

// --- Polar Graphs ---------------------------------------------------------------------------------

/** A coefficient in front of a trig function: 3, −, nothing. */
const times = (a) => (a === 1 ? '' : a === -1 ? '-' : String(a));

/**
 * A polar curve: its equation in ASCII, r(θ in degrees), and what it is.
 * Asked about in words, the numbers run wider; drawn, they stay small
 * enough to read on the grid.
 */
function polarCurve(rng, kind, wide = false) {
  const fn = rng.pick(['cos', 'sin']);
  const f = fn === 'cos' ? cosD : sinD;
  if (kind === 'rose') {
    const a = wide ? rng.sign() * rng.int(1, 9) : rng.int(2, 6), n = wide ? rng.int(2, 9) : rng.int(2, 5);
    return { kind, fn, a, n, src: `r = ${times(a)}${fn}(${n}θ)`, r: (t) => a * f(n * t), max: Math.abs(a), petals: n % 2 ? n : 2 * n };
  }
  if (kind === 'circle') {
    if (wide && rng.chance(0.2)) {
      const c = rng.int(1, 9);
      return { kind, fn: null, a: c, src: `r = ${c}`, r: () => c, max: c, centered: true };
    }
    const a = rng.sign() * rng.int(wide ? 1 : 2, wide ? 9 : 6);
    return { kind, fn, a, src: `r = ${times(a)}${fn}(θ)`, r: (t) => a * f(t), max: Math.abs(a) };
  }
  const top = wide ? 9 : 5;
  const b = rng.int(1, top), a = kind === 'cardioid' ? b : rng.int(1, top + 1);
  if (kind === 'limacon' && a === b) return polarCurve(rng, kind, wide);
  const sign = rng.sign();
  return { kind, fn, a, b, sign, src: `r = ${a} ${sign < 0 ? '-' : '+'} ${b === 1 ? '' : b}${fn}(θ)`, r: (t) => a + sign * b * f(t), max: a + b };
}
const NAMES = { circle: 'a circle', cardioid: 'a cardioid', limacon: 'a limaçon', rose: 'a rose' };
const KINDS = [['circle', 'Circle'], ['cardioid', 'Cardioid'], ['limacon', 'Limaçon'], ['rose', 'Rose']];

function why(C) {
  if (C.kind === 'rose') return `r = a ${C.fn} nθ with n = ${C.n} is a rose; n is ${C.n % 2 ? 'odd, so it has n' : 'even, so it has 2n'} = ${C.petals} petals, each ${C.max} long`;
  if (C.kind === 'circle' && C.centered) return `r = ${C.a} is every point ${C.a} from the origin: a circle about the origin, of radius ${C.a}`;
  if (C.kind === 'circle') return `r = a ${C.fn} θ is a circle through the origin, of diameter |a| = ${C.max}`;
  if (C.kind === 'cardioid') return `r = a ± b ${C.fn} θ with a = b = ${C.a} is a cardioid, reaching out to a + b = ${C.max}`;
  return `r = a ± b ${C.fn} θ with a = ${C.a} and b = ${C.b} unequal is a limaçon, ${C.a < C.b ? 'with an inner loop since a < b,' : 'without an inner loop since a > b,'} reaching out to a + b = ${C.max}`;
}

function polarGraphs(rng) {
  const shape = rng.pick(['petals', 'petals', 'max', 'max', 'name', 'name', 'graph', 'graph', 'graph']);
  if (shape === 'petals') {
    const C = polarCurve(rng, 'rose', true);
    return {
      prompt: [T.prose(`How many petals does the rose ${pretty(C.src)} have?`)],
      text: `polar petals: ${C.src}`,
      answer: fracAnswer(C.petals),
      visual: null,
      explain: `${why(C)}. So it has ${C.petals}.`,
    };
  }
  if (shape === 'max') {
    const C = polarCurve(rng, rng.pick(['rose', 'circle', 'cardioid', 'limacon']), true);
    return {
      prompt: [T.prose(`What is the greatest distance from the origin of any point on ${pretty(C.src)}?`)],
      text: `polar max r: ${C.src}`,
      answer: fracAnswer(C.max),
      visual: null,
      explain: `${why(C)}. So the greatest distance is ${C.max}.`,
    };
  }
  if (shape === 'name') {
    // requiem: catalogue/content/fixed-menu-key-moves
    // A cardioid's and a circle's equations are few beside a rose's and a
    // limaçon's, and the build keeps distinct rows only, so they are drawn
    // more often for each name to be the key about as often.
    const C = polarCurve(rng, rng.pick(['cardioid', 'cardioid', 'cardioid', 'cardioid', 'cardioid', 'cardioid', 'circle', 'circle', 'circle', 'circle', 'rose', 'rose', 'limacon', 'limacon']), true);
    return {
      prompt: [T.prose(`What kind of curve is ${pretty(C.src)}?`)],
      text: `polar curve: ${C.src}`,
      answer: choice(C.kind, KINDS),
      visual: null,
      explain: `${why(C)}. So it is ${NAMES[C.kind]}.`,
    };
  }
  // requiem: catalogue/content/polar-graphs-drawn-from-their-equation
  const kind = rng.pick(['rose', 'rose', 'circle', 'cardioid', 'limacon']);
  const C = polarCurve(rng, kind);
  // Two slips crossed, each visible in the drawing: cos and sin traded (the
  // curve turned), and for a rose n doubled (twice the petals), for a
  // limaçon or cardioid the sign turned, for a circle a negated (the far side).
  const alt = (swap, other) => {
    const fn = swap ? (C.fn === 'cos' ? 'sin' : 'cos') : C.fn;
    if (kind === 'rose') return `r = ${C.a}${fn}(${other ? 2 * C.n : C.n}θ)`;
    if (kind === 'circle') { const a = other ? -C.a : C.a; return `r = ${a}${fn}(θ)`; }
    const s = other ? -C.sign : C.sign;
    return `r = ${C.a} ${s < 0 ? '-' : '+'} ${C.b === 1 ? '' : C.b}${fn}(θ)`;
  };
  const opts = [alt(false, false), alt(true, false), alt(false, true), alt(true, true)];
  const { key, listing, labels } = shuffled(rng, opts);
  const M = C.max + 1;
  const points = [];
  for (let i = 0; i <= 720; i++) {
    const t = i / 2, r = C.r(t);
    points.push([+(r * cosD(t)).toFixed(3), +(r * sinD(t)).toFixed(3)]);
  }
  const at = [0, 30, 45, 60, 90].map((t) => `(${+C.r(t).toFixed(3)}, ${t})`).join(', ');
  // The farthest point, labelled once answered.
  // Where |r| is greatest: a rose's petal along nθ = 0° or 90°, a circle's
  // far side, a limaçon's where ± b cos θ (or sin θ) is +b.
  const far = kind === 'rose' ? (C.fn === 'cos' ? 0 : 90 / C.n) : kind === 'circle' ? (C.fn === 'cos' ? 0 : 90)
    : (C.fn === 'cos' ? 0 : 90) + (C.sign < 0 ? 180 : 0);
  const farR = C.r(far);
  const farPt = [+(farR * cosD(far)).toFixed(3), +(farR * sinD(far)).toFixed(3)];
  return {
    prompt: [T.prose('Which polar equation is graphed?')],
    text: `polar graph: through ${at}; options ${listing}`,
    answer: choice(key, labels),
    // requiem: play/visuals/polar-grid-on-the-plane
    visual: polarPlane(M, [{ kind: 'path', points, tone: LINE }],
      [{ kind: 'point', at: farPt, tone: ASKED, label: `r = ${minus(C.max)}` }, { kind: 'text', at: [-M + 0.3, M - 0.6], label: pretty(C.src), tone: ASKED }]),
    explain: `${why(C)}. It is ${pretty(opts[0])}. The others: ${pretty(opts[1])} is the same curve turned; ${pretty(opts[2])} ${kind === 'rose' ? `has ${(2 * C.n) % 2 ? 2 * C.n : 4 * C.n} petals` : kind === 'circle' ? 'lies on the other side of the origin' : 'faces the other way'}; ${pretty(opts[3])} does both.`,
  };
}

const CONTENT = [plotParametric, eliminate, motion, polarToRect, rectToPolar, converting, polarGraphs];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  // requiem: catalogue/content/one-input-per-level
  // A point is asked "Give the point" and goes in the pair box; a value of
  // t, a petal count or a distance is a number; an eliminated line is
  // "y in terms of x"; an exact coordinate or r says "exactly"; an angle or
  // a motion answer says "to 1 decimal place"; the rest are choices.
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
