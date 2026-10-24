/**
 * Catalogue authoring helper for the trigonometry skills: degree-based trig,
 * calculator answers rounded safely, exact answers with a root, and the
 * triangles they are drawn on.
 *
 * Authoring-time only, like the generators beside it, so the build's
 * fingerprint covers it.
 *
 * A calculator answer is rounded only at the end, and a problem is kept
 * only if a student's sensible working gives the same answer: every trig
 * value rounded to 4 places on the way, as a calculator screen is copied
 * down, must round to the same place as the exact value, and the exact
 * value must be clear of the halfway point at that place. A student who
 * carries 4 places is never marked wrong, and one who carries every digit
 * gets the key.
 */
import { RAD, r2, toward, text, outline, sideLabel, cornerText, rightMark, arc, cornerAt, fit, centroid, under, LINE, GIVEN, ASKED } from './figures.js';

export const sinD = (d) => Math.sin(d * RAD);
export const cosD = (d) => Math.cos(d * RAD);
export const tanD = (d) => Math.tan(d * RAD);
export const asinD = (x) => Math.asin(x) / RAD;
export const acosD = (x) => Math.acos(x) / RAD;
export const atanD = (x) => Math.atan(x) / RAD;
/** A trig value as a calculator screen is copied down: 4 places. */
export const four = (x) => Math.round(x * 1e4) / 1e4;
/** A number as written in working: 4 places, no trailing zeros. */
export const at4 = (x) => String(four(x)).replace('-', '−');

// requiem: catalogue/content/trig-rounding-agrees
/**
 * x rounded half up to `places`, or null when the problem should be
 * redrawn: when x is within 0.05 of a unit at that place of the halfway
 * point, or when `alt` -- the same answer worked with 4-place trig values
 * -- rounds differently.
 */
export function safeRound(x, places, alt = x) {
  const s = 10 ** places;
  const frac = x * s - Math.floor(x * s);
  if (Math.abs(frac - 0.5) < 0.05) return null;
  const q = Math.round(x * s);
  if (Math.round(alt * s) !== q) return null;
  return q;
}
/** The rounded answer as the decimal type holds it. */
export const roundedAnswer = (q, places) => ({ type: 'decimal', value: { n: q, d: 10 ** places, places } });
/** A rounded answer as it is written: 6.9, 41. */
export const roundedText = (q, places) => (places === 0 ? String(q) : (q / 10 ** places).toFixed(places));
/** The phrase for the place: "to 1 decimal place", "to the nearest degree". */
export const placeWords = (places, deg = false) => (places === 0 ? (deg ? 'to the nearest degree' : 'to the nearest whole number')
  : `to ${places} decimal place${places === 1 ? '' : 's'}`);
/** The ending the checker reads: " to 1 dp", " to the nearest whole". */
export const placeText = (places) => (places === 0 ? ' to the nearest whole' : ` to ${places} dp`);
/** A calculator value as said in an explanation: ≈ 6.8829, or = 7 when it is exact. */
export const approx = (x) => (Math.abs(x - Math.round(x)) < 1e-9 ? `= ${Math.round(x)}` : `≈ ${at4(x)}`);

// ── Exact values: a + b√r ───────────────────────────────────────────────

const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const Q = (n, d = 1) => { const g = gcd(n, d) || 1; const s = d < 0 ? -1 : 1; return { n: (s * n) / g, d: (s * d) / g }; };
/** (n/d)√r as a roots answer, simplified: n, d whole, r squarefree. */
export function rootAnswer(letter, n, d, r) {
  const value = r === 1 ? { a: Q(n, d), b: Q(0), r: 1 } : { a: Q(0), b: Q(n, d), r };
  return { type: 'roots', value: { letter, roots: [value] } };
}
/** (n/d)√r as written: 5√2, 7√2/2, √3/2, 4. */
export function rootText(n, d, r) {
  const q = Q(n, d);
  const top = r === 1 ? String(q.n) : `${q.n === 1 ? '' : q.n}√${r}`;
  return q.d === 1 ? top : `${top}/${q.d}`;
}

// ── Right triangles ─────────────────────────────────────────────────────

/**
 * A right triangle with angle θ (degrees) at one end of its base and the
 * right angle at the other, drawn to scale: [θ corner, right corner, top].
 * `flip` puts θ on the right.
 */
export function rightCorners(theta, flip = false, longest = 4.4) {
  const w = Math.cos(theta * RAD), h = Math.sin(theta * RAD);
  const k = longest / 1;
  const P = [[0, 0], [w * k, 0], [w * k, h * k]];
  return flip ? P.map(([x, y]) => [r2(w * k - x), r2(y)]) : P.map(([x, y]) => [r2(x), r2(y)]);
}

/**
 * The marks for a right triangle: sides, the right-angle square, an arc and
 * label at θ, side labels by role, and what is revealed. `sides` maps
 * 'opposite' | 'adjacent' | 'hypotenuse' to a label (or null); `asked` is the
 * role whose label is '?' while asking, and `reveal` its answer text.
 */
export function rightFigure(P, { angle = null, sides = {}, asked = null, reveal = null, names = null, highlight = null, note = null }) {
  const [A, R, T] = P;
  const mid = centroid(P);
  const seg = { adjacent: [A, R], opposite: [R, T], hypotenuse: [A, T] };
  const marks = [...outline(P), rightMark(R, A, T)];
  if (angle !== null) {
    const [from, to] = cornerAt(A, R, T);
    marks.push(arc(from, to, 0.6, A, asked === 'angle' ? ASKED : GIVEN));
    if (angle) marks.push(cornerText(A, R, T, angle, asked === 'angle' ? ASKED : GIVEN, 0.15));
  }
  for (const [role, label] of Object.entries(sides)) {
    if (label !== null && label !== undefined) marks.push(sideLabel(...seg[role], label, mid, role === asked ? ASKED : GIVEN));
  }
  if (names) marks.push(...P.map((p, i) => text(toward(Math.atan2(p[1] - mid[1], p[0] - mid[0]) / RAD, 0.42, p), names[i], LINE)));
  const answer = [];
  if (reveal !== null && asked && seg[asked]) answer.push(sideLabel(...seg[asked], reveal, mid, 'var(--result)', 0.95));
  if (reveal !== null && asked === 'angle') answer.push(text(toward(dirOut(A, R, T), 1.6, A), reveal, 'var(--result)'));
  if (note) answer.push(text(under(P), note, 'var(--result)'));
  if (highlight) answer.push({ kind: 'segment', from: seg[highlight][0], to: seg[highlight][1], tone: 'var(--result)' });
  return fit({ kind: 'plane', xRange: [0, 1], yRange: [0, 1], grid: 0, axes: false, marks, answer }, 1.7);
}
const dirOut = (A, R, T) => { const [f, t] = cornerAt(A, R, T); return (f + t) / 2; };
