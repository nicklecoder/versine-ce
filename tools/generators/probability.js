/**
 * Catalogue authoring tool: builds the problem library for probability.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 *
 * Every `text` lists the equally likely outcomes and names the event by a
 * code (`even`, `gt 4`, `is red`), or gives the probability itself, so that
 * scripts/check-answers.py can count again with its own definitions. Sample
 * spaces of dice and coins are named, and the checker lists them out itself.
 */
import * as T from '../terms.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/probability.js';
import { reduce, fracAnswer, fracText, fracWork, source, outcomesText } from './chance.js';

const LETTERS = ['a', 'b', 'c', 'd', 'e'];
const decimal = (v) => { for (let d = 1; d <= 1000; d *= 10) { const n = Math.round(v * d); if (Math.abs(n - v * d) < 1e-9) return { n, d }; } throw new Error(String(v)); };
const num = (v) => ({ type: 'decimal', value: decimal(v) });
const said = (v) => String(Math.round(v * 1e6) / 1e6).replace('-', '−');
const count = (S, E) => S.outcomes.filter(E.test).length;

// ── Likelihood ──────────────────────────────────────────────────────────

const LIKELY = [
  { id: 'impossible', label: 'Impossible' }, { id: 'unlikely', label: 'Unlikely' },
  { id: 'even', label: 'As likely as not' }, { id: 'likely', label: 'Likely' }, { id: 'certain', label: 'Certain' },
];
const RAIN = ['rain tomorrow', 'snow on Saturday', 'the bus running late', 'a thunderstorm this afternoon',
  'a power outage tonight', 'the ferry being canceled', 'a school snow day on Monday', 'the home team winning'];

// requiem: catalogue/content/likelihood-quarter-bands
// Unlikely is below 1/4 and likely above 3/4, strictly, so "closer to 0
// than to 1/2" (or to 1 than to 1/2) is true of every probability asked.
function likelihood(rng) {
  const kind = rng.pick(['impossible', 'unlikely', 'unlikely', 'even', 'likely', 'likely', 'certain']);
  let n, d, shown;
  for (;;) {
    d = rng.pick([5, 8, 10, 12, 20, 25, 50, 100]);
    n = { impossible: 0, certain: d, even: d / 2, unlikely: rng.int(1, Math.ceil(d / 4) - 1), likely: rng.int(Math.floor((3 * d) / 4) + 1, d - 1) }[kind];
    if (Number.isInteger(n) && n >= 0 && (kind !== 'unlikely' || 4 * n < d) && (kind !== 'likely' || 4 * n > 3 * d)) break;
  }
  let form = rng.pick(['fraction', 'decimal', 'percent', 'bag']);
  let prompt;
  if (form === 'bag' && !(['unlikely', 'likely'].includes(kind) && d <= 20)) form = 'fraction';
  if (form === 'bag') {
    const colors = rng.shuffle(['red', 'blue', 'green', 'yellow']);
    prompt = `A bag holds ${n} ${colors[0]} and ${d - n} ${colors[1]} marbles. One is picked at random. How likely is it to be ${colors[0]}?`;
    shown = `${n} of the ${d} marbles are ${colors[0]}: a probability of ${fracWork(n, d)}`;
  } else {
    const what = rng.pick(RAIN);
    const p = form === 'percent' ? `${said((100 * n) / d)}%` : form === 'decimal' ? said(n / d) : fracText(n, d);
    prompt = `The probability of ${what} is ${p}. How likely is it?`;
    shown = `The probability is ${p}${form === 'fraction' || p === fracText(n, d) ? '' : `, which is ${fracText(n, d)}`}`;
  }
  return {
    prompt: [T.prose(prompt)],
    text: `likelihood: ${n}/${d} as ${form}`,
    answer: { type: 'choice', value: kind, options: LIKELY },
    visual: null,
    explain: `${shown}. On the scale from 0 (impossible) to 1 (certain), `
      + { impossible: 'it is 0: it cannot happen.', certain: 'it is 1: it must happen.', even: 'it is exactly 1/2, halfway: as likely to happen as not.',
        unlikely: 'it is below 1/4, so closer to 0 than to 1/2.', likely: 'it is above 3/4, so closer to 1 than to 1/2.' }[kind]
      + ` (${kind === 'unlikely' ? 'Unlikely is not impossible: it can still happen.' : kind === 'likely' ? 'Likely is not certain: it can still fail to happen.' : 'Only 0 and 1 are the ends; everything else might go either way.'}) `
      + `So ${LIKELY.find((o) => o.id === kind).label.toLowerCase()}.`,
  };
}

// ── Single event ────────────────────────────────────────────────────────

function singleEvent(rng) {
  const S = source(rng);
  const E = S.event();
  const k = count(S, E), N = S.outcomes.length;
  if (k === 0 || k === N) return singleEvent(rng);
  return {
    prompt: [T.prose(`${S.what} What is the probability of ${S.verb} ${E.words}?`)],
    text: `single: ${outcomesText(S)}; event ${E.code}`,
    answer: fracAnswer(k, N),
    visual: null,
    explain: `There are ${N} equally likely outcomes, and ${k} of them ${k === 1 ? 'gives' : 'give'} ${E.words}${S.numbers && k <= 8 ? `: ${S.outcomes.filter(E.test).join(', ')}` : ''}. `
      + `P = ${fracWork(k, N)}. (The whole is all ${N} outcomes, not the ${N - k} that are not wanted: ${k} to ${N - k} is odds, not a probability.) So ${fracText(k, N)}.`,
  };
}

// ── Complement ──────────────────────────────────────────────────────────

const HAPPENS = ['it rains tomorrow', 'a flight leaves on time', 'a seed sprouts', 'a free throw goes in', 'a light bulb lasts a year'];
const NOT = { 'it rains tomorrow': 'it does not rain tomorrow', 'a flight leaves on time': 'the flight does not leave on time',
  'a seed sprouts': 'the seed does not sprout', 'a free throw goes in': 'the free throw misses', 'a light bulb lasts a year': 'the bulb does not last a year' };

function complement(rng) {
  if (rng.chance(0.4)) {
    const S = source(rng);
    const E = S.event();
    const k = count(S, E), N = S.outcomes.length;
    if (k === 0 || k === N) return complement(rng);
    return {
      prompt: [T.prose(`${S.what} What is the probability of not ${S.verb} ${E.words}?`)],
      text: `complement: ${outcomesText(S)}; event ${E.code}`,
      answer: fracAnswer(N - k, N),
      visual: null,
      explain: `P(${E.words}) = ${fracWork(k, N)}, and the outcomes that are not ${E.words} are all the rest: 1 − ${fracText(k, N)} = ${fracText(N - k, N)}. `
        + `(Counting the ${N - k} that are not wanted, out of ${N}, gives the same.) So ${fracText(N - k, N)}.`,
    };
  }
  const what = rng.pick(HAPPENS);
  const form = rng.pick(['fraction', 'decimal', 'percent']);
  if (form === 'fraction') {
    const d = rng.pick([3, 4, 5, 6, 8, 9, 10, 12, 15, 20]), n = rng.int(1, d - 1);
    if (reduce(n, d).d !== d) return complement(rng);
    return {
      prompt: [T.prose(`The probability that ${what} is ${n}/${d}. What is the probability that ${NOT[what]}?`)],
      text: `complement: ${n}/${d}`,
      answer: fracAnswer(d - n, d),
      visual: null,
      explain: `It either happens or it does not, so the two probabilities add to 1: 1 − ${n}/${d} = ${d}/${d} − ${n}/${d} = ${fracText(d - n, d)}. `
        + `(1 is ${d}/${d}, not ${d}/1, when taking ${n}/${d} away.) So ${fracText(d - n, d)}.`,
    };
  }
  const pct = form === 'percent' ? rng.int(1, 99) : rng.int(1, 99);
  const given = form === 'percent' ? `${pct}%` : said(pct / 100);
  const ans = form === 'percent' ? 100 - pct : (100 - pct) / 100;
  return {
    prompt: [T.prose(`The probability that ${what} is ${given}. What is the probability that ${NOT[what]}${form === 'percent' ? ', as a percent' : ', as a decimal'}?`)],
    text: `complement: ${form === 'percent' ? `${pct}%` : said(pct / 100)}`,
    answer: { ...num(ans), ...(form === 'percent' ? { percent: true } : {}) },
    visual: null,
    explain: form === 'percent'
      ? `It either happens or it does not, so the two add to 100%: 100% − ${pct}% = ${100 - pct}%. (The answer is a percent too, not ${said((100 - pct) / 100)}.) So ${100 - pct}%.`
      : `It either happens or it does not, so the two add to 1: 1 − ${given} = ${said(ans)}. (Subtract from 1, not from 100.) So ${said(ans)}.`,
  };
}

// ── Sample spaces ───────────────────────────────────────────────────────

const STAGES = [
  ['a coin is flipped', 2], ['a number cube is rolled', 6], ['a spinner with 4 equal sections is spun', 4],
  ['a spinner with 3 equal sections is spun', 3], ['a letter is picked from A, B, C, D and E', 5],
];
const OUTFITS = [['shirts', 'pairs of pants'], ['sandwiches', 'drinks'], ['flavors of ice cream', 'toppings'], ['routes to the park', 'routes home']];

// requiem: catalogue/content/sample-spaces-list-outcomes
// Steps whose outcomes are listed, one character each, so an outcome of
// several steps is written as its characters in order: H3 is heads, then a 3.
const STEPS = {
  coin: { said: 'a coin is flipped', out: ['H', 'T'] },
  spin3: { said: 'a spinner with 3 equal sections, A, B and C, is spun', out: ['A', 'B', 'C'] },
  spin4: { said: 'a spinner with 4 equal sections, numbered 1 to 4, is spun', out: ['1', '2', '3', '4'] },
  cube: { said: 'a number cube is rolled', out: ['1', '2', '3', '4', '5', '6'] },
};
// Two or three steps, with no two numbered steps side by side, so every outcome reads one way.
const SPACES = [['coin', 'coin'], ['coin', 'spin3'], ['coin', 'spin4'], ['coin', 'cube'], ['spin3', 'coin'], ['spin3', 'spin3'],
  ['spin3', 'spin4'], ['spin4', 'coin'], ['spin4', 'spin3'], ['cube', 'coin'], ['coin', 'coin', 'coin']];
/** Every outcome of the steps, in the order a careful list would give them. */
const outcomesOf = (steps) => steps.reduce((acc, s) => acc.flatMap((a) => STEPS[s].out.map((o) => a + o)), ['']);
const spaceText = (steps) => steps.map((s) => STEPS[s].out.join(' ')).join(' x ');
/** "First a coin is flipped, then a number cube is rolled." */
function stepsSaid(steps) {
  const said = steps.map((s) => STEPS[s].said);
  const allCoins = steps.every((s) => s === 'coin');
  if (allCoins) return `A coin is flipped ${steps.length === 2 ? 'twice' : `${steps.length} times`}.`;
  return `First ${said[0]}, then ${said[1]}.`;
}
/** How an outcome is read, shown on one: "HB means heads, then B". */
function keyOf(steps) {
  const o = outcomesOf(steps)[1];
  const word = (c, s) => (s === 'coin' ? (c === 'H' ? 'heads' : 'tails') : s === 'cube' ? `a ${c}` : c);
  return `${o} means ${o.split('').map((c, i) => word(c, steps[i])).join(', then ')}`;
}

function listSpace(rng) {
  const steps = rng.pick(SPACES.filter((s) => outcomesOf(s).length <= 9));
  const all = outcomesOf(steps);
  const same = steps.length === 2 && steps[0] === steps[1];
  // requiem: catalogue/content/decoys-cross-two-slips
  // Two slips crossed: the full list, each slip alone, and both together.
  // Each wrong list once had one slip and nothing else, which left the whole
  // list as the one nearest all the others. Slip A takes one order only (HT
  // kept, TH dropped) or, for two different steps, only the outcomes that
  // start with the first step's first outcome; slip B writes one outcome
  // twice in place of the next. B touches outcomes A keeps,
  // so A and B together is a list with both slips.
  const sliceA = same || steps.length === 3
    ? (l) => l.filter((o) => o.split('').join('') === o.split('').sort().join(''))
    : (l) => l.filter((o) => o.startsWith(STEPS[steps[0]].out[0]));
  const kept = sliceA(all);
  // A neighbour pair both kept by A: the first written again where the
  // second goes. (Leaving one out instead would make the whole list the
  // longest option every time; the level's other question asks for the
  // missing one.)
  const pairs = kept.slice(0, -1).map((o, i) => [o, kept[i + 1]]);
  const [first, second] = rng.pick(pairs);
  const sliceB = (l) => l.map((o) => (o === second ? first : o));
  const lists = rng.shuffle([all, sliceA(all), sliceB(all), sliceB(sliceA(all))]);
  const opts = lists.map((l, i) => ({ id: LETTERS[i], l, label: l.join(', ') }));
  const want = opts.find((o) => o.l === all).id;
  const sizes = steps.map((s) => STEPS[s].out.length);
  return {
    prompt: [T.prose(`${stepsSaid(steps)} Which list is the sample space? (${keyOf(steps)}.)`)],
    text: `sample list: ${spaceText(steps)}; options ${opts.map((o) => `${o.id}=${o.l.join(' ')}`).join(', ')}`,
    answer: { type: 'choice', value: want, options: opts.map(({ id, label }) => ({ id, label })) },
    visual: null,
    explain: `Each of the ${sizes[0]} first outcomes goes with every ${steps.length === 3 ? 'outcome of the other two flips' : `one of the ${sizes[1]} second outcomes`}, so the sample space has ${sizes.join(' × ')} = ${all.length} outcomes, each once: ${all.join(', ')}. `
      + `(${same || steps.length === 3 ? `${all[1]} and ${all[1].split('').reverse().join('')} are different outcomes: the order of the steps is part of the outcome.` : `A list of only the outcomes that start with ${STEPS[steps[0]].out[0]}, or one that repeats an outcome in place of another, is not the sample space.`}) So ${all.join(', ')}.`,
  };
}

function missingOutcome(rng) {
  const steps = rng.pick(SPACES.filter((s) => outcomesOf(s).length >= 6));
  const all = outcomesOf(steps);
  const k = rng.int(0, all.length - 1), gone = all[k];
  const listed = all.filter((_, i) => i !== k);
  const name = rng.pick(['Maya', 'Leo', 'Priya', 'Sam', 'Ana', 'Jon']);
  const opts = rng.shuffle([gone, ...rng.shuffle(listed).slice(0, 3)]).map((o, i) => ({ id: LETTERS[i], o, label: o }));
  const want = opts.find((o) => o.o === gone).id;
  return {
    prompt: [T.prose(`${stepsSaid(steps)} ${name} lists the outcomes (${keyOf(steps)}): ${listed.join(', ')}. Which outcome is missing?`)],
    text: `sample missing: ${spaceText(steps)}; listed ${listed.join(' ')}; options ${opts.map((o) => `${o.id}=${o.o}`).join(', ')}`,
    answer: { type: 'choice', value: want, options: opts.map(({ id, label }) => ({ id, label })) },
    visual: null,
    explain: `There should be ${steps.map((s) => STEPS[s].out.length).join(' × ')} = ${all.length} outcomes, and ${listed.length} are listed. The full list, in order, is `
      + `${STEPS[steps[0]].out.map((o) => all.filter((x) => x.startsWith(o)).join(', ')).join('; ')}. Only ${gone} is not in ${name}'s. `
      + `(The other choices are already in the list.) So ${gone}.`,
  };
}

function sampleSpaces(rng) {
  const mode = rng.pick(['list', 'list', 'list', 'missing', 'missing', 'dice', 'coins', 'size']);
  if (mode === 'list') return listSpace(rng);
  if (mode === 'missing') return missingOutcome(rng);
  if (mode === 'size') {
    if (rng.chance(0.25)) {
      // Three steps: an outfit with shoes too.
      const m = rng.int(2, 6), n = rng.int(2, 6), k = rng.int(2, 5);
      return {
        prompt: [T.prose(`An outfit is one of ${m} shirts, one of ${n} pairs of pants and one of ${k} pairs of shoes. How many different outfits are there?`)],
        text: `sample space: ${m} x ${n} x ${k}`,
        answer: num(m * n * k),
        visual: null,
        explain: `Each shirt goes with every pair of pants, ${m} × ${n} = ${m * n} ways, and each of those with every pair of shoes: ${m * n} × ${k} = ${m * n * k}. `
          + `(Adding, ${m} + ${n} + ${k}, counts the clothes, not the outfits.) So ${m * n * k}.`,
      };
    }
    if (rng.chance(0.5)) {
      const [a, b] = rng.shuffle(STAGES).slice(0, 2);
      return {
        prompt: [T.prose(`First ${a[0]}, then ${b[0]}. How many outcomes are in the sample space?`)],
        text: `sample space: ${a[1]} x ${b[1]}`,
        answer: num(a[1] * b[1]),
        visual: null,
        explain: `Each of the ${a[1]} first outcomes can be followed by any of the ${b[1]} second ones: ${a[1]} × ${b[1]} = ${a[1] * b[1]}. `
          + `(Adding, ${a[1]} + ${b[1]}, counts the choices at each step, not the pairs.) So ${a[1] * b[1]}.`,
      };
    }
    const [x, y] = rng.pick(OUTFITS), m = rng.int(2, 7), n = rng.int(2, 7);
    return {
      prompt: [T.prose(`There are ${m} ${x} and ${n} ${y}. How many different ways are there to pick one of each?`)],
      text: `sample space: ${m} x ${n}`,
      answer: num(m * n),
      visual: null,
      explain: `Each of the ${m} ${x} goes with any of the ${n} ${y}: ${m} × ${n} = ${m * n}. (${m} + ${n} counts the items, not the pairs.) So ${m * n}.`,
    };
  }
  if (mode === 'dice') {
    const pairs = []; for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) pairs.push([a, b]);
    const ask = rng.pick(['sum', 'sum', 'at least', 'at most', 'doubles']);
    const s = ask === 'sum' ? rng.int(2, 12) : ask === 'at least' ? rng.int(7, 11) : rng.int(3, 7);
    const ok = pairs.filter(([a, b]) => (ask === 'sum' ? a + b === s : ask === 'at least' ? a + b >= s : ask === 'at most' ? a + b <= s : a === b));
    const words = ask === 'sum' ? `a sum of ${s}` : ask === 'at least' ? `a sum of ${s} or more` : ask === 'at most' ? `a sum of ${s} or less` : 'doubles (the same number on both)';
    return {
      prompt: [T.prose(`Two fair number cubes are rolled. What is the probability of ${words}?`)],
      text: `two dice: ${ask === 'doubles' ? 'doubles' : ask === 'sum' ? `sum ${s}` : `sum ${ask} ${s}`}`,
      answer: fracAnswer(ok.length, 36),
      visual: null,
      explain: `There are 6 × 6 = 36 equally likely ordered pairs. ${ok.length <= 6 ? `The ones that give ${words} are ${ok.map(([a, b]) => `(${a}, ${b})`).join(', ')}` : `${ok.length} of them give ${words}`}: ${fracWork(ok.length, 36)}. `
        + `(${ask === 'doubles' ? 'There are 6 doubles, one for each number.' : '(1, 2) and (2, 1) are different rolls, so both count; the 11 possible sums are not equally likely.'}) So ${fracText(ok.length, 36)}.`,
    };
  }
  const n = rng.int(2, 4), k = rng.int(0, n), atLeast = rng.chance(0.3) && k > 0;
  const choose = (a, b) => { let r = 1; for (let i = 0; i < b; i++) r = (r * (a - i)) / (i + 1); return r; };
  const ways = atLeast ? Array.from({ length: n - k + 1 }, (_, i) => choose(n, k + i)).reduce((p, q) => p + q, 0) : choose(n, k);
  const total = 2 ** n;
  return {
    prompt: [T.prose(`A fair coin is flipped ${n} times. What is the probability of ${atLeast ? 'at least' : 'exactly'} ${k} head${k === 1 ? '' : 's'}?`)],
    text: `coins ${n}: ${atLeast ? 'at least' : 'exactly'} ${k} heads`,
    answer: fracAnswer(ways, total),
    visual: null,
    explain: `Each flip has 2 outcomes, so there are 2${n === 2 ? ' × 2' : n === 3 ? ' × 2 × 2' : ' × 2 × 2 × 2'} = ${total} equally likely sequences, like ${'HT'.repeat(n).slice(0, n)}. `
      + `${ways} of them have ${atLeast ? 'at least' : 'exactly'} ${k} head${k === 1 ? '' : 's'}: ${fracWork(ways, total)}. `
      + `(HT and TH are different sequences; counting "one head" once undercounts.) So ${fracText(ways, total)}.`,
  };
}

// ── Independent "and" ───────────────────────────────────────────────────

function independent(rng) {
  if (rng.chance(0.4)) {
    // Two picks from a bag, the first put back.
    const S = source(rng, ['marbles']);
    const [a, b] = [rng.pick(S.colors), rng.pick(S.colors)];
    const na = S.outcomes.filter((c) => c === a).length, nb = S.outcomes.filter((c) => c === b).length, N = S.outcomes.length;
    return {
      prompt: [T.prose(`${S.what.replace(' One is picked at random.', '')} One marble is picked at random and put back, then a second is picked. What is the probability that the first is ${a} and the second is ${b}?`)],
      text: `with replacement: ${outcomesText(S)}; ${a} then ${b}`,
      answer: fracAnswer(na * nb, N * N),
      visual: null,
      explain: `Putting the marble back leaves the bag as it was, so the picks are independent: ${na}/${N} × ${nb}/${N} = ${fracWork(na * nb, N * N)}. `
        + `(Adding ${na}/${N} + ${nb}/${N} would give the chance of something bigger than either, not both.) So ${fracText(na * nb, N * N)}.`,
    };
  }
  const A = source(rng, ['cube', 'die', 'spinner', 'cards']), B = source(rng, ['cube', 'spinner', 'marbles', 'letters']);
  if (A.kind === B.kind) return independent(rng);
  const EA = A.event(), EB = B.event();
  const ka = count(A, EA), kb = count(B, EB), na = A.outcomes.length, nb = B.outcomes.length;
  if (!ka || !kb || ka === na || kb === nb) return independent(rng);
  return {
    prompt: [T.prose(`${A.what} Separately, ${B.what.charAt(0).toLowerCase()}${B.what.slice(1)} What is the probability of ${A.verb} ${EA.words} and ${B.verb} ${EB.words}?`)],
    text: `and: ${outcomesText(A)}; event ${EA.code} | ${outcomesText(B)}; event ${EB.code}`,
    answer: fracAnswer(ka * kb, na * nb),
    visual: null,
    explain: `Neither result affects the other, so multiply: P(${EA.words}) = ${fracText(ka, na)} and P(${EB.words}) = ${fracText(kb, nb)}, `
      + `and ${fracText(ka, na)} × ${fracText(kb, nb)} = ${fracText(ka * kb, na * nb)}. (Both must happen, which is rarer than either one: the product is smaller than each.) So ${fracText(ka * kb, na * nb)}.`

  };
}

// ── Expected frequency ──────────────────────────────────────────────────

function expected(rng) {
  if (rng.chance(0.3)) {
    // From results so far to a prediction.
    for (;;) {
      const M = rng.pick([20, 40, 50, 60, 80, 100, 120, 200]), K = rng.int(3, M - 3), N = rng.pick([100, 200, 300, 400, 500, 600, 1000]);
      const e = (K * N) / M;
      if (!Number.isInteger(e)) continue;
      const what = rng.pick([['a basketball player', 'made', 'free throws', 'shots'], ['a factory test', 'found', 'faulty parts', 'parts checked'], ['a spinner', 'landed on red', 'times', 'spins']]);
      return {
        prompt: [T.prose(what[0] === 'a spinner'
          ? `A spinner landed on red ${K} times in ${M} spins. Based on that, about how many times would it land on red in ${N} spins?`
          : what[0] === 'a factory test'
            ? `A factory test found ${K} faulty parts out of ${M} checked. About how many faulty parts would you expect in ${N}?`
            : `A basketball player made ${K} of ${M} free throws. About how many would you expect them to make out of ${N}?`)],
        text: `expected from results: ${K} of ${M}; trials ${N}`,
        answer: num(e),
        visual: null,
        explain: `The experimental probability is ${fracWork(K, M)}, and ${fracText(K, M)} × ${N} = ${e}. (The prediction scales the rate, not the count: ${K} stays ${K} only for ${M} more tries.) So about ${e}.`,
      };
    }
  }
  for (;;) {
    const S = source(rng, ['cube', 'die', 'spinner', 'marbles', 'cards']);
    const E = S.event();
    const k = count(S, E), n = S.outcomes.length;
    if (!k || k === n) continue;
    const q = reduce(k, n);
    const fits = [60, 90, 100, 120, 150, 180, 200, 240, 300, 360, 400, 500, 600, 800, 900, 1000, 1200].filter((t) => t % q.d === 0);
    if (!fits.length) continue;
    const N = rng.pick(fits);
    const e = (q.n * N) / q.d;
    return {
      prompt: [T.prose(`${S.what.replace(/ (once|at random)\./, '.').replace('is rolled.', 'is rolled ' + N + ' times.').replace('is spun.', 'is spun ' + N + ' times.')
        .replace('one is drawn.', `one is drawn and put back, ${N} times.`).replace('One is picked.', `One is picked and put back, ${N} times.`)} About how many times would you expect to ${S.one === 'pick' ? 'pick' : 'get'} ${E.words}?`)],
      text: `expected: ${outcomesText(S)}; event ${E.code}; trials ${N}`,
      answer: num(e),
      visual: null,
      explain: `P(${E.words}) = ${fracWork(k, n)}. Over ${N} trials, expect ${fracText(k, n)} of them: ${fracText(k, n)} × ${N} = ${e}. `
        + `(It is what to expect on average, not a promise: the real count will be close, not exact.) So about ${e}.`,
    };
  }
}

// ── Experimental vs theoretical ─────────────────────────────────────────

function experimental(rng) {
  const S = rng.chance(0.6) ? { name: 'a number cube', faces: [1, 2, 3, 4, 5, 6] } : { name: 'a spinner with 4 equal sections, A to D', faces: ['A', 'B', 'C', 'D'] };
  const N = rng.pick(S.faces.length === 6 ? [30, 36, 42, 48, 60] : [20, 24, 32, 40, 48]);
  // Results drawn honestly, so they wander around the expected count.
  let counts;
  for (;;) {
    counts = S.faces.map(() => 0);
    for (let i = 0; i < N; i++) counts[rng.int(0, S.faces.length - 1)]++;
    if (counts.every((c) => c > 0)) break;
  }
  const i = rng.int(0, S.faces.length - 1), face = S.faces[i], c = counts[i];
  const exp = N / S.faces.length;
  const mode = rng.pick(['exp', 'exp', 'compare', 'more']);
  // An outcome already at its theoretical share has nowhere closer to go.
  if (mode === 'more' && c * S.faces.length === N) return experimental(rng);
  const table = (working) => ({ kind: 'table', cols: ['Outcome', 'Count'], rows: [...S.faces.map((f, j) => [String(f), String(counts[j])]), ['Total', String(N)]],
    // Revealed: each outcome's share of the trials, or the count a fair one expects.
    ...(working === 'share' ? { workingCol: 'Share', working: [...counts.map((k) => `${k}/${N}`), `${N}/${N}`] }
      : working ? { workingCol: 'Expected', working: [...S.faces.map(() => said(exp)), String(N)] } : {}) });
  const results = `${S.faces.map((f, j) => `${f}:${counts[j]}`).join(' ')}`;
  const intro = `The table shows the results of ${N} ${S.faces.length === 6 ? 'rolls of a number cube' : 'spins of a spinner with 4 equal sections, A to D'}.`;
  if (mode === 'exp') {
    return {
      prompt: [T.prose(`${intro} What is the experimental probability of ${S.faces.length === 6 ? `rolling a ${face}` : `landing on ${face}`}?`)],
      text: `experimental: ${results}; outcome ${face}`,
      answer: fracAnswer(c, N),
      visual: table('share'),
      explain: `Experimental probability is what happened: ${c} of the ${N} trials, ${fracWork(c, N)}. `
        + `(The theoretical probability, 1/${S.faces.length}, is what should happen; the question asks what did.) So ${fracText(c, N)}.`,
    };
  }
  if (mode === 'compare') {
    const rel = c * S.faces.length > N ? 'higher' : c * S.faces.length < N ? 'lower' : 'equal';
    const opts = [{ id: 'higher', label: 'Higher than the theoretical probability' }, { id: 'lower', label: 'Lower than the theoretical probability' }, { id: 'equal', label: 'Equal to it' }];
    return {
      prompt: [T.prose(`${intro} How does the experimental probability of ${S.faces.length === 6 ? `rolling a ${face}` : `landing on ${face}`} compare with the theoretical probability?`)],
      text: `compare experimental: ${results}; outcome ${face}`,
      answer: { type: 'choice', value: rel, options: opts },
      visual: table(true),
      explain: `Theoretically each of the ${S.faces.length} outcomes is equally likely, 1/${S.faces.length}, which over ${N} trials is ${said(exp)}. `
        + `${face} came up ${c} times, so the experimental probability is ${fracText(c, N)}, ${rel === 'equal' ? `exactly the theoretical 1/${S.faces.length}` : `${rel} than 1/${S.faces.length}`}. `
        + `(A difference in a short run does not mean the ${S.faces.length === 6 ? 'cube' : 'spinner'} is unfair.) So ${rel === 'equal' ? 'equal' : rel}.`,
    };
  }
  const opts = rng.shuffle([
    ['closer', 'It will most likely get closer to the theoretical probability'],
    ['farther', 'It will most likely move further from the theoretical probability'],
    ['same', `It will stay exactly ${fracText(c, N)}`],
  ]).map(([meaning, label], n) => ({ id: LETTERS[n], meaning, label }));
  return {
    prompt: [T.prose(`${intro} If the experiment is repeated for many more trials, what will most likely happen to the experimental probability of ${S.faces.length === 6 ? `rolling a ${face}` : `landing on ${face}`}?`)],
    text: `more trials: ${results}; outcome ${face}; options ${opts.map((o) => `${o.id}=${o.meaning}`).join(', ')}`,
    answer: { type: 'choice', value: opts.find((o) => o.meaning === 'closer').id, options: opts.map(({ id, label }) => ({ id, label })) },
    visual: table(true),
    explain: `Over more and more trials the share of ${face}s settles toward 1/${S.faces.length}: the luck of a short run averages out. `
      + `(It does not have to "catch up" on any one ${S.faces.length === 6 ? 'roll' : 'spin'}; each is still 1/${S.faces.length}.) So it will most likely get closer to the theoretical probability.`,
  };
}

const CONTENT = [likelihood, singleEvent, complement, sampleSpaces, independent, expected, experimental];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
