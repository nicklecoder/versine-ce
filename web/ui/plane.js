/**
 * An x/y plane: axes, a grid, and things drawn on it.
 *
 * Named for what it draws rather than what it teaches, which is the lesson of
 * the four bar renderers that each served exactly one skill because each was
 * named after its lesson. Plotting a point, reading one off, drawing a line
 * through two, showing a region, and later a curve and its tangent are all
 * this one picture with different marks on it.
 *
 * Marks are plain data, so a curve is a polyline the catalogue already holds
 * rather than a function the renderer evaluates. That keeps the renderer
 * incapable of computing anything -- which is the property that stops a
 * picture quietly solving the problem.
 *
 * A region is a filled polygon -- the part of the plane an inequality keeps,
 * already clipped to the grid by the catalogue -- and is drawn under every
 * line and point, so shading never hides what it is the shading of.
 *
 * @typedef {object} Mark
 * @property {'point'|'segment'|'path'|'region'|'text'} kind
 *   A text mark is words alone, centred on `at`: the size of an angle,
 *   written inside it, where a label offset from a point would drift.
 * @property {[number, number]} [at]     for a point
 * @property {[number, number]} [from]   for a segment
 * @property {[number, number]} [to]
 * @property {Array<[number, number]>} [points]  for a path, or a region's corners
 * @property {boolean} [dashed]          for a line not included: y < 2x + 1
 * @property {string} [label]            drawn beside it
 * @property {string} [tone]             CSS colour
 * @property {boolean} [open]            hollow, for a point not included
 *
 * @typedef {object} PlaneSpec
 * @property {[number, number]} xRange
 * @property {[number, number]} yRange
 * @property {number} [grid]             gridline spacing, 0 for none
 * @property {boolean} [axes]            false for a figure with no coordinates:
 *   an angle or a polygon drawn on axes says its corners have positions the
 *   question never gave, and invites reading them off.
 * @property {{x?: string, y?: string}} [titles]  what each axis measures,
 *   "hours" and "km": a story graph read without them is two bare numbers.
 * @property {Mark[]} [marks]            drawn while the question is open
 * @property {Mark[]} [answer]           withheld until an answer is committed
 */

const NS = 'http://www.w3.org/2000/svg';
const make = (tag, attrs) => {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
};

/** Room for the axis numbers, in user units scaled at draw time. */
const PAD = 22;

export function drawPlane(svg, spec, { verdict = null } = {}) {
  const { xRange, yRange, grid = 1, axes: withAxes = true, titles = {}, marks = [], answer = [] } = spec;
  const [x0, x1] = xRange;
  const [y0, y1] = yRange;

  // Square units: a right angle has to look like one, or the picture lies.
  const box = svg.parentNode?.getBoundingClientRect?.() ?? { width: 320 };
  const width = Math.max(200, Math.round(box.width));
  const unit = Math.min((width - PAD * 2) / (x1 - x0), 26);
  const height = Math.round((y1 - y0) * unit + PAD * 2);

  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('width', String(width));
  svg.setAttribute('height', String(height));
  svg.replaceChildren();

  const originX = PAD + -x0 * unit;
  const originY = PAD + y1 * unit;
  const px = (x) => PAD + (x - x0) * unit;
  const py = (y) => PAD + (y1 - y) * unit;

  // ── Grid ──────────────────────────────────────────────────────────────
  if (grid > 0) {
    const g = make('g', { class: 'pl__grid' });
    for (let x = Math.ceil(x0 / grid) * grid; x <= x1; x += grid) {
      g.append(make('line', { x1: px(x), y1: py(y0), x2: px(x), y2: py(y1) }));
    }
    for (let y = Math.ceil(y0 / grid) * grid; y <= y1; y += grid) {
      g.append(make('line', { x1: px(x0), y1: py(y), x2: px(x1), y2: py(y) }));
    }
    svg.append(g);
  }

  // ── Axes and their numbers ────────────────────────────────────────────
  // requiem: play/visuals/figures-on-plane-without-axes
  if (withAxes) {
    const axes = make('g', { class: 'pl__axes' });
    axes.append(make('line', { x1: px(x0), y1: originY, x2: px(x1), y2: originY }));
    axes.append(make('line', { x1: originX, y1: py(y0), x2: originX, y2: py(y1) }));
    svg.append(axes);

    const ticks = make('g', { class: 'pl__ticks' });
    const step = Math.max(grid, Math.ceil((x1 - x0) / 10));
    for (let x = Math.ceil(x0 / step) * step; x <= x1; x += step) {
      if (x === 0) continue;
      const t = make('text', { x: px(x), y: originY + 13, 'text-anchor': 'middle' });
      t.textContent = String(x);
      ticks.append(t);
    }
    for (let y = Math.ceil(y0 / step) * step; y <= y1; y += step) {
      if (y === 0) continue;
      const t = make('text', { x: originX - 7, y: py(y) + 4, 'text-anchor': 'end' });
      t.textContent = String(y);
      ticks.append(t);
    }
    svg.append(ticks);

    // requiem: play/visuals/plane-axis-titles
    // At the far end of each axis, where the eye goes to ask what it counts.
    if (titles.x) {
      const t = make('text', { x: px(x1) - 4, y: originY - 6, 'text-anchor': 'end', class: 'pl__title' });
      t.textContent = titles.x;
      svg.append(t);
    }
    if (titles.y) {
      const t = make('text', { x: originX + 6, y: py(y1) - 8, 'text-anchor': 'start', class: 'pl__title' });
      t.textContent = titles.y;
      svg.append(t);
    }
  }

  // ── Marks ─────────────────────────────────────────────────────────────
  const drawMark = (m, cls) => {
    const g = make('g', { class: `pl__mark ${cls}`.trim() });
    if (m.tone) g.setAttribute('style', `--tone:${m.tone}`);
    const dash = m.dashed ? { class: 'is-dashed' } : {};
    if (m.kind === 'segment') {
      g.append(make('line', { x1: px(m.from[0]), y1: py(m.from[1]),
                              x2: px(m.to[0]), y2: py(m.to[1]), ...dash }));
    } else if (m.kind === 'path' && Array.isArray(m.points)) {
      g.append(make('polyline', {
        points: m.points.map(([x, y]) => `${px(x)},${py(y)}`).join(' '), fill: 'none', ...dash,
      }));
    } else if (m.kind === 'region' && Array.isArray(m.points)) {
      g.append(make('polygon', {
        points: m.points.map(([x, y]) => `${px(x)},${py(y)}`).join(' '), class: 'pl__region',
      }));
    } else if (m.kind === 'text') {
      const t = make('text', { x: px(m.at[0]), y: py(m.at[1]), class: 'pl__label pl__text',
        'text-anchor': 'middle', 'dominant-baseline': 'central' });
      t.textContent = m.label ?? '';
      g.append(t);
      return g;
    } else if (m.kind === 'point') {
      g.append(make('circle', {
        cx: px(m.at[0]), cy: py(m.at[1]), r: 5,
        class: m.open ? 'is-open' : '',
      }));
    }
    if (m.label) {
      // A segment is labelled at its middle: at one end, the labels of two
      // segments that share a corner -- a run and a rise -- land on each other.
      const [lx, ly] = m.kind === 'segment' && m.from && m.to
        ? [(m.from[0] + m.to[0]) / 2, (m.from[1] + m.to[1]) / 2]
        : m.at ?? m.from ?? m.points?.[0] ?? [0, 0];
      const t = make('text', { x: px(lx) + 9, y: py(ly) - 8, class: 'pl__label' });
      t.textContent = m.label;
      g.append(t);
    }
    return g;
  };

  const regions = (list) => list.filter((m) => m.kind === 'region');
  const others = (list) => list.filter((m) => m.kind !== 'region');
  for (const m of regions(marks)) svg.append(drawMark(m, ''));
  for (const m of regions(answer)) svg.append(drawMark(m, 'is-answer'));
  for (const m of others(marks)) svg.append(drawMark(m, ''));
  for (const m of others(answer)) svg.append(drawMark(m, 'is-answer'));

  if (verdict && answer.length) {
    const [ax, ay] = answer[0].at ?? answer[0].to ?? [x1, y1];
    const t = make('text', { x: px(ax) + 9, y: py(ay) + 16, class: `pl__verdict is-${verdict}` });
    t.textContent = verdict === 'ok' ? '✓' : '✗';
    svg.append(t);
  }
}
