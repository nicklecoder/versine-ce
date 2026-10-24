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
