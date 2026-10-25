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

// ── Pairs of triangles ─────────────────────────────────────────────────

/** The direction from one point to another, in degrees. */
export const dirTo = (from, to) => (Math.atan2(to[1] - from[1], to[0] - from[0]) * 180) / Math.PI;
const dist = (P, Q) => Math.hypot(Q[0] - P[0], Q[1] - P[1]);

/** A triangle with angles A at the left of its base, B at the right, C on top, the base `base` long. */
export function fromAngles(A, B, base = 4.2) {
  const C = 180 - A - B;
  const b = (base * Math.sin(B * RAD)) / Math.sin(C * RAD);
  return [[0, 0], [base, 0], [b * Math.cos(A * RAD), b * Math.sin(A * RAD)]];
}
/** A triangle ABC from its sides AB = c, BC = a, CA = b, scaled so its longest side is `longest` long. */
export function fromSides(c, a, b, longest = 4.6) {
  const k = longest / Math.max(a, b, c);
  const cosA = (b * b + c * c - a * a) / (2 * b * c);
  return [[0, 0], [c * k, 0], [b * k * cosA, b * k * Math.sqrt(1 - cosA * cosA)]];
}
/**
 * The same triangle moved: flipped over an upright line if `flip`, turned by
 * `turn` degrees, then slid so its leftmost corner is `gap` right of `after`'s
 * rightmost and their middles level. A congruent copy, placed beside the first.
 */
export function beside(P, after, { turn = 0, flip = false, gap = 1.8, scale = 1 } = {}) {
  const c = centroid(P);
  const moved = P.map(([x, y]) => {
    const dx = scale * (flip ? -1 : 1) * (x - c[0]), dy = scale * (y - c[1]);
    const t = turn * RAD;
    return [dx * Math.cos(t) - dy * Math.sin(t), dx * Math.sin(t) + dy * Math.cos(t)];
  });
  const right = Math.max(...xs(after)), left = Math.min(...xs(moved));
  const mid = (Math.min(...ys(after)) + Math.max(...ys(after))) / 2, own = (Math.min(...ys(moved)) + Math.max(...ys(moved))) / 2;
  return moved.map(([x, y]) => [r2(x - left + right + gap), r2(y - own + mid)]);
}
/** A triangle's corners lettered just outside it. */
export const cornerNames = (P, names, tone = LINE) => P.map((p, i) => text(toward(dirTo(centroid(P), p), 0.42, p), names[i], tone));
/** `n` ticks across the middle of a side: sides with the same number of ticks are equal. */
export function ticks(P, Q, n, tone = LINE) {
  const d = dirTo(P, Q), m = [(P[0] + Q[0]) / 2, (P[1] + Q[1]) / 2];
  return Array.from({ length: n }, (_, k) => {
    const at = toward(d, (k - (n - 1) / 2) * 0.16, m);
    return { kind: 'segment', from: toward(d + 90, 0.2, at), to: toward(d - 90, 0.2, at), tone };
  });
}
/** The angle at V between the directions to U and W, as [from, to] degrees anticlockwise. */
export function cornerAt(V, U, W) {
  let a = dirTo(V, U), b = dirTo(V, W);
  let span = (((b - a) % 360) + 360) % 360;
  if (span > 180) { [a, b] = [b, a]; span = 360 - span; }
  return [a, a + span];
}
/** `n` arcs at corner V of a triangle VUW: angles with the same number of arcs are equal. */
export function arcs(V, U, W, n, tone = GIVEN) {
  const [from, to] = cornerAt(V, U, W), short = Math.min(dist(V, U), dist(V, W));
  const r0 = Math.min(0.5, 0.2 * short);
  return Array.from({ length: n }, (_, k) => arc(from, to, r2(r0 + k * 0.1), V, tone));
}
/** A label inside the corner at V, along the line halving it, further in for a narrow angle. */
export function cornerText(V, U, W, label, tone = GIVEN, extra = 0) {
  const [from, to] = cornerAt(V, U, W), short = Math.min(dist(V, U), dist(V, W));
  const out = Math.min(0.45 * short, reach(to - from, 0.95)) + extra;
  return text(toward((from + to) / 2, out, V), label, tone);
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

// ── Angle labels that fit their corner (added for the x-expression angles) ──

/**
 * A label for the corner at V, between the sides to U and W, set along the
 * line halving it just far enough in that its box clears both sides. Where
 * that would run past `room` of the shorter side -- a narrow corner with a
 * long label, "(7x + 34)°" -- it is written just outside the corner instead,
 * beside V and away from `away` (the shape's middle), with a short leader
 * back to the corner. Returns marks: the text, and the leader if there is one.
 *
 * `k` is the factor the figure is later scaled up by (see fit), since the
 * label's size is fixed on the page while the figure's units are not.
 */
export function cornerLabel(V, U, W, label, tone = GIVEN, { k = 1, room = 0.62, away = null, min = 0.6 } = {}) {
  const [from, to] = cornerAt(V, U, W), span = to - from, mid = (from + to) / 2;
  const short = Math.min(dist(V, U), dist(V, W));
  // Half the label's box, in the figure's own units: about 22 px to a unit on the page.
  const w = (0.17 * String(label).length + 0.12) / k, h = 0.36 / k, gap = 0.12 / k;
  const need = Math.max(...[from, to].map((d) => {
    const n = [Math.sin(d * RAD), Math.cos(d * RAD)];
    return (w * Math.abs(n[0]) + h * Math.abs(n[1]) + gap) / Math.sin((span / 2) * RAD);
  }));
  const r = Math.max(min / k, need);
  if (r <= room * short) return [text(toward(mid, r, V), label, tone)];
  // Outside: square to the halving line, on the side away from the shape.
  const c = away ?? [(U[0] + W[0]) / 2, (U[1] + W[1]) / 2];
  const sides = [mid + 90 + span / 4, mid - 90 - span / 4].map((d) => toward(d, w + h + 0.25 / k, V));
  const at = sides.reduce((a, b) => (dist(b, c) > dist(a, c) ? b : a));
  const lead = toward(mid, Math.min(0.5, 0.35 * short), V);
  const toward_ = dirTo(at, lead);
  const start = toward(toward_, Math.min(w, h) + 0.05 / k, at);
  return [text(at, label, tone), { kind: 'segment', from: start, to: lead, tone }];
}

// ── Point names on the grid (added for the coordinate figures) ──────────

/** Four short sides round a point's dot, so a name keeps clear of the dot and not just its center. */
const dotPieces = (p, r) => [[[p[0] - r, p[1] - r], [p[0] + r, p[1] - r]], [[p[0] + r, p[1] - r], [p[0] + r, p[1] + r]],
  [[p[0] + r, p[1] + r], [p[0] - r, p[1] + r]], [[p[0] - r, p[1] + r], [p[0] - r, p[1] - r]]];

/**
 * Where to write each point's name: on the side of the point away from the
 * shape -- out along the line halving the outside of its corner, or straight
 * away from the middle for a point with fewer than two sides -- then turned
 * a little either way until the name is clear of every line, dot and name in
 * `marks`, and of the axes. The plane writes a point's own label up and to
 * the right whatever is there, which puts it on a side running that way or
 * on the next point; these are drawn as text marks instead.
 *
 * `points` is [{ at, name, tone, near: [neighbor, neighbor] }]. `unit` is
 * about how many pixels a grid unit gets on a phone, since the names are a
 * fixed size on the page. Returns a text mark for each point, in order.
 */
export function pointNames(points, marks, { unit = 16, axes = true, middle = null } = {}) {
  const r = 6 / unit, gap = 3 / unit;
  const hard = [...piecesOf(marks.filter((m) => m.kind !== 'point' && m.kind !== 'text')),
    ...marks.filter((m) => m.kind === 'point' || (m.kind === 'text')).flatMap((m) => (m.kind === 'point' ? dotPieces(m.at, r) : piecesOf([m]))),
    ...points.flatMap((p) => dotPieces(p.at, r))];
  // The axes, and the strips beside them where the plane writes their numbers:
  // under the x-axis and left of the y-axis.
  const soft = axes ? [[[-99, 0], [99, 0]], [[-99, -13 / unit], [99, -13 / unit]], [[0, -99], [0, 99]], [[-16 / unit, -99], [-16 / unit, 99]]] : [];
  const c = middle ?? centroid(points.map((p) => p.at));
  const placed = [];
  return points.map((p) => {
    const w = (3.9 * String(p.name).length + 1) / unit, h = 6.5 / unit;
    let out;
    if (p.near && p.near.length === 2) {
      const [a, b] = p.near.map((q) => dirTo(p.at, q));
      // The line halving the corner, turned to face out of the shape.
      let m = Math.atan2(Math.sin(a * RAD) + Math.sin(b * RAD), Math.cos(a * RAD) + Math.cos(b * RAD)) / RAD + 180;
      if (Math.cos((m - dirTo(p.at, c)) * RAD) > 0.2) m += 180;
      out = m;
    } else if (p.near && p.near.length === 1) out = dirTo(p.near[0], p.at);
    else out = dist(p.at, c) < 1e-9 ? 135 : dirTo(c, p.at);
    // Its own dot and the sides that leave it are not in the way of its name.
    const own = hard.filter(([A, B]) => !(dist(A, p.at) < r * 1.5 && dist(B, p.at) < r * 1.5));
    const named = placed.flatMap((q) => piecesOf([q]));
    let best = null;
    for (const turn of [0, 20, -20, 40, -40, 60, -60, 80, -80, 100, -100, 130, -130, 160, -160, 180]) {
      for (const far of [0, 0.3, 0.6]) {
        const d = (out + turn) * RAD;
        // Far enough that the box clears the dot whichever way it faces.
        const off = r + gap + Math.abs(Math.cos(d)) * w + Math.abs(Math.sin(d)) * h + far;
        const at = [p.at[0] + off * Math.cos(d), p.at[1] + off * Math.sin(d)];
        const clearHard = clearance(at, w, h, [...own, ...named]);
        const clearSoft = soft.length ? clearance(at, w, h, soft) : 1;
        const score = (clearHard >= gap ? 10 : clearHard) + (clearSoft >= 0 ? 3 : 0) - Math.abs(turn) / 90 - far * 2;
        if (!best || score > best.score) best = { at, score };
      }
    }
    const mark = text([r2(best.at[0]), r2(best.at[1])], p.name, p.tone ?? LINE);
    placed.push(mark);
    return mark;
  });
}

/** About how many pixels a unit of this plane gets on a phone: the plane fits about 286 px across, and draws at most 26 to a unit. */
export const phoneUnit = (spec) => Math.min(26, 286 / (spec.xRange[1] - spec.xRange[0]));

/**
 * A plane spec with its points' labels taken off and written instead where
 * pointNames puts them, clear of everything drawn before or after the
 * answer. A name stays in the phase its point is in.
 */
export function namePoints(spec, opts = {}) {
  const all = [...spec.marks, ...(spec.answer ?? [])];
  const same = (P, Q) => P && Q && Math.abs(P[0] - Q[0]) < 1e-9 && Math.abs(P[1] - Q[1]) < 1e-9;
  // A point's neighbors: the other end of every solid side that leaves it.
  const edges = all.flatMap((m) => (m.dashed ? [] : m.kind === 'segment' ? [[m.from, m.to]]
    : m.kind === 'path' ? m.points.slice(1).map((q, i) => [m.points[i], q]) : []));
  const nearOf = (at) => {
    const found = edges.flatMap(([A, B]) => (same(A, at) ? [B] : same(B, at) ? [A] : []));
    return found.filter((q, i) => !same(q, at) && found.findIndex((o) => same(o, q)) === i);
  };
  const strip = (list) => list.map((m) => (m.kind === 'point' && 'label' in m ? (({ label, ...rest }) => rest)(m) : m));
  const named = all.filter((m) => m.kind === 'point' && m.label);
  const texts = pointNames(named.map((m) => ({ at: m.at, name: m.label, tone: m.tone, near: nearOf(m.at) })), strip(all),
    { unit: phoneUnit(spec), ...opts });
  const inAsk = new Set(spec.marks.filter((m) => m.kind === 'point' && m.label));
  return {
    ...spec,
    marks: [...strip(spec.marks), ...texts.filter((_, i) => inAsk.has(named[i]))],
    answer: [...strip(spec.answer ?? []), ...texts.filter((_, i) => !inAsk.has(named[i]))],
  };
}
