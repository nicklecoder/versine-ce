/**
 * Catalogue authoring tool: builds the problem library for compound
 * probability.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 *
 * Every `text` carries the counts or probabilities the question gives, and
 * scripts/check-answers.py works each answer out again its own way: Venn
 * regions and table cells are summed by membership, a deck of 52 cards and
 * two draws from a bag are listed out in full, and independence is tested
 * by multiplying.
 */
import * as T from '../terms.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/probability-2.js';
import { fracAnswer, fracText, fracWork } from './chance.js';

const decimal = (v) => { for (let d = 1; d <= 10000; d *= 10) { const n = Math.round(v * d); if (Math.abs(n - v * d) < 1e-9) return { n, d }; } throw new Error(String(v)); };
const dec = (v) => ({ type: 'decimal', value: decimal(v) });
const said = (v) => String(Math.round(v * 1e6) / 1e6);
const YESNO = [{ id: 'yes', label: 'Independent' }, { id: 'no', label: 'Not independent' }];

// ── Venn Diagrams ───────────────────────────────────────────────────────

const PAIRS = [
  { who: 'students', a: ['play soccer', 'Soccer'], b: ['play an instrument', 'Music'], na: 'do not play soccer' },
  { who: 'students', a: ['have a dog', 'Dog'], b: ['have a cat', 'Cat'], na: 'do not have a dog' },
  { who: 'shoppers', a: ['bought bread', 'Bread'], b: ['bought milk', 'Milk'], na: 'did not buy bread' },
  { who: 'members', a: ['swim', 'Swim'], b: ['run', 'Run'], na: 'do not swim' },
  { who: 'students', a: ['take Spanish', 'Spanish'], b: ['take art', 'Art'], na: 'do not take Spanish' },
];

// requiem: catalogue/content/venn-diagrams-compact
/**
 * A circle as a closed path of 28 whole-number points. The diagram is drawn
 * on an 80 × 58 grid so whole numbers are smooth enough, which keeps each
 * Venn in the library to well under a kilobyte.
 */
const ring = (cx, cy, r) => Array.from({ length: 29 }, (_, i) => {
  const t = (2 * Math.PI * i) / 28;
  return [Math.round(cx + r * Math.cos(t)), Math.round(cy + r * Math.sin(t))];
});
const LEFT = ring(28, 30, 18);
const RIGHT = ring(52, 30, 18);

function venn(P, [a, k, b, n], working) {
  return {
    kind: 'plane', xRange: [0, 80], yRange: [0, 58], grid: 0, axes: false,
    marks: [
      { kind: 'path', points: [[0, 0], [80, 0], [80, 58], [0, 58], [0, 0]] },
      { kind: 'path', points: LEFT }, { kind: 'path', points: RIGHT },
      { kind: 'text', at: [17, 54], label: P.a[1] }, { kind: 'text', at: [63, 54], label: P.b[1] },
      { kind: 'text', at: [20, 30], label: String(a) }, { kind: 'text', at: [40, 30], label: String(k) },
      { kind: 'text', at: [60, 30], label: String(b) }, { kind: 'text', at: [74, 5], label: String(n) },
    ],
    answer: [{ kind: 'text', at: [40, 5], label: working }],
  };
}

const ASKS = {
  or: { words: (P) => `${P.a[0]} or ${P.b[0]}`, part: ([a, k, b]) => [a, k, b], how: () => 'everything in either circle' },
  and: { words: (P) => `${P.a[0]} and ${P.b[0]}`, part: ([, k]) => [k], how: () => 'only the overlap' },
  neither: { words: (P) => neitherWords(P), part: ([, , , n]) => [n], how: () => 'outside both circles' },
  only: { words: (P) => `${P.a[0]} but not ${P.b[0].replace(/^(play|have|bought|take) /, '')}`, part: ([a]) => [a], how: (P) => `the ${P.a[1]} circle without the overlap` },
  not: { words: (P) => P.na, part: ([, , b, n]) => [b, n], how: (P) => `everything outside the ${P.a[1]} circle` },
};

function neitherWords(P) {
  // "play soccer" + "play an instrument" -> "play neither soccer nor an instrument"
  const [va, ...ra] = P.a[0].split(' ');
  const [vb, ...rb] = P.b[0].split(' ');
  return va === vb ? `${va} neither ${ra.join(' ')} nor ${rb.join(' ')}` : `neither ${P.a[0]} nor ${P.b[0]}`;
}

function vennDiagrams(rng) {
  const P = rng.pick(PAIRS);
  const c = [rng.int(2, 15), rng.int(1, 9), rng.int(2, 15), rng.int(1, 9)];
  const T0 = c.reduce((s, v) => s + v, 0);
  const ask = rng.pick(['or', 'or', 'and', 'neither', 'only', 'not']);
  const A = ASKS[ask];
  const parts = A.part(c);
  const want = parts.reduce((s, v) => s + v, 0);
  const words = A.words(P);
  const sum = parts.length > 1 ? `${parts.join(' + ')} = ${want}` : String(want);
  const trap = {
    or: `Adding the two circles' totals, ${c[0] + c[1]} + ${c[1] + c[2]}, counts the ${c[1]} in the overlap twice.`,
    and: `The ${c[0] + c[1]} in the whole ${P.a[1]} circle include those who do not ${P.b[0]}.`,
    neither: `The ${c[3]} outside are part of the whole too: the total is all four numbers.`,
    only: `The overlap's ${c[1]} ${P.b[0]} as well, so they are left out.`,
    not: `Not ${P.a[1]} includes the ${c[3]} outside both circles, not just the other circle.`,
  }[ask];
  return {
    prompt: [T.prose(`The Venn diagram shows ${T0} ${P.who}. One is chosen at random. What is the probability that they ${words}?`)],
    text: `venn: ${c.join(' ')}; ask ${ask}`,
    answer: fracAnswer(want, T0),
    visual: venn(P, c, `${sum} of ${T0}`),
    explain: `There are ${c.join(' + ')} = ${T0} ${P.who} in all. "${words[0].toUpperCase()}${words.slice(1)}" is ${A.how(P)}: ${sum}. `
      + `So ${fracWork(want, T0)}. (${trap}) So ${fracText(want, T0)}.`,
  };
}

// ── Addition Rule ───────────────────────────────────────────────────────

const SUITS = ['heart', 'diamond', 'club', 'spade'];
const RANKS = ['ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king'];
const DECK = SUITS.flatMap((s) => RANKS.map((r) => ({ s, r })));
const CARD = {
  heart: { words: 'a heart', test: (c) => c.s === 'heart' }, diamond: { words: 'a diamond', test: (c) => c.s === 'diamond' },
  club: { words: 'a club', test: (c) => c.s === 'club' }, spade: { words: 'a spade', test: (c) => c.s === 'spade' },
  red: { words: 'a red card', test: (c) => c.s === 'heart' || c.s === 'diamond' }, black: { words: 'a black card', test: (c) => c.s === 'club' || c.s === 'spade' },
  face: { words: 'a face card (jack, queen or king)', test: (c) => ['jack', 'queen', 'king'].includes(c.r) },
  ...Object.fromEntries(RANKS.map((r) => [r, { words: /^\d/.test(r) ? `a ${r}` : `${r === 'ace' ? 'an' : 'a'} ${r}`, test: (c) => c.r === r }])),
};
const cards = (code) => DECK.filter(CARD[code].test).length;

function addition(rng) {
  const mode = rng.pick(['counts', 'deck', 'deck', 'probs', 'exclusive', 'both']);
  if (mode === 'deck') {
    const x = rng.pick(['heart', 'diamond', 'club', 'spade', 'red', 'black']);
    const y = rng.pick(['ace', 'king', 'queen', 'jack', '7', '10', 'face']);
    const nx = cards(x), ny = cards(y), both = DECK.filter((c) => CARD[x].test(c) && CARD[y].test(c)).length;
    const want = nx + ny - both;
    return {
      prompt: [T.prose(`One card is drawn at random from a standard deck of 52. What is the probability that it is ${CARD[x].words} or ${CARD[y].words}?`)],
      text: `deck: ${x} or ${y}`,
      answer: fracAnswer(want, 52),
      visual: null,
      explain: `There are ${nx} cards that are ${CARD[x].words.replace(/^an? /, '')}s and ${ny} that are ${CARD[y].words.replace(/^an? /, '').replace(/ \(.*\)$/, '')}s, but ${both} of them ${both === 1 ? 'is' : 'are'} both. `
        + `So ${nx} + ${ny} − ${both} = ${want} cards, and ${fracWork(want, 52)}. (${nx} + ${ny} = ${nx + ny} counts ${both === 1 ? 'that one' : `those ${both}`} twice.) So ${fracText(want, 52)}.`,
    };
  }
  if (mode === 'counts') {
    const P = rng.pick(PAIRS);
    const k = rng.int(2, 10), a = k + rng.int(2, 15), b = k + rng.int(2, 15);
    const T0 = a + b - k + rng.int(1, 12);
    const want = a + b - k;
    return {
      prompt: [T.prose(`Of ${T0} ${P.who}, ${a} ${P.a[0]}, ${b} ${P.b[0]}, and ${k} ${P.who === 'shoppers' ? 'bought both' : 'do both'}. One is chosen at random. What is the probability that they ${P.a[0]} or ${P.b[0]}?`)],
      text: `or counts: total ${T0}, a ${a}, b ${b}, both ${k}`,
      answer: fracAnswer(want, T0),
      visual: null,
      explain: `The ${k} who ${P.who === 'shoppers' ? 'bought' : 'do'} both are among the ${a} and among the ${b}, so take them off once: ${a} + ${b} − ${k} = ${want}. `
        + `So ${fracWork(want, T0)}. (${a} + ${b} = ${a + b} counts the ${k} twice.) So ${fracText(want, T0)}.`,
    };
  }
  // Probabilities in hundredths, all exact.
  const pa = rng.int(10, 60) / 100, pb = rng.int(10, 60) / 100;
  if (mode === 'exclusive') {
    const v = Math.round((pa + pb) * 100) / 100;
    return {
      prompt: [T.prose(`A and B are mutually exclusive: they cannot both happen. P(A) = ${said(pa)} and P(B) = ${said(pb)}. What is P(A or B)?`)],
      text: `or exclusive: ${said(pa)} ${said(pb)}`,
      answer: dec(v),
      visual: null,
      explain: `Mutually exclusive means P(A and B) = 0, so there is no overlap to take off: ${said(pa)} + ${said(pb)} = ${said(v)}. `
        + `(Multiplying, ${said(pa)} × ${said(pb)}, is for "and" between independent events, not "or".) So ${said(v)}.`,
    };
  }
  const pab = rng.int(1, Math.round(Math.min(pa, pb) * 100) - 1) / 100;
  const por = Math.round((pa + pb - pab) * 100) / 100;
  if (mode === 'probs') {
    return {
      prompt: [T.prose(`P(A) = ${said(pa)}, P(B) = ${said(pb)} and P(A and B) = ${said(pab)}. What is P(A or B)?`)],
      text: `or: ${said(pa)} ${said(pb)} ${said(pab)}`,
      answer: dec(por),
      visual: null,
      explain: `P(A or B) = P(A) + P(B) − P(A and B) = ${said(pa)} + ${said(pb)} − ${said(pab)} = ${said(por)}. `
        + `(${said(pa)} + ${said(pb)} = ${said(Math.round((pa + pb) * 100) / 100)} counts the overlap twice.) So ${said(por)}.`,
    };
  }
  return {
    prompt: [T.prose(`P(A) = ${said(pa)}, P(B) = ${said(pb)} and P(A or B) = ${said(por)}. What is P(A and B)?`)],
    text: `both from or: ${said(pa)} ${said(pb)} ${said(por)}`,
    answer: dec(pab),
    visual: null,
    explain: `The addition rule run backward: P(A and B) = P(A) + P(B) − P(A or B) = ${said(pa)} + ${said(pb)} − ${said(por)} = ${said(pab)}. `
      + `(${said(pa)} × ${said(pb)} would be right only if A and B were independent, which nothing here says.) So ${said(pab)}.`,
  };
}

// ── Conditional From a Table ────────────────────────────────────────────

const TABLES = [
  { who: 'students', rows: ['Grade 9', 'Grade 10'], cols: ['Bus', 'Walk'], row: ['is in grade 9', 'is in grade 10'], col: ['rides the bus', 'walks'], c0: 'riding the bus', rowVar: 'grade' },
  { who: 'customers', rows: ['Adult', 'Child'], cols: ['Popcorn', 'None'], row: ['is an adult', 'is a child'], col: ['bought popcorn', 'bought no popcorn'], c0: 'buying popcorn', rowVar: 'being an adult or a child' },
  { who: 'games', rows: ['Home', 'Away'], cols: ['Won', 'Lost'], row: ['is a home game', 'is an away game'], col: ['was won', 'was lost'], c0: 'winning', rowVar: 'playing at home or away' },
  { who: 'voters', rows: ['Under 40', '40 and over'], cols: ['Yes', 'No'], row: ['is under 40', 'is 40 or over'], col: ['voted yes', 'voted no'], c0: 'voting yes', rowVar: 'age group' },
];

function table2(S, c, working) {
  const [[a, b], [d, e]] = c;
  // No column of row totals, so the revealed working column keeps the table
  // four columns wide; a row's whole is its two cells added.
  return { kind: 'table', cols: ['', ...S.cols], rows: [[S.rows[0], String(a), String(b)], [S.rows[1], String(d), String(e)], ['Total', String(a + d), String(b + e)]],
    workingCol: 'Working', working };
}

function conditionalTable(rng) {
  const S = rng.pick(TABLES);
  const c = [[rng.int(5, 40), rng.int(5, 40)], [rng.int(5, 40), rng.int(5, 40)]];
  const all = c[0][0] + c[0][1] + c[1][0] + c[1][1];
  const i = rng.int(0, 1), j = rng.int(0, 1);
  const mode = rng.pick(['given row', 'given row', 'given col', 'given col', 'and']);
  if (mode === 'and') {
    const v = c[i][j];
    return {
      prompt: [T.prose(`The table shows ${all} ${S.who}. One is chosen at random. What is the probability that the one chosen ${S.row[i]} and ${S.col[j]}?`)],
      text: `table chance: ${c[0].join(' ')} / ${c[1].join(' ')}; want r${i + 1} c${j + 1} given all`,
      answer: fracAnswer(v, all),
      visual: table2(S, c, [i === 0 ? `${v} of ${all}` : '', i === 1 ? `${v} of ${all}` : '', '']),
      explain: `"And" is one cell: ${v}. Nothing is given, so the whole is everyone: ${c[0][0]} + ${c[0][1]} + ${c[1][0]} + ${c[1][1]} = ${all}. `
        + `So ${fracWork(v, all)}. (Dividing by the row or column total answers a "given" question instead.) So ${fracText(v, all)}.`,
    };
  }
  if (mode === 'given row') {
    const whole = c[i][0] + c[i][1];
    const v = c[i][j];
    return {
      prompt: [T.prose(`The table shows ${all} ${S.who}. One is chosen at random. Given that the one chosen ${S.row[i]}, what is the probability that the one chosen ${S.col[j]}?`)],
      text: `table chance: ${c[0].join(' ')} / ${c[1].join(' ')}; want c${j + 1} given r${i + 1}`,
      answer: fracAnswer(v, whole),
      visual: table2(S, c, [i === 0 ? `${v} of ${c[0][0]} + ${c[0][1]}` : '', i === 1 ? `${v} of ${c[1][0]} + ${c[1][1]}` : '', '']),
      explain: `"Given that the one chosen ${S.row[i]}" shrinks the whole to that row: ${c[i][0]} + ${c[i][1]} = ${whole}. Of them, ${v} are in the ${S.cols[j]} column. `
        + `So ${fracWork(v, whole)}. (Out of everyone, ${v}/${all}, is the chance of both, not the chance given the row.) So ${fracText(v, whole)}.`,
    };
  }
  const whole = c[0][j] + c[1][j];
  const v = c[i][j];
  const w = ['', '', ''];
  w[i] = `${v} of ${whole}`;
  return {
    prompt: [T.prose(`The table shows ${all} ${S.who}. One is chosen at random. Given that the one chosen ${S.col[j]}, what is the probability that the one chosen ${S.row[i]}?`)],
    text: `table chance: ${c[0].join(' ')} / ${c[1].join(' ')}; want r${i + 1} given c${j + 1}`,
    answer: fracAnswer(v, whole),
    visual: table2(S, c, w),
    explain: `"Given that the one chosen ${S.col[j]}" shrinks the whole to the ${S.cols[j]} column: its total is ${whole}. Of them, ${v} are in the ${S.rows[i]} row. `
      + `So ${fracWork(v, whole)}. (Dividing by the ${S.rows[i]} row's ${c[i][0] + c[i][1]} answers the question the other way around.) So ${fracText(v, whole)}.`,
  };
}

// ── Without Replacement ─────────────────────────────────────────────────

const COLORS = ['red', 'blue', 'green', 'yellow'];

function withoutReplacement(rng) {
  if (rng.chance(0.25)) {
    const code = rng.pick(['ace', 'king', 'heart', 'spade', 'face', 'red']);
    const n = cards(code);
    const v = [n * (n - 1), 52 * 51];
    const name = code === 'face' ? 'face cards' : code === 'red' ? 'red cards' : `${code}s`;
    return {
      prompt: [T.prose(`Two cards are drawn from a standard deck of 52, without putting the first back. What is the probability that both are ${name}?`)],
      text: `deck two: both ${code}`,
      answer: fracAnswer(...v),
      visual: null,
      explain: `First draw: ${n} of the 52, ${n}/52. That card is gone, so the second is ${n - 1} of the 51 left, ${n - 1}/51. `
        + `Multiply: ${n}/52 × ${n - 1}/51 = ${fracWork(...v)}. (${n}/52 × ${n}/52 would put the first card back.) So ${fracText(...v)}.`,
    };
  }
  const k = rng.int(2, 3);
  const colors = rng.shuffle(COLORS).slice(0, k);
  const counts = colors.map(() => rng.int(2, 8));
  const N = counts.reduce((s, v) => s + v, 0);
  const bag = colors.map((col, i) => `${col}:${counts[i]}`).join(' ');
  const list = colors.map((col, i) => `${counts[i]} ${col}`);
  const intro = `A bag holds ${list.slice(0, -1).join(', ')}${k > 2 ? ',' : ''} and ${list[k - 1]} marbles. Two are taken out, one at a time, without putting the first back.`;
  const mode = rng.pick(['then', 'both', 'one each']);
  const [x, y] = [0, 1];
  const nx = counts[x], ny = counts[y];
  if (mode === 'both') {
    const v = [nx * (nx - 1), N * (N - 1)];
    return {
      prompt: [T.prose(`${intro} What is the probability that both are ${colors[x]}?`)],
      text: `without replacement: ${bag}; both ${colors[x]}`,
      answer: fracAnswer(...v),
      visual: null,
      explain: `First: ${nx} ${colors[x]} of ${N}, ${nx}/${N}. Then one ${colors[x]} is gone, leaving ${nx - 1} of ${N - 1}: ${nx - 1}/${N - 1}. `
        + `Multiply: ${nx}/${N} × ${nx - 1}/${N - 1} = ${fracWork(...v)}. (${nx}/${N} × ${nx}/${N} would mean the first was put back.) So ${fracText(...v)}.`,
    };
  }
  if (mode === 'then') {
    const v = [nx * ny, N * (N - 1)];
    return {
      prompt: [T.prose(`${intro} What is the probability that the first is ${colors[x]} and the second is ${colors[y]}?`)],
      text: `without replacement: ${bag}; ${colors[x]} then ${colors[y]}`,
      answer: fracAnswer(...v),
      visual: null,
      explain: `First: ${nx} ${colors[x]} of ${N}, ${nx}/${N}. Then ${N - 1} are left, and all ${ny} ${colors[y]} are still there: ${ny}/${N - 1}. `
        + `Multiply: ${nx}/${N} × ${ny}/${N - 1} = ${fracWork(...v)}. (Keeping ${N} on the bottom of the second fraction would put the first marble back.) So ${fracText(...v)}.`,
    };
  }
  const v = [2 * nx * ny, N * (N - 1)];
  return {
    prompt: [T.prose(`${intro} What is the probability of getting one ${colors[x]} and one ${colors[y]}, in either order?`)],
    text: `without replacement: ${bag}; one ${colors[x]} one ${colors[y]}`,
    answer: fracAnswer(...v),
    visual: null,
    explain: `${colors[x][0].toUpperCase() + colors[x].slice(1)} then ${colors[y]}: ${nx}/${N} × ${ny}/${N - 1} = ${nx * ny}/${N * (N - 1)}. ${colors[y][0].toUpperCase() + colors[y].slice(1)} then ${colors[x]}: ${ny}/${N} × ${nx}/${N - 1}, the same. `
      + `Add the two orders: ${fracWork(...v)}. (Counting only one order gives half the chance.) So ${fracText(...v)}.`,
  };
}

// ── P(A | B) ────────────────────────────────────────────────────────────

const GIVEN = [
  { b: 'a student plays a sport', a: 'they also play an instrument', ab: 'a student plays a sport and an instrument' },
  { b: 'a day is cloudy', a: 'it also rains', ab: 'a day is cloudy and rainy' },
  { b: 'a customer buys coffee', a: 'they also buy a muffin', ab: 'a customer buys coffee and a muffin' },
  { b: 'a phone is dropped', a: 'its screen cracks', ab: 'a phone is dropped and its screen cracks' },
];

function conditionalFormula(rng) {
  const pb = rng.pick([0.2, 0.25, 0.4, 0.5, 0.8]);
  const q = rng.pick([0.1, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.7, 0.75, 0.8, 0.9]);
  const pab = Math.round(pb * q * 10000) / 10000;
  const back = rng.chance(0.35);
  const C = rng.chance(0.5) ? rng.pick(GIVEN) : null;
  if (back) {
    const prompt = C
      ? `The probability that ${C.b} is ${said(pb)}. Given that, the probability that ${C.a} is ${said(q)}. What is the probability that ${C.ab}?`
      : `P(B) = ${said(pb)} and P(A | B) = ${said(q)}. What is P(A and B)?`;
    return {
      prompt: [T.prose(prompt)],
      text: `and from conditional: ${said(pb)} ${said(q)}`,
      answer: dec(pab),
      visual: null,
      explain: `P(A | B) = P(A and B) ÷ P(B), so P(A and B) = P(B) × P(A | B) = ${said(pb)} × ${said(q)} = ${said(pab)}. `
        + `(${said(q)} alone is the chance once B has happened; "and" still needs B to happen first.) So ${said(pab)}.`,
    };
  }
  const prompt = C
    ? `The probability that ${C.b} is ${said(pb)}, and the probability that ${C.ab} is ${said(pab)}. Given that ${C.b}, what is the probability that ${C.a}?`
    : `P(A and B) = ${said(pab)} and P(B) = ${said(pb)}. What is P(A | B)?`;
  return {
    prompt: [T.prose(prompt)],
    text: `conditional: ${said(pab)} ${said(pb)}`,
    answer: dec(q),
    visual: null,
    explain: `Given B, the whole shrinks to B: P(A | B) = P(A and B) ÷ P(B) = ${said(pab)} ÷ ${said(pb)} = ${said(q)}. `
      + `(${said(pab)} itself is the chance of both out of everything, not out of B.) So ${said(q)}.`,
  };
}

// ── Independent or Not ──────────────────────────────────────────────────

function independence(rng) {
  const mode = rng.pick(['probs', 'probs', 'given', 'table']);
  const yes = rng.chance(0.5);
  if (mode === 'table') {
    const S = rng.pick(TABLES);
    let c;
    for (;;) {
      const r = [rng.int(2, 8) * 5, rng.int(2, 8) * 5];
      const k = rng.pick([1, 2, 3, 4]);
      c = r.map((t) => [(t * k) / 5, t - (t * k) / 5]);
      if (!yes) {
        const shift = rng.pick([-3, -2, 2, 3]);
        c[0][0] += shift; c[0][1] -= shift;
        if (Math.min(...c.flat()) < 1) continue;
      }
      break;
    }
    const [[a, b], [d, e]] = c;
    const p1 = a / (a + b), p2 = d / (d + e);
    const pct = (v) => `${Math.round(v * 1000) / 10}%`;
    return {
      prompt: [T.prose(`The table shows ${a + b + d + e} ${S.who}. Is ${S.c0} independent of ${S.rowVar}?`)],
      text: `independent table: ${a} ${b} / ${d} ${e}`,
      answer: { type: 'choice', value: yes ? 'yes' : 'no', options: YESNO },
      visual: table2(S, c, [`${a} of ${a + b}`, `${d} of ${d + e}`, '']),
      explain: `Compare P(${S.cols[0]}) row by row. ${S.rows[0]}: ${fracWork(a, a + b)} = ${pct(p1)}. ${S.rows[1]}: ${fracWork(d, d + e)} = ${pct(p2)}. `
        + `${yes ? 'They are the same, so knowing the row does not change the chance' : 'They differ, so knowing the row changes the chance'}. `
        + `(Comparing the counts ${a} and ${d} ignores that the rows have different totals.) So ${yes ? 'independent' : 'not independent'}.`,
    };
  }
  const pa = rng.pick([0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8]);
  const pb = rng.pick([0.1, 0.2, 0.3, 0.4, 0.5, 0.6]);
  const prod = Math.round(pa * pb * 100) / 100;
  if (mode === 'given') {
    const pagb = yes ? pa : Math.round((pa + rng.pick([-0.1, 0.1, 0.2])) * 100) / 100;
    return {
      prompt: [T.prose(`P(A) = ${said(pa)} and P(A | B) = ${said(pagb)}. Are A and B independent?`)],
      text: `independent given: ${said(pa)} ${said(pagb)}`,
      answer: { type: 'choice', value: yes ? 'yes' : 'no', options: YESNO },
      visual: null,
      explain: `Independent means knowing B leaves A's chance where it was: P(A | B) = P(A). Here ${said(pagb)} ${yes ? '=' : '≠'} ${said(pa)}. `
        + `(${yes ? 'That B happened tells nothing about A' : 'Being near is not enough; any change means B tells something about A'}.) So ${yes ? 'independent' : 'not independent'}.`,
    };
  }
  let pab = prod;
  if (!yes) {
    for (;;) {
      pab = Math.round((prod + rng.pick([-0.06, -0.04, -0.02, 0.02, 0.04, 0.06])) * 100) / 100;
      if (pab > 0 && pab < Math.min(pa, pb)) break;
    }
  }
  return {
    prompt: [T.prose(`P(A) = ${said(pa)}, P(B) = ${said(pb)} and P(A and B) = ${said(pab)}. Are A and B independent?`)],
    text: `independent: ${said(pa)} ${said(pb)} ${said(pab)}`,
    answer: { type: 'choice', value: yes ? 'yes' : 'no', options: YESNO },
    visual: null,
    explain: `Test the product: P(A) × P(B) = ${said(pa)} × ${said(pb)} = ${said(prod)}, ${yes ? 'which is' : 'but'} P(A and B) ${yes ? '' : 'is '}${said(pab)}. `
      + `(Adding, P(A) + P(B), is no test of independence; only the product is.) So ${yes ? 'independent' : 'not independent'}.`,
  };
}

const CONTENT = [vennDiagrams, addition, conditionalTable, withoutReplacement, conditionalFormula, independence];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
