/**
 * Catalogue authoring tool: builds the problem library for ineq-graphs.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 *
 * Every `text` carries the inequalities in plain ASCII (<= for ≤), so
 * scripts/check-answers.py can test the points, or the sides, for itself.
 *
 * Shading is a polygon worked out here -- the grid square cut by the
 * boundary line -- so the plane only fills the corners it is given.
 */
import * as T from '../terms.js';
import { minus, signed } from '../../web/ui/dom.js';
import { previewOf } from '../../web/ui/express.js';
import { getType } from '../../web/math/answer.js';
import { ratio, clip, lineText } from '../lines.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/ineq-graphs.js';

const SPAN = 10;
const PLANE = { xRange: [-SPAN, SPAN], yRange: [-SPAN, SPAN], grid: 1 };
const LINE = 'var(--vec-1)', OTHER = 'var(--vec-3)', GUIDE = 'var(--dim)';
const SIGN = { '<': '<', '<=': '≤', '>': '>', '>=': '≥' };
const FLIP = { '<': '>', '<=': '>=', '>': '<', '>=': '<=' };
const math = (src) => T.math(previewOf(src).terms);
const pt = ([x, y]) => `(${minus(x)}, ${minus(y)})`;
const strict = (op) => op.length === 1;
const up = (op) => op[0] === '>';

/**
 * A half-plane: y op m·x + k, with m a fraction, or x op c for an upright
 * edge. Whole-number intercepts and small denominators, so the line can be
 * read off the grid.
 */
function halfPlane(rng, { slopes = [[1, 1], [2, 1], [3, 1], [1, 2], [1, 3], [2, 3], [3, 2], [0, 1]], upright = 0 } = {}) {
  const op = rng.pick(['<', '<=', '>', '>=']);
  if (rng.chance(upright)) return { x: rng.nonZero(-7, 7), op };
  const [n, d] = rng.pick(slopes);
  return { m: ratio(n * (n === 0 ? 1 : rng.sign()), d), k: rng.int(-6, 6), op };
}

/** y − (m·x + k), times m's denominator so it stays whole at whole points. */
const gap = (h, [x, y]) => ('x' in h ? x - h.x : h.m.d * y - h.m.n * x - h.m.d * h.k);
const keeps = (h, p) => ({ '<': (v) => v < 0, '<=': (v) => v <= 0, '>': (v) => v > 0, '>=': (v) => v >= 0 })[h.op](gap(h, p));

/** The answer-type value, and the inequality written in ASCII and in type. */
const valueOf = (h) => ('x' in h ? { x: ratio(h.x, 1), op: h.op } : { m: h.m, b: ratio(h.k, 1), op: h.op });
const shown = (h) => getType('halfplane').format(valueOf(h));
const ascii = (h) => shown(h).replace(/−/g, '-').replace(/≤/g, '<=').replace(/≥/g, '>=');
/**
 * The inequality in running text. A fractional slope is bracketed, (3/2)x,
 * because "3/2x" in a sentence reads as three over 2x; the typed form the
 * answer box and the plain-text checker read keeps 3/2x.
 */
const said = (h) => ('x' in h ? `x ${SIGN[h.op]} ${minus(h.x)}`
  : `y ${SIGN[h.op]} ${lineText(h.m, ratio(h.k, 1)).slice(4)}`);
/** 1 hour, 2 hours: a count with its noun, singular for one. */

/** The boundary, drawn as the inequality says: dashed when it is left out. */
function edge(h, { tone = LINE, style = true, label } = {}) {
  const [from, to] = 'x' in h ? [[h.x, -SPAN], [h.x, SPAN]] : clip(h.m, ratio(h.k, 1), SPAN);
  return { kind: 'segment', from, to, tone: style ? tone : GUIDE, ...(style && strict(h.op) ? { dashed: true } : {}),
    ...(label ? { label } : {}) };
}

// requiem: catalogue/content/boundary-question-marks-points
/**
 * Two whole-number points on the boundary, for a question about how the
 * boundary is drawn. Not the line itself: a neutral line under the answer's
 * dashed one shows through its gaps on reveal, and a dashed edge then looks
 * solid -- the one thing these levels exist to teach. The points say where
 * the line runs and the reveal draws it, dashed or solid, through them.
 */
function guide(h) {
  if ('x' in h) return [[h.x, -3], [h.x, 3]].map((at) => ({ kind: 'point', at, tone: GUIDE }));
  const on = [0, 1, -1, 2, -2, 3, -3].map((i) => i * h.m.d).map((x) => [x, h.m.n * x / h.m.d + h.k])
    .filter(([, y]) => Math.abs(y) <= 9).slice(0, 2);
  if (on.length < 2) throw new Error('boundary leaves the grid');
  return on.map((at) => ({ kind: 'point', at, tone: GUIDE }));
}

/** The grid square, cut down to the half (or halves) kept. Sutherland–Hodgman. */
function region(halves, tone) {
  let poly = [[-SPAN, -SPAN], [SPAN, -SPAN], [SPAN, SPAN], [-SPAN, SPAN]];
  for (const h of halves) {
    const side = (p) => gap(h, p) * (up(h.op) ? 1 : -1);
    const out = [];
    poly.forEach((p, i) => {
      const q = poly[(i + 1) % poly.length];
      const a = side(p), b = side(q);
      if (a >= 0) out.push(p);
      if ((a >= 0) !== (b >= 0)) {
        const t = a / (a - b);
        out.push([+(p[0] + t * (q[0] - p[0])).toFixed(3), +(p[1] + t * (q[1] - p[1])).toFixed(3)]);
      }
    });
    poly = out;
  }
  return { kind: 'region', points: poly, tone };
}

function isSolution(rng) {
  const h = halfPlane(rng, { upright: 0.1 });
  let p;
  if (rng.chance(0.25)) {
    // On the line itself: the one place ≤ and < disagree.
    const x = 'x' in h ? h.x : h.m.d * rng.int(-3, 3);
    p = 'x' in h ? [h.x, rng.int(-8, 8)] : [x, h.m.n * x / h.m.d + h.k];
  } else p = [rng.int(-8, 8), rng.int(-8, 8)];
  if (Math.abs(p[1]) > 9) return isSolution(rng);
  const yes = keeps(h, p);
  const onLine = gap(h, p) === 0;
  const rhs = 'x' in h ? null : (h.m.n * p[0]) / h.m.d + h.k;
  const check = 'x' in h ? `${minus(p[0])} ${SIGN[h.op]} ${minus(h.x)}`
    : `${minus(p[1])} ${SIGN[h.op]} ${minus(rhs)}`;
  return {
    prompt: [T.prose(`Does ${pt(p)} make`), math(ascii(h)), T.prose('true?')],
    text: `solution? ${pt(p).replace(/−/g, '-')} of ${ascii(h)}`,
    answer: { type: 'choice', value: yes ? 'yes' : 'no', options: [
      { id: 'yes', label: 'Yes', note: 'it makes the inequality true' },
      { id: 'no', label: 'No', note: 'it makes it false' }] },
    visual: { kind: 'plane', ...PLANE,
      marks: [edge(h), { kind: 'point', at: p, label: pt(p), tone: 'var(--vec-2)' }],
      answer: [region([h], LINE)] },
    explain: ('x' in h
      ? `Only x matters: is ${check}? `
      : h.m.n === 0
        ? `The line is y = ${minus(h.k)} everywhere, whatever x is. Is y = ${check}? `
        : `Work out the right side at x = ${minus(p[0])}: ${h.m.d === 1 ? minus(h.m.n) : `(${minus(h.m.n)}/${h.m.d})`} × ${signed(p[0])}`
          + `${h.k === 0 ? '' : ` ${h.k < 0 ? '−' : '+'} ${Math.abs(h.k)}`} = ${minus(rhs)}. Is y = ${check}? `)
      + `${yes ? 'Yes' : 'No'}, so ${pt(p)} ${yes ? 'is' : 'is not'} a solution, and ${yes ? 'is' : 'is not'} in the shaded half.`
      + (onLine ? ` It is on the line itself, which ${strict(h.op) ? 'a strict < or > leaves out' : '≤ and ≥ keep'}.` : ''),
  };
}

const DRAWN = [
  { id: 'dashed-above', label: 'Dashed line, shade above' },
  { id: 'dashed-below', label: 'Dashed line, shade below' },
  { id: 'solid-above', label: 'Solid line, shade above' },
  { id: 'solid-below', label: 'Solid line, shade below' },
];
const drawnAs = (h) => `${strict(h.op) ? 'dashed' : 'solid'}-${up(h.op) ? 'above' : 'below'}`;

function dashedOrSolid(rng) {
  const h = halfPlane(rng);
  const id = drawnAs(h);
  return {
    prompt: [T.prose('How is'), math(ascii(h)), T.prose('drawn on a graph?')],
    text: `drawn: ${ascii(h)}`,
    answer: { type: 'choice', value: id, options: DRAWN },
    visual: { kind: 'plane', ...PLANE, marks: guide(h), answer: [region([h], LINE), edge(h)] },
    explain: `${SIGN[h.op]} ${strict(h.op) ? 'has no line under it, so points on the line do not count: dashed'
      : 'has a line under it, so points on the line count: solid'}. `
      + `y ${SIGN[h.op]} means y is ${up(h.op) ? 'bigger' : 'smaller'} than the line's height: shade ${up(h.op) ? 'above' : 'below'}.`,
  };
}

/** Ax + By op C, from a half-plane with whole intercepts. B is never 0. */
function standardForm(rng) {
  const B = rng.nonZero(-5, 5), A = rng.int(-5, 5), k = rng.int(-4, 4);
  const op = rng.pick(['<', '<=', '>', '>=']);
  const C = B * k;
  const h = { m: ratio(-A, B), k, op: B > 0 ? op : FLIP[op] };
  const term = (c, v, first) => (c === 0 ? '' : `${first ? (c < 0 ? '-' : '') : c < 0 ? ' - ' : ' + '}${Math.abs(c) === 1 ? '' : Math.abs(c)}${v}`);
  const left = `${term(A, 'x', true)}${term(B, 'y', A === 0)}`;
  const src = `${left} ${op} ${C}`;
  const test = C === 0 ? [0, 1] : [0, 0];
  const lhs = A * test[0] + B * test[1];
  const holds = { '<': lhs < C, '<=': lhs <= C, '>': lhs > C, '>=': lhs >= C }[op];
  const testAbove = gap(h, test) > 0;
  const id = drawnAs(h);
  return {
    prompt: [T.prose('How is'), math(src), T.prose('drawn on a graph?')],
    text: `drawn: ${src}`,
    answer: { type: 'choice', value: id, options: DRAWN },
    visual: { kind: 'plane', ...PLANE, marks: guide(h),
      answer: [region([h], LINE), edge(h), { kind: 'point', at: test, label: `test ${pt(test)}`, tone: 'var(--vec-2)' }] },
    explain: `${strict(op) ? '< or >: dashed.' : '≤ or ≥: solid.'} For the side, test ${pt(test)}`
      + `${C === 0 ? ', since the line goes through (0, 0)' : ''}: ${minus(lhs)} ${SIGN[op]} ${minus(C)} is ${holds}, `
      + `and ${pt(test)} is ${testAbove ? 'above' : 'below'} the line, so shade ${(holds === testAbove) ? 'above' : 'below'}.`
      + (B < 0 ? ` (Solving for y divides by ${minus(B)}, which turns the sign: y ${SIGN[h.op]} …)` : ''),
  };
}

function fromGraph(rng) {
  const h = halfPlane(rng, { slopes: [[1, 1], [2, 1], [3, 1], [1, 2], [0, 1], [3, 2]], upright: 0.15 });
  // A test point off the line, for the reveal.
  const test = gap(h, [0, 0]) !== 0 ? [0, 0] : gap(h, [0, 3]) !== 0 ? [0, 3] : [3, 0];
  const inside = keeps(h, test);
  return {
    prompt: [T.prose('Write the inequality the graph shows.')],
    text: `graph: ${ascii(h)}`,
    answer: { type: 'halfplane', value: valueOf(h) },
    visual: { kind: 'plane', ...PLANE, marks: [region([h], LINE), edge(h)],
      answer: [{ kind: 'point', at: test, label: `${pt(test)} is ${inside ? 'in' : 'out'}`, tone: 'var(--vec-2)' }] },
    explain: 'x' in h
      ? `The edge is the upright line x = ${minus(h.x)}, ${strict(h.op) ? 'dashed, so < or >' : 'solid, so ≤ or ≥'}, `
        + `and the shading is to the ${h.op[0] === '>' ? 'right' : 'left'}: ${said(h)}.`
      : `The edge is y = ${said(h).slice(4)}: ${strict(h.op) ? 'dashed, so < or >' : 'solid, so ≤ or ≥'}. `
        + `The shading is ${up(h.op) ? 'above' : 'below'} it, so y is ${up(h.op) ? 'more' : 'less'}: ${said(h)}. `
        + `Check with ${pt(test)}: it is ${inside ? 'shaded, and it makes the inequality true' : 'not shaded, and it makes the inequality false'}.`,
  };
}

/** Two half-planes and four points; exactly one point is in both. */
function system(rng) {
  const h1 = halfPlane(rng, { slopes: [[1, 1], [2, 1], [1, 2], [0, 1]] });
  const h2 = halfPlane(rng, { slopes: [[1, 1], [2, 1], [1, 2], [3, 1]], upright: 0.2 });
  if (!('x' in h2) && !('x' in h1) && h1.m.n * h2.m.d === h2.m.n * h1.m.d) return system(rng);
  const off = (p) => gap(h1, p) !== 0 && gap(h2, p) !== 0;
  const both = (p) => keeps(h1, p) && keeps(h2, p);
  const pool = [];
  for (let i = 0; i < 200 && pool.length < 40; i++) {
    const p = [rng.int(-8, 8), rng.int(-8, 8)];
    if (off(p) && !pool.some((q) => q[0] === p[0] && q[1] === p[1])) pool.push(p);
  }
  const good = pool.filter(both), oneOnly = pool.filter((p) => !both(p) && (keeps(h1, p) || keeps(h2, p)));
  const neither = pool.filter((p) => !keeps(h1, p) && !keeps(h2, p));
  if (!good.length || oneOnly.length < 2 || !neither.length) return system(rng);
  const pts = rng.shuffle([good[0], oneOnly[0], oneOnly[1], neither[0]]);
  const names = ['A', 'B', 'C', 'D'];
  const right = names[pts.indexOf(good[0])];
  return {
    // Joined by a word: two inequalities set side by side read as one
    // chain, y < −(1/2)x + 2 x ≤ −2, which is a different and false claim.
    prompt: [T.prose('Which point solves'), math(ascii(h1)), T.prose('and'), math(ascii(h2)), T.prose('at the same time?')],
    text: `both: ${ascii(h1)}; ${ascii(h2)} | ${pts.map((p, i) => `${names[i]} ${pt(p).replace(/−/g, '-')}`).join(' ')}`,
    answer: { type: 'choice', value: right, options: pts.map((p, i) => ({ id: names[i], label: `${names[i]} ${pt(p)}` })) },
    visual: { kind: 'plane', ...PLANE,
      marks: [edge(h1), edge(h2, { tone: OTHER }), ...pts.map((p, i) => ({ kind: 'point', at: p, label: names[i], tone: 'var(--vec-2)' }))],
      answer: [region([h1, h2], LINE)] },
    explain: `Test each point in both. ${pts.map((p, i) => `${names[i]} ${pt(p)} passes `
      + `${both(p) ? 'both' : keeps(h1, p) ? `only ${said(h1)}` : keeps(h2, p) ? `only ${said(h2)}` : 'neither'}`).join('; ')}. `
      + `Only ${right} passes both, so it is in the overlap of the two shaded halves.`,
  };
}

/**
 * Two quantities and a limit on them. Each story names what x and y count,
 * because choosing the variables is part of writing the inequality, and
 * says "at most" or "at least" in words, which is the sign to find.
 */
const STORIES = [
  {
    most: true, x: 'adult tickets', y: 'child tickets',
    make: (rng) => { const a = rng.int(6, 15); return { a, b: rng.int(3, Math.min(9, a - 1)), total: 10 * rng.int(4, 12) }; },
    say: ({ a, b, total }) => `Adult tickets cost $${a} and child tickets $${b}. You can spend at most $${total}.`,
    each: ({ a, b }) => `The x adult tickets cost ${a}x dollars and the y child tickets ${b}y`,
    limit: ({ total }) => `together at most ${total} dollars`,
  },
  {
    most: true, x: 'large boxes', y: 'small boxes',
    // requiem: catalogue/content/units-both-systems
    // In kilograms or in pounds, half each, with loads a hand cart takes in
    // that unit: a van that could carry only 60 kg was no van.
    make: (rng) => (rng.chance(0.5)
      ? { u: 'kg', a: rng.int(8, 20), b: rng.int(2, 7), total: 10 * rng.int(6, 20) }
      : { u: 'lb', a: rng.int(15, 40), b: rng.int(4, 12), total: 10 * rng.int(12, 40) }),
    say: ({ u, a, b, total }) => `A cart can carry at most ${total} ${u}. Large boxes weigh ${a} ${u} and small boxes ${b} ${u}.`,
    each: ({ u, a, b }) => `The x large boxes weigh ${a}x ${u} and the y small boxes ${b}y`,
    limit: ({ u, total }) => `together at most ${total} ${u}`,
  },
  {
    most: false, x: 'wins', y: 'draws',
    make: (rng) => ({ a: rng.pick([2, 3]), b: 1, total: rng.int(20, 45) }),
    say: ({ a, b, total }) => `A team gets ${a} points for a win and ${b} for a draw, and needs at least ${total} points.`,
    each: ({ a }) => `The x wins earn ${a}x points and the y draws y`,
    limit: ({ total }) => `together at least ${total} points`,
  },
  {
    most: false, x: 'hours mowing', y: 'hours washing cars',
    make: (rng) => ({ a: rng.int(10, 15), b: rng.int(6, 9), total: 10 * rng.int(8, 20) }),
    say: ({ a, b, total }) => `Sam earns $${a} an hour mowing and $${b} an hour washing cars, and wants at least $${total}.`,
    each: ({ a, b }) => `The x hours mowing earn ${a}x dollars and the y hours washing cars ${b}y`,
    limit: ({ total }) => `together at least ${total} dollars`,
  },
];

// requiem: catalogue/content/words-to-inequality-is-written
/**
 * The inequality a budget or a target makes, typed and judged by the half
 * of the plane it keeps, so 9x + 4y ≤ 60 and y ≤ −(9/4)x + 15 are both right.
 */
function fromWords(rng) {
  const s = rng.pick(STORIES);
  const v = s.make(rng);
  const op = s.most ? '<=' : '>=';
  const left = `${v.a}x + ${v.b === 1 ? '' : v.b}y`;
  const value = { m: ratio(-v.a, v.b), b: ratio(v.total, v.b), op };
  const solved = `y ${SIGN[op]} ${lineText(value.m, value.b).slice(4)}`;
  return {
    prompt: [T.prose(`${s.say(v)} Write an inequality in x and y, where x is the number of ${s.x} `
      + `and y the number of ${s.y}.`)],
    text: `words: ${v.a} per x, ${v.b} per y, at ${s.most ? 'most' : 'least'} ${v.total}`,
    answer: { type: 'halfplane', value },
    visual: null,
    explain: `${s.each(v)}, ${s.limit(v)}: ${left} ${SIGN[op]} ${v.total}. `
      + `"At ${s.most ? 'most' : 'least'}" keeps the edge, so the sign is ${SIGN[op]}. `
      + `Solved for y, the same inequality is ${solved}.`,
  };
}

const CONTENT = [isSolution, dashedOrSolid, standardForm, fromGraph, system, fromWords];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  // The mixed level deals from every level. The choice questions each name
  // their own answers -- yes or no, how it is drawn, which point -- so the
  // buttons say nothing the question had not.
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
