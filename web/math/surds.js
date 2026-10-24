import { frac, reduce } from './frac.js';
import { parseExpression } from './parse.js';

/**
 * The exact roots of a quadratic, as a student types them.
 *
 * A quadratic with whole coefficients has roots of the form a + b√r, with a
 * and b fractions and r a whole number with no square factor: −3 ± √7,
 * (−3 ± √17)/4, 5/2. Arithmetic on numbers of that form never leaves it so
 * long as only one r is in play, so an answer is evaluated exactly in it and
 * compared as a set -- (−3 ± √17)/4, −3/4 ± √17/4 and (−6 ± √68)/8 are one
 * answer -- with no rounding anywhere to tell a right answer it is wrong.
 *
 * ± is not an operator the parser knows, and is not given one: an entry with
 * a ± is read as two entries, one with each sign, which is all it means.
 *
 * @typedef {{a:{n:number,d:number}, b:{n:number,d:number}, r:number}} Surd
 */

const Q = (n, d = 1) => reduce(frac(n, d));
const ZERO = Q(0);
const qadd = (x, y) => Q(x.n * y.d + y.n * x.d, x.d * y.d);
const qmul = (x, y) => Q(x.n * y.n, x.d * y.d);
const qneg = (x) => Q(-x.n, x.d);

/** The largest square dividing n, and what is left: 68 → [2, 17]. */
function squarePart(n) {
  for (let k = Math.floor(Math.sqrt(n)); k > 1; k--) if (n % (k * k) === 0) return [k, n / (k * k)];
  return [1, n];
}

/** a + b√r with the rational part folded in when there is no root left. */
function surd(a, b = ZERO, r = 1) {
  if (b.n === 0 || r === 1) return { a: qadd(a, r === 1 ? b : ZERO), b: ZERO, r: 1 };
  return { a, b, r };
}
const rational = (x) => surd(x);

/** One radicand at a time: √2 + √3 is not something a quadratic answers. */
function common(s, t) {
  if (s.r === 1) return t.r;
  if (t.r === 1 || t.r === s.r) return s.r;
  return null;
}

const add = (s, t) => {
  const r = common(s, t);
  return r === null ? null : surd(qadd(s.a, t.a), qadd(s.b, t.b), r);
};
const neg = (s) => surd(qneg(s.a), qneg(s.b), s.r);
function mul(s, t) {
  const r = common(s, t);
  if (r === null) return null;
  // (a + b√r)(c + d√r) = ac + bd·r + (ad + bc)√r
  return surd(qadd(qmul(s.a, t.a), qmul(qmul(s.b, t.b), Q(r))), qadd(qmul(s.a, t.b), qmul(s.b, t.a)), r);
}
function inverse(s) {
  // 1/(a + b√r) = (a − b√r) / (a² − b²r), and r has no square factor, so
  // that is zero only when the number was.
  const den = qadd(qmul(s.a, s.a), qneg(qmul(qmul(s.b, s.b), Q(s.r))));
  if (den.n === 0) return null;
  const over = Q(den.d, den.n);
  return surd(qmul(s.a, over), qneg(qmul(s.b, over)), s.r);
}
function root(s) {
  if (s.r !== 1 || s.a.n < 0) return null;
  const [k, m] = squarePart(s.a.n * s.a.d);
  return surd(ZERO, Q(k, s.a.d), m);
}

/** "0.25" → 1/4. */
function number(text) {
  const [whole, part = ''] = text.split('.');
  const d = 10 ** part.length;
  return Q(parseInt(whole || '0', 10) * d + (part ? parseInt(part, 10) : 0), d);
}

/** A parsed expression with no letters in it, evaluated exactly, or null. */
export function surdAt(node) {
  switch (node.t) {
    case 'num': return rational(number(node.v));
    case 'neg': { const a = surdAt(node.a); return a && neg(a); }
    case 'call': {
      if (node.fn !== 'sqrt') return null;
      const a = surdAt(node.args[0]);
      return a && root(a);
    }
    case 'bin': {
      const a = surdAt(node.a), b = surdAt(node.b);
      if (!a || !b) return null;
      if (node.op === '+') return add(a, b);
      if (node.op === '-') return add(a, neg(b));
      if (node.op === '*') return mul(a, b);
      if (node.op === '/') { const inv = inverse(b); return inv && mul(a, inv); }
      if (node.op === '^') {
        if (b.r !== 1 || b.a.d !== 1 || Math.abs(b.a.n) > 12) return null;
        let out = rational(Q(1));
        for (let i = 0; i < Math.abs(b.a.n); i++) out = out && mul(out, a);
        return b.a.n < 0 ? out && inverse(out) : out;
      }
      return null;
    }
    default: return null;
  }
}

const sameQ = (x, y) => x.n === y.n && x.d === y.d;
const sameSurd = (s, t) => sameQ(s.a, t.a) && sameQ(s.b, t.b) && s.r === t.r;
const size = (s) => s.a.n / s.a.d + (s.b.n / s.b.d) * Math.sqrt(s.r);

const NOTHING = /^(no (real )?(solutions?|roots?)|none)$/;
const HINT = 'Type it exactly, like 2sqrt(5), or x = 3 +- sqrt(5) for two. Type +- for ±.';

/**
 * The entries of a typed answer, ± expanded: "x = (−3 ± √17)/4" is the two
 * texts "(-3 + √17)/4" and "(-3 - √17)/4". Shared by reading and previewing.
 * @returns {{ok:true, letter:string|null, texts:string[]}|{ok:false, hint:string}}
 */
function entries(raw) {
  const text = String(raw).trim().toLowerCase()
    .replace(/[−–—]/g, '-').replace(/\+\/-|\+-|-\+/g, '±').replace(/\s+/g, ' ');
  if (!text) return { ok: false, hint: HINT };
  if (NOTHING.test(text)) return { ok: true, letter: null, texts: [] };
  let letter = null;
  const texts = [];
  for (const piece of text.split(/\s*(?:\bor\b|,|;)\s*/)) {
    const m = piece.match(/^([a-z])\s*=\s*(.+)$/);
    if (m && letter && m[1] !== letter) return { ok: false, hint: 'Use one letter throughout.' };
    if (m) letter = m[1];
    const body = m ? m[2] : piece;
    // A number, so no letter but the sqrt that names a root.
    if (/=/.test(body) || /[a-z]/.test(body.replace(/sqrt/g, ''))) return { ok: false, hint: HINT };
    if ((body.match(/±/g) ?? []).length > 1) return { ok: false, hint: 'One ± in each answer.' };
    texts.push(...(body.includes('±') ? [body.replace('±', '+'), body.replace('±', '-')] : [body]));
  }
  return { ok: true, letter, texts };
}

const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));

/**
 * Whether one typed entry is written in simplest radical form: every root of
 * a whole number with no square left in it (√20 is not, 2√5 is), and over a
 * whole denominator nothing that divides the whole top as well -- (4 ± 2√3)/2
 * is 2 ± √3 unfinished. The value is the same either way, which is why this
 * looks at what was typed rather than at the number.
 */
function simplestAsTyped(ast) {
  const radicands = [];
  const walk = (n) => {
    if (!n || typeof n !== 'object') return;
    if (n.t === 'call' && n.fn === 'sqrt') radicands.push(n.args[0]);
    for (const k of ['a', 'b']) walk(n[k]);
    (n.args ?? []).forEach(walk);
  };
  walk(ast);
  for (const r of radicands) {
    if (r.t !== 'num' || !/^\d+$/.test(r.v)) return false;
    const n = parseInt(r.v, 10);
    if (n < 2 || squarePart(n)[0] > 1) return false;
  }
  if (ast.t === 'bin' && ast.op === '/' && ast.b.t === 'num' && /^\d+$/.test(ast.b.v)) {
    const top = surdAt(ast.a), d = parseInt(ast.b.v, 10);
    if (d === 1) return false;
    if (top && top.a.d === 1 && top.b.d === 1 && gcd(gcd(top.a.n, top.b.n), d) > 1) return false;
  }
  return true;
}

/**
 * Read the roots a student typed.
 * @returns {{ok:true, value:{letter:string, roots:Surd[]}}|{ok:false, hint:string}}
 */
export function parseRoots(raw) {
  const e = entries(raw);
  if (!e.ok) return e;
  // A decimal of three places or more is a rounded root, near it and never
  // equal: say so rather than "not quite". Shorter ones may be exact (2.5).
  if (e.texts.length && e.texts.some((t) => /^-?\d*\.\d{3,}$/.test(t.trim()))) {
    return { ok: false, hint: 'Give it exactly, with sqrt( ), not as a decimal.' };
  }
  const roots = [];
  let simplest = true;
  for (const text of e.texts) {
    const parsed = parseExpression(text);
    if (!parsed.ok) return { ok: false, hint: parsed.error };
    const v = surdAt(parsed.ast);
    if (!v) return { ok: false, hint: 'Each solution is a number, like 3 + √5 or −2/3.' };
    simplest = simplest && simplestAsTyped(parsed.ast);
    if (!roots.some((s) => sameSurd(s, v))) roots.push(v);
  }
  return {
    ok: true,
    value: { letter: e.letter ?? 'x', roots: roots.sort((s, t) => size(s) - size(t)), simplest },
  };
}

export function sameRoots(x, y) {
  return x.roots.length === y.roots.length && x.roots.every((s) => y.roots.some((t) => sameSurd(s, t)));
}

/** The typed entries, ± expanded, for a preview that shows how ± was read. */
export function rootTexts(raw) {
  const e = entries(raw);
  return e.ok ? { ok: true, letter: e.letter ?? 'x', texts: e.texts } : e;
}

const sign = (n) => (n < 0 ? '−' : '');
const lcm = (a, b) => { let x = a, y = b; while (y) [x, y] = [y, x % y]; return (a * b) / x; };

/** One root, or a conjugate pair with its ±, as a + b√r over one denominator. */
function written(s, pm = false) {
  const d = lcm(s.a.d, s.b.d);
  const A = (s.a.n * d) / s.a.d, B = (s.b.n * d) / s.b.d;
  if (s.r === 1) return s.a.d === 1 ? `${sign(A)}${Math.abs(A)}` : `${sign(s.a.n)}${Math.abs(s.a.n)}/${s.a.d}`;
  const rad = `${Math.abs(B) === 1 ? '' : Math.abs(B)}√${s.r}`;
  const inner = A === 0 ? `${pm ? '±' : sign(B)}${rad}` : `${sign(A)}${Math.abs(A)} ${pm ? '±' : B < 0 ? '−' : '+'} ${rad}`;
  if (d === 1) return inner;
  return A === 0 ? `${inner}/${d}` : `(${inner})/${d}`;
}

/** x = (−3 ± √17)/4 · x = −2 or x = 5 · x = 3 · no real solutions. */
export function formatRoots({ letter = 'x', roots }) {
  if (!roots.length) return 'no real solutions';
  const [s, t] = roots;
  if (t && s.r > 1 && s.r === t.r && sameQ(s.a, t.a) && sameQ(s.b, qneg(t.b))) {
    return `${letter} = ${written(s.b.n > 0 ? s : t, true)}`;
  }
  return roots.map((x) => `${letter} = ${written(x)}`).join(' or ');
}

/**
 * The same as prompt terms, for the reveal: a fraction drawn as a fraction
 * and √17 as a radical, which formatRoots' text cannot be parsed back into,
 * since the parser has no ±.
 */
export function rootTerms({ letter = 'x', roots }) {
  if (!roots.length) return [{ t: 'prose', v: 'no real solutions' }];
  const num = (n) => ({ t: 'num', v: `${sign(n)}${Math.abs(n)}` });
  const one = (s, pm) => {
    const d = lcm(s.a.d, s.b.d);
    const A = (s.a.n * d) / s.a.d, B = (s.b.n * d) / s.b.d;
    if (s.r === 1) return s.a.d === 1 ? [num(s.a.n)] : [{ t: 'frac', n: [num(s.a.n)], d: [num(s.a.d)] }];
    const rad = { t: 'juxt', terms: [...(Math.abs(B) === 1 ? [] : [num(Math.abs(B))]), { t: 'root', v: [num(s.r)] }] };
    const top = A === 0
      ? [...(pm ? [{ t: 'op', v: '±' }] : B < 0 ? [{ t: 'op', v: '−' }] : []), rad]
      : [num(A), { t: 'op', v: pm ? '±' : B < 0 ? '−' : '+' }, rad];
    return d === 1 ? top : [{ t: 'frac', n: top, d: [num(d)] }];
  };
  const [s, t] = roots;
  if (t && s.r > 1 && s.r === t.r && sameQ(s.a, t.a) && sameQ(s.b, qneg(t.b))) {
    return [{ t: 'var', v: letter }, { t: 'op', v: '=' }, ...one(s.b.n > 0 ? s : t, true)];
  }
  return roots.flatMap((x, i) => [...(i ? [{ t: 'prose', v: 'or' }] : []), { t: 'var', v: letter }, { t: 'op', v: '=' }, ...one(x, false)]);
}
