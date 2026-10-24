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
