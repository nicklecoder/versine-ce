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
const same = (e1, e2) => TESTS.every((t) => { const x = fnOf(e1)(t), y = fnOf(e2)(t); return Math.abs(x - y) <= 1e-9 * Math.max(1, Math.abs(x)); });

const SUP = { 2: '²', 3: '³', 4: '⁴' };
const FNS = '(sin|cos|tan|sec|csc|cot)';
/** The expression as the student reads it: sin²θ + cos²θ, 2 sin θ cos θ, sin(π/2 − θ). */
function pretty(s, angle = null) {
  let out = s.replace(/pi/g, 'π');
  out = out.replace(new RegExp(`${FNS}\\(t\\)\\^(\\d)`, 'g'), (_, f, n) => `${f}${SUP[n]}θ`);
  out = out.replace(new RegExp(`${FNS}\\((\\d+)\\*t\\)\\^(\\d)`, 'g'), (_, f, k, n) => `${f}${SUP[n]}${k}θ`);
  out = out.replace(new RegExp(`${FNS}\\(([^()]*)\\)\\^(\\d)`, 'g'), (_, f, x, n) => `${f}${SUP[n]}(${x})`);
  out = out.replace(new RegExp(`${FNS}\\(t\\)`, 'g'), '$1 θ');
  out = out.replace(new RegExp(`${FNS}\\((\\d+)\\*t\\)`, 'g'), '$1 $2θ');
  out = out.replace(/\b(\d+)\*t\b/g, '$1θ');
  out = out.replace(/\bt\b/g, 'θ').replace(/\ba\b/g, 'α').replace(/\bb\b/g, 'β');
  out = out.replace(/sqrt\((\d+)\)/g, '√$1');
  out = out.replace(/\)\^(\d)/g, (_, n) => `)${SUP[n]}`);
  out = out.replace(/\*(?=\d)/g, '·').replace(/\*/g, ' ');
  out = out.replace(/-/g, '−');
  if (angle !== null) out = out.replace(/ θ/g, angle.startsWith('(') ? angle : ` ${angle}`).replace(/θ/g, angle);
  return out;
}

/** Fill a template's K: K*sin(t) is sin(t) at 1 and 3*sin(t) at 3. */
const fill = (template, k) => template.replace(/K\*/g, k === 1 ? '' : `${k}*`).replace(/K/g, String(k));
/** −e, written: −K*sin(t) for K*sin(t), and back. */
const negate = (e) => (e.startsWith('-') ? e.slice(1) : e === '0' ? '0' : `-${e}`);

// requiem: catalogue/content/identity-choices-have-one-equal-option
/**
 * A choice of four: the answer, its negative where that differs, and the
 * rest from the pool, none equal to the expression or to each other.
 */
function choices(rng, expr, answer, pool) {
  const wrong = [];
  const fits = (e) => !same(e, expr) && !wrong.some((w) => same(w, e)) && !/NaN/.test(String(fnOf(e)(1)));
  const neg = negate(answer);
  if (fits(neg)) wrong.push(neg);
  for (const e of rng.shuffle(pool)) if (wrong.length < 3 && fits(e)) wrong.push(e);
  if (wrong.length < 3) return null;
  const all = rng.shuffle([answer, ...wrong]);
  return { opts: all.map((e, i) => ({ id: optionIds[i], e })), right: optionIds[all.indexOf(answer)] };
}

function simplifyProblem(rng, bank, pool, { ks = [1, 1, 1, 2, 3, 4, 5], lead = 'Simplify' } = {}) {
  for (;;) {
    const [template, answerT, why, trap] = rng.pick(bank);
    const k = rng.pick(ks);
    const expr = fill(template, k), answer = fill(answerT, k);
    if (!same(expr, answer)) throw new Error(`${expr} is not ${answer}`);
    const c = choices(rng, expr, answer, pool.map((p) => fill(p, k)));
    if (!c) continue;
    return {
      prompt: [T.prose(`${lead}: ${pretty(expr)}`)],
      text: `trig simplify: ${expr}; options ${c.opts.map((o) => `${o.id}: ${o.e}`).join(' | ')}`,
      answer: { type: 'choice', value: c.right, options: c.opts.map((o) => ({ id: o.id, label: pretty(o.e) })) },
      visual: null,
      explain: `${k === 1 && why.includes(pretty(expr)) ? why : `${why}: ${pretty(expr)} = ${pretty(answer)}`}. (${trap}) So ${pretty(answer)}.`,
    };
  }
}

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
      answer: { type: 'int', value: v },
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
    prompt: [T.prose(`${given} θ = ${ft(g)} and θ is in quadrant ${ROMAN[q]}. Use an identity to find the exact value of ${s === 1 ? '' : 'x = '}${want} θ.`)],
    text: `from ratio: ${given} ${g.n}/${g.d}, quadrant ${ROMAN[q]}, want ${want}`,
    answer: s === 1 ? signedFrac(F(sWant * k, den)) : rootAnswer('x', v.n, v.d, v.r),
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
      prompt: [T.prose(`Find the exact value of x = ${fnText(fn, deg, radians)}.`)],
      text: `exact: ${fn} ${radians ? `${F(deg, 180).n}/${F(deg, 180).d} pi` : deg}`,
      answer: rootAnswer('x', v.n, v.d, v.r),
      visual: null,
      explain: `${fn === 'cos' ? 'Cosine is even' : `${fn === 'sin' ? 'Sine' : 'Tangent'} is odd`}: ${fnText(fn, deg, radians)} = ${fn === 'cos' ? '' : '−'}${fnText(fn, -deg, radians)}, and ${fnText(fn, -deg, radians)} = ${pText}. `
        + `(${fn === 'cos' ? 'The minus sign inside cosine simply disappears.' : 'The minus sign comes out in front.'}) So x = ${vText}.`,
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
];
const CF_POOL = ['K*sin(t)', 'K*cos(t)', 'K*tan(t)', 'K*cot(t)', 'K*sec(t)', 'K*csc(t)', 'K', '-K'];

function cofunction(rng) {
  const kind = rng.pick(['simplify', 'pair', 'pair', 'value']);
  if (kind === 'simplify') return simplifyProblem(rng, CF_BANK, CF_POOL);
  if (kind === 'pair') {
    const f = rng.pick(['sin', 'cos', 'tan', 'cot', 'sec', 'csc']);
    if (rng.chance(0.55)) {
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
      prompt: [T.prose(`${f}(${piText(a.n, a.d)}) = ${CO[f]}(θ), with θ between 0 and π/2. Find θ as a multiple of π.`), T.letter('θ'), T.op('='), T.blank(), T.letter('π')],
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
const surdSum = ([p, q]) => `(${p < 0 ? '-' : ''}sqrt(6) ${q > 0 ? '+' : '-'} sqrt(2))/4`;

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
        prompt: [T.prose(`Use a sum or difference formula to find the exact value of x = ${show}.`)],
        text: `exact: tan ${key}`,
        answer: { type: 'roots', value: { letter: 'x', roots: [{ a: { n: a, d: 1 }, b: { n: b, d: 1 }, r: 3 }] } },
        visual: null,
        explain: `Write ${angleText(deg, radians)} as ${split}, and tan(α ± β) = (tan α ± tan β)/(1 ∓ tan α tan β). With 1 and √3/3 that simplifies, after multiplying top and bottom by the conjugate, to ${minus(a)} ${b > 0 ? '+' : '−'} √3. `
          + `(tan(α + β) is not tan α + tan β.) So x = ${minus(a)} ${b > 0 ? '+' : '−'} √3.`,
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

const DA_VALUES = [
  ['2*sin(t)*cos(t)', 'sin'], ['cos(t)^2 - sin(t)^2', 'cos'], ['1 - 2*sin(t)^2', 'cos'], ['2*cos(t)^2 - 1', 'cos'], ['(2*tan(t))/(1 - tan(t)^2)', 'tan'],
];

function doubleAngle(rng) {
  const kind = rng.pick(['simplify', 'value', 'value', 'exact']);
  if (kind === 'simplify') return simplifyProblem(rng, DA_BANK, DA_POOL, { ks: [1], lead: 'Write more simply' });
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
      prompt: [T.prose(`Find the exact value of x = ${pretty(e, shown)}.`)],
      text: `identity value: ${e} at ${radians ? `${q.n}/${q.d} pi` : deg}`,
      answer: rootAnswer('x', v.n, v.d, v.r),
      visual: null,
      explain: `This is the double-angle formula for ${fn} 2θ with θ = ${radians ? piText(q.n, q.d) : `${deg}°`}, so it equals ${fnText(fn, 2 * deg, radians)} = ${vText}. `
        + `(Recognize the pattern instead of working out ${fn === 'tan' ? 'tan' : 'sin and cos'} of ${radians ? piText(q.n, q.d) : `${deg}°`}, which are not special values.) So x = ${vText}.`,
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
];

/** Single changes a careless step makes: a sign, a square, a swapped function. */
function slips(e) {
  const out = new Set();
  const swap = (s, a, b) => { for (let i = s.indexOf(a); i > -1; i = s.indexOf(a, i + 1)) if (!(a === '2*' && /[\^\d]/.test(s[i - 1] ?? ''))) out.add(s.slice(0, i) + b + s.slice(i + a.length)); };
  swap(e, ' + ', ' - '); swap(e, ' - ', ' + ');
  swap(e, 'sin', 'cos'); swap(e, 'cos', 'sin'); swap(e, 'tan', 'cot'); swap(e, 'cot', 'tan'); swap(e, 'sec', 'csc'); swap(e, 'csc', 'sec');
  swap(e, ')^2', ')'); swap(e, '2*', ''); swap(e, '1 - ', '1 + ');
  out.add(negate(e));
  out.add(/^-?\d+$/.test(e) ? String(2 * Number(e)) : `2*${e}`);
  out.add('0');
  return [...out];
}

const ALL_STEPS = PROOFS.flatMap(([start, goal, steps]) => steps.map((_, i) => ({ start, goal, steps, i })));

function proofStep(rng) {
  for (;;) {
    const { start, goal, steps, i } = rng.pick(ALL_STEPS);
    const lines = [start, ...steps.slice(0, i).map((s) => s[0])];
    const [next, reason] = steps[i];
    if (!same(start, goal) || !same(next, lines[lines.length - 1])) throw new Error(`proof of ${goal} breaks at ${next}`);
    const wrong = [];
    for (const e of rng.shuffle(slips(next))) {
      let v;
      try { v = fnOf(e)(1.1); } catch { continue; }
      if (wrong.length < 3 && Number.isFinite(v) && !same(e, next) && !wrong.some((w) => same(w, e))) wrong.push(e);
    }
    if (wrong.length < 3) throw new Error(`no slips for ${next}`);
    const all = rng.shuffle([next, ...wrong]);
    const opts = all.map((e, j) => ({ id: optionIds[j], e }));
    const shown = lines.map((l) => pretty(l)).join(' = ');
    return {
      prompt: [T.prose(`Prove ${pretty(start)} = ${pretty(goal)}. So far: ${shown}. Which line comes next?`)],
      text: `proof: goal ${start} = ${goal}; so far ${lines.join(' = ')}; options ${opts.map((o) => `${o.id}: ${o.e}`).join(' | ')}`,
      answer: { type: 'choice', value: optionIds[all.indexOf(next)], options: opts.map((o) => ({ id: o.id, label: `= ${pretty(o.e)}` })) },
      visual: null,
      explain: `${reason.includes('=') ? `By ${reason}` : reason[0].toUpperCase() + reason.slice(1)}: ${pretty(lines[lines.length - 1])} = ${pretty(next)}. `
        + `(Each line must equal the one before it; the other choices change a sign, a square or a function, so they are not equal.) So = ${pretty(next)}.`,
    };
  }
}

const CONTENT = [pythagorean, reciprocalQuotient, evenOdd, cofunction, sumDifference, doubleAngle, proofStep];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
