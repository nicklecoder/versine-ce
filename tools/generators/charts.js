/**
 * Catalogue authoring helper: data charts drawn on the plane.
 *
 * The plane draws square units with its axes through the origin, which suits
 * a coordinate grid and not a scatter plot of test scores from 40 to 100. A
 * chart is a plane with no axes of its own: the data is scaled into a frame
 * of fixed size here, and its axes, ticks and titles are drawn as marks, so
 * each axis can start where its data does and count in its own steps.
 */
import { r2, text } from './figures.js';

export const AXIS = 'var(--muted)';
export const DOT = 'var(--vec-2)';

/** A number as a tick label: 2.5, 40, −3. */
const tickText = (v) => (Math.round(v * 1e6) / 1e6).toLocaleString('en-US', { maximumFractionDigits: 6 }).replace('-', '−');

/**
 * A frame for x from x0 to x1 in steps of xs, and y from y0 to y1 in steps
 * of ys, drawn W by H plane units. Returns the spec, with its axes in
 * `marks`, and `at`, which turns a data point into plane coordinates.
 */
export function chart({ x: [x0, x1, xs], y: [y0, y1, ys], titles = {}, W = 11, H = 7, yTicks = true }) {
  const LEFT = 1.7, BOTTOM = 1.2;
  const X = (v) => r2(LEFT + ((v - x0) / (x1 - x0)) * W);
  const Y = (v) => r2(BOTTOM + ((v - y0) / (y1 - y0)) * H);
  const at = ([a, b]) => [X(a), Y(b)];
  const marks = [
    { kind: 'segment', from: [X(x0), Y(y0)], to: [X(x1), Y(y0)], tone: AXIS },
  ];
  if (yTicks) marks.push({ kind: 'segment', from: [X(x0), Y(y0)], to: [X(x0), Y(y1)], tone: AXIS });
  for (let i = 0; x0 + i * xs <= x1 + 1e-9; i++) {
    const v = x0 + i * xs;
    marks.push({ kind: 'segment', from: [X(v), Y(y0)], to: [X(v), r2(Y(y0) - 0.18)], tone: AXIS });
    marks.push(text([X(v), r2(Y(y0) - 0.55)], tickText(v), AXIS));
  }
  if (yTicks) {
    for (let i = 0; y0 + i * ys <= y1 + 1e-9; i++) {
      const v = y0 + i * ys;
      marks.push({ kind: 'segment', from: [X(x0), Y(v)], to: [r2(X(x0) - 0.18), Y(v)], tone: AXIS });
      marks.push(text([r2(X(x0) - 0.75), Y(v)], tickText(v), AXIS));
    }
  }
  if (titles.x) marks.push(text([r2(LEFT + W / 2), r2(Y(y0) - 1.1)], titles.x, AXIS));
  if (titles.y) marks.push(text([r2(LEFT + Math.min(W / 2, 0.4 + titles.y.length * 0.17)), r2(Y(y1) + 0.6)], titles.y, AXIS));
  const spec = {
    kind: 'plane', xRange: [0, r2(LEFT + W + 0.6)], yRange: [0, r2(BOTTOM + H + 1)], grid: 0, axes: false, marks, answer: [],
  };
  return { spec, at, X, Y };
}

/** A tidy axis for values from lo to hi: [start, end, step] with about `n` steps. */
export function niceAxis(lo, hi, n = 6, floorZero = false) {
  const raw = (hi - lo) / n;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((s) => s >= raw);
  const start = floorZero ? 0 : Math.floor(lo / step) * step;
  return [r2(start), r2(Math.ceil(hi / step) * step), step];
}
