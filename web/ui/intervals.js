/**
 * Sets on a number line: shaded runs, a dot at each end -- filled when the
 * end is in, hollow when it is not -- and an arrow where a run goes on for
 * ever. The picture of every inequality's answer.
 *
 * Named for what it draws. The integer number line is a different picture
 * (hops that chain from zero) and keeps its own renderer; this one is the
 * one compound inequalities, absolute value and, later, domains share.
 *
 * Each row is a line of its own, so "x > −2" and "x < 5" can sit above the
 * set they make together. Rows in `answer` are withheld until an answer is
 * committed, but `answerRows` says how many there will be, so the picture
 * is laid out at its final height from the start and nothing jumps on reveal.
 *
 * Ends are plain numbers the catalogue already holds; the renderer never
 * works out a set, only draws one.
 *
 * @typedef {object} Run
 * @property {number|null} lo   null for a run with no left end
 * @property {boolean} loIn
 * @property {number|null} hi   null for no right end
 * @property {boolean} hiIn
 *
 * @typedef {object} Row
 * @property {Run[]} parts
 * @property {string} [label]   written above the row, at its left
 *
 * @typedef {object} IntervalSpec
 * @property {number} min
 * @property {number} max
 * @property {Row[]} rows        drawn while the question is open
 * @property {Row[]} [answer]    withheld until an answer is committed
 * @property {number} [answerRows]
 */

const NS = 'http://www.w3.org/2000/svg';
const make = (tag, attrs) => {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
};

const PAD = 20;
const ROW = 62;
const GIVEN = 'var(--vec-1)';
const ANSWER = 'var(--result)';

export function drawIntervals(svg, spec, { verdict = null } = {}) {
  const { min, max, rows = [], answer = [], answerRows = answer.length } = spec;
  const box = svg.parentNode?.getBoundingClientRect?.() ?? { width: 320 };
  const width = Math.max(240, Math.round(box.width));
  const height = (rows.length + answerRows) * ROW + 8;
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('width', String(width));
  svg.setAttribute('height', String(height));
  svg.replaceChildren();

  const px = (x) => PAD + ((x - min) / (max - min)) * (width - PAD * 2);
  const every = (max - min) / ((width - PAD * 2) / 34) > 1 ? 2 : 1;

  const drawRow = (row, i, tone, isAnswer) => {
    const y = i * ROW + 34;
    const g = make('g', { class: `iv__row${isAnswer ? ' is-answer' : ''}` });
    g.append(make('line', { class: 'iv__axis', x1: PAD - 8, y1: y, x2: width - PAD + 8, y2: y }));
    for (let x = Math.ceil(min); x <= max; x++) {
      g.append(make('line', { class: 'iv__tick', x1: px(x), y1: y - 4, x2: px(x), y2: y + 4 }));
      if ((x - Math.ceil(min)) % every === 0 || x === 0) {
        const t = make('text', { class: 'iv__num', x: px(x), y: y + 18, 'text-anchor': 'middle' });
        t.textContent = x < 0 ? `−${-x}` : String(x);
        g.append(t);
      }
    }
    for (const run of row.parts) {
      const a = run.lo === null ? PAD - 8 : px(run.lo);
      const b = run.hi === null ? width - PAD + 8 : px(run.hi);
      g.append(make('line', { class: 'iv__run', x1: a, y1: y, x2: b, y2: y, stroke: tone }));
      if (run.lo === null) g.append(make('path', { class: 'iv__arrow', d: `M${a} ${y} l9 -6 v12 z`, fill: tone }));
      if (run.hi === null) g.append(make('path', { class: 'iv__arrow', d: `M${b} ${y} l-9 -6 v12 z`, fill: tone }));
      for (const [at, inside] of [[run.lo, run.loIn], [run.hi, run.hiIn]]) {
        if (at === null) continue;
        g.append(make('circle', {
          class: `iv__dot${inside ? '' : ' is-open'}`, cx: px(at), cy: y, r: 6,
          stroke: tone, fill: inside ? tone : 'var(--bg-2)',
        }));
        if (run.lo === run.hi) break;
      }
    }
    if (row.label) {
      const t = make('text', { class: 'iv__label', x: PAD - 8, y: y - 14, fill: tone });
      t.textContent = row.label;
      g.append(t);
    }
    if (isAnswer && verdict) {
      const v = make('text', { class: `iv__verdict is-${verdict}`, x: width - PAD + 8, y: y - 14, 'text-anchor': 'end' });
      v.textContent = verdict === 'ok' ? '✓' : '✗';
      g.append(v);
    }
    svg.append(g);
  };

  rows.forEach((row, i) => drawRow(row, i, row.tone ?? GIVEN, false));
  answer.forEach((row, i) => drawRow(row, rows.length + i, ANSWER, true));
}
