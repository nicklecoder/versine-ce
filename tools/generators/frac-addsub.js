/**
 * Catalogue authoring tool: builds the problem library for frac-addsub.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding -- when a
 * systematic fault affects too many rows to correct by hand, or when a level
 * is redesigned. Individual bad problems are fixed in the library directly.
 *
 * Run via: node scripts/build-library.mjs
 */
import { frac, reduce, combine, isSimplest, format, gcd, nths } from '../../web/math/frac.js';
import { LEVELS, LAST_LEVEL, PAR_SECONDS } from '../../web/skills/frac-addsub.js';
import * as T from '../terms.js';
/**
 * A numerator that leaves the fraction already in lowest terms — given
 * fractions should look like the ones in a book, not like 2/8.
 */
function coprimeNumerator(rng, d, max) {
  const options = [];
  for (let n = 1; n <= Math.min(max, d - 1); n++) if (gcd(n, d) === 1) options.push(n);
  return options.length ? rng.pick(options) : 1;
}
/**
 * Denominator pairs whose lowest common denominator stays drawable.
 *
 * Built rather than listed. A hand-written list of six pairs looks like plenty
 * until you count what survives the "sum stays under one" filter: with 2 and 3
 * there is exactly one valid problem. A student then meets the same dozen sums
 * every session and recalls them instead of finding a common denominator,
 * which is the opposite of what the level is for.
 *
 * @param {number} maxLcd  keep the bar model readable on a phone
 * @param {boolean} nested true for pairs where one denominator divides the
 *                         other, so only one side has to change
 */
function denominatorPairs(maxLcd, nested) {
  const pairs = [];
  for (let a = 2; a <= 12; a++) {
    for (let b = a + 1; b <= 12; b++) {
      const divides = b % a === 0;
      if (divides !== nested) continue;
      if ((a * b) / gcd(a, b) <= maxLcd) pairs.push([a, b]);
    }
  }
  return pairs;
}
const UNLIKE = denominatorPairs(36, false);
const NESTED = denominatorPairs(36, true);
/**
 * Denominator pairs, capped so the lowest common denominator stays readable.
 */
function draw(rng, level) {
  switch (level) {
    case 0: {                                    // same denominator
      const d = rng.pick([3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 16, 18, 20]);
      const n1 = rng.int(1, d - 1);
      const n2 = rng.int(1, d - n1);             // keep the sum at or below 1
      return { a: frac(n1, d), b: frac(n2, d), op: '+' };
    }
    case 1: {                                    // one denominator divides the other
      const [small, big] = rng.pick(NESTED);
      const a = frac(coprimeNumerator(rng, small, small - 1), small);
      const b = frac(coprimeNumerator(rng, big, big - 1), big);
      return rng.chance(0.5) ? { a, b, op: '+' } : { a: b, b: a, op: '+' };
    }
    case 2: {                                    // genuinely unlike
      // Numerators run the full coprime range; the caller rejects any sum that
      // lands at or above one, which is a far less blunt filter than capping
      // the numerator at half the denominator was.
      const [d1, d2] = rng.pick(UNLIKE);
      return {
        a: frac(coprimeNumerator(rng, d1, d1 - 1), d1),
        b: frac(coprimeNumerator(rng, d2, d2 - 1), d2),
        op: '+',
      };
    }
    default: {                                   // subtraction, larger minus smaller
      const [d1, d2] = rng.pick(rng.chance(0.75) ? UNLIKE : NESTED);
      let a = frac(coprimeNumerator(rng, d1, d1 - 1), d1);
      let b = frac(coprimeNumerator(rng, d2, d2 - 1), d2);
      if (a.n / a.d < b.n / b.d) [a, b] = [b, a];
      return { a, b, op: '-' };
    }
  }
}
/** Level indices `build` does not handle, because they are not sums. */
const COMPARE = 3;
const COMPARE_BARE = 4;
const CROSSING = 6;

/**
 * Which of two fractions is bigger.
 *
 * Weighted toward the trap, the way the decimal comparison is: most rows have
 * the fraction with the bigger numbers on the smaller side, so "more pieces"
 * and "more" come apart. 3/8 against 1/3 is the shape -- eight is the biggest
 * number on screen and 3/8 is the bigger fraction, but 5/12 against 1/2 has
 * twelve on the losing side.
 *
 * The two buttons are offered in the order the question names them, and are
 * deliberately not shuffled: the draw already puts the bigger fraction first
 * half the time, so shuffling bought no unpredictability and cost the one
 * thing that has to hold -- that the picture, the sentence and the buttons
 * all say "this one or that one" in the same order. They did not, and a
 * student reading the bars left to right was picking the wrong button.
 *
 * @param {boolean} hold  draw no bars until the answer is committed
 */
function compare(rng, hold) {
  const [d1, d2] = rng.pick(rng.chance(0.75) ? UNLIKE : NESTED);
  const a = frac(coprimeNumerator(rng, d1, d1 - 1), d1);
  const b = frac(coprimeNumerator(rng, d2, d2 - 1), d2);
  // Equal fractions have no answer, and the level is not about spotting them.
  if (a.n * b.d === b.n * a.d) return compare(rng);
  const common = (a.d * b.d) / gcd(a.d, b.d);
  const left = frac(a.n * (common / a.d), common);
  const right = frac(b.n * (common / b.d), common);
  const bigger = left.n > right.n ? a : b;

  return {
    prompt: [T.prose(`Which is bigger, ${format(a)} or ${format(b)}?`)],
    text: `bigger: ${format(a)} or ${format(b)}`,
    answer: {
      type: 'choice',
      value: format(bigger),
      options: [a, b].map((f) => ({ id: format(f), label: format(f) })),
    },
    visual: { kind: 'comparemodel', a, b, common, left, right, ...(hold ? { hold } : {}) },
    explain: `Rewrite both in ${nths(common)}: ${format(a)} is ${format(left)} and `
      + `${format(b)} is ${format(right)}. Now the pieces are the same size, so it is `
      + `only a question of how many — ${format(bigger)} is bigger. `
      + 'A bigger denominator means smaller pieces, not a smaller fraction.',
  };
}

/**
 * Taking away more than there was.
 *
 * No bar model: the bar draws a single whole cut into pieces, and there is no
 * honest way to shade minus three twelfths of it. The working is written out
 * instead, which is also the form the answer wants -- once both are in
 * twelfths the sign question is 4 − 9 and nothing more, and naming it as such
 * is the point of the level.
 */
function crossingZero(rng) {
  const [d1, d2] = rng.pick(rng.chance(0.75) ? UNLIKE : NESTED);
  const a = frac(coprimeNumerator(rng, d1, d1 - 1), d1);
  const b = frac(coprimeNumerator(rng, d2, d2 - 1), d2);
  // The first must be the smaller, so the subtraction runs past zero.
  if (a.n * b.d >= b.n * a.d) return crossingZero(rng);
  const common = (a.d * b.d) / gcd(a.d, b.d);
  const left = a.n * (common / a.d);
  const right = b.n * (common / b.d);
  const value = reduce(frac(left - right, common));

  return {
    prompt: T.asks(T.frac(a.n, a.d, 1), T.op('−'), T.frac(b.n, b.d, 2)),
    text: `${format(a)} − ${format(b)}`,
    answer: { type: 'frac', value, requireSimplest: true },
    visual: {
      kind: 'evalmodel',
      lines: [`${format(a)} − ${format(b)}`,
              `${left}/${common} − ${right}/${common}`,
              `${left} − ${right} = ${left - right}`,
              format(value)],
      rules: [`rewrite both in ${nths(common)}`, 'now it is a subtraction of whole numbers',
              'in lowest terms'],
      hint: 'Which is bigger — and what happens if you take it off the other?',
    },
    explain: `In ${nths(common)} this is ${left} − ${right}, and ${right} is more than `
      + `${left}, so the answer is below zero: ${format(value)}. Taking away more than `
      + 'you had is a negative, and a fraction is no different from a whole number '
      + 'about that.',
  };
}

function build(rng, level, requireSimplest) {
  let a, b, op, work;
  for (let i = 0; i < 40; i++) {
    ({ a, b, op } = draw(rng, level));
    work = combine(a, b, op);
    // A result *above* one still has no picture here: the bar model draws a
    // single whole, and two wholes stacked would each flex to the full width
    // and show a lie. Improper sums belong to the mixed-number skill.
    //
    // Exactly one and exactly zero do have pictures, though -- a result bar
    // filled to the end, and an empty one -- and they were being thrown away
    // with the improper ones for no reason beyond sharing a comparison.
    // 1/4 + 3/4 making a whole is one of the shapes a student meets most.
    //
    // It only ever turns up on the same-denominator level, and that is a fact
    // rather than an oversight: if two fractions in lowest terms sum to one
    // then each is the other's complement, which forces the denominators to
    // match. Nothing to fix here, so nobody should try.
    if (work.result.n >= 0 && work.result.n <= work.result.d) break;
  }
  const expected = requireSimplest ? reduce(work.result) : work.result;
  const opSign = op === '-' ? '−' : '+';
  return {
    prompt: T.asks(T.frac(a.n, a.d, 1), T.op(opSign), T.frac(b.n, b.d, 2)),
    text: `${format(a)} ${opSign} ${format(b)}`,
    answer: { type: 'frac', value: expected, requireSimplest },
    parSeconds: PAR_SECONDS[level],
    visual: {
      kind: 'barmodel',
      a, b, op: opSign,
      common: work.common,
      left: work.left, right: work.right,
      result: work.result,
    },
    explain: explain(a, b, opSign, work, requireSimplest),
  };
}
function explain(a, b, opSign, work, requireSimplest) {
  const simplified = reduce(work.result);
  const tail = requireSimplest && !isSimplest(work.result)
    ? ` Then ${format(work.result)} simplifies to ${format(simplified)}.`
    : '';
  if (a.d === b.d) {
    return `The pieces already match, so add the numerators and keep the `
      + `denominator: ${format(work.result)}.${tail}`;
  }
  return `${a.d} and ${b.d} both divide into ${work.common}, so rewrite both in `
    + `${nths(work.common)}: ${format(work.left)} and ${format(work.right)}. `
    + `Now the pieces match, so combine them: ${format(work.result)}.${tail}`;
}
/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */

  /** @param {import('../engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  const at = level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level;
  // In the mixed review the comparison always comes without its bars,
  // whichever of the two levels the draw landed on: the scaffolding has been
  // taken away by then, and the two forms share their `text` anyway, so
  // letting both in would keep whichever happened to be drawn first.
  const bare = at === COMPARE_BARE || level >= LAST_LEVEL;
  const problem = at === COMPARE || at === COMPARE_BARE ? compare(rng, bare)
    : at === CROSSING ? crossingZero(rng)
    : build(rng, at, level >= LAST_LEVEL || !!LEVELS[level].requireSimplest);
  problem.parSeconds = PAR_SECONDS[level];
  return problem;
}
