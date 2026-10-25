import { parseExpression } from './parse.js';
import { lettersIn } from './exact.js';

/**
 * An expression in one letter judged by what it is worth, not by how it is
 * spelled -- the `equivalent` answer type's arithmetic.
 *
 * The expression box (`expr`) compares canonical forms, deliberately: on a
 * level where the arithmetic is the point, 5 is not an answer to 2 + 3. But
 * on a level asking for f⁻¹(x) or for one fraction, the form is not the
 * point, and a student who typed x/2 − 3/2, 0.5x − 1.5 or (1/2)(x − 3) for
 * (x − 3)/2 has done what was asked. Listing every such form could never be
 * finished, so a level opts in to this instead.
 *
 * Two questions, kept apart the way value and form always are here:
 *
 *  - Is it the same function? Both sides are evaluated exactly, in BigInt
 *    fractions so no size of number can round, at fixed rational points,
 *    skipping any where either is undefined. Each is a quotient of
 *    polynomials whose degrees are bounded from its tree, and two such
 *    quotients that agree at more points than the degree of their
 *    cross-multiplied difference are identical: the count is computed, so
 *    the agreement is a proof, not a sample. A key with a root in it, such
 *    as ∛(x − 2), is evaluated at points chosen to make its radicand a
 *    perfect cube, where it is rational again.
 *
 *  - Is it finished? Read from the tree as typed: one quotient (or a
 *    polynomial), numeric fractions in lowest terms, no polynomial factor
 *    shared by top and bottom, like terms collected. A factor shared is found
 *    by degree: once the values agree, the typed denominator can only be the
 *    key's times a common factor, so a bigger degree means one was left in.
 *    Factored and multiplied-out tops and bottoms are both finished, and a
 *    minus sign may sit anywhere.
 */

// ── Exact BigInt fractions ────────────────────────────────────────────────

const abs = (a) => (a < 0n ? -a : a);
function bgcd(a, b) {
  a = abs(a); b = abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}
/** n/d reduced, the sign on top. d must not be 0. */
function Q(n, d = 1n) {
  if (d < 0n) { n = -n; d = -d; }
  const g = bgcd(n, d) || 1n;
  return { n: n / g, d: d / g };
}
const ZERO = Q(0n);
const ONE = Q(1n);
const add = (a, b) => Q(a.n * b.d + b.n * a.d, a.d * b.d);
const neg = (a) => ({ n: -a.n, d: a.d });
const mul = (a, b) => Q(a.n * b.n, a.d * b.d);
const isZero = (a) => a.n === 0n;
const same = (a, b) => a.n === b.n && a.d === b.d;

/** "0.25" -> 1/4. */
function number(text) {
  const [whole, part = ''] = text.split('.');
  return Q(BigInt(whole || '0') * 10n ** BigInt(part.length) + BigInt(part || '0'), 10n ** BigInt(part.length));
}

/** The whole k-th root of n ≥ 0, or null when n is not a perfect k-th power. */
function wholeRoot(n, k) {
  if (n < 2n) return n;
  let lo = 1n, hi = 1n;
  while (hi ** k <= n) hi *= 2n;
  while (lo < hi - 1n) {
    const mid = (lo + hi) / 2n;
    if (mid ** k <= n) lo = mid; else hi = mid;
  }
  return lo ** k === n ? lo : null;
}
function rootOf(v, k) {
  if (v.n < 0n) {
    if (k % 2n === 0n) return null;
    const r = rootOf(neg(v), k);
    return r && neg(r);
  }
  const n = wholeRoot(v.n, k), d = wholeRoot(v.d, k);
  return n === null || d === null ? null : Q(n, d);
}

// ── Evaluating, exactly ───────────────────────────────────────────────────

/** Where an expression divides by zero: skipped, unlike a value that is irrational. */
const POLE = { pole: true };

/**
 * The value of a tree at one point, a fraction; POLE where it divides by
 * zero; null where it is not a rational number at all (√2, pi, a letter
 * with no value).
 */
function evalAt(node, env) {
  switch (node.t) {
    case 'num': return number(node.v);
    case 'var': return env[node.v] ?? null;
    case 'neg': {
      const a = evalAt(node.a, env);
      return a && a !== POLE ? neg(a) : a;
    }
    case 'call': {
      const args = node.args.map((a) => evalAt(a, env));
      if (args.some((a) => a === null)) return null;
      if (args.some((a) => a === POLE)) return POLE;
      if (node.fn === 'abs') return { n: abs(args[0].n), d: args[0].d };
      if (node.fn === 'sqrt') return rootOf(args[0], 2n);
      if (node.fn === 'root') {
        const [k, v] = args;
        if (k.d !== 1n || k.n < 2n || k.n > 12n) return null;
        return rootOf(v, k.n);
      }
      return null;
    }
    case 'bin': {
      const a = evalAt(node.a, env), b = evalAt(node.b, env);
      if (a === null || b === null) return null;
      if (a === POLE || b === POLE) return POLE;
      if (node.op === '+') return add(a, b);
      if (node.op === '-') return add(a, neg(b));
      if (node.op === '*') return mul(a, b);
      if (node.op === '/') return isZero(b) ? POLE : mul(a, Q(b.d, b.n));
      if (node.op === '^') {
        if (abs(b.n) > 40n || b.d > 12n) return null;
        let base = a;
        if (b.d !== 1n) base = rootOf(a, b.d);
        if (base === null) return null;
        if (b.n < 0n && isZero(base)) return POLE;
        let out = ONE;
        for (let i = 0n; i < abs(b.n); i++) out = mul(out, base);
        return b.n < 0n ? Q(out.d, out.n) : out;
      }
      return null;
    }
    default: return null;
  }
}

/** A number the tree is, with no letter in it: an exponent, a root's index. */
const constant = (node) => {
  const v = evalAt(node, {});
  return v && v !== POLE ? v : null;
};

/**
 * Upper bounds on the degrees of the top and bottom of a tree once it is
 * written as one quotient of polynomials, the letter itself counting `xdeg`;
 * null where no bound can be given.
 */
function degrees(node, xdeg) {
  switch (node.t) {
    case 'num': case 'const': return [0, 0];
    case 'var': return [xdeg, 0];
    case 'neg': return degrees(node.a, xdeg);
    case 'call': {
      if (node.fn === 'abs') return null;
      const k = node.fn === 'sqrt' ? 2 : Number(constant(node.args[0])?.n ?? 0);
      const inner = degrees(node.args[node.args.length - 1], xdeg);
      return inner && k >= 2 ? inner.map((g) => Math.ceil(g / k)) : null;
    }
    case 'bin': {
      const a = degrees(node.a, xdeg);
      if (!a) return null;
      if (node.op === '^') {
        const e = constant(node.b);
        if (!e || abs(e.n) > 40n || e.d > 12n) return null;
        const p = Math.abs(Number(e.n)), q = Number(e.d);
        const up = a.map((g) => Math.ceil((g * p) / q));
        return e.n < 0n ? [up[1], up[0]] : up;
      }
      const b = degrees(node.b, xdeg);
      if (!b) return null;
      if (node.op === '+' || node.op === '-') return [Math.max(a[0] + b[1], b[0] + a[1]), a[1] + b[1]];
      if (node.op === '*') return [a[0] + b[0], a[1] + b[1]];
      if (node.op === '/') return [a[0] + b[1], a[1] + b[0]];
      return null;
    }
    default: return null;
  }
}

/** The fixed points tried, small fractions of both signs, in a fixed order. */
const POINTS = (() => {
  const out = [], seen = new Set();
  for (const d of [3n, 1n, 2n, 5n, 7n, 4n, 11n]) {
    for (let n = 1n; n <= 14n; n++) {
      for (const s of [1n, -1n]) {
        const q = Q(s * n, d);
        const key = `${q.n}/${q.d}`;
        if (!seen.has(key)) { seen.add(key); out.push(q); }
      }
    }
  }
  return out;
})();

/** The roots a key takes, as [index, radicand], so points can be chosen to clear them. */
function radicals(node, out = []) {
  if (node.t === 'call' && node.fn === 'sqrt') out.push([2n, node.args[0]]);
  if (node.t === 'call' && node.fn === 'root') {
    const k = constant(node.args[0]);
    if (k && k.d === 1n) out.push([k.n, node.args[1]]);
  }
  if (node.t === 'bin' && node.op === '^') {
    const e = constant(node.b);
    if (e && e.d > 1n) out.push([e.d, node.a]);
  }
  for (const k of ['a', 'b']) if (node[k]) radicals(node[k], out);
  for (const a of node.args ?? []) radicals(a, out);
  return out;
}

/**
 * How the letter is set from each point t: x = t, or, for a key with one
 * root of a radicand αx + β in it, x = (tᵏ − β)/α, where that root is t.
 */
function pointsFor(key, letter) {
  const plain = { xdeg: 1, at: (t) => t, only: () => true };
  const found = radicals(key);
  if (!found.length) return plain;
  const [k, inside] = found[0];
  const v = (x) => evalAt(inside, { [letter]: Q(BigInt(x)) });
  const [e0, e1, e2] = [v(0), v(1), v(2)];
  if (!e0 || !e1 || !e2 || e0 === POLE || e1 === POLE || e2 === POLE) return plain;
  const alpha = add(e1, neg(e0));
  if (isZero(alpha) || !same(add(e2, neg(e1)), alpha)) return plain;
  return {
    xdeg: Number(k),
    at: (t) => { let p = ONE; for (let i = 0n; i < k; i++) p = mul(p, t); return mul(add(p, neg(e0)), Q(alpha.d, alpha.n)); },
    // An even root is t only for t ≥ 0.
    only: (t) => k % 2n === 1n || t.n > 0n,
  };
}

/**
 * Whether two trees are one function of their letter. `key` is the stored
 * answer: its points decide where to look, and where it is undefined is
 * skipped.
 */
export function sameFunction(typed, key) {
  const letters = new Set([...lettersIn(typed), ...lettersIn(key)]);
  if (letters.size > 1) return false;
  const letter = [...letters][0] ?? 'x';
  const how = pointsFor(key, letter);
  const dt = degrees(typed, how.xdeg), dk = degrees(key, how.xdeg);
  if (!dt || !dk) return false;
  // P/Q and R/S agree everywhere when PS − RQ, of at most this degree, has
  // more zeros than its degree.
  const need = Math.max(dt[0] + dk[1], dk[0] + dt[1]) + 1;
  if (need > 60) return false;
  let agreed = 0;
  for (const t of POINTS) {
    if (!how.only(t)) continue;
    const env = { [letter]: how.at(t) };
    const want = evalAt(key, env);
    if (want === null || want === POLE) continue;
    const got = evalAt(typed, env);
    if (got === POLE) continue;
    if (got === null || !same(got, want)) return false;
    if (++agreed >= need) return true;
  }
  return false;
}

// ── Finished form ─────────────────────────────────────────────────────────

const pTrim = (p) => { const q = p.slice(); while (q.length > 1 && isZero(q[q.length - 1])) q.pop(); return q; };
const pAdd = (p, q) => pTrim(Array.from({ length: Math.max(p.length, q.length) }, (_, i) => add(p[i] ?? ZERO, q[i] ?? ZERO)));
const pScale = (p, c) => pTrim(p.map((a) => mul(a, c)));
function pMul(p, q) {
  const out = Array.from({ length: p.length + q.length - 1 }, () => ZERO);
  p.forEach((a, i) => q.forEach((b, j) => { out[i + j] = add(out[i + j], mul(a, b)); }));
  return pTrim(out);
}
const pDeg = (p) => (p.length === 1 && isZero(p[0]) ? -1 : p.length - 1);
const pIsConst = (p) => p.length === 1;

/** gcd of two polynomials by Euclid, over the rationals. */
function pGcd(p, q) {
  p = pTrim(p); q = pTrim(q);
  while (pDeg(q) >= 0) {
    let r = p.slice();
    while (pDeg(r) >= pDeg(q)) {
      const k = mul(r[r.length - 1], Q(q[q.length - 1].d, q[q.length - 1].n));
      const shift = r.length - q.length;
      r = pTrim(r.map((c, i) => (i >= shift && i - shift < q.length ? add(c, neg(mul(k, q[i - shift]))) : c)));
      if (pDeg(r) < 0) break;
    }
    [p, q] = [q, r];
  }
  return p;
}

/** The greatest whole number dividing every coefficient, or null if one is not whole. */
function content(p) {
  if (p.some((c) => c.d !== 1n)) return null;
  return p.reduce((g, c) => bgcd(g, c.n), 0n);
}

/** A tree in the letter as a polynomial, lowest power first; null if it divides by the letter or has a root. */
function polyOf(node, letter) {
  switch (node.t) {
    case 'num': return [number(node.v)];
    case 'var': return node.v === letter ? [ZERO, ONE] : null;
    case 'neg': { const a = polyOf(node.a, letter); return a && pScale(a, Q(-1n)); }
    case 'bin': {
      const a = polyOf(node.a, letter);
      if (!a) return null;
      if (node.op === '^') {
        const e = constant(node.b);
        if (!e || e.d !== 1n || e.n < 0n || e.n > 20n) return null;
        let out = [ONE];
        for (let i = 0n; i < e.n; i++) out = pMul(out, a);
        return out;
      }
      const b = polyOf(node.b, letter);
      if (!b) return null;
      if (node.op === '+') return pAdd(a, b);
      if (node.op === '-') return pAdd(a, pScale(b, Q(-1n)));
      if (node.op === '*') return pMul(a, b);
      if (node.op === '/') return pIsConst(b) && !isZero(b[0]) ? pScale(a, Q(b[0].d, b[0].n)) : null;
      return null;
    }
    default: return null;
  }
}

const hasLetter = (node) => lettersIn(node).size > 0;

/**
 * A tree as one quotient: the polynomials multiplied on top and underneath,
 * how many times it divides by something with the letter in it, and whether
 * a factor is not a polynomial at all (a fraction inside a fraction).
 */
function quotient(node, letter) {
  const out = { num: [], den: [], divides: 0, bad: false };
  const walk = (n, under) => {
    if (n.t === 'neg') return walk(n.a, under);
    if (n.t === 'bin' && n.op === '*') { walk(n.a, under); walk(n.b, under); return; }
    if (n.t === 'bin' && n.op === '/') {
      if (hasLetter(n.b)) out.divides++;
      walk(n.a, under); walk(n.b, !under);
      return;
    }
    // A negative power is a division: (x + 3)^−1 is 1/(x + 3).
    if (n.t === 'bin' && n.op === '^') {
      const e = constant(n.b);
      if (e && e.d === 1n && e.n < 0n) {
        if (hasLetter(n.a)) out.divides++;
        const p = polyOf({ t: 'bin', op: '^', a: n.a, b: { t: 'num', v: String(-e.n) } }, letter);
        if (!p) out.bad = true; else (under ? out.num : out.den).push(p);
        return;
      }
    }
    const p = polyOf(n, letter);
    if (!p) out.bad = true;
    else (under ? out.den : out.num).push(p);
  };
  walk(node, false);
  out.N = out.num.reduce(pMul, [ONE]);
  out.D = out.den.reduce(pMul, [ONE]);
  return out;
}

/** Every sum in the tree, as the list of its terms with their signs taken off. */
function sums(node, out = []) {
  if (node.t === 'bin' && (node.op === '+' || node.op === '-')) {
    const terms = [];
    const gather = (n) => {
      if (n.t === 'bin' && (n.op === '+' || n.op === '-')) { gather(n.a); gather(n.b); return; }
      if (n.t === 'neg' && !n.paren) { gather(n.a); return; }
      terms.push(n);
    };
    gather(node);
    out.push(terms);
    for (const t of terms) sums(t, out);
    return out;
  }
  for (const k of ['a', 'b']) if (node[k]) sums(node[k], out);
  for (const a of node.args ?? []) sums(a, out);
  return out;
}

/** Every division by a plain number: 2/4 and (2x − 6)/4 are not in lowest terms. */
function numberFractionsReduced(node, letter) {
  if (node.t === 'bin' && node.op === '/' && !hasLetter(node.b)) {
    const top = polyOf(node.a, letter), under = constant(node.b);
    const g = top && content(top);
    if (under && under.d === 1n && g !== null && g !== undefined && bgcd(g, under.n) > 1n) return false;
  }
  for (const k of ['a', 'b']) if (node[k] && !numberFractionsReduced(node[k], letter)) return false;
  return (node.args ?? []).every((a) => numberFractionsReduced(a, letter));
}

/**
 * Like terms collected: each sum is of single terms, one of each power, so
 * 2(x + 1) − (3x + 8) on top is not finished and x² + 3x is. A term with a
 * root in it is its own kind, told apart by how it is written.
 */
function collected(node, letter) {
  for (const terms of sums(node)) {
    const kinds = new Set();
    for (const t of terms) {
      const p = polyOf(t, letter);
      let kind;
      if (p) {
        const live = p.map((c, i) => (isZero(c) ? -1 : i)).filter((i) => i >= 0);
        if (live.length !== 1) return false;
        kind = `p${live[0]}`;
      } else if (radicals(t).length) {
        kind = `r${JSON.stringify(t, (k, v) => (k === 'paren' || k === 'implicit' ? undefined : v))}`;
      } else {
        return false;
      }
      if (kinds.has(kind)) return false;
      kinds.add(kind);
    }
  }
  return true;
}

/**
 * Whether a typed tree equal to the key is in its simplest form. Read only
 * after the values have agreed: the degree test leans on that.
 */
export function finished(typed, key) {
  const letter = [...lettersIn(key), ...lettersIn(typed)][0] ?? 'x';
  if (!numberFractionsReduced(typed, letter) || !collected(typed, letter)) return false;
  // A key with a root is not a quotient of polynomials: the checks above are all.
  if (radicals(key).length) return true;
  const t = quotient(typed, letter), k = quotient(key, letter);
  if (t.bad || t.divides > 1) return false;
  if (k.bad) return true;
  const keyDen = pDeg(k.D) - pDeg(pGcd(k.N, k.D));
  if (pDeg(t.D) !== keyDen) return false;
  // One fraction with the letter underneath: its top and bottom whole, and
  // sharing no number, (2x + 4)/(2x + 6) being (x + 2)/(x + 3) unfinished.
  if (pDeg(t.D) > 0) {
    const cn = content(t.N), cd = content(t.D);
    if (cn === null || cd === null || bgcd(cn, cd) > 1n) return false;
  }
  return true;
}

/**
 * The leading "y =", "f(x) =" or "f⁻¹(x) =" a student writes before an
 * expression, taken off: that is how the answer is written on paper, and
 * the question already named what the expression is.
 */
// requiem: play/answers/expression-name-prefix-stripped
export function withoutName(raw) {
  return String(raw).trim()
    .replace(/^\s*(?:y|[a-z]\s*(?:⁻¹|\^\s*[-−]\s*1|\^\s*\(\s*[-−]\s*1\s*\))?\s*\(\s*[a-z]\s*\))\s*=\s*/i, '');
}

/** Parsed, with the name stripped off the front. */
export function parseNamed(raw) {
  const text = withoutName(raw);
  return { text, parsed: parseExpression(text.replace(/[−–—]/g, '-')) };
}
