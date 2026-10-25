/**
 * Catalogue authoring tool: builds the problem library for quadrilaterals.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 *
 * Every `text` names the shape and lists what is given, part by part, so
 * scripts/check-answers.py can work the answer again from the shape's
 * properties alone: the equal parts, the diagonals, the angle sums, or
 * the coordinates themselves.
 *
 * Shapes are drawn to scale, true to the angles and roughly to the lengths
 * they are given, and turned a little so a side is not always level. No
 * figure marks the property being tested: that is for the student to know.
 */
import * as T from '../terms.js';
import { minus } from '../../web/ui/dom.js';
import {
  LINE, GIVEN, ASKED, FRAME, RAD, r2, fit, outline, centroid, sideLabel, text, toward, linear, ascii, sized,
  cornerNames, ticks, arcs, cornerText, cornerAt, under, dirTo, fromSides, cornerLabel, clearLabel, namePoints, pointNames, phoneUnit,
} from './figures.js';
import { solve } from './congruence.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/quadrilaterals.js';

const RESULT = 'var(--result)';
const NAMES = 'ABCD';
const num = (v) => minus(String(v));
const deg = (v) => `${num(v)}°`;
/** An expression for prose and for the checker: a number alone, or a·x + b. */
const ex = (e) => (e[0] === 0 ? num(e[1]) : linear(...e));
const exA = (e) => (e[0] === 0 ? String(e[1]) : ascii(...e));
const exDeg = (e) => (e[0] === 0 ? deg(e[1]) : sized(e));
const valueAt = ([a, b], x) => a * x + b;
const putX = ([a, b], x) => `${a === 1 ? `${x}` : `${a}(${x})`}${b === 0 ? '' : b > 0 ? ` + ${b}` : ` − ${-b}`}`;
/** The coefficients that write `value` at `x` with a number part no bigger than 40. */
const fitting = (value, x) => [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((a) => Math.abs(value - a * x) <= 40);
/** An expression in x worth `value` at `x`, with a coefficient other than those in `not`. */
function expr(rng, value, x, not = []) {
  const a = rng.pick(fitting(value, x).filter((c) => !not.includes(c)));
  return [a, value - a * x];
}
/** An x that every one of `values` can be written in, three ways each, so the expressions can differ. */
function xFor(rng, values) {
  const top = Math.max(12, Math.ceil(Math.max(...values) / 6));
  for (;;) {
    const x = rng.int(2, top);
    if (values.every((v) => fitting(v, x).length >= 3)) return x;
  }
}
const andList = (items) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`);
const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);

/** P turned by `t` degrees about its middle. */
function turned(P, t) {
  const c = centroid(P), k = t * RAD;
  return P.map(([x, y]) => [r2(c[0] + (x - c[0]) * Math.cos(k) - (y - c[1]) * Math.sin(k)),
    r2(c[1] + (x - c[0]) * Math.sin(k) + (y - c[1]) * Math.cos(k))]);
}
const mid = (P, Q) => [r2((P[0] + Q[0]) / 2), r2((P[1] + Q[1]) / 2)];
/** The corner of a quadrilateral, between its two sides. */
const at4 = (P, v) => [P[v], P[(v + 1) % 4], P[(v + 3) % 4]];
/** An angle's label at corner v of ABCD, written as the prompt writes it and fitted inside the corner, or just outside. */
const angleLabel = (P, v, label, tone = GIVEN, k = 1.15) => cornerLabel(...at4(P, NAMES.indexOf(v)), label, tone, { k, away: centroid(P) });
const answerAt = (P, label) => text(under(P), label, RESULT);
const draw = (marks, reveal, k = 1.15) => fit({ ...FRAME, marks, answer: reveal }, k);
/** E, where the diagonals cross, lettered in the gap at E furthest from every other label. */
function letterE(P, E, marks) {
  const taken = marks.filter((m) => m.kind === 'text').map((m) => m.at);
  const spots = [0, 1, 2, 3].map((i) => {
    const [from, to] = cornerAt(E, P[i], P[(i + 1) % 4]);
    return toward((from + to) / 2, 0.5, E);
  });
  const room = (q) => Math.min(...taken.map((t) => Math.hypot(t[0] - q[0], t[1] - q[1])));
  return text(spots.reduce((a, b) => (room(b) > room(a) ? b : a)), 'E', LINE);
}
/** An angle's size or '?', inside the corner at V, a little further in when the angle is narrow. */
function angleText(V, U, W, label, tone) {
  const [from, to] = cornerAt(V, U, W);
  const r = Math.min(1.5, Math.max(0.65, 0.3 / Math.sin(((to - from) / 2) * RAD)));
  return text(toward((from + to) / 2, r, V), label, tone);
}

/** Parallelogram ABCD: AB along the bottom, w long, AD d long at `alpha` degrees. */
function para(alpha, w, d) {
  const D = [d * Math.cos(alpha * RAD), d * Math.sin(alpha * RAD)];
  return [[0, 0], [w, 0], [w + D[0], D[1]], D].map((p) => p.map(r2));
}
/** Drawn lengths for two side values, the longer 4.6 and neither under 2.2. */
const drawnSides = (L1, L2) => { const s = 4.6 / Math.max(L1, L2); return [Math.max(2.2, L1 * s), Math.max(2.2, L2 * s)]; };

// ── Parallelogram properties ────────────────────────────────────────────

const SIDE_PAIRS = [['AB', 'CD'], ['BC', 'DA']];
const SIDE_AT = { AB: [0, 1], BC: [1, 2], CD: [2, 3], DA: [3, 0] };
const opposite = (s) => SIDE_PAIRS.find((p) => p.includes(s)).find((n) => n !== s);

function anglesAt(rng) {
  for (;;) {
    const a = rng.int(35, 145);
    if (Math.abs(a - 90) >= 15) return a;
  }
}

function paraSides(rng) {
  for (;;) {
    const L1 = rng.int(6, 40), L2 = rng.int(6, 40);
    if (Math.abs(L1 - L2) < 4) continue;
    // Drawn to scale: a ratio past 4.6 : 2.2 would have its shorter side stretched.
    if (Math.max(L1, L2) / Math.min(L1, L2) > 2.05) continue;
    const pair = rng.pick(SIDE_PAIRS), [s1, s2] = rng.chance(0.5) ? pair : [pair[1], pair[0]];
    const V = pair[0] === 'AB' ? L1 : L2, W = pair[0] === 'AB' ? L2 : L1;
    const x = xFor(rng, [V, W]);
    const e1 = expr(rng, V, x), e2 = expr(rng, V, x, [e1[0]]);
    // A side next to them, as a number or as a third expression: the trap is to equate it.
    const near = rng.pick(SIDE_PAIRS.find((p) => !p.includes(s1)));
    const e3 = rng.chance(0.45) ? expr(rng, W, x, [e1[0], e2[0]]) : [0, W];
    const ask = e3[0] !== 0 && rng.chance(0.4) ? opposite(near) : rng.chance(0.3) ? s1 : 'x';
    const given = rng.shuffle([[s1, e1], [s2, e2], [near, e3]]);
    const s = solve(e1, e2);
    const [w, d] = drawnSides(L1, L2);
    const P = turned(para(anglesAt(rng), w, d), rng.int(-15, 15)), c = centroid(P);
    const labels = given.map(([n, e]) => sideLabel(P[SIDE_AT[n][0]], P[SIDE_AT[n][1]], ex(e), c));
    const value = ask === 'x' ? x : ask === s1 ? V : W;
    const then = ask === 'x' ? `Check: both come to ${V}. `
      : ask === s1 ? `Then ${s1} = ${putX(e1, x)} = ${V}. (x is not the length: put it back in.) `
        : `Then ${ask} is opposite ${near}, so it equals ${near} = ${putX(e3, x)} = ${W}. `;
    return {
      prompt: [T.prose(`ABCD is a parallelogram. ${andList(given.map(([n, e]) => `${n} = ${ex(e)}`))}. `
        + `${ask === 'x' ? 'What is x?' : `How long is ${ask}?`}`)],
      text: `parallelogram: ${given.map(([n, e]) => `${n} ${exA(e)}`).join(', ')}; find ${ask}`,
      answer: { type: 'int', value },
      visual: draw([...outline(P), ...cornerNames(P, NAMES), ...labels], [answerAt(P, ask === 'x' ? `x = ${x}` : `${ask} = ${value}`)]),
      explain: `Opposite sides of a parallelogram are equal, and ${s1} is opposite ${s2}: ${s.work} ${then}`
        + `(${near} is next to ${s1}, not opposite it, so it need not be the same length.) So ${ask === 'x' ? `x = ${x}` : `${ask} = ${value}`}.`,
    };
  }
}

const OPPOSITE_CORNER = { A: 'C', B: 'D', C: 'A', D: 'B' };
const angleOf = (alpha, v) => ('AC'.includes(v) ? alpha : 180 - alpha);

function paraAngles(rng) {
  const alpha = anglesAt(rng);
  const mode = rng.pick(['opposite', 'adjacent', 'adjacent', 'number']);
  const P = turned(para(alpha, rng.pick([4.2, 4.6]), rng.pick([2.6, 3, 3.4])), rng.int(-15, 15));
  const idx = (v) => NAMES.indexOf(v);
  const label = (v, l, tone = GIVEN) => cornerText(...at4(P, idx(v)), l, tone);
  const askMark = (v) => [...arcs(...at4(P, idx(v)), 1, ASKED), label(v, '?', ASKED)];
  if (mode === 'number') {
    const v = rng.pick([...NAMES]), t = rng.pick([...NAMES].filter((u) => u !== v));
    const val = angleOf(alpha, v), want = angleOf(alpha, t), opp = OPPOSITE_CORNER[v] === t;
    return {
      prompt: [T.prose(`ABCD is a parallelogram with ∠${v} = ${deg(val)}. What is ∠${t}, in degrees?`)],
      text: `parallelogram: angle ${v} ${val}; find angle ${t}`,
      answer: { type: 'int', value: want },
      visual: draw([...outline(P), ...cornerNames(P, NAMES), label(v, deg(val)), ...askMark(t)], [answerAt(P, `∠${t} = ${deg(want)}`)]),
      explain: opp
        ? `∠${t} is opposite ∠${v}, and opposite angles of a parallelogram are equal. (180 − ${val} would be the angle next to it.) So ∠${t} = ${deg(want)}.`
        : `∠${t} is next to ∠${v}. Adjacent angles of a parallelogram add to 180°, since they are co-interior angles between a pair of `
          + `parallel sides: 180 − ${val} = ${want}. (Only opposite angles are equal.) So ∠${t} = ${deg(want)}.`,
    };
  }
  for (;;) {
    const v = rng.pick([...NAMES]);
    const u = mode === 'opposite' ? OPPOSITE_CORNER[v] : NAMES[(idx(v) + rng.pick([1, 3])) % 4];
    const Vv = angleOf(alpha, v), Vu = angleOf(alpha, u);
    const x = xFor(rng, [Vv, Vu]);
    const e1 = expr(rng, Vv, x), e2 = expr(rng, Vu, x, [e1[0]]);
    const ask = rng.chance(0.55) ? 'x' : rng.pick([...NAMES]);
    const want = ask === 'x' ? x : angleOf(alpha, ask);
    const s = mode === 'opposite' ? solve(e1, e2) : solve([e1[0] + e2[0], e1[1] + e2[1]], [0, 180]);
    const setUp = mode === 'opposite'
      ? `Opposite angles of a parallelogram are equal, and ∠${v} is opposite ∠${u}: ${s.work} `
      : `∠${v} and ∠${u} are next to each other, and adjacent angles of a parallelogram add to 180° (co-interior angles between parallel sides): `
        + `(${ex(e1)}) + (${ex(e2)}) = 180 gathers to ${s.work} `;
    let then = `Check: ${mode === 'opposite' ? `both come to ${Vv}°` : `${putX(e1, x)} = ${Vv} and ${putX(e2, x)} = ${Vu}, which add to 180`}. `;
    if (ask !== 'x') {
      const from = ask === v || ask === OPPOSITE_CORNER[v] ? [v, e1, Vv] : [u, e2, Vu];
      then = `So ∠${from[0]} = ${putX(from[1], x)} = ${from[2]}°${ask === from[0] ? '' : `, and ∠${ask} is opposite it, so equal`}. `;
      if (!(ask === v || ask === OPPOSITE_CORNER[v] || ask === u || ask === OPPOSITE_CORNER[u])) continue;
    }
    const trap = mode === 'opposite' ? `(Adjacent angles are not equal unless every angle is 90°.)` : `(Setting them equal is right for opposite angles, not adjacent ones.)`;
    const shown = rng.shuffle([[v, e1], [u, e2]]);
    return {
      prompt: [T.prose(`ABCD is a parallelogram with ${shown.map(([n, e]) => `∠${n} = ${exDeg(e)}`).join(' and ')}. `
        + `${ask === 'x' ? 'What is x?' : `What is ∠${ask}, in degrees?`}`)],
      text: `parallelogram: ${shown.map(([n, e]) => `angle ${n} ${exA(e)}`).join(', ')}; find ${ask === 'x' ? 'x' : `angle ${ask}`}`,
      answer: { type: 'int', value: want },
      visual: draw([...outline(P), ...cornerNames(P, NAMES), ...angleLabel(P, v, exDeg(e1)), ...angleLabel(P, u, exDeg(e2)),
        ...(ask === 'x' || ask === v || ask === u ? [] : askMark(ask))],
      [answerAt(P, ask === 'x' ? `x = ${x}` : `∠${ask} = ${deg(want)}`)]),
      explain: `${setUp}${then}${trap} So ${ask === 'x' ? `x = ${x}` : `∠${ask} = ${deg(want)}`}.`,
    };
  }
}

const parallelogramProperties = (rng) => (rng.chance(0.45) ? paraSides(rng) : paraAngles(rng));

// ── Diagonals ───────────────────────────────────────────────────────────

/**
 * A quadrilateral from its diagonals: they cross at E, AE = EC = p (drawn
 * hp) and BE = ED = q (drawn hq), at `theta` degrees to each other.
 */
function fromDiagonals(hp, hq, theta, phi) {
  const u = [Math.cos(phi * RAD), Math.sin(phi * RAD)], v = [Math.cos((phi + theta) * RAD), Math.sin((phi + theta) * RAD)];
  const P = [[-hp * u[0], -hp * u[1]], [-hq * v[0], -hq * v[1]], [hp * u[0], hp * u[1]], [hq * v[0], hq * v[1]]].map((p) => p.map(r2));
  return { P, E: [0, 0] };
}
const HALF = { AE: ['p', 1], EC: ['p', 1], BE: ['q', 1], ED: ['q', 1], AC: ['p', 2], BD: ['q', 2] };
const ENDS = { AE: [0, 'E'], EC: ['E', 2], BE: [1, 'E'], ED: ['E', 3], AC: [0, 2], BD: [1, 3] };

function diagonals(rng) {
  const shape = rng.pick(['parallelogram', 'parallelogram', 'rectangle', 'rectangle', 'rhombus']);
  for (;;) {
    const p = rng.int(3, 20), q = shape === 'rectangle' ? p : rng.int(3, 20);
    if (shape !== 'rectangle' && Math.abs(p - q) < 3) continue;
    const theta = shape === 'rhombus' ? 90 : rng.pick([rng.int(40, 72), rng.int(108, 140)]);
    const longest = Math.max(p, q), hp = Math.max(1.7, (2.8 * p) / longest), hq = Math.max(1.7, (2.8 * q) / longest);
    const { P, E } = fromDiagonals(hp, hq, theta, rng.int(-25, 25));
    const pt = (k) => (k === 'E' ? E : P[k]);
    const base = [...outline(P), { kind: 'segment', from: P[0], to: P[2], tone: LINE }, { kind: 'segment', from: P[1], to: P[3], tone: LINE },
      ...cornerNames(P, NAMES)];
    const shapeWords = shape === 'rhombus' ? 'a rhombus' : `a ${shape}`;
    if (shape === 'rhombus' && rng.chance(0.65)) {
      // The angle between the diagonals.
      const corner = rng.int(0, 3), name = `${NAMES[corner]}E${NAMES[(corner + 1) % 4]}`;
      const x = xFor(rng, [90]), e = expr(rng, 90, x);
      const s = solve(e, [0, 90]);
      return {
        prompt: [T.prose(`ABCD is a rhombus whose diagonals meet at E, and ∠${name} = ${sized(e)}. What is x?`)],
        text: `diagonals: rhombus ABCD, E; angle ${name} ${ascii(...e)}; find x`,
        answer: { type: 'int', value: x },
        visual: (() => { const marks = [...base, ...cornerLabel(E, P[corner], P[(corner + 1) % 4], sized(e), GIVEN, { k: 1.15, min: 0.65 })];
          return draw([...marks, letterE(P, E, marks)], [answerAt(P, `x = ${x}`)]); })(),
        explain: `The diagonals of a rhombus are perpendicular, so ∠${name} = 90°: ${s.work} Check: ${putX(e, x)} = 90. `
          + `(The diagonals of a rhombus need not be equal; what is fixed is the right angle where they cross.) So x = ${x}.`,
      };
    }
    // Two lengths along the diagonals, related by the shape.
    let pair;
    if (shape === 'rectangle') {
      pair = rng.chance(0.8)
        ? [rng.pick(['AE', 'EC', 'AC']), rng.pick(['BE', 'ED', 'BD'])]
        : rng.pick([['AE', 'EC'], ['BE', 'ED'], ['AE', 'AC'], ['ED', 'BD']]);
    } else {
      pair = rng.pick([['AE', 'EC'], ['BE', 'ED'], ['AE', 'AC'], ['EC', 'AC'], ['BE', 'BD'], ['ED', 'BD']]);
    }
    if (rng.chance(0.5)) pair = [pair[1], pair[0]];
    const val = (n) => (HALF[n][0] === 'p' ? p : q) * HALF[n][1];
    const [n1, n2] = pair, v1 = val(n1), v2 = val(n2);
    const x = xFor(rng, [v1, v2]);
    const e1 = expr(rng, v1, x), e2 = expr(rng, v2, x, [e1[0]]);
    // As an equation: (half of a full diagonal) or (twice a half).
    const m1 = HALF[n1][1], m2 = HALF[n2][1];
    const lhs = m1 < m2 ? [2 * e1[0], 2 * e1[1]] : e1, rhs = m2 < m1 ? [2 * e2[0], 2 * e2[1]] : e2;
    if (lhs[0] === rhs[0]) continue;
    const s = solve(lhs, rhs);
    const doubled = m1 !== m2 ? `${m1 < m2 ? n2 : n1} is a whole diagonal and ${m1 < m2 ? n1 : n2} half of one, so ${m1 < m2 ? `2(${ex(e1)}) = ${ex(e2)}` : `${ex(e1)} = 2(${ex(e2)})`}: ` : '';
    const askable = shape === 'rectangle' ? Object.keys(HALF) : Object.keys(HALF).filter((n) => HALF[n][0] === HALF[n1][0]);
    const ask = rng.chance(0.55) ? 'x' : rng.pick(askable.filter((n) => n !== n1 && n !== n2).concat([n1]));
    const want = ask === 'x' ? x : val(ask);
    const why = shape === 'rectangle'
      ? `A rectangle’s diagonals are equal and bisect each other, so the four halves AE, BE, CE and DE are all equal, and each diagonal is twice a half. `
      : `The diagonals of ${shapeWords} bisect each other, so E is the midpoint of both: AE = EC and BE = ED. `;
    const trap = shape === 'rectangle' ? `(Halves of different diagonals match only because it is a rectangle; in any parallelogram BE need not equal AE.)`
      : m1 !== m2 ? `(A half is not the whole diagonal: one of them is twice the other.)`
        : `(The two diagonals need not be equal: that is a rectangle’s property, not every parallelogram’s.)`;
    const then = ask === 'x' ? `Check: ${n1} = ${putX(e1, x)} = ${v1} and ${n2} = ${putX(e2, x)} = ${v2}. `
      : ask === n1 ? `Then ${n1} = ${putX(e1, x)} = ${v1}. `
        : `So ${n1} = ${putX(e1, x)} = ${v1}, and ${ask} is ${HALF[ask][1] === HALF[n1][1] ? 'equal to it' : HALF[ask][1] > HALF[n1][1] ? 'twice that' : 'half of that'}: ${want}. `;
    // Each half's length beside its own half, clear of every other line and
    // label: two halves in one small triangle otherwise stack up in it.
    const segLabel = (n, e, others) => {
      const [a, b] = ENDS[n].map(pt);
      if (HALF[n][1] === 2) return [];
      return [clearLabel(a, b, ex(e), others, GIVEN, { gaps: [0.2, 0.35, 0.5] })];
    };
    return {
      prompt: [T.prose(`ABCD is ${shapeWords} whose diagonals meet at E. ${n1} = ${ex(e1)} and ${n2} = ${ex(e2)}. `
        + `${ask === 'x' ? 'What is x?' : `How long is ${ask}?`}`)],
      text: `diagonals: ${shape} ABCD, E; ${n1} ${exA(e1)}, ${n2} ${exA(e2)}; find ${ask}`,
      answer: { type: 'int', value: want },
      visual: (() => { const l1 = segLabel(n1, e1, base), marks = [...base, ...l1, ...segLabel(n2, e2, [...base, ...l1])];
        return draw([...marks, letterE(P, E, marks)], [answerAt(P, ask === 'x' ? `x = ${x}` : `${ask} = ${want}`)]); })(),
      explain: `${why}${doubled}${s.work} ${then}${trap} So ${ask === 'x' ? `x = ${x}` : `${ask} = ${want}`}.`,
    };
  }
}

// ── Angles with diagonals ───────────────────────────────────────────────

// A rectangle's angles in terms of a = ∠CAB, each with the reason it is that.
const RECT = {
  CAB: [(a) => a, '', 'the angle the diagonal AC makes with AB'],
  ABD: [(a) => a, '△AEB is isosceles (EA = EB), so ∠ABD = ∠CAB', ''],
  ACD: [(a) => a, 'AB ∥ DC, so ∠ACD = ∠CAB, alternate angles', ''],
  BDC: [(a) => a, '△CED is isosceles (EC = ED), so ∠BDC = ∠ACD, which is ∠CAB by alternate angles', ''],
  CAD: [(a) => 90 - a, 'the corner at A is 90°, so ∠CAD = 90° − ∠CAB', ''],
  ACB: [(a) => 90 - a, '△ABC has its right angle at B, so ∠ACB = 90° − ∠CAB', ''],
  DBC: [(a) => 90 - a, 'the corner at B is 90°, so ∠DBC = 90° − ∠ABD, and ∠ABD = ∠CAB as △AEB is isosceles', ''],
  BDA: [(a) => 90 - a, '△AED is isosceles (EA = ED), so ∠BDA = ∠CAD = 90° − ∠CAB', ''],
  AEB: [(a) => 180 - 2 * a, '△AEB is isosceles with two angles equal to ∠CAB, so ∠AEB = 180° − 2∠CAB', ''],
  CED: [(a) => 180 - 2 * a, '∠CED is vertically opposite ∠AEB, which is 180° − 2∠CAB in isosceles △AEB', ''],
  BEC: [(a) => 2 * a, '∠BEC is on a straight line with ∠AEB = 180° − 2∠CAB, so ∠BEC = 2∠CAB', ''],
  AED: [(a) => 2 * a, '∠AED is vertically opposite ∠BEC, which is 2∠CAB', ''],
};
// A rhombus's angles in terms of b = ∠ABC.
const RHOMBUS = {
  ABC: [(b) => b, ''],
  ADC: [(b) => b, '∠ADC is opposite ∠ABC, so they are equal'],
  BAD: [(b) => 180 - b, '∠BAD is next to ∠ABC, so ∠BAD = 180° − ∠ABC'],
  BCD: [(b) => 180 - b, '∠BCD is next to ∠ABC, so ∠BCD = 180° − ∠ABC'],
  ABD: [(b) => b / 2, 'the diagonal BD bisects ∠ABC, so ∠ABD = ½∠ABC'],
  DBC: [(b) => b / 2, 'the diagonal BD bisects ∠ABC, so ∠DBC = ½∠ABC'],
  ADB: [(b) => b / 2, '△ABD is isosceles (AB = AD), so ∠ADB = ∠ABD = ½∠ABC'],
  BAC: [(b) => 90 - b / 2, '△ABC is isosceles (BA = BC), so ∠BAC = (180° − ∠ABC) ÷ 2'],
  BCA: [(b) => 90 - b / 2, '△ABC is isosceles (BA = BC), so ∠BCA = (180° − ∠ABC) ÷ 2'],
  CAD: [(b) => 90 - b / 2, 'AC bisects ∠BAD = 180° − ∠ABC, so ∠CAD = (180° − ∠ABC) ÷ 2'],
  AEB: [() => 90, 'the diagonals of a rhombus are perpendicular, so ∠AEB = 90°'],
};
/** The canonical angle back from a given one: the a or b that gives `v` at `name`. */
const backFrom = (table, name, v, lo, hi) => {
  for (let c = lo; c <= hi; c++) if (table[name][0](c) === v) return c;
  return null;
};
const shownRule = (table, name, c) => {
  const f = table[name][0], v = f(c);
  if (v === c || name === 'AEB' && table === RHOMBUS) return `${v}`;
  const s = f.toString();
  if (s.includes('180 - 2')) return `180 − 2 × ${c} = ${v}`;
  if (s.includes('2 * a')) return `2 × ${c} = ${v}`;
  if (s.includes('90 - b / 2')) return `(180 − ${c}) ÷ 2 = ${v}`;
  if (s.includes('b / 2')) return `${c} ÷ 2 = ${v}`;
  if (s.includes('90 -')) return `90 − ${c} = ${v}`;
  if (s.includes('180 -')) return `180 − ${c} = ${v}`;
  return `${v}`;
};

function diagonalAngles(rng) {
  const rect = rng.chance(0.55);
  const table = rect ? RECT : RHOMBUS;
  const canon = rect ? 'CAB' : 'ABC';
  for (;;) {
    const c = rect ? rng.int(20, 70) : 2 * rng.int(25, 65);
    if (rect ? Math.abs(c - 45) < 6 : Math.abs(c - 90) < 14) continue;
    const names = Object.keys(table).filter((n) => !(table === RHOMBUS && n === 'AEB'));
    const given = rng.pick(names);
    const asked = rng.pick(Object.keys(table).filter((n) => n !== given && (table[n][0](c) !== table[given][0](c) || rng.chance(0.25))));
    const gv = table[given][0](c), want = table[asked][0](c);
    if (backFrom(table, given, gv, rect ? 1 : 2, rect ? 89 : 178) !== c) continue;
    let P;
    if (rect) {
      const w = 4.6, h = r2(w * Math.tan(c * RAD));
      if (h > 4.2 || h < 1.6) continue;
      P = turned([[0, 0], [w, 0], [w, h], [0, h]], rng.int(-12, 12));
    } else {
      P = turned(para(180 - c, 3.4, 3.4), rng.int(-12, 12));
    }
    const E = mid(P[0], P[2]);
    const pts = { A: P[0], B: P[1], C: P[2], D: P[3], E };
    const corner = (n, l, tone) => angleText(pts[n[1]], pts[n[0]], pts[n[2]], l, tone);
    const drawn = [...outline(P), { kind: 'segment', from: P[0], to: P[2], tone: LINE }, { kind: 'segment', from: P[1], to: P[3], tone: LINE },
      ...cornerNames(P, NAMES),
      ...arcs(pts[given[1]], pts[given[0]], pts[given[2]], 1), corner(given, deg(gv), GIVEN),
      ...arcs(pts[asked[1]], pts[asked[0]], pts[asked[2]], 1, ASKED), corner(asked, '?', ASKED)];
    const marks = [...drawn, letterE(P, E, drawn)];
    const intro = rect
      ? 'A rectangle’s diagonals are equal and bisect each other, so EA = EB = EC = ED, and each of the four small triangles is isosceles. '
      : 'A rhombus has four equal sides, and its diagonals bisect its corner angles and cross at right angles. ';
    const toCanon = given === canon ? '' : `${cap(table[given][rect ? 1 : 1])}; with ∠${given} = ${gv}°, that makes ∠${canon} = ${c}°. `;
    const toAsked = asked === canon ? `So ∠${canon} = ${c}°. ` : `Then ${table[asked][1]}: ∠${asked} = ${shownRule(table, asked, c)}°. `;
    const trap = rect
      ? (want === 90 - c ? '(The diagonal does not halve the right angle unless the rectangle is a square.) '
        : '(The diagonals are equal, but they cross at a right angle only in a square.) ')
      : '(Unlike a rectangle’s, a rhombus’s diagonals are not equal, so △AEB is not isosceles: the isosceles triangles are △ABD and △ABC.) ';
    return {
      prompt: [T.prose(`ABCD is a ${rect ? 'rectangle' : 'rhombus'} whose diagonals meet at E, and ∠${given} = ${deg(gv)}. What is ∠${asked}, in degrees?`)],
      text: `diagonal angles: ${rect ? 'rectangle' : 'rhombus'} ABCD, E; angle ${given} ${gv}; find angle ${asked}`,
      answer: { type: 'int', value: want },
      visual: draw(marks, [answerAt(P, `∠${asked} = ${deg(want)}`)], 1.2),
      explain: `${intro}${toCanon}${toAsked}${trap}So ∠${asked} = ${deg(want)}.`,
    };
  }
}

// ── Which special quadrilateral ─────────────────────────────────────────

const FACT = {
  'opp-par': 'both pairs of opposite sides are parallel',
  'opp-eq': 'both pairs of opposite sides are equal',
  'diag-bis': 'the diagonals bisect each other',
  'pair-eq-par': 'one pair of opposite sides is both equal and parallel',
  'opp-ang': 'both pairs of opposite angles are equal',
  right: 'one angle is a right angle',
  'all-right': 'all four angles are right angles',
  'adj-eq': 'two adjacent sides are equal',
  'all-eq': 'all four sides are equal',
  'diag-eq': 'the diagonals are equal in length',
  'diag-perp': 'the diagonals are perpendicular',
  'diag-bis-ang': 'one diagonal bisects the angles at its ends',
  'one-par': 'one pair of opposite sides is parallel and the other pair is not',
  'kite-sides': 'it has two pairs of equal adjacent sides, but not all four sides are equal',
  'par-other-eq': 'one pair of opposite sides is parallel and the other pair is equal',
  'pair-par': 'one pair of opposite sides is parallel',
  'pair-opp-ang': 'one pair of opposite angles is equal',
  'base-ang': 'the two angles at one of the parallel sides are equal',
  'one-diag-bis': 'one diagonal cuts the other in half, but not the other way round',
};
const SHAPES = [
  { id: 'square', label: 'Square' }, { id: 'rectangle', label: 'Rectangle' }, { id: 'rhombus', label: 'Rhombus' },
  { id: 'parallelogram', label: 'Parallelogram' }, { id: 'trapezoid', label: 'Trapezoid' }, { id: 'kite', label: 'Kite' },
  { id: 'none', label: 'None of these is certain' },
];
const P_IS = 'so it is a parallelogram';
const SCENARIOS = [
  [['opp-par'], 'parallelogram', 'That is what a parallelogram is. Nothing fixes an angle or makes two neighboring sides equal, so it need be nothing more.'],
  [['opp-eq'], 'parallelogram', `A diagonal cuts it into two triangles with three equal sides each, congruent by SSS; their equal angles make opposite sides parallel, ${P_IS}. Nothing more is fixed.`],
  [['diag-bis'], 'parallelogram', `The vertical angles where the diagonals cross give two pairs of congruent triangles (SAS), whose equal angles make opposite sides parallel, ${P_IS}. Nothing makes it more.`],
  [['pair-eq-par'], 'parallelogram', `A diagonal splits it into two triangles congruent by SAS, so the other pair of sides is equal and parallel too, ${P_IS}. Nothing more is fixed.`],
  [['opp-ang'], 'parallelogram', `The angles are x, y, x and y around, adding to 360°, so x + y = 180°: co-interior angles adding to 180° make opposite sides parallel, ${P_IS}.`],
  [['opp-par', 'right'], 'rectangle', 'In a parallelogram neighboring angles add to 180° and opposite ones match, so one right angle makes all four right: a rectangle. No side is said to equal its neighbor, so not necessarily a square.'],
  [['opp-par', 'diag-eq'], 'rectangle', 'A parallelogram with equal diagonals is a rectangle: the triangles each diagonal cuts off are congruent (SSS), so neighboring angles are equal, and adding to 180° each is 90°. Not necessarily a square.'],
  [['diag-bis', 'diag-eq'], 'rectangle', 'Diagonals that bisect each other make a parallelogram, and equal diagonals make that parallelogram a rectangle. They are not said to be perpendicular, so not necessarily a square.'],
  [['all-right'], 'rectangle', 'Four right angles is a rectangle. Nothing says the sides are equal, so not necessarily a square.'],
  [['opp-par', 'adj-eq'], 'rhombus', 'Opposite sides of a parallelogram are equal, so two equal neighbors make all four sides equal: a rhombus. No angle is fixed, so not necessarily a square.'],
  [['opp-par', 'diag-perp'], 'rhombus', 'In a parallelogram the diagonals bisect each other; perpendicular as well, each one is the perpendicular bisector of the other, which makes neighboring sides equal: a rhombus. Not necessarily a square.'],
  [['all-eq'], 'rhombus', 'Four equal sides is a rhombus. No angle is said to be right, so not necessarily a square.'],
  [['diag-bis', 'diag-perp'], 'rhombus', 'Bisecting diagonals make a parallelogram; perpendicular ones make each the perpendicular bisector of the other, so all four sides are equal: a rhombus. The diagonals are not said to be equal, so not necessarily a square.'],
  [['opp-eq', 'diag-bis-ang'], 'rhombus', 'Equal opposite sides make a parallelogram, and a diagonal that bisects its angles splits it into two isosceles triangles, so neighboring sides are equal: a rhombus. Not necessarily a square.'],
  [['diag-bis', 'diag-eq', 'diag-perp'], 'square', 'Bisecting makes a parallelogram, equal makes it a rectangle, perpendicular makes it a rhombus; a rectangle that is a rhombus is a square.'],
  [['all-right', 'adj-eq'], 'square', 'Four right angles is a rectangle, whose opposite sides are equal; two equal neighbors then make all four sides equal: a square.'],
  [['all-eq', 'right'], 'square', 'Four equal sides is a rhombus, a parallelogram, so one right angle makes all four right: a square.'],
  [['opp-par', 'diag-eq', 'diag-perp'], 'square', 'A parallelogram with equal diagonals is a rectangle, and with perpendicular ones a rhombus; both at once is a square.'],
  [['one-par'], 'trapezoid', 'Exactly one pair of parallel sides is a trapezoid. With the other pair not parallel it cannot be a parallelogram.'],
  [['one-par', 'diag-eq'], 'trapezoid', 'Exactly one pair of parallel sides is a trapezoid (with equal diagonals, an isosceles one). It cannot be a parallelogram, so it cannot be a rectangle either.'],
  [['kite-sides'], 'kite', 'Two pairs of equal neighboring sides is a kite. With the sides not all equal, it is not a rhombus.'],
  [['diag-eq'], 'none', 'An isosceles trapezoid has equal diagonals and is no parallelogram, and so does a rectangle: equal diagonals alone do not settle it.'],
  [['diag-perp'], 'none', 'A kite has perpendicular diagonals and is no parallelogram, and so does a rhombus: perpendicular diagonals alone do not settle it.'],
  [['diag-eq', 'diag-perp'], 'none', 'Two equal sticks crossed at right angles away from their middles make a shape that is no parallelogram, and crossed at their middles a square: without bisecting, nothing is certain.'],
  [['par-other-eq'], 'none', 'An isosceles trapezoid has one pair of sides parallel and the other pair equal, and so does a parallelogram: either fits, so neither is certain.'],
  [['right'], 'none', 'Plenty of four-sided shapes have one right angle without anything else: a right trapezoid, or a kite. Nothing is certain.'],
  [['adj-eq'], 'none', 'Two equal neighboring sides is true of a kite and of a rhombus, and of shapes that are neither: nothing is certain.'],
  [['right', 'diag-eq'], 'none', 'A(0, 0), B(4, 0), C(3, 4), D(0, 3) has a right angle at A and diagonals AC = BD = 5, yet no parallel sides: not enough.'],
  [['pair-opp-ang'], 'none', 'A kite has one pair of opposite angles equal, and so does a parallelogram: either fits, so neither is certain.'],
  [['pair-par', 'pair-opp-ang'], 'parallelogram', 'The parallel pair makes the angles along each of the other two sides co-interior, adding to 180°. So the neighbors of the two equal angles are each 180° minus an equal angle, and equal too: both pairs of opposite angles are equal, so it is a parallelogram. Nothing more is fixed.'],
  [['opp-eq', 'right'], 'rectangle', 'Equal opposite sides make a parallelogram, and in a parallelogram one right angle makes all four right: a rectangle. No side is said to equal its neighbor, so not necessarily a square.'],
  [['diag-bis', 'right'], 'rectangle', 'Diagonals that bisect each other make a parallelogram, and in a parallelogram one right angle makes all four right: a rectangle. Not necessarily a square.'],
  [['opp-ang', 'right'], 'rectangle', 'Equal opposite angles make a parallelogram; the right angle’s opposite is right too, and the other two are 180° − 90° = 90°: a rectangle. Not necessarily a square.'],
  [['opp-eq', 'adj-eq'], 'rhombus', 'Equal opposite sides make a parallelogram, and two equal neighbors then make all four sides equal: a rhombus. No angle is fixed, so not necessarily a square.'],
  [['pair-eq-par', 'diag-perp'], 'rhombus', 'One pair of sides both equal and parallel makes a parallelogram, whose diagonals bisect each other; perpendicular as well, each is the perpendicular bisector of the other, so neighboring sides are equal: a rhombus. Not necessarily a square.'],
  [['opp-ang', 'adj-eq'], 'rhombus', 'Equal opposite angles make a parallelogram, whose opposite sides are equal, so two equal neighbors make all four equal: a rhombus. Not necessarily a square.'],
  [['all-eq', 'diag-eq'], 'square', 'Four equal sides is a rhombus, which is a parallelogram, and a parallelogram with equal diagonals is a rectangle; a rhombus that is a rectangle is a square.'],
  [['all-right', 'diag-perp'], 'square', 'Four right angles is a rectangle, which is a parallelogram, and a parallelogram with perpendicular diagonals is a rhombus; both at once is a square.'],
  [['one-par', 'right'], 'trapezoid', 'Exactly one pair of parallel sides is a trapezoid (with a right angle, a right trapezoid). It cannot be a parallelogram, so it cannot be a rectangle either.'],
  [['one-par', 'base-ang'], 'trapezoid', 'Exactly one pair of parallel sides is a trapezoid, and equal angles at one of the parallel sides make it an isosceles one. It cannot be a parallelogram.'],
  [['one-par', 'diag-perp'], 'trapezoid', 'Exactly one pair of parallel sides is a trapezoid, whatever its diagonals do. Without a second parallel pair it cannot be a rhombus.'],
  [['one-par', 'adj-eq'], 'trapezoid', 'Exactly one pair of parallel sides is a trapezoid. Two equal neighboring sides add no second parallel pair, so it cannot be a rhombus.'],
  [['kite-sides', 'right'], 'kite', 'Two pairs of equal neighboring sides is a kite, and a right angle does not change that. With the sides not all equal, it is not a rhombus or a square.'],
  [['kite-sides', 'diag-perp'], 'kite', 'Two pairs of equal neighboring sides is a kite, and every kite has perpendicular diagonals, so that adds nothing. With the sides not all equal, it is not a rhombus.'],
  [['kite-sides', 'diag-bis-ang'], 'kite', 'Two pairs of equal neighboring sides is a kite, and a kite’s line of symmetry always bisects the angles at its ends, so that adds nothing. With the sides not all equal, it is not a rhombus.'],
  [['one-diag-bis', 'diag-perp'], 'kite', 'The diagonal that is cut in half at right angles has the other diagonal as its perpendicular bisector, so each end of the other is as far from one of its ends as from the other: two pairs of equal neighboring sides, a kite. The other diagonal is not cut in half, so it is no parallelogram, and no rhombus.'],
];
// Ten sets of letters, so each set of facts comes round ten times before it repeats.
const LETTERS = ['ABCD', 'PQRS', 'WXYZ', 'JKLM', 'EFGH', 'KLMN', 'RSTU', 'MNOP', 'DEFG', 'QRST'];

// requiem: catalogue/content/quadrilateral-names-both-readings
function whichSpecial(rng) {
  const [facts, answer, why] = rng.pick(SCENARIOS);
  const shown = rng.shuffle([...facts]), name = rng.pick(LETTERS);
  const label = SHAPES.find((s) => s.id === answer).label;
  return {
    prompt: [T.prose(`All that is known about quadrilateral ${name}: ${shown.length === 1 ? FACT[shown[0]]
      : `${shown.slice(0, -1).map((f) => FACT[f]).join('; ')}; and ${FACT[shown[shown.length - 1]]}`}. `
      + 'What is the most specific name it must have?')],
    // The facts in the order the table lists them, so one set of facts under one name is one
    // problem however its facts are shuffled, and each set comes round equally often.
    text: `special quadrilateral ${name}: ${facts.join(', ')}`,
    answer: { type: 'choice', value: answer, options: SHAPES },
    visual: null,
    explain: `${why} (A shape that could be drawn to look like more is not proved to be more: only the facts count.) `
      + `So ${answer === 'none' ? 'none of these names is certain' : `it must be a ${label.toLowerCase()}`}.`,
  };
}

// ── Trapezoids and kites ────────────────────────────────────────────────

/** Trapezoid ABCD with AB along the bottom, DC above it, h up. */
function trapezoid(wAB, wDC, h, shift) {
  return [[0, 0], [wAB, 0], [shift + wDC, h], [shift, h]].map((p) => p.map(r2));
}

function midsegmentTrap(rng) {
  for (;;) {
    const ab = rng.int(8, 40), dc = rng.int(4, ab - 4);
    if ((ab + dc) % 2) continue;
    const m = (ab + dc) / 2;
    const wAB = 4.8, wDC = Math.max(1.4, (4.8 * dc) / ab), h = rng.pick([2.4, 2.8, 3.2]);
    const P = trapezoid(wAB, wDC, h, r2((wAB - wDC) / 2 + rng.int(-6, 6) / 10));
    const M = mid(P[0], P[3]), N = mid(P[1], P[2]), c = centroid(P);
    const base = [...outline(P), ...cornerNames(P, NAMES), { kind: 'segment', from: M, to: N, tone: LINE, dashed: true },
      text(toward(180, 0.45, M), 'M', LINE), text(toward(0, 0.45, N), 'N', LINE),
      ...ticks(P[0], M, 1), ...ticks(M, P[3], 1), ...ticks(P[1], N, 2), ...ticks(N, P[2], 2)];
    const mode = rng.pick(['mid', 'base', 'x']);
    const intro = 'AB ∥ DC, and M and N are the midpoints of AD and BC. ';
    if (mode === 'mid') {
      return {
        prompt: [T.prose(`ABCD is a trapezoid with AB ∥ DC. M and N are the midpoints of AD and BC. AB = ${ab} and DC = ${dc}. How long is MN?`)],
        text: `trapezoid midsegment: AB ${ab}, DC ${dc}; find MN`,
        answer: { type: 'int', value: m },
        visual: draw([...base, sideLabel(P[0], P[1], `${ab}`, c), sideLabel(P[3], P[2], `${dc}`, c)], [answerAt(P, `MN = ${m}`)]),
        explain: `${intro}The midsegment of a trapezoid is parallel to the bases and halfway between them, so its length is their average: `
          + `(${ab} + ${dc}) ÷ 2 = ${m}. (Half of one base, or their difference, leaves the other base out.) So MN = ${m}.`,
      };
    }
    if (mode === 'base') {
      const knowAB = rng.chance(0.5), known = knowAB ? ab : dc, want = knowAB ? dc : ab, wn = knowAB ? 'DC' : 'AB';
      return {
        prompt: [T.prose(`ABCD is a trapezoid with AB ∥ DC. M and N are the midpoints of AD and BC. ${knowAB ? 'AB' : 'DC'} = ${known} and MN = ${m}. How long is ${wn}?`)],
        text: `trapezoid midsegment: ${knowAB ? 'AB' : 'DC'} ${known}, MN ${m}; find ${wn}`,
        answer: { type: 'int', value: want },
        visual: draw([...base, knowAB ? sideLabel(P[0], P[1], `${ab}`, c) : sideLabel(P[3], P[2], `${dc}`, c),
          text([r2((M[0] + N[0]) / 2), r2(M[1] + 0.35)], `${m}`, GIVEN)], [answerAt(P, `${wn} = ${want}`)]),
        explain: `${intro}MN is the average of the bases, (AB + DC) ÷ 2, so the bases add to twice MN: 2 × ${m} = ${2 * m}. `
          + `Then ${wn} = ${2 * m} − ${known} = ${want}. (${known} − ${m} = ${known - m} is how far MN is from ${knowAB ? 'AB' : 'DC'}, not the other base.) So ${wn} = ${want}.`,
      };
    }
    const x = xFor(rng, [ab, dc]);
    const e1 = expr(rng, ab, x), e2 = expr(rng, dc, x);
    if (e1[0] + e2[0] === 0) continue;
    const s = solve([e1[0] + e2[0], e1[1] + e2[1]], [0, 2 * m]);
    return {
      prompt: [T.prose(`ABCD is a trapezoid with AB ∥ DC. M and N are the midpoints of AD and BC. AB = ${ex(e1)}, DC = ${ex(e2)} and MN = ${m}. What is x?`)],
      text: `trapezoid midsegment: AB ${exA(e1)}, DC ${exA(e2)}, MN ${m}; find x`,
      answer: { type: 'int', value: x },
      visual: draw([...base, sideLabel(P[0], P[1], ex(e1), c), sideLabel(P[3], P[2], ex(e2), c),
        text([r2((M[0] + N[0]) / 2), r2(M[1] + 0.35)], `${m}`, GIVEN)], [answerAt(P, `x = ${x}`)]),
      explain: `${intro}MN is the average of the bases, so AB + DC = 2 × ${m} = ${2 * m}: (${ex(e1)}) + (${ex(e2)}) = ${2 * m} gathers to ${s.work} `
        + `Check: AB = ${ab} and DC = ${dc}, whose average is ${m}. (Setting AB + DC equal to ${m} forgets that MN is half their sum.) So x = ${x}.`,
    };
  }
}

function isoTrap(rng) {
  const a = rng.int(48, 80);
  const wAB = 4.8, h = rng.pick([2.2, 2.6, 3]), run = r2(h / Math.tan(a * RAD));
  if (wAB - 2 * run < 1.4) return isoTrap(rng);
  const P = turned(trapezoid(wAB, r2(wAB - 2 * run), h, run), rng.int(-10, 10));
  const val = (v) => ('AB'.includes(v) ? a : 180 - a);
  const idx = (v) => NAMES.indexOf(v);
  const label = (v, l, tone = GIVEN) => cornerText(...at4(P, idx(v)), l, tone);
  const base = [...outline(P), ...cornerNames(P, NAMES), ...ticks(P[0], P[3], 1), ...ticks(P[1], P[2], 1)];
  const bases = 'In an isosceles trapezoid the angles at each base are equal: ∠A = ∠B and ∠C = ∠D. ';
  const intro = `${bases}And AB ∥ DC makes ∠A and ∠D co-interior, so they add to 180°. `;
  if (rng.chance(0.55)) {
    const v = rng.pick([...NAMES]), t = rng.pick([...NAMES].filter((u) => u !== v));
    const gv = val(v), want = val(t);
    const same = gv === want;
    return {
      prompt: [T.prose(`ABCD is an isosceles trapezoid with AB ∥ DC and AD = BC. ∠${v} = ${deg(gv)}. What is ∠${t}, in degrees?`)],
      text: `isosceles trapezoid: AB par DC, AD = BC; angle ${v} ${gv}; find angle ${t}`,
      answer: { type: 'int', value: want },
      visual: draw([...base, label(v, deg(gv)), ...arcs(...at4(P, idx(t)), 1, ASKED), label(t, '?', ASKED)], [answerAt(P, `∠${t} = ${deg(want)}`)]),
      explain: `${intro}${same ? `∠${t} is at the same base as ∠${v}, so ∠${t} = ${want}°. (Not 180 − ${gv}: that is the angle at the other end of a leg.)`
        : `∠${t} is at the other base, so ∠${t} = 180 − ${gv} = ${want}°.`} `
        + `${'AC BD'.split(' ').some((p) => p.includes(v) && p.includes(t)) ? '(Opposite angles are not equal here: that is a parallelogram’s property.) ' : ''}So ∠${t} = ${deg(want)}.`,
    };
  }
  for (;;) {
    const [v, u] = rng.pick([['A', 'B'], ['D', 'C'], ['A', 'D'], ['B', 'C']]);
    const equal = val(v) === val(u);
    const x = xFor(rng, [val(v), val(u)]);
    const e1 = expr(rng, val(v), x), e2 = expr(rng, val(u), x, [e1[0]]);
    const s = equal ? solve(e1, e2) : solve([e1[0] + e2[0], e1[1] + e2[1]], [0, 180]);
    return {
      prompt: [T.prose(`ABCD is an isosceles trapezoid with AB ∥ DC and AD = BC. ∠${v} = ${sized(e1)} and ∠${u} = ${sized(e2)}. What is x?`)],
      text: `isosceles trapezoid: AB par DC, AD = BC; angle ${v} ${ascii(...e1)}, angle ${u} ${ascii(...e2)}; find x`,
      answer: { type: 'int', value: x },
      visual: draw([...base, ...angleLabel(P, v, sized(e1)), ...angleLabel(P, u, sized(e2))], [answerAt(P, `x = ${x}`)]),
      explain: `${bases}${equal ? `∠${v} and ∠${u} share a base, so they are equal: ${s.work}`
        : `∠${v} and ∠${u} are at the two ends of leg ${v}${u}, and AB ∥ DC makes them co-interior, so they add to 180°: (${ex(e1)}) + (${ex(e2)}) = 180 gathers to ${s.work}`} `
        + `Check: ${putX(e1, x)} = ${val(v)} and ${putX(e2, x)} = ${val(u)}. `
        + `${equal ? '(Adding them to 180° would treat them as co-interior; they are base angles.)' : '(Setting them equal would make them base angles; they are on one leg.)'} So x = ${x}.`,
    };
  }
}

function kite(rng) {
  for (;;) {
    const al = rng.int(40, 120), ga = rng.int(40, 140);
    if ((al + ga) % 2 || Math.abs(al - ga) < 12) continue;
    const be = (360 - al - ga) / 2;
    if (be < 60 || be > 140) continue;
    // A at the left, the axis AC level; B above it, D below.
    const s1 = 2.6, B = [s1 * Math.cos((al / 2) * RAD), s1 * Math.sin((al / 2) * RAD)];
    const cx = B[0] + B[1] / Math.tan((ga / 2) * RAD);
    const P = turned([[0, 0], B, [cx, 0], [B[0], -B[1]]].map((p) => p.map(r2)), rng.int(-20, 20));
    const vals = { A: al, B: be, C: ga, D: be };
    const idx = (v) => NAMES.indexOf(v);
    const label = (v, l, tone = GIVEN) => cornerText(...at4(P, idx(v)), l, tone);
    const base = [...outline(P), ...cornerNames(P, NAMES), ...ticks(P[0], P[1], 1), ...ticks(P[0], P[3], 1), ...ticks(P[1], P[2], 2), ...ticks(P[2], P[3], 2)];
    const intro = 'In a kite the diagonal AC is a line of symmetry, so the angles between unequal sides match: ∠B = ∠D. All four add to 360°. ';
    const mode = rng.pick(['B', 'C', 'x']);
    if (mode === 'x') {
      const x = xFor(rng, [be]);
      const e1 = expr(rng, be, x), e2 = expr(rng, be, x, [e1[0]]);
      const s = solve(e1, e2);
      return {
        prompt: [T.prose(`ABCD is a kite with AB = AD and CB = CD. ∠A = ${deg(al)}, ∠B = ${sized(e1)} and ∠D = ${sized(e2)}. What is x?`)],
        text: `kite: AB = AD, CB = CD; angle A ${al}, angle B ${ascii(...e1)}, angle D ${ascii(...e2)}; find x`,
        answer: { type: 'int', value: x },
        visual: draw([...base, label('A', deg(al)), ...angleLabel(P, 'B', sized(e1)), ...angleLabel(P, 'D', sized(e2))], [answerAt(P, `x = ${x}`)]),
        explain: `${intro}So ${s.work} Check: both come to ${be}°. (∠A is between the two equal sides; it is not one of the matching pair.) So x = ${x}.`,
      };
    }
    const ask = mode, given = ask === 'B' ? ['A', 'C'] : ['A', rng.pick(['B', 'D'])];
    const want = vals[ask];
    const work = ask === 'B'
      ? `∠B + ∠D = 360 − ${al} − ${ga} = ${360 - al - ga}, and they are equal, so ∠B = ${360 - al - ga} ÷ 2 = ${be}°.`
      : `∠D = ∠B = ${be}°, so ∠C = 360 − ${al} − ${be} − ${be} = ${ga}°.`;
    return {
      prompt: [T.prose(`ABCD is a kite with AB = AD and CB = CD. ${given.map((v) => `∠${v} = ${deg(vals[v])}`).join(' and ')}. What is ∠${ask}, in degrees?`)],
      text: `kite: AB = AD, CB = CD; ${given.map((v) => `angle ${v} ${vals[v]}`).join(', ')}; find angle ${ask}`,
      answer: { type: 'int', value: want },
      visual: draw([...base, ...given.map((v) => label(v, deg(vals[v]))), ...arcs(...at4(P, idx(ask)), 1, ASKED), label(ask, '?', ASKED)],
        [answerAt(P, `∠${ask} = ${deg(want)}`)]),
      explain: `${intro}${work} ${ask === 'B' ? '(∠A and ∠C sit between equal sides and need not match.)' : '(∠C need not equal ∠A: they are on the line of symmetry.)'} So ∠${ask} = ${deg(want)}.`,
    };
  }
}

const trapezoidsKites = (rng) => rng.pick([midsegmentTrap, isoTrap, kite])(rng);

// ── Triangle midsegment ─────────────────────────────────────────────────

const TRI = 'ABC';
function triangleMidsegment(rng) {
  // Three corners in a random shape, roughly 5 wide.
  for (;;) {
    const top = [r2(rng.int(5, 35) / 10), r2(rng.int(28, 40) / 10)];
    const P = turned([[0, 0], [4.8, 0], top], rng.int(-12, 12));
    const shared = rng.int(0, 2), y = (shared + 1) % 3, z = (shared + 2) % 3;
    const named = (i, j) => [TRI[i], TRI[j]].sort().join('');
    const s1 = named(shared, y), s2 = named(shared, z), third = named(y, z);
    const D = mid(P[shared], P[y]), E = mid(P[shared], P[z]);
    const base = [...outline(P), ...cornerNames(P, TRI), { kind: 'segment', from: D, to: E, tone: LINE },
      text(toward(dirTo(centroid(P), D), 0.42, D), 'D', LINE), text(toward(dirTo(centroid(P), E), 0.42, E), 'E', LINE),
      ...ticks(P[shared], D, 1), ...ticks(D, P[y], 1), ...ticks(P[shared], E, 2), ...ticks(E, P[z], 2)];
    const c = centroid(P);
    const given = `D and E are the midpoints of ${s1} and ${s2}`;
    const textHead = `triangle midsegment: D mid ${s1}, E mid ${s2}`;
    const fact = `The segment joining the midpoints of two sides is parallel to the third side, ${third}, and half as long. `;
    const mode = rng.pick(['half', 'double', 'x', 'x', 'perimeter', 'angle']);
    if (mode === 'half' || mode === 'double') {
      const de = rng.int(3, 30), long = 2 * de;
      const half = mode === 'half';
      return {
        prompt: [T.prose(`In △ABC, ${given}. ${half ? `${third} = ${long}. How long is DE?` : `DE = ${de}. How long is ${third}?`}`)],
        text: `${textHead}; ${half ? `${third} ${long}; find DE` : `DE ${de}; find ${third}`}`,
        answer: { type: 'int', value: half ? de : long },
        visual: draw([...base, half ? sideLabel(P[y], P[z], `${long}`, c) : sideLabel(D, E, `${de}`, P[shared])],
          [answerAt(P, half ? `DE = ${de}` : `${third} = ${long}`)]),
        explain: `${fact}${half ? `DE = ${long} ÷ 2 = ${de}.` : `So ${third} is twice DE: 2 × ${de} = ${long}.`} `
          + `${half ? `(DE is not as long as ${third}: it reaches only halfway up the triangle.) ` : '(Halving DE goes the wrong way: the midsegment is the shorter one.) '}So ${half ? `DE = ${de}` : `${third} = ${long}`}.`,
      };
    }
    if (mode === 'x') {
      const de = rng.int(4, 25), x = xFor(rng, [de, 2 * de]);
      const e1 = expr(rng, de, x), e2 = expr(rng, 2 * de, x);
      if (2 * e1[0] === e2[0]) continue;
      const s = solve([2 * e1[0], 2 * e1[1]], e2);
      const ask = rng.chance(0.65) ? 'x' : rng.pick(['DE', third]);
      const want = ask === 'x' ? x : ask === 'DE' ? de : 2 * de;
      return {
        prompt: [T.prose(`In △ABC, ${given}. DE = ${ex(e1)} and ${third} = ${ex(e2)}. ${ask === 'x' ? 'What is x?' : `How long is ${ask}?`}`)],
        text: `${textHead}; DE ${exA(e1)}, ${third} ${exA(e2)}; find ${ask}`,
        answer: { type: 'int', value: want },
        visual: draw([...base, sideLabel(D, E, ex(e1), P[shared]), sideLabel(P[y], P[z], ex(e2), c)], [answerAt(P, ask === 'x' ? `x = ${x}` : `${ask} = ${want}`)]),
        explain: `${fact}So ${third} = 2 × DE: 2(${ex(e1)}) = ${ex(e2)}, which is ${s.work} `
          + `${ask === 'x' ? `Check: DE = ${de} and ${third} = ${2 * de}.` : ask === 'DE' ? `Then DE = ${putX(e1, x)} = ${de}.` : `Then ${third} = ${putX(e2, x)} = ${2 * de}.`} `
          + `(Setting DE equal to ${third} forgets the half.) So ${ask === 'x' ? `x = ${x}` : `${ask} = ${want}`}.`,
      };
    }
    if (mode === 'perimeter') {
      for (;;) {
        const sides = [rng.int(4, 30), rng.int(4, 30), rng.int(4, 30)];
        const [a, b, cc] = [...sides].sort((p, q) => p - q);
        const total = sides[0] + sides[1] + sides[2];
        if (a + b <= cc + 2 || total % 2) continue;
        // requiem: catalogue/content/labelled-figures-to-scale
        // Drawn from its own three sides, so the side labelled longest is drawn longest.
        const Q = turned(fromSides(sides[0], sides[1], sides[2], 4.8).map((q) => q.map(r2)), rng.int(-12, 12)), cq = centroid(Q);
        const corner = (i) => { const [u, v] = [Q[(i + 1) % 3], Q[(i + 2) % 3]].map((q) => dirTo(Q[i], q)); return Math.abs(((u - v + 540) % 360) - 180); };
        if (Math.min(corner(0), corner(1), corner(2)) < 22) continue;
        return {
          prompt: [T.prose(`△ABC has AB = ${sides[0]}, BC = ${sides[1]} and CA = ${sides[2]}. D, E and F are the midpoints of its sides. What is the perimeter of △DEF?`)],
          text: `midpoint triangle: AB ${sides[0]}, BC ${sides[1]}, CA ${sides[2]}; find perimeter`,
          answer: { type: 'int', value: total / 2 },
          visual: (() => {
            const F = mid(Q[1], Q[2]), D0 = mid(Q[0], Q[1]), E0 = mid(Q[0], Q[2]);
            return draw([...outline(Q), ...cornerNames(Q, TRI), ...outline([D0, F, E0], GIVEN),
              sideLabel(Q[0], Q[1], `${sides[0]}`, cq), sideLabel(Q[1], Q[2], `${sides[1]}`, cq), sideLabel(Q[2], Q[0], `${sides[2]}`, cq)],
            [answerAt(Q, `perimeter ${total / 2}`)]);
          })(),
          explain: `Each side of △DEF joins two midpoints, so it is half the side of △ABC it is parallel to. `
            + `Its perimeter is half of ABC’s: (${sides.join(' + ')}) ÷ 2 = ${total} ÷ 2 = ${total / 2}. `
            + `(Each midsegment halves a different side: none of them is half of the side it touches.) So ${total / 2}.`,
        };
      }
    }
    // Angles: DE ∥ the third side, crossed by the two sides through the midpoints.
    if (shared !== 0) continue;
    const angB = Math.round(Math.abs(((dirTo(P[1], P[0]) - dirTo(P[1], P[2]) + 540) % 360) - 180));
    if (angB < 30 || angB > 110) continue;
    const kind = rng.pick(['ADE', 'ADE', 'BDE']);
    const want = kind === 'ADE' ? angB : 180 - angB;
    return {
      prompt: [T.prose(`In △ABC, D and E are the midpoints of AB and AC, and ∠ABC = ${deg(angB)}. What is ∠${kind}, in degrees?`)],
      text: `triangle midsegment: D mid AB, E mid AC; angle ABC ${angB}; find angle ${kind}`,
      answer: { type: 'int', value: want },
      visual: draw([...base, cornerText(P[1], P[0], P[2], deg(angB)), ...arcs(D, kind === 'ADE' ? P[0] : P[1], E, 1, ASKED),
        cornerText(D, kind === 'ADE' ? P[0] : P[1], E, '?', ASKED)], [answerAt(P, `∠${kind} = ${deg(want)}`)]),
      explain: `${fact}AB crosses the parallel lines DE and BC, so ${kind === 'ADE'
        ? `∠ADE and ∠ABC are corresponding angles, and equal: ∠ADE = ${angB}°. (They are not co-interior: both open towards C’s side, on the same side of AB.)`
        : `∠BDE and ∠ABC are co-interior angles between them, and add to 180°: ∠BDE = 180 − ${angB} = ${want}°. (Equal would be ∠ADE, the corresponding angle.)`} `
        + `So ∠${kind} = ${deg(want)}.`,
    };
  }
}

// ── Verify on coordinates ───────────────────────────────────────────────

const SPAN = 9;
const PLANE = { kind: 'plane', xRange: [-SPAN, SPAN], yRange: [-SPAN, SPAN], grid: 1 };
/** A grid just big enough for the shape and its slope labels, square, always holding the origin. */
function framed(P) {
  const xs = [0, ...P.map((p) => p[0])], ys = [0, ...P.map((p) => p[1])];
  const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) + 5;
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2;
  const lo = (c) => Math.floor(c - span / 2);
  return { ...PLANE, xRange: [lo(cx), lo(cx) + Math.ceil(span)], yRange: [lo(cy), lo(cy) + Math.ceil(span)] };
}
const gcd = (a, b) => (b === 0 ? Math.abs(a) : gcd(b, a % b));
const pt = ([x, y]) => `(${num(x)}, ${num(y)})`;
const ascii2 = ([x, y]) => `(${x}, ${y})`;
const d2 = (p, q) => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2;
const vec = (p, q) => [q[0] - p[0], q[1] - p[1]];
const cross = (u, v) => u[0] * v[1] - u[1] * v[0];
const dotV = (u, v) => u[0] * v[0] + u[1] * v[1];
const slopeOf = (p, q) => {
  const [run, rise] = vec(p, q);
  if (run === 0) return 'undefined';
  const g = gcd(rise, run) * Math.sign(run);
  return run / g === 1 ? num(rise / g) : `${num(rise / g)}/${run / g}`;
};
/** The most specific name, from the corners alone. */
function nameOf(P) {
  const S = [0, 1, 2, 3].map((i) => vec(P[i], P[(i + 1) % 4]));
  const L = [0, 1, 2, 3].map((i) => d2(P[i], P[(i + 1) % 4]));
  const par1 = cross(S[0], S[2]) === 0, par2 = cross(S[1], S[3]) === 0;
  if (par1 && par2) {
    const right = dotV(S[0], S[1]) === 0, equal = L[0] === L[1];
    return right && equal ? 'square' : right ? 'rectangle' : equal ? 'rhombus' : 'parallelogram';
  }
  if (par1 || par2) return 'trapezoid';
  if ((L[0] === L[1] && L[2] === L[3]) || (L[1] === L[2] && L[3] === L[0])) return 'kite';
  return 'none';
}
const convex = (P) => {
  const c = [0, 1, 2, 3].map((i) => cross(vec(P[i], P[(i + 1) % 4]), vec(P[(i + 1) % 4], P[(i + 2) % 4])));
  return c.every((v) => v > 0) || c.every((v) => v < 0);
};
const fitsGrid = (P) => P.every(([x, y]) => Math.abs(x) <= SPAN - 1 && Math.abs(y) <= SPAN - 1);
const plus = (p, u, k = 1) => [p[0] + k * u[0], p[1] + k * u[1]];

function shapeFor(rng, want) {
  const A = [rng.int(-6, 4), rng.int(-6, 4)];
  const u = [rng.int(-4, 5), rng.int(-4, 5)], w = [-u[1], u[0]];
  switch (want) {
    case 'square': return [A, plus(A, u), plus(plus(A, u), w), plus(A, w)];
    case 'rectangle': { const k = rng.pick([2, 3]); const v = [w[0] * k, w[1] * k];
      const uu = rng.chance(0.5) ? u : [Math.sign(u[0]) * 1 || 1, 0];
      return rng.chance(0.6) ? [A, plus(A, u), plus(plus(A, u), v), plus(A, v)] : [A, plus(A, uu), plus(plus(A, uu), [0, k]), plus(A, [0, k])]; }
    case 'rhombus': { const v = rng.chance(0.5) ? [u[1], u[0]] : [-u[0], u[1]]; return [A, plus(A, u), plus(plus(A, u), v), plus(A, v)]; }
    case 'parallelogram': { const v = [rng.int(-4, 4), rng.int(-4, 4)]; return [A, plus(A, u), plus(plus(A, u), v), plus(A, v)]; }
    case 'trapezoid': { const v = [rng.int(-4, 4), rng.int(1, 5)]; const k = rng.pick([2, 3]), m = rng.pick([1, 2].filter((n) => n !== k));
      const g = gcd(u[0], u[1]) || 1, uu = [u[0] / g, u[1] / g];
      return [A, plus(A, uu, k * rng.pick([1, 2])), plus(plus(A, v), uu, m), plus(A, v)]; }
    case 'kite': { const g = gcd(u[0], u[1]) || 1, uu = [u[0] / g, u[1] / g], ww = [-uu[1], uu[0]];
      const a = rng.int(1, 3), c = rng.int(1, 4), b = rng.int(1, 3);
      const O = plus(A, uu, a);
      return [A, plus(O, ww, b), plus(O, uu, c), plus(O, ww, -b)]; }
    default: return [A, [rng.int(-7, 7), rng.int(-7, 7)], [rng.int(-7, 7), rng.int(-7, 7)], [rng.int(-7, 7), rng.int(-7, 7)]];
  }
}

const sideNames = ['AB', 'BC', 'CD', 'DA'];
function verify(rng) {
  const want = rng.pick(['square', 'rectangle', 'rhombus', 'parallelogram', 'parallelogram', 'trapezoid', 'kite', 'none']);
  for (;;) {
    let P = shapeFor(rng, want);
    // Start the lettering at any corner, either way round.
    const k = rng.int(0, 3);
    P = [0, 1, 2, 3].map((i) => P[(i + k) % 4]);
    if (rng.chance(0.5)) P = [P[0], P[3], P[2], P[1]];
    if (!fitsGrid(P) || !convex(P) || nameOf(P) !== want) continue;
    const L = [0, 1, 2, 3].map((i) => d2(P[i], P[(i + 1) % 4]));
    if (Math.min(...L) < 4) continue;
    const m = [0, 1, 2, 3].map((i) => slopeOf(P[i], P[(i + 1) % 4]));
    const S = [0, 1, 2, 3].map((i) => vec(P[i], P[(i + 1) % 4]));
    const par1 = cross(S[0], S[2]) === 0, par2 = cross(S[1], S[3]) === 0;
    const slopes = `Slopes: ${sideNames.map((n, i) => `${n} ${m[i]}`).join(', ')}. `;
    const lengths = `Squared lengths: ${sideNames.map((n, i) => `${n}² = ${L[i]}`).join(', ')}. `;
    let why;
    const perpWords = (i, j) => (m[i] === 'undefined' || m[j] === 'undefined' ? `${sideNames[i]} is upright and ${sideNames[j]} level` : `${m[i]} × ${m[j]} = −1`);
    if (par1 && par2) {
      const right = dotV(S[0], S[1]) === 0, equal = L[0] === L[1];
      why = `${slopes}Both pairs of opposite sides have matching slopes, so it is a parallelogram. `
        + (right ? `AB ⟂ BC (${perpWords(0, 1)}), so its angles are right: a rectangle. ` : `AB and BC are not perpendicular, so it is not a rectangle. `)
        + `${lengths.replace(/, CD.*$/, '. ').replace('Squared lengths', 'Neighboring sides squared')}`
        + (equal ? `AB = BC, so its sides are all equal${right ? ': a square.' : ': a rhombus.'} ` : `AB ≠ BC, so it is not a rhombus. `)
        + (want === 'rhombus' ? '(Equal sides are not enough for a square: it needs a right angle too.) '
          : want === 'rectangle' ? '(Right angles are not enough for a square: it needs equal neighboring sides too.) '
            : want === 'parallelogram' ? '(Looking square-ish is not a right angle: the slopes do not multiply to −1.) ' : '');
    } else if (par1 || par2) {
      const [a, b] = par1 ? [0, 2] : [1, 3], [c, d] = par1 ? [1, 3] : [0, 2];
      why = `${slopes}${sideNames[a]} and ${sideNames[b]} have the same slope, so they are parallel; ${sideNames[c]} and ${sideNames[d]} do not. `
        + `Exactly one pair of parallel sides makes a trapezoid. (With only one pair it cannot be a parallelogram, whatever its lengths.) `;
    } else if (want === 'kite') {
      const pairs = L[0] === L[1] ? 'AB = BC and CD = DA' : 'BC = CD and DA = AB';
      why = `${slopes}No two sides are parallel. ${lengths}${pairs}: two pairs of equal neighboring sides, not all four equal, so a kite. `
        + `(A kite’s equal sides are next to each other, not opposite: that is why it is not a parallelogram.) `;
    } else {
      why = `${slopes}No two sides are parallel, so it is no parallelogram or trapezoid. ${lengths}The sides do not make two pairs of equal neighbors, so it is no kite. `
        + `(However it looks, the slopes and lengths decide.) `;
    }
    const label = SHAPES.find((s) => s.id === want).label;
    const listed = P.map((p, i) => `${NAMES[i]} ${pt(p)}`).join(', ');
    return {
      prompt: [T.prose(`Quadrilateral ABCD has ${listed}. What is the most specific name for it?`)],
      text: `classify quadrilateral: ${P.map(ascii2).join(', ')}`,
      answer: { type: 'choice', value: want, options: SHAPES.map((s) => (s.id === 'none' ? { id: 'none', label: 'None of these' } : s)) },
      visual: (() => {
        // requiem: catalogue/content/point-names-outside-the-shape
        const v = namePoints({ ...framed(P), marks: [{ kind: 'path', points: [...P, P[0]], tone: LINE },
          ...P.map((p, i) => ({ kind: 'point', at: p, label: NAMES[i], tone: LINE }))], answer: [] });
        // Each slope beside its side, out from the shape, clear of the names and the axes.
        const at = P.map((p, i) => [(p[0] + P[(i + 1) % 4][0]) / 2, (p[1] + P[(i + 1) % 4][1]) / 2]);
        return { ...v, answer: pointNames(at.map((a, i) => ({ at: a, name: `m = ${m[i]}`, tone: RESULT, near: [] })), v.marks,
          { middle: centroid(P), unit: phoneUnit(v) }) };
      })(),
      explain: `${why}So ${want === 'none' ? 'none of these' : `a ${label.toLowerCase()}`}.`,
    };
  }
}

const CONTENT = [parallelogramProperties, diagonals, diagonalAngles, whichSpecial, trapezoidsKites, triangleMidsegment, verify];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
