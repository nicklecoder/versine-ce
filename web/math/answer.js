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
import { parseSet, sameSet, formatSet, previewSet } from './solutions.js';

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
    const m = s.match(/^([+-]?\d+)\/(\d+)$/);
    if (!m) return { ok: false };
    const d = parseInt(m[2], 10);
    if (d === 0) return { ok: false };
    return { ok: true, value: { n: parseInt(m[1], 10), d } };
  },
  equals: (a, b) => a.n * b.d === b.n * a.d,
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
  /** Trailing zeros are dropped: 0.50 and 0.5 are the same number. */
  format(v) {
    const neg = v.n < 0;
    const n = Math.abs(v.n);
    const whole = Math.floor(n / v.d);
    const rem = n - whole * v.d;
    let out = String(whole);
    if (rem) {
      const places = String(v.d).length - 1;
      out += '.' + String(rem).padStart(places, '0').replace(/0+$/, '');
    }
    return (neg ? '−' : '') + out;
  },
});

defineType({
  id: 'expr',
  input: 'free',
  hint: 'Type an expression, like 5sqrt(2) or 2x+1.',
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
  const size = fracText({ n: Math.abs(m.n), d: m.d });
  const slope = `${m.n < 0 ? '−' : ''}${size === '1' ? '' : size}${letter}`;
  if (b.n === 0) return slope;
  return `${slope} ${b.n < 0 ? '−' : '+'} ${fracText({ n: Math.abs(b.n), d: b.d })}`;
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
    return lineIn(right, 'x', {
      letters: 'Write the line in x and y.',
      numbers: 'A line needs only numbers and x.',
      curved: 'That is not a straight line.',
    });
  },
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

// requiem: play/answers/set-judged-as-set
defineType({
  id: 'solutions',
  input: 'free',
  hint: 'Type the solutions, like −2 < x ≤ 5 or x = ±3.',
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
