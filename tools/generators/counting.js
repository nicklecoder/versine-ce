/**
 * Catalogue authoring tool: builds the problem library for counting.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 *
 * Every `text` names what is counted (`permutations 8 3`, `row: 5 people, A
 * and B together`), and scripts/check-answers.py counts it again: the
 * restricted arrangements and the probabilities by listing every one of
 * them with itertools, not by the formula the explanation uses.
 *
 * No level carries a visual. A tree of 336 branches teaches less than the
 * three numbers multiplied, and the libraries are better without it.
 */
import * as T from '../terms.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/counting.js';
import { fracAnswer, fracText, fracWork } from './chance.js';

const fmt = (n) => n.toLocaleString('en-US');
const fact = (n) => (n <= 1 ? 1 : n * fact(n - 1));
const perm = (n, r) => { let p = 1; for (let i = 0; i < r; i++) p *= n - i; return p; };
const comb = (n, r) => perm(n, r) / fact(r);
/** n × (n − 1) × … for r factors, as written in an explanation. */
const steps = (n, r) => Array.from({ length: r }, (_, i) => n - i).join(' × ');
const int = (v) => ({ type: 'int', value: v });
const NAMES = ['Ava', 'Ben', 'Cara', 'Dev', 'Eli', 'Fay', 'Gus', 'Hana', 'Ivan', 'Jada'];
const WORDS = { 3: ['CAT', 'SUN', 'MAP'], 4: ['MATH', 'STAR', 'FROG', 'LION'], 5: ['PLANE', 'TIGER', 'CHAIR'], 6: ['PLANET', 'GARDEN', 'FROSTY'], 7: ['PAINTED', 'DOLPHIN'] };

// ── Multiplication Principle ────────────────────────────────────────────

const MENUS = [
  [['shirts', 'shirt'], ['pairs of pants', 'pair of pants'], ['pairs of shoes', 'pair of shoes']],
  [['appetizers', 'appetizer'], ['main dishes', 'main dish'], ['desserts', 'dessert']],
  [['kinds of bread', 'bread'], ['fillings', 'filling'], ['sauces', 'sauce']],
  [['flavors of ice cream', 'flavor'], ['toppings', 'topping'], ['cone types', 'cone']],
  [['routes from home to the library', 'route'], ['routes from the library to the park', 'route'], ['routes from the park to school', 'route']],
];

function multiply(rng) {
  const kind = rng.pick(['menu', 'menu', 'code', 'mixed']);
  let counts, prompt, why;
  if (kind === 'menu') {
    const menu = rng.pick(MENUS);
    const k = rng.pick([2, 3]);
    counts = Array.from({ length: k }, () => rng.int(2, 9));
    const list = counts.map((c, i) => `${c} ${menu[i][0]}`);
    prompt = `There are ${list.slice(0, -1).join(', ')}${k > 2 ? ',' : ''} and ${list[k - 1]}. Choosing one of each, how many different ways are there to choose?`;
    why = `Each of the ${counts[0]} ${menu[0][0]} can go with each of the ${counts[1]} ${menu[1][0]}${k > 2 ? `, and each of those pairs with each of the ${counts[2]} ${menu[2][0]}` : ''}`;
  } else if (kind === 'code') {
    const L = rng.int(2, 4);
    const letters = rng.int(0, Math.min(2, L - 1));
    counts = [...Array(letters).fill(26), ...Array(L - letters).fill(10)];
    prompt = letters
      ? `A code is ${letters === 1 ? '1 letter' : `${letters} letters`} (A to Z) followed by ${L - letters === 1 ? '1 digit' : `${L - letters} digits`} (0 to 9). Letters and digits may repeat. How many codes are possible?`
      : `A lock code is ${L} digits, each from 0 to 9, and digits may repeat. How many codes are possible?`;
    why = `Each place is a step with its own choices: ${letters ? '26 for each letter and 10 for each digit' : '10 for each digit'}`;
  } else {
    const coins = rng.int(1, 3);
    const die = rng.pick([4, 6, 8, 10]);
    counts = [...Array(coins).fill(2), die];
    prompt = `${coins === 1 ? 'A coin is' : `${coins} coins are`} flipped and a ${die}-sided die is rolled. How many outcomes are possible?`;
    why = `Each coin has 2 outcomes and the die has ${die}, and every result of one goes with every result of the others`;
  }
  const total = counts.reduce((a, b) => a * b, 1);
  const sum = counts.reduce((a, b) => a + b, 0);
  return {
    prompt: [T.prose(prompt)],
    text: `multiply choices: ${counts.join(' ')}`,
    answer: int(total),
    visual: null,
    explain: `${why}, so multiply: ${counts.join(' × ')} = ${fmt(total)}. `
      + `(Adding, ${counts.join(' + ')} = ${sum}, counts the options at each step, not the ways to make every choice.) So ${fmt(total)}.`,
  };
}

// ── Factorials ──────────────────────────────────────────────────────────

const LINES = [
  (n) => `How many ways can ${n} different books be arranged on a shelf?`,
  (n) => `How many ways can ${n} students line up for lunch?`,
  (n) => `In how many orders can ${n} runners finish a race, if there are no ties?`,
  (n) => `How many ways can ${n} songs be ordered on a playlist?`,
  (n, rng) => `How many different arrangements are there of the letters in ${rng.pick(WORDS[n])}? (No letter repeats in the word.)`,
];

function factorials(rng) {
  const kind = rng.pick(['value', 'ratio', 'ratio', 'arrange', 'arrange']);
  if (kind === 'value') {
    const n = rng.int(3, 8);
    return {
      prompt: [T.prose(`What is ${n}!?`)],
      text: `factorial ${n}`,
      answer: int(fact(n)),
      visual: null,
      explain: `${n}! multiplies every whole number from ${n} down to 1: ${steps(n, n)} = ${fmt(fact(n))}. `
        + `(It is not ${n} × 1 or ${n} + ${n - 1} + … ; every factor down to 1 is multiplied.) So ${fmt(fact(n))}.`,
    };
  }
  if (kind === 'ratio') {
    const k = rng.int(2, 12);
    const n = k + rng.int(1, 3);
    const v = fact(n) / fact(k);
    return {
      prompt: [T.prose(`What is ${n}! ÷ ${k}!?`)],
      text: `factorial ratio ${n} ${k}`,
      answer: int(v),
      visual: null,
      explain: `${n}! is ${steps(n, n - k)} × ${k}!, so the ${k}! cancels and what is left is ${steps(n, n - k)}${n - k > 1 ? ` = ${fmt(v)}` : ''}. `
        + `(It is not (${n} ÷ ${k})! or ${n - k}!: the factors from ${k} down cancel, and the ones above ${k} stay.) So ${fmt(v)}.`,
    };
  }
  const n = rng.int(3, 7);
  const line = rng.int(0, LINES.length - 1);
  const ask = LINES[line](n, rng);
  return {
    prompt: [T.prose(ask)],
    text: `arrange ${n}; ${['books', 'line', 'race', 'playlist', 'letters'][line]}`,
    answer: int(fact(n)),
    visual: null,
    explain: `There are ${n} choices for the first place, then ${n - 1} left for the second, and so on down to 1: ${n}! = ${steps(n, n)} = ${fmt(fact(n))}. `
      + `(Not ${n} × ${n}${n > 2 ? ` × …` : ''}: whatever goes first cannot go again.) So ${fmt(fact(n))}.`,
  };
}

// ── Permutations ────────────────────────────────────────────────────────

const ORDERED = [
  { code: 'ranked', make: (n, r) => [`${n} runners are in a race. ${r === 2 ? 'Gold and silver medals' : r === 3 ? 'Gold, silver and bronze medals' : `Prizes for 1st to ${r}th place`} are given out. How many ways can the ${r === 2 || r === 3 ? 'medals' : 'prizes'} be awarded?`, 'first place', 'second'] },
  { code: 'roles', make: (n, r) => [`A club of ${n} members elects a ${['president', 'vice president', 'treasurer', 'secretary'].slice(0, r).join(', ').replace(/, ([^,]+)$/, ' and $1')}. No one holds two jobs. How many ways can the jobs be filled?`, 'president', 'vice president'] },
  { code: 'row', make: (n, r) => [`${r} of ${n} students are chosen to stand in a row for a photo, left to right. How many different rows are possible?`, 'the left end', 'the next spot'] },
  { code: 'sequence', make: (n, r) => [`A playlist will play ${r} of ${n} songs, one after another, with no song twice. How many different playlists are possible?`, 'the first song', 'the second'] },
  { code: 'route', make: (n, r) => [`A tour visits ${r} of ${n} cities, one after another, never the same city twice. How many different tours are possible?`, 'the first city', 'the second'] },
];

function sizes(rng, rMax = 4) {
  const r = rng.int(2, rMax);
  const n = r === 4 ? rng.int(6, 9) : rng.int(r + 2, r === 2 ? 15 : 12);
  return [n, r];
}

function permutations(rng) {
  const [n, r] = sizes(rng);
  const S = rng.pick(ORDERED);
  const [prompt, first, second] = S.make(n, r);
  const v = perm(n, r);
  return {
    prompt: [T.prose(prompt)],
    text: `permutations ${n} ${r}; ${S.code}`,
    answer: int(v),
    visual: null,
    explain: `There are ${n} choices for ${first}, then ${n - 1} for ${second}, one fewer at each of the ${r} steps: ${steps(n, r)} = ${fmt(v)}. `
      + `(Not ${Array(r).fill(n).join(' × ')}: no one can be chosen twice. And not ${n}!: only ${r} places are filled.) So ${fmt(v)}.`,
  };
}

// ── Combinations ────────────────────────────────────────────────────────

const GROUPS = [
  { code: 'committee', make: (n, r) => `A committee of ${r} is chosen from ${n} people. How many different committees are possible?` },
  { code: 'toppings', make: (n, r) => `A pizza shop has ${n} toppings. How many different pizzas with ${r} different toppings can be made?` },
  { code: 'group', make: (n, r) => `You can bring ${r} of your ${n} friends to a show. How many different groups of friends could you bring?` },
  { code: 'set', make: (n, r) => `A reading list has ${n} books, and you must read any ${r} of them. How many different sets of ${r} books could you read?` },
  { code: 'hand', make: (n, r) => `A hand of ${r} cards is dealt from ${n} different cards. How many different hands are possible?` },
];

function combinations(rng) {
  const [n, r] = sizes(rng);
  const S = rng.pick(GROUPS);
  const p = perm(n, r);
  const v = comb(n, r);
  return {
    prompt: [T.prose(S.make(n, r))],
    text: `combinations ${n} ${r}; ${S.code}`,
    answer: int(v),
    visual: null,
    explain: `Chosen in order there would be ${steps(n, r)} = ${fmt(p)} ways. But order does not matter here: each group of ${r} turned up once for every order of it, ${r}! = ${fact(r)} times. `
      + `So divide: ${fmt(p)} ÷ ${fact(r)} = ${fmt(v)}. (Stopping at ${fmt(p)} counts the same group ${fact(r)} times.) So ${fmt(v)}.`,
  };
}

// ── Does Order Matter? ──────────────────────────────────────────────────

const SWAP = {
  ranked: 'Swapping the gold and silver winners gives a different result',
  roles: 'Swapping the president and vice president gives a different result',
  row: 'Swapping two students in the row gives a different photo',
  sequence: 'Swapping two songs gives a different playlist',
  route: 'Swapping two cities gives a different tour',
  committee: 'Listing the same people in another order is the same committee',
  toppings: 'The same toppings added in another order are the same pizza',
  group: 'The same friends named in another order are the same group',
  set: 'The same books listed in another order are the same set',
  hand: 'The same cards dealt in another order are the same hand',
};
const ORDER_OPTIONS = [
  { id: 'perm', label: 'Order matters: permutations' },
  { id: 'comb', label: 'Order does not matter: combinations' },
];

function doesOrderMatter(rng) {
  const [n, r] = sizes(rng);
  const ordered = rng.chance(0.5);
  const S = rng.pick(ordered ? ORDERED : GROUPS);
  const prompt = ordered ? S.make(n, r)[0] : S.make(n, r);
  const count = ordered ? `${steps(n, r)} = ${fmt(perm(n, r))}` : `${fmt(perm(n, r))} ÷ ${r}! = ${fmt(comb(n, r))}`;
  return {
    prompt: [T.prose(`${prompt} Before counting: does the order of the ${r} chosen matter?`)],
    text: `order matters: n ${n} r ${r}; selection is ${S.code}`,
    answer: { type: 'choice', value: ordered ? 'perm' : 'comb', options: ORDER_OPTIONS },
    visual: null,
    explain: `${SWAP[S.code]}, so order ${ordered ? 'matters' : 'does not matter'}, and the count would be ${ordered ? 'a permutation' : 'a combination'}: ${count}. `
      + `(${ordered ? 'Each chosen one has a place or a job, so the order is part of the outcome.' : 'A group has no first or second, so only who is in it counts.'}) So order ${ordered ? 'matters: permutations' : 'does not matter: combinations'}.`,
  };
}

// ── Restrictions ────────────────────────────────────────────────────────

function smallCode(rng) {
  const L = rng.int(3, 4);
  const D = rng.int(L + 2, 9);
  const parity = rng.pick(['even', 'odd']);
  const repeat = rng.chance(0.4);
  const ends = Array.from({ length: D }, (_, i) => i + 1).filter((x) => x % 2 === (parity === 'even' ? 0 : 1));
  const e = ends.length;
  const rest = repeat ? Array(L - 1).fill(D).join(' × ') : steps(D - 1, L - 1);
  const v = e * (repeat ? D ** (L - 1) : perm(D - 1, L - 1));
  return {
    prompt: `A ${L}-digit code uses only the digits 1 to ${D}, ${repeat ? 'and digits may repeat' : 'with no digit repeated'}. The code must be ${parity}. How many codes are possible?`,
    text: `code: length ${L}, digits 1 to ${D}, ${repeat ? 'repeat' : 'no repeat'}, ends ${parity}`, v,
    explain: `Fill the limited place first. The last digit must be ${parity}: ${e} choices (${ends.join(', ')}). `
      + (repeat
        ? `Digits may repeat, so each other place has all ${D}: ${rest}. `
        : `The other ${L - 1} places take the ${D - 1} digits left, in order: ${rest}. `)
      + `So ${e} × ${rest} = ${fmt(v)}. (${repeat ? `${Array(L).fill(D).join(' × ')} counts the codes that are not ${parity} too.` : `Filling left to right first leaves no way to know how many ${parity} digits are still free.`}) So ${fmt(v)}.`,
  };
}

function digitCode(rng) {
  if (rng.chance(0.5)) return smallCode(rng);
  const L = rng.int(3, 4);
  const kind = rng.pick(['first', 'first', 'even', 'odd-first', 'repeat-first']);
  if (kind === 'repeat-first') {
    const v = 9 * 10 ** (L - 1);
    return {
      prompt: `How many ${L}-digit whole numbers are there? (Digits may repeat, but a number cannot start with 0.)`,
      text: `code: length ${L}, digits, repeat, first not zero`, v,
      explain: `The first digit has 9 choices, 1 to 9; every other place has all 10: 9 × ${Array(L - 1).fill(10).join(' × ')} = ${fmt(v)}. `
        + `(10 × ${Array(L - 1).fill(10).join(' × ')} = ${fmt(10 ** L)} also counts strings like ${'0'.padEnd(L, '7')}, which are not ${L}-digit numbers.) So ${fmt(v)}.`,
    };
  }
  if (kind === 'first') {
    const v = 9 * perm(9, L - 1);
    return {
      prompt: `How many ${L}-digit whole numbers have no repeated digits? (A number cannot start with 0.)`,
      text: `code: length ${L}, digits, no repeat, first not zero`, v,
      explain: `Fill the limited place first. The first digit has 9 choices, 1 to 9. The next can be any digit but that one, 0 included, so 9 again, then ${steps(8, L - 2)}: 9 × ${steps(9, L - 1)} = ${fmt(v)}. `
        + `(Not ${steps(10, L)}: that lets 0 go first.) So ${fmt(v)}.`,
    };
  }
  if (kind === 'even') {
    const v = 5 * perm(9, L - 1);
    return {
      prompt: `A ${L}-digit PIN uses the digits 0 to 9, with no digit repeated, and its last digit must be even. A PIN may start with 0. How many PINs are possible?`,
      text: `code: length ${L}, digits, no repeat, ends even`, v,
      explain: `Fill the limited place first. The last digit has 5 choices (0, 2, 4, 6, 8). The other ${L - 1} places take any of the 9 digits left, in order: ${steps(9, L - 1)}. So 5 × ${steps(9, L - 1)} = ${fmt(v)}. `
        + `(Filling left to right first leaves no way to know how many even digits are still free.) So ${fmt(v)}.`,
    };
  }
  const v = 5 * 8 * perm(8, L - 2);
  return {
    prompt: `How many ${L}-digit whole numbers are odd and have no repeated digits? (A number cannot start with 0.)`,
    text: `code: length ${L}, digits, no repeat, first not zero, ends odd`, v,
    explain: `Two places are limited; fill them first. The last digit has 5 choices (1, 3, 5, 7, 9). The first has 8: not 0, and not the digit already used last. The ${L - 2} middle place${L - 2 > 1 ? 's take' : ' takes'} any of the 8 digits left: ${steps(8, L - 2)}. `
      + `So 5 × 8 × ${steps(8, L - 2)} = ${fmt(v)}. (Starting with the first digit leaves no way to know how many odd digits are still free for the last.) So ${fmt(v)}.`,
  };
}

function rowRule(rng) {
  const N = rng.int(4, 7);
  const [A, B] = rng.shuffle(NAMES).slice(0, 2);
  const kind = rng.pick(['first', 'end', 'together', 'together', 'apart']);
  const all = fact(N);
  const rest = fact(N - 1);
  const intro = `${N} friends, including ${A}${kind === 'first' || kind === 'end' ? '' : ` and ${B}`}, line up in a row.`;
  if (kind === 'first') {
    return {
      prompt: `${intro} How many orders have ${A} first?`, text: `row: ${N} people, A first`, v: rest,
      explain: `${A}'s place is fixed, so only the other ${N - 1} are arranged: ${N - 1}! = ${fmt(rest)}. (${N}! = ${fmt(all)} counts every order, with anyone first.) So ${fmt(rest)}.`,
    };
  }
  if (kind === 'end') {
    return {
      prompt: `${intro} How many orders have ${A} at one end of the row?`, text: `row: ${N} people, A at an end`, v: 2 * rest,
      explain: `${A} has 2 places to stand, the left end or the right end. Then the other ${N - 1} fill the rest: 2 × ${N - 1}! = 2 × ${fmt(rest)} = ${fmt(2 * rest)}. `
        + `(Counting only one end gives half.) So ${fmt(2 * rest)}.`,
    };
  }
  if (kind === 'together') {
    return {
      prompt: `${intro} How many orders have ${A} and ${B} standing next to each other?`, text: `row: ${N} people, A and B together`, v: 2 * rest,
      explain: `Tie ${A} and ${B} into one block. Then ${N - 1} things are arranged, ${N - 1}! = ${fmt(rest)} ways, and inside the block they can stand 2 ways, ${A}–${B} or ${B}–${A}: 2 × ${fmt(rest)} = ${fmt(2 * rest)}. `
        + `(Forgetting the 2 counts only one of the two orders inside the block.) So ${fmt(2 * rest)}.`,
    };
  }
  return {
    prompt: `${intro} How many orders keep ${A} and ${B} apart, not next to each other?`, text: `row: ${N} people, A and B apart`, v: all - 2 * rest,
    explain: `Count the opposite and take it away. Every order: ${N}! = ${fmt(all)}. Together, as one block that can face 2 ways: 2 × ${N - 1}! = ${fmt(2 * rest)}. Apart: ${fmt(all)} − ${fmt(2 * rest)} = ${fmt(all - 2 * rest)}. `
      + `(Forgetting the block's 2 orders takes away too little.) So ${fmt(all - 2 * rest)}.`,
  };
}

function committeeRule(rng) {
  const N = rng.int(6, 10);
  const R = rng.int(2, 4);
  const A = rng.pick(NAMES);
  if (rng.chance(0.5)) {
    const v = comb(N - 1, R - 1);
    return {
      prompt: `A committee of ${R} is chosen from ${N} people, and ${A} must be on it. How many committees are possible?`,
      text: `committee: ${N} people, ${R} chosen, includes A`, v,
      explain: `${A} takes one seat, so ${R - 1} more ${R - 1 === 1 ? 'is' : 'are'} chosen from the other ${N - 1}: ${R - 1 === 1 ? `${N - 1}` : `${steps(N - 1, R - 1)} ÷ ${R - 1}! = ${fmt(v)}`}. `
        + `(Choosing ${R} from ${N - 1} would leave ${A} off.) So ${fmt(v)}.`,
    };
  }
  const v = comb(N - 1, R);
  return {
    prompt: `A committee of ${R} is chosen from ${N} people, but ${A} cannot serve. How many committees are possible?`,
    text: `committee: ${N} people, ${R} chosen, excludes A`, v,
    explain: `Leave ${A} out, and all ${R} come from the other ${N - 1}: ${steps(N - 1, R)} ÷ ${R}! = ${fmt(v)}. `
      + `(Choosing from all ${N} would count the committees with ${A}.) So ${fmt(v)}.`,
  };
}

function restrictions(rng) {
  const P = rng.pick([digitCode, digitCode, rowRule, rowRule, committeeRule])(rng);
  return { prompt: [T.prose(P.prompt)], text: P.text, answer: int(P.v), visual: null, explain: P.explain };
}

// ── Probability by Counting ─────────────────────────────────────────────

function byCounting(rng) {
  const kind = rng.pick(['lottery', 'pair', 'all', 'exactly', 'row', 'race']);
  let P;
  if (kind === 'lottery') {
    const R = rng.int(2, 4);
    const N = rng.int(R + 6, R === 4 ? 20 : 30);
    const all = comb(N, R);
    P = {
      prompt: `A lottery draws ${R} different numbers from 1 to ${N}, in any order. You pick ${R} numbers. What is the probability that yours match the ${R} drawn?`,
      text: `lottery: ${R} of ${N}`, n: 1, d: all,
      explain: `Order does not matter, so the draws are combinations: ${steps(N, R)} ÷ ${R}! = ${fmt(all)}, and exactly 1 of them is yours. `
        + `(Dividing by ${fmt(perm(N, R))}, the ordered count, would need your numbers in the drawn order.) So 1/${all}.`,
    };
  } else if (kind === 'pair') {
    const N = rng.int(6, 10);
    const R = rng.int(2, 4);
    const [A, B] = rng.shuffle(NAMES).slice(0, 2);
    const want = comb(N - 2, R - 2);
    const all = comb(N, R);
    P = {
      prompt: `A committee of ${R} is chosen at random from ${N} people, including ${A} and ${B}. What is the probability that both ${A} and ${B} are on it?`,
      text: `committee chance: ${N} people, ${R} chosen, includes A and B`, n: want, d: all,
      explain: `All committees: ${fmt(all)}. With ${A} and ${B} both on, the other ${R - 2} seat${R - 2 === 1 ? '' : 's'} come${R - 2 === 1 ? 's' : ''} from the other ${N - 2}: ${R === 2 ? '1 way' : `${fmt(want)}`}. `
        + `So ${fracWork(want, all)}. (Both counts are of committees, without order; mixing an ordered count with an unordered one gives a wrong ratio.) So ${fracText(want, all)}.`,
    };
  } else if (kind === 'all' || kind === 'exactly') {
    const G = rng.int(3, 6);
    const J = rng.int(3, 6);
    const R = rng.int(2, Math.min(4, G));
    const k = kind === 'all' ? R : rng.int(1, R - 1);
    const want = comb(G, k) * comb(J, R - k);
    const all = comb(G + J, R);
    P = {
      prompt: `${G} seniors and ${J} juniors volunteer, and ${R} are chosen at random. What is the probability that ${kind === 'all' ? `all ${R} are seniors` : `exactly ${k} ${k === 1 ? 'is a senior' : 'are seniors'}`}?`,
      text: `committee chance: ${G} seniors ${J} juniors, ${R} chosen, exactly ${k} seniors`, n: want, d: all,
      explain: `All the ways to choose ${R} of the ${G + J}: ${fmt(all)}. `
        + (kind === 'all'
          ? `Ways with all seniors, ${R} of the ${G}: ${fmt(want)}. `
          : `Ways with exactly ${k}: choose ${k} of the ${G} seniors (${comb(G, k)}) and ${R - k} of the ${J} juniors (${comb(J, R - k)}), and multiply: ${fmt(want)}. `)
        + `So ${fracWork(want, all)}. (${kind === 'all' ? `It is not ${G}/${G + J} for one pick; every one of the ${R} must be a senior.` : 'Counting the seniors alone forgets that the rest of the seats must go to juniors.'}) So ${fracText(want, all)}.`,
    };
  } else if (kind === 'row') {
    const N = rng.int(4, 7);
    const [A, B] = rng.shuffle(NAMES).slice(0, 2);
    const all = fact(N);
    const want = 2 * fact(N - 1);
    P = {
      prompt: `${N} friends, including ${A} and ${B}, line up in a random order. What is the probability that ${A} and ${B} stand next to each other?`,
      text: `row chance: ${N} people, A and B together`, n: want, d: all,
      explain: `Every order: ${N}! = ${fmt(all)}. Together, as one block that can face 2 ways: 2 × ${N - 1}! = ${fmt(want)}. So ${fracWork(want, all)}. `
        + `(Forgetting the block's 2 orders halves the chance.) So ${fracText(want, all)}.`,
    };
  } else {
    const N = rng.int(5, 10);
    const [A, B] = rng.shuffle(NAMES).slice(0, 2);
    const all = perm(N, 2);
    P = {
      prompt: `${N} runners, including ${A} and ${B}, run a race, and every finishing order is equally likely. What is the probability that ${A} wins gold and ${B} silver?`,
      text: `race chance: ${N} runners, A first and B second`, n: 1, d: all,
      explain: `Gold and silver can go ${N} × ${N - 1} = ${all} ways, and only 1 of them is ${A} then ${B}. `
        + `(Not 2/${all}: ${B} winning gold and ${A} silver is a different result.) So 1/${all}.`,
    };
  }
  return { prompt: [T.prose(P.prompt)], text: P.text, answer: fracAnswer(P.n, P.d), visual: null, explain: P.explain };
}

const CONTENT = [multiply, factorials, permutations, combinations, doesOrderMatter, restrictions, byCounting];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
