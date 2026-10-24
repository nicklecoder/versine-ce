/**
 * Catalogue authoring tool: builds the problem library for domain-range.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 *
 * Every `text` carries what the answer comes from: a formula in plain ASCII,
 * or a graph as its pieces, each a list of corners with what its two ends
 * are (closed, open, or an arrow), or a piecewise rule as its pieces and
 * their conditions. scripts/check-answers.py finds each domain by trying
 * the formula at points along the line, each range by where the formula's
 * values reach, and a graph's by walking its pieces.
 */
import * as T from '../terms.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/domain-range.js';
import { normalize, formatSet } from '../../web/math/solutions.js';
import { reduce } from './chance.js';
import { tenths } from './trig.js';
import { LINE, ASKED } from './figures.js';

const optionIds = ['a', 'b', 'c', 'd'];
const minus = (s) => String(s).replace(/-/g, '−');
const Q = (n, d = 1) => { const q = reduce(n, d); return q.d < 0 ? { n: -q.n, d: -q.d } : q; };
const qText = (q) => (q.d === 1 ? minus(q.n) : `${minus(q.n)}/${q.d}`);
const qVal = (q) => q.n / q.d;
const setOf = (letter, parts) => ({ type: 'solutions', value: { letter, parts: normalize(parts) } });
function said(letter, parts) {
  const s = normalize(parts);
  // Every number but a few: x ≠ 2, or x ≠ −3 and x ≠ 3.
  const holes = s.length > 1 && s[0].lo === null && s[s.length - 1].hi === null
    && s.every((p, i) => !p.loIn && !p.hiIn && (i === 0 || (p.lo && s[i - 1].hi && p.lo.n * s[i - 1].hi.d === s[i - 1].hi.n * p.lo.d)));
  if (holes) return s.slice(1).map((p) => `${letter} ≠ ${p.lo.d === 1 ? minus(p.lo.n) : `${minus(p.lo.n)}/${p.lo.d}`}`).join(' and ');
  return formatSet({ letter, parts: s });
}
const ray = (q, dir, inc) => (dir > 0 ? { lo: q, loIn: inc, hi: null, hiIn: false } : { lo: null, loIn: false, hi: q, hiIn: inc });
const ALL = [{ lo: null, loIn: false, hi: null, hiIn: false }];
const except = (...qs) => {
  const s = [...qs].sort((a, b) => qVal(a) - qVal(b));
  const out = [];
  let lo = null;
  for (const q of s) { out.push({ lo, loIn: false, hi: q, hiIn: false }); lo = q; }
  out.push({ lo, loIn: false, hi: null, hiIn: false });
  return out;
};

/** ax + b, written: 2x − 6, −x + 4, x. */
const linText = (a, b, v = 'x') => `${a === 1 ? '' : a === -1 ? '−' : minus(a)}${v}${b === 0 ? '' : ` ${b < 0 ? '−' : '+'} ${Math.abs(b)}`}`;
const linAscii = (a, b, v = 'x') => `${a}*${v}${b === 0 ? '' : ` ${b < 0 ? '-' : '+'} ${Math.abs(b)}`}`;
/** b − ax read the friendlier way round when a < 0: 6 − 2x. */
const linNice = (a, b, v = 'x') => (a < 0 && b > 0 ? `${b} − ${a === -1 ? '' : Math.abs(a)}${v}` : linText(a, b, v));
const rootOf = (s) => (s === 'x' ? '√x' : `√(${s})`);
const nz = (rng, lo, hi) => { let v; do v = rng.int(lo, hi); while (v === 0); return v; };

// ── Domain of √ and fractions ───────────────────────────────────────────

function domainFormula(rng) {
  const kind = rng.pick(['root', 'root', 'root', 'fraction', 'fraction', 'two', 'rootOver', 'overRoot', 'none']);
  const a = rng.pick([1, 1, 2, 3, -1, -2]);
  const b = rng.int(-9, 9);
  // The edge: ax + b = 0 at x = −b/a.
  const edge = Q(-b, a);
  if (kind === 'root') {
    const parts = [ray(edge, a, true)];
    return {
      show: `f(x) = ${rootOf(linNice(a, b))}`, ascii: `sqrt(${linAscii(a, b)})`, parts,
      work: `The expression under the root must not be negative: ${linNice(a, b)} ≥ 0. `
        + `${a === 1 ? 'So' : a < 0 ? `Divide by ${minus(a)}, turning the sign round since ${minus(a)} is negative:` : `Divide by ${a}:`} x ${a > 0 ? '≥' : '≤'} ${qText(edge)}.`,
      trap: `(At x = ${qText(edge)} the root is √0 = 0, which is allowed, so the end is in.)`,
    };
  }
  if (kind === 'fraction') {
    const k = nz(rng, -6, 6);
    return {
      show: `f(x) = ${minus(k)}/(${linNice(a, b)})`, ascii: `${k}/(${linAscii(a, b)})`, parts: except(edge),
      work: `A denominator may not be zero: ${linNice(a, b)} = 0 at x = ${qText(edge)}, and every other x works.`,
      trap: `(The top, ${minus(k)}, never limits the domain; only the bottom can be zero.)`,
    };
  }
  if (kind === 'two') {
    let p = rng.int(-6, 6), q = rng.int(-6, 6);
    while (q === p) q = rng.int(-6, 6);
    const square = rng.chance(0.4);
    if (square) { p = Math.abs(p) || 2; q = -p; }
    const c = rng.int(-5, 5);
    const lo = Math.min(p, q), hi = Math.max(p, q);
    const sum = p + q, prod = p * q;
    const den = square ? `x² − ${p * p}` : `x²${sum === 0 ? '' : ` ${sum > 0 ? '−' : '+'} ${Math.abs(sum) === 1 ? '' : Math.abs(sum)}x`}${prod === 0 ? '' : ` ${prod < 0 ? '−' : '+'} ${Math.abs(prod)}`}`;
    const denA = `x**2 - ${sum}*x + ${prod}`;
    const top = c === 0 ? 'x' : linText(1, c);
    return {
      show: `f(x) = (${top})/(${den})`, ascii: `(${linAscii(1, c)})/(${denA})`, parts: except(Q(lo), Q(hi)),
      work: `The denominator may not be zero: ${den} = (x ${-lo < 0 ? '−' : '+'} ${Math.abs(lo)})(x ${-hi < 0 ? '−' : '+'} ${Math.abs(hi)})`.replace(/\+ 0\)/g, ')').replace(/− 0\)/g, ')')
        + `, which is 0 at x = ${minus(lo)} and at x = ${minus(hi)}. Both are left out.`,
      trap: `(${square ? `x² = ${p * p} has two roots, ${p} and −${p}` : 'A quadratic denominator can be zero twice'}: missing one leaves a number in the domain where f cannot be worked out.)`,
    };
  }
  if (kind === 'rootOver') {
    // √(x − p)/(x − q)
    const p = rng.int(-5, 5);
    const q = rng.chance(0.7) ? p + rng.int(1, 6) : p - rng.int(1, 4);
    const parts = q > p
      ? [{ lo: Q(p), loIn: true, hi: Q(q), hiIn: false }, { lo: Q(q), loIn: false, hi: null, hiIn: false }]
      : [ray(Q(p), 1, true)];
    return {
      show: `f(x) = ${rootOf(linText(1, -p))}/(${linText(1, -q)})`, ascii: `sqrt(${linAscii(1, -p)})/(${linAscii(1, -q)})`, parts,
      work: `Under the root, ${linText(1, -p)} ≥ 0${p === 0 ? '' : `, so x ≥ ${minus(p)}`}; and the denominator ${linText(1, -q)} is 0 at x = ${minus(q)}. `
        + (q > p ? `${minus(q)} is one of the x ≥ ${minus(p)}, so it is taken out of them.` : `${minus(q)} is already left out by x ≥ ${minus(p)}, so it changes nothing.`),
      trap: q > p ? '(Both rules apply at once: the root sets where it starts, and the denominator punches a hole.)' : `(The hole at ${minus(q)} is outside x ≥ ${minus(p)} already, so it adds no gap.)`,
    };
  }
  if (kind === 'overRoot') {
    return {
      show: `f(x) = 1/${rootOf(linNice(a, b))}`, ascii: `1/sqrt(${linAscii(a, b)})`, parts: [ray(edge, a, false)],
      work: `Under the root, ${linNice(a, b)} ≥ 0, and the root is the denominator, so it may not be 0 either: ${linNice(a, b)} > 0, which is x ${a > 0 ? '>' : '<'} ${qText(edge)}.`,
      trap: `(At x = ${qText(edge)} the bottom is √0 = 0, so the end is out: the sign is strict.)`,
    };
  }
  // No restriction at all: a polynomial, or a cube root.
  const cube = rng.chance(0.5);
  return {
    show: cube ? `f(x) = ∛(${linNice(a, b)})` : `f(x) = ${linText(a, b).replace('x', 'x²')}`,
    ascii: cube ? `cbrt(${linAscii(a, b)})` : `${a}*x**2${b === 0 ? '' : ` ${b < 0 ? '-' : '+'} ${Math.abs(b)}`}`,
    parts: ALL,
    work: cube ? 'A cube root takes negatives as well, since (−2)³ = −8: there is no root to keep positive and no denominator.'
      : 'There is no root and no denominator: a polynomial can be worked out at every x.',
    trap: cube ? '(Only an even root, like √, needs what is under it to be at least 0.)' : '(A domain is only limited by something that cannot be done.)',
  };
}

function domains(rng) {
  const d = domainFormula(rng);
  return {
    prompt: [T.prose(`What is the domain of ${d.show}? Write it with x.`)],
    text: `domain: ${d.ascii}`,
    answer: setOf('x', d.parts),
    visual: null,
    explain: `${d.work} ${d.trap} So the domain is ${said('x', d.parts)}.`,
  };
}

// ── Graphs: pieces with closed, open or arrow ends ──────────────────────

const PLANE = { xRange: [-8, 8], yRange: [-8, 8], grid: 1 };
const END_WORDS = { closed: 'a filled dot, so it is in', open: 'an open dot, so it is out', arrow: 'an arrow, so it goes on forever' };

/** A piece: corners left to right, and what each end is. */
function piece(rng, xlo, xhi, { arrows = true, ends = ['closed', 'open'] } = {}) {
  const xs = new Set([xlo, xhi]);
  const want = rng.int(2, Math.min(4, xhi - xlo + 1));
  while (xs.size < want) xs.add(rng.int(xlo, xhi));
  const pts = [...xs].sort((a, b) => a - b).map((x) => [x, rng.int(-6, 6)]);
  const endAt = (x) => (arrows && Math.abs(x) === 7 && rng.chance(0.5) ? 'arrow' : rng.pick(ends));
  const p = { pts, left: endAt(xlo), right: endAt(xhi) };
  // An arrow along a flat line would keep a range bounded: only on a slope.
  const slope = (i, j) => pts[j][1] - pts[i][1];
  if (p.left === 'arrow' && slope(0, 1) === 0) p.left = 'closed';
  if (p.right === 'arrow' && slope(pts.length - 2, pts.length - 1) === 0) p.right = 'closed';
  return p;
}

const pieceText = (p) => `${p.left} ${p.pts.map(([x, y]) => `(${x}, ${y})`).join(' ')} ${p.right}`;

function domainParts(pieces) {
  return pieces.map((p) => ({
    lo: p.left === 'arrow' ? null : Q(p.pts[0][0]), loIn: p.left === 'closed',
    hi: p.right === 'arrow' ? null : Q(p.pts[p.pts.length - 1][0]), hiIn: p.right === 'closed',
  }));
}

function rangeParts(pieces) {
  const out = [];
  for (const p of pieces) {
    const n = p.pts.length;
    for (let i = 0; i + 1 < n; i++) {
      const [x0, y0] = p.pts[i], [x1, y1] = p.pts[i + 1];
      void x0; void x1;
      const inAt = (j) => !((j === 0 && p.left === 'open') || (j === n - 1 && p.right === 'open'));
      if (y0 === y1) { out.push({ lo: Q(y0), loIn: true, hi: Q(y0), hiIn: true }); continue; }
      const [jl, jh] = y0 < y1 ? [i, i + 1] : [i + 1, i];
      const seg = { lo: Q(p.pts[jl][1]), loIn: inAt(jl), hi: Q(p.pts[jh][1]), hiIn: inAt(jh) };
      const m = y1 - y0;
      if (i === 0 && p.left === 'arrow') { if (m > 0) seg.lo = null; else seg.hi = null; }
      if (i === n - 2 && p.right === 'arrow') { if (m > 0) seg.hi = null; else seg.lo = null; }
      out.push(seg);
    }
  }
  return out;
}

/** The arrowhead at an end, pointing away from its neighbour. */
function arrowhead([x, y], [px, py], tone) {
  const L = Math.hypot(x - px, y - py), ux = (x - px) / L, uy = (y - py) / L;
  const wing = (s) => { const c = Math.cos(s), n = Math.sin(s); return [x - 0.7 * (ux * c - uy * n), y - 0.7 * (uy * c + ux * n)]; };
  return { kind: 'path', points: [wing(0.45), [x, y], wing(-0.45)], tone };
}

function pieceMarks(p) {
  const marks = [{ kind: 'path', points: p.pts, tone: LINE }];
  const n = p.pts.length;
  for (const [end, at, next] of [[p.left, p.pts[0], p.pts[1]], [p.right, p.pts[n - 1], p.pts[n - 2]]]) {
    if (end === 'arrow') marks.push(arrowhead(at, next, LINE));
    else marks.push({ kind: 'point', at, tone: LINE, ...(end === 'open' ? { open: true } : {}) });
  }
  return marks;
}

/** The answer drawn on its axis: a bar for each part, with its ends. */
function shadow(parts, axis) {
  const marks = [];
  const at = (v) => (axis === 'x' ? [v, 0] : [0, v]);
  for (const p of normalize(parts)) {
    const lo = p.lo === null ? -8 : qVal(p.lo), hi = p.hi === null ? 8 : qVal(p.hi);
    if (lo === hi) { marks.push({ kind: 'point', at: at(lo), tone: ASKED }); continue; }
    marks.push({ kind: 'segment', from: at(lo), to: at(hi), tone: ASKED });
    if (p.lo !== null) marks.push({ kind: 'point', at: at(lo), tone: ASKED, ...(p.loIn ? {} : { open: true }) });
    if (p.hi !== null) marks.push({ kind: 'point', at: at(hi), tone: ASKED, ...(p.hiIn ? {} : { open: true }) });
  }
  return marks;
}

function fromGraph(rng) {
  for (;;) {
    const two = rng.chance(0.35);
    let pieces;
    if (two) {
      const a = rng.int(-3, 0), b = rng.int(a + 1, 3);
      pieces = [piece(rng, -7, a), piece(rng, b, 7)];
    } else {
      pieces = [piece(rng, rng.int(-7, -2), rng.int(2, 7))];
    }
    const domain = rng.chance(0.5);
    const letter = domain ? 'x' : 'y';
    const parts = domain ? domainParts(pieces) : rangeParts(pieces);
    const set = normalize(parts);
    if (!domain && set.length === 1 && set[0].lo === null && set[0].hi === null && rng.chance(0.7)) continue;
    const ends = pieces.map((p, i) => `${pieces.length > 1 ? `The ${i ? 'right' : 'left'} piece` : 'The graph'} starts at x = ${minus(p.pts[0][0])} with ${END_WORDS[p.left]}, and ends at x = ${minus(p.pts[p.pts.length - 1][0])} with ${END_WORDS[p.right]}.`).join(' ');
    const ys = pieces.flatMap((p) => p.pts.map(([, y]) => y));
    const work = domain
      ? `${ends} The domain is every x the graph is above or below${pieces.length > 1 ? ', with the gap between the pieces left out' : ''}.`
      : `Look along the y-axis at every height the graph reaches. ${ends} Its corners run from y = ${minus(Math.min(...ys))} to y = ${minus(Math.max(...ys))}${pieces.some((p) => p.left === 'arrow' || p.right === 'arrow') ? ', and an arrow on a slope keeps climbing or falling past the edge' : ''}; a height reached only at an open dot is left out.`;
    const trap = domain ? '(The domain is read across, along x: how high the graph goes is the range.)'
      : '(The range is read up and down, along y: how far across the graph goes is the domain.)';
    return {
      prompt: [T.prose(`The graph of f is shown: a filled dot is on the graph, an open dot is not, and an arrow means it goes on forever that way. What is the ${domain ? 'domain' : 'range'} of f? Write it with ${letter}.`)],
      text: `graph ${domain ? 'domain' : 'range'}: ${pieces.map(pieceText).join(' | ')}`,
      answer: setOf(letter, parts),
      visual: tenths({ kind: 'plane', ...PLANE, marks: pieces.flatMap(pieceMarks), answer: shadow(parts, letter) }),
      explain: `${work} ${trap} So the ${domain ? 'domain' : 'range'} is ${said(letter, parts)}.`,
    };
  }
}

// ── Ranges of the parents ───────────────────────────────────────────────

const SUP = { x: 'ˣ', '+': '⁺', '−': '⁻', ' ': '', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const sup = (s) => [...s].map((c) => SUP[c] ?? c).join('');
const coefText = (a) => (a === 1 ? '' : a === -1 ? '−' : minus(a));
const shiftIn = (h) => (h === 0 ? 'x' : `x ${h > 0 ? '−' : '+'} ${Math.abs(h)}`);
const tailText = (k) => (k === 0 ? '' : ` ${k < 0 ? '−' : '+'} ${Math.abs(k)}`);
const tailAscii = (k) => (k === 0 ? '' : ` ${k < 0 ? '-' : '+'} ${Math.abs(k)}`);

const PARENTS = {
  square: { name: 'x²', show: (a, h, k) => `${coefText(a)}${h ? `(${shiftIn(h)})` : 'x'}²${tailText(k)}`, ascii: (a, h, k) => `${a}*(x - (${h}))**2${tailAscii(k)}`, range: 'y ≥ 0', bounded: true, strict: false },
  abs: { name: '|x|', show: (a, h, k) => `${coefText(a)}|${shiftIn(h)}|${tailText(k)}`, ascii: (a, h, k) => `${a}*abs(x - (${h}))${tailAscii(k)}`, range: 'y ≥ 0', bounded: true, strict: false },
  root: { name: '√x', show: (a, h, k) => `${coefText(a)}√(${shiftIn(h)})${tailText(k)}`.replace('√(x)', '√x'), ascii: (a, h, k) => `${a}*sqrt(x - (${h}))${tailAscii(k)}`, range: 'y ≥ 0', bounded: true, strict: false },
  exp: { name: '2ˣ', show: (a, h, k) => `${coefText(a)}${a === 1 || a === -1 ? '' : ' · '}2${sup(shiftIn(h))}${tailText(k)}`, ascii: (a, h, k) => `${a}*2**(x - (${h}))${tailAscii(k)}`, range: 'y > 0', bounded: true, strict: true },
  recip: { name: '1/x', show: (a, h, k) => `${minus(a)}/(${shiftIn(h)})${tailText(k)}`.replace('/(x)', '/x'), ascii: (a, h, k) => `${a}/(x - (${h}))${tailAscii(k)}`, range: 'y ≠ 0', bounded: false },
  cube: { name: 'x³', show: (a, h, k) => `${coefText(a)}${h ? `(${shiftIn(h)})` : 'x'}³${tailText(k)}`, ascii: (a, h, k) => `${a}*(x - (${h}))**3${tailAscii(k)}`, range: 'every real number', bounded: false, all: true },
};

function parents(rng) {
  const key = rng.pick(['square', 'square', 'abs', 'root', 'root', 'exp', 'exp', 'recip', 'recip', 'cube']);
  const P = PARENTS[key];
  const a = rng.pick([1, 1, 2, 3, -1, -1, -2, -3]);
  const h = rng.int(-4, 4), k = rng.int(-6, 6);
  const show = `f(x) = ${P.show(a, h, k)}`;
  const askDomain = (key === 'root' || key === 'recip') && rng.chance(0.3);
  if (askDomain) {
    const parts = key === 'root' ? [ray(Q(h), 1, true)] : except(Q(h));
    return {
      prompt: [T.prose(`What is the domain of ${show}? Write it with x.`)],
      text: `domain: ${P.ascii(a, h, k)}`,
      answer: setOf('x', parts),
      visual: null,
      explain: (key === 'root' ? `Under the root, ${shiftIn(h)} ≥ 0, so x ≥ ${minus(h)}.` : `The denominator ${shiftIn(h)} is 0 at x = ${minus(h)}, and nothing else is left out.`)
        + ` (Only the shift inside, ${shiftIn(h)}, moves the domain; the ${minus(a)} and the ${minus(k)} outside move the graph up and down.) So the domain is ${said('x', parts)}.`,
    };
  }
  let parts, work;
  const flip = a < 0;
  if (P.all) {
    parts = ALL;
    work = `The parent ${P.name} takes every real value, and stretching, flipping or shifting it still leaves every value.`;
  } else if (key === 'recip') {
    parts = except(Q(k));
    work = `The parent 1/x is never 0, so its range is y ≠ 0. ${Math.abs(a) === 1 && !flip ? 'There is no stretch' : `Stretching${flip ? ' and flipping' : ''}`} keeps the gap at 0, and ${k === 0 ? 'with no shift up or down it stays at y = 0' : `the ${minus(k)} moves the gap to y = ${minus(k)}`}.`;
  } else {
    parts = [ray(Q(k), flip ? -1 : 1, !P.strict)];
    const sign = P.strict ? (flip ? '<' : '>') : (flip ? '≤' : '≥');
    work = `The parent ${P.name} has range ${P.range}. ${flip ? `${a === -1 ? 'The minus sign in front' : `The negative ${minus(a)}`} flips it upside down, so the values are ${P.strict ? '< 0' : '≤ 0'}` : a === 1 ? `With no stretch or flip the values stay ${P.strict ? '> 0' : '≥ 0'}` : `Stretching by ${a} keeps the values ${P.strict ? '> 0' : '≥ 0'}`}, `
      + `and ${k === 0 ? 'there is no shift up or down' : `the ${minus(k)} moves them ${k > 0 ? 'up' : 'down'} ${Math.abs(k)}`}: y ${sign} ${minus(k)}.`;
  }
  return {
    prompt: [T.prose(`What is the range of ${show}? Write it with y.`)],
    text: `range: ${P.ascii(a, h, k)}`,
    answer: setOf('y', parts),
    visual: null,
    explain: `${work} (${h === 0 ? 'Only a vertical flip, stretch or shift changes the range.' : `The ${shiftIn(h)} inside moves the graph sideways, which never changes the range.`}) So the range is ${said('y', parts)}.`,
  };
}

// ── Piecewise ───────────────────────────────────────────────────────────

/** A rule for one piece: shown, ASCII, and its value at x. */
function rule(rng) {
  const kind = rng.pick(['lin', 'lin', 'lin', 'sq', 'const']);
  if (kind === 'const') { const c = rng.int(-6, 6); return { show: minus(c), ascii: String(c), at: () => c, say: (x) => `${minus(c)}, whatever x is` }; }
  if (kind === 'sq') {
    const c = rng.int(-5, 5);
    return { show: `x²${tailText(c)}`, ascii: `x**2${tailAscii(c)}`, at: (x) => x * x + c, say: (x) => `(${minus(x)})²${tailText(c)} = ${minus(x * x + c)}` };
  }
  const m = nz(rng, -3, 3), c = rng.int(-5, 5);
  return { show: linText(m, c), ascii: linAscii(m, c), at: (x) => m * x + c,
    say: (x) => `${m === 1 ? '' : m === -1 ? '−' : minus(m)}${m === 1 || m === -1 ? (x < 0 ? `(${minus(x)})` : minus(x)) : `(${minus(x)})`}${tailText(c)} = ${minus(m * x + c)}` };
}

function piecewiseTable(rng) {
  const three = rng.chance(0.4);
  const b1 = rng.int(-3, 2), b2 = b1 + rng.int(2, 4);
  // Which side owns each boundary.
  const own1 = rng.chance(0.5) ? 'left' : 'right', own2 = rng.chance(0.5) ? 'left' : 'right';
  const rules = [rule(rng), rule(rng), ...(three ? [rule(rng)] : [])];
  const L = (b, own) => (own === 'left' ? ['≤', '<='] : ['<', '<']);
  const R = (b, own) => (own === 'left' ? ['>', '>'] : ['≥', '>=']);
  let conds;
  if (!three) {
    conds = [[`x ${L(b1, own1)[0]} ${minus(b1)}`, `x ${L(b1, own1)[1]} ${b1}`], [`x ${R(b1, own1)[0]} ${minus(b1)}`, `x ${R(b1, own1)[1]} ${b1}`]];
  } else {
    conds = [
      [`x ${L(b1, own1)[0]} ${minus(b1)}`, `x ${L(b1, own1)[1]} ${b1}`],
      [`${minus(b1)} ${own1 === 'left' ? '<' : '≤'} x ${own2 === 'left' ? '≤' : '<'} ${minus(b2)}`, `${b1} ${own1 === 'left' ? '<' : '<='} x ${own2 === 'left' ? '<=' : '<'} ${b2}`],
      [`x ${R(b2, own2)[0]} ${minus(b2)}`, `x ${R(b2, own2)[1]} ${b2}`],
    ];
  }
  const at = rng.chance(0.55) ? rng.pick(three ? [b1, b2] : [b1]) : rng.int(-6, 7);
  const holds = conds.map(([, c]) => {
    const m = c.match(/^(-?\d+) (<=?) x (<=?) (-?\d+)$/);
    if (m) { const lo = +m[1], hi = +m[4]; return (m[2] === '<=' ? at >= lo : at > lo) && (m[3] === '<=' ? at <= hi : at < hi); }
    const n = c.match(/^x (<=|>=|<|>) (-?\d+)$/); const v = +n[2];
    return { '<': at < v, '<=': at <= v, '>': at > v, '>=': at >= v }[n[1]];
  });
  const i = holds.indexOf(true);
  const value = rules[i].at(at);
  const boundary = at === b1 || (three && at === b2);
  return {
    prompt: [T.prose(`The function f is defined in pieces, one rule for each part of its domain. Find f(${minus(at)}).`)],
    text: `piecewise: ${rules.map((r, j) => `${r.ascii} if ${conds[j][1]}`).join('; ')}; at ${at}`,
    answer: { type: 'int', value },
    visual: { kind: 'table', cols: ['f(x) =', 'when'], rows: rules.map((r, j) => [r.show, conds[j][0]]),
      workingCol: `at x = ${minus(at)}`, working: rules.map((r, j) => (j === i ? r.say(at) : '')) },
    explain: `x = ${minus(at)} meets the condition ${conds[i][0]}${boundary ? `: at the boundary, the ${conds[i][0].includes('≤') || conds[i][0].includes('≥') ? 'piece with the "or equal" sign' : 'other piece has the strict sign'} owns ${minus(at)}` : ''}, so use that rule only: f(${minus(at)}) = ${rules[i].say(at)}. `
      + `(${boundary ? 'At a boundary only one piece applies: the one whose sign includes it.' : 'Working out every rule and picking one at random is not the same as finding the right piece.'}) So f(${minus(at)}) = ${minus(value)}.`,
  };
}

/** Two straight pieces meeting at x = b with a jump, ends filled or open. */
function piecewiseGraph(rng) {
  for (;;) {
    const b = rng.int(-2, 3);
    const leftOwns = rng.chance(0.5);
    const l = [[rng.int(-7, b - 2), rng.int(-6, 6)], [b, rng.int(-6, 6)]];
    const r = [[b, rng.int(-6, 6)], [rng.int(b + 2, 7), rng.int(-6, 6)]];
    if (l[1][1] === r[0][1]) continue;
    const pieces = [{ pts: l, left: 'closed', right: leftOwns ? 'closed' : 'open' }, { pts: r, left: leftOwns ? 'open' : 'closed', right: 'closed' }];
    const at = rng.chance(0.6) ? b : rng.pick([l[0][0], r[1][0]]);
    const own = at === b ? (leftOwns ? l[1] : r[0]) : at === l[0][0] ? l[0] : r[1];
    const value = own[1];
    const other = leftOwns ? r[0] : l[1];
    return {
      prompt: [T.prose(`The graph of f is shown: a filled dot is on the graph and an open dot is not. Find f(${minus(at)}).`)],
      text: `piecewise graph: ${pieces.map(pieceText).join(' | ')}; at ${at}`,
      answer: { type: 'int', value },
      visual: tenths({ kind: 'plane', ...PLANE, marks: pieces.flatMap(pieceMarks), answer: [{ kind: 'point', at: [at, value], tone: ASKED, label: `(${minus(at)}, ${minus(value)})` }] }),
      explain: at === b
        ? `Above x = ${minus(b)} there are two dots: a filled one at y = ${minus(value)} and an open one at y = ${minus(other[1])}. Only the filled dot is on the graph. (The open dot marks where the other piece stops just short of x = ${minus(b)}; it is not a value of f.) So f(${minus(b)}) = ${minus(value)}.`
        : `x = ${minus(at)} is the filled dot at the end of a piece, at height ${minus(value)}. (Read the height, y, at that x; not the x again.) So f(${minus(at)}) = ${minus(value)}.`,
    };
  }
}

function piecewise(rng) {
  return rng.chance(0.65) ? piecewiseTable(rng) : piecewiseGraph(rng);
}

// ── Step functions ──────────────────────────────────────────────────────

const dec1 = (rng, lo, hi) => { let v; do v = rng.int(lo * 10, hi * 10) / 10; while (Number.isInteger(v)); return v; };
/** 2 hours 20 minutes, 1 hour, 45 minutes. */
function timeSay(m) {
  const h = Math.floor(m / 60), r = m % 60;
  const hs = h ? `${h} hour${h === 1 ? '' : 's'}` : '';
  const rs = r ? `${r} minute${r === 1 ? '' : 's'}` : '';
  return [hs, rs].filter(Boolean).join(' ');
}
// requiem: catalogue/content/one-input-per-level
// One box for the whole level: a step's value is a whole number, typed in
// the same decimal box as a charge in dollars and cents.
const whole = (v) => ({ type: 'decimal', value: { n: v, d: 1 } });
const money = (cents) => ({ type: 'decimal', value: { n: cents, d: 100 } });
const dollars = (cents) => `$${(cents / 100).toFixed(2)}`;

function steps(rng) {
  const kind = rng.pick(['floor', 'floor', 'ceil', 'shifted', 'each', 'first']);
  if (kind === 'floor' || kind === 'ceil') {
    const x = dec1(rng, -6, 6);
    const v = kind === 'floor' ? Math.floor(x) : Math.ceil(x);
    const sym = kind === 'floor' ? `⌊${minus(x)}⌋` : `⌈${minus(x)}⌉`;
    return {
      prompt: [T.prose(`${kind === 'floor' ? '⌊x⌋ is the greatest integer less than or equal to x' : '⌈x⌉ is the least integer greater than or equal to x'}. Find ${sym}.`)],
      text: `step value: ${kind}(${x})`,
      answer: whole(v),
      visual: null,
      explain: `${minus(x)} is between the integers ${minus(Math.floor(x))} and ${minus(Math.ceil(x))}. ${kind === 'floor' ? 'The floor is the one at or below it' : 'The ceiling is the one at or above it'}: ${minus(v)}. `
        + `(${x < 0 ? `For a negative number, ${kind === 'floor' ? `below means further from 0: ${sym} is ${minus(v)}, not ${minus(v + 1)}` : `above means nearer 0: ${sym} is ${minus(v)}, not ${minus(v - 1)}`}.` : `${kind === 'floor' ? 'The floor drops the decimal; it never rounds up.' : 'The ceiling goes up even for a small decimal.'}`}) So ${sym} = ${minus(v)}.`,
    };
  }
  if (kind === 'shifted') {
    const x = dec1(rng, -5, 5);
    const m = rng.pick([1, 2, 3, -1, 2]), c = rng.int(-4, 4);
    const inside = rng.chance(0.4);
    const v = inside ? Math.floor(m * x) + c : m * Math.floor(x) + c;
    const show = inside ? `f(x) = ⌊${m === 1 ? '' : m === -1 ? '−' : m}x⌋${tailText(c)}` : `f(x) = ${coefText(m)}⌊x⌋${tailText(c)}`;
    const fl = inside ? Math.floor(m * x) : Math.floor(x);
    const ascii = inside ? `floor(${m}*${x})${tailAscii(c)}` : `${m}*floor(${x})${tailAscii(c)}`;
    return {
      prompt: [T.prose(`⌊x⌋ is the greatest integer less than or equal to x, and ${show}. Find f(${minus(x)}).`)],
      text: `step value: ${ascii}`,
      answer: whole(v),
      visual: null,
      explain: inside
        ? `Inside first: ${m === 1 ? '' : `${minus(m)} × `}${minus(x)} = ${minus(Math.round(m * x * 10) / 10)}, and its floor is ${minus(fl)}. Then ${minus(fl)}${tailText(c)} = ${minus(v)}. (The floor comes after the multiplying, not before.) So f(${minus(x)}) = ${minus(v)}.`
        : `⌊${minus(x)}⌋ = ${minus(fl)}${x < 0 ? ', the integer below it' : ''}. Then ${m === 1 ? '' : `${minus(m)} × `}${m === 1 ? minus(fl) : `(${minus(fl)})`}${tailText(c)} = ${minus(v)}. (Take the floor of x first, then multiply: ${minus(m)} × ${minus(x)} is not on the steps.) So f(${minus(x)}) = ${minus(v)}.`,
    };
  }
  // A charge for each unit or part of one, perhaps after a first unit.
  const S = rng.pick([
    { thing: 'A parking garage charges', unit: 'hour', units: 'hours', per: 60, sub: 'minutes', amount: () => rng.int(1, 9) * 60 + rng.pick([0, 5, 15, 20, 30, 40, 45, 50]), say: timeSay, rates: [[300, 150], [400, 200], [250, 125], [500, 300]] },
    { thing: 'Mailing a letter costs', unit: 'ounce', units: 'ounces', per: 10, sub: 'tenths of an ounce', amount: () => rng.int(11, 69), say: (t) => `${(t / 10).toFixed(1)} ounces`, rates: [[73, 24], [68, 21], [80, 25]] },
    { thing: 'A courier charges', unit: 'kilogram', units: 'kilograms', per: 10, sub: 'tenths of a kilogram', amount: () => rng.int(11, 79), say: (t) => `${(t / 10).toFixed(1)} kilograms`, rates: [[450, 175], [600, 250], [525, 150]] },
    { thing: 'A bike rental costs', unit: 'half hour', units: 'half hours', per: 30, sub: 'minutes', amount: () => rng.int(1, 8) * 30 + rng.pick([0, 5, 10, 20, 25]), say: timeSay, rates: [[500, 250], [400, 300], [600, 200]] },
  ]);
  const [first, each] = rng.pick(S.rates);
  const flat = kind === 'each';
  // After a first unit there is always some left to charge for.
  const amt = S.amount() + (flat ? 0 : S.per);
  const started = Math.ceil(amt / S.per);
  const cents = flat ? started * each : first + Math.max(0, Math.ceil((amt - S.per) / S.per)) * each;
  const extra = Math.max(0, Math.ceil((amt - S.per) / S.per));
  const rule = flat ? `${dollars(each)} for each ${S.unit} or part of one` : `${dollars(first)} for the first ${S.unit} and ${dollars(each)} for each extra ${S.unit} or part of one`;
  const exact = (flat ? amt : amt - S.per) % S.per === 0 || (!flat && amt <= S.per);
  // Whether the part left over is under half a unit, so rounding to the nearest would go down.
  const small = ((flat ? amt : amt - S.per) % S.per) / S.per < 0.5;
  return {
    prompt: [T.prose(`${S.thing} ${rule}. What is the charge for ${S.say(amt)}?`)],
    text: flat ? `each started: ${each} per ${S.per}, amount ${amt}` : `first then each: ${first} then ${each} per ${S.per}, amount ${amt}`,
    answer: money(cents),
    visual: null,
    explain: (flat
      ? `${exact ? `${S.say(amt)} is exactly ${started} ${started === 1 ? S.unit : S.units}` : `${S.say(amt)} is more than ${Math.floor(amt / S.per)} ${Math.floor(amt / S.per) === 1 ? S.unit : S.units} but less than ${started}, and the part of one is charged as a whole one: ${started} ${S.units}`}. ${started} × ${dollars(each)} = ${dollars(cents)}. `
      : `The first ${S.unit} is ${dollars(first)}. What is left is ${S.say(amt - S.per)}, which is ${extra} extra ${extra === 1 ? S.unit : S.units} once any part is counted as a whole one: ${dollars(first)} + ${extra} × ${dollars(each)} = ${dollars(cents)}. `)
      + `(${exact ? 'A whole number of units is not rounded up again: there is no part left over.' : small ? 'Rounding to the nearest unit would charge less: "or part of one" always rounds up.' : 'Any part of a unit counts as a whole one, however small or large the part.'}) So ${dollars(cents)}.`,
  };
}

// ── Domain in context ───────────────────────────────────────────────────

// requiem: catalogue/content/context-domain-both-kinds
// Every setting comes both ways, as a measure and as a count, so the words
// of the story cannot give the answer away: only the unit can.
const SETTINGS = [
  { what: 'Apples', verb: 'cost', measure: ['pound', 'pounds'], count: ['bag', 'bags'], price: [2, 3, 4] },
  { what: 'Rice', verb: 'costs', measure: ['kilogram', 'kilograms'], count: ['box', 'boxes'], price: [2, 3, 5] },
  { what: 'Juice', verb: 'costs', measure: ['liter', 'liters'], count: ['bottle', 'bottles'], price: [2, 3, 4] },
  { what: 'Fabric', verb: 'costs', measure: ['yard', 'yards'], count: ['roll', 'rolls'], price: [6, 8, 9] },
  { what: 'Gasoline', verb: 'costs', measure: ['gallon', 'gallons'], count: ['can', 'cans'], price: [3, 4, 5] },
  { what: 'Rope', verb: 'costs', measure: ['meter', 'meters'], count: ['coil', 'coils'], price: [2, 5, 6] },
];

function contextChoice(rng) {
  const S = rng.pick(SETTINGS);
  const countable = rng.chance(0.5);
  const [one, many] = countable ? S.count : S.measure;
  const price = rng.pick(S.price), max = rng.int(5, 12);
  const top = price * max;
  const v = countable ? 'n' : 'x';
  const opts = [['whole', max], ['real', max], ['whole', top], ['real', top]];
  const all = rng.shuffle(opts);
  const label = ([k, b]) => (k === 'whole' ? `The whole numbers 0, 1, 2, …, ${b}` : `Every real number from 0 to ${b}`);
  const right = all.findIndex(([k, b]) => k === (countable ? 'whole' : 'real') && b === max);
  return {
    prompt: [T.prose(`${S.what} ${S.verb} $${price} per ${one}, and a shopper buys at most ${max} ${many}. C(${v}) is the cost of ${v} ${many}. Which is the domain of C?`)],
    text: `context domain: ${many}, at most ${max}, each ${price}; options ${all.map(([k, b], i) => `${optionIds[i]}: ${k} ${b}`).join(' | ')}`,
    answer: { type: 'choice', value: optionIds[right], options: all.map((o, i) => ({ id: optionIds[i], label: label(o) })) },
    visual: null,
    explain: countable
      ? `${many[0].toUpperCase()}${many.slice(1)} are counted: a shopper can buy 3 ${many} but not 2.5 of them, so ${v} is a whole number, from 0 up to ${max}. `
        + `(${top} is the most it can cost, a value of C(${v}): that is the range, not the domain.) So the whole numbers 0 to ${max}.`
      : `${many[0].toUpperCase()}${many.slice(1)} are measured: 2.5 ${many} is as real a purchase as 3, so ${v} can be any number from 0 up to ${max}. `
        + `(${top} is the most it can cost, a value of C(${v}): that is the range, not the domain.) So every real number from 0 to ${max}.`,
  };
}

function contextTyped(rng) {
  if (rng.chance(0.5)) {
    // A ball's height until it lands: h(t) = −16(t − T)(t + s) or −5(...).
    const metric = rng.chance(0.5);
    const g = metric ? 5 : 16;
    const T_ = rng.int(2, 5), s = rng.pick([0, 0, 1, 2]);
    const b = g * (T_ - s), c = g * T_ * s;
    const show = `h(t) = −${g}t²${b === 0 ? '' : ` ${b < 0 ? '−' : '+'} ${Math.abs(b)}t`}${c === 0 ? '' : ` + ${c}`}`;
    const parts = [{ lo: Q(0), loIn: true, hi: Q(T_), hiIn: true }];
    return {
      prompt: [T.prose(`A ball is ${s === 0 ? 'thrown up from the ground' : `thrown up from a ledge ${c} ${metric ? 'meters' : 'feet'} high`}. Its height after t seconds is ${show} ${metric ? 'meters' : 'feet'}, until it lands on the ground. What is the domain of h in this situation? Write it with t.`)],
      text: `context domain: -${g}*t**2 + ${b}*t + ${c} >= 0, t >= 0`,
      answer: setOf('t', parts),
      visual: null,
      explain: `Time starts at t = 0, when it is thrown. It lands when h(t) = 0: ${show.slice(7)} = ${s ? `−${g}(t − ${T_})(t + ${s})` : `−${g}t(t − ${T_})`} = 0 at t = ${T_}${s ? ` (t = −${s} is before it was thrown)` : ''}. `
        + `(The formula still gives numbers after t = ${T_}, but they are negative heights: the ball is on the ground, so they are not part of this story.) So 0 ≤ t ≤ ${T_}.`,
    };
  }
  const metric = rng.chance(0.5);
  const r = rng.pick(metric ? [20, 25, 40, 50] : [5, 8, 10, 12, 15]);
  const T_ = rng.int(4, 30);
  const V0 = r * T_;
  const unit = metric ? 'liters' : 'gallons';
  const parts = [{ lo: Q(0), loIn: true, hi: Q(T_), hiIn: true }];
  return {
    prompt: [T.prose(`A tank holds ${V0} ${unit} and drains at ${r} ${unit} per minute until it is empty. V(t) = ${V0} − ${r}t is the water left after t minutes. What is the domain of V in this situation? Write it with t.`)],
    text: `context domain: ${V0} - ${r}*t >= 0, t >= 0`,
    answer: setOf('t', parts),
    visual: null,
    explain: `Time starts at t = 0, when it is full. It is empty when ${V0} − ${r}t = 0: t = ${V0} ÷ ${r} = ${T_}. Between, any time is possible, so t takes every value from 0 to ${T_}. `
      + `(Past t = ${T_} the formula gives a negative amount of water, which cannot happen.) So 0 ≤ t ≤ ${T_}.`,
  };
}

function context(rng) {
  return rng.chance(0.5) ? contextChoice(rng) : contextTyped(rng);
}

const CONTENT = [domains, fromGraph, parents, piecewise, steps, context];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  // requiem: catalogue/content/one-input-per-level
  // The mixed level deals from every level. A set goes in the solutions box
  // and a value in a number box, but the question already says which it
  // wants, "what is the domain" or "find f(3)", so the box gives nothing away.
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
