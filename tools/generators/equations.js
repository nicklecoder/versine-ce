/**
 * Catalogue authoring tool: builds the problem library for equations.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 */
import * as T from '../terms.js';
import { previewOf } from '../../web/ui/express.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/equations.js';

const VARS = ['x', 'y', 'n', 'a', 't'];

/**
 * The equation is drawn by the renderer the student's own typing goes through,
 * with the answer after it as its own blank.
 *
 * Each side is parsed separately, because the parser reads expressions and an
 * equation is two of them joined by a relation. That is the right boundary
 * rather than a gap: `expr` answers are expressions, the committed syntax has
 * no `=`, and a parser that quietly accepted relations would let a level ask
 * for one without anything having decided that it should.
 *
 * A question that will not parse cannot be published: the build throws on it
 * here rather than a student meeting it.
 */
function ask(src, v) {
  const [lhs, rhs] = src.split(' = ');
  const L = previewOf(lhs);
  const R = previewOf(rhs);
  if (!L.ok) throw new Error(`equations: cannot draw "${lhs}" — ${L.error}`);
  if (!R.ok) throw new Error(`equations: cannot draw "${rhs}" — ${R.error}`);
  return [...L.terms, T.op('='), ...R.terms,
          T.op(','), T.letter(v), T.op('='), T.blank()];
}

/** x + 7 = 12, or x − 4 = 9. */
function undoAdd(rng) {
  const v = rng.pick(VARS);
  const x = rng.int(0, 20);
  const b = rng.int(1, 20);
  const plus = rng.chance(0.6);
  const rhs = plus ? x + b : x - b;
  const src = `${v} ${plus ? '+' : '-'} ${b} = ${rhs}`;
  const move = plus ? `subtract ${b} from both sides` : `add ${b} to both sides`;
  return {
    prompt: ask(src, v), text: src,
    answer: { type: 'int', value: x },
    visual: {
      kind: 'evalmodel',
      lines: [src, `${v} = ${rhs} ${plus ? '−' : '+'} ${b}`, `${v} = ${x}`],
      rules: [move, 'which leaves'],
      hint: 'What has been done to the letter?',
    },
    explain: `${b} was ${plus ? 'added to' : 'taken from'} ${v}, so ${move}: `
      + `${rhs} ${plus ? '−' : '+'} ${b} = ${x}.`,
  };
}

/**
 * 4x = 20, or x/3 = 4.
 *
 * Built from the solution outwards rather than from the equation inwards. An
 * earlier version picked a number, used it as the right-hand side of the
 * division case, and then reported it as the solution -- so x/3 = 4 claimed
 * x = 4. Naming the solution once and deriving both sides from it removes the
 * place that mistake could live.
 */
function undoMultiply(rng) {
  const v = rng.pick(VARS);
  const k = rng.int(2, 12);
  const divide = rng.chance(0.35);
  const other = rng.int(2, 15);          // the number on the right-hand side
  const solution = divide ? other * k : other;
  const src = divide ? `${v}/${k} = ${other}` : `${k}${v} = ${k * other}`;
  const move = divide ? `multiply both sides by ${k}` : `divide both sides by ${k}`;
  return {
    prompt: ask(src, v), text: src,
    answer: { type: 'int', value: solution },
    visual: {
      kind: 'evalmodel',
      lines: [src,
              divide ? `${v} = ${other} × ${k}` : `${v} = ${k * other} ÷ ${k}`,
              `${v} = ${solution}`],
      rules: [move, 'which leaves'],
      hint: 'Was the letter multiplied or divided?',
    },
    explain: divide
      ? `${v} was divided by ${k}, so ${move}: ${other} × ${k} = ${solution}.`
      : `${v} was multiplied by ${k}, so ${move}: ${k * other} ÷ ${k} = ${solution}.`,
  };
}

/**
 * 3x + 4 = 19.
 *
 * Solutions stay positive here, because the level after next is where a
 * negative one is the point. `signed` is a property of the level rather than
 * of a problem -- one negative answer anywhere in a level puts the full
 * keyboard on all of it -- so keeping these positive keeps four levels on the
 * numeric pad rather than saving anything about this problem.
 */
function twoSteps(rng) {
  const v = rng.pick(VARS);
  // Zero is allowed to be the answer. It was excluded, and a student who has
  // never seen a solution of nought reads one as having failed to solve it.
  const x = rng.int(0, 12);
  const k = rng.int(2, 9);
  const b = rng.int(1, 20);
  const rhs = k * x + b;
  const src = b >= 0 ? `${k}${v} + ${b} = ${rhs}` : `${k}${v} - ${-b} = ${rhs}`;
  const undo = b >= 0 ? `subtract ${b} from both sides` : `add ${-b} to both sides`;
  return {
    prompt: ask(src, v), text: src,
    answer: { type: 'int', value: x },
    visual: {
      kind: 'evalmodel',
      lines: [src, `${k}${v} = ${rhs - b}`, `${v} = ${x}`],
      rules: [undo, `divide both sides by ${k}`],
      hint: 'Which was done to the letter last?',
    },
    explain: `${v} was multiplied by ${k} first and ${b} added after, `
      + 'so undo them the other way round: '
      + `${undo} to get ${k}${v} = ${rhs - b}, then divide by ${k} to get ${v} = ${x}.`,
  };
}

/** A minus in front of the letter, which is the case people get wrong. */
function negatives(rng) {
  const v = rng.pick(VARS);
  const x = rng.int(1, 14);
  if (rng.chance(0.5)) {
    // 12 − x = 5
    const a = x + rng.int(1, 15);
    const src = `${a} - ${v} = ${a - x}`;
    return {
      prompt: ask(src, v), text: src,
      answer: { type: 'int', value: x },
      visual: {
        kind: 'evalmodel',
        lines: [src, `${a} - ${a - x} = ${v}`, `${v} = ${x}`],
        rules: [`add ${v} to both sides and subtract ${a - x}`, 'which leaves'],
        hint: 'The letter is being taken away, not added.',
      },
      explain: `Here ${v} is being subtracted, so it moves across as a positive: `
        + `${a} − ${a - x} = ${x}.`,
    };
  }
  // −4x = 20
  const k = rng.int(2, 9);
  const src = `-${k}${v} = ${-k * x}`;
  return {
    prompt: ask(src, v), text: src,
    answer: { type: 'int', value: x },
    visual: {
      kind: 'evalmodel',
      lines: [src, `${v} = ${-k * x} ÷ (−${k})`, `${v} = ${x}`],
      rules: [`divide both sides by −${k}`, 'a negative divided by a negative'],
      hint: 'What is multiplying the letter, sign and all?',
    },
    explain: `${v} is multiplied by −${k}, so divide both sides by −${k}. `
      + `A negative divided by a negative is positive: ${v} = ${x}.`,
  };
}

/**
 * The answer comes out below zero.
 *
 * Nothing here is a new move: it is undoAdd, undoMultiply and twoSteps again
 * with the numbers arranged so the letter lands on the other side of zero.
 * That is the whole design. If a negative answer needed a new method it would
 * be a new method; what it actually needs is for the student to have seen one
 * and carried on, instead of reading it as a slip and going back through
 * correct working looking for the mistake.
 *
 * Built outwards from the solution, like everything else here, so the
 * equation and the answer cannot disagree.
 */
function belowZero(rng) {
  const v = rng.pick(VARS);
  // A quarter come out positive, from the same shapes: if every answer were
  // negative, the sign would be given away and only the size worked out.
  const x = rng.chance(0.25) ? rng.int(1, 15) : -rng.int(2, 15);
  const shape = rng.int(0, 2);

  if (shape === 0) {                             // x + 12 = 5
    const b = rng.int(2, 20);
    const rhs = x + b;
    const src = `${v} + ${b} = ${rhs}`;
    return {
      prompt: ask(src, v), text: src,
      answer: { type: 'int', value: x },
      visual: {
        kind: 'evalmodel',
        lines: [src, `${v} = ${rhs} − ${b}`, `${v} = ${x}`],
        rules: [`subtract ${b} from both sides`, x < 0 ? 'which goes past zero' : 'which leaves'],
        hint: 'What has been added to the letter?',
      },
      explain: `Subtract ${b} from both sides: ${rhs} − ${b} = ${x}. `
        + (x < 0
          ? `Taking ${b} from ${rhs} runs out of numbers above zero and keeps going, `
            + 'which is what a negative answer is. It is an answer, not a mistake.'
          : `${rhs} is more than ${b}, so this one stays above zero.`),
    };
  }

  if (shape === 1) {                             // 4x = −20
    const k = rng.int(2, 9);
    const rhs = k * x;
    const src = `${k}${v} = ${rhs}`;
    return {
      prompt: ask(src, v), text: src,
      answer: { type: 'int', value: x },
      visual: {
        kind: 'evalmodel',
        lines: [src, `${v} = ${rhs} ÷ ${k}`, `${v} = ${x}`],
        rules: [`divide both sides by ${k}`, x < 0 ? 'a negative divided by a positive' : 'which leaves'],
        hint: 'What is the letter multiplied by?',
      },
      explain: x < 0
        ? `Divide both sides by ${k}. A negative divided by a positive is `
          + `negative, so ${v} = ${x}. The sign comes along with the number.`
        : `Divide both sides by ${k}: ${rhs} ÷ ${k} = ${x}. Both are positive, so the answer is too.`,
    };
  }

  const k = rng.int(2, 8);                       // 3x + 20 = 2
  const b = rng.int(2, 20);
  const rhs = k * x + b;
  const src = `${k}${v} + ${b} = ${rhs}`;
  return {
    prompt: ask(src, v), text: src,
    answer: { type: 'int', value: x },
    visual: {
      kind: 'evalmodel',
      lines: [src, `${k}${v} = ${rhs} − ${b}`, `${k}${v} = ${k * x}`, `${v} = ${x}`],
      rules: [`subtract ${b} from both sides`, x < 0 ? 'which goes past zero' : 'which leaves',
              `divide both sides by ${k}`],
      hint: 'Same two moves, in the same order as always.',
    },
    explain: `Subtract ${b} first: ${rhs} − ${b} = ${k * x}. Then divide by ${k}: `
      + `${v} = ${x}. Both steps are the ones you already do`
      + (x < 0 ? ' — only the answer is on the other side of zero.' : ', and the sign comes out of them.'),
  };
}

/**
 * The strategic layer, and the contrast the whole skill turns on.
 *
 * 3x + 4 = 19 and 3(x + 4) = 19 look almost identical and want opposite first
 * moves. In the first the 4 is outside the multiplication, so it comes off
 * first; in the second the bracket makes the multiplication outermost, so the
 * division comes first. A student drilled only on "do the opposite" gets the
 * second one wrong every time.
 */
function whichFirst(rng) {
  const v = rng.pick(VARS);
  const k = rng.int(2, 9);
  const bracketed = rng.chance(0.5);
  // requiem: catalogue/content/which-form-one-right-answer
  // Without the bracket, dividing first is a legal move too, and when k goes
  // into the added number it is just as clean: 2a + 10 = 14 becomes
  // a + 5 = 7. So the added number is never a multiple of k there, and the
  // explanation says what dividing first would cost.
  const b = bracketed ? rng.int(1, 12) : rng.pick([...Array(12)].map((_, i) => i + 1).filter((n) => n % k));
  const x = rng.int(1, 10);
  const rhs = bracketed ? k * (x + b) : k * x + b;
  const src = bracketed ? `${k}(${v} + ${b}) = ${rhs}` : `${k}${v} + ${b} = ${rhs}`;
  return {
    prompt: [T.prose(`Solving ${src} — which move first?`)],
    text: `first move for ${src}`,
    answer: {
      type: 'choice',
      value: bracketed ? 'divide' : 'subtract',
      options: rng.shuffle([
        { id: 'subtract', label: `Subtract ${b} from both sides`, note: 'undo the addition first' },
        { id: 'divide', label: `Divide both sides by ${k}`, note: 'undo the multiplication first' },
      ]),
    },
    visual: null,
    explain: bracketed
      ? `The bracket makes the multiplication the outermost thing done to ${v}, `
        + `so it comes off first: dividing by ${k} gives ${v} + ${b} = ${rhs / k}. `
        + `Subtracting ${b} from both sides would not reach the ${b} inside the bracket: `
        + `it would leave ${k}(${v} + ${b}) − ${b} = ${rhs - b}.`
      : `Here ${b} was added after the multiplication, so it comes off first: `
        + `subtracting gives ${k}${v} = ${rhs - b}, then ${v} = ${x}. Dividing first is allowed, but `
        + `${b} ÷ ${k} and ${rhs} ÷ ${k} are not whole, so it would bring in fractions. `
        + 'Undo in the reverse of the order applied.',
  };
}

/**
 * The four content levels, in order. The strategy level is its own thing and
 * the last level redraws from these four -- which is why there is no default
 * branch here: every level is either one of these, the strategy level, or a
 * mix of these. An earlier version had one, and it was unreachable.
 */
const CONTENT = [undoAdd, undoMultiply, twoSteps, negatives, belowZero];

/** The strategy level's position; everything after it is the mixed level. */
const STRATEGY = 5;

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  // The mixed level deals from all five content levels, `belowZero`
  // included. Leaving it out would teach that a negative answer only happens
  // when you have been warned to expect one.
  const p = level === STRATEGY ? whichFirst(rng)
    : level >= LAST_LEVEL ? rng.pick(CONTENT)(rng)
    : CONTENT[level](rng);
  p.parSeconds = PAR_SECONDS[level];
  // The sentences and worked lines use a real minus sign; only typed text keeps the hyphen.
  const tidy = (t) => t.replace(/ - /g, ' − ').replace(/(^|[\s(=])-(?=\d)/g, '$1−');
  p.explain = tidy(p.explain);
  if (p.visual?.lines) p.visual.lines = p.visual.lines.map(tidy);
  return p;
}
