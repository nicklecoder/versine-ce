/**
 * Complex numbers typed as a + bi, read exactly -- the `complex` answer
 * type's arithmetic.
 *
 * The expression box cannot judge these: it knows nothing of i, so it would
 * take i·i for a square of a letter and never reduce it to −1, and comparing
 * by form would refuse 2i + 3 for 3 + 2i. Here a typed answer is read into
 * its real and imaginary parts as exact fractions, and two answers are equal
 * when both parts are: 3 + 2i, 2i + 3 and (6 + 4i)/2 agree, and 3 + 4/2i
 * agrees too though it is not yet finished; (−1 + 3i)/2 is finished, (6 + 4i)/2 is not. Anything with i² or a power left in is not read, with a
 * hint to work it out first, since an answer still holding i² is the
 * question copied back, not an answer.
 *
 * A conjugate pair, the two roots of a real quadratic, is one answer:
 * 2 ± 3i, or the two typed out, 2 + 3i, 2 − 3i (or "or"), each may be
 * named, x = 2 + 3i or x = 2 − 3i. ± is typed +- with the signs touching,
 * or +/-; a plus and a minus apart, 3 + -2i, are plus a negative.
 *
 * Read as typed besides: capitals (a phone's 3 − 2I), one bracket round the
 * whole, (3 − 2i), a minus before a bracket, −(7 + 6i)/17, and a bracketed
 * signed coefficient, 3 + (−2)i. A root left in is refused with its own hint.
 *
 * Value: { re, im, pm?, simplest? }, re and im fractions { n, d }; pm marks
 * the pair re ± im·i, im then stored positive. simplest is false when the
 * answer, though equal, is not yet one real part and one imaginary part in
 * lowest terms.
 */

const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
/** n/d reduced, the sign on top. */
function Q(n, d = 1) {
  if (d < 0) { n = -n; d = -d; }
  const g = gcd(n, d) || 1;
  return { n: n / g, d: d / g };
}
const add = (a, b) => Q(a.n * b.d + b.n * a.d, a.d * b.d);
const div = (a, k) => Q(a.n * k.d, a.d * k.n);
const same = (a, b) => a.n * b.d === b.n * a.d;
const ZERO = { n: 0, d: 1 };

/** "3", "2.5", "3/4", "(3/4)": an exact non-negative number, and whether it was written in lowest terms. */
function number(text) {
  let s = text;
  if (/^\(.*\)$/.test(s)) s = s.slice(1, -1);
  const m = /^(\d+(?:\.\d+)?)(?:\/(\d+(?:\.\d+)?))?$/.exec(s);
  if (!m) return null;
  const dec = (t) => {
    const [w, f = ''] = t.split('.');
    return Q(Number(w + f), 10 ** f.length);
  };
  const top = dec(m[1]);
  const bottom = m[2] ? dec(m[2]) : { n: 1, d: 1 };
  if (bottom.n === 0) return null;
  const v = div(top, bottom);
  const lowest = !m[2] || (gcd(Number(m[1]), Number(m[2])) === 1 && !m[1].includes('.') && !m[2].includes('.'));
  return { v, lowest };
}

/** (a + bi)/k is finished when a and b are whole, k > 1, and no number above 1 divides a, b and k. */
const cleared = (re, im, k) => re.d === 1 && im.d === 1 && k.n > 1 && gcd(gcd(re.n, im.n), k.n) === 1;

const POWER = 'Work out the powers of i first: i² is −1, so a complex answer is a + bi.';
const ROOT = 'Work out the root first: √−1 is i, so a complex answer is a + bi with no root left in.';

/** Whether s is one bracketed whole: (3 − 2i), not (3)(2i) or (1 + i)/2. */
function wrapped(s) {
  if (!s.startsWith('(') || !s.endsWith(')')) return false;
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    depth += s[i] === '(' ? 1 : s[i] === ')' ? -1 : 0;
    if (depth === 0 && i < s.length - 1) return false;
  }
  return true;
}

/** One complex number: real terms and i terms, summed. */
function single(s) {
  // −(7 + 6i)/17: a minus in front of a bracket reaches both parts. Over a
  // number it is as finished as (−7 − 6i)/17; −(3 − 2i) alone is not yet a + bi.
  if (/^-\(/.test(s)) {
    const inner = single(s.slice(1));
    if (!inner.ok) return inner;
    const finished = inner.simplest && /^-\(.+\)\/\d+$/.test(s) && !wrapped(s.slice(1));
    return { ok: true, re: Q(-inner.re.n, inner.re.d), im: Q(-inner.im.n, inner.im.d), simplest: finished };
  }
  if (wrapped(s)) return single(s.slice(1, -1));
  const over = /^\((.+)\)\/(\d+)$/.exec(s);
  if (over) {
    const inner = single(over[1]);
    if (!inner.ok) return inner;
    const k = Q(Number(over[2]));
    if (k.n === 0) return { ok: false };
    return { ok: true, re: div(inner.re, k), im: div(inner.im, k), simplest: inner.simplest && cleared(inner.re, inner.im, k) };
  }
  const terms = s.match(/[+-]?[^+-]+/g);
  if (!terms || terms.join('') !== s) return { ok: false };
  let re = ZERO, im = ZERO, reals = 0, imags = 0, lowest = true;
  for (const t of terms) {
    const sign = t[0] === '-' ? -1 : 1;
    const body = t.replace(/^[+-]/, '');
    const is = (body.match(/i/g) || []).length;
    if (is > 1) return { ok: false, hint: POWER };
    // An i term is 3i, i, (4/5)i, 4/5i, 4i/5 or i/5: nothing but a divisor after the i.
    const shape = is ? /^([\d./()]*)i(\/\d+(?:\.\d+)?)?$/.exec(body) : null;
    if (is && !shape) return { ok: false };
    let coef = is ? `${shape[1]}${shape[2] ?? ''}` : body;
    if (is && coef === '') coef = '1';
    if (is && coef.startsWith('/')) coef = `1${coef}`;
    const got = number(coef);
    if (!got) return { ok: false };
    const v = Q(sign * got.v.n, got.v.d);
    lowest = lowest && got.lowest;
    if (is) { im = add(im, v); imags += 1; } else { re = add(re, v); reals += 1; }
  }
  return { ok: true, re, im, simplest: lowest && reals <= 1 && imags <= 1 };
}

/** @returns {{ok: true, value: object} | {ok: false, hint?: string}} */
export function parseComplex(raw) {
  // Lowercase: a phone capitalises the first letter, so 3 − 2I is 3 − 2i.
  let s = String(raw).trim().toLowerCase().replace(/[−–—]/g, '-');
  // requiem: play/answers/plus-minus-only-when-touching
  // ± is +- with the two signs touching (2 +- 3i, 2+-3i) or +/-; a plus and a
  // minus with a space between, 3 + -2i, is plus a negative, 3 − 2i. Touching
  // signs with the number straight after, 3+-2i, could be either, and is
  // flagged so a question with one answer can ask rather than mark it.
  const touching = /\+-(?=[\d.i(])/.test(s);
  s = s.replace(/\+\/-|\+-|-\+/g, '±');
  // x = 2 + 3i or x = 2 − 3i: the letter may name each root.
  s = s.replace(/(^|,|;|\bor\b)\s*[a-hj-z]\s*=/g, '$1');
  s = s.replace(/\s+/g, '').replace(/\*|·|×/g, '').replace(/;/g, ',');
  // 3 + (−2)i: a signed coefficient in a bracket, then the signs combined.
  s = s.replace(/\(([+-])([\d./]+)\)(?=i)/g, '$1$2');
  for (let was = ''; was !== s;) { was = s; s = s.replace(/\+-|-\+/g, '-').replace(/--|\+\+/g, '+'); }
  if (!s) return { ok: false };
  if (/√|sqrt/.test(s)) return { ok: false, hint: ROOT };
  if (/\^|²|³/.test(s)) return { ok: false, hint: POWER };
  if (/[^0-9.i+\-±/(),or]/.test(s.replace(/or/g, ''))) return { ok: false };
  const read = parseOne(s);
  return read.ok && read.value.pm && touching ? { ...read, touching: true } : read;
}

function parseOne(s) {
  if (wrapped(s)) return parseOne(s.slice(1, -1));
  // A conjugate pair, a ± bi, or (a ± bi)/d.
  if (s.includes('±')) {
    const over = /^\((.*)±(.+)\)\/(\d+)$/.exec(s);
    const [left, right, by] = over ? [over[1], over[2], over[3]] : [s.slice(0, s.indexOf('±')), s.slice(s.indexOf('±') + 1), '1'];
    const a = left === '' ? { ok: true, re: ZERO, im: ZERO, simplest: true } : single(left);
    const b = single(right);
    if (!a.ok || !b.ok) return { ok: false, hint: a.hint || b.hint };
    if (!same(a.im, ZERO) || !same(b.re, ZERO) || same(b.im, ZERO)) return { ok: false };
    const k = Q(Number(by));
    if (k.n === 0) return { ok: false };
    const im = div(b.im, k);
    const finished = a.simplest && b.simplest && (!over || cleared(a.re, b.im, k));
    return { ok: true, value: { re: div(a.re, k), im: Q(Math.abs(im.n), im.d), pm: true, simplest: finished } };
  }
  // The two of a pair typed out: 2 + 3i, 2 − 3i.
  const listed = s.split(/,|or/).filter(Boolean);
  if (listed.length === 2) {
    const [a, b] = listed.map(single);
    if (!a.ok || !b.ok) return { ok: false, hint: a.hint || b.hint };
    if (!same(a.re, b.re) || !same(a.im, Q(-b.im.n, b.im.d)) || same(a.im, ZERO)) return { ok: false };
    return { ok: true, value: { re: a.re, im: Q(Math.abs(a.im.n), a.im.d), pm: true, simplest: a.simplest && b.simplest } };
  }
  if (listed.length !== 1 || s.includes(',')) return { ok: false };
  const one = single(s);
  if (!one.ok) return { ok: false, hint: one.hint };
  return { ok: true, value: { re: one.re, im: one.im, simplest: one.simplest } };
}

export const sameComplex = (a, b) => !!a.pm === !!b.pm && same(a.re, b.re) && same(a.im, b.im);

const frac = ({ n, d }, minus) => `${n < 0 ? minus : ''}${Math.abs(n)}${d === 1 ? '' : `/${d}`}`;
/** b·i written out without its sign: i, 3i, i/2, 4i/5 -- never 4/5i, which reads as 4/(5i). */
const imag = ({ n, d }) => `${Math.abs(n) === 1 ? '' : Math.abs(n)}i${d === 1 ? '' : `/${d}`}`;

/** 3 − 2i, −i, 4/5i, 2 ± 3i. ASCII minus when `ascii`, for the expression drawer. */
export function formatComplex(v, ascii = false) {
  const minus = ascii ? '-' : '−';
  const hasRe = v.re.n !== 0, hasIm = v.im.n !== 0;
  if (v.pm) return `${hasRe ? `${frac(v.re, minus)} ` : ''}± ${imag(v.im)}`.replace(/^± /, '±');
  if (hasRe && hasIm) return `${frac(v.re, minus)} ${v.im.n < 0 ? minus : '+'} ${imag(v.im)}`;
  if (hasIm) return `${v.im.n < 0 ? minus : ''}${imag(v.im)}`;
  return frac(v.re, minus);
}
