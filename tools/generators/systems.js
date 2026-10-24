/**
 * Catalogue authoring tool: builds the problem library for systems of
 * equations.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 *
 * Every `text` carries both equations in plain ASCII, separated by "; ", so
 * scripts/check-answers.py can solve the system for itself.
 */
import * as T from '../terms.js';
import { minus, signed } from '../../web/ui/dom.js';
import { previewOf } from '../../web/ui/express.js';
import { ratio, clip, lineText } from '../lines.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/systems.js';

const SPAN = 8;
/** An equation for a sentence: one unbroken piece of maths among the words. */
const terms = (src) => [T.math(previewOf(src).terms)];
const whole = (n) => ({ n, d: 1 });
const tm = (s) => s.replace(/-/g, '−');
const pairAnswer = (x, y) => ({ type: 'pair', value: { x: whole(x), y: whole(y) } });
/** 3x, −x, x: a coefficient in front of a letter, with the 1 left unwritten. */
const cx = (k, v = 'x') => `${k === 1 ? '' : k === -1 ? '−' : minus(k)}${v}`;
/**
 * k·v = c, then v: "3x = 12, so x = 4", or just "x = 4" when the number in
 * front is 1 -- "x = 4, so x = 4" says nothing twice.
 */
const solved = (k, v, c, value, join = ', so') => (k === 1 ? `${v} = ${minus(value)}`
  : `${cx(k, v)} = ${minus(c)}${join} ${v} = ${minus(value)}`);
const gcd3 = (...ns) => ns.reduce((g, n) => { let a = Math.abs(g), b = Math.abs(n); while (b) [a, b] = [b, a % b]; return a; }, 0);
const sol = (x, y) => `x = ${minus(x)}, y = ${minus(y)}: the point (${minus(x)}, ${minus(y)})`;

/** ax + by = c, in ASCII, with 1s left unwritten and a zero term left out. */
function std(a, b, c) {
  const term = (k, v, first) => {
    if (k === 0) return '';
    const size = Math.abs(k) === 1 ? '' : Math.abs(k);
    if (first) return `${k < 0 ? '-' : ''}${size}${v}`;
    return ` ${k < 0 ? '-' : '+'} ${size}${v}`;
  };
  const left = a === 0 ? term(b, 'y', true) : term(a, 'x', true) + term(b, 'y', false);
  return `${left} = ${c}`;
}

/** Both equations on one line of prompt, joined by "and". */
const both = (e1, e2) => [...terms(e1), T.prose('and'), ...terms(e2)];

/** A solution small enough to check in your head. */
const point = (rng) => [rng.int(-6, 6), rng.int(-6, 6)];

/** Two lines drawn on the grid, crossing at a lattice point. */
function whereCross(rng) {
  const [x, y] = point(rng);
  const slopes = [1, 2, 3, -1, -2, -3, 0];
  const m1 = rng.pick(slopes);
  let m2 = rng.pick(slopes);
  while (m2 === m1) m2 = rng.pick(slopes);
  const b1 = y - m1 * x, b2 = y - m2 * x;
  if (Math.abs(x) > SPAN - 2 || Math.abs(y) > SPAN - 2) return whereCross(rng);
  const s1 = clip(whole(m1), whole(b1), SPAN), s2 = clip(whole(m2), whole(b2), SPAN);
  if (!s1 || !s2) return whereCross(rng);
  const e1 = lineText(whole(m1), whole(b1), { ascii: true });
  const e2 = lineText(whole(m2), whole(b2), { ascii: true });
  return {
    prompt: [T.prose('Where do these two lines cross?')],
    text: `cross ${e1}; ${e2}`,
    answer: pairAnswer(x, y),
    visual: {
      kind: 'plane', xRange: [-SPAN, SPAN], yRange: [-SPAN, SPAN], grid: 1,
      marks: [{ kind: 'segment', from: s1[0], to: s1[1], tone: 'var(--vec-1)' },
              { kind: 'segment', from: s2[0], to: s2[1], tone: 'var(--vec-2)' }],
      answer: [{ kind: 'point', at: [x, y], label: `(${minus(x)}, ${minus(y)})` }],
    },
    explain: `They cross at (${minus(x)}, ${minus(y)}). Check it is on both: x = ${minus(x)} in ${tm(e1)} `
      + `gives y = ${minus(y)}, and in ${tm(e2)} it gives y = ${minus(y)} too. Both agree, `
      + 'so it is the one point the two lines share.',
  };
}

/** One equation already says what y is; it goes straight into the other. */
function substitution(rng) {
  const [x, y] = point(rng);
  const m = rng.nonZero(-4, 4), k = y - m * x;
  const a = rng.nonZero(-5, 5), b = rng.nonZero(-4, 4);
  if (a + b * m === 0) return substitution(rng);
  const c = a * x + b * y;
  const e1 = lineText(whole(m), whole(k), { ascii: true });
  const e2 = std(a, b, c);
  const coef = a + b * m, rest = c - b * k;
  return {
    prompt: [T.prose('Solve'), ...both(e1, e2), T.prose('.')],
    text: `system: ${e1}; ${e2}`,
    answer: pairAnswer(x, y),
    visual: null,
    explain: `The first says y is ${tm(e1.slice(4))}, so put that in for y in the second: `
      + `${tm(std(a, 0, 0).split(' = ')[0])} ${b < 0 ? '−' : '+'} ${Math.abs(b) === 1 ? '' : Math.abs(b)}(${tm(e1.slice(4))}) `
      + `= ${minus(c)}. Expand and collect: `
      + (b * k === 0 ? `${solved(coef, 'x', c, x)}. `
        : `${cx(coef)} ${b * k < 0 ? '−' : '+'} ${Math.abs(b * k)} = ${minus(c)}, so ${solved(coef, 'x', rest, x, ' and')}. `)
      + `Back into the first: y = ${minus(m)} × ${signed(x)}${k === 0 ? '' : ` ${k < 0 ? '−' : '+'} ${Math.abs(k)}`} = ${minus(y)}. `
      + `So ${sol(x, y)}.`,
  };
}

/** One letter's numbers are already opposite, or the same: add, or subtract. */
function elimination(rng) {
  const [x, y] = point(rng);
  const onX = rng.chance(0.5);
  const k = rng.int(1, 5);
  const add = rng.chance(0.6);
  const p = rng.nonZero(-5, 5), q = rng.nonZero(-5, 5);
  // The cancelling letter has k in one equation and ∓k in the other.
  const [a1, b1, a2, b2] = onX ? [k, p, add ? -k : k, q] : [p, k, q, add ? -k : k];
  const det = a1 * b2 - a2 * b1;
  if (det === 0) return elimination(rng);
  const c1 = a1 * x + b1 * y, c2 = a2 * x + b2 * y;
  const e1 = std(a1, b1, c1), e2 = std(a2, b2, c2);
  const kept = onX ? 'y' : 'x';
  const keptCoef = onX ? (add ? b1 + b2 : b1 - b2) : (add ? a1 + a2 : a1 - a2);
  const keptC = add ? c1 + c2 : c1 - c2;
  if (keptCoef === 0) return elimination(rng);
  const keptVal = onX ? y : x;
  // The first equation with the found letter put in, leaving the other alone.
  const otherCoef = onX ? a1 : b1, other = onX ? 'x' : 'y';
  const known = onX ? b1 * y : a1 * x;
  const back = known === 0 ? solved(otherCoef, other, c1, onX ? x : y)
    : `${cx(otherCoef, other)} ${known < 0 ? '−' : '+'} ${Math.abs(known)} = ${minus(c1)}, `
      + `so ${solved(otherCoef, other, c1 - known, onX ? x : y, ' and')}`;
  return {
    prompt: [T.prose('Solve'), ...both(e1, e2), T.prose('.')],
    text: `system: ${e1}; ${e2}`,
    answer: pairAnswer(x, y),
    visual: null,
    explain: `The ${onX ? 'x' : 'y'} terms are ${add ? 'opposites' : 'the same'}, so ${add ? 'adding' : 'subtracting'} `
      + `the equations cancels them: ${solved(keptCoef, kept, keptC, keptVal)}. `
      + `Put that into the first: ${back}. So ${sol(x, y)}.`,
  };
}

/** Nothing cancels yet: multiply the second equation so that one letter will. */
function scaleFirst(rng) {
  const [x, y] = point(rng);
  const s2 = rng.pick([1, -1]);
  const k = rng.int(2, 4) * rng.pick([1, -1]);
  const a2 = rng.nonZero(-5, 5), b2 = s2;
  const a1 = rng.nonZero(-6, 6), b1 = k * b2 * rng.pick([1, -1]);
  const det = a1 * b2 - a2 * b1;
  if (det === 0 || Math.abs(a1) === Math.abs(a2)) return scaleFirst(rng);
  const c1 = a1 * x + b1 * y, c2 = a2 * x + b2 * y;
  const e1 = std(a1, b1, c1), e2 = std(a2, b2, c2);
  // Multiply the second by b1/b2 so its y term matches the first's, then subtract.
  const f = b1 / b2;
  const scaled = std(a2 * f, b1, c2 * f);
  return {
    prompt: [T.prose('Solve'), ...both(e1, e2), T.prose('.')],
    text: `system: ${e1}; ${e2}`,
    answer: pairAnswer(x, y),
    visual: null,
    explain: `Nothing cancels as it stands. Multiply the second equation by ${minus(f)} so its y term matches `
      + `the first: ${tm(scaled)}. Subtract that from the first: ${solved(a1 - a2 * f, 'x', c1 - c2 * f, x)}. `
      + `Put x back into the second: ${minus(a2)} × ${signed(x)} ${b2 < 0 ? '−' : '+'} y = ${minus(c2)}, `
      + `so y = ${minus(y)}. So ${sol(x, y)}.`,
  };
}

const COUNTS = [
  { id: 'one', label: 'Exactly one', note: 'the lines cross once' },
  { id: 'none', label: 'No solution', note: 'the lines never meet' },
  { id: 'infinite', label: 'Infinitely many', note: 'every point of one is on the other' },
];

/** The same left side scaled: the same line, or a parallel one. */
function noneOrInfinite(rng) {
  const kind = rng.pick(['one', 'none', 'none', 'infinite', 'infinite']);
  const a = rng.nonZero(-5, 5), b = rng.nonZero(-5, 5), c = rng.int(-12, 12);
  const k = rng.pick([2, 3, -1, -2, 4]);
  let a2 = k * a, b2 = k * b, c2 = k * c;
  if (kind === 'none') c2 += rng.nonZero(-6, 6);
  if (kind === 'one') { b2 += rng.nonZero(-2, 2); if (a * b2 === a2 * b) return noneOrInfinite(rng); }
  const e1 = std(a, b, c), e2 = std(a2, b2, c2);
  return {
    prompt: [T.prose('How many solutions does the system'), ...both(e1, e2), T.prose('have?')],
    text: `solutions of system: ${e1}; ${e2}`,
    answer: { type: 'choice', value: kind, options: COUNTS },
    visual: null,
    explain: kind === 'one'
      ? `Multiplying the first by ${minus(k)} gives ${tm(std(a * k, b * k, c * k))}, whose left side does not match `
        + 'the second: the lines have different slopes, so they cross exactly once.'
      : `Multiply the first by ${minus(k)}: ${tm(std(a2, b * k, c * k))}. The left side is now the same as the second's. `
        + (kind === 'none'
          ? `But the right sides are ${minus(c * k)} and ${minus(c2)}: the same thing cannot equal both. The lines are `
            + 'parallel, so there is no solution.'
          : 'So are the right sides: it is the same line written twice, and every point on it is a solution.'),
  };
}

/** Two facts about two unknowns, written as two equations. */
function fromWords(rng) {
  const shape = rng.pick(['tickets', 'animals', 'sum-difference']);
  if (shape === 'tickets') {
    const p = rng.int(6, 15), q = rng.int(3, p - 1), A = rng.int(2, 20), C = rng.int(2, 20);
    const askAdult = rng.chance(0.5);
    const e1 = `x + y = ${A + C}`, e2 = `${p}x + ${q}y = ${p * A + q * C}`;
    return {
      prompt: [T.prose(`Adult tickets cost $${p} and child tickets $${q}. ${A + C} tickets cost $${p * A + q * C} `
        + `altogether. How many ${askAdult ? 'adult' : 'child'} tickets were sold?`)],
      text: `words: ${e1}; ${e2}; ${askAdult ? 'x' : 'y'}`,
      answer: { type: 'int', value: askAdult ? A : C },
      visual: null,
      explain: `Call the adult tickets x and the child tickets y. The count says ${tm(e1)}; the cost says `
        + `${tm(e2)}. Multiply the first by ${q}: ${q}x + ${q}y = ${q * (A + C)}. Subtract it from the second: `
        + `${p - q}x = ${(p - q) * A}, so x = ${A}, and y = ${A + C} − ${A} = ${C}. `
        + `${askAdult ? `${A} adult` : `${C} child`} tickets.`,
    };
  }
  if (shape === 'animals') {
    const hens = rng.int(2, 30), cows = rng.int(2, 20);
    const askCows = rng.chance(0.5);
    const e1 = `x + y = ${hens + cows}`, e2 = `2x + 4y = ${2 * hens + 4 * cows}`;
    return {
      prompt: [T.prose(`A farm has hens and cows: ${hens + cows} heads and ${2 * hens + 4 * cows} legs. `
        + `How many ${askCows ? 'cows' : 'hens'} are there?`)],
      text: `words: ${e1}; ${e2}; ${askCows ? 'y' : 'x'}`,
      answer: { type: 'int', value: askCows ? cows : hens },
      visual: null,
      explain: `Call the hens x and the cows y. Heads: ${tm(e1)}. Legs, 2 a hen and 4 a cow: ${tm(e2)}. `
        + `Double the first: 2x + 2y = ${2 * (hens + cows)}. Subtract it from the second: 2y = ${2 * cows}, `
        + `so y = ${cows} cows, and x = ${hens} hens.`,
    };
  }
  const big = rng.int(-10, 40), d = rng.int(1, 20), small = big - d;
  const askBig = rng.chance(0.5);
  const e1 = `x + y = ${big + small}`, e2 = `x - y = ${d}`;
  return {
    prompt: [T.prose(`Two numbers add up to ${minus(big + small)}, and one is ${d} more than the other. `
      + `What is the ${askBig ? 'larger' : 'smaller'} number?`)],
    text: `words: ${e1}; ${e2}; ${askBig ? 'x' : 'y'}`,
    answer: { type: 'int', value: askBig ? big : small },
    visual: null,
    explain: `Call the larger x and the smaller y: ${tm(e1)} and ${tm(e2)}. Adding cancels y: `
      + `2x = ${minus(big + small + d)}, so x = ${minus(big)}, and y = ${minus(big)} − ${d} = ${minus(small)}.`,
  };
}

const METHODS = [
  { id: 'substitution', label: 'Substitution', note: 'put one equation into the other' },
  { id: 'elimination', label: 'Elimination', note: 'add or subtract the equations as they are' },
  { id: 'scale', label: 'Scale, then eliminate', note: 'multiply an equation first' },
];

/**
 * The quickest method, from the look of the equations. The "scale" cases
 * never have a letter with a 1 in front of it, so substitution would mean
 * fractions and is not a fair rival.
 */
// requiem: catalogue/library/choice-answers-balanced
function whichMethod(rng, kind = rng.pick(['substitution', 'elimination', 'scale'])) {
  // The method is kept through every redraw, so the ones redrawn most do
  // not end up answering least.
  const [x, y] = point(rng);
  let e1, e2;
  if (kind === 'substitution') {
    const m = rng.nonZero(-4, 4);
    e1 = lineText(whole(m), whole(y - m * x), { ascii: true });
    const a = rng.int(2, 6), b = rng.int(2, 6) * rng.pick([1, -1]);
    e2 = std(a, b, a * x + b * y);
  } else if (kind === 'elimination') {
    const k = rng.int(2, 5), p = rng.int(2, 6), q = rng.int(2, 6) * rng.pick([1, -1]);
    if (p === Math.abs(q)) return whichMethod(rng, kind);
    e1 = std(p, k, p * x + k * y);
    const s = rng.pick([1, -1]);
    e2 = std(q, s * k, q * x + s * k * y);
  } else {
    const a1 = rng.int(2, 6), b1 = rng.int(2, 6), a2 = rng.int(2, 6), b2 = -rng.int(2, 6);
    if (a1 === a2 || b1 === -b2 || a1 * b2 === a2 * b1) return whichMethod(rng, kind);
    // An equation that divides through -- 3x + 3y = 0 is x + y = 0, so
    // y = −x at once -- makes substitution as quick as scaling, and the key
    // would be arguable. Such systems are not asked as "scale".
    const c1 = a1 * x + b1 * y, c2 = a2 * x + b2 * y;
    if (gcd3(a1, b1, c1) > 1 || gcd3(a2, b2, c2) > 1) return whichMethod(rng, kind);
    e1 = std(a1, b1, c1);
    e2 = std(a2, b2, c2);
  }
  return {
    prompt: [T.prose('Which method gets to the solution of'), ...both(e1, e2), T.prose('with the least work?')],
    text: `which method: ${e1}; ${e2}`,
    answer: { type: 'choice', value: kind, options: METHODS },
    visual: null,
    explain: {
      substitution: 'The first equation already has y on its own, so it can go straight into the second.',
      elimination: 'The y terms already have the same size of number, so adding or subtracting the equations '
        + 'cancels y with no multiplying first.',
      scale: 'No letter stands alone and no numbers match, so something has to be multiplied before anything '
        + 'cancels. Substituting would bring in fractions.',
    }[kind],
  };
}

const CONTENT = [whereCross, substitution, elimination, scaleFirst, noneOrInfinite, fromWords, whichMethod];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  // The mixed level deals from the four solving levels and From Words. None
  // or Infinitely Many and Which Method stay out: both are answered with
  // buttons, and a system that sometimes asks for a pair and sometimes for a
  // button would be telling the student which kind of system it is.
  const pool = [0, 1, 2, 3, 5];
  const p = CONTENT[level >= LAST_LEVEL ? rng.pick(pool) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
