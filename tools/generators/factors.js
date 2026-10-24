/**
 * Catalogue authoring tool: builds the problem library for factors.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding -- when a
 * systematic fault affects too many rows to correct by hand, or when a level
 * is redesigned. Individual bad problems are fixed in the library directly.
 *
 * Run via: node scripts/build-library.mjs
 */
import * as T from '../terms.js';
import { nths } from '../../web/math/frac.js';
import { LEVELS, LAST_LEVEL, PAR_SECONDS } from '../../web/skills/factors.js';

/** Small enough to be recognized on sight, which is the point of knowing them. */
const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23];

/** Ascending prime factorisation as [prime, exponent] pairs. */
function factorise(n) {
  const out = [];
  let rest = n;
  for (let p = 2; p * p <= rest; p++) {
    let e = 0;
    while (rest % p === 0) { rest /= p; e++; }
    if (e) out.push([p, e]);
  }
  if (rest > 1) out.push([rest, 1]);
  return out;
}

const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));

/** 2 × 2 × 2 × 3, so that "what they share" is visibly a statement about factors. */
const spelt = (n) => factorise(n).flatMap(([p, e]) => Array.from({ length: e }, () => p)).join(' × ');

/** Superscript digits, so a factorisation reads as it would be written. */
const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const sup = (n) => String(n).split('').map((c) => SUP[c] ?? c).join('');
const powered = (n) => factorise(n).map(([p, e]) => (e > 1 ? `${p}${sup(e)}` : String(p))).join(' × ');

/**
 * Factor pairs, asked from either side.
 *
 * The pair is the whole idea: a factor is never alone, and the partner is a
 * division away. Asking the left slot as often as the right stops the level
 * becoming "divide the big number by the small one" performed from muscle
 * memory without ever reading which slot is empty.
 */
function factorPair(rng) {
  const a = rng.int(2, 16);
  const b = rng.int(2, 16);
  const n = a * b;
  const known = rng.chance(0.5) ? a : b;
  const missing = n / known;
  const knownFirst = rng.chance(0.5);

  const shown = T.num(known, 1);
  return {
    prompt: knownFirst
      ? [shown, T.op('×'), T.blank(), T.op('='), T.num(n, 2)]
      : [T.blank(), T.op('×'), shown, T.op('='), T.num(n, 2)],
    text: knownFirst ? `${known} × ? = ${n}` : `? × ${known} = ${n}`,
    answer: { type: 'int', value: missing },
    visual: {
      kind: 'evalmodel',
      lines: [`${known} × ? = ${n}`, `${n} ÷ ${known}`, `${known} × ${missing} = ${n}`],
      rules: ['divide to find the partner', `which is ${missing}`],
      hint: 'What does this one multiply by to get there?',
    },
    explain: `Factors come in pairs, so dividing finds the partner: ${n} ÷ ${known} = ${missing}. `
      + `The pair is ${known} × ${missing}.`,
  };
}

/**
 * The numbers this level asks about: every odd one in the range, and every
 * twenty-second even one.
 *
 * "Even, so 2" is a rule a student learns rather than one they arrive
 * knowing, so it has to be drilled. But an even number answers itself the
 * instant it is recognized, and a level made largely of them trains reading
 * the last digit instead of working up through the primes. One even number
 * every 22 puts 27 of them among 289 odds -- 8.5% of the level, which a Time
 * Trial meets about once.
 *
 * The stride does the spreading, so the evens run from 24 to 596 rather than
 * clustering in the small numbers. 22 is the stride and not a rounder one
 * because of two artefacts it avoids: the final digit advances by two each
 * time and so cycles through all five even endings, where a stride of 20
 * would have made every one of them end in 4; and 22 is not a multiple of 6,
 * where a tidier 18 would have made every even number a multiple of 6 and
 * never once shown 2 x a prime.
 *
 * The ratio lives in how many of each exist rather than in a draw
 * probability. The library is deduplicated by problem text and then dealt
 * from without replacement, so any number the generator can reach lands in
 * the file exactly once however rarely it is drawn -- a one-in-ten chance and
 * a one-in-two chance produce the same library. What a student meets is the
 * shape of this list.
 */
const SPF_POOL = [];
for (let n = 23; n <= 599; n++) if (n % 2 === 1 || n % 22 === 2) SPF_POOL.push(n);

/**
 * The smallest prime that divides a number, which is the primality test
 * written as a question with an answer.
 *
 * Three cases, and each is worth meeting: even, where the answer arrives at
 * once and the point is knowing why; odd and composite, where 3, 5, 7, 11 and
 * 13 are tried in turn until one goes in; and odd and prime, where they are
 * all tried, all fail, and the number is its own smallest prime factor.
 */
function smallestPrimeFactor(rng) {
  const n = rng.pick(SPF_POOL);
  const [p] = factorise(n)[0];
  const prime = p === n;
  const even = p === 2;

  const tried = PRIMES.filter((q) => q * q <= n && q < p && q !== 2);
  const ruledOut = tried.length
    ? `${tried.join(', ')} — none of them divide it`
    : 'nothing smaller divides it';

  return {
    prompt: [T.prose(`What is the smallest prime that divides ${n}?`)],
    text: `smallest prime factor of ${n}`,
    answer: { type: 'int', value: p },
    visual: {
      kind: 'evalmodel',
      lines: prime
        ? [String(n), `try ${ruledOut}`, `${n} is prime`, String(n)]
        : [String(n), `${n} ÷ ${p} = ${n / p}`, `${p} × ${n / p}`, String(p)],
      rules: prime
        ? ['work up through the primes', 'so nothing divides it but 1 and itself',
           'a prime\'s smallest prime factor is itself']
        : even
          ? ['it is even, so 2 goes in', 'and no prime is smaller than 2',
             'so the search stops before it starts']
          : [`test the primes in order until one goes in`, 'so it splits here',
             'the smaller of the pair is the answer'],
      hint: 'Work up through the primes: 2, 3, 5, 7, 11, 13…',
    },
    explain: prime
      ? `Try ${ruledOut}, and past that the pairs would repeat. So ${n} is prime, and the `
        + `smallest prime dividing it is ${n} itself.`
      : even
        ? `${n} is even, so 2 divides it: ${n} ÷ 2 = ${n / 2}. No prime is smaller than 2, so `
          + `there is nothing left to test — the smallest prime factor is 2.`
        : `${n} ÷ ${p} = ${n / p} exactly, and no smaller prime goes in. So the smallest prime `
          + `factor is ${p}.`,
  };
}

/**
 * A factorisation with one piece missing.
 *
 * Half the rows blank an exponent rather than a prime, and those are the ones
 * that carry the skill: "how many 2s are in 168" cannot be answered by
 * dividing 168 by what is left, so it has to be answered by factorising.
 */
function primeFactorisation(rng) {
  const base = rng.pick([2, 3, 5, 7]);
  const exponent = rng.int(2, base === 2 ? 5 : base === 3 ? 4 : 3);
  // Capped so the number stays one a student can actually take apart in their
  // head. The skill is the splitting, and 6,992 is not a harder split than
  // 504 -- only harder division, which belongs to another skill.
  const room = 2000 / base ** exponent;
  const small = PRIMES.filter((p) => p !== base && p <= 13);
  /** @type {Array<[number, number]>} primes beside the base, with exponents */
  const others = [];
  let product = 1;
  for (const p of rng.shuffle(small)) {
    if (others.length === 3) break;
    // A second prime is squared now and then, so the level is not a run of
    // "one power and some singles" wearing different digits.
    const e = others.length === 0 && rng.chance(0.25) ? 2 : 1;
    if (product * p ** e > room) continue;
    others.push([p, e]);
    product *= p ** e;
  }
  const n = base ** exponent * product;
  const pairs = factorise(n);
  // Blanking a prime only works where the prompt would otherwise show it on
  // its own: a power drawn with a blank base has nowhere to put the exponent.
  const single = others.filter(([, e]) => e === 1);
  const askExponent = !single.length || rng.chance(0.5);
  const target = askExponent ? base : rng.pick(single)[0];

  const terms = [];
  const parts = [];
  let answer = null;
  pairs.forEach(([p, e], i) => {
    if (i) { terms.push(T.op('×')); }
    const isTarget = p === target;
    if (isTarget && askExponent) {
      terms.push(T.pow(p, null, 2));
      parts.push(`${p}^?`);
      answer = e;
    } else if (isTarget) {
      terms.push(T.blank());
      parts.push('?');
      answer = p;
    } else {
      terms.push(e > 1 ? T.pow(p, e, 1) : T.num(p, 1));
      parts.push(e > 1 ? `${p}^${e}` : String(p));
    }
  });

  return {
    prompt: [T.num(n, 3), T.op('='), ...terms],
    text: `${n} = ${parts.join(' × ')}`,
    answer: { type: 'int', value: answer },
    visual: {
      kind: 'evalmodel',
      lines: [String(n), spelt(n), powered(n)],
      rules: ['split it until only primes are left', 'gather the repeats into powers'],
      hint: askExponent ? 'How many times does that prime go in?' : 'Which prime is unaccounted for?',
    },
    explain: `Split ${n} all the way down and it is ${spelt(n)}. Gathered up that is `
      + `${powered(n)}, so the missing piece is ${answer}.`,
  };
}

/**
 * A pair built from a shared part and two coprime halves, so the answer is
 * exactly what was intended rather than whatever the numbers happened to
 * have in common.
 */
function pairSharing(rng) {
  for (let i = 0; i < 60; i++) {
    const share = rng.int(2, 18);
    const a = rng.int(2, 11);
    const b = rng.int(2, 11);
    if (a === b || gcd(a, b) !== 1) continue;
    const x = share * a;
    const y = share * b;
    if (x > 200 || y > 200) continue;
    return { share, x, y, lcm: share * a * b };
  }
  return { share: 6, x: 12, y: 18, lcm: 36 };
}

/** The greatest common factor: what is left when the two are laid side by side. */
function greatestCommonFactor(rng) {
  // Some pairs share nothing. A GCF of 1 is the case that says a fraction is
  // already in lowest terms, and a level that never has one teaches that two
  // numbers always have something in common.
  if (rng.chance(0.15)) return coprimePair(rng);
  const { share, x, y } = pairSharing(rng);
  return {
    prompt: [T.prose(`What is the greatest common factor of ${x} and ${y}?`)],
    text: `GCF of ${x} and ${y}`,
    answer: { type: 'int', value: share },
    visual: {
      kind: 'evalmodel',
      lines: [`${x} and ${y}`, `${x} = ${spelt(x)}`, `${y} = ${spelt(y)}`,
              `both have ${spelt(share)}`, String(share)],
      rules: ['break the first into primes', 'and the second',
              'keep only the factors that appear in both', 'multiply those together'],
      hint: 'What do both of them contain?',
    },
    explain: `${x} is ${spelt(x)} and ${y} is ${spelt(y)}. `
      + (factorise(share).length === 1 && factorise(share)[0][1] === 1
        ? `The only factor they both hold is ${share}.`
        : `The factors they both hold are ${spelt(share)}, and multiplying those gives ${share}.`),
  };
}

function coprimePair(rng) {
  let x, y;
  do {
    x = rng.int(10, 99);
    y = rng.int(10, 99);
  } while (x === y || gcd(x, y) !== 1 || factorise(x).length + factorise(y).length < 3);
  return {
    prompt: [T.prose(`What is the greatest common factor of ${x} and ${y}?`)],
    text: `GCF of ${x} and ${y}`,
    answer: { type: 'int', value: 1 },
    visual: {
      kind: 'evalmodel',
      lines: [`${x} and ${y}`, `${x} = ${spelt(x)}`, `${y} = ${spelt(y)}`,
              'no prime in both', '1'],
      rules: ['break the first into primes', 'and the second',
              'keep only the factors that appear in both', 'so only 1 goes into both'],
      hint: 'What do both of them contain?',
    },
    explain: `${x} is ${spelt(x)} and ${y} is ${spelt(y)}. No prime appears in both, so the only `
      + `factor they share is 1, and ${x}/${y} is already in lowest terms.`,
  };
}

/** The lowest common multiple: the first place two counts land together. */
function lowestCommonMultiple(rng) {
  const { x, y, lcm } = pairSharing(rng);
  const runUp = (n) => {
    const steps = [];
    for (let k = n; k <= lcm; k += n) steps.push(k);
    return steps.length > 6 ? `${steps.slice(0, 5).join(', ')}, …, ${lcm}` : steps.join(', ');
  };
  const share = gcd(x, y);
  // Counting up works when the counts are short. 112 and 80 meet at 560, five
  // and seven steps in with big numbers to add, and saying "the first number
  // both reach is 560" told a student nothing about how to get there.
  const short = lcm / Math.min(x, y) <= 8;
  const shortcut = `Or use the GCF: ${x} × ${y} ÷ ${share} = ${lcm}.`;
  return {
    prompt: [T.prose(`What is the lowest common multiple of ${x} and ${y}?`)],
    text: `LCM of ${x} and ${y}`,
    answer: { type: 'int', value: lcm },
    visual: short
      ? {
        kind: 'evalmodel',
        lines: [`${x} and ${y}`, `${x}s: ${runUp(x)}`, `${y}s: ${runUp(y)}`, String(lcm)],
        rules: [`count up in ${x}s`, `count up in ${y}s`, 'the first number in both lists'],
        hint: 'Where do the two counts first land on the same number?',
      }
      : {
        kind: 'evalmodel',
        lines: [`${x} and ${y}`, `${x} = ${powered(x)}`, `${y} = ${powered(y)}`,
                powered(lcm), String(lcm)],
        rules: ['break the first into primes', 'and the second',
                'each prime, as many times as either one has it', 'multiplied out'],
        hint: 'Counting up would take a while. What are they made of?',
      },
    explain: short
      ? `Counting in ${x}s and counting in ${y}s, the first number both reach is ${lcm}. `
        + `That is the lowest common multiple. ${shortcut}`
      : `${x} is ${powered(x)} and ${y} is ${powered(y)}. A multiple of both needs every prime `
        + `either one has, as many times as it has it: ${powered(lcm)} = ${lcm}. ${shortcut}`,
  };
}

/**
 * The strategic layer, and the reason this skill has a strategy level at all.
 *
 * Both quantities are cheap to compute and impossible to tell apart by looking
 * at the numbers, so the situations have to be read. The discriminator worth
 * carrying away is a size check: cutting things up, sharing them out or
 * fitting something inside wants an answer no bigger than either number, and
 * that is a factor. Repeating until two cycles agree, or building something
 * big enough to hold both, wants an answer at least as big as either, and
 * that is a multiple.
 */
//
// requiem: catalogue/strategy/no-surface-cue
// Each kind of object turns up on both sides -- ribbons cut down and ribbons
// laid end to end, packs split up and boxes bought, rows as long as possible
// and as few as possible -- because with one answer per object the level
// was passed by recognizing the object.
const SITUATIONS = [
  { text: 'A {a} cm ribbon and a {b} cm ribbon, cut into equal pieces as long as possible.',
    want: 'gcf',
    why: 'The pieces have to fit inside both ribbons, so the answer cannot be bigger than either. '
      + 'That is a common factor, and "as long as possible" makes it the greatest one.' },
  { text: 'Two lights flash every {a} seconds and every {b} seconds. When do they next flash together?',
    want: 'lcm',
    why: 'Both lights have to have completed whole cycles, so the answer is a number of seconds '
      + 'both counts reach — at least as big as either. That is the lowest common multiple.' },
  { text: '{a} pens and {b} pencils, split into identical packs with nothing left over. '
      + 'What is the greatest number of packs?',
    want: 'gcf',
    why: 'The number of packs has to divide both piles exactly, so it is no bigger than either. '
      + 'The most packs is the greatest common factor.' },
  { text: 'Pens come in boxes of {a} and pencils in boxes of {b}. What is the fewest pens you can '
      + 'buy and still have exactly as many pencils?',
    want: 'lcm',
    why: 'The number of pens has to be a whole number of boxes of {a} and also of {b}, so it is a '
      + 'number both counts reach. The fewest is the lowest common multiple.' },
  { text: 'Ribbons come {a} cm and {b} cm long. Laid end to end, what is the shortest length both '
      + 'kinds can make exactly?',
    want: 'lcm',
    why: 'The length has to be a whole number of each kind of ribbon, so both counts reach it — '
      + 'it is at least as long as either. The shortest is the lowest common multiple.' },
  { text: 'Two classes of {a} and {b} pupils are split into teams of the same size, no team mixing '
      + 'classes. What is the largest team size?',
    want: 'gcf',
    why: 'A team size has to divide both classes exactly, so it is no bigger than either. '
      + 'The largest is the greatest common factor.' },
  { text: '{a} red counters and {b} blue ones, in rows of equal length, no row mixing colors. '
      + 'What is the fewest rows there can be?',
    want: 'gcf',
    why: 'The fewest rows means the longest rows, and a row length has to divide both colors '
      + 'exactly. The longest that does is the greatest common factor.' },
  { text: 'Tiles {a} cm by {b} cm, laid out to make the smallest possible square.',
    want: 'lcm',
    why: 'The square\'s side has to be a whole number of tiles each way, so it is a length both '
      + 'sides count up to. Smallest such length is the lowest common multiple.' },
  { text: 'The largest square tile that exactly fills a {a} cm by {b} cm rectangle.',
    want: 'gcf',
    why: 'The tile has to fit whole along both sides, so its side divides both. Largest such tile '
      + 'is the greatest common factor.' },
  { text: 'Buns come in packs of {a} and sausages in packs of {b}. Fewest packs to have equal numbers?',
    want: 'lcm',
    why: 'You need a total both pack sizes can reach exactly, which is at least as many as either. '
      + 'The smallest one is the lowest common multiple.' },
  { text: '{a} red counters and {b} blue ones, in rows of equal length, no row mixing colors. '
      + 'How long can a row be?',
    want: 'gcf',
    why: 'The row length has to divide both colors exactly, so it fits inside both. '
      + 'The longest one that does is the greatest common factor.' },
  { text: 'Two buses set off together, then run every {a} and every {b} minutes. Next time together?',
    want: 'lcm',
    why: 'Both buses must have run whole numbers of trips, so the time is one both counts reach. '
      + 'The first is the lowest common multiple.' },
  { text: 'Adding {aths} and {bths} — what should the denominator become?',
    want: 'lcm',
    why: 'Both fractions have to be rewritten into pieces of the same size, and a denominator both '
      + 'can reach is a common multiple. The smallest is the lowest common multiple.' },
  { text: 'Putting {a}/{b} into lowest terms — what do you divide by?',
    want: 'gcf',
    why: 'Dividing top and bottom needs a number that goes into both, and doing it in one move '
      + 'needs the biggest such number: the greatest common factor.' },
];

function gcfOrLcm(rng) {
  const { x, y } = pairSharing(rng);
  const situation = rng.pick(SITUATIONS);
  const fill = (t) => t
    .replace(/\{aths\}/g, nths(x)).replace(/\{bths\}/g, nths(y))
    .replace(/\{a\}/g, String(x)).replace(/\{b\}/g, String(y));
  return {
    prompt: [T.prose(fill(situation.text))],
    text: fill(situation.text),
    answer: {
      type: 'choice',
      value: situation.want,
      options: rng.shuffle([
        { id: 'gcf', label: 'Greatest common factor', note: 'the answer fits inside both' },
        { id: 'lcm', label: 'Lowest common multiple', note: 'the answer is reached by both' },
      ]),
    },
    visual: null,
    explain: fill(situation.why),
  };
}

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  const build = (lv) => {
    switch (lv) {
      case 0: return factorPair(rng);
      case 1: return smallestPrimeFactor(rng);
      case 2: return primeFactorisation(rng);
      case 3: return greatestCommonFactor(rng);
      case 4: return lowestCommonMultiple(rng);
      case 5: return gcfOrLcm(rng);
      default: return rng.pick([factorPair, smallestPrimeFactor, primeFactorisation,
                                greatestCommonFactor, lowestCommonMultiple])(rng);
    }
  };
  const p = build(level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 2) : level);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
