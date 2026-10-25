/**
 * Catalogue authoring tool: builds the problem library for logarithms.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 *
 * Every `text` writes its logs in ASCII -- log_2(8), log(1000) for base 10,
 * ln(7) for base e -- so scripts/check-answers.py can read the question
 * again and work it out by its own method: an exact log from the prime
 * factors of base and number, a rounded one from its own logarithms, and a
 * log equation by clearing the logs into a polynomial and keeping only the
 * roots at which every log is of a positive number.
 */
import * as T from '../terms.js';
import { minus } from '../../web/ui/dom.js';
import { previewOf } from '../../web/ui/express.js';
import { normalize, formatSet } from '../../web/math/solutions.js';
import { fracAnswer, fracText } from './chance.js';
import { safeRound, roundedAnswer, roundedText, placeWords, placeText, at4 } from './trig.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/logarithms.js';

const optionIds = ['a', 'b', 'c', 'd'];
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));

const SUB = '₀₁₂₃₄₅₆₇₈₉';
const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const sub = (n) => String(n).replace(/\d/g, (c) => SUB[c]);
const sup = (n) => String(n).replace(/./g, (c) => SUP[c]);
/** n/d with the sign on top. */
const norm = (n, d) => (d < 0 ? [-n, -d] : [n, d]);
/** A number as prose writes it: −3, 1/8. */
const fx = (n, d = 1) => minus(fracText(...norm(n, d))).replace('-', '−');
const fa = (n, d) => fracAnswer(...norm(n, d));
/** ˣ, ²ˣ: a power of x in prose. */
const supX = (a) => `${a === 1 ? '' : sup(a)}ˣ`;

/** The log's name in prose: log₂, log (base 10), ln (base e). */
const lname = (b) => (b === 10 ? 'log' : b === 'e' ? 'ln' : `log${sub(b)}`);
/** The log's name in text: log_2, log, ln. */
const aname = (b) => (b === 10 ? 'log' : b === 'e' ? 'ln' : `log_${b}`);
/** log₂ 8, log₂(1/8), log₂(x + 3). */
const L = (b, arg) => (/^[\dx]+$/.test(arg) ? `${lname(b)} ${arg}` : `${lname(b)}(${arg})`);
const A = (b, arg) => `${aname(b)}(${arg})`;

/** ax + c: in prose (fancy) or ASCII. */
function lin(a, c, fancy = false) {
  const m = fancy ? '−' : '-';
  const lead = a === 1 ? 'x' : a === -1 ? `${m}x` : `${fancy ? minus(a) : a}x`;
  return c === 0 ? lead : `${lead} ${c < 0 ? m : '+'} ${Math.abs(c)}`;
}
/** x² + sx + t. */
function quad(s, t, fancy = false) {
  const m = fancy ? '−' : '-';
  const sx = s === 0 ? '' : ` ${s < 0 ? m : '+'} ${Math.abs(s) === 1 ? '' : Math.abs(s)}x`;
  const tt = t === 0 ? '' : ` ${t < 0 ? m : '+'} ${Math.abs(t)}`;
  return `x${fancy ? '²' : '^2'}${sx}${tt}`;
}

function choice(prompt, head, opts, explain) {
  if (new Set(opts.map(([, l]) => l)).size !== opts.length || new Set(opts.map(([b]) => b)).size !== opts.length) return null;
  return (rng) => {
    const order = rng.shuffle(opts.map((_, i) => i));
    return {
      prompt,
      text: `${head}; options ${order.map((j, i) => `${optionIds[i]}: ${opts[j][0]}`).join(' | ')}`,
      answer: { type: 'choice', value: optionIds[order.indexOf(0)], options: order.map((j, i) => ({ id: optionIds[i], label: opts[j][1] })) },
      visual: null,
      explain,
    };
  };
}

/** b^e for a whole e, as { n, d }; null for 0 to a power below 1. */
function powQ(b, e) {
  if (b.n === 0 && e <= 0) return null;
  const [n, d] = e >= 0 ? [b.n, b.d] : [b.d, b.n];
  const k = Math.abs(e);
  let top = n ** k, bot = d ** k;
  if (bot < 0) { top = -top; bot = -bot; }
  return { n: top, d: bot };
}
const Qs = (q) => (q.d === 1 ? String(q.n) : `${q.n}/${q.d}`);
const sameQ = (p, q) => p && q && p.n * q.d === q.n * p.d;

// --- Log as Exponent -------------------------------------------------------

const BASES = [2, 3, 4, 5, 6, 7, 10];

/** "B^E = V" in text and prose, and whether it is true. */
function powerClaim(B, E, V) {
  const base = { n: B.n ?? B, d: B.d ?? 1 };
  const bt = Qs(base), vt = Qs(V);
  const text = `${base.d === 1 && base.n >= 0 ? bt : `(${bt})`}^${E < 0 ? `(${E})` : E} = ${vt}`;
  const bp = base.d === 1 && base.n >= 0 ? fx(base.n) : `(${fx(base.n, base.d)})`;
  const label = `${bp}${sup(E)} = ${fx(V.n, V.d)}`;
  return [text, label, sameQ(powQ(base, E), V)];
}
/** "log_B(V) = E", B and E whole. */
function logClaim(B, V, E) {
  const text = `log_${B}(${Qs(V)}) = ${E}`;
  const label = `log${sub(B)} ${V.d === 1 ? V.n : `(${Qs(V)})`} = ${minus(E)}`;
  const ok = B > 1 && V.n > 0 && sameQ(powQ({ n: B, d: 1 }, E), V);
  return [text, label, ok];
}

// requiem: catalogue/content/decoys-cross-two-slips
/**
 * Four claims from two slips crossed: the right one, each slip alone, and
 * both together. A decoy that is one slip from the key and nothing else
 * leaves the key as the option nearest all the others, which a student can
 * pick without the mathematics; crossed, each option is one slip from two
 * others and two from the last, so no option sits in the middle.
 */
const crossed = (key, slip1, slip2) => [key, slip1(key), slip2(key), slip2(slip1(key))];
/** Two of the three swaps of a claim's three slots. */
const SWAPS = [(t) => [t[1], t[0], t[2]], (t) => [t[0], t[2], t[1]], (t) => [t[2], t[1], t[0]]];
const twoSwaps = (rng) => rng.shuffle([0, 1, 2]).slice(0, 2).map((k) => SWAPS[k]);

function asExponent(rng) {
  for (;;) {
    const b = rng.pick(BASES);
    if (rng.chance(0.5)) {
      // log form given, power form chosen.
      const e = rng.int(-3, 5);
      const v = powQ({ n: b, d: 1 }, e);
      if (v.n > 2000) continue;
      let claims;
      if (e >= 2 || e === 0) {
        // Slots (base, exponent, result), two of them swapped: 2³ = 8 read as
        // 3² = 8, as 2⁸ = 3 (the number raised by the base), or as 8³ = 2.
        const [s1, s2] = twoSwaps(rng);
        claims = crossed([{ n: b, d: 1 }, { n: e, d: 1 }, v], s1, s2).map(([B, E, V]) => (E.d === 1 ? powerClaim(B, E.n, V) : null));
      } else {
        // A negative or first power: the sign of the exponent dropped, and the
        // base and exponent swapped, alone and together.
        claims = crossed([b, e], ([B, E]) => [B, -E], ([B, E]) => [E, B]).map(([B, E]) => powerClaim(B, E, v));
      }
      if (claims.some((c) => !c) || !claims[0][2] || claims.slice(1).some(([, , ok]) => ok)) continue;
      const shown = `log${sub(b)} ${v.d === 1 ? v.n : `(${Qs(v)})`} = ${minus(e)}`;
      const ask = choice([T.prose(`Which equation says the same thing as ${shown}?`)],
        `log form: log_${b}(${Qs(v)}) = ${e}`, claims.map(([t, l]) => [t, l]),
        `A logarithm is an exponent: ${shown} says that ${b} raised to the power ${minus(e)} is ${fx(v.n, v.d)}. So ${claims[0][1]}.`);
      if (ask) return ask(rng);
      continue;
    }
    // power form given, log form chosen: e from 2 so every base shown is a real base.
    // Slots (base, number, value) of log_b v = e, two of them swapped.
    const e = rng.int(2, 5);
    const v = powQ({ n: b, d: 1 }, e);
    if (v.n > 2000) continue;
    const [s1, s2] = twoSwaps(rng);
    const claims = crossed([b, v.n, e], s1, s2).map(([B, V, E]) => logClaim(B, { n: V, d: 1 }, E));
    if (!claims[0][2] || claims.slice(1).some(([, , ok]) => ok)) continue;
    const shown = `${b}${sup(e)} = ${v.n}`;
    const ask = choice([T.prose(`Which equation says the same thing as ${shown}?`)],
      `log form: ${b}^${e} = ${v.n}`, claims.map(([t, l]) => [t, l]),
      `The log is the exponent, and the base stays the base: the power of ${b} that gives ${v.n} is ${e}. So ${claims[0][1]}.`);
    if (ask) return ask(rng);
  }
}

// --- Evaluate --------------------------------------------------------------

function evaluated(shown, text, n, d, explain) {
  return {
    prompt: [T.prose(`Evaluate ${shown}.`)],
    text: `log value: ${text}`,
    answer: fa(n, d),
    visual: null,
    explain: `${explain} So ${shown} = ${fx(n, d)}.`,
  };
}

function evaluate(rng) {
  const kind = rng.pick(['whole', 'whole', 'negative', 'root', 'ratio', 'ratio', 'ln', 'ln', 'ln', 'common', 'common']);
  if (kind === 'whole' || kind === 'negative') {
    for (;;) {
      const b = rng.pick([2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 15, 20, 25]);
      const k = kind === 'whole' ? rng.int(0, 8) : rng.int(1, 6);
      const v = b ** k;
      if (v > 100000) continue;
      const arg = kind === 'whole' ? String(v) : `1/${v}`;
      const e = kind === 'whole' ? k : -k;
      return evaluated(L(b, arg), A(b, arg), e, 1,
        kind === 'whole'
          ? (k === 0 ? `Any base to the power 0 is 1: ${b}⁰ = 1.` : `Ask what power of ${b} gives ${v}: ${b}${sup(k)} = ${v}.`)
          : `1/${v} is ${b}${sup(k)} turned over, which a negative power does: ${b}${sup(-k)} = 1/${v}.`);
    }
  }
  if (kind === 'root') {
    for (;;) {
      const c = rng.pick([2, 3, 4, 5, 6, 7, 10]), k = rng.int(2, 5), b = c ** k;
      if (b > 10000) continue;
      const neg = rng.chance(0.35);
      const arg = neg ? `1/${c}` : String(c);
      return evaluated(L(b, arg), A(b, arg), neg ? -1 : 1, k,
        `${b} = ${c}${sup(k)}, so ${c} is the ${k === 2 ? 'square' : k === 3 ? 'cube' : `${k}th`} root of ${b}, which is ${b} to the power 1/${k}.`
        + (neg ? ` Turning it over makes the power negative: 1/${c} is ${b} to the power −1/${k}.` : ''));
    }
  }
  if (kind === 'ratio') {
    for (;;) {
      const c = rng.pick([2, 2, 3, 3, 5, 7]), m = rng.int(2, 5), n = rng.int(1, 16);
      if (n % m === 0 || c ** m > 1000 || c ** n > 100000) continue;
      const b = c ** m, v = c ** n;
      const neg = rng.chance(0.25);
      const arg = neg ? `1/${v}` : String(v);
      return evaluated(L(b, arg), A(b, arg), neg ? -n : n, m,
        `Write both as powers of ${c}: ${b} = ${c}${sup(m)} and ${v} = ${c}${sup(n)}. `
        + `Raising ${c}${sup(m)} to the power ${fx(n, m)} multiplies the exponents, ${m} × ${fx(n, m)} = ${n}, giving ${c}${sup(n)} = ${v}${neg ? '; the negative power turns it over' : ''}.`);
    }
  }
  if (kind === 'ln') {
    // requiem: catalogue/content/e-met-before-ln
    // ln asks what power of e a number is: e itself, a power of it, one
    // over a power, or a root of a power, which is a fraction power.
    const form = rng.pick(['power', 'power', 'over', 'root', 'root', 'overroot']);
    if (form === 'power') {
      const k = rng.int(-9, 12);
      if (k === 0) return evaluated('ln 1', 'ln(1)', 0, 1, 'ln is the log to base e, and e⁰ = 1.');
      return evaluated(k === 1 ? 'ln e' : `ln e${sup(k)}`, k < 0 ? `ln(e^(${k}))` : `ln(e^${k})`, k, 1,
        k === 1 ? 'ln is the log to base e, and e is e¹.' : `ln is the log to base e, so it asks what power of e this is: it is written as one, e${sup(k)}.`);
    }
    if (form === 'over') {
      const k = rng.int(1, 12);
      return evaluated(k === 1 ? 'ln(1/e)' : `ln(1/e${sup(k)})`, `ln(1/e^${k})`, -k, 1,
        `ln is the log to base e, so it asks what power of e this is: one over a power is a negative power, 1/e${k === 1 ? '' : sup(k)} = e${sup(-k)}.`);
    }
    // ⁿ√(eᵏ) = e^(k/n), and one over it is e^(−k/n).
    const q = rng.pick([2, 2, 3, 4]), k = rng.int(1, 11);
    if (gcd(k, q) !== 1) return evaluate(rng);
    const over = form === 'overroot';
    const inner = k === 1 ? 'e' : `e${sup(k)}`;
    const r = q === 2 ? '√' : q === 3 ? '∛' : '∜';
    const shownArg = `${r}${k === 1 ? 'e' : `(${inner})`}`;
    const asciiArg = q === 2 ? `sqrt(${k === 1 ? 'e' : `e^${k}`})` : `root(${k === 1 ? 'e' : `e^${k}`}, ${q})`;
    const word = q === 2 ? 'square' : q === 3 ? 'cube' : 'fourth';
    return evaluated(over ? `ln(1/${shownArg})` : `ln ${shownArg}`, over ? `ln(1/${asciiArg})` : `ln(${asciiArg})`, over ? -k : k, q,
      `ln is the log to base e, and a ${word} root is the power 1/${q}: ${shownArg} is e to the power ${fx(k, q)}`
      + `${over ? `, and one over it turns the power negative, ${fx(-k, q)}` : ''}.`);
  }
  // common: log alone is base 10. 10ᵏ written out, as a decimal or as a
  // fraction, or a root of a power of 10, which is a fraction power.
  const form = rng.pick(['plain', 'plain', 'over', 'root', 'root']);
  if (form === 'plain') {
    const k = rng.int(-6, 7);
    const arg = k >= 0 ? String(10 ** k) : (10 ** k).toFixed(-k);
    return evaluated(`log ${arg}`, `log(${arg})`, k, 1,
      `log with no base written is base 10${k < 0 ? `, and ${arg} is 1/${10 ** -k}` : ''}: 10${sup(k)} = ${arg}.`);
  }
  if (form === 'over') {
    const k = rng.int(1, 6);
    return evaluated(`log(1/${10 ** k})`, `log(1/${10 ** k})`, -k, 1,
      `log with no base written is base 10, and one over a power is a negative power: 1/${10 ** k} = 10${sup(-k)}.`);
  }
  const q = rng.pick([2, 2, 3, 4]), k = rng.int(1, 7);
  if (gcd(k, q) !== 1) return evaluate(rng);
  const over = rng.chance(0.25);
  const r = q === 2 ? '√' : q === 3 ? '∛' : '∜';
  const num = String(10 ** k);
  const asciiArg = q === 2 ? `sqrt(${num})` : `root(${num}, ${q})`;
  const word = q === 2 ? 'square' : q === 3 ? 'cube' : 'fourth';
  return evaluated(over ? `log(1/${r}${num})` : `log ${r}${num}`, over ? `log(1/${asciiArg})` : `log(${asciiArg})`, over ? -k : k, q,
    `log with no base written is base 10. ${num} = 10${sup(k)}, and a ${word} root is the power 1/${q}, so ${r}${num} is 10 to the power ${fx(k, q)}`
    + `${over ? `; one over it turns the power negative, ${fx(-k, q)}` : ''}.`);
}

// --- Product, Quotient & Power ---------------------------------------------

const isPowerOf = (v, b) => { let x = v; while (x % b === 0 && x > 1) x /= b; return x === 1; };
const divisors = (n) => Array.from({ length: n }, (_, i) => i + 1).filter((d) => n % d === 0);

function combined(shown, text, b, e, explain) {
  return {
    prompt: [T.prose(`Evaluate ${shown}.`)],
    text: `log value: ${text}`,
    answer: fa(e, 1),
    visual: null,
    explain: `${explain} ${b === 10 ? 'Base 10' : `Base ${b}`}: ${b}${sup(e)} = ${b ** e}. So ${shown} = ${e}.`,
  };
}

const LETTERS = [['x', 'y', 'z'], ['a', 'b', 'c'], ['m', 'n', 'p'], ['u', 'v', 'w']];

function laws(rng) {
  const kind = rng.pick(['product', 'quotient', 'quotient', 'power', 'three', 'three', 'condense', 'condense', 'expand', 'expand']);
  if (kind === 'product') {
    for (;;) {
      const b = rng.pick([6, 10, 12, 14, 15]), e = rng.int(1, 3), R = b ** e;
      if (R > 1000) continue;
      const xs = divisors(R).filter((x) => x > 1 && x < R && !isPowerOf(x, b) && x <= R / x);
      if (!xs.length) continue;
      const x = rng.pick(xs), y = R / x;
      const shown = `${L(b, String(x))} + ${L(b, String(y))}`;
      return combined(shown, `${A(b, x)} + ${A(b, y)}`, b, e,
        `Adding logs multiplies the numbers: ${shown} = ${L(b, `${x} × ${y}`)} = ${L(b, String(R))}.`);
    }
  }
  if (kind === 'quotient') {
    for (;;) {
      const b = rng.pick([2, 3, 4, 5, 6, 10]), e = rng.int(1, 3), R = b ** e;
      const y = rng.int(2, 12);
      if (R > 1000 || isPowerOf(y, b) || R * y > 5000) continue;
      const x = R * y;
      const shown = `${L(b, String(x))} − ${L(b, String(y))}`;
      return combined(shown, `${A(b, x)} - ${A(b, y)}`, b, e,
        `Subtracting logs divides the numbers: ${shown} = ${L(b, `${x}/${y}`)} = ${L(b, String(R))}.`);
    }
  }
  if (kind === 'power') {
    for (;;) {
      const b = rng.pick([2, 3, 5, 10]), m = rng.int(2, 6), k = rng.int(2, 3), e = rng.int(1, k);
      if (isPowerOf(m, b)) continue;
      const x = b * m, top = x ** k;
      if (top % (b ** e) !== 0 || top / b ** e > 20000) continue;
      const y = top / b ** e;
      const shown = `${k} ${L(b, String(x))} − ${L(b, String(y))}`;
      return combined(shown, `${k}${A(b, x)} - ${A(b, y)}`, b, e,
        `A number in front is a power inside: ${k} ${L(b, String(x))} = ${L(b, `${x}${sup(k)}`)} = ${L(b, String(top))}. Then subtracting divides: ${L(b, `${top}/${y}`)} = ${L(b, String(b ** e))}.`);
    }
  }
  if (kind === 'three') {
    for (;;) {
      const b = rng.pick([2, 3, 5, 6, 10]), e = rng.int(1, 3), R = b ** e;
      const y = rng.int(2, 12), z = rng.int(2, 12);
      if (y === z || R > 1000 || (R * z) % y !== 0) continue;
      const x = (R * z) / y;
      if (x < 2 || x > 2000 || x === y || x === z || isPowerOf(x, b)) continue;
      const shown = `${L(b, String(x))} + ${L(b, String(y))} − ${L(b, String(z))}`;
      return combined(shown, `${A(b, x)} + ${A(b, y)} - ${A(b, z)}`, b, e,
        `Adding multiplies and subtracting divides: ${shown} = ${L(b, `${x} × ${y}/${z}`)} = ${L(b, String(R))}.`);
    }
  }
  return kind === 'condense' ? condense(rng) : expand(rng);
}

/**
 * The logs of a product, quotient and power as terms: [letter, power, sign].
 * ln(x²y/z) is x to the 2 added, y added, z taken away.
 */
const LOG_PATTERNS = [
  (k) => [['x', k, 1], ['y', 1, 1], ['z', 1, -1]],
  (k) => [['x', 1, 1], ['y', k, -1]],
  (k) => [['x', 1, 1], ['y', k, 1]],
  (k) => [['x', k, 1], ['y', 1, -1], ['z', 1, -1]],
  (k) => [['x', 1, 1], ['y', 1, 1], ['z', k, -1]],
];

/** The terms as one log's argument: x²y/z, x/(3y), or with `sum`, x² + y − z. */
function inside(terms, { factor = false, sum = false } = {}) {
  const atom = ([v, k]) => (k === 1 ? [v, v] : factor ? [`${k}*${v}`, `${k}${v}`] : [`${v}^${k}`, `${v}${sup(k)}`]);
  if (sum) {
    return terms.map((t, i) => {
      const [a, l] = atom(t);
      return i === 0 ? [a, l] : [`${t[2] < 0 ? ' - ' : ' + '}${a}`, `${t[2] < 0 ? ' − ' : ' + '}${l}`];
    }).reduce(([a, l], [b, m]) => [a + b, l + m]);
  }
  const part = (ts) => {
    const atoms = ts.map(atom);
    return [atoms.map(([a]) => a).join('*'), atoms.map(([, l]) => l).join('')];
  };
  const top = terms.filter((t) => t[2] > 0), bottom = terms.filter((t) => t[2] < 0);
  const [na, nl] = top.length ? part(top) : ['1', '1'];
  if (!bottom.length) return [na, nl];
  const [da, dl] = part(bottom);
  const wrap = bottom.length > 1 || (factor && bottom.some(([, k]) => k > 1));
  return [`${na}/${wrap ? `(${da})` : da}`, `${nl}/${wrap ? `(${dl})` : dl}`];
}

/** The terms as separate logs: 2 ln x + ln y − ln z, or with the slips. */
function separate(terms, b, { squared = false, spread = false } = {}) {
  const n = lname(b), an = aname(b);
  const big = Math.max(...terms.map(([, k]) => k));
  return terms.map(([v, k0, sign], i) => {
    const k = spread ? big : k0;
    const [a, l] = k === 1 ? [`${an}(${v})`, `${n} ${v}`]
      : squared ? [`${an}(${v})^${k}`, `(${n} ${v})${sup(k)}`] : [`${k}${an}(${v})`, `${k} ${n} ${v}`];
    if (i === 0) return [sign < 0 ? `-${a}` : a, sign < 0 ? `−${l}` : l];
    return [`${sign < 0 ? ' - ' : ' + '}${a}`, `${sign < 0 ? ' − ' : ' + '}${l}`];
  }).reduce(([a, l], [c, m]) => [a + c, l + m]);
}

/** The last term's sign turned over: a minus read as a plus, or a plus as a minus. */
const lastFlipped = (terms) => terms.map((t, i) => (i === terms.length - 1 ? [t[0], t[1], -t[2]] : t));

/** A law pattern drawn with one of the letter sets. */
function lawTerms(rng, k) {
  const [x, y, z] = rng.pick(LETTERS);
  return rng.pick(LOG_PATTERNS)(k).map(([v, p, sg]) => [{ x, y, z }[v], p, sg]);
}

// requiem: catalogue/content/decoys-cross-two-slips
// Condensed, the slips are the number in front left as a factor (3x for
// x³), the last sign turned over, and a sum of logs read as the log of a
// sum; two of them crossed make the four options.
function condense(rng) {
  for (;;) {
    const b = rng.pick([2, 3, 4, 5, 7, 10, 'e']), k = rng.int(2, 4);
    const terms = lawTerms(rng, k);
    const n = lname(b), an = aname(b);
    const [shownA, shown] = separate(terms, b);
    const SLIPS = [(o) => ({ ...o, factor: true }), (o) => ({ ...o, flip: true }), (o) => ({ ...o, sum: true })];
    const [s1, s2] = rng.shuffle([0, 1, 2]).slice(0, 2).map((i) => SLIPS[i]);
    const opts = crossed({}, s1, s2).map((o) => {
      const [t, l] = inside(o.flip ? lastFlipped(terms) : terms, o);
      return [`${an}(${t})`, `${n}(${l})`];
    });
    const kTerm = terms.find(([, p]) => p > 1);
    const ask = choice([T.prose(`Write as a single logarithm: ${shown}`)], `condense: ${shownA}`, opts,
      `The ${k} in front becomes a power, ${k} ${n} ${kTerm[0]} = ${n} ${kTerm[0]}${sup(k)}; adding a log multiplies by its number and subtracting divides by it. So ${opts[0][1]}.`);
    if (ask) return ask(rng);
  }
}

// Expanded, the slips are a power read as a power of the log ((ln x)² for
// ln x²), the last sign turned over, and the power spread to every letter
// (x²y read as (xy)²); two of them crossed make the four options.
function expand(rng) {
  for (;;) {
    const b = rng.pick([2, 3, 4, 5, 7, 10, 'e']), k = rng.int(2, 4);
    const terms = lawTerms(rng, k);
    const n = lname(b), an = aname(b);
    const [inA, inL] = inside(terms);
    const SLIPS = [(o) => ({ ...o, squared: true }), (o) => ({ ...o, flip: true }), (o) => ({ ...o, spread: true })];
    const [s1, s2] = rng.shuffle([0, 1, 2]).slice(0, 2).map((i) => SLIPS[i]);
    const opts = crossed({}, s1, s2).map((o) => separate(o.flip ? lastFlipped(terms) : terms, b, o));
    const kTerm = terms.find(([, p]) => p > 1);
    const ask = choice([T.prose(`Expand using the laws of logs: ${n}(${inL})`)], `expand: ${an}(${inA})`, opts,
      `A product inside becomes a sum of logs and a quotient a difference, the bottom's logs taken away. A power on one letter comes down in front of that letter's log only: ${n} ${kTerm[0]}${sup(k)} = ${k} ${n} ${kTerm[0]}. So ${opts[0][1]}.`);
    if (ask) return ask(rng);
  }
}

// --- ln & Change of Base ---------------------------------------------------

function changeBase(rng) {
  const kind = rng.pick(['change', 'change', 'change', 'which', 'which', 'which', 'inverse', 'inverse', 'inverse', 'inverse']);
  if (kind === 'change') {
    for (;;) {
      const b = rng.pick([2, 3, 4, 5, 6, 7, 8, 9, 12]), v = rng.int(2, 300), places = rng.pick([2, 3]);
      if (isPowerOf(v, b) || isPowerOf(b, v)) continue;
      // two numbers that are powers of one another's root have an exact log.
      if ([2, 3, 5, 6, 7, 10].some((c) => isPowerOf(b, c) && isPowerOf(v, c))) continue;
      const x = Math.log(v) / Math.log(b);
      const alt = Number(at4(Math.log(v)).replace('−', '-')) / Number(at4(Math.log(b)).replace('−', '-'));
      const q = safeRound(x, places, alt);
      if (q === null) continue;
      const shown = L(b, String(v));
      return {
        prompt: [T.prose(`Use the change of base formula to find ${shown}, ${placeWords(places)}.`)],
        text: `change of base: ${A(b, v)}${placeText(places)}`,
        answer: roundedAnswer(q, places),
        visual: null,
        explain: `${shown} = ln ${v} / ln ${b} ≈ ${at4(Math.log(v))} / ${at4(Math.log(b))} ≈ ${at4(x)}, or the same with log in place of ln. So ${shown} ≈ ${roundedText(q, places)}.`,
      };
    }
  }
  if (kind === 'which') {
    // requiem: catalogue/content/decoys-cross-two-slips
    // Crossed slips: the quotient turned upside down, and one other misreading
    // -- the log of the quotient, a difference of logs, or the base divided
    // by rather than its log -- alone and with the flip.
    for (;;) {
      const b = rng.pick([2, 3, 4, 5, 6, 7, 9]), v = rng.int(2, 60);
      if (v === b || isPowerOf(v, b) || isPowerOf(b, v)) continue;
      const f = rng.pick(['ln', 'log']);
      const slip = rng.pick(['inside', 'minus', 'bare']);
      const form = (top, bottom) => (slip === 'inside' ? [`${f}(${top}/${bottom})`, `${f}(${top}/${bottom})`]
        : slip === 'minus' ? [`${f}(${top}) - ${f}(${bottom})`, `${f} ${top} − ${f} ${bottom}`]
          : [`${f}(${top})/${bottom}`, `${f} ${top} / ${bottom}`]);
      const opts = [
        [`${f}(${v})/${f}(${b})`, `${f} ${v} / ${f} ${b}`],
        [`${f}(${b})/${f}(${v})`, `${f} ${b} / ${f} ${v}`],
        form(v, b),
        form(b, v),
      ];
      const shown = L(b, String(v));
      const ask = choice([T.prose(`Which of these equals ${shown}?`)], `change of base: ${A(b, v)}`, opts,
        `Change of base: a log to any base is the log of the number over the log of the base, both to one base you can work out, such as ${f}. So ${shown} = ${opts[0][1]}.`);
      if (ask) return ask(rng);
    }
  }
  // inverse: a base raised to its own log, or a log of its own base's power.
  const form = rng.pick(['raise', 'raise', 'raiseE', 'scaled', 'logpow']);
  if (form === 'logpow') {
    const b = rng.pick([2, 3, 5, 7, 10, 'e']), k = rng.int(-6, 12);
    const shown = `${lname(b)} ${b === 'e' ? 'e' : b}${sup(k)}`;
    return {
      prompt: [T.prose(`Simplify ${shown}.`)],
      text: `log value: ${A(b, `${b}^${k < 0 ? `(${k})` : k}`)}`,
      answer: fa(k, 1),
      visual: null,
      explain: `A log undoes a power of its own base: it asks what power of ${b} this is, and it is written as one. So ${shown} = ${minus(k)}.`,
    };
  }
  if (form === 'scaled') {
    // e^(k ln v) = v^k.
    const v = rng.int(2, 9), k = rng.pick([2, 3, -1, -2]);
    const val = k > 0 ? [v ** k, 1] : [1, v ** -k];
    const kt = k === -1 ? '−' : `${minus(k)} `;
    const shown = `e to the power ${kt}ln ${v}`;
    return {
      prompt: [T.prose('Simplify'), T.pow('e', `${kt}ln ${v}`), T.prose('.')],
      text: `log value: e^(${k}ln(${v}))`,
      answer: fa(...val),
      visual: null,
      explain: `The number in front is a power inside: ${kt}ln ${v} = ln ${v}${sup(k)}. e to the ln of a number gives the number back, so it is ${v}${sup(k)} = ${fx(...val)}.`,
    };
  }
  const b = form === 'raiseE' ? 'e' : rng.pick([2, 3, 5, 7, 10]);
  const v = rng.int(2, 40);
  if (b !== 'e' && isPowerOf(v, b)) return changeBase(rng);
  const shown = `${b} to the power ${lname(b)} ${v}`;
  return {
    prompt: [T.prose('Simplify'), T.pow(b, `${lname(b)} ${v}`), T.prose('.')],
    text: `log value: ${b}^(${A(b, v)})`,
    answer: fa(v, 1),
    visual: null,
    explain: `${lname(b)} ${v} is the power of ${b} that gives ${v}, and here ${b} is raised to exactly that power. So ${shown} = ${v}.`,
  };
}

// --- Solve Exponential Equations -------------------------------------------

function drawn(src) {
  const r = previewOf(src);
  if (!r.ok) throw new Error(`logarithms: cannot draw ${src}: ${r.error}`);
  return r.terms;
}
/** B^(ax + c) in ASCII: 2^x, 2^(x + 1), 2^(3x). */
const powerOf = (B, a, c) => (a === 1 && c === 0 ? `${B}^x` : `${B}^(${lin(a, c)})`);

/** c ln a terms summed, as prose writes them: ln 2 − 3 ln 5, −ln 3. */
function lnSum(parts) {
  const out = [];
  for (const [c, a] of parts) {
    if (c === 0) continue;
    const t = `${Math.abs(c) === 1 ? '' : `${Math.abs(c)} `}ln ${a}`;
    out.push(out.length ? `${c < 0 ? '−' : '+'} ${t}` : `${c < 0 ? '−' : ''}${t}`);
  }
  return out.join(' ');
}
/** (ax + c) ln B as it comes down from the power: x ln 2, 2x ln 3, (x − 1) ln 5. */
const downFrom = (a, c, B) => `${c === 0 ? lin(a, 0, true) : `(${lin(a, c, true)})`} ln ${B}`;
/** 4-place natural log, as a calculator shows it. */
const ln4 = (v) => Number(at4(Math.log(v)).replace('−', '-'));

// requiem: catalogue/content/unlike-bases-by-logs
// Two bases that are not powers of one number: take ln of both sides, bring
// both powers down, and gather the x terms. 2ˣ = 3ˣ⁻¹ is x ln 2 = (x − 1) ln 3.
function unlikeBases(rng) {
  for (;;) {
    const [B1, B2] = rng.shuffle([2, 3, 5, 6, 7]).slice(0, 2);
    const p = rng.pick([1, 1, 1, 2]), q = rng.int(-3, 3), r = rng.pick([1, 1, 1, 2, 3]), t = rng.int(-3, 3);
    if (q === 0 && t === 0 || p * Math.log(B1) === r * Math.log(B2)) continue;
    // (px + q) ln B1 = (rx + t) ln B2: x(p ln B1 − r ln B2) = t ln B2 − q ln B1.
    const solve = (l1, l2) => (t * l2 - q * l1) / (p * l1 - r * l2);
    const x = solve(Math.log(B1), Math.log(B2));
    const places = rng.pick([2, 3]);
    const qx = safeRound(x, places, solve(ln4(B1), ln4(B2)));
    if (qx === null || Math.abs(x) > 50) continue;
    const src = `${powerOf(B1, p, q)} = ${powerOf(B2, r, t)}`;
    const top = lnSum([[t, B2], [-q, B1]]), bottom = lnSum([[p, B1], [-r, B2]]);
    return {
      prompt: [T.prose('Solve'), ...drawn(src), T.prose(`, ${placeWords(places)}.`)],
      text: `exp eq: ${src}${placeText(places)}`,
      answer: roundedAnswer(qx, places),
      visual: null,
      explain: `${B1} and ${B2} are not powers of one number, so take ln of both sides; each power comes down in front: `
        + `${downFrom(p, q, B1)} = ${downFrom(r, t, B2)}. Multiply out and gather the x terms on the left: `
        + `x(${bottom}) = ${top}, so x = (${top}) / (${bottom}) ≈ ${at4(x)}. So x ≈ ${roundedText(qx, places)}.`,
    };
  }
}

/** A dollar amount as a story says it: $1,500. */
const usd = (v) => `$${v.toLocaleString('en-US')}`;

// requiem: catalogue/content/growth-solved-for-time
// F-LE.4: the time a growth or decay story takes, solved with logs. The model
// is the exponential skill's -- a yearly factor, a half-life, a continuous
// rate -- and the question is when, not how much.
function growthTime(rng) {
  for (;;) {
    const story = rng.pick(['interest', 'interest', 'double', 'halflife', 'halflife', 'continuous', 'continuous', 'value']);
    const places = rng.pick([1, 1, 2]);
    let A, src, want, alt, prompt, setup, unit = 'years';
    if (story === 'interest' || story === 'double' || story === 'value') {
      const up = story !== 'value';
      const r = up ? rng.pick([2, 3, 4, 5, 6, 7, 8, 9, 10, 12]) : rng.pick([5, 8, 10, 12, 15, 20, 25]);
      const B = (100 + (up ? r : -r)) / 100;
      A = rng.pick(up ? [500, 800, 1000, 1200, 1500, 2000, 2500, 3000, 4000, 5000] : [12000, 15000, 18000, 20000, 24000, 30000]);
      const V = story === 'double' ? 2 * A : up ? A * rng.pick([1.25, 1.5, 1.6, 1.75, 2.5, 3]) : A * rng.pick([0.2, 0.25, 0.4, 0.5, 0.6, 0.75]);
      if (!Number.isInteger(V)) continue;
      src = `${A}*(${B})^t = ${V}`;
      want = Math.log(V / A) / Math.log(B);
      alt = ln4(V / A) / ln4(B);
      prompt = story === 'interest'
        ? `${usd(A)} is saved at ${r}% interest a year, added on at the end of each year. After how many years is it worth ${usd(V)}? Give the time ${placeWords(places)}.`
        : story === 'double'
          ? `${usd(A)} is saved at ${r}% interest a year, added on at the end of each year. How many years does it take to double? Give the time ${placeWords(places)}.`
          : `A car bought for ${usd(A)} loses ${r}% of its value each year. After how many years is it worth ${usd(V)}? Give the time ${placeWords(places)}.`;
      const ratio = String(V / A);
      setup = `Each year multiplies it by ${B}, so after t years it is ${A} × ${B}ᵗ. Set that equal to ${V} and divide by ${A}: ${B}ᵗ = ${ratio}. `
        + `Take ln of both sides; the power comes down: t ln ${B} = ln ${ratio}, so t = ln ${ratio} / ln ${B}`;
    } else if (story === 'halflife') {
      const h = rng.pick([2, 3, 4, 5, 6, 8, 10, 12, 30]);
      A = rng.pick([40, 60, 80, 100, 120, 200, 250, 500]);
      const V = rng.pick([5, 10, 15, 20, 25, 30, 35, 45]);
      if (V >= A || Number.isInteger(Math.log2(A / V))) continue;
      unit = h === 30 ? 'years' : 'hours';
      src = `${A}*(1/2)^(t/${h}) = ${V}`;
      want = h * Math.log(A / V) / Math.log(2);
      alt = h * ln4(A / V) / ln4(2);
      prompt = h === 30
        ? `${A} grams of a radioactive element has a half-life of ${h} years. After how many years are ${V} grams left? Give the time ${placeWords(places)}.`
        : `A patient is given ${A} mg of a medicine with a half-life of ${h} hours. After how many hours are ${V} mg left? Give the time ${placeWords(places)}.`;
      const ratio = fx(V, A);
      setup = `Every ${h} ${unit} halves it, so after t ${unit} it is ${A} × (1/2) to the power t/${h}. Set that equal to ${V} and divide by ${A}: (1/2) to the power t/${h} is ${ratio}. `
        + `Take ln of both sides; the power comes down: (t/${h}) ln(1/2) = ln(${ratio}), so t = ${h} ln(${ratio}) / ln(1/2)`;
    } else {
      const k = rng.pick([2, 3, 4, 5, 6, 8]);
      A = rng.pick([200, 500, 1000, 2000, 5000, 12000]);
      const V = A * rng.pick([1.5, 2, 2.5, 3, 4]);
      if (!Number.isInteger(V)) continue;
      const K = k / 100;
      src = `${A}*e^(${K}t) = ${V}`;
      want = Math.log(V / A) / K;
      alt = ln4(V / A) / K;
      const ratio = String(V / A);
      const town = rng.chance(0.5);
      prompt = town
        ? [T.prose(`A town grows continuously: after t years its population is`), ...drawn(`${A}e^(${K}t)`),
          T.prose(`. After how many years are there ${V.toLocaleString('en-US')} people? Give the time ${placeWords(places)}.`)]
        : [T.prose(`${usd(A)} is invested at ${k}% a year compounded continuously, so after t years it is worth`), ...drawn(`${A}e^(${K}t)`),
          T.prose(`dollars. After how many years is it worth ${usd(V)}? Give the time ${placeWords(places)}.`)];
      setup = `Set ${A}e to the power ${K}t equal to ${V} and divide by ${A}: e to the power ${K}t is ${ratio}. ln undoes e, so take ln of both sides: ${K}t = ln ${ratio}, and t = ln ${ratio} / ${K}`;
    }
    const qt = safeRound(want, places, alt);
    if (qt === null || want <= 0 || want > 80) continue;
    return {
      prompt: Array.isArray(prompt) ? prompt : [T.prose(prompt)],
      text: `exp context: ${src}${placeText(places)}`,
      answer: roundedAnswer(qt, places),
      visual: null,
      explain: `${setup} ≈ ${at4(want)}. So it takes about ${roundedText(qt, places)} ${unit}.`,
    };
  }
}

function expEquation(rng) {
  const kind = rng.pick(['one', 'one', 'one', 'logs', 'logs', 'unlike', 'unlike', 'context', 'context', 'context']);
  if (kind === 'unlike') return unlikeBases(rng);
  if (kind === 'context') return growthTime(rng);
  if (kind === 'one') {
    // One base: both sides powers of c0.
    for (;;) {
      const c0 = rng.pick([2, 3, 5]), m = rng.int(1, 3), n = rng.int(-5, 7);
      const B = c0 ** m;
      const a = rng.pick([1, 1, 1, 2, 3]), c = rng.int(-3, 3);
      if (B > 125 || Math.abs(n) > 0 && c0 ** Math.abs(n) > 3000 || n === 0 && c === 0) continue;
      if (rng.chance(0.4) && m === 1) continue; // more rows where the base must be rewritten
      const V = n >= 0 ? String(c0 ** n) : `1/${c0 ** -n}`;
      // m(ax + c) = n
      const num = n - m * c, den = m * a;
      const lhs = powerOf(B, a, c);
      const src = `${lhs} = ${V}`;
      const vf = `${c0}${sup(n)}`;
      return {
        prompt: [T.prose('Solve:'), ...drawn(src)],
        text: `exp eq: ${src}`,
        answer: fa(num, den),
        visual: null,
        explain: `Write both sides as powers of ${c0}: ${m === 1 ? '' : `${B} = ${c0}${sup(m)}, so the left is ${c0} to the power ${m}(${lin(a, c, true)}), and `}${V} = ${vf}. `
          + `Equal powers of one base have equal exponents: ${m === 1 ? '' : `${m}(`}${lin(a, c, true)}${m === 1 ? '' : ')'} = ${minus(n)}, so x = ${fx(num, den)}.`,
      };
    }
  }
  // Not one base: take logs, rounded.
  for (;;) {
    const B = rng.pick([2, 3, 5, 7, 'e', 'e']), k = rng.pick([1, 1, 2, 3, 4, 5]), a = rng.pick([1, 1, 2, 3]);
    const V = k * rng.int(2, 40) + (rng.chance(0.3) ? rng.int(1, k) : 0);
    const r = V / k;
    const places = rng.pick([2, 3]);
    if (r <= 1) continue;
    if (B !== 'e' && [2, 3, 5, 7].some((c) => isPowerOf(B, c) && Number.isInteger(r) && isPowerOf(r, c))) continue;
    const lnB = B === 'e' ? 1 : Math.log(B);
    const x = Math.log(r) / (a * lnB);
    const q = safeRound(x, places);
    if (q === null) continue;
    const lhs = `${k === 1 ? '' : `${k}*`}${B === 'e' ? 'e' : B}^${a === 1 ? 'x' : `(${a}x)`}`;
    const src = `${lhs} = ${V}`;
    const rt = Number.isInteger(r) ? String(r) : fx(V, k);
    const lr = Number.isInteger(r) ? rt : `(${rt})`;
    return {
      prompt: [T.prose('Solve'), ...drawn(src), T.prose(`, ${placeWords(places)}.`)],
      text: `exp eq: ${src}${placeText(places)}`,
      answer: roundedAnswer(q, places),
      visual: null,
      explain: `${k === 1 ? '' : `Divide by ${k} first: ${B}${supX(a)} = ${rt}. `}Take ${B === 'e' ? 'ln' : 'the log'} of both sides; the power comes down in front: `
        + `${a === 1 ? 'x' : `${a}x`}${B === 'e' ? '' : ` ln ${B}`} = ln ${lr}, so x = ln ${lr}${B === 'e' ? (a === 1 ? '' : ` / ${a}`) : a === 1 ? ` / ln ${B}` : ` / (${a} ln ${B})`} ≈ ${at4(x)}. So x ≈ ${roundedText(q, places)}.`,
    };
  }
}

// --- Solve Log Equations ---------------------------------------------------

const setOf = (xs) => {
  const seen = new Map();
  for (const [n, d] of xs) { const g = gcd(n, d) || 1; const s = d < 0 ? -1 : 1; seen.set(`${s * n / g}/${s * d / g}`, { n: (s * n) / g, d: (s * d) / g }); }
  const parts = [...seen.values()].sort((p, q) => p.n / p.d - q.n / q.d).map((v) => ({ lo: v, loIn: true, hi: v, hiIn: true }));
  return { type: 'solutions', value: { letter: 'x', parts: normalize(parts) } };
};
const said = (xs) => (xs.length ? formatSet(setOf(xs).value) : 'no solution');

// requiem: catalogue/content/none-offered-on-every-row
function logProblem(lhsF, lhsA, rhsF, rhsA, xs, explain) {
  return {
    prompt: [T.prose(`Solve ${lhsF} = ${rhsF}.`), T.prose('Give every solution, or none if there is no solution.')],
    text: `log eq: ${lhsA} = ${rhsA}`,
    answer: setOf(xs),
    visual: null,
    explain: `${explain} So ${said(xs)}.`,
  };
}
const LB = [2, 3, 4, 5, 10];
const ok = (n, d) => n * Math.sign(d) > 0;

// requiem: catalogue/content/log-equation-domain-checked
function logEquation(rng) {
  const kind = rng.pick(['simple', 'sum', 'sum', 'diff', 'diff', 'equal', 'quad']);
  const b = rng.pick(LB), n = lname(b);
  if (kind === 'simple') {
    for (;;) {
      const a = rng.pick([1, 1, 2, 3]), c = rng.int(-9, 9), e = rng.int(-1, 3), N = b ** e;
      if (N > 1000) continue;
      // ax + c = N
      const [p, q] = e >= 0 ? [N - c, a] : [1 - c * b, a * b];
      const arg = lin(a, c, true);
      return logProblem(L(b, arg), A(b, lin(a, c)), minus(e), String(e), [[p, q]],
        `Write it as a power: ${arg} = ${b}${sup(e)} = ${fx(...(e >= 0 ? [N, 1] : [1, b]))}, so x = ${fx(p, q)}. The log is then of ${fx(...(e >= 0 ? [N, 1] : [1, b]))}, which is positive.`);
    }
  }
  if (kind === 'sum') {
    for (;;) {
      const e = rng.int(1, 3), N = b ** e;
      if (N > 200) continue;
      const pairs = divisors(N).filter((u) => u * u <= N);
      const u = rng.pick(pairs), v = N / u;
      const p = rng.int(-6, 6);
      const x = u - p, q = v - x;
      if (p === q || q < -9 || q > 9) continue;
      const other = -v - p; // (x + p)(x + q) = N's other root: both factors negative
      const sumPQ = p + q, prodPQ = p * q - N;
      const f1 = lin(1, p, true), f2 = lin(1, q, true);
      return logProblem(`${L(b, f1)} + ${L(b, f2)}`, `${A(b, lin(1, p))} + ${A(b, lin(1, q))}`, String(e), String(e), [[x, 1]],
        `Adding logs multiplies: (${f1})(${f2}) = ${b}${sup(e)} = ${N}, so ${quad(sumPQ, prodPQ, true)} = 0, with roots ${minus(Math.min(x, other))} and ${minus(Math.max(x, other))}. `
        + `At x = ${minus(other)} both ${f1} and ${f2} are negative, and a log of a negative number does not exist, so it is extraneous; at x = ${minus(x)} they are ${u} and ${v}.`);
    }
  }
  if (kind === 'diff') {
    for (;;) {
      const e = rng.int(1, 2), N = b ** e;
      if (N > 100) continue;
      const p = rng.int(-9, 12), q = rng.int(-9, 9);
      if (p === q) continue;
      // x + p = N(x + q): x = (p − Nq)/(N − 1)
      const num = p - N * q, den = N - 1;
      const valid = ok(num + q * den, den); // x + q > 0
      if (valid !== rng.chance(0.65)) continue;
      const f1 = lin(1, p, true), f2 = lin(1, q, true);
      const at = fx(num + q * den, den);
      return logProblem(`${L(b, f1)} − ${L(b, f2)}`, `${A(b, lin(1, p))} - ${A(b, lin(1, q))}`, String(e), String(e), valid ? [[num, den]] : [],
        `Subtracting logs divides: (${f1})/(${f2}) = ${b}${sup(e)} = ${N}, so ${f1} = ${N}(${f2}) and x = ${fx(num, den)}. `
        + (valid ? `There ${f2} is ${at}, positive, and so is ${f1}.` : `There ${f2} is ${at}, which is not positive, so x = ${fx(num, den)} is extraneous.`));
    }
  }
  if (kind === 'equal') {
    for (;;) {
      const a1 = rng.int(1, 4), a2 = rng.int(1, 4), c1 = rng.int(-9, 9), c2 = rng.int(-9, 9);
      if (a1 === a2) continue;
      const num = c2 - c1, den = a1 - a2;
      const valid = ok(a1 * num + c1 * den, den);
      if (valid !== rng.chance(0.6)) continue;
      const f1 = lin(a1, c1, true), f2 = lin(a2, c2, true);
      const at = fx(a1 * num + c1 * den, den);
      return logProblem(L(b, f1), A(b, lin(a1, c1)), L(b, f2), A(b, lin(a2, c2)), valid ? [[num, den]] : [],
        `Equal logs to one base are logs of equal numbers: ${f1} = ${f2}, so x = ${fx(num, den)}. `
        + (valid ? `Both sides are then the log of ${at}, which is positive.` : `Both sides are then the log of ${at}, which is not positive, so x = ${fx(num, den)} is extraneous.`));
    }
  }
  // quad: log_b(x² + sx + t) = e, both roots kept.
  for (;;) {
    const e = rng.int(1, 2), N = b ** e;
    const r1 = rng.int(-8, 8), r2 = rng.int(-8, 8);
    if (r1 === r2 || N > 100) continue;
    const s = -(r1 + r2), t = r1 * r2 + N;
    const arg = quad(s, t, true);
    return logProblem(L(b, arg), A(b, quad(s, t)), String(e), String(e), [[r1, 1], [r2, 1]],
      `Write it as a power: ${arg} = ${N}, so ${quad(s, t - N, true)} = 0 and x = ${minus(Math.min(r1, r2))} or x = ${minus(Math.max(r1, r2))}. `
      + `At both, the log is of ${N}, which is positive, so both are kept.`);
  }
}

// --- Log Functions -----------------------------------------------------------
//
// requiem: catalogue/content/log-functions-in-logarithms
// y = log_b x as a function: the inverse of bˣ, through (1, 0) and (b, 1),
// taking only positive numbers and giving every real one. Swapping a point's
// coordinates is one shape among many, so most rows need the log itself: where
// the graph meets a height or the x-axis, its domain, range and asymptote, which
// way it runs, how a sign or a factor moves it, and which equation a drawn graph
// is. Every text is ASCII, log_3(x - 2) + 1 and 2^(x - 1), which check-answers.py
// evaluates in floating point to find each answer its own way.

const LFX = { ...SUP, '+': '⁺', x: 'ˣ', y: 'ʸ' };
/** 2ˣ, 2ˣ⁻³: the base with its exponent raised. */
const powF = (b, e) => `${b}${e.replace(/\s/g, '').replace(/[-+xy\d]/g, (c) => LFX[c])}`;
/** A whole power of b as { n, d }: 2⁻² = 1/4. */
const powB = (b, e) => (e >= 0 ? { n: b ** e, d: 1 } : { n: 1, d: b ** -e });
const addQ = (p, k) => ({ n: p.n + k * p.d, d: p.d });
const fq = (q) => fx(q.n, q.d);
const ptQ = (x, y) => `(${fq(x)}, ${fq(y)})`;
const Q1 = (n) => ({ n, d: 1 });
const num = (q) => q.n / q.d;
/** x − 2, x + 3, x: what the log takes, shifted h to the right. */
const inX = (h, fancy = true) => (h === 0 ? 'x' : `x ${h > 0 ? (fancy ? '−' : '-') : '+'} ${Math.abs(h)}`);
/** + 1, − 2, or nothing. */
const plusK = (k, fancy = true) => (k === 0 ? '' : ` ${k > 0 ? '+' : (fancy ? '−' : '-')} ${Math.abs(k)}`);
/** log₃(x − 2) + 1, or log₃ x. */
const logS = (b, h = 0, k = 0) => `${L(b, inX(h))}${plusK(k)}`;
/** log_3(x - 2) + 1, as the text writes it. */
const logA = (b, h = 0, k = 0) => `log_${b}(${inX(h, false)})${plusK(k, false)}`;
const logFn = (b, h = 0, k = 0) => (x) => (x > h ? Math.log(x - h) / Math.log(b) + k : NaN);
/** 3 right and 2 down. */
function moved(h, k) {
  const parts = [];
  if (h) parts.push(`${Math.abs(h)} ${h > 0 ? 'right' : 'left'}`);
  if (k) parts.push(`${Math.abs(k)} ${k > 0 ? 'up' : 'down'}`);
  return parts.join(' and ');
}

const LF_LINE = 'var(--vec-1)';
const LF_OTHER = 'var(--vec-2)';
const LF_ASKED = 'var(--gold)';

/** A window around these points, at least `min` wide each way, both axes in it. */
function lfWindow(xs, ys, { square = false, min = 8 } = {}) {
  let x0 = Math.floor(Math.min(0, ...xs)) - 1, x1 = Math.ceil(Math.max(0, ...xs)) + 1;
  let y0 = Math.floor(Math.min(0, ...ys)) - 1, y1 = Math.ceil(Math.max(0, ...ys)) + 1;
  if (square) { x0 = y0 = Math.min(x0, y0); x1 = y1 = Math.max(x1, y1); }
  const grow = (lo, hi) => {
    const need = min - (hi - lo);
    return need > 0 ? [lo - Math.floor(need / 2), hi + Math.ceil(need / 2)] : [lo, hi];
  };
  [x0, x1] = grow(x0, x1);
  [y0, y1] = grow(y0, y1);
  return { xRange: [x0, x1], yRange: [y0, y1] };
}

/**
 * y = f(x) as the polylines inside the window, each ending on its edge, found
 * by bisection: near its asymptote a log leaves through the bottom, and a
 * sample kept past the edge would run the line beyond the frame.
 */
// requiem: catalogue/visuals/curves-split-at-window
function lfCurves(f, W, tone = LF_LINE) {
  const [x0, x1] = W.xRange, [y0, y1] = W.yRange;
  const inside = (y) => Number.isFinite(y) && y >= y0 && y <= y1;
  const edge = (xIn, xOut) => {
    for (let i = 0; i < 50; i++) {
      const mid = (xIn + xOut) / 2;
      if (inside(f(mid))) xIn = mid; else xOut = mid;
    }
    return xIn;
  };
  // Where a stretch ends on the edge, next to an asymptote, a curve is so
  // steep that x needs six places for the point to be on it.
  const point = (x, places = 4) => [+x.toFixed(places), +Math.max(y0, Math.min(y1, f(x))).toFixed(4)];
  const n = 240, out = [];
  let run = [], prev = null;
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    const now = inside(f(x));
    if (now && prev !== null && !inside(f(prev))) run.push(point(edge(x, prev), 6));
    if (now) run.push(point(x));
    if (!now && prev !== null && inside(f(prev))) { run.push(point(edge(prev, x), 6)); out.push(run); run = []; }
    prev = x;
  }
  out.push(run);
  return out.filter((r) => r.length > 1).map((points) => ({ kind: 'path', points, tone }));
}
const lfDot = (x, y, label, tone = LF_ASKED) => ({ kind: 'point', at: [+x.toFixed(4), +y.toFixed(4)], tone, ...(label ? { label } : {}) });
const lfV = (x, W, label) => ({ kind: 'segment', from: [x, W.yRange[0]], to: [x, W.yRange[1]], dashed: true, tone: LF_ASKED, label });
const lfH = (y, W, label) => ({ kind: 'segment', from: [W.xRange[0], y], to: [W.xRange[1], y], dashed: true, tone: LF_ASKED, label });
function lfDiag(W) {
  const lo = Math.max(W.xRange[0], W.yRange[0]), hi = Math.min(W.xRange[1], W.yRange[1]);
  return { kind: 'segment', from: [lo, lo], to: [hi, hi], dashed: true, tone: LF_ASKED, label: 'y = x' };
}
/** Everything drawn once answered: the question needs no picture to be asked. */
const revealed = (W, answer) => ({ kind: 'plane', ...W, grid: 1, marks: [], answer });
/** The graph of log_b(x − h) + k with its asymptote, and any points to mark. */
function logGraph(b, h, k, dots = [], { xs = [], ys = [] } = {}) {
  const W = lfWindow([h - 1, h + b + 1, ...xs, ...dots.map((d) => d[0])], [k - 4, k + 3, ...ys, ...dots.map((d) => d[1])]);
  return revealed(W, [...lfCurves(logFn(b, h, k), W), lfV(h, W, `x = ${minus(h)}`),
    ...dots.map(([x, y, label]) => lfDot(x, y, label))]);
}

const GRAPH_BASES = [2, 2, 3, 3, 4, 5];

/** A point of bˣ (or bˣ + k) and the point of its inverse it reflects to. */
function lfReflect(rng) {
  const b = rng.pick(GRAPH_BASES), top = { 2: 3, 3: 2, 4: 1, 5: 1 }[b];
  if (rng.chance(0.5)) {
    const e = rng.int(-1, top), k = rng.nonZero(-4, 4);
    const v = powB(b, e), y = addQ(v, k), E = Q1(e);
    const W = lfWindow([e, num(y), k], [e, num(y), k], { square: true });
    return {
      prompt: [T.prose(`f(x) = ${b}ˣ${plusK(k)}. The point ${ptQ(E, y)} is on the graph of f. Which point must be on the graph of f⁻¹?`)],
      text: `reflect shifted: (${e}, ${Qs(y)}) on base ${b} plus ${k}`,
      answer: { type: 'pair', value: { x: y, y: E } },
      visual: revealed(W, [...lfCurves((x) => b ** x + k, W), ...lfCurves(logFn(b, k, 0), W, LF_OTHER), lfDiag(W),
        lfDot(e, num(y), ptQ(E, y), LF_LINE), lfDot(num(y), e, ptQ(y, E))]),
      explain: `f(${minus(e)}) = ${fq(v)}${plusK(k)} = ${fq(y)}, so f⁻¹(${fq(y)}) = ${minus(e)}: f⁻¹, here ${logS(b, k)}, sends each output back to its input. `
        + `So the graph of f⁻¹ is the graph of f reflected in y = x, and ${ptQ(E, y)} becomes ${ptQ(y, E)}.`,
    };
  }
  const e = rng.int(-2, top), v = powB(b, e), E = Q1(e), toLog = rng.chance(0.5);
  const [from, to] = toLog ? [[E, v], [v, E]] : [[v, E], [E, v]];
  const said = toLog ? `y = ${b}ˣ` : `y = ${L(b, 'x')}`, other = toLog ? `y = ${L(b, 'x')}` : `y = ${b}ˣ`;
  const W = lfWindow([e, num(v)], [e, num(v)], { square: true });
  return {
    prompt: [T.prose(`The point ${ptQ(...from)} is on the graph of ${said}. Which point must be on the graph of ${other}?`)],
    text: `${toLog ? 'reflect onto log' : 'reflect onto power'}: (${Qs(from[0])}, ${Qs(from[1])}) on base ${b}`,
    answer: { type: 'pair', value: { x: to[0], y: to[1] } },
    visual: revealed(W, [...lfCurves((x) => b ** x, W), ...lfCurves(logFn(b), W, LF_OTHER), lfDiag(W),
      lfDot(num(from[0]), num(from[1]), ptQ(...from), LF_LINE), lfDot(num(to[0]), num(to[1]), ptQ(...to))]),
    explain: `${L(b, 'x')} is the inverse of ${b}ˣ: ${b}${sup(e)} = ${fq(v)} says the same as ${L(b, Qs(v))} = ${minus(e)}. `
      + `So the two graphs are reflections of each other in y = x, and each point's coordinates swap: ${ptQ(...from)} becomes ${ptQ(...to)}.`,
  };
}

/** Where log_b(x − h) + k = 0, written as a power. */
function lfIntercept(rng) {
  for (;;) {
    const b = rng.pick(GRAPH_BASES), h = rng.int(-4, 4), k = rng.pick([-2, -1, -1, 0, 1, 1, 2]);
    if (b ** Math.abs(k) > 16) continue;
    const p = powB(b, -k), x = addQ(p, h);
    const solve = k === 0
      ? `${L(b, inX(h))} = 0, and a log is 0 only at 1, since ${b}⁰ = 1: ${inX(h)} = 1`
      : `${L(b, inX(h))} = ${minus(-k)}, and as a power, ${inX(h)} = ${b}${sup(-k)} = ${fq(p)}`;
    return {
      prompt: [T.prose(`At what x does the graph of y = ${logS(b, h, k)} cross the x-axis?`)],
      text: `log x-intercept: ${logA(b, h, k)}`,
      answer: fa(x.n, x.d),
      visual: logGraph(b, h, k, [[num(x), 0, `(${fq(x)}, 0)`]]),
      explain: `It crosses the x-axis where y = 0: ${k ? `${logS(b, h, k)} = 0, so ` : ''}${solve}${h ? `, and x = ${fq(p)}${plusK(h)}` : ''}. So it crosses at x = ${fq(x)}.`,
    };
  }
}

/** The point at a given height: log_b b = 1 and log_b 1 = 0 make the key points. */
function lfHeight(rng) {
  for (;;) {
    const b = rng.pick(GRAPH_BASES), h = rng.int(-4, 4), k = rng.int(-3, 3);
    const j = rng.pick([0, 1, 1, 1, 2, -1]);
    if (b ** Math.abs(j) > 16) continue;
    const Y = k + j, p = powB(b, j), x = addQ(p, h);
    const key = j === 1 || j === 0;
    const from = j === 1 ? `(${b}, 1)` : '(1, 0)';
    return {
      prompt: [T.prose(`The graph of y = ${logS(b, h, k)} passes through one point with y-coordinate ${minus(Y)}. Which point?`)],
      text: `log point at height: ${logA(b, h, k)}; y = ${Y}`,
      answer: { type: 'pair', value: { x, y: Q1(Y) } },
      visual: logGraph(b, h, k, [[num(x), Y, ptQ(x, Q1(Y))]]),
      explain: `${logS(b, h, k)} = ${minus(Y)}${k ? ` means ${L(b, inX(h))} = ${minus(j)}` : ''}. As a power, ${inX(h)} = ${b}${sup(j)} = ${fq(p)}${h ? `, so x = ${fq(x)}` : ''}. `
        + (key && (h || k) ? `It is the point ${from} of y = ${L(b, 'x')}, where ${j === 1 ? `${L(b, String(b))} = 1` : `${L(b, '1')} = 0`}, moved ${moved(h, k)}. ` : '')
        + `So the point is ${ptQ(x, Q1(Y))}.`,
    };
  }
}

const ALL_REAL = [{ lo: null, loIn: false, hi: null, hiIn: false }];

/** The range of a log or a power, and the domain of an inverse as the range of f. */
function lfRange(rng) {
  const kind = rng.pick(['log', 'log', 'power', 'power', 'power', 'inverse of power', 'inverse of power', 'inverse of log']);
  const b = rng.pick([2, 2, 3, 3, 4, 5, 10]), k = rng.int(-5, 5), h = rng.chance(0.5) ? 0 : rng.nonZero(-4, 4);
  if (kind === 'log' || kind === 'inverse of log') {
    const inv = kind === 'inverse of log';
    const why = `${L(b, 'x')} gives every real number: it falls without end as x comes down to 0 and keeps rising, slowly, forever, since ${L(b, `${b}ⁿ`)} = n for any n, however big or negative. `
      + `${h || k ? `Moving it ${moved(h, k)} leaves it reaching every height. ` : ''}`;
    return {
      prompt: [T.prose(inv ? `f(x) = ${logS(b, h, k)}. What is the domain of f⁻¹(x)? Write it with x.` : `What is the range of y = ${logS(b, h, k)}? Write it with y.`)],
      text: inv ? `inverse domain: f(x) = ${logA(b, h, k)}` : `log range: ${logA(b, h, k)}`,
      answer: { type: 'solutions', value: { letter: inv ? 'x' : 'y', parts: ALL_REAL } },
      visual: logGraph(b, h, k),
      explain: inv
        ? `f⁻¹ takes back whatever f gives out, so the domain of f⁻¹ is the range of f. ${why}So f⁻¹(x) = ${powF(b, k === 0 ? 'x' : `x${k > 0 ? '-' : '+'}${Math.abs(k)}`)}${plusK(h)} takes every number: its domain is all real numbers.`
        : `${why}So the range is all real numbers.`,
    };
  }
  const flip = kind === 'power' && rng.chance(0.35);
  const ex = h === 0 ? 'x' : `x${h > 0 ? '-' : '+'}${Math.abs(h)}`;
  const shown = `${flip ? '−' : ''}${powF(b, ex)}${plusK(k)}`;
  const ascii = `${flip ? '-' : ''}${b}^${h === 0 ? 'x' : `(${inX(h, false)})`}${plusK(k, false)}`;
  const part = flip ? { lo: null, loIn: false, hi: Q1(k), hiIn: false } : { lo: Q1(k), loIn: false, hi: null, hiIn: false };
  const f = (x) => (flip ? -1 : 1) * b ** (x - h) + k;
  const W = lfWindow([-4, 4], [k - 3, k + 3]);
  const visual = revealed(W, [...lfCurves(f, W), lfH(k, W, `y = ${minus(k)}`)]);
  const pos = `${powF(b, ex)} is always positive and takes every positive value${h ? ` (the ${minus(-h)} in the power only slides it sideways)` : ''}`;
  if (kind === 'inverse of power') {
    return {
      prompt: [T.prose(`f(x) = ${shown}. What is the domain of f⁻¹(x)? Write it with x.`)],
      text: `inverse domain: f(x) = ${ascii}`,
      answer: { type: 'solutions', value: { letter: 'x', parts: [{ lo: Q1(k), loIn: false, hi: null, hiIn: false }] } },
      visual,
      explain: `f⁻¹ takes back whatever f gives out, so the domain of f⁻¹ is the range of f. ${pos}, so f(x) > ${minus(k)}. `
        + `The same comes out of f⁻¹(x) = ${logS(b, k, h)}, whose log needs ${inX(k)} > 0. So the domain of f⁻¹ is x > ${minus(k)}.`,
    };
  }
  return {
    prompt: [T.prose(`What is the range of y = ${shown}? Write it with y.`)],
    text: `power range: ${ascii}`,
    answer: { type: 'solutions', value: { letter: 'y', parts: [part] } },
    visual,
    explain: `${pos}${flip ? `, so with the minus sign in front it is always negative: −${powF(b, ex)} < 0` : ''}. `
      + `${k ? `${k > 0 ? 'Adding' : 'Taking away'} ${Math.abs(k)} moves every value ${k > 0 ? 'up' : 'down'}. ` : ''}So the range is y ${flip ? '<' : '>'} ${minus(k)}.`,
  };
}

const LOG_BASES = [2, 2, 3, 3, 4, 5, 10];

/** The domain, or the vertical asymptote, of the log of a line. */
// requiem: catalogue/content/log-domain-of-a-line
function lfDomain(rng, shape) {
  const b = rng.pick(LOG_BASES);
  const kind = rng.pick(['up', 'up', 'down']);
  const k = rng.chance(0.5) ? 0 : rng.nonZero(-5, 5);
  const outside = k ? plusK(k, false) : '', outsideF = plusK(k);
  let m, n;
  do { m = rng.pick([1, 1, 1, 2, 3, 4]); n = rng.nonZero(-9, 9); } while (gcd(m, n) !== 1);
  if (kind === 'down') m = -m;
  const inner = kind === 'down' ? `${n} - ${m === -1 ? '' : -m}x` : lin(m, n), innerF = kind === 'down' ? `${minus(n)} − ${m === -1 ? '' : -m}x` : lin(m, n, true);
  const edge = { n: -n * Math.sign(m), d: Math.abs(m) };
  const edgeF = fq(edge);
  const steps = Math.abs(m) === 1
    ? (kind === 'down' ? `${minus(n)} > x` : `x > ${minus(-n)}`)
    : `${kind === 'down' ? `${minus(n)} > ${-m}x` : `${m}x > ${minus(-n)}`}, so ${kind === 'down' ? `${edgeF} > x` : `x > ${edgeF}`}`;
  const set = kind === 'down' ? `x < ${edgeF}` : `x > ${edgeF}`;
  const e = num(edge);
  const W = lfWindow([e - 5, e + 5], [k - 4, k + 4]);
  const f = (x) => (m * x + n > 0 ? Math.log(m * x + n) / Math.log(b) + k : NaN);
  const visual = revealed(W, [...lfCurves(f, W), lfV(e, W, `x = ${edgeF}`)]);
  const shift = k ? `The ${minus(k)} outside the log moves the graph ${k > 0 ? 'up' : 'down'} and leaves the domain alone. ` : '';
  if (shape === 'domain') {
    return {
      prompt: [T.prose(`What is the domain of f(x) = ${lname(b)}(${innerF})${outsideF}? Write it with x.`)],
      text: `log domain: log_${b}(${inner})${outside}`,
      answer: { type: 'solutions', value: { letter: 'x', parts: [kind === 'down'
        ? { lo: null, loIn: false, hi: edge, hiIn: false } : { lo: edge, loIn: false, hi: null, hiIn: false }] } },
      visual,
      explain: `A log takes only positive numbers, so ${innerF} > 0: ${steps}. ${shift}So the domain is ${set}.`,
    };
  }
  return {
    prompt: [T.prose(`The graph of y = ${lname(b)}(${innerF})${outsideF} has a vertical asymptote, the line x = a. What is a?`)],
    text: `log asymptote: log_${b}(${inner})${outside}`,
    answer: fa(edge.n, edge.d),
    visual,
    explain: `${L(b, 'x')} falls without end as x comes down to 0, so the graph runs down the line where the inside of the log is 0: ${innerF} = 0 at x = ${edgeF}. `
      + `${k ? `The ${minus(k)} outside moves the graph ${k > 0 ? 'up' : 'down'}, which leaves a vertical line where it was. ` : ''}So a = ${edgeF}.`,
  };
}

/**
 * Which way it runs: a base below 1, a minus sign in front and −x inside
 * each turn it over, a factor or a shift does not. The answer is drawn first
 * and the function built to fit, so rises and falls are half each.
 */
// requiem: catalogue/content/fixed-menu-key-moves
function lfRises(rng) {
  const rises = rng.chance(0.5);
  for (;;) {
    const b = rng.pick([2, 3, 4, 5, 10]);
    const small = rng.chance(0.35), neg = rng.chance(0.45), mirror = rng.chance(0.35);
    const c = rng.chance(0.25) ? rng.int(2, 4) : 1, k = rng.chance(0.4) ? rng.nonZero(-4, 4) : 0;
    const up = (!small) !== neg !== mirror;
    if (up !== rises) continue;
    const name = small ? 'log_b' : lname(b);
    const front = `${neg ? '−' : ''}${c > 1 ? `${c} ` : ''}`;
    const shown = `${front}${mirror ? `${name}(−x)` : `${name} x`}${plusK(k)}${small ? `, where b = 1/${b},` : ''}`;
    const ascii = `${neg ? '-' : ''}${c > 1 ? `${c}*` : ''}log_${small ? `(1/${b})` : b}(${mirror ? '-x' : 'x'})${plusK(k, false)}`;
    const steps = [small
      ? `With b = 1/${b}, less than 1, log_b x falls: (1/${b})ʸ shrinks as y grows, so a bigger x needs a smaller y (log_b 1 = 0, log_b ${b} = −1, log_b ${b * b} = −2). It is −${L(b, 'x')} by change of base, since ${L(b, `1/${b}`)} = −1.`
      : `${L(b, 'x')} rises, since its base ${b} is more than 1: ${L(b, '1')} = 0, ${L(b, String(b))} = 1, ${L(b, String(b * b))} = 2.`];
    let dir = !small;
    const way = (d) => (d ? 'a rise' : 'a fall');
    if (mirror) { steps.push(`Taking the log of −x reflects it in the y-axis, so it takes only x < 0, and ${way(dir)} becomes ${way(!dir)} read left to right.`); dir = !dir; }
    if (neg) { steps.push(`The minus sign in front reflects it in the x-axis, which turns ${way(dir)} into ${way(!dir)}.`); dir = !dir; }
    if (c > 1 || k) steps.push(`${c > 1 ? `The ${c} in front stretches it` : ''}${c > 1 && k ? ' and the' : k ? 'The' : ''}${k ? ` ${minus(k)} moves it ${k > 0 ? 'up' : 'down'}` : ''}, which leaves the direction alone.`);
    const f = (x) => {
      const v = mirror ? -x : x, base = small ? 1 / b : b;
      return v > 0 ? (neg ? -1 : 1) * c * (Math.log(v) / Math.log(base)) + k : NaN;
    };
    const W = lfWindow(mirror ? [-9, 0] : [0, 9], [k - 5, k + 5]);
    return {
      prompt: [T.prose(`Read from left to right, does the graph of y = ${shown} rise or fall?`)],
      text: `rises or falls: ${ascii}; options a: rises | b: falls`,
      answer: { type: 'choice', value: rises ? 'a' : 'b', options: [{ id: 'a', label: 'It rises' }, { id: 'b', label: 'It falls' }] },
      visual: revealed(W, lfCurves(f, W)),
      explain: `${steps.join(' ')} So it ${rises ? 'rises' : 'falls'}.`,
    };
  }
}

/**
 * The four reflections, of a log or of a power: in the x-axis (a minus sign
 * in front), the y-axis (−x inside), y = x (the inverse) and through the
 * origin (both signs). The key is drawn first, a quarter each.
 */
// requiem: catalogue/content/fixed-menu-key-moves
function lfMirror(rng) {
  const key = rng.int(0, 3);
  const b = rng.pick([2, 3, 4, 5, 10]), fromLog = rng.chance(0.5);
  const lg = (neg, inside) => [`${neg ? '-' : ''}log_${b}(${inside ? '-x' : 'x'})`, `${neg ? '−' : ''}${inside ? `${lname(b)}(−x)` : L(b, 'x')}`,
    (x) => { const v = inside ? -x : x; return v > 0 ? (neg ? -1 : 1) * Math.log(v) / Math.log(b) : NaN; }];
  const pw = (neg, inside) => [`${neg ? '-' : ''}${b}^${inside ? '(-x)' : 'x'}`, `${neg ? '−' : ''}${b}${inside ? '⁻ˣ' : 'ˣ'}`,
    (x) => (neg ? -1 : 1) * b ** (inside ? -x : x)];
  const F = fromLog ? lg(false, false) : pw(false, false);
  const G = [fromLog ? lg(true, false) : pw(true, false), fromLog ? lg(false, true) : pw(false, true),
    fromLog ? pw(false, false) : lg(false, false), fromLog ? lg(true, true) : pw(true, true)][key];
  const [px, py] = fromLog ? [b, 1] : [1, b];
  const moves = [[px, -py], [-px, py], [py, px], [-px, -py]][key];
  const p = `(${minus(px)}, ${minus(py)})`, q = `(${minus(moves[0])}, ${minus(moves[1])})`;
  const why = [
    `Every height is negated: (x, y) on the graph of y = ${F[1]} becomes (x, −y), so ${p} becomes ${q}.`,
    `x is replaced by −x, so the height y = ${F[1]} has at x, y = ${G[1]} has at −x: (x, y) becomes (−x, y), and ${p} becomes ${q}.`,
    `y = ${G[1]} is the inverse of y = ${F[1]}, so each point's coordinates swap: (x, y) becomes (y, x), and ${p} becomes ${q}.`,
    `x is replaced by −x and the height is negated, so (x, y) becomes (−x, −y), and ${p} becomes ${q}: both reflections at once, which is the reflection through the origin.`,
  ][key];
  const labels = ['Reflected in the x-axis', 'Reflected in the y-axis', 'Reflected in the line y = x', 'Reflected through the origin'];
  const W = { xRange: [-7, 7], yRange: [-7, 7] };
  const mirror = [lfH(0, W, 'x-axis'), lfV(0, W, 'y-axis'), lfDiag(W), lfDot(0, 0, 'origin')][key];
  return {
    prompt: [T.prose(`How is the graph of y = ${G[1]} made from the graph of y = ${F[1]}?`)],
    text: `reflected: ${G[0]} from ${F[0]}; options a: x-axis | b: y-axis | c: y = x | d: origin`,
    answer: { type: 'choice', value: optionIds[key], options: labels.map((label, i) => ({ id: optionIds[i], label })) },
    visual: revealed(W, [...lfCurves(F[2], W), ...lfCurves(G[2], W, LF_OTHER), mirror]),
    explain: `${why} So it is ${labels[key].toLowerCase()}.`,
  };
}

const STRETCH_BASES = [[2, 4], [2, 8], [2, 16], [3, 9], [3, 27], [4, 2], [8, 2], [16, 2], [9, 3], [27, 3],
  [4, 8], [8, 4], [4, 16], [16, 4], [9, 27], [27, 9], [10, 100], [100, 10], [5, 25], [25, 5]];

/** A vertical stretch: c log_b x, and change of base as one. */
function lfStretch(rng) {
  if (rng.chance(0.5)) {
    const [from, to] = rng.pick(STRETCH_BASES);
    // log_from(to) = m/n in lowest terms.
    const r = Math.log(to) / Math.log(from);
    const n = [1, 2, 3, 4].find((d) => Math.abs(r * d - Math.round(r * d)) < 1e-9), m = Math.round(r * n);
    return {
      prompt: [T.prose(`The graph of y = ${L(to, 'x')} is the graph of y = ${L(from, 'x')} with every height multiplied by the same number. What is that number?`)],
      text: `stretch factor: log_${to}(x) from log_${from}(x)`,
      answer: fa(n, m),
      visual: null,
      explain: `By change of base, ${L(to, 'x')} = ${L(from, 'x')} / ${L(from, String(to))}, and ${L(from, String(to))} = ${fx(m, n)}, since ${from} to the power ${fx(m, n)} is ${to}. `
        + `Dividing every height by ${fx(m, n)} multiplies it by ${fx(n, m)}: a vertical ${n > m ? 'stretch' : 'shrink'}. (At x = ${to}, ${L(to, String(to))} = 1 and ${L(from, String(to))} = ${fx(m, n)}, and ${fx(m, n)} × ${fx(n, m)} = 1.) So the number is ${fx(n, m)}.`,
    };
  }
  for (;;) {
    const c = rng.int(2, 4), b = rng.pick([2, 3, 4, 5, 10]), j = rng.pick([-2, -1, 1, 2, 2, 3]);
    if (b ** Math.abs(j) > 1000) continue;
    const Y = c * j, p = powB(b, j);
    return {
      prompt: [T.prose(`The graph of y = ${c} ${L(b, 'x')} is the graph of y = ${L(b, 'x')} stretched vertically by a factor of ${c}. At what x does it reach a height of ${minus(Y)}?`)],
      text: `stretched log meets: ${c}*log_${b}(x) = ${Y}`,
      answer: fa(p.n, p.d),
      visual: null,
      explain: `${c} ${L(b, 'x')} = ${minus(Y)}, so ${L(b, 'x')} = ${minus(Y)}/${c} = ${minus(j)}, and as a power, x = ${b}${sup(j)} = ${fq(p)}. `
        + `The stretch multiplies heights and leaves x alone: the point ${ptQ(p, Q1(j))} of y = ${L(b, 'x')} becomes ${ptQ(p, Q1(Y))}. So x = ${fq(p)}.`,
    };
  }
}

/**
 * Which equation is drawn: the shift inside the log read as its sign slip,
 * crossed with the shift outside it. All four sign pairs are drawn, so each
 * label of a set is its key a quarter of the time.
 */
// requiem: catalogue/content/fixed-menu-key-moves
function lfWhich(rng) {
  const b = rng.pick([2, 2, 3]), H = rng.int(1, 4), K = rng.int(1, 3);
  const h = rng.chance(0.5) ? H : -H, k = rng.chance(0.5) ? K : -K;
  const opts = [[h, k], [-h, k], [h, -k], [-h, -k]].map(([s, t]) => [logA(b, s, t), `y = ${logS(b, s, t)}`]);
  const W = lfWindow([h - 2, h + 9], [k - 5, k + 4]);
  const order = rng.shuffle([0, 1, 2, 3]);
  return {
    prompt: [T.prose('Which equation is graphed?')],
    text: `which graph: drawn ${logA(b, h, k)}; options ${order.map((j, i) => `${optionIds[i]}: ${opts[j][0]}`).join(' | ')}`,
    answer: { type: 'choice', value: optionIds[order.indexOf(0)], options: order.map((j, i) => ({ id: optionIds[i], label: opts[j][1] })) },
    visual: { kind: 'plane', ...W, grid: 1, marks: lfCurves(logFn(b, h, k), W), answer: [
      lfV(h, W, `x = ${minus(h)}`), lfDot(h + 1, k, `(${minus(h + 1)}, ${minus(k)})`), lfDot(h + b, k + 1, `(${minus(h + b)}, ${minus(k + 1)})`)] },
    explain: `The graph runs down beside the line x = ${minus(h)}, where the inside of the log is 0: so the inside is ${inX(h)}, not ${inX(-h)}. `
      + `It passes through (${minus(h + 1)}, ${minus(k)}), where the inside is 1 and the log is 0, so ${minus(k)} is what is added outside; and through (${minus(h + b)}, ${minus(k + 1)}), where the inside is ${b} and the log is 1. `
      + `So the graph is y = ${logS(b, h, k)}.`,
  };
}

/**
 * The inverse, as a choice. Each set of four options is the menu of four
 * functions, one keying each option -- 2ˣ + 3, 2ˣ − 3, 2ˣ⁻³ and 2ˣ⁺³ all
 * share log₂(x ∓ 3) and log₂ x ∓ 3 -- so neither the options nor where the
 * number sits (inside the log or outside it) says which is right: only
 * undoing the steps in the reverse order does. The two slips crossed are the
 * order (undoing the last step first, or the first) and the direction (× for
 * ÷, + for −).
 */
// requiem: catalogue/content/decoys-cross-two-slips
// requiem: catalogue/content/log-inverse-menus-keyed-four-ways
function lfInverse(rng) {
  const b = rng.pick([2, 2, 3, 3, 4, 5, 10]), Lx = L(b, 'x'), Ly = `${lname(b)} y`, la = `log_${b}`;
  const menu = rng.pick(['shift-log', 'shift-power', 'scale-log', 'scale-power']);
  const k = rng.nonZero(-6, 6), c = rng.int(2, 5), K = Math.abs(k);
  const pe = (s) => powF(b, `x${s > 0 ? '+' : '-'}${K}`);     // 2ˣ⁺³ for s = 1
  const pa = (s) => `${b}^(x ${s > 0 ? '+' : '-'} ${K})`;
  const wrong = (opt) => `(${opt} undoes the steps in the wrong order.)`;
  let f, fF, opts, key, why;
  if (menu === 'shift-log') {
    opts = [[`${la}(x${plusK(-k, false)})`, L(b, inX(k))], [`${la}(x${plusK(k, false)})`, L(b, inX(-k))],
      [`${la}(x)${plusK(-k, false)}`, `${Lx}${plusK(-k)}`], [`${la}(x)${plusK(k, false)}`, `${Lx}${plusK(k)}`]];
    if (rng.chance(0.5)) {
      f = `${b}^x${plusK(k, false)}`; fF = `${b}ˣ${plusK(k)}`; key = 0;
      why = `Write y = ${fF} and swap x and y: x = ${b}ʸ${plusK(k)}. ${k > 0 ? `Take ${K} away` : `Add ${K}`} first, ${b}ʸ = ${inX(k)}, then the power, as a log: y = ${opts[0][1]}. ${wrong(opts[2][1])}`;
    } else {
      f = pa(-Math.sign(k)); fF = pe(-Math.sign(k)); key = 3;
      why = `Write y = ${fF} and swap x and y: x = ${b} to the power y${plusK(-k)}. The log undoes the power first, y${plusK(-k)} = ${Lx}, and then y = ${opts[3][1]}. `
        + `(The ${minus(-k)} is inside the power, so it is undone after the log, outside it: ${opts[1][1]} puts it back inside.)`;
    }
  } else if (menu === 'shift-power') {
    opts = [[pa(-Math.sign(k)), pe(-Math.sign(k))], [pa(Math.sign(k)), pe(Math.sign(k))],
      [`${b}^x${plusK(-k, false)}`, `${b}ˣ${plusK(-k)}`], [`${b}^x${plusK(k, false)}`, `${b}ˣ${plusK(k)}`]];
    if (rng.chance(0.5)) {
      f = `${la}(x)${plusK(k, false)}`; fF = `${Lx}${plusK(k)}`; key = 0;
      why = `Write y = ${fF} and swap x and y: x = ${Ly}${plusK(k)}. ${k > 0 ? `Take ${K} away` : `Add ${K}`} first, ${Ly} = ${inX(k)}, then the log, as a power: y = ${opts[0][1]}. ${wrong(opts[2][1])}`;
    } else {
      f = `${la}(x${plusK(-k, false)})`; fF = L(b, inX(k)); key = 3;
      why = `Write y = ${fF} and swap x and y: x = ${L(b, inX(k).replace('x', 'y'))}. The power undoes the log first, ${inX(k).replace('x', 'y')} = ${b}ˣ, and then y = ${opts[3][1]}. `
        + `(The ${minus(-k)} is inside the log, so it is undone after the power, outside it: ${opts[1][1]} puts it back inside.)`;
    }
  } else if (menu === 'scale-log') {
    opts = [[`${la}(x/${c})`, L(b, `x/${c}`)], [`${la}(${c}x)`, `${lname(b)}(${c}x)`], [`${la}(x)/${c}`, `(${Lx})/${c}`], [`${c}*${la}(x)`, `${c} ${Lx}`]];
    key = rng.int(0, 3);
    [f, fF, why] = [
      [`${c}*${b}^x`, `${c} · ${b}ˣ`, `x = ${c} · ${b}ʸ. Undo the ×${c} first, ${b}ʸ = x/${c}, then the power: y = ${opts[0][1]}. ${wrong(opts[2][1])}`],
      [`${b}^x/${c}`, `${b}ˣ/${c}`, `x = ${b}ʸ/${c}. Undo the ÷${c} first, ${b}ʸ = ${c}x, then the power: y = ${opts[1][1]}. ${wrong(opts[3][1])}`],
      [`${b}^(${c}x)`, powF(b, `${c}x`), `x = ${b} to the power ${c}y. The log undoes the power first, ${c}y = ${Lx}, then divide by ${c}: y = ${opts[2][1]}. ${wrong(opts[0][1])}`],
      [`${b}^(x/${c})`, `${b}^(x/${c})`, `x = ${b} to the power y/${c}. The log undoes the power first, y/${c} = ${Lx}, then multiply by ${c}: y = ${opts[3][1]}. ${wrong(opts[1][1])}`],
    ][key];
    why = `Write y = ${fF} and swap x and y: ${why}`;
  } else {
    opts = [[`${b}^(x/${c})`, `${b}^(x/${c})`], [`${b}^(${c}x)`, powF(b, `${c}x`)], [`${b}^x/${c}`, `${b}ˣ/${c}`], [`${c}*${b}^x`, `${c} · ${b}ˣ`]];
    key = rng.int(0, 3);
    [f, fF, why] = [
      [`${c}*${la}(x)`, `${c} ${Lx}`, `x = ${c} ${Ly}. Undo the ×${c} first, ${Ly} = x/${c}, then the log, as a power: y = ${opts[0][1]}. ${wrong(opts[2][1])}`],
      [`${la}(x)/${c}`, `(${Lx})/${c}`, `x = (${Ly})/${c}. Undo the ÷${c} first, ${Ly} = ${c}x, then the log, as a power: y = ${opts[1][1]}. ${wrong(opts[3][1])}`],
      [`${la}(${c}x)`, `${lname(b)}(${c}x)`, `x = ${lname(b)}(${c}y). The power undoes the log first, ${c}y = ${b}ˣ, then divide by ${c}: y = ${opts[2][1]}. ${wrong(opts[0][1])}`],
      [`${la}(x/${c})`, L(b, `x/${c}`), `x = ${L(b, `y/${c}`)}. The power undoes the log first, y/${c} = ${b}ˣ, then multiply by ${c}: y = ${opts[3][1]}. ${wrong(opts[1][1])}`],
    ][key];
    why = `Write y = ${fF} and swap x and y: ${why}`;
  }
  const order = rng.shuffle([0, 1, 2, 3]);
  return {
    prompt: [T.prose(`f(x) = ${fF}. Which is f⁻¹(x)?`)],
    text: `log inverse: f(x) = ${f}; options ${order.map((j, i) => `${optionIds[i]}: ${opts[j][0]}`).join(' | ')}`,
    answer: { type: 'choice', value: optionIds[order.indexOf(key)], options: order.map((j, i) => ({ id: optionIds[i], label: opts[j][1] })) },
    visual: null,
    explain: `${why} So f⁻¹(x) = ${opts[key][1]}.`,
  };
}

// requiem: catalogue/content/one-input-per-level
// Each question shape keeps one box, and the question says which: "which
// point" a pair, "at what x", "what is a" and "what number" a number, "write
// it with x/y" a set, and "which", "how" or "rise or fall" a choice.
const LOG_FN_SHAPES = [
  [lfReflect, 10], [lfIntercept, 9], [lfHeight, 9], [lfRange, 9], [(rng) => lfDomain(rng, 'domain'), 9],
  [(rng) => lfDomain(rng, 'asymptote'), 8], [lfRises, 9], [lfMirror, 8], [lfStretch, 8], [lfWhich, 9], [lfInverse, 12],
];
function logFunctions(rng) {
  let r = rng.int(1, LOG_FN_SHAPES.reduce((s, [, w]) => s + w, 0));
  for (const [make, w] of LOG_FN_SHAPES) {
    r -= w;
    if (r <= 0) return make(rng);
  }
  throw new Error('unreachable');
}

const CONTENT = [asExponent, evaluate, laws, changeBase, expEquation, logEquation, logFunctions];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
