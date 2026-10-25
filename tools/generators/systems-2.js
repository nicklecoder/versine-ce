/**
 * Catalogue authoring tool: builds the problem library for systems-2.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 *
 * Every `text` carries the equations in ASCII, or a story's numbers, so
 * scripts/check-answers.py can solve the system again its own way: one
 * equation solved for a letter and put into the other, the polynomial left
 * solved exactly, and a system in three letters by its own elimination, or
 * by its rank where it may not have one solution.
 */
import * as T from '../terms.js';
import { minus } from '../../web/ui/dom.js';
import { previewOf } from '../../web/ui/express.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/systems-2.js';
import { LINE, ASKED } from './figures.js';

const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const Q = (n, d = 1) => {
  if (d < 0) { n = -n; d = -d; }
  const g = gcd(n, d) || 1;
  return { n: n / g, d: d / g };
};
const qs = (p) => `${minus(p.n)}${p.d === 1 ? '' : `/${p.d}`}`;
const qa = (p) => (p.d === 1 ? String(p.n) : `${p.n}/${p.d}`);
const qn = (p) => p.n / p.d;
const addQ = (p, q) => Q(p.n * q.d + q.n * p.d, p.d * q.d);
const mulQ = (p, q) => Q(p.n * q.n, p.d * q.d);

/** The points answer: dim always set, so none says nothing about the size. */
function pointsAnswer(pts, dim = 2) {
  const sorted = pts.map((p) => p.map((c) => (typeof c === 'number' ? Q(c) : c)))
    .sort((p, q) => { for (let i = 0; i < p.length; i++) { const d = qn(p[i]) - qn(q[i]); if (d) return d; } return 0; });
  return { type: 'points', value: { dim, pts: sorted } };
}
const ptText = (p) => `(${p.map((c) => qs(typeof c === 'number' ? Q(c) : c)).join(', ')})`;
/** "(−1, 0) and (4, 5)", "(2, 3)", or that they do not meet: as the box takes it. */
const meetText = (pts) => (!pts.length ? 'none' : pts.length < 3 ? pts.map(ptText).join(' and ')
  : `${pts.slice(0, -1).map(ptText).join(', ')} and ${ptText(pts[pts.length - 1])}`);

/** One equation in one piece in the sentence, drawn as the expression box draws it. */
const eq = (src) => {
  const r = previewOf(src);
  if (!r.ok) throw new Error(`cannot draw ${src}`);
  return T.math(r.terms);
};
/** ASCII with real minus signs, for prose. */
const pretty = (s) => s.replace(/\^2/g, '²').replace(/ - /g, ' − ').replace(/(^|[(= ])-/g, '$1−');

// --- The answer's picture --------------------------------------------------------

const SECOND = 'var(--vec-2)';
/** The window a level's pictures share when no given curve fixes one. */
const WINDOW = { x: [-8, 8], y: [-10, 10] };
/** xy = k meets its line within 9 of the origin either way. */
const XY = { x: [-10, 10], y: [-10, 10] };

/**
 * u ↦ f(u) as the polylines that lie inside the window, each stretch ending
 * exactly on the window's edge, found by bisection; `swap` draws x = f(y).
 */
// requiem: catalogue/visuals/curves-split-at-window
function stretches(f, [u0, u1], [w0, w1], swap = false, step = 0.1) {
  const inside = (w) => Number.isFinite(w) && w >= w0 && w <= w1;
  const edge = (uIn, uOut) => {
    for (let i = 0; i < 40; i++) {
      const mid = (uIn + uOut) / 2;
      if (inside(f(mid))) uIn = mid; else uOut = mid;
    }
    return uIn;
  };
  const point = (u) => { const w = Math.max(w0, Math.min(w1, f(u))); return swap ? [w, u] : [u, w]; };
  const out = [];
  let run = [], prev = null;
  const n = Math.round((u1 - u0) / step);
  for (let i = 0; i <= n; i++) {
    const u = u0 + ((u1 - u0) * i) / n;
    const now = inside(f(u));
    if (now && prev !== null && !inside(f(prev))) run.push(point(edge(u, prev)));
    if (now) run.push(point(u));
    if (!now && prev !== null && inside(f(prev))) { run.push(point(edge(prev, u))); out.push(run); run = []; }
    prev = u;
  }
  out.push(run);
  return out.filter((r) => r.length > 1).map((r) => thin(fill(r, f, swap)));
}
/**
 * More samples where the curve is steep, so no chord is longer than half a
 * unit (xy = k near its asymptote), found on the curve between two samples.
 */
function fill(run, f, swap) {
  const u = (p) => (swap ? p[1] : p[0]);
  const at = (v) => (swap ? [f(v), v] : [v, f(v)]);
  const out = [run[0]];
  const between = (p, q, depth) => {
    if (depth > 8 || Math.hypot(p[0] - q[0], p[1] - q[1]) <= 0.5) return;
    const mid = at((u(p) + u(q)) / 2);
    between(p, mid, depth + 1);
    out.push(mid);
    between(mid, q, depth + 1);
  };
  for (let i = 1; i < run.length; i++) {
    between(run[i - 1], run[i], 0);
    out.push(run[i]);
  }
  return out;
}
/** Fewer points where the curve is nearly straight: a point is dropped while the chord past it stays within 0.02. */
function thin(run) {
  const out = [run[0]];
  let i = 0;
  while (i < run.length - 1) {
    let j = i + 1;
    // Reach as far as every point in between stays near the chord, and no chord is over 1.4.
    while (j + 1 < run.length && Math.hypot(run[j + 1][0] - run[i][0], run[j + 1][1] - run[i][1]) <= 1.4
      && run.slice(i + 1, j + 1).every((p) => offChord(p, run[i], run[j + 1]) <= 0.02)) j++;
    out.push(run[j]);
    i = j;
  }
  return out;
}
const offChord = (p, a, b) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
  return Math.abs((p[0] - a[0]) * dy - (p[1] - a[1]) * dx) / len;
};
/** y = f(x) on the window, as path marks. */
const graphY = (f, win, tone) => stretches(f, win.x, win.y).map((points) => ({ kind: 'path', points, tone }));
/** x = g(y) on the window, as path marks. */
const graphX = (g, win, tone) => stretches(g, win.y, win.x, true).map((points) => ({ kind: 'path', points, tone }));
/** (x − h)² + (y − k)² = R, whole: its window is made to hold it. */
function circleMark(h, k, R, tone) {
  // A side of under a unit, and at least 24 of them.
  const r = Math.sqrt(R), n = Math.max(24, Math.ceil((2 * Math.PI * r) / 0.8)), pts = [];
  for (let i = 0; i <= n; i++) pts.push([h + r * Math.cos((2 * i * Math.PI) / n), k + r * Math.sin((2 * i * Math.PI) / n)]);
  return { kind: 'path', points: pts, tone };
}
/** A window holding the origin and every circle given, (h, k, R), with a unit to spare. */
function circleWindow(...circles) {
  const xs = [0], ys = [0];
  for (const [h, k, R] of circles) {
    const r = Math.sqrt(R);
    xs.push(h - r, h + r); ys.push(k - r, k + r);
  }
  // At least 8 across each way, so a small circle is not drawn in a corner of nothing.
  const span = (lo, hi) => {
    let a = Math.floor(lo) - 1, b = Math.ceil(hi) + 1;
    while (b - a < 8) { a -= 1; if (b - a < 8) b += 1; }
    return [a, b];
  };
  return { x: span(Math.min(...xs), Math.max(...xs)), y: span(Math.min(...ys), Math.max(...ys)) };
}
/** Every coordinate to a tenth: about a pixel at this size. */
const tenth = (v) => Math.round(v * 10) / 10;

/**
 * Both curves and the points where they meet, all of it in the answer layer:
 * drawn while the question is open, the meeting points could be read off the
 * grid, so the window is all a student sees until an answer is in. The window
 * comes from the given curves or the level, never from where they meet.
 */
// requiem: catalogue/visuals/meeting-picture-on-reveal
function meetPicture(win, curves, pts) {
  const at = pts.map((p) => p.map((c) => (typeof c === 'number' ? c : qn(c))));
  // Two points close together would print their labels over each other.
  const apart = at.every((p, i) => at.every((q, j) => i === j || Math.hypot(p[0] - q[0], p[1] - q[1]) >= 3));
  const span = Math.max(win.x[1] - win.x[0], win.y[1] - win.y[0]);
  return {
    kind: 'plane', xRange: win.x, yRange: win.y, grid: span > 24 ? 2 : 1, marks: [],
    answer: [
      ...curves.map((m) => ({ ...m, points: m.points.map((p) => p.map(tenth)) })),
      ...at.map((p, i) => ({ kind: 'point', at: p.map(tenth), tone: ASKED, ...(apart ? { label: ptText(pts[i]) } : {}) })),
    ],
  };
}

// --- Polynomials in x, as [c0, c1, c2] ------------------------------------------

/** ax² + bx + c in ASCII, or in a letter given. */
function poly(cs, v = 'x') {
  const out = [];
  for (let k = cs.length - 1; k >= 0; k--) {
    const c = cs[k];
    if (!c) continue;
    const a = Math.abs(c);
    const body = k === 0 ? String(a) : `${a === 1 ? '' : a}${v}${k === 2 ? '^2' : ''}`;
    out.push(out.length ? `${c < 0 ? '-' : '+'} ${body}` : `${c < 0 ? '-' : ''}${body}`);
  }
  return out.length ? out.join(' ') : '0';
}
/** Ax + By = C, A > 0 (or B > 0 when A = 0), sharing no factor. */
function stdLine(A, B, C) {
  const g = gcd(gcd(A, B), C) || 1;
  let [a, b, c] = [A / g, B / g, C / g];
  if (a < 0 || (a === 0 && b < 0)) [a, b, c] = [-a, -b, -c];
  const xs = a === 0 ? '' : `${a === 1 ? '' : a}x`;
  const ys = b === 0 ? '' : `${xs ? (b < 0 ? ' - ' : ' + ') : b < 0 ? '-' : ''}${Math.abs(b) === 1 ? '' : Math.abs(b)}y`;
  return { src: `${xs}${ys} = ${c}`, a, b, c };
}

/** Roots of ax² + bx + c = 0 as rationals, when the discriminant is a square. */
function roots(a, b, c) {
  const D = b * b - 4 * a * c;
  if (D < 0) return { D, xs: [] };
  const r = Math.round(Math.sqrt(D));
  if (r * r !== D) return null;
  const xs = [Q(-b - r, 2 * a), Q(-b + r, 2 * a)];
  return { D, xs: D === 0 ? [xs[0]] : xs.sort((p, q) => qn(p) - qn(q)) };
}

/** The factored or formula working of a quadratic set to 0, in prose. */
function solved(a, b, c, v = 'x') {
  const r = roots(a, b, c);
  const shown = `${pretty(poly([c, b, a], v))} = 0`;
  if (!r.xs.length) return `${shown}, whose discriminant is ${minus(b * b)} − ${4 * a * c < 0 ? `(${minus(4 * a * c)})` : 4 * a * c} = ${minus(r.D)}, below 0: no real ${v}`;
  if (r.xs.length === 1) return `${shown}, whose discriminant is 0: one ${v}, ${v} = ${qs(r.xs[0])}`;
  return `${shown}, so ${v} = ${qs(r.xs[0])} or ${v} = ${qs(r.xs[1])}`;
}

/** A quadratic set to 0 and its discriminant, which counts its roots without solving. */
function counted(a, b, c, v = 'x') {
  const D = b * b - 4 * a * c;
  return `${pretty(poly([c, b, a], v))} = 0, whose discriminant is ${minus(b * b)} − ${4 * a * c < 0 ? `(${minus(4 * a * c)})` : 4 * a * c} = ${minus(D)}: `
    + `${D > 0 ? 'positive, two real roots' : D === 0 ? 'zero, one root' : 'negative, no real root'}`;
}

/** (x − h)² + (y − k)² = R in ASCII, x² + y² = R at the origin. */
const circleSrc = (h, k, R) => `${h ? `(x ${h < 0 ? '+' : '-'} ${Math.abs(h)})^2` : 'x^2'} + ${k ? `(y ${k < 0 ? '+' : '-'} ${Math.abs(k)})^2` : 'y^2'} = ${R}`;
/** p·v + q, as prose. */
const lin = (p, q, v) => pretty(poly([q, p], v));
/** (p·v + q)², or v² alone. */
const sqText = (p, q, v) => (p === 0 ? sqNum(q) : p === 1 && q === 0 ? `${v}²` : `(${lin(p, q, v)})²`);
/** (p·v + q)² multiplied out, times m, constant first. */
const sqOut = (p, q, m = 1) => [m * q * q, 2 * m * p * q, m * p * p];
/** n², in parentheses when n is negative. */
const sqNum = (n) => (n < 0 ? `(${minus(n)})²` : `${n}²`);

/**
 * The line Ax + By = C put into (x − h)² + (y − k)² = R, every step shown:
 * the line solved for the letter with coefficient ±1 if there is one, that
 * put into the circle as it stands, the fraction cleared, the squares
 * multiplied out, and the quadratic left, which `finish` solves or counts.
 */
// requiem: catalogue/content/substitution-shown-before-simplified
function circleWork(line, h, k, R, finish, given = false) {
  if (line.b === 0) {
    const x0 = line.c / line.a, dx = x0 - h;
    const quad = [k * k + dx * dx - R, -2 * k, 1];
    const lit = `${h ? `(${minus(x0)} ${h < 0 ? '+' : '−'} ${Math.abs(h)})²` : sqNum(x0)} + ${sqText(1, -k, 'y')} = ${R}`;
    const out = `${dx * dx} + ${pretty(poly(sqOut(1, -k), 'y'))} = ${R}`;
    return { v: 'y', quad, work: `Put x = ${minus(x0)} into the circle: ${lit}. Multiplied out, ${out}; brought to one side, ${finish(1, quad[1], quad[0], 'y')}` };
  }
  const useY = Math.abs(line.b) === 1 || Math.abs(line.a) !== 1;
  // y = 6 is already solved for y.
  if (line.a === 0) given = true;
  // u = (pn·v + qn0)/e.
  const [cu, cv, u] = useY ? [line.b, line.a, 'y'] : [line.a, line.b, 'x'];
  const v = useY ? 'x' : 'y';
  const e = Math.abs(cu), sg = Math.sign(cu), pn = -cv * sg, qn0 = line.c * sg;
  const [hu, hv] = useY ? [k, h] : [h, k];
  // u − hu = (pn·v + r0)/e.
  const r0 = qn0 - e * hu;
  const solvedFor = e === 1 ? lin(pn, qn0, v) : `(${lin(pn, qn0, v)})/${e}`;
  const order = (uTerm, vTerm) => (useY ? `${vTerm} + ${uTerm}` : `${uTerm} + ${vTerm}`);
  const vTerm = sqText(1, -hv, v);
  const uLit = hu === 0 ? (e === 1 ? sqText(pn, qn0, v) : `(${solvedFor})²`)
    : `(${solvedFor} ${hu < 0 ? '+' : '−'} ${Math.abs(hu)})²`;
  const steps = [`${given ? `Put ${u} = ${solvedFor}` : `Solve the line for ${u}: ${u} = ${solvedFor}. Put it`} into the circle: ${order(uLit, vTerm)} = ${R}`];
  if (hu !== 0) steps.push(`, which is ${order(e === 1 ? sqText(pn, r0, v) : `((${lin(pn, r0, v)})/${e})²`, vTerm)} = ${R}`);
  steps.push('.');
  if (e > 1) steps.push(` Multiply both sides by ${e * e} to clear the fraction: ${order(sqText(pn, r0, v), `${e * e}${vTerm}`)} = ${e * e * R}.`);
  const A = sqOut(1, -hv, e * e), B = sqOut(pn, r0);
  const expanded = (useY ? [A, B] : [B, A]).filter((t) => t.some((c) => c)).map((t) => pretty(poly(t, v))).join(' + ');
  steps.push(` Multiplied out, ${expanded} = ${e * e * R}; brought to one side, `);
  const raw = [A[0] + B[0] - e * e * R, A[1] + B[1], A[2] + B[2]];
  const g = Math.abs(gcd(gcd(raw[0], raw[1]), raw[2])) || 1;
  const quad = raw.map((c) => c / g);
  if (g > 1) steps.push(`${pretty(poly([raw[0], raw[1], raw[2]], v))} = 0, and divided by ${g}, `);
  steps.push(finish(quad[2], quad[1], quad[0], v));
  return { v, quad, work: steps.join('') };
}

// --- Line Meets Parabola --------------------------------------------------------------

/** A parabola and a line through chosen meeting points: two, one or none. */
function parabolaAndLine(rng, outcome, maxY = 40) {
  for (;;) {
    const a = rng.pick([1, 1, 1, -1, -1, 2]);
    const m = rng.int(-4, 4), k = rng.int(-8, 8);
    let b, c, xs;
    if (outcome === 'none') {
      const h = rng.int(-4, 4), q = rng.int(1, 6);
      // parabola − line = a((x − h)² + q), never 0.
      b = m - 2 * a * h; c = k + a * (h * h + q);
      xs = [];
    } else {
      const half = a === 2 && outcome === 'two' && rng.chance(0.6);
      const r1 = rng.int(-5, 5), r2 = outcome === 'one' ? r1 : half ? Q(rng.pick([-7, -5, -3, -1, 1, 3, 5, 7]), 2) : rng.int(-5, 5);
      const R2 = typeof r2 === 'number' ? Q(r2) : r2;
      if (outcome === 'two' && qn(R2) === r1) continue;
      // a(x − r1)(x − r2) = ax² − a(r1 + r2)x + a·r1·r2
      const s = addQ(Q(r1), R2), p = mulQ(Q(r1), R2);
      if (a * s.d !== a * s.d || (a * s.n) % s.d || (a * p.n) % p.d) continue;
      b = m - (a * s.n) / s.d; c = k + (a * p.n) / p.d;
      xs = outcome === 'one' ? [Q(r1)] : [Q(r1), R2];
    }
    if (Math.abs(b) > 12 || Math.abs(c) > 20 || (b === 0 && c === 0)) continue;
    xs.sort((p, q) => qn(p) - qn(q));
    const pts = xs.map((x) => [x, addQ(mulQ(Q(m), x), Q(k))]);
    if (pts.some(([, y]) => Math.abs(qn(y)) > maxY)) continue;
    return { a, b, c, m, k, pts };
  }
}

function lineParabola(rng) {
  const outcome = rng.pick(['two', 'two', 'two', 'two', 'two', 'two', 'one', 'one', 'none', 'none']);
  // The line as y = mx + k, or as mx − y = −k for a student to solve first,
  // or the parabola in vertex form, to be multiplied out first.
  const form = rng.pick(['slope', 'slope', 'slope', 'slope', 'std', 'std', 'std', 'vertex', 'vertex', 'vertex']);
  let made;
  // Every meeting point inside the level's window, so the picture holds it.
  do made = parabolaAndLine(rng, outcome, WINDOW.y[1] - 1);
  while ((form === 'vertex' && made.b % (2 * made.a) !== 0) || (form === 'std' && made.m === 0)
    // The parabola reaches the window, so the picture has both curves.
    || !graphY((x) => made.a * x * x + made.b * x + made.c, WINDOW, LINE).length);
  const { a, b, c, m, k, pts } = made;
  const h = -b / (2 * a), q = c - a * h * h;
  const par = form === 'vertex'
    ? `y = ${a === 1 ? '' : a === -1 ? '-' : a}${h ? `(x ${h < 0 ? '+' : '-'} ${Math.abs(h)})^2` : 'x^2'}${q ? ` ${q < 0 ? '-' : '+'} ${Math.abs(q)}` : ''}`
    : `y = ${poly([c, b, a])}`;
  const asStd = form === 'std';
  const line = asStd ? stdLine(m, -1, -k) : null;
  const lineSrc = asStd ? line.src : `y = ${poly([k, m])}`;
  const da = a, db = b - m, dc = c - k;
  const first = asStd ? `Solve the line for y: y = ${pretty(poly([k, m]))}. `
    : form === 'vertex' && h ? `Multiplied out, the parabola is y = ${pretty(poly([c, b, a]))}. ` : '';
  const ys = pts.length ? ` On the line, ${pts.map(([x, y]) => `x = ${qs(x)} gives y = ${qs(y)}`).join(', and ')}.` : '';
  return {
    prompt: [T.prose('Where do'), eq(par), T.prose('and'), eq(lineSrc), T.prose('meet?'),
      T.prose('Give every point where they meet, or none if they do not meet.')],
    text: `meet: ${par}; ${lineSrc}`,
    answer: pointsAnswer(pts),
    visual: meetPicture(WINDOW, [...graphY((x) => a * x * x + b * x + c, WINDOW, LINE), ...graphY((x) => m * x + k, WINDOW, SECOND)], pts),
    explain: `${first}Where they meet, the two y's are equal: ${pretty(poly([c, b, a]))} = ${pretty(poly([k, m]))}, so ${solved(da, db, dc)}.${ys} `
      + `So ${pts.length ? `they meet at ${meetText(pts)}` : 'they do not meet: none'}.`,
  };
}

// --- How Many Intersections ---------------------------------------------------------

const COUNTS = [
  { id: 'none', label: 'No points' },
  { id: 'one', label: 'One point' },
  { id: 'two', label: 'Two points' },
];

/** Lattice points on x² + y² = R. */
function lattice(R) {
  const out = [];
  for (let x = -Math.floor(Math.sqrt(R)); x * x <= R; x++) {
    const y2 = R - x * x, y = Math.round(Math.sqrt(y2));
    if (y * y === y2) { out.push([x, y]); if (y) out.push([x, -y]); }
  }
  return out;
}
const RADII = [25, 50, 65, 85, 100, 169, 10, 13, 17, 20, 26, 29, 34, 40, 45, 58, 5, 8];

function howMany(rng) {
  if (rng.chance(0.3)) {
    // The line's intercept that makes it touch: one root, a zero discriminant.
    for (;;) {
      const a = 1, b = rng.int(-8, 8), c = rng.int(-9, 9), m = rng.int(-6, 6);
      const d = b - m;
      if (d % 2) continue;
      const k = c - (d * d) / 4;
      const par = `y = ${poly([c, b, a])}`;
      return {
        prompt: [T.prose('For what value of k does the line'), eq(`y = ${poly([0, m]) === '0' ? 'k' : `${poly([0, m])} + k`}`), T.prose('meet'), eq(par), T.prose('at exactly one point?')],
        text: `tangent k: ${par}; y = ${m}x + k`,
        answer: { type: 'frac', value: Q(k), requireSimplest: false },
        visual: null,
        explain: `Setting them equal leaves ${pretty(poly([c, b - m, 1]).replace(/ = 0$/, ''))} − k = 0, a quadratic in x. One meeting point means one root, a discriminant of 0: `
          + `(${minus(d)})² − 4(${minus(c)} − k) = 0, so ${d * d} = 4(${minus(c)} − k), ${minus(c)} − k = ${(d * d) / 4} and k = ${minus(k)}. So k = ${minus(k)}.`,
      };
    }
  }
  const outcome = rng.pick(['none', 'one', 'two']);
  const shape = rng.pick(['parabola', 'parabola', 'parabola', 'circle', 'circle', 'flat']);
  let text, prompt, explain;
  if (shape === 'parabola') {
    const { a, b, c, m, k } = parabolaAndLine(rng, outcome);
    const par = `y = ${poly([c, b, a])}`, lineSrc = `y = ${poly([k, m])}`;
    const da = a, db = b - m, dc = c - k, D = db * db - 4 * da * dc;
    prompt = [T.prose('How many points do'), eq(par), T.prose('and'), eq(lineSrc), T.prose('have in common?')];
    text = `how many: ${par}; ${lineSrc}`;
    explain = `Setting them equal gives ${pretty(poly([dc, db, da]))} = 0, whose discriminant is ${minus(db * db)} − ${4 * da * dc < 0 ? `(${minus(4 * da * dc)})` : 4 * da * dc} = ${minus(D)}.`;
  } else if (shape === 'circle') {
    // Through two lattice points, a tangent at one, or a tangent moved out.
    for (;;) {
      const R = rng.pick(RADII), L = lattice(R);
      const P = rng.pick(L);
      let A, B, C;
      if (outcome === 'two') {
        const Q2 = rng.pick(L);
        if (Q2 === P || (Q2[0] === -P[0] && Q2[1] === -P[1] && rng.chance(0.5))) continue;
        A = Q2[1] - P[1]; B = P[0] - Q2[0]; C = A * P[0] + B * P[1];
      } else {
        A = P[0]; B = P[1]; C = R;
        const g = gcd(A, B) || 1;
        A /= g; B /= g; C /= g;
        if (outcome === 'none') C += (C >= 0 ? 1 : -1) * rng.int(1, 4);
      }
      if (!A && !B) continue;
      const line = stdLine(A, B, C);
      const circ = `x^2 + y^2 = ${R}`;
      prompt = [T.prose('How many points do the circle'), eq(circ), T.prose('and the line'), eq(line.src), T.prose('have in common?')];
      text = `how many circle: ${circ}; ${line.src}`;
      // requiem: catalogue/content/substitution-shown-before-simplified
      // Counted the way the level teaches it, the line put into the circle
      // and the discriminant of what is left.
      explain = `${circleWork(line, 0, 0, R, counted).work}.`;
      break;
    }
  } else {
    // A horizontal line against a parabola in vertex form.
    const a = rng.pick([1, -1, 2, -2, 3, -3]), h = rng.int(-5, 5), q = rng.int(-8, 8);
    const kk = outcome === 'one' ? q : q + (a > 0 === (outcome === 'two') ? 1 : -1) * rng.int(1, 6);
    const sq = h ? `(x ${h < 0 ? '+' : '-'} ${Math.abs(h)})^2` : 'x^2';
    const par = `y = ${a === 1 ? '' : a === -1 ? '-' : a}${sq}${q ? ` ${q < 0 ? '-' : '+'} ${Math.abs(q)}` : ''}`;
    prompt = [T.prose('How many points do'), eq(par), T.prose('and'), eq(`y = ${kk}`), T.prose('have in common?')];
    text = `how many flat: ${par}; y = ${kk}`;
    explain = `The parabola's vertex is (${minus(h)}, ${minus(q)}) and it opens ${a > 0 ? 'up' : 'down'}, so its heights are every number ${a > 0 ? `from ${minus(q)} up` : `from ${minus(q)} down`}. `
      + `y = ${minus(kk)} is ${kk === q ? 'the vertex height, met once' : (a > 0) === (kk > q) ? `${a > 0 ? 'above' : 'below'} the vertex, met once on each side` : `${a > 0 ? 'below' : 'above'} the vertex, never met`}.`;
  }
  const said = { none: 'no points', one: 'one point', two: 'two points' }[outcome];
  return {
    prompt,
    text,
    answer: { type: 'choice', value: outcome, options: COUNTS },
    visual: null,
    explain: `${explain} So they have ${said} in common.`,
  };
}

// --- Line Meets Circle -----------------------------------------------------------------

function lineCircle(rng) {
  const outcome = rng.pick(['two', 'two', 'two', 'two', 'two', 'two', 'one', 'one', 'none', 'none']);
  for (;;) {
    const R = rng.pick(RADII), L = lattice(R);
    const shifted = rng.chance(0.35);
    const h = shifted ? rng.int(-3, 3) : 0, k = shifted ? rng.int(-3, 3) : 0;
    const P = rng.pick(L);
    let A, B, C, pts;
    if (outcome === 'two') {
      const P2 = rng.pick(L);
      if (P2 === P) continue;
      A = P2[1] - P[1]; B = P[0] - P2[0]; C = A * (P[0] + h) + B * (P[1] + k);
      pts = [[P[0] + h, P[1] + k], [P2[0] + h, P2[1] + k]];
    } else {
      const g = gcd(P[0], P[1]) || 1;
      A = P[0] / g; B = P[1] / g; C = (P[0] * (P[0] + h) + P[1] * (P[1] + k)) / g;
      if (outcome === 'none') C += (A * h + B * k <= C ? 1 : -1) * rng.int(1, 3);
      pts = outcome === 'one' ? [[P[0] + h, P[1] + k]] : [];
    }
    const line = stdLine(A, B, C);
    // Shown as y = mx + b when that is whole, or x = c, else Ax + By = C.
    let lineSrc = line.src;
    if (line.b !== 0 && line.a % line.b === 0 && line.c % line.b === 0) {
      lineSrc = `y = ${poly([line.c / line.b, -line.a / line.b])}`;
    } else if (line.b === 0) {
      lineSrc = `x = ${line.c / line.a}`;
      if (!Number.isInteger(line.c / line.a)) continue;
    }
    const circ = shifted && (h || k)
      ? `${h ? `(x ${h < 0 ? '+' : '-'} ${Math.abs(h)})^2` : 'x^2'} + ${k ? `(y ${k < 0 ? '+' : '-'} ${Math.abs(k)})^2` : 'y^2'} = ${R}`
      : `x^2 + y^2 = ${R}`;
    if (Math.abs(line.c) > 60) continue;
    const { v, work } = circleWork(line, h, k, R, solved, lineSrc.startsWith('y ='));
    const back = line.b === 0 ? '' : ` On the line, ${pts.map((p) => (v === 'x' ? `x = ${minus(p[0])} gives y = ${minus(p[1])}` : `y = ${minus(p[1])} gives x = ${minus(p[0])}`)).join(', and ')}.`;
    const ys = pts.length ? back : '';
    // The window holds the circle and the line's nearest point to its center,
    // so a line that misses is drawn missing.
    const t = (line.a * h + line.b * k - line.c) / (line.a ** 2 + line.b ** 2);
    const win = circleWindow([h, k, R], [h - t * line.a, k - t * line.b, 1]);
    const curves = [circleMark(h, k, R, LINE), ...(line.b === 0
      ? graphX(() => line.c / line.a, win, SECOND)
      : graphY((x) => (line.c - line.a * x) / line.b, win, SECOND))];
    return {
      prompt: [T.prose('Where do the line'), eq(lineSrc), T.prose('and the circle'), eq(circ), T.prose('meet?'),
        T.prose('Give every point where they meet, or none if they do not meet.')],
      text: `meet: ${circ}; ${lineSrc}`,
      answer: pointsAnswer(pts),
      visual: meetPicture(win, curves, pts),
      explain: `${work}.${ys} `
        + `So ${pts.length ? `they meet at ${meetText(pts)}` : 'they do not meet: none'}.`,
    };
  }
}

// --- Two Curves ---------------------------------------------------------------------

function twoCurves(rng) {
  const kind = rng.pick(['parabolas', 'circle', 'xy', 'squares']);
  if (kind === 'parabolas') {
    const outcome = rng.pick(['two', 'two', 'two', 'two', 'two', 'one', 'none', 'none']);
    for (;;) {
      // The second parabola, then the first = second + d·(the difference).
      const a2 = rng.pick([1, -1, 2, -2]), b2 = rng.int(-5, 5), c2 = rng.int(-6, 6);
      const d = rng.pick([1, 2, -1, -2, 3, -3]);
      if (a2 + d === 0) continue;
      let D1, D0;
      let xs;
      if (outcome === 'none') {
        const hh = rng.int(-3, 3), q = rng.int(1, 5);
        D1 = -2 * d * hh; D0 = d * (hh * hh + q); xs = [];
      } else {
        const r1 = rng.int(-4, 4), r2 = outcome === 'one' ? r1 : rng.int(-4, 4);
        if (outcome === 'two' && r1 === r2) continue;
        D1 = -d * (r1 + r2); D0 = d * r1 * r2; xs = outcome === 'one' ? [r1] : [Math.min(r1, r2), Math.max(r1, r2)];
      }
      const a1 = a2 + d, b1 = b2 + D1, c1 = c2 + D0;
      if (Math.abs(b1) > 12 || Math.abs(c1) > 20) continue;
      const pts = xs.map((x) => [x, a2 * x * x + b2 * x + c2]);
      if (pts.some(([, y]) => Math.abs(y) > WINDOW.y[1] - 1)) continue;
      // Both parabolas reach the window, so the picture has both curves.
      if (!graphY((x) => a1 * x * x + b1 * x + c1, WINDOW, LINE).length || !graphY((x) => a2 * x * x + b2 * x + c2, WINDOW, LINE).length) continue;
      const f = `y = ${poly([c1, b1, a1])}`, g = `y = ${poly([c2, b2, a2])}`;
      const ys = pts.length ? ` Then y from either: ${pts.map(([x, y]) => `x = ${minus(x)} gives y = ${minus(y)}`).join(', and ')}.` : '';
      return {
        prompt: [T.prose('Where do'), eq(f), T.prose('and'), eq(g), T.prose('meet?'),
          T.prose('Give every point where they meet, or none if they do not meet.')],
        text: `meet: ${f}; ${g}`,
        answer: pointsAnswer(pts),
        visual: meetPicture(WINDOW, [...graphY((x) => a1 * x * x + b1 * x + c1, WINDOW, LINE), ...graphY((x) => a2 * x * x + b2 * x + c2, WINDOW, SECOND)], pts),
        explain: `Set the two y's equal, ${pretty(poly([c1, b1, a1]))} = ${pretty(poly([c2, b2, a2]))}, and bring everything to one side: ${solved(d, D1, D0)}.${ys} So ${pts.length ? `they meet at ${meetText(pts)}` : 'they do not meet: none'}.`,
      };
    }
  }
  if (kind === 'circle') {
    for (;;) {
      // y = s·x² + c meets x² + (y − k0)² = R: x² = s(y − c), so
      // s(y − c) + (y − k0)² = R, whose roots y1 and y2 add to 2k0 − s.
      const s = rng.pick([1, -1]), c = s > 0 ? rng.int(-9, 1) : rng.int(-1, 9), y1 = rng.int(-9, 9);
      const k0 = rng.chance(0.5) ? 0 : rng.nonZero(-4, 4);
      const y2 = 2 * k0 - s - y1, R = (y1 - k0) ** 2 + s * (y1 - c);
      if (R <= 0 || R > 200 || y1 === y2) continue;
      const pts = [];
      for (const y of [y1, y2]) {
        const x2 = s * (y - c);
        if (x2 < 0) continue;
        const x = Math.round(Math.sqrt(x2));
        if (x * x !== x2) { pts.length = 0; pts.push(null); break; }
        pts.push([x, y]);
        if (x) pts.push([-x, y]);
      }
      if (pts.includes(null) || !pts.length) continue;
      const par = `y = ${s < 0 ? '-' : ''}x^2${c ? ` ${c < 0 ? '-' : '+'} ${Math.abs(c)}` : ''}`;
      const circ = `x^2 + ${k0 ? `(y ${k0 < 0 ? '+' : '-'} ${Math.abs(k0)})^2` : 'y^2'} = ${R}`;
      const kept = [y1, y2].map((y) => {
        const x2 = s * (y - c);
        return x2 < 0 ? `y = ${minus(y)} would need x² = ${minus(x2)}, which no real x has` : `y = ${minus(y)} gives x² = ${x2}, so x = ${x2 ? `±${Math.round(Math.sqrt(x2))}` : '0'}`;
      });
      return {
        prompt: [T.prose('Where do the circle'), eq(circ), T.prose('and the parabola'), eq(par), T.prose('meet?'),
          T.prose('Give every point where they meet, or none if they do not meet.')],
        text: `meet: ${circ}; ${par}`,
        answer: pointsAnswer(pts),
        visual: meetPicture(circleWindow([0, k0, R]), [circleMark(0, k0, R, LINE), ...graphY((x) => s * x * x + c, circleWindow([0, k0, R]), SECOND)], pts),
        explain: `The parabola gives x² = ${pretty(s > 0 ? poly([-c, 1], 'y') : poly([c, -1], 'y'))}. Put that into the circle: ${pretty(s > 0 ? poly([-c, 1], 'y') : poly([c, -1], 'y'))} + ${k0 ? `(y ${k0 < 0 ? '+' : '−'} ${Math.abs(k0)})²` : 'y²'} = ${R}`
          + `${k0 ? `, which multiplied out is ${pretty(s > 0 ? poly([-c, 1], 'y') : poly([c, -1], 'y'))} + ${pretty(poly(sqOut(1, -k0), 'y'))} = ${R}` : ''}; brought to one side, ${solved(1, s - 2 * k0, k0 * k0 - s * c - R, 'y')}. `
          + `${kept.join('; ')}. So they meet at ${meetText(pts.sort((p, q) => p[0] - q[0] || p[1] - q[1]))}.`,
      };
    }
  }
  if (kind === 'squares') return squares(rng);
  // xy = k and a line: x + y = s, or y = x + d.
  for (;;) {
    const sum = rng.chance(0.55);
    const r1 = rng.int(-9, 9), r2 = rng.int(-9, 9);
    if (!r1 || !r2) continue;
    let k, lineSrc, pts, quad;
    if (sum) {
      // x and y are the roots of t² − st + k = 0: the points (r1, r2), (r2, r1).
      const none = rng.chance(0.2);
      const s = none ? rng.int(-6, 6) : r1 + r2;
      k = none ? rng.int(Math.floor((s * s) / 4) + 1, Math.floor((s * s) / 4) + 12) : r1 * r2;
      if (k === 0) continue;
      lineSrc = `x + y = ${s}`;
      pts = none ? [] : r1 === r2 ? [[r1, r1]] : [[r1, r2], [r2, r1]];
      quad = [k, -s, 1];
    } else {
      // y = x + d: x(x + d) = k, roots r1 and r2 = −d − r1.
      const d = -(r1 + r2);
      if (r1 === r2) continue;
      k = r1 * (r1 + d);
      if (k === 0) continue;
      lineSrc = `y = ${poly([d, 1])}`;
      pts = [[r1, r1 + d], [r2, r2 + d]];
      quad = [-k, d, 1];
    }
    if (Math.abs(k) > 60) continue;
    const xs = `xy = ${k}`;
    const r = roots(quad[2], quad[1], quad[0]);
    if (!r) continue;
    const s0 = sum ? Number(lineSrc.split(' = ')[1]) : 0;
    const yLine = sum ? poly([s0, -1]) : lineSrc.split(' = ')[1];
    const ys = pts.length ? ` On the line, ${[...pts].sort((p, q) => p[0] - q[0]).map(([x, y]) => `x = ${minus(x)} gives y = ${minus(y)}`).join(', and ')}.` : '';
    return {
      prompt: [T.prose('Where do'), eq(xs), T.prose('and'), eq(lineSrc), T.prose('meet?'),
        T.prose('Give every point where they meet, or none if they do not meet.')],
      text: `meet: ${xs}; ${lineSrc}`,
      answer: pointsAnswer(pts),
      visual: meetPicture(XY, [...graphY((x) => k / x, XY, LINE), ...graphY(sum ? (x) => Number(lineSrc.split(' = ')[1]) - x : (x) => x - (r1 + r2), XY, SECOND)], pts),
      explain: `The line gives y = ${pretty(yLine)}; put it into xy = ${minus(k)}: x(${pretty(yLine)}) = ${minus(k)}, so ${pretty(poly(sum ? [0, s0, -1] : [0, quad[1], 1]))} = ${minus(k)}`
        + `${sum ? '; brought to one side and turned over' : '; brought to one side'}, ${solved(1, quad[1], quad[0])}.${ys} `
        + `So ${pts.length ? `they meet at ${meetText(pointsAnswer(pts).value.pts)}` : 'they do not meet: none'}.`,
    };
  }
}

/**
 * Two curves whose squares cancel: a circle and the hyperbola x² − y² = B,
 * or two circles, one centered off the origin. Subtracting one equation
 * from the other takes x² out (and y² too, for the circles), which leaves
 * one letter to find, then the other from its square.
 */
function squares(rng) {
  if (rng.chance(0.5)) {
    for (;;) {
      // y² = (A − B)/2 and x² = (A + B)/2; B past A leaves y² below 0.
      const none = rng.chance(0.15);
      const x0 = rng.int(0, 8), y0 = rng.int(0, 8);
      const A = none ? rng.int(4, 40) : x0 * x0 + y0 * y0;
      const B = none ? A + rng.int(1, 20) : x0 * x0 - y0 * y0;
      if (B === 0 || A <= 0 || A > 100) continue;
      const pts = [];
      if (!none) for (const sx of x0 ? [-1, 1] : [1]) for (const sy of y0 ? [-1, 1] : [1]) pts.push([sx * x0, sy * y0]);
      const circ = `x^2 + y^2 = ${A}`, hyp = `x^2 - y^2 = ${B}`;
      const Y = Q(A - B, 2), X = Q(A + B, 2);
      const root = (v, sq) => (sq ? `${v} = ±${Math.round(Math.sqrt(sq))}` : `${v} = 0`);
      // The window holds the hyperbola's vertices too, so it is drawn where it misses the circle.
      const win = circleWindow([0, 0, A], [0, 0, (Math.sqrt(Math.abs(B)) + 2) ** 2]);
      const curves = [circleMark(0, 0, A, LINE), ...(B > 0
        ? [...graphX((y) => Math.sqrt(B + y * y), win, SECOND), ...graphX((y) => -Math.sqrt(B + y * y), win, SECOND)]
        : [...graphY((x) => Math.sqrt(x * x - B), win, SECOND), ...graphY((x) => -Math.sqrt(x * x - B), win, SECOND)])];
      return {
        prompt: [T.prose('Where do the circle'), eq(circ), T.prose('and the hyperbola'), eq(hyp), T.prose('meet?'),
          T.prose('Give every point where they meet, or none if they do not meet.')],
        text: `meet: ${circ}; ${hyp}`,
        answer: pointsAnswer(pts),
        visual: meetPicture(win, curves, pts),
        explain: `Subtract the second equation from the first: x² goes, leaving 2y² = ${A} − ${B < 0 ? `(${minus(B)})` : B} = ${minus(A - B)}, so y² = ${qs(Y)}`
          + (none ? `, which no real y has. So they do not meet: none.`
            : `, and ${root('y', y0 * y0)}. Then x² = ${A} − ${y0 * y0} = ${qs(X)}, so ${root('x', x0 * x0)}. So they meet at ${meetText(pointsAnswer(pts).value.pts)}.`),
      };
    }
  }
  for (;;) {
    // x² + y² = R1 and x² + (y − k)² = R2 meet where y = y0, x² = X; the
    // other way round, (x − k)² + y² = R2 meets x² + y² = R1 where x = y0.
    const k = rng.nonZero(-6, 6), y0 = rng.int(-8, 8);
    const outcome = rng.pick(['two', 'two', 'two', 'two', 'one', 'none']);
    const x0 = outcome === 'two' ? rng.int(1, 8) : 0;
    const X = outcome === 'none' ? -rng.int(1, 12) : x0 * x0;
    const R1 = X + y0 * y0, R2 = R1 - 2 * k * y0 + k * k;
    if (R1 <= 0 || R2 <= 0 || R1 > 120 || R2 > 120) continue;
    const across = rng.chance(0.5);
    // s is the letter the subtraction finds, o the one found from its square.
    const [s, o] = across ? ['x', 'y'] : ['y', 'x'];
    const pt = (sv, ov) => (across ? [sv, ov] : [ov, sv]);
    const pts = outcome === 'none' ? [] : outcome === 'one' ? [pt(y0, 0)] : [pt(y0, -x0), pt(y0, x0)];
    const first = `x^2 + y^2 = ${R1}`, second = across ? circleSrc(k, 0, R2) : circleSrc(0, k, R2);
    const opened = across ? `${pretty(poly([k * k, -2 * k, 1], 'x'))} + y²` : `x² + ${pretty(poly([k * k, -2 * k, 1], 'y'))}`;
    const win = circleWindow([0, 0, R1], across ? [k, 0, R2] : [0, k, R2]);
    const rest = X < 0 ? `${o}² = ${R1} − ${y0 * y0} = ${minus(X)}, which no real ${o} has. So they do not meet: none.`
      : `${o}² = ${R1} − ${y0 * y0} = ${X}, so ${o} = ${X ? `±${x0}` : '0'}. So they meet at ${meetText(pointsAnswer(pts).value.pts)}.`;
    return {
      prompt: [T.prose('Where do the circles'), eq(first), T.prose('and'), eq(second), T.prose('meet?'),
        T.prose('Give every point where they meet, or none if they do not meet.')],
      text: `meet: ${first}; ${second}`,
      answer: pointsAnswer(pts),
      visual: meetPicture(win, [circleMark(0, 0, R1, LINE), circleMark(across ? k : 0, across ? 0 : k, R2, SECOND)], pts),
      explain: `Multiplied out, the second is ${opened} = ${R2}. Subtract it from the first: x² and y² go, leaving ${pretty(poly([-k * k, 2 * k], s))} = ${minus(R1 - R2)}, `
        + `so ${pretty(poly([0, 2 * k], s))} = ${minus(R1 - R2 + k * k)} and ${s} = ${minus(y0)}. Put that into the first: ${rest}`,
    };
  }
}

// --- Three Variables ------------------------------------------------------------------

const det3 = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1])
  - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0])
  + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);

/** ax + by + cz = d. */
function eq3(row, d, vs = ['x', 'y', 'z']) {
  const parts = [];
  row.forEach((c, i) => {
    if (!c) return;
    const a = Math.abs(c), body = `${a === 1 ? '' : a}${vs[i]}`;
    parts.push(parts.length ? `${c < 0 ? '-' : '+'} ${body}` : `${c < 0 ? '-' : ''}${body}`);
  });
  return `${parts.join(' ')} = ${d}`;
}

/**
 * The left side of an equation with the letters already found put in as
 * numbers, 2(−1) for 2y at y = −1: "x + 2(−1) − 3(3) = 4".
 */
function subText(row, d, known, vs) {
  const parts = [];
  row.forEach((c, i) => {
    if (!c) return;
    const a = Math.abs(c);
    const body = i in known ? `${a === 1 ? '' : a}(${minus(known[i])})` : `${a === 1 ? '' : a}${vs[i]}`;
    parts.push(parts.length ? `${c < 0 ? '−' : '+'} ${body}` : `${c < 0 ? '−' : ''}${body}`);
  });
  return `${parts.join(' ')} = ${minus(d)}`;
}

/** The last unknown of row, found once the others are put in: "so −2y = −9 and y = 9/2". */
function backSolve(row, d, known, i, sol, vs) {
  const rest = row.reduce((t, c, j) => (j in known ? t + c * known[j] : t), 0);
  const left = row[i], right = d - rest;
  const said = `${left === 1 ? '' : left === -1 ? '−' : minus(left)}${vs[i]} = ${minus(right)}`;
  const found = left === 1 ? '' : ` and ${vs[i]} = ${qs(Q(right, left))}`;
  // Nothing known in this row: the equation is already in one letter.
  if (!Object.keys(known).some((j) => row[j])) return left === 1 ? said : `${said}, so ${vs[i]} = ${qs(Q(right, left))}`;
  return `${subText(row, d, known, vs)}, so ${said}${found}`;
}

/**
 * Eliminate x with the first equation, then y, in words, for an explanation:
 * every combination named and its result written, a common factor divided
 * out aloud, and each letter found by putting the ones before it back in.
 */
// requiem: catalogue/content/substitution-shown-before-simplified
function eliminate(M, D, sol, vs = ['x', 'y', 'z']) {
  const [r1] = M;
  const a = r1[0];
  // (a/g)·r − (r[0]/g)·r1 with g their common factor, x gone, then reduced;
  // a negative a turns both round so the row being kept is never negated.
  const comb = (r, d) => {
    const g = gcd(a, r[0]) || 1, s = Math.sign(a) || 1;
    const ka = Math.abs(a) / g, kr = (s * r[0]) / g;
    const raw = [0, ka * r[1] - kr * r1[1], ka * r[2] - kr * r1[2]], rawD = ka * d - kr * D[0];
    let h = gcd(gcd(raw[1], raw[2]), rawD) || 1;
    // A single letter left with a minus in front is divided by the minus too: −4y = 16 is y = −4.
    const left = raw.filter((v) => v);
    if (left.length === 1 && left[0] < 0) h = -h;
    return { raw, rawD, h, row: raw.map((v) => v / h), d: rawD / h, ka, kr };
  };
  const A = comb(M[1], D[1]), B = comb(M[2], D[2]);
  const times = (k) => (k === 1 ? '' : `${k} × `);
  const step = (c, n, tag) => {
    const made = c.kr === 0 ? `the ${n} has no ${vs[0]} already: ${pretty(eq3(c.raw, c.rawD, vs))}`
      : `${times(c.ka)}the ${n} ${c.kr < 0 ? '+' : '−'} ${times(Math.abs(c.kr))}the first gives ${pretty(eq3(c.raw, c.rawD, vs))}`;
    return c.h !== 1 ? `${made}, which divided by ${minus(c.h)} is ${tag}: ${pretty(eq3(c.row, c.d, vs))}` : `${made}; call it ${tag}`;
  };
  const head = `Take ${vs[0]} out with the first equation: ${step(A, 'second', 'A')}, and ${step(B, 'third', 'B')}. `;
  const xLast = `Put both into the first: ${backSolve(r1, D[0], { 1: sol[1], 2: sol[2] }, 0, sol, vs)}.`;
  // One of the pair in y alone gives y at once, and the other then gives z.
  const yAlone = [A, B].findIndex((e) => e.row[2] === 0);
  if (yAlone >= 0) {
    const [yTag, yE] = yAlone === 0 ? ['A', A] : ['B', B], [zTag, zE] = yAlone === 0 ? ['B', B] : ['A', A];
    return `${head}${yTag} gives ${backSolve(yE.row, yE.d, {}, 1, sol, vs)}. `
      + `Put ${vs[1]} = ${minus(sol[1])} into ${zTag}: ${backSolve(zE.row, zE.d, { 1: sol[1] }, 2, sol, vs)}. ${xLast}`;
  }
  // Then y out of the pair: c1·A + c2·B, unless one of them has no y already.
  const [Ay, By] = [A.row[1], B.row[1]];
  let zStep;
  if (Ay === 0 || By === 0) {
    const [tag, e] = Ay === 0 ? ['A', A] : ['B', B];
    zStep = `${tag} gives ${backSolve(e.row, e.d, {}, 2, sol, vs)}`;
  } else {
    const g = gcd(Ay, By) || 1;
    let c1 = By / g, c2 = -Ay / g;
    if (c1 < 0) { c1 = -c1; c2 = -c2; }
    const zRow = [0, 0, c1 * A.row[2] + c2 * B.row[2]], zD = c1 * A.d + c2 * B.d;
    if (qn(Q(zD, zRow[2])) !== sol[2]) throw new Error('eliminate: z does not come out');
    zStep = `${vs[1]} out of A and B: ${times(c1)}A ${c2 < 0 ? '−' : '+'} ${times(Math.abs(c2))}B gives ${backSolve(zRow, zD, {}, 2, sol, vs)}`;
  }
  // y from whichever of A and B has one, then x from the first.
  const [yTag, yE] = Ay !== 0 ? ['A', A] : ['B', B];
  return `${head}Then ${zStep}. `
    + `Put ${vs[2]} = ${minus(sol[2])} into ${yTag}: ${backSolve(yE.row, yE.d, { 2: sol[2] }, 1, sol, vs)}. ${xLast}`;
}

/** Gaps: how many of the nine coefficients are 0, or any number when null. */
function randomSystem(rng, sol, lim = 3, gaps = null) {
  for (;;) {
    const M = [0, 1, 2].map(() => [0, 1, 2].map(() => rng.int(-lim, lim)));
    M[0][0] = rng.pick([1, 1, 1, -1, 2]);
    const zeros = M.flat().filter((v) => v === 0).length;
    if (gaps !== null && !(Array.isArray(gaps) ? gaps.includes(zeros) : zeros === gaps)) continue;
    if (M.some((r) => r.every((v) => v === 0)) || M.some((r) => r.filter((v) => v).length < 2)) continue;
    if (det3(M) === 0) continue;
    // The pair left after x is taken out must not be one equation twice.
    const D = M.map((r) => r[0] * sol[0] + r[1] * sol[1] + r[2] * sol[2]);
    if (D.some((d) => Math.abs(d) > 40)) continue;
    const e2 = [M[0][0] * M[1][1] - M[1][0] * M[0][1], M[0][0] * M[1][2] - M[1][0] * M[0][2]];
    const e3 = [M[0][0] * M[2][1] - M[2][0] * M[0][1], M[0][0] * M[2][2] - M[2][0] * M[0][2]];
    if (e3[1] * e2[0] - e2[1] * e3[0] === 0 || e2[0] === 0 && e3[0] === 0) continue;
    return { M, D };
  }
}

function threeVars(rng) {
  const sol = [rng.int(-6, 6), rng.int(-6, 6), rng.int(-6, 6)];
  // Every letter in every equation, one letter missing somewhere, or two or
  // three missing, which leaves less to eliminate.
  const { M, D } = randomSystem(rng, sol, 3, rng.pick([0, 0, 0, 0, 1, 1, 1, [2, 3], [2, 3], [2, 3]]));
  // e3[1]·e2 − e2[1]·e3 removes y; it needs both pair rows to have a y.
  const text = M.map((r, i) => eq3(r, D[i])).join('; ');
  const e2y = M[0][0] * M[1][1] - M[1][0] * M[0][1], e3y = M[0][0] * M[2][1] - M[2][0] * M[0][1];
  if (e2y === 0 && e3y === 0) return threeVars(rng);
  return {
    prompt: [T.prose('Solve'), eq(eq3(M[0], D[0])), T.prose(','), eq(eq3(M[1], D[1])), T.prose('and'), eq(eq3(M[2], D[2])), T.prose('.'),
      T.prose('Give the solution as (x, y, z).')],
    text: `system3: ${text}`,
    answer: pointsAnswer([sol], 3),
    visual: null,
    explain: `${eliminate(M, D, sol)} Check in all three. So (x, y, z) = ${ptText(sol)}.`,
  };
}

// --- No Solution or Infinitely Many --------------------------------------------------

const SOLUTIONS = [
  { id: 'one', label: 'Exactly one solution' },
  { id: 'none', label: 'No solution' },
  { id: 'infinite', label: 'Infinitely many solutions' },
];

function special(rng) {
  const kind = rng.pick(['one', 'none', 'infinite']);
  const sol = [rng.int(-5, 5), rng.int(-5, 5), rng.int(-5, 5)];
  if (kind === 'one') {
    const { M, D } = randomSystem(rng, sol, 4);
    const lines = M.map((r, i) => eq3(r, D[i]));
    return {
      prompt: [T.prose('How many solutions does this system have?'), eq(lines[0]), T.prose(','), eq(lines[1]), T.prose(','), eq(lines[2])],
      text: `how many3: ${lines.join('; ')}`,
      answer: { type: 'choice', value: 'one', options: SOLUTIONS },
      visual: null,
      explain: `${eliminate(M, D, sol)} Every letter has one value, so (x, y, z) = ${ptText(sol)} is the only point. So it has exactly one solution.`,
    };
  }
  for (;;) {
    const r1 = [rng.int(-3, 3), rng.int(-3, 3), rng.int(-3, 3)], r2 = [rng.int(-3, 3), rng.int(-3, 3), rng.int(-3, 3)];
    if (r1.filter((v) => v).length < 2 || r2.filter((v) => v).length < 2) continue;
    // The first two must not already be one plane twice.
    const cross = [r1[1] * r2[2] - r1[2] * r2[1], r1[2] * r2[0] - r1[0] * r2[2], r1[0] * r2[1] - r1[1] * r2[0]];
    if (cross.every((v) => v === 0)) continue;
    // One equation a multiple of another, or the sum of multiples of two.
    const scaled = rng.chance(0.4);
    const p = scaled ? rng.pick([2, 3, -1, -2]) : rng.pick([1, 2, -1, 3]), q = scaled ? 0 : rng.pick([1, 1, 2, -1, -2]);
    const r3 = r1.map((v, i) => p * v + q * r2[i]);
    if (r3.filter((v) => v).length < 2 || r3.some((v) => Math.abs(v) > 9)) continue;
    const d1 = r1.reduce((s, v, i) => s + v * sol[i], 0), d2 = r2.reduce((s, v, i) => s + v * sol[i], 0);
    const off = kind === 'none' ? rng.pick([-3, -2, -1, 1, 2, 3, 4, 5]) : 0;
    const d3 = p * d1 + q * d2 + off;
    const rows = rng.shuffle([[r1, d1, 'a'], [r2, d2, 'b'], [r3, d3, 'c']]);
    const lines = rows.map(([r, d]) => eq3(r, d));
    const name = (tag) => ['first', 'second', 'third'][rows.findIndex(([, , t]) => t === tag)];
    const combo = q === 0 ? `Multiplying the ${name('a')} by ${minus(p)}`
      : `Adding ${p === 1 ? '' : `${minus(p)} × `}the ${name('a')} and ${q === 1 ? '' : `${minus(q)} × `}the ${name('b')}`;
    return {
      prompt: [T.prose('How many solutions does this system have?'), eq(lines[0]), T.prose(','), eq(lines[1]), T.prose(','), eq(lines[2])],
      text: `how many3: ${lines.join('; ')}`,
      answer: { type: 'choice', value: kind, options: SOLUTIONS },
      visual: null,
      explain: `${combo} gives ${pretty(eq3(r3, p * d1 + q * d2))}: the same left side as the ${name('c')} equation, ${kind === 'none'
        ? `which says it is ${minus(d3)} instead. The two cannot both hold, so no point satisfies all three. So it has no solution.`
        : `and the same right side too, so the ${name('c')} adds nothing: two equations in three letters leave a whole line of points. So it has infinitely many solutions.`}`,
    };
  }
}

// --- Three-Variable Word Problems --------------------------------------------------------

/** Cents as a price: 450 is $4.50, 100 is $1.00. */
const money = (c) => `$${(c / 100).toFixed(2)}`;
/** Cents as dollars without the sign, for an equation: 7.50. */
const dollars = (c) => (c / 100).toFixed(2);
// requiem: catalogue/content/prices-answered-in-dollars
/** Prices in cents, answered in dollars: the key reads ($4.50, $1.00, $0.75). */
function moneyAnswer(cents) {
  const a = pointsAnswer([cents.map((c) => Q(c, 100))], 3);
  a.value.money = true;
  return a;
}

const PAIR_STORES = [
  { where: 'At a ballpark', items: [['h', 'a hot dog', [16, 26]], ['s', 'a soda', [10, 18]], ['p', 'a bag of popcorn', [16, 28]]] },
  { where: 'At the school store', items: [['b', 'a binder', [12, 24]], ['n', 'a notebook', [5, 12]], ['p', 'a pack of pens', [8, 18]]] },
  { where: 'At a coffee shop', items: [['c', 'a coffee', [9, 18]], ['m', 'a muffin', [8, 15]], ['b', 'a bagel', [7, 14]]] },
];

/**
 * Three items priced two at a time: every equation has two letters, none
 * gives one in terms of another, and adding all three is the way in.
 */
function pairs(rng) {
  for (;;) {
    const store = rng.pick(PAIR_STORES);
    // Prices in quarters of a dollar.
    const price = store.items.map(([, , [lo, hi]]) => rng.int(lo, hi) * 25);
    if (new Set(price).size < 3) continue;
    const vs = store.items.map(([v]) => v);
    const order = rng.shuffle([[0, 1], [1, 2], [0, 2]]);
    const totals = order.map(([i, j]) => price[i] + price[j]);
    const all = price[0] + price[1] + price[2];
    const said = order.map(([i, j], n) => `${store.items[i][1]} and ${store.items[j][1]} cost ${money(totals[n])}`);
    const rows = order.map(([i, j]) => [0, 1, 2].map((k) => (k === i || k === j ? 1 : 0)));
    // Each letter is the whole less the pair without it.
    const without = (k) => order.findIndex((pr) => !pr.includes(k));
    return {
      prompt: [T.prose(`${store.where}, ${said[0]} together, ${said[1]}, and ${said[2]}. What does each cost? `
        + `Give (${vs.join(', ')}) in dollars: ${store.items.map(([, name]) => name).join(', ')}.`)],
      text: `pairs: ${rows.map((r, n) => `${r.join(' ')} for ${totals[n]}`).join('; ')}`,
      answer: moneyAnswer(price),
      visual: null,
      explain: `In dollars: ${rows.map((r, n) => pretty(eq3(r, dollars(totals[n]), vs))).join(', ')}. `
        + `Add all three: each letter is in two of them, so ${vs.map((v) => `2${v}`).join(' + ')} = ${dollars(2 * all)}, and ${vs.join(' + ')} = ${dollars(all)}. `
        + `Take away each pair: ${[0, 1, 2].map((k) => `${vs[k]} = ${dollars(all)} − ${dollars(totals[without(k)])} = ${dollars(price[k])}`).join(', ')}. `
        + `So (${vs.join(', ')}) = (${price.map(money).join(', ')}).`,
    };
  }
}

const BAKED = [['m', 'muffins'], ['c', 'cookies'], ['b', 'bread']];
const STAPLES = [['cup of flour', 'cups of flour'], ['cup of sugar', 'cups of sugar'], ['egg', 'eggs']];

/**
 * A bakery's batches from what they used: one equation per ingredient,
 * each with every kind of batch that uses it, so it is three equations in
 * three letters with no letter given by another.
 */
function batches(rng) {
  for (;;) {
    // Per batch: flour, sugar and eggs for muffins, cookies and bread.
    const per = [[rng.int(1, 4), rng.int(1, 4), rng.int(2, 5)], [rng.int(1, 2), rng.int(1, 3), rng.int(0, 1)], [rng.int(1, 3), rng.int(0, 2), rng.int(0, 2)]];
    const made = [rng.int(1, 6), rng.int(1, 6), rng.int(1, 6)];
    if (per.some((r) => r.filter((v) => v).length < 2) || det3(per) === 0) continue;
    const used = per.map((r) => r.reduce((t, v, i) => t + v * made[i], 0));
    const amount = (n, s) => `${n} ${n === 1 ? STAPLES[s][0] : STAPLES[s][1]}`;
    const recipe = (i) => {
      const parts = [0, 1, 2].filter((s) => per[s][i]).map((s) => amount(per[s][i], s));
      return parts.length === 3 ? `${parts[0]}, ${parts[1]} and ${parts[2]}` : parts.join(' and ');
    };
    const vs = BAKED.map(([v]) => v);
    return {
      prompt: [T.prose(`A bakery makes muffins, cookies and bread in batches. A batch of muffins takes ${recipe(0)}; a batch of cookies takes ${recipe(1)}; and a batch of bread takes ${recipe(2)}. `
        + `One morning it used ${amount(used[0], 0)}, ${amount(used[1], 1)} and ${amount(used[2], 2)}. How many batches of each did it make? Give (m, c, b): muffins, cookies, bread.`)],
      text: `batches: ${per.map((r, s) => `${['flour', 'sugar', 'eggs'][s]} ${r.join(' ')} for ${used[s]}`).join('; ')}`,
      answer: pointsAnswer([made], 3),
      visual: null,
      explain: `One equation for each thing used: ${per.map((r, s) => `${pretty(eq3(r, used[s], vs))} (${['flour', 'sugar', 'eggs'][s]})`).join(', ')}. `
        + `${eliminate(per, used, made, vs)} So (m, c, b) = (${made.join(', ')}).`,
    };
  }
}

function word(rng) {
  // requiem: catalogue/content/three-unknown-stories-need-three-equations
  // Tickets, coins and numbers give one amount in terms of another, so a
  // substitution leaves a pair; snacks, pairs and batches are three full
  // equations, solved by elimination, and are two rows in three.
  const kind = rng.pick(['tickets', 'coins', 'numbers', 'snacks', 'snacks', 'pairs', 'pairs', 'batches', 'batches']);
  if (kind === 'pairs') return pairs(rng);
  if (kind === 'batches') return batches(rng);
  if (kind === 'tickets') {
    for (;;) {
      const [pa, ps, pc] = [rng.int(10, 16), rng.int(6, 9), rng.int(3, 5)];
      const c = rng.int(5, 30), times = rng.pick([2, 3]), more = rng.int(3, 15);
      const s = times * c, a = c + more;
      const n = a + s + c, cash = pa * a + ps * s + pc * c;
      return {
        prompt: [T.prose(`A school play sells adult tickets for $${pa}, student tickets for $${ps} and child tickets for $${pc}. One night it sold ${n} tickets and took in $${cash.toLocaleString('en-US')}. It sold ${times === 2 ? 'twice' : 'three times'} as many student tickets as child tickets. How many of each did it sell? Give (a, s, c): adult, student, child.`)],
        text: `tickets: prices ${pa} ${ps} ${pc}; ${n} sold; ${cash} taken; students ${times} times children`,
        answer: pointsAnswer([[a, s, c]], 3),
        visual: null,
        explain: `a + s + c = ${n}, ${pa}a + ${ps}s + ${pc}c = ${cash}, and s = ${times}c. Put s = ${times}c into both: a + ${times + 1}c = ${n} and ${pa}a + ${ps * times + pc}c = ${cash}. `
          + `The first gives a = ${n} − ${times + 1}c; then ${pa}(${n} − ${times + 1}c) + ${ps * times + pc}c = ${cash}, so ${pa * n} − ${pa * (times + 1) - ps * times - pc}c = ${cash} and c = ${c}. `
          + `Then s = ${s} and a = ${a}. So (a, s, c) = (${a}, ${s}, ${c}).`,
      };
    }
  }
  if (kind === 'coins') {
    for (;;) {
      const nk = rng.int(3, 20), more = rng.int(2, 9), q = rng.int(2, 15);
      const dm = nk + more, n = nk + dm + q, cents = 5 * nk + 10 * dm + 25 * q;
      const who = rng.pick(['Maya', 'Leo', 'Ava', 'Sam', 'Nora', 'Eli']);
      return {
        prompt: [T.prose(`${who} has ${n} coins, all nickels, dimes and quarters, worth $${(cents / 100).toFixed(2)} in all. There are ${more} more dimes than nickels. How many of each coin are there? Give (n, d, q): nickels, dimes, quarters.`)],
        text: `coins: ${n} coins; ${cents} cents; dimes ${more} more than nickels`,
        answer: pointsAnswer([[nk, dm, q]], 3),
        visual: null,
        explain: `In cents: n + d + q = ${n}, 5n + 10d + 25q = ${cents}, and d = n + ${more}. Put d = n + ${more} into both: 2n + q = ${n - more} and 15n + 25q = ${cents - 10 * more}. `
          + `The first gives q = ${n - more} − 2n; then 15n + 25(${n - more} − 2n) = ${cents - 10 * more}, so ${25 * (n - more)} − 35n = ${cents - 10 * more} and n = ${nk}. `
          + `Then d = ${dm} and q = ${q}. So (n, d, q) = (${nk}, ${dm}, ${q}).`,
      };
    }
  }
  if (kind === 'snacks') {
    for (;;) {
      // Prices in quarters of a dollar, then three orders.
      const price = [rng.int(16, 32), rng.int(4, 10), rng.int(3, 8)].map((v) => v * 25);
      const orders = [0, 1, 2].map(() => [rng.int(0, 4), rng.int(0, 4), rng.int(0, 4)]);
      if (orders.some((o) => o.filter((v) => v).length < 2) || det3(orders) === 0 || !orders[0][0]) continue;
      // The working takes s out with the first order, then d: both pairs need a d left.
      const e2d = orders[0][0] * orders[1][1] - orders[1][0] * orders[0][1], e3d = orders[0][0] * orders[2][1] - orders[2][0] * orders[0][1];
      if (!e2d && !e3d) continue;
      const totals = orders.map((o) => o.reduce((s, v, i) => s + v * price[i], 0));
      const say = (o) => [[o[0], 'sandwich', 'sandwiches'], [o[1], 'drink', 'drinks'], [o[2], 'bag of chips', 'bags of chips']]
        .filter(([v]) => v).map(([v, one, more]) => `${v} ${v === 1 ? one : more}`).join(', ').replace(/, ([^,]*)$/, ' and $1');
      return {
        prompt: [T.prose(`At a snack stand, ${say(orders[0])} cost ${money(totals[0])}; ${say(orders[1])} cost ${money(totals[1])}; and ${say(orders[2])} cost ${money(totals[2])}. `
          + 'What does each item cost, in dollars? Give (s, d, c): a sandwich, a drink, a bag of chips.')],
        text: `snacks: ${orders.map((o, i) => `${o.join(' ')} for ${totals[i]}`).join('; ')}`,
        answer: moneyAnswer(price),
        visual: null,
        explain: `In cents, so every number is whole: ${orders.map((o, i) => pretty(eq3(o, totals[i], ['s', 'd', 'c']))).join(', ')}. `
          + `${eliminate(orders, totals, price, ['s', 'd', 'c'])} In dollars, (s, d, c) = (${price.map(money).join(', ')}).`,
      };
    }
  }
  for (;;) {
    // Three numbers: their sum, how the first and second differ, and the third against the first.
    const x = rng.int(-10, 30), more = rng.int(1, 12), times = rng.pick([2, 3]);
    const y = x + more, z = times * x;
    const sum = x + y + z;
    if (x === 0) continue;
    return {
      prompt: [T.prose(`Three numbers add up to ${minus(sum)}. The second is ${more} more than the first, and the third is ${times === 2 ? 'twice' : 'three times'} the first. What are the three numbers? Give them in order as (first, second, third).`)],
      text: `numbers: sum ${sum}; second ${more} more than first; third ${times} times first`,
      answer: pointsAnswer([[x, y, z]], 3),
      visual: null,
      explain: `Call them a, b and c: a + b + c = ${minus(sum)}, b = a + ${more} and c = ${times}a. Put both into the sum: a + (a + ${more}) + ${times}a = ${minus(sum)}, so ${times + 2}a = ${minus(sum - more)} and a = ${minus(x)}. `
        + `Then b = ${minus(y)} and c = ${minus(z)}. So the numbers are (${minus(x)}, ${minus(y)}, ${minus(z)}).`,
    };
  }
}

const CONTENT = [lineParabola, howMany, lineCircle, twoCurves, threeVars, special, word];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  // requiem: catalogue/content/one-input-per-level
  // Every meeting point and every three-letter solution goes in the points
  // box, which reads none too; the question says which (where they meet,
  // (x, y, z), how many). The one number asked, a tangent's k, says so.
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
