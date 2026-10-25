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

function asExponent(rng) {
  for (;;) {
    const b = rng.pick(BASES);
    if (rng.chance(0.5)) {
      // log form given, power form chosen.
      const e = rng.int(-3, 5);
      const v = powQ({ n: b, d: 1 }, e);
      if (v.n > 20000) continue;
      const claims = [
        powerClaim(b, e, v),
        powerClaim(e, b, v),
        powerClaim(v, e, { n: b, d: 1 }),
        e !== 0 ? powerClaim(b, -e, v) : powerClaim(b, 1, { n: 0, d: 1 }),
      ];
      if (!claims[0][2] || claims.slice(1).some(([, , ok]) => ok)) continue;
      const shown = `log${sub(b)} ${v.d === 1 ? v.n : `(${Qs(v)})`} = ${minus(e)}`;
      const ask = choice([T.prose(`Which equation says the same thing as ${shown}?`)],
        `log form: log_${b}(${Qs(v)}) = ${e}`, claims.map(([t, l]) => [t, l]),
        `A logarithm is an exponent: ${shown} says that ${b} raised to the power ${minus(e)} is ${fx(v.n, v.d)}. So ${claims[0][1]}.`);
      if (ask) return ask(rng);
      continue;
    }
    // power form given, log form chosen: e from 2 so every base shown is a real base.
    const e = rng.int(2, 5);
    const v = powQ({ n: b, d: 1 }, e);
    if (v.n > 20000) continue;
    const claims = [logClaim(b, v, e), logClaim(e, v, b), logClaim(v.n, { n: b, d: 1 }, e), logClaim(b, { n: e, d: 1 }, v.n)];
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
  const kind = rng.pick(['whole', 'whole', 'negative', 'root', 'ratio', 'ratio', 'ln', 'common']);
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
    const form = rng.pick(['power', 'power', 'over', 'root', 'one']);
    if (form === 'one') return evaluated('ln 1', 'ln(1)', 0, 1, 'ln is the log to base e, and e⁰ = 1.');
    if (form === 'root') {
      const k = rng.int(2, 3);
      const shown = k === 2 ? 'ln √e' : 'ln ∛e';
      return evaluated(shown, k === 2 ? 'ln(sqrt(e))' : 'ln(root(e, 3))', 1, k,
        `ln is the log to base e, and a ${k === 2 ? 'square' : 'cube'} root is the power 1/${k}: ${k === 2 ? '√e' : '∛e'} is e to the power 1/${k}.`);
    }
    const k = rng.int(2, 12);
    const over = form === 'over';
    return evaluated(over ? `ln(1/e${sup(k)})` : `ln e${sup(k)}`, over ? `ln(1/e^${k})` : `ln(e^${k})`, over ? -k : k, 1,
      `ln is the log to base e, so it asks what power of e this is${over ? `: 1/e${sup(k)} = e${sup(-k)}` : ''}.`);
  }
  // common: log alone is base 10.
  const k = rng.int(-6, 7);
  const arg = k >= 0 ? String(10 ** k) : (10 ** k).toFixed(-k);
  return evaluated(`log ${arg}`, `log(${arg})`, k, 1,
    `log with no base written is base 10${k < 0 ? `, and ${arg} is 1/${10 ** -k}` : ''}: 10${sup(k)} = ${arg}.`);
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
  const kind = rng.pick(['product', 'quotient', 'quotient', 'power', 'three', 'condense', 'condense']);
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
  // condense: chosen. Each wrong option is a law misused: the number in
  // front left as a factor, a minus read as a plus, a sum of logs read as
  // the log of a sum.
  for (;;) {
    const b = rng.pick([2, 3, 4, 5, 7, 10, 'e']), k = rng.int(2, 4);
    const [x, y, z] = rng.pick(LETTERS);
    const n = lname(b), an = aname(b), K = sup(k);
    const pattern = rng.int(0, 3);
    const P = [
      { shown: `${k} ${n} ${x} + ${n} ${y} − ${n} ${z}`, text: `${k}${an}(${x}) + ${an}(${y}) - ${an}(${z})`,
        opts: [[`${x}^${k}*${y}/${z}`, `${x}${K}${y}/${z}`], [`${k}*${x}*${y}/${z}`, `${k}${x}${y}/${z}`],
          [`${x}^${k}*${y}*${z}`, `${x}${K}${y}${z}`], [`${x}^${k} + ${y} - ${z}`, `${x}${K} + ${y} − ${z}`]],
        why: `The ${k} in front becomes a power, ${k} ${n} ${x} = ${n} ${x}${K}; adding multiplies and subtracting divides.` },
      { shown: `${n} ${x} − ${k} ${n} ${y}`, text: `${an}(${x}) - ${k}${an}(${y})`,
        opts: [[`${x}/${y}^${k}`, `${x}/${y}${K}`], [`${x}/(${k}*${y})`, `${x}/(${k}${y})`],
          [`${x}*${y}^${k}`, `${x}${y}${K}`], [`${x} - ${y}^${k}`, `${x} − ${y}${K}`]],
        why: `The ${k} in front becomes a power, ${k} ${n} ${y} = ${n} ${y}${K}, and subtracting divides by it.` },
      { shown: `${n} ${x} + ${k} ${n} ${y}`, text: `${an}(${x}) + ${k}${an}(${y})`,
        opts: [[`${x}*${y}^${k}`, `${x}${y}${K}`], [`${k}*${x}*${y}`, `${k}${x}${y}`],
          [`${x}/${y}^${k}`, `${x}/${y}${K}`], [`${x} + ${y}^${k}`, `${x} + ${y}${K}`]],
        why: `The ${k} in front becomes a power, ${k} ${n} ${y} = ${n} ${y}${K}, and adding multiplies.` },
      { shown: `${k} ${n} ${x} − ${n} ${y} − ${n} ${z}`, text: `${k}${an}(${x}) - ${an}(${y}) - ${an}(${z})`,
        opts: [[`${x}^${k}/(${y}*${z})`, `${x}${K}/(${y}${z})`], [`${x}^${k}*${z}/${y}`, `${x}${K}${z}/${y}`],
          [`${k}*${x}/(${y}*${z})`, `${k}${x}/(${y}${z})`], [`${x}^${k} - ${y} - ${z}`, `${x}${K} − ${y} − ${z}`]],
        why: `The ${k} in front becomes a power, ${k} ${n} ${x} = ${n} ${x}${K}, and each log subtracted divides by its number.` },
    ][pattern];
    const opts = P.opts.map(([t, l]) => [`${an}(${t})`, `${n}(${l})`]);
    const ask = choice([T.prose(`Write as a single logarithm: ${P.shown}`)], `condense: ${P.text}`, opts,
      `${P.why} So ${opts[0][1]}.`);
    if (ask) return ask(rng);
  }
}

// --- ln & Change of Base ---------------------------------------------------

function changeBase(rng) {
  const kind = rng.pick(['change', 'change', 'which', 'inverse', 'inverse']);
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
    for (;;) {
      const b = rng.pick([2, 3, 4, 5, 6, 7, 9]), v = rng.int(2, 60);
      if (v === b || isPowerOf(v, b) || isPowerOf(b, v)) continue;
      const f = rng.pick(['ln', 'log']);
      const opts = [
        [`${f}(${v})/${f}(${b})`, `${f} ${v} / ${f} ${b}`],
        [`${f}(${b})/${f}(${v})`, `${f} ${b} / ${f} ${v}`],
        [`${f}(${v}) - ${f}(${b})`, `${f} ${v} − ${f} ${b}`],
        [`${f}(${v})/${b}`, `${f} ${v} / ${b}`],
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

function expEquation(rng) {
  if (rng.chance(0.5)) {
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

const CONTENT = [asExponent, evaluate, laws, changeBase, expEquation, logEquation];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
