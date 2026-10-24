/**
 * Catalogue authoring tool: builds the problem library for int-muldiv.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding -- when a
 * systematic fault affects too many rows to correct by hand, or when a level
 * is redesigned. Individual bad problems are fixed in the library directly.
 *
 * Run via: node scripts/build-library.mjs
 */
import { minus, signed } from '../../web/ui/dom.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/int-muldiv.js';
import * as T from '../terms.js';
const sym = (n) => (n < 0 ? '−' : '+');
/** The picture: sign and size, each answered separately. */
const model = (values, ops, answer) => ({
  kind: 'signmodel',
  terms: values.map((v) => ({ sign: sym(v), abs: Math.abs(v) })),
  ops,
  answer,
});
/** a × b, or a ÷ b. Division is always exact -- built from the answer up. */
function twoTerm(rng, level) {
  let a, b, op, answer;
  switch (level) {
    case 0: {                                   // one negative, small tables
      const x = rng.int(2, 9);
      const y = rng.int(2, 9);
      // A few with no negative at all, so the sign is a decision rather than
      // something every answer in the level has: when all of them came out
      // negative, writing a minus first was the whole lesson.
      [a, b] = rng.chance(0.2) ? [x, y] : rng.chance(0.5) ? [-x, y] : [x, -y];
      op = '×';
      break;
    }
    case 1: {                                   // both negative
      a = -rng.int(2, 9);
      b = -rng.int(2, 9);
      op = '×';
      break;
    }
    case 2: {                                   // exact division, mixed signs
      const quotient = rng.int(2, 9);
      const divisor = rng.int(2, 9);
      a = quotient * divisor;
      b = divisor;
      if (rng.chance(0.5)) a = -a;
      if (rng.chance(0.5)) b = -b;
      op = '÷';
      break;
    }
    default: {                                  // both operations, bigger
      op = rng.chance(0.5) ? '×' : '÷';
      if (op === '×') {
        a = rng.int(2, 12) * rng.sign();
        b = rng.int(2, 12) * rng.sign();
      } else {
        const quotient = rng.int(2, 12);
        const divisor = rng.int(2, 12);
        a = quotient * divisor * rng.sign();
        b = divisor * rng.sign();
      }
    }
  }
  answer = op === '×' ? a * b : a / b;
  return {
    prompt: T.asks(T.num(minus(a), 1), T.op(op), T.num(signed(b), 2)),
    text: `${minus(a)} ${op} ${signed(b)}`,
    answer: { type: 'int', value: answer },
    parSeconds: PAR_SECONDS[level],
    visual: model([a, b], [op], answer),
    explain: explainTwo(a, b, op, answer),
  };
}
function explainTwo(a, b, op, answer) {
  const A = Math.abs(a);
  const B = Math.abs(b);
  const size = `${A} ${op} ${B} = ${Math.abs(answer)}`;
  const negatives = [a, b].filter((v) => v < 0).length;
  if (negatives === 2) {
    return `Two negatives make a positive, so the answer is positive. ${size}, `
      + `so ${minus(a)} ${op} ${signed(b)} = ${answer}.`;
  }
  if (negatives === 1) {
    return `One negative makes the answer negative. ${size}, `
      + `so ${minus(a)} ${op} ${signed(b)} = ${minus(answer)}.`;
  }
  return `Both are positive, so the answer is too. ${size}.`;
}
/** Three at a time: a × b × c, or (a × b) ÷ c with c chosen to divide exactly. */
function chain(rng) {
  const useDivision = rng.chance(0.35);
  const values = [];
  let ops;
  let answer;
  if (useDivision) {
    const a = rng.int(2, 9) * rng.sign();
    const b = rng.int(2, 9) * rng.sign();
    const product = a * b;
    // Pick a divisor that divides the product exactly.
    const options = [];
    for (let d = 2; d <= 12; d++) if (product % d === 0) options.push(d);
    const c = (options.length ? rng.pick(options) : 1) * rng.sign();
    values.push(a, b, c);
    ops = ['×', '÷'];
    answer = product / c;
  } else {
    values.push(rng.int(2, 6) * rng.sign(), rng.int(2, 6) * rng.sign(), rng.int(2, 6) * rng.sign());
    ops = ['×', '×'];
    answer = values[0] * values[1] * values[2];
  }
  const [a, b, c] = values;
  const negatives = values.filter((v) => v < 0).length;
  return {
    prompt: T.asks(
      T.num(minus(a), 1),
      T.op(ops[0]), T.num(signed(b), 2),
      T.op(ops[1]), T.num(signed(c), 3)),
    text: `${minus(a)} ${ops[0]} ${signed(b)} ${ops[1]} ${signed(c)}`,
    answer: { type: 'int', value: answer },
    visual: model(values, ops, answer),
    explain: `Count the negatives: ${negatives === 0 ? 'there are none' : negatives === 1 ? 'there is one' : `there are ${negatives}`}, so the answer is `
      + `${negatives % 2 === 0 ? 'positive' : 'negative'}. `
      + `Ignoring signs, ${Math.abs(a)} ${ops[0]} ${Math.abs(b)} ${ops[1]} ${Math.abs(c)} `
      + `= ${Math.abs(answer)}, so the answer is ${minus(answer)}.`,
  };
}
/**
 * Where a negative product comes from, and where a negative quotient does.
 *
 * Multiplying gives the total of a loss repeated -- eight dollars owed to each
 * of five people is −40, and nobody has to be told the sign. Dividing shares
 * a known total change back out over equal steps, which is the reading of
 * −40 ÷ 5 that makes the answer obviously −8 rather than a rule about signs.
 *
 * Both are deliberately one-negative cases. Two negatives multiplied is a
 * genuinely awkward thing to put a situation to -- the honest examples are
 * contrived, and a contrived story is worse than none -- so Two Negatives
 * keeps its symbols and this level does not pretend otherwise.
 */
const REPEATS = [
  // The question asks for a change, so it says so: "the total owed" is $63
  // and the change to the balance is −$63, and asking for both at once left
  // a student who typed 63 marked wrong for answering the first.
  { who: 'Someone', each: (n) => `pays out $${n}`, over: (k) => `to each of ${k} people`,
    total: 'By how much does their balance change, in dollars?', unit: '$',
    share: (t, k) => `A balance changed by ${t.replace(/^(−?)/, '$1$$')} over ${k} equal payments. `
      + 'What was the change to the balance each time, in dollars?' },
  { who: 'The temperature', each: (n) => `falls ${n} degrees`,
    over: (k) => `each hour for ${k} hours`,
    total: 'What is the total change in temperature?', unit: '°',
    share: (t, k) => `The temperature changed by ${t}° over ${k} equal hours. `
      + 'What was the change each hour?' },
  // Height, not depth: depth counts downwards, so a diver going down has a
  // depth that grows, and "the change in depth is −20" was wrong as worded.
  { who: 'A diver', each: (n) => `descends ${n} m`,
    over: (k) => `each minute for ${k} minutes`,
    total: 'What is the total change in their height, in meters?', unit: 'm',
    share: (t, k) => `A diver's height changed by ${t} m over ${k} equal minutes. `
      + 'What was the change each minute?' },
];

function owingAndFalling(rng) {
  const s = rng.pick(REPEATS);
  const each = rng.int(2, 12);
  const k = rng.int(2, 9);
  const total = -each * k;
  const dividing = rng.chance(0.4);

  if (dividing) {
    return {
      prompt: [T.prose(s.share(minus(total), k))],
      text: `${minus(total)} shared over ${k}`,
      answer: { type: 'int', value: -each },
      visual: model([total, k], ['÷'], -each),
      explain: `${minus(total)} ÷ ${k} = ${minus(-each)}. A negative shared into `
        + `${k} equal parts gives ${k} equal negative parts — the sign is not a rule `
        + 'here, it is what "going down" means.',
    };
  }
  return {
    prompt: [T.prose(`${s.who} ${s.each(each)} ${s.over(k)}. ${s.total}`)],
    text: `${each} ${s.unit} down, ${k} times`,
    answer: { type: 'int', value: total },
    visual: model([-each, k], ['×'], total),
    explain: `A loss of ${each} repeated ${k} times is ${minus(-each)} × ${k} = `
      + `${minus(total)}. One negative in the multiplication, so the answer is negative — `
      + 'and going down again and again could hardly come out positive.',
  };
}

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */

  /** @param {import('../engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  // Level 4 is Owing and Falling, level 5 is Chains.
  const build = (lv) => (lv === 4 ? owingAndFalling(rng)
    : lv === 5 ? chain(rng)
    : twoTerm(rng, lv));
  const problem = build(level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level);
  problem.parSeconds = PAR_SECONDS[level];
  return problem;
}
