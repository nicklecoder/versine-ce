/**
 * Catalogue authoring tool: builds the problem library for scientific notation.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 */
import * as T from '../terms.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/sci-notation.js';

/**
 * Exact throughout. A number is held as digits times a power of ten,
 * { m, k } meaning m × 10^k with m a positive integer, which is what
 * scientific notation is -- and it means 1.5 × 3 never meets a float.
 */
const num = (m, k) => ({ m, k });
const digits = (m) => String(m).length;
/** The power of ten once the point sits after the first digit. */
const expOf = ({ m, k }) => k + digits(m) - 1;

/** The front number, 45 -> "4.5", written as a decimal. */
const front = (m) => {
  const s = String(m);
  return s.length === 1 ? s : `${s[0]}.${s.slice(1)}`;
};

/** Thin spaces between thousands, as long numbers are printed in books. */
const grouped = (s) => (s.length < 5 ? s : s.replace(/\B(?=(\d{3})+$)/g, ' '));

/** The number written out in full: 4 500 000, or 0.00045. */
function standard({ m, k }) {
  const s = String(m);
  if (k >= 0) return grouped(s + '0'.repeat(k));
  const places = -k;
  if (s.length > places) return `${grouped(s.slice(0, s.length - places))}.${s.slice(s.length - places)}`;
  return `0.${'0'.repeat(places - s.length)}${s}`;
}

/** As a decimal answer: an integer over a power of ten. */
const asDecimal = ({ m, k }, sign = 1) => (k >= 0
  ? { n: sign * m * 10 ** k, d: 1 }
  : { n: sign * m, d: 10 ** -k });

const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const sup = (n) => String(n).split('').map((c) => SUP[c] ?? c).join('');
/** Exponents carry a true minus sign, as the exponent rules write them. */
const expTerm = (e) => (e < 0 ? `−${-e}` : e);
/** A signed integer as working writes it, with a true minus. */
const int = (n) => (n < 0 ? `−${-n}` : String(n));
const sci = (m, e) => `${front(m)} × 10${sup(e)}`;
const tenTo = (n) => standard(num(1, n));
const places = (n) => `${n} place${n === 1 ? '' : 's'}`;

/** Digits for a front number: one to three significant, never ending in 0. */
function digitsFor(rng, most = 3) {
  const count = rng.pick([1, 2, 2, 3, 3].filter((c) => c <= most));
  let m = rng.int(1, 9);
  for (let i = 1; i < count; i++) m = m * 10 + (i === count - 1 ? rng.int(1, 9) : rng.int(0, 9));
  return m;
}

/** A number whose scientific form has exponent e. */
const withExp = (m, e) => num(m, e - digits(m) + 1);

/**
 * A minus sign in front some of the time. Negative quantities are written in
 * scientific notation like any other, and the sign plays no part in the
 * power, which is worth meeting rather than assuming.
 */
const sign = (rng) => (rng.chance(0.12) ? -1 : 1);
const signed = (s, sg) => (sg < 0 ? `−${s}` : s);

/** Big numbers: how far the point slides left is the power. */
function big(rng) {
  // Ten to the nought, now and then: 7.2 is already in scientific notation,
  // and a student who thinks the power must be at least one has a gap.
  const e = rng.chance(0.06) ? 0 : rng.pick([1, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 8, 9]);
  const m = digitsFor(rng, Math.min(3, e + 1));
  const n = withExp(m, e);
  const sg = sign(rng);
  const std = signed(standard(n), sg);
  const fr = signed(front(m), sg);
  return {
    prompt: [T.num(std), T.op('='), T.num(fr), T.op('×'), T.pow(10, null, 2)],
    text: `${std} = ${fr} × 10^?`,
    answer: { type: 'int', value: e },
    visual: {
      kind: 'evalmodel',
      lines: [std, `${fr} × ${tenTo(e)}`, signed(sci(m, e), sg)],
      rules: [`slide the point ${places(e)} left, so one digit is in front`,
              `${tenTo(e)} is 10${sup(e)}`],
      hint: 'How far does the point slide to leave one digit in front?',
    },
    explain: e === 0
      ? `${std} already has one digit in front of the point, so the point does not move. `
        + `That is ten to the nought, which is 1: ${std} = ${signed(sci(m, 0), sg)}.`
      : `Sliding the point ${places(e)} left turns ${std} into ${fr}, which divided it by `
        + `${tenTo(e)}. Multiplying by 10${sup(e)} puts that back: ${std} = ${signed(sci(m, e), sg)}.`,
  };
}

/** Small numbers: the point slides right, and the power is negative. */
function small(rng) {
  const e = -rng.pick([1, 2, 2, 3, 3, 4, 4, 5, 6, 7, 8]);
  const m = digitsFor(rng);
  const n = withExp(m, e);
  const sg = sign(rng);
  const std = signed(standard(n), sg);
  const fr = signed(front(m), sg);
  return {
    prompt: [T.num(std), T.op('='), T.num(fr), T.op('×'), T.pow(10, null, 2)],
    text: `${std} = ${fr} × 10^?`,
    answer: { type: 'int', value: e },
    visual: {
      kind: 'evalmodel',
      lines: [std, `${fr} ÷ ${tenTo(-e)}`, signed(sci(m, e), sg)],
      rules: [`slide the point ${places(-e)} right, so one digit is in front`,
              `dividing by ${tenTo(-e)} is multiplying by 10${sup(e)}`],
      hint: 'Which way does the point slide this time, and how far?',
    },
    explain: `Sliding the point ${places(-e)} right turns ${std} into ${fr}, which `
      + `multiplied it by ${tenTo(-e)}. To undo that, divide by ${tenTo(-e)}, which is `
      + `multiplying by 10${sup(e)}: ${std} = ${signed(sci(m, e), sg)}.`,
  };
}

/** Reading one back into ordinary notation. */
function backToStandard(rng) {
  const e = rng.chance(0.5)
    ? rng.pick([1, 2, 3, 4, 5, 6, 7])
    : -rng.pick([1, 2, 3, 4, 5, 6]);
  const m = digitsFor(rng);
  const n = withExp(m, e);
  const sg = sign(rng);
  const fr = signed(front(m), sg);
  const std = signed(standard(n), sg);
  const dir = e > 0 ? 'right' : 'left';
  return {
    prompt: T.asks(T.num(fr), T.op('×'), T.pow(10, expTerm(e), 2)),
    text: `${fr} × 10^${e}`,
    answer: { type: 'decimal', value: asDecimal(n, sg) },
    visual: {
      kind: 'evalmodel',
      lines: [signed(sci(m, e), sg),
              e > 0 ? `${fr} × ${tenTo(e)}` : `${fr} ÷ ${tenTo(-e)}`,
              std],
      rules: [e > 0 ? `10${sup(e)} is ${tenTo(e)}` : `10${sup(e)} is one over ${tenTo(-e)}`,
              `slide the point ${places(Math.abs(e))} ${dir}`],
      hint: 'Is the power making it bigger or smaller, and by how much?',
    },
    explain: e > 0
      ? `10${sup(e)} is ${tenTo(e)}, so the point slides ${places(e)} right`
        + `${e > digits(m) - 1 ? ', filling with zeros where it runs out of digits' : ''}: ${std}.`
      : `10${sup(e)} means dividing by ${tenTo(-e)}, so the point slides ${places(-e)} left, `
        + `filling with zeros in front: ${std}.`,
  };
}

/**
 * An untidy front number put right. The direction is the whole difficulty --
 * 45 × 10⁵ becomes 4.5 × 10⁶, not 10⁴ -- so the working writes the ten out
 * as a factor, which makes the direction a product rather than a rule to
 * remember.
 */
function tidy(rng) {
  const m = digitsFor(rng);
  const e = rng.pick([-6, -5, -4, -3, -2, 2, 3, 4, 5, 6, 7, 8]);
  // How many places the front number is off: 45 is up one, 0.45 down one.
  const shift = rng.pick([1, 1, 2, -1, -1, -2]);
  const shown = num(m, -(digits(m) - 1) + shift);          // the untidy front number
  const shownE = e - shift;
  const shownFront = standard(shown);
  const ten = tenTo(Math.abs(shift));
  const factor = shift > 0 ? `${front(m)} × ${ten}` : `${front(m)} ÷ ${ten}`;
  return {
    prompt: [T.num(shownFront), T.op('×'), T.pow(10, expTerm(shownE), 1),
             T.op('='), T.num(front(m)), T.op('×'), T.pow(10, null, 2)],
    text: `${shownFront} × 10^${shownE} = ${front(m)} × 10^?`,
    answer: { type: 'int', value: e },
    visual: {
      kind: 'evalmodel',
      lines: [`${shownFront} × 10${sup(shownE)}`,
              `${factor} × 10${sup(shownE)}`,
              sci(m, e)],
      rules: [`${shownFront} is ${factor}`,
              shift > 0 ? `the ${ten} joins the power: ${int(shownE)} + ${shift} = ${int(e)}`
                        : `dividing by ${ten} takes from the power: ${int(shownE)} − ${-shift} = ${int(e)}`],
      hint: 'Write the front number as a digit times or divided by some tens.',
    },
    explain: shift > 0
      ? `${shownFront} is ${factor}. That ${ten} joins the power of ten, so the exponent `
        + `goes up by ${shift}: ${shownFront} × 10${sup(shownE)} = ${sci(m, e)}.`
      : `${shownFront} is ${factor}. Dividing by ${ten} takes ${-shift} off the power `
        + `of ten, so the exponent goes down by ${-shift}: `
        + `${shownFront} × 10${sup(shownE)} = ${sci(m, e)}.`,
  };
}

/**
 * Which is bigger. Weighted toward the trap, a bigger front number on a
 * smaller power, and toward negative powers, where 10⁻³ beating 10⁻⁵ is
 * the comparison students most often get backwards.
 */
function compare(rng) {
  const kind = rng.pick(['trap', 'trap', 'negative', 'tie']);
  let a, b;
  if (kind === 'tie') {
    // Never ten to the nought here: "both are counted in 10⁰s" is true and
    // reads as nonsense.
    const e = rng.pick([-6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8]);
    let ma = digitsFor(rng, 2), mb = digitsFor(rng, 2);
    while (Number(front(ma)) === Number(front(mb))) mb = digitsFor(rng, 2);
    a = { m: ma, e }; b = { m: mb, e };
  } else {
    const base = kind === 'negative' ? -rng.int(2, 7) : rng.int(2, 8);
    const gap = rng.int(1, 3);
    // The smaller power gets the bigger front number.
    let hi = digitsFor(rng, 2), lo = digitsFor(rng, 2);
    while (Number(front(hi)) === Number(front(lo))) lo = digitsFor(rng, 2);
    if (Number(front(hi)) < Number(front(lo))) [hi, lo] = [lo, hi];
    a = { m: hi, e: base }; b = { m: lo, e: base + gap };
  }
  const value = ({ m, e }) => Number(front(m)) * 10 ** e;
  const bigger = value(a) > value(b) ? a : b;
  const smaller = bigger === a ? b : a;
  const [x, y] = rng.chance(0.5) ? [a, b] : [b, a];
  const label = ({ m, e }) => sci(m, e);
  const why = a.e === b.e
    ? `Both are counted in 10${sup(a.e)}s, so the front numbers decide: `
      + `${front(bigger.m)} is more than ${front(smaller.m)}. ${label(bigger)} is bigger.`
    : `The powers decide before the front numbers do. 10${sup(bigger.e)} is ${bigger.e - smaller.e === 1 ? 'ten' : `${tenTo(bigger.e - smaller.e)}`} `
      + `times 10${sup(smaller.e)}, and no front number below 10 can make that up. ${label(bigger)} is bigger.`;
  return {
    prompt: [T.prose(`Which is bigger, ${label(x)} or ${label(y)}?`)],
    text: `bigger: ${label(x)} or ${label(y)}`,
    answer: {
      type: 'choice', value: label(bigger),
      options: [label(x), label(y)].map((s) => ({ id: s, label: s })),
    },
    visual: null,
    explain: why,
  };
}

/** Multiplying or dividing two numbers in scientific notation. */
function mulDiv(rng) {
  const divide = rng.chance(0.5);
  // Built from the answer back for division, so the quotient is exact.
  // One front number is a single digit. 6.2 × 2.8 is a hard multiplication
  // and no harder a lesson about powers of ten, which is what this asks.
  const p = digitsFor(rng, 2), q = digitsFor(rng, 1);
  const pe = rng.int(-6, 9), qe = rng.int(-6, 9);
  let A, B, R;
  if (divide) {
    // A ÷ B = R. Pick R and B; A is their product, tidied.
    R = withExp(p, pe); B = withExp(q, qe);
    A = num(R.m * B.m, R.k + B.k);
  } else {
    A = withExp(p, pe); B = withExp(q, qe);
    R = num(A.m * B.m, A.k + B.k);
  }
  // Strip trailing zeros so the front number is written as short as it goes.
  const clean = (n) => { let { m, k } = n; while (m % 10 === 0) { m /= 10; k += 1; } return num(m, k); };
  A = clean(A); B = clean(B); R = clean(R);
  // Multiplying or dividing by exactly one changes nothing, so it asks nothing.
  if (A.m === 1 || B.m === 1 || R.m === 1) return mulDiv(rng);
  const [ae, be, re] = [expOf(A), expOf(B), expOf(R)];
  const op = divide ? '÷' : '×';
  // The raw front-number result, before tidying: 3 × 5 = 15, or 1.2 ÷ 4 = 0.3.
  const rawFront = divide ? Number(front(A.m)) / Number(front(B.m)) : Number(front(A.m)) * Number(front(B.m));
  const rawE = divide ? ae - be : ae + be;
  const rawStr = String(Number(rawFront.toPrecision(6)));
  const tidyNeeded = rawE !== re;
  const paren = (n) => (n < 0 ? `(${int(n)})` : int(n));
  const powerLine = `${int(ae)} ${divide ? '−' : '+'} ${paren(be)} = ${int(rawE)}`;
  const lines = [`(${sci(A.m, ae)}) ${op} (${sci(B.m, be)})`,
                 `${rawStr} × 10${sup(rawE)}`];
  const rules = [`front numbers ${divide ? 'divide' : 'multiply'}, powers ${divide ? 'subtract' : 'add'}: ${powerLine}`];
  if (tidyNeeded) {
    lines.push(sci(R.m, re));
    rules.push(`${rawStr} is not between 1 and 10, so tidy it`);
  }
  return {
    prompt: [T.group([T.num(front(A.m)), T.op('×'), T.pow(10, expTerm(ae), 1)]), T.op(op),
             T.group([T.num(front(B.m)), T.op('×'), T.pow(10, expTerm(be), 1)]),
             T.op('='), T.num(front(R.m)), T.op('×'), T.pow(10, null, 2)],
    text: `(${front(A.m)} × 10^${ae}) ${op} (${front(B.m)} × 10^${be}) = ${front(R.m)} × 10^?`,
    answer: { type: 'int', value: re },
    visual: {
      kind: 'evalmodel', lines, rules,
      hint: `What happens to the front numbers, and what happens to the powers?`,
    },
    explain: `${divide ? 'Divide' : 'Multiply'} the front numbers: ${front(A.m)} ${op} ${front(B.m)} = ${rawStr}. `
      + `${divide ? 'Subtract' : 'Add'} the powers: ${powerLine}. `
      + (tidyNeeded
        ? `${rawStr} × 10${sup(rawE)} is not tidy, because ${rawStr} is not between 1 and 10. `
          + `Moving the point to fix that changes the power: ${sci(R.m, re)}.`
        : `${rawStr} is already between 1 and 10, so the answer is ${sci(R.m, re)}.`),
  };
}

/**
 * Adding and taking away. There is no rule for the powers here, which is the
 * lesson: they have to be made to match first, and then it is decimals. One
 * number is sometimes given written out, since problems mix the two forms.
 */
function addSub(rng) {
  const subtract = rng.chance(0.45);
  const e = rng.int(-5, 8);
  const gap = rng.pick([0, 1, 1, 2]);
  let x = withExp(digitsFor(rng, 2), e);
  let y = withExp(digitsFor(rng, 2), e - gap);
  // Exact sum or difference on the shared grid of the smaller power.
  const k = Math.min(x.k, y.k);
  const at = (n) => n.m * 10 ** (n.k - k);
  // Equal numbers would take away to nothing, which has no scientific form.
  if (at(x) === at(y)) return addSub(rng);
  if (subtract && at(x) < at(y)) [x, y] = [y, x];
  const total = subtract ? at(x) - at(y) : at(x) + at(y);
  const R = num(total, k);
  // Asked in the power the tidy answer has, which may have moved by one.
  let rm = R.m, rk = R.k;
  while (rm % 10 === 0) { rm /= 10; rk += 1; }
  const re = expOf(num(rm, rk));
  const target = num(rm, rk - re);                   // the front number, as m × 10^k
  const op = subtract ? '−' : '+';
  const xe = expOf(x), ye = expOf(y);
  const written = rng.chance(0.3);                   // give y written out in full
  const yTerm = written ? [T.num(standard(y))] : [T.num(front(y.m)), T.op('×'), T.pow(10, expTerm(ye), 1)];
  const yStr = written ? standard(y) : sci(y.m, ye);
  const yText = written ? standard(y).replace(/ /g, '') : `${front(y.m)} × 10^${ye}`;
  // y restated in x's power, so the front numbers can be combined.
  const yInX = standard(num(y.m, y.k - xe));
  const xFront = front(x.m);
  const combined = standard(num(total, k - xe));
  const lines = [`${sci(x.m, xe)} ${op} ${yStr}`,
                 `${xFront} × 10${sup(xe)} ${op} ${yInX} × 10${sup(xe)}`,
                 `${combined} × 10${sup(xe)}`];
  const rules = [`write both in 10${sup(xe)}s`, `${xFront} ${op} ${yInX} = ${combined}`];
  if (re !== xe) {
    lines.push(sci(rm, re));
    rules.push('tidy the front number');
  }
  return {
    prompt: [T.num(xFront), T.op('×'), T.pow(10, expTerm(xe), 1), T.op(op), ...yTerm,
             T.op('='), T.blank(), T.op('×'), T.pow(10, expTerm(re), 2)],
    text: `${xFront} × 10^${xe} ${op} ${yText} = ? × 10^${re}`,
    answer: { type: 'decimal', value: asDecimal(target) },
    visual: {
      kind: 'evalmodel', lines, rules,
      hint: 'There is no rule for adding powers. What has to match first?',
    },
    explain: `The powers have to match before anything can be ${subtract ? 'taken away' : 'added'}. In 10${sup(xe)}s, `
      + `${yStr} is ${yInX} × 10${sup(xe)}, so this is ${xFront} ${op} ${yInX} = ${combined} `
      + `lots of 10${sup(xe)}`
      + (re !== xe ? `, which tidies to ${sci(rm, re)}.` : `: ${sci(rm, re)}.`),
  };
}

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  const build = (lv) => {
    switch (lv) {
      case 0: return big(rng);
      case 1: return small(rng);
      case 2: return backToStandard(rng);
      case 3: return tidy(rng);
      case 4: return compare(rng);
      case 5: return mulDiv(rng);
      case 6: return addSub(rng);
      default: throw new Error(`sci-notation has no level ${lv}`);
    }
  };
  const p = build(level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level);
  // The attempt log is plain text that scripts/check-answers.py re-derives,
  // so it carries neither the thin spaces nor the typographic minus.
  p.text = p.text.replace(/\u202f/g, '').replace(/−/g, '-');
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
