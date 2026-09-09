/**
 * Catalogue authoring tool: builds the problem library for decimals.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 */
import * as T from '../terms.js';
import { reduce, gcd, nths } from '../../web/math/frac.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/decimals.js';

/** Exact throughout: a decimal is an integer over a power of ten, never a float. */
const dec = (n, places) => ({ n, d: 10 ** places });
const show = (v) => {
  const neg = v.n < 0, n = Math.abs(v.n);
  const whole = Math.floor(n / v.d), rem = n - whole * v.d;
  const places = String(v.d).length - 1;
  const frac = rem ? '.' + String(rem).padStart(places, '0').replace(/0+$/, '') : '';
  return (neg ? '−' : '') + whole + frac;
};
const PLACE = ['ones', 'tenths', 'hundredths', 'thousandths'];

/** What a digit in a given place is worth. */
function placeValue(rng) {
  const places = rng.int(1, 3);
  const n = rng.int(1, 10 ** places - 1);
  const v = dec(n, places);
  const digits = String(n).padStart(places, '0');
  // Ask about a digit that is actually there. "What is the 0 in the tenths
  // place worth" has the answer zero, which is true and teaches nothing --
  // the question is meant to be about what a column counts.
  const nonZero = [...digits].map((c, i) => (c === '0' ? -1 : i)).filter((i) => i >= 0);
  const at = rng.pick(nonZero);
  const digit = Number(digits[at]);
  const worth = dec(digit * 10 ** (places - at - 1), places);
  return {
    prompt: [T.prose(`In ${show(v)}, what is the ${digit} in the ${PLACE[at + 1]} place worth?`)],
    text: `${show(v)}: ${PLACE[at + 1]} digit worth`,
    answer: { type: 'decimal', value: worth },
    visual: {
      kind: 'evalmodel',
      lines: [show(v), `${digit} in the ${PLACE[at + 1]} place`,
              `${digit}/${10 ** (at + 1)}`, show(worth)],
      rules: ['find the place', 'that many of that unit', 'written as a decimal'],
      hint: 'What unit does that column count?',
    },
    explain: `The ${PLACE[at + 1]} column counts ${10 ** (at + 1)}ths, and there `
      + `${digit === 1 ? 'is 1' : `are ${digit}`} of them, which is ${show(worth)}.`,
  };
}

/**
 * Compare by place, not by digit count.
 *
 * The pair is drawn in a random order and then named in that order all the
 * way through -- prompt, text and buttons. The buttons used to be shuffled
 * separately, which put the question and the answers in different orders
 * about half the time. It bought nothing, since the draw above already
 * decides which of the two comes first, and it cost the only thing that
 * mattered: that a student reads "0.9 or 0.85?" and finds those two, in that
 * order, under it. The fraction comparison had the same fault, where a bar
 * model made it visible; here there is no picture and it was merely quietly
 * confusing.
 */
function compare(rng) {
  // Deliberately weight toward the trap: more digits looking bigger.
  const a = dec(rng.int(1, 9) * 10, 2);
  let b = dec(rng.int(10, 99), 2);
  if (a.n === b.n) b = dec(b.n + 1, 2);
  const bigger = a.n > b.n ? show(a) : show(b);
  const [x, y] = rng.chance(0.5) ? [a, b] : [b, a];
  return {
    prompt: [T.prose(`Which is bigger, ${show(x)} or ${show(y)}?`)],
    text: `bigger: ${show(x)} or ${show(y)}`,
    answer: {
      type: 'choice', value: bigger,
      options: [show(x), show(y)].map((s) => ({ id: s, label: s })),
    },
    visual: null,
    explain: `Line the places up: ${show(a)} is ${a.n} hundredths and ${show(b)} is `
      + `${b.n} hundredths. Having more digits does not make a decimal bigger.`,
  };
}

/** Line up the point; then it is ordinary arithmetic. */
function addSub(rng) {
  const places = rng.int(1, 2);
  const d = 10 ** places;
  const a = dec(rng.int(1, 40 * d) , places);
  const plus = rng.chance(0.6);
  // Subtraction may take away more than there was. Every other skill now
  // lets a difference cross zero, and a decimal is no different about it.
  const b = dec(plus ? rng.int(1, 40 * d) : rng.int(1, 40 * d), places);
  const value = dec(plus ? a.n + b.n : a.n - b.n, places);
  const sign = plus ? '+' : '−';
  return {
    prompt: T.asks(T.num(show(a), 1), T.op(sign), T.num(show(b), 2)),
    text: `${show(a)} ${sign} ${show(b)}`,
    answer: { type: 'decimal', value },
    visual: {
      kind: 'evalmodel',
      lines: [`${show(a)} ${sign} ${show(b)}`,
              `${a.n} ${sign} ${b.n} in ${PLACE[places]}`,
              `${plus ? a.n + b.n : a.n - b.n} ${PLACE[places]}`, show(value)],
      rules: ['count in the smallest place', 'ordinary arithmetic', 'put the point back'],
      hint: 'What unit are both of these counting?',
    },
    explain: `Both are counted in ${PLACE[places]}: ${a.n} ${sign} ${b.n} = `
      + `${plus ? a.n + b.n : a.n - b.n}, which is ${show(value)}.`,
  };
}

/** Multiply the digits, count the places -- and watch it get smaller. */
function multiply(rng) {
  const pa = rng.int(1, 2), pb = rng.int(1, 2);
  const a = dec(rng.int(1, 10 ** pa - 1) * (pa === 1 ? 1 : 1), pa);
  const b = dec(rng.int(1, 10 ** pb - 1), pb);
  const value = { n: a.n * b.n, d: a.d * b.d };
  return {
    prompt: T.asks(T.num(show(a), 1), T.op('×'), T.num(show(b), 2)),
    text: `${show(a)} × ${show(b)}`,
    answer: { type: 'decimal', value },
    visual: {
      kind: 'evalmodel',
      lines: [`${show(a)} × ${show(b)}`, `${a.n} × ${b.n} = ${a.n * b.n}`,
              `${pa} + ${pb} = ${pa + pb} decimal places`, show(value)],
      rules: ['multiply as whole numbers', 'count the places in both', 'put that many back'],
      hint: 'How many decimal places go in, and how many come out?',
    },
    explain: `${a.n} × ${b.n} = ${a.n * b.n}. There are ${pa} + ${pb} = ${pa + pb} `
      + `decimal places between the two, so the answer is ${show(value)} — smaller `
      + `than either, because a part of a part is smaller than both.`,
  };
}

/** Read a decimal off as a fraction and simplify it. */
function toFraction(rng) {
  const places = rng.int(1, 2);
  const d = 10 ** places;
  const n = rng.int(1, d - 1);
  const v = dec(n, places);
  const r = reduce({ n, d });
  return {
    prompt: [T.num(show(v), 1), T.op('='), T.frac(null, r.d, 2)],
    text: `${show(v)} = ?/${r.d}`,
    answer: { type: 'int', value: r.n },
    visual: {
      kind: 'evalmodel',
      lines: [show(v), `${n}/${d}`,
              gcd(n, d) > 1 ? `divide both by ${gcd(n, d)}` : 'already in lowest terms',
              `${r.n}/${r.d}`],
      rules: ['read the places as the bottom', 'simplify', 'which gives'],
      hint: 'How many places, and so what is the bottom?',
    },
    explain: `${show(v)} is ${n} ${PLACE[places]}, so ${n}/${d}`
      + (gcd(n, d) > 1 ? `, and dividing both by ${gcd(n, d)} gives ${r.n}/${r.d}.` : '.'),
  };
}

/**
 * The strategic layer. A decimal is for measuring and comparing; a fraction is
 * for exactness and for arithmetic that stays tidy. Thirds are the case that
 * settles it -- 1/3 has no decimal you can write down.
 */
const SITUATIONS = [
  { text: 'You need the exact value of one {odd} of something.', want: 'fraction',
    why: 'One {odd} has no terminating decimal, so any decimal for it is close and not equal.' },
  { text: 'You need to compare {da} with {db}.', want: 'decimal',
    why: 'Lining the places up compares at a glance. As fractions you would have to find a common denominator first.' },
  { text: 'You need to multiply by {n}/{odd} and keep the answer exact.', want: 'fraction',
    why: 'Multiplying by a fraction stays exact; multiplying by a rounded decimal loses a little every time.' },
  { text: 'You need to measure a length of about {da} metres with a ruler.', want: 'decimal',
    why: 'A ruler is marked in tenths, not in {oddths}.' },
  { text: 'You need to add {n}/{even} to {m}/{even}.', want: 'fraction',
    why: 'They already share a bottom, so the addition is immediate. Converting first is work for nothing.' },
  { text: 'You need to plot {da} on a number line.', want: 'decimal',
    why: 'A position on a line is easiest to place from a decimal.' },
  { text: 'You need to divide {whole} into {odd} equal shares, exactly.', want: 'fraction',
    why: 'Splitting into {odd} rarely lands on a decimal you can write down. A fraction always does.' },
  { text: 'You need to say which of {da} and {db} is the better price.', want: 'decimal',
    why: 'Prices are compared by place value, which is what a decimal is for.' },
];

/**
 * The situations carry numbers so that the level is not six problems a student
 * memorises in one sitting -- the same reason the other strategy levels
 * interpolate. The numbers are chosen to keep each argument true: the
 * "exact" cases use denominators with no terminating decimal.
 */
function whichForm(rng) {
  const s = rng.pick(SITUATIONS);
  const odd = rng.pick([3, 6, 7, 9, 11, 12]);       // never a terminating decimal
  const even = rng.pick([4, 8, 5, 10, 16, 20]);
  const n = rng.int(1, odd - 1);
  const m = rng.int(1, even - 1);
  const whole = rng.pick([2, 3, 4, 5, 6, 10]);
  const da = show(dec(rng.int(11, 99), 2));
  const db = show(dec(rng.int(101, 999), 3));
  const fill = (t) => t
    .replace(/\{oddths\}/g, nths(odd))
    .replace(/\{odd\}/g, String(odd)).replace(/\{even\}/g, String(even))
    .replace(/\{whole\}/g, String(whole))
    .replace(/\{da\}/g, da).replace(/\{db\}/g, db)
    .replace(/\{n\}/g, String(n)).replace(/\{m\}/g, String(m));
  return {
    prompt: [T.prose(fill(s.text))],
    text: fill(s.text),
    answer: {
      type: 'choice', value: s.want,
      options: rng.shuffle([
        { id: 'fraction', label: 'Keep it as a fraction', note: 'exact, and tidy to compute with' },
        { id: 'decimal', label: 'Use a decimal', note: 'easy to compare and to measure' },
      ]),
    },
    visual: null,
    explain: fill(s.why),
  };
}

/**
 * Dividing, built outwards from the quotient so it always comes out exact.
 *
 * Two shapes. Dividing by a whole number is the easy half and is here so the
 * hard half has something to be different from; dividing by a decimal is the
 * point of the level. 4.8 ÷ 0.4 = 12 surprises people twice -- the answer is
 * bigger than what you started with, and the way in is to change both numbers
 * before dividing either.
 *
 * The explain names that move as the equivalent-fractions move rather than as
 * a rule about points, because a student who knows only "move both points the
 * same way" has nothing to check the direction against.
 */
function divide(rng) {
  const byWhole = rng.chance(0.4);

  if (byWhole) {
    const places = rng.int(1, 2);
    const k = rng.int(2, 9);
    const q = dec(rng.int(11, 10 ** places * 12), places);
    // A whole quotient makes a whole dividend, and "96 ÷ 8" is not a decimal
    // division at all -- it is the integer skill wearing this level's name.
    if (q.n % q.d === 0) return divide(rng);
    const a = dec(q.n * k, places);
    return {
      prompt: T.asks(T.num(show(a), 1), T.op('÷'), T.num(String(k), 2)),
      text: `${show(a)} ÷ ${k}`,
      answer: { type: 'decimal', value: q },
      visual: {
        kind: 'evalmodel',
        lines: [`${show(a)} ÷ ${k}`, `${a.n} ${nths(a.d)} ÷ ${k}`,
                `${q.n} ${nths(a.d)}`, show(q)],
        rules: ['count in the smallest place', 'ordinary division', 'put the point back'],
        hint: 'What unit is the number counted in?',
      },
      explain: `${show(a)} is ${a.n} ${nths(a.d)}. Sharing ${a.n} of them into ${k} `
        + `equal parts gives ${q.n}, which is ${show(q)}.`,
    };
  }

  // 4.8 ÷ 0.4: shift both by ten until the divisor is a whole number.
  let bn = rng.int(2, 25);
  if (bn % 10 === 0) bn += 1;                    // a whole divisor is the other shape
  const b = dec(bn, 1);
  const q = rng.int(2, 30);
  const a = dec(bn * q, 1);
  return {
    prompt: T.asks(T.num(show(a), 1), T.op('÷'), T.num(show(b), 2)),
    text: `${show(a)} ÷ ${show(b)}`,
    answer: { type: 'decimal', value: dec(q, 0) },
    visual: {
      kind: 'evalmodel',
      lines: [`${show(a)} ÷ ${show(b)}`, `${a.n} ÷ ${b.n}`, String(q)],
      rules: ['multiply both by 10, which leaves the answer alone', 'now both are whole'],
      hint: 'Can you divide by something that is not a whole number?',
    },
    explain: `Multiply both by 10: ${show(a)} ÷ ${show(b)} becomes ${a.n} ÷ ${b.n} = ${q}. `
      + 'Scaling both parts of a division by the same amount leaves the answer alone — '
      + `it is ${show(a)}/${show(b)} and ${a.n}/${b.n} being the same fraction. `
      + `And the answer is bigger than ${show(a)}, because ${show(b)} fits into it `
      + 'more than once over.',
  };
}

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  const build = (lv) => {
    switch (lv) {
      case 0: return placeValue(rng);
      case 1: return compare(rng);
      case 2: return addSub(rng);
      case 3: return multiply(rng);
      case 4: return divide(rng);
      case 5: return toFraction(rng);
      case 6: return whichForm(rng);
      default: return rng.pick([placeValue, compare, addSub, multiply, divide, toFraction])(rng);
    }
  };
  const p = build(level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 2) : level);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
