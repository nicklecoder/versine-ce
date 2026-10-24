/**
 * Catalogue authoring tool: builds the problem library for frac-signed.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 */
import { frac, reduce, multiply, divide, combine, format, gcd, nths } from '../../web/math/frac.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/frac-signed.js';
import * as T from '../terms.js';

/** A numerator leaving the fraction in lowest terms, as a book would print it. */
function coprimeNumerator(rng, d) {
  const options = [];
  for (let n = 1; n < d; n++) if (gcd(n, d) === 1) options.push(n);
  return rng.pick(options);
}

/** A proper fraction in lowest terms, with the sign asked for. */
function pick(rng, sign) {
  const d = rng.int(2, 12);
  return frac(coprimeNumerator(rng, d) * sign, d);
}

/** The magnitude, as the size row wants to print it. */
const size = (f) => format(frac(Math.abs(f.n), f.d));
const sign = (f) => (f.n < 0 ? '−' : '+');
const show = (f) => format(f).replace(/-/g, '−');
/** A negative after an operator is bracketed: "× (−5/7)", never "× −5/7". */
const after = (f) => (f.n < 0 ? `(${format(f)})` : format(f));
/**
 * Where lowest terms are demanded, the question says so. Only the level blurb
 * did, which is read once, and in the timed mixed level a correct −6/8 was
 * refused with nothing on screen to say why.
 */
const lowest = (terms) => [T.prose('In lowest terms:'), ...terms];
/** "−16/12, which simplifies to −4/3", or just the fraction when it is already there. */
const landing = (raw, value) => (raw.d === value.d ? show(value)
  : `${show(raw)}, which simplifies to ${show(value)}`);

/**
 * Where the minus lives.
 *
 * −3/4, 3/−4 and −(3/4) are the same number, and the standard way to write it
 * puts the sign in front. This is not pedantry about notation: a student who
 * reads the minus in 3/−4 as belonging to the denominator will treat
 * (−3)/(−4) as having a sign to cancel *and* a sign to keep, and get a
 * confident wrong answer twice.
 *
 * The rows that start with a negative denominator are the ones that carry
 * the level. A double negative simplifies away entirely, which is the same
 * fact as a negative divided by a negative, and saying so is the point.
 */
function whereTheMinus(rng) {
  const d = rng.int(2, 12);
  const k = rng.int(2, 6);                          // so there is something to simplify
  const base = coprimeNumerator(rng, d);
  if (base * k > 60 || d * k > 60) return whereTheMinus(rng);
  const shape = rng.int(0, 3);
  // 0: −n/d      1: n/−d      2: −n/−d      3: −(n/d), the form the blurb promises
  const n = shape === 1 || shape === 3 ? base * k : -base * k;
  const den = shape === 0 || shape === 3 ? d * k : -d * k;
  const value = reduce(shape === 3 ? frac(-n, den) : frac(n, den));
  const shown = shape === 3 ? `−(${n}/${den})` : `${n}/${den}`.replace(/-/g, '−');

  return {
    prompt: [T.prose(`Write ${shown} as a fraction in lowest terms.`)],
    text: shape === 3 ? `-(${n}/${den}) in lowest terms` : `${n}/${den} in lowest terms`,
    answer: { type: 'frac', value, requireSimplest: true },
    visual: {
      kind: 'evalmodel',
      lines: [shown,
              shape === 2 ? 'a negative over a negative, so it is positive'
                : 'one negative, so the whole fraction is negative',
              `${Math.abs(n)}/${Math.abs(den)}, sign in front`,
              format(value).replace(/-/g, '−')],
      rules: ['count the negatives',
              ['the minus is already in front',
               'a minus below the line means the same as one in front',
               'and the two cancel',
               'a minus outside the bracket is a minus in front'][shape],
              'then divide both by what they share'],
      hint: 'How many negatives are there, and where do they end up?',
    },
    // requiem: catalogue/content/explain-true-for-row
    // "−12/20 means the same as −12/20" was said of every row whose minus was
    // already in front. Each shape now says what is true of it.
    explain: [
      `One negative, and it is already in front where it belongs. `,
      `One negative, and it does not matter which line it is on — ${shown} means the `
        + `same as −${Math.abs(n)}/${Math.abs(den)}, because dividing by a negative and `
        + 'taking the negative of a division come to the same thing. ',
      `Two negatives: a negative divided by a negative is positive, so ${shown} is `
        + `${Math.abs(n)}/${Math.abs(den)}. `,
      `One negative, outside the bracket: the negative of ${n}/${den} is `
        + `−${n}/${den}, the same number with the minus written in front. `,
    ][shape]
      + `Then ${Math.abs(n)} and ${Math.abs(den)} share a factor of ${k}, `
      + `leaving ${format(value).replace(/-/g, '−')}.`,
  };
}

/**
 * Adding and subtracting, where at least one of the two is negative.
 *
 * The sign of the answer is a *comparison*, not a count. −3/4 + 1/2 is
 * negative because three quarters is more than a half; −1/4 + 1/2 is positive
 * with exactly as many negatives in it. A student who has learned "one
 * negative, so the answer is negative" from the multiplication levels and
 * applies it here gets half of them wrong, which is why these levels come
 * first and why the explain says which quantity won rather than how many
 * minus signs there were.
 *
 * Every shape a student can meet is drawn from: negative first, negative
 * second, both negative, and for subtraction the one that catches everyone --
 * taking away a negative, where the answer comes out bigger than what you
 * started with.
 *
 * No bar model. There is no honest way to shade minus three quarters of a
 * whole, and the working is the better picture anyway: once both are over a
 * common denominator the question is 4 + (−9) and nothing else, which is the
 * whole of what these levels have to say.
 */
/**
 * Why the answer came out with the sign it did.
 *
 * Three genuinely different situations, and saying the wrong one is worse
 * than saying nothing. Subtracting a negative is the headline case. Otherwise
 * the two amounts either push the same way, in which case they pile up and no
 * comparison is involved, or they push against each other, in which case the
 * bigger one decides -- and only then is "which is bigger" the right thing to
 * say. An earlier version said it every time, which made "−1/10 − 1/5 is
 * negative because 2 is more than 1" -- true numbers, wrong reason, and the
 * reason is the whole point of the level.
 */
function why(work, subtracting, b, common) {
  // What each side actually contributes, once the subtraction is folded in.
  const left = work.left.n;
  const right = subtracting ? -work.right.n : work.right.n;
  if (subtracting && b.n < 0) {
    return 'Taking away a negative adds: the answer comes out bigger than what you '
      + 'started with, which is the one that looks wrong and is not.';
  }
  if ((left < 0) === (right < 0)) {
    return `Both move the same way, so they pile up rather than cancel — the answer is `
      + 'further from zero than either of them.';
  }
  return 'They pull against each other, so the bigger one decides the sign, not the '
    + `number of minus signs: ${Math.abs(left)} against ${Math.abs(right)} `
    + `${nths(common)}.`;
}

function signedAddSub(rng, subtracting) {
  const shape = rng.int(0, 2);
  // 0: the first is negative   1: the second is   2: both are
  const a = pick(rng, shape === 1 ? 1 : -1);
  const b = pick(rng, shape === 0 ? 1 : -1);
  const work = combine(a, b, subtracting ? '-' : '+');
  const value = reduce(work.result);
  if (value.n === 0) return signedAddSub(rng, subtracting);
  const op = subtracting ? '−' : '+';
  const common = work.common;

  // A negative operand after an operator is bracketed, the way it is written
  // everywhere: "1/2 − (−3/4)", never "1/2 − −3/4".
  const second = b.n < 0
    ? T.group([T.frac(b.n, b.d, 2)], 2)
    : T.frac(b.n, b.d, 2);
  const bText = b.n < 0 ? `(${format(b)})` : format(b);
  const sum = `${work.left.n} ${op} ${work.right.n < 0 ? `(${work.right.n})` : work.right.n}`;

  return {
    prompt: lowest(T.asks(T.frac(a.n, a.d, 1), T.op(op), second)),
    text: `${format(a)} ${op} ${bText}`,
    answer: { type: 'frac', value, requireSimplest: true },
    visual: {
      kind: 'evalmodel',
      lines: [`${format(a)} ${op} ${bText}`.replace(/-/g, '−'),
              `${work.left.n}/${common} ${op} ${work.right.n < 0
                ? `(${work.right.n}/${common})` : `${work.right.n}/${common}`}`.replace(/-/g, '−'),
              `${sum} = ${work.result.n}`.replace(/-/g, '−'),
              format(value).replace(/-/g, '−')],
      rules: [`rewrite both in ${nths(common)}`,
              'now it is whole numbers with signs',
              'in lowest terms'],
      hint: 'Match the pieces first. The signs come along unchanged.',
    },
    explain: `In ${nths(common)} this is ${sum.replace(/-/g, '−')}, which is `
      + `${String(work.result.n).replace(/-/g, '−')}, `
      + `so ${landing(work.result, value)}. ${why(work, subtracting, b, common)}`,
  };
}

/**
 * Multiply or divide, with the sign kept as a separate question.
 *
 * `negatives` says how many of the two are negative, so the caller decides
 * which level this is rather than the draw doing it. The picture is
 * int-muldiv's sign-and-size model, unchanged: it prints whatever magnitudes
 * it is handed, and 2/3 × 3/4 is exactly as printable as 2 × 3.
 */
function signedOperation(rng, negatives, dividing) {
  // With one negative it may be either of the two, so the level is not "the
  // first one has the minus on it" four hundred times over -- which a student
  // would learn to read instead of counting.
  const firstNegative = negatives === 2 || (negatives === 1 && rng.chance(0.5));
  const a = pick(rng, firstNegative ? -1 : 1);
  const b = pick(rng, negatives === 2 || (negatives === 1 && !firstNegative) ? -1 : 1);
  const raw = dividing ? divide(a, b) : multiply(a, b);
  const value = reduce(raw);
  if (Math.abs(value.n) === value.d) return signedOperation(rng, negatives, dividing);
  const op = dividing ? '÷' : '×';

  return {
    prompt: lowest(T.asks(T.frac(a.n, a.d, 1), T.op(op), T.frac(b.n, b.d, 2))),
    text: `${format(a)} ${op} ${format(b)}`,
    answer: { type: 'frac', value, requireSimplest: true },
    visual: {
      kind: 'signmodel',
      terms: [{ sign: sign(a), abs: size(a) }, { sign: sign(b), abs: size(b) }],
      ops: [op],
      result: value,
    },
    explain: `Two questions. The sign: ${negatives === 2 ? 'two negatives, so positive'
      : 'one negative, so negative'}. The size: `
      + (dividing
        ? `${size(a)} ÷ ${size(b)} is ${size(a)} × ${format(frac(b.d, Math.abs(b.n)))} = `
          + `${size(value)}`
        : `${size(a)} × ${size(b)} = ${size(value)}`)
      + `. Put them together: ${show(value)}.`
      // Only where the divisor is negative is there a sign to carry across.
      + (dividing && b.n < 0
        ? ` Flipping ${show(b)} gives ${show(frac(-b.d, -b.n))}: the sign comes with it, since `
          + 'the reciprocal of a negative is negative.'
        : ''),
  };
}

/**
 * The sign, before any arithmetic at all.
 *
 * Knowable from counting negatives and nothing else, which is why it is worth
 * a level: a student who works out the size first and decides the sign at the
 * end is deciding it while tired, and a long calculation that ends in a coin
 * flip was wasted. Three terms, so counting is a real count rather than a
 * glance.
 */
function whatSign(rng) {
  // requiem: catalogue/strategy/no-surface-cue
  // Some rows add or subtract, where counting negatives gives the wrong sign
  // as often as the right one. With only × and ÷, "odd count means negative"
  // passed every row, and the blurb's warning about adding was never tested.
  if (rng.chance(0.35)) return signOfSum(rng);
  const count = rng.int(0, 3);
  const terms = [0, 1, 2].map((i) => pick(rng, i < count ? -1 : 1));
  const shuffled = rng.shuffle(terms);
  const ops = [rng.pick(['×', '÷']), rng.pick(['×', '÷'])];
  const src = `${format(shuffled[0])} ${ops[0]} ${after(shuffled[1])} `
    + `${ops[1]} ${after(shuffled[2])}`;
  const negative = count % 2 === 1;

  return {
    prompt: [T.prose(`Without working it out: will ${src.replace(/-/g, '−')} `
      + 'be positive or negative?')],
    text: `sign of ${src}`,
    answer: {
      type: 'choice',
      value: negative ? 'negative' : 'positive',
      options: signOptions(rng),
    },
    visual: null,
    explain: `There ${count === 1 ? 'is 1 negative' : `are ${count} negatives`}, and `
      + `${count} is ${negative ? 'odd' : 'even'}, so the answer is `
      + `${negative ? 'negative' : 'positive'}. Negatives cancel in pairs, and dividing `
      + 'behaves exactly as multiplying does about this — so the count is all you need, '
      + 'and you have it before doing any of the arithmetic. '
      + 'Only for × and ÷, though: −3/4 + 1/2 has one negative and so does −1/4 + 1/2, '
      + 'and they come out with different signs. Adding is decided by which is bigger.',
  };
}

/** The notes say what each answer means, not how a count would get there. */
const signOptions = (rng) => rng.shuffle([
  { id: 'positive', label: 'Positive', note: 'above zero' },
  { id: 'negative', label: 'Negative', note: 'below zero' },
]);

/**
 * a + b or a − b with a negative in it: the sign is whichever side is bigger,
 * so a count of minus signs is no guide. Drawn so the count misleads about
 * half the time.
 */
function signOfSum(rng) {
  const subtracting = rng.chance(0.4);
  const a = pick(rng, rng.chance(0.5) ? -1 : 1);
  const b = pick(rng, a.n > 0 || rng.chance(0.5) ? -1 : 1);
  const work = combine(a, b, subtracting ? '-' : '+');
  if (work.result.n === 0) return signOfSum(rng);
  const negatives = [a, b].filter((f) => f.n < 0).length;
  const negative = work.result.n < 0;
  // Keep a row the count gets wrong more often than one it gets right.
  if ((negatives % 2 === 1) === negative && rng.chance(0.4)) return signOfSum(rng);
  const op = subtracting ? '−' : '+';
  const src = `${format(a)} ${op} ${after(b)}`;
  const right = subtracting ? -work.right.n : work.right.n;
  return {
    prompt: [T.prose(`Without working it out: will ${src.replace(/-/g, '−')} `
      + 'be positive or negative?')],
    text: `sign of ${src}`,
    answer: { type: 'choice', value: negative ? 'negative' : 'positive', options: signOptions(rng) },
    visual: null,
    explain: `This one ${subtracting ? 'subtracts' : 'adds'}, so counting negatives does not `
      + `decide it. In ${nths(work.common)} it is ${String(work.left.n).replace('-', '−')} `
      + `${right < 0 ? '−' : '+'} ${Math.abs(right)}`
      + (subtracting && b.n < 0 ? ' (taking away a negative adds)' : '')
      + `, and ${(work.left.n < 0) === (right < 0)
        ? 'both push the same way'
        : `${Math.abs(work.left.n) > Math.abs(right) ? Math.abs(work.left.n) : Math.abs(right)} is the bigger`}`
      + `, so the answer is ${negative ? 'negative' : 'positive'}.`,
  };
}

/** Dividing draws either one negative or two, so both cases stay live. */
const CONTENT = [
  whereTheMinus,
  (r) => signedAddSub(r, false),
  (r) => signedAddSub(r, true),
  (r) => signedOperation(r, 1, false),
  (r) => signedOperation(r, 2, false),
  (r) => signedOperation(r, r.chance(0.6) ? 1 : 2, true),
];

/** The strategy level's position; everything after it is the mixed level. */
const STRATEGY = 6;

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  // The mixed level leaves out the strategy level, whose answer is a choice.
  const p = level === STRATEGY ? whatSign(rng)
    : level >= LAST_LEVEL ? rng.pick(CONTENT)(rng)
    : CONTENT[level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
