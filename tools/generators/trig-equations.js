/**
 * Catalogue authoring tool: builds the problem library for trig-equations.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 *
 * Every `text` carries the equation in plain ASCII (`2*sin(x) - 1 = 0`) and
 * the interval it is solved on, and scripts/check-answers.py finds every
 * root itself, numerically, with no table of special angles: an answer, or
 * the one option of four, must be exactly that set of roots. A general
 * solution is checked by listing its members over two turns either way.
 *
 * A set of angles is typed in degrees, where each is a plain number the
 * solutions input reads; in radians, where each would need a π, the set is
 * chosen from four.
 */
import * as T from '../terms.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/trig-equations.js';
import { fracAnswer, reduce } from './chance.js';
import { rootText, piText, exactTrig } from './trig.js';

const optionIds = ['a', 'b', 'c', 'd'];
const minus = (s) => String(s).replace(/-/g, '−');
const sameV = (a, b) => a !== null && b !== null && a.n * b.d === b.n * a.d && (a.n === 0 || a.r === b.r);
const V = (n, d = 1, r = 1) => { const q = reduce(n, d); return { n: q.n, d: q.d, r }; };
const neg = (v) => ({ ...v, n: -v.n });
/** −√3/2, 1/2, 0, as written. */
const valText = (v) => (v.n === 0 ? '0' : `${v.n < 0 ? '−' : ''}${rootText(Math.abs(v.n), v.d, v.r)}`);
/** The same in ASCII: -sqrt(3)/2. */
const valAscii = (v) => {
  if (v.n === 0) return '0';
  const top = v.r === 1 ? String(Math.abs(v.n)) : `${Math.abs(v.n) === 1 ? '' : `${Math.abs(v.n)}*`}sqrt(${v.r})`;
  return `${v.n < 0 ? '-' : ''}${top}${v.d === 1 ? '' : `/${v.d}`}`;
};
const inRange = (fn, v) => fn === 'tan' || Math.abs(v.n / v.d) * Math.sqrt(v.r) <= 1 + 1e-12;

const SIN_COS = [V(0), V(1, 2), V(-1, 2), V(1, 2, 2), V(-1, 2, 2), V(1, 2, 3), V(-1, 2, 3), V(1), V(-1)];
const TAN = [V(0), V(1), V(-1), V(1, 3, 3), V(-1, 3, 3), V(1, 1, 3), V(-1, 1, 3)];
const NONE = [V(3, 2), V(-3, 2), V(2), V(-2), V(5, 4), V(-5, 4)];

/** Every x in [lo, hi) degrees with fn(k·x) = v, k·x a multiple of 15°. */
function solveDeg(fn, v, { lo = 0, hi = 360, k = 1 } = {}) {
  const out = [];
  if (!inRange(fn, v)) return out;
  for (let t = Math.ceil((k * lo) / 15) * 15; t < k * hi; t += 15) {
    if (t % 30 && t % 45) continue;
    if (sameV(exactTrig(fn, t), v)) out.push(t / k);
  }
  return out;
}
const union = (...sets) => [...new Set(sets.flat())].sort((a, b) => a - b);
const sameSet = (a, b) => a.length === b.length && a.every((x, i) => Math.abs(x - b[i]) < 1e-9);

// requiem: catalogue/content/angle-sets-typed-in-degrees
/** x = 30 or x = 150 as the solutions type holds it. */
function setAnswer(xs) {
  const pt = (x) => { const q = reduce(Math.round(x * 2), 2); return { lo: q, loIn: true, hi: q, hiIn: true }; };
  return { type: 'solutions', value: { letter: 'x', parts: xs.map(pt) } };
}
const listed = (items) => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`);
const degText = (x) => `${minus(x)}°`;
const radText = (x) => { const q = reduce(Math.round(x * 2), 360); return piText(q.n, q.d); };
const anglesText = (xs, radians) => (xs.length ? listed(xs.map(radians ? radText : degText)) : 'none');
/** The option's label for a set in [0, 2π): π/6 and 5π/6, or No solution. */
const setLabel = (xs) => (xs.length ? listed(xs.map(radText)) : 'No solution');
/** The option as the checker reads it: coefficients of π, or none. */
const setKey = (xs) => (xs.length ? xs.map((x) => { const q = reduce(Math.round(x * 2), 360); return q.d === 1 ? String(q.n) : `${q.n}/${q.d}`; }).join(', ') : 'none');

// ── Reference angles and quadrants ──────────────────────────────────────

const ROMAN = ['', 'I', 'II', 'III', 'IV'];
const POS = { sin: [1, 2], cos: [1, 4], tan: [1, 3] };
const NEG = { sin: [3, 4], cos: [2, 3], tan: [2, 4] };
const RULE = (q, ref, radians) => {
  const A = (d) => (radians ? radText(d) : degText(d));
  return q === 1 ? A(ref) : q === 2 ? `${A(180)} − ${A(ref)} = ${A(180 - ref)}` : q === 3 ? `${A(180)} + ${A(ref)} = ${A(180 + ref)}` : `${A(360)} − ${A(ref)} = ${A(360 - ref)}`;
};
const NAMES = { sin: 'sine', cos: 'cosine', tan: 'tangent' };
const WHERE = { sin: 'the y-coordinate', cos: 'the x-coordinate', tan: 'y/x' };

/**
 * How fn x = v is solved in one turn, in words: the reference angle and the
 * two quadrants, or the axis points, or why there is none.
 */
function solveWords(fn, v, radians, arg = 'x') {
  const A = (d) => (radians ? radText(d) : degText(d));
  const xs = solveDeg(fn, v);
  const said = `${fn} ${arg} = ${valText(v)}`;
  if (!inRange(fn, v)) return `${said} has no solution: ${NAMES[fn]} is ${WHERE[fn]} of a point on the unit circle, never more than 1 or less than −1.`;
  const ref = solveDeg(fn, { ...v, n: Math.abs(v.n) }).find((t) => t <= 90);
  if (v.n === 0 || ref === 90 || ref === 0) {
    return `${said} where ${WHERE[fn]} of the point on the unit circle is ${valText(v)}: at ${arg} = ${anglesText(xs, radians)}.`;
  }
  const qs = v.n > 0 ? POS[fn] : NEG[fn];
  return `The reference angle is ${A(ref)}, since ${fn} ${A(ref)} = ${valText({ ...v, n: Math.abs(v.n) })}. `
    + `${NAMES[fn][0].toUpperCase()}${NAMES[fn].slice(1)} is ${v.n > 0 ? 'positive' : 'negative'} in quadrants ${ROMAN[qs[0]]} and ${ROMAN[qs[1]]}: `
    + `${arg} = ${RULE(qs[0], ref, radians)} and ${arg} = ${RULE(qs[1], ref, radians)}.`;
}

/** The trap for fn x = v, in brackets. */
function trapWords(fn, v, radians) {
  const A = (d) => (radians ? radText(d) : degText(d));
  if (!inRange(fn, v)) return `(A calculator's sin⁻¹ or cos⁻¹ of ${valText(v)} gives an error for the same reason; it is not a mistake to fix.)`;
  if (v.n === 0 || Math.abs(v.n / v.d) * Math.sqrt(v.r) === 1 && fn !== 'tan') {
    return fn === 'tan' ? `(Tangent is 0 wherever sine is, at ${A(0)} and ${A(180)}.)` : '(A point on an axis is one angle in the turn, or two opposite ones, not a pair from a reference angle.)';
  }
  if (fn === 'tan') return `(Tangent repeats every ${A(180)}, so the second solution is ${A(180)} on from the first.)`;
  if (v.n < 0) return `(${fn}⁻¹(${valText(v)}) is ${A(fn === 'sin' ? -solveDeg(fn, neg(v)).find((t) => t <= 90) : 180 - solveDeg(fn, neg(v)).find((t) => t <= 90))}${fn === 'sin' ? `, which is not between ${A(0)} and ${A(360)}` : ', only one of the two'}: work from the reference angle instead.)`;
  return fn === 'sin' ? `(sin⁻¹ gives only ${A(xs0(fn, v))}; the partner in quadrant II, ${A(180)} minus it, is the one most often missed.)`
    : `(Cosine is positive in quadrants I and IV, so the partner is ${A(360)} minus the angle, not ${A(180)} minus it.)`;
}
const xs0 = (fn, v) => solveDeg(fn, v)[0];

// ── Equations: a·f(x) + b = c ───────────────────────────────────────────

const coef = (a) => (a === 1 ? '' : a === -1 ? '−' : `${minus(a)} `);
const tailShow = (b) => (b === 0 ? '' : ` ${b < 0 ? '−' : '+'} ${Math.abs(b)}`);
const tailAscii = (b) => (b === 0 ? '' : ` ${b < 0 ? '-' : '+'} ${Math.abs(b)}`);

/**
 * An equation that comes to fn(arg) = v, as shown, as ASCII, and the
 * working that isolates fn. `arg` is x, 2x or 3x.
 */
function linear(rng, fn, v, arg = 'x') {
  const k = arg === 'x' ? 1 : +arg[0];
  const F = `${fn} ${arg}`, Fa = `${fn}(${k === 1 ? 'x' : `${k}*x`})`;
  if (v.r === 1) {
    // A value with no solution is asked plainly, so that it stays a few
    // problems among many rather than a third of a small level.
    const none = !inRange(fn, v);
    const m = none ? (v.d === 1 ? rng.pick([2, 3]) : 1) : v.n === 0 ? rng.pick([2, 3, 4, 5]) : rng.pick([1, 1, 2, 3]);
    const A = v.n === 0 ? m : v.d * m, R = v.n === 0 ? 0 : v.n * m;
    const B = !none && rng.chance(0.6) ? rng.pick([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5]) : 0;
    const C = R + B;
    if (A === 1 && B === 0) return linear(rng, fn, v, arg);
    const steps = [];
    if (B) steps.push(`${B > 0 ? 'Take away' : 'Add'} ${Math.abs(B)}: ${coef(A)}${F} = ${minus(R)}.`);
    if (A !== 1) steps.push(`Divide by ${A}: ${F} = ${valText(v)}.`);
    return { show: `${coef(A)}${F}${tailShow(B)} = ${minus(C)}`, ascii: `${A}*${Fa}${tailAscii(B)} = ${C}`, steps: steps.join(' ') };
  }
  const rad = `√${v.r}`, radA = `sqrt(${v.r})`;
  const forms = ['plain', 'zero'];
  if ((v.r === 2 && v.d === 2) || (v.r === 3 && v.d === 3)) forms.push('rational', 'rational');
  const form = rng.pick(forms);
  const s = v.n < 0;
  if (form === 'rational') {
    return { show: `${rad} ${F} = ${s ? '−1' : '1'}`, ascii: `${radA}*${Fa} = ${s ? -1 : 1}`,
      steps: `Divide by ${rad}: ${F} = ${s ? '−' : ''}1/${rad} = ${valText(v)}.` };
  }
  const A = v.d;
  const div = A === 1 ? '' : ` Divide by ${A}: ${F} = ${valText(v)}.`;
  if (form === 'plain') {
    if (A === 1) return linear(rng, fn, v, arg);
    return { show: `${coef(A)}${F} = ${s ? '−' : ''}${rad}`, ascii: `${A}*${Fa} = ${s ? '-' : ''}${radA}`, steps: div.trim() };
  }
  return { show: `${coef(A)}${F} ${s ? '+' : '−'} ${rad} = 0`, ascii: `${A}*${Fa} ${s ? '+' : '-'} ${radA} = 0`,
    steps: `${s ? 'Take away' : 'Add'} ${rad}: ${coef(A)}${F} = ${s ? '−' : ''}${rad}.${div}` };
}

/** A value of fn with solutions, or now and then one with none. */
function pickValue(rng, fn, { none = 0.08, axis = true } = {}) {
  if (fn !== 'tan' && rng.chance(none)) return rng.pick(NONE);
  const pool = (fn === 'tan' ? TAN : SIN_COS).filter((v) => axis || (v.n !== 0 && Math.abs(v.n / v.d) * Math.sqrt(v.r) !== 1));
  return rng.pick(pool);
}

// ── arcsin, arccos, arctan ──────────────────────────────────────────────

const RANGE = { sin: [-90, 90], cos: [0, 180], tan: [-90, 90] };
const RANGE_WORDS = { sin: 'from −π/2 to π/2 (−90° to 90°)', cos: 'from 0 to π (0° to 180°)', tan: 'strictly between −π/2 and π/2 (−90° and 90°)' };
const principal = (fn, v) => solveDeg(fn, v, { lo: RANGE[fn][0], hi: RANGE[fn][1] + 1 }).find((t) => fn !== 'tan' || Math.abs(t) < 90);

function inverse(rng) {
  const fn = rng.pick(['sin', 'cos', 'tan']);
  const name = rng.chance(0.5) ? `${fn}⁻¹` : `arc${fn}`;
  // requiem: catalogue/content/one-input-per-level
  // Every answer is a fraction: the coefficient of π, or a ratio from a
  // triangle. Degrees and calculator values would each want another box.
  const kind = rng.pick(['rad', 'rad', 'undo', 'compose']);
  if (kind === 'undo') return undo(rng, fn, name);
  if (kind === 'compose') return compose(rng, fn, name);
  const v = rng.pick(fn === 'tan' ? TAN : SIN_COS);
  const t = principal(fn, v);
  const ref = Math.abs(fn === 'cos' && v.n < 0 ? 180 - t : t);
  const radians = kind === 'rad';
  const A = (d) => (radians ? piText(d, 180) : degText(d));
  const q = reduce(t, 180);
  const axis = v.n === 0 || (fn !== 'tan' && v.r === 1 && Math.abs(v.n) === v.d);
  const where = axis || v.n > 0
    ? `${fn}(${A(t)}) = ${valText(v)}, and ${A(t)} is in that range`
    : fn === 'cos'
      ? `cos(${A(ref)}) = ${valText(neg(v))}, and cosine is negative in quadrant II, which is in the range: ${A(180)} − ${A(ref)} = ${A(t)}`
      : `${fn}(${A(ref)}) = ${valText(neg(v))}, and ${NAMES[fn]} is negative below the x-axis, so the angle in the range is ${A(t)}`;
  const trap = v.n < 0 && !(axis && fn === 'cos')
    ? (fn === 'cos' ? `(It is not ${A(-ref)}: cos(${A(-ref)}) = ${valText(neg(v))}, and cos⁻¹ always lands from 0 to π.)` : `(${A(360 + t)} has the same ${NAMES[fn]}, but it is outside the range, so it is not ${name}(${valText(v)}).)`)
    : `(${name} is one angle, not every angle with that ${NAMES[fn]}.)`;
  return {
    prompt: radians
      ? [T.prose(`Find the exact value of ${name}(${valText(v)}) in radians, as a multiple of π.`), T.letter('θ'), T.op('='), T.blank(), T.letter('π')]
      : [T.prose(`Find the exact value of ${name}(${valText(v)}) in degrees.`)],
    text: `inverse ${radians ? 'rad' : 'deg'}: a${fn}(${valAscii(v)})`,
    answer: radians ? fracAnswer(t, 180) : { type: 'int', value: t },
    visual: null,
    explain: `${name} gives the one angle ${RANGE_WORDS[fn]} with that ${NAMES[fn]}. ${where}. ${trap} `
      + `So ${name}(${valText(v)}) = ${A(t)}${radians ? `, and the box takes ${q.d === 1 ? minus(q.n) : `${minus(q.n)}/${q.d}`}` : ''}.`,
  };
}

/**
 * sin⁻¹(sin θ): the angle in the range with the same sine, which is θ
 * itself only when θ is already in the range.
 */
function undo(rng, fn, name) {
  let deg;
  do deg = rng.pick([30, 45, 60, 120, 135, 150, 210, 225, 240, 300, 315, 330, -30, -45, -60, 0, 90, 180]);
  while (exactTrig(fn, deg) === null);
  const radians = true;
  const A = (d) => (radians ? piText(d, 180) : degText(d));
  const v = exactTrig(fn, deg);
  const t = principal(fn, v);
  const inside = t === deg;
  const inner = `${fn}(${A(deg)})`;
  const q = reduce(t, 180);
  const k = reduce(deg, 180);
  return {
    prompt: radians
      ? [T.prose(`Find the exact value of ${name}(${inner}) in radians, as a multiple of π.`), T.letter('θ'), T.op('='), T.blank(), T.letter('π')]
      : [T.prose(`Find the exact value of ${name}(${inner}) in degrees.`)],
    text: `undo ${radians ? 'rad' : 'deg'}: a${fn}(${fn}(${radians ? `${k.n}/${k.d} pi` : deg}))`,
    answer: radians ? fracAnswer(t, 180) : { type: 'int', value: t },
    visual: null,
    explain: `${inner} = ${valText(v)}, and ${name}(${valText(v)}) is the one angle ${RANGE_WORDS[fn]} with that ${NAMES[fn]}: ${A(t)}. `
      + (inside ? `(${A(deg)} is already in the range, so here ${name} does undo ${fn}.) `
        : `(${name} undoes ${fn} only inside that range; ${A(deg)} is outside it, so the answer is not ${A(deg)}.) `)
      + `So ${A(t)}${radians ? `, and the box takes ${q.d === 1 ? minus(q.n) : `${minus(q.n)}/${q.d}`}` : ''}.`,
  };
}

const TRIPLES = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29]];

/**
 * cos(sin⁻¹(a/c)): a triangle from the given ratio, with the sign of the
 * side that is not given fixed by the inverse's range.
 */
function compose(rng, fn, name) {
  const [p, q, h] = rng.pick(TRIPLES);
  const [a, b] = rng.chance(0.5) ? [p, q] : [q, p];
  const s = rng.chance(0.5) ? -1 : 1;
  // x, y, r of the point at θ = fn⁻¹(given).
  let x, y, given;
  if (fn === 'sin') { y = s * a; x = b; given = [s * a, h]; }
  else if (fn === 'cos') { x = s * a; y = b; given = [s * a, h]; }
  else { y = s * a; x = b; given = [s * a, b]; }
  const want = rng.pick(['sin', 'cos', 'tan'].filter((f) => f !== fn));
  const r = h;
  const val = { sin: [y, r], cos: [x, r], tan: [y, x] }[want];
  const ans = val[1] < 0 ? reduce(-val[0], -val[1]) : reduce(val[0], val[1]);
  const g = `${minus(given[0])}/${given[1]}`;
  const quad = x > 0 ? (y > 0 ? 'I' : 'IV') : 'II';
  const third = fn === 'tan' ? `hypotenuse √(${a}² + ${b}²) = ${h}` : `${fn === 'sin' ? 'adjacent' : 'opposite'} side √(${h}² − ${a}²) = ${b}`;
  const fixed = fn === 'sin' ? 'cosine is never negative there, so x is positive'
    : fn === 'cos' ? 'sine is never negative there, so y is positive' : 'cosine is positive there, so x is positive';
  return {
    prompt: [T.prose(`Find the exact value of ${want}(${name}(${g})).`)],
    text: `compose: ${want}(a${fn}(${given[0]}/${given[1]}))`,
    answer: fracAnswer(ans.n, ans.d),
    visual: null,
    explain: `Let θ = ${name}(${g}), so ${fn} θ = ${g} and θ is ${RANGE_WORDS[fn]}: ${fixed}, and θ is in quadrant ${quad}. `
      + `The reference triangle has the ${third}, so x = ${minus(x)}, y = ${minus(y)} and r = ${r}. ${want} θ = ${want === 'tan' ? 'y/x' : want === 'sin' ? 'y/r' : 'x/r'} = ${minus(val[0])}/${val[1] < 0 ? `(${minus(val[1])})` : val[1]}${ans.d !== val[1] ? ` = ${ans.d === 1 ? minus(ans.n) : `${minus(ans.n)}/${ans.d}`}` : ''}. `
      + `(The sign comes from the range of ${name}, not from the given ratio alone.) So ${ans.d === 1 ? minus(ans.n) : `${minus(ans.n)}/${ans.d}`}.`,
  };
}

// ── Solving in one turn ─────────────────────────────────────────────────

/** fn x = v on [0, 360) in degrees, typed. */
function solveDegrees(rng) {
  const fn = rng.pick(['sin', 'cos', 'tan', 'sin', 'cos']);
  const v = pickValue(rng, fn);
  const eq = linear(rng, fn, v);
  const xs = solveDeg(fn, v);
  return {
    prompt: [T.prose(`Solve ${eq.show} for 0° ≤ x < 360°. Give every solution in degrees, or say there is none.`)],
    text: `solve degrees: ${eq.ascii}`,
    answer: setAnswer(xs),
    visual: null,
    explain: `${eq.steps ? `${eq.steps} ` : ''}${solveWords(fn, v, false)} ${trapWords(fn, v, false)} So ${xs.length ? `x = ${anglesText(xs, false)}` : 'there is no solution'}.`,
  };
}

/** Wrong sets for fn x = v: the same reference angle in the wrong quadrants, one angle alone, the other sign. */
function wrongSets(fn, v) {
  const xs = solveDeg(fn, v);
  const out = [];
  if (!inRange(fn, v)) return [[30, 150], [60, 300], [210, 330], [120, 240]];
  const ref = solveDeg(fn, { ...v, n: Math.abs(v.n) }).find((t) => t <= 90);
  if (v.n === 0 || ref === 90 || ref === 0) {
    out.push([0], [90], [180], [270], [0, 180], [90, 270], [0, 90, 180, 270]);
  } else {
    const at = [0, ref, 180 - ref, 180 + ref, 360 - ref];
    for (let a = 1; a <= 4; a++) for (let b = a + 1; b <= 4; b++) out.push([at[a], at[b]]);
    out.push([xs[0]]);
    if (fn === 'sin' && v.n < 0) out.push([360 - ref]);
  }
  out.push(solveDeg(fn, neg(v)));
  return out.map((s) => union(s)).filter((s) => !sameSet(s, xs));
}

/** Four sets, one of them `right`, as choice options. */
function setChoice(rng, right, wrong) {
  const picked = [];
  for (const s of rng.shuffle(wrong)) if (picked.length < 3 && !picked.some((p) => sameSet(p, s)) && !sameSet(s, right)) picked.push(s);
  if (picked.length < 3) return null;
  const all = rng.shuffle([right, ...picked]);
  return {
    key: all.map((s, i) => `${optionIds[i]}: ${setKey(s)}`).join(' | '),
    answer: { type: 'choice', value: optionIds[all.indexOf(right)], options: all.map((s, i) => ({ id: optionIds[i], label: setLabel(s) })) },
  };
}

/** fn x = v on [0, 2π), chosen. */
function solveRadians(rng) {
  for (;;) {
    const fn = rng.pick(['sin', 'cos', 'tan', 'sin', 'cos']);
    const v = pickValue(rng, fn, { none: 0.06 });
    const eq = linear(rng, fn, v);
    const xs = solveDeg(fn, v);
    const c = setChoice(rng, xs, wrongSets(fn, v));
    if (!c) continue;
    return {
      prompt: [T.prose(`Solve ${eq.show} for 0 ≤ x < 2π.`)],
      text: `solve radians: ${eq.ascii}; options ${c.key}`,
      answer: c.answer,
      visual: null,
      explain: `${eq.steps ? `${eq.steps} ` : ''}${solveWords(fn, v, true)} ${trapWords(fn, v, true)} So ${xs.length ? `x = ${anglesText(xs, true)}` : 'there is no solution'}.`,
    };
  }
}

// ── General solutions ───────────────────────────────────────────────────

/**
 * The solutions in one turn as families b + pk, in degrees: a pair half a
 * turn apart is one family with period 180°.
 */
function families(xs) {
  const left = [...xs], out = [];
  while (left.length) {
    const b = left.shift();
    const j = left.findIndex((x) => Math.abs(x - (b + 180)) < 1e-9);
    if (j >= 0) { left.splice(j, 1); out.push([b, 180]); } else out.push([b, 360]);
  }
  return out;
}
const famText = ([b, p]) => `x = ${b === 0 ? '' : `${radText(b)} + `}${p === 180 ? 'π' : '2π'}k`;
const famLabel = (fs) => (fs.length ? fs.map(famText).join(' or ') : 'No solution');
const famKey = (fs) => (fs.length ? fs.map(([b, p]) => { const q = reduce(b, 180); return `${q.d === 1 ? q.n : `${q.n}/${q.d}`}@${p / 180}`; }).join(', ') : 'none');
/** Every member of the families in [−720°, 720°), to tell two apart. */
const members = (fs) => union(fs.flatMap(([b, p]) => { const o = []; for (let x = b - 4 * 360; x < 720; x += p) if (x >= -720) o.push(x); return o; }));

function general(rng) {
  const kind = rng.pick(['family', 'family', 'family', 'turns', 'turns', 'multiple', 'multiple']);
  if (kind === 'family') {
    for (;;) {
      const fn = rng.pick(['sin', 'cos', 'tan']);
      const v = pickValue(rng, fn, { none: 0 });
      const eq = linear(rng, fn, v);
      const xs = solveDeg(fn, v);
      const right = families(xs);
      const P = fn === 'tan' ? 180 : 360;
      const wrongs = [
        right.map(([b]) => [b, P === 360 ? 180 : 360]),
        right.slice(0, 1),
        ...wrongSets(fn, v).map(families),
        right.map(([b, p]) => [b, p === 360 ? 720 : 360]),
      ].filter((fs) => fs.length && !sameSet(members(fs), members(right)));
      const picked = [];
      for (const fs of rng.shuffle(wrongs)) if (picked.length < 3 && !picked.some((p) => sameSet(members(p), members(fs)))) picked.push(fs);
      if (picked.length < 3) continue;
      const all = rng.shuffle([right, ...picked]);
      const period = fn === 'tan' ? 'π' : '2π';
      return {
        prompt: [T.prose(`Find every solution of ${eq.show}. k stands for any integer.`)],
        text: `general: ${eq.ascii}; options ${all.map((fs, i) => `${optionIds[i]}: ${famKey(fs)}`).join(' | ')}`,
        answer: { type: 'choice', value: optionIds[all.indexOf(right)], options: all.map((fs, i) => ({ id: optionIds[i], label: famLabel(fs) })) },
        visual: null,
        explain: `${eq.steps ? `${eq.steps} ` : ''}First the solutions in one turn. ${solveWords(fn, v, true)} `
          + `${NAMES[fn][0].toUpperCase()}${NAMES[fn].slice(1)} repeats every ${period}, so each of those is a solution again after any whole number of periods${right.some(([, p]) => p === 180) && fn !== 'tan' ? '; two solutions exactly π apart join into one family that steps by π' : ''}. `
          + `(${fn === 'tan' ? 'Tangent\'s period is π, so + 2πk would miss every other solution.' : right.some(([, p]) => p === 180) ? 'Here the solutions are exactly π apart, so + πk catches them all; + 2πk from one of them would miss half.' : '+ πk would add angles where the value has the opposite sign.'}) So ${famLabel(right)}.`,
      };
    }
  }
  if (kind === 'turns') {
    const fn = rng.pick(['sin', 'cos', 'tan']);
    const v = pickValue(rng, fn, { none: 0 });
    const eq = linear(rng, fn, v);
    const [lo, hi] = rng.pick([[0, 720], [-360, 360], [-180, 360], [0, 540]]);
    const xs = solveDeg(fn, v, { lo, hi });
    const one = solveDeg(fn, v);
    const P = fn === 'tan' ? 180 : 360;
    return {
      prompt: [T.prose(`Solve ${eq.show} for ${minus(lo)}° ≤ x < ${hi}°. Give every solution in degrees.`)],
      text: `solve degrees from ${lo} to ${hi}: ${eq.ascii}`,
      answer: setAnswer(xs),
      visual: null,
      explain: `${eq.steps ? `${eq.steps} ` : ''}${solveWords(fn, v, false)} Every solution is one of those plus a whole number of periods, ${P}° each: ${one.filter((x) => x < P).map((x) => `x = ${x}° + ${P}°k`).join(' or ')}. `
        + `The ones from ${minus(lo)}° up to ${hi}° are ${anglesText(xs, false)}. `
        + `(${lo < 0 ? 'Negative angles count too: take a period away as well as adding one.' : 'A second turn has its own copy of every solution; stopping at 360° misses them.'}) So x = ${anglesText(xs, false)}.`,
    };
  }
  // A multiple angle: let θ = kx, which runs over k turns.
  const fn = rng.pick(['sin', 'cos', 'tan', 'sin', 'cos']);
  const k = rng.pick([2, 2, 3]);
  const v = pickValue(rng, fn, { none: 0, axis: rng.chance(0.3) });
  const eq = linear(rng, fn, v, `${k}x`);
  const thetas = solveDeg(fn, v, { hi: 360 * k });
  const xs = thetas.map((t) => t / k);
  const turnWord = k === 2 ? 'two turns' : 'three turns';
  return {
    prompt: [T.prose(`Solve ${eq.show} for 0° ≤ x < 360°. Give every solution in degrees.`)],
    text: `solve degrees: ${eq.ascii}`,
    answer: setAnswer(xs),
    visual: null,
    explain: `${eq.steps ? `${eq.steps} ` : ''}Let θ = ${k}x. As x runs from 0° to 360°, θ runs from 0° to ${360 * k}°, ${turnWord}. `
      + `${solveWords(fn, v, false, 'θ')} Adding 360° each turn, θ = ${anglesText(thetas, false)}. Divide each by ${k}: x = ${anglesText(xs, false)}. `
      + `(Solving for θ in one turn only would find ${solveDeg(fn, v).length} of the ${xs.length}.) So x = ${anglesText(xs, false)}.`,
  };
}

// ── Quadratic-type ──────────────────────────────────────────────────────

const RATIONAL = [V(0), V(1, 2), V(-1, 2), V(1), V(-1)];
const OUT = [V(2), V(-2), V(3), V(3, 2), V(-3, 2)];
/** s = n/d as a factor (d s − n), shown and ASCII. */
const factorShow = (v, F) => `(${coef(v.d)}${F}${tailShow(-v.n)})`;
/** a s² + b s + c, shown and ASCII, with s = F. */
function quadShow(a, b, c, F, Fa) {
  const lead = `${coef(a)}${F.replace(' ', '²')}`;
  const mid = b === 0 ? '' : ` ${b < 0 ? '−' : '+'} ${Math.abs(b) === 1 ? '' : `${Math.abs(b)} `}${F}`;
  return { show: `${lead}${mid}${tailShow(c)}`, ascii: `${a}*${Fa}^2${b === 0 ? '' : ` ${b < 0 ? '-' : '+'} ${Math.abs(b)}*${Fa}`}${tailAscii(c)}` };
}
const SQUARE_ROOT = { '1/4': V(1, 2), '1/2': V(1, 2, 2), '3/4': V(1, 2, 3), '1/1': V(1), '1/3': V(1, 3, 3), '3/1': V(1, 1, 3) };

/** A quadratic-type equation: the conditions it comes to, shown, ASCII, and the working. */
function quadratic(rng) {
  const kind = rng.pick(['factor', 'factor', 'square', 'common', 'identity', 'identity']);
  const fn = rng.pick(['sin', 'cos']);
  const F = `${fn} x`, Fa = `${fn}(x)`;
  if (kind === 'factor' || kind === 'identity') {
    const f = kind === 'identity' ? fn : rng.pick(['sin', 'cos', 'tan', 'sin', 'cos']);
    const G = `${f} x`, Ga = `${f}(x)`;
    const pool = f === 'tan' ? [V(0), V(1), V(-1)] : RATIONAL;
    let r1 = rng.pick(pool), r2 = rng.pick(pool);
    if (f !== 'tan' && rng.chance(0.2)) r2 = rng.pick(OUT);
    if (sameV(r1, r2) || (r1.d === 2 && r2.d === 2)) return quadratic(rng);
    // (d1 s − n1)(d2 s − n2) = d1d2 s² − (d1n2 + d2n1) s + n1n2
    let a = r1.d * r2.d, b = -(r1.d * r2.n + r2.d * r1.n), c = r1.n * r2.n;
    const conds = [[f, r1], [f, r2]];
    const factored = r1.n === 0 ? `${G}${factorShow(r2, G)} = 0` : r2.n === 0 ? `${G}${factorShow(r1, G)} = 0` : `${factorShow(r1, G)}${factorShow(r2, G)} = 0`;
    const roots = `${G} = ${valText(r1)} or ${G} = ${valText(r2)}`;
    if (kind === 'factor') {
      const q = quadShow(a, b, c, G, Ga);
      // As printed: all on the left, the constant moved over, or only the square left behind.
      const form = rng.pick(['zero', 'zero', 'constant', 'square']);
      const lead = quadShow(a, 0, 0, G, Ga);
      const rhs = quadShow(1, -b, -c, G, Ga);
      const shown = form === 'constant' && c !== 0 ? { show: `${quadShow(a, b, 0, G, Ga).show} = ${minus(-c)}`, ascii: `${quadShow(a, b, 0, G, Ga).ascii} = ${-c}` }
        : form === 'square' && b !== 0 ? { show: `${lead.show} = ${rhs.show.replace(/^.*?²x ?/, '').replace(/^\+ /, '').replace(/^− /, '−') || '0'}`,
          ascii: `${lead.ascii} = ${(-b === 0 ? '' : `${-b}*${Ga}`)}${-c === 0 ? '' : ` ${-c < 0 ? '-' : '+'} ${Math.abs(c)}`}` }
          : { show: `${q.show} = 0`, ascii: `${q.ascii} = 0` };
      const moved = shown.show === `${q.show} = 0` ? '' : `Bring everything to one side: ${q.show} = 0. `;
      return { conds, show: shown.show, ascii: shown.ascii,
        work: `${moved}Treat ${G} as one letter: ${q.show} = 0 factors as ${factored}, so ${roots}.`,
        trap: OUT.some((o) => sameV(o, r2)) ? `(${G} = ${valText(r2)} gives nothing: ${NAMES[f]} stays between −1 and 1.)` : `(Each factor is its own equation: set each one to 0.)` };
    }
    // Write a s² with the other function: sin²x = 1 − cos²x.
    const other = fn === 'sin' ? 'cos' : 'sin';
    const O = `${other}²x`, Oa = `${other}(x)^2`;
    // a s² + b s + c = a(1 − o²) + b s + c = −a o² + b s + (a + c)
    let A2 = -a, B2 = b, C2 = a + c;
    if (A2 < 0) { A2 = -A2; B2 = -B2; C2 = -C2; }
    const show = `${coef(A2)}${O}${B2 === 0 ? '' : ` ${B2 < 0 ? '−' : '+'} ${Math.abs(B2) === 1 ? '' : `${Math.abs(B2)} `}${G}`}${tailShow(C2)} = 0`;
    const ascii = `${A2}*${Oa}${B2 === 0 ? '' : ` ${B2 < 0 ? '-' : '+'} ${Math.abs(B2)}*${Ga}`}${tailAscii(C2)} = 0`;
    const q = quadShow(a, b, c, G, Ga);
    return { conds, show, ascii,
      work: `Write it all in ${NAMES[fn]}: ${other}²x = 1 − ${fn}²x, and collecting terms gives ${q.show} = 0, which factors as ${factored}, so ${roots}.`,
      trap: `(Two functions cannot be factored together: the identity first turns ${other}²x into 1 − ${fn}²x.)` };
  }
  if (kind === 'square') {
    const f = rng.pick(['sin', 'cos', 'tan']);
    const G = `${f} x`, Ga = `${f}(x)`;
    const k = rng.pick(f === 'tan' ? ['1/3', '1/1', '3/1'] : ['1/4', '1/2', '3/4', '1/1']);
    const [kn, kd] = k.split('/').map(Number);
    const root = SQUARE_ROOT[k];
    const zero = rng.chance(0.5);
    const lhs = `${coef(kd)}${f}²x`;
    return {
      conds: [[f, root], [f, neg(root)]],
      show: zero ? `${lhs} − ${kn} = 0` : `${lhs} = ${kn}`,
      ascii: zero ? `${kd}*${Ga}^2 - ${kn} = 0` : `${kd}*${Ga}^2 = ${kn}`,
      work: `${kd === 1 ? '' : `Divide by ${kd}: `}${f}²x = ${kn}${kd === 1 ? '' : `/${kd}`}, so ${G} = ±${valText(root)}.`,
      trap: `(A square root has two signs: ${G} = −${valText(root).replace('−', '')} gives as many solutions as the positive root.)`,
    };
  }
  // A common factor: f x (d g x − w) = 0, with g the same function or the other.
  const g = rng.pick(['sin', 'cos']);
  const w = rng.pick([V(1, 2), V(-1, 2), V(1, 2, 3), V(-1, 2, 3), V(1, 2, 2), V(-1, 2, 2)]);
  const G = `${g} x`, Ga = `${g}(x)`;
  const d = w.d;
  // The factor's constant, −w·d: −1, +1, −√3, +√3.
  const sg = w.n > 0 ? '−' : '+', sgA = w.n > 0 ? '-' : '+';
  const k = w.r === 1 ? (Math.abs(w.n) === 1 ? '' : `${Math.abs(w.n)} `) : `√${w.r} `;
  const kA = w.r === 1 ? `${Math.abs(w.n)}` : `sqrt(${w.r})`;
  const kOne = w.r === 1 ? String(Math.abs(w.n)) : `√${w.r}`;
  const first = g === fn ? `${coef(d)}${fn}²x` : `${coef(d)}${G} ${F}`;
  const firstA = g === fn ? `${d}*${Fa}^2` : `${d}*${Ga}*${Fa}`;
  return {
    conds: [[fn, V(0)], [g, w]],
    show: `${first} ${sg} ${k}${F} = 0`,
    ascii: `${firstA} ${sgA} ${kA}*${Fa} = 0`,
    work: `Factor out ${F}: ${F}(${coef(d)}${G} ${sg} ${kOne}) = 0, so ${F} = 0 or ${G} = ${valText(w)}.`,
    trap: `(Dividing both sides by ${F} would throw away ${F} = 0 and its solutions.)`,
  };
}

function quadraticType(rng) {
  for (;;) {
    const q = quadratic(rng);
    const sets = q.conds.map(([f, v]) => solveDeg(f, v));
    const xs = union(...sets);
    if (!xs.length && rng.chance(0.8)) continue;
    const radians = rng.chance(0.25);
    const perWords = q.conds.map(([f, v], i) => (inRange(f, v) ? `${f} x = ${valText(v)} at ${anglesText(sets[i], radians)}` : `${f} x = ${valText(v)} has no solution`));
    if (!radians) {
      return {
        prompt: [T.prose(`Solve ${q.show} for 0° ≤ x < 360°. Give every solution in degrees, or say there is none.`)],
        text: `solve degrees: ${q.ascii}`,
        answer: setAnswer(xs),
        visual: null,
        explain: `${q.work} In one turn, ${listed(perWords)}. ${q.trap} So ${xs.length ? `x = ${anglesText(xs, false)}` : 'there is no solution'}.`,
      };
    }
    // Wrong: one factor alone, one root with its sign flipped.
    const wrong = [];
    if (sets.length > 1) sets.forEach((s, i) => wrong.push(union(...sets.filter((_, j) => j !== i))));
    q.conds.forEach(([f, v], i) => wrong.push(union(...sets.filter((_, j) => j !== i), solveDeg(f, neg(v)))));
    q.conds.forEach(([f, v], i) => wrongSets(f, v).forEach((s) => wrong.push(union(...sets.filter((_, j) => j !== i), s))));
    const c = setChoice(rng, xs, wrong.filter((s) => s.length));
    if (!c) continue;
    return {
      prompt: [T.prose(`Solve ${q.show} for 0 ≤ x < 2π.`)],
      text: `solve radians: ${q.ascii}; options ${c.key}`,
      answer: c.answer,
      visual: null,
      explain: `${q.work} In one turn, ${listed(perWords)}. ${q.trap} So ${xs.length ? `x = ${anglesText(xs, true)}` : 'there is no solution'}.`,
    };
  }
}

const CONTENT = [inverse, solveDegrees, solveRadians, general, quadraticType];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  // All Together draws on the solving levels, whose answers share one box;
  // the inverse values are used inside every one of them.
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(1, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
