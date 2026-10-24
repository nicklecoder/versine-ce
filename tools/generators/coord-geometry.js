/**
 * Catalogue authoring tool: builds the problem library for coordinate
 * geometry.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 *
 * Every `text` names the tool and lists the points, so
 * scripts/check-answers.py can work the answer again from the coordinates
 * alone. A perimeter that is not whole is asked to 1 dp, and says so.
 *
 * Every question is drawn on the grid, and the answer arrives on the
 * figure: the midpoint, the side lengths, the box and its corners, the
 * missing corner.
 */
import * as T from '../terms.js';
import { minus } from '../../web/ui/dom.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/coord-geometry.js';

const LINE = 'var(--vec-1)', GIVEN = 'var(--vec-2)', RESULT = 'var(--result)';
const SPAN = 9;
const PLANE = { kind: 'plane', xRange: [-SPAN, SPAN], yRange: [-SPAN, SPAN], grid: 1 };
const NAMES = ['A', 'B', 'C', 'D'];

const gcd = (a, b) => (b === 0 ? Math.abs(a) : gcd(b, a % b));
/** A number for prose: −3, 2.5. */
const num = (v) => minus(String(Math.round(v * 1000) / 1000));
/** a + b as it is written: 3 − 2, not 3 + −2. */
const add = (a, b) => `${num(a)} ${b < 0 ? '−' : '+'} ${num(Math.abs(b))}`;
/** A move in words: 6 left and 4 up. */
const trip = (dx, dy) => [dx ? `${num(Math.abs(dx))} ${dx > 0 ? 'right' : 'left'}` : '', dy ? `${num(Math.abs(dy))} ${dy > 0 ? 'up' : 'down'}` : '']
  .filter(Boolean).join(' and ') || 'nowhere';
/** A decimal answer for a whole number or a half. */
const decimal = (v) => ({ type: 'decimal', value: Number.isInteger(v) ? { n: v, d: 1 } : { n: Math.round(v * 10), d: 10 } });
/** A number to multiply or divide by, bracketed when negative. */
const br = (v) => (v < 0 ? `(${num(v)})` : num(v));
const pt = ([x, y]) => `(${num(x)}, ${num(y)})`;
const ascii = ([x, y]) => `(${x}, ${y})`;
const frac = (v) => { const d = Number.isInteger(v) ? 1 : Number.isInteger(v * 2) ? 2 : 3; return { n: Math.round(v * d), d }; };
const pairAnswer = ([x, y]) => ({ type: 'pair', value: { x: frac(x), y: frac(y) } });
const fits = (P, lim = SPAN - 1) => P.every(([x, y]) => Math.abs(x) <= lim && Math.abs(y) <= lim);
const same = (p, q) => p[0] === q[0] && p[1] === q[1];
const point = (at, label, tone = LINE) => ({ kind: 'point', at, label, tone });
const seg = (from, to, tone = LINE, extra = {}) => ({ kind: 'segment', from, to, tone, ...extra });
const polygon = (P, tone = LINE) => ({ kind: 'path', points: [...P, P[0]], tone });
const corners = (P, names = NAMES, tone = LINE) => P.map((p, i) => point(p, names[i], tone));
const d2 = (p, q) => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2;
const randPt = (rng, lim = 7) => [rng.int(-lim, lim), rng.int(-lim, lim)];
const listed = (P) => P.map((p, i) => `${NAMES[i]} ${pt(p)}`).join(', ');

// ── Midpoint ────────────────────────────────────────────────────────────

function midpoint(rng, end = rng.chance(0.35)) {
  const A = randPt(rng), B = randPt(rng);
  if (d2(A, B) < 10) return midpoint(rng, end);
  const M = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
  if (end) {
    // An end from the middle and the other end: as far again.
    const E = [2 * B[0] - A[0], 2 * B[1] - A[1]];
    if (!fits([E])) return midpoint(rng, end);
    return {
      prompt: [T.prose(`M ${pt(B)} is the midpoint of AB, and A is at ${pt(A)}. Where is B?`)],
      text: `endpoint: ${ascii(A)}, midpoint ${ascii(B)}`,
      answer: pairAnswer(E),
      visual: { ...PLANE, marks: [point(A, 'A'), point(B, 'M', GIVEN), seg(A, B)],
        answer: [seg(B, E, RESULT), point(E, 'B', RESULT)] },
      explain: `From A to M is ${trip(B[0] - A[0], B[1] - A[1])}. M is halfway, so B is the same again past M: `
        + `(${add(B[0], B[0] - A[0])}, ${add(B[1], B[1] - A[1])}) = ${pt(E)}. Or: B = 2M − A. `
        + `(Averaging A and M, ${pt([(A[0] + B[0]) / 2, (A[1] + B[1]) / 2])}, finds the point halfway to M, a quarter of the way along.) So ${pt(E)}.`,
    };
  }
  return {
    prompt: [T.prose(`What is the midpoint of A ${pt(A)} and B ${pt(B)}?`)],
    text: `midpoint: ${ascii(A)}, ${ascii(B)}`,
    answer: pairAnswer(M),
    visual: { ...PLANE, marks: [seg(A, B), point(A, 'A'), point(B, 'B')], answer: [point(M, 'M', RESULT)] },
    explain: `The midpoint is the average of the ends, each coordinate on its own: x = (${add(A[0], B[0])}) ÷ 2 = ${num(M[0])}, `
      + `y = (${add(A[1], B[1])}) ÷ 2 = ${num(M[1])}. `
      + `(Subtracting instead, ${num(B[0] - A[0])} and ${num(B[1] - A[1])}, is how far apart they are, not where the middle is.) So ${pt(M)}.`,
  };
}

// ── Perimeter ───────────────────────────────────────────────────────────

const root = (n) => (Number.isInteger(Math.sqrt(n)) ? `${Math.sqrt(n)}` : `√${n}`);
/** One side's working: a level or upright side is counted; a slanted one is Pythagoras. */
function sideWork(P, Q, name) {
  const dx = Math.abs(Q[0] - P[0]), dy = Math.abs(Q[1] - P[1]), n = dx * dx + dy * dy, L = Math.sqrt(n);
  if (dx === 0 || dy === 0) return [L, `${name} = ${dx + dy}`];
  return [L, `${name} = √(${dx}² + ${dy}²) = √${n}${Number.isInteger(L) ? ` = ${L}` : ` ≈ ${(Math.round(L * 1000) / 1000).toFixed(3)}`}`];
}

/** Run-and-rise pairs whose slanted side comes out whole. */
const WHOLE = [[3, 4], [4, 3], [6, 8], [8, 6], [5, 12], [12, 5]];

/**
 * A shape whose slanted sides come out whole, built from 3-4-5 runs and
 * rises: a right triangle, an isosceles triangle, a rhombus or a
 * parallelogram. Most points chosen at random make sides that are not.
 */
function wholeShape(rng) {
  for (;;) {
    const [a, b] = rng.pick(WHOLE), sx = rng.pick([1, -1]), sy = rng.pick([1, -1]);
    const A = randPt(rng, 6);
    const go = (dx, dy) => [A[0] + sx * dx, A[1] + sy * dy];
    const P = rng.pick([
      () => [A, go(a, 0), go(a, b)],
      () => [A, go(2 * a, 0), go(a, b)],
      () => [A, go(a, b), go(2 * a, 0), go(a, -b)],
      () => [A, go(a, 0), go(a + a, b), go(a, b)],
    ])();
    if (fits(P)) return P;
  }
}

function perimeter(rng, exact = rng.chance(0.4)) {
  const count = rng.chance(0.65) ? 3 : 4;
  for (;;) {
    const P = exact ? wholeShape(rng) : Array.from({ length: count }, () => randPt(rng, 7));
    const sides = P.length;
    // Convex and in order round, every side at least 2 long.
    const cross = P.map((p, i) => {
      const q = P[(i + 1) % sides], r = P[(i + 2) % sides];
      return (q[0] - p[0]) * (r[1] - q[1]) - (q[1] - p[1]) * (r[0] - q[0]);
    });
    if (!(cross.every((c) => c > 0) || cross.every((c) => c < 0))) continue;
    if (P.some((p, i) => d2(p, P[(i + 1) % sides]) < 4)) continue;
    const work = P.map((p, i) => sideWork(p, P[(i + 1) % sides], `${NAMES[i]}${NAMES[(i + 1) % sides]}`));
    const total = work.reduce((s, [L]) => s + L, 0);
    const whole = work.every(([L]) => Number.isInteger(L));
    // A mix of slanted sides, and at least one: otherwise it is counting.
    if (P.every((p, i) => p[0] === P[(i + 1) % sides][0] || p[1] === P[(i + 1) % sides][1])) continue;
    if (!whole) {
      const tenths = total * 10;
      if (Math.abs(tenths - Math.floor(tenths) - 0.5) < 0.02) continue;      // too near a rounding edge
    }
    const shape = sides === 3 ? 'triangle' : 'quadrilateral';
    const answer = whole ? { type: 'decimal', value: { n: total, d: 1 } }
      : { type: 'decimal', value: { n: Math.round(total * 10), d: 10, places: 1 } };
    const shown = whole ? `${total}` : (Math.round(total * 10) / 10).toFixed(1);
    const labels = P.map((p, i) => {
      const q = P[(i + 1) % sides];
      return { kind: 'text', at: [(p[0] + q[0]) / 2 + 0.6, (p[1] + q[1]) / 2 + 0.4], label: root(d2(p, q)), tone: RESULT };
    });
    // Right triangles on the slanted sides: the run and the rise the formula uses.
    const legs = P.flatMap((p, i) => {
      const q = P[(i + 1) % sides];
      if (p[0] === q[0] || p[1] === q[1]) return [];
      return [seg(p, [q[0], p[1]], GIVEN, { dashed: true }), seg([q[0], p[1]], q, GIVEN, { dashed: true })];
    });
    return {
      prompt: [T.prose(`What is the perimeter of the ${shape} ${P.map((_, i) => NAMES[i]).join('')} with ${listed(P)}${whole ? '' : ', to 1 decimal place'}?`)],
      text: `perimeter: ${P.map(ascii).join(', ')}${whole ? '' : ' to 1 dp'}`,
      answer,
      visual: { ...PLANE, marks: [polygon(P), ...corners(P)], answer: [...legs, ...labels] },
      explain: `Each side is the distance between its corners: √(run² + rise²) for a slanted one. ${work.map(([, w]) => w).join('; ')}. `
        + `Together ${whole ? `${work.map(([L]) => L).join(' + ')} = ${total}` : `about ${(Math.round(total * 1000) / 1000).toFixed(3)}, which is ${shown} to 1 dp — round only at the end`}. `
        + `(Adding the run and the rise of a slanted side walks round the corner, not along the side.) So ${shown}.`,
    };
  }
}

// ── Partition ───────────────────────────────────────────────────────────

// No 1:1: a half of the way is the midpoint, already a level of its own.
const RATIOS = [[1, 2], [2, 1], [1, 3], [3, 1], [2, 3], [3, 2], [1, 4], [3, 4], [4, 1]];

function partition(rng) {
  const [m, n] = rng.pick(RATIOS), parts = m + n;
  const A = randPt(rng, 8);
  const step = [rng.int(-4, 4), rng.int(-4, 4)];
  if (step[0] === 0 && step[1] === 0) return partition(rng);
  const B = [A[0] + step[0] * parts, A[1] + step[1] * parts];
  if (!fits([B]) || d2(A, B) < 16) return partition(rng);
  const P = [A[0] + step[0] * m, A[1] + step[1] * m];
  const asFraction = rng.chance(0.3);
  const f = `${m / gcd(m, parts)}/${parts / gcd(m, parts)}`;
  const ticks = Array.from({ length: parts - 1 }, (_, i) => point([A[0] + step[0] * (i + 1), A[1] + step[1] * (i + 1)], '', GIVEN));
  return {
    prompt: [T.prose(asFraction
      ? `P is ${f} of the way from A ${pt(A)} to B ${pt(B)}. Where is P?`
      : `P is on AB, with A ${pt(A)} and B ${pt(B)}, and AP : PB = ${m} : ${n}. Where is P?`)],
    text: asFraction ? `fraction of the way: ${f} from ${ascii(A)} to ${ascii(B)}` : `partition: ${ascii(A)} to ${ascii(B)}, ${m}:${n}`,
    answer: pairAnswer(P),
    visual: { ...PLANE, marks: [seg(A, B), point(A, 'A'), point(B, 'B')], answer: [...ticks, point(P, 'P', RESULT)] },
    explain: (asFraction ? '' : `A ratio of ${m} : ${n} cuts AB into ${m} + ${n} = ${parts} equal parts, and P is ${m} of them from A: ${f} of the way. `
      + (m === n ? '' : `(Not ${m}/${n} of the way: the ${n} counts the parts after P, not the whole.) `))
      + `The trip from A to B is ${trip(B[0] - A[0], B[1] - A[1])}; ${f} of it is ${trip(step[0] * m, step[1] * m)}. `
      + `Start at A and go that far: (${add(A[0], step[0] * m)}, ${add(A[1], step[1] * m)}) = ${pt(P)}. So ${pt(P)}.`,
  };
}

// ── Area ────────────────────────────────────────────────────────────────

/** Twice the signed area, the shoelace way. */
const shoelace2 = (P) => P.reduce((s, p, i) => { const q = P[(i + 1) % P.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0);

function areaTriangle(rng) {
  for (;;) {
    const P = [randPt(rng, 7), randPt(rng, 7), randPt(rng, 7)];
    const A2 = Math.abs(shoelace2(P));
    if (A2 < 12) continue;
    // Not with a side level or upright everywhere: then it is base times height.
    const slanted = P.filter((p, i) => { const q = P[(i + 1) % 3]; return p[0] !== q[0] && p[1] !== q[1]; }).length;
    if (slanted < 2) continue;
    const xs = P.map((p) => p[0]), ys = P.map((p) => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const box = (x1 - x0) * (y1 - y0);
    const cuts = P.map((p, i) => { const q = P[(i + 1) % 3]; return (Math.abs(q[0] - p[0]) * Math.abs(q[1] - p[1])) / 2; });
    // The box method takes away one right triangle per side; check it says what the shoelace says.
    if (Math.abs(box - cuts.reduce((s, c) => s + c, 0) - A2 / 2) > 1e-9) continue;
    const A = A2 / 2;
    const cornerOf = (p, q) => {
      // The box corner that makes a right triangle with this side, outside the triangle.
      const r = P.find((v) => !same(v, p) && !same(v, q));
      const c1 = [p[0], q[1]], c2 = [q[0], p[1]];
      const side = (c) => Math.sign((q[0] - p[0]) * (c[1] - p[1]) - (q[1] - p[1]) * (c[0] - p[0]));
      return side(c1) !== side(r) ? c1 : c2;
    };
    const regions = P.map((p, i) => { const q = P[(i + 1) % 3]; return p[0] === q[0] || p[1] === q[1] ? null : { kind: 'region', points: [p, cornerOf(p, q), q], tone: GIVEN }; }).filter(Boolean);
    return {
      prompt: [T.prose(`What is the area of the triangle with ${listed(P)}?`)],
      text: `area of polygon: ${P.map(ascii).join(', ')}`,
      answer: decimal(A),
      visual: { ...PLANE, marks: [polygon(P), ...corners(P)],
        answer: [...regions, polygon([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], GIVEN)].map((m) => (m.kind === 'path' ? { ...m, dashed: true } : m)) },
      explain: `Put the triangle in the smallest box with level and upright sides: ${x1 - x0} by ${y1 - y0}, area ${box}. `
        + `Each slanted side cuts a right triangle off a corner of the box, half its run times its rise: ${cuts.filter((c) => c > 0).map(num).join(', ')}. `
        + `What is left is the triangle: ${box} − ${cuts.filter((c) => c > 0).map(num).join(' − ')} = ${num(A)}. `
        + `(With slanted sides there is no base and height to read off the grid; the box gets round that.) So ${num(A)}.`,
    };
  }
}

function areaSquare(rng) {
  const p = rng.int(1, 5), q = rng.int(1, 5);
  const A = randPt(rng, 6);
  const S = [A, [A[0] + p, A[1] + q], [A[0] + p - q, A[1] + q + p], [A[0] - q, A[1] + p]];
  if (!fits(S) || p === 0 || q === 0) return areaSquare(rng);
  const side2 = p * p + q * q, big = (p + q) ** 2;
  const xs = S.map((v) => v[0]), ys = S.map((v) => v[1]);
  const box = [[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)], [Math.min(...xs), Math.max(...ys)]];
  return {
    prompt: [T.prose(`ABCD is a square with ${listed(S)}. What is its area?`)],
    text: `area of polygon: ${S.map(ascii).join(', ')}`,
    answer: decimal(side2),
    visual: { ...PLANE, marks: [polygon(S), ...corners(S)], answer: [{ ...polygon(box, GIVEN), dashed: true }] },
    explain: `The square is tilted, so draw the box around it: ${p + q} by ${p + q}, area ${big}. `
      + `It cuts four right triangles off the corners, each ${p} by ${q}, so ½ × ${p} × ${q} = ${num((p * q) / 2)} each, ${2 * p * q} in all. `
      + `${big} − ${2 * p * q} = ${side2}. (Check: a side is √(${p}² + ${q}²) = √${side2}, and the area is its square, ${side2}.) `
      + `(Counting ${p + q} × ${p + q} = ${big} is the box, not the square.) So ${side2}.`,
  };
}

const area = (rng) => (rng.chance(0.65) ? areaTriangle(rng) : areaSquare(rng));

// ── Slopes in shapes ────────────────────────────────────────────────────

const slopeText = (p, q) => { const g = gcd(p, q) * Math.sign(q); const a = p / g, b = q / g; return b === 1 ? num(a) : `${num(a)}/${b}`; };

function slopes(rng) {
  const perp = rng.chance(0.5);
  for (;;) {
    const A = randPt(rng, 6), B = randPt(rng, 6), C = randPt(rng, 6);
    const run = B[0] - A[0], rise = B[1] - A[1];
    if (run === 0 || rise === 0 || Math.abs(run) > 6 || Math.abs(rise) > 6) continue;
    const g = gcd(run, rise), u = [run / g, rise / g];
    const dir = perp ? [-u[1], u[0]] : u;
    const t = rng.nonZero(-2, 2);
    const D = [C[0] + dir[0] * t, C[1] + dir[1] * t];
    if (!fits([D]) || D[0] === C[0] || same(C, A) || same(C, B)) continue;
    // Not on the line AB itself, for the parallel case.
    if (!perp && (C[0] - A[0]) * rise === (C[1] - A[1]) * run) continue;
    const mAB = slopeText(rise, run), want = slopeText(dir[1], dir[0]);
    const dx = D[0] - C[0];
    return {
      prompt: [T.prose(`A ${pt(A)}, B ${pt(B)}, C ${pt(C)} and D (${num(D[0])}, k). CD is ${perp ? 'perpendicular' : 'parallel'} to AB. What is k?`)],
      text: `k for ${perp ? 'perpendicular' : 'parallel'}: ${ascii(A)}, ${ascii(B)}, ${ascii(C)}, x = ${D[0]}`,
      answer: { type: 'int', value: D[1] },
      visual: { ...PLANE, marks: [seg(A, B), point(A, 'A'), point(B, 'B'), point(C, 'C'),
        seg([D[0], -SPAN], [D[0], SPAN], GIVEN, { dashed: true, label: `x = ${num(D[0])}` })],
        answer: [seg(C, D, RESULT), point(D, 'D', RESULT)] },
      explain: `The slope of AB is rise over run: ${num(rise)} ÷ ${br(run)} = ${mAB}. `
        + (perp ? `Perpendicular slopes multiply to −1, so CD's slope is the negative reciprocal: ${want}. ${Math.abs(rise) === Math.abs(run) ? '(Turned over, 1 stays 1, so here only the sign changes.) ' : `(Only changing the sign, ${slopeText(-rise, run)}, is not enough: it must be turned over too.) `}`
          : `Parallel lines have the same slope, so CD's slope is ${mAB} too. `)
        + `From C to D the run is ${num(D[0])} − ${C[0] < 0 ? `(${num(C[0])})` : num(C[0])} = ${num(dx)}, so the rise is ${want} × ${br(dx)} = ${num(D[1] - C[1])}, `
        + `and k = ${add(C[1], D[1] - C[1])} = ${num(D[1])}. So k = ${num(D[1])}.`,
    };
  }
}

// ── Classify a triangle ─────────────────────────────────────────────────

const KINDS = [
  { id: 'right-isosceles', label: 'Right and isosceles' },
  { id: 'isosceles', label: 'Isosceles, not right' },
  { id: 'right', label: 'Right, not isosceles' },
  { id: 'scalene', label: 'Neither right nor isosceles' },
];
const dot = (o, p, q) => (p[0] - o[0]) * (q[0] - o[0]) + (p[1] - o[1]) * (q[1] - o[1]);
function verdict(P) {
  const s = [d2(P[0], P[1]), d2(P[1], P[2]), d2(P[2], P[0])];
  const right = [0, 1, 2].some((i) => dot(P[i], P[(i + 1) % 3], P[(i + 2) % 3]) === 0);
  const iso = new Set(s).size < 3;
  return right && iso ? 'right-isosceles' : iso ? 'isosceles' : right ? 'right' : 'scalene';
}

function classify(rng, want = rng.pick(KINDS).id) {
  for (;;) {
    const A = randPt(rng, 5);
    const p = rng.nonZero(-4, 4), q = rng.nonZero(-4, 4);
    let B, C;
    if (want === 'right-isosceles') { B = [A[0] + p, A[1] + q]; C = [A[0] - q, A[1] + p]; }
    else if (want === 'right') { const k = rng.pick([2, 3, 0.5]); B = [A[0] + p, A[1] + q]; C = [A[0] - q * k, A[1] + p * k]; }
    else if (want === 'isosceles') { B = [A[0] + p, A[1] + q]; C = rng.chance(0.5) ? [A[0] + q, A[1] + p] : [A[0] - p, A[1] + q]; }
    else { B = randPt(rng, 7); C = randPt(rng, 7); }
    const P = rng.shuffle([A, B, C]);
    if (!P.every((v) => v.every(Number.isInteger)) || !fits(P) || Math.abs(shoelace2(P)) < 6 || verdict(P) !== want) continue;
    const s = [d2(P[0], P[1]), d2(P[1], P[2]), d2(P[2], P[0])];
    const names = ['AB', 'BC', 'CA'];
    const sorted = [...s].sort((a, b) => a - b);
    const rightAt = [0, 1, 2].find((i) => dot(P[i], P[(i + 1) % 3], P[(i + 2) % 3]) === 0);
    const slope = (u, v) => (v[0] === u[0] ? 'undefined' : slopeText(v[1] - u[1], v[0] - u[0]));
    const lengths = `Each side squared is run² + rise²: ${names.map((n, i) => `${n}² = ${s[i]}`).join(', ')}. `;
    const isoWords = new Set(s).size < 3 ? `Two match, so two sides are equal: isosceles. ` : 'All three differ, so no two sides are equal. ';
    const v = rightAt ?? null;
    const rightWords = v !== null
      ? `At ${NAMES[v]} the sides have slopes ${slope(P[v], P[(v + 1) % 3])} and ${slope(P[v], P[(v + 2) % 3])}, `
        + `${[slope(P[v], P[(v + 1) % 3]), slope(P[v], P[(v + 2) % 3])].includes('undefined') ? 'one level and one upright' : 'multiplying to −1'}: a right angle. `
      : `And the largest, ${sorted[2]}, is not the other two added (${sorted[0]} + ${sorted[1]} = ${sorted[0] + sorted[1]}), so by Pythagoras there is no right angle. `;
    return {
      prompt: [T.prose(`Triangle ABC has ${listed(P)}. Which is it?`)],
      text: `classify triangle: ${P.map(ascii).join(', ')}`,
      answer: { type: 'choice', value: want, options: KINDS },
      visual: { ...PLANE, marks: [polygon(P), ...corners(P)],
        answer: P.map((p, i) => { const q = P[(i + 1) % 3]; return { kind: 'text', at: [(p[0] + q[0]) / 2 + 0.6, (p[1] + q[1]) / 2 + 0.4], label: root(s[i]), tone: RESULT }; }) },
      explain: `${lengths}${isoWords}${rightWords}So ${KINDS.find((k) => k.id === want).label.toLowerCase()}.`,
    };
  }
}

// ── Complete the parallelogram ──────────────────────────────────────────

function parallelogram(rng) {
  for (;;) {
    const A = randPt(rng, 6), B = randPt(rng, 6), C = randPt(rng, 6);
    const D = [A[0] + C[0] - B[0], A[1] + C[1] - B[1]];
    if (!fits([D]) || Math.abs(shoelace2([A, B, C])) < 8 || d2(A, B) < 5 || d2(B, C) < 5) continue;
    const wrong = [B[0] + C[0] - A[0], B[1] + C[1] - A[1]];
    const M = [(A[0] + C[0]) / 2, (A[1] + C[1]) / 2];
    return {
      prompt: [T.prose(`ABCD is a parallelogram, its corners in that order, with ${listed([A, B, C])}. Where is D?`)],
      text: `fourth vertex: ${ascii(A)}, ${ascii(B)}, ${ascii(C)}`,
      answer: pairAnswer(D),
      visual: { ...PLANE, marks: [seg(A, B), seg(B, C), ...corners([A, B, C])],
        answer: [seg(C, D, RESULT), seg(D, A, RESULT), point(D, 'D', RESULT), seg(A, C, GIVEN, { dashed: true })] },
      explain: `Opposite sides of a parallelogram are equal and parallel, so the slide from B to A takes C to D. `
        + `B to A is ${trip(A[0] - B[0], A[1] - B[1])}; from C that lands on (${add(C[0], A[0] - B[0])}, ${add(C[1], A[1] - B[1])}) = ${pt(D)}. `
        + `Check: the diagonals cut each other in half, and AC and BD both have midpoint ${pt(M)}. `
        + `(B + C − A = ${pt(wrong)} is the corner opposite A instead, which would make the corners run A, B, D, C.) So ${pt(D)}.`,
    };
  }
}

const CONTENT = [(rng) => midpoint(rng), (rng) => perimeter(rng), partition, area, slopes, (rng) => classify(rng), parallelogram];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
