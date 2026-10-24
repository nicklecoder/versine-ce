/**
 * Answer types. A skill declares what *kind* of thing it wants back, and the
 * type owns parsing, comparison, and formatting. This is the seam that lets
 * fractions, expressions and radicals slot in later without touching the
 * engine: define a type here, and every skill can use it.
 *
 * @typedef {object} AnswerType
 * @property {string} id
 * @property {'int'|'frac'|'text'|'choice'} input   which input widget to show
 * @property {string} hint                          shown when parsing fails
 * @property {(raw:string) => {ok:boolean, value?:any}} parse
 * @property {(a:any, b:any) => boolean} equals
 * @property {(v:any) => string} format
 */

import { parseExpression, canonical } from './parse.js';
import { valueAt, lettersIn } from './exact.js';
import { parseSet, sameSet, formatSet, previewSet, combined } from './solutions.js';
import { parseRoots, sameRoots, formatRoots, rootTexts } from './surds.js';
import { previewOf } from '../ui/express.js';

/** @type {Record<string, AnswerType>} */
const TYPES = {};

/** @param {AnswerType} type */
export function defineType(type) {
  TYPES[type.id] = type;
  return type;
}

/**
 * Every answer type that exists, published so the deploy gate can check a
 * catalogue row against it rather than keeping its own list. The gate had a
 * hardcoded set once and declared four thousand correct problems broken the
 * first time a type was added.
 */
export const TYPE_IDS = () => Object.keys(TYPES);

/** @param {string} id @returns {AnswerType} */
export function getType(id) {
  const t = TYPES[id];
  if (!t) throw new Error(`Unknown answer type: ${id}`);
  return t;
}

/** Normalise the various dashes a keyboard or a copy-paste can produce. */
const normalize = (raw) =>
  String(raw).trim().replace(/[−–—]/g, '-').replace(/\s+/g, '');

defineType({
  id: 'int',
  input: 'int',
  hint: 'Type a whole number (a minus sign is fine).',
  parse(raw) {
    const s = normalize(raw);
    if (!/^[+-]?\d+$/.test(s)) return { ok: false };
    return { ok: true, value: parseInt(s, 10) };
  },
  equals: (a, b) => a === b,
  format: (v) => (v < 0 ? `−${Math.abs(v)}` : String(v)),
});

defineType({
  id: 'frac',
  input: 'frac',
  hint: 'Type a numerator and a denominator.',
  parse(raw) {
    const s = normalize(raw);
    // A whole number is a fraction over one -- accept it rather than nitpick.
    if (/^[+-]?\d+$/.test(s)) return { ok: true, value: { n: parseInt(s, 10), d: 1 } };
    // requiem: play/answers/decimal-in-a-fraction-box
    // A decimal is read for its value, so a right one is told to be written
    // as a fraction instead of being marked wrong as a different number.
    const dm = s.match(/^([+-]?)(\d*)\.(\d+)$/);
    if (dm) {
      const d = 10 ** dm[3].length;
      const n = (parseInt(dm[2] || '0', 10) * d + parseInt(dm[3], 10)) * (dm[1] === '-' ? -1 : 1);
      return { ok: true, value: { n, d }, decimal: true };
    }
    const m = s.match(/^([+-]?\d+)\/(\d+)$/);
    if (!m) return { ok: false };
    const d = parseInt(m[2], 10);
    if (d === 0) return { ok: false };
    return { ok: true, value: { n: parseInt(m[1], 10), d } };
  },
  equals: (a, b) => a.n * b.d === b.n * a.d,
  formHint: (parsed) => (parsed.decimal ? 'That is the right value as a decimal. Write it as a fraction instead.' : null),
  /** Stacked notation, matching how the question is written. */
  html: (v) => (v.d === 1 ? String(v.n)
    : `<span class="frac-term"><span class="fn">${v.n}</span>`
      + `<span class="fl"></span><span class="fd">${v.d}</span></span>`),
  /** Used only where a level asks for simplest form. */
  isSimplest: (v) => {
    let x = Math.abs(v.n), y = Math.abs(v.d);
    while (y) [x, y] = [y, x % y];
    return (x || 1) === 1;
  },
  format: (v) => (v.d === 1 ? String(v.n) : `${v.n}/${v.d}`),
});

defineType({
  id: 'mixed',
  input: 'mixed',
  hint: 'Give a whole number and a fraction, like 1 3/4.',
  /**
   * Parsed to a single improper fraction, so comparison is just fraction
   * equality. The *form* is checked separately: a mixed number whose fraction
   * part is not proper hasn't finished the job, and accepting it would let a
   * student answer "0 7/4" to the question "what is 7/4 as a mixed number".
   */
  parse(raw) {
    // The shared normaliser strips whitespace; here the space between the
    // whole and the fraction is the only thing separating them.
    const text = String(raw).trim().replace(/[−–—]/g, '-').replace(/\s+/g, ' ');
    if (!text) return { ok: false };

    const parts = text.split(' ');
    const asFraction = (t) => t.match(/^(\d+)\/(\d+)$/);
    let whole = 0, n = 0, d = 1;

    if (parts.length === 2) {
      if (!/^\d+$/.test(parts[0])) return { ok: false };
      const f = asFraction(parts[1]);
      if (!f) return { ok: false };
      whole = Number(parts[0]); n = Number(f[1]); d = Number(f[2]);
    } else if (parts.length === 1) {
      if (/^\d+$/.test(parts[0])) {
        whole = Number(parts[0]);
      } else {
        const f = asFraction(parts[0]);
        if (!f) return { ok: false };
        n = Number(f[1]); d = Number(f[2]);
      }
    } else {
      return { ok: false };
    }

    if (d === 0) return { ok: false };
    if (n >= d) {
      return { ok: false, hint: `${n}/${d} is still top-heavy — take another whole out of it.` };
    }
    return { ok: true, value: { n: whole * d + n, d } };
  },
  equals: (a, b) => a.n * b.d === b.n * a.d,
  isSimplest: (v) => {
    let x = Math.abs(v.n), y = Math.abs(v.d);
    while (y) [x, y] = [y, x % y];
    return (x || 1) === 1;
  },
  format(v) {
    const whole = Math.floor(v.n / v.d);
    const rest = v.n % v.d;
    if (!rest) return String(whole);
    return whole ? `${whole} ${rest}/${v.d}` : `${rest}/${v.d}`;
  },
  html(v) {
    const whole = Math.floor(v.n / v.d);
    const rest = v.n % v.d;
    const frac = rest
      ? `<span class="frac-term"><span class="fn">${rest}</span>`
        + `<span class="fl"></span><span class="fd">${v.d}</span></span>`
      : '';
    if (!rest) return String(whole);
    return whole ? `<span class="mixed-term">${whole}${frac}</span>` : frac;
  },
});

defineType({
  id: 'decimal',
  input: 'decimal',
  hint: 'Type a decimal, like 0.75.',
  /**
   * Held as an exact fraction over a power of ten, never as a float.
   *
   * 0.1 + 0.2 is not 0.3 in binary floating point, and a drill that marks a
   * correct answer wrong once has lost the student's trust for the rest of the
   * session. Comparison is therefore integer cross-multiplication, the same as
   * fractions, and only the formatting turns back into a decimal.
   */
  parse(raw) {
    const s = normalize(raw);
    if (s.includes('/')) return { ok: false, hint: 'Give it as a decimal, not a fraction: 3/4 is 0.75.' };
    const m = s.match(/^([+-]?)(\d*)(?:\.(\d*))?$/);
    if (!m || (m[2] === '' && !m[3])) return { ok: false };
    const sign = m[1] === '-' ? -1 : 1;
    const whole = m[2] || '0';
    const frac = m[3] || '';
    const d = 10 ** frac.length;
    const n = sign * (parseInt(whole, 10) * d + (frac ? parseInt(frac, 10) : 0));
    return { ok: true, value: { n, d } };
  },
  equals: (a, b) => a.n * b.d === b.n * a.d,
  /**
   * Trailing zeros are dropped: 0.50 and 0.5 are the same number. A value
   * rounded to a stated number of places carries `places`, and keeps its
   * zeros: 1.60 to 2 decimal places says the hundredths are known to be 0.
   */
  // requiem: play/answers/rounding-keeps-places
  format(v) {
    const neg = v.n < 0;
    const n = Math.abs(v.n);
    const whole = Math.floor(n / v.d);
    const rem = n - whole * v.d;
    let out = String(whole);
    if (v.places != null) {
      const scaled = (rem * 10 ** v.places) / v.d;
      if (v.places) out += '.' + String(scaled).padStart(v.places, '0');
    } else if (rem) {
      const places = String(v.d).length - 1;
      out += '.' + String(rem).padStart(places, '0').replace(/0+$/, '');
    }
    return (neg ? '−' : '') + out;
  },
});

defineType({
  id: 'expr',
  input: 'free',
  hint: 'Type an expression, like 2x + 1. Powers with ^, as in x^2; roots as sqrt(5).',
  /**
   * Judged by canonical form, not by value.
   *
   * `x+1` and `1+x` are accepted for each other because addition commutes.
   * `5` is not accepted for `2+3`, because doing the arithmetic is the thing
   * being asked. A level that wants several genuinely different forms -- an
   * expanded one and a factored one -- lists both in its accepted forms, which
   * is what that list has been a list for since it held one entry.
   */
  /**
   * The value carried is what a person would write -- "2x + 6" -- not the
   * canonical form. Canonicalising happens in the comparison instead, so the
   * answer shown on reveal is legible rather than `((2*x)+6)`.
   */
  parse(raw) {
    const parsed = parseExpression(raw);
    if (!parsed.ok) return { ok: false, why: parsed.error };
    return { ok: true, value: String(raw).trim() };
  },
  equals(a, b) {
    if (a === b) return true;
    const x = parseExpression(a);
    const y = parseExpression(b);
    return x.ok && y.ok && canonical(x.ast) === canonical(y.ast);
  },
  format: (v) => String(v),
});

defineType({
  id: 'choice',
  input: 'choice',
  hint: 'Pick one.',
  /**
   * The options travel on the answer spec, not here, because they change with
   * every problem. Parsing is trivial; the interesting work is in the widget
   * and in writing options that cannot be guessed from surface features.
   */
  parse(raw) {
    const s = String(raw).trim();
    return s ? { ok: true, value: s } : { ok: false };
  },
  equals: (a, b) => a === b,
  format: (v) => String(v),
});

/** A number as a student would type one: 3, -2, 3/4 or 0.5. Exact, or null. */
function exactNumber(text) {
  const s = normalize(text);
  let m = s.match(/^([+-]?\d+)\/(\d+)$/);
  if (m) return +m[2] === 0 ? null : reduceFrac(parseInt(m[1], 10), parseInt(m[2], 10));
  m = s.match(/^([+-]?)(\d*)(?:\.(\d+))?$/);
  if (!m || (m[2] === '' && !m[3])) return null;
  const d = 10 ** (m[3] ?? '').length;
  const n = parseInt(m[2] || '0', 10) * d + (m[3] ? parseInt(m[3], 10) : 0);
  return reduceFrac(m[1] === '-' ? -n : n, d);
}

function reduceFrac(n, d) {
  let a = Math.abs(n), b = Math.abs(d);
  while (b) [a, b] = [b, a % b];
  const g = a || 1;
  return d < 0 ? { n: -n / g, d: -d / g } : { n: n / g, d: d / g };
}

const sameFrac = (a, b) => a.n * b.d === b.n * a.d;
const fracText = (f) => {
  const r = reduceFrac(f.n, f.d);
  const body = r.d === 1 ? String(Math.abs(r.n)) : `${Math.abs(r.n)}/${r.d}`;
  return r.n < 0 ? `−${body}` : body;
};

/**
 * An expression in one letter, read as m·letter + b by evaluating it exactly
 * at seven values: equal steps mean it is linear, and the first value and
 * the step are b and m. Anything else is refused with the matching hint.
 */
function lineIn(text, letter, hints) {
  const parsed = parseExpression(text);
  if (!parsed.ok) return { ok: false, why: parsed.error };
  if ([...lettersIn(parsed.ast)].some((v) => v !== letter)) return { ok: false, hint: hints.letters };
  const at = [0, 1, 2, 3, 4, 5, 6].map((k) => valueAt(parsed.ast, { [letter]: { n: k, d: 1 } }));
  if (at.some((v) => v === null)) return { ok: false, hint: hints.numbers };
  const step = reduceFrac(at[1].n * at[0].d - at[0].n * at[1].d, at[0].d * at[1].d);
  for (let i = 2; i < at.length; i++) {
    const s = reduceFrac(at[i].n * at[i - 1].d - at[i - 1].n * at[i].d, at[i].d * at[i - 1].d);
    if (!sameFrac(s, step)) return { ok: false, hint: hints.curved };
  }
  return { ok: true, value: { m: step, b: reduceFrac(at[0].n, at[0].d) } };
}

/** m·letter + b as written: 3/4x − 2, −n, 5. */
function lineText({ m, b }, letter) {
  if (m.n === 0) return fracText(b);
  // requiem: play/answers/fractional-slope-written-over
  // A fractional slope is written 3x/2, never 3/2x: on one line that reads
  // as 3 over 2x, and the answer shown on reveal must not be ambiguous.
  const top = Math.abs(m.n) === 1 ? letter : `${Math.abs(m.n)}${letter}`;
  const slope = `${m.n < 0 ? '−' : ''}${top}${m.d === 1 ? '' : `/${m.d}`}`;
  if (b.n === 0) return slope;
  return `${slope} ${b.n < 0 ? '−' : '+'} ${fracText({ n: Math.abs(b.n), d: b.d })}`;
}

/**
 * Written as mx + b: at most one x term and one number, and no bracket but
 * one around a number alone -- (3/2)x is a slope written out, (x + 2) is
 * work not done yet.
 */
function writtenAsLine(text) {
  const flat = text.replace(/\s+/g, '').replace(/\([-+]?[\d./]+\)/g, '1');
  if (/[()]/.test(flat)) return false;
  const terms = flat.split(/(?<=[^/*^])(?=[+-])/).filter(Boolean);
  const xs = terms.filter((t) => /x/i.test(t)).length;
  return xs <= 1 && terms.length - xs <= 1;
}

// requiem: play/answers/line-judged-as-line
defineType({
  id: 'linear',
  input: 'free',
  hint: 'Type the equation, like y = 2x − 3.',
  /**
   * A straight line, judged by the line rather than the spelling.
   *
   * y = x/2 + 3, y = 0.5x + 3 and y = 3 + 1/2x are one line, and a student
   * who found its slope and intercept has done what was asked whichever they
   * typed. So the right-hand side is evaluated exactly at seven values of x:
   * equal steps between them mean a line, and the first value and the step
   * are its intercept and slope. A curve fails the steps and is refused as
   * not being a line at all, rather than marked as a wrong line.
   *
   * What is NOT accepted is an equation that has not been solved for y --
   * 2y = 4x + 6 is the same line, but writing y on its own is part of what
   * these levels teach, so it gets a hint rather than a mark. A vertical
   * line, which cannot be solved for y, is written x = c.
   *
   * Value: { m, b } for y = mx + b, or { x } for the vertical line x = c,
   * each a fraction { n, d }.
   */
  parse(raw) {
    const text = String(raw).trim().replace(/[−–—]/g, '-');
    if (!text) return { ok: false };
    const sides = text.split('=').map((t) => t.trim());
    if (sides.length > 2) return { ok: false, hint: 'One equals sign is enough.' };
    let right = text;
    if (sides.length === 2) {
      const [l, r] = sides.map((t) => t.toLowerCase());
      // y first: y = x is a line through the origin, not a vertical one.
      if (l === 'y') right = sides[1];
      else if (r === 'y') right = sides[0];
      else if (l === 'x' || r === 'x') {
        const c = exactNumber(l === 'x' ? sides[1] : sides[0]);
        if (!c) return { ok: false, hint: 'A vertical line is x = a number, like x = 4.' };
        return { ok: true, value: { x: c } };
      } else return { ok: false, hint: 'Write it with y on its own: y = …' };
    }
    const line = lineIn(right, 'x', {
      letters: 'Write the line in x and y.',
      numbers: 'A line needs only numbers and x.',
      curved: 'That is not a straight line.',
    });
    return line.ok ? { ...line, asLine: writtenAsLine(right) } : line;
  },
  // requiem: play/answers/line-form-asked-is-checked
  // Asked for y = mx + b, the expansion or division is the skill, so the
  // same line left as −1/2(x + 2) − 1 or (12 − 4x)/(−2) is not finished.
  isSimplest: (v, parsed) => 'x' in v || parsed?.asLine !== false,
  unfinished: 'in the form y = mx + b',
  equals(a, b) {
    if ('x' in a || 'x' in b) return 'x' in a && 'x' in b && sameFrac(a.x, b.x);
    return sameFrac(a.m, b.m) && sameFrac(a.b, b.b);
  },
  /** y = 3/4x − 2, y = −x, y = 5, x = −3. */
  format(v) {
    return 'x' in v ? `x = ${fracText(v.x)}` : `y = ${lineText(v, 'x')}`;
  },
});

// requiem: play/answers/rule-judged-by-value
defineType({
  id: 'rule',
  input: 'free',
  hint: 'Type the rule in n, like 4n − 1.',
  /**
   * The nth-term rule of an arithmetic sequence, judged by the terms it
   * gives rather than by its spelling.
   *
   * 3 + 4(n − 1) is the form the formula hands a student, and 4n − 1 is
   * that form tidied; both give 3, 7, 11, …, and a level asking for the
   * rule is asking whether the student can produce the sequence, not
   * whether they expanded the bracket. So the rule is evaluated exactly,
   * the same way a line is, and stored as its m and b. A rule with a
   * square or a power of n is refused as not an arithmetic rule, with a
   * hint, rather than marked as a wrong one.
   *
   * aₙ = …, a_n = … and an = … are accepted around it, since that is how
   * the rule is written on paper.
   *
   * Value: { m, b } for the rule m·n + b, each a fraction { n, d }.
   */
  parse(raw) {
    const text = String(raw).trim().replace(/[−–—]/g, '-').replace(/ₙ/g, '_n');
    if (!text) return { ok: false };
    const sides = text.split('=').map((t) => t.trim());
    if (sides.length > 2) return { ok: false, hint: 'One equals sign is enough.' };
    if (sides.length === 2 && !/^[a-z](_?n|\(n\))$/i.test(sides[0])) {
      return { ok: false, hint: 'Just the rule is enough, like 4n − 1.' };
    }
    return lineIn(sides[sides.length - 1], 'n', {
      letters: 'Write the rule using n, the term number.',
      numbers: 'The rule needs only numbers and n.',
      curved: 'An arithmetic rule goes up by the same amount each time: a number times n, plus a number.',
    });
  },
  equals: (a, b) => sameFrac(a.m, b.m) && sameFrac(a.b, b.b),
  /** 4n − 1, −2n + 10, 5. */
  format: (v) => lineText(v, 'n'),
});

// requiem: play/answers/halfplane-judged-as-region
defineType({
  id: 'halfplane',
  input: 'free',
  hint: 'Type the inequality, like y < 2x + 1.',
  /**
   * A linear inequality in x and y, judged by the half of the plane it
   * keeps. y < 2x + 1, 2x + 1 > y and 2x − y > −1 keep the same half, so all
   * three are right; the sign turning when y's side is divided by a negative
   * is done here exactly, the way a student must do it on paper.
   *
   * Read by evaluating left − right at three points, which gives
   * a·x + b·y + c; the boundary is then written as y = mx + k when y is in
   * it, or x = k when it is upright, and the sign is the one y (or x) is
   * left with. An equals sign is refused with a hint -- it names the
   * boundary, not the shading -- and so is a curve.
   *
   * Value: { m, b, op } for y op mx + b, or { x, op } for x op c, each
   * number a fraction { n, d } and op one of < <= > >=.
   */
  parse(raw) {
    const text = String(raw).trim().replace(/[−–—]/g, '-').replace(/≤|=</g, '<=').replace(/≥|=>/g, '>=');
    const bits = text.split(/(<=|>=|<|>|=)/);
    if (bits.length !== 3) return { ok: false, hint: 'One inequality sign: <, >, ≤ or ≥.' };
    if (bits[1] === '=') return { ok: false, hint: 'That is the boundary line. Which side is shaded: < or >?' };
    const sides = bits.flatMap((b, i) => (i === 1 ? [] : [parseExpression(b)]));
    const bad = sides.find((p) => !p.ok);
    if (bad) return { ok: false, why: bad.error };
    if (sides.some((p) => [...lettersIn(p.ast)].some((v) => v !== 'x' && v !== 'y'))) {
      return { ok: false, hint: 'Write it in x and y.' };
    }
    const f = (x, y) => {
      const env = { x: { n: x, d: 1 }, y: { n: y, d: 1 } };
      const [l, r] = sides.map((p) => valueAt(p.ast, env));
      return l && r ? reduceFrac(l.n * r.d - r.n * l.d, l.d * r.d) : null;
    };
    const [o, fx, fy, far] = [f(0, 0), f(1, 0), f(0, 1), f(3, -2)];
    if (!o || !fx || !fy || !far) return { ok: false, hint: 'Only numbers, x and y.' };
    const less = (p, q) => reduceFrac(p.n * q.d - q.n * p.d, p.d * q.d);
    const a = less(fx, o), b = less(fy, o);
    const guess = reduceFrac(o.n * a.d * b.d + 3 * a.n * o.d * b.d - 2 * b.n * o.d * a.d, o.d * a.d * b.d);
    if (!sameFrac(guess, far)) return { ok: false, hint: 'The edge of the shading is a straight line.' };
    const FLIP = { '<': '>', '<=': '>=', '>': '<', '>=': '<=' };
    // a·x + b·y + c op 0, with y (or x) moved to stand alone; a negative
    // divisor turns the sign.
    if (b.n !== 0) {
      const op = b.n > 0 ? bits[1] : FLIP[bits[1]];
      const m = reduceFrac(-a.n * b.d, a.d * b.n), k = reduceFrac(-o.n * b.d, o.d * b.n);
      return { ok: true, value: { m, b: k, op } };
    }
    if (a.n === 0) return { ok: false, hint: 'There is no x or y left: that is not a region.' };
    const op = a.n > 0 ? bits[1] : FLIP[bits[1]];
    return { ok: true, value: { x: reduceFrac(-o.n * a.d, o.d * a.n), op } };
  },
  equals(a, b) {
    if (a.op !== b.op) return false;
    if ('x' in a || 'x' in b) return 'x' in a && 'x' in b && sameFrac(a.x, b.x);
    return sameFrac(a.m, b.m) && sameFrac(a.b, b.b);
  },
  /** y < 3/4x − 2, y ≥ −x, x > −3. */
  format(v) {
    const sign = { '<': '<', '<=': '≤', '>': '>', '>=': '≥' }[v.op];
    return 'x' in v ? `x ${sign} ${fracText(v.x)}` : `y ${sign} ${lineText(v, 'x')}`;
  },
});

// requiem: play/answers/set-judged-as-set
defineType({
  id: 'solutions',
  input: 'free',
  hint: 'Type the solutions, like −2 < x <= 5 or x = +-3. Type <= for ≤, >= for ≥, +- for ±.',
  /**
   * A set of numbers on the number line -- the answer to an inequality, a
   * compound inequality or an absolute value equation -- judged as the set.
   * x < 3 and 3 > x, (−2, 5] and −2 < x ≤ 5, x = ±3 and 3, −3 are each one
   * answer; web/math/solutions.js has every form it reads.
   *
   * The preview draws the typed text, not the set it means, for the reason
   * previewSet gives.
   *
   * Value: { letter, parts }, parts a sorted list of intervals.
   */
  parse(raw) {
    const r = parseSet(raw);
    return r.ok ? r : { ok: false, hint: r.hint ?? 'Write it like −2 < x ≤ 5, or x < −1 or x > 3.' };
  },
  preview: previewSet,
  equals: sameSet,
  format: formatSet,
  // requiem: play/answers/set-letter-told
  // The set is judged without its letter, but y > 2 typed for x > 2 is
  // answering a different question: right numbers, said back with the letter.
  formHint(parsed, value) {
    const typed = parsed.typedLetter;
    return typed && value.letter && typed !== value.letter
      ? `The question is about ${value.letter}: write it with ${value.letter}, not ${typed}.` : null;
  },
  // A level asking for the simplest form means the conditions combined.
  isSimplest: (v, parsed) => combined(v, parsed?.pieces),
  unfinished: 'combined into its simplest form',
});

// requiem: play/answers/roots-judged-exactly
defineType({
  id: 'roots',
  input: 'free',
  hint: 'Type it exactly, like 2sqrt(5), or x = 3 +- sqrt(5) for two. Type +- for ±.',
  /**
   * The real roots of a quadratic, judged as an exact set: web/math/surds.js
   * evaluates each in a + b√r, so (−3 ± √17)/4 and −3/4 ± √17/4 agree and
   * a decimal near one never does.
   *
   * The preview draws each entry with its ± read both ways, x = (−3 + √17)/4
   * or x = (−3 − √17)/4, which is exactly how the answer is understood.
   *
   * Value: { letter, roots }, roots a sorted list of {a, b, r}.
   */
  parse(raw) {
    const r = parseRoots(raw);
    return r.ok ? r : { ok: false, hint: r.hint };
  },
  preview(raw) {
    const r = rootTexts(raw);
    if (!r.ok) return { ok: false, error: r.hint };
    if (!r.texts.length) return { ok: true, terms: [{ t: 'prose', v: 'no real solutions' }] };
    const terms = [];
    for (const [i, text] of r.texts.entries()) {
      const drawn = previewOf(`${r.letter} = ${text}`);
      if (!drawn.ok) return drawn;
      if (i) terms.push({ t: 'prose', v: 'or' });
      terms.push(...drawn.terms);
    }
    return { ok: true, terms };
  },
  equals: sameRoots,
  // As typed: √20 is the right length, and on a level that asks for
  // simplest radical form it is not finished. Only levels that set
  // requireSimplest ask.
  isSimplest: (v) => v.simplest !== false,
  unfinished: 'in simplest radical form',
  format: formatRoots,
});

defineType({
  id: 'pair',
  input: 'pair',
  hint: 'Give both coordinates, like (3, −2).',
  /**
   * An ordered pair: a point, or the solution of a system. Each half may be
   * a whole number, a fraction or a decimal, and is compared exactly. The
   * order is the whole of what a pair means, so (2, 3) is not (3, 2).
   *
   * Value: { x, y }, each a fraction { n, d }.
   */
  parse(raw) {
    const s = String(raw).trim().replace(/^\(|\)$/g, '');
    const parts = s.split(/\s*[,;]\s*|\s+/).filter(Boolean);
    if (parts.length !== 2) return { ok: false };
    const [x, y] = parts.map(exactNumber);
    if (!x || !y) return { ok: false };
    return { ok: true, value: { x, y } };
  },
  equals: (a, b) => sameFrac(a.x, b.x) && sameFrac(a.y, b.y),
  format: (v) => `(${fracText(v.x)}, ${fracText(v.y)})`,
});
