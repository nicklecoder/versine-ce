/**
 * Catalogue authoring tool: builds the problem library for graphs of quadratics.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 *
 * Every `text` carries the quadratic in plain ASCII after a prefix naming
 * what is asked, so scripts/check-answers.py can work it out from the
 * coefficients rather than from the form it was built in.
 */
import * as T from '../terms.js';
import { minus, signed } from '../../web/ui/dom.js';
import { previewOf } from '../../web/ui/express.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/quadratic-graphs.js';

const SPAN = 10;
const PLANE = { xRange: [-SPAN, SPAN], yRange: [-SPAN, SPAN], grid: 1 };
const LINE = 'var(--vec-1)';
const MARK = 'var(--vec-2)';

/**
 * y = f(x) as the polylines that lie inside the grid. Where the curve leaves
 * the window the line stops exactly at the edge and a new one starts where it
 * comes back: one polyline would join the last point before the vertex to
 * the first after it with a straight line, and a parabola whose vertex is off
 * the grid would be drawn with a flat floor it does not have.
 */
// requiem: catalogue/visuals/curves-split-at-window
function curves(f, step = 0.1) {
  const inside = (y) => Number.isFinite(y) && Math.abs(y) <= SPAN;
  // The x between one inside and one outside sample where the curve crosses the edge.
  const edge = (xIn, xOut) => {
    for (let i = 0; i < 40; i++) {
      const mid = (xIn + xOut) / 2;
      if (inside(f(mid))) xIn = mid; else xOut = mid;
    }
    return xIn;
  };
  const point = (x) => [+x.toFixed(3), +Math.max(-SPAN, Math.min(SPAN, f(x))).toFixed(3)];
  const out = [];
  let run = [], prev = null;
  const n = Math.round((2 * SPAN) / step);
  for (let i = 0; i <= n; i++) {
    const x = -SPAN + i * step;
    const now = inside(f(x));
    if (now && prev !== null && !inside(f(prev))) run.push(point(edge(x, prev)));
    if (now) run.push(point(x));
    if (!now && prev !== null && inside(f(prev))) { run.push(point(edge(prev, x))); out.push(run); run = []; }
    prev = x;
  }
  out.push(run);
  return out.filter((r) => r.length > 1);
}
const paths = (f, tone, extra = {}) => curves(f).map((points) => ({ kind: 'path', points, tone, ...extra }));

/** a, or a written in front of a bracket: 2, −, nothing. */
const lead = (a) => (a === 1 ? '' : a === -1 ? '-' : String(a));
const bracket = (h) => `(x ${h < 0 ? '+' : '-'} ${Math.abs(h)})`;
const plusK = (k) => (k === 0 ? '' : ` ${k < 0 ? '-' : '+'} ${Math.abs(k)}`);
const vertexForm = (a, h, k) => `${lead(a)}${bracket(h)}^2${plusK(k)}`;
/** A zero at 0 is the factor x, written first: 2x(x − 3), not 2(x − 0)(x − 3). */
const factoredForm = (a, p, q) => (q === 0 ? factoredForm(a, q, p)
  : `${lead(a)}${p === 0 ? 'x' : bracket(p)}${bracket(q)}`);
function standardForm(a, b, c) {
  return [[a, 2], [b, 1], [c, 0]].filter(([k]) => k !== 0).map(([k, p], i) => {
    const letter = p === 0 ? '' : p === 1 ? 'x' : 'x^2';
    const body = `${Math.abs(k) === 1 && letter ? '' : Math.abs(k)}${letter}`;
    return i === 0 ? `${k < 0 ? '-' : ''}${body}` : ` ${k < 0 ? '-' : '+'} ${body}`;
  }).join('');
}
/** A number squared or multiplied, bracketed only when negative. */
const sq = (h) => (h < 0 ? `(${minus(h)})²` : `${h}²`);
const num = (h) => (h < 0 ? `(${minus(h)})` : String(h));
const pretty = (s) => s.replace(/\^2/g, '²').replace(/-/g, '−');

function equation(src, ask) {
  const r = previewOf(`y = ${src}`);
  if (!r.ok) throw new Error(`quadratic-graphs: cannot draw "${src}" — ${r.error}`);
  return [...r.terms, T.prose(ask)];
}
const pairOf = (x, y) => ({ type: 'pair', value: { x: { n: x, d: 1 }, y: { n: y, d: 1 } } });
const at = ([x, y]) => `(${minus(x)}, ${minus(y)})`;
/** The parabola and its vertex, revealed with the answer. */
const graph = (f, points) => ({ kind: 'plane', ...PLANE, marks: [],
  answer: [...paths(f, LINE),
    ...points.map((p) => ({ kind: 'point', at: p, tone: MARK,
      // Two zeros close together would print their labels over each other.
      ...(points.length > 1 && Math.abs(points[1][0] - points[0][0]) < 5 ? {} : { label: at(p) }) }))] });

const OPENS = [
  { id: 'up', label: 'Opens up, with a lowest point' },
  { id: 'down', label: 'Opens down, with a highest point' },
];

function upOrDown(rng) {
  const a = rng.nonZero(-4, 4), h = rng.int(-6, 6), k = rng.int(-9, 9);
  const shape = rng.pick(['vertex', 'standard', 'factored', 'hidden', 'constant-first']);
  let src, why;
  if (shape === 'vertex') {
    src = vertexForm(a, h, k);
    why = `The number in front of the square is ${minus(a)}`;
  } else if (shape === 'factored') {
    const p = rng.int(-6, 6), q = rng.int(-6, 6);
    src = factoredForm(a, p, q);
    why = `Multiplied out, the x² term is ${pretty(lead(a))}x²`;
  } else if (shape === 'hidden') {
    // (p − x)(x + q): the minus is on the x inside the bracket.
    const p = rng.int(1, 6), q = rng.int(-6, 6);
    src = `(${p} - x)${bracket(q)}`;
    why = `The minus is hiding inside the first bracket. The x² term comes from −x × x = −x²`;
    return finishUpDown(src, -1, why);
  } else if (shape === 'constant-first') {
    const c = rng.int(1, 9);
    src = `${c} ${a < 0 ? '-' : '+'} ${Math.abs(a) === 1 ? '' : Math.abs(a)}x^2`;
    why = `The x² term is ${a < 0 ? '−' : ''}${Math.abs(a) === 1 ? '' : Math.abs(a)}x², written last but still the one that counts`;
  } else {
    const b = rng.int(-8, 8), c = rng.int(-9, 9);
    src = standardForm(a, b, c);
    why = `The x² term is ${pretty(standardForm(a, 0, 0))}`;
  }
  return finishUpDown(src, a, why);
}
function finishUpDown(src, a, why) {
  const id = a > 0 ? 'up' : 'down';
  return {
    prompt: equation(src, '— which way does it open?'),
    text: `opens: ${src}`,
    answer: { type: 'choice', value: id, options: OPENS },
    visual: null,
    explain: `${why}: ${a > 0 ? 'positive, so it opens up and has a lowest point' : 'negative, so it opens down and has a highest point'}.`,
  };
}

function fromVertexForm(rng) {
  const a = rng.pick([1, 1, 2, -1, -1, -2, 3, -3]), h = rng.nonZero(-6, 6), k = rng.int(-8, 8);
  const src = vertexForm(a, h, k);
  return {
    prompt: equation(src, '— where is the vertex?'),
    text: `vertex: ${src}`,
    answer: pairOf(h, k),
    visual: graph((x) => a * (x - h) ** 2 + k, [[h, k]]),
    explain: `The square is 0, its smallest, when x ${h < 0 ? '+' : '−'} ${Math.abs(h)} = 0, so at x = ${minus(h)}`
      + `${h < 0 ? ` -- the opposite of the sign in the bracket` : ''}. Then y is ${k === 0 ? 'the square alone: 0' : `the number left over: ${minus(k)}`}. `
      + `So the vertex is ${at([h, k])}.`,
  };
}

function zeros(rng) {
  const a = rng.pick([1, 1, 2, -1, -2, 3]), p = rng.int(-7, 7), q = rng.int(-7, 7);
  if (p === q) return zeros(rng);
  const src = factoredForm(a, Math.min(p, q), Math.max(p, q));
  const roots = [Math.min(p, q), Math.max(p, q)];
  const f = (x) => a * (x - p) * (x - q);
  return {
    // The x-values are asked for, not the points: the answer is the zeros.
    prompt: equation(src, '— at what values of x does it cross the x-axis?'),
    text: `zeros: ${src}`,
    answer: { type: 'solutions', value: { letter: 'x', parts: roots.map((r) => ({ lo: { n: r, d: 1 }, loIn: true, hi: { n: r, d: 1 }, hiIn: true })) } },
    visual: graph(f, roots.map((r) => [r, 0])),
    explain: `It crosses the x-axis where y = 0, and a product is 0 when a factor is: `
      + `${roots.map((r) => (r === 0 ? 'the factor x is 0 at x = 0' : `${pretty(bracket(r).slice(1, -1))} = 0 at x = ${minus(r)}`)).join(', and ')}`
      + `${a !== 1 ? `. The ${minus(a)} in front changes the height, not the zeros` : ''}. So x = ${minus(roots[0])} or x = ${minus(roots[1])}.`,
  };
}

function fromStandard(rng) {
  const a = rng.pick([1, 1, 2, -1, -1, -2, 3]), h = rng.nonZero(-5, 5), k = rng.int(-8, 8);
  const b = -2 * a * h, c = a * h * h + k;
  const src = standardForm(a, b, c);
  return {
    prompt: equation(src, '— where is the vertex?'),
    text: `vertex: ${src}`,
    answer: pairOf(h, k),
    visual: graph((x) => a * x * x + b * x + c, [[h, k]]),
    explain: `x = −b/2a = ${minus(-b)}/${2 * a < 0 ? `(${minus(2 * a)})` : 2 * a} = ${minus(h)}. Put it back in for y: `
      + `${a === 1 ? '' : `${minus(a)} × `}${sq(h)} ${b < 0 ? '−' : '+'} ${Math.abs(b)} × ${num(h)}${c ? ` ${c < 0 ? '−' : '+'} ${Math.abs(c)}` : ''} = ${minus(k)}. `
      + `So the vertex is ${at([h, k])}.`,
  };
}

/**
 * Every way of writing a(x − h)² + k that is the same form: a 1 or −1 in
 * front written out, and a k of 0 written as + 0. The expression type does
 * not fold a factor of ±1 or a + 0, and −1(x − 5)² + 12 is how many
 * students write it.
 */
function spellings(a, h, k) {
  const leads = Math.abs(a) === 1 ? [lead(a), a < 0 ? '-1' : '1'] : [lead(a)];
  const tails = k === 0 ? [plusK(k), ' + 0'] : [plusK(k)];
  return leads.flatMap((l) => tails.map((t) => `${l}${bracket(h)}^2${t}`)).filter((f) => f !== vertexForm(a, h, k));
}

function intoVertex(rng) {
  const a = rng.pick([1, 1, 1, 2, 3, -1]), h = rng.nonZero(-6, 6), k = rng.int(-12, 12);
  const b = -2 * a * h, c = a * h * h + k;
  const src = standardForm(a, b, c);
  const ans = vertexForm(a, h, k);
  const r = previewOf(src);
  const inside = a === 1 ? '' : `Take ${minus(a)} out of the x terms: ${pretty(lead(a))}(${pretty(standardForm(1, b / a, 0))}) ${c < 0 ? '−' : '+'} ${Math.abs(c)}. `;
  return {
    prompt: [...r.terms, T.op('='), T.blank(), T.prose('in vertex form')],
    text: `vertex form: ${src}`,
    answer: { type: 'expr', value: ans, accept: spellings(a, h, k) },
    visual: null,
    explain: `${inside}Half of ${minus(b / a)} is ${minus(-h)}, and ${pretty(standardForm(1, b / a, 0))} + ${h * h} = ${pretty(bracket(h))}². `
      + `${a === 1 ? `That added ${h * h}` : `Adding ${h * h} inside the bracket adds ${minus(a * h * h)} in all`}, so take it away again: `
      + `${minus(c)} − ${signed(a * h * h)} = ${minus(k)}. So ${pretty(ans)}.`,
  };
}

/** A number with at most two decimal places, as the decimal answer holds it. */
const hundredths = (x) => { const n = Math.round(x * 100); if (Math.abs(n - x * 100) > 1e-9) throw new Error(`${x} is not in hundredths`); const d = n % 10 ? 100 : n % 100 ? 10 : 1; return { n: n / (100 / d), d }; };

/** The vertex of a situation, asked for in words. */
function context(rng) {
  const shape = rng.pick(['ball', 'ball', 'fence', 'revenue']);
  let src, ask, value, prompt, why;
  if (shape === 'ball') {
    // In feet, h = −16t² + vt + s; in meters, −5t² (g rounded to 10). The
    // launch speed is any multiple that puts the top at a half second, so
    // the answer is not always a whole number of seconds.
    const metric = rng.chance(0.5);
    const g = metric ? 5 : 16, k = rng.int(1, metric ? 8 : 10);
    const s = metric ? rng.int(0, 12) : 2 * rng.int(0, 20);
    const v = g * k, t = k / 2, top = g * t * t + s;
    const unit = metric ? 'meters' : 'feet';
    src = standardForm(-g, v, s).replace(/x/g, 't');
    ask = rng.chance(0.5) ? 'max' : 'when';
    value = ask === 'max' ? top : t;
    prompt = `A ball is thrown upward. Its height after t seconds is h = ${pretty(src)} ${unit}. `
      + `${ask === 'max' ? `How high does it go, in ${unit}?` : 'After how many seconds is it highest?'}`;
    why = `The highest point is the vertex: t = −b/2a = ${minus(-v)}/(${minus(-2 * g)}) = ${t} second${t === 1 ? '' : 's'}`
      + `${ask === 'max' ? `, and h = −${g} × ${t}² + ${v} × ${t}${s ? ` + ${s}` : ''} = ${top} ${unit}` : ''}.`;
  } else if (shape === 'fence' && rng.chance(0.5)) {
    const m = rng.int(3, 30), P = 4 * m;
    // requiem: catalogue/content/units-both-systems
    // Fenced in meters or in feet, half each: 12 to 120 of either is a garden.
    const u = rng.pick(['m', 'ft']);
    // A pen against a wall: two sides of x and one of P − 2x.
    src = `x(${P} - 2x)`;
    ask = rng.chance(0.5) ? 'max' : 'when';
    value = ask === 'max' ? 2 * m * m : m;
    prompt = `A pen is built against a wall with ${P} ${u} of fence: two sides of x ${u}, and the side facing the wall `
      + `${P} − 2x ${u}. Its area is x(${P} − 2x). ${ask === 'max' ? `What is the largest area it can have, in ${u}²?` : 'What x gives the largest area?'}`;
    why = `x(${P} − 2x) = −2x² + ${P}x, which opens down. Its zeros are 0 and ${2 * m}, and the vertex is halfway: x = ${m}`
      + `${ask === 'max' ? `, giving ${m} × ${P - 2 * m} = ${2 * m * m} ${u}²` : ''}.`;
  } else if (shape === 'fence') {
    const m = rng.int(3, 30), half = 2 * m;
    const u = rng.pick(['m', 'ft']);
    // A rectangle on its own: sides of x and half the fence less x.
    src = `x(${half} - x)`;
    ask = rng.chance(0.5) ? 'max' : 'when';
    value = ask === 'max' ? m * m : m;
    prompt = `A rectangle is fenced with ${2 * half} ${u} of fence. With one side x ${u}, the other is ${half} − x ${u}, `
      + `so its area is x(${half} − x). ${ask === 'max' ? `What is the largest area it can have, in ${u}²?` : 'What x gives the largest area?'}`;
    why = `x(${half} − x) opens down, with zeros at 0 and ${half}. The vertex is halfway: x = ${m}`
      + `${ask === 'max' ? `, a square, giving ${m} × ${m} = ${m * m} ${u}²` : ', which makes it a square'}.`;
  } else {
    const n = rng.int(1, 5), top = 10 * rng.int(4, 20);
    if ((top / n) % 2) return context(rng);
    const best = top / (2 * n);
    const nx = n === 1 ? 'x' : `${n}x`;
    src = `x(${top} - ${nx})`;
    ask = rng.chance(0.5) ? 'max' : 'when';
    value = ask === 'max' ? best * (top - n * best) : best;
    prompt = `At a price of x dollars, a shop sells ${top} − ${nx} mugs a day, so its takings are x(${top} − ${nx}) dollars. `
      + `${ask === 'max' ? 'What are the most it can take in a day, in dollars?' : 'What price, in dollars, brings in the most?'}`;
    why = `The takings are 0 at x = 0 and x = ${top / n}; the vertex is halfway, at x = ${best}`
      + `${ask === 'max' ? `, where they are ${best} × ${top - n * best} = ${value} dollars` : ''}.`;
  }
  return {
    prompt: [T.prose(prompt)],
    text: `${ask === 'max' ? 'max of' : 'max at'}: ${src.replace(/t/g, 'x')}`,
    // requiem: catalogue/library/consistent-answer-type-in-level
    // A ball's answers can be halves, so every row here takes a decimal and
    // the box does not say which kind is coming.
    answer: { type: 'decimal', value: hundredths(value) },
    visual: null,
    explain: why,
  };
}

const WAYS = [
  { id: 'read', label: 'Read it straight off' },
  { id: 'zero-x', label: 'Put x = 0' },
  { id: 'solve', label: 'Solve y = 0' },
  { id: 'halfway', label: 'Halfway between the zeros' },
  { id: 'formula', label: 'x = −b/2a, then y' },
];
const WAY = {
  vertex: { vertex: 'read', zeros: 'solve', 'y-intercept': 'zero-x' },
  factored: { vertex: 'halfway', zeros: 'read', 'y-intercept': 'zero-x' },
  standard: { vertex: 'formula', zeros: 'solve', 'y-intercept': 'read' },
};
const WHY = {
  'vertex/vertex': 'Vertex form is written around its vertex: (h, k) is there to read.',
  'vertex/zeros': 'Vertex form shows the turning point, not the crossings: set y = 0 and solve.',
  'vertex/y-intercept': 'The y-intercept is where x = 0: put it in.',
  'factored/vertex': 'Factored form shows the zeros, and a parabola is symmetric: the vertex is halfway between them.',
  'factored/zeros': 'Factored form is written around its zeros: set each bracket to 0.',
  'factored/y-intercept': 'The y-intercept is where x = 0: put it in.',
  'standard/vertex': 'Standard form hides the vertex: x = −b/2a, then put that x in for y.',
  'standard/zeros': 'Standard form does not show the zeros: set y = 0 and solve, by factoring or the formula.',
  'standard/y-intercept': 'At x = 0 every term but the last is 0, so the y-intercept is the number on its own.',
};

/** Every form-feature pair, grouped by the way that finds it. */
const BY_WAY = WAYS.map(({ id }) => Object.entries(WAY).flatMap(([form, row]) =>
  Object.entries(row).filter(([, w]) => w === id).map(([feature]) => [form, feature])));

function whichForm(rng, again = null) {
  // Each way equally often: reading it off answers three of the nine pairs
  // and halfway only one, so the way is drawn first.
  const [form, feature] = again ?? rng.pick(rng.pick(BY_WAY));
  const a = rng.pick([1, 2, -1, -2, 3]);
  let src;
  if (form === 'vertex') {
    const h = rng.nonZero(-6, 6), k = rng.nonZero(-9, 9);
    // Asked the way to its zeros, a parabola must have some: one that turns
    // above the axis and opens up never reaches it.
    if (feature === 'zeros' && Math.sign(a) === Math.sign(k)) return whichForm(rng, [form, feature]);
    src = vertexForm(a, h, k);
  } else if (form === 'factored') {
    const p = rng.nonZero(-6, 6), q = rng.nonZero(-6, 6);
    if (p === q) return whichForm(rng, [form, feature]);
    src = factoredForm(a, Math.min(p, q), Math.max(p, q));
  } else {
    const b = rng.nonZero(-9, 9), c = rng.nonZero(-9, 9);
    if (feature === 'zeros' && b * b - 4 * a * c < 0) return whichForm(rng, [form, feature]);
    src = standardForm(a, b, c);
  }
  return {
    prompt: equation(src, `— the quickest way to its ${feature}?`),
    text: `quickest ${feature}: ${src}`,
    answer: { type: 'choice', value: WAY[form][feature], options: WAYS },
    visual: null,
    explain: WHY[`${form}/${feature}`],
  };
}

const CONTENT = [upOrDown, fromVertexForm, zeros, fromStandard, intoVertex, context, whichForm];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
