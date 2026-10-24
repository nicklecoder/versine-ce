/**
 * Catalogue authoring tool: builds the problem library for inverses.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 *
 * Every `text` carries f in plain ASCII, so scripts/check-answers.py can
 * undo it by its own route: solving f(x) = c, composing f with the answer,
 * or reading a table or graph backwards.
 */
import * as T from '../terms.js';
import { minus } from '../../web/ui/dom.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/inverses.js';
import { reduce } from './chance.js';
import { tenths } from './trig.js';
import { LINE, ASKED } from './figures.js';

const optionIds = ['a', 'b', 'c', 'd'];
const fracAns = (n, d = 1) => ({ type: 'frac', value: reduce(n, d), requireSimplest: false });
const q = (n, d = 1) => { const r = reduce(n, d); return r.d < 0 ? { n: -r.n, d: -r.d } : r; };
const qText = ({ n, d }, fancy = false) => { const s = d === 1 ? String(n) : `${n}/${d}`; return fancy ? s.replace(/-/g, '−') : s; };
const pm = (k, fancy) => (k < 0 ? `${fancy ? ' − ' : ' - '}${-k}` : ` + ${k}`);

/** ax + b, written plainly: 3x - 5, -x + 2, x. */
function lin(a, b, fancy = false) {
  const lead = a === 1 ? 'x' : a === -1 ? (fancy ? '−x' : '-x') : `${fancy ? minus(a) : a}x`;
  return b === 0 ? lead : `${lead}${pm(b, fancy)}`;
}
/** A coefficient on x that may be a fraction: 1/3x, -2/5x, 2x. */
function coefX({ n, d }, fancy) {
  if (d === 1) return n === 1 ? 'x' : n === -1 ? (fancy ? '−x' : '-x') : `${fancy ? minus(n) : n}x`;
  return `${fancy ? minus(n) : n}/${d}x`;
}
function plusQ({ n, d }, fancy) {
  if (n === 0) return '';
  return `${n < 0 ? (fancy ? ' − ' : ' - ') : ' + '}${qText({ n: Math.abs(n), d })}`;
}

/*
 * The families of one-to-one rules, each with its inverse in every form a
 * student is likely to write it: (x + 5)/3, x/3 + 5/3 and 1/3x + 5/3 are
 * one function, and the expression box compares by form, so each is listed.
 */
function family(rng) {
  const kind = rng.pick(['ax+b', 'ax+b', 'ax+b', '(x+b)/a', 'a(x+b)']);
  if (kind === 'ax+b') {
    const a = rng.pick([2, 3, 4, 5, -2, -3, -4, 6]), b = rng.nonZero(-9, 9);
    const A = Math.abs(a);
    const num = a > 0 ? lin(1, -b) : lin(-1, b);
    const numF = a > 0 ? lin(1, -b, true) : lin(-1, b, true);
    const m = q(1, a), c = q(-b, a);
    const xa = (f) => `${a < 0 ? (f ? '−' : '-') : ''}x/${A}${plusQ(c, f)}`;
    return {
      f: lin(a, b), show: lin(a, b, true), at: (x) => a * x + b,
      work: (c) => `${b > 0 ? 'subtract' : 'add'} ${Math.abs(b)}: ${minus(a)}x = ${minus(c - b)}; then divide by ${minus(a)}: x = ${minus((c - b) / a)}`,
      inv: [`(${num})/${A}`, `${coefX(m)}${plusQ(c)}`, xa(false)],
      invShow: `(${numF})/${A}`,
      solve: `x = ${lin(a, b, true).replace(/x/g, 'y')}, so x ${b < 0 ? '+' : '−'} ${Math.abs(b)} = ${minus(a)}y, and y = (${numF})/${A}`,
    };
  }
  if (kind === '(x+b)/a') {
    const a = rng.pick([2, 3, 4, 5]), b = rng.nonZero(-9, 9);
    const inside = lin(1, b), insideF = lin(1, b, true);
    return {
      f: `(${inside})/${a}`, show: `(${insideF})/${a}`, at: (x) => (x + b) / a,
      work: (c) => `multiply by ${a}: ${insideF} = ${minus(a * c)}; then ${b > 0 ? 'subtract' : 'add'} ${Math.abs(b)}: x = ${minus(a * c - b)}`,
      inv: [lin(a, -b)], invShow: lin(a, -b, true),
      solve: `x = (${insideF.replace(/x/g, 'y')})/${a}, so ${a}x = ${insideF.replace(/x/g, 'y')}, and y = ${lin(a, -b, true)}`,
    };
  }
  const a = rng.pick([2, 3, 4, 5, -2, -3]), b = rng.nonZero(-6, 6);
  return {
    f: `${a}(${lin(1, b)})`, show: `${minus(a)}(${lin(1, b, true)})`, at: (x) => a * (x + b),
    work: (c) => `divide by ${minus(a)}: ${lin(1, b, true)} = ${minus(c / a)}; then ${b > 0 ? 'subtract' : 'add'} ${Math.abs(b)}: x = ${minus(c / a - b)}`,
    inv: [`${a < 0 ? '-' : ''}x/${Math.abs(a)}${pm(-b)}`, `${coefX(q(1, a))}${pm(-b)}`, `(${a > 0 ? lin(1, -a * b) : lin(-1, a * b)})/${Math.abs(a)}`].filter((s, i, all) => all.indexOf(s) === i),
    invShow: `${a < 0 ? '−' : ''}x/${Math.abs(a)}${pm(-b, true)}`,
    solve: `x = ${minus(a)}(${lin(1, b, true).replace(/x/g, 'y')}), so x/${a < 0 ? `(${minus(a)})` : a} = ${lin(1, b, true).replace(/x/g, 'y')}, and y = ${a < 0 ? '−' : ''}x/${Math.abs(a)}${pm(-b, true)}`,
  };
}

// --- Undo a Function -------------------------------------------------------

const STEP_WORDS = { plus: (k) => `adds ${k}`, minus: (k) => `subtracts ${k}`, times: (k) => `multiplies by ${minus(k)}`, divide: (k) => `divides by ${minus(k)}` };
const UNDO = { plus: 'minus', minus: 'plus', times: 'divide', divide: 'times' };
const stepText = (s) => s.map(([op, k]) => `${op} ${k}`).join(', ');
const stepWords = (s) => s.map(([op, k]) => STEP_WORDS[op](k)).join(', then ');

function undoValue(rng) {
  const shape = rng.pick(['rule', 'rule', 'cube', 'table', 'table', 'steps', 'steps']);
  if (shape === 'table') {
    const xs = [-2, -1, 0, 1, 2, 3];
    const ys = new Set();
    while (ys.size < xs.length) ys.add(rng.int(-9, 12));
    const f = rng.shuffle([...ys]);
    const i = rng.int(0, xs.length - 1);
    const c = f[i], x = xs[i];
    const isX = xs.includes(c) && f[xs.indexOf(c)] !== c;
    return {
      prompt: [T.prose(`The table gives f(x). Find f⁻¹(${minus(c)}).`)],
      text: `inverse table: x ${xs.join(', ')} | f ${f.join(', ')}; at ${c}`,
      answer: fracAns(x),
      visual: { kind: 'table', cols: ['x', 'f(x)'], rows: xs.map((v, j) => [minus(v), minus(f[j])]),
        workingCol: 'read', working: xs.map((v) => (v === x ? `f(${minus(x)}) = ${minus(c)}` : '')) },
      explain: `f⁻¹(${minus(c)}) is the input that f sends to ${minus(c)}. Find ${minus(c)} in the f(x) column: it is in the row x = ${minus(x)}, since f(${minus(x)}) = ${minus(c)}. `
        + `${isX ? `(Reading the row x = ${minus(c)} gives f(${minus(c)}), the other way round.) ` : ''}So f⁻¹(${minus(c)}) = ${minus(x)}.`,
    };
  }
  if (shape === 'steps') return undoSteps(rng);
  if (shape === 'cube') {
    const a = rng.pick([1, 1, 2, -1]), b = rng.nonZero(-9, 9), x = rng.int(-3, 3);
    const c = a * x ** 3 + b;
    const f = `${a === 1 ? '' : a === -1 ? '-' : a}x^3${pm(b)}`;
    const aShow = a === 1 ? '' : a === -1 ? '−' : minus(a);
    const show = `${aShow}x³${pm(b, true)}`;
    return {
      prompt: [T.prose(`f(x) = ${show}. Find f⁻¹(${minus(c)}).`)],
      text: `inverse value: f(x) = ${f}; at ${c}`,
      answer: fracAns(x),
      visual: null,
      explain: `f⁻¹(${minus(c)}) is the x with f(x) = ${minus(c)}: ${show} = ${minus(c)}. Undo the ${b > 0 ? 'adding' : 'subtracting'} first: ${aShow}x³ = ${minus(c - b)}`
        + `${a === 1 ? '' : `, so x³ = ${minus(x ** 3)}`}, and the cube root gives x = ${minus(x)}. So f⁻¹(${minus(c)}) = ${minus(x)}.`,
    };
  }
  for (;;) {
    const F = family(rng);
    const x = rng.int(-6, 8);
    const c = F.at(x);
    if (!Number.isInteger(c)) continue;
    return {
      prompt: [T.prose(`f(x) = ${F.show}. Find f⁻¹(${minus(c)}).`)],
      text: `inverse value: f(x) = ${F.f}; at ${c}`,
      answer: fracAns(x),
      visual: null,
      explain: `f⁻¹(${minus(c)}) is the input that gives the output ${minus(c)}, so solve f(x) = ${minus(c)}: ${F.show} = ${minus(c)}. `
        + `Undo f's steps, the last one first: ${F.work(c)}. Check: f(${minus(x)}) = ${minus(c)}. `
        + `(f⁻¹(${minus(c)}) is not f(${minus(c)}), and not 1/f(${minus(c)}): the −1 means undo, not a power.) So f⁻¹(${minus(c)}) = ${minus(x)}.`,
    };
  }
}

function undoSteps(rng) {
  for (;;) {
    // One step that adds and one that multiplies, so their order matters.
    const add = [rng.pick(['plus', 'minus']), rng.int(2, 9)];
    const mul = [rng.pick(['times', 'times', 'divide']), rng.int(2, 6)];
    const f = rng.chance(0.5) ? [add, mul] : [mul, add];
    const undo = (s) => [UNDO[s[0]], s[1]];
    const right = [...f].reverse().map(undo);
    const options = [right, f.map(undo), [...f].reverse(), [f[1], f[0]].map(([op, k]) => [op === 'times' ? 'divide' : op === 'divide' ? 'times' : op, k])];
    const texts = options.map(stepText);
    if (new Set(texts).size < 4) continue;
    const order = rng.shuffle([0, 1, 2, 3]);
    const label = (s) => s.map(([op, k]) => STEP_WORDS[op](k)).join(', then ').replace(/^./, (c) => c.toUpperCase());
    return {
      prompt: [T.prose(`f ${stepWords(f)}. Which does f⁻¹ do?`)],
      text: `undo steps: ${stepText(f)}; options ${order.map((k, i) => `${optionIds[i]}: ${texts[k]}`).join(' | ')}`,
      answer: { type: 'choice', value: optionIds[order.indexOf(0)], options: order.map((k, i) => ({ id: optionIds[i], label: label(options[k]) })) },
      visual: null,
      explain: `f⁻¹ undoes each step, and the last step done is the first undone, as taking off shoes comes before socks. `
        + `f's last step ${STEP_WORDS[f[1][0]](f[1][1])}, so f⁻¹ first ${STEP_WORDS[right[0][0]](right[0][1])}; then it undoes the first step: it ${STEP_WORDS[right[1][0]](right[1][1])}. `
        + `(Undoing in the same order as f, or doing f's steps again backwards, does not get back to the start.)`,
    };
  }
}

// --- Solve for x ↔ y -------------------------------------------------------

function formula(rng) {
  const F = family(rng);
  return {
    prompt: [T.prose(`f(x) = ${F.show}. Find f⁻¹(x).`)],
    text: `inverse formula: f(x) = ${F.f}`,
    answer: { type: 'expr', value: F.inv[0], ...(F.inv.length > 1 ? { accept: F.inv.slice(1) } : {}) },
    visual: null,
    explain: `Write y = ${F.show}, then swap x and y, since f⁻¹ takes f's outputs as its inputs: ${F.solve}. `
      + `So f⁻¹(x) = ${F.invShow}. Check: f(f⁻¹(x)) = x.`,
  };
}

// --- Check by Composing ----------------------------------------------------

function checkPair(rng) {
  for (;;) {
    const a = rng.pick([2, 3, 4, 5]), b = rng.nonZero(-9, 9);
    const f = lin(a, b), fShow = lin(a, b, true);
    const right = `(${lin(1, -b)})/${a}`, rightShow = `(${lin(1, -b, true)})/${minus(a)}`;
    const wrongs = [
      { g: `(${lin(1, b)})/${a}`, show: `(${lin(1, b, true)})/${minus(a)}`, why: `the ${minus(b)} is undone with the wrong sign` },
      { g: `x/${a}${pm(-b)}`, show: `x/${minus(a)}${pm(-b, true)}`, why: 'the steps are undone in the same order as f does them' },
      { g: `1/(${f})`, show: `1/(${fShow})`, why: '1/f(x) is a reciprocal, not an inverse' },
    ];
    const isInverse = rng.chance(0.45);
    const typed = rng.chance(0.4);
    const pool = typed ? wrongs.slice(0, 2) : wrongs;
    const pick = isInverse ? { g: right, show: rightShow } : rng.pick(pool);
    // f(g(x)) worked out: for a line inside a line it is a line again.
    const fg = (x) => a * evalG(pick.g, x) + b;
    if (typed) {
      const k0 = fg(0), k1 = fg(1) - k0;
      if (!Number.isInteger(k0) || !Number.isInteger(k1)) continue;
      const value = lin(k1, k0);
      return {
        prompt: [T.prose(`f(x) = ${fShow} and g(x) = ${pick.show}. Find f(g(x)), simplified.`)],
        text: `inverse compose: f(x) = ${f}; g(x) = ${pick.g}; f(g(x))`,
        answer: { type: 'expr', value },
        visual: null,
        explain: `Put g into f: f(g(x)) = ${pick.show.startsWith("(") ? `${a} · ${pick.show}` : `${a}(${pick.show})`} ${b < 0 ? '−' : '+'} ${Math.abs(b)} = ${lin(k1, k0, true)}. `
          + (isInverse ? 'Only x is left, so g undoes f: they are inverses.' : `That is not x, so g is not f⁻¹: ${pick.why}.`),
      };
    }
    return {
      prompt: [T.prose(`f(x) = ${fShow} and g(x) = ${pick.show}. Are f and g inverses of each other?`)],
      text: `inverse pair: f(x) = ${f}; g(x) = ${pick.g}; options a: inverses | b: not inverses`,
      answer: { type: 'choice', value: isInverse ? 'a' : 'b', options: [
        { id: 'a', label: 'Yes: f(g(x)) = x and g(f(x)) = x' },
        { id: 'b', label: 'No: composing them does not give x' },
      ] },
      visual: null,
      explain: isInverse
        ? `f(g(x)) = ${minus(a)} · ${rightShow} ${b < 0 ? '−' : '+'} ${Math.abs(b)} = x, and g(f(x)) = (${fShow} ${b < 0 ? '+' : '−'} ${Math.abs(b)})/${minus(a)} = x. Both orders give x, so they are inverses.`
        : `Compose them: f(g(x)) ${pick.g.startsWith('1/') ? `= ${minus(a)}/(${fShow}) ${b < 0 ? '−' : '+'} ${Math.abs(b)}` : `= ${lin(Math.round(fg(1) - fg(0)), Math.round(fg(0)), true)}`}, which is not x. So they are not inverses: ${pick.why}.`,
    };
  }
}

/** g evaluated from its own ASCII text, only for the shapes written above. */
function evalG(g, x) {
  let m;
  if ((m = g.match(/^\((-?x)(?: ([+-]) (\d+))?\)\/(-?\d+)$/))) {
    const s = m[1] === '-x' ? -x : x;
    return (s + (m[2] ? (m[2] === '+' ? 1 : -1) * +m[3] : 0)) / +m[4];
  }
  if ((m = g.match(/^x\/(-?\d+)(?: ([+-]) (\d+))?$/))) return x / +m[1] + (m[2] ? (m[2] === '+' ? 1 : -1) * +m[3] : 0);
  if ((m = g.match(/^1\/\((.+)\)$/))) return NaN;
  throw new Error(`evalG: ${g}`);
}

// --- Restrict the Domain ---------------------------------------------------

const sq = (h) => (h === 0 ? 'x' : `x${pm(-h)}`);
const sqF = (h) => (h === 0 ? 'x' : `x${pm(-h, true)}`);

function restrict(rng) {
  const shape = rng.pick(['value', 'value', 'sqrtValue', 'which', 'formula', 'formula']);
  const h = rng.nonZero(-5, 6), k = rng.nonZero(-6, 6);
  const right = rng.chance(0.6);
  const branch = right ? `x >= ${h}` : `x <= ${h}`, branchF = right ? `x ≥ ${minus(h)}` : `x ≤ ${minus(h)}`;
  const f = `(${sq(h)})^2${pm(k)}`, show = `(${sqF(h)})²${pm(k, true)}`;
  if (shape === 'value') {
    const r = rng.int(1, 6), c = r * r + k, x = right ? h + r : h - r;
    return {
      prompt: [T.prose(`f(x) = ${show} for ${branchF}. Find f⁻¹(${minus(c)}).`)],
      text: `restricted inverse: f(x) = ${f}; ${branch}; at ${c}`,
      answer: fracAns(x),
      visual: null,
      explain: `Solve f(x) = ${minus(c)}: (${sqF(h)})² = ${minus(c - k)}, so ${sqF(h)} = ${r} or ${sqF(h)} = −${r}, giving x = ${minus(h + r)} or x = ${minus(h - r)}. `
        + `Only one is in the domain ${branchF}: x = ${minus(x)}. (That is why the domain was cut: the whole parabola sends both to ${minus(c)}, and an inverse can only give one.) So f⁻¹(${minus(c)}) = ${minus(x)}.`,
    };
  }
  if (shape === 'sqrtValue') {
    const kk = rng.int(-4, 5), hh = rng.int(-5, 6), r = rng.int(0, 7);
    const c = r + kk, x = r * r + hh;
    const g = `sqrt(${sq(hh)})${kk ? pm(kk) : ''}`, gShow = `√(${sqF(hh)})${kk ? pm(kk, true) : ''}`;
    return {
      prompt: [T.prose(`f(x) = ${gShow} for x ≥ ${minus(hh)}. Find f⁻¹(${minus(c)}).`)],
      text: `restricted inverse: f(x) = ${g}; x >= ${hh}; at ${c}`,
      answer: fracAns(x),
      visual: null,
      explain: `Solve f(x) = ${minus(c)}: √(${sqF(hh)}) = ${r}${kk ? ` (after ${kk > 0 ? 'subtracting' : 'adding'} ${Math.abs(kk)})` : ''}. Squaring undoes the root: ${sqF(hh)} = ${r * r}, so x = ${minus(x)}. `
        + `So f⁻¹(${minus(c)}) = ${minus(x)}.`,
    };
  }
  if (shape === 'which') {
    const good = right ? `x >= ${h}` : `x <= ${h}`;
    const bad = [`x >= ${h - 2}`, `x <= ${h + 2}`, 'all'];
    if (k < h && right) bad[0] = `x >= ${k}`;
    const all = [good, ...bad];
    if (new Set(all).size < 4) return restrict(rng);
    const order = rng.shuffle([0, 1, 2, 3]);
    const label = (s) => (s === 'all' ? 'All real numbers' : s.replace('>=', '≥').replace('<=', '≤').replace(/-/g, '−'));
    return {
      prompt: [T.prose(`f(x) = ${show}. On which domain is f one-to-one, so that it has an inverse?`)],
      text: `one-to-one: f(x) = ${f}; options ${order.map((j, i) => `${optionIds[i]}: ${all[j]}`).join(' | ')}`,
      answer: { type: 'choice', value: optionIds[order.indexOf(0)], options: order.map((j, i) => ({ id: optionIds[i], label: label(all[j]) })) },
      visual: null,
      explain: `The vertex is at x = ${minus(h)}, and the parabola takes each height twice, once each side of it: f(${minus(h - 1)}) = f(${minus(h + 1)}). `
        + `A domain with no input on one side of ${minus(h)} gives each output once: ${label(good)}. `
        + `The others reach both sides of the vertex${k < h && right ? ` (${minus(k)} is the vertex's height, not its x)` : ''}.`,
    };
  }
  // formula: which is f⁻¹(x)?
  const sign = right ? '' : '-';
  const opts = [
    `${sign}sqrt(${sq(k)})${pm(h)}`,
    `${right ? '-' : ''}sqrt(${sq(k)})${pm(h)}`,
    `${sign}sqrt(${sq(h)})${pm(k)}`,
    `${sign}sqrt(${sq(-k)})${pm(-h)}`,
  ];
  if (new Set(opts).size < 4) return restrict(rng);
  const pretty = (s) => s.replace(/sqrt\(([^)]+)\)/, '√($1)').replace(/ - /g, ' − ').replace(/^-/, '−');
  const order = rng.shuffle([0, 1, 2, 3]);
  return {
    prompt: [T.prose(`f(x) = ${show} for ${branchF}. Which is f⁻¹(x)?`)],
    text: `restricted formula: f(x) = ${f}; ${branch}; options ${order.map((j, i) => `${optionIds[i]}: ${opts[j]}`).join(' | ')}`,
    answer: { type: 'choice', value: optionIds[order.indexOf(0)], options: order.map((j, i) => ({ id: optionIds[i], label: pretty(opts[j]) })) },
    visual: null,
    explain: `Swap x and y: x = (${sqF(h).replace(/x/, 'y')})²${pm(k, true)}, so (${sqF(h).replace(/x/, 'y')})² = ${sqF(k)} and y ${pm(-h, true)} = ±√(${sqF(k)}). `
      + `f's inputs were ${branchF}, so f⁻¹'s outputs must be too: y ${right ? '≥' : '≤'} ${minus(h)} takes the ${right ? '+' : '−'} sign. So f⁻¹(x) = ${pretty(opts[0])}. `
      + `(The other sign is the inverse of the other half of the parabola.)`,
  };
}

// --- Graph Reflection ------------------------------------------------------

const PLANE = { xRange: [-8, 8], yRange: [-8, 8], grid: 1 };

function reflect(rng) {
  if (rng.chance(0.4)) {
    const a = rng.int(-7, 7), b = rng.int(-7, 7);
    if (a === b) return reflect(rng);
    const said = rng.chance(0.5);
    return {
      prompt: [T.prose(said ? `f(${minus(a)}) = ${minus(b)}. Which point must be on the graph of f⁻¹?` : `The point (${minus(a)}, ${minus(b)}) is on the graph of f. Which point must be on the graph of f⁻¹?`)],
      text: said ? `reflect value: f(${a}) = ${b}` : `reflect point: (${a}, ${b})`,
      answer: { type: 'pair', value: { x: { n: b, d: 1 }, y: { n: a, d: 1 } } },
      visual: null,
      explain: `${said ? `f(${minus(a)}) = ${minus(b)} puts (${minus(a)}, ${minus(b)}) on the graph of f, and ` : ''}f⁻¹ sends ${minus(b)} back to ${minus(a)}, so f⁻¹(${minus(b)}) = ${minus(a)}: the coordinates swap. `
        + `Reflected in y = x, (${minus(a)}, ${minus(b)}) becomes (${minus(b)}, ${minus(a)}).`,
    };
  }
  for (;;) {
    // A graph that only rises, or only falls, through corners on the grid.
    const n = rng.int(3, 4);
    const xs = new Set();
    while (xs.size < n) xs.add(rng.int(-7, 7));
    const sx = [...xs].sort((p, r) => p - r);
    const ys = new Set();
    while (ys.size < n) ys.add(rng.int(-7, 7));
    let sy = [...ys].sort((p, r) => p - r);
    if (rng.chance(0.4)) sy = sy.reverse();
    const pts = sx.map((x, i) => [x, sy[i]]);
    const i = rng.int(0, n - 1);
    const [x0, k] = pts[i];
    if (x0 === k) continue;
    return {
      prompt: [T.prose(`The graph of f is shown. Find f⁻¹(${minus(k)}).`)],
      text: `graph inverse: ${pts.map(([x, y]) => `(${x}, ${y})`).join(' ')}; at ${k}`,
      answer: fracAns(x0),
      visual: tenths({ kind: 'plane', ...PLANE, marks: [
        { kind: 'path', points: pts, tone: LINE },
        { kind: 'point', at: pts[0], tone: LINE }, { kind: 'point', at: pts[n - 1], tone: LINE },
      ], answer: [
        { kind: 'path', points: [[-8, -8], [8, 8]], tone: ASKED, dashed: true },
        { kind: 'point', at: [x0, k], tone: ASKED, label: `(${minus(x0)}, ${minus(k)})` },
        { kind: 'point', at: [k, x0], tone: ASKED, label: `(${minus(k)}, ${minus(x0)})` },
      ] }),
      explain: `f⁻¹(${minus(k)}) is the input where f's height is ${minus(k)}. Go across from ${minus(k)} on the y-axis to the graph: it is there at x = ${minus(x0)}, since f(${minus(x0)}) = ${minus(k)}. `
        + `On the graph of f⁻¹, the reflection in y = x, that point is (${minus(k)}, ${minus(x0)}). (Reading f(${minus(k)}) instead, up from ${minus(k)} on the x-axis, is the usual slip.) So f⁻¹(${minus(k)}) = ${minus(x0)}.`,
    };
  }
}

const CONTENT = [undoValue, formula, checkPair, restrict, reflect];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  // requiem: catalogue/content/one-input-per-level
  // Each question shape keeps one box, and the question says which: "find
  // f⁻¹(7)" a number, "find f⁻¹(x)" a formula, "which point" a pair.
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
