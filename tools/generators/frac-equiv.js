/**
 * Catalogue authoring tool: builds the problem library for frac-equiv.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding -- when a
 * systematic fault affects too many rows to correct by hand, or when a level
 * is redesigned. Individual bad problems are fixed in the library directly.
 *
 * Run via: node scripts/build-library.mjs
 */
import { frac, reduce, gcd, format } from '../../web/math/frac.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/frac-equiv.js';
import * as T from '../terms.js';
/** Base fractions already in lowest terms, small enough to draw. */
function baseFraction(rng, choices = [2, 3, 4, 5, 6, 7, 8, 9, 10, 12]) {
  const d = rng.pick(choices);
  const options = [];
  for (let n = 1; n < d; n++) if (gcd(n, d) === 1) options.push(n);
  return frac(rng.pick(options), d);
}
/**
 * The bigger denominator has to stay drawable: past about thirty segments a
 * bar is a smear. Pick a multiplier that keeps it inside that.
 *
 * This cap is the whole reason this skill's levels are small -- every problem
 * has to fit in one bar. Raising it trades legibility on a phone for variety;
 * thirty is about where a segment is still wide enough to see on a narrow
 * screen.
 */
const MAX_SEGMENTS = 40;
function multiplier(rng, baseD, candidates) {
  const fits = candidates.filter((k) => baseD * k <= MAX_SEGMENTS);
  return fits.length ? rng.pick(fits) : 2;
}
// A null numerator or denominator renders as the blank the student fills in.
/** base = ?/big  — find the numerator */
function buildUp(rng) {
  const base = baseFraction(rng);
  const k = multiplier(rng, base.d, [2, 3, 4, 5]);
  const big = frac(base.n * k, base.d * k);
  return {
    prompt: [T.frac(base.n, base.d, 1), T.op('='), T.frac(null, big.d, 2)],
    text: `${format(base)} = ?/${big.d}`,
    answer: { type: 'int', value: big.n },
    visual: { kind: 'equivmodel', from: base, to: big, reveal: 'to' },
    explain: `${base.d} × ${k} = ${big.d}, so multiply the top by ${k} too: `
      + `${base.n} × ${k} = ${big.n}. That gives ${format(big)}.`,
  };
}
/** base = big/?  — find the denominator */
function whichBottom(rng) {
  const base = baseFraction(rng);
  const k = multiplier(rng, base.d, [2, 3, 4, 5]);
  const big = frac(base.n * k, base.d * k);
  return {
    prompt: [T.frac(base.n, base.d, 1), T.op('='), T.frac(big.n, null, 2)],
    text: `${format(base)} = ${big.n}/?`,
    answer: { type: 'int', value: big.d },
    visual: { kind: 'equivmodel', from: base, to: big, reveal: 'to' },
    explain: `${base.n} × ${k} = ${big.n}, so multiply the bottom by ${k} too: `
      + `${base.d} × ${k} = ${big.d}. That gives ${format(big)}.`,
  };
}
/**
 * Simplify. `steps` controls how far it is from lowest terms: one factor for
 * "Cut It Down", a composite factor for "All the Way Down" so that stopping
 * early leaves a fraction that still reduces.
 */
function cutDown(rng, composite) {
  // A composite factor needs room: with a base of sixths, even ×4 blows past
  // the segment cap and the fallback would quietly hand back a prime factor,
  // which is the one thing this level is not about.
  const base = baseFraction(rng, composite ? [2, 3, 4, 5, 6, 7] : [2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const k = composite
    ? multiplier(rng, base.d, [4, 6, 8, 9, 10, 12, 14, 15, 16, 18, 20])
    : multiplier(rng, base.d, [2, 3, 5, 7, 11]);
  const big = frac(base.n * k, base.d * k);
  // All the Way Down says to keep going until nothing divides both, so its
  // explanation does that, a prime at a time, and then names the one-step
  // route. Dividing by the GCF at once, as it used to, skipped the very
  // process the level is named for.
  const primes = [];
  for (let m = k, p = 2; m > 1; p++) while (m % p === 0) { primes.push(p); m /= p; }
  let at = big;
  const chain = primes.map((p) => {
    at = frac(at.n / p, at.d / p);
    return `÷ ${p} gives ${format(at)}`;
  });
  return {
    // The question says what it wants: "10/12 = ?" alone has 10/12 as a
    // true answer, which the level refuses.
    prompt: [T.prose('In lowest terms:'), ...T.asks(T.frac(big.n, big.d, 1))],
    text: `${format(big)} in lowest terms`,
    answer: { type: 'frac', value: base, requireSimplest: true },
    visual: { kind: 'equivmodel', from: big, to: base, reveal: 'to' },
    explain: composite
      ? `Divide top and bottom by anything they share, and keep going: ${format(big)} `
        + `${chain.join(', then ')}. Only 1 divides both ${base.n} and ${base.d}, so stop at `
        + `${format(base)}. Dividing by ${k}, the greatest common factor, does it in one step.`
      : `${k} divides both ${big.n} and ${big.d}. `
        + `${big.n} ÷ ${k} = ${base.n} and ${big.d} ÷ ${k} = ${base.d}, so ${format(base)}.`,
  };
}
/**
 * The equivalence read backwards, with either part missing.
 *
 * Either part, and not for variety. Building up asks for a numerator and
 * Which Bottom? asks for a denominator, so the growing direction is balanced
 * across two levels; shrinking had only this one, and it always asked for the
 * bottom. A student could therefore finish the skill having never once been
 * asked for a numerator with the answer getting smaller.
 */
function missingPiece(rng) {
  const base = baseFraction(rng);
  const k = multiplier(rng, base.d, [2, 3, 4, 5]);
  const big = frac(base.n * k, base.d * k);
  const askTop = rng.chance(0.5);
  return {
    prompt: askTop
      ? [T.frac(big.n, big.d, 1), T.op('='), T.frac(null, base.d, 2)]
      : [T.frac(big.n, big.d, 1), T.op('='), T.frac(base.n, null, 2)],
    text: askTop ? `${format(big)} = ?/${base.d}` : `${format(big)} = ${base.n}/?`,
    answer: { type: 'int', value: askTop ? base.n : base.d },
    visual: { kind: 'equivmodel', from: big, to: base, reveal: 'to' },
    explain: askTop
      ? `${big.d} ÷ ${base.d} = ${k}, so divide the top by ${k} as well: `
        + `${big.n} ÷ ${k} = ${base.n}.`
      : `${big.n} ÷ ${base.n} = ${k}, so divide the bottom by ${k} as well: `
        + `${big.d} ÷ ${k} = ${base.d}.`,
  };
}

/**
 * Two multipliers of the same base fraction, neither a whole number of times
 * the other.
 *
 * This is what makes 4/6 = ?/9 a different question from 2/3 = ?/12. There is
 * no number to multiply 6 by to get 9, so the habit every earlier level
 * rewards -- look at the two bottoms, spot the factor -- returns nothing, and
 * the only way through is the equivalence itself.
 */
function awkwardPair(rng, baseD) {
  const fits = [];
  for (let j = 2; j <= 6; j++) {
    for (let k = 2; k <= 6; k++) {
      if (j === k || j % k === 0 || k % j === 0) continue;
      if (baseD * Math.max(j, k) <= MAX_SEGMENTS) fits.push([j, k]);
    }
  }
  return fits.length ? rng.pick(fits) : null;
}

/** from = ?/to.d, where the route runs down to lowest terms and back up. */
function throughSimplest(rng) {
  let base, pair;
  do {
    base = baseFraction(rng, [2, 3, 4, 5, 6, 7]);
    pair = awkwardPair(rng, base.d);
  } while (!pair);
  const [j, k] = pair;
  const from = frac(base.n * j, base.d * j);
  const to = frac(base.n * k, base.d * k);

  return {
    prompt: [T.frac(from.n, from.d, 1), T.op('='), T.frac(null, to.d, 2)],
    text: `${format(from)} = ?/${to.d}`,
    answer: { type: 'int', value: to.n },
    visual: { kind: 'equivmodel', from, to, via: base, reveal: 'to' },
    explain: `Nothing whole multiplies ${from.d} into ${to.d}, so go through lowest terms. `
      + `${format(from)} divides by ${j} to ${format(base)}, and ${base.d} × ${k} = ${to.d}, `
      + `so the top is ${base.n} × ${k} = ${to.n}.`,
  };
}

/**
 * The judgement: does one bottom divide the other, or not?
 *
 * Multiplying top and bottom is faster and is what a confident student
 * reaches for, and it works exactly when the target bottom is a whole number
 * of times the one in hand. When it is not, there is no whole number to reach
 * for, and the way through is lowest terms. The discriminator is a
 * divisibility question, which is why this level leans on factor pairs.
 *
 * Both answers must be reachable from a fraction that is *not* in lowest
 * terms, and that is the whole design of this maker. The first version scaled
 * only from a base already in lowest terms, so every "scale" row was reduced
 * and every "simplify" row was not -- and a student would have learned to
 * read the left-hand fraction instead of comparing the two bottoms. That is a
 * rule that gets 4/6 = ?/12 wrong, which wants scaling by 2 and no
 * simplifying at all. Here 4/6 appears with both answers, and only the target
 * bottom tells them apart.
 */
function straightUpOrSimplify(rng) {
  const base = baseFraction(rng, [2, 3, 4, 5, 6, 7]);
  const clean = rng.chance(0.5);
  let from, toD;
  if (clean) {
    // j = 1 leaves the fraction in lowest terms; j > 1 does not, and the
    // answer is "scale" either way, because the bottom still divides. The
    // range runs as wide as the segment cap allows so that the two answers
    // come out near enough even in number -- a level where one of two
    // buttons is right 60% of the time rewards pressing it.
    const j = rng.pick([1, 2, 3, 4, 5]);
    from = frac(base.n * j, base.d * j);
    if (from.d * 2 > MAX_SEGMENTS) return straightUpOrSimplify(rng);
    toD = from.d * multiplier(rng, from.d, [2, 3, 4, 5, 6, 7, 8]);
  } else {
    const pair = awkwardPair(rng, base.d);
    if (!pair) return straightUpOrSimplify(rng);
    from = frac(base.n * pair[0], base.d * pair[0]);
    toD = base.d * pair[1];
  }

  return {
    prompt: [T.frac(from.n, from.d, 1), T.op('='), T.frac(null, toD, 2)],
    text: `${format(from)} = ?/${toD}, which way in`,
    answer: {
      type: 'choice',
      value: clean ? 'scale' : 'simplify',
      // The notes describe the two methods and say nothing about this
      // problem. Naming the numbers here -- "6 goes into 12 a whole number of
      // times" against "nothing whole takes 6 to 12" -- would put both the
      // claim and its negation on screen, and the option carrying the true
      // one is the answer. The judgement has to be made about the fractions,
      // not read off the buttons.
      options: rng.shuffle([
        { id: 'scale', label: 'Multiply top and bottom straight away',
          note: 'one step, when the bottom divides into the new one' },
        { id: 'simplify', label: 'Simplify first, then multiply up',
          note: 'down to lowest terms, then out again' },
      ]),
    },
    visual: null,
    explain: clean
      ? `${from.d} × ${toD / from.d} = ${toD}, so multiply the top by ${toD / from.d} too. `
        + `Simplifying first would be an extra step for nothing.`
      : `No whole number takes ${from.d} to ${toD}. But ${format(from)} is ${format(base)}, `
        + `and ${base.d} does go into ${toD} — so lowest terms is the way in.`,
  };
}
const MAKERS = [buildUp, whichBottom, (r) => cutDown(r, false), (r) => cutDown(r, true),
  missingPiece, throughSimplest, straightUpOrSimplify];
function build(rng, level) {
  const p = MAKERS[level](rng);
  return { ...p, parSeconds: PAR_SECONDS[level] };
}
/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */

  /** @param {import('../engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  if (level >= LAST_LEVEL) {
    // LAST_LEVEL - 2 rather than - 1: the strategy level sits immediately
    // before this one and is deliberately left out. Its answer is a choice,
    // so dealing it here would swap the widget mid-run.
    const from = rng.int(0, LAST_LEVEL - 2);
    const problem = build(rng, from);
    problem.parSeconds = PAR_SECONDS[LAST_LEVEL];
    return problem;
  }
  return build(rng, level);
}
