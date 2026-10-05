/**
 * Catalogue authoring tool: builds the problem library for frac-muldiv.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding -- when a
 * systematic fault affects too many rows to correct by hand, or when a level
 * is redesigned. Individual bad problems are fixed in the library directly.
 *
 * Run via: node scripts/build-library.mjs
 */
import { frac, reduce, multiply, divide, isSimplest, format, lcm, gcd, nths } from '../../web/math/frac.js';
import { LEVELS, LAST_LEVEL, PAR_SECONDS } from '../../web/skills/frac-muldiv.js';
import * as T from '../terms.js';

/**
 * The most segments a fits picture may draw. Matches the ceiling declared in
 * the visual's schema (web/ui/visuals.js), which is what catches it if this
 * ever drifts.
 */
const MAX_FINE = 40;
/** A numerator leaving the fraction in lowest terms, as a book would print it. */
function coprimeNumerator(rng, d, max) {
  const options = [];
  for (let n = 1; n <= Math.min(max, d - 1); n++) if (gcd(n, d) === 1) options.push(n);
  return options.length ? rng.pick(options) : 1;
}
function draw(rng, level) {
  switch (level) {
    case 0: {                                   // unit fraction × unit fraction
      const d1 = rng.int(2, 12);
      const d2 = rng.int(2, 12);
      return { a: frac(1, d1), b: frac(1, d2), op: '×' };
    }
    case 1: {                                   // any two proper fractions
      const d1 = rng.int(2, 12);
      const d2 = rng.int(2, 12);
      return {
        a: frac(coprimeNumerator(rng, d1, d1 - 1), d1),
        b: frac(coprimeNumerator(rng, d2, d2 - 1), d2),
        op: '×',
      };
    }
    case 3: {
      // "How many eighths fit into three quarters?" A unit-fraction divisor
      // keeps the count whole and the question speakable. The dividend is
      // reduced for display; the picture works from the common denominator
      // either way.
      const k = rng.pick([4, 6, 8, 9, 10, 12, 14, 15, 16, 18, 20]);
      const copies = rng.int(2, Math.min(9, k - 1));
      return { a: reduce(frac(copies, k)), b: frac(1, k), op: '÷' };
    }
    default: {                                  // general division
      const d1 = rng.int(2, 12);
      const d2 = rng.int(2, 12);
      return {
        a: frac(coprimeNumerator(rng, d1, d1 - 1), d1),
        b: frac(coprimeNumerator(rng, d2, d2 - 1), d2),
        op: '÷',
      };
    }
  }
}
/** The index of A Fraction of a Quantity, which `build` does not handle. */
const QUANTITY = 2;

/**
 * A fraction of a quantity: 3/8 of 24.
 *
 * Built outwards from what one part is worth, so the answer is always whole.
 * Not out of gentleness -- the widget follows the answer's type, so a level
 * mixing whole answers with fractional ones would swap between one box and
 * two exactly when the answer is a fraction, and a student would read the
 * kind of answer off the keyboard before working it out.
 *
 * The explain gives both routes on purpose. Dividing by the bottom and
 * multiplying by the top is how it is done; n/d × whole/1 is why that works,
 * and it is the sentence that makes this the same operation as the ratio
 * share and the percentage rather than a third procedure.
 */
function quantity(rng) {
  const d = rng.pick([2, 3, 4, 5, 6, 8, 10, 12]);
  const n = coprimeNumerator(rng, d, d - 1);
  const each = rng.int(2, 15);
  const whole = d * each;
  const value = n * each;

  return {
    prompt: T.asks(T.frac(n, d, 1), T.op('×'), T.num(whole, 2)),
    text: `${n}/${d} × ${whole}`,
    answer: { type: 'int', value },
    visual: { kind: 'quantitymodel', n, d, whole, each, value },
    explain: `Cut ${whole} into ${d} equal parts: ${whole} ÷ ${d} = ${each} in each. `
      + `${n} of them is ${n} × ${each} = ${value}. `
      + `It is the same rule as always -- ${whole} is ${whole}/1, so ${n}/${d} × ${whole}/1 `
      + `is ${n * whole}/${d}, which is ${value}.`,
  };
}

function build(rng, level, requireSimplest) {
  let a, b, op, raw;
  for (let i = 0; i < 40; i++) {
    ({ a, b, op } = draw(rng, level));
    raw = op === '×' ? multiply(a, b) : divide(a, b);
    // Reject the trivial: an answer of exactly one, or a divisor equal to the
    // dividend. Also keep quotients sane so the picture stays drawable.
    //
    // The fits picture lays the dividend out in the finest units the two
    // fractions share, so lcm(a.d, b.d) is literally how many segments get
    // drawn. Past about forty they are a smear on a phone, and twelfths
    // against elevenths would ask for 132 of them.
    const drawable = op === '×' || lcm(a.d, b.d) <= MAX_FINE;
    if (raw.n !== raw.d && raw.n / raw.d <= 8 && drawable) break;
  }
  // Multiplying, the unreduced product IS the taught step: 2/3 × 3/4 = 6/12
  // shows the mechanism. Dividing, it is just noise -- nobody wants "how many
  // quarters fit into three quarters" answered as 12/4 -- so division always
  // presents the tidy value. Equivalent answers stay acceptable either way,
  // because the frac type compares by cross-multiplication.
  const tidy = op === '÷' || requireSimplest;
  const expected = tidy ? reduce(raw) : raw;
  const opSign = op;
  return {
    prompt: T.asks(T.frac(a.n, a.d, 1), T.op(opSign), T.frac(b.n, b.d, 2)),
    text: `${format(a)} ${opSign} ${format(b)}`,
    answer: { type: 'frac', value: expected, requireSimplest },
    parSeconds: PAR_SECONDS[level],
    visual: op === '×'
      ? { kind: 'areamodel', a, b, product: raw }
      : { kind: 'fitsmodel', a, b, quotient: reduce(raw), fine: lcm(a.d, b.d) },
    explain: explain(a, b, op, raw, requireSimplest, level),
  };
}
/** The index of How Many Fit, whose division is explained by counting. */
const HOW_MANY_FIT = 3;

function explain(a, b, op, raw, requireSimplest, level) {
  const simplified = reduce(raw);
  const tail = requireSimplest && !isSimplest(raw)
    ? ` Then ${format(raw)} simplifies to ${format(simplified)}.`
    : '';
  if (op === '×') {
    return `Multiply straight across: ${a.n} × ${b.n} = ${raw.n} on top, `
      + `${a.d} × ${b.d} = ${raw.d} underneath, giving ${format(raw)}.${tail}`;
  }
  // requiem: catalogue/content/division-counts-before-flipping
  if (level === HOW_MANY_FIT) return countCopies(a, b, simplified);
  // Past How Many Fit the divisor can be anything, and counting copies stops
  // being something you can do in your head -- so this is where the flip
  // arrives, as the shortcut for the count rather than a rule on its own.
  const flipped = frac(b.d, b.n);
  const product = frac(a.n * flipped.n, a.d * flipped.d);
  const ending = isSimplest(product)
    ? `${format(product)}.`
    : `${format(product)}, which simplifies to ${format(simplified)}.`;
  return `Flip the second fraction and multiply: dividing by ${format(b)} is the same as `
    + `multiplying by ${format(flipped)}. So ${format(a)} × ${format(flipped)} = ${ending}`;
}

/**
 * How Many Fit is explained the way the picture works: say the dividend in
 * the divisor's pieces and count them. Saying "flip and multiply" here would
 * teach the shortcut before the idea it is a shortcut for.
 */
function countCopies(a, b, quotient) {
  const copies = quotient.n;
  const restated = a.d === b.d
    ? `${format(a)} is`
    : `In ${nths(b.d)}, ${format(a)} is ${copies}/${b.d}, which is`;
  return `How many ${format(b)}s fit into ${format(a)}? ${restated} ${copies} copies of ${format(b)}. `
    + `So ${copies} fit: ${format(a)} ÷ ${format(b)} = ${copies}.`;
}
/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */

  /** @param {import('../engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  const at = level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level;
  const problem = at === QUANTITY
    ? quantity(rng)
    : build(rng, at, level >= LAST_LEVEL || !!LEVELS[level].requireSimplest);
  problem.parSeconds = PAR_SECONDS[level];
  return problem;
}
