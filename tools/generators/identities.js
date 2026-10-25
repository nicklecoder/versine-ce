/**
 * Catalogue authoring tool: builds the problem library for identities.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 *
 * Expressions are written once, in ASCII (`sin(t)^2 + cos(t)^2`, t for θ),
 * and drawn from that for the student (sin²θ + cos²θ), so what the checker
 * reads is exactly what is shown. scripts/check-answers.py evaluates every
 * option at several angles: a "simplify" or proof question must have exactly
 * one option equal to the expression (or to the proof's last line), and a
 * value is worked again at an angle placed in its quadrant.
 */
import * as T from '../terms.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/identities.js';
import { fracAnswer, fracText, reduce } from './chance.js';
import { rootAnswer, rootText, piText, angleText, fnText, exactTrig } from './trig.js';

const minus = (s) => String(s).replace(/-/g, '−');
const ROMAN = ['', 'I', 'II', 'III', 'IV'];
const optionIds = ['a', 'b', 'c', 'd'];

// ── Expressions: evaluated, compared and drawn ──────────────────────────

const FN = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan,
  sec: (x) => 1 / Math.cos(x), csc: (x) => 1 / Math.sin(x), cot: (x) => Math.cos(x) / Math.sin(x), sqrt: Math.sqrt,
};

/** x^n as JavaScript, the base found by matching brackets: (a)^2 → ((a)**2). */
function powers(s) {
  let i;
  while ((i = s.indexOf('^')) > -1) {
    let j = i - 1;
    if (s[j] === ')') {
      let depth = 0;
      for (; j >= 0; j--) { if (s[j] === ')') depth++; if (s[j] === '(') depth--; if (depth === 0) break; }
      while (j > 0 && /[a-z]/.test(s[j - 1])) j--;
    } else {
      while (j > 0 && /[\w.]/.test(s[j - 1])) j--;
    }
    const exp = s.slice(i + 1).match(/^\d+/)[0];
    s = `${s.slice(0, j)}(${s.slice(j, i)}**${exp})${s.slice(i + 1 + exp.length)}`;
  }
  return s;
}
const compiled = new Map();
function fnOf(expr) {
  if (!compiled.has(expr)) {
    // eslint-disable-next-line no-new-func
    const f = new Function(...Object.keys(FN), 'pi', 't', 'a', 'b', `return ${powers(expr)};`);
    compiled.set(expr, (t, a = 0, b = 0) => f(...Object.values(FN), Math.PI, t, a, b));
  }
  return compiled.get(expr);
}
const TESTS = [0.37, 0.91, 1.23, 2.05, 2.71, 4.0, 5.3];
// α and β beside each θ, for the expressions in two angles; the rest ignore them.
const AB = [[0.29, 1.13], [1.41, 0.62], [2.3, -0.77], [-0.95, 2.6], [3.7, 1.9], [0.83, -2.2], [5.1, 0.44]];
const same = (e1, e2) => TESTS.every((t, i) => { const x = fnOf(e1)(t, ...AB[i]), y = fnOf(e2)(t, ...AB[i]); return Math.abs(x - y) <= 1e-9 * Math.max(1, Math.abs(x)); });

const SUP = { 2: '²', 3: '³', 4: '⁴' };
const FNS = '(sin|cos|tan|sec|csc|cot)';
/** The expression as the student reads it: sin²θ + cos²θ, 2 sin θ cos θ, sin(π/2 − θ). */
function pretty(s, angle = null) {
  // A single token goes bare, sin π; a compound one keeps its brackets, sin(π/2 − θ).
  let out = s.replace(new RegExp(`${FNS}\\(pi\\)`, 'g'), '$1 π').replace(/pi/g, 'π');
  out = out.replace(new RegExp(`${FNS}\\(t\\)\\^(\\d)`, 'g'), (_, f, n) => `${f}${SUP[n]}θ`);
  out = out.replace(new RegExp(`${FNS}\\((\\d+)\\*t\\)\\^(\\d)`, 'g'), (_, f, k, n) => `${f}${SUP[n]}${k}θ`);
  out = out.replace(new RegExp(`${FNS}\\(([ab])\\)\\^(\\d)`, 'g'), (_, f, x, n) => `${f}${SUP[n]}${x}`);
  out = out.replace(new RegExp(`${FNS}\\(([^()]*)\\)\\^(\\d)`, 'g'), (_, f, x, n) => `${f}${SUP[n]}(${x})`);
  out = out.replace(/\bt\^(\d)/g, (_, n) => `θ${SUP[n]}`);
  out = out.replace(new RegExp(`${FNS}\\(t\\)`, 'g'), '$1 θ');
  out = out.replace(new RegExp(`${FNS}\\(([ab])\\)`, 'g'), '$1 $2');
  out = out.replace(new RegExp(`${FNS}\\((\\d+)\\*t\\)`, 'g'), '$1 $2θ');
  out = out.replace(/\b(\d+)\*t\b/g, '$1θ');
  out = out.replace(/\bt\b/g, 'θ').replace(/\ba\b/g, 'α').replace(/\bb\b/g, 'β');
  out = out.replace(/sqrt\((\d+)\)/g, '√$1').replace(/sqrt\(/g, '√(');
  out = out.replace(/\)\^(\d)/g, (_, n) => `)${SUP[n]}`);
  out = out.replace(/\*(?=\d)/g, '·').replace(/\*/g, ' ');
  out = out.replace(/-/g, '−');
  if (angle !== null) out = out.replace(/ θ/g, angle.startsWith('(') ? angle : ` ${angle}`).replace(/θ/g, angle);
  return out;
}

/** Fill a template's K (and D, twice K): K*sin(t) is sin(t) at 1 and 3*sin(t) at 3. */
const fill = (template, k) => template.replace(/D\*/g, `${2 * k}*`).replace(/D/g, String(2 * k))
  .replace(/K\*/g, k === 1 ? '' : `${k}*`).replace(/K/g, String(k));
/** −e, written: −K*sin(t) for K*sin(t), and back. */
const negate = (e) => (e.startsWith('-') ? e.slice(1) : e === '0' ? '0' : `-${e}`);

// requiem: catalogue/content/identity-choices-have-one-equal-option
// requiem: catalogue/content/identity-decoys-are-misconceptions
/**
 * A choice of four: the answer and three options not equal to it, taken
 * first from the misconceptions this expression invites (2 sin θ for
 * sin 2θ), then its negative, then the general pool. None equals the
 * expression or another option.
 */
function choices(rng, expr, answer, pool, targeted = []) {
  const wrong = [];
  const fits = (e) => !same(e, expr) && !wrong.some((w) => same(w, e)) && !/NaN/.test(String(fnOf(e)(1)));
  for (const e of [...rng.shuffle(targeted), negate(answer), ...rng.shuffle(pool)]) if (wrong.length < 3 && fits(e)) wrong.push(e);
  if (wrong.length < 3) return null;
  const all = rng.shuffle([answer, ...wrong]);
  return { opts: all.map((e, i) => ({ id: optionIds[i], e })), right: optionIds[all.indexOf(answer)] };
}

// requiem: catalogue/content/decoys-cross-two-slips
/**
 * The slips an answer can be read with, each a rewrite of the whole option:
 * the partner function (sin²θ for cos²θ, cot θ for tan θ, csc θ for sec θ),
 * the reciprocal, a square dropped or added, and a sign flipped -- the one in
 * the middle of a sum when there is one (1 + 2 sin²θ for 1 − 2 sin²θ), the
 * one in front otherwise. Null where the slip changes nothing.
 */
const PARTNER = { sin: 'cos', cos: 'sin', tan: 'cot', cot: 'tan', sec: 'csc', csc: 'sec' };
const RECIPROCAL = { sin: 'csc', csc: 'sin', cos: 'sec', sec: 'cos', tan: 'cot', cot: 'tan' };
const AXES = {
  swap: (e) => e.replace(/\b(sin|cos|tan|cot|sec|csc)\(/g, (_, f) => `${PARTNER[f]}(`),
  recip: (e) => e.replace(/\b(sin|cos|tan|cot|sec|csc)\(/g, (_, f) => `${RECIPROCAL[f]}(`),
  square: (e) => (/\)\^2/.test(e) ? e.replace(/\)\^2/g, ')') : e.replace(/(\b(?:sin|cos|tan|cot|sec|csc)\([^()]*\))(?!\^)/g, '$1^2')),
  sign: (e) => {
    // A top-level + or −, outside every bracket.
    let depth = 0;
    for (let i = 1; i < e.length - 2; i++) {
      if (e[i] === '(') depth++;
      else if (e[i] === ')') depth--;
      else if (depth === 0 && e[i - 1] === ' ' && e[i + 1] === ' ' && (e[i] === '-' || e[i] === '+')) return e.slice(0, i) + (e[i] === '-' ? '+' : '-') + e.slice(i + 1);
    }
    return negate(e);
  },
};
const AXIS_PAIRS = [['swap', 'square'], ['swap', 'sign'], ['target', 'sign'], ['target', 'swap'], ['square', 'sign'], ['recip', 'sign'], ['target', 'square']];

/**
 * Four options from two slips crossed: the answer, each slip alone, and both
 * together, so the answer is not the option nearest all the others. One slip
 * may be a misconception listed for the expression (2 sin θ for sin 2θ), with
 * the other slip then applied to it too. Null when no pair gives four options
 * that are distinct and wrong but for the answer.
 */
function crossedChoices(rng, expr, answer, targeted) {
  const finite = (e) => { try { return Number.isFinite(fnOf(e)(1.1)) && Number.isFinite(fnOf(e)(0.37)); } catch { return false; } };
  for (const [a, b] of rng.shuffle(AXIS_PAIRS.slice())) {
    const B = AXES[b];
    const tries = a === 'target' ? rng.shuffle(targeted.slice()).map((d) => [d, B(answer), B(d)]) : [[AXES[a](answer), B(answer), B(AXES[a](answer))]];
    for (const wrong of tries) {
      const all = [answer, ...wrong];
      if (!all.every(finite) || wrong.some((w) => w === answer || same(w, expr))) continue;
      if (all.some((x, i) => all.some((y, j) => j > i && (x === y || same(x, y))))) continue;
      const shown = rng.shuffle(all.slice());
      return { opts: shown.map((e, i) => ({ id: optionIds[i], e })), right: optionIds[shown.indexOf(answer)] };
    }
  }
  return null;
}

function simplifyProblem(rng, bank, pool, { ks = [1, 1, 1, 2, 3, 4, 5], lead = 'Simplify', ask = null } = {}) {
  for (;;) {
    const [template, answerT, why, trap] = rng.pick(bank);
    const k = rng.pick(ks);
    const expr = fill(template, k), answer = fill(answerT, k);
    if (!same(expr, answer)) throw new Error(`${expr} is not ${answer}`);
    const targeted = (DECOYS[template] ?? []).map((p) => fill(p, k));
    if (!DECOYS[template]) throw new Error(`no targeted decoys for ${template}`);
    const c = crossedChoices(rng, expr, answer, targeted) ?? choices(rng, expr, answer, pool.map((p) => fill(p, k)), targeted);
    if (!c) continue;
    return {
      prompt: [T.prose(ask ? ask(pretty(expr)) : `${lead}: ${pretty(expr)}`)],
      text: `trig simplify: ${expr}; options ${c.opts.map((o) => `${o.id}: ${o.e}`).join(' | ')}`,
      answer: { type: 'choice', value: c.right, options: c.opts.map((o) => ({ id: o.id, label: pretty(o.e) })) },
      visual: null,
      explain: `${k === 1 && why.includes(pretty(expr)) ? why : `${why}: ${pretty(expr)} = ${pretty(answer)}`}. (${trap}) So ${pretty(answer)}.`,
    };
  }
}

/**
 * The slips each expression invites, by its template: a dropped square, the
 * cofunction or reciprocal swapped in, a sign flipped, a 2 put in the wrong
 * place. They come before the general pool, so most options are a mistake
 * a student actually makes, not filler.
 */
const DECOYS = {
  // Pythagorean
  'K - K*sin(t)^2': ['K*cos(t)', '-K*cos(t)^2', 'K*sin(t)^2', 'K*tan(t)^2'],
  'K - K*cos(t)^2': ['-K*sin(t)^2', 'K*sin(t)', 'K*cos(t)^2', 'K*cot(t)^2'],
  'K*sec(t)^2 - K': ['K*cot(t)^2', 'K*tan(t)', '-K*tan(t)^2', 'K*cos(t)^2'],
  'K*csc(t)^2 - K': ['K*tan(t)^2', 'K*cot(t)', '-K*cot(t)^2', 'K*sin(t)^2'],
  'K + K*tan(t)^2': ['K', 'K*csc(t)^2', 'K*sec(t)', 'K*cos(t)^2'],
  'K + K*cot(t)^2': ['K*sec(t)^2', 'K', 'K*csc(t)', 'K*sin(t)^2'],
  'K*sin(t)^2 + K*cos(t)^2': ['D', '0', '-K'],
  'K*sec(t)^2 - K*tan(t)^2': ['0', '-K', 'K*cos(t)^2'],
  'K*csc(t)^2 - K*cot(t)^2': ['-K', '0', 'K*sin(t)^2'],
  'K*(1 - cos(t))*(1 + cos(t))': ['K*cos(t)^2', '-K*sin(t)^2', 'K*sin(t)'],
  'K*(1 - sin(t))*(1 + sin(t))': ['K*sin(t)^2', '-K*cos(t)^2', 'K*cos(t)'],
  'K*cos(t)^2 - K': ['K*sin(t)^2', '-K*cos(t)^2', '-K*sin(t)'],
  'K*sin(t)^2 - K': ['K*cos(t)^2', '-K*sin(t)^2', '-K*cos(t)'],
  'K*tan(t)^2 - K*sec(t)^2': ['K', '0', '-K*tan(t)^2'],
  'K*(sec(t) - 1)*(sec(t) + 1)': ['K*sec(t)^2', 'K*cot(t)^2', '-K*tan(t)^2'],
  'K*cos(t)^2*(1 + tan(t)^2)': ['K*sin(t)^2', 'K*sec(t)^2', '0'],
  // Reciprocal & Quotient
  'K*sin(t)*csc(t)': ['K*sin(t)^2', '-K', 'K*csc(t)^2'],
  'K*cos(t)*sec(t)': ['K*cos(t)^2', '-K', 'K*tan(t)'],
  'K*tan(t)*cot(t)': ['K*tan(t)^2', '-K', '0'],
  'K*sin(t)/cos(t)': ['K*cot(t)', '-K*tan(t)', 'K*sec(t)'],
  'K*cos(t)/sin(t)': ['K*tan(t)', '-K*cot(t)', 'K*csc(t)'],
  'K*cos(t)*tan(t)': ['K*cos(t)', '-K*sin(t)', 'K*sec(t)'],
  'K*sin(t)*cot(t)': ['K*sin(t)', '-K*cos(t)', 'K*csc(t)'],
  'K*sin(t)*sec(t)': ['K*cot(t)', 'K', '-K*tan(t)'],
  'K*cos(t)*csc(t)': ['K*tan(t)', 'K', '-K*cot(t)'],
  'K*sec(t)/csc(t)': ['K*cot(t)', 'K', '-K*tan(t)'],
  'K*csc(t)/sec(t)': ['K*tan(t)', 'K', '-K*cot(t)'],
  'K*tan(t)/sin(t)': ['K*cos(t)', 'K*csc(t)', '-K*sec(t)'],
  'K*cot(t)/cos(t)': ['K*sin(t)', 'K*sec(t)', '-K*csc(t)'],
  'K/sec(t)': ['K*sec(t)', 'K*sin(t)', '-K*cos(t)'],
  'K/cot(t)': ['K*cot(t)', '-K*tan(t)', 'K*cos(t)'],
  'K*sin(t)/tan(t)': ['K*sec(t)', '-K*cos(t)', 'K*cot(t)'],
  'K*tan(t)*csc(t)': ['K*csc(t)', 'K*cos(t)', '-K*sec(t)'],
  'K*cot(t)*sec(t)': ['K*sec(t)', 'K*sin(t)', '-K*csc(t)'],
  // Even & Odd
  'K*sin(-t)': ['K*sin(t)', '-K*cos(t)', 'K*cos(t)'],
  'K*cos(-t)': ['-K*cos(t)', 'K*sin(t)', '-K*sin(t)'],
  'K*tan(-t)': ['K*tan(t)', '-K*cot(t)', 'K*cot(t)'],
  'K*sin(-t)*cos(-t)': ['K*sin(t)*cos(t)', '0', 'K*sin(t)^2'],
  'K*sin(-t)/cos(-t)': ['K*tan(t)', '-K*cot(t)', 'K*cot(t)'],
  'K*cos(-t)*sec(t)': ['-K', '0', 'K*cos(t)^2'],
  'K*tan(-t)*cot(t)': ['K', '0', '-K*tan(t)^2'],
  'K*sin(-t)^2': ['-K*sin(t)^2', 'K*cos(t)^2', '-K*cos(t)^2'],
  'K*sin(-t) + K*sin(t)': ['D*sin(t)', '-D*sin(t)', 'K'],
  'K*cos(-t) - K*cos(t)': ['-D*cos(t)', 'D*cos(t)', '-K'],
  'K*csc(-t)*sin(t)': ['K', '0', '-K*sin(t)'],
  'K*sec(-t)': ['-K*sec(t)', 'K*csc(t)', '-K*csc(t)'],
  'K*cot(-t)': ['K*cot(t)', '-K*tan(t)', 'K*tan(t)'],
  'K*cos(-t)^2 + K*sin(-t)^2': ['-K', '0', 'D'],
  '-K*sin(-t)': ['-K*sin(t)', 'K*cos(t)', '-K*cos(t)'],
  // Cofunction
  'K*sin(pi/2 - t)': ['-K*cos(t)', 'K*sin(t)', '-K*sin(t)'],
  'K*cos(pi/2 - t)': ['-K*sin(t)', 'K*cos(t)', '-K*cos(t)'],
  'K*tan(pi/2 - t)': ['K*tan(t)', '-K*cot(t)', '-K*tan(t)'],
  'K*cot(pi/2 - t)': ['K*cot(t)', '-K*tan(t)', '-K*cot(t)'],
  'K*sec(pi/2 - t)': ['K*sec(t)', '-K*csc(t)', 'K*sin(t)'],
  'K*csc(pi/2 - t)': ['K*csc(t)', '-K*sec(t)', 'K*cos(t)'],
  'K*sin(pi/2 - t)*sec(t)': ['K*tan(t)', '-K', 'K*cos(t)^2'],
  'K*cos(pi/2 - t)/sin(t)': ['K*cot(t)', '-K', '0'],
  'K*sin(pi/2 - t)/sin(t)': ['K', 'K*tan(t)', '-K*cot(t)'],
  'K*cos(pi/2 - t)/cos(t)': ['K', 'K*cot(t)', '-K*tan(t)'],
  'K*tan(pi/2 - t)*tan(t)': ['K*tan(t)^2', '-K', 'K*cot(t)^2'],
  'K*sec(pi/2 - t)*sin(t)': ['K*tan(t)', '-K', 'K*sin(t)^2'],
  'K*csc(pi/2 - t)*cos(t)': ['K*cot(t)', '-K', 'K*cos(t)^2'],
  'K*cot(pi/2 - t)*cos(t)': ['K*cos(t)', '-K*sin(t)', 'K*csc(t)'],
  // Double Angle
  '2*sin(t)*cos(t)': ['2*sin(t)', 'cos(2*t)', '-sin(2*t)', '2*sin(2*t)'],
  'cos(t)^2 - sin(t)^2': ['1', '-cos(2*t)', 'sin(2*t)', '2*cos(t)'],
  '1 - 2*sin(t)^2': ['-cos(2*t)', 'sin(2*t)', 'cos(t)^2', '2*cos(2*t)'],
  '2*cos(t)^2 - 1': ['-cos(2*t)', 'sin(2*t)', 'cos(t)^2', '2*cos(2*t)'],
  '(2*tan(t))/(1 - tan(t)^2)': ['2*tan(t)', 'sin(2*t)', '-tan(2*t)'],
  '4*sin(t)*cos(t)': ['sin(4*t)', '4*sin(2*t)', 'sin(2*t)', '2*sin(t)'],
  'sin(2*t)/(2*cos(t))': ['tan(t)', 'cos(t)', '-sin(t)', 'sin(t)^2'],
  'sin(2*t)/sin(t)': ['2', 'cos(t)', '2*sin(t)', '2*cos(2*t)'],
  '6*sin(t)*cos(t)': ['sin(6*t)', '6*sin(2*t)', '3*sin(t)', '3*cos(2*t)'],
  '2*sin(3*t)*cos(3*t)': ['2*sin(3*t)', 'sin(3*t)', 'cos(6*t)', '2*sin(6*t)'],
  'cos(2*t)/(cos(t) - sin(t))': ['cos(t) - sin(t)', '1', '-cos(t) - sin(t)', 'sin(t) - cos(t)'],
  '(cos(t) + sin(t))^2 - 1': ['0', '2*sin(2*t)', 'cos(2*t)', '-sin(2*t)'],
  '2 - 4*sin(t)^2': ['cos(4*t)', 'cos(2*t)', '-2*cos(2*t)', '2*sin(2*t)'],
  'cos(2*t) + 2*sin(t)^2': ['1 + 4*sin(t)^2', 'cos(2*t)', '0', '-1'],
  // Double Angle, read the other way: which form equals the double angle
  'cos(2*t)': ['1 + 2*sin(t)^2', '2*sin(t)^2 - 1', '1 - 2*cos(t)^2', '2*cos(t)^2 + 1', 'sin(t)^2 - cos(t)^2', '2*cos(t)'],
  'sin(2*t)': ['2*sin(t)', 'sin(t)*cos(t)', '-2*sin(t)*cos(t)', '2*sin(t)^2', 'cos(t)^2 - sin(t)^2'],
  'sin(4*t)': ['4*sin(t)*cos(t)', '2*sin(2*t)', '4*sin(2*t)*cos(2*t)', '2*sin(t)*cos(t)'],
  'tan(2*t)': ['2*tan(t)', '(2*tan(t))/(1 + tan(t)^2)', 'tan(t)/(1 - tan(t)^2)', '(2*tan(t))/(1 - tan(t))'],
};

// ── Fractions, and the sides of a reference triangle ────────────────────

const F = (n, d = 1) => { const q = reduce(n, d); return q.d < 0 ? { n: -q.n, d: -q.d } : q; };
const mul = (x, y) => F(x.n * y.n, x.d * y.d);
const add = (x, y) => F(x.n * y.d + y.n * x.d, x.d * y.d);
const sub = (x, y) => add(x, F(-y.n, y.d));
const div = (x, y) => F(x.n * y.d, x.d * y.n);
const ft = (q) => minus(fracText(q.n, q.d));
const pr = (q) => `(${ft(q)})`;
const paren = (q) => (q.n < 0 ? `(${ft(q)})` : ft(q));
/** A fraction about to be squared: (1/3)², (−2)², 4². */
const sqParen = (q) => (q.n < 0 || q.d !== 1 ? `(${ft(q)})` : ft(q));
const signedFrac = (q) => fracAnswer(q.n, q.d);

const TRIPLES = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29]];
/** sin, cos and tan of an angle in quadrant q whose reference triangle is a triple. */
function tripleAngle(rng, q = rng.int(1, 4)) {
  const [a, b, c] = rng.pick(TRIPLES);
  const [o, h] = rng.chance(0.5) ? [a, b] : [b, a];
  const sx = q === 2 || q === 3 ? -1 : 1, sy = q >= 3 ? -1 : 1;
  const sin = F(sy * o, c), cos = F(sx * h, c);
  return { q, sin, cos, tan: div(sin, cos), sec: F(c, sx * h), csc: F(c, sy * o), cot: div(cos, sin) };
}
const RECIP = { sin: 'csc', cos: 'sec', tan: 'cot', csc: 'sin', sec: 'cos', cot: 'tan' };
const CO = { sin: 'cos', cos: 'sin', tan: 'cot', cot: 'tan', sec: 'csc', csc: 'sec' };
const POSITIVE = { sin: [1, 2], csc: [1, 2], cos: [1, 4], sec: [1, 4], tan: [1, 3], cot: [1, 3] };

// ── Pythagorean ─────────────────────────────────────────────────────────

const PY_BANK = [
  ['K - K*sin(t)^2', 'K*cos(t)^2', 'sin²θ + cos²θ = 1, so 1 − sin²θ = cos²θ', '1 − sin²θ is not 1 − sin θ squared away to cos θ: the square stays.'],
  ['K - K*cos(t)^2', 'K*sin(t)^2', 'sin²θ + cos²θ = 1, so 1 − cos²θ = sin²θ', 'Taking cos²θ from 1 leaves sin²θ, not −sin²θ.'],
  ['K*sec(t)^2 - K', 'K*tan(t)^2', '1 + tan²θ = sec²θ, so sec²θ − 1 = tan²θ', 'sec²θ − 1 is tan²θ, not cot²θ: tangent goes with secant.'],
  ['K*csc(t)^2 - K', 'K*cot(t)^2', '1 + cot²θ = csc²θ, so csc²θ − 1 = cot²θ', 'Cotangent goes with cosecant, tangent with secant.'],
  ['K + K*tan(t)^2', 'K*sec(t)^2', '1 + tan²θ = sec²θ, sin²θ + cos²θ = 1 divided by cos²θ', '1 + tan²θ is sec²θ, not 1.'],
  ['K + K*cot(t)^2', 'K*csc(t)^2', '1 + cot²θ = csc²θ, sin²θ + cos²θ = 1 divided by sin²θ', '1 + cot²θ is csc²θ, not sec²θ.'],
  ['K*sin(t)^2 + K*cos(t)^2', 'K', 'sin²θ + cos²θ = 1 for every θ', 'The squares add to 1 whatever θ is; they do not add to 2.'],
  ['K*sec(t)^2 - K*tan(t)^2', 'K', '1 + tan²θ = sec²θ, so sec²θ − tan²θ = 1', 'The difference is 1, not 0: sec²θ is always 1 more than tan²θ.'],
  ['K*csc(t)^2 - K*cot(t)^2', 'K', '1 + cot²θ = csc²θ, so csc²θ − cot²θ = 1', 'The difference is 1, not −1.'],
  ['K*(1 - cos(t))*(1 + cos(t))', 'K*sin(t)^2', 'Multiplying out gives 1 − cos²θ, which is sin²θ', 'A difference of squares: (1 − cos θ)(1 + cos θ) = 1 − cos²θ.'],
  ['K*(1 - sin(t))*(1 + sin(t))', 'K*cos(t)^2', 'Multiplying out gives 1 − sin²θ, which is cos²θ', 'A difference of squares: (1 − sin θ)(1 + sin θ) = 1 − sin²θ.'],
  ['K*cos(t)^2 - K', '-K*sin(t)^2', 'cos²θ = 1 − sin²θ, so cos²θ − 1 = −sin²θ', 'This is 1 − cos²θ the other way round, so it is negative.'],
  ['K*sin(t)^2 - K', '-K*cos(t)^2', 'sin²θ = 1 − cos²θ, so sin²θ − 1 = −cos²θ', 'The order matters: sin²θ − 1 is the negative of 1 − sin²θ.'],
  ['K*tan(t)^2 - K*sec(t)^2', '-K', 'sec²θ = 1 + tan²θ, so tan²θ − sec²θ = −1', 'tan²θ is the smaller, so the difference is −1.'],
  ['K*(sec(t) - 1)*(sec(t) + 1)', 'K*tan(t)^2', 'Multiplying out gives sec²θ − 1, which is tan²θ', 'A difference of squares first, then the identity.'],
  ['K*cos(t)^2*(1 + tan(t)^2)', 'K', '1 + tan²θ = sec²θ, and cos²θ sec²θ = 1', 'A function times its reciprocal is 1.'],
];
const PY_POOL = ['K', '-K', 'K*sin(t)^2', 'K*cos(t)^2', 'K*tan(t)^2', 'K*sec(t)^2', 'K*csc(t)^2', 'K*cot(t)^2', '-K*sin(t)^2', '-K*cos(t)^2', '0'];

function pythagorean(rng) {
  const kind = rng.pick(['simplify', 'simplify', 'ratio', 'ratio', 'value']);
  if (kind === 'simplify') return simplifyProblem(rng, PY_BANK, PY_POOL);
  if (kind === 'value') {
    const k = rng.int(2, 9), deg = rng.int(11, 79);
    const [e, words] = rng.pick([
      [`${k}*sin(t)^2 + ${k}*cos(t)^2`, `${k}(sin²θ + cos²θ) = ${k} × 1`],
      [`${k}*sec(t)^2 - ${k}*tan(t)^2`, `${k}(sec²θ − tan²θ) = ${k} × 1`],
      [`${k} - ${k}*sin(t)^2 - ${k}*cos(t)^2`, `${k} − ${k}(sin²θ + cos²θ) = ${k} − ${k}`],
    ]);
    const v = Math.round(fnOf(e)((deg * Math.PI) / 180));
    return {
      prompt: [T.prose(`Without a calculator, find ${pretty(e, `${deg}°`)}.`)],
      text: `identity value: ${e} at ${deg}`,
      // requiem: catalogue/content/one-input-per-level
      // The roots box, as for every number on this level, so the box says nothing about the answer.
      answer: rootAnswer('x', v, 1, 1),
      visual: null,
      explain: `Group the squares: ${words.replace(/θ/g, `${deg}°`)} = ${v}. (The angle does not matter; working out sin ${deg}° on a calculator and squaring only adds rounding.) So ${v}.`,
    };
  }
  // One ratio, and its partner through an identity.
  const given = rng.pick(['sin', 'cos', 'tan', 'tan']);
  const want = { sin: 'cos', cos: 'sin', tan: 'sec' }[given];
  const q = rng.int(2, 4);
  const [p, h] = rng.pick(given === 'tan' ? [[3, 4], [4, 3], [5, 12], [12, 5], [8, 15], [1, 2], [2, 3], [1, 3]] : [[3, 5], [4, 5], [5, 13], [12, 13], [8, 17], [1, 3], [2, 3], [1, 4], [3, 4], [2, 5]]);
  const sGiven = POSITIVE[given].includes(q) ? 1 : -1, sWant = POSITIVE[want].includes(q) ? 1 : -1;
  const g = F(sGiven * p, h);
  // (want)² as a fraction, then its root.
  const sq = given === 'tan' ? F(h * h + p * p, h * h) : F(h * h - p * p, h * h);
  let k = 1, s = sq.n;
  for (let f = 2; f * f <= s; f++) while (s % (f * f) === 0) { s /= f * f; k *= f; }
  const den = Math.sqrt(sq.d);
  const v = { ...F(sWant * k, den), r: s };
  const vText = s === 1 ? ft(F(sWant * k, den)) : `${sWant < 0 ? '−' : ''}${rootText(k, den, s)}`;
  const rule = given === 'tan' ? `1 + tan²θ = sec²θ: sec²θ = 1 + ${sqParen(g)}² = ${ft(sq)}` : `sin²θ + cos²θ = 1: ${want}²θ = 1 − ${sqParen(g)}² = ${ft(sq)}`;
  return {
    prompt: [T.prose(`${given} θ = ${ft(g)} and θ is in quadrant ${ROMAN[q]}. Use an identity to find the exact value of ${want} θ.`)],
    text: `from ratio: ${given} ${g.n}/${g.d}, quadrant ${ROMAN[q]}, want ${want}`,
    answer: rootAnswer('x', v.n, v.d, v.r),
    visual: null,
    explain: `${rule}, so ${want} θ = ±${s === 1 ? ft(F(k, den)) : rootText(k, den, s)}. In quadrant ${ROMAN[q]}, ${want} is ${sWant > 0 ? 'positive' : 'negative'}. `
      + `(The identity gives the size and leaves the sign open: the quadrant decides it.) So ${want} θ = ${vText}.`,
  };
}

// ── Reciprocal & Quotient ───────────────────────────────────────────────

const RQ_BANK = [
  ['K*sin(t)*csc(t)', 'K', 'csc θ = 1/sin θ, so sin θ csc θ = 1', 'A function times its own reciprocal is 1, not the function squared.'],
  ['K*cos(t)*sec(t)', 'K', 'sec θ = 1/cos θ, so cos θ sec θ = 1', 'Secant is the reciprocal of cosine, not of sine.'],
  ['K*tan(t)*cot(t)', 'K', 'cot θ = 1/tan θ, so tan θ cot θ = 1', 'Tangent and cotangent are reciprocals, so their product is 1.'],
  ['K*sin(t)/cos(t)', 'K*tan(t)', 'tan θ = sin θ/cos θ', 'Sine over cosine is tangent; cosine over sine is cotangent.'],
  ['K*cos(t)/sin(t)', 'K*cot(t)', 'cot θ = cos θ/sin θ', 'Cosine over sine is cotangent, not tangent.'],
  ['K*cos(t)*tan(t)', 'K*sin(t)', 'tan θ = sin θ/cos θ, and the cos θ cancels', 'Write tangent as a quotient first, then cancel.'],
  ['K*sin(t)*cot(t)', 'K*cos(t)', 'cot θ = cos θ/sin θ, and the sin θ cancels', 'Write cotangent as a quotient first, then cancel.'],
  ['K*sin(t)*sec(t)', 'K*tan(t)', 'sec θ = 1/cos θ, so sin θ sec θ = sin θ/cos θ = tan θ', 'Secant puts cos θ underneath.'],
  ['K*cos(t)*csc(t)', 'K*cot(t)', 'csc θ = 1/sin θ, so cos θ csc θ = cos θ/sin θ = cot θ', 'Cosecant puts sin θ underneath.'],
  ['K*sec(t)/csc(t)', 'K*tan(t)', 'sec θ/csc θ = (1/cos θ) ÷ (1/sin θ) = sin θ/cos θ = tan θ', 'Dividing by a fraction flips it.'],
  ['K*csc(t)/sec(t)', 'K*cot(t)', 'csc θ/sec θ = (1/sin θ) ÷ (1/cos θ) = cos θ/sin θ = cot θ', 'Dividing by a fraction flips it.'],
  ['K*tan(t)/sin(t)', 'K*sec(t)', 'tan θ/sin θ = (sin θ/cos θ) ÷ sin θ = 1/cos θ = sec θ', 'The sines cancel and leave 1 over cosine.'],
  ['K*cot(t)/cos(t)', 'K*csc(t)', 'cot θ/cos θ = (cos θ/sin θ) ÷ cos θ = 1/sin θ = csc θ', 'The cosines cancel and leave 1 over sine.'],
  ['K/sec(t)', 'K*cos(t)', 'sec θ = 1/cos θ, so dividing by it multiplies by cos θ', 'One over a reciprocal is the function back again.'],
  ['K/cot(t)', 'K*tan(t)', 'cot θ = 1/tan θ, so dividing by it multiplies by tan θ', 'One over a reciprocal is the function back again.'],
  ['K*sin(t)/tan(t)', 'K*cos(t)', 'sin θ ÷ (sin θ/cos θ) = cos θ', 'Dividing by tan θ multiplies by cos θ/sin θ.'],
  ['K*tan(t)*csc(t)', 'K*sec(t)', '(sin θ/cos θ)(1/sin θ) = 1/cos θ = sec θ', 'The sines cancel.'],
  ['K*cot(t)*sec(t)', 'K*csc(t)', '(cos θ/sin θ)(1/cos θ) = 1/sin θ = csc θ', 'The cosines cancel.'],
];
const RQ_POOL = ['K', 'K*sin(t)', 'K*cos(t)', 'K*tan(t)', 'K*cot(t)', 'K*sec(t)', 'K*csc(t)', 'K*sin(t)^2', 'K*tan(t)^2'];
const DEF = { sin: 'y/r', cos: 'x/r', tan: 'sin θ/cos θ', cot: 'cos θ/sin θ', sec: '1/cos θ', csc: '1/sin θ' };

function reciprocalQuotient(rng) {
  if (rng.chance(0.5)) return simplifyProblem(rng, RQ_BANK, RQ_POOL);
  const A = tripleAngle(rng);
  if (rng.chance(0.35)) {
    const f = rng.pick(['sin', 'cos', 'tan']);
    const want = RECIP[f];
    return {
      prompt: [T.prose(`${f} θ = ${ft(A[f])}. Find ${want} θ.`)],
      text: `reciprocal: ${f} ${A[f].n}/${A[f].d}, want ${want}`,
      answer: signedFrac(A[want]),
      visual: null,
      explain: `${want} θ = 1/${f} θ, so flip ${ft(A[f])}: ${ft(A[want])}. (A reciprocal keeps the sign, and ${want} goes with ${f}${f === 'sin' ? ', not cos' : f === 'cos' ? ', not sin' : ''}.) So ${ft(A[want])}.`,
    };
  }
  const want = rng.pick(['tan', 'cot', 'sec', 'csc']);
  const work = { tan: `sin θ/cos θ = ${paren(A.sin)} ÷ ${paren(A.cos)}`, cot: `cos θ/sin θ = ${paren(A.cos)} ÷ ${paren(A.sin)}`, sec: `1/cos θ = 1 ÷ ${paren(A.cos)}`, csc: `1/sin θ = 1 ÷ ${paren(A.sin)}` }[want];
  return {
    prompt: [T.prose(`sin θ = ${ft(A.sin)} and cos θ = ${ft(A.cos)}. Find ${want} θ.`)],
    text: `reciprocal: sin ${A.sin.n}/${A.sin.d}, cos ${A.cos.n}/${A.cos.d}, want ${want}`,
    answer: signedFrac(A[want]),
    visual: null,
    explain: `${want} θ = ${work} = ${ft(A[want])}. (${want === 'sec' ? 'Secant is 1 over cosine, not over sine.' : want === 'csc' ? 'Cosecant is 1 over sine, not over cosine.' : 'The common denominator cancels when one fraction is divided by the other.'}) So ${ft(A[want])}.`,
  };
}

// ── Even & Odd ──────────────────────────────────────────────────────────

const EO_BANK = [
  ['K*sin(-t)', '-K*sin(t)', 'Sine is odd: sin(−θ) = −sin θ', 'Reflecting θ in the x-axis negates y, so sine changes sign.'],
  ['K*cos(-t)', 'K*cos(t)', 'Cosine is even: cos(−θ) = cos θ', 'Reflecting in the x-axis keeps x, so cosine does not change sign.'],
  ['K*tan(-t)', '-K*tan(t)', 'Tangent is odd: tan(−θ) = −sin θ/cos θ = −tan θ', 'An odd over an even is odd.'],
  ['K*sin(-t)*cos(-t)', '-K*sin(t)*cos(t)', 'sin(−θ) = −sin θ and cos(−θ) = cos θ', 'Only the sine brings a minus sign.'],
  ['K*sin(-t)/cos(-t)', '-K*tan(t)', 'sin(−θ)/cos(−θ) = −sin θ/cos θ = −tan θ', 'The cosine keeps its sign; the sine does not.'],
  ['K*cos(-t)*sec(t)', 'K', 'cos(−θ) = cos θ, and cos θ sec θ = 1', 'Cosine is even, so the minus sign disappears.'],
  ['K*tan(-t)*cot(t)', '-K', 'tan(−θ) = −tan θ, and tan θ cot θ = 1', 'Tangent is odd, so the product is −1.'],
  ['K*sin(-t)^2', 'K*sin(t)^2', 'sin(−θ) = −sin θ, and squaring removes the sign', 'A square of an odd function is even.'],
  ['K*sin(-t) + K*sin(t)', '0', 'sin(−θ) = −sin θ, so the two cancel', 'Odd: the values at θ and −θ are opposites.'],
  ['K*cos(-t) - K*cos(t)', '0', 'cos(−θ) = cos θ, so the difference is 0', 'Even: the values at θ and −θ are equal.'],
  ['K*csc(-t)*sin(t)', '-K', 'csc(−θ) = −csc θ, and csc θ sin θ = 1', 'Cosecant is odd, like sine.'],
  ['K*sec(-t)', 'K*sec(t)', 'Secant is even, like cosine: sec(−θ) = sec θ', 'Each reciprocal is even or odd with its partner.'],
  ['K*cot(-t)', '-K*cot(t)', 'Cotangent is odd, like tangent: cot(−θ) = −cot θ', 'Each reciprocal is even or odd with its partner.'],
  ['K*cos(-t)^2 + K*sin(-t)^2', 'K', 'Squaring removes any sign, then sin²θ + cos²θ = 1', 'The minus signs do not matter once squared.'],
  ['-K*sin(-t)', 'K*sin(t)', 'sin(−θ) = −sin θ, and the two minus signs cancel', 'Two negatives make a positive.'],
];
const EO_POOL = ['K*sin(t)', '-K*sin(t)', 'K*cos(t)', '-K*cos(t)', 'K*tan(t)', '-K*tan(t)', 'K', '-K', '0', 'K*sin(t)*cos(t)', 'K*sec(t)', '-K*sec(t)', 'K*cot(t)', '-K*cot(t)', 'K*sin(t)^2'];

function evenOdd(rng) {
  const kind = rng.pick(['simplify', 'simplify', 'value', 'exact']);
  if (kind === 'simplify') return simplifyProblem(rng, EO_BANK, EO_POOL);
  if (kind === 'exact') {
    const radians = rng.chance(0.5);
    const deg = -rng.pick([30, 45, 60, 120, 135, 150, 210, 240, 300, 315]);
    const fn = rng.pick(['sin', 'cos', 'tan']);
    const v = exactTrig(fn, deg), pos = exactTrig(fn, -deg);
    const vText = v.n === 0 ? '0' : `${v.n < 0 ? '−' : ''}${rootText(Math.abs(v.n), v.d, v.r)}`;
    const pText = pos.n === 0 ? '0' : `${pos.n < 0 ? '−' : ''}${rootText(Math.abs(pos.n), pos.d, pos.r)}`;
    return {
      prompt: [T.prose(`Find the exact value of ${fnText(fn, deg, radians)}.`)],
      text: `exact: ${fn} ${radians ? `${F(deg, 180).n}/${F(deg, 180).d} pi` : deg}`,
      answer: rootAnswer('x', v.n, v.d, v.r),
      visual: null,
      explain: `${fn === 'cos' ? 'Cosine is even' : `${fn === 'sin' ? 'Sine' : 'Tangent'} is odd`}: ${fnText(fn, deg, radians)} = ${fn === 'cos' ? '' : '−'}${fnText(fn, -deg, radians)}, and ${fnText(fn, -deg, radians)} = ${pText}. `
        + `(${fn === 'cos' ? 'The minus sign inside cosine simply disappears.' : 'The minus sign comes out in front.'}) So ${fnText(fn, deg, radians)} = ${vText}.`,
    };
  }
  const A = tripleAngle(rng);
  const f = rng.pick(['sin', 'cos', 'tan']);
  const want = rng.pick([f, f, RECIP[f]]);
  const odd = want !== 'cos' && want !== 'sec';
  const base = want === f ? A[f] : A[RECIP[f]];
  const v = odd ? F(-base.n, base.d) : base;
  return {
    prompt: [T.prose(`${f} θ = ${ft(A[f])}. Find ${want}(−θ).`)],
    text: `even odd: ${f} ${A[f].n}/${A[f].d}, want ${want}(-t)`,
    answer: signedFrac(v),
    visual: null,
    explain: `${want === f ? '' : `${want} θ = 1/${f} θ = ${ft(base)}. `}${want} is ${odd ? 'odd' : 'even'}, so ${want}(−θ) = ${odd ? '−' : ''}${want} θ = ${ft(v)}. `
      + `(${odd ? 'Sine, tangent and their reciprocals change sign with θ.' : 'Cosine and secant read x, which does not change when θ is reflected.'}) So ${ft(v)}.`,
  };
}

// ── Cofunction ──────────────────────────────────────────────────────────

const CF_BANK = [
  ['K*sin(pi/2 - t)', 'K*cos(t)', 'sin(π/2 − θ) = cos θ', 'The complement swaps a function for its cofunction; it does not add a minus sign.'],
  ['K*cos(pi/2 - t)', 'K*sin(t)', 'cos(π/2 − θ) = sin θ', 'Cosine of the complement is sine.'],
  ['K*tan(pi/2 - t)', 'K*cot(t)', 'tan(π/2 − θ) = cot θ', 'Tangent of the complement is cotangent, the reciprocal.'],
  ['K*cot(pi/2 - t)', 'K*tan(t)', 'cot(π/2 − θ) = tan θ', 'Cotangent of the complement is tangent.'],
  ['K*sec(pi/2 - t)', 'K*csc(t)', 'sec(π/2 − θ) = csc θ', 'Secant pairs with cosecant.'],
  ['K*csc(pi/2 - t)', 'K*sec(t)', 'csc(π/2 − θ) = sec θ', 'Cosecant pairs with secant.'],
  ['K*sin(pi/2 - t)*sec(t)', 'K', 'sin(π/2 − θ) = cos θ, and cos θ sec θ = 1', 'Swap to the cofunction first, then cancel.'],
  ['K*cos(pi/2 - t)/sin(t)', 'K', 'cos(π/2 − θ) = sin θ, and sin θ/sin θ = 1', 'Swap to the cofunction first, then cancel.'],
  ['K*sin(pi/2 - t)/sin(t)', 'K*cot(t)', 'sin(π/2 − θ) = cos θ, and cos θ/sin θ = cot θ', 'Swap to the cofunction first, then use the quotient.'],
  ['K*cos(pi/2 - t)/cos(t)', 'K*tan(t)', 'cos(π/2 − θ) = sin θ, and sin θ/cos θ = tan θ', 'Swap to the cofunction first, then use the quotient.'],
  ['K*tan(pi/2 - t)*tan(t)', 'K', 'tan(π/2 − θ) = cot θ, and cot θ tan θ = 1', 'The complement turns tangent into cotangent, its reciprocal.'],
  ['K*sec(pi/2 - t)*sin(t)', 'K', 'sec(π/2 − θ) = csc θ, and csc θ sin θ = 1', 'Secant of the complement is cosecant, not secant again.'],
  ['K*csc(pi/2 - t)*cos(t)', 'K', 'csc(π/2 − θ) = sec θ, and sec θ cos θ = 1', 'Cosecant of the complement is secant.'],
  ['K*cot(pi/2 - t)*cos(t)', 'K*sin(t)', 'cot(π/2 − θ) = tan θ, and tan θ cos θ = sin θ', 'Swap to the cofunction first, then cancel the cosine.'],
];
const CF_POOL = ['K*sin(t)', 'K*cos(t)', 'K*tan(t)', 'K*cot(t)', 'K*sec(t)', 'K*csc(t)', 'K', '-K'];

function cofunction(rng) {
  // Leaning on π/2 − θ and on tan/cot and sec/csc: sin and cos of
  // complements in degrees are trig-ratios' Complementary level already.
  const kind = rng.pick(['simplify', 'simplify', 'pair', 'value']);
  if (kind === 'simplify') return simplifyProblem(rng, CF_BANK, CF_POOL);
  if (kind === 'pair') {
    const degrees = rng.chance(0.3);
    const f = degrees ? rng.pick(['tan', 'cot', 'sec', 'csc']) : rng.pick(['sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'tan', 'cot', 'sec', 'csc']);
    if (degrees) {
      const a = rng.int(1, 89);
      return {
        prompt: [T.prose(`${f} ${a}° = ${CO[f]} x°, with x between 0 and 90. Find x.`)],
        text: `cofunction pair: ${f} ${a} = ${CO[f]} ?`,
        answer: { type: 'int', value: 90 - a },
        visual: null,
        explain: `A function of an angle equals its cofunction of the complement: ${f} ${a}° = ${CO[f]}(90° − ${a}°) = ${CO[f]} ${90 - a}°. (Complements add to 90°, not 180°.) So x = ${90 - a}.`,
      };
    }
    let a;
    do a = F(rng.int(1, 8), rng.pick([5, 8, 9, 10, 12, 18])); while (a.n / a.d >= 0.5);
    const c = sub(F(1, 2), a);
    return {
      prompt: [T.prose(`${f}(${piText(a.n, a.d)}) = ${CO[f]} θ, with θ between 0 and π/2. Find θ as a multiple of π.`), T.letter('θ'), T.op('='), T.blank(), T.letter('π')],
      text: `cofunction rad: ${f} ${a.n}/${a.d} pi = ${CO[f]} ?`,
      answer: fracAnswer(c.n, c.d),
      visual: null,
      explain: `${f}(${piText(a.n, a.d)}) = ${CO[f]}(π/2 − ${piText(a.n, a.d)}), and π/2 − ${piText(a.n, a.d)} = ${piText(c.n, c.d)}. (The complement in radians is π/2 − θ, not π − θ.) So θ = ${piText(c.n, c.d)}, and the box takes ${ft(c)}.`,
    };
  }
  const A = tripleAngle(rng, 1);
  const f = rng.pick(['sin', 'cos', 'tan']);
  const twin = rng.chance(0.6) ? f : RECIP[f];
  const want = CO[twin];
  return {
    prompt: [T.prose(`${f} θ = ${ft(A[f])}. Find ${want}(π/2 − θ).`)],
    text: `cofunction of: ${f} ${A[f].n}/${A[f].d}, want ${want}(pi/2 - t)`,
    answer: signedFrac(A[twin]),
    visual: null,
    explain: `${want}(π/2 − θ) = ${twin} θ${twin === f ? '' : ` = 1/${f} θ`} = ${ft(A[twin])}. (The cofunction of the complement is the original function: no new triangle is needed.) So ${ft(A[twin])}.`,
  };
}

// ── Sum & Difference ────────────────────────────────────────────────────

/** Exact values at multiples of 15° that are not multiples of 30° or 45°, as (p√6 + q√2)/4. */
const FIFTEEN = { 15: { sin: [1, -1], cos: [1, 1] }, 75: { sin: [1, 1], cos: [1, -1] } };
function fifteen(fn, deg) {
  const t = ((deg % 360) + 360) % 360;
  const ref = t <= 90 ? t : t <= 180 ? 180 - t : t <= 270 ? t - 180 : 360 - t;
  const s = Math.sign(Math[fn]((deg * Math.PI) / 180));
  const [p, q] = FIFTEEN[ref][fn];
  return [s * p, s * q];
}
/** (p√6 + q√2)/4 with the positive root first: (√2 − √6)/4, not (−√6 + √2)/4. */
const surdSum = ([p, q]) => (p < 0 && q > 0 ? '(sqrt(2) - sqrt(6))/4' : `(${p < 0 ? '-' : ''}sqrt(6) ${q > 0 ? '+' : '-'} sqrt(2))/4`);

function sumDifference(rng) {
  const kind = rng.pick(['exact', 'exact', 'value', 'value', 'expand']);
  if (kind === 'exact') {
    const radians = rng.chance(0.4);
    const deg = rng.pick([15, 75, 105, 165, 195, 255, 285, 345, -15, -75]);
    const fn = rng.pick(['sin', 'cos', 'sin', 'cos', 'tan']);
    const show = fnText(fn, deg, radians);
    const key = radians ? `${F(deg, 180).n}/${F(deg, 180).d} pi` : String(deg);
    // A split into two special angles, for the explanation.
    const [x, y] = ((d) => { for (const [u, w] of [[45, 30], [60, 45], [45, -30], [60, -45], [135, -30], [120, 45], [150, 45], [135, 60], [180, 15], [225, -30], [240, 45], [300, -15]]) if (u + w === d) return [u, w]; for (const u of [-45, -60, -30]) for (const w of [30, -30, 15, -15, 45, -45]) if (u + w === d) return [u, w]; return [d - 30, 30]; })(deg);
    const split = `${angleText(x, radians)} ${y < 0 ? '−' : '+'} ${angleText(Math.abs(y), radians)}`;
    if (fn === 'tan') {
      const v = Math.tan((deg * Math.PI) / 180);
      const sign = v > 0 ? 1 : -1, big = Math.abs(v) > 1;
      // tan 75° = 2 + √3, tan 15° = 2 − √3.
      const a = sign * 2, b = sign * (big ? 1 : -1);
      return {
        prompt: [T.prose(`Use a sum or difference formula to find the exact value of ${show}.`)],
        text: `exact: tan ${key}`,
        answer: { type: 'roots', value: { letter: 'x', roots: [{ a: { n: a, d: 1 }, b: { n: b, d: 1 }, r: 3 }] } },
        visual: null,
        explain: `Write ${angleText(deg, radians)} as ${split}, and tan(α ± β) = (tan α ± tan β)/(1 ∓ tan α tan β). With 1 and √3/3 that simplifies, after multiplying top and bottom by the conjugate, to ${minus(a)} ${b > 0 ? '+' : '−'} √3. `
          + `(tan(α + β) is not tan α + tan β.) So ${show} = ${minus(a)} ${b > 0 ? '+' : '−'} √3.`,
      };
    }
    const right = surdSum(fifteen(fn, deg));
    const [p, q] = fifteen(fn, deg);
    const pool = [surdSum([p, -q]), surdSum([-p, q]), surdSum([-p, -q]), '(sqrt(2) + sqrt(3))/2', '(sqrt(3) - 1)/2', '(sqrt(6) + sqrt(2))/2', '(1 + sqrt(3))/4'];
    const wrong = [];
    for (const e of rng.shuffle(pool)) if (wrong.length < 3 && Math.abs(fnOf(e)(0) - fnOf(right)(0)) > 1e-9 && !wrong.some((w) => Math.abs(fnOf(w)(0) - fnOf(e)(0)) < 1e-9)) wrong.push(e);
    const all = rng.shuffle([right, ...wrong]);
    const opts = all.map((e, i) => ({ id: optionIds[i], e }));
    const formula = fn === 'sin' ? 'sin(α ± β) = sin α cos β ± cos α sin β' : 'cos(α ± β) = cos α cos β ∓ sin α sin β';
    return {
      prompt: [T.prose(`Use a sum or difference formula to find the exact value of ${show}.`)],
      text: `exact choice: ${fn} ${key}; options ${opts.map((o) => `${o.id}: ${o.e}`).join(' | ')}`,
      answer: { type: 'choice', value: optionIds[all.indexOf(right)], options: opts.map((o) => ({ id: o.id, label: pretty(o.e) })) },
      visual: null,
      explain: `Write ${angleText(deg, radians)} as ${split}, two angles with exact values, and use ${formula}. Each product is a √2/2 times a 1/2 or a √3/2, which makes √2/4 and √6/4. `
        + `(The ${fn === 'sin' ? 'sine' : 'cosine'} of a sum is not the sum of the ${fn === 'sin' ? 'sines' : 'cosines'}, and the sign depends on the quadrant of ${angleText(deg, radians)}.) So ${show} = ${pretty(right)}.`,
    };
  }
  if (kind === 'expand') {
    let p, q;
    do { p = rng.int(2, 6); q = rng.int(1, 4); } while (q >= p);
    const fn = rng.pick(['sin', 'cos']), plus = rng.chance(0.5);
    const T_ = (k) => (k === 1 ? 't' : `${k}*t`);
    const expr = fn === 'sin'
      ? `sin(${T_(p)})*cos(${T_(q)}) ${plus ? '+' : '-'} cos(${T_(p)})*sin(${T_(q)})`
      : `cos(${T_(p)})*cos(${T_(q)}) ${plus ? '-' : '+'} sin(${T_(p)})*sin(${T_(q)})`;
    const m = plus ? p + q : p - q;
    const answer = `${fn}(${T_(m)})`;
    const others = [`${fn}(${T_(plus ? p - q : p + q)})`, `${fn === 'sin' ? 'cos' : 'sin'}(${T_(m)})`, `${fn === 'sin' ? 'cos' : 'sin'}(${T_(plus ? p - q : p + q)})`];
    const all = rng.shuffle([answer, ...others]);
    const opts = all.map((e, i) => ({ id: optionIds[i], e }));
    return {
      prompt: [T.prose(`Write as a single function: ${pretty(expr)}`)],
      text: `trig simplify: ${expr}; options ${opts.map((o) => `${o.id}: ${o.e}`).join(' | ')}`,
      answer: { type: 'choice', value: optionIds[all.indexOf(answer)], options: opts.map((o) => ({ id: o.id, label: pretty(o.e) })) },
      visual: null,
      explain: `This is ${fn === 'sin' ? `sin(α ${plus ? '+' : '−'} β) = sin α cos β ${plus ? '+' : '−'} cos α sin β` : `cos(α ${plus ? '+' : '−'} β) = cos α cos β ${plus ? '−' : '+'} sin α sin β`} with α = ${pretty(T_(p))} and β = ${pretty(T_(q))}, so it is ${pretty(answer)}. `
        + `(${fn === 'cos' ? 'In the cosine formula the sign in the middle is the opposite of the sign inside.' : 'The sine formula mixes sine and cosine, and keeps the sign.'}) So ${pretty(answer)}.`,
    };
  }
  // sin α and cos β given, each in a quadrant; one of the four formulas.
  const qa = rng.pick([1, 1, 2]), qb = rng.pick([1, 1, 4]);
  const a = tripleAngle(rng, qa), b = tripleAngle(rng, qb);
  const want = rng.pick(['sin(a+b)', 'sin(a-b)', 'cos(a+b)', 'cos(a-b)']);
  const plus = want.includes('+');
  const v = want.startsWith('sin')
    ? (plus ? add : sub)(mul(a.sin, b.cos), mul(a.cos, b.sin))
    : (plus ? sub : add)(mul(a.cos, b.cos), mul(a.sin, b.sin));
  const formula = want.startsWith('sin')
    ? `sin α cos β ${plus ? '+' : '−'} cos α sin β = ${pr(a.sin)}${pr(b.cos)} ${plus ? '+' : '−'} ${pr(a.cos)}${pr(b.sin)}`
    : `cos α cos β ${plus ? '−' : '+'} sin α sin β = ${pr(a.cos)}${pr(b.cos)} ${plus ? '−' : '+'} ${pr(a.sin)}${pr(b.sin)}`;
  return {
    prompt: [T.prose(`sin α = ${ft(a.sin)} with α in quadrant ${ROMAN[qa]}, and cos β = ${ft(b.cos)} with β in quadrant ${ROMAN[qb]}. Find ${pretty(want)}.`)],
    text: `sum: sin a ${a.sin.n}/${a.sin.d} quadrant ${ROMAN[qa]}, cos b ${b.cos.n}/${b.cos.d} quadrant ${ROMAN[qb]}, want ${want}`,
    answer: signedFrac(v),
    visual: null,
    explain: `First the missing values: cos α = ${ft(a.cos)} (quadrant ${ROMAN[qa]}) and sin β = ${ft(b.sin)} (quadrant ${ROMAN[qb]}). Then ${pretty(want)} = ${formula} = ${ft(v)}. `
      + `(${want.startsWith('cos') ? 'The cosine formula flips the sign: cos(α + β) has a minus in the middle.' : 'sin(α + β) is not sin α + sin β.'}) So ${ft(v)}.`,
  };
}

// ── Double Angle ────────────────────────────────────────────────────────

const DA_BANK = [
  ['2*sin(t)*cos(t)', 'sin(2*t)', 'sin 2θ = 2 sin θ cos θ', 'The 2 goes inside as 2θ; it is not 2 sin θ.'],
  ['cos(t)^2 - sin(t)^2', 'cos(2*t)', 'cos 2θ = cos²θ − sin²θ', 'This is cos 2θ, not 1: the squares are subtracted.'],
  ['1 - 2*sin(t)^2', 'cos(2*t)', 'cos 2θ = 1 − 2 sin²θ', 'The sine form of cos 2θ.'],
  ['2*cos(t)^2 - 1', 'cos(2*t)', 'cos 2θ = 2 cos²θ − 1', 'The cosine form of cos 2θ.'],
  ['(2*tan(t))/(1 - tan(t)^2)', 'tan(2*t)', 'tan 2θ = 2 tan θ/(1 − tan²θ)', 'This is tan 2θ, not 2 tan θ.'],
  ['4*sin(t)*cos(t)', '2*sin(2*t)', '4 sin θ cos θ = 2(2 sin θ cos θ) = 2 sin 2θ', 'Only one 2 is used up by the formula.'],
  ['sin(2*t)/(2*cos(t))', 'sin(t)', 'sin 2θ = 2 sin θ cos θ, and the 2 cos θ cancels', 'Expand the double angle first, then cancel.'],
  ['sin(2*t)/sin(t)', '2*cos(t)', 'sin 2θ = 2 sin θ cos θ, and the sin θ cancels', 'Expand the double angle first, then cancel.'],
  ['6*sin(t)*cos(t)', '3*sin(2*t)', '6 sin θ cos θ = 3(2 sin θ cos θ) = 3 sin 2θ', 'Only one 2 is used up by the formula.'],
  ['2*sin(3*t)*cos(3*t)', 'sin(6*t)', 'sin 2x = 2 sin x cos x with x = 3θ', 'Double the angle that is there: 3θ doubles to 6θ.'],
  ['cos(2*t)/(cos(t) - sin(t))', 'cos(t) + sin(t)', 'cos 2θ = (cos θ − sin θ)(cos θ + sin θ), and one factor cancels', 'Factor cos²θ − sin²θ as a difference of squares.'],
  ['(cos(t) + sin(t))^2 - 1', 'sin(2*t)', '(cos θ + sin θ)² = 1 + 2 sin θ cos θ, so this is sin 2θ', 'The middle term of the square is 2 sin θ cos θ.'],
  ['2 - 4*sin(t)^2', '2*cos(2*t)', '2 − 4 sin²θ = 2(1 − 2 sin²θ) = 2 cos 2θ', 'Take out the 2 first.'],
  ['cos(2*t) + 2*sin(t)^2', '1', 'cos 2θ = 1 − 2 sin²θ, so adding 2 sin²θ leaves 1', 'Choose the form of cos 2θ that matches the rest.'],
];
const DA_POOL = ['sin(2*t)', 'cos(2*t)', 'tan(2*t)', '2*sin(t)', '2*cos(t)', 'sin(t)', 'cos(t)', '2*sin(2*t)', '2*cos(2*t)', 'sin(t)^2', 'sin(4*t)', 'sin(6*t)', 'cos(6*t)', '1', 'cos(t) - sin(t)', '3*sin(2*t)', '3*cos(2*t)', '2*tan(t)'];

// The formulas the other way round: which expansion is the double angle.
const DA_FORMS = [
  ['cos(2*t)', '1 - 2*sin(t)^2', 'cos 2θ = cos²θ − sin²θ, and cos²θ = 1 − sin²θ makes it 1 − 2 sin²θ', 'The sine form subtracts 2 sin²θ from 1; 1 + 2 sin²θ is more than 1.'],
  ['cos(2*t)', '2*cos(t)^2 - 1', 'cos 2θ = cos²θ − sin²θ, and sin²θ = 1 − cos²θ makes it 2 cos²θ − 1', 'The cosine form is 2 cos²θ − 1, not 1 − 2 cos²θ, which is its negative.'],
  ['cos(2*t)', 'cos(t)^2 - sin(t)^2', 'cos 2θ = cos(θ + θ) = cos θ cos θ − sin θ sin θ', 'Cosine squared first: sin²θ − cos²θ is the negative.'],
  ['sin(2*t)', '2*sin(t)*cos(t)', 'sin 2θ = sin(θ + θ) = sin θ cos θ + cos θ sin θ = 2 sin θ cos θ', 'Doubling the angle does not double the sine: sin 2θ is not 2 sin θ.'],
  ['sin(4*t)', '2*sin(2*t)*cos(2*t)', 'sin 2x = 2 sin x cos x with x = 2θ', '4θ is twice 2θ, so the formula uses 2θ; 4 sin θ cos θ is 2 sin 2θ, a different thing.'],
  ['tan(2*t)', '(2*tan(t))/(1 - tan(t)^2)', 'tan 2θ = tan(θ + θ) = (tan θ + tan θ)/(1 − tan θ tan θ)', 'The bottom is 1 − tan²θ; with 1 + tan²θ it is sin 2θ instead.'],
];

const DA_VALUES = [
  ['2*sin(t)*cos(t)', 'sin'], ['cos(t)^2 - sin(t)^2', 'cos'], ['1 - 2*sin(t)^2', 'cos'], ['2*cos(t)^2 - 1', 'cos'], ['(2*tan(t))/(1 - tan(t)^2)', 'tan'],
];

function doubleAngle(rng) {
  const kind = rng.pick(['simplify', 'value', 'value', 'exact']);
  if (kind === 'simplify') {
    return rng.chance(0.35)
      ? simplifyProblem(rng, DA_FORMS, DA_POOL, { ks: [1], ask: (e) => `Which of these is equal to ${e}?` })
      : simplifyProblem(rng, DA_BANK, DA_POOL, { ks: [1], lead: 'Write more simply' });
  }
  if (kind === 'exact') {
    const [e, fn] = rng.pick(DA_VALUES);
    const radians = rng.chance(0.5);
    const deg = radians ? rng.pick([7.5 * 3, 15, 67.5, 75, 112.5, 105]) : rng.pick([15, 75, 105, 165]);
    if (fn === 'tan' && Math.abs(Math.cos(2 * deg * Math.PI / 180)) < 1e-9) return doubleAngle(rng);
    const q = F(Math.round(deg * 2), 360);
    const shown = radians ? `(${piText(q.n, q.d)})` : `${deg}°`;
    const v = exactTrig(fn, 2 * deg);
    const vText = v.n === 0 ? '0' : `${v.n < 0 ? '−' : ''}${rootText(Math.abs(v.n), v.d, v.r)}`;
    return {
      prompt: [T.prose(`Find the exact value of ${pretty(e, shown)}.`)],
      text: `identity value: ${e} at ${radians ? `${q.n}/${q.d} pi` : deg}`,
      answer: rootAnswer('x', v.n, v.d, v.r),
      visual: null,
      explain: `This is the double-angle formula for ${fn} 2θ with θ = ${radians ? piText(q.n, q.d) : `${deg}°`}, so it equals ${fnText(fn, 2 * deg, radians)} = ${vText}. `
        + `(Recognize the pattern instead of working out ${fn === 'tan' ? 'tan' : 'sin and cos'} of ${radians ? piText(q.n, q.d) : `${deg}°`}, which are not special values.) So ${pretty(e, shown)} = ${vText}.`,
    };
  }
  const given = rng.pick(['sin', 'cos', 'tan']);
  const q = rng.int(1, 4);
  const A = tripleAngle(rng, q);
  const want = rng.pick(['sin(2*t)', 'cos(2*t)', 'cos(2*t)', 'tan(2*t)']);
  const s2 = mul(F(2), mul(A.sin, A.cos)), c2 = sub(mul(A.cos, A.cos), mul(A.sin, A.sin));
  const v = want === 'sin(2*t)' ? s2 : want === 'cos(2*t)' ? c2 : div(s2, c2);
  const missing = given === 'sin' ? `cos θ = ${ft(A.cos)}` : given === 'cos' ? `sin θ = ${ft(A.sin)}` : `sin θ = ${ft(A.sin)} and cos θ = ${ft(A.cos)}`;
  const work = want === 'sin(2*t)' ? `2 sin θ cos θ = 2${pr(A.sin)}${pr(A.cos)} = ${ft(s2)}`
    : want === 'cos(2*t)' ? `cos²θ − sin²θ = ${sqParen(A.cos)}² − ${sqParen(A.sin)}² = ${ft(c2)}`
      : `sin 2θ/cos 2θ = ${paren(s2)} ÷ ${paren(c2)} = ${ft(v)}`;
  return {
    prompt: [T.prose(`${given} θ = ${ft(A[given])} and θ is in quadrant ${ROMAN[q]}. Find ${pretty(want)}.`)],
    text: `double: ${given} ${A[given].n}/${A[given].d}, quadrant ${ROMAN[q]}, want ${want}`,
    answer: signedFrac(v),
    visual: null,
    explain: `From the reference triangle and the quadrant, ${missing}. ${want === 'tan(2*t)' ? `sin 2θ = ${ft(s2)} and cos 2θ = ${ft(c2)}, so tan 2θ = ` : `${pretty(want)} = `}${work}. `
      + `(${want === 'sin(2*t)' ? 'sin 2θ is not 2 sin θ: both sine and cosine are needed.' : want === 'cos(2*t)' ? 'cos 2θ is not 2 cos θ.' : 'tan 2θ is not 2 tan θ.'}) So ${ft(v)}.`,
  };
}

// ── Identity or Not? ────────────────────────────────────────────────────

// Equations that are identities, each from an earlier level, with the reason.
const IS_IDENTITY = [
  ['sin(t)^2 + cos(t)^2', '1', 'It is the Pythagorean theorem on the unit circle, x² + y² = 1'],
  ['1 + tan(t)^2', 'sec(t)^2', 'It is sin²θ + cos²θ = 1 divided through by cos²θ'],
  ['1 + cot(t)^2', 'csc(t)^2', 'It is sin²θ + cos²θ = 1 divided through by sin²θ'],
  ['sec(t)^2 - tan(t)^2', '1', 'It is 1 + tan²θ = sec²θ with tan²θ taken to the other side'],
  ['(1 - cos(t))*(1 + cos(t))', 'sin(t)^2', 'Multiplied out it is 1 − cos²θ, which is sin²θ'],
  ['tan(t)', 'sin(t)/cos(t)', 'It is the quotient identity: tangent is y/x, sine over cosine'],
  ['cot(t)', 'cos(t)/sin(t)', 'It is the quotient identity: cotangent is x/y, cosine over sine'],
  ['sec(t)', '1/cos(t)', 'Secant is defined as the reciprocal of cosine'],
  ['csc(t)', '1/sin(t)', 'Cosecant is defined as the reciprocal of sine'],
  ['sin(t)*csc(t)', '1', 'csc θ = 1/sin θ, and a number times its reciprocal is 1'],
  ['tan(t)*cot(t)', '1', 'cot θ = 1/tan θ, and a number times its reciprocal is 1'],
  ['cos(-t)', 'cos(t)', 'Cosine is even: reflecting θ in the x-axis keeps x'],
  ['sin(-t)', '-sin(t)', 'Sine is odd: reflecting θ in the x-axis negates y'],
  ['tan(-t)', '-tan(t)', 'Tangent is odd: an odd sine over an even cosine'],
  ['sin(pi/2 - t)', 'cos(t)', 'A function of θ equals its cofunction of the complement'],
  ['tan(pi/2 - t)', 'cot(t)', 'A function of θ equals its cofunction of the complement'],
  ['sec(pi/2 - t)', 'csc(t)', 'A function of θ equals its cofunction of the complement'],
  ['sin(pi - t)', 'sin(t)', 'By the difference formula, sin(π − θ) = sin π cos θ − cos π sin θ = sin θ'],
  ['cos(pi - t)', '-cos(t)', 'By the difference formula, cos(π − θ) = cos π cos θ + sin π sin θ = −cos θ'],
  ['sin(t + pi)', '-sin(t)', 'By the sum formula, sin(θ + π) = sin θ cos π + cos θ sin π = −sin θ'],
  ['sin(a + b)', 'sin(a)*cos(b) + cos(a)*sin(b)', 'It is the sum formula for sine'],
  ['sin(a - b)', 'sin(a)*cos(b) - cos(a)*sin(b)', 'It is the difference formula for sine'],
  ['cos(a + b)', 'cos(a)*cos(b) - sin(a)*sin(b)', 'It is the sum formula for cosine, the sign in the middle opposite to the one inside'],
  ['cos(a - b)', 'cos(a)*cos(b) + sin(a)*sin(b)', 'It is the difference formula for cosine, the sign in the middle opposite to the one inside'],
  ['sin(2*t)', '2*sin(t)*cos(t)', 'It is the sum formula with both angles θ: sin θ cos θ + cos θ sin θ'],
  ['cos(2*t)', 'cos(t)^2 - sin(t)^2', 'It is the sum formula with both angles θ: cos θ cos θ − sin θ sin θ'],
  ['cos(2*t)', '1 - 2*sin(t)^2', 'It is cos²θ − sin²θ with cos²θ written as 1 − sin²θ'],
  ['cos(2*t)', '2*cos(t)^2 - 1', 'It is cos²θ − sin²θ with sin²θ written as 1 − cos²θ'],
  ['tan(2*t)', '(2*tan(t))/(1 - tan(t)^2)', 'It is the tangent sum formula with both angles θ'],
  ['1 - 2*sin(t)^2', '2*cos(t)^2 - 1', 'Both sides are forms of cos 2θ'],
  ['(sin(t) + cos(t))^2', '1 + sin(2*t)', 'Squared out it is sin²θ + 2 sin θ cos θ + cos²θ, which is 1 + sin 2θ'],
  ['cos(t)^4 - sin(t)^4', 'cos(2*t)', 'As a difference of squares it is (cos²θ − sin²θ)(cos²θ + sin²θ), which is cos 2θ × 1'],
  ['tan(t) + cot(t)', 'sec(t)*csc(t)', 'Over a common denominator it is (sin²θ + cos²θ)/(sin θ cos θ), which is 1/(sin θ cos θ)'],
  ['sec(t) - cos(t)', 'sin(t)*tan(t)', 'Over a common denominator it is (1 − cos²θ)/cos θ = sin²θ/cos θ, which is sin θ tan θ'],
];

// Equations that are not, each a slip a student makes, with an angle where
// both sides are defined and differ (α and β for two angles; one in
// radians, as k/m pi), the values there, and the fix. Most hold at some
// special angles, so one angle tried can mislead.
const NOT_IDENTITY = [
  ['sin(2*t)', '2*sin(t)', [90], 'sin 180° = 0, but 2 sin 90° = 2', 'The 2 belongs to the angle: sin 2θ = 2 sin θ cos θ.'],
  ['cos(2*t)', '2*cos(t)', [0], 'cos 0° = 1, but 2 cos 0° = 2', 'cos 2θ = 2 cos²θ − 1, not 2 cos θ.'],
  ['tan(2*t)', '2*tan(t)', [30], 'tan 60° = √3, but 2 tan 30° = 2√3/3', 'tan 2θ = 2 tan θ/(1 − tan²θ).'],
  ['sin(2*t)', 'sin(t)*cos(t)', [45], 'sin 90° = 1, but sin 45° cos 45° = 1/2', 'The 2 is part of the formula: sin 2θ = 2 sin θ cos θ.'],
  ['cos(2*t)', 'cos(t)^2 + sin(t)^2', [90], 'cos 180° = −1, but cos²90° + sin²90° = 1', 'The squares are subtracted: cos 2θ = cos²θ − sin²θ.'],
  ['cos(2*t)', '1 - 2*cos(t)^2', [0], 'cos 0° = 1, but 1 − 2 cos²0° = −1', '1 − 2 cos²θ is −cos 2θ; the forms are 1 − 2 sin²θ and 2 cos²θ − 1.'],
  ['sin(a + b)', 'sin(a) + sin(b)', [90, 90], 'sin 180° = 0, but sin 90° + sin 90° = 2', 'Sine does not distribute over a sum: sin(α + β) = sin α cos β + cos α sin β.'],
  ['cos(a + b)', 'cos(a) + cos(b)', [0, 0], 'cos 0° = 1, but cos 0° + cos 0° = 2', 'Cosine does not distribute over a sum: cos(α + β) = cos α cos β − sin α sin β.'],
  ['cos(a - b)', 'cos(a) - cos(b)', [0, 0], 'cos 0° = 1, but cos 0° − cos 0° = 0', 'cos(α − β) = cos α cos β + sin α sin β.'],
  ['cos(a + b)', 'cos(a)*cos(b) + sin(a)*sin(b)', [90, 90], 'cos 180° = −1, but cos 90° cos 90° + sin 90° sin 90° = 1', 'In the cosine formula the sign in the middle is the opposite of the sign inside.'],
  ['sin(t)^2', 'sin(t^2)', ['1/2 pi'], 'sin²(π/2) = 1, but sin(π²/4) ≈ sin 2.47 ≈ 0.62', 'sin²θ means (sin θ)², the sine squared, not the sine of θ².'],
  ['tan(t)', 'cos(t)/sin(t)', [30], 'tan 30° = √3/3, but cos 30°/sin 30° = √3', 'cos θ/sin θ is cot θ; tangent is sine over cosine.'],
  ['sec(t)', '1/sin(t)', [30], 'sec 30° = 2√3/3, but 1/sin 30° = 2', 'Secant is 1 over cosine; 1 over sine is cosecant.'],
  ['csc(t)', '1/cos(t)', [30], 'csc 30° = 2, but 1/cos 30° = 2√3/3', 'Cosecant is 1 over sine; 1 over cosine is secant.'],
  ['cos(-t)', '-cos(t)', [0], 'cos(−0°) = 1, but −cos 0° = −1', 'Cosine is even: cos(−θ) = cos θ.'],
  ['sin(-t)', 'sin(t)', [90], 'sin(−90°) = −1, but sin 90° = 1', 'Sine is odd: sin(−θ) = −sin θ.'],
  ['tan(-t)', 'tan(t)', [45], 'tan(−45°) = −1, but tan 45° = 1', 'Tangent is odd: tan(−θ) = −tan θ.'],
  ['1 + tan(t)^2', 'csc(t)^2', [30], '1 + tan²30° = 4/3, but csc²30° = 4', 'Tangent goes with secant: 1 + tan²θ = sec²θ.'],
  ['1 + cot(t)^2', 'sec(t)^2', [60], '1 + cot²60° = 4/3, but sec²60° = 4', 'Cotangent goes with cosecant: 1 + cot²θ = csc²θ.'],
  ['sin(t) + cos(t)', '1', [45], 'sin 45° + cos 45° = √2, not 1', 'It is the squares that add to 1: sin²θ + cos²θ = 1.'],
  ['(sin(t) + cos(t))^2', '1', [45], '(sin 45° + cos 45°)² = (√2)² = 2, not 1', 'Squaring a sum leaves a middle term: (sin θ + cos θ)² = 1 + 2 sin θ cos θ.'],
  ['cos(t)^2 - sin(t)^2', '1', [90], 'cos²90° − sin²90° = −1, not 1', 'Subtracted, the squares make cos 2θ; added, they make 1.'],
  ['sec(t)^2 + tan(t)^2', '1', [45], 'sec²45° + tan²45° = 2 + 1 = 3, not 1', 'It is the difference that is 1: sec²θ − tan²θ = 1.'],
  ['sqrt(sin(t)^2)', 'sin(t)', [270], '√(sin²270°) = √1 = 1, but sin 270° = −1', 'A square root is never negative: √(sin²θ) is the size of sin θ, |sin θ|.'],
  ['sqrt(1 - cos(t)^2)', 'sin(t)', [270], '√(1 − cos²270°) = √1 = 1, but sin 270° = −1', 'The square root is never negative, so it is sin θ only where sin θ ≥ 0.'],
  ['sin(pi - t)', '-sin(t)', [90], 'sin(180° − 90°) = sin 90° = 1, but −sin 90° = −1', 'sin(π − θ) = sin θ: the angle across the y-axis has the same height.'],
  ['cos(t + pi)', 'cos(t)', [0], 'cos(0° + 180°) = −1, but cos 0° = 1', 'Half a turn negates both coordinates: cos(θ + π) = −cos θ.'],
  ['sin(pi/2 - t)', 'sin(t)', [0], 'sin(90° − 0°) = 1, but sin 0° = 0', 'The complement swaps to the cofunction: sin(π/2 − θ) = cos θ.'],
  ['cos(t - pi/2)', '-sin(t)', [90], 'cos(90° − 90°) = 1, but −sin 90° = −1', 'cos(θ − π/2) = cos(π/2 − θ) = sin θ, with no minus sign.'],
];

const DEG = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330];
const ALWAYS = [{ id: 'always', label: 'Always true (an identity)' }, { id: 'not', label: 'Not always true' }];
const degText = (d) => `${minus(d)}°`;
const listText = (ds) => ds.map(degText).join(', ').replace(/, (?=[^,]*$)/, ' and ');
const coterminal = (d) => ((d % 360) + 360) % 360;
const twoAngles = (l, r) => /\b[ab]\b/.test(`${l} ${r}`);
/** The value of e at t, or null where it is undefined: a zero denominator, or a square root of a negative. */
function sideAt(e, t) {
  let v;
  try { v = fnOf(e)(t); } catch { return null; }
  return Number.isFinite(v) && Math.abs(v) < 1e8 ? v : null;
}
/** 'holds', 'fails', or 'undefined' (a side has no value there), at d degrees. */
function atAngle(l, r, d) {
  const t = (d * Math.PI) / 180, x = sideAt(l, t), y = sideAt(r, t);
  if (x === null || y === null) return 'undefined';
  return Math.abs(x - y) <= 1e-9 * Math.max(1, Math.abs(x)) ? 'holds' : 'fails';
}

// requiem: catalogue/content/identity-or-not-by-counterexample
/**
 * Whether an equation is an identity, true wherever both sides are defined.
 * Half the yes-or-no rows are identities from the earlier levels, half the
 * slips those levels warn against. The rest, about a fifth of the library,
 * say the equation is not an identity and ask at which of four angles it fails;
 * each of the other three makes it true or leaves a side undefined, and at
 * least one makes it true, so a single angle tried would mislead. The
 * explanation of a false one names the special angles where it does hold.
 */
function identityOrNot(rng) {
  const flip = rng.chance(0.5);
  // Either way round, except that a bare number stays on the right: 1 = sin²θ + cos²θ reads backwards.
  const side = (l, r) => (flip && !/^-?\d+$/.test(r) ? [r, l] : [l, r]);
  if (rng.chance(0.25)) {
    for (;;) {
      const [l0, r0, [cx], values] = rng.pick(NOT_IDENTITY);
      // One angle, in degrees, and no θ² (which degrees make no sense of).
      if (twoAngles(l0, r0) || typeof cx !== 'number') continue;
      const [l, r] = side(l0, r0);
      if (atAngle(l, r, cx) !== 'fails') throw new Error(`${l} = ${r} does not fail at ${cx}`);
      // The other three fixed for each equation, angles where it holds and
      // where a side is undefined taken in turn, so this shape stays about a
      // quarter of a library that holds every yes-or-no row.
      const usable = [];
      for (const d of DEG) if (coterminal(d) !== coterminal(cx) && !usable.some((u) => coterminal(u) === coterminal(d))) usable.push(d);
      const H = usable.filter((d) => atAngle(l, r, d) === 'holds'), U = usable.filter((d) => atAngle(l, r, d) === 'undefined');
      const picked = [H[0], U[0], H[1], U[1], H[2], U[2], H[3]].filter((d) => d !== undefined).slice(0, 3);
      if (picked.length < 3 || !picked.some((d) => atAngle(l, r, d) === 'holds')) continue;
      const angles = [cx, ...picked].sort((x, y) => x - y);
      const opts = angles.map((d, i) => ({ id: optionIds[i], d }));
      const eq = `${pretty(l)} = ${pretty(r)}`;
      const holds = angles.filter((d) => atAngle(l, r, d) === 'holds');
      const undef = angles.filter((d) => atAngle(l, r, d) === 'undefined');
      return {
        prompt: [T.prose(`${eq} is not an identity. At which of these angles does it fail, with both sides defined but not equal?`)],
        text: `fails where: ${l} = ${r}; options ${opts.map((o) => `${o.id}: ${o.d}`).join(' | ')}`,
        answer: { type: 'choice', value: optionIds[angles.indexOf(cx)], options: opts.map((o) => ({ id: o.id, label: degText(o.d) })) },
        visual: null,
        explain: `Try each angle in both sides. At ${listText(holds)} the two sides are equal, so ${holds.length > 1 ? 'those angles show' : 'that angle shows'} nothing. `
          + `${undef.length ? `At ${listText(undef)} a side is undefined, so the equation makes no claim there. ` : ''}`
          + `At ${degText(cx)}, ${values}: both sides are defined and differ. `
          + `(One such angle is enough to disprove an equation; an angle where the sides agree proves nothing.) So ${degText(cx)}.`,
      };
    }
  }
  if (rng.chance(0.5)) {
    const [l0, r0, why] = rng.pick(IS_IDENTITY);
    const [l, r] = side(l0, r0);
    if (!same(l, r)) throw new Error(`${l} = ${r} is not an identity`);
    const eq = `${pretty(l)} = ${pretty(r)}`;
    const where = twoAngles(l, r) ? 'every α and β' : 'every θ';
    return {
      prompt: [T.prose(`Is ${eq} true for ${where} where both sides are defined?`)],
      text: `identity or not: ${l} = ${r}`,
      answer: { type: 'choice', value: 'always', options: ALWAYS },
      visual: null,
      explain: `${why}, so ${eq} holds for ${where} where both sides are defined: it is an identity. `
        + `(Trying angles could only fail to find a counterexample; it is the derivation that shows it always holds.) So always true.`,
    };
  }
  const [l0, r0, cx, values, fix] = rng.pick(NOT_IDENTITY);
  const [l, r] = side(l0, r0);
  if (same(l, r)) throw new Error(`${l} = ${r} is an identity`);
  const eq = `${pretty(l)} = ${pretty(r)}`;
  const two = twoAngles(l, r), radian = typeof cx[0] === 'string';
  const at = two ? (cx[0] === cx[1] ? `α = β = ${degText(cx[0])}` : `α = ${degText(cx[0])} and β = ${degText(cx[1])}`)
    : radian ? 'θ = π/2' : `θ = ${degText(cx[0])}`;
  const holds = two || radian ? [] : DEG.filter((d) => atAngle(l, r, d) === 'holds');
  const misleads = holds.length ? ` It does hold at ${listText(holds)}, so one angle tried there would mislead.` : '';
  return {
    prompt: [T.prose(`Is ${eq} true for ${two ? 'every α and β' : 'every θ'} where both sides are defined?`)],
    text: `identity or not: ${l} = ${r}; fails at ${cx.join(', ')}`,
    answer: { type: 'choice', value: 'not', options: ALWAYS },
    visual: null,
    explain: `Try ${at}: ${values}. One angle where both sides are defined and differ disproves it.${misleads} `
      + `(${fix}) So not always true.`,
  };
}

// ── Next Step in a Proof ────────────────────────────────────────────────

// Each proof: the line it starts from, then each next line with the reason it follows.
const PROOFS = [
  ['sec(t) - cos(t)', 'sin(t)*tan(t)', [['1/cos(t) - cos(t)', 'sec θ = 1/cos θ'], ['(1 - cos(t)^2)/cos(t)', 'a common denominator, cos θ'], ['sin(t)^2/cos(t)', '1 − cos²θ = sin²θ'], ['sin(t)*(sin(t)/cos(t))', 'split off one sin θ'], ['sin(t)*tan(t)', 'sin θ/cos θ = tan θ']]],
  ['tan(t) + cot(t)', 'sec(t)*csc(t)', [['sin(t)/cos(t) + cos(t)/sin(t)', 'the quotient identities'], ['(sin(t)^2 + cos(t)^2)/(sin(t)*cos(t))', 'a common denominator, sin θ cos θ'], ['1/(sin(t)*cos(t))', 'sin²θ + cos²θ = 1'], ['sec(t)*csc(t)', '1/cos θ = sec θ and 1/sin θ = csc θ']]],
  ['(1 - cos(t)^2)*(1 + cot(t)^2)', '1', [['sin(t)^2*(1 + cot(t)^2)', '1 − cos²θ = sin²θ'], ['sin(t)^2*csc(t)^2', '1 + cot²θ = csc²θ'], ['1', 'sin θ csc θ = 1, squared']]],
  ['cos(t)*(sec(t) - cos(t))', 'sin(t)^2', [['cos(t)*sec(t) - cos(t)^2', 'distribute cos θ'], ['1 - cos(t)^2', 'cos θ sec θ = 1'], ['sin(t)^2', '1 − cos²θ = sin²θ']]],
  ['sin(t)/csc(t) + cos(t)/sec(t)', '1', [['sin(t)*sin(t) + cos(t)*cos(t)', 'dividing by a reciprocal multiplies by the function'], ['sin(t)^2 + cos(t)^2', 'write the products as squares'], ['1', 'sin²θ + cos²θ = 1']]],
  ['(sin(t) + cos(t))^2', '1 + sin(2*t)', [['sin(t)^2 + 2*sin(t)*cos(t) + cos(t)^2', 'square the sum'], ['1 + 2*sin(t)*cos(t)', 'sin²θ + cos²θ = 1'], ['1 + sin(2*t)', '2 sin θ cos θ = sin 2θ']]],
  ['cos(t)^4 - sin(t)^4', 'cos(2*t)', [['(cos(t)^2 - sin(t)^2)*(cos(t)^2 + sin(t)^2)', 'a difference of squares'], ['(cos(t)^2 - sin(t)^2)*1', 'cos²θ + sin²θ = 1'], ['cos(2*t)', 'cos²θ − sin²θ = cos 2θ']]],
  ['sec(t)^2 - tan(t)^2', '1', [['1/cos(t)^2 - sin(t)^2/cos(t)^2', 'sec θ = 1/cos θ and tan θ = sin θ/cos θ'], ['(1 - sin(t)^2)/cos(t)^2', 'the same denominator'], ['cos(t)^2/cos(t)^2', '1 − sin²θ = cos²θ'], ['1', 'anything nonzero over itself is 1']]],
  ['csc(t) - sin(t)', 'cos(t)*cot(t)', [['1/sin(t) - sin(t)', 'csc θ = 1/sin θ'], ['(1 - sin(t)^2)/sin(t)', 'a common denominator, sin θ'], ['cos(t)^2/sin(t)', '1 − sin²θ = cos²θ'], ['cos(t)*(cos(t)/sin(t))', 'split off one cos θ'], ['cos(t)*cot(t)', 'cos θ/sin θ = cot θ']]],
  ['sin(2*t)/(1 + cos(2*t))', 'tan(t)', [['(2*sin(t)*cos(t))/(1 + cos(2*t))', 'sin 2θ = 2 sin θ cos θ'], ['(2*sin(t)*cos(t))/(2*cos(t)^2)', 'cos 2θ = 2 cos²θ − 1, so 1 + cos 2θ = 2 cos²θ'], ['sin(t)/cos(t)', 'cancel 2 cos θ'], ['tan(t)', 'sin θ/cos θ = tan θ']]],
  ['(1 + tan(t)^2)*cos(t)^2', '1', [['sec(t)^2*cos(t)^2', '1 + tan²θ = sec²θ'], ['(1/cos(t)^2)*cos(t)^2', 'sec θ = 1/cos θ'], ['1', 'the cos²θ cancels']]],
  ['sin(t + pi/2)', 'cos(t)', [['sin(t)*cos(pi/2) + cos(t)*sin(pi/2)', 'sin(α + β) = sin α cos β + cos α sin β'], ['sin(t)*0 + cos(t)*1', 'cos(π/2) = 0 and sin(π/2) = 1'], ['cos(t)', 'the first term is 0']]],
  ['cos(pi - t)', '-cos(t)', [['cos(pi)*cos(t) + sin(pi)*sin(t)', 'cos(α − β) = cos α cos β + sin α sin β'], ['-cos(t) + 0*sin(t)', 'cos π = −1 and sin π = 0'], ['-cos(t)', 'the second term is 0']]],
  ['tan(t)*sin(t) + cos(t)', 'sec(t)', [['(sin(t)/cos(t))*sin(t) + cos(t)', 'tan θ = sin θ/cos θ'], ['sin(t)^2/cos(t) + cos(t)', 'multiply the sines'], ['(sin(t)^2 + cos(t)^2)/cos(t)', 'a common denominator, cos θ'], ['1/cos(t)', 'sin²θ + cos²θ = 1'], ['sec(t)', '1/cos θ = sec θ']]],
  ['(sec(t) - 1)*(sec(t) + 1)', 'tan(t)^2', [['sec(t)^2 - 1', 'a difference of squares'], ['tan(t)^2', 'sec²θ − 1 = tan²θ']]],
  ['1/(1 - sin(t)) + 1/(1 + sin(t))', '2*sec(t)^2', [['((1 + sin(t)) + (1 - sin(t)))/((1 - sin(t))*(1 + sin(t)))', 'a common denominator'], ['2/(1 - sin(t)^2)', 'add the tops, multiply the bottoms'], ['2/cos(t)^2', '1 − sin²θ = cos²θ'], ['2*sec(t)^2', '1/cos²θ = sec²θ']]],
  ['cos(2*t)', '2*cos(t)^2 - 1', [['cos(t)^2 - sin(t)^2', 'cos 2θ = cos²θ − sin²θ'], ['cos(t)^2 - (1 - cos(t)^2)', 'sin²θ = 1 − cos²θ'], ['2*cos(t)^2 - 1', 'collect the cos²θ']]],
  ['sin(t)^2*sec(t)^2 + 1', 'sec(t)^2', [['sin(t)^2/cos(t)^2 + 1', 'sec θ = 1/cos θ'], ['tan(t)^2 + 1', 'sin θ/cos θ = tan θ'], ['sec(t)^2', '1 + tan²θ = sec²θ']]],
  ['(1 - cos(2*t))/sin(2*t)', 'tan(t)', [['(1 - (1 - 2*sin(t)^2))/sin(2*t)', 'cos 2θ = 1 − 2 sin²θ'], ['(2*sin(t)^2)/sin(2*t)', 'the 1s cancel'], ['(2*sin(t)^2)/(2*sin(t)*cos(t))', 'sin 2θ = 2 sin θ cos θ'], ['sin(t)/cos(t)', 'cancel 2 sin θ'], ['tan(t)', 'sin θ/cos θ = tan θ']]],
  ['sin(t)*cot(t)', 'cos(t)', [['sin(t)*(cos(t)/sin(t))', 'cot θ = cos θ/sin θ'], ['cos(t)', 'the sin θ cancels']]],
  ['(1 + cot(t)^2)*sin(t)^2', '1', [['csc(t)^2*sin(t)^2', '1 + cot²θ = csc²θ'], ['(1/sin(t)^2)*sin(t)^2', 'csc θ = 1/sin θ'], ['1', 'the sin²θ cancels']]],
  ['sec(t)*sin(t)*cot(t)', '1', [['(1/cos(t))*sin(t)*(cos(t)/sin(t))', 'sec θ = 1/cos θ and cot θ = cos θ/sin θ'], ['1', 'the sin θ and the cos θ cancel']]],
  ['cos(t)^2 - sin(t)^2', '1 - 2*sin(t)^2', [['(1 - sin(t)^2) - sin(t)^2', 'cos²θ = 1 − sin²θ'], ['1 - 2*sin(t)^2', 'collect the sin²θ']]],
  ['tan(t)/sec(t)', 'sin(t)', [['(sin(t)/cos(t))/sec(t)', 'tan θ = sin θ/cos θ'], ['(sin(t)/cos(t))*cos(t)', 'dividing by sec θ multiplies by cos θ'], ['sin(t)', 'the cos θ cancels']]],
  ['(1 + sin(t))*(1 - sin(t))', 'cos(t)^2', [['1 - sin(t)^2', 'a difference of squares'], ['cos(t)^2', '1 − sin²θ = cos²θ']]],
  ['sin(t)^4 - cos(t)^4', 'sin(t)^2 - cos(t)^2', [['(sin(t)^2 - cos(t)^2)*(sin(t)^2 + cos(t)^2)', 'a difference of squares'], ['(sin(t)^2 - cos(t)^2)*1', 'sin²θ + cos²θ = 1'], ['sin(t)^2 - cos(t)^2', 'times 1 changes nothing']]],
  ['cos(t) + sin(t)*tan(t)', 'sec(t)', [['cos(t) + sin(t)*(sin(t)/cos(t))', 'tan θ = sin θ/cos θ'], ['cos(t) + sin(t)^2/cos(t)', 'multiply the sines'], ['(cos(t)^2 + sin(t)^2)/cos(t)', 'a common denominator, cos θ'], ['1/cos(t)', 'sin²θ + cos²θ = 1'], ['sec(t)', '1/cos θ = sec θ']]],
  ['csc(t)^2 - cot(t)^2', '1', [['1/sin(t)^2 - cos(t)^2/sin(t)^2', 'csc θ = 1/sin θ and cot θ = cos θ/sin θ'], ['(1 - cos(t)^2)/sin(t)^2', 'the same denominator'], ['sin(t)^2/sin(t)^2', '1 − cos²θ = sin²θ'], ['1', 'anything nonzero over itself is 1']]],
  ['cos(t + pi/2)', '-sin(t)', [['cos(t)*cos(pi/2) - sin(t)*sin(pi/2)', 'cos(α + β) = cos α cos β − sin α sin β'], ['cos(t)*0 - sin(t)*1', 'cos(π/2) = 0 and sin(π/2) = 1'], ['-sin(t)', 'the first term is 0']]],
  ['sin(pi - t)', 'sin(t)', [['sin(pi)*cos(t) - cos(pi)*sin(t)', 'sin(α − β) = sin α cos β − cos α sin β'], ['0*cos(t) + sin(t)', 'sin π = 0 and −cos π = 1'], ['sin(t)', 'the first term is 0']]],
  ['sin(t + pi)', '-sin(t)', [['sin(t)*cos(pi) + cos(t)*sin(pi)', 'sin(α + β) = sin α cos β + cos α sin β'], ['-sin(t) + cos(t)*0', 'cos π = −1 and sin π = 0'], ['-sin(t)', 'the second term is 0']]],
  ['sin(2*t)*sec(t)', '2*sin(t)', [['2*sin(t)*cos(t)*sec(t)', 'sin 2θ = 2 sin θ cos θ'], ['2*sin(t)*1', 'cos θ sec θ = 1'], ['2*sin(t)', 'times 1 changes nothing']]],
  ['cos(2*t) + sin(t)^2', 'cos(t)^2', [['cos(t)^2 - sin(t)^2 + sin(t)^2', 'cos 2θ = cos²θ − sin²θ'], ['cos(t)^2', 'the sin²θ cancels']]],
  ['(1 - cos(2*t))/2', 'sin(t)^2', [['(1 - (1 - 2*sin(t)^2))/2', 'cos 2θ = 1 − 2 sin²θ'], ['(2*sin(t)^2)/2', 'the 1s cancel'], ['sin(t)^2', 'the 2s cancel']]],
  ['(1 + cos(2*t))/2', 'cos(t)^2', [['(1 + (2*cos(t)^2 - 1))/2', 'cos 2θ = 2 cos²θ − 1'], ['(2*cos(t)^2)/2', 'the 1s cancel'], ['cos(t)^2', 'the 2s cancel']]],
  ['tan(t)*csc(t)', 'sec(t)', [['(sin(t)/cos(t))*(1/sin(t))', 'tan θ = sin θ/cos θ and csc θ = 1/sin θ'], ['1/cos(t)', 'the sin θ cancels'], ['sec(t)', '1/cos θ = sec θ']]],
  ['sec(t)^2*cot(t)^2', 'csc(t)^2', [['(1/cos(t)^2)*(cos(t)^2/sin(t)^2)', 'sec θ = 1/cos θ and cot θ = cos θ/sin θ'], ['1/sin(t)^2', 'the cos²θ cancels'], ['csc(t)^2', '1/sin²θ = csc²θ']]],
  // requiem: catalogue/content/proofs-derive-the-formulas
  // The formulas themselves derived (F-TF.9): cos(α − β) from the length of a
  // chord, the sum formulas from it, then tan(α + β) and the double angles.
  ['cos(a - b)', 'cos(a)*cos(b) + sin(a)*sin(b)', [
    ['(2 - ((cos(a - b) - 1)^2 + sin(a - b)^2))/2', 'the chord from (1, 0) to the point at angle α − β, squared, is 2 − 2 cos(α − β); solve that for the cosine'],
    ['(2 - ((cos(a) - cos(b))^2 + (sin(a) - sin(b))^2))/2', 'turn both ends of the chord by β: the chord from the point at β to the point at α is just as long'],
    ['(2 - (cos(a)^2 + sin(a)^2 + cos(b)^2 + sin(b)^2 - 2*cos(a)*cos(b) - 2*sin(a)*sin(b)))/2', 'square out both brackets and regroup'],
    ['(2 - (2 - 2*cos(a)*cos(b) - 2*sin(a)*sin(b)))/2', 'sin²α + cos²α = 1, and the same for β'],
    ['cos(a)*cos(b) + sin(a)*sin(b)', 'the 2s cancel, then halve']]],
  ['cos(a + b)', 'cos(a)*cos(b) - sin(a)*sin(b)', [['cos(a - (-b))', 'α + β = α − (−β)'], ['cos(a)*cos(-b) + sin(a)*sin(-b)', 'cos(α − β) = cos α cos β + sin α sin β, with −β for β'], ['cos(a)*cos(b) - sin(a)*sin(b)', 'cos(−β) = cos β and sin(−β) = −sin β']]],
  ['sin(a + b)', 'sin(a)*cos(b) + cos(a)*sin(b)', [['cos(pi/2 - (a + b))', 'sin x = cos(π/2 − x)'], ['cos((pi/2 - a) - b)', 'regroup: π/2 − (α + β) is (π/2 − α) − β'], ['cos(pi/2 - a)*cos(b) + sin(pi/2 - a)*sin(b)', 'cos(x − β) = cos x cos β + sin x sin β, with x = π/2 − α'], ['sin(a)*cos(b) + cos(a)*sin(b)', 'cos(π/2 − α) = sin α and sin(π/2 − α) = cos α']]],
  ['tan(a + b)', '(tan(a) + tan(b))/(1 - tan(a)*tan(b))', [
    ['sin(a + b)/cos(a + b)', 'tan x = sin x/cos x'],
    ['(sin(a)*cos(b) + cos(a)*sin(b))/(cos(a)*cos(b) - sin(a)*sin(b))', 'the sum formulas for sine and cosine'],
    ['((sin(a)*cos(b) + cos(a)*sin(b))/(cos(a)*cos(b)))/((cos(a)*cos(b) - sin(a)*sin(b))/(cos(a)*cos(b)))', 'divide the top and the bottom by cos α cos β'],
    ['(sin(a)/cos(a) + sin(b)/cos(b))/(1 - (sin(a)*sin(b))/(cos(a)*cos(b)))', 'split each fraction and cancel'],
    ['(tan(a) + tan(b))/(1 - tan(a)*tan(b))', 'sin x/cos x = tan x']]],
  ['sin(2*t)', '2*sin(t)*cos(t)', [['sin(t + t)', '2θ = θ + θ'], ['sin(t)*cos(t) + cos(t)*sin(t)', 'sin(α + β) = sin α cos β + cos α sin β, with α = β = θ'], ['2*sin(t)*cos(t)', 'the two terms are the same']]],
  ['cos(2*t)', 'cos(t)^2 - sin(t)^2', [['cos(t + t)', '2θ = θ + θ'], ['cos(t)*cos(t) - sin(t)*sin(t)', 'cos(α + β) = cos α cos β − sin α sin β, with α = β = θ'], ['cos(t)^2 - sin(t)^2', 'write the products as squares']]],
  ['tan(2*t)', '(2*tan(t))/(1 - tan(t)^2)', [['tan(t + t)', '2θ = θ + θ'], ['(tan(t) + tan(t))/(1 - tan(t)*tan(t))', 'tan(α + β) = (tan α + tan β)/(1 − tan α tan β), with α = β = θ'], ['(2*tan(t))/(1 - tan(t)^2)', 'add the top, and tan θ tan θ is tan²θ']]],
];

/**
 * Single changes a careless step makes: a sign, a square, a swapped function,
 * each at one place in the line ({ at, len, rep }), or to the whole line (a
 * minus sign in front, a 2 in front).
 */
function slips(e) {
  const out = [];
  const swap = (a, b) => { for (let i = e.indexOf(a); i > -1; i = e.indexOf(a, i + 1)) if (!(a === '2*' && /[\^\d]/.test(e[i - 1] ?? ''))) out.push({ at: i, len: a.length, rep: b }); };
  swap(' + ', ' - '); swap(' - ', ' + ');
  swap('sin', 'cos'); swap('cos', 'sin'); swap('tan', 'cot'); swap('cot', 'tan'); swap('sec', 'csc'); swap('csc', 'sec');
  swap(')^2', ')'); swap('2*', ''); swap('1 - ', '1 + ');
  out.push({ whole: negate });
  out.push({ whole: (x) => (/^-?\d+$/.test(x) ? String(2 * Number(x)) : x.startsWith('-') ? `-2*${x.slice(1)}` : `2*${x}`) });
  return out;
}
const applySlip = (e, sl) => (sl.whole ? sl.whole(e) : e.slice(0, sl.at) + sl.rep + e.slice(sl.at + sl.len));
/** Two slips made together: the later place first, so the earlier place has not moved; a whole-line slip last. */
function bothSlips(e, s1, s2) {
  if (s1.whole && s2.whole) return s1.whole === s2.whole ? null : applySlip(applySlip(e, s1), s2);
  if (s1.whole || s2.whole) return s1.whole ? applySlip(applySlip(e, s2), s1) : applySlip(applySlip(e, s1), s2);
  if (s1.at < s2.at + s2.len && s2.at < s1.at + s1.len) return null;
  return s1.at > s2.at ? applySlip(applySlip(e, s1), s2) : applySlip(applySlip(e, s2), s1);
}

const ALL_STEPS = PROOFS.flatMap(([start, goal, steps]) => steps.map((_, i) => ({ start, goal, steps, i })));

// requiem: catalogue/content/proof-step-is-new-and-equal
/**
 * The next line of a fixed proof. Three options are not: two are slips,
 * not equal to the line before, and in about half the problems the third is
 * a line already written, equal but a step back rather than on toward the
 * other side. The question says so, so exactly one option is both equal and
 * new.
 */
function proofStep(rng) {
  for (;;) {
    const { start, goal, steps, i } = rng.pick(ALL_STEPS);
    const lines = [start, ...steps.slice(0, i).map((s) => s[0])];
    const [next, reason] = steps[i];
    if (!same(start, goal) || !same(next, lines[lines.length - 1])) throw new Error(`proof of ${goal} breaks at ${next}`);
    if (lines.includes(next)) throw new Error(`proof of ${goal} repeats ${next}`);
    const back = rng.chance(0.5) ? rng.pick(lines) : null;
    const finite = (e) => { try { return Number.isFinite(fnOf(e)(1.1)); } catch { return false; } };
    // requiem: catalogue/content/decoys-cross-two-slips
    // Two slips crossed, or a step back crossed with one slip: the next line,
    // a slip in it, the line gone back to and the same kind of slip in that,
    // so the right line is not the one nearest all the others.
    let wrong = null;
    const fresh = (opts) => opts.every(finite) && opts.every((x, a) => opts.every((y, b) => b <= a || (x !== y && !same(x, y))))
      && opts.slice(1).every((w) => w === back || !same(w, next));
    if (back) {
      for (const sl of rng.shuffle(slips(next))) {
        const kind = sl.whole ?? sl.rep;
        const twin = rng.shuffle(slips(back)).find((t) => (t.whole ?? t.rep) === kind);
        if (!twin) continue;
        const opts = [next, applySlip(next, sl), back, applySlip(back, twin)];
        if (fresh(opts)) { wrong = opts.slice(1); break; }
      }
    } else {
      const all = rng.shuffle(slips(next));
      for (let a = 0; a < all.length && !wrong; a++) {
        for (let b = a + 1; b < all.length && !wrong; b++) {
          const two = bothSlips(next, all[a], all[b]);
          if (two === null) continue;
          const opts = [next, applySlip(next, all[a]), applySlip(next, all[b]), two];
          if (fresh(opts)) wrong = opts.slice(1);
        }
      }
    }
    if (!wrong) continue;
    const all = rng.shuffle([next, ...wrong]);
    const opts = all.map((e, j) => ({ id: optionIds[j], e }));
    const shown = lines.map((l) => pretty(l)).join(' = ');
    return {
      prompt: [T.prose(`Prove ${pretty(start)} = ${pretty(goal)}. So far: ${shown}. Which line comes next? It must equal the last line and be a new line, a step on toward ${pretty(goal)}, not back to one already written.`)],
      text: `proof: goal ${start} = ${goal}; so far ${lines.join(' = ')}; options ${opts.map((o) => `${o.id}: ${o.e}`).join(' | ')}`,
      answer: { type: 'choice', value: optionIds[all.indexOf(next)], options: opts.map((o) => ({ id: o.id, label: `= ${pretty(o.e)}` })) },
      visual: null,
      explain: `${reason.includes('=') ? `By ${reason}` : reason[0].toUpperCase() + reason.slice(1)}: ${pretty(lines[lines.length - 1])} = ${pretty(next)}. `
        + `(${back ? `= ${pretty(back)} is equal too, but it is a line already written: it goes back, not on toward ${pretty(goal)}. The other two` : 'The other choices'} change a sign, a square or a function, so they are not equal.) So = ${pretty(next)}.`,
    };
  }
}

const CONTENT = [pythagorean, reciprocalQuotient, evenOdd, cofunction, sumDifference, doubleAngle, identityOrNot, proofStep];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
