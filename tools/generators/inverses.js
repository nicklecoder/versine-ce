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
 * or reading a table or graph backwards; a log's domain is sampled, and its
 * inverse is the option that composes with it to give x back.
 */
import * as T from '../terms.js';
import { minus } from '../../web/ui/dom.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/inverses.js';
import { reduce } from './chance.js';
import { tenths } from './trig.js';
import { LINE, ASKED } from './figures.js';

const optionIds = ['a', 'b', 'c', 'd', 'e'];
const fracAns = (n, d = 1) => ({ type: 'frac', value: reduce(n, d), requireSimplest: false });
const pm = (k, fancy) => (k < 0 ? `${fancy ? ' − ' : ' - '}${-k}` : ` + ${k}`);

/** ax + b, written plainly: 3x - 5, -x + 2, x. */
function lin(a, b, fancy = false) {
  const lead = a === 1 ? 'x' : a === -1 ? (fancy ? '−x' : '-x') : `${fancy ? minus(a) : a}x`;
  return b === 0 ? lead : `${lead}${pm(b, fancy)}`;
}

/*
 * The families of one-to-one rules, each with its inverse written once: the
 * answer box judges f⁻¹(x) by value, so (x + 5)/3, x/3 + 5/3 and
 * 0.333…-free forms like (1/3)(x + 5) are all one answer and none is listed.
 * Beyond lines, a cube and a cube root undo each other, and (ax + b)/(cx + d)
 * is undone by solving for x across the fraction bar (F-BF.4a).
 */
const gcdOf = (...ns) => ns.reduce((g, n) => { let a = Math.abs(g), b = Math.abs(n); while (b) [a, b] = [b, a % b]; return a; }, 0);
const cbrt = (v) => (v < 0 ? -Math.round(Math.cbrt(-v)) : Math.round(Math.cbrt(v)));

// requiem: catalogue/content/inverse-families-widened
function family(rng) {
  const kind = rng.pick(['ax+b', 'ax+b', '(x+b)/a', 'a(x+b)', 'p/q x+b', 'a-bx', 'cube', 'cube root', 'ratio', 'ratio']);
  const pickX = () => rng.int(-6, 8);
  if (kind === 'ax+b') {
    const a = rng.pick([2, 3, 4, 5, -2, -3, -4, 6]), b = rng.nonZero(-9, 9);
    const A = Math.abs(a);
    const num = a > 0 ? lin(1, -b) : lin(-1, b);
    const numF = a > 0 ? lin(1, -b, true) : lin(-1, b, true);
    return {
      f: lin(a, b), show: lin(a, b, true), at: (x) => a * x + b, pickX,
      work: (c) => `${b > 0 ? 'subtract' : 'add'} ${Math.abs(b)}: ${minus(a)}x = ${minus(c - b)}; then divide by ${minus(a)}: x = ${minus((c - b) / a)}`,
      inv: `(${num})/${A}`, invShow: `(${numF})/${A}`,
      solve: `x = ${lin(a, b, true).replace(/x/g, 'y')}, so x ${b < 0 ? '+' : '−'} ${Math.abs(b)} = ${minus(a)}y, and y = (${numF})/${A}`,
    };
  }
  if (kind === '(x+b)/a') {
    const a = rng.pick([2, 3, 4, 5]), b = rng.nonZero(-9, 9);
    const inside = lin(1, b), insideF = lin(1, b, true);
    return {
      f: `(${inside})/${a}`, show: `(${insideF})/${a}`, at: (x) => (x + b) / a, pickX,
      work: (c) => `multiply by ${a}: ${insideF} = ${minus(a * c)}; then ${b > 0 ? 'subtract' : 'add'} ${Math.abs(b)}: x = ${minus(a * c - b)}`,
      inv: lin(a, -b), invShow: lin(a, -b, true),
      solve: `x = (${insideF.replace(/x/g, 'y')})/${a}, so ${a}x = ${insideF.replace(/x/g, 'y')}, and y = ${lin(a, -b, true)}`,
    };
  }
  if (kind === 'a(x+b)') {
    const a = rng.pick([2, 3, 4, 5, -2, -3]), b = rng.nonZero(-6, 6);
    return {
      f: `${a}(${lin(1, b)})`, show: `${minus(a)}(${lin(1, b, true)})`, at: (x) => a * (x + b), pickX,
      work: (c) => `divide by ${minus(a)}: ${lin(1, b, true)} = ${minus(c / a)}; then ${b > 0 ? 'subtract' : 'add'} ${Math.abs(b)}: x = ${minus(c / a - b)}`,
      inv: `${a < 0 ? '-' : ''}x/${Math.abs(a)}${pm(-b)}`,
      invShow: `${a < 0 ? '−' : ''}x/${Math.abs(a)}${pm(-b, true)}`,
      solve: `x = ${minus(a)}(${lin(1, b, true).replace(/x/g, 'y')}), so x/${a < 0 ? `(${minus(a)})` : a} = ${lin(1, b, true).replace(/x/g, 'y')}, and y = ${a < 0 ? '−' : ''}x/${Math.abs(a)}${pm(-b, true)}`,
    };
  }
  if (kind === 'p/q x+b') {
    // (2/3)x + 4: undone by taking the 4 away and multiplying by 3/2.
    const [p, qq] = rng.pick([[2, 3], [3, 4], [3, 2], [2, 5], [4, 3], [5, 2], [3, 5]]), b = rng.nonZero(-9, 9);
    const back = `${qq}(${lin(1, -b)})/${p}`, backF = `${qq}(${lin(1, -b, true)})/${p}`;
    return {
      f: `(${p}/${qq})x${pm(b)}`, show: `(${p}/${qq})x${pm(b, true)}`, at: (x) => (p * x) / qq + b,
      pickX: () => qq * rng.int(-3, 4),
      work: (c) => `${b > 0 ? 'subtract' : 'add'} ${Math.abs(b)}: (${p}/${qq})x = ${minus(c - b)}; then multiply by ${qq}/${p}: x = ${minus(((c - b) * qq) / p)}`,
      inv: back, invShow: backF,
      solve: `x = (${p}/${qq})y${pm(b, true)}, so x ${b < 0 ? '+' : '−'} ${Math.abs(b)} = (${p}/${qq})y, and multiplying by ${qq}/${p}, y = ${backF}`,
    };
  }
  if (kind === 'a-bx') {
    const a = rng.nonZero(-9, 9), b = rng.int(2, 5);
    return {
      f: `${a} - ${b}x`, show: `${minus(a)} − ${b}x`, at: (x) => a - b * x, pickX,
      work: (c) => `${a > 0 ? 'subtract' : 'add'} ${Math.abs(a)}: −${b}x = ${minus(c - a)}; then divide by −${b}: x = ${minus((a - c) / b)}`,
      inv: `(${a} - x)/${b}`, invShow: `(${minus(a)} − x)/${b}`,
      solve: `x = ${minus(a)} − ${b}y, so ${b}y = ${minus(a)} − x, and y = (${minus(a)} − x)/${b}`,
    };
  }
  if (kind === 'cube') {
    const b = rng.nonZero(-9, 9);
    return {
      f: `x^3${pm(b)}`, show: `x³${pm(b, true)}`, at: (x) => x ** 3 + b, pickX: () => rng.int(-3, 3),
      work: (c) => `${b > 0 ? 'subtract' : 'add'} ${Math.abs(b)}: x³ = ${minus(c - b)}; then take the cube root: x = ${minus(cbrt(c - b))}`,
      inv: `root(3, ${lin(1, -b)})`, invShow: `∛(${lin(1, -b, true)})`, cube: true,
      solve: `x = y³${pm(b, true)}, so y³ = ${lin(1, -b, true)}, and the cube root undoes the cube: y = ∛(${lin(1, -b, true)})`,
    };
  }
  if (kind === 'cube root') {
    const b = rng.nonZero(-9, 9);
    return {
      f: `root(3, ${lin(1, -b)})`, show: `∛(${lin(1, -b, true)})`, at: (x) => cbrt(x - b) ** 3 === x - b ? cbrt(x - b) : NaN,
      pickX: () => b + rng.int(-3, 3) ** 3,
      work: (c) => `cube both sides: ${lin(1, -b, true)} = ${minus(c ** 3)}; then ${b > 0 ? 'add' : 'subtract'} ${Math.abs(b)}: x = ${minus(c ** 3 + b)}`,
      inv: `x^3${pm(b)}`, invShow: `x³${pm(b, true)}`, cube: true,
      solve: `x = ∛(${lin(1, -b, true).replace(/x/g, 'y')}), so cubing both sides, x³ = ${lin(1, -b, true).replace(/x/g, 'y')}, and y = x³${pm(b, true)}`,
    };
  }
  // (ax + b)/(cx + d): y(cx + d) = ax + b, so x(cy − a) = b − dy.
  for (;;) {
    const a = rng.pick([1, 1, 2, 3]), c = rng.pick([1, 1, 2]), b = rng.nonZero(-6, 6), d = rng.nonZero(-6, 6);
    if (a * d === b * c || gcdOf(a, b, c, d) > 1) continue;
    const top = lin(a, b), bottom = lin(c, d);
    const inv = `(${lin(-d, b)})/(${lin(c, -a)})`, invShow = `(${lin(-d, b, true)})/(${lin(c, -a, true)})`;
    const Y = (t) => t.replace(/x/g, 'y');
    return {
      f: `(${top})/(${bottom})`, show: `(${lin(a, b, true)})/(${lin(c, d, true)})`,
      at: (x) => (c * x + d === 0 ? NaN : (a * x + b) / (c * x + d)), pickX, solved: true,
      work: (k) => `multiply both sides by ${lin(c, d, true)}: ${lin(a, b, true)} = ${minus(k)}(${lin(c, d, true)}) = ${lin(k * c, k * d, true)}; `
        + `gather the x terms: ${minus(a - k * c)}x = ${minus(k * d - b)}, so x = ${minus((k * d - b) / (a - k * c))}`,
      inv, invShow,
      solve: `x = (${Y(lin(a, b, true))})/(${Y(lin(c, d, true))}), so x(${Y(lin(c, d, true))}) = ${Y(lin(a, b, true))}. Gather the y terms on one side: `
        + `${c === 1 ? '' : c}xy − ${a === 1 ? '' : a}y = ${lin(-d, b, true)}, so y(${lin(c, -a, true)}) = ${lin(-d, b, true)}, and y = ${invShow}`,
    };
  }
}

// --- Undo a Function -------------------------------------------------------

const STEP_WORDS = { plus: (k) => `adds ${k}`, minus: (k) => `subtracts ${k}`, times: (k) => `multiplies by ${minus(k)}`, divide: (k) => `divides by ${minus(k)}` };
const UNDO = { plus: 'minus', minus: 'plus', times: 'divide', divide: 'times' };
const stepText = (s) => s.map(([op, k]) => `${op} ${k}`).join(', ');
const stepWords = (s) => s.map(([op, k]) => STEP_WORDS[op](k)).join(', then ');

function undoValue(rng) {
  const shape = rng.pick(['rule', 'rule', 'cube', 'table', 'table', 'steps', 'steps']);
  if (shape === 'table') {
    // Six inputs in a row, not always the same six: from −6 up to 2, one or two apart.
    const start = rng.int(-6, 2), step = rng.pick([1, 1, 2]);
    const xs = [0, 1, 2, 3, 4, 5].map((i) => start + step * i);
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
    const x = F.pickX();
    const c = F.at(x);
    if (!Number.isInteger(c)) continue;
    return {
      prompt: [T.prose(`f(x) = ${F.show}. Find f⁻¹(${minus(c)}).`)],
      text: `inverse value: f(x) = ${F.f}; at ${c}`,
      answer: fracAns(x),
      visual: null,
      explain: `f⁻¹(${minus(c)}) is the input that gives the output ${minus(c)}, so solve f(x) = ${minus(c)}: ${F.show} = ${minus(c)}. `
        + `${F.solved ? 'Solve it' : "Undo f's steps, the last one first"}: ${F.work(c)}. Check: f(${minus(x)}) = ${minus(c)}. `
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
    // requiem: catalogue/content/decoys-cross-two-slips
    // Two slips crossed: undoing in f's own order, and undoing only one of
    // the two steps (the other done again as f does it) -- alone and
    // together. The old fourth option, reversed with only the multiplying
    // undone, sat between the key and the rest, so the key was never the
    // option nearest the others and a student could pick by avoiding it.
    const kept = rng.pick(['add', 'mul']);
    const half = (s) => (((s[0] === 'plus' || s[0] === 'minus') ? 'add' : 'mul') === kept ? s : undo(s));
    const options = [right, f.map(undo), [...f].reverse().map(half), f.map(half)];
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
        + `(Undoing in the same order as f, or doing one of f's steps again instead of undoing it, does not get back to the start.)`,
    };
  }
}

// --- Solve for x ↔ y -------------------------------------------------------

function formula(rng) {
  const F = family(rng);
  // requiem: play/answers/equivalent-judged-by-value
  // Any finished way of writing f⁻¹(x) is right: (x + 5)/3, x/3 + 5/3 and
  // (1/3)(x + 5) are one function, so none of them is listed.
  return {
    prompt: [T.prose(`f(x) = ${F.show}. Find f⁻¹(x).${F.inv.startsWith('root') ? ' (Type ∛ as root(3, …).)' : ''}`)],
    text: `inverse formula: f(x) = ${F.f}`,
    answer: { type: 'equivalent', value: F.inv, requireSimplest: true },
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
  let h, k, right;
  do {
    h = rng.nonZero(-5, 6); k = rng.nonZero(-6, 6);
    right = rng.chance(0.6);
    // The domain choice needs the cut running away from 0, and |k| < |h|, so
    // that −h, k and −k all fall on the wrong side of the vertex (see below).
  } while (shape === 'which' && (right !== h > 0 || Math.abs(k) >= Math.abs(h)));
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
    // requiem: catalogue/content/decoys-cross-two-slips
    // The cut is at the vertex's x, and the two slips cross: the sign of h
    // read off (x + 3)² as 3, and the vertex's height k taken for its x --
    // alone and together -- each a cut that leaves both sides of the vertex
    // in. Every option runs the same way, so the
    // direction gives nothing away; it is the one away from 0, so that the
    // misread cut −h is on the wrong side.
    const op = right ? '>=' : '<=';
    // requiem: catalogue/content/fixed-menu-key-moves
    // "All real numbers" is not offered: a parabola is never one-to-one on
    // all of them, so it was never the key and could be struck unread.
    const all = [h, -h, k, -k].map((c) => `x ${op} ${c}`);
    if (new Set(all).size < 4) return restrict(rng);
    const order = rng.shuffle([0, 1, 2, 3]);
    const label = (s) => s.replace('>=', '≥').replace('<=', '≤').replace(/-/g, '−');
    return {
      prompt: [T.prose(`f(x) = ${show}. Which of these domains makes f one-to-one, so that it has an inverse?`)],
      text: `one-to-one: f(x) = ${f}; options ${order.map((j, i) => `${optionIds[i]}: ${all[j]}`).join(' | ')}`,
      answer: { type: 'choice', value: optionIds[order.indexOf(0)], options: order.map((j, i) => ({ id: optionIds[i], label: label(all[j]) })) },
      visual: null,
      explain: `The vertex is at x = ${minus(h)}, and the parabola takes each height twice, once each side of it: f(${minus(h - 1)}) = f(${minus(h + 1)}). `
        + `A domain with no input on one side of ${minus(h)} gives each output once: ${label(all[0])}. `
        + `The others reach both sides of the vertex: ${minus(-h)} has the sign of ${sqF(h)} turned round, and ${minus(k)} is the vertex's height, not its x.`,
    };
  }
  // formula: which is f⁻¹(x)?
  // requiem: catalogue/content/decoys-cross-two-slips
  // Two slips crossed: the other sign of the root (the inverse of the other
  // half), and either h and k swapped or both shifts turned round -- alone
  // and together.
  const sign = right ? '' : '-', other = right ? '-' : '';
  const swap = rng.chance(0.5);
  const [h2, k2] = swap ? [k, h] : [-h, -k];
  const opts = [
    `${sign}sqrt(${sq(k)})${pm(h)}`,
    `${other}sqrt(${sq(k)})${pm(h)}`,
    `${sign}sqrt(${sq(k2)})${pm(h2)}`,
    `${other}sqrt(${sq(k2)})${pm(h2)}`,
  ];
  if (new Set(opts).size < 4) return restrict(rng);
  const pretty = (s) => s.replace(/sqrt\(([^)]+)\)/, '√($1)').replace(/ - /g, ' − ').replace(/^-/, '−');
  const order = rng.shuffle([0, 1, 2, 3]);
  return {
    prompt: [T.prose(`f(x) = ${show} for ${branchF}. Which is f⁻¹(x)?`)],
    text: `restricted formula: f(x) = ${f}; ${branch}; options ${order.map((j, i) => `${optionIds[i]}: ${opts[j]}`).join(' | ')}`,
    answer: { type: 'choice', value: optionIds[order.indexOf(0)], options: order.map((j, i) => ({ id: optionIds[i], label: pretty(opts[j]) })) },
    visual: null,
    explain: `Swap x and y: x = (${sqF(h).replace(/x/, 'y')})²${pm(k, true)}, so (${sqF(h).replace(/x/, 'y')})² = ${sqF(k)} and y${pm(-h, true)} = ±√(${sqF(k)}). `
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

// --- Log Functions ------------------------------------------------------------

const SUBS = '₀₁₂₃₄₅₆₇₈₉';
const SUPS = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '-': '⁻', '+': '⁺', x: 'ˣ', y: 'ʸ' };
/** log₂, or log alone for base 10, as logarithms writes it. */
const logF = (b) => (b === 10 ? 'log' : `log${String(b).replace(/\d/g, (d) => SUBS[d])}`);
/** 2ˣ, 2ˣ⁻³: the exponent raised. */
const powF = (b, e) => `${b}${e.replace(/\s/g, '').replace(/[-+xy\d]/g, (c) => SUPS[c])}`;
/** A whole power of b as {n, d}: 2^-2 = 1/4. */
const powB = (b, e) => (e >= 0 ? { n: b ** e, d: 1 } : { n: 1, d: b ** -e });
const qText = ({ n, d }) => (d === 1 ? String(n) : `${n}/${d}`);
const qShow = ({ n, d }) => (d === 1 ? minus(n) : `${minus(n)}/${d}`);
const LOG_BASES = [2, 2, 3, 3, 4, 5, 10];

function logFunctions(rng) {
  const shape = rng.pick(['reflect', 'reflect', 'reflect', 'reflect', 'reflect', 'domain', 'domain', 'domain', 'domain', 'domain', 'domain',
    'asymptote', 'asymptote', 'asymptote', 'asymptote', 'inverse', 'inverse', 'inverse', 'inverse', 'inverse']);
  const b = rng.pick(LOG_BASES);
  if (shape === 'reflect' && rng.chance(0.55)) {
    // A point of bˣ + k, and the point of its inverse it reflects to.
    const e = rng.int(-2, b >= 5 ? 2 : 3), k = rng.nonZero(-6, 6);
    const v = powB(b, e), y = { n: v.n + k * v.d, d: v.d };
    const pt = (p) => `(${qShow(p[0])}, ${qShow(p[1])})`;
    const from = [{ n: e, d: 1 }, y], to = [y, { n: e, d: 1 }];
    return {
      prompt: [T.prose(`f(x) = ${b}ˣ${pm(k, true)}. The point ${pt(from)} is on the graph of f. Which point must be on the graph of f⁻¹?`)],
      text: `reflect shifted: (${e}, ${qText(y)}) on base ${b} plus ${k}`,
      answer: { type: 'pair', value: { x: to[0], y: to[1] } },
      visual: null,
      explain: `f(${minus(e)}) = ${qShow(v)}${pm(k, true)} = ${qShow(y)}, so f⁻¹(${qShow(y)}) = ${minus(e)}: f⁻¹, here ${logF(b)}(x${pm(-k, true)}), sends each output back to its input. `
        + `So the graph of f⁻¹ is the graph of f reflected in y = x, and ${pt(from)} becomes ${pt(to)}.`,
    };
  }
  if (shape === 'reflect') {
    // A point of bˣ and the point of log_b x it reflects to, either way round.
    const e = rng.int(b === 10 ? -2 : -3, b >= 5 ? 3 : 4);
    const v = powB(b, e), toLog = rng.chance(0.5);
    const [from, to] = toLog ? [[{ n: e, d: 1 }, v], [v, { n: e, d: 1 }]] : [[v, { n: e, d: 1 }], [{ n: e, d: 1 }, v]];
    const pt = (p) => `(${qShow(p[0])}, ${qShow(p[1])})`;
    const said = toLog ? `y = ${b}ˣ` : `y = ${logF(b)} x`, other = toLog ? `y = ${logF(b)} x` : `y = ${b}ˣ`;
    return {
      prompt: [T.prose(`The point ${pt(from)} is on the graph of ${said}. Which point must be on the graph of ${other}?`)],
      text: `${toLog ? 'reflect onto log' : 'reflect onto power'}: (${qText(from[0])}, ${qText(from[1])}) on base ${b}`,
      answer: { type: 'pair', value: { x: to[0], y: to[1] } },
      visual: null,
      explain: `${logF(b)} x is the inverse of ${b}ˣ: ${b}${String(e).replace(/[-\d]/g, (c) => SUPS[c])} = ${qShow(v)} says the same as ${logF(b)} ${qShow(v)} = ${minus(e)}. `
        + `So the two graphs are reflections of each other in y = x, and each point's coordinates swap: ${pt(from)} becomes ${pt(to)}.`,
    };
  }
  if (shape === 'domain' || shape === 'asymptote') {
    // log_b of a line rising or falling, or (for the domain) of x² − c².
    const kind = shape === 'domain' ? rng.pick(['up', 'up', 'down', 'square']) : rng.pick(['up', 'up', 'down']);
    const k = rng.chance(0.5) ? 0 : rng.nonZero(-5, 5);
    const outside = k ? pm(k) : '', outsideF = k ? pm(k, true) : '';
    if (kind === 'square') {
      const c = rng.int(1, 6), flip = rng.chance(0.35);
      const inner = flip ? `${c * c} - x^2` : `x^2 - ${c * c}`, innerF = flip ? `${c * c} − x²` : `x² − ${c * c}`;
      const parts = flip
        ? [{ lo: { n: -c, d: 1 }, loIn: false, hi: { n: c, d: 1 }, hiIn: false }]
        : [{ lo: null, loIn: false, hi: { n: -c, d: 1 }, hiIn: false }, { lo: { n: c, d: 1 }, loIn: false, hi: null, hiIn: false }];
      const set = flip ? `−${c} < x < ${c}` : `x < −${c} or x > ${c}`;
      return {
        prompt: [T.prose(`What is the domain of f(x) = ${logF(b)}(${innerF})${outsideF}? Write it with x.`)],
        text: `log domain: log_${b}(${inner})${outside}`,
        answer: { type: 'solutions', value: { letter: 'x', parts } },
        visual: null,
        explain: `A log takes only positive numbers, so ${innerF} > 0: ${flip ? `x² < ${c * c}` : `x² > ${c * c}`}, which holds for ${set}${flip ? '' : ' (x² = ' + c * c + ' at x = ±' + c + ', and x² is bigger farther out on both sides)'}. `
          + `${k ? `The ${minus(k)} outside the log moves the graph ${k > 0 ? 'up' : 'down'} and leaves the domain alone. ` : ''}So the domain is ${set}.`,
      };
    }
    let m, n;
    do { m = rng.pick([1, 1, 1, 2, 3, 4]); n = rng.nonZero(-9, 9); } while (gcdOf(m, n) !== 1);
    if (kind === 'down') m = -m;
    const inner = kind === 'down' ? `${n} - ${m === -1 ? '' : -m}x` : lin(m, n), innerF = kind === 'down' ? `${minus(n)} − ${m === -1 ? '' : -m}x` : lin(m, n, true);
    const edge = reduce(-n * Math.sign(m), Math.abs(m));
    const edgeF = qShow(edge);
    const steps = Math.abs(m) === 1
      ? (kind === 'down' ? `${minus(n)} > x` : `x > ${minus(-n)}`)
      : `${kind === 'down' ? `${minus(n)} > ${-m}x` : `${m}x > ${minus(-n)}`}, so ${kind === 'down' ? `${edgeF} > x` : `x > ${edgeF}`}`;
    const set = kind === 'down' ? `x < ${edgeF}` : `x > ${edgeF}`;
    if (shape === 'domain') {
      return {
        prompt: [T.prose(`What is the domain of f(x) = ${logF(b)}(${innerF})${outsideF}? Write it with x.`)],
        text: `log domain: log_${b}(${inner})${outside}`,
        answer: { type: 'solutions', value: { letter: 'x', parts: [kind === 'down'
          ? { lo: null, loIn: false, hi: edge, hiIn: false } : { lo: edge, loIn: false, hi: null, hiIn: false }] } },
        visual: null,
        explain: `A log takes only positive numbers, so ${innerF} > 0: ${steps}. `
          + `${k ? `The ${minus(k)} outside the log moves the graph ${k > 0 ? 'up' : 'down'} and leaves the domain alone. ` : ''}So the domain is ${set}.`,
      };
    }
    return {
      prompt: [T.prose(`The graph of y = ${logF(b)}(${innerF})${outsideF} has a vertical asymptote, the line x = a. What is a?`)],
      text: `log asymptote: log_${b}(${inner})${outside}`,
      answer: fracAns(edge.n, edge.d),
      visual: null,
      explain: `${logF(b)} x falls without end as x comes down to 0, so the graph runs down the line where the inside of the log is 0: ${innerF} = 0 at x = ${edgeF}. `
        + `${k ? `The ${minus(k)} outside moves the graph ${k > 0 ? 'up' : 'down'}, which leaves a vertical line where it was. ` : ''}So a = ${edgeF}.`,
    };
  }
  // The inverse, as a choice: the one slip of undoing in the wrong order
  // crossed with the other, a sign or a step turned the wrong way.
  // requiem: catalogue/content/decoys-cross-two-slips
  // Each family has a twin with the same four options and another key
  // (2ˣ + 3 and 2ˣ − 3, 3 · 2ˣ and 2ˣ/3), so the options alone never say which.
  const kind = rng.pick(['b^x + k', 'b^(x - h)', 'log + k', 'c b^x', 'c b^x', 'b^x / c']);
  const k = rng.nonZero(-6, 6), c = rng.int(2, 5);
  const L = logF(b), lname = `log_${b}`;
  const sh = (v, s = ' ') => (v < 0 ? `${s}+${s}${-v}` : `${s}-${s}${v}`);
  const shF = (v) => (v < 0 ? ` + ${-v}` : ` − ${v}`);
  const opp = (v) => -v;
  let f, fF, opts, why;
  if (kind === 'b^x + k') {
    f = `${b}^x${pm(k)}`; fF = `${b}ˣ${pm(k, true)}`;
    opts = [[`${lname}(x${sh(k)})`, `${L}(x${shF(k)})`], [`${lname}(x${sh(opp(k))})`, `${L}(x${shF(opp(k))})`],
      [`${lname}(x)${sh(k)}`, `${L} x${shF(k)}`], [`${lname}(x)${sh(opp(k))}`, `${L} x${shF(opp(k))}`]];
    why = `Write y = ${fF} and swap x and y: x = ${b}ʸ${pm(k, true)}. ${k > 0 ? `Take ${k} away` : `Add ${-k}`} first, ${b}ʸ = x${shF(k)}, then the power: y = ${L}(x${shF(k)}). `
      + `(Taking the log first, ${L} x${shF(k)}, undoes the steps in the wrong order.)`;
  } else if (kind === 'b^(x - h)') {
    f = `${b}^(x${sh(k)})`; fF = powF(b, `x${sh(k, '')}`);
    opts = [[`${lname}(x)${sh(opp(k))}`, `${L} x${shF(opp(k))}`], [`${lname}(x)${sh(k)}`, `${L} x${shF(k)}`],
      [`${lname}(x${sh(opp(k))})`, `${L}(x${shF(opp(k))})`], [`${lname}(x${sh(k)})`, `${L}(x${shF(k)})`]];
    why = `Write y = ${fF} and swap x and y: x = ${powF(b, `y${sh(k, '')}`)}. The log undoes the power, y${shF(k)} = ${L} x, and then y = ${L} x${shF(opp(k))}. `
      + `(The ${minus(-k)} is inside the power, so it is undone after the log, outside it: ${L}(x${shF(opp(k))}) puts it back inside.)`;
  } else if (kind === 'log + k') {
    f = `${lname}(x)${pm(k)}`; fF = `${L} x${pm(k, true)}`;
    opts = [[`${b}^(x${sh(k)})`, powF(b, `x${sh(k, '')}`)], [`${b}^(x${sh(opp(k))})`, powF(b, `x${sh(opp(k), '')}`)],
      [`${b}^x${sh(k)}`, `${b}ˣ${shF(k)}`], [`${b}^x${sh(opp(k))}`, `${b}ˣ${shF(opp(k))}`]];
    why = `Write y = ${fF} and swap x and y: x = ${L} y${pm(k, true)}. ${k > 0 ? `Take ${k} away` : `Add ${-k}`} first, ${L} y = x${shF(k)}, then the log, as a power: y = ${powF(b, `x${sh(k, '')}`)}. `
      + `(${b}ˣ${shF(k)} undoes the steps in the wrong order.)`;
  } else if (kind === 'b^x / c') {
    f = `${b}^x/${c}`; fF = `${b}ˣ/${c}`;
    opts = [[`${lname}(${c}x)`, `${L}(${c}x)`], [`${lname}(x/${c})`, `${L}(x/${c})`],
      [`${c}*${lname}(x)`, `${c} ${L} x`], [`${lname}(x)/${c}`, `(${L} x)/${c}`]];
    why = `Write y = ${fF} and swap x and y: x = ${b}ʸ/${c}. Undo the ÷${c} first, ${b}ʸ = ${c}x, then the power: y = ${L}(${c}x). `
      + `(Multiplying after the log, ${c} ${L} x, undoes the steps in the wrong order.)`;
  } else {
    f = `${c}*${b}^x`; fF = `${c} · ${b}ˣ`;
    opts = [[`${lname}(x/${c})`, `${L}(x/${c})`], [`${lname}(${c}x)`, `${L}(${c}x)`],
      [`${lname}(x)/${c}`, `(${L} x)/${c}`], [`${c}*${lname}(x)`, `${c} ${L} x`]];
    why = `Write y = ${fF} and swap x and y: x = ${c} · ${b}ʸ. Undo the ×${c} first, ${b}ʸ = x/${c}, then the power: y = ${L}(x/${c}). `
      + `(Dividing after the log, (${L} x)/${c}, undoes the steps in the wrong order.)`;
  }
  const order = rng.shuffle([0, 1, 2, 3]);
  return {
    prompt: [T.prose(`f(x) = ${fF}. Which is f⁻¹(x)?`)],
    text: `log inverse: f(x) = ${f}; options ${order.map((j, i) => `${optionIds[i]}: ${opts[j][0]}`).join(' | ')}`,
    answer: { type: 'choice', value: optionIds[order.indexOf(0)], options: order.map((j, i) => ({ id: optionIds[i], label: opts[j][1] })) },
    visual: null,
    explain: `${why} So f⁻¹(x) = ${opts[0][1]}.`,
  };
}

const CONTENT = [undoValue, formula, checkPair, restrict, reflect, logFunctions];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  // requiem: catalogue/content/one-input-per-level
  // Each question shape keeps one box, and the question says which: "find
  // f⁻¹(7)" a number, "find f⁻¹(x)" a formula, "which point" a pair, "the
  // domain" written with x, "what is a" a number, "which is f⁻¹(x)" a choice.
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
