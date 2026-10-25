/**
 * Catalogue authoring tool: builds the problem library for units of measure.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 *
 * Every `text` gives the amount, its unit and the unit wanted, and any
 * factor the question supplies, so scripts/check-answers.py can convert
 * again from its own table of unit facts. A rounded answer says " to 1 dp"
 * or " to the nearest whole", and carries the places it was rounded to.
 *
 * Asked in words, with no picture: a ruler or a jug drawn to scale would
 * show the answer rather than ask for it.
 */
import * as T from '../terms.js';
import { f } from './figures.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/units.js';

// ── Units and the facts between them ────────────────────────────────────

/** How a unit is written after a number (and when there is only 1), and its plural name. */
const UNIT = {
  in: ['inches', 'inch', 'inches'], ft: ['ft', 'ft', 'feet'], yd: ['yd', 'yd', 'yards'], mi: ['mi', 'mi', 'miles'],
  oz: ['oz', 'oz', 'ounces'], lb: ['lb', 'lb', 'pounds'], ton: ['tons', 'ton', 'tons'],
  floz: ['fl oz', 'fl oz', 'fluid ounces'], cup: ['cups', 'cup', 'cups'], pt: ['pt', 'pt', 'pints'],
  qt: ['qt', 'qt', 'quarts'], gal: ['gal', 'gal', 'gallons'],
  mm: ['mm', 'mm', 'millimeters'], cm: ['cm', 'cm', 'centimeters'], m: ['m', 'm', 'meters'], km: ['km', 'km', 'kilometers'],
  mg: ['mg', 'mg', 'milligrams'], g: ['g', 'g', 'grams'], kg: ['kg', 'kg', 'kilograms'],
  mL: ['mL', 'mL', 'milliliters'], L: ['L', 'L', 'liters'],
  s: ['s', 's', 'seconds'], min: ['min', 'min', 'minutes'], h: ['h', 'h', 'hours'], day: ['days', 'day', 'days'],
  week: ['weeks', 'week', 'weeks'],
  in2: ['in²', 'in²', 'square inches'], ft2: ['ft²', 'ft²', 'square feet'], yd2: ['yd²', 'yd²', 'square yards'],
  mm2: ['mm²', 'mm²', 'square millimeters'], cm2: ['cm²', 'cm²', 'square centimeters'], m2: ['m²', 'm²', 'square meters'],
  in3: ['in³', 'in³', 'cubic inches'], ft3: ['ft³', 'ft³', 'cubic feet'], yd3: ['yd³', 'yd³', 'cubic yards'],
  cm3: ['cm³', 'cm³', 'cubic centimeters'], m3: ['m³', 'm³', 'cubic meters'],
  usd: ['', '', 'dollars'], cent: ['¢', '¢', 'cents'],
};
/** [bigger, smaller, how many of the smaller make one bigger]. */
const FACTS = [
  ['ft', 'in', 12], ['yd', 'ft', 3], ['mi', 'ft', 5280], ['mi', 'yd', 1760],
  ['lb', 'oz', 16], ['ton', 'lb', 2000],
  ['cup', 'floz', 8], ['pt', 'cup', 2], ['qt', 'pt', 2], ['gal', 'qt', 4],
  ['cm', 'mm', 10], ['m', 'cm', 100], ['km', 'm', 1000], ['m', 'mm', 1000],
  ['g', 'mg', 1000], ['kg', 'g', 1000], ['L', 'mL', 1000],
  ['min', 's', 60], ['h', 'min', 60], ['day', 'h', 24], ['week', 'day', 7],
  ['ft2', 'in2', 144], ['yd2', 'ft2', 9], ['cm2', 'mm2', 100], ['m2', 'cm2', 10000],
  ['ft3', 'in3', 1728], ['yd3', 'ft3', 27], ['m3', 'cm3', 1000000], ['L', 'cm3', 1000], ['cm3', 'mL', 1],
  ['usd', 'cent', 100],
];
const METRIC = new Set(['mm', 'cm', 'm', 'km', 'mg', 'g', 'kg', 'mL', 'L', 'cm2', 'm2', 'mm2', 'cm3', 'm3']);

/** The facts that lead from one unit to another, each as [from, to, multiply by]. */
function path(from, to) {
  const seen = new Map([[from, null]]), queue = [from];
  while (queue.length) {
    const u = queue.shift();
    if (u === to) break;
    for (const [big, small, k] of FACTS) {
      const step = u === big ? [small, k] : u === small ? [big, 1 / k] : null;
      if (step && !seen.has(step[0])) { seen.set(step[0], [u, step[1], [big, small, k]]); queue.push(step[0]); }
    }
  }
  if (!seen.has(to)) throw new Error(`no path ${from} → ${to}`);
  const steps = [];
  for (let u = to; seen.get(u); u = seen.get(u)[0]) steps.unshift({ from: seen.get(u)[0], to: u, by: seen.get(u)[1], fact: seen.get(u)[2] });
  return steps;
}
const factorOf = (from, to) => path(from, to).reduce((k, s) => k * s.by, 1);

// ── Writing numbers and amounts ─────────────────────────────────────────

/** A number as US prose writes it: commas between thousands, a true minus. */
function num(v) {
  const s = f(Math.abs(v)), [w, d] = s.split('.');
  return `${v < 0 ? '−' : ''}${w.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${d ? `.${d}` : ''}`;
}
const amt = (v, u) => (u === 'usd' ? `$${money(v)}` : u === 'cent' ? `${num(v)}¢` : `${num(v)} ${v === 1 ? UNIT[u][1] : UNIT[u][0]}`);
/** A rounded value written to exactly `p` places, so 1 to 1 dp reads 1.0. */
const fixed = (v, p) => num(Math.round(v * 10 ** p) / 10 ** p).replace(/^([−\d,]+)(?:\.(\d*))?$/,
  (_, w, d = '') => (p ? `${w}.${d.padEnd(p, '0')}` : w));
const money = (v) => (Number.isInteger(v) ? num(v) : v.toFixed(2));
const words = (u) => UNIT[u][2];
/** One of a unit, in words: inch, foot, centimeter. */
const one = (u) => ({ inches: 'inch', feet: 'foot' }[UNIT[u][2]] ?? UNIT[u][2].replace(/s$/, ''));
const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
/** "a foot", "an ounce". */
const aOne = (u) => `${/^[aeiou]/.test(one(u)) ? 'an' : 'a'} ${one(u)}`;
const factText = ([big, small, k]) => `1 ${UNIT[big][1]} = ${amt(k, small)}`;
const plain = (v) => f(v);                              // a number in a text, for the checker
/** True when v needs no more than `p` decimal places. */
const ends = (v, p = 2) => Math.abs(v * 10 ** p - Math.round(v * 10 ** p)) < 1e-7;
function decimals(v) {
  for (let p = 0; p <= 6; p++) if (ends(v, p)) return p;
  return 6;
}
/** An exact decimal answer, as the decimal type holds it. */
const answerOf = (v) => {
  const p = decimals(v);
  return { type: 'decimal', value: { n: Math.round(v * 10 ** p), d: 10 ** p } };
};
/** A rounded answer, carrying its places. */
const roundedTo = (v, p) => ({ type: 'decimal', value: { n: Math.round(v * 10 ** p), d: 10 ** p, places: p } });
/** Too near a rounding edge to round honestly from a factor that is itself rounded. */
const onEdge = (v, p) => Math.abs(((v * 10 ** p) % 1) - 0.5) < 0.04;

// ── Converting within a system ──────────────────────────────────────────

/**
 * One conversion, written out: the facts used, the factor they make, and
 * multiply or divide. `v` is in `from`; the answer is in `to`.
 */
/**
 * v × size or v ÷ size, worked exactly from v's written digits: whether it
 * comes out exactly, and the value to write. Floats would say 1.1 × 100,000
 * is 110,000.00000000001, and so not exact.
 */
function exactly(v, size, down) {
  const [w, fr = ''] = f(Math.abs(v)).split('.');
  let n = BigInt(w + fr), d = 10n ** BigInt(fr.length);
  const k = BigInt(Math.round(size));
  if (down) n *= k; else d *= k;
  const g = (a, b) => (b === 0n ? a : g(b, a % b)), c = g(n, d);
  n /= c; d /= c;
  let rest = d;
  for (const q of [2n, 5n]) while (rest % q === 0n) rest /= q;
  return { exact: rest === 1n, value: (v < 0 ? -1 : 1) * (Number(n) / Number(d)) };
}

function converted(v, from, to) {
  const steps = path(from, to), k = steps.reduce((p, s) => p * s.by, 1), result = v * k;
  const down = k > 1, size = down ? k : 1 / k;
  const worked = exactly(v, size, down);
  const facts = steps.map((s) => factText(s.fact));
  const joined = facts.length > 1
    ? `${facts.join(' and ')}, so 1 ${UNIT[down ? from : to][1]} = ${amt(size, down ? to : from)}`
    : facts[0];
  const shift = METRIC.has(from) && METRIC.has(to) && Number.isInteger(Math.log10(size))
    ? ` ${down ? 'Multiplying' : 'Dividing'} by ${num(size)} moves the decimal point ${Math.log10(size)} place${size === 10 ? '' : 's'} `
      + `${down ? 'right' : 'left'}.` : '';
  // requiem: catalogue/content/worked-steps-exact
  // Exact when it is exact, and otherwise to 4 places, the precision every step here carries.
  const work = `${joined}. ${down ? `${amt(v, from)} × ${num(size)}` : `${amt(v, from)} ÷ ${num(size)}`} ${worked.exact ? '=' : '≈'} `
    + `${amt(worked.exact ? worked.value : Math.round(result * 1e4) / 1e4, to)}.${shift} `
    + (down ? `(A smaller unit takes more of them, so the number goes up: multiply.)`
      : `(A bigger unit takes fewer of them, so the number goes down: divide.)`);
  return { result, work, down };
}

function conversion(v, from, to) {
  const c = converted(v, from, to);
  return {
    prompt: [T.prose(c.down ? `How many ${words(to)} are in ${amt(v, from)}?` : `What is ${amt(v, from)} in ${words(to)}?`)],
    text: `units: ${plain(v)} ${from} to ${to}`,
    answer: answerOf(c.result),
    visual: null,
    explain: `${c.work} So ${amt(c.result, to)}.`,
  };
}

/** An amount in `from` that converts to `to` with at most `places` decimals, and not past a million. */
function niceAmount(rng, from, to, places = 2) {
  const k = factorOf(from, to);
  for (;;) {
    let v;
    if (k >= 1) {
      v = rng.pick([rng.int(2, 20), rng.int(2, 12) + 0.5, rng.int(1, 9) + 0.25, rng.int(11, 99) / 10, ...(k >= 1e5 ? [rng.int(1, 9) / 10, rng.int(1, 9) / 10] : [])]);
      if (!METRIC.has(from) && !ends(v, 2)) continue;
    } else {
      // Choose the answer and work back, so the amount asked about is whole or nearly so.
      const r = rng.pick([rng.int(2, 20), rng.int(1, 12) + 0.5, rng.int(1, 8) + 0.25, rng.int(1, 9) + 0.75, rng.int(1, 99) / 10]);
      v = r / k;
      if (!ends(v, 1)) continue;
    }
    const r = v * k;
    if (ends(r, places) && r <= 1e7 && r >= 0.01 && v >= 0.1) return v;
  }
}

/** Two units of one system together, as a length is said: 5 ft 8 in. */
function mixed(rng, big, small) {
  const k = factorOf(big, small);
  const a = rng.int(1, 9), b = rng.int(1, k - 1);
  const total = a * k + b;
  if (rng.chance(0.5)) {
    return {
      prompt: [T.prose(`How many ${words(small)} are in ${amt(a, big)} ${amt(b, small)}?`)],
      text: `units: ${a} ${big} + ${b} ${small} to ${small}`,
      answer: answerOf(total),
      visual: null,
      explain: `${factText([big, small, k])}, so ${amt(a, big)} is ${a} × ${k} = ${amt(a * k, small)}. `
        + `Add the ${amt(b, small)} too: ${num(a * k)} + ${b} = ${amt(total, small)}. `
        + `(${amt(a, big)} ${amt(b, small)} is not ${a}${b} ${UNIT[small][0]} or ${a}.${b} ${UNIT[big][0]}: ${aOne(big)} is ${k} ${words(small)}, not 10.) `
        + `So ${amt(total, small)}.`,
    };
  }
  // The other way: a number of the small unit, as a decimal of the big one.
  const value = total / k;
  if (!ends(value, 2)) return mixed(rng, big, small);
  return {
    prompt: [T.prose(`What is ${amt(total, small)} in ${words(big)}, as a decimal?`)],
    text: `units: ${total} ${small} to ${big}`,
    answer: answerOf(value),
    visual: null,
    explain: `${factText([big, small, k])}, so divide: ${num(total)} ÷ ${k} = ${num(value)}. That is ${amt(a, big)} with ${amt(b, small)} `
      + `over, and ${amt(b, small)} is ${b}/${k} of ${aOne(big)}. (Not ${a}.${b}: ${amt(b, small)} is not ${b} tenth${b === 1 ? '' : 's'} `
      + `of ${aOne(big)}.) So ${amt(value, big)}.`,
  };
}

// ── A feel for sizes ────────────────────────────────────────────────────

/** How big each unit is, in meters, kilograms or liters: international definitions, for comparing across the systems. */
const SIZE = {
  in: 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.344, mm: 0.001, cm: 0.01, m: 1, km: 1000,
  oz: 0.028349523125, lb: 0.45359237, ton: 907.18474, mg: 1e-6, g: 0.001, kg: 1,
  floz: 0.0295735295625, cup: 0.2365882365, pt: 0.473176473, qt: 0.946352946, gal: 3.785411784, mL: 0.001, L: 1,
  in2: 0.0254 ** 2, ft2: 0.3048 ** 2, yd2: 0.9144 ** 2, cm2: 1e-4, m2: 1, mm2: 1e-6,
  in3: 0.0254 ** 3, ft3: 0.3048 ** 3, yd3: 0.9144 ** 3, cm3: 1e-6, m3: 1,
};
const KIND = (u) => (['in', 'ft', 'yd', 'mi', 'mm', 'cm', 'm', 'km'].includes(u) ? 'length'
  : ['oz', 'lb', 'ton', 'mg', 'g', 'kg'].includes(u) ? 'weight'
    : /2$/.test(u) ? 'area' : /3$/.test(u) ? 'volume' : 'capacity');
const MORE = { length: 'longer', weight: 'heavier', capacity: 'holds more', area: 'larger', volume: 'larger' };
const SAME = { id: 'same', label: 'They are the same' };

/** Which of two amounts is more: the student compares sizes, not numbers. */
function compare(rng, a, ua, b, ub, why) {
  const qa = a * SIZE[ua], qb = b * SIZE[ub];
  const same = Math.abs(qa - qb) < 1e-12 * Math.max(qa, qb);
  const value = same ? 'same' : qa > qb ? 'first' : 'second';
  const kind = KIND(ua);
  const ask = kind === 'capacity' ? `Which holds more, ${amt(a, ua)} or ${amt(b, ub)}?` : `Which is ${MORE[kind]}, ${amt(a, ua)} or ${amt(b, ub)}?`;
  return {
    prompt: [T.prose(ask)],
    text: `which is more: ${plain(a)} ${ua} or ${plain(b)} ${ub}`,
    answer: { type: 'choice', value, options: [{ id: 'first', label: amt(a, ua) }, { id: 'second', label: amt(b, ub) }, SAME] },
    visual: null,
    explain: `${why} So ${same ? 'they are the same' : value === 'first' ? amt(a, ua) : amt(b, ub)}.`,
  };
}
/** Compared after putting one into the other's unit. */
function compareWithin(rng, a, ua, b, ub) {
  const c = converted(a, ua, ub);
  const verdict = Math.abs(c.result - b) < 1e-9 ? 'the same amount' : c.result > b ? `more than ${amt(b, ub)}` : `less than ${amt(b, ub)}`;
  return compare(rng, a, ua, b, ub, `Put them in the same unit. ${c.work.split(' (')[0]} That is ${verdict}.`);
}

/** Things of a known size, and the unit their size is usually given in, for estimating. */
const OBJECTS = [
  ['the height of a door', 'length', 2.0], ['the length of a new pencil', 'length', 0.19], ['the length of a car', 'length', 4.5],
  ['the width of a fingernail', 'length', 0.01], ['the length of a football field', 'length', 91.4], ['the height of a basketball hoop', 'length', 3.05],
  ['the distance run in a marathon', 'length', 42195], ['the length of a paper clip', 'length', 0.03],
  ['the weight of an apple', 'weight', 0.2], ['the weight of a car', 'weight', 1500], ['the weight of a paper clip', 'weight', 0.001],
  ['the weight of a newborn baby', 'weight', 3.4], ['the weight of a dictionary', 'weight', 1.5], ['the weight of a grain of rice', 'weight', 0.00003],
  ['the water in a full bathtub', 'capacity', 300], ['the juice in a glass', 'capacity', 0.25], ['the gas a car’s tank holds', 'capacity', 55],
  ['the medicine in a teaspoon', 'capacity', 0.005], ['the milk in a large jug', 'capacity', 3.8],
  ['the water in a bottle', 'capacity', 0.5], ['the water in a bucket', 'capacity', 10],
];
const SCALE = {
  length: [['in', 'ft', 'yd', 'mi'], ['mm', 'cm', 'm', 'km']], weight: [['oz', 'lb', 'ton'], ['mg', 'g', 'kg']],
  capacity: [['floz', 'cup', 'gal'], ['mL', 'L']],
};

/** About how big is something: one number, read in each unit of one system. */
// requiem: catalogue/content/units-familiarity-rows
// requiem: catalogue/content/benchmarks-match-the-level
// Only things measured in the level's own kinds of unit: a length level
// asks about lengths, before pounds and gallons have been met.
function estimate(rng, system, kinds) {
  for (;;) {
    const [what, kind, size] = rng.pick(OBJECTS.filter(([, k]) => kinds.includes(k)));
    const units = SCALE[kind][system === 'metric' ? 1 : 0];
    // The unit a size is usually given in: the one whose number is nearest 10, between 1 and 1,000.
    const fits = units.map((u) => [u, size / SIZE[u]]).filter(([, n]) => n >= 1 && n < 1000)
      .sort((a, b) => Math.abs(Math.log10(a[1]) - 1) - Math.abs(Math.log10(b[1]) - 1));
    if (!fits.length) continue;
    const [right, n0] = fits[0];
    const n = n0 >= 20 ? Math.round(n0 / 5) * 5 : Math.round(n0 * 10) / 10 >= 10 ? Math.round(n0) : Math.max(1, Math.round(n0 * 2) / 2);
    // Every other choice must be at least three times off, so the right one is the only fair answer.
    const off = (v, u) => Math.max(v * SIZE[u] / size, size / (v * SIZE[u]));
    let others = units.filter((u) => u !== right && off(n, u) >= 3).map((u) => [n, u]);
    // requiem: catalogue/content/decoys-cross-two-slips
    // With only two units to the kind (mL and L), two slips crossed: the
    // other unit, and the number a hundred times out, each alone and both.
    // One slip three ways (4 mL, 400 L, 0.04 L for 4 L) left the key the
    // choice every other one was a step from.
    if (units.length === 2) {
      const other = units.find((u) => u !== right);
      const ways = [n * 100, n / 100].map((m) => [[m, right], [n, other], [m, other]])
        .filter((set) => set.every(([v, u]) => v >= 0.05 && off(v, u) >= 3));
      if (!ways.length) continue;
      others = rng.pick(ways);
    }
    if (others.length < 2) continue;
    const options = rng.shuffle([[n, right], ...others.slice(0, 3)]).map(([v, u]) => ({ id: `${plain(v)} ${u}`, label: amt(v, u), v, u }));
    const key = `${plain(n)} ${right}`;
    return {
      prompt: [T.prose(`Which is closest to ${what}?`)],
      text: `benchmark: ${what}; ${options.map((o) => o.id).join(', ')}`,
      answer: { type: 'choice', value: key, options: options.map(({ id, label }) => ({ id, label })) },
      visual: null,
      explain: `Picture each one. ${options.filter((o) => o.id !== key).map((o) => `${o.label} is ${o.v * SIZE[o.u] > size ? 'far too much' : 'far too little'}`).join('; ')}. `
        + `${amt(n, right)} is about right. So ${amt(n, right)}.`,
    };
  }
}

// ── Levels ──────────────────────────────────────────────────────────────

const LENGTH_PAIRS = [['ft', 'in'], ['yd', 'ft'], ['yd', 'in'], ['mi', 'ft'], ['mi', 'yd']];
function customaryLength(rng) {
  const r = rng.float();
  if (r < 0.1) return estimate(rng, 'customary', ['length']);
  if (r < 0.2) {
    const [a, ua, b, ub] = rng.pick([
      () => [rng.int(30, 45), 'in', 1, 'yd'], () => [rng.int(4, 8), 'ft', rng.int(1, 3), 'yd'],
      () => [rng.int(4000, 6000), 'ft', 1, 'mi'], () => [rng.int(1500, 2000), 'yd', 1, 'mi'], () => [36, 'in', 1, 'yd'],
      () => [rng.int(2, 4) * 12 + rng.pick([-2, 0, 2]), 'in', rng.int(2, 4), 'ft'],
    ])();
    return rng.chance(0.5) ? compareWithin(rng, a, ua, b, ub) : compareWithin(rng, b, ub, a, ua);
  }
  if (r < 0.35) return rng.chance(0.6) ? mixed(rng, 'ft', 'in') : mixed(rng, 'yd', 'ft');
  const [big, small] = rng.pick(LENGTH_PAIRS), down = rng.chance(0.55);
  const [from, to] = down ? [big, small] : [small, big];
  return conversion(niceAmount(rng, from, to), from, to);
}

const WEIGHT_PAIRS = [['lb', 'oz'], ['ton', 'lb'], ['cup', 'floz'], ['pt', 'cup'], ['qt', 'pt'], ['gal', 'qt'], ['gal', 'pt'], ['gal', 'cup'], ['qt', 'cup']];
function customaryWeight(rng) {
  const r = rng.float();
  if (r < 0.1) return estimate(rng, 'customary', ['weight', 'capacity']);
  if (r < 0.2) {
    const [a, ua, b, ub] = rng.pick([
      () => [rng.int(2, 5), 'qt', 1, 'gal'], () => [rng.int(20, 40), 'oz', 2, 'lb'], () => [rng.int(5, 12), 'cup', 2, 'qt'],
      () => [rng.int(2, 6), 'pt', rng.int(1, 3), 'qt'], () => [3000, 'lb', rng.int(1, 2), 'ton'], () => [16, 'oz', 1, 'lb'],
    ])();
    return rng.chance(0.5) ? compareWithin(rng, a, ua, b, ub) : compareWithin(rng, b, ub, a, ua);
  }
  if (r < 0.32) return rng.chance(0.5) ? mixed(rng, 'lb', 'oz') : mixed(rng, 'gal', 'qt');
  const [big, small] = rng.pick(WEIGHT_PAIRS), down = rng.chance(0.55);
  const [from, to] = down ? [big, small] : [small, big];
  return conversion(niceAmount(rng, from, to), from, to);
}

const METRIC_PAIRS = [['km', 'm'], ['m', 'cm'], ['cm', 'mm'], ['m', 'mm'], ['km', 'cm'], ['kg', 'g'], ['g', 'mg'], ['L', 'mL']];
function metricUnits(rng) {
  const r = rng.float();
  if (r < 0.1) return estimate(rng, 'metric', ['length', 'weight', 'capacity']);
  if (r < 0.22) {
    const [a, ua, b, ub] = rng.pick([
      () => [rng.int(5, 15) * 100, 'g', 1, 'kg'], () => [rng.int(60, 140), 'cm', 1, 'm'], () => [rng.int(5, 15) * 100, 'mL', 1, 'L'],
      () => [rng.int(2, 9) * 100, 'm', rng.int(1, 2) / 2, 'km'], () => [rng.int(2, 9) * 10, 'mm', rng.int(3, 8), 'cm'], () => [1000, 'g', 1, 'kg'],
    ])();
    return rng.chance(0.5) ? compareWithin(rng, a, ua, b, ub) : compareWithin(rng, b, ub, a, ua);
  }
  const [big, small] = rng.pick(METRIC_PAIRS), down = rng.chance(0.5);
  const [from, to] = down ? [big, small] : [small, big];
  return conversion(niceAmount(rng, from, to, 3), from, to);
}

/** Factors between the systems, as the question gives them: [unit, other unit, how many, exact?]. */
const BRIDGES = [
  ['in', 'cm', 2.54, true], ['mi', 'km', 1.61, false], ['kg', 'lb', 2.2, false], ['gal', 'L', 3.79, false],
  ['m', 'ft', 3.28, false], ['oz', 'g', 28.35, false], ['L', 'qt', 1.06, false],
];
/** Same-system units an amount may start or end in, around each side of a bridge. */
const NEAR = { in: ['in', 'ft'], cm: ['cm', 'm', 'mm'], mi: ['mi'], km: ['km', 'm'], kg: ['kg', 'g'], lb: ['lb'],
  gal: ['gal'], L: ['L', 'mL'], m: ['m', 'cm'], ft: ['ft', 'yd'], oz: ['oz', 'lb'], g: ['g', 'kg'], qt: ['qt', 'gal'] };

function between(rng) {
  const r = rng.float();
  if (r < 0.2) {
    const [ua, ub] = rng.pick([['mi', 'km'], ['yd', 'm'], ['in', 'cm'], ['kg', 'lb'], ['gal', 'L'], ['qt', 'L'], ['ft', 'm'], ['oz', 'g'], ['lb', 'kg'], ['mm', 'in']]);
    const [a, b] = rng.chance(0.6) ? [1, 1] : [rng.int(2, 9), rng.int(2, 9)];
    const [x, ux, y, uy] = rng.chance(0.5) ? [a, ua, b, ub] : [b, ub, a, ua];
    const qa = x * SIZE[ux], qb = y * SIZE[uy];
    const base = METRIC.has(ux) ? ux : uy;            // compare in the metric one of the two
    const inBase = (v, u) => `${amt(v, u)} is about ${num(Math.round((v * SIZE[u]) / SIZE[base] * 1000) / 1000)} ${UNIT[base][0]}`;
    return compare(rng, x, ux, y, uy, `${inBase(x, ux)}, and ${inBase(y, uy)}. ${qa > qb ? amt(x, ux) : amt(y, uy)} is more.`);
  }
  for (;;) {
    const [p, q, k, isExact] = rng.pick(BRIDGES);
    const forward = rng.chance(0.55);
    const [side1, side2] = forward ? [p, q] : [q, p];
    const from = rng.chance(0.3) ? rng.pick(NEAR[side1]) : side1, to = rng.chance(0.25) ? rng.pick(NEAR[side2]) : side2;
    const v = forward ? rng.pick([rng.int(2, 30), rng.int(2, 12) + 0.5]) : rng.pick([rng.int(2, 60), rng.int(5, 40) * 5]);
    const toSide = factorOf(from, side1), offSide = factorOf(side2, to);
    const atBridge = v * toSide, across = forward ? atBridge * k : atBridge / k, result = across * offSide;
    if (result < 0.1 || result > 100000) continue;
    // requiem: catalogue/content/rounded-factor-precision
    // A rounded factor is good to only so many figures -- 2.2 to two, 1.61
    // to three -- so the answer is asked to that many, and only where the
    // exact factor gives the same answer: a student who knows 1 lb is
    // 453.6 g is not marked wrong for knowing it.
    const tidy = isExact && ends(result, 3);
    // An exact factor keeps the natural precision: tenths, or hundredths under 1 (0.27 m, not 0.3 m).
    let places = result < 1 ? 2 : 1;
    if (!isExact) {
      const figures = k === 2.2 ? 2 : 3;
      places = figures - 1 - Math.floor(Math.log10(result));
      if (places > 2) continue;
      const exactResult = (v * SIZE[from]) / SIZE[to];
      const at = (x) => Math.round(x * 10 ** places);
      if (at(result) !== at(exactResult)) continue;
    }
    if (!tidy && onEdge(result, places)) continue;
    const answer = tidy ? answerOf(result) : places >= 0 ? roundedTo(result, places)
      : { type: 'decimal', value: { n: Math.round(result / 10 ** -places) * 10 ** -places, d: 1 } };
    const shown = tidy ? num(result) : places >= 0 ? fixed(result, places) : num(answer.value.n);
    const to_ = places > 0 ? `to ${places} decimal place${places === 1 ? '' : 's'}` : places === 0 ? 'to the nearest whole number'
      : `to the nearest ${num(10 ** -places)} ${words(to)}`;
    const said = places > 0 ? `to ${places} dp` : places === 0 ? 'to the nearest whole' : `to the nearest ${num(10 ** -places)}`;
    const fact = `1 ${UNIT[p][1]} ${isExact ? '=' : '≈'} ${amt(k, q)}`;
    const steps = [];
    if (from !== side1) steps.push(`First into ${words(side1)}: ${converted(v, from, side1).work.split(' (')[0]}`);
    const mid = Math.round(across * 1e4) / 1e4, midExact = Math.abs(across - mid) < 1e-9;
    steps.push(forward
      ? `Each ${one(p)} is ${amt(k, q)}, so multiply: ${num(atBridge)} × ${num(k)} ${midExact ? '=' : '≈'} ${num(mid)} ${UNIT[q][0]}.`
      : `Each ${one(p)} is ${amt(k, q)}, so count how many ${num(k)}s fit: ${num(atBridge)} ÷ ${num(k)} ${midExact ? '=' : '≈'} ${num(mid)} ${UNIT[p][0]}.`);
    if (to !== side2) steps.push(`Then into ${words(to)}: ${converted(mid, side2, to).work.split(' (')[0]}`);
    const why = isExact ? (tidy ? '' : `That is ${shown} ${said}. `)
      : `The factor ${num(k)} is itself rounded, so the answer is good to only about ${k === 2.2 ? 'two' : 'three'} figures: ${shown} ${said}. `;
    const suffix = tidy ? '' : places > 0 ? ` to ${places} dp` : places === 0 ? ' to the nearest whole' : ` to the nearest ${10 ** -places}`;
    return {
      prompt: [T.prose(`Using ${fact}, what is ${amt(v, from)} in ${words(to)}${tidy ? '' : `, ${to_}`}?`)],
      text: `units: ${plain(v)} ${from} to ${to} given 1 ${p} = ${plain(k)} ${q}${suffix}`,
      answer,
      visual: null,
      explain: `${steps.join(' ')} ${why}`
        + `(${forward ? `${cap(aOne(q))} is smaller than ${aOne(p)}, so there are more of them: multiply`
          : `${cap(aOne(p))} is bigger than ${aOne(q)}, so there are fewer of them: divide`}.) So ${shown} ${UNIT[to][0]}.`,
    };
  }
}

// ── Temperature ─────────────────────────────────────────────────────────

const RULE_F = 'F = (9/5)C + 32', RULE_C = 'C = (5/9)(F − 32)';
// requiem: catalogue/content/benchmark-decoys-clearly-wrong
// [what, about how warm in °C, decoys in °C, decoys in °F]. Every decoy is
// far outside anything the thing really is -- at least 15°C past its whole
// real range, and most much further -- so the key is the only fair answer.
// One decoy in each is the other scale's number, the slip being taught.
const PLACES = [
  ['a cold winter night', -10, [25, 50], [70, 100]],
  ['a cool spring morning', 10, [50, -20], [10, 100]],
  ['a room', 21, [70, -5], [21, 120]],
  ['a hot summer day', 35, [95, 5], [35, 160]],
  ['a swimming pool', 26, [79, 5], [26, 130]],
  ['a warm bath', 40, [104, 15], [40, 180]],
  ['freezing water', 0, [32, 50], [0, 70]],
  ['boiling water', 100, [212, 50], [100, 400]],
  ['a healthy person', 37, [99, 20], [37, 150]],
  ['a cup of hot cocoa', 70, [158, 20], [70, 300]],
  ['a fridge', 4, [39, 25], [4, 75]],
  ['a freezer', -18, [10, 40], [50, 90]],
  ['an oven baking bread', 220, [428, 100], [220, 800]],
];

function temperature(rng) {
  const r = rng.float();
  if (r < 0.12) {
    const [what, c, inC, inFahrenheit] = rng.pick(PLACES);
    const inF = rng.chance(0.5);
    const right = inF ? Math.round((c * 9) / 5 + 32) : c;
    const unit = inF ? 'F' : 'C';
    const opts = rng.shuffle([right, ...(inF ? inFahrenheit : inC)]);
    return {
      prompt: [T.prose(`About how warm is ${what}?`)],
      text: `benchmark temperature: ${what}; ${opts.map((v) => `${v} ${unit}`).join(', ')}`,
      answer: { type: 'choice', value: `${right}`, options: opts.map((v) => ({ id: `${v}`, label: `${num(v)}°${unit}` })) },
      visual: null,
      explain: `${what.charAt(0).toUpperCase()}${what.slice(1)} is about ${num(c)}°C, or ${num(Math.round((c * 9) / 5 + 32))}°F. `
        + `Water freezes at 0°C (32°F) and boils at 100°C (212°F), which places the rest. So ${num(right)}°${unit}.`,
    };
  }
  if (r < 0.24) {
    const c = rng.int(-2, 4) * 10, fv = rng.int(0, 5) * 20;
    const fc = ((fv - 32) * 5) / 9;
    if (Math.abs(fc - c) < 2) return temperature(rng);
    const first = rng.chance(0.5);
    const [x, ux, y, uy] = first ? [c, 'C', fv, 'F'] : [fv, 'F', c, 'C'];
    const warmer = c > fc ? 'C' : 'F';
    const value = (warmer === ux) ? 'first' : 'second';
    return {
      prompt: [T.prose(`Which is warmer, ${num(x)}°${ux} or ${num(y)}°${uy}?`)],
      text: `which is warmer: ${x} ${ux} or ${y} ${uy}`,
      answer: { type: 'choice', value, options: [{ id: 'first', label: `${num(x)}°${ux}` }, { id: 'second', label: `${num(y)}°${uy}` }] },
      visual: null,
      explain: `Put both in °C: ${num(fv)}°F is (5/9)(${num(fv)} − 32) ≈ ${num(Math.round(fc * 10) / 10)}°C, against ${num(c)}°C. `
        + `(The bigger number is not always warmer: the scales have different zeros and step sizes.) So ${value === 'first' ? `${num(x)}°${ux}` : `${num(y)}°${uy}`}.`,
    };
  }
  const toF = rng.chance(0.5);
  if (toF) {
    const exactly = rng.chance(0.85);
    const c = exactly ? rng.int(-8, 20) * 5 : rng.int(-80, 240) / 2;
    const fv = (c * 9) / 5 + 32;
    return {
      prompt: [T.prose(`Use ${RULE_F}. What is ${num(c)}°C in °F?`)],
      text: `temperature: ${c} C to F`,
      answer: answerOf(fv),
      visual: null,
      explain: `Multiply first, then add 32: (9/5) × ${c < 0 ? `(${num(c)})` : num(c)} = ${num((c * 9) / 5)}, and ${num((c * 9) / 5)} + 32 = ${num(fv)}. `
        + `(Adding 32 before multiplying scales the 32 too.) So ${num(fv)}°F.`,
    };
  }
  const exactly = rng.chance(0.75);
  const c = exactly ? rng.int(-8, 20) * 5 : null;
  const fv = exactly ? (c * 9) / 5 + 32 : rng.int(-40, 230);
  const cv = ((fv - 32) * 5) / 9;
  if (!exactly && (ends(cv, 1) || onEdge(cv, 1))) return temperature(rng);
  return {
    prompt: [T.prose(`Use ${RULE_C}. What is ${num(fv)}°F in °C${exactly ? '' : ', to 1 decimal place'}?`)],
    text: `temperature: ${fv} F to C${exactly ? '' : ' to 1 dp'}`,
    answer: exactly ? answerOf(cv) : roundedTo(cv, 1),
    visual: null,
    explain: `Take the 32 off first: ${num(fv)} − 32 = ${num(fv - 32)}. Then (5/9) × ${fv - 32 < 0 ? `(${num(fv - 32)})` : num(fv - 32)} `
      + `${exactly ? `= ${num(cv)}` : `≈ ${num(Math.round(cv * 1000) / 1000)}, which is ${fixed(cv, 1)} to 1 dp`}. `
      + `(Multiplying by 5/9 before taking off 32 would treat the 32 as degrees Celsius.) So ${exactly ? num(cv) : fixed(cv, 1)}°C.`,
  };
}

// ── Unit fractions: chains and rates ────────────────────────────────────

/** A unit fraction for one fact, written top over bottom so `cancel` goes away. */
const fraction = (s) => (s.by > 1 ? `(${amt(s.by, s.to)} / ${amt(1, s.from)})` : `(${amt(1, s.to)} / ${amt(1 / s.by, s.from)})`);
const CHAINS = [['day', 's'], ['week', 'min'], ['h', 's'], ['mi', 'in'], ['yd', 'in'], ['gal', 'floz'], ['gal', 'cup'], ['km', 'cm'], ['km', 'mm'], ['ton', 'oz']];

function chain(rng) {
  const [big, small] = rng.pick(CHAINS);
  const down = rng.chance(0.65);
  const [from, to] = down ? [big, small] : [small, big];
  const v = down ? rng.pick([rng.int(2, 9), rng.int(1, 5) + 0.5]) : niceAmount(rng, from, to);
  const steps = path(from, to), result = v * steps.reduce((p, s) => p * s.by, 1);
  if (!ends(result, 2) || result > 1e7) return chain(rng);
  return {
    prompt: [T.prose(down ? `How many ${words(to)} are in ${amt(v, from)}?` : `What is ${amt(v, from)} in ${words(to)}?`)],
    text: `units: ${plain(v)} ${from} to ${to}`,
    answer: answerOf(result),
    visual: null,
    explain: `Multiply by unit fractions, each equal to 1, written so every unit you want gone is once on top and once on the bottom: `
      + `${amt(v, from)} × ${steps.map(fraction).join(' × ')} = ${amt(result, to)}. `
      + `Every unit but ${UNIT[to][2]} cancels, which is the check that each fraction is the right way up. So ${amt(result, to)}.`,
  };
}

/** Rates: [top unit, bottom unit] to [top unit, bottom unit], and how they are said. */
/** "1 gallon", "2.5 gallons". */
const many = (v, one_, more) => `${num(v)} ${v === 1 ? one_ : more}`;
// requiem: catalogue/content/believable-sizes
// Each rate from what that thing really does: a car at 21-75 mph, a cyclist
// at 11-29 ft/s (7.5-19.5 mph), a runner at 2-8 m/s, a train at 45-270
// km/h, a garden hose at 4.5-36 L/min, a faucet pouring up to 10 cups a minute.
const RATES = [
  { from: ['mi', 'h'], to: ['ft', 's'], what: (v) => `A car travels at ${many(v, 'mile', 'miles')} per hour`, values: (rng) => 3 * rng.int(7, 25) },
  { from: ['ft', 's'], to: ['mi', 'h'], what: (v) => `A cyclist rides at ${many(v, 'foot', 'feet')} per second`, values: (rng) => Math.round(22 * rng.int(5, 13)) / 10 },
  { from: ['m', 's'], to: ['km', 'h'], what: (v) => `A runner moves at ${many(v, 'meter', 'meters')} per second`, values: (rng) => rng.int(4, 16) / 2 },
  { from: ['km', 'h'], to: ['m', 's'], what: (v) => `A train travels at ${many(v, 'kilometer', 'kilometers')} per hour`, values: (rng) => 9 * rng.int(5, 30) },
  { from: ['L', 'min'], to: ['mL', 's'], what: (v) => `A hose pours ${many(v, 'liter', 'liters')} per minute`, values: (rng) => (3 * rng.int(15, 120)) / 10 },
  { from: ['gal', 'min'], to: ['qt', 'h'], what: (v) => `A tank drains at ${many(v, 'gallon', 'gallons')} per minute`, values: (rng) => rng.int(1, 20) / 2 },
  { from: ['cup', 'min'], to: ['gal', 'h'], what: (v) => `A faucet pours ${many(v, 'cup', 'cups')} per minute`, values: (rng) => (4 * rng.int(2, 25)) / 10 },
  { from: ['usd', 'lb'], to: ['cent', 'oz'], what: (v) => `Cheese costs $${money(v)} per pound`, values: (rng) => (16 * rng.int(10, 80)) / 100 },
  { from: ['cent', 'oz'], to: ['usd', 'lb'], what: (v) => `Trail mix costs ${num(v)}¢ per ounce`, values: (rng) => rng.int(10, 90) },
];

function rate(rng) {
  const R = rng.pick(RATES), v = R.values(rng);
  const top = path(R.from[0], R.to[0]), bottom = path(R.to[1], R.from[1]);
  const k = top.reduce((p, s) => p * s.by, 1) * bottom.reduce((p, s) => p * s.by, 1), result = v * k;
  if (!ends(result, 2)) return rate(rng);
  const per = (u) => (UNIT[u][1] === 'h' ? 'hour' : u === 'min' ? 'minute' : u === 's' ? 'second' : u === 'lb' ? 'pound' : u === 'oz' ? 'ounce' : UNIT[u][1]);
  const unitsTo = `${R.to[0] === 'usd' ? 'dollars' : R.to[0] === 'cent' ? 'cents' : UNIT[R.to[0]][2]} per ${per(R.to[1])}`;
  const show = (val, [a, b]) => (a === 'usd' ? `$${money(val)} per ${per(b)}` : a === 'cent' ? `${num(val)}¢ per ${per(b)}` : `${num(val)} ${UNIT[a][0]}/${UNIT[b][0]}`);
  return {
    prompt: [T.prose(`${R.what(v)}. What is that in ${unitsTo}?`)],
    text: `rate: ${plain(v)} ${R.from[0]}/${R.from[1]} to ${R.to[0]}/${R.to[1]}`,
    answer: answerOf(result),
    visual: null,
    explain: `Change the top unit and the bottom unit separately, with unit fractions: ${show(v, R.from)} × ${top.map(fraction).join(' × ')} `
      + `× ${bottom.map(fraction).join(' × ')} = ${show(result, R.to)}. `
      + `(The ${per(R.from[1])} is on the bottom of the rate, so it must go on the top of its unit fraction to cancel.) So ${show(result, R.to)}.`,
  };
}

function crossRate(rng) {
  const mph = rng.chance(0.5);
  const v = mph ? rng.int(4, 16) * 5 : rng.int(3, 13) * 10;
  const result = mph ? v * 1.61 : v / 1.61;
  // requiem: catalogue/content/rounded-factor-precision
  const exactResult = mph ? (v * SIZE.mi) / SIZE.km : (v * SIZE.km) / SIZE.mi;
  if (onEdge(result, 0) || Math.round(result) !== Math.round(exactResult)) return crossRate(rng);
  const shown = Math.round(result);
  return {
    prompt: [T.prose(`A speed limit is ${num(v)} ${mph ? 'miles' : 'kilometers'} per hour. Using 1 mi ≈ 1.61 km, what is that in `
      + `${mph ? 'kilometers' : 'miles'} per hour, to the nearest whole number?`)],
    text: `rate: ${v} ${mph ? 'mi' : 'km'}/h to ${mph ? 'km' : 'mi'}/h given 1 mi = 1.61 km to the nearest whole`,
    answer: roundedTo(result, 0),
    visual: null,
    explain: `Only the top unit changes; the hours stay. ${mph ? `Each mile is 1.61 km, so ${num(v)} × 1.61 = ${num(Math.round(result * 100) / 100)}`
      : `Each mile is 1.61 km, so count the miles: ${num(v)} ÷ 1.61 ≈ ${num(Math.round(result * 100) / 100)}`}, `
      + `which is ${shown} to the nearest whole. (${mph ? 'Kilometers are shorter, so there are more of them' : 'Miles are longer, so there are fewer of them'}.) `
      + `So ${shown} ${mph ? 'km' : 'mi'}/h.`,
  };
}

function unitFractions(rng) {
  const r = rng.float();
  if (r < 0.4) return chain(rng);
  if (r < 0.85) return rate(rng);
  return crossRate(rng);
}

// ── Square and cubic units ──────────────────────────────────────────────

const SQUARE_PAIRS = [['ft2', 'in2'], ['yd2', 'ft2'], ['m2', 'cm2'], ['cm2', 'mm2'], ['ft3', 'in3'], ['yd3', 'ft3'], ['m3', 'cm3'], ['L', 'cm3']];
const LINEAR = { ft2: ['ft', 'in', 12, 2], yd2: ['yd', 'ft', 3, 2], m2: ['m', 'cm', 100, 2], cm2: ['cm', 'mm', 10, 2],
  ft3: ['ft', 'in', 12, 3], yd3: ['yd', 'ft', 3, 3], m3: ['m', 'cm', 100, 3] };

function squareCubic(rng) {
  const r = rng.float();
  if (r < 0.15) {
    const ua = rng.pick(Object.keys(LINEAR)), a = rng.int(1, 6);
    const [, , lin, power] = LINEAR[ua], ub = SQUARE_PAIRS.find(([p]) => p === ua)[1], k = factorOf(ua, ub);
    const b = rng.pick([a * k, a * k, a * lin, a * lin * (power === 3 ? lin : 10), 2 * a * k]);
    const c = converted(a, ua, ub);
    const [x, ux, y, uy] = rng.chance(0.5) ? [a, ua, b, ub] : [b, ub, a, ua];
    const verdict = Math.abs(c.result - b) < 1e-9 ? `the same as ${amt(b, ub)}` : c.result > b ? `more than ${amt(b, ub)}` : `less than ${amt(b, ub)}`;
    return compare(rng, x, ux, y, uy, `${factText(FACTS.find(([p, q]) => p === ua && q === ub))}, so ${amt(a, ua)} = ${amt(c.result, ub)}, `
      + `${verdict}. (The factor is ${num(lin)}${power === 2 ? '²' : '³'}, not ${num(lin)}: the length factor counts once for each of the `
      + `${power === 2 ? 'two lengths of a square' : 'three lengths of a cube'}.)`);
  }
  if (r < 0.35) {
    // A rectangle measured in one unit, its area wanted in another.
    const [U, u] = rng.pick([['ft', 'in'], ['yd', 'ft'], ['m', 'cm']]);
    const k = factorOf(U, u), w = rng.int(2, 9) / (rng.chance(0.3) ? 2 : 1), h = rng.int(2, 9);
    const area = w * k * (h * k);
    const sq = `${u}2`;
    if (!ends(area, 2)) return squareCubic(rng);
    return {
      prompt: [T.prose(`A rectangle is ${amt(w, U)} by ${amt(h, U)}. What is its area in ${words(sq)}?`)],
      text: `area: ${plain(w)} ${U} by ${plain(h)} ${U} to ${sq}`,
      answer: answerOf(area),
      visual: null,
      explain: `Change each side first: ${amt(w, U)} = ${amt(w * k, u)} and ${amt(h, U)} = ${amt(h * k, u)}. `
        + `Then the area: ${num(w * k)} × ${num(h * k)} = ${amt(area, sq)}. Or: ${num(w * h)} ${UNIT[`${U}2`][0]} × ${num(k * k)} = ${amt(area, sq)}, `
        + `since 1 ${UNIT[`${U}2`][1]} = ${num(k)} × ${num(k)} = ${amt(k * k, sq)}. (Multiplying the area by ${num(k)} once scales only one side.) `
        + `So ${amt(area, sq)}.`,
    };
  }
  const [big, small] = rng.pick(SQUARE_PAIRS), down = rng.chance(0.5);
  const [from, to] = down ? [big, small] : [small, big];
  const v = niceAmount(rng, from, to);
  const c = converted(v, from, to);
  const lin = LINEAR[big];
  const why = lin ? `1 ${UNIT[lin[0]][1]} = ${amt(lin[2], lin[1])}, so 1 ${UNIT[big][1]} = ${Array(lin[3]).fill(num(lin[2])).join(' × ')} = ${amt(factorOf(big, small), small)}. `
    : '1 L is 1,000 cm³: a cube 10 cm on each side. ';
  return {
    prompt: [T.prose(c.down ? `How many ${words(to)} are in ${amt(v, from)}?` : `What is ${amt(v, from)} in ${words(to)}?`)],
    text: `units: ${plain(v)} ${from} to ${to}`,
    answer: answerOf(c.result),
    visual: null,
    explain: `${why}${c.down ? `${amt(v, from)} × ${num(factorOf(big, small))}` : `${amt(v, from)} ÷ ${num(factorOf(big, small))}`} = ${amt(c.result, to)}. `
      + (lin ? `(Using ${num(lin[2])} alone forgets that a ${lin[3] === 2 ? 'square has two lengths to scale' : 'cube has three lengths to scale'}.) ` : '')
      + `So ${amt(c.result, to)}.`,
  };
}

const CONTENT = [customaryLength, customaryWeight, metricUnits, between, temperature, unitFractions, squareCubic];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
