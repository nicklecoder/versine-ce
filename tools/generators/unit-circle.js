/**
 * Catalogue authoring tool: builds the problem library for unit-circle.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 *
 * Every `text` gives the function and the angle as asked, in degrees
 * (`sin 210`) or as a multiple of π (`sin 7/6 pi`), and scripts/check-answers.py
 * works each value out again with the calculator and compares it with the
 * stored exact a + b√r. A value from one ratio is worked again from the
 * sides of the reference triangle.
 */
import * as T from '../terms.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/unit-circle.js';
import { fracAnswer, fracText, reduce } from './chance.js';
import { toward, text, LINE, GIVEN } from './figures.js';
import { rootAnswer, rootText, piText, angleText, fnText, refAngle, quadrantOf, exactTrig, tenths } from './trig.js';

const ROMAN = ['', 'I', 'II', 'III', 'IV'];
const minus = (s) => String(s).replace('-', '−');
/** (n/d)√r written, sign and all: −√3/2, 1/2, 0. */
const valueText = (v) => (v.n === 0 ? '0' : `${v.n < 0 ? '−' : ''}${rootText(Math.abs(v.n), v.d, v.r)}`);
/** n/d with the sign on top, as an answer and as written. */
const signedFrac = (n, d) => (d < 0 ? fracAnswer(-n, -d) : fracAnswer(n, d));
const exact = (v, letter = 'x') => rootAnswer(letter, v.n, v.d, v.r);
/** The angle as the text gives it: 210, or 7/6 pi. */
const angleKey = (deg, radians) => { if (!radians) return String(deg); const q = reduce(deg, 180); return `${q.n}/${q.d} pi`; };
const ask = (what) => [T.prose(`Find the exact value of x = ${what}.`)];

const NAMES = { sin: 'sine', cos: 'cosine', tan: 'tangent', sec: 'secant', csc: 'cosecant', cot: 'cotangent' };
const WHERE = { sin: 'the y-coordinate', cos: 'the x-coordinate', tan: 'y/x', sec: '1/x', csc: '1/y', cot: 'x/y' };
// Where each is positive, beyond quadrant I.
const POSITIVE = { sin: [1, 2], csc: [1, 2], cos: [1, 4], sec: [1, 4], tan: [1, 3], cot: [1, 3] };

/** A multiple of 30° or 45° in one turn, not on an axis unless `axes`. */
function specialAngle(rng, { axes = false, firstQuadrant = false } = {}) {
  const pool = [];
  for (let d = 0; d <= 360; d += 15) {
    if (d % 30 && d % 45) continue;
    if (firstQuadrant && d > 90 && !(axes && d % 90 === 0)) continue;
    if (!axes && d % 90 === 0) continue;
    if (!firstQuadrant && !axes && d < 90) continue;
    pool.push(d);
  }
  return rng.pick(pool);
}

/** The reference angle's working, in the form the question used. */
function referenceWords(deg, radians) {
  const q = quadrantOf(deg), ref = refAngle(deg), t = ((deg % 360) + 360) % 360;
  const A = (d) => angleText(d, radians);
  const turned = t === deg ? '' : `${A(deg)} is coterminal with ${A(t)}, `;
  const rule = q === 2 ? `${A(180)} − ${A(t)}` : q === 3 ? `${A(t)} − ${A(180)}` : `${A(360)} − ${A(t)}`;
  return `${turned}${turned ? 'which' : `${A(deg)}`} is in quadrant ${ROMAN[q]}, so its reference angle is ${rule} = ${A(ref)}`;
}

// ── Special Angles ──────────────────────────────────────────────────────

function special(rng) {
  const deg = rng.pick([0, 30, 45, 60, 90, 30, 45, 60, 180, 270, 360]);
  const radians = deg !== 0 && rng.chance(0.5);
  const A = angleText(deg, radians);
  const form = rng.pick(['sin', 'cos', 'x', 'y']);
  const fn = form === 'x' ? 'cos' : form === 'y' ? 'sin' : form;
  const v = exactTrig(fn, deg);
  const onAxis = deg % 90 === 0;
  const why = onAxis
    ? `At ${A} the point on the unit circle is (${valueText(exactTrig('cos', deg))}, ${valueText(exactTrig('sin', deg))}), on an axis.`
    : deg === 45
      ? `At ${A} the point is on the line y = x, the hypotenuse-1 corner of a 45-45-90 triangle, so both coordinates are 1/√2 = √2/2.`
      : `At ${A} the point is the corner of a 30-60-90 triangle with hypotenuse 1: the side opposite 30° is 1/2 and the other is √3/2, so the point is (${valueText(exactTrig('cos', deg))}, ${valueText(exactTrig('sin', deg))}).`;
  const trap = form === 'x' || form === 'y'
    ? '(The x-coordinate is the cosine and the y-coordinate is the sine, in that order.)'
    : fn === 'sin' ? '(Sine is the y-coordinate, how high the point is, not x.)' : '(Cosine is the x-coordinate, how far across the point is, not y.)';
  if (form === 'x' || form === 'y') {
    return {
      prompt: [T.prose(`The terminal side of ${A} meets the unit circle at a point. Find the exact value of its ${form}-coordinate, ${form}.`)],
      text: `point coordinate: ${form}, ${angleKey(deg, radians)}`,
      answer: exact(v, form),
      visual: null,
      explain: `${why} The ${form}-coordinate is ${fnText(fn, deg, radians)} = ${valueText(v)}. ${trap} So ${form} = ${valueText(v)}.`,
    };
  }
  return {
    prompt: ask(fnText(fn, deg, radians)),
    text: `exact: ${fn} ${angleKey(deg, radians)}`,
    answer: exact(v),
    visual: null,
    explain: `${why} ${fn === 'sin' ? 'Sine is the y-coordinate' : 'Cosine is the x-coordinate'}, so ${fnText(fn, deg, radians)} = ${valueText(v)}. ${trap} So x = ${valueText(v)}.`,
  };
}

// ── Signs by Quadrant ───────────────────────────────────────────────────

const SIGN_OPTIONS = [{ id: 'positive', label: 'Positive' }, { id: 'negative', label: 'Negative' }];
const QUAD_OPTIONS = [1, 2, 3, 4].map((q) => ({ id: ROMAN[q], label: `Quadrant ${ROMAN[q]}` }));
const QUAD_WORDS = { 1: 'right and up: x and y both positive', 2: 'left and up: x negative, y positive', 3: 'left and down: x and y both negative', 4: 'right and down: x positive, y negative' };

function signs(rng) {
  const kind = rng.pick(['angle', 'angle', 'quadrant', 'from signs']);
  const fn = rng.pick(['sin', 'cos', 'tan', 'sin', 'cos', 'tan', 'sec', 'csc', 'cot']);
  if (kind === 'angle') {
    const radians = rng.chance(0.4);
    let deg;
    do {
      deg = radians ? rng.int(-24, 48) * 15 : rng.int(-36, 72) * 10 + rng.pick([0, 5]);
    } while (deg % 90 === 0 || deg === 0);
    const q = quadrantOf(deg);
    const pos = POSITIVE[fn].includes(q);
    const t = ((deg % 360) + 360) % 360;
    return {
      prompt: [T.prose(`Is ${fnText(fn, deg, radians)} positive or negative?`)],
      text: `sign: ${fn} ${angleKey(deg, radians)}`,
      answer: { type: 'choice', value: pos ? 'positive' : 'negative', options: SIGN_OPTIONS },
      visual: null,
      explain: `${t === deg ? angleText(deg, radians) : `${angleText(deg, radians)} is coterminal with ${angleText(t, radians)}, which`} ${t === deg ? 'is' : 'is'} in quadrant ${ROMAN[q]}, ${QUAD_WORDS[q]}. `
        + `${fn} is ${WHERE[fn]} there, so it is ${pos ? 'positive' : 'negative'}. `
        + `(${deg < 0 ? 'A negative angle turns clockwise, below the x-axis first.' : fn === 'tan' || fn === 'cot' ? 'Two negatives divide to a positive, which is why tangent is positive in quadrant III.' : 'The sign comes from the quadrant, not from the size of the angle.'}) So ${pos ? 'positive' : 'negative'}.`,
    };
  }
  if (kind === 'quadrant') {
    const q = rng.int(1, 4);
    const pos = POSITIVE[fn].includes(q);
    return {
      prompt: [T.prose(`The terminal side of θ is in quadrant ${ROMAN[q]}. Is ${fn} θ positive or negative?`)],
      text: `sign in quadrant: ${fn} ${ROMAN[q]}`,
      answer: { type: 'choice', value: pos ? 'positive' : 'negative', options: SIGN_OPTIONS },
      visual: null,
      explain: `In quadrant ${ROMAN[q]} a point is ${QUAD_WORDS[q]}. ${fn} θ is ${WHERE[fn]}, so it is ${pos ? 'positive' : 'negative'}. `
        + `(All Students Take Calculus: all are positive in I, sine in II, tangent in III, cosine in IV, and each reciprocal shares its partner's sign.) So ${pos ? 'positive' : 'negative'}.`,
    };
  }
  // Two signs pick one quadrant: never a function and its own reciprocal.
  const PAIRS = [['sin', 'cos'], ['sin', 'tan'], ['cos', 'tan'], ['csc', 'cos'], ['sec', 'sin'], ['sin', 'cot'], ['cos', 'cot']];
  const [f, g] = rng.pick(PAIRS);
  const q = rng.int(1, 4);
  const sf = POSITIVE[f].includes(q), sg = POSITIVE[g].includes(q);
  const said = (h, s) => `${h} θ ${s ? '> 0' : '< 0'}`;
  return {
    prompt: [T.prose(`${said(f, sf)} and ${said(g, sg)}. Which quadrant is the terminal side of θ in?`)],
    text: `quadrant from signs: ${f} ${sf ? '+' : '-'}, ${g} ${sg ? '+' : '-'}`,
    answer: { type: 'choice', value: ROMAN[q], options: QUAD_OPTIONS },
    visual: null,
    explain: `${f} θ is ${sf ? 'positive' : 'negative'} in quadrants ${[1, 2, 3, 4].filter((k) => POSITIVE[f].includes(k) === sf).map((k) => ROMAN[k]).join(' and ')}; `
      + `${g} θ is ${sg ? 'positive' : 'negative'} in quadrants ${[1, 2, 3, 4].filter((k) => POSITIVE[g].includes(k) === sg).map((k) => ROMAN[k]).join(' and ')}. `
      + `Only quadrant ${ROMAN[q]} is in both. (Each sign alone leaves two quadrants; it takes both to decide.) So quadrant ${ROMAN[q]}.`,
  };
}

// ── Around the Circle ───────────────────────────────────────────────────

const R = 2.4;
const circlePath = () => ({ kind: 'path', tone: LINE, points: Array.from({ length: 25 }, (_, i) => toward(i * 15, R)) });
/** An arc from 0 to `deg` (one turn at most), a point every 20° or so. */
function sweepTo(deg, r, tone) {
  const n = Math.max(2, Math.ceil(Math.abs(deg) / 20));
  return { kind: 'path', tone, points: Array.from({ length: n + 1 }, (_, i) => toward((deg * i) / n, r)) };
}

function circleFigure(deg, radians) {
  const shown = Math.abs(deg) > 360 ? deg % 360 : deg;
  const P = toward(deg, R);
  const foot = [P[0], 0];
  const ref = refAngle(deg);
  const t = ((deg % 360) + 360) % 360;
  const axis = t > 90 && t < 270 ? 180 : t >= 270 ? 360 : 0;
  const coords = `(${valueText(exactTrig('cos', deg))}, ${valueText(exactTrig('sin', deg))})`;
  const out = toward(t, R + 0.55);
  return tenths({
    kind: 'plane', xRange: [-3.6, 3.6], yRange: [-3.3, 3.3], grid: 0, axes: false,
    marks: [
      { kind: 'segment', from: [-3.1, 0], to: [3.1, 0], tone: 'var(--muted)' },
      { kind: 'segment', from: [0, -3.0], to: [0, 3.0], tone: 'var(--muted)' },
      circlePath(),
      text([R + 0.25, -0.3], '1', 'var(--muted)'),
      { kind: 'segment', from: [0, 0], to: P, tone: GIVEN },
      { kind: 'point', at: P, tone: GIVEN },
      sweepTo(shown, 0.8, GIVEN),
      text(toward(shown / 2, 1.3), angleText(deg, radians), GIVEN),
    ],
    answer: [
      { kind: 'segment', from: P, to: foot, tone: 'var(--result)', dashed: true },
      text(toward((axis + t) / 2, 1.55), angleText(ref, radians), 'var(--result)'),
      text([Math.max(-2.6, Math.min(2.6, out[0])), Math.max(-3.0, Math.min(3.0, out[1]))], coords, 'var(--result)'),
    ],
  });
}

function around(rng) {
  const radians = rng.chance(0.5);
  let deg = specialAngle(rng);
  if (rng.chance(0.25)) deg += rng.pick([-360, 360]);
  const fn = rng.pick(['sin', 'cos']);
  const v = exactTrig(fn, deg), ref = refAngle(deg), q = quadrantOf(deg);
  const base = exactTrig(fn, ref);
  const pos = POSITIVE[fn].includes(q);
  return {
    prompt: ask(fnText(fn, deg, radians)),
    text: `exact: ${fn} ${angleKey(deg, radians)}`,
    answer: exact(v),
    visual: circleFigure(deg, radians),
    explain: `${referenceWords(deg, radians)}. ${fnText(fn, ref, radians)} = ${valueText(base)}, and ${fn === 'sin' ? 'sine, the y-coordinate,' : 'cosine, the x-coordinate,'} is ${pos ? 'positive' : 'negative'} in quadrant ${ROMAN[q]}. `
      + `(The reference angle gives the size; the quadrant gives the sign.) So x = ${valueText(v)}.`,
  };
}

// ── Tangent ─────────────────────────────────────────────────────────────

// Points on the unit circle with rational coordinates, from the triples.
const TRIPLES = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29]];
function rationalPoint(rng) {
  const [a, b, c] = rng.pick(TRIPLES);
  const [x, y] = rng.chance(0.5) ? [a, b] : [b, a];
  const q = rng.int(1, 4);
  return { x: q === 2 || q === 3 ? -x : x, y: q >= 3 ? -y : y, c, q };
}
const over = (n, d) => minus(d < 0 ? fracText(-n, -d) : fracText(n, d));

const DEFINED_OPTIONS = [{ id: 'undefined', label: 'Undefined' }, { id: '0', label: '0' }, { id: '1', label: '1' }, { id: '-1', label: '−1' }];

function tangent(rng) {
  const kind = rng.pick(['exact', 'exact', 'exact', 'point', 'point', 'axis']);
  if (kind === 'axis') {
    const deg = rng.pick([0, 90, 180, 270, 360, -90]);
    const radians = rng.chance(0.5);
    const fn = rng.pick(['tan', 'tan', 'cot']);
    const v = exactTrig(fn, deg);
    const id = v === null ? 'undefined' : String(v.n);
    const c = valueText(exactTrig('cos', deg)), s = valueText(exactTrig('sin', deg));
    return {
      prompt: [T.prose(`What is ${fnText(fn, deg, radians)}?`)],
      text: `defined: ${fn} ${angleKey(deg, radians)}`,
      answer: { type: 'choice', value: id, options: DEFINED_OPTIONS },
      visual: null,
      explain: `At ${angleText(deg, radians)} the point is (${c}, ${s}), so ${fn} = ${fn === 'tan' ? `y/x = ${s}/${c}` : `x/y = ${c}/${s}`}. `
        + `${v === null ? 'Dividing by zero has no answer' : `That is ${id}`}. (${fn === 'tan' ? 'Tangent is undefined where x = 0, at 90° and 270°, and 0 where y = 0.' : 'Cotangent is undefined where y = 0, at 0° and 180°, and 0 where x = 0.'}) So ${v === null ? 'undefined' : id}.`,
    };
  }
  if (kind === 'point') {
    const P = rationalPoint(rng);
    return {
      prompt: [T.prose(`The terminal side of θ meets the unit circle at (${over(P.x, P.c)}, ${over(P.y, P.c)}). Find tan θ.`)],
      text: `ratio from point: tan, ${P.x}/${P.c}, ${P.y}/${P.c}`,
      answer: signedFrac(P.y, P.x),
      visual: null,
      explain: `tan θ = y/x = (${over(P.y, P.c)}) ÷ (${over(P.x, P.c)}) = ${over(P.y, P.x)}. The ${P.c}s cancel. `
        + `(It is y over x, not x over y: rise over run.) So tan θ = ${over(P.y, P.x)}.`,
    };
  }
  const radians = rng.chance(0.5);
  const deg = specialAngle(rng, { axes: false, firstQuadrant: rng.chance(0.3) }) + (rng.chance(0.15) ? -360 : 0);
  const v = exactTrig('tan', deg), s = exactTrig('sin', deg), c = exactTrig('cos', deg);
  return {
    prompt: ask(fnText('tan', deg, radians)),
    text: `exact: tan ${angleKey(deg, radians)}`,
    answer: exact(v),
    visual: null,
    explain: `At ${angleText(deg, radians)} the point is (${valueText(c)}, ${valueText(s)}), so tan = y/x = (${valueText(s)}) ÷ (${valueText(c)}) = ${valueText(v)}. `
      + `(${refAngle(deg) === 30 ? '1/√3 and √3/3 are the same number; the second has the root on top.' : refAngle(deg) === 60 ? 'The halves cancel: (√3/2) ÷ (1/2) = √3.' : 'At 45° x and y are the same size, so tangent is 1 or −1.'}${quadrantOf(deg) > 1 ? ` In quadrant ${ROMAN[quadrantOf(deg)]} it is ${POSITIVE.tan.includes(quadrantOf(deg)) ? 'positive' : 'negative'}.` : ''}) So x = ${valueText(v)}.`,
  };
}

// ── sec, csc, cot ───────────────────────────────────────────────────────

const PARTNER = { sec: 'cos', csc: 'sin', cot: 'tan' };

function reciprocals(rng) {
  const fn = rng.pick(['sec', 'csc', 'cot']);
  if (rng.chance(0.3)) {
    const P = rationalPoint(rng);
    const [n, d] = fn === 'sec' ? [P.c, P.x] : fn === 'csc' ? [P.c, P.y] : [P.x, P.y];
    return {
      prompt: [T.prose(`The terminal side of θ meets the unit circle at (${over(P.x, P.c)}, ${over(P.y, P.c)}). Find ${fn} θ.`)],
      text: `ratio from point: ${fn}, ${P.x}/${P.c}, ${P.y}/${P.c}`,
      answer: signedFrac(n, d),
      visual: null,
      explain: `${fn} θ = ${WHERE[fn]}, the reciprocal of ${PARTNER[fn]} θ = ${fn === 'sec' ? over(P.x, P.c) : fn === 'csc' ? over(P.y, P.c) : over(P.y, P.x)}. `
        + `Flip it: ${fn} θ = ${over(n, d)}. (${fn === 'sec' ? 'Secant goes with cosine, not sine, even though both start with s.' : fn === 'csc' ? 'Cosecant goes with sine, not cosine, even though it starts with co.' : 'Flipping keeps the sign.'}) So ${fn} θ = ${over(n, d)}.`,
    };
  }
  const radians = rng.chance(0.5);
  let deg;
  do deg = specialAngle(rng, { axes: rng.chance(0.15), firstQuadrant: rng.chance(0.3) }); while (exactTrig(fn, deg) === null || exactTrig(PARTNER[fn], deg) === null);
  const v = exactTrig(fn, deg), p = exactTrig(PARTNER[fn], deg);
  const rationalized = v.r > 1 && p.r === v.r && p.d !== v.d;
  return {
    prompt: ask(fnText(fn, deg, radians)),
    text: `exact: ${fn} ${angleKey(deg, radians)}`,
    answer: exact(v),
    visual: null,
    explain: `${fnText(fn, deg, radians)} = 1/${fnText(PARTNER[fn], deg, radians)}, and ${fnText(PARTNER[fn], deg, radians)} = ${valueText(p)}. `
      + `Flip it: ${valueText(v)}${rationalized ? `, with the root moved to the top` : ''}. `
      + `(${fn === 'sec' ? 'Secant is 1 over cosine, not over sine.' : fn === 'csc' ? 'Cosecant is 1 over sine, not over cosine.' : 'Cotangent is x/y, tangent turned over.'} A reciprocal keeps the sign.) So x = ${valueText(v)}.`,
  };
}

// ── From One Ratio, the Rest ────────────────────────────────────────────

/** √n as k√s, s squarefree. */
function simplifyRoot(n) {
  let k = 1, s = n;
  for (let f = 2; f * f <= s; f++) while (s % (f * f) === 0) { s /= f * f; k *= f; }
  return { k, s };
}
/** (a√p)/(b√q) as {n, d, r}, simplified. */
function ratio(a, p, b, q) {
  const { k, s } = simplifyRoot(p * q);
  const t = reduce(a * k, b * q);
  return { n: t.n * Math.sign(t.d), d: Math.abs(t.d), r: s };
}
const sideText = (c, r) => (r === 1 ? String(c) : `${c === 1 ? '' : c}√${r}`);
const signedSide = (s) => `${s.c < 0 ? '−' : ''}${sideText(Math.abs(s.c), s.r)}`;
const BY_SIDES = { sin: 'y/r', cos: 'x/r', tan: 'y/x', csc: 'r/y', sec: 'r/x', cot: 'x/y' };

// Each given ratio as p/q with the third side not a whole number, plus the triples.
const GIVEN_SIN = [[1, 3], [2, 3], [1, 4], [3, 4], [2, 5], [1, 5], [3, 5], [5, 13], [12, 13], [8, 17], [15, 17], [7, 25], [24, 25]];
const GIVEN_TAN = [[1, 2], [1, 3], [2, 3], [3, 4], [4, 3], [5, 12], [12, 5], [8, 15], [3, 2], [5, 2]];

// requiem: catalogue/content/one-ratio-fixes-the-quadrant
function fromOne(rng) {
  const given = rng.pick(['sin', 'cos', 'tan', 'sin', 'cos']);
  const q = rng.int(2, 4) - (rng.chance(0.15) ? 1 : 0);
  const [p, h] = rng.pick(given === 'tan' ? GIVEN_TAN : GIVEN_SIN);
  // Sides of the reference triangle, each as c√r: opposite, adjacent, hypotenuse.
  let opp, adj, hyp;
  if (given === 'tan') {
    opp = { c: p, r: 1 }; adj = { c: h, r: 1 };
    const m = simplifyRoot(p * p + h * h); hyp = { c: m.k, r: m.s };
  } else {
    const m = simplifyRoot(h * h - p * p);
    hyp = { c: h, r: 1 };
    if (given === 'sin') { opp = { c: p, r: 1 }; adj = { c: m.k, r: m.s }; } else { adj = { c: p, r: 1 }; opp = { c: m.k, r: m.s }; }
  }
  const sx = q === 2 || q === 3 ? -1 : 1, sy = q >= 3 ? -1 : 1;
  const X = { c: sx * adj.c, r: adj.r }, Y = { c: sy * opp.c, r: opp.r }, H = hyp;
  const of = { sin: [Y, H], cos: [X, H], tan: [Y, X], csc: [H, Y], sec: [H, X], cot: [X, Y] };
  const val = (f) => ratio(of[f][0].c, of[f][0].r, of[f][1].c, of[f][1].r);
  const gv = val(given);
  const want = rng.pick(['sin', 'cos', 'tan', 'sec', 'csc', 'cot'].filter((f) => f !== given));
  const v = val(want);
  const third = given === 'tan' ? 'hypotenuse' : given === 'sin' ? 'adjacent side' : 'opposite side';
  const thirdSide = given === 'tan' ? hyp : given === 'sin' ? adj : opp;
  const work = given === 'tan' ? `√(${p}² + ${h}²) = √${p * p + h * h}` : `√(${h}² − ${p}²) = √${h * h - p * p}`;
  const condition = rng.chance(0.4) && q !== 1
    ? (() => { const other = given === 'sin' || given === 'csc' ? 'cos' : 'sin'; const pos = POSITIVE[other].includes(q); return `${other} θ ${pos ? '> 0' : '< 0'}`; })()
    : `θ is in quadrant ${ROMAN[q]}`;
  const rational = v.r === 1;
  return {
    prompt: [T.prose(`${given} θ = ${valueText(gv)} and ${condition}. Find the exact value of ${rational ? '' : 'x = '}${want} θ.`)],
    text: `from ratio: ${given} ${gv.n}/${gv.d}${gv.r === 1 ? '' : ` root ${gv.r}`}, quadrant ${ROMAN[q]}, want ${want}`,
    answer: rational ? signedFrac(v.n, v.d) : exact(v),
    visual: null,
    explain: `${condition.startsWith('θ') ? '' : `${given} θ is ${gv.n > 0 ? 'positive' : 'negative'} and ${condition}, which puts θ in quadrant ${ROMAN[q]}. `}`
      + `The reference triangle has ${given === 'tan' ? `opposite ${p} and adjacent ${h}` : given === 'sin' ? `opposite ${p} and hypotenuse ${h}` : `adjacent ${p} and hypotenuse ${h}`}, `
      + `so the ${third} is ${work}${thirdSide.r === 1 ? ` = ${thirdSide.c}` : thirdSide.c !== 1 ? ` = ${sideText(thirdSide.c, thirdSide.r)}` : ''}. `
      + `In quadrant ${ROMAN[q]}, x is ${sx > 0 ? 'positive' : 'negative'} and y is ${sy > 0 ? 'positive' : 'negative'}: x = ${signedSide(X)}, y = ${signedSide(Y)} and r = ${sideText(H.c, H.r)}, so ${want} θ = ${BY_SIDES[want]} = ${valueText(v)}. `
      + `(${given === 'tan' ? 'The hypotenuse is the root of the sum of the squares, never p + q.' : 'Square, subtract, then take the root: √(h² − p²) is not h − p.'}) So ${want} θ = ${valueText(v)}.`,
  };
}

const CONTENT = [special, signs, around, tangent, reciprocals, fromOne];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
