/**
 * Catalogue authoring tool: builds the problem library for composition.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 *
 * Every `text` carries f and g in plain ASCII, so scripts/check-answers.py
 * can build the combination or the composition itself, by substituting one
 * formula into the other, and compare it with the answer by value.
 */
import * as T from '../terms.js';
import { minus } from '../../web/ui/dom.js';
import { normalize as normalizeSet, formatSet } from '../../web/math/solutions.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/composition.js';

const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const sup = (n) => String(n).replace(/\d/g, (c) => SUP[c]);
const optionIds = ['a', 'b', 'c', 'd'];

/*
 * A polynomial in x is [[coefficient, power], ...], highest power first once
 * collected. `write` is the ASCII form the text and the answer carry; `pretty`
 * is what the student reads.
 */
function write(poly, { fancy = false } = {}) {
  const live = poly.filter(([c]) => c !== 0);
  if (!live.length) return '0';
  return live.map(([c, p], i) => {
    const letter = p === 0 ? '' : p === 1 ? 'x' : fancy ? `x${sup(p)}` : `x^${p}`;
    const body = `${Math.abs(c) === 1 && letter ? '' : Math.abs(c)}${letter}`;
    if (i === 0) return c < 0 ? `${fancy ? '−' : '-'}${body}` : body;
    return `${c < 0 ? (fancy ? ' − ' : ' - ') : ' + '}${body}`;
  }).join('');
}
const pretty = (poly) => write(poly, { fancy: true });

function collect(poly) {
  const by = new Map();
  for (const [c, p] of poly) by.set(p, (by.get(p) ?? 0) + c);
  return [...by].filter(([, c]) => c !== 0).map(([p, c]) => [c, p]).sort((a, b) => b[1] - a[1]);
}
const times = (a, b) => collect(a.flatMap(([c, p]) => b.map(([d, q]) => [c * d, p + q])));
const plus = (a, b) => collect([...a, ...b]);
const neg = (a) => a.map(([c, p]) => [-c, p]);
const power = (a, n) => (n === 0 ? [[1, 0]] : times(a, power(a, n - 1)));
/** f(g(x)): every x in f replaced by the whole of g. */
const compose = (f, g) => collect(f.flatMap(([c, p]) => times([[c, 0]], power(g, p))));
const valueAt = (poly, x) => poly.reduce((s, [c, p]) => s + c * x ** p, 0);
const same = (a, b) => write(collect(a)) === write(collect(b));

/** f with each x shown as the bracketed inside, as a student writes the substitution. */
function substituted(f, inner) {
  return f.map(([c, p], i) => {
    const sign = i === 0 ? (c < 0 ? '−' : '') : c < 0 ? ' − ' : ' + ';
    const k = Math.abs(c);
    const body = p === 0 ? String(k) : `${k === 1 ? '' : k}(${inner})${p > 1 ? sup(p) : ''}`;
    return sign + body;
  }).join('');
}

const linear = (rng, { leads = [1, 2, 3, -1, 4, -2], unit = true } = {}) => {
  for (;;) {
    const a = rng.pick(leads), b = rng.nonZero(-9, 9);
    if (unit || a !== 1) return [[a, 1], [b, 0]];
  }
};
const quadratic = (rng) => collect([[rng.pick([1, 1, 2, -1, 3]), 2],
  ...(rng.chance(0.5) ? [[rng.nonZero(-5, 5), 1]] : []), [rng.nonZero(-9, 9), 0]]);
const either = (rng, q = 0.5) => (rng.chance(q) ? quadratic(rng) : linear(rng));
const rule = (name, f) => `${name}(x) = ${pretty(f)}`;
const ascii = (name, f) => `${name}(x) = ${write(f)}`;


// --- (f + g)(x) ------------------------------------------------------------

function combine(rng) {
  for (;;) {
    const op = rng.pick(['+', '-', '-', '*', '*']);
    let f, g;
    if (op === '*') {
      f = rng.chance(0.3) ? [[rng.nonZero(-5, 5), rng.int(1, 2)]] : linear(rng);
      g = rng.chance(0.25) ? quadratic(rng) : linear(rng);
      if (f.length === 1 && g.length === 1) continue;
    } else {
      f = either(rng); g = either(rng, 0.6);
      // Taking away must change more than one sign: g has at least two terms.
      if (g.length < 2) continue;
    }
    const out = op === '+' ? plus(f, g) : op === '-' ? plus(f, neg(g)) : times(f, g);
    if (out.length < 2) continue;
    const shown = { '+': '+', '-': '−', '*': '·' }[op];
    let why;
    if (op === '+') {
      why = `(f + g)(x) = f(x) + g(x) = (${pretty(f)}) + (${pretty(g)}). Adding changes no signs: collect like terms.`;
    } else if (op === '-') {
      why = `(f − g)(x) = f(x) − g(x) = (${pretty(f)}) − (${pretty(g)}). The minus takes away all of g, `
        + `so every sign in g's bracket changes: −(${pretty(g)}) = ${pretty(neg(g))}. Then collect like terms.`;
    } else {
      why = `(f · g)(x) = f(x) · g(x) = (${pretty(f)})(${pretty(g)}). Multiply each term of the first by each term of the second, then collect.`;
    }
    return {
      prompt: [T.prose(`${rule('f', f)} and ${rule('g', g)}. Find (f ${shown} g)(x), expanded and simplified.`)],
      text: `combine: ${ascii('f', f)}; ${ascii('g', g)}; (f ${op} g)(x)`,
      answer: { type: 'expr', value: write(out) },
      visual: null,
      explain: `${why} So (f ${shown} g)(x) = ${pretty(out)}.`,
    };
  }
}

// --- f(g(2)) ---------------------------------------------------------------

function atNumber(rng) {
  if (rng.chance(0.3)) return fromTable(rng);
  for (;;) {
    const f = either(rng, 0.4), g = either(rng, 0.4);
    const order = rng.pick(['fg', 'fg', 'gf', 'ff']);
    const a = rng.int(-3, 4);
    const [outer, inner, O, I] = order === 'fg' ? [f, g, 'f', 'g'] : order === 'gf' ? [g, f, 'g', 'f'] : [f, f, 'f', 'f'];
    if (same(f, g)) continue;
    const mid = valueAt(inner, a), value = valueAt(outer, mid);
    if (Math.abs(value) > 150 || Math.abs(mid) > 20) continue;
    const ask = `${O}(${I}(${minus(a)}))`;
    return {
      prompt: [T.prose(`${rule('f', f)} and ${rule('g', g)}. Find ${ask}.`)],
      text: `compose at: ${ascii('f', f)}; ${ascii('g', g)}; ${O}(${I}(${a}))`,
      answer: { type: 'int', value },
      visual: null,
      explain: `Inside out. First the inside: ${I}(${minus(a)}) = ${minus(mid)}. `
        + `Then put that into ${O}: ${O}(${minus(mid)}) = ${minus(value)}.`
        + `${order === 'ff' ? ' The same function twice is still a composition: the output of the first f is the input of the second.' : ''}`
        + ` So ${ask} = ${minus(value)}.`,
    };
  }
}

/** f and g given only as tables on 0..4, each sending 0..4 back into 0..4. */
function fromTable(rng) {
  const xs = [0, 1, 2, 3, 4];
  const f = xs.map(() => rng.int(0, 4)), g = xs.map(() => rng.int(0, 4));
  if (xs.every((x) => f[x] === g[x])) return fromTable(rng);
  const order = rng.pick(['fg', 'gf', 'ff', 'gg']);
  const [O, I] = order.split('');
  const map = { f, g };
  const a = rng.int(0, 4);
  const mid = map[I][a], value = map[O][mid];
  // An inside that hands back its own input would make the second lookup the first.
  if (mid === a) return fromTable(rng);
  const ask = `${O}(${I}(${a}))`;
  return {
    prompt: [T.prose(`The table gives some values of f and g. Find ${ask}.`)],
    text: `compose table: f ${f.join(', ')} | g ${g.join(', ')}; ${ask}`,
    answer: { type: 'int', value },
    // On reveal, the two rows read: the inside first, then its output's row.
    visual: { kind: 'table', cols: ['x', 'f(x)', 'g(x)'], rows: xs.map((x) => [String(x), String(f[x]), String(g[x])]),
      workingCol: 'read',
      working: xs.map((x) => [x === a ? `1st: ${I}(${a}) = ${mid}` : '', x === mid ? `2nd: ${O}(${mid}) = ${value}` : '']
        .filter(Boolean).join('; ')) },
    explain: `Inside out. Read ${I}(${a}) from the ${I}(x) column, in the row x = ${a}: ${I}(${a}) = ${mid}. `
      + `That output is the next input, so find the row x = ${mid} and read the ${O}(x) column: ${O}(${mid}) = ${value}. So ${ask} = ${value}.`,
  };
}

// --- f(g(x)) ---------------------------------------------------------------

function ofX(rng) {
  for (;;) {
    const shape = rng.pick(['qOfL', 'qOfL', 'lOfQ', 'lOfL']);
    const f = shape === 'qOfL' ? quadratic(rng) : linear(rng);
    const g = shape === 'lOfQ' ? quadratic(rng) : linear(rng, { unit: shape !== 'qOfL' || rng.chance(0.4) });
    if (same(f, g)) continue;
    const swap = rng.chance(0.3);
    const [outer, inner, O, I] = swap ? [g, f, 'g', 'f'] : [f, g, 'f', 'g'];
    const out = compose(outer, inner);
    if (out.some(([c]) => Math.abs(c) > 200) || out.length < 2) continue;
    return {
      prompt: [T.prose(`${rule('f', f)} and ${rule('g', g)}. Find ${O}(${I}(x)), expanded and simplified.`)],
      text: `compose: ${ascii('f', f)}; ${ascii('g', g)}; ${O}(${I}(x))`,
      answer: { type: 'expr', value: write(out) },
      visual: null,
      explain: explainCompose(outer, inner, O, I, out),
    };
  }
}

function explainCompose(outer, inner, O, I, out) {
  const squares = outer.some(([, p]) => p >= 2) && inner.length > 1;
  return `${O}(${I}(x)) is ${O} with every x replaced by the whole of ${I}(x), ${pretty(inner)}, in brackets: `
    + `${O}(${I}(x)) = ${substituted(outer, pretty(inner))}. `
    + `${squares ? `(${pretty(inner)})² is (${pretty(inner)})(${pretty(inner)}), not each term squared. ` : ''}`
    + `Multiply out and collect: ${O}(${I}(x)) = ${pretty(out)}.`;
}

// --- Not Commutative -------------------------------------------------------

function notCommutative(rng) {
  const kind = rng.pick(['other', 'which', 'which', 'same']);
  if (kind === 'same') return sameOrNot(rng);
  for (;;) {
    const f = rng.chance(0.4) ? quadratic(rng) : linear(rng);
    const g = linear(rng);
    const fg = compose(f, g), gf = compose(g, f);
    if (same(fg, gf) || same(f, g)) continue;
    if (kind === 'other') {
      return {
        prompt: [T.prose(`${rule('f', f)} and ${rule('g', g)}, so f(g(x)) = ${pretty(fg)}. Find g(f(x)), expanded and simplified.`)],
        text: `compose: ${ascii('f', f)}; ${ascii('g', g)}; g(f(x))`,
        answer: { type: 'expr', value: write(gf) },
        visual: null,
        explain: `The other order puts f inside g: ${explainCompose(g, f, 'g', 'f', gf)} `
          + `That is not ${pretty(fg)}: the function applied first is the one inside, and changing it changes the result.`,
      };
    }
    // Which is f(g(x))? The other order, the product, and g's input mistaken
    // for f's output each stand in as an option.
    const wrong = [gf, times(f, g), plus(f, g)];
    const all = [fg, ...wrong];
    if (new Set(all.map((p) => write(p))).size < 4) continue;
    const order = rng.shuffle([0, 1, 2, 3]);
    const right = order.indexOf(0);
    return {
      prompt: [T.prose(`${rule('f', f)} and ${rule('g', g)}. Which is f(g(x))?`)],
      text: `which composition: ${ascii('f', f)}; ${ascii('g', g)}; f(g(x)); options ${order.map((k, i) => `${optionIds[i]}: ${write(all[k])}`).join(' | ')}`,
      answer: { type: 'choice', value: optionIds[right], options: order.map((k, i) => ({ id: optionIds[i], label: pretty(all[k]) })) },
      visual: null,
      explain: `${explainCompose(f, g, 'f', 'g', fg)} `
        + `(${pretty(gf)} is g(f(x)), the other order; ${pretty(times(f, g))} is f(x) · g(x), a product, not a composition; `
        + `${pretty(plus(f, g))} is f(x) + g(x).)`,
    };
  }
}

/** Some pairs do commute: x + a with x + b, ax with bx, powers of x, a function with itself mirrored. */
function sameOrNot(rng) {
  let f, g;
  if (rng.chance(0.45)) {
    const k = rng.pick(['shifts', 'scales', 'powers', 'undo']);
    if (k === 'shifts') { f = [[1, 1], [rng.nonZero(-9, 9), 0]]; g = [[1, 1], [rng.nonZero(-9, 9), 0]]; }
    if (k === 'scales') { f = [[rng.pick([2, 3, -2, 4, 5]), 1]]; g = [[rng.pick([3, -1, 6, -3, 7]), 1]]; }
    if (k === 'powers') { f = [[1, rng.pick([2, 3])]]; g = [[1, rng.pick([2, 3, 4])]]; }
    if (k === 'undo') { const b = rng.int(1, 9); f = [[1, 1], [b, 0]]; g = [[1, 1], [-b, 0]]; }
  } else {
    // Looks innocent, differs: a shift and a scale, or a shift and a square.
    const k = rng.pick(['shiftScale', 'shiftSquare', 'two']);
    if (k === 'shiftScale') { f = [[1, 1], [rng.nonZero(-9, 9), 0]]; g = [[rng.pick([2, 3, -1, 5]), 1]]; }
    if (k === 'shiftSquare') { f = [[1, 1], [rng.nonZero(-6, 6), 0]]; g = [[1, 2]]; }
    if (k === 'two') { f = linear(rng, { unit: false }); g = linear(rng, { unit: false }); }
    if (rng.chance(0.5)) [f, g] = [g, f];
  }
  const fg = compose(f, g), gf = compose(g, f);
  if (same(f, g)) return sameOrNot(rng);
  const equal = same(fg, gf);
  const options = [
    { id: 'a', label: 'Yes: f(g(x)) = g(f(x)) for every x' },
    { id: 'b', label: 'No: f(g(x)) and g(f(x)) are different' },
  ];
  return {
    prompt: [T.prose(`${rule('f', f)} and ${rule('g', g)}. Is f(g(x)) the same function as g(f(x))?`)],
    text: `same composition: ${ascii('f', f)}; ${ascii('g', g)}; options a: same | b: different`,
    answer: { type: 'choice', value: equal ? 'a' : 'b', options },
    visual: null,
    explain: `Work out both. f(g(x)) = ${substituted(f, pretty(g))} = ${pretty(fg)}; `
      + `g(f(x)) = ${substituted(g, pretty(f))} = ${pretty(gf)}. `
      + (equal
        ? 'They are the same for every x. This pair happens to commute, but most pairs do not: the order has to be checked, never assumed.'
        : 'They differ, so the order matters: composition is not commutative.'),
  };
}

// --- Decompose -------------------------------------------------------------

// requiem: catalogue/content/decompose-every-inside-accepted
/*
 * h is an outside function of an inside g, a line ax + b or a quadratic
 * ax² + c. Asked for the inside, f is given; asked for the outside, g is
 * given, and since g takes infinitely many values only one polynomial (or
 * k/x) f works. An even power outside leaves the inside's sign open,
 * (3x − 1)² = (−3x + 1)², so both are accepted there.
 */
const OUTSIDES = [
  { name: 'cube', f: [[1, 3]] },
  { name: 'square', f: [[1, 2]] },
  { name: 'fourth', f: [[1, 4]] },
  { name: 'recip', recip: 1 },
  { name: 'scaled', scaled: true },
];

function decompose(rng) {
  for (;;) {
    const g = rng.chance(0.7) ? linear(rng, { leads: [2, 3, 4, 5, -2, -3], unit: false })
      : collect([[rng.pick([1, 1, 2, 3]), 2], [rng.nonZero(-9, 9), 0]]);
    const askInner = rng.chance(0.5);
    const out = rng.pick(OUTSIDES);
    let f, hShown, hAscii, fShown, fAscii, value, accept, sayF;
    const G = pretty(g), Ga = write(g);
    if (out.recip) {
      const k = rng.pick([1, 1, 2, 3, 5]);
      fShown = `${k}/x`; fAscii = `${k}/x`;
      hShown = `${k}/(${G})`; hAscii = `${k}/(${Ga})`;
      sayF = `divides ${k} by its input`;
    } else if (out.scaled) {
      const a = rng.pick([2, 3, -1, 4, -2]), n = rng.pick([2, 2, 3]), c = rng.nonZero(-9, 9);
      f = collect([[a, n], [c, 0]]);
      fShown = pretty(f); fAscii = write(f);
      const lead = a === 1 ? '' : a === -1 ? '−' : minus(a);
      hShown = `${lead}(${G})${sup(n)} ${c < 0 ? '−' : '+'} ${Math.abs(c)}`;
      hAscii = `${a === -1 ? '-' : a === 1 ? '' : a}(${Ga})^${n} ${c < 0 ? '-' : '+'} ${Math.abs(c)}`;
      sayF = `${n === 2 ? 'squares' : 'cubes'} its input, multiplies by ${minus(a)}, then ${c < 0 ? `takes away ${-c}` : `adds ${c}`}`;
    } else {
      f = out.f;
      const n = f[0][1];
      fShown = pretty(f); fAscii = write(f);
      hShown = `(${G})${sup(n)}`; hAscii = `(${Ga})^${n}`;
      sayF = `raises its input to the power ${n}`;
    }
    if (askInner) {
      value = Ga;
      const even = !out.recip && f[0][1] % 2 === 0;
      const n = out.recip ? 1 : f[0][1];
      accept = even ? [write(neg(g))] : undefined;
      return {
        prompt: [T.prose(`h(x) = f(g(x)) = ${hShown}, where f(x) = ${fShown}. Find the inside function g(x).`)],
        text: `decompose inner: h(x) = ${hAscii}; f(x) = ${fAscii}`,
        answer: { type: 'expr', value, ...(accept ? { accept } : {}) },
        visual: null,
        explain: `f(x) = ${fShown} ${sayF}. `
          + `In h(x) = ${hShown} that is done to ${G}, so ${G} is the inside: g(x) = ${G}, and f(g(x)) = ${hShown}.`
          + (accept ? ` (${pretty(neg(g))} works too, since an even power of a negative is the same: (${pretty(neg(g))})${sup(n)} = (${G})${sup(n)}.)` : ''),
      };
    }
    return {
      prompt: [T.prose(`h(x) = f(g(x)) = ${hShown}, where g(x) = ${G}. Find the outside function f(x).`)],
      text: `decompose outer: h(x) = ${hAscii}; g(x) = ${Ga}`,
      answer: { type: 'expr', value: fAscii },
      visual: null,
      explain: `The inside is g(x) = ${G}: everywhere it appears in h, write x instead. `
        + `h(x) = ${hShown} becomes f(x) = ${fShown}. Check: f(g(x)) puts ${G} back in place of x, which gives ${hShown}.`,
    };
  }
}

// --- Domain of f(g(x)) -----------------------------------------------------

// requiem: catalogue/content/composition-domain-level
/*
 * The domain of f(g(x)) is every x that g accepts whose output f accepts in
 * turn. Each pair is written three ways: shown, in the ASCII the checker
 * evaluates (f with each x replaced by the bracketed g), and as the parts
 * of the answer. The simplified formula can hide the inside's own limit:
 * (√x)² is x, but only for x ≥ 0.
 */
const nfix = (n) => (n < 0 ? `− ${-n}` : `+ ${n}`);
const shiftShow = (h) => (h === 0 ? 'x' : `x ${nfix(-h)}`);
const shiftA = (h) => (h === 0 ? 'x' : `x ${h > 0 ? '-' : '+'} ${Math.abs(h)}`);
const frac = (n, d) => { const g = gcdOf(Math.abs(n), Math.abs(d)) || 1; const s = d < 0 ? -1 : 1; return { n: (s * n) / g, d: (s * d) / g }; };
const gcdOf = (a, b) => (b ? gcdOf(b, a % b) : a);
const fracText = (q) => (q.d === 1 ? minus(q.n) : `${minus(q.n)}/${q.d}`);
const point = (q) => ({ lo: q, loIn: true, hi: q, hiIn: true });
const rayUp = (q, inc) => ({ lo: q, loIn: inc, hi: null, hiIn: false });
const rayDown = (q, inc) => ({ lo: null, loIn: false, hi: q, hiIn: inc });
const holes = (...qs) => {
  const s = [...qs].sort((a, b) => a.n / a.d - b.n / b.d);
  const out = [];
  let lo = null;
  for (const q of s) { out.push({ lo, loIn: false, hi: q, hiIn: false }); lo = q; }
  out.push({ lo, loIn: false, hi: null, hiIn: false });
  return out;
};
const setText = (parts) => {
  // x ≠ a and x ≠ b reads better than three open intervals.
  if (parts.length > 1 && parts[0].lo === null && parts[parts.length - 1].hi === null && parts.every((p) => !p.loIn && !p.hiIn)
    && parts.every((p, i) => i === 0 || (p.lo && parts[i - 1].hi && p.lo.n * parts[i - 1].hi.d === parts[i - 1].hi.n * p.lo.d))) {
    return parts.slice(1).map((p) => `x ≠ ${fracText(p.lo)}`).join(' and ');
  }
  return formatSet({ letter: 'x', parts: normalizeSet(parts) });
};

function compositionDomain(rng) {
  const kind = rng.pick(['rootOfLine', 'rootOfLine', 'recipOfLine', 'recipOfSquare', 'recipOfRoot', 'rootOfRecip', 'rootOfSquare', 'squareOfRoot']);
  if (kind === 'rootOfLine') {
    // f(x) = √(x + p), g(x) = ax + b: ax + b + p ≥ 0.
    const p = rng.int(-5, 5), a = rng.pick([1, 2, 3, -1, -2]), b = rng.nonZero(-9, 9);
    const k = b + p, edge = frac(-k, a);
    const parts = [a > 0 ? rayUp(edge, true) : rayDown(edge, true)];
    const G = pretty([[a, 1], [b, 0]]), Ga = `${a}*x ${b < 0 ? '-' : '+'} ${Math.abs(b)}`;
    const F = `√(${shiftShow(-p)})`.replace('√(x)', '√x');
    return {
      f: F, g: G, fA: `sqrt(${shiftA(-p)})`, gA: Ga, parts,
      work: `g takes every x, so the only limit is f's: what goes into f must make ${shiftShow(-p)} ≥ 0. Into f goes g(x) = ${G}, so ${G} ${p === 0 ? '' : `${nfix(p)} `}≥ 0, which is ${pretty([[a, 1], [k, 0]])} ≥ 0`
        + `${a === 1 ? '' : a < 0 ? `; dividing by ${minus(a)} turns the sign round` : `; divide by ${a}`}: x ${a > 0 ? '≥' : '≤'} ${fracText(edge)}.`,
      trap: `(f's own domain, x ≥ ${minus(-p)}, is about f's input, which here is g(x), not x.)`,
    };
  }
  if (kind === 'recipOfLine') {
    // f(x) = k/(x − h), g(x) = ax + b: ax + b ≠ h.
    const h = rng.int(-4, 4), a = rng.pick([1, 2, 3, -1, 4]), b = rng.nonZero(-9, 9), k = rng.pick([1, 2, 3, 5]);
    const edge = frac(h - b, a);
    const G = pretty([[a, 1], [b, 0]]), Ga = `${a}*x ${b < 0 ? '-' : '+'} ${Math.abs(b)}`;
    return {
      f: h === 0 ? `${k}/x` : `${k}/(${shiftShow(h)})`, g: G, fA: `${k}/(${shiftA(h)})`, gA: Ga, parts: holes(edge),
      work: `g takes every x. f cannot take ${minus(h)}, where its denominator is 0, so g(x) = ${G} must not be ${minus(h)}: ${G} = ${minus(h)} at x = ${fracText(edge)}, and every other x works.`,
      trap: `(The number f refuses is ${minus(h)}; the x to leave out is the one that g sends there.)`,
    };
  }
  if (kind === 'recipOfSquare') {
    // f(x) = 1/x, g(x) = x² − c²: x ≠ ±c.
    const c = rng.int(1, 6), k = rng.pick([1, 2, 3]);
    return {
      f: `${k}/x`, g: `x² − ${c * c}`, fA: `${k}/x`, gA: `x**2 - ${c * c}`, parts: holes(frac(-c, 1), frac(c, 1)),
      work: `g takes every x, and f takes everything but 0, so g(x) = x² − ${c * c} must not be 0. x² = ${c * c} at x = ${c} and at x = −${c}; both are left out.`,
      trap: `(x² = ${c * c} has two solutions: leaving out only ${c} lets in x = −${c}, where f(g(x)) = ${k}/0.)`,
    };
  }
  if (kind === 'recipOfRoot') {
    // f(x) = 1/(x − h), g(x) = √x: x ≥ 0 and √x ≠ h.
    const h = rng.int(1, 5), k = rng.pick([1, 2, 3]);
    return {
      f: `${k}/(x − ${h})`, g: '√x', fA: `${k}/(x - ${h})`, gA: 'sqrt(x)',
      parts: [{ lo: frac(0, 1), loIn: true, hi: frac(h * h, 1), hiIn: false }, rayUp(frac(h * h, 1), false)],
      work: `g takes only x ≥ 0. Then f cannot take ${h}, so √x must not be ${h}: that is x = ${h * h}, left out. Together: x ≥ 0, except ${h * h}.`,
      trap: `(Both limits count at once: the inside's own, x ≥ 0, and the one the outside puts on g(x).)`,
    };
  }
  if (kind === 'rootOfRecip') {
    // f(x) = √x, g(x) = k/(x − h): x ≠ h and k/(x − h) ≥ 0, so x > h.
    const h = rng.int(-4, 4), k = rng.pick([1, 2, 4, 6]);
    return {
      f: '√x', g: h === 0 ? `${k}/x` : `${k}/(${shiftShow(h)})`, fA: 'sqrt(x)', gA: `${k}/(${shiftA(h)})`, parts: [rayUp(frac(h, 1), false)],
      work: `g cannot take ${minus(h)}, where its denominator is 0. f takes only what is 0 or more, so ${k}/(${shiftShow(h)}) ≥ 0: a positive top over a bottom that is never 0, so the bottom must be positive, ${shiftShow(h)} > 0, which is x > ${minus(h)}.`,
      trap: `(${k}/(${shiftShow(h)}) is never 0, so the end ${minus(h)} is out: the sign is strict.)`,
    };
  }
  if (kind === 'rootOfSquare') {
    // f(x) = √x, g(x) = x² − c²: x ≤ −c or x ≥ c.
    const c = rng.int(1, 6);
    return {
      f: '√x', g: `x² − ${c * c}`, fA: 'sqrt(x)', gA: `x**2 - ${c * c}`,
      parts: [rayDown(frac(-c, 1), true), rayUp(frac(c, 1), true)],
      work: `g takes every x, and f takes what is 0 or more, so x² − ${c * c} ≥ 0, which is x² ≥ ${c * c}: x is at least ${c} away from 0, x ≤ −${c} or x ≥ ${c}.`,
      trap: `(x² ≥ ${c * c} is not only x ≥ ${c}: a negative x squares to as much, so x ≤ −${c} works too.)`,
    };
  }
  // f(x) = x² + c, g(x) = √(x − h): the formula simplifies to x − h + c, but only x ≥ h goes in.
  const h = rng.int(-5, 5), c = rng.int(-6, 6);
  const G = `√(${shiftShow(h)})`.replace('√(x)', '√x');
  return {
    f: `x²${c === 0 ? '' : ` ${nfix(c)}`}`, g: G, fA: `x**2${c === 0 ? '' : ` ${c < 0 ? '-' : '+'} ${Math.abs(c)}`}`, gA: `sqrt(${shiftA(h)})`,
    parts: [rayUp(frac(h, 1), true)],
    work: `f takes every number, so the only limit is g's own: ${shiftShow(h)} ≥ 0, which is x ≥ ${minus(h)}. Simplified, f(g(x)) = ${pretty([[1, 1], [c - h, 0]])}, which looks as if it takes every x, but x must first go into g.`,
    trap: `(The domain of a composition is read before simplifying: (${G})² is ${shiftShow(h)} only where ${G} exists.)`,
  };
}

function domainOfComposition(rng) {
  const d = compositionDomain(rng);
  return {
    prompt: [T.prose(`f(x) = ${d.f} and g(x) = ${d.g}. What is the domain of f(g(x))? Write it with x.`)],
    text: `compose domain: f(x) = ${d.fA}; g(x) = ${d.gA}`,
    answer: { type: 'solutions', value: { letter: 'x', parts: normalizeSet(d.parts) } },
    visual: null,
    explain: `x goes into g first, and g(x) into f, so x must suit g and g(x) must suit f. ${d.work} ${d.trap} So the domain is ${setText(d.parts)}.`,
  };
}

const CONTENT = [combine, atNumber, ofX, notCommutative, decompose, domainOfComposition];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  // requiem: catalogue/content/one-input-per-level
  // Each level keeps one box: a formula in the expression box, f(g(2)) in
  // the whole-number box, a domain in the solutions box. The mixed level
  // deals from all of them, and each question already says which it wants,
  // a formula, a number or "the domain … with x", so no box gives it away.
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
