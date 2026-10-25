/**
 * Catalogue authoring helper: a curve given by a parameter, (x(t), y(t)),
 * cut into the polylines that lie inside a window.
 *
 * Authoring-time only, like the generators beside it, so the build's
 * fingerprint covers it. Conics, parametric curves and polar graphs are not
 * all functions of x -- an ellipse closes, a hyperbola has two branches, a
 * rose crosses itself -- so they are walked by a parameter instead of by x.
 */

// requiem: catalogue/visuals/curves-split-at-window
/**
 * The pieces of t -> [x, y] for t from t0 to t1 that lie inside the window
 * {x0, x1, y0, y1}. Where the curve leaves, the piece stops exactly on the
 * edge (found by bisection on t) and a new one starts where it comes back,
 * so no straight line is drawn across the part that is off the grid.
 * Coordinates are kept to 3 places.
 */
export function clipped(f, t0, t1, win, steps = 480) {
  const inside = ([x, y]) => Number.isFinite(x) && Number.isFinite(y)
    && x >= win.x0 && x <= win.x1 && y >= win.y0 && y <= win.y1;
  const edge = (tIn, tOut) => {
    for (let i = 0; i < 44; i++) {
      const mid = (tIn + tOut) / 2;
      if (inside(f(mid))) tIn = mid; else tOut = mid;
    }
    return tIn;
  };
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const point = (t) => {
    const [x, y] = f(t);
    return [+clamp(x, win.x0, win.x1).toFixed(3), +clamp(y, win.y0, win.y1).toFixed(3)];
  };
  const out = [];
  let run = [], prev = null;
  for (let i = 0; i <= steps; i++) {
    const t = t0 + ((t1 - t0) * i) / steps;
    const now = inside(f(t));
    if (now && prev !== null && !inside(f(prev))) run.push(point(edge(t, prev)));
    if (now) run.push(point(t));
    if (!now && prev !== null && inside(f(prev))) { run.push(point(edge(prev, t))); out.push(run); run = []; }
    prev = t;
  }
  out.push(run);
  return out.filter((r) => r.length > 1);
}

/** The arrowhead at `tip` of a line coming from `from`: two short wings. */
export function arrowhead(tip, from, tone, size = 0.55) {
  const [x, y] = tip;
  const L = Math.hypot(x - from[0], y - from[1]);
  const ux = (x - from[0]) / L, uy = (y - from[1]) / L;
  const wing = (s) => {
    const c = Math.cos(s), n = Math.sin(s);
    return [+(x - size * (ux * c - uy * n)).toFixed(3), +(y - size * (uy * c + ux * n)).toFixed(3)];
  };
  return { kind: 'path', points: [wing(0.45), [x, y], wing(-0.45)], tone };
}
