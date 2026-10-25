/**
 * Catalogue authoring tool: builds the problem library for complex.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 *
 * Every `text` is the question's expression in ASCII with i in it, or the
 * quadratic whose roots are asked, so scripts/check-answers.py can work it
 * out again in exact complex arithmetic of its own.
 */
import * as T from '../terms.js';
import { minus } from '../../web/ui/dom.js';
import { previewOf } from '../../web/ui/express.js';
import { formatComplex } from '../../web/math/complex.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/complex.js';

const optionIds = ['a', 'b', 'c', 'd'];
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const Q = (n, d = 1) => { if (d < 0) { n = -n; d = -d; } const g = gcd(n, d) || 1; return { n: n / g, d: d / g }; };
/** a + bi with whole a and b. */
const Z = (a, b) => ({ re: Q(a), im: Q(b) });
const show = (z) => formatComplex(z);
const ascii = (z) => formatComplex(z, true);
/** a + bi bracketed for a product or a sum: (3 - 2i). */
const br = (a, b) => `(${ascii(Z(a, b))})`;
const brF = (a, b) => `(${show(Z(a, b))})`;
const answer = (z) => ({ type: 'complex', value: z, requireSimplest: true });

function drawn(src) {
  const r = previewOf(src);
  if (!r.ok) throw new Error(`complex: cannot draw ${src}: ${r.error}`);
  return r.terms;
}
const worked = (src, z, explain, ask = 'Simplify:') => ({
  prompt: [T.prose(ask), ...drawn(src)],
  text: `complex: ${src}`,
  answer: answer(z),
  visual: null,
  explain: `${explain} So the answer is ${show(z)}.`,
});
const nz = (rng, lo, hi) => rng.nonZero(lo, hi);
/** v² in prose, a negative bracketed: 3², (−3)². */
const sq = (v) => (v < 0 ? `(${minus(v)})²` : `${v}²`);
/** A term after a plus sign, bracketed when negative: 2, (−1). */
const after = (t) => (t.startsWith('−') ? `(${t})` : t);
/** 37 as ³⁷, −5 as ⁻⁵, for powers in prose. */
const sup = (k) => String(k).replace(/./g, (c) => '⁻⁰¹²³⁴⁵⁶⁷⁸⁹'['-0123456789'.indexOf(c)]);
const CYCLE = [Z(1, 0), Z(0, 1), Z(-1, 0), Z(0, -1)];
const cyc = (n) => CYCLE[((n % 4) + 4) % 4];
const powWord = (n) => show(cyc(n));

// --- Square Roots of Negatives ----------------------------------------------

/** n as k²·m with m squarefree: [k, m]. */
function pulled(n) {
  let k = 1, m = n;
  for (let f = 2; f * f <= m; f++) while (m % (f * f) === 0) { m /= f * f; k *= f; }
  return [k, m];
}
const SQUAREFREE = [2, 3, 5, 6, 7, 10, 11];
/** k√m in prose with an i: 3i√2, i√7, −3√2. */
const surdI = (k, m, withI = true, neg = false) => `${neg ? '−' : ''}${k === 1 ? '' : k}${withI ? 'i' : ''}√${m}`;
const surdA = (k, m, withI = true, neg = false) => `${neg ? '-' : ''}${k === 1 ? '' : `${k}*`}${withI ? 'i*' : ''}sqrt(${m})`;

/** √−n² worked out: √−36 = √36 · √−1 = 6i. */
const rootI = (n) => (n === 1 ? '√−1 = i' : `√−${n * n} = √${n * n} · √−1 = ${n}i`);

// requiem: catalogue/content/negative-roots-made-i-first
function negativeRoots(rng) {
  const kind = rng.pick(['perfect', 'perfect', 'plus', 'plus', 'over', 'trap', 'trap', 'which', 'which']);
  if (kind === 'perfect') {
    // √−n² or k√−n²: a perfect square under the minus.
    const n = rng.int(1, 15), k = rng.pick([1, 1, 1, 2, 3, 4, 5, -1, -2, -3]);
    const src = `${k === 1 ? '' : k === -1 ? '-' : k}sqrt(-${n * n})`;
    return worked(src, Z(0, k * n),
      n === 1 ? `i is √−1${k === 1 ? '' : `, and ${minus(k)} × i = ${show(Z(0, k))}`}.`
        : `i is √−1, so √−${n * n} = √${n * n} · √−1 = ${n}i${k === 1 ? '' : `, and ${minus(k)} × ${n}i = ${show(Z(0, k * n))}`}.`);
  }
  if (kind === 'plus' || kind === 'over') {
    // a ± √−n², and (a ± √−n²)/k as the quadratic formula leaves it.
    for (;;) {
      const n = rng.int(1, 12), s = rng.pick([1, -1]);
      if (kind === 'plus') {
        const a = rng.nonZero(-12, 12);
        const src = `${a} ${s > 0 ? '+' : '-'} sqrt(-${n * n})`;
        return worked(src, Z(a, s * n),
          `${rootI(n)}. That leaves a real part and an imaginary part, a + bi.`, 'Write in the form a + bi:');
      }
      const k = rng.pick([2, 2, 3, 4]), a = rng.int(-8, 8) * k;
      if (n % k !== 0 && rng.chance(0.7)) continue;
      const z = { re: Q(a, k), im: Q(s * n, k) };
      const src = `(${a} ${s > 0 ? '+' : '-'} sqrt(-${n * n}))/${k}`;
      return worked(src, z,
        `${rootI(n)}, so the top is ${show(Z(a, s * n))}. Divide each part by ${k}.`, 'Write in the form a + bi:');
    }
  }
  if (kind === 'trap') {
    // √−a · √−b: each made an i first, never √(ab).
    for (;;) {
      const form = rng.pick(['both', 'both', 'both', 'one', 'square']);
      if (form === 'square') {
        // (√−n)² = −n, not n.
        const n = rng.int(2, 30), k = rng.pick([1, 1, 2, 3]);
        const src = `(${k === 1 ? '' : k}sqrt(-${n}))^2`;
        return worked(src, Z(-k * k * n, 0),
          `Make the root an i first: ${k === 1 ? '' : k}√−${n} = ${k === 1 ? '' : k}i√${n}. Squaring it: ${k === 1 ? '' : `${k}² · `}i² · (√${n})² = ${k === 1 ? '' : `${k * k} · `}(−1) · ${n} = ${minus(-k * k * n)}. Squaring a square root of a negative gives a negative, not ${k * k * n}.`);
      }
      const a = rng.int(2, 50), b = rng.int(2, 50);
      const r = Math.round(Math.sqrt(a * b));
      if (r * r !== a * b || a === b && rng.chance(0.5)) continue;
      if (form === 'one') {
        // √−a · √b = i√(ab).
        const src = `sqrt(-${a})*sqrt(${b})`;
        return worked(src, Z(0, r),
          `Make the root of the negative an i first: √−${a} = i√${a}. Then i√${a} · √${b} = i√${a * b} = ${r}i.`);
      }
      const src = `sqrt(-${a})*sqrt(-${b})`;
      return worked(src, Z(-r, 0),
        `Make each root an i first: √−${a} = i√${a} and √−${b} = i√${b}. Then i√${a} · i√${b} = i² √${a * b} = −${r}. `
        + `Not √${a * b} = ${r}: √a · √b = √(ab) only holds when a and b are not both negative.`);
    }
  }
  // which: √−n with a square inside but not a square, chosen. The slips are
  // a lost i (√−n read as −√n) and a square left unrooted (18 = 9 · 2 giving
  // 9√2), each alone and both together.
  for (;;) {
    const m = rng.pick(SQUAREFREE), k = rng.int(2, 7), n = k * k * m;
    if (n > 300) continue;
    const [kk, mm] = pulled(n);
    const opts = [[true, false], [false, false], [true, true], [false, true]].map(([withI, unrooted]) => {
      const c = unrooted ? kk * kk : kk;
      return [surdA(c, mm, withI, !withI), surdI(c, mm, withI, !withI)];
    });
    const order = rng.shuffle([0, 1, 2, 3]);
    return {
      prompt: [T.prose(`Which is √−${n} in simplest form?`)],
      text: `root of negative: sqrt(-${n}); options ${order.map((j, i) => `${optionIds[i]}: ${opts[j][0]}`).join(' | ')}`,
      answer: { type: 'choice', value: optionIds[order.indexOf(0)], options: order.map((j, i) => ({ id: optionIds[i], label: opts[j][1] })) },
      visual: null,
      explain: `√−1 is i, so √−${n} = i√${n}, an imaginary number, not a negative one. Then pull out the square: ${n} = ${kk * kk} · ${mm}, and √${kk * kk} = ${kk}. So √−${n} = ${surdI(kk, mm)}.`,
    };
  }
}

// --- Powers of i -----------------------------------------------------------

function powers(rng) {
  const kind = rng.pick(['one', 'one', 'negative', 'negative', 'product', 'quotient', 'sum']);
  if (kind === 'one') {
    const n = rng.int(5, 250), r = n % 4;
    return worked(`i^${n}`, cyc(n),
      `The powers of i repeat every 4: i, −1, −i, 1. ${n} = 4 × ${Math.floor(n / 4)} + ${r}, and i⁴ = 1, so i${sup(n)} = i${sup(r)}${r === 0 ? ' = 1' : r === 1 ? ' = i' : ` = ${powWord(r)}`}.`);
  }
  if (kind === 'negative') {
    const n = rng.int(1, 150), up = 4 * Math.ceil(n / 4);
    return worked(`i^(-${n})`, cyc(-n),
      `Adding a multiple of 4 to the power does not change it, since i⁴ = 1: −${n} + ${up} = ${up - n}, so i${sup(-(n))} = i${sup(up - n)} = ${powWord(up - n)}.`);
  }
  const a = rng.int(2, 40), b = rng.int(2, 40);
  if (kind === 'product') {
    return worked(`i^${a}*i^${b}`, cyc(a + b),
      `Multiplying adds the powers: i${sup(a + b)}. ${a + b} = 4 × ${Math.floor((a + b) / 4)} + ${(a + b) % 4}, so it is ${powWord(a + b)}.`);
  }
  if (kind === 'quotient') {
    if (a === b) return powers(rng);
    return worked(`i^${a}/i^${b}`, cyc(a - b),
      `Dividing subtracts the powers: i${sup(a - b)}. ${a - b < 0 ? `Adding a multiple of 4 does not change it, since i⁴ = 1: ${a - b} + ${4 * Math.ceil((b - a) / 4)} = ${a - b + 4 * Math.ceil((b - a) / 4)}, so it is ${powWord(a - b)}.` : `${a - b} = 4 × ${Math.floor((a - b) / 4)} + ${(a - b) % 4}, so it is ${powWord(a - b)}.`}`);
  }
  const z = { re: Q(cyc(a).re.n + cyc(b).re.n), im: Q(cyc(a).im.n + cyc(b).im.n) };
  return worked(`i^${a} + i^${b}`, z,
    `Work out each power: i${sup(a)} = ${powWord(a)} (${a} leaves ${a % 4} after fours) and i${sup(b)} = ${powWord(b)} (${b} leaves ${b % 4}). Adding: ${powWord(a)} + ${after(powWord(b))}${z.re.n === 0 && z.im.n === 0 ? ' = 0' : ''}.`);
}

// --- Add & Subtract --------------------------------------------------------

function addSub(rng) {
  const a = rng.int(-9, 9), b = nz(rng, -9, 9), c = rng.int(-9, 9), d = nz(rng, -9, 9);
  const kind = rng.pick(['plus', 'minus', 'minus', 'scaled', 'three']);
  if (kind === 'plus' || kind === 'minus') {
    const s = kind === 'plus' ? 1 : -1;
    const z = Z(a + s * c, b + s * d);
    return worked(`${br(a, b)} ${s > 0 ? '+' : '-'} ${br(c, d)}`, z,
      `${s > 0 ? 'Add' : 'Subtract'} the real parts and the imaginary parts separately${s < 0 ? ', the minus reaching both parts of the second' : ''}: `
      + `real ${minus(a)} ${s > 0 ? '+' : '−'} ${c < 0 ? `(${minus(c)})` : c} = ${minus(a + s * c)}, imaginary ${minus(b)} ${s > 0 ? '+' : '−'} ${d < 0 ? `(${minus(d)})` : d} = ${minus(b + s * d)}.`);
  }
  if (kind === 'scaled') {
    const k = rng.pick([2, 3, 4, -2, -3]);
    const z = Z(k * a - c, k * b - d);
    return worked(`${k}${br(a, b)} - ${br(c, d)}`, z,
      `Multiply out first: ${minus(k)}${brF(a, b)} = ${show(Z(k * a, k * b))}. Then subtract by parts: real ${minus(k * a)} − ${c < 0 ? `(${minus(c)})` : c} = ${minus(k * a - c)}, imaginary ${minus(k * b)} − ${d < 0 ? `(${minus(d)})` : d} = ${minus(k * b - d)}.`);
  }
  const e = rng.int(-9, 9), f = nz(rng, -9, 9);
  const z = Z(a - c + e, b - d + f);
  return worked(`${br(a, b)} - ${br(c, d)} + ${br(e, f)}`, z,
    `Real parts: ${minus(a)} − ${c < 0 ? `(${minus(c)})` : c} + ${e < 0 ? `(${minus(e)})` : e} = ${minus(a - c + e)}. Imaginary parts: ${minus(b)} − ${d < 0 ? `(${minus(d)})` : d} + ${f < 0 ? `(${minus(f)})` : f} = ${minus(b - d + f)}.`);
}

// --- Multiply --------------------------------------------------------------

const timesZ = (a, b, c, d) => Z(a * c - b * d, a * d + b * c);

function multiply(rng) {
  const kind = rng.pick(['two', 'two', 'two', 'two', 'byI', 'byI', 'byI', 'square', 'square', 'square']);
  // Both real parts nonzero: a bare bi is the byI kind, multiplied part by part.
  const R = kind === 'square' ? 10 : 7;
  const a = nz(rng, -R, R), b = nz(rng, -R, R);
  if (kind === 'byI') {
    const k = nz(rng, -6, 6);
    const z = timesZ(0, k, a, b);
    const ki = show(Z(0, k));
    return worked(`${ki === 'i' ? 'i' : ascii(Z(0, k))}${br(a, b)}`, z,
      `Multiply each part by ${ki}: ${ki} × ${after(minus(a))} = ${show(Z(0, k * a))}, and ${ki} × ${after(show(Z(0, b)))} = ${minus(k * b)}i² = ${minus(-k * b)}, since i² = −1. Collect, real part first.`);
  }
  if (kind === 'square') {
    const z = timesZ(a, b, a, b);
    return worked(`${br(a, b)}^2`, z,
      `(a + bi)² = a² + 2abi + b²i², and i² = −1: ${sq(a)} + 2(${minus(a)})(${minus(b)})i − ${b * b} = ${minus(a * a - b * b)} ${2 * a * b < 0 ? '−' : '+'} ${Math.abs(2 * a * b)}i.`);
  }
  const c = nz(rng, -7, 7), d = nz(rng, -7, 7);
  const z = timesZ(a, b, c, d);
  return worked(`${br(a, b)}${br(c, d)}`, z,
    `Multiply out as binomials: ${minus(a * c)} ${a * d < 0 ? '−' : '+'} ${Math.abs(a * d)}i ${b * c < 0 ? '−' : '+'} ${Math.abs(b * c)}i ${b * d < 0 ? '−' : '+'} ${Math.abs(b * d)}i². `
    + `Replace i² by −1, so the last term is ${minus(-b * d)}, and collect: real ${minus(a * c)} ${-b * d < 0 ? '−' : '+'} ${Math.abs(b * d)} = ${minus(a * c - b * d)}, imaginary ${minus(a * d)} + ${b * c < 0 ? `(${minus(b * c)})` : b * c} = ${minus(a * d + b * c)}.`);
}

// --- Conjugates & Divide ---------------------------------------------------

/** (a + bi)/(c + di), exactly. */
function quotient(a, b, c, d) {
  const m = c * c + d * d;
  return { re: Q(a * c + b * d, m), im: Q(b * c - a * d, m) };
}

function divide(rng) {
  const kind = rng.pick(['conj', 'conj', 'product', 'product', 'divide', 'divide', 'real', 'real']);
  const a = rng.int(-8, 8), b = nz(rng, -8, 8);
  if (kind === 'conj') {
    const z = Z(a, -b);
    return {
      prompt: [T.prose(`What is the complex conjugate of ${show(Z(a, b))}?`)],
      text: `conjugate: ${ascii(Z(a, b))}`,
      answer: answer(z),
      visual: null,
      explain: `The conjugate keeps the real part and changes the sign of the imaginary part: ${show(Z(a, b))} becomes ${show(z)}. So the answer is ${show(z)}.`,
    };
  }
  if (kind === 'product') {
    const z = Z(a * a + b * b, 0);
    return worked(`${br(a, b)}${br(a, -b)}`, z,
      `A number times its conjugate: (a + bi)(a − bi) = a² − b²i² = a² + b². Here ${sq(a)} + ${sq(b)} = ${a * a} + ${b * b} = ${a * a + b * b}, a real number.`);
  }
  if (kind === 'real') {
    // k/(c + di): only the bottom is complex.
    for (;;) {
      const c = rng.int(-4, 4), d = nz(rng, -4, 4), k = nz(rng, -10, 10);
      const m = c * c + d * d;
      const z = quotient(k, 0, c, d);
      if (m > 25) continue;
      return worked(`${k}/${br(c, d)}`, z,
        `Multiply top and bottom by the conjugate ${brF(c, -d)}: the bottom becomes ${sq(c)} + ${sq(d)} = ${m}, and the top ${minus(k)}${brF(c, -d)} = ${show(Z(k * c, -k * d))}. `
        + (m === 1 ? 'The bottom is 1, so that top is the answer.' : `Divide each part by ${m}.`));
    }
  }
  for (;;) {
    const c = rng.int(-4, 4), d = nz(rng, -4, 4);
    const m = c * c + d * d;
    if (m > 25) continue;
    const z = quotient(a, b, c, d);
    const top = timesZ(a, b, c, -d);
    if (rng.chance(0.6) && (top.re.n % m !== 0 || top.im.n % m !== 0)) continue;
    return worked(`${br(a, b)}/${br(c, d)}`, z,
      `Multiply top and bottom by the bottom's conjugate ${brF(c, -d)}. Bottom: ${sq(c)} + ${sq(d)} = ${m}. `
      + `Top: ${brF(a, b)}${brF(c, -d)} = ${show(top)}, multiplying out with i² = −1. ${m === 1 ? 'The bottom is 1, so that top is the answer.' : `Divide each part by ${m}.`}`);
  }
}

// --- Complex Roots of Quadratics -------------------------------------------

/** ax² + bx + c, a > 0. */
const quadText = (b, c, fancy = false, a = 1) => {
  const m = fancy ? '−' : '-';
  const bx = b === 0 ? '' : b === 1 ? ' + x' : b === -1 ? ` ${m} x` : b < 0 ? ` ${m} ${-b}x` : ` + ${b}x`;
  const cc = c === 0 ? '' : c < 0 ? ` ${m} ${-c}` : ` + ${c}`;
  return `${a === 1 ? '' : a}x${fancy ? '²' : '^2'}${bx}${cc}`;
};
const KINDS = [['two real', 'Two different real roots'], ['one real', 'One real root, repeated'], ['two complex', 'Two complex roots, a conjugate pair']];

/** A which-kind-of-roots row for ax² + bx + c, or null when its kind is not `want`. */
function natureRow(a, b, c, want) {
  const D = b * b - 4 * a * c;
  if ((D > 0 ? 'two real' : D === 0 ? 'one real' : 'two complex') !== want) return null;
  return {
    prompt: [T.prose('What kind of roots does'), ...drawn(`${quadText(b, c, false, a)} = 0`), T.prose('have?')],
    text: `nature of roots: ${quadText(b, c, false, a)} = 0; options a: two real | b: one real | c: two complex`,
    answer: { type: 'choice', value: optionIds[KINDS.findIndex(([k]) => k === want)], options: KINDS.map(([, label], i) => ({ id: optionIds[i], label })) },
    visual: null,
    explain: `The discriminant decides: b² − 4ac = ${sq(b)} − 4(${a})(${minus(c)}) = ${minus(D)}. `
      + (D > 0 ? 'Positive, so two different real roots.' : D === 0 ? 'Zero, so one real root, repeated.' : 'Negative, so its square root is imaginary and the roots are a complex conjugate pair.'),
  };
}

// requiem: catalogue/content/complex-judged-exactly
function roots(rng) {
  const kind = rng.pick(['solve', 'solve', 'scaled', 'half', 'pure', 'moved', 'nature', 'nature']);
  if (kind === 'nature') {
    const want = rng.pick(KINDS.map(([k]) => k));
    for (;;) {
      const a = rng.pick([1, 1, 1, 2, 3]);
      const b = rng.int(-10, 10), c = rng.int(-12, 25);
      // A repeated root is rare at random: built as a perfect square instead.
      if (want === 'one real') {
        // k(mx + n)², m and n with no common factor.
        const m = rng.int(1, 4), n = rng.nonZero(-9, 9), k = rng.pick([1, 1, 2, 3]);
        if (gcd(m, n) !== 1 || k * m * m > 16) continue;
        return natureRow(k * m * m, 2 * k * m * n, k * n * n, want);
      }
      const row = natureRow(a, b, c, want);
      if (row) return row;
    }
  }
  if (kind === 'pure') {
    // kx² + m = 0 with m/k a square: x = ±(q/r)i.
    const q = rng.int(1, 9), r = rng.pick([1, 1, 2, 3]);
    if (gcd(q, r) !== 1) return roots(rng);
    const z = { re: Q(0), im: Q(q, r), pm: true };
    const src = `${r === 1 ? '' : r * r}x^2 + ${q * q} = 0`;
    return {
      prompt: [T.prose('Solve:'), ...drawn(src)],
      text: `complex roots: ${src}`,
      answer: answer(z),
      visual: null,
      explain: `x² = −${q * q}${r === 1 ? '' : `/${r * r}`}, so x = ±√(−${q * q}${r === 1 ? '' : `/${r * r}`}) = ${show({ ...z })}, since √−1 = i. So x = ${show(z)}.`,
    };
  }
  // ax² + bx + c from its roots p/h ± (q/h)i: h = 1, or h = 2 for halves.
  for (;;) {
    const half = kind === 'half';
    const h = half ? 2 : 1;
    const p = rng.int(-9, 9), q = rng.int(1, 9);
    if (half && p % 2 === 0 && q % 2 === 0) continue;
    const k = kind === 'scaled' ? rng.pick([2, 3, 4]) : 1;
    // k(hx − p)² + kq² = k h²x² − 2khp x + k(p² + q²)
    const a = k * h * h, b = -2 * k * h * p, c = k * (p * p + q * q);
    if (kind === 'moved' && b === 0) continue;
    const D = b * b - 4 * a * c;
    const z = { re: Q(p, h), im: Q(q, h), pm: true };
    const lhs = kind === 'moved' ? quadText(b, 0, false, a) : quadText(b, c, false, a);
    const rhs = kind === 'moved' ? String(-c) : '0';
    const root = Math.sqrt(-D);
    // No x term: x² alone is negative, solved by square roots, not the formula.
    if (b === 0) {
      const sq2 = Q(-c, a);
      const said = (v) => `${v.n < 0 ? '−' : ''}${Math.abs(v.n)}${v.d === 1 ? '' : `/${v.d}`}`;
      return {
        prompt: [T.prose('Solve:'), ...drawn(`${lhs} = ${rhs}`)],
        text: `complex roots: ${lhs} = ${rhs}`,
        answer: answer(z),
        visual: null,
        explain: `There is no x term, so get x² alone: take ${c} from both sides${a === 1 ? '' : ` and divide by ${a}`}, giving x² = ${said(sq2)}. `
          + `A negative has imaginary square roots, since √−1 = i: x = ±√(${said(sq2)}), so x = ${show(z)}.`,
      };
    }
    return {
      prompt: [T.prose('Solve:'), ...drawn(`${lhs} = ${rhs}`)],
      text: `complex roots: ${lhs} = ${rhs}`,
      answer: answer(z),
      visual: null,
      explain: `${kind === 'moved' ? `Bring everything to one side: ${quadText(b, c, true, a)} = 0. ` : ''}The discriminant is b² − 4ac = ${sq(b)} − 4(${a})(${c}) = ${minus(D)}, negative, so its square root is ${root}i. `
        + `The quadratic formula: x = (${minus(-b)} ± ${root}i)/${2 * a} = ${show(z)}. So x = ${show(z)}.`,
    };
  }
}

const CONTENT = [negativeRoots, powers, addSub, multiply, divide, roots];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
