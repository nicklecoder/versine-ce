/**
 * Catalogue authoring tool: builds the problem library for trig-graphs.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 *
 * Every `text` carries the equation exactly as the student reads it, in
 * ASCII (`y = -3 sin 2x + 1`), and scripts/check-answers.py evaluates that
 * equation itself: the period is found by testing shifts, the maximum and
 * minimum by searching the wave, and a phase shift by sliding the parent
 * wave and comparing. A drawn graph is checked against its equation point
 * by point. A model's numbers are worked again from the story.
 */
import * as T from '../terms.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/trig-graphs.js';
import { fracAnswer, fracText, reduce } from './chance.js';
import { text, LINE, GIVEN } from './figures.js';
import { piText, safeRound, roundedAnswer, roundedText, placeWords, placeText } from './trig.js';

const minus = (s) => String(s).replace(/-/g, '−');
const Q = (n, d = 1) => { const q = reduce(n, d); return q.d < 0 ? { n: -q.n, d: -q.d } : q; };
const qv = (q) => q.n / q.d;
const qText = (q) => minus(fracText(q.n, q.d));
const ascii = (s) => s.replace(/−/g, '-').replace(/π/g, 'pi');
/** The prompt's "▢π", for a period kept in π. */
const piBlank = (name) => [T.letter(name), T.op('='), T.blank(), T.letter('π')];

// ── The sinusoid y = a·f(b(x − h)) + k ──────────────────────────────────
//
// b is {n, d, pi}: n/d, times π when pi is set. h is a fraction of π when b
// has no π (sin(2(x − π/6))), and a plain number when it has (cos(π(t − 3)/6)).

const wave = (a, fn, b, h = Q(0), k = 0) => ({ a, fn, b, h, k });
const bValue = (s) => qv(s.b) * (s.b.pi ? Math.PI : 1);
const hValue = (s) => qv(s.h) * (s.b.pi ? 1 : Math.PI);
const at = (s, x) => s.a * Math[s.fn](bValue(s) * (x - hValue(s))) + s.k;
const periodOf = (s) => (2 * Math.PI) / bValue(s);
/** The period as written: π, 2π/3, 4π, or 12 when b has π in it. */
const periodQ = (s) => (s.b.pi ? Q(2 * s.b.d, s.b.n) : Q(2 * s.b.d, s.b.n));
const periodText = (s) => (s.b.pi ? qText(periodQ(s)) : piText(periodQ(s).n, periodQ(s).d));

/** bx as written: x, 2x, x/2, 3x/2, πx/6, πx. */
function bxText(b, x = 'x') {
  const top = `${b.n === 1 ? '' : b.n}${b.pi ? 'π' : ''}${x}`;
  return b.d === 1 ? top : `${top}/${b.d}`;
}

/** The inside of f, factored (2(x − π/6)) or multiplied out (2x − π/3). */
function inner(s, expanded = false, x = 'x') {
  const { b, h } = s;
  if (h.n === 0) return bxText(b, x);
  const sign = h.n > 0 ? '−' : '+';
  const H = Q(Math.abs(h.n), h.d);
  if (expanded || (b.d !== 1 && !b.pi)) {
    // b·h, the number subtracted after multiplying out.
    const K = Q(b.n * H.n, b.d * H.d);
    return `${bxText(b, x)} ${sign} ${b.pi ? piText(K.n, K.d) : piText(K.n, K.d)}`;
  }
  const hs = b.pi ? qText(H) : piText(H.n, H.d);
  if (b.pi) {
    const lead = b.n === 1 ? 'π' : `${b.n}π`;
    return b.d === 1 ? `${lead}(${x} ${sign} ${hs})` : `${lead}(${x} ${sign} ${hs})/${b.d}`;
  }
  return b.n === 1 ? `${x} ${sign} ${hs}` : `${b.n}(${x} ${sign} ${hs})`;
}

/**
 * y = −3 sin 2x + 1, as the student reads it: a single term goes bare (sin x,
 * cos 2x), anything with a fraction, a π or a shift in brackets.
 */
function eq(s, { expanded = false, x = 'x', y = 'y' } = {}) {
  const lead = s.a === 1 ? '' : s.a === -1 ? '−' : `${minus(s.a)} `;
  const tail = s.k === 0 ? '' : s.k > 0 ? ` + ${s.k}` : ` − ${-s.k}`;
  const arg = inner(s, expanded, x);
  const bare = new RegExp(`^\\d*${x}$`).test(arg);
  return `${y} = ${lead}${s.fn}${bare ? ` ${arg}` : `(${arg})`}${tail}`;
}

const B = (n, d = 1, pi = false) => ({ ...Q(n, d), pi });

/** The first peak at or after x = 0 of an unshifted wave, as a multiple of π. */
function peakQ(s) {
  const b = s.b;
  return s.fn === 'cos' ? (s.a > 0 ? Q(0) : Q(b.d, b.n)) : (s.a > 0 ? Q(b.d, 2 * b.n) : Q(3 * b.d, 2 * b.n));
}
const at0 = (q) => (q.n === 0 ? '0' : piText(q.n, q.d));
/** cos π bare, cos(3π/4) in brackets. */
const bareCos = (a) => (/^\d*π$/.test(a) ? `cos ${a}` : `cos(${a})`);
const GRAPH_B = [B(1), B(2), B(1, 2), B(3), B(1), B(2)];
const EQUATION_B = [B(1), B(2), B(3), B(4), B(1, 2), B(1, 3), B(2, 3), B(3, 2), B(1, 4)];

// ── The graph ───────────────────────────────────────────────────────────

const DIM = 'var(--dim)';
const one = (v) => Math.round(v * 10) / 10;

// requiem: catalogue/content/wave-graphs-drawn-from-their-equation
/**
 * The wave over two periods (or one, when that is already 4π), drawn at x
 * on exact tenths so a point's y is the equation's to within 0.05, with
 * dots at each peak and trough, a light line at each whole y, and π-marks
 * on the x-axis.
 */
function graph(s, reveal) {
  const P = periodOf(s);
  const x1 = Math.min(4 * Math.PI + 0.01, P * (P > 2 * Math.PI ? 1 : 2));
  const step = bValue(s) >= 2 ? 0.1 : 0.2;
  const curve = [];
  for (let x = 0; x <= x1 + 1e-9; x += step) curve.push([one(x), one(at(s, one(x)))]);
  const top = s.k + Math.abs(s.a), bottom = s.k - Math.abs(s.a);
  const yHi = Math.max(0, top), yLo = Math.min(0, bottom);
  const marks = [];
  for (let y = Math.ceil(yLo); y <= Math.floor(yHi); y++) {
    if (y !== 0) marks.push({ kind: 'segment', from: [0, y], to: [one(x1 + 0.3), y], tone: DIM, dashed: true });
    marks.push(text([-0.45, y], minus(y), 'var(--muted)'));
  }
  marks.push({ kind: 'segment', from: [-0.3, 0], to: [one(x1 + 0.4), 0], tone: 'var(--muted)' });
  marks.push({ kind: 'segment', from: [0, one(yLo - 0.5)], to: [0, one(yHi + 0.5)], tone: 'var(--muted)' });
  // requiem: catalogue/content/wave-ticks-fit-b
  // Ticks at multiples of π/(2b), so every peak, trough and midline
  // crossing sits on one: π/4 for b = 1, 2 or 1/2, π/6 for b = 3, every
  // other one labeled.
  const per = s.b.n % 3 === 0 ? 6 : 4;
  for (let q = 1; q * Math.PI / per <= x1 + 1e-9; q++) {
    const x = one((q * Math.PI) / per);
    marks.push({ kind: 'segment', from: [x, -0.12], to: [x, 0.12], tone: 'var(--muted)' });
    if (q % 2 === 0) marks.push(text([x, -0.42], piText(q, per), 'var(--muted)'));
  }
  marks.push({ kind: 'path', tone: LINE, points: curve });
  // A peak or trough falls where b(x − h) is a multiple of π/2 that sin or cos tops out at.
  const extremes = [];
  const h = hValue(s), bv = bValue(s);
  for (let m = -8; m <= 16; m++) {
    const u = s.fn === 'sin' ? Math.PI / 2 + m * Math.PI : m * Math.PI;
    const x = h + u / bv;
    if (x < -1e-9 || x > x1 + 1e-9) continue;
    extremes.push([one(x), one(at(s, x))]);
  }
  for (const p of extremes) marks.push({ kind: 'point', at: p, tone: GIVEN });
  return { kind: 'plane', xRange: [-0.9, one(x1 + 0.6)], yRange: [one(yLo - 0.9), one(yHi + 0.9)], grid: 0, axes: false, marks, answer: reveal(s, x1, extremes) };
}

/** The midline, dashed, with the asked quantity written beside it. */
const midlineReveal = (label) => (s, x1) => [
  { kind: 'segment', from: [0, s.k], to: [one(x1 + 0.3), s.k], tone: 'var(--result)', dashed: true },
  text([one(x1 / 2), one(s.k + (s.a > 0 ? -0.35 : 0.35))], label, 'var(--result)'),
];
/** One full cycle, peak to peak, marked under the wave. */
const periodReveal = (label) => (s, x1, extremes) => {
  const peaks = extremes.filter((p) => Math.abs(p[1] - (s.k + Math.abs(s.a))) < 0.1);
  const [p, q] = peaks;
  const y = one(s.k + Math.abs(s.a) + 0.45);
  if (!q) throw new Error(`one peak only in ${eq(s)}`);
  return [{ kind: 'segment', from: [p[0], y], to: [q[0], y], tone: 'var(--result)' }, text([one((p[0] + q[0]) / 2), one(y + 0.35)], label, 'var(--result)')];
};

function randomWave(rng, bs, { shift = false } = {}) {
  const fn = rng.pick(['sin', 'cos']);
  const a = rng.pick([1, 2, 3, 4, 2, 3]) * (rng.chance(0.3) ? -1 : 1);
  const k = rng.int(-3, 3);
  if (Math.abs(a) + Math.abs(k) > 6) return randomWave(rng, bs, { shift });
  const b = rng.pick(bs);
  const h = shift && b.d === 1 ? Q(rng.pick([1, 1, 1, 2, 3]) * (rng.chance(0.5) ? -1 : 1), rng.pick([2, 3, 4, 6])) : Q(0);
  return wave(a, fn, b, h, k);
}

// ── Amplitude ───────────────────────────────────────────────────────────

function amplitude(rng) {
  const drawn = rng.chance(0.45);
  const s = randomWave(rng, drawn ? GRAPH_B : EQUATION_B);
  const A = Math.abs(s.a);
  const top = s.k + A, bottom = s.k - A;
  if (drawn) {
    return {
      prompt: [T.prose('What is the amplitude of this wave?')],
      text: `wave graph: ${ascii(eq(s))}; want amplitude`,
      answer: fracAnswer(A, 1),
      visual: graph(s, midlineReveal(`amplitude ${A}`)),
      explain: `The peaks are at y = ${minus(top)} and the troughs at y = ${minus(bottom)}. The amplitude is half the distance between them: (${minus(top)} − ${bottom < 0 ? `(${minus(bottom)})` : bottom}) ÷ 2 = ${2 * A} ÷ 2 = ${A}. `
        + `(The full height from trough to peak is ${2 * A}, twice the amplitude; the amplitude is measured from the midline.) So the amplitude is ${A}.`,
    };
  }
  return {
    prompt: [T.prose(`What is the amplitude of ${eq(s)}?`)],
    text: `wave: ${ascii(eq(s))}; want amplitude`,
    answer: fracAnswer(A, 1),
    visual: null,
    explain: `In y = a ${s.fn} bx + k the amplitude is |a|, and here a = ${minus(s.a)}, so it is ${A}. `
      + `(${s.a < 0 ? 'The minus sign flips the wave upside down; it does not make the amplitude negative.' : s.k !== 0 ? `The ${minus(s.k)} moves the wave ${s.k > 0 ? 'up' : 'down'}; it does not change its height.` : 'The number inside with x changes the period, not the height.'}) So the amplitude is ${A}.`,
  };
}

// ── Period ──────────────────────────────────────────────────────────────

function period(rng) {
  const drawn = rng.chance(0.4);
  const piB = !drawn && rng.chance(0.25);
  // A drawn period needs two peaks in the window, so never b = 1/2 there.
  const s = piB ? wave(rng.pick([1, 2, 3, -2]), rng.pick(['sin', 'cos']), B(1, rng.pick([1, 2, 3, 4, 6, 12]), true), Q(0), rng.int(-2, 2))
    : randomWave(rng, drawn ? [B(1), B(2), B(3)] : EQUATION_B);
  const p = periodQ(s);
  const bShown = s.b.pi ? (s.b.d === 1 ? 'π' : `π/${s.b.d}`) : qText(s.b);
  const work = s.b.pi ? `2π ÷ ${bShown} = 2 × ${s.b.d} = ${qText(p)}` : `2π ÷ ${bShown} = ${periodText(s)}`;
  const answer = fracAnswer(p.n, p.d);
  const ask = s.b.pi ? [T.prose(`What is the period of ${eq(s)}?`)] : [T.prose(`What is the period of ${eq(s)}, as a multiple of π?`), ...piBlank('P')];
  if (drawn) {
    return {
      prompt: [T.prose('What is the period of this wave, as a multiple of π?'), ...piBlank('P')],
      text: `wave graph: ${ascii(eq(s))}; want period (pi)`,
      answer,
      visual: graph(s, periodReveal(`period ${periodText(s)}`)),
      explain: `One peak is at x = ${at0(peakQ(s))} and the next is at x = ${at0(Q(peakQ(s).n * p.d + p.n * peakQ(s).d, peakQ(s).d * p.d))}, so the wave repeats every ${periodText(s)}. `
        + `(Peak to the next peak is a whole cycle; peak to trough is only half of one.) So P = ${periodText(s)}, and the box takes ${qText(p)}.`,
    };
  }
  return {
    prompt: ask,
    text: `wave: ${ascii(eq(s))}; want period${s.b.pi ? '' : ' (pi)'}`,
    answer,
    visual: null,
    explain: `One cycle of ${s.fn} takes 2π, and b = ${bShown} ${s.b.pi || qv(s.b) > 1 ? 'squeezes it' : qv(s.b) === 1 ? 'leaves it as it is' : 'stretches it'}: the period is 2π ÷ b = ${work}. `
      + `(${s.b.n / s.b.d > 1 || s.b.pi ? 'A bigger b makes the cycle shorter: divide 2π by b, do not multiply.' : s.b.n === s.b.d ? 'With b = 1 the wave is not squeezed at all: the period is the parent wave\'s.' : 'A b less than 1 stretches the cycle longer than 2π.'}) So the period is ${s.b.pi ? qText(p) : periodText(s)}.`,
  };
}

// ── Midline ─────────────────────────────────────────────────────────────

function midline(rng) {
  const drawn = rng.chance(0.4);
  const s = randomWave(rng, drawn ? GRAPH_B : EQUATION_B, { shift: !drawn && rng.chance(0.3) });
  const A = Math.abs(s.a), top = s.k + A, bottom = s.k - A;
  const want = drawn ? 'midline' : rng.pick(['midline', 'max', 'min', 'midline']);
  if (drawn) {
    return {
      prompt: [T.prose('This wave rises and falls about the line y = k. What is k?')],
      text: `wave graph: ${ascii(eq(s))}; want midline`,
      answer: fracAnswer(s.k, 1),
      visual: graph(s, midlineReveal(`y = ${minus(s.k)}`)),
      explain: `The peaks are at y = ${minus(top)} and the troughs at y = ${minus(bottom)}. The midline is halfway: (${minus(top)} + ${bottom < 0 ? `(${minus(bottom)})` : bottom}) ÷ 2 = ${minus(s.k)}. `
        + `(Halfway between peak and trough, not the x-axis, unless they are the same distance from it.) So k = ${minus(s.k)}.`,
    };
  }
  const value = want === 'midline' ? s.k : want === 'max' ? top : bottom;
  const word = { midline: 'the midline y = k', max: 'the maximum value', min: 'the minimum value' }[want];
  return {
    prompt: [T.prose(want === 'midline' ? `${eq(s)} rises and falls about the line y = k. What is k?` : `What is the ${want === 'max' ? 'maximum' : 'minimum'} value of ${eq(s)}?`)],
    text: `wave: ${ascii(eq(s))}; want ${want}`,
    answer: fracAnswer(value, 1),
    visual: null,
    explain: `The midline is y = k = ${minus(s.k)}, and the amplitude is |a| = ${A}. ${want === 'midline' ? '' : `The wave goes ${A} ${want === 'max' ? 'above' : 'below'} the midline: ${minus(s.k)} ${want === 'max' ? '+' : '−'} ${A} = ${minus(value)}. `}`
      + `(${want === 'midline' ? 'The number added at the end is the midline; the number in front changes the height of the wave around it.' : s.a < 0 ? 'A negative a flips the wave, but its peak is still |a| above the midline.' : 'The maximum is the midline plus the amplitude, not the amplitude alone.'}) So ${word} is ${minus(value)}.`,
  };
}

// ── Phase Shift ─────────────────────────────────────────────────────────

/** "π/6 to the right": a shift's label, and its id for the text. */
const shiftLabel = (dir, q) => `${piText(q.n, q.d)} ${dir === 'right' || dir === 'left' ? `to the ${dir}` : dir}`;
const shiftKey = (dir, q) => `${dir} ${q.n}/${q.d} pi`;
/** Does sliding (or lifting) base by this much give s? */
function shiftWorks(s, base, dir, q) {
  const v = (q.n / q.d) * Math.PI;
  return [0.3, 1.1, 2.4, 3.7, 5.2, -1.6].every((x) => {
    const want = at(s, x);
    const got = dir === 'right' ? at(base, x - v) : dir === 'left' ? at(base, x + v) : dir === 'up' ? at(base, x) + v : at(base, x) - v;
    return Math.abs(want - got) < 1e-9;
  });
}

/** A shift size some phase-shift row can key: n/d of π with n of 1 to 3 and d of 3 to 12, under π. */
const KEYABLE = (q) => [1, 2, 3].some((n) => [3, 4, 6, 8, 12].some((d) => q.n * d === n * q.d && n < d));

function phaseShift(rng) {
  for (;;) {
    const b = rng.pick([B(1), B(1), B(2), B(2), B(3), B(4)]);
    const H = Q(rng.pick([1, 1, 2, 3]) * (rng.chance(0.5) ? -1 : 1), rng.pick([3, 4, 6, 8, 12]));
    if (Math.abs(qv(H)) >= 1) continue;
    const fn = rng.pick(['sin', 'cos']);
    const s = wave(1, fn, b, H, 0), base = wave(1, fn, b, Q(0), 0);
    const expanded = b.n !== 1 && rng.chance(0.7);
    const dir = H.n > 0 ? 'right' : 'left', other = dir === 'right' ? 'left' : 'right';
    const size = Q(Math.abs(H.n), H.d);
    const K = Q(b.n * size.n, size.d);
    const trap = b.n === 1 ? size : K;
    // requiem: catalogue/content/decoys-cross-two-slips
    // The slips are the direction and the size, crossed: the other way, the
    // wrong size (b × h read as the shift, or with b = 1 the shift doubled or
    // halved), and both -- never a lift up or down.
    // requiem: catalogue/content/fixed-menu-key-moves
    // With b > 1 the wrong size is b × h (the number inside read as the
    // shift, as it is written expanded) or h ÷ b (b divided out of a shift
    // already factored), each more often on the form that invites it: with
    // b × h alone, the key was the smaller size in every such row.
    // Either way the wrong size must be one some row keys (π/24 or 3π/2,
    // never a shift here, would be struck unread), so a slip that lands
    // outside the shifts asked gives way to the other, or the row is redrawn.
    let divided = b.n !== 1 && rng.chance(expanded ? 0.25 : 0.75);
    if (b.n !== 1 && !KEYABLE(divided ? Q(size.n, b.n * size.d) : trap)) divided = !divided;
    const wrongSize = b.n === 1 ? (rng.chance(0.5) ? Q(2 * size.n, size.d) : Q(size.n, 2 * size.d)) : divided ? Q(size.n, b.n * size.d) : trap;
    if (!KEYABLE(wrongSize)) continue;
    const options = [[dir, size], [other, size], [dir, wrongSize], [other, wrongSize]];
    const valid = options.filter(([d, q]) => shiftWorks(s, base, d, q));
    if (valid.length !== 1) continue;
    const ids = ['a', 'b', 'c', 'd'];
    const order = rng.shuffle([0, 1, 2, 3]);
    const opts = order.map((i, j) => ({ id: ids[j], label: shiftLabel(...options[i]), key: shiftKey(...options[i]) }));
    const right = opts.find((o) => o.key === shiftKey(dir, size));
    const shown = eq(s, { expanded });
    const factored = `${fn}(${b.n}(x ${H.n > 0 ? '−' : '+'} ${piText(size.n, size.d)}))`;
    return {
      prompt: [T.prose(`How is the graph of ${shown} moved from the graph of ${eq(base)}?`)],
      text: `shift: ${ascii(shown)} from ${ascii(eq(base))}; options ${opts.map((o) => `${o.id}: ${o.key}`).join(' | ')}`,
      answer: { type: 'choice', value: right.id, options: opts.map(({ id, label }) => ({ id, label })) },
      visual: null,
      explain: `${expanded ? `Factor b out of the inside first: ${fn}(${inner(s, true)}) = ${factored}. ` : ''}`
        + `In ${fn}(${b.n === 1 ? '' : 'b('}x − h${b.n === 1 ? '' : ')'}) the wave moves h to the right, and here h = ${piText(H.n, H.d)}, so it moves ${piText(size.n, size.d)} to the ${dir}. `
        + `(${b.n === 1 ? `A minus inside moves the wave right, the opposite of how it reads, and by exactly ${piText(size.n, size.d)}, not twice or half that.`
          : divided ? `${expanded ? `Divide ${piText(K.n, K.d)} by ${b.n} once` : `Factored, the number in the brackets is already the shift`}: ${piText(size.n, size.d)}, not ${piText(wrongSize.n, wrongSize.d)}.`
            : expanded ? `The ${piText(K.n, K.d)} is b × h, not the shift: divide it by ${b.n}.` : `Factored, the number in the brackets is already the shift: it is not multiplied by ${b.n}.`}) So ${shiftLabel(dir, size)}.`,
    };
  }
}

// ── Equation From a Graph ───────────────────────────────────────────────

const optionId = ['a', 'b', 'c', 'd'];
const sameWave = (s, t) => [0.2, 0.9, 1.7, 2.6, 3.3, 4.4, 5.9].every((x) => Math.abs(at(s, x) - at(t, x)) < 1e-9);

function fromGraph(rng) {
  for (;;) {
    const s = randomWave(rng, [B(1), B(2), B(1, 2)], { shift: false });
    if (s.k === 0 && rng.chance(0.5)) continue;
    const A = Math.abs(s.a);
    // requiem: catalogue/content/decoys-cross-two-slips
    // Two misreadings of the graph from different features, crossed: the key,
    // each alone, and both. The features: which way the wave starts (the
    // sign of a, or sine for cosine), how fast it cycles (b doubled or
    // halved), how tall it is (peak-to-trough taken as the amplitude, or
    // amplitude and midline swapped), and where its middle is (k's sign).
    const SLIPS = [
      ['start', (t) => wave(-t.a, t.fn, t.b, t.h, t.k)],
      ['start', (t) => wave(t.a, t.fn === 'sin' ? 'cos' : 'sin', t.b, t.h, t.k)],
      ['speed', (t) => wave(t.a, t.fn, B(t.b.n * 2, t.b.d), t.h, t.k)],
      ['speed', (t) => wave(t.a, t.fn, B(t.b.n, t.b.d * 2), t.h, t.k)],
      ['height', (t) => wave(t.a * 2, t.fn, t.b, t.h, t.k)],
      ['height', (t) => (t.k !== 0 && Math.abs(t.k) !== Math.abs(t.a) ? wave(Math.sign(t.a) * Math.abs(t.k), t.fn, t.b, t.h, Math.sign(t.k) * Math.abs(t.a)) : null)],
      ['middle', (t) => (t.k !== 0 ? wave(t.a, t.fn, t.b, t.h, -t.k) : null)],
    ];
    const [[g1, s1], [g2, s2]] = rng.shuffle(SLIPS.slice()).slice(0, 2);
    if (g1 === g2) continue;
    const one = s1(s), two = s2(s), both = one && s2(one);
    const wrong = [one, two, both];
    if (wrong.some((t) => !t || Math.abs(t.k) + Math.abs(t.a) > 8 || sameWave(t, s))) continue;
    if (wrong.some((t, i) => wrong.slice(i + 1).some((u) => sameWave(t, u)))) continue;
    const all = rng.shuffle([s, ...wrong]);
    const opts = all.map((t, i) => ({ id: optionId[i], label: eq(t), key: ascii(eq(t)) }));
    const right = opts[all.indexOf(s)];
    // The first peak, and the trough after it, exactly: where the text and the dots put them.
    const bq = s.b;
    const qPeak = peakQ(s);
    const qTrough = Q(qPeak.n * bq.n + qPeak.d * bq.d, qPeak.d * bq.n);
    const top = s.k + A, bottom = s.k - A;
    const startsAt = s.fn === 'cos' ? (s.a > 0 ? 'a peak' : 'a trough') : (s.a > 0 ? 'the midline, rising' : 'the midline, falling');
    return {
      prompt: [T.prose('Which equation does this graph show?')],
      text: `graph equation: peak (${qPeak.n}/${qPeak.d} pi, ${top}), trough (${qTrough.n}/${qTrough.d} pi, ${bottom}); options ${opts.map((o) => `${o.id}: ${o.key}`).join(' | ')}`,
      answer: { type: 'choice', value: right.id, options: opts.map(({ id, label }) => ({ id, label })) },
      visual: graph(s, midlineReveal(eq(s))),
      explain: `The peaks are at ${minus(top)} and the troughs at ${minus(bottom)}, so the midline is y = ${minus(s.k)} and the amplitude is ${A}. `
        + `One cycle takes ${periodText(s)}, so b = 2π ÷ ${periodText(s)} = ${qText(s.b)}. At x = 0 the wave is at ${startsAt}, which is ${s.a < 0 ? '−' : ''}${s.fn}. `
        + `(Check where the wave starts: sine starts on the midline and cosine at a peak, and a minus sign turns either over.) So ${eq(s)}.`,
    };
  }
}

// ── Sinusoidal Models ───────────────────────────────────────────────────

function models(rng) {
  const kind = rng.pick(['ferris', 'ferris', 'tide', 'temperature', 'spring']);
  if (kind === 'ferris') {
    const metric = rng.chance(0.5);
    const unit = metric ? 'm' : 'ft';
    const dia = metric ? rng.pick([20, 30, 40, 50, 60, 80, 100, 120]) : rng.pick([40, 50, 60, 80, 100, 120, 150, 200, 250]);
    const r = dia / 2;
    const c = r + (metric ? rng.int(1, 5) : rng.int(3, 15));
    const T0 = rng.pick([2, 3, 4, 5, 6, 8, 10, 12, 15, 20]);
    const want = rng.pick(['amplitude', 'midline', 'max', 'min', 'period', 'height', 'height', 'b']);
    // requiem: catalogue/content/model-equation-only-to-evaluate
    // The model's equation is given only to work a height from: written out,
    // it would hand over the midline, amplitude, period and b it is built of.
    const story = `A Ferris wheel ${dia} ${unit} across has its center ${c} ${unit} above the ground and turns once every ${T0} minutes. A rider boards at the bottom at t = 0.`;
    const model = ` The rider's height is h = ${c} − ${r} cos(2πt/${T0}).`;
    const base = `ferris: diameter ${dia} ${unit}, center ${c}, turn ${T0} min`;
    if (want === 'height') {
      for (;;) {
        const frac = rng.pick([[1, 8], [3, 8], [5, 8], [1, 6], [1, 3], [2, 3], [5, 6], [1, 4], [1, 2], [3, 4]]);
        const t = (T0 * frac[0]) / frac[1];
        if (Math.abs(t * 10 - Math.round(t * 10)) > 1e-9) continue;
        const angle = (2 * Math.PI * frac[0]) / frac[1];
        const x = c - r * Math.cos(angle);
        const alt = c - r * Math.round(Math.cos(angle) * 1e4) / 1e4;
        const exact = Math.abs(x - Math.round(x)) < 1e-9;
        const q = exact ? Math.round(x) * 10 : safeRound(x, 1, alt);
        if (q === null) continue;
        return {
          prompt: [T.prose(`${story}${model} How high is the rider at t = ${t} ${t === 1 ? 'minute' : 'minutes'}${exact ? '' : `, ${placeWords(1)}`}, in ${metric ? 'meters' : 'feet'}?`)],
          text: `${base}; want height at ${t}${exact ? '' : placeText(1)}`,
          answer: exact ? fracAnswer(Math.round(x), 1) : roundedAnswer(q, 1),
          visual: null,
          explain: `At t = ${t} the wheel has turned ${frac[0]}/${frac[1]} of the way round, an angle of 2π × ${t}/${T0} = ${piText(2 * frac[0], frac[1])}. `
            + `h = ${c} − ${r} ${bareCos(piText(2 * frac[0], frac[1]))} = ${c} − ${r} × ${(Math.round(Math.cos(angle) * 1e4) / 1e4).toString().replace('-', '−')} ${exact ? `= ${Math.round(x)}` : `≈ ${(Math.round(x * 1e4) / 1e4)}`}. `
            + `(Put the calculator in radians, or use the turn: ${frac[0]}/${frac[1]} of a turn from the bottom.) So ${exact ? Math.round(x) : roundedText(q, 1)} ${unit}.`,
        };
      }
    }
    const value = { amplitude: Q(r), midline: Q(c), max: Q(c + r), min: Q(c - r), period: Q(T0), b: Q(2, T0) }[want];
    const ask = { amplitude: 'Modeling the rider\'s height as a sinusoid, what is its amplitude, in', midline: 'What is the height of the midline, in', max: 'What is the rider\'s greatest height, in', min: 'What is the rider\'s lowest height, in', period: 'Modeling the rider\'s height as a sinusoid, what is its period, in minutes', b: 'Modeling the rider\'s height as h = c − r cos bt, what is b, as a multiple of π' }[want];
    return {
      prompt: want === 'b' ? [T.prose(`${story} ${ask}?`), ...piBlank('b')] : [T.prose(`${story} ${ask}${want === 'period' ? '' : ` ${metric ? 'meters' : 'feet'}`}?`)],
      text: `${base}; want ${want}${want === 'b' ? ' (pi)' : ''}`,
      answer: fracAnswer(value.n, value.d),
      visual: null,
      explain: {
        amplitude: `The rider rises and falls by the radius, half of ${dia}: ${r} ${unit}. (The amplitude is the radius, not the diameter.) So ${r}.`,
        midline: `The rider circles the center, so the midline is the center's height: ${c} ${unit}. (Not the radius: the center is ${c} ${unit} up.) So ${c}.`,
        max: `The top of the wheel is the center plus the radius: ${c} + ${r} = ${c + r} ${unit}. (The center height plus the full diameter overshoots by a radius.) So ${c + r}.`,
        min: `The bottom of the wheel is the center minus the radius: ${c} − ${r} = ${c - r} ${unit}, where the rider boards. (The wheel does not reach the ground.) So ${c - r}.`,
        period: `One turn takes ${T0} minutes, and one turn is one cycle. (The 2π in the model is the angle of one turn, not the period.) So ${T0} minutes.`,
        b: `b = 2π ÷ period = 2π ÷ ${T0} = ${piText(2, T0)}. (b is the angle turned per minute, so a slower wheel has a smaller b.) So b = ${piText(2, T0)}, and the box takes ${fracText(2, T0)}.`,
      }[want],
    };
  }
  if (kind === 'tide') {
    const metric = rng.chance(0.5);
    const unit = metric ? 'm' : 'ft';
    const low = metric ? rng.int(0, 3) : rng.int(0, 6);
    const high = low + 2 * (metric ? rng.int(1, 4) : rng.int(2, 7));
    const half = rng.pick([6, 6, 6.2, 6.25, 5.5]);
    const at0 = rng.int(1, 5);
    const want = rng.pick(['amplitude', 'midline', 'period']);
    const per = half * 2;
    const value = { amplitude: Q(high - low, 2), midline: Q(high + low, 2), period: Q(Math.round(per * 10), 10) }[want];
    const isDec = value.d !== 1;
    return {
      prompt: [T.prose(`At a harbor, high tide is ${high} ${unit} at ${at0}:00 a.m. and the next low tide, ${low} ${unit}, comes ${half} hours later. Modeling the depth as a sinusoid, what is the ${want === 'midline' ? 'midline depth, in ' + (metric ? 'meters' : 'feet') : want === 'amplitude' ? 'amplitude, in ' + (metric ? 'meters' : 'feet') : 'period, in hours'}?`)],
      text: `tide: high ${high} ${unit}, low ${low}, half cycle ${half} h; want ${want}`,
      answer: isDec ? { type: 'decimal', value: { n: Math.round(per * 10), d: 10 } } : fracAnswer(value.n, value.d),
      visual: null,
      explain: {
        amplitude: `The amplitude is half the range: (${high} − ${low}) ÷ 2 = ${qv(value)} ${unit}. (The whole range, ${high - low}, is twice the amplitude.) So ${qv(value)}.`,
        midline: `The midline is halfway between high and low: (${high} + ${low}) ÷ 2 = ${qv(value)} ${unit}. (Not the range: the average of the two depths.) So ${qv(value)}.`,
        period: `High tide to low tide is half a cycle, ${half} hours, so a full cycle is 2 × ${half} = ${per} hours. (Back to high tide takes another ${half} hours.) So ${per} hours.`,
      }[want],
    };
  }
  if (kind === 'temperature') {
    const celsius = rng.chance(0.5);
    const lowT = celsius ? rng.int(-10, 8) : rng.int(10, 45);
    const highT = lowT + 2 * (celsius ? rng.int(5, 14) : rng.int(10, 25));
    const want = rng.pick(['amplitude', 'midline', 'period', 'b']);
    const value = { amplitude: Q(highT - lowT, 2), midline: Q(highT + lowT, 2), period: Q(12), b: Q(1, 6) }[want];
    const deg = celsius ? '°C' : '°F';
    return {
      prompt: [T.prose(`A town's average temperature runs in a yearly cycle, from ${minus(lowT)}${deg} in January to ${highT}${deg} in July, with t in months. ${want === 'b' ? 'In T = a cos(b(t − 7)) + k, what is b, as a multiple of π?' : `What is the ${want === 'period' ? 'period, in months' : want === 'midline' ? `midline, in ${deg}` : `amplitude, in ${deg}`}?`}`), ...(want === 'b' ? piBlank('b') : [])],
      text: `temperature: low ${lowT}, high ${highT} ${celsius ? 'C' : 'F'}; want ${want}${want === 'b' ? ' (pi)' : ''}`,
      answer: fracAnswer(value.n, value.d),
      visual: null,
      explain: {
        amplitude: `Half the swing from coldest to warmest: (${highT} − ${minus(lowT)}) ÷ 2 = ${qv(value)}${deg}. (The whole swing is twice the amplitude.) So ${qv(value)}.`,
        midline: `Halfway between: (${highT} + ${minus(lowT)}) ÷ 2 = ${qv(value)}${deg}. (The year's average, not the difference.) So ${qv(value)}.`,
        period: `The cycle repeats every year, 12 months. (January to July is only half the cycle, 6 months.) So 12.`,
        b: `The period is 12 months, so b = 2π ÷ 12 = π/6. (The 7 moves the peak to July; it does not change b.) So b = π/6, and the box takes 1/6.`,
      }[want],
    };
  }
  const metric = rng.chance(0.5);
  const unit = metric ? 'cm' : 'in';
  const lo = rng.int(2, 10), amp = rng.int(1, 8);
  const hi = lo + 2 * amp;
  const T0 = rng.pick([1, 2, 3, 4, 5, 6, 8, 10]) / rng.pick([1, 1, 2]);
  const want = rng.pick(['amplitude', 'midline', 'period', 'b']);
  const Tq = Q(Math.round(T0 * 2), 2);
  const value = { amplitude: Q(amp), midline: Q(lo + amp), period: Tq, b: Q(2 * Tq.d, Tq.n) }[want];
  return {
    prompt: [T.prose(`A weight on a spring bobs between ${lo} ${unit} and ${hi} ${unit} above a table, taking ${T0} ${T0 === 1 ? 'second' : 'seconds'} for each full bounce. ${want === 'b' ? 'In y = a cos bt + k, what is b, as a multiple of π?' : `What is the ${want === 'period' ? 'period, in seconds' : want === 'midline' ? `midline height, in ${metric ? 'centimeters' : 'inches'}` : `amplitude, in ${metric ? 'centimeters' : 'inches'}`}?`}`), ...(want === 'b' ? piBlank('b') : [])],
    text: `spring: between ${lo} and ${hi} ${unit}, cycle ${T0} s; want ${want}${want === 'b' ? ' (pi)' : ''}`,
    answer: want === 'period' && Tq.d !== 1 ? { type: 'decimal', value: { n: Tq.n * 5, d: 10 } } : fracAnswer(value.n, value.d),
    visual: null,
    explain: {
      amplitude: `Half the distance between the lowest and highest points: (${hi} − ${lo}) ÷ 2 = ${amp} ${unit}. (The full ${hi - lo} ${unit} is twice the amplitude.) So ${amp}.`,
      midline: `Halfway between: (${hi} + ${lo}) ÷ 2 = ${lo + amp} ${unit}. (The middle of the bounce, not its size.) So ${lo + amp}.`,
      period: `One full bounce, down and back up, is one cycle: ${T0} ${T0 === 1 ? 'second' : 'seconds'}. (Top to bottom alone is half a cycle.) So ${T0}.`,
      b: `b = 2π ÷ period = 2π ÷ ${T0} = ${piText(value.n, value.d)}. (b is 2π over the period, not the period itself.) So b = ${piText(value.n, value.d)}, and the box takes ${qText(value)}.`,
    }[want],
  };
}

const CONTENT = [amplitude, period, midline, phaseShift, fromGraph, models];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
