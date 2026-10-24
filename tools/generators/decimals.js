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
/** A signed whole number with a real minus sign, never a hyphen. */
const int = (x) => (x < 0 ? `−${-x}` : String(x));
const ORDINAL = ['first', 'second', 'third'];

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
  // The question names the digit, not its place: "the 2 in the thousandths
  // place" did the level's one step for the student. Only when the digit
  // appears twice does it need telling apart, and then by order, which still
  // leaves the place to be found.
  const same = [...digits].flatMap((c, i) => (c === digits[at] ? [i] : []));
  const which = same.length > 1 ? `${ORDINAL[same.indexOf(at)]} ${digit}` : String(digit);
  return {
    prompt: [T.prose(`In ${show(v)}, what is the ${which} worth?`)],
    text: `${show(v)}: ${PLACE[at + 1]} digit worth`,
    answer: { type: 'decimal', value: worth },
    visual: {
      kind: 'evalmodel',
      lines: [show(v), `${digit} in the ${PLACE[at + 1]} place`,
              `${digit}/${10 ** (at + 1)}`, show(worth)],
      rules: ['find the place', 'that many of that unit', 'written as a decimal'],
      hint: 'What unit does that column count?',
    },
    explain: `The ${which} is ${ORDINAL[at]} after the point, in the ${PLACE[at + 1]} column. `
      + `That column counts ${10 ** (at + 1)}ths, and there `
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
    // The digit-count warning only where it is the trap: the longer one is
    // the smaller. Said of 0.6 against 0.8 it was about nothing on screen.
    explain: `Line the places up: ${show(a)} is ${a.n} hundredths and ${show(b)} is `
      + `${b.n} hundredths, so ${bigger} is bigger.`
      + (show(x).length !== show(y).length && bigger.length < Math.max(show(x).length, show(y).length)
        ? ' Having more digits does not make a decimal bigger.' : ''),
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
              `${int(plus ? a.n + b.n : a.n - b.n)} ${PLACE[places]}`, show(value)],
      rules: ['count in the smallest place', 'ordinary arithmetic', 'put the point back'],
      hint: 'What unit are both of these counting?',
    },
    explain: `Both are counted in ${PLACE[places]}: ${a.n} ${sign} ${b.n} = `
      + `${int(plus ? a.n + b.n : a.n - b.n)}, which is ${show(value)}.`,
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
    explain: `${show(v)} is ${n} ${n === 1 ? PLACE[places].slice(0, -1) : PLACE[places]}, so ${n}/${d}`
      + (gcd(n, d) > 1 ? `, and dividing both by ${gcd(n, d)} gives ${r.n}/${r.d}.` : '.'),
  };
}

/**
 * The strategic layer. A decimal is for measuring and comparing; a fraction is
 * for exactness and for arithmetic that stays tidy. Thirds are the case that
 * settles it -- 1/3 has no decimal you can write down.
 */
//
// requiem: catalogue/strategy/no-surface-cue
// No word in a prompt settles it on its own. "Exact" turns up on both sides
// (an exact quotient that terminates stays a decimal), so does "add", and a
// fraction in the question does not mean keep the fraction: one measured
// with a ruler is measured as a decimal. With eight fixed templates a
// student learnt the eight answers in a sitting and stopped reading.
const SITUATIONS = [
  { text: 'You need the exact value of {n}/{odd} of something.', want: 'fraction',
    why: '{n}/{odd} has no terminating decimal, so any decimal for it is close and not equal.' },
  { text: 'You need to compare {da} with {db}.', want: 'decimal',
    why: 'Lining the places up compares at a glance. As fractions you would have to find a common denominator first.' },
  { text: 'You need to multiply by {n}/{odd} and keep the answer exact.', want: 'fraction',
    why: 'Multiplying by a fraction stays exact; multiplying by a rounded decimal loses a little every time.' },
  { text: 'You need to measure out {n}/{odd} of a meter with a ruler.', want: 'decimal',
    why: 'A meter rule is marked in centimeters and millimeters, which are hundredths and thousandths '
      + 'of a meter, so a length is measured as a decimal: {n}/{odd} m is about {approx} m.' },
  { text: 'You need to add {n}/{even} to {m}/{even}.', want: 'fraction',
    why: 'They already share a bottom, so the addition is immediate. Converting first is work for nothing.' },
  { text: 'You need to plot {da} on a number line.', want: 'decimal',
    why: 'A position on a line is easiest to place from a decimal.' },
  { text: 'You need to divide {whole} into {odd} equal shares, exactly.', want: 'fraction',
    why: '{whole}/{odd} has no decimal you can write down in full. A fraction always does.' },
  // requiem: catalogue/content/units-both-systems
  // A US shelf tag gives the unit price per ounce.
  { text: 'One brand costs ${da} an ounce and another costs ${db} an ounce. You need to say which is cheaper.',
    want: 'decimal',
    why: 'Prices are compared by place value: line up the points and compare tenths, then hundredths. '
      + 'That is what a decimal is for.' },
  { text: 'You need to add {da} kg and {db} kg.', want: 'decimal',
    why: 'Line up the points and add: {sum} kg. As fractions they are {da100}/100 and {db1000}/1000, '
      + 'which need a common denominator before they can be added.' },
  // Decided by the numbers, not the words: the same question goes either way.
  { text: 'You need the exact answer to {x} ÷ {k}.', want: 'quotient' },
];

// A pool per answer, drawn from evenly. The library keeps the first thousand
// distinct texts, and the decimal situations have far more numbers to draw
// on, so picking situations uniformly came out 73% decimal: guessing
// "decimal" passed the level.
const SIDES = {
  fraction: SITUATIONS.filter((s) => s.want !== 'decimal'),
  decimal: SITUATIONS.filter((s) => s.want !== 'fraction'),
};

/**
 * The situations carry numbers so that the level is not six problems a student
 * memorises in one sitting -- the same reason the other strategy levels
 * interpolate. The numbers are chosen to keep each argument true: the
 * "exact" cases use denominators with no terminating decimal.
 */
function terminates(n, d) {
  let q = reduce({ n, d }).d;
  for (const p of [2, 5]) while (q % p === 0) q /= p;
  return q === 1;
}

const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

/**
 * x ÷ k, asked exactly: a decimal when the quotient terminates, since it is
 * then as exact as the fraction and converting is work for nothing, and a
 * fraction when it does not. Half of each, so the word "exact" cannot be read
 * as the answer.
 */
function asDecimal(r) {
  let p = 0;
  while ((10 ** p) % r.d) p++;
  return show(dec((r.n * 10 ** p) / r.d, p));
}

function exactQuotient(rng, ends) {
  const k = rng.pick([3, 6, 7, 9]);
  let xn;
  do { xn = rng.int(11, 999); } while (xn % 10 === 0 || terminates(xn, 100 * k) !== ends);
  const x = show(dec(xn, 2));
  const text = `You need the exact answer to ${x} ÷ ${k}.`;
  const r = reduce({ n: xn, d: 100 * k });
  const why = ends
    ? `${x} ÷ ${k} = ${asDecimal(r)} exactly, so the decimal is as exact as any fraction. `
      + 'Converting to a fraction first is work for nothing.'
    : `${x} ÷ ${k} = ${(xn / k / 100).toFixed(4)}… and the digits never stop, so no decimal is exact. `
      + `As a fraction it is ${r.n}/${r.d}, exactly.`;
  return { text, want: ends ? 'decimal' : 'fraction', why };
}

function whichForm(rng) {
  // Weighted to the fraction side, whose pools are smaller and run out of
  // new rows first: an even pick still came out 58% decimal.
  const side = rng.chance(0.6) ? 'fraction' : 'decimal';
  const s = rng.pick(SIDES[side]);
  const odd = rng.pick([3, 6, 7, 9, 11, 12, 13, 14, 15, 18]);   // 1/odd never terminates
  const even = rng.pick([4, 8, 5, 10, 16, 20]);
  // n/odd and whole/odd must not terminate either: 3/6 is 0.5 and 6 shared
  // 3 ways is 2, and the case for keeping a fraction is gone. In lowest terms
  // too: nobody measures out 2/6 of a meter.
  const n = rng.pick(range(1, odd - 1).filter((k) => !terminates(k, odd) && gcd(k, odd) === 1));
  const m = rng.int(1, even - 1);
  const whole = rng.pick(range(2, 12).filter((k) => !terminates(k, odd)));
  // No trailing zero, so 0.8 is never "80/100" and 0.89 never "890/1000".
  let an, bn;
  do { an = rng.int(11, 99); } while (an % 10 === 0);
  do { bn = rng.int(101, 999); } while (bn % 10 === 0);
  const da = show(dec(an, 2));
  const db = show(dec(bn, 3));
  const fill = (t) => t
    .replace(/\{oddths\}/g, nths(odd))
    .replace(/\{odd\}/g, String(odd)).replace(/\{even\}/g, String(even))
    .replace(/\{whole\}/g, String(whole))
    .replace(/\{da\}/g, da).replace(/\{db\}/g, db)
    .replace(/\{da100\}/g, String(an)).replace(/\{db1000\}/g, String(bn))
    .replace(/\{sum\}/g, show(dec(an * 10 + bn, 3)))
    .replace(/\{approx\}/g, show(dec(Math.round((100 * n) / odd), 2)))
    .replace(/\{n\}/g, String(n)).replace(/\{m\}/g, String(m));
  const { text, want, why } = s.want === 'quotient'
    ? exactQuotient(rng, side === 'decimal')
    : { text: fill(s.text), want: s.want, why: fill(s.why) };
  return {
    prompt: [T.prose(text)],
    text,
    answer: {
      type: 'choice', value: want,
      options: rng.shuffle([
        { id: 'fraction', label: 'Use a fraction', note: 'exact, and tidy to compute with' },
        { id: 'decimal', label: 'Use a decimal', note: 'easy to compare and to measure' },
      ]),
    },
    visual: null,
    explain: why,
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
      // requiem: catalogue/content/explain-true-for-row
      // Only true below 1: dividing by 2.5 makes a number smaller, and saying
      // otherwise taught that dividing by any decimal makes it bigger.
      + (b.n < 10
        ? `And the answer is bigger than ${show(a)}, because ${show(b)} is less than 1: `
          + `more ${show(b)}s fit into ${show(a)} than 1s do.`
        : `And the answer is smaller than ${show(a)}, because ${show(b)} is more than 1.`),
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
