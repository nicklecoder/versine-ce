/**
 * Catalogue authoring tool: builds the problem library for simplify.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 */
import * as T from '../terms.js';
import { previewOf } from '../../web/ui/express.js';
import { gcd } from '../../web/math/frac.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/simplify.js';

const VARS = ['x', 'y', 'n', 'a', 't'];

/**
 * The question is drawn by the same renderer the student's own typing goes
 * through, so what they are shown and what they see themselves type are set
 * identically. It also means a question that will not parse cannot be
 * published: the build fails on it here rather than a student meeting it.
 *
 * requiem: catalogue/content/expression-prompts-name-the-form
 * Every prompt opens with what to do -- collect, expand, factor -- because an
 * expression can be written many right ways and only the instruction says
 * which one is the answer. In All Together the level name no longer says it.
 */
function ask(verb, src) {
  const r = previewOf(src);
  if (!r.ok) throw new Error(`simplify: cannot draw "${src}" — ${r.error}`);
  return [T.prose(verb), ...r.terms, T.op('='), T.blank()];
}

/** `mx + c` the way a person writes it: 1x is x, +−3 is −3, +0 is nothing. */
function linear(m, c, v) {
  const head = m === 1 ? v : m === -1 ? `-${v}` : `${m}${v}`;
  if (!c) return head;
  return `${head} ${c > 0 ? '+' : '-'} ${Math.abs(c)}`;
}

/** Typed text uses a hyphen; the sentences explaining it use a real minus sign. */
const shown = (s) => String(s).replace(/-/g, '−');
/** A number as a factor in a sentence: −4 in brackets after ×. */
const factor = (n) => (n < 0 ? `(−${-n})` : String(n));

/** Same letter, so the numbers in front add. */
function collect(rng) {
  const v = rng.pick(VARS);
  const a = rng.int(2, 12);
  const b = rng.int(2, 12);
  const src = `${a}${v} + ${b}${v}`;
  return {
    prompt: ask('Collect like terms:', src),
    text: src,
    answer: { type: 'expr', value: linear(a + b, 0, v) },
    visual: {
      kind: 'evalmodel',
      lines: [src, `${a} lots of ${v} and ${b} more`, `${a} + ${b} = ${a + b}`, linear(a + b, 0, v)],
      rules: ['both count the same thing', 'so the numbers in front add', 'giving'],
      hint: 'What is each term counting?',
    },
    explain: `Both terms count ${v}, so they combine: ${a} + ${b} = ${a + b}, `
      + `giving ${linear(a + b, 0, v)}.`,
  };
}

/** Some of it combines and some of it cannot. */
function partial(rng) {
  const v = rng.pick(VARS);
  const a = rng.int(2, 9);
  const b = rng.int(2, 9);
  const c = rng.int(2, 15);
  const src = `${a}${v} + ${c} + ${b}${v}`;
  return {
    prompt: ask('Collect like terms:', src),
    text: src,
    answer: { type: 'expr', value: linear(a + b, c, v) },
    visual: {
      kind: 'evalmodel',
      lines: [src, `${a}${v} + ${b}${v} counts ${v}; ${c} does not`,
              `${a} + ${b} = ${a + b}`, linear(a + b, c, v)],
      rules: ['sort them by what they count', 'add the ones that match', 'and the rest stays'],
      hint: 'Which of these are counting the same thing?',
    },
    explain: `${a}${v} and ${b}${v} both count ${v} and combine to ${linear(a + b, 0, v)}. `
      + `${c} counts nothing but itself, so it stays: ${linear(a + b, c, v)}.`,
  };
}

/**
 * A bracket multiplied hits everything inside it.
 *
 * The multiplier is sometimes negative: −3(x − 4) is where "everything inside"
 * is actually tested, since the classic slip is −3x − 12.
 */
function distribute(rng, andCollect) {
  const v = rng.pick(VARS);
  const a = rng.int(2, 9) * (rng.chance(0.3) ? -1 : 1);
  const b = rng.int(1, 12) * (rng.chance(0.4) ? -1 : 1);
  const inner = b >= 0 ? `${v} + ${b}` : `${v} - ${-b}`;
  const extra = andCollect ? rng.int(2, 9) : 0;
  const src = andCollect ? `${a}(${inner}) + ${extra}${v}` : `${a}(${inner})`;
  const m = a + extra;
  if (m === 0) return distribute(rng, andCollect);
  const c = a * b;
  return {
    prompt: ask(andCollect ? 'Expand and collect like terms:' : 'Expand:', src),
    text: src,
    answer: { type: 'expr', value: linear(m, c, v) },
    visual: {
      kind: 'evalmodel',
      lines: [src,
              `${a} × ${v} and ${a} × ${b >= 0 ? b : `(${b})`}`,
              andCollect ? `${linear(a, c, v)} + ${extra}${v}` : linear(a, c, v),
              linear(m, c, v)],
      rules: ['the multiplier reaches both terms',
              andCollect ? 'which gives' : 'so',
              andCollect ? `${a} + ${extra} = ${m} lots of ${v}` : 'and that is it'],
      hint: 'What does the number outside multiply?',
    },
    explain: shown(`${a} multiplies both terms inside: ${factor(a)} × ${v} = ${linear(a, 0, v)} and `
      + `${factor(a)} × ${factor(b)} = ${c}. `
      + (andCollect
        ? `Then ${linear(a, 0, v)} and ${extra}${v} combine to ${linear(m, 0, v)}, `
          + `leaving ${linear(m, c, v)}.`
        : `That gives ${linear(m, c, v)}.`)),
  };
}

/**
 * The strategic layer, and the reason this skill exists.
 *
 * Brackets are kept when the next step divides by them, cancels them or sets
 * them to zero, and opened when the next step needs the terms laid out. Neither
 * form is simpler in the abstract -- what is about to happen decides.
 *
 * requiem: catalogue/content/which-form-one-right-answer
 * Where both forms reach the answer the explanation says so, and says what
 * the better one saves. The option notes show what each form looks like and
 * never what it is for, so no word in a situation matches a button.
 */
const SITUATIONS = {
  keep: [
    ({ f, v, a, b, rng }) => {
      const r = a * (b + rng.int(1, 6));
      return {
        text: `You need to solve ${f} = ${r} for ${v}.`,
        why: `Either way reaches ${v} = ${r / a - b}, but kept as a bracket, dividing both sides by ${a} `
          + `undoes it in one step: ${v} + ${b} = ${r / a}. Multiplying out first adds a step.`,
      };
    },
    ({ f, v, a, b }) => ({
      text: `You need to cancel a factor of ${a} from ${f} over ${a}.`,
      why: `With the bracket kept, ${a} is plainly a factor of the whole top and cancels at once, leaving `
        + `${v} + ${b}. Multiplied out as ${a}${v} + ${a * b}, it would have to be taken out again first.`,
    }),
    ({ f, v, a, b }) => ({
      text: `You need to divide ${f} by ${a} exactly.`,
      why: `${f} is ${a} lots of (${v} + ${b}), so dividing by ${a} leaves ${v} + ${b} in one step. `
        + `Multiplied out, each term has to be divided separately.`,
    }),
    ({ f, v, a, b }) => ({
      text: `You need to find the value of ${v} that makes ${f} equal to zero.`,
      why: `${a} times something is zero only when the something is zero, so ${v} + ${b} = 0 and `
        + `${v} = −${b}. The bracket shows that at once; ${a}${v} + ${a * b} hides it.`,
    }),
  ],
  open: [
    ({ f, v, a, b, rng }) => {
      const e = rng.int(2, 9);
      return {
        text: `You need to add ${f} to ${e}${v}.`,
        why: `Inside the bracket, ${v} is not a term you can collect. Multiplied out, ${f} is `
          + `${a}${v} + ${a * b}, and ${a}${v} + ${e}${v} = ${a + e}${v}: the sum is ${a + e}${v} + ${a * b}.`,
      };
    },
    ({ f, v, a, b, rng }) => {
      const e = rng.int(1, a - 1);
      return {
        text: `You need to take ${e === 1 ? '' : e}${v} away from ${f}.`,
        why: `Multiplied out, ${f} is ${a}${v} + ${a * b}, and taking ${e === 1 ? '' : e}${v} from `
          + `${a}${v} leaves ${linear(a - e, a * b, v)}.`,
      };
    },
    ({ f, v, a, b, rng }) => {
      const c = rng.chance(0.5) ? a * b : a * b + rng.pick([-1, 1]);
      return {
        text: `You need to check whether ${f} matches another expression written as ${a}${v} + ${c}.`,
        why: `The other one is already multiplied out, so multiply ${f} out too and compare term by term: `
          + `${a}${v} + ${a * b} ${c === a * b ? 'is' : 'is not'} ${a}${v} + ${c}.`,
      };
    },
    ({ f, v, a, b, rng }) => {
      const k = rng.int(2, 5), d = rng.int(1, 9);
      return {
        text: `You need to add ${f} to ${k}(${v} + ${d}).`,
        why: `The brackets hold different things, so neither can be kept whole. Multiplied out: `
          + `${a}${v} + ${a * b} + ${k}${v} + ${k * d} = ${a + k}${v} + ${a * b + k * d}.`,
      };
    },
  ],
};

/**
 * Distributing backwards: 6x + 15 becomes 3(2x + 5).
 *
 * The strategy level after this one asks whether to keep a bracket or open
 * it, and until now only one of those two was ever practised -- a judgement
 * between a skill the student has and one they have only been told about.
 * Factorising is also the move that makes an equation solvable rather than
 * merely tidy, which is the sentence the skill's own header has been making
 * since before there was a level to back it.
 *
 * The factor taken out is the greatest one, and the level insists on it: 6x +
 * 15 = 3(2x + 5) and not, say, nothing at all. What is left inside must share
 * no factor, or the job is half done -- the same stopping point that "lowest
 * terms" names for a fraction.
 */
function factorise(rng) {
  const v = rng.pick(VARS);
  const k = rng.int(2, 9);                       // the factor to come out
  let m = rng.int(2, 9);                         // what is left in front of the letter
  let c = rng.int(1, 12);                        // and the number left inside
  // Nothing shared inside, or the greatest common factor was not taken.
  if (gcd(m, c) !== 1) return factorise(rng);
  const src = `${k * m}${v} + ${k * c}`;

  return {
    prompt: ask('Factor fully:', src),
    text: src,
    answer: { type: 'expr', value: `${k}(${m === 1 ? v : `${m}${v}`} + ${c})` },
    visual: {
      kind: 'evalmodel',
      lines: [src, `${k} × ${m}${v} and ${k} × ${c}`,
              `${k}(${m === 1 ? v : `${m}${v}`} + ${c})`],
      rules: [`${k} divides both ${k * m} and ${k * c}`, 'so it comes outside'],
      hint: 'What goes into both numbers?',
    },
    explain: `${k * m} and ${k * c} share a factor of ${k}, and nothing bigger — `
      + `so ${k} comes out: ${k * m}${v} ÷ ${k} = ${m === 1 ? v : `${m}${v}`} and `
      + `${k * c} ÷ ${k} = ${c}, leaving ${k}(${m === 1 ? v : `${m}${v}`} + ${c}). `
      + `Multiplying it back out returns ${src}, which is how to check it.`,
  };
}

function whichForm(rng) {
  const v = rng.pick(VARS);
  const a = rng.int(2, 9);
  const b = rng.int(1, 9);
  const f = `${a}(${v} + ${b})`;
  const want = rng.chance(0.5) ? 'keep' : 'open';
  const s = rng.pick(SITUATIONS[want])({ f, v, a, b, rng });
  return {
    prompt: [T.prose(s.text)],
    text: s.text,
    answer: {
      type: 'choice', value: want,
      options: rng.shuffle([
        { id: 'keep', label: 'Keep the brackets', note: 'a number times a bracket, like 3(x + 2)' },
        { id: 'open', label: 'Multiply them out', note: 'terms side by side, like 3x + 6' },
      ]),
    },
    visual: null,
    explain: s.why,
  };
}

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  const build = (lv) => {
    switch (lv) {
      case 0: return collect(rng);
      case 1: return partial(rng);
      case 2: return distribute(rng, false);
      case 3: return distribute(rng, true);
      case 4: return factorise(rng);
      case 5: return whichForm(rng);
      default: return rng.pick([collect, partial,
        (r) => distribute(r, false), (r) => distribute(r, true), factorise])(rng);
    }
  };
  const p = build(level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 2) : level);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
