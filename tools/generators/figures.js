/**
 * Figure helpers shared by the geometry generators: angles, triangles and
 * polygons drawn to scale on the plane, with no axes.
 *
 * Authoring-time only, like the generators beside it. Not a generator
 * itself -- no skill is called "figures" -- but it lives here so the build's
 * fingerprint covers it, and a change to how figures are drawn is noticed.
 */
export const LINE = 'var(--vec-1)';
export const GIVEN = 'var(--vec-2)';
export const ASKED = 'var(--gold)';

export const RAD = Math.PI / 180;
export const r2 = (v) => Math.round(v * 100) / 100;
/** The point `r` from `c` in direction `deg`. */
export const toward = (deg, r, c = [0, 0]) => [r2(c[0] + r * Math.cos(deg * RAD)), r2(c[1] + r * Math.sin(deg * RAD))];

export const FRAME = { kind: 'plane', xRange: [-5, 5], yRange: [-4.2, 4.2], grid: 0, axes: false };

export const ray = (deg, c = [0, 0], len = 3.8) => ({ kind: 'segment', from: c, to: toward(deg, len, c), tone: LINE });
export function arc(from, to, r, c = [0, 0], tone = GIVEN) {
  const pts = [];
  const steps = Math.max(3, Math.ceil((to - from) / 8));
  for (let i = 0; i <= steps; i++) pts.push(toward(from + ((to - from) * i) / steps, r, c));
  return { kind: 'path', points: pts, tone };
}
/** The little square that says a corner is 90°. */
export const square = (deg, c = [0, 0], s = 0.45) => ({ kind: 'path', tone: LINE,
  points: [toward(deg, s, c), toward(deg + 45, s * Math.SQRT2, c), toward(deg + 90, s, c)] });
/** How far out a label sits: further for a narrow angle, so it fits between the arms. */
export const reach = (size, base = 1.25) => Math.min(2.6, Math.max(base, 0.62 / Math.sin((size / 2) * RAD)));
export const text = (at, label, tone = GIVEN) => ({ kind: 'text', at, label, tone });

/**
 * The marks for one angle between two directions: an arc, and either its
 * size or its letter. The asked angle's size arrives with the answer, a
 * little further out along the same line.
 */
export function angleMarks(from, to, {
  label, asked = false, answer = null, c = [0, 0], right = false, maxOut = Infinity, radius = 0.7, outside = false,
}) {
  const size = to - from, mid = (from + to) / 2, out = Math.min(maxOut, reach(size, label.length > 5 ? 2 : 1.25));
  const marks = [right ? square(from, c) : arc(from, to, radius, c, asked ? ASKED : GIVEN)];
  marks.push(text(toward(mid, out, c), label, asked ? ASKED : GIVEN));
  // Inside a triangle the space further along the bisector belongs to the
  // other corners, so there the size is written just outside the corner.
  const at = outside ? toward(mid + 180, 0.8, c) : toward(mid, out + 0.85, c);
  const reveal = answer === null ? [] : [text(at, answer, 'var(--result)')];
  return { marks, reveal };
}
export function figure(parts) {
  return fit({ ...FRAME, marks: parts.flatMap((p) => p.marks ?? [p]), answer: parts.flatMap((p) => p.reveal ?? []) }, 1.55);
}

/**
 * Scale a figure up by k and frame it tightly. The plane draws at most 26px
 * to a unit, so a figure drawn small in a big frame comes out small, and one
 * filling a single quadrant wastes the other three.
 */
export function fit(spec, k) {
  const scale = (m) => ({
    ...m,
    ...(m.from ? { from: m.from.map((v) => r2(v * k)) } : {}),
    ...(m.to ? { to: m.to.map((v) => r2(v * k)) } : {}),
    ...(m.at ? { at: m.at.map((v) => r2(v * k)) } : {}),
    ...(m.points ? { points: m.points.map((pt) => pt.map((v) => r2(v * k))) } : {}),
  });
  const marks = spec.marks.map(scale), answer = spec.answer.map(scale);
  const pts = [...marks, ...answer].flatMap((m) => [m.from, m.to, m.at, ...(m.points ?? [])].filter(Boolean));
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const pad = 0.9;
  return { ...spec, xRange: [r2(Math.min(...xs) - pad), r2(Math.max(...xs) + pad)],
    yRange: [r2(Math.min(...ys) - pad), r2(Math.max(...ys) + pad)], marks, answer };
}

/** a·x + b as it is written on an angle: 3x + 10, x − 25, 4x. */
export const linear = (a, b) => `${a === 1 ? '' : a}x${b === 0 ? '' : b > 0 ? ` + ${b}` : ` − ${-b}`}`;
export const ascii = (a, b) => linear(a, b).replace('−', '-');

/** (3x + 10)° for a sentence, held in one piece so it never wraps before the degree sign. */
export const sized = (e) => `(${linear(...e).replace(/ /g, '\u00a0')})\u2060°`;

/** a·x + b with x put in: 3(20) + 10. */
export const putIn = (a, b, x) => `${a === 1 ? x : `${a}(${x})`}${b === 0 ? '' : b > 0 ? ` + ${b}` : ` − ${-b}`}`;

/** The sides of a closed shape, corner to corner. */
export const outline = (P, tone = LINE) => P.map((p, i) => ({ kind: 'segment', from: p, to: P[(i + 1) % P.length], tone }));
export const centroid = (P) => [P.reduce((s, p) => s + p[0], 0) / P.length, P.reduce((s, p) => s + p[1], 0) / P.length];
/**
 * A length written beside a side, `gap` out from its middle on the side away
 * from `inside`, so it never sits on the shape it measures.
 */
export function sideLabel(P, Q, label, inside, tone = GIVEN, gap = 0.45) {
  const m = [(P[0] + Q[0]) / 2, (P[1] + Q[1]) / 2];
  const len = Math.hypot(Q[0] - P[0], Q[1] - P[1]) || 1;
  let n = [-(Q[1] - P[1]) / len, (Q[0] - P[0]) / len];
  if ((inside[0] - m[0]) * n[0] + (inside[1] - m[1]) * n[1] > 0) n = [-n[0], -n[1]];
  // A label beside an upright side spreads sideways, so it stands further off.
  const g = gap + Math.abs(n[0]) * 0.11 * Math.max(0, label.length - 2);
  return text([r2(m[0] + n[0] * g), r2(m[1] + n[1] * g)], label, tone);
}
/** A circle, or an arc of one, as the plane draws it: a path. */
export function circlePath(c, r, tone = LINE, from = 0, to = 360) {
  const pts = [];
  const steps = Math.max(8, Math.ceil((to - from) / 8));
  for (let i = 0; i <= steps; i++) pts.push(toward(from + ((to - from) * i) / steps, r, c));
  return { kind: 'path', points: pts, tone };
}

// ── Lengths, areas and volumes ─────────────────────────────────────────

export const UNITS = ['cm', 'm', 'in', 'ft'];
/** A number as it is written: no float noise, nothing after a point that is not needed. */
export const f = (x) => String(Math.round(x * 1e6) / 1e6);
/** An exact decimal answer, as the decimal type holds it. */
export function dec(x) {
  const [w, frac = ''] = f(x).split('.');
  return { type: 'decimal', value: { n: Number(w + frac), d: 10 ** frac.length } };
}
/** A length: whole, or now and then a half. */
export const len = (rng, lo, hi, half = 0.25) => rng.int(lo, hi) + (rng.chance(half) ? 0.5 : 0);
export const dashed = (from, to) => ({ kind: 'segment', from, to, tone: LINE, dashed: true });
/** The little square at a right angle at `c`, between the directions to A and B. */
export function rightMark(c, A, B, s = 0.38) {
  const u = (P) => { const l = Math.hypot(P[0] - c[0], P[1] - c[1]); return [(P[0] - c[0]) / l, (P[1] - c[1]) / l]; };
  const [a, b] = [u(A), u(B)];
  return { kind: 'path', tone: LINE, points: [
    [r2(c[0] + s * a[0]), r2(c[1] + s * a[1])],
    [r2(c[0] + s * (a[0] + b[0])), r2(c[1] + s * (a[1] + b[1]))],
    [r2(c[0] + s * b[0]), r2(c[1] + s * b[1])]] };
}
export const region = (points, tone) => ({ kind: 'region', points, ...(tone ? { tone } : {}) });

/** Pythagorean triples, for slanted sides that come out whole. */
export const TRIPLES = [[3, 4, 5], [5, 12, 13], [6, 8, 10], [8, 15, 17], [9, 12, 15], [7, 24, 25], [12, 16, 20], [15, 20, 25], [10, 24, 26], [20, 21, 29]];
/** A slant: [across, up, along] -- how far it runs, how high it climbs, how long it is. */
export function slant(rng, maxUp = 20) {
  for (;;) {
    const [p, q, s] = rng.pick(TRIPLES), m = rng.pick([0.5, 1, 1, 1.5, 2]);
    const [across, up] = rng.chance(0.5) ? [p, q] : [q, p];
    if (up * m <= maxUp && up * m >= 2) return [across * m, up * m, s * m];
  }
}
export const answerText = (at, label) => text(at, label, null);
export const xs = (P) => P.map((p) => p[0]), ys = (P) => P.map((p) => p[1]);
/** Just under a figure, and just over it: where an area is written, clear of every side's label. */
export const under = (P) => [r2((Math.min(...xs(P)) + Math.max(...xs(P))) / 2), r2(Math.min(...ys(P)) - 1.3)];
export const over = (P) => [r2((Math.min(...xs(P)) + Math.max(...xs(P))) / 2), r2(Math.max(...ys(P)) + 0.9)];

/**
 * An ellipse, or part of one, as a path: a circle seen at a slant, which is
 * how the round end of a cylinder or a cone's base is drawn.
 */
export function ellipsePath(c, rx, ry, from = 0, to = 360, { tone = LINE, dashed = false } = {}) {
  const pts = [];
  const steps = Math.max(8, Math.ceil((to - from) / 8));
  for (let i = 0; i <= steps; i++) {
    const t = (from + ((to - from) * i) / steps) * RAD;
    pts.push([r2(c[0] + rx * Math.cos(t)), r2(c[1] + ry * Math.sin(t))]);
  }
  return { kind: 'path', points: pts, tone, ...(dashed ? { dashed: true } : {}) };
}

// ── Rounding, units and labels (added for the 3.14 answers and crowded solids) ──

// requiem: catalogue/content/pi-as-3-14-rounds-to-a-place
/**
 * n/d rounded half up to `places`, in whole-number arithmetic, as the decimal
 * type holds a rounded answer: with `places`, so its zeros are kept and a
 * right number typed to another place is told how it is written.
 */
export function roundTo(n, d, places) {
  const N = BigInt(n) * 10n ** BigInt(places), D = BigInt(d);
  let q = N / D;
  if ((N % D) * 2n >= D) q += 1n;
  return { type: 'decimal', value: { n: Number(q), d: 10 ** places, places } };
}
/** A terminating decimal, rounded half up to `places`: exact, from its written digits. */
export function decTo(x, places) {
  const [w, frac = ''] = f(x).split('.');
  return roundTo(Number(w + frac), 10 ** frac.length, places);
}
/** A rounded answer as it is written: 37.7, 314.0. */
export function shown(a) {
  const { n, d } = a.value, w = Math.floor(n / d), rem = n - w * d;
  return d === 1 ? String(w) : `${w}.${String(rem).padStart(String(d).length - 1, '0')}`;
}
/** How a 3.14 answer is said: the value worked out, then what it is to the place asked. */
export function roundedSaid(x, a, exact = f(x)) {
  const places = a.value.places, to = `to ${places} decimal place${places === 1 ? '' : 's'}`;
  if (exact === shown(a)) return exact;
  const more = exact.endsWith('…') || (exact.split('.')[1] ?? '').length > places;
  return more ? `${exact}, which is ${shown(a)} ${to}` : `${exact}, written ${shown(a)} ${to}`;
}

/** k lots of π as it is written: π, not 1π. */
export const piTimes = (k) => (k === 1 ? 'π' : `${f(k)}π`);

/** A unit as a question asks for it: "in inches", never "in in". */
export const unitWord = (u, power = 1) => (u === 'in'
  ? ['inches', 'square inches', 'cubic inches'][power - 1]
  : `${u}${['', '²', '³'][power - 1]}`);

/** The marks a label must keep clear of, as straight pieces. */
function piecesOf(marks) {
  return marks.flatMap((m) => {
    if (m.kind === 'segment') return [[m.from, m.to]];
    if (m.kind === 'path') return m.points.slice(1).map((p, i) => [m.points[i], p]);
    if (m.kind === 'point') return [[m.at, m.at]];
    if (m.kind === 'text') {
      const w = 0.15 * String(m.label).length;
      return [[[m.at[0] - w, m.at[1] - 0.25], [m.at[0] + w, m.at[1] - 0.25]],
        [[m.at[0] - w, m.at[1] + 0.25], [m.at[0] + w, m.at[1] + 0.25]]];
    }
    return [];
  });
}
/** How far a label's box, centered at c with half extents w and h, is from the nearest piece. */
function clearance(c, w, h, pieces) {
  // Below zero, how much line runs through the box: less is better when
  // nowhere is clear.
  let best = Infinity, through = 0;
  for (const [A, B] of pieces) {
    const steps = Math.max(1, Math.ceil(Math.hypot(B[0] - A[0], B[1] - A[1]) / 0.08));
    const each = Math.hypot(B[0] - A[0], B[1] - A[1]) / steps;
    for (let i = 0; i <= steps; i++) {
      const x = A[0] + ((B[0] - A[0]) * i) / steps, y = A[1] + ((B[1] - A[1]) * i) / steps;
      const gap = Math.hypot(Math.max(0, Math.abs(x - c[0]) - w), Math.max(0, Math.abs(y - c[1]) - h));
      if (gap === 0) through += each;
      best = Math.min(best, gap);
    }
  }
  return through > 0 ? -through : best;
}
/** Whether segments P–Q and R–S cross. */
function crosses(P, Q, R, S) {
  const side = (A, B, C) => Math.sign((B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]));
  return side(P, Q, R) * side(P, Q, S) < 0 && side(R, S, P) * side(R, S, Q) < 0;
}
/**
 * A length written beside the segment A–B it measures, at the first spot --
 * nearest the middle and nearest the line, then further along and further
 * out -- where its box is clear of every line and label in `others`. A
 * label lying across a second line reads as that line's length: a height
 * labelled on a slant edge is taken for the slant.
 */
export function clearLabel(A, B, label, others, tone = GIVEN, { gaps = [0.15, 0.3, 0.45, 0.6] } = {}) {
  // The line measured is not in the way of its own label; every other one is.
  const same = (P, Q) => P && Q && P[0] === Q[0] && P[1] === Q[1];
  const own = (m) => m.kind === 'segment' && ((same(m.from, A) && same(m.to, B)) || (same(m.from, B) && same(m.to, A)));
  const pieces = piecesOf(others.filter((m) => !own(m)));
  const w = 0.15 * String(label).length, h = 0.27;
  const d = [B[0] - A[0], B[1] - A[1]], L = Math.hypot(d[0], d[1]) || 1, n = [-d[1] / L, d[0] / L];
  let best = null;
  for (const g of gaps) {
    for (const t of [0.5, 0.4, 0.6, 0.3, 0.7, 0.25, 0.75, 0.8, 0.85]) {
      for (const s of [1, -1]) {
        const off = g + Math.abs(n[0]) * w + Math.abs(n[1]) * h;
        const c = [A[0] + d[0] * t + s * n[0] * off, A[1] + d[1] * t + s * n[1] * off];
        // Clear of the rest, and nearer its own line than any other: the
        // nearest line is the one a label is read as belonging to.
        const clear = clearance(c, w, h, pieces);
        const nearer = clear >= 0 && clear < g ? 1 : 0;
        // Never across another line from its own: outside a slant edge, a
        // height's length is read as the edge's.
        const foot = [A[0] + d[0] * t, A[1] + d[1] * t];
        const across = pieces.some(([P, Q]) => crosses(c, foot, P, Q)) ? 2 : 0;
        const score = Math.min(clear, 0.6) - nearer - across - g * 0.05 - Math.abs(t - 0.5) * 0.04;
        if (!best || score > best.score) best = { c, score };
      }
    }
  }
  return text([r2(best.c[0]), r2(best.c[1])], label, tone);
}
