/**
 * Catalogue authoring tool: builds the problem library for conics.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 *
 * Every `text` carries the equation in ASCII after a prefix naming what is
 * asked, or the points a question gives, so scripts/check-answers.py can
 * read the equation back as a polynomial in x and y and work every feature
 * out from its coefficients, never from the h, k, a and b it was built from.
 */
import * as T from '../terms.js';
import { minus } from '../../web/ui/dom.js';
import { previewOf } from '../../web/ui/express.js';
import { clipped } from './curves.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/conics.js';

const LINE = 'var(--vec-1)';
const MARK = 'var(--vec-2)';
const ASKED = 'var(--gold)';

const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const Q = (n, d = 1) => {
  if (d < 0) { n = -n; d = -d; }
  const g = gcd(n, d) || 1;
  return { n: n / g, d: d / g };
};
const qn = (p) => p.n / p.d;
const qs = (p) => `${minus(p.n)}${p.d === 1 ? '' : `/${p.d}`}`;
const addQ = (p, q) => Q(p.n * q.d + q.n * p.d, p.d * q.d);
const asQ = (v) => (typeof v === 'number' ? Q(v) : v);

const pt = (x, y) => `(${qs(asQ(x))}, ${qs(asQ(y))})`;
const ptA = (x, y) => `(${String(qs(asQ(x))).replace('−', '-')}, ${String(qs(asQ(y))).replace('−', '-')})`;
const pairAnswer = (x, y) => ({ type: 'pair', value: { x: asQ(x), y: asQ(y) } });
function pointsAnswer(pts) {
  const sorted = pts.map(([x, y]) => [asQ(x), asQ(y)])
    .sort((p, q) => qn(p[0]) - qn(q[0]) || qn(p[1]) - qn(q[1]));
  return { type: 'points', value: { dim: 2, pts: sorted } };
}
const fracAnswer = (v) => ({ type: 'frac', value: asQ(v), requireSimplest: false });
const choice = (value, labels) => ({ type: 'choice', value, options: labels.map(([id, label]) => ({ id, label })) });

/** One equation in one piece in the sentence, drawn as the expression box draws it. */
const eq = (src) => {
  const r = previewOf(src);
  if (!r.ok) throw new Error(`cannot draw ${src}`);
  return T.math(r.terms);
};
/** ASCII as it is printed: real minus signs and raised squares. */
const pretty = (s) => s.replace(/\^2/g, '²').replace(/-/g, '−');

// --- Writing conics ------------------------------------------------------------

/** (x − h)², or x² when h is 0. */
const sq = (v, c) => (c === 0 ? `${v}^2` : `(${v} ${c < 0 ? '+' : '-'} ${Math.abs(c)})^2`);
/** (y − k), or y when k is 0. */
const shift = (v, c) => (c === 0 ? v : `(${v} ${c < 0 ? '+' : '-'} ${Math.abs(c)})`);
/** v − c as said in prose: x − 2, y + 3, x. */
const said = (v, c) => (c === 0 ? v : `${v} ${c < 0 ? '+' : '−'} ${Math.abs(c)}`);
/** A squared term over its denominator: (x − 2)^2/25, or (x − 2)^2 over 1. */
const over = (v, c, D) => (D === 1 ? sq(v, c) : `${sq(v, c)}/${D}`);
/** coef·(y − k): 8(y - 3), -8y, y - 3, -(y + 2). */
function times(coef, v, c) {
  const body = shift(v, c);
  if (coef === 1) return c === 0 ? v : body.slice(1, -1);
  if (coef === -1) return `-${body}`;
  return `${coef}${body}`;
}

/** A conic's standard form. */
function standard(C) {
  if (C.kind === 'parabola') {
    return C.axis === 'v' ? `${sq('x', C.h)} = ${times(C.p4, 'y', C.k)}` : `${sq('y', C.k)} = ${times(C.p4, 'x', C.h)}`;
  }
  if (C.kind === 'ellipse') return `${over('x', C.h, C.X)} + ${over('y', C.k, C.Y)} = 1`;
  // A hyperbola: the positive term first.
  return C.opens === 'x' ? `${over('x', C.h, C.X)} - ${over('y', C.k, C.Y)} = 1` : `${over('y', C.k, C.Y)} - ${over('x', C.h, C.X)} = 1`;
}

/** Ax² + Cy² + Dx + Ey + F = 0 as written, terms that are 0 left out. */
function general(cs) {
  const terms = [[cs.A, 'x^2'], [cs.C, 'y^2'], [cs.D, 'x'], [cs.E, 'y'], [cs.F, '']];
  const out = [];
  for (const [c, v] of terms) {
    if (!c) continue;
    const a = Math.abs(c);
    const body = v === '' ? String(a) : `${a === 1 ? '' : a}${v}`;
    out.push(out.length ? `${c < 0 ? '-' : '+'} ${body}` : `${c < 0 ? '-' : ''}${body}`);
  }
  return `${out.join(' ')} = 0`;
}

/** Divide every coefficient by what they share, the leading one made positive. */
function reduce(cs) {
  const g = [cs.A, cs.C, cs.D, cs.E, cs.F].reduce((s, v) => gcd(s, v), 0) || 1;
  const s = (cs.A || cs.C) < 0 ? -1 : 1;
  return Object.fromEntries(Object.entries(cs).map(([k, v]) => [k, (s * v) / g]));
}

// --- Drawing --------------------------------------------------------------------

/** A window holding the origin and every point given, with a margin, whole numbers. */
function windowAround(points, margin = 2) {
  const xs = [0, ...points.map((p) => p[0])], ys = [0, ...points.map((p) => p[1])];
  const x0 = Math.floor(Math.min(...xs)) - margin, x1 = Math.ceil(Math.max(...xs)) + margin;
  const y0 = Math.floor(Math.min(...ys)) - margin, y1 = Math.ceil(Math.max(...ys)) + margin;
  return { x0, x1, y0, y1 };
}

/** The curve's pieces inside the window, by its parameter. */
function curveMarks(C, win) {
  const { h, k } = C;
  let pieces;
  if (C.kind === 'parabola') {
    const p4 = C.p4;
    const f = C.axis === 'v' ? (t) => [h + t, k + (t * t) / p4] : (t) => [h + (t * t) / p4, k + t];
    pieces = clipped(f, -40, 40, win, 1600);
  } else if (C.kind === 'ellipse') {
    const rx = Math.sqrt(C.X), ry = Math.sqrt(C.Y);
    pieces = clipped((t) => [h + rx * Math.cos(t), k + ry * Math.sin(t)], 0, 2 * Math.PI, win, 240);
  } else {
    const rx = Math.sqrt(C.X), ry = Math.sqrt(C.Y);
    const branch = (s) => (C.opens === 'x'
      ? (u) => [h + s * rx * Math.cosh(u), k + ry * Math.sinh(u)]
      : (u) => [h + rx * Math.sinh(u), k + s * ry * Math.cosh(u)]);
    pieces = [...clipped(branch(1), -4, 4, win, 400), ...clipped(branch(-1), -4, 4, win, 400)];
  }
  return pieces.map((points) => ({ kind: 'path', points, tone: LINE }));
}

/** A whole line through `at` in direction `dir`, cut to the window, as a segment. */
function lineMark(at, dir, win, extra = {}) {
  const ts = [];
  const [x, y] = at, [dx, dy] = dir;
  if (dx) ts.push((win.x0 - x) / dx, (win.x1 - x) / dx);
  if (dy) ts.push((win.y0 - y) / dy, (win.y1 - y) / dy);
  const inside = (t) => {
    const px = x + t * dx, py = y + t * dy;
    return px >= win.x0 - 1e-9 && px <= win.x1 + 1e-9 && py >= win.y0 - 1e-9 && py <= win.y1 + 1e-9;
  };
  const ok = ts.filter(inside).sort((a, b) => a - b);
  const r = (v) => +v.toFixed(3);
  const [t0, t1] = [ok[0], ok[ok.length - 1]];
  return { kind: 'segment', from: [r(x + t0 * dx), r(y + t0 * dy)], to: [r(x + t1 * dx), r(y + t1 * dy)], ...extra };
}

const dot = (p, label, tone = ASKED) => ({ kind: 'point', at: [qn(asQ(p[0])), qn(asQ(p[1]))], tone, ...(label ? { label } : {}) });

function plane(win, marks, answer) {
  const span = Math.max(win.x1 - win.x0, win.y1 - win.y0);
  return { kind: 'plane', xRange: [win.x0, win.x1], yRange: [win.y0, win.y1], grid: span > 24 ? 2 : 1, marks, answer };
}

// --- Building conics --------------------------------------------------------------

// requiem: catalogue/content/conic-points-exact
const E_TRIPLES = [[5, 4, 3], [5, 3, 4], [10, 8, 6], [10, 6, 8], [13, 12, 5], [13, 5, 12]];
const H_TRIPLES = [[3, 4, 5], [4, 3, 5], [6, 8, 10], [8, 6, 10], [5, 12, 13], [12, 5, 13]];

function ellipse(rng, [a, b, c], major = rng.pick(['x', 'y']), h = rng.int(-4, 4), k = rng.int(-4, 4)) {
  return { kind: 'ellipse', h, k, a, b, c, major, X: major === 'x' ? a * a : b * b, Y: major === 'x' ? b * b : a * a };
}
function hyperbola(rng, [a, b, c], opens = rng.pick(['x', 'y']), h = rng.int(-4, 4), k = rng.int(-4, 4)) {
  return { kind: 'hyperbola', h, k, a, b, c, opens, X: opens === 'x' ? a * a : b * b, Y: opens === 'x' ? b * b : a * a };
}

/** The equation without fractions: Y(x − h)² ± X(y − k)² = XY, shared factors out. */
function scaled(C) {
  const g = gcd(C.X, C.Y);
  const [L, R] = [C.Y / g, C.X / g];
  const right = (C.X * C.Y) / g;
  const lead = (n, v, c) => `${n === 1 ? '' : n}${sq(v, c)}`;
  if (C.kind === 'ellipse') return { src: `${lead(L, 'x', C.h)} + ${lead(R, 'y', C.k)} = ${right}`, right };
  return C.opens === 'x'
    ? { src: `${lead(L, 'x', C.h)} - ${lead(R, 'y', C.k)} = ${right}`, right }
    : { src: `${lead(R, 'y', C.k)} - ${lead(L, 'x', C.h)} = ${right}`, right };
}

/** "Divide both sides by 400: …" when the equation was given without fractions. */
const divided = (C, form) => (form === 'scaled' ? `Divide both sides by ${scaled(C).right}: ${pretty(standard(C))}. ` : '');

const dirWords = { x: ['across', 'left and right'], y: ['up and down', 'up and down'] };

// --- Which Conic? -------------------------------------------------------------------

const CONICS = [
  { id: 'circle', label: 'Circle' },
  { id: 'ellipse', label: 'Ellipse' },
  { id: 'parabola', label: 'Parabola' },
  { id: 'hyperbola', label: 'Hyperbola' },
];

/** Coefficients of a conic in general form, from its center and squares. */
function coefficients(kind, rng) {
  for (;;) {
    const h = rng.int(-6, 6), k = rng.int(-6, 6);
    if (kind === 'parabola') {
      const p4 = rng.pick([-12, -8, -6, -4, -2, 2, 4, 6, 8, 12]), m = rng.pick([1, 1, 1, 2, 3]);
      const vertical = rng.chance(0.5);
      // (x − h)² = 4p(y − k): x² − 2hx − 4p·y + h² + 4pk = 0, times m.
      const cs = vertical
        ? { A: m, C: 0, D: -2 * h * m, E: -p4 * m, F: m * (h * h + p4 * k) }
        : { A: 0, C: m, D: -p4 * m, E: -2 * k * m, F: m * (k * k + p4 * h) };
      if (Math.abs(cs.F) > 150) continue;
      return { cs: reduce(cs), h, k, vertical, p4 };
    }
    const pick = () => rng.pick([1, 2, 3, 4, 5, 9, 16, 25]);
    let A = pick(), C = pick();
    if (kind === 'circle') C = A;
    if (kind === 'ellipse' && A === C) continue;
    if (kind === 'hyperbola') C = -C;
    const R = (kind === 'circle' ? A * rng.int(1, 6) ** 2 : Math.abs(A * C) * rng.int(1, 4)) * (kind === 'hyperbola' && rng.chance(0.5) ? -1 : 1);
    const cs = { A, C, D: -2 * A * h, E: -2 * C * k, F: A * h * h + C * k * k - R };
    if ([cs.D, cs.E].some((v) => Math.abs(v) > 200) || Math.abs(cs.F) > 900 || (!h && !k)) continue;
    // The standard form's denominators: R/A under x and R/C under y.
    return { cs: reduce(cs), h, k, X: R / A, Y: R / C };
  }
}

function whichConic(rng) {
  const kind = rng.pick(['circle', 'ellipse', 'parabola', 'hyperbola']);
  const form = rng.pick(['general', 'general', 'general', 'general', 'moved', 'moved', 'standard', 'standard']);
  const made = coefficients(kind, rng);
  const { cs } = made;
  let src = general(cs), shown = '';
  if (form === 'standard' || (form === 'moved' && kind === 'parabola')) {
    const { h, k } = made;
    src = kind === 'parabola' ? standard({ kind, axis: made.vertical ? 'v' : 'h', h, k, p4: made.p4 })
      : kind === 'circle' ? `${sq('x', h)} + ${sq('y', k)} = ${made.X}`
        : kind === 'ellipse' ? standard({ kind, h, k, X: made.X, Y: made.Y })
          : standard({ kind, h, k, X: Math.abs(made.X), Y: Math.abs(made.Y), opens: made.X > 0 ? 'x' : 'y' });
    shown = `Multiplied out, it is ${pretty(general(cs))}. `;
  } else if (form === 'moved') {
    // One squared term carried to the other side, where its sign turns.
    const moveY = rng.chance(0.5);
    const left = { ...cs, ...(moveY ? { C: 0, E: 0 } : { A: 0, D: 0 }) };
    const rightTerms = moveY ? [[-cs.C, 'y^2'], [-cs.E, 'y']] : [[-cs.A, 'x^2'], [-cs.D, 'x']];
    const L = general(left).replace(/ = 0$/, '');
    const R = rightTerms.filter(([c]) => c).map(([c, v], i) => `${i ? (c < 0 ? '- ' : '+ ') : c < 0 ? '-' : ''}${Math.abs(c) === 1 ? '' : Math.abs(c)}${v}`).join(' ');
    src = `${L} = ${R}`;
    shown = `Move ${moveY ? 'the y terms' : 'the x terms'} back to the left, where their sign turns: ${pretty(general(cs))}. `;
  }
  const A = cs.A, C = cs.C;
  const why = kind === 'parabola'
    ? `Only ${A ? 'x' : 'y'} is squared; ${A ? 'y' : 'x'} appears only to the first power. One squared letter is a parabola.`
    : kind === 'circle'
      ? `x² and y² are both there with the same coefficient, ${minus(A)}. The same coefficient on both squares is a circle.`
      : kind === 'ellipse'
        ? `x² and y² are both there with the same sign but different coefficients, ${minus(A)} and ${minus(C)}. One sign and unequal coefficients is an ellipse.`
        : `x² and y² are both there with opposite signs, ${minus(A)} and ${minus(C)}. Opposite signs on the squares is a hyperbola.`;
  return {
    prompt: [T.prose('Which conic is'), eq(src), T.prose('?')],
    text: `which conic: ${src}`,
    answer: choice(kind, CONICS.map((o) => [o.id, o.label])),
    visual: null,
    explain: `${shown}${why} So it is ${kind === 'ellipse' ? 'an ellipse' : `a ${kind}`}.`,
  };
}

// --- Parabola Focus & Directrix ---------------------------------------------------------

function parabola(rng, p4s) {
  const axis = rng.pick(['v', 'h']);
  return { kind: 'parabola', axis, h: rng.int(-5, 5), k: rng.int(-5, 5), p4: rng.pick(p4s) };
}
const toward = (P) => (P.axis === 'v' ? (P.p4 > 0 ? 'up' : 'down') : P.p4 > 0 ? 'right' : 'left');
const side = (P) => (P.axis === 'v' ? (P.p4 > 0 ? ['above', 'below'] : ['below', 'above']) : P.p4 > 0 ? ['right of', 'left of'] : ['left of', 'right of']);
function focusOf(P) {
  const p = Q(P.p4, 4);
  return P.axis === 'v' ? [Q(P.h), addQ(Q(P.k), p)] : [addQ(Q(P.h), p), Q(P.k)];
}
const directrixOf = (P) => addQ(Q(P.axis === 'v' ? P.k : P.h), Q(-P.p4, 4));

/** "4p = 8, so p = 2, and it opens up": the reading every parabola question starts with. */
function readParabola(P) {
  const p = Q(P.p4, 4);
  return `The vertex is (${minus(P.h)}, ${minus(P.k)}), and ${P.axis === 'v' ? 'x' : 'y'} is the squared letter, so it opens ${P.axis === 'v' ? 'up or down' : 'left or right'}. `
    + `4p = ${minus(P.p4)}, so p = ${qs(p)}, ${P.p4 > 0 ? 'positive' : 'negative'}: it opens ${toward(P)}.`;
}

function parabolaGraph(P, answer) {
  const win = { x0: -10, x1: 10, y0: -10, y1: 10 };
  return plane(win, curveMarks(P, win), answer(win));
}

function parabolaFocus(rng) {
  const shape = rng.pick(['focus', 'focus', 'focus', 'focus', 'directrix', 'directrix', 'directrix', 'equation', 'equation', 'equation', 'equation']);
  if (shape === 'equation') return parabolaEquation(rng);
  const P = parabola(rng, [-16, -12, -8, -6, -4, -2, 2, 4, 6, 8, 12, 16]);
  const src = standard(P);
  const F = focusOf(P), d = directrixOf(P), p = Q(P.p4, 4);
  const v = P.axis === 'v' ? 'y' : 'x';
  const reveal = (win) => [dot(F, `focus ${pt(...F)}`),
    lineMark(P.axis === 'v' ? [0, qn(d)] : [qn(d), 0], P.axis === 'v' ? [1, 0] : [0, 1], win, { dashed: true, tone: ASKED, label: `${v} = ${qs(d)}` })];
  const [inside, outside] = side(P);
  const dist = qs(Q(Math.abs(P.p4), 4));
  if (shape === 'focus') {
    return {
      prompt: [T.prose('What is the focus of the parabola'), eq(src), T.prose('? Give it as a point.')],
      text: `parabola focus: ${src}`,
      answer: pairAnswer(...F),
      visual: parabolaGraph(P, reveal),
      explain: `${readParabola(P)} The focus is inside the curve, ${dist} ${inside} the vertex: ${pt(...F)}. So the focus is ${pt(...F)}.`,
    };
  }
  return {
    prompt: [T.prose('The directrix of the parabola'), eq(src), T.prose('is the line'), T.letter(v), T.op('='), T.blank(), T.prose('. What number goes in the blank?')],
    text: `parabola directrix: ${src}`,
    answer: fracAnswer(d),
    visual: parabolaGraph(P, reveal),
    explain: `${readParabola(P)} The directrix is outside the curve, ${dist} ${outside} the vertex: ${v} = ${minus(v === 'y' ? P.k : P.h)} ${qn(p) > 0 ? '−' : '+'} ${dist} = ${qs(d)}. So ${v} = ${qs(d)}.`,
  };
}

function parabolaEquation(rng) {
  const P = parabola(rng, [-16, -12, -8, -4, 4, 8, 12, 16]);
  const F = focusOf(P), d = directrixOf(P), p = P.p4 / 4;
  const v = P.axis === 'v' ? 'y' : 'x';
  // Two slips crossed: 4p written as p or with its sign turned (one makes
  // the key the longer label, the other the shorter), and the vertex put at
  // the focus.
  const slip = rng.pick(['p', 'sign']);
  const make = (coefP, atFocus) => standard({ ...P, p4: coefP ? (slip === 'p' ? p : -P.p4) : P.p4, ...(atFocus ? { h: qn(F[0]), k: qn(F[1]) } : {}) });
  const opts = [[make(false, false), 'key'], [make(true, false), 'p'], [make(false, true), 'focus'], [make(true, true), 'both']];
  const order = rng.shuffle([0, 1, 2, 3]);
  const ids = ['a', 'b', 'c', 'd'];
  const key = ids[order.indexOf(0)];
  const listing = order.map((j, i) => `${ids[i]}: ${opts[j][0]}`).join(' | ');
  const [inside] = side(P);
  return {
    prompt: [T.prose(`A parabola has focus ${pt(...F)} and directrix ${v} = ${qs(d)}. Which is its equation?`)],
    text: `parabola equation: focus ${ptA(...F)}; directrix ${v} = ${String(qs(d)).replace('−', '-')}; options ${listing}`,
    answer: choice(key, order.map((j, i) => [ids[i], pretty(opts[j][0])])),
    visual: null,
    explain: `The vertex is halfway between the focus and the directrix: (${minus(P.h)}, ${minus(P.k)}). The focus is ${Math.abs(p)} ${inside} it, so the parabola opens ${toward(P)}, toward the focus, and p = ${minus(p)}: 4p = ${minus(P.p4)}. `
      + `So ${pretty(opts[0][0])}. The others: ${pretty(opts[1][0])} ${slip === 'p' ? 'writes p where 4p goes' : 'turns the sign of 4p, opening away from the focus'}; ${pretty(opts[2][0])} puts the vertex at the focus; ${pretty(opts[3][0])} does both.`,
  };
}

// --- Ellipses ---------------------------------------------------------------------------

function ellipsePoints(E) {
  const { h, k, a, b, c, major } = E;
  const along = (r) => (major === 'x' ? [[h - r, k], [h + r, k]] : [[h, k - r], [h, k + r]]);
  const across = (r) => (major === 'x' ? [[h, k - r], [h, k + r]] : [[h - r, k], [h + r, k]]);
  return { vertices: along(a), foci: along(c), co: across(b) };
}
const listPts = (ps) => ps.map((p) => pt(...p)).join(' and ');

/** "The bigger denominator, 25, is under x: a² = 25 …" */
function readEllipse(E) {
  const [aWay] = dirWords[E.major];
  return `The bigger denominator, ${E.a * E.a}, is under ${E.major}, so the major axis runs ${aWay}: a² = ${E.a * E.a}, a = ${E.a}, and b² = ${E.b * E.b}, b = ${E.b}. The center is (${minus(E.h)}, ${minus(E.k)}).`;
}

function ellipseGraph(E, shown) {
  const P = ellipsePoints(E);
  const win = windowAround([...P.vertices, ...P.co], 2);
  return plane(win, curveMarks(E, win), shown(P));
}

function ellipses(rng) {
  const shape = rng.pick(['foci', 'foci', 'foci', 'foci', 'foci', 'foci', 'foci', 'vertices', 'vertices', 'vertices', 'vertices', 'vertices', 'co', 'co', 'major', 'major', 'major', 'minor', 'minor', 'minor']);
  let E, form;
  do {
    E = ellipse(rng, rng.pick(E_TRIPLES));
    form = rng.chance(0.3) ? 'scaled' : 'std';
  } while (form === 'scaled' && scaled(E).right > 2000);
  const src = form === 'scaled' ? scaled(E).src : standard(E);
  const P = ellipsePoints(E);
  const start = `${divided(E, form)}${readEllipse(E)}`;
  const [aWay] = dirWords[E.major];
  const cWork = `c² = a² − b² = ${E.a * E.a} − ${E.b * E.b} = ${E.c * E.c}, so c = ${E.c}.`;
  if (shape === 'foci') {
    return {
      prompt: [T.prose('What are the foci of the ellipse'), eq(src), T.prose('? Give both as points.')],
      text: `ellipse foci: ${src}`,
      answer: pointsAnswer(P.foci),
      visual: ellipseGraph(E, (Ps) => [...Ps.foci.map((p) => dot(p, pt(...p))), ...Ps.vertices.map((p) => dot(p, null, MARK))]),
      explain: `${start} ${cWork} The foci are ${E.c} either side of the center, ${aWay}: ${listPts(P.foci)}. So the foci are ${listPts(P.foci)}.`,
    };
  }
  if (shape === 'vertices' || shape === 'co') {
    const ends = shape === 'vertices' ? P.vertices : P.co;
    const r = shape === 'vertices' ? E.a : E.b;
    const what = shape === 'vertices' ? 'vertices' : 'co-vertices';
    return {
      prompt: [T.prose(`What are the ${what} of the ellipse`), eq(src), T.prose(`? Give both ends of the ${shape === 'vertices' ? 'major' : 'minor'} axis as points.`)],
      text: `ellipse ${what}: ${src}`,
      answer: pointsAnswer(ends),
      visual: null,
      explain: `${start} The ${what} are ${r} either side of the center, ${shape === 'vertices' ? aWay : dirWords[E.major === 'x' ? 'y' : 'x'][0]}: ${listPts(ends)}. So they are ${listPts(ends)}.`,
    };
  }
  const len = shape === 'major' ? 2 * E.a : 2 * E.b;
  return {
    prompt: [T.prose(`How long is the ${shape} axis of the ellipse`), eq(src), T.prose('?')],
    text: `ellipse ${shape} axis: ${src}`,
    answer: fracAnswer(len),
    visual: null,
    explain: `${start} The ${shape} axis runs from one ${shape === 'major' ? 'vertex' : 'co-vertex'} to the other, ${shape === 'major' ? 'a' : 'b'} each side of the center: 2 × ${shape === 'major' ? E.a : E.b} = ${len}. So it is ${len} long.`,
  };
}

// --- Hyperbolas -------------------------------------------------------------------------

function hyperbolaPoints(H) {
  const { h, k, a, c, opens } = H;
  const along = (r) => (opens === 'x' ? [[h - r, k], [h + r, k]] : [[h, k - r], [h, k + r]]);
  return { vertices: along(a), foci: c === null ? null : along(c) };
}

function readHyperbola(H) {
  const [, way] = dirWords[H.opens];
  return `The ${H.opens} term is the positive one, so it opens ${way}: a² = ${H.a * H.a} is under ${H.opens}, a = ${H.a}, and b² = ${H.b * H.b}, b = ${H.b}. The center is (${minus(H.h)}, ${minus(H.k)}).`;
}

function hyperbolaGraph(H, shown) {
  const P = hyperbolaPoints(H);
  const reach = (H.c ?? Math.hypot(H.a, H.b)) + 2;
  const win = windowAround([[H.h - reach, H.k - reach], [H.h + reach, H.k + reach]], 1);
  const rx = Math.sqrt(H.X), ry = Math.sqrt(H.Y);
  const asymptotes = [[rx, ry], [rx, -ry]].map((dir) => lineMark([H.h, H.k], dir, win, { dashed: true, tone: MARK }));
  return plane(win, curveMarks(H, win), [...asymptotes, ...shown(P)]);
}

function hyperbolas(rng) {
  const shape = rng.pick(['vertices', 'vertices', 'vertices', 'foci', 'foci', 'foci', 'foci', 'slope', 'slope', 'slope', 'slope']);
  let H, form;
  do {
    if (shape === 'foci') H = hyperbola(rng, rng.pick(H_TRIPLES));
    else {
      const a = rng.int(1, 8), b = rng.int(1, 8);
      const c2 = a * a + b * b, c = Math.round(Math.sqrt(c2));
      H = hyperbola(rng, [a, b, c * c === c2 ? c : null]);
    }
    form = rng.chance(0.25) ? 'scaled' : 'std';
  } while ((form === 'scaled' && scaled(H).right > 2000) || (form === 'std' && Math.min(H.X, H.Y) === 1 && rng.chance(0.5)));
  const src = form === 'scaled' ? scaled(H).src : standard(H);
  const P = hyperbolaPoints(H);
  const start = `${divided(H, form)}${readHyperbola(H)}`;
  const [, way] = dirWords[H.opens];
  if (shape === 'foci') {
    return {
      prompt: [T.prose('What are the foci of the hyperbola'), eq(src), T.prose('? Give both as points.')],
      text: `hyperbola foci: ${src}`,
      answer: pointsAnswer(P.foci),
      visual: hyperbolaGraph(H, (Ps) => [...Ps.foci.map((p) => dot(p, pt(...p))), ...Ps.vertices.map((p) => dot(p, null, MARK))]),
      explain: `${start} For a hyperbola c² = a² + b² = ${H.a * H.a} + ${H.b * H.b} = ${H.c * H.c}, so c = ${H.c}. The foci are ${H.c} either side of the center, ${way}, beyond the vertices: ${listPts(P.foci)}. So the foci are ${listPts(P.foci)}.`,
    };
  }
  if (shape === 'vertices') {
    return {
      prompt: [T.prose('What are the vertices of the hyperbola'), eq(src), T.prose('? Give both as points.')],
      text: `hyperbola vertices: ${src}`,
      answer: pointsAnswer(P.vertices),
      visual: null,
      explain: `${start} The vertices are a = ${H.a} either side of the center, ${way}: ${listPts(P.vertices)}. So they are ${listPts(P.vertices)}.`,
    };
  }
  const m = H.opens === 'x' ? Q(H.b, H.a) : Q(H.a, H.b);
  const lhs = H.k === 0 ? 'y' : `y ${H.k < 0 ? '+' : '−'} ${Math.abs(H.k)}`;
  const rhs = H.h === 0 ? '±mx' : `±m(x ${H.h < 0 ? '+' : '−'} ${Math.abs(H.h)})`;
  const rise = H.opens === 'x' ? `b/a = ${H.b}/${H.a}` : `a/b = ${H.a}/${H.b}`;
  return {
    prompt: [T.prose('The asymptotes of the hyperbola'), eq(src), T.prose(`are ${lhs} = ${rhs}. What is m?`)],
    text: `hyperbola asymptote slope: ${src}`,
    answer: fracAnswer(m),
    visual: hyperbolaGraph(H, (Ps) => Ps.vertices.map((p) => dot(p, pt(...p)))),
    explain: `${start} The asymptotes cross at the center, and from it they go ${H.opens === 'x' ? 'a across for every b up' : 'b across for every a up'}: a slope of ±${rise}. So m = ${qs(m)}.`,
  };
}

// --- Writing the Equation -----------------------------------------------------------------

function writing(rng) {
  const kind = rng.pick(['ellipse', 'hyperbola']);
  const C = kind === 'ellipse' ? ellipse(rng, rng.pick(E_TRIPLES)) : hyperbola(rng, rng.pick(H_TRIPLES));
  const axis = kind === 'ellipse' ? C.major : C.opens;
  const P = kind === 'ellipse' ? ellipsePoints(C) : hyperbolaPoints(C);
  // requiem: catalogue/content/conic-from-its-locus
  // From the center, a vertex and a focus; from both vertices and both foci;
  // or from the definition, the foci and the constant sum (an ellipse) or
  // difference (a hyperbola) of the distances to them, which is 2a.
  const given = rng.pick(['center', 'center', 'center', 'both', 'both', 'locus', 'locus']);
  const both = given === 'both';
  const locus = given === 'locus';
  const side = rng.int(0, 1);
  // Two slips crossed: b² by the other conic's rule, and a² put under the
  // letter the vertex does not lie along.
  const b2 = (wrongRule) => (kind === 'ellipse' ? C.a * C.a + (wrongRule ? 1 : -1) * C.c * C.c : C.c * C.c + (wrongRule ? 1 : -1) * C.a * C.a);
  const make = (wrongRule, swapped) => {
    const ax = swapped ? (axis === 'x' ? 'y' : 'x') : axis;
    const A2 = C.a * C.a, B2 = b2(wrongRule);
    return standard({ ...C, X: ax === 'x' ? A2 : B2, Y: ax === 'x' ? B2 : A2, major: ax, opens: ax });
  };
  const opts = [make(false, false), make(true, false), make(false, true), make(true, true)];
  const order = rng.shuffle([0, 1, 2, 3]);
  const ids = ['a', 'b', 'c', 'd'];
  const key = ids[order.indexOf(0)];
  const listing = order.map((j, i) => `${ids[i]}: ${opts[j]}`).join(' | ');
  const rule = kind === 'ellipse' ? `b² = a² − c² = ${C.a * C.a} − ${C.c * C.c} = ${C.b * C.b}` : `b² = c² − a² = ${C.c * C.c} − ${C.a * C.a} = ${C.b * C.b}`;
  const otherRule = kind === 'ellipse' ? 'b² = a² + c², adding where an ellipse takes away' : 'b² = c² + a², adding where a hyperbola takes away';
  const dirTxt = axis === 'x' ? 'to its left or right' : 'above or below it';
  const told = locus
    ? `foci ${ptA(...P.foci[0])} and ${ptA(...P.foci[1])}; ${kind === 'ellipse' ? 'sum' : 'difference'} ${2 * C.a}`
    : both
      ? `vertices ${ptA(...P.vertices[0])} and ${ptA(...P.vertices[1])}; foci ${ptA(...P.foci[0])} and ${ptA(...P.foci[1])}`
      : `center ${ptA(C.h, C.k)}; vertex ${ptA(...P.vertices[side])}; focus ${ptA(...P.foci[1 - side])}`;
  const words = both
    ? `vertices ${listPts(P.vertices)} and foci ${listPts(P.foci)}`
    : `center (${minus(C.h)}, ${minus(C.k)}), a vertex at ${pt(...P.vertices[side])} and a focus at ${pt(...P.foci[1 - side])}`;
  const ask = locus
    ? (kind === 'ellipse'
      ? `An ellipse is every point whose distances from ${listPts(P.foci)} add to ${2 * C.a}. Which is its equation?`
      : `A hyperbola is every point whose distances from ${listPts(P.foci)} differ by ${2 * C.a}. Which is its equation?`)
    : `${kind === 'ellipse' ? 'An ellipse' : 'A hyperbola'} has ${words}. Which is its equation?`;
  const start = locus
    ? `Those two points are the foci. The center is halfway between them, (${minus(C.h)}, ${minus(C.k)}), and they are ${C.c} from it, ${axis === 'x' ? 'to its left and right' : 'above and below it'}, so c = ${C.c}. `
      + `At a vertex the two distances are ${kind === 'ellipse' ? 'a + c and a − c, which add to 2a' : 'c + a and c − a, which differ by 2a'}, so 2a = ${2 * C.a}, a = ${C.a}, and a² = ${C.a * C.a} goes under ${axis}. `
      + `For ${kind === 'ellipse' ? 'an ellipse' : 'a hyperbola'} ${rule}.`
    : `${both ? `The center is halfway between the vertices: (${minus(C.h)}, ${minus(C.k)}). ` : ''}The vertices are ${C.a} from the center, ${dirTxt}, so a = ${C.a} and a² = ${C.a * C.a} goes under ${axis}. `
      + `The foci are ${C.c} from it, so c = ${C.c}, and for ${kind === 'ellipse' ? 'an ellipse' : 'a hyperbola'} ${rule}.`;
  return {
    prompt: [T.prose(ask)],
    text: `conic equation: ${kind}; ${told}; options ${listing}`,
    answer: choice(key, order.map((j, i) => [ids[i], pretty(opts[j])])),
    visual: null,
    explain: `${start} So ${pretty(opts[0])}. `
      + `The others: ${pretty(opts[1])} takes ${otherRule}; ${pretty(opts[2])} puts a² under ${axis === 'x' ? 'y' : 'x'}; ${pretty(opts[3])} does both.`,
  };
}

// --- Completing the Square ---------------------------------------------------------------

/** a·v + b as written in working: 8y − 28, −y, 4x + 3, 12. */
function linear(a, v, b) {
  const head = a === 0 ? '' : `${a === 1 ? '' : a === -1 ? '−' : minus(a)}${v}`;
  if (!b) return head || '0';
  return head ? `${head} ${b < 0 ? '−' : '+'} ${Math.abs(b)}` : minus(b);
}
/** A·(v² − 2c·v), the group before its square is completed: 4(x² − 4x), − 9(y² + 6y). */
function group(A, v, c, first) {
  const inner = `(${v}² ${c > 0 ? '−' : '+'} ${Math.abs(2 * c)}${v})`;
  const n = Math.abs(A);
  const lead = n === 1 ? '' : String(n);
  return first ? `${A < 0 ? '−' : ''}${lead}${inner}` : `${A < 0 ? '−' : '+'} ${lead}${inner}`;
}
/** A·(v − c)², the square completed: 4(x − 2)², − 9(y + 3)². */
function square(A, v, c, first) {
  const n = Math.abs(A);
  const body = `${n === 1 ? '' : n}(${said(v, c)})²`;
  return first ? `${A < 0 ? '−' : ''}${body}` : `${A < 0 ? '−' : '+'} ${body}`;
}

function completing(rng) {
  const kind = rng.pick(['ellipse', 'ellipse', 'ellipse', 'ellipse', 'hyperbola', 'hyperbola', 'hyperbola', 'parabola', 'parabola', 'parabola']);
  let made, cs, h, k;
  do {
    made = coefficients(kind, rng);
    ({ cs, h, k } = made);
  } while (!h || !k);
  const src = general(cs);
  if (kind === 'parabola') {
    const vertical = made.vertical;
    const m = vertical ? cs.A : cs.C;
    const one = Object.fromEntries(Object.entries(cs).map(([key, v]) => [key, v / m]));
    const [sv, lv] = vertical ? ['x', 'y'] : ['y', 'x'];
    const c = vertical ? h : k;
    const linSq = vertical ? one.D : one.E, p4 = -(vertical ? one.E : one.D);
    return {
      prompt: [T.prose('What is the vertex of the parabola'), eq(src), T.prose('? Give it as a point.')],
      text: `vertex of parabola: ${src}`,
      answer: pairAnswer(h, k),
      visual: null,
      explain: `${m === 1 ? '' : `Divide through by ${m}: ${pretty(general(one))}. `}Keep the ${sv} terms on the left and move the rest across: ${sv}² ${linSq < 0 ? '−' : '+'} ${Math.abs(linSq)}${sv} = ${linear(p4, lv, -one.F)}. `
        + `Add ${c * c} to both sides to complete the square: (${said(sv, c)})² = ${linear(p4, lv, -one.F + c * c)} = ${pretty(times(p4, lv, vertical ? k : h))}. So the vertex is (${minus(h)}, ${minus(k)}).`,
    };
  }
  const total = -cs.F + cs.A * h * h + cs.C * k * k;
  return {
    prompt: [T.prose(`What is the center of the ${kind}`), eq(src), T.prose('? Give it as a point.')],
    text: `center of ${kind}: ${src}`,
    answer: pairAnswer(h, k),
    visual: null,
    explain: `Group the x terms and the y terms, and move the number across: ${group(cs.A, 'x', h, true)} ${group(cs.C, 'y', k, false)} = ${minus(-cs.F)}. `
      + `Completing each square adds ${minus(cs.A)} × ${h * h} = ${minus(cs.A * h * h)} and ${minus(cs.C)} × ${k * k} = ${minus(cs.C * k * k)} to the left, so add them to the right too: `
      + `${square(cs.A, 'x', h, true)} ${square(cs.C, 'y', k, false)} = ${minus(total)}. So the center is (${minus(h)}, ${minus(k)}).`,
  };
}

// --- Match the Graph -----------------------------------------------------------------------

// requiem: catalogue/content/conic-graphs-drawn-from-their-equation
function matching(rng) {
  const kind = rng.pick(['ellipse', 'ellipse', 'ellipse', 'ellipse', 'hyperbola', 'hyperbola', 'hyperbola', 'hyperbola', 'parabola', 'parabola', 'parabola']);
  const win = { x0: -10, x1: 10, y0: -10, y1: 10 };
  let C;
  for (;;) {
    const h = rng.sign() * rng.int(1, 4), k = rng.sign() * rng.int(1, 4);
    if (kind === 'parabola') {
      C = { kind, axis: rng.pick(['v', 'h']), h, k, p4: rng.pick([-8, -4, -2, 2, 4, 8]) };
      break;
    }
    const rx = rng.int(1, 6), ry = rng.int(1, 6);
    if (rx === ry) continue;
    if (kind === 'ellipse' && (Math.abs(h) + rx > 9 || Math.abs(k) + ry > 9)) continue;
    C = { kind, h, k, X: rx * rx, Y: ry * ry, opens: rng.pick(['x', 'y']) };
    break;
  }
  // Two slips crossed: the shape turned the other way (a² and b² swapped for an
  // ellipse, the other term positive for a hyperbola, 4p's sign for a
  // parabola), and the center read with its signs turned.
  const make = (turned, negated) => {
    const D = { ...C, ...(negated ? { h: -C.h, k: -C.k } : {}) };
    if (!turned) return standard(D);
    if (C.kind === 'ellipse') return standard({ ...D, X: C.Y, Y: C.X });
    if (C.kind === 'hyperbola') return standard({ ...D, opens: C.opens === 'x' ? 'y' : 'x' });
    return standard({ ...D, p4: -C.p4 });
  };
  const opts = [make(false, false), make(true, false), make(false, true), make(true, true)];
  const order = rng.shuffle([0, 1, 2, 3]);
  const ids = ['a', 'b', 'c', 'd'];
  const key = ids[order.indexOf(0)];
  const listing = order.map((j, i) => `${ids[i]}: ${opts[j]}`).join(' | ');
  const center = [C.h, C.k];
  let marks = [], why, drawn;
  if (kind === 'parabola') {
    const P = C, F = focusOf(P);
    drawn = `vertex ${ptA(...center)}; focus ${ptA(...F)}`;
    const [sv, lv] = P.axis === 'v' ? ['x', 'y'] : ['y', 'x'];
    const gone = Q(4, Math.abs(P.p4));
    marks = [dot(center, `vertex ${pt(...center)}`), dot(F, `focus ${pt(...F)}`, MARK)];
    why = `The vertex is (${minus(C.h)}, ${minus(C.k)}), and it opens ${toward(P)}, so ${sv} is the squared letter and 4p is ${P.p4 > 0 ? 'positive' : 'negative'}. `
      + `2 ${P.axis === 'v' ? 'across' : 'up'} from the vertex the curve has gone ${qs(gone)} ${toward(P)}, so 2² = 4p × ${qs(Q(4, P.p4))} and 4p = ${minus(P.p4)}: (${said(sv, P.axis === 'v' ? C.h : C.k)})² = ${pretty(times(P.p4, lv, P.axis === 'v' ? C.k : C.h))}.`;
  } else {
    const rx = Math.sqrt(C.X), ry = Math.sqrt(C.Y);
    const ends = C.kind === 'ellipse'
      ? [[C.h - rx, C.k], [C.h + rx, C.k], [C.h, C.k - ry], [C.h, C.k + ry]]
      : C.opens === 'x' ? [[C.h - rx, C.k], [C.h + rx, C.k]] : [[C.h, C.k - ry], [C.h, C.k + ry]];
    marks = [dot(center, `center ${pt(...center)}`), ...ends.map((p) => dot(p, null, MARK))];
    drawn = `center ${ptA(...center)}; through ${ends.map((p) => ptA(...p)).join(', ')}`;
    why = C.kind === 'ellipse'
      ? `The center is (${minus(C.h)}, ${minus(C.k)}): ${said('x', C.h)} and ${said('y', C.k)}. It reaches ${rx} across and ${ry} up and down, so ${C.X} is under x and ${C.Y} under y.`
      : `The center is (${minus(C.h)}, ${minus(C.k)}): ${said('x', C.h)} and ${said('y', C.k)}. It opens ${dirWords[C.opens][1]}, so the ${C.opens} term is the positive one, and its vertices are ${C.opens === 'x' ? rx : ry} from the center, so ${C.opens === 'x' ? C.X : C.Y} is under ${C.opens}.`;
  }
  const turnedWords = kind === 'ellipse' ? 'is the ellipse turned on its side' : kind === 'hyperbola' ? 'opens the other way' : 'opens the other way';
  return {
    prompt: [T.prose('Which equation has this graph?')],
    // What the drawing shows is in the text too, so two graphs offered the
    // same four equations are two problems.
    text: `conic graph: ${kind}; ${drawn}; options ${listing}`,
    answer: choice(key, order.map((j, i) => [ids[i], pretty(opts[j])])),
    visual: plane(win, curveMarks(C, win), marks),
    explain: `${why} So ${pretty(opts[0])}. The others: ${pretty(opts[1])} ${turnedWords}; ${pretty(opts[2])} turns the center's signs, ${kind === 'parabola' ? 'with its vertex at' : 'centered at'} (${minus(-C.h)}, ${minus(-C.k)}); ${pretty(opts[3])} does both.`,
  };
}

const CONTENT = [whichConic, parabolaFocus, ellipses, hyperbolas, writing, completing, matching];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  // requiem: catalogue/content/one-input-per-level
  // A point goes in the pair box and two points in the points box, each
  // asked "as a point" or "both as points"; a length, a slope and the
  // number in a directrix go in the fraction box, which says nothing of
  // whether the number is whole.
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
