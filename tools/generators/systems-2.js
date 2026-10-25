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
const meetText = (pts) => (pts.length ? pts.map(ptText).join(' and ') : 'none');

/** One equation in one piece in the sentence, drawn as the expression box draws it. */
const eq = (src) => {
  const r = previewOf(src);
  if (!r.ok) throw new Error(`cannot draw ${src}`);
  return T.math(r.terms);
};
/** ASCII with real minus signs, for prose. */
const pretty = (s) => s.replace(/\^2/g, '²').replace(/ - /g, ' − ').replace(/(^|[(= ])-/g, '$1−');

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

// --- Line Meets Parabola --------------------------------------------------------------

/** A parabola and a line through chosen meeting points: two, one or none. */
function parabolaAndLine(rng, outcome) {
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
    if (pts.some(([, y]) => Math.abs(qn(y)) > 40)) continue;
    return { a, b, c, m, k, pts };
  }
}

function lineParabola(rng) {
  const outcome = rng.pick(['two', 'two', 'two', 'two', 'two', 'two', 'one', 'one', 'none', 'none']);
  // The line as y = mx + k, or as mx − y = −k for a student to solve first,
  // or the parabola in vertex form, to be multiplied out first.
  const form = rng.pick(['slope', 'slope', 'slope', 'slope', 'std', 'std', 'std', 'vertex', 'vertex', 'vertex']);
  let made;
  do made = parabolaAndLine(rng, outcome);
  while ((form === 'vertex' && made.b % (2 * made.a) !== 0) || (form === 'std' && made.m === 0));
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
    visual: null,
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
      // Distance from the center against the radius, squared.
      const d2n = line.c * line.c, d2d = line.a * line.a + line.b * line.b;
      prompt = [T.prose('How many points do the circle'), eq(circ), T.prose('and the line'), eq(line.src), T.prose('have in common?')];
      text = `how many circle: ${circ}; ${line.src}`;
      explain = `The line's distance from the center (0, 0) is |${minus(line.c)}|/√(${line.a}² + ${line.b < 0 ? `(${minus(line.b)})` : line.b}²), whose square is ${d2n}/${d2d}${d2n % d2d === 0 ? ` = ${d2n / d2d}` : ''}, against the radius squared, ${R}: `
        + `${d2n < R * d2d ? 'closer than the radius, so it cuts the circle twice' : d2n === R * d2d ? 'exactly the radius, so it only touches' : 'farther than the radius, so it misses'}. (Putting the line into the circle gives a quadratic with ${outcome === 'two' ? 'a positive' : outcome === 'one' ? 'a zero' : 'a negative'} discriminant.)`;
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
    // Working: solve the line for the letter with coefficient ±1 if there is
    // one, put it into the circle, and show the quadratic that is left.
    const useY = line.b !== 0 && (Math.abs(line.b) === 1 || Math.abs(line.a) !== 1);
    let work, quad, v;
    if (line.b === 0) {
      const x0 = line.c / line.a;
      v = 'y';
      quad = [k * k + (x0 - h) ** 2 - R, -2 * k, 1];
      work = `Put x = ${minus(x0)} into the circle`;
    } else {
      // u = p·v + q, every number over the same bottom e.
      const [cu, cv, u] = useY ? [line.b, line.a, 'y'] : [line.a, line.b, 'x'];
      v = useY ? 'x' : 'y';
      const e = Math.abs(cu), sg = Math.sign(cu), pn = -cv * sg, qn0 = line.c * sg;
      const [hu, hv] = useY ? [k, h] : [h, k];
      // (p·v + q − hu)² + (v − hv)² = R, times e²:
      // (pn·v + qn0 − e·hu)² + e²(v − hv)² = e²R.
      const r0 = qn0 - e * hu;
      quad = [r0 * r0 + e * e * hv * hv - e * e * R, 2 * pn * r0 - 2 * e * e * hv, pn * pn + e * e];
      const g = Math.abs(gcd(gcd(quad[0], quad[1]), quad[2])) || 1;
      quad = quad.map((c) => c / g);
      const solvedFor = e === 1 ? pretty(poly([qn0, pn], v)) : `(${pretty(poly([qn0, pn], v))})/${e}`;
      work = `Solve the line for ${u}, ${u} = ${solvedFor}, and put it into the circle`;
    }
    const ys = pts.length ? ` Each ${v}, put back into the line, gives its point: ${meetText(pts)}.` : '';
    return {
      prompt: [T.prose('Where do the line'), eq(lineSrc), T.prose('and the circle'), eq(circ), T.prose('meet?'),
        T.prose('Give every point where they meet, or none if they do not meet.')],
      text: `meet: ${circ}; ${lineSrc}`,
      answer: pointsAnswer(pts),
      visual: null,
      explain: `${work}: multiplied out and brought to one side, ${solved(quad[2], quad[1], quad[0], v)}.${ys} `
        + `So ${pts.length ? `they meet at ${meetText(pts)}` : 'they do not meet: none'}.`,
    };
  }
}

// --- Two Curves ---------------------------------------------------------------------

function twoCurves(rng) {
  const kind = rng.pick(['parabolas', 'circle', 'xy']);
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
      if (pts.some(([, y]) => Math.abs(y) > 50)) continue;
      const f = `y = ${poly([c1, b1, a1])}`, g = `y = ${poly([c2, b2, a2])}`;
      const ys = pts.length ? ` Then y from either: ${pts.map(([x, y]) => `x = ${minus(x)} gives y = ${minus(y)}`).join(', and ')}.` : '';
      return {
        prompt: [T.prose('Where do'), eq(f), T.prose('and'), eq(g), T.prose('meet?'),
          T.prose('Give every point where they meet, or none if they do not meet.')],
        text: `meet: ${f}; ${g}`,
        answer: pointsAnswer(pts),
        visual: null,
        explain: `Set the two y's equal and bring everything to one side: ${solved(d, D1, D0)}.${ys} So ${pts.length ? `they meet at ${meetText(pts)}` : 'they do not meet: none'}.`,
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
        visual: null,
        explain: `The parabola gives x² = ${pretty(s > 0 ? poly([-c, 1], 'y') : poly([c, -1], 'y'))}. Put that into the circle: ${pretty(s > 0 ? poly([-c, 1], 'y') : poly([c, -1], 'y'))} + ${k0 ? `(y ${k0 < 0 ? '+' : '−'} ${Math.abs(k0)})²` : 'y²'} = ${R}, so ${solved(1, s - 2 * k0, k0 * k0 - s * c - R, 'y')}. `
          + `${kept.join('; ')}. So they meet at ${meetText(pts.sort((p, q) => p[0] - q[0] || p[1] - q[1]))}.`,
      };
    }
  }
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
    const ys = pts.length ? ` Each x, put back into the line, gives its y: ${meetText(pts)}.` : '';
    return {
      prompt: [T.prose('Where do'), eq(xs), T.prose('and'), eq(lineSrc), T.prose('meet?'),
        T.prose('Give every point where they meet, or none if they do not meet.')],
      text: `meet: ${xs}; ${lineSrc}`,
      answer: pointsAnswer(pts),
      visual: null,
      explain: `${sum ? `The line gives y = ${pretty(poly([Number(lineSrc.split(' = ')[1]), -1]))}` : `The line gives y = ${pretty(lineSrc.split(' = ')[1])}`}; put it into xy = ${minus(k)} and bring everything to one side: ${solved(1, quad[1], quad[0])}.${ys} `
        + `So ${pts.length ? `they meet at ${meetText(pts)}` : 'they do not meet: none'}.`,
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

/** Eliminate x with the first equation, then y, in words, for an explanation. */
function eliminate(M, D, sol, vs = ['x', 'y', 'z']) {
  const [r1] = M;
  const a = r1[0];
  // (a/g)·r − (r[0]/g)·r1 with g their common factor, x gone, then reduced;
  // a negative a turns both round so the row being kept is never negated.
  const comb = (r, d) => {
    const g = gcd(a, r[0]) || 1, s = Math.sign(a) || 1;
    const ka = Math.abs(a) / g, kr = (s * r[0]) / g;
    const row = [0, ka * r[1] - kr * r1[1], ka * r[2] - kr * r1[2]], dd = ka * d - kr * D[0];
    const h = gcd(gcd(row[1], row[2]), dd) || 1;
    return [row.map((v) => v / h), dd / h, ka, kr];
  };
  const [e2, d2, ka2, kr2] = comb(M[1], D[1]);
  const [e3, d3, ka3, kr3] = comb(M[2], D[2]);
  const times = (k) => (k === 1 ? '' : `${k} × `);
  const say = (ka, kr, n) => (kr === 0 ? `the ${n} has no ${vs[0]} already and` : `${times(ka)}the ${n} ${kr < 0 ? '+' : '−'} ${times(Math.abs(kr))}the first`);
  // Then y out of the pair, the same way.
  const g = gcd(e2[1], e3[1]) || 1;
  let zc = (e3[1] / g) * e2[2] - (e2[1] / g) * e3[2], zd = (e3[1] / g) * d2 - (e2[1] / g) * d3;
  const hz = gcd(zc, zd) || 1;
  zc /= hz; zd /= hz;
  if (zc < 0) { zc = -zc; zd = -zd; }
  const zSaid = zc === 1 ? `${vs[2]} = ${minus(zd)}` : `${zc}${vs[2]} = ${minus(zd)}, so ${vs[2]} = ${minus(sol[2])}`;
  return `Take ${vs[0]} out with the first equation: ${say(ka2, kr2, 'second')} gives ${pretty(eq3(e2, d2, vs))}, and ${say(ka3, kr3, 'third')} gives ${pretty(eq3(e3, d3, vs))}. `
    + `Taking ${vs[1]} out of that pair leaves ${zSaid}; then ${vs[1]} = ${minus(sol[1])} from the pair, and ${vs[0]} = ${minus(sol[0])} from the first.`;
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

function word(rng) {
  const kind = rng.pick(['tickets', 'tickets', 'coins', 'coins', 'snacks', 'snacks', 'numbers', 'numbers']);
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
      const money = (c) => `$${(c / 100).toFixed(2)}`;
      const sol = price.map((p) => p / 100);
      const dollars = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(2));
      return {
        prompt: [T.prose(`At a snack stand, ${say(orders[0])} cost ${money(totals[0])}; ${say(orders[1])} cost ${money(totals[1])}; and ${say(orders[2])} cost ${money(totals[2])}. `
          + 'What does each item cost, in dollars? Give (s, d, c): a sandwich, a drink, a bag of chips.')],
        text: `snacks: ${orders.map((o, i) => `${o.join(' ')} for ${totals[i]}`).join('; ')}`,
        answer: pointsAnswer([price.map((p) => Q(p, 100))], 3),
        visual: null,
        explain: `In cents, so every number is whole: ${orders.map((o, i) => pretty(eq3(o, totals[i], ['s', 'd', 'c']))).join(', ')}. `
          + `${eliminate(orders, totals, price, ['s', 'd', 'c'])} In dollars, (s, d, c) = (${sol.map(dollars).join(', ')}).`,
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
