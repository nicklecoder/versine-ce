/**
 * Catalogue authoring tool: builds the problem library for center and spread.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 *
 * Every `text` names the measure asked for and lists the data as written in
 * the question, unsorted, so scripts/check-answers.py can sort and work it
 * out again. Arithmetic is exact: a data set whose answer would not end
 * within two decimal places is never made, so nothing is ever rounded.
 */
import * as T from '../terms.js';
import { minus } from '../../web/ui/dom.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/data-center.js';

const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const Q = (n, d = 1) => { const g = gcd(n, d) * Math.sign(d); return { n: n / g, d: d / g }; };
const sub = (a, b) => Q(a.n * b.d - b.n * a.d, a.d * b.d);
const num = (q) => q.n / q.d;

/** q as a decimal answer, or null when it would run past `places` places. */
function decimal(q, places = 2) {
  for (let k = 0, p = 1; k <= places; k++, p *= 10) {
    if ((q.n * p) % q.d === 0) return { n: (q.n * p) / q.d, d: p };
  }
  return null;
}
/** q as it is written in prose: 15.8, −0.5, 12. Only ever called on one that ends. */
const said = (q) => { const v = decimal(q, 6); return minus(String(v.n / v.d)); };
const answerOf = (q) => ({ type: 'decimal', value: decimal(q) });

const sum = (xs) => xs.reduce((s, x) => s + x, 0);
const sorted = (xs) => [...xs].sort((a, b) => a - b);
/** The median of a list already in order, as a fraction: 7, or 15/2. */
const middle = (ys) => (ys.length % 2 ? Q(ys[(ys.length - 1) / 2]) : Q(ys[ys.length / 2 - 1] + ys[ys.length / 2], 2));
const meanOf = (xs) => Q(sum(xs), xs.length);
/** The lower and upper halves, the middle value of an odd count in neither. */
function halves(ys) {
  const h = Math.floor(ys.length / 2);
  return [ys.slice(0, h), ys.slice(ys.length - h)];
}

/** A list as the question writes it, and as the text does. */
const listed = (xs) => xs.map(minus).join(', ');
const ascii = (xs) => xs.join(', ');
/** 14 + 18 − 3 + 0: a sum as it is worked, a negative taken away. */
const added = (xs) => xs.map((x, i) => (i === 0 ? minus(x) : x < 0 ? ` − ${-x}` : ` + ${x}`)).join('');
const ORDINAL = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];

/**
 * Where a list of numbers turns up: what it is, and the range its values
 * are drawn from. Temperatures and price changes go below zero.
 */
const SETS = [
  { what: (n) => `Maya’s last ${n} quiz scores, out of 20`, lo: 6, hi: 20 },
  { what: (n) => `The goals a team scored in its last ${n} games`, lo: 0, hi: 7 },
  { what: (n) => `The low temperatures on ${n} winter nights, in °C`, lo: -9, hi: 6 },
  { what: (n) => `The low temperatures on ${n} winter nights, in °F`, lo: -6, hi: 28 },
  { what: (n) => `The weights of ${n} pumpkins at a fair, in pounds`, lo: 6, hi: 40 },
  { what: (n) => `The minutes ${n} students spent on homework last night`, lo: 5, hi: 75 },
  { what: (n) => `The heights of ${n} seedlings, in cm`, lo: 3, hi: 24 },
  { what: (n) => `The books ${n} students read over the summer`, lo: 0, hi: 14 },
  { what: (n) => `The points a player scored in ${n} basketball games`, lo: 2, hi: 34 },
  { what: (n) => `The push-ups ${n} friends did in a minute`, lo: 8, hi: 45 },
  { what: (n) => `The ages of ${n} people at a workshop`, lo: 16, hi: 64 },
  { what: (n) => `The prices of ${n} board games, in dollars`, lo: 12, hi: 60 },
  { what: (n) => `The daily change in a share price over ${n} days, in dollars`, lo: -8, hi: 8 },
  { what: () => 'The data', lo: -12, hi: 40 },
];

function draw(rng, n, at = rng.pick(SETS)) {
  return { at, xs: Array.from({ length: n }, () => rng.int(at.lo, at.hi)) };
}
/** Shuffled until it is out of order, so sorting is never already done. */
function unsorted(rng, xs) {
  if (new Set(xs).size === 1) return xs;
  let out = rng.shuffle([...xs]);
  while (out.every((x, i) => i === 0 || out[i - 1] <= x)) out = rng.shuffle([...xs]);
  return out;
}

function mean(rng) {
  const n = rng.pick([4, 5, 5, 6, 6, 7, 8]);
  const { at, xs } = draw(rng, n);
  const m = meanOf(xs);
  if (!decimal(m)) return mean(rng);
  const notes = [];
  if (xs.includes(0)) notes.push('A 0 is still a value: it adds nothing to the total but it counts in the dividing.');
  if (xs.some((x) => x < 0)) notes.push('Adding a negative takes it away.');
  return {
    prompt: [T.prose(`${at.what(n)}: ${listed(xs)}. What is the mean?`)],
    text: `mean: ${ascii(xs)}`,
    answer: answerOf(m),
    visual: null,
    explain: `Add all ${n}: ${added(xs)} = ${minus(sum(xs))}. ${notes.join(' ')}${notes.length ? ' ' : ''}`
      + `Share the total equally by dividing by how many there are, ${n}: ${minus(sum(xs))} ÷ ${n} = ${said(m)}. `
      + `So the mean is ${said(m)}.`,
  };
}

/** How the median is found in a list in order, ending on what it is. */
function medianWorking(ys) {
  const n = ys.length;
  if (n % 2) {
    const k = (n + 1) / 2;
    return `With ${n} values the middle one is the ${ORDINAL[k]}: ${minus(ys[k - 1])}`;
  }
  const k = n / 2;
  const a = ys[k - 1], b = ys[k];
  return `With ${n} values there are two in the middle, the ${ORDINAL[k]} and ${ORDINAL[k + 1]}: ${minus(a)} and ${minus(b)}. `
    + `The median is halfway between them: (${added([a, b])}) ÷ 2 = ${said(Q(a + b, 2))}`;
}

function median(rng) {
  const n = rng.int(5, 10);
  const { at, xs: raw } = draw(rng, n);
  const xs = unsorted(rng, raw);
  const ys = sorted(xs);
  const m = middle(ys);
  // The middle of the list as written is the slip; most problems are drawn
  // so that it is wrong, and the explanation says so.
  const asWritten = middle(xs);
  if (num(asWritten) === num(m) && rng.chance(0.8)) return median(rng);
  const given = n % 2 ? `The middle of the list as it was given, ${minus(xs[(n - 1) / 2])}, is not it`
    : `The middle two as they were given, ${minus(xs[n / 2 - 1])} and ${minus(xs[n / 2])}, are not them`;
  const slip = num(asWritten) !== num(m) ? ` ${given}: the order comes first.` : '';
  return {
    prompt: [T.prose(`${at.what(n)}: ${listed(xs)}. What is the median?`)],
    text: `median: ${ascii(xs)}`,
    answer: answerOf(m),
    visual: null,
    explain: `Put them in order: ${listed(ys)}. ${medianWorking(ys)}.${slip} So the median is ${said(m)}.`,
  };
}

/** Tests and games where a next score can lift a mean. */
const NEXT = [
  { who: 'Jo', thing: 'test', things: 'tests', lo: 60, hi: 92, top: 100 },
  { who: 'Ravi', thing: 'math test', things: 'math tests', lo: 55, hi: 90, top: 100 },
  { who: 'A bowler', thing: 'game', things: 'games', lo: 110, hi: 180, top: 300 },
  { who: 'Lena', thing: 'quiz', things: 'quizzes', lo: 10, hi: 18, top: 20 },
];

function missing(rng, kind = rng.pick(['fill', 'next', 'add'])) {
  if (kind === 'fill') {
    const n = rng.pick([4, 5, 5, 6, 8]);
    const { at, xs } = draw(rng, n);
    const m = meanOf(xs);
    // The stated mean must be one a person would write: whole, or a half.
    if (!decimal(m, 1) || (m.d !== 1 && m.d !== 2)) return missing(rng, kind);
    const known = xs.slice(0, -1), want = xs[n - 1];
    const total = Q(n * m.n, m.d);
    return {
      prompt: [T.prose(`${at.what(n)}${at.what(n).includes(',') ? ',' : ''} have a mean of ${said(m)}. ${n - 1} of them are ${listed(known)}. What is the ${ORDINAL[n]}?`)],
      text: `missing for mean: mean ${said(m).replace('−', '-')} over ${n}, given ${ascii(known)}`,
      answer: answerOf(Q(want)),
      visual: null,
      explain: `A mean of ${said(m)} over ${n} values means they total ${n} × ${said(m)} = ${said(total)}. `
        + `The ${n - 1} given add to ${added(known)} = ${minus(sum(known))}, so the ${ORDINAL[n]} is `
        + `${said(total)} − ${signedText(sum(known))} = ${minus(want)}. So it is ${minus(want)}.`,
    };
  }
  const s = rng.pick(NEXT);
  const n = rng.int(3, 7);
  const now = rng.int(s.lo, s.hi);
  if (kind === 'next') {
    const lift = rng.int(1, 6);
    const goal = now + lift;
    const want = (n + 1) * goal - n * now;
    if (want > s.top) return missing(rng, kind);
    return {
      prompt: [T.prose(`${s.who} has a mean score of ${now} over ${n} ${s.things}. What score on the next ${s.thing} would bring the mean up to ${goal}?`)],
      text: `next to reach: ${n} at ${now}, want ${goal}`,
      answer: answerOf(Q(want)),
      visual: null,
      explain: `${n} ${s.things} at a mean of ${now} total ${n} × ${now} = ${n * now}. A mean of ${goal} over ${n + 1} needs a total of `
        + `${n + 1} × ${goal} = ${(n + 1) * goal}, so the next score must be ${(n + 1) * goal} − ${n * now} = ${want}. `
        + `(Not ${goal}: it has to lift the other ${n} by ${lift} each as well, ${goal} + ${n} × ${lift} = ${want}.) So ${want}.`,
    };
  }
  // A new value joins: the new mean is the new total over one more.
  const next = rng.int(Math.max(0, s.lo - 20), Math.min(s.top, s.hi + 20));
  const m = Q(n * now + next, n + 1);
  if (!decimal(m) || next === now) return missing(rng, kind);
  return {
    prompt: [T.prose(`${s.who} has a mean score of ${now} over ${n} ${s.things}, then scores ${next} on the next one. What is the mean now?`)],
    text: `add to mean: ${n} at ${now}, add ${next}`,
    answer: answerOf(m),
    visual: null,
    explain: `The ${n} ${s.things} total ${n} × ${now} = ${n * now}. With ${next} the total is ${n * now + next}, over ${n + 1} ${s.things}: `
      + `${n * now + next} ÷ ${n + 1} = ${said(m)}. (Not the mean of ${now} and ${next}: the old mean stands for ${n} scores, the new one for one.) `
      + `So the mean is ${said(m)}.`,
  };
}
/** A number as it follows a minus sign: 47, or (−3). */
const signedText = (n) => (n < 0 ? `(−${-n})` : String(n));
/** A fraction as it follows a minus sign: 4.5, or (−1.5). */
const after = (q) => (q.n < 0 ? `(${said(q)})` : said(q));

function quartiles(rng) {
  const n = rng.int(7, 12);
  const ask = rng.pick(['q1', 'q3', 'iqr', 'iqr', 'range']);
  const { at, xs: raw } = draw(rng, n);
  const xs = unsorted(rng, raw);
  const ys = sorted(xs);
  const [lower, upper] = halves(ys);
  const q1 = middle(lower), q3 = middle(upper), iqr = sub(q3, q1);
  if (num(iqr) === 0) return quartiles(rng);
  const med = middle(ys);
  const split = n % 2
    ? `The median, ${said(med)}, is the ${ORDINAL[(n + 1) / 2]} of ${n}; with an odd count it sits in neither half`
    : `With ${n} values the halves are the first ${n / 2} and the last ${n / 2}`;
  const lowerLine = `the lower half is ${listed(lower)}, whose median is Q1 = ${said(q1)}`;
  const upperLine = `the upper half is ${listed(upper)}, whose median is Q3 = ${said(q3)}`;
  const SHORT = { q1: 'Q1', q3: 'Q3', iqr: 'the IQR', range: 'the range' };
  const PHRASE = {
    q1: 'the first quartile, Q1', q3: 'the third quartile, Q3', iqr: 'the interquartile range (IQR)', range: 'the range',
  };
  let working, want;
  if (ask === 'range') {
    want = Q(ys[n - 1] - ys[0]);
    working = `The range is the highest minus the lowest: ${minus(ys[n - 1])} − ${signedText(ys[0])} = ${said(want)}. `
      + `(The IQR would be the spread of the middle half only, Q3 − Q1 = ${said(q3)} − ${after(q1)} = ${said(iqr)}.)`;
  } else {
    want = { q1, q3, iqr }[ask];
    const lines = ask === 'q1' ? lowerLine : ask === 'q3' ? upperLine : `${lowerLine}, and ${upperLine}`;
    working = `${split}: ${lines}.`
      + (ask === 'iqr' ? ` The IQR is Q3 − Q1 = ${said(q3)} − ${after(q1)} = ${said(iqr)}. `
        // The range is named as the slip only where it would give another answer.
        + (ys[n - 1] - ys[0] === num(iqr) ? ''
          : `(Not the range, ${minus(ys[n - 1])} − ${signedText(ys[0])} = ${ys[n - 1] - ys[0]}: the IQR leaves out the top and bottom quarters.)`) : '');
  }
  return {
    prompt: [T.prose(`${at.what(n)}: ${listed(xs)}. What is ${PHRASE[ask]}?`)],
    text: `${ask}: ${ascii(xs)}`,
    answer: answerOf(want),
    visual: null,
    explain: `In order: ${listed(ys)}. ${working} So ${SHORT[ask]} is ${said(want)}.`,
  };
}

function mad(rng) {
  const n = rng.pick([4, 5, 5, 6, 6, 8]);
  const { at, xs } = draw(rng, n);
  const m = meanOf(xs);
  // A whole mean keeps every distance whole, which is how this is first met.
  if (m.d !== 1) return mad(rng);
  const c = m.n;
  const dist = xs.map((x) => Math.abs(x - c));
  const d = Q(sum(dist), n);
  if (!decimal(d) || sum(dist) === 0) return mad(rng);
  const below = Math.min(...xs);
  return {
    // The values are in the table, where their distances are written on the
    // reveal; listing them in the sentence too says them twice.
    prompt: [T.prose(`${at.what(n)}${at.what(n).includes(',') ? ',' : ''} are in the table. What is the mean absolute deviation?`)],
    text: `mad: ${ascii(xs)}`,
    answer: answerOf(d),
    visual: { kind: 'table', cols: ['Value'], rows: xs.map((x) => [minus(x)]),
      workingCol: `Distance from ${minus(c)}`, working: dist.map(String) },
    explain: `The mean first: ${added(xs)} = ${minus(sum(xs))}, and ${minus(sum(xs))} ÷ ${n} = ${minus(c)}. `
      + `Each value’s distance from ${minus(c)}: ${dist.join(', ')}. ${minus(below)} is ${c - below} below the mean, and its distance is ${c - below}, not −${c - below}. `
      + `They add to ${sum(dist)}, and ${sum(dist)} ÷ ${n} = ${said(d)}. `
      + `(Left with their signs, the differences would always add to 0.) So the MAD is ${said(d)}.`,
  };
}

/**
 * Who wants to know something about a whole group, and the ways they might
 * pick a sample of it. Each way says whether every member could be picked
 * ('all') or only some ('part'), and whether the picking was left to
 * chance or to choice -- the picker's, or the people's own. Only all and
 * chance together is representative; a random pick from part of the group
 * is the trap, since it sounds fair.
 */
const POPS = [
  { id: 'school', who: 'A principal', the: 'The principal', all: 'all 900 students at her school',
    about: ['how students get to school', 'how much homework students do each night',
      'which new lunch options students want', 'how much sleep students get'],
    fair: [
      [(k) => `picks ${k} names at random from the list of every student`, 'all', 'chance'],
      [(k) => `draws ${k} student numbers from a hat holding every student’s number`, 'all', 'chance'],
      [(k) => `has a computer shuffle the full list of students and takes the first ${k} names`, 'all', 'chance'],
      [(k) => `numbers every student and uses a random number generator to choose ${k}`, 'all', 'chance'],
    ],
    unfair: [
      [(k) => `asks the first ${k} students to arrive at the library`, 'part', 'choice'],
      [(k) => `picks ${k} students at random from the 7th grade only`, 'part', 'chance'],
      [(k) => `puts a survey on the school website and uses the first ${k} replies`, 'all', 'choice'],
      [(k) => `asks ${k} students from the soccer and basketball teams`, 'part', 'choice'],
      [(k) => `asks the ${k} students in her own homeroom classes`, 'part', 'choice'],
    ] },
  { id: 'town', who: 'A town council', the: 'The council', all: 'all 12,000 households in town',
    about: ['whether households want a skate park', 'how often people in town ride the bus',
      'how much water households use', 'whether households want longer library hours'],
    fair: [
      [(k) => `chooses ${k} addresses at random from a list of every home in town`, 'all', 'chance'],
      [(k) => `numbers every household on the town map and picks ${k} with a random number generator`, 'all', 'chance'],
      [(k) => `draws ${k} addresses from a drum holding every address in town`, 'all', 'chance'],
    ],
    unfair: [
      [(k) => `asks ${k} people outside the town hall one weekday afternoon`, 'part', 'choice'],
      [(k) => `chooses ${k} homes at random, all on the streets nearest the park`, 'part', 'chance'],
      [(k) => `posts the question on the council’s page and counts the first ${k} answers`, 'all', 'choice'],
      [(k) => `asks ${k} people at the bus station`, 'part', 'choice'],
    ] },
  { id: 'factory', who: 'A factory manager', the: 'The manager', all: 'all 5,000 light bulbs made in a day',
    about: ['how many of the bulbs are faulty', 'how long the bulbs last'],
    fair: [
      [(k) => `tests ${k} bulbs picked at random from the whole day’s output`, 'all', 'chance'],
      [(k) => `numbers the day’s bulbs and tests the ${k} a random number generator picks`, 'all', 'chance'],
    ],
    unfair: [
      [(k) => `tests the first ${k} bulbs made that morning`, 'part', 'choice'],
      [(k) => `tests ${k} bulbs picked at random from just one of the five machines`, 'part', 'chance'],
      [(k) => `tests the ${k} bulbs on the top of the boxes, where they are easiest to reach`, 'part', 'choice'],
    ] },
  { id: 'lake', who: 'A park ranger', the: 'The ranger', all: 'all the fish in a large lake',
    about: ['how long the fish are', 'how many of the fish carry a disease'],
    fair: [
      [(k) => `nets ${k} fish at spots chosen at random all over the lake`, 'all', 'chance'],
      [(k) => `nets fish at random points on a grid laid over the whole lake, ${k} fish in all`, 'all', 'chance'],
    ],
    unfair: [
      [(k) => `nets ${k} fish in the shallow corner by the dock`, 'part', 'choice'],
      [(k) => `measures the ${k} fish that anglers choose to bring in to show off`, 'all', 'choice'],
      [(k) => `nets ${k} fish at random spots, all along the north shore`, 'part', 'chance'],
    ] },
  { id: 'app', who: 'A music app', the: 'The company', all: 'all 2 million of its members',
    about: ['how many hours members listen each week', 'whether members would pay to hear fewer ads'],
    fair: [
      [(k) => `picks ${k} accounts at random from every account on its records`, 'all', 'chance'],
      [(k) => `chooses ${k} member numbers with a random number generator`, 'all', 'chance'],
    ],
    unfair: [
      [(k) => `emails every member and uses the first ${k} who reply`, 'all', 'choice'],
      [(k) => `asks the ${k} members who listened the most last week`, 'part', 'choice'],
      [(k) => `picks ${k} accounts at random from members who joined this month`, 'part', 'chance'],
    ] },
];
const SIZES = [25, 30, 40, 50, 60, 75, 80, 100, 120, 150, 200, 250, 300];

const VERDICTS = [
  { id: 'yes', label: 'Yes, it is representative', note: 'every member had the same chance' },
  { id: 'no', label: 'No, it is biased', note: 'some members were more likely to be picked' },
];

function representative(rng) {
  const p = rng.pick(POPS);
  const fair = rng.chance(0.5);
  const ways = fair ? p.fair : p.unfair;
  const at = rng.int(0, ways.length - 1);
  const [method, from, by] = ways[at];
  const about = rng.int(0, p.about.length - 1);
  const k = rng.pick(SIZES);
  const group = p.all.replace(/^all (the )?/, 'the ');
  const why = from === 'part' && by === 'chance'
    ? `It is random, but only from part of the group: the rest of ${group} never had a chance to be picked, and a random pick from the wrong group is still the wrong group. So it is biased.`
    : from === 'part'
      ? `Only part of the group could be chosen, and those in it may not be like the rest of ${group}. So it is biased.`
      : by === 'choice'
        ? 'The sample chose itself: those who answer first, or at all, are the keen ones, not a fair cross-section. So it is biased.'
        : `It is drawn from all of ${group}, by chance, so every member had the same chance of being picked. So it is representative.`;
  return {
    prompt: [T.prose(`${p.who} wants to know ${p.about[about]}, for ${p.all}. ${p.the} ${method(k)}. Is the sample representative?`)],
    text: `sample (${p.id}, ${about}, ${fair ? 'f' : 'u'}${at}, ${k}): from ${from}, by ${by}`,
    answer: { type: 'choice', value: fair ? 'yes' : 'no', options: VERDICTS },
    visual: null,
    explain: why,
  };
}

/**
 * Random samples whose share scales up to a whole group. Each thing counted
 * carries the largest share of a sample that is believable for it: a
 * factory where most bulbs fail is not one anyone samples.
 */
const ESTIMATES = [
  { all: 'students at a school', Ns: [600, 800, 900, 1200, 1500], unit: 'students',
    has: [['walk to school', 0.6], ['play an instrument', 0.5], ['bring lunch from home', 0.8], ['have a pet', 0.7]] },
  { all: 'households in a town', Ns: [4000, 6000, 8000, 12000, 20000], unit: 'households',
    has: [['own a dog', 0.5], ['have solar panels', 0.3], ['recycle every week', 0.9]] },
  { all: 'bulbs a factory made today', Ns: [2000, 3000, 5000, 8000, 10000], unit: 'bulbs',
    has: [['are faulty', 0.1]] },
  { all: 'voters in a city', Ns: [9000, 15000, 24000, 30000, 45000], unit: 'voters',
    has: [['plan to vote yes', 0.8], ['want a new park', 0.8], ['ride the bus each week', 0.5]] },
];
const big = (n) => n.toLocaleString('en-US');

function estimate(rng) {
  const e = rng.pick(ESTIMATES);
  const N = rng.pick(e.Ns);
  const k = rng.pick([20, 25, 40, 50, 60, 75, 80, 100, 120, 150, 200, 250]);
  const [has, most] = rng.pick(e.has);
  const c = rng.int(1, Math.floor(k * most));
  if ((c * N) % k !== 0 || k >= N) return estimate(rng);
  const want = (c * N) / k;
  const share = Q(c, k);
  const how = N % k === 0
    ? `${big(N)} is ${N / k} times ${k}, so about ${N / k} × ${c} = ${big(want)}.`
    : `${c} out of ${k} is ${c}/${k}${share.d !== k ? ` = ${share.n}/${share.d}` : ''}, and ${share.n}/${share.d} of ${big(N)} is `
      + `${big(N)} ÷ ${share.d} × ${share.n} = ${big(want)}.`;
  return {
    prompt: [T.prose(`In a random sample of ${k} of the ${big(N)} ${e.all}, ${c} ${has}. About how many of all ${big(N)} ${has}?`)],
    text: `sample estimate: ${c} of ${k}, population ${N}`,
    answer: answerOf(Q(want)),
    visual: null,
    explain: `A random sample is a small copy of the whole, so the same share holds. ${how} So about ${big(want)} ${e.unit}.`,
  };
}

const samples = (rng) => (rng.chance(0.5) ? representative(rng) : estimate(rng));

/** Values more than 1.5 IQRs beyond a quartile: the usual test for an outlier. */
function outliers(xs) {
  const ys = sorted(xs);
  const [lo, hi] = halves(ys);
  const q1 = num(middle(lo)), q3 = num(middle(hi)), r = q3 - q1;
  return ys.filter((y) => y < q1 - 1.5 * r || y > q3 + 1.5 * r);
}

const CENTERS = [
  { id: 'mean', label: 'The mean' },
  { id: 'median', label: 'The median' },
];
const SPREADS = [
  { id: 'iqr', label: 'The IQR' },
  { id: 'mad', label: 'The MAD' },
];

// A retry keeps what was drawn to be asked, or the rarer kind would be
// redrawn away every time its data failed.
function which(rng, odd = rng.chance(0.5), center = rng.chance(0.5)) {
  const n = rng.int(7, 11);
  const at = rng.pick(SETS.filter((s) => s.hi - s.lo >= 14));
  let xs;
  if (odd) {
    // A tight cluster, and one value far outside it.
    const width = rng.int(4, 8);
    const base = rng.int(at.lo, at.hi - width);
    xs = Array.from({ length: n - 1 }, () => base + rng.int(0, width));
    const far = rng.int(3, 6) * width;
    xs.push(rng.chance(0.7) ? base + width + far : base - far);
    if (outliers(xs).length !== 1) return which(rng, odd, center);
  } else {
    // Spread evenly either side of a middle, nothing apart from the rest.
    const c = rng.int(at.lo + 6, at.hi - 6);
    const half = (n - 1) / 2;
    xs = Array.from({ length: n }, (_, i) => c + Math.round((i - half) * rng.int(1, 2)) + rng.int(-1, 1));
    if (outliers(xs).length) return which(rng, odd, center);
    const ys = sorted(xs);
    if (Math.abs(num(meanOf(xs)) - num(middle(ys))) > (ys[n - 1] - ys[0]) / 10) return which(rng, odd, center);
  }
  // Inside what the setting allows: no quiz scored 50 out of 20.
  if (xs.some((x) => x < at.lo || x > at.hi)) return which(rng, odd, center);
  xs = unsorted(rng, xs);
  const ys = sorted(xs);
  const m = meanOf(xs), med = middle(ys);
  const meanText = decimal(m) ? said(m) : `about ${(Math.round(num(m) * 10) / 10).toString().replace('-', '−')}`;
  const value = odd ? (center ? 'median' : 'iqr') : (center ? 'mean' : 'mad');
  const out = odd ? outliers(xs)[0] : null;
  const rest = odd ? ys.filter((y) => y !== out) : ys;
  const explain = odd
    ? `One value, ${minus(out)}, sits far from the rest, which run from ${minus(rest[0])} to ${minus(rest[rest.length - 1])}. `
      + `It drags the mean ${out > med.n / med.d ? 'up' : 'down'} to ${meanText}, while the median, ${said(med)}, stays among the others. `
      + (center ? 'So the median describes the typical value.'
        : 'The MAD is built on the mean and on every distance, the outlier’s too; the IQR uses only the middle half. So the IQR.')
    : `No value sits apart from the rest, and they spread evenly either side of the middle: the mean, ${meanText}, and the median, ${said(med)}, nearly agree. `
      + (center ? 'Then the mean, which uses every value, describes them well. So the mean.'
        : 'Then the MAD, which uses every value, describes the spread well. So the MAD.');
  return {
    prompt: [T.prose(`${at.what(n)}: ${listed(xs)}. Which better describes ${center ? 'a typical value' : 'how spread out they are'}?`)],
    text: `${center ? 'center' : 'spread'}: ${ascii(xs)}`,
    answer: { type: 'choice', value, options: center ? CENTERS : SPREADS },
    visual: null,
    explain,
  };
}

const CONTENT = [mean, median, missing, quartiles, mad, samples, which];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
