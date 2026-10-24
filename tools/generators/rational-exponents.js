/**
 * Catalogue authoring tool: builds the problem library for rational exponents.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 *
 * Every `text` is the expression in plain ASCII after a prefix: `value:` where
 * the answer is its value, `as a power:` where the answer is one power of a
 * letter. scripts/check-answers.py works each out by its own route.
 */
import * as T from '../terms.js';
import { minus } from '../../web/ui/dom.js';
import { previewOf } from '../../web/ui/express.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/rational-exponents.js';

const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const sup = (n) => String(n).replace(/[-\d]/g, (c) => SUP[c]);
const ROOT = { 2: '√', 3: '∛', 4: '∜' };
const rootOf = (n, x) => `${ROOT[n] ?? `${sup(n)}√`}${String(x).startsWith('−') ? `(${x})` : x}`;
/** A number about to be raised, bracketed if negative: 3⁵, (−2)⁵. */
const raised = (x) => (x < 0 ? `(${minus(x)})` : String(x));
const NTH = { 2: 'square', 3: 'cube', 4: 'fourth', 5: 'fifth', 6: 'sixth' };

const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
/** A fraction in lowest terms, the sign on top. */
const ratio = (n, d) => { const g = gcd(n, d) * Math.sign(d); return { n: n / g, d: d / g }; };
const fracText = ({ n, d }) => (d === 1 ? minus(n) : `${minus(n)}/${d}`);
/** An exponent as typed: 3, (-2), (3/4), (-1/2). */
const expText = ({ n, d }) => (d === 1 ? (n < 0 ? `(${n})` : String(n)) : `(${n}/${d})`);
/** One power of a letter as typed, the answer's form: x, x^3, x^(3/4). */
const powerOf = (v, e) => (e.n === e.d ? v : `${v}^${expText(e)}`);
const shown = (v, e) => powerOf(v, e).replace(/-/g, '−');

function asks(src) {
  const r = previewOf(src);
  if (!r.ok) throw new Error(`rational-exponents: cannot draw "${src}" — ${r.error}`);
  return [...r.terms, T.op('='), T.blank()];
}

/** A whole-number root r and an index n with r^n no bigger than `cap`. */
function rootAndIndex(rng, indices, cap, lo = 2) {
  const n = rng.pick(indices);
  const rs = [];
  for (let r = lo; r ** n <= cap; r++) rs.push(r);
  return { n, r: rng.pick(rs) };
}

/**
 * A minus or a number in front, sometimes: the power goes first, so −16^(1/4)
 * is −2, the root of 16 with its sign changed -- not a root of −16.
 */
function outside(rng, src, value) {
  const pick = rng.pick(['none', 'none', 'none', 'minus', 'times']);
  if (pick === 'minus') {
    return { src: `-${src}`, value: -value,
      how: ` The minus is outside the power, so it waits: −${value}.` };
  }
  if (pick === 'times') {
    const k = rng.int(2, 5);
    return { src: `${k}*${src}`, value: k * value, how: ` Then times ${k}: ${minus(k * value)}.` };
  }
  return { src, value, how: '' };
}

function half(rng) {
  const r = rng.int(2, 20), b = r * r;
  const decimal = rng.chance(0.2);
  const o = outside(rng, `${b}^${decimal ? '0.5' : '(1/2)'}`, r);
  return {
    prompt: asks(o.src),
    text: `value: ${o.src}`,
    answer: { type: 'int', value: o.value },
    visual: null,
    explain: `${decimal ? '0.5 is ½, and a' : 'A'} power of ½ is a square root: two of them multiply to `
      + `${b}¹, so each is √${b}. ${r} × ${r} = ${b}, so √${b} = ${r}.${o.how}`,
  };
}

function others(rng) {
  const { n, r } = rootAndIndex(rng, [3, 3, 4, 5, 6], 2000);
  const negative = n % 2 === 1 && rng.chance(0.25);
  const b = (negative ? -1 : 1) * r ** n, root = negative ? -r : r;
  const o = negative ? { src: `(${b})^(1/${n})`, value: root, how: '' } : outside(rng, `${b}^(1/${n})`, root);
  return {
    prompt: asks(o.src),
    text: `value: ${o.src}`,
    answer: { type: 'int', value: o.value },
    visual: null,
    explain: `A power of 1/${n} is a ${NTH[n]} root: ${rootOf(n, minus(b))}. `
      + `${minus(root)} multiplied ${n} times is ${minus(b)}${negative ? ', since an odd number of negatives is negative' : ''}, `
      + `so ${rootOf(n, minus(b))} = ${minus(root)}.${o.how}`,
  };
}

function rootThenPower(rng) {
  const d = rng.pick([2, 2, 3, 3, 4, 5]);
  const m = rng.pick([2, 3, 4, 5].filter((k) => gcd(k, d) === 1));
  const rs = [];
  for (let r = 2; r ** d <= 3200 && r ** m <= 2000; r++) rs.push(r);
  if (!rs.length) return rootThenPower(rng);
  const r = rng.pick(rs);
  const negative = d % 2 === 1 && rng.chance(0.2);
  const b = (negative ? -1 : 1) * r ** d, root = negative ? -r : r, out = root ** m;
  const o = negative ? { src: `(${b})^(${m}/${d})`, value: out, how: '' } : outside(rng, `${b}^(${m}/${d})`, out);
  return {
    prompt: asks(o.src),
    text: `value: ${o.src}`,
    answer: { type: 'int', value: o.value },
    visual: null,
    explain: `The bottom of the power, ${d}, is the root: ${rootOf(d, minus(b))} = ${minus(root)}. `
      + `The top, ${m}, is the power: ${raised(root)}${sup(m)} = ${minus(out)}. `
      + `Root first keeps the numbers small; ${raised(b)}${sup(m)} would come to the same in the end.${o.how}`,
  };
}

function negative(rng) {
  const d = rng.pick([2, 2, 3, 3, 4]);
  const m = rng.pick([1, 1, 2, 3].filter((k) => gcd(k, d) === 1));
  let p, q;
  if (rng.chance(0.4)) {
    // A fraction for a base, which turns over.
    const opts = [];
    for (let a = 2; a ** d <= 300; a++) for (let c = 1; c ** d <= 300; c++) {
      if (a !== c && gcd(a, c) === 1 && (a ** m <= 300) && (c ** m <= 300)) opts.push([a, c]);
    }
    [p, q] = rng.pick(opts);
  } else {
    const { r } = rootAndIndex(rng, [d], 1000);
    if (r ** m > 1000) return negative(rng);
    [p, q] = [r, 1];
  }
  const base = q === 1 ? String(p ** d) : `(${p ** d}/${q ** d})`;
  const src = `${base}^(-${m === 1 ? `1/${d}` : `${m}/${d}`})`;
  const out = ratio(q ** m, p ** m);
  const shownBase = q === 1 ? String(p ** d) : `${p ** d}/${q ** d}`;
  const flipped = q === 1 ? `1/${p ** d}` : `${q ** d}/${p ** d}`;
  return {
    prompt: asks(src),
    text: `value: ${src}`,
    answer: { type: 'frac', value: out },
    visual: null,
    explain: `The minus means one over: turn ${shownBase} over to ${flipped}, and the power is now ${m}/${d}. `
      + `The ${NTH[d]} root: ${q === 1 ? `${rootOf(d, p ** d)} = ${p}` : `${rootOf(d, p ** d)} = ${p} and ${rootOf(d, q ** d)} = ${q}`}`
      + `${m === 1 ? '' : `, then the power ${m}`}. So ${fracText(out)}.`,
  };
}

/** A root of a power of the letter, rewritten as one power. */
function toPower(rng) {
  const v = rng.pick(['x', 'x', 'a', 'y', 'n']);
  const shape = rng.pick(['sqrt', 'root', 'root', 'outside', 'over']);
  const n = shape === 'sqrt' ? 2 : rng.int(3, 5);
  const k = rng.int(1, 7);
  if (k === n) return toPower(rng);
  const inside = k === 1 ? v : `${v}^${k}`;
  let src, e, how;
  if (shape === 'outside') {
    src = `(root(${n}, ${v}))^${k}`;
    e = ratio(k, n);
    how = `The ${NTH[n]} root is the power 1/${n}, raised to the ${k}: 1/${n} × ${k} = ${k}/${n}`;
  } else {
    src = shape === 'sqrt' ? `sqrt(${inside})` : `root(${n}, ${inside})`;
    if (shape === 'over') src = `1/${src}`;
    e = ratio(shape === 'over' ? -k : k, n);
    how = `The power inside goes on top, ${k}; the root goes underneath, ${n}: ${k}/${n}`;
  }
  const reduced = Math.abs(e.n) !== k || e.d !== n;
  return {
    prompt: [...asks(src), T.prose(`as one power of ${v}`)],
    text: `as a power: ${src}`,
    answer: { type: 'expr', value: powerOf(v, e) },
    visual: null,
    explain: `${how}${reduced ? `, which is ${fracText({ n: Math.abs(e.n), d: e.d })}` : ''}`
      + `${shape === 'over' ? '. One over makes the power negative' : ''}. So ${shown(v, e)}.`,
  };
}

const EXPS = [];
for (const d of [2, 3, 4, 6]) for (let n = 1; n <= 5; n++) if (gcd(n, d) === 1) EXPS.push({ n, d });
const add = (a, b, s = 1) => ratio(a.n * b.d + s * b.n * a.d, a.d * b.d);
const plain = (e) => (e.d === 1 ? String(e.n) : `${e.n}/${e.d}`);

/** The exponent rules, with fractions for powers. */
function rules(rng) {
  const v = rng.pick(['x', 'x', 'a', 'y']);
  const shape = rng.pick(['times', 'times', 'over', 'power', 'root']);
  const a = rng.pick(EXPS), b = rng.pick(EXPS);
  let src, e, how;
  const common = (op) => {
    const l = a.d * b.d / gcd(a.d, b.d);
    return a.d === b.d ? '' : ` = ${a.n * l / a.d}/${l} ${op} ${b.n * l / b.d}/${l}`;
  };
  if (shape === 'times') {
    src = `${v}^${expText(a)}*${v}^${expText(b)}`;
    e = add(a, b);
    how = `Multiplying: add the powers. ${plain(a)} + ${plain(b)}${common('+')} = ${plain(e)}`;
  } else if (shape === 'over') {
    src = `${v}^${expText(a)}/${v}^${expText(b)}`;
    e = add(a, b, -1);
    how = `Dividing: take the powers away. ${plain(a)} − ${plain(b)}${common('−')} = ${plain(e).replace('-', '−')}`;
  } else if (shape === 'power') {
    const k = rng.chance(0.5) ? { n: rng.int(2, 4), d: 1 } : rng.pick(EXPS);
    src = `(${v}^${expText(a)})^${expText(k)}`;
    e = ratio(a.n * k.n, a.d * k.d);
    how = `A power of a power: multiply. ${plain(a)} × ${plain(k)} = ${plain(e)}`;
  } else {
    // A root beside a power: the root has to become a power first.
    const n = rng.pick([2, 3]);
    const r = { n: 1, d: n };
    const times = rng.chance(0.6);
    src = times ? `${n === 2 ? `sqrt(${v})` : `root(3, ${v})`}*${v}^${expText(b)}`
      : `${v}^${expText(b)}/${n === 2 ? `sqrt(${v})` : `root(3, ${v})`}`;
    e = add(b, r, times ? 1 : -1);
    how = `${rootOf(n, v)} is ${v} to the 1/${n}. ${times ? 'Multiplying: add' : 'Dividing: take away'} the powers. `
      + `${plain(b)} ${times ? '+' : '−'} 1/${n} = ${plain(e).replace('-', '−')}`;
  }
  if (e.n === 0 || e.d > 12) return rules(rng);
  return {
    prompt: [...asks(src), T.prose(`as one power of ${v}`)],
    text: `as a power: ${src}`,
    answer: { type: 'expr', value: powerOf(v, e) },
    visual: null,
    explain: `${how}. So ${shown(v, e)}.`,
  };
}

/** Two powers with the same fraction, whose bases only come out whole together. */
function combine(rng) {
  const shape = rng.pick(['square', 'square', 'cube', 'quotient', 'whole']);
  const pow = (d) => rng.pick(d === 2 ? [1, 1, 1, 3] : [1, 1, 2]);
  let a, b, d, op, base;
  if (shape === 'square') {
    const s = rng.pick([2, 3, 5, 6, 7]), u = rng.int(1, 4), w = rng.int(1, 3);
    if (u === w) return combine(rng);
    [a, b, d, op, base] = [s * u * u, s * w * w, 2, '*', s * u * w];
  } else if (shape === 'cube') {
    const s = rng.pick([2, 3]), u = rng.int(1, 2), w = rng.int(1, 2);
    [a, b, d, op, base] = [s * u ** 3, s * s * w ** 3, 3, '*', s * u * w];
  } else if (shape === 'quotient') {
    d = rng.pick([2, 2, 3]);
    const s = rng.pick(d === 2 ? [2, 3, 5, 6, 7] : [2, 3, 4]), u = rng.int(2, d === 2 ? 6 : 4);
    [a, b, op, base] = [s * u ** d, s, '/', u];
  } else {
    const u = rng.int(2, 9), w = rng.int(2, 9);
    [a, b, d, op, base] = [u * u, w * w, 2, '*', u * w];
  }
  const m = pow(d);
  const out = base ** m;
  if (out > 1000) return combine(rng);
  const e = m === 1 ? `(1/${d})` : `(${m}/${d})`;
  const src = `${a}^${e}${op}${b}^${e}`;
  const together = op === '*' ? a * b : a / b;
  const finish = m === 1 ? '' : `, and to the ${m}: ${out}`;
  const explain = shape === 'whole'
    ? `Each is whole on its own: √${a} = ${Math.sqrt(a)} and √${b} = ${Math.sqrt(b)}, so ${Math.sqrt(a)} × ${Math.sqrt(b)}`
      + `${finish ? ` = ${base}${finish}` : ` = ${out}`}. Putting them together first gives the same: √${together} = ${base}.`
    : `Neither ${a} nor ${b} has a whole ${NTH[d]} root, but the same power of each can go together: `
      + `${a} ${op === '*' ? '×' : '÷'} ${b} = ${together}, and ${rootOf(d, together)} = ${base}${finish}. So ${out}.`;
  return {
    prompt: asks(src),
    text: `value: ${src}`,
    answer: { type: 'int', value: out },
    visual: null,
    explain,
  };
}

const CONTENT = [half, others, rootThenPower, negative, toPower, rules, combine];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
