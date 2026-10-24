/**
 * Catalogue authoring tool: builds the problem library for writing equations.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 *
 * Every problem's `text` is the equation or inequality the situation makes,
 * in plain ASCII, so scripts/check-answers.py can substitute the answer back
 * in and see that it balances.
 */
import * as T from '../terms.js';
import { minus } from '../../web/ui/dom.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/word-equations.js';

const tm = (s) => s.replace(/-/g, '−');
const plus = (c) => (c < 0 ? ` - ${-c}` : ` + ${c}`);
const money = (n) => `$${n}`;
/** "an $8 fee", "a $9 fee": the article goes by how the number is said. */
const an = (n) => (/^(8|11|18|8\d)$/.test(String(n)) ? 'an' : 'a');

/**
 * Number puzzles. The number may be negative, and the result too: "I think
 * of a number" never promised a positive one, and a puzzle is the cleanest
 * place to find that out.
 *
 * A third of them add first and multiply second, which needs a bracket:
 * the order things were done in is the order the equation has to keep.
 */
function puzzle(rng) {
  const n = rng.nonZero(-12, 20);
  const a = rng.int(2, 9);
  const b = rng.int(1, 20);
  if (rng.chance(1 / 3)) {
    const result = a * (n + b);
    const eq = `${a}(n + ${b}) = ${result}`;
    return {
      prompt: [T.prose(`I think of a number, add ${b}, then multiply by ${a}. The answer is ${minus(result)}. `
        + 'What was my number?')],
      text: eq,
      answer: { type: 'int', value: n },
      visual: null,
      explain: `Call the number n. Adding ${b} gives n + ${b}, and it is all of that which is multiplied by ${a}, `
        + `so it needs a bracket: ${tm(eq)}. Divide both sides by ${a}: n + ${b} = ${minus(n + b)}. `
        + `Subtract ${b}: n = ${minus(n)}.`,
    };
  }
  const sub = rng.chance(0.5);
  const result = sub ? a * n - b : a * n + b;
  const said = sub ? `multiply it by ${a}, then subtract ${b}` : `multiply it by ${a}, then add ${b}`;
  const eq = `${a}n${sub ? ` - ${b}` : ` + ${b}`} = ${result}`;
  const undo = sub ? `Add ${b} to` : `Subtract ${b} from`;
  const mid = sub ? result + b : result - b;
  return {
    prompt: [T.prose(`I think of a number, ${said}. The answer is ${minus(result)}. What was my number?`)],
    text: eq,
    answer: { type: 'int', value: n },
    visual: null,
    explain: `Call the number n. Multiplying by ${a} gives ${a}n, and ${sub ? `subtracting ${b}` : `adding ${b}`} `
      + `gives ${tm(eq.split(' = ')[0])}, which is ${minus(result)}: ${tm(eq)}. ${undo} both sides: `
      + `${a}n = ${minus(mid)}. Divide by ${a}: n = ${minus(n)}.`,
  };
}

/**
 * Which equation. Each situation comes with the misreadings that matter:
 * the rate and the fixed charge swapped, the bracket in the wrong place,
 * the "more than" reversed.
 */
const STORIES = [
  (rng) => {
    const fixed = rng.int(2, 9); let rate = rng.int(2, 9);
    while (rate === fixed) rate = rng.int(2, 9);
    const total = fixed + rate * rng.int(3, 12);
    return { story: `A taxi charges ${money(fixed)} plus ${money(rate)} for every mile. A ride costs `
      + `${money(total)}. Which equation gives the number of miles, m?`,
    right: `${fixed} + ${rate}m = ${total}`, wrong: [`${rate} + ${fixed}m = ${total}`, `${fixed + rate}m = ${total}`],
    why: `${money(rate)} for each of m miles is ${rate}m, and the ${money(fixed)} is charged once: ${fixed} + ${rate}m = ${total}.` };
  },
  (rng) => {
    const d = rng.int(2, 9), total = 2 * rng.int(8, 30) + d;
    return { story: `Two numbers add up to ${total}. One is ${d} more than the other. Which equation gives `
      + 'the smaller number, n?', right: `n + (n + ${d}) = ${total}`,
    wrong: [`n + ${d} = ${total}`, `n + (n - ${d}) = ${total}`],
    why: `The smaller is n, so the larger is n + ${d}, and together they make ${total}: n + (n + ${d}) = ${total}.` };
  },
  (rng) => {
    const k = rng.int(2, 6), add = rng.int(2, 12), n = rng.int(1, 12);
    const times = ['Twice', 'Three times', 'Four times', 'Five times', 'Six times'][k - 2];
    return { story: `${times} the sum of a number and ${add} is ${k * (n + add)}. Which equation says that?`,
      right: `${k}(n + ${add}) = ${k * (n + add)}`,
      wrong: [`${k}n + ${add} = ${k * (n + add)}`, `n + ${k * add} = ${k * (n + add)}`],
      why: `"The sum of a number and ${add}" is n + ${add}, and the whole sum is multiplied, so it needs a `
        + `bracket: ${k}(n + ${add}) = ${k * (n + add)}.` };
  },
  (rng) => {
    let w = rng.int(2, 12);
    const more = rng.int(1, 9);
    // Never where the area equals the perimeter (3 by 6 is 18 both ways):
    // there the area equation balances too, and two options are right.
    while (w * (w + more) === 2 * w + 2 * (w + more)) w = rng.int(2, 12);
    const p = 2 * w + 2 * (w + more);
    // requiem: catalogue/content/units-both-systems
    const u = rng.pick(['cm', 'inches']);
    return { story: `A rectangle is ${more} ${more === 1 && u === 'inches' ? 'inch' : u} longer than it is wide, and its perimeter is ${p} ${u}. Which `
      + 'equation gives the width, w?', right: `2w + 2(w + ${more}) = ${p}`,
    wrong: [`w(w + ${more}) = ${p}`, `w + (w + ${more}) = ${p}`],
    why: `The length is w + ${more}. A perimeter goes round all four sides, two widths and two lengths: `
      + `2w + 2(w + ${more}) = ${p}. w(w + ${more}) would be its area.` };
  },
  (rng) => {
    const start = rng.int(20, 80), save = rng.int(3, 15), goal = start + save * rng.int(3, 15);
    return { story: `Sam has ${money(start)} and saves ${money(save)} a week. Which equation gives the number `
      + `of weeks, t, until Sam has ${money(goal)}?`, right: `${start} + ${save}t = ${goal}`,
    wrong: [`${save} + ${start}t = ${goal}`, `${start}t + ${save} = ${goal}`],
    why: `${money(save)} a week for t weeks is ${save}t, added to the ${money(start)} already there: `
      + `${start} + ${save}t = ${goal}.` };
  },
  (rng) => {
    const less = rng.int(2, 9), n = rng.int(less + 1, 20), k = rng.int(2, 5);
    return { story: `${less} less than ${k} times a number is ${k * n - less}. Which equation says that?`,
      right: `${k}n - ${less} = ${k * n - less}`,
      wrong: [`${less} - ${k}n = ${k * n - less}`, `${k}(n - ${less}) = ${k * n - less}`],
      why: `"${less} less than ${k} times a number" starts from ${k}n and takes ${less} away: `
        + `${k}n − ${less} = ${k * n - less}.` };
  },
];

function whichEquation(rng) {
  const s = rng.pick(STORIES)(rng);
  // Shuffled by the draw. Sorted shortest first, the right one sat second or
  // third in four rows of five, and its length was a clue.
  const options = rng.shuffle([s.right, ...s.wrong]).map((e) => ({ id: e, label: tm(e) }));
  return {
    prompt: [T.prose(s.story)],
    text: `equation for: ${s.story}`,
    answer: { type: 'choice', value: s.right, options },
    visual: null,
    explain: s.why,
  };
}

/**
 * A fixed amount and an amount for each. The answer is the count; the
 * explanation writes the equation first, since that is the skill, and the
 * solving second.
 */
const RATES = [
  { setup: (f, r) => `A taxi charges ${money(f)} plus ${money(r)} per mile.`,
    total: (t) => `A ride costs ${money(t)}.`, ask: 'How many miles was it?', letter: 'n', unit: 'miles' },
  { setup: (f, r) => `A gym costs ${money(f)} to join and ${money(r)} a month.`,
    total: (t) => `So far it has cost ${money(t)}.`, ask: 'How many months is that?', letter: 'n', unit: 'months' },
  { setup: (f, r) => `A plumber charges ${an(f)} ${money(f)} call-out fee plus ${money(r)} an hour.`,
    total: (t) => `The bill is ${money(t)}.`, ask: 'How many hours did the job take?', letter: 't', unit: 'hours' },
  { setup: (f, r) => `A candle starts ${f} cm tall and burns down ${r} cm every hour.`,
    total: (t) => `It is now ${t} cm tall.`, ask: 'How many hours has it burned?', letter: 't', unit: 'hours',
    falling: true },
  { setup: (f, r) => `A tank starts with ${(f * 10).toLocaleString('en-US')} liters and drains ${r * 5} liters a minute.`,
    total: (t) => `It now holds ${t.toLocaleString('en-US')} liters.`, ask: 'For how many minutes has it drained?', letter: 't',
    unit: 'minutes', falling: true, scale: [10, 5] },
  // requiem: catalogue/content/units-both-systems
  // A pool pump moves tens of gallons a minute, and a pool holds thousands.
  { setup: (f, r) => `A pool starts with ${(f * 10).toLocaleString('en-US')} gallons and drains ${r * 5} gallons a minute.`,
    total: (t) => `It now holds ${t.toLocaleString('en-US')} gallons.`, ask: 'For how many minutes has it drained?', letter: 't',
    unit: 'minutes', falling: true, scale: [10, 5] },
];

function fixedPlusRate(rng) {
  const s = rng.pick(RATES);
  const count = rng.int(2, 15);
  let fixed = rng.int(2, 30), rate = rng.int(2, 12);
  const [fs, rs] = s.scale ?? [1, 1];
  if (s.falling) fixed = rate * count + rng.int(1, 20);  // never burns or drains past empty
  const F = fixed * fs, R = rate * rs;
  const total = s.falling ? F - R * count : F + R * count;
  if (total <= 0) return fixedPlusRate(rng);
  const v = s.letter;
  const eq = `${F}${s.falling ? ` - ${R}${v}` : ` + ${R}${v}`} = ${total}`;
  return {
    prompt: [T.prose(`${s.setup(fixed, rate)} ${s.total(total)} ${s.ask}`)],
    text: eq,
    answer: { type: 'int', value: count },
    visual: null,
    explain: `Call the number of ${s.unit} ${v}. ${s.falling ? 'Losing' : 'Adding'} ${R} for each one is `
      + `${R}${v}, ${s.falling ? 'taken from' : 'on top of'} the ${F}: ${tm(eq)}. `
      + `${s.falling ? `Take ${total} from ${F}` : `Take ${F} off both sides`}: ${R}${v} = ${Math.abs(total - F)}. `
      + `Divide by ${R}: ${v} = ${count}.`,
  };
}

/** Pieces of a whole, each written in terms of the one unknown. */
function parts(rng) {
  const shape = rng.pick(['rectangle', 'two', 'consecutive', 'share']);
  if (shape === 'rectangle') {
    const w = rng.int(2, 25), more = rng.int(1, 12);
    const p = 2 * w + 2 * (w + more);
    const eq = `2x + 2(x + ${more}) = ${p}`;
    // requiem: catalogue/content/units-both-systems
    const u = rng.pick(['cm', 'inches']);
    return {
      prompt: [T.prose(`A rectangle is ${more} ${more === 1 && u === 'inches' ? 'inch' : u} longer than it is wide. Its perimeter is ${p} ${u}. How wide is it?`)],
      text: eq, answer: { type: 'int', value: w }, visual: null,
      explain: `Call the width x, so the length is x + ${more}. Round all four sides: ${tm(eq)}. `
        + `That is 4x + ${2 * more} = ${p}, so 4x = ${p - 2 * more} and x = ${w}.`,
    };
  }
  if (shape === 'two') {
    const small = rng.int(-10, 40), d = rng.int(2, 15);
    const total = 2 * small + d;
    const eq = `x + (x + ${d}) = ${total}`;
    return {
      prompt: [T.prose(`Two numbers add up to ${minus(total)}. One is ${d} more than the other. What is the smaller number?`)],
      text: eq, answer: { type: 'int', value: small }, visual: null,
      explain: `Call the smaller x, so the larger is x + ${d}: ${tm(eq)}. That is 2x + ${d} = ${minus(total)}, `
        + `so 2x = ${minus(total - d)} and x = ${minus(small)}.`,
    };
  }
  if (shape === 'consecutive') {
    const k = rng.pick([2, 3, 3, 4]);
    const first = rng.int(-15, 40);
    const sum = k * first + (k * (k - 1)) / 2;
    const pieces = Array.from({ length: k }, (_, i) => (i === 0 ? 'x' : `(x + ${i})`));
    const eq = `${pieces.join(' + ')} = ${sum}`;
    return {
      prompt: [T.prose(`${['', '', 'Two', 'Three', 'Four'][k]} integers in a row add up to ${minus(sum)}. `
        + `What is the ${k === 2 ? 'smaller' : 'smallest'}?`)],
      text: eq, answer: { type: 'int', value: first }, visual: null,
      explain: `Call the ${k === 2 ? 'smaller' : 'smallest'} x. The next ${k === 2 ? 'is' : 'are'} ${pieces.slice(1).join(', ')
        .replace(/[()]/g, '')}: ${tm(eq)}. That is ${k}x + ${(k * (k - 1)) / 2} = ${minus(sum)}, so `
        + `${k}x = ${minus(sum - (k * (k - 1)) / 2)} and x = ${minus(first)}.`,
    };
  }
  // A share where one person gets a multiple of another's.
  const each = rng.int(2, 30), k = rng.int(2, 5);
  const total = each * (k + 1);
  const eq = `x + ${k}x = ${total}`;
  return {
    prompt: [T.prose(`${money(total)} is shared so that Kai gets ${['', '', 'twice', 'three times', 'four times', 'five times'][k]} `
      + 'as much as Ana. How much does Ana get?')],
    text: eq, answer: { type: 'int', value: each }, visual: null,
    explain: `Call Ana's share x, so Kai's is ${k}x, and together they make ${total}: ${eq}. `
      + `That is ${k + 1}x = ${total}, so x = ${each}. Ana gets ${money(each)}.`,
  };
}

/** Two quantities changing at different rates: when are they equal? */
function twoEqual(rng) {
  const shape = rng.pick(['plans', 'savers', 'tanks']);
  const when = rng.int(2, 15);
  if (shape === 'plans') {
    const rateB = rng.int(4, 15), rateA = rng.int(1, rateB - 1);
    const fee = (rateB - rateA) * when;
    const eq = `${fee} + ${rateA}t = ${rateB}t`;
    return {
      prompt: [T.prose(`Plan A costs ${money(fee)} up front and ${money(rateA)} an hour. Plan B costs `
        + `${money(rateB)} an hour and nothing up front. After how many hours do they cost the same?`)],
      text: eq, answer: { type: 'int', value: when }, visual: null,
      explain: `After t hours Plan A costs ${fee} + ${rateA}t and Plan B costs ${rateB}t. The same means equal: `
        + `${eq}. Take ${rateA}t off both sides: ${fee} = ${rateB - rateA}t, so t = ${when}.`,
    };
  }
  if (shape === 'savers') {
    const slow = rng.int(2, 10), fast = slow + rng.int(1, 8);
    const behind = rng.int(0, 30);
    const ahead = behind + (fast - slow) * when;
    const eq = `${ahead} + ${slow}t = ${behind} + ${fast}t`;
    return {
      prompt: [T.prose(`Ana has ${money(ahead)} and saves ${money(slow)} a week. Ben has ${money(behind)} and saves `
        + `${money(fast)} a week. After how many weeks will they have the same?`)],
      text: eq, answer: { type: 'int', value: when }, visual: null,
      explain: `After t weeks Ana has ${ahead} + ${slow}t and Ben has ${behind} + ${fast}t. Set them equal: ${eq}. `
        + `Gather the t's where there are more: ${ahead - behind} = ${fast - slow}t, so t = ${when}.`,
    };
  }
  const fill = rng.int(3, 12), drain = rng.int(2, 10);
  const startB = rng.int(10, 60) * 5;
  const startA = startB - (fill + drain) * when;
  // Ten liters or more: "holds 0 liters" is an empty tank, and "1 liters" is not English.
  if (startA < 10) return twoEqual(rng);
  const eq = `${startA} + ${fill}t = ${startB} - ${drain}t`;
  // requiem: catalogue/content/units-both-systems
  const u = rng.pick(['liters', 'gallons']);
  return {
    prompt: [T.prose(`Tank A holds ${startA} ${u} and is filling at ${fill} ${u} a minute. Tank B holds `
      + `${startB} ${u} and is draining at ${drain} ${u} a minute. After how many minutes do they hold the same?`)],
    text: eq, answer: { type: 'int', value: when }, visual: null,
    explain: `After t minutes A holds ${startA} + ${fill}t and B holds ${startB} − ${drain}t. Set them equal: `
      + `${tm(eq)}. Add ${drain}t and take ${startA} from both sides: ${fill + drain}t = ${startB - startA}, `
      + `so t = ${when}.`,
  };
}

/**
 * At least, at most. The boundary is usually not whole, so the rounding is
 * a real decision -- and the words make it: the fewest weeks to reach at
 * least a target rounds up, the most boxes a lift can take rounds down.
 *
 * A quarter come out exactly, and there "at least" and "at most" include the
 * boundary itself: if every row needed rounding, a student could round
 * without ever reading whether equal counts.
 */
function atLeastAtMost(rng) {
  const most = rng.chance(0.5);
  const exact = rng.chance(0.25);
  if (!most) {
    const start = rng.int(5, 60), save = rng.int(4, 25);
    const goal = start + save * rng.int(3, 20) + (exact ? 0 : rng.int(1, save - 1));
    const weeks = Math.ceil((goal - start) / save);
    const ineq = `${start} + ${save}t ≥ ${goal}`;
    return {
      prompt: [T.prose(`Mia has ${money(start)} and saves ${money(save)} a week. What is the fewest number of `
        + `whole weeks until she has at least ${money(goal)}?`)],
      text: `${ineq}, smallest`, answer: { type: 'int', value: weeks }, visual: null,
      explain: `"At least ${money(goal)}" is ${ineq}. So ${save}t ≥ ${goal - start}, and t ≥ `
        + (exact
          ? `${goal - start} ÷ ${save} = ${weeks} exactly. After ${weeks} weeks she has exactly ${money(goal)}, `
            + `and "at least" includes exactly, so the fewest whole weeks is ${weeks}.`
          : `${goal - start} ÷ ${save}, which is between ${weeks - 1} and ${weeks}. After ${weeks - 1} weeks she is `
            + `still short, so the fewest whole weeks is ${weeks}.`),
    };
  }
  // requiem: catalogue/content/units-both-systems
  // In kilograms or pounds, the pound loads about twice the kilogram ones,
  // so a US elevator's limit lands near the 2,500 lb on its plate.
  const u = rng.pick(['kg', 'lb']);
  const already = u === 'kg' ? rng.int(50, 150) : rng.int(100, 300);
  const box = u === 'kg' ? rng.int(15, 60) : rng.int(30, 120);
  const limit = already + box * rng.int(3, 20) + (exact ? 0 : rng.int(1, box - 1));
  const boxes = Math.floor((limit - already) / box);
  const ineq = `${already} + ${box}n ≤ ${limit}`;
  const lim = limit.toLocaleString('en-US');
  return {
    prompt: [T.prose(`An elevator can carry at most ${lim} ${u}. A ${already} ${u} cart is already in it. Each box `
      + `weighs ${box} ${u}. What is the greatest number of boxes it can take?`)],
    text: `${ineq}, largest`, answer: { type: 'int', value: boxes }, visual: null,
    explain: `"At most ${lim} ${u}" is ${ineq}. So ${box}n ≤ ${limit - already}, and n ≤ `
      + (exact
        ? `${limit - already} ÷ ${box} = ${boxes} exactly. With ${boxes} boxes the elevator carries exactly ${lim} ${u}, `
          + `and "at most" includes exactly, so it can take ${boxes}.`
        : `${limit - already} ÷ ${box}, which is between ${boxes} and ${boxes + 1}. One more box would be over `
          + `the limit, so the most it can take is ${boxes}.`),
  };
}

const CONTENT = [puzzle, whichEquation, fixedPlusRate, parts, twoEqual, atLeastAtMost];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  // The mixed level deals from every level. Which Equation is the one choice
  // among them, and it is asked as a choice of equations, so its buttons
  // say nothing about the answer that the question does not.
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
