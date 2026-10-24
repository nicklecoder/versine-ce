/**
 * Catalogue authoring tool: builds the problem library for rational and
 * irrational numbers.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 */
import * as T from '../terms.js';
import { reduce, gcd } from '../../web/math/frac.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/real-numbers.js';

const RATIONAL = [
  { id: 'rational', label: 'Rational', note: 'some fraction of whole numbers equals it' },
  { id: 'irrational', label: 'Irrational', note: 'no fraction of whole numbers equals it' },
];

const isSquare = (n) => Number.isInteger(Math.sqrt(n));
/** What is left of n once every 2 and 5 is divided out. */
function without2s5s(n) {
  while (n % 2 === 0) n /= 2;
  while (n % 5 === 0) n /= 5;
  return n;
}

/**
 * A fraction's decimal by long division, written the way a person would:
 * the digits up to where the cycle starts, then the cycle twice and an
 * ellipsis. Exact, since it is integer remainders throughout.
 */
function expansion(n, d) {
  const whole = Math.floor(n / d);
  let r = n % d;
  const digits = [];
  const seen = new Map();
  while (r !== 0 && !seen.has(r)) {
    seen.set(r, digits.length);
    r *= 10;
    digits.push(Math.floor(r / d));
    r %= d;
  }
  if (r === 0) return { text: `${whole}.${digits.join('')}`.replace(/\.$/, ''), ends: true };
  const start = seen.get(r);
  const lead = digits.slice(0, start).join('');
  const cycle = digits.slice(start).join('');
  // A long cycle -- 1/23 takes twenty-two digits to come round -- is shown
  // as its first eight digits, which says "it keeps going" honestly without
  // a line of numbers nobody reads.
  const shown = cycle.length > 4
    ? `${lead}${cycle.repeat(2)}`.slice(0, 8)
    : `${lead}${cycle.repeat(Math.max(2, Math.ceil(4 / cycle.length)))}`;
  return { text: `${whole}.${shown}…`, ends: false, lead, cycle };
}

/** Ends or repeats, decided by the bottom in lowest terms. */
function endsOrRepeats(rng) {
  // Weighted toward bottoms whose stray factor cancels, which is the trap:
  // 3/12 looks like it has a 3 in the bottom, and does not.
  const trap = rng.chance(0.35);
  let n, d;
  if (trap) {
    const base = rng.pick([2, 4, 5, 8, 10, 20]);
    const k = rng.pick([3, 3, 7, 9, 11]);
    d = base * k;
    n = k * rng.int(1, base - 1);
  } else if (rng.chance(0.23)) {
    // A bottom of only 2s and 5s, so that ends and repeats come out near
    // half and half: with any bottom from 3 to 40, "repeats" was right in
    // two rows of three and clicking it every time nearly passed.
    d = rng.pick([2, 4, 5, 8, 10, 16, 20, 25, 32, 40, 50, 64, 80]);
    n = rng.int(1, d - 1);
  } else {
    d = rng.int(3, 40);
    n = rng.int(1, d - 1);
  }
  const r = reduce({ n, d });
  const ends = without2s5s(r.d) === 1;
  const { text } = expansion(r.n, r.d);
  const lowest = r.d === d ? `${n}/${d} is already in lowest terms` : `${n}/${d} is ${r.n}/${r.d} in lowest terms`;
  const factors = factorise(r.d);
  const madeOf = factors.includes('×') ? `${r.d} = ${factors}`
    : r.d === 2 || r.d === 5 ? `the bottom is just ${r.d}` : `${r.d} is prime`;
  return {
    prompt: [T.prose('Written as a decimal, does'), T.frac(n, d, 1), T.prose('end, or repeat forever?')],
    text: `ends or repeats: ${n}/${d}`,
    answer: {
      type: 'choice', value: ends ? 'ends' : 'repeats',
      options: [
        { id: 'ends', label: 'It ends', note: 'a terminating decimal' },
        { id: 'repeats', label: 'It repeats forever', note: 'a repeating decimal' },
      ],
    },
    visual: {
      kind: 'evalmodel',
      lines: [`${n}/${d}`, `${r.n}/${r.d}`, madeOf, text],
      rules: ['in lowest terms', 'what the bottom is made of',
              ends ? 'only 2s and 5s, so it ends' : 'something other than 2s and 5s, so it repeats'],
      hint: 'Put it in lowest terms first. Then what is the bottom made of?',
    },
    explain: ends
      ? `${lowest}, and ${madeOf}. A bottom made only of 2s and 5s divides some `
        + `power of ten, so the division comes out exactly: ${n}/${d} = ${text}. It ends.`
      : `${lowest}, and ${madeOf}. Only 2s and 5s divide a power of ten, so the `
        + `division never comes out and the remainders cycle: ${n}/${d} = ${text}. It repeats forever.`,
  };
}

function factorise(n) {
  if (n === 1) return '1';
  const out = [];
  for (let p = 2; n > 1; p++) while (n % p === 0) { out.push(p); n /= p; }
  return out.join(' × ');
}

/**
 * A repeating decimal back into a fraction. Three shapes: one digit cycling,
 * two digits cycling, and one digit before a one-digit cycle starts. The
 * explanation leans on 1/9 = 0.111… and 1/99 = 0.0101…, so the rule is a
 * consequence of a fact a student can check by dividing, not a trick.
 */
function repeatingToFraction(rng) {
  const shape = rng.pick(['one', 'one', 'two', 'two', 'delayed']);
  if (shape === 'one') {
    const a = rng.int(1, 8);
    const value = reduce({ n: a, d: 9 });
    const shown = `0.${String(a).repeat(4)}…`;
    return repeatProblem(shown, `0.(${a})`, value,
      [shown, `${a} × 0.1111…`, `${a} × 1/9`, `${value.n}/${value.d}`],
      ['one digit repeating, so ninths', '0.1111… is 1/9', 'in lowest terms'],
      `1/9 = 0.1111…, so ${shown} is ${a} ninths: ${a}/9`
        + (value.d !== 9 ? `, which is ${value.n}/${value.d} in lowest terms.` : '.'));
  }
  if (shape === 'two') {
    let ab = rng.int(1, 98);
    while (ab % 11 === 0) ab = rng.int(1, 98);    // 0.4444… is a one-digit cycle
    const block = String(ab).padStart(2, '0');
    const value = reduce({ n: ab, d: 99 });
    const shown = `0.${block.repeat(3)}…`;
    return repeatProblem(shown, `0.(${block})`, value,
      [shown, `${ab} × 0.010101…`, `${ab} × 1/99`, `${value.n}/${value.d}`],
      ['two digits repeating, so ninety-ninths', '0.0101… is 1/99', 'in lowest terms'],
      `1/99 = 0.010101…, so ${shown} is ${ab} ninety-ninths: ${ab}/99`
        + (value.d !== 99 ? `, which is ${value.n}/${value.d} in lowest terms.` : '.'));
  }
  // 0.1666…: a tenth, plus a repeating part that starts one place later.
  const a = rng.int(1, 9);
  let b = rng.int(1, 9);
  while (b === a) b = rng.int(1, 9);
  const value = reduce({ n: 9 * a + b, d: 90 });  // a/10 + b/90
  const shown = `0.${a}${String(b).repeat(4)}…`;
  return repeatProblem(shown, `0.${a}(${b})`, value,
    [shown, `0.${a} + 0.0${String(b).repeat(3)}…`, `${a}/10 + ${b}/90`,
     `${9 * a}/90 + ${b}/90`, `${value.n}/${value.d}`],
    ['split off the part that does not repeat', `0.0${b}${b}${b}… is a tenth of ${b}/9`,
     'over a common bottom', 'add, then lowest terms'],
    `Split it: ${shown} is 0.${a} + 0.0${String(b).repeat(3)}…. The first is ${a}/10. The second is `
      + `a tenth of 0.${String(b).repeat(3)}…, so ${b}/90. Together that is ${9 * a}/90 + ${b}/90 = `
      + `${9 * a + b}/90` + (value.d !== 90 ? `, which is ${value.n}/${value.d} in lowest terms.` : '.'));
}

function repeatProblem(shown, text, value, lines, rules, explain) {
  return {
    prompt: T.asks(T.num(shown, 1)),
    text: `${text} as a fraction`,
    answer: { type: 'frac', value, requireSimplest: true },
    visual: { kind: 'evalmodel', lines, rules, hint: 'How many digits repeat?' },
    explain,
  };
}

/**
 * Rational or not. Each kind is here because a student sorts it wrongly by
 * appearance: √49 looks irrational and is 7; 22/7 looks like π and is a
 * fraction; 0.101001000… looks like a pattern, and a pattern is not a cycle.
 */
function rationalOrNot(rng) {
  // Rational or irrational first, half and half, then a kind of number: the
  // kinds are mostly rational, and picking a kind first made "rational"
  // right in seven rows of eight.
  const pick = rng.chance(0.5)
    ? rng.pick(['square', 'fraction', 'repeating', 'piStandIn', 'negative', 'rootFraction', 'decimal'])
    : rng.pick(['nonsquare', 'nonsquare', 'negativeRoot', 'cubeRoot', 'pattern', 'pi']);
  let shown, text, rational, why;
  switch (pick) {
    case 'square': {
      const k = rng.int(2, 15);
      shown = `√${k * k}`; text = shown; rational = true;
      why = `${k} × ${k} = ${k * k}, so √${k * k} is exactly ${k}, which is ${k}/1. Rational.`;
      break;
    }
    case 'nonsquare': {
      let n = rng.int(2, 300);
      while (isSquare(n)) n = rng.int(2, 300);
      const lo = Math.floor(Math.sqrt(n));
      shown = `√${n}`; text = shown; rational = false;
      why = `${n} is not a perfect square: ${lo}² = ${lo * lo} and ${lo + 1}² = ${(lo + 1) ** 2}. `
        + `The square root of a whole number that is not a perfect square is never a fraction. Irrational.`;
      break;
    }
    case 'fraction': {
      const d = rng.int(2, 15);
      let n = rng.nonZero(-20, 20);
      while (n % d === 0) n = rng.nonZero(-20, 20);   // −10/10 is a whole number in costume
      shown = `${n < 0 ? '−' : ''}${Math.abs(n)}/${d}`; text = `${n}/${d}`; rational = true;
      why = `${shown} is already a fraction of whole numbers. Rational.`;
      break;
    }
    case 'repeating': {
      const d = rng.pick([3, 6, 7, 9, 11, 12, 13, 15]);
      let n = rng.int(1, d - 1);
      while (gcd(n, d) !== 1 || without2s5s(d) === 1) n = rng.int(1, d - 1);
      const e = expansion(n, d);
      shown = e.text; text = `0.${e.lead}(${e.cycle})`; rational = true;
      why = `${shown} repeats, and every repeating decimal is a fraction: this one is ${n}/${d}. Rational.`;
      break;
    }
    case 'negativeRoot': {
      let n = rng.int(2, 100);
      while (isSquare(n)) n = rng.int(2, 100);
      shown = `−√${n}`; text = shown; rational = false;
      why = `${n} is not a perfect square, so √${n} is irrational, and its negative is too: if −√${n} `
        + `were a fraction, so would √${n} be. Irrational.`;
      break;
    }
    case 'cubeRoot': {
      let n = rng.int(2, 200);
      while (Number.isInteger(Math.round(Math.cbrt(n))) && Math.round(Math.cbrt(n)) ** 3 === n) n = rng.int(2, 200);
      const lo = Math.floor(Math.cbrt(n) + 1e-9);
      shown = `∛${n}`; text = shown; rational = false;
      why = `${n} is not a perfect cube: ${lo}³ = ${lo ** 3} and ${lo + 1}³ = ${(lo + 1) ** 3}. `
        + `The cube root of a whole number that is not a perfect cube is never a fraction. Irrational.`;
      break;
    }
    case 'pattern': {
      const a = rng.int(1, 9);
      // 0.1 01 001 0001 …: a pattern, but the gaps grow, so nothing cycles.
      const s = Array.from({ length: 5 }, (_, i) => `${'0'.repeat(i)}${a}`).join('');
      shown = `0.${s}…`; text = `0.${s}… (gaps growing)`; rational = false;
      why = `The zeros between the ${a}s keep growing, so no block of digits ever repeats. `
        + `A decimal that neither ends nor repeats is not a fraction. Irrational.`;
      break;
    }
    case 'pi': {
      const k = rng.int(1, 9);
      const over = k > 1 && rng.chance(0.5);
      shown = k === 1 ? 'π' : over ? `π/${k}` : `${k}π`; text = shown; rational = false;
      why = `π is irrational, and ${k === 1 ? 'that is'
        : `${over ? 'an irrational number divided by' : `${k} times an irrational number is still`}`}`
        + `${over ? ` ${k} is still` : ''} not a fraction. Irrational.`;
      break;
    }
    case 'piStandIn': {
      const s = rng.pick(['22/7', '3.14', '3.1416']);
      shown = s; text = s; rational = true;
      why = `${s} is close to π, which is why people use it, but it is not π. ${s.includes('/') ? s
        : `${s} is ${s.replace('.', '').replace(/^0+/, '')}/${10 ** (s.length - 2)}`}, a fraction. Rational.`;
      break;
    }
    case 'negative': {
      const n = rng.int(1, 50);
      shown = `−${n}`; text = `-${n}`; rational = true;
      why = `−${n} is −${n}/1. Negative whole numbers are fractions too. Rational.`;
      break;
    }
    case 'rootFraction': {
      const a = rng.int(1, 9), b = rng.int(2, 12);
      if (a >= b) return rationalOrNot(rng);
      shown = `√(${a * a}/${b * b})`; text = shown; rational = true;
      why = `${a * a} = ${a}² and ${b * b} = ${b}², so ${shown} is exactly ${a}/${b}. Rational.`;
      break;
    }
    default: {
      const places = rng.int(1, 3);
      const n = rng.int(1, 10 ** (places + 1) - 1);
      const str = (n / 10 ** places).toFixed(places);
      shown = str; text = str; rational = true;
      why = `${str} ends, so it is ${n}/${10 ** places}. Rational.`;
    }
  }
  return {
    prompt: [T.prose(`Is ${shown} rational or irrational?`)],
    text: `rational or irrational: ${text}`,
    answer: { type: 'choice', value: rational ? 'rational' : 'irrational', options: RATIONAL },
    visual: null,
    explain: why,
  };
}

/**
 * Which is bigger. A root is compared by squaring both, π by writing both
 * out far enough, and a fraction against a decimal by dividing. Close pairs
 * on purpose: √50 against 7 is no question, √50 against 7.1 is.
 */
const PI = 3.14159265358979;
function bigger(rng) {
  const kind = rng.pick(['root', 'root', 'pi', 'fraction']);
  let a, b, why;
  if (kind === 'root') {
    let n = rng.int(5, 150);
    while (isSquare(n)) n = rng.int(5, 150);
    const r = Math.sqrt(n);
    // A tenth just above or below the root, never equal to it.
    const t = (Math.floor(r * 10) + rng.pick([0, 1])) / 10;
    const ts = t.toFixed(1);
    const t2 = Number((t * t).toFixed(2));
    a = { label: `√${n}`, v: r }; b = { label: ts, v: t };
    why = `Square both: (√${n})² = ${n} and ${ts}² = ${t2}. `
      + `${t2 > n ? `${ts} is bigger.` : `√${n} is bigger.`}`;
  } else if (kind === 'pi') {
    const stand = rng.pick([['22/7', 22 / 7, '3.142857…'], ['3.14', 3.14, '3.14'],
                            ['3.15', 3.15, '3.15'], ['3.1416', 3.1416, '3.1416'], ['3.141', 3.141, '3.141']]);
    a = { label: 'π', v: PI }; b = { label: stand[0], v: stand[1] };
    why = `π = 3.14159…${stand[0] === '22/7' ? ', and 22/7 = 3.142857…' : ''}. Lined up place `
      + `by place against ${stand[0]}, ${stand[1] > PI ? `${stand[0]} is bigger.` : 'π is bigger.'}`;
  } else {
    const d = rng.pick([3, 6, 7, 9, 11, 12]);
    let n = rng.int(1, d - 1);
    while (gcd(n, d) !== 1) n = rng.int(1, d - 1);
    const exact = expansion(n, d).text;
    const two = Math.floor((n / d) * 100) + rng.pick([0, 1]);
    const ds = (two / 100).toFixed(2);
    a = { label: `${n}/${d}`, v: n / d }; b = { label: ds, v: two / 100 };
    why = `${n}/${d} = ${exact}, against ${ds}. ${n / d > two / 100 ? `${n}/${d} is bigger.` : `${ds} is bigger.`}`;
  }
  if (Math.abs(a.v - b.v) < 1e-9) return bigger(rng);
  const win = a.v > b.v ? a : b;
  const [x, y] = rng.chance(0.5) ? [a, b] : [b, a];
  return {
    prompt: [T.prose(`Which is bigger, ${x.label} or ${y.label}?`)],
    text: `bigger: ${x.label} or ${y.label}`,
    answer: {
      type: 'choice', value: win.label,
      options: [x.label, y.label].map((s) => ({ id: s, label: s })),
    },
    visual: null,
    explain: why,
  };
}

/**
 * A square root to one decimal place, by squaring. Exact throughout: the
 * candidates are tenths, so their squares are hundredths, and the halfway
 * point is a twentieth whose square is compared in integers.
 */
function pinItDown(rng) {
  let n = rng.int(2, 150);
  while (isSquare(n)) n = rng.int(2, 150);
  const lo = Math.floor(Math.sqrt(n));
  // t = the tenth below the root: t² ≤ n < (t + 0.1)², found in integers.
  let t = lo * 10;
  while ((t + 1) * (t + 1) <= 100 * n) t++;
  const half = 2 * t + 1;                          // (t + 0.5)/10 = half/20
  const up = half * half <= 400 * n;               // the root is at or past halfway
  const answer = up ? t + 1 : t;
  const tenth = (k) => `${Math.floor(k / 10)}.${k % 10}`;
  const sq = (k) => ((k * k) / 100).toFixed(2).replace(/\.?0+$/, '');
  const halfStr = `${tenth(t)}5`;
  const halfSq = ((half * half) / 400).toFixed(4).replace(/\.?0+$/, '');
  return {
    prompt: [T.prose('To one decimal place,'), T.num(`√${n}`, 1), T.op('≈'), T.blank()],
    text: `√${n} to 1 dp`,
    answer: { type: 'decimal', value: { n: answer, d: 10 } },
    visual: {
      kind: 'evalmodel',
      lines: [`√${n}`, `${lo}² = ${lo * lo} and ${lo + 1}² = ${(lo + 1) ** 2}`,
              `${tenth(t)}² = ${sq(t)} and ${tenth(t + 1)}² = ${sq(t + 1)}`,
              `${halfStr}² = ${halfSq}`, tenth(answer)],
      rules: ['between two whole numbers', 'between two tenths', 'square the halfway point',
              up ? `${n} is past halfway, so round up` : `${n} is short of halfway, so round down`],
      hint: 'Which two whole numbers is it between? Then which two tenths?',
    },
    explain: `√${n} is between ${lo} and ${lo + 1}, because ${lo}² = ${lo * lo} and ${lo + 1}² = `
      + `${(lo + 1) ** 2}. Closer in, ${tenth(t)}² = ${sq(t)} and ${tenth(t + 1)}² = ${sq(t + 1)}, so `
      + `it is between ${tenth(t)} and ${tenth(t + 1)}. Halfway, ${halfStr}² = ${halfSq}, which is `
      + `${up ? 'below' : 'above'} ${n}, so √${n} is nearer ${tenth(answer)}.`,
  };
}

/**
 * Sums and products with an irrational in them. The rule a student invents
 * -- a root in it means irrational -- holds until the roots meet each other:
 * √3 × √3 is 3, √2 × √8 is √16, and √5 − √5 is nothing at all.
 */
function sumsAndProducts(rng) {
  const nonSquare = (top = 30) => { let n = rng.int(2, top); while (isSquare(n)) n = rng.int(2, top); return n; };
  // Every row has a root or π in it -- fraction-only filler (5/5 + 7/7) asked
  // nothing about mixing in a root -- and the two answers come out near half
  // and half, so the rational cases range wider to make up their number.
  // Weighted, since the rational cases repeat sooner and repeats are dropped.
  const pick = rng.chance(0.55)
    ? rng.pick(['timesZero', 'selfProduct', 'pairSquare', 'cancel', 'quotientSquare'])
    : rng.pick(['plusWhole', 'timesWhole', 'pairNot', 'double', 'piPlus']);
  let shown, rational, why;
  const wide = ['timesZero', 'selfProduct', 'cancel'].includes(pick);
  const n = nonSquare(wide ? 199 : 30);
  const k = rng.int(2, 9);
  switch (pick) {
    case 'plusWhole':
      shown = `${k} + √${n}`; rational = false;
      why = `If ${k} + √${n} were a fraction, taking ${k} away would make √${n} a fraction too, `
        + `and it is not. Rational plus irrational is irrational.`;
      break;
    case 'timesWhole':
      shown = `${k} × √${n}`; rational = false;
      why = `If ${k} × √${n} were a fraction, dividing by ${k} would make √${n} one, and it is not. `
        + `A non-zero rational times an irrational is irrational.`;
      break;
    case 'timesZero':
      shown = rng.chance(0.5) ? `0 × √${n}` : `√${n} × 0`; rational = true;
      why = `Zero times anything is 0, and 0 is 0/1. The one exception to "rational times irrational `
        + 'is irrational": the rational was zero. Rational.';
      break;
    case 'selfProduct':
      shown = `√${n} × √${n}`; rational = true;
      why = `A square root times itself is the number under it: √${n} × √${n} = ${n}. Rational.`;
      break;
    case 'pairSquare': {
      // √a × √b with ab a perfect square, a and b both not.
      const s = rng.pick([2, 3, 5, 6, 7, 10, 11]);
      const m = rng.pick([2, 3, 4]);
      const [a, b] = rng.chance(0.5) ? [s, s * m * m] : [s * m * m, s];
      shown = `√${a} × √${b}`; rational = true;
      why = `√${a} × √${b} = √${a * b}, and ${a * b} = ${s * m}², so it is exactly ${s * m}. Rational.`;
      break;
    }
    case 'quotientSquare': {
      // √(s·m²) ÷ √s: two irrational roots whose quotient is whole.
      const s = rng.pick([2, 3, 5, 6, 7, 10, 11]);
      const m = rng.int(2, 6);
      shown = `√${s * m * m} ÷ √${s}`; rational = true;
      why = `√${s * m * m} ÷ √${s} = √(${s * m * m} ÷ ${s}) = √${m * m} = ${m}. Two irrational roots, `
        + 'and their quotient is whole. Rational.';
      break;
    }
    case 'pairNot': {
      let a = nonSquare(), b = nonSquare();
      while (isSquare(a * b) || a === b) { a = nonSquare(); b = nonSquare(); }
      shown = `√${a} × √${b}`; rational = false;
      why = `√${a} × √${b} = √${a * b}, and ${a * b} is not a perfect square. Irrational.`;
      break;
    }
    case 'cancel':
      shown = `√${n} − √${n}`; rational = true;
      why = `Anything take away itself is 0, and 0 is 0/1. Rational.`;
      break;
    case 'double':
      shown = `√${n} + √${n}`; rational = false;
      why = `√${n} + √${n} = 2√${n}, a non-zero whole number times an irrational. Irrational.`;
      break;
    case 'piPlus':
      shown = `π + ${k}`; rational = false;
      why = `If π + ${k} were a fraction, taking ${k} away would make π one, and it is not. Irrational.`;
      break;
    default:
      throw new Error(`real-numbers: no case ${pick}`);
  }
  return {
    prompt: [T.prose(`Is ${shown} rational or irrational?`)],
    text: `rational or irrational: ${shown}`,
    answer: { type: 'choice', value: rational ? 'rational' : 'irrational', options: RATIONAL },
    visual: null,
    explain: why,
  };
}

const CONTENT = [endsOrRepeats, repeatingToFraction, rationalOrNot, bigger, pinItDown, sumsAndProducts];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  // The mixed level draws from every level. Its answer widget changes with
  // the problem, but every level here is asked in a shape of its own -- a
  // fraction is only ever asked for a repeating decimal, a decimal only for
  // a root to one place -- so the widget tells a student nothing the
  // question did not already say.
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
