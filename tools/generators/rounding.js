/**
 * Catalogue authoring tool: builds the problem library for rounding.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 */
import * as T from '../terms.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/rounding.js';

/** Exact throughout: a decimal is an integer over a power of ten, never a float. */
const dec = (n, places) => ({ n, d: 10 ** places });
const show = (v) => {
  const whole = Math.floor(v.n / v.d), rem = v.n - whole * v.d;
  const places = String(v.d).length - 1;
  return whole + (rem ? '.' + String(rem).padStart(places, '0').replace(/0+$/, '') : '');
};
/**
 * Written to exactly `places` decimals, zeros kept: 1.6 to two places is
 * 1.60, and 15 to one place is 15.0. The zero is the point of "to 2 d.p." --
 * it says the number is right as far as that column -- so the picture, the
 * explanation and the answer all write it, and 1.6 typed for 1.60 is told so.
 */
const fixed = (v, places) => {
  const scaled = v.n * 10 ** places / v.d;
  const whole = Math.floor(scaled / 10 ** places), rem = scaled - whole * 10 ** places;
  return places ? `${whole}.${String(rem).padStart(places, '0')}` : String(whole);
};
/** How the question names the column, which is not how the answer names it. */
const TO = ['the nearest whole number', '1 decimal place', '2 decimal places'];
const SHORT = ['the nearest whole', '1 dp', '2 dp'];

/**
 * Round half up, done on integers so no float ever decides a boundary case.
 *
 * `0.1 + 0.2` is not `0.3` in binary, and a rounding drill is exactly where
 * that bites: 2.675 rounded to two places is 2.68 by the convention and 2.67
 * by the nearest double. Scaling to integers and comparing twice the
 * remainder against the divisor keeps the boundary where the rule says it is.
 */
function roundTo(v, places) {
  const scale = 10 ** places;
  const num = v.n * scale;               // value × 10^places, still over v.d
  const whole = Math.floor(num / v.d);
  const rem = num - whole * v.d;
  return dec(2 * rem >= v.d ? whole + 1 : whole, places);
}

/** The digit that decides, and the two numbers it decides between. */
function neighbours(v, places) {
  const scale = 10 ** places;
  const down = dec(Math.floor((v.n * scale) / v.d), places);
  return { down, up: dec(down.n + 1, places) };
}

/**
 * A value to round, and the place to round it to.
 *
 * `halfway` decides whether the deciding digit is a 5 with nothing after it.
 * Those are their own level: they are the only case where the answer comes
 * from a convention rather than from which neighbour is nearer, and mixing
 * them in earlier would teach "look at the digit" as if it always settled it.
 *
 * Two rejections, both of which produced questions with nothing in them on
 * the first attempt. A tail of zeros means the number is already rounded --
 * "round 0.10 to one decimal place" is not a question, and it read as
 * "round 0.1 to 1 decimal place" once the trailing zero was dropped for
 * display. And outside the halfway level the tail must not be exactly half,
 * or the level quietly contains the one case it does not teach.
 */
function value(rng, places, halfway) {
  const extra = halfway ? 1 : rng.int(1, 2);
  const total = places + extra;
  const whole = rng.int(1, 99);
  const step = 10 ** extra;
  let frac;
  if (halfway) {
    frac = rng.int(0, 10 ** places - 1) * 10 + 5;      // kept digits, then a 5
  } else {
    do {
      frac = rng.int(1, 10 ** total - 1);
    } while (frac % step === 0 || frac % step === step / 2);
  }
  return dec(whole * 10 ** total + frac, total);
}

function roundQuestion(rng, places, halfway) {
  const v = value(rng, places, halfway);
  const answer = roundTo(v, places);
  const { down, up } = neighbours(v, places);

  const [lo, hi, got] = [down, up, answer].map((x) => fixed(x, places));
  // Said only where the zero would otherwise go missing.
  const zeros = got !== show(answer)
    ? ` To ${TO[places]} it is written ${got}, not ${show(answer)}: the last 0 says the `
      + `number is right as far as that place.`
    : '';
  return {
    prompt: [T.prose(`Round ${show(v)} to ${TO[places]}.`)],
    text: `${show(v)} to ${SHORT[places]}`,
    answer: { type: 'decimal', value: { ...answer, places } },
    visual: {
      kind: 'evalmodel',
      lines: [show(v), `between ${lo} and ${hi}`,
              halfway ? 'exactly halfway' : `nearer ${got}`, got],
      rules: ['find the two it sits between',
              halfway ? 'dead centre, so the convention decides' : 'see which is nearer',
              'which gives'],
      hint: places === 0
        ? 'Which two whole numbers is it between?'
        : `Which two numbers with ${places} decimal place${places === 1 ? '' : 's'} is it between?`,
    },
    explain: (halfway
      ? `${show(v)} is exactly halfway between ${lo} and ${hi}, so nothing `
        + `about distance decides it. The convention is to go up, giving ${got}. `
        + 'It is a rule agreed on, not a fact discovered — which is why it has to be told.'
      : `${show(v)} sits between ${lo} and ${hi}, and is nearer ${got}.`) + zeros,
  };
}

/** Round both, then work it out — an answer that is close on purpose. */
function estimate(rng) {
  const multiply = rng.chance(0.6);
  const a = dec(rng.int(11, 99) * 10 + rng.int(1, 9), 1);
  const b = dec(rng.int(2, 9) * 10 + rng.int(1, 9), 1);
  if (a.n % 10 === 5 || b.n % 10 === 5) return estimate(rng);   // halfway is its own level
  const ra = roundTo(a, 0).n;
  const rb = roundTo(b, 0).n;
  const rough = multiply ? ra * rb : ra + rb;
  const exact = multiply ? (a.n * b.n) / 100 : (a.n + b.n) / 10;
  const sign = multiply ? '×' : '+';

  return {
    prompt: [T.prose(`Round each to the nearest whole number, then work it out: `
      + `${show(a)} ${sign} ${show(b)}`)],
    text: `estimate ${show(a)} ${sign} ${show(b)}`,
    answer: { type: 'decimal', value: dec(rough, 0) },
    visual: {
      kind: 'evalmodel',
      lines: [`${show(a)} ${sign} ${show(b)}`, `${ra} ${sign} ${rb}`, String(rough)],
      rules: ['round each one first', 'then it is arithmetic you can do in your head'],
      hint: 'What are these two, roughly?',
    },
    explain: `${show(a)} rounds to ${ra} and ${show(b)} rounds to ${rb}, so the estimate is `
      + `${ra} ${sign} ${rb} = ${rough}. The exact answer is ${exact}, which is close — `
      + 'and knowing it should be about ' + rough + ' is what tells you a slipped '
      + 'decimal point when you see one.',
  };
}

/**
 * When an estimate is the right answer, and when it is not.
 *
 * The discriminator is whether being slightly wrong costs anything. Checking
 * that a bill is about right, or that an answer has the right number of
 * digits, wants an estimate and is slower with an exact one. Money that
 * someone actually pays, a measurement that has to fit, or a comparison
 * between two close values wants the number itself.
 */
//
// requiem: catalogue/strategy/no-surface-cue
// The words used to give it away: "exactly" was always exact, and "roughly"
// and "about" always an estimate. They are gone, and two situations are
// settled by their numbers instead -- whether rounding can decide a
// comparison depends on how close the comparison is, which is the judgement
// this level is for.
const SITUATIONS = [
  { text: 'You are checking that a bill of £{big} looks right before paying it.', want: 'estimate' },
  { text: 'You are working out the change from £{big} and handing it over.', want: 'exact' },
  { text: 'You are cutting a shelf to fit a gap of {a} metres.', want: 'exact' },
  { text: 'You are splitting a £{big} bill {n} ways and paying your share.', want: 'exact' },
  { text: 'You have just divided and want to know if the answer is the right size.',
    want: 'estimate' },
  { text: 'You are recording a race time that decides who won.', want: 'exact' },
  { text: 'You are checking that {a} × {b} on your calculator has its decimal point in the right place.',
    want: 'estimate' },
  { compare: 'product', want: 'either' },
  { compare: 'tickets', want: 'either' },
];

// Drawn a side at a time, since the exact situations have more numbers to
// draw on and an even pick of situation came out two thirds exact.
const SIDES = {
  estimate: SITUATIONS.filter((s) => s.want !== 'exact'),
  exact: SITUATIONS.filter((s) => s.want !== 'estimate'),
};

/** Tenths, never ending in 0 (a whole number) or 5 (halfway, its own level). */
const tenths = (rng, lo, hi) => {
  let n;
  do { n = rng.int(lo, hi); } while (n % 10 === 0 || n % 10 === 5);
  return n;
};

/**
 * Is p × q more than t? Rounding each to the nearest whole leaves each within
 * a half of what it was, so the product lies between (P − ½)(Q − ½) and
 * (P + ½)(Q + ½). When t is outside that range the estimate settles it; when
 * it is inside, only the full product can. `q` may be a whole count, which
 * rounding leaves alone.
 */
function settles(rng, kind, near) {
  const p = tenths(rng, 21, 99);
  const q = kind === 'tickets' ? rng.int(3, 9) * 10 : tenths(rng, 21, 99);
  const P = Math.round(p / 10), Q = Math.round(q / 10);
  const lo = kind === 'tickets' ? (2 * P - 1) * Q / 2 : (2 * P - 1) * (2 * Q - 1) / 4;
  const hi = kind === 'tickets' ? (2 * P + 1) * Q / 2 : (2 * P + 1) * (2 * Q + 1) / 4;
  const product = p * q / 100;                       // exact in hundredths
  let t;
  if (near) {
    // A whole number inside the range and close to the product.
    const c = [Math.floor(product), Math.ceil(product), Math.floor(product) - 1, Math.ceil(product) + 1]
      .filter((x) => x > lo && x < hi && x !== product);
    if (!c.length) return settles(rng, kind, near);
    t = rng.pick(c);
  } else {
    t = rng.chance(0.5) ? Math.ceil(hi * rng.pick([1.5, 2, 3]) / 5) * 5 : Math.floor(lo / rng.pick([2, 3]) / 5) * 5;
    if (t <= hi && t >= lo) return settles(rng, kind, near);
    if (t < 1) return settles(rng, kind, near);
  }
  const ps = show(dec(p, 1)), qs = kind === 'tickets' ? String(q / 10) : show(dec(q, 1));
  const money = kind === 'tickets';
  const amount = (hundredths) => (money ? `£${fixed(dec(hundredths, 2), 2)}` : show(dec(hundredths, 2)));
  const price = `£${fixed(dec(p, 1), 2)}`;
  // "Checking" is also the estimate side's word, so it cannot decide this.
  const text = money
    ? `You are checking whether £${t} is enough for ${qs} tickets at ${price} each.`
    : `You want to know whether ${ps} × ${qs} is more than ${t}.`;
  const est = money ? `${qs} tickets at about £${P} is ${qs} × £${P} = £${P * Q}` : `${ps} × ${qs} is about ${P} × ${Q} = ${P * Q}`;
  const range = `between ${amount(Math.round(lo * 100))} and ${amount(Math.round(hi * 100))}`;
  const line = money ? `£${t}` : String(t);
  const why = near
    ? `Rounded, ${est}, but rounding could have moved it anywhere ${range}, and `
      + `${line} is inside that range. An estimate cannot settle it, so it has to be `
      + `worked out in full: ${money ? `${qs} × ${price}` : `${ps} × ${qs}`} = ${amount(p * q)}.`
    : `Rounded, ${est}, and even allowing for the rounding it is ${range}. `
      + `${line} is nowhere near that, so the estimate settles it in one step.`;
  return { text, want: near ? 'exact' : 'estimate', why };
}

const WHY = {
  estimate: 'Nothing here goes wrong if the answer is a little out — the question is about '
    + 'the size of the number, not the number. Rounding first answers it in one step, '
    + 'and an exact answer would be slower for no gain.',
  exact: 'Being a little out here costs something real, so the arithmetic has to be done '
    + 'in full. An estimate would tell you whether the exact answer looks sensible, '
    + 'which is worth doing as well — but not instead.',
};

function exactOrRough(rng) {
  const side = rng.pick(['estimate', 'exact']);
  const s = rng.pick(SIDES[side]);
  if (s.compare) {
    const { text, want, why } = settles(rng, s.compare, side === 'exact');
    return choice(rng, text, want, why);
  }
  const fill = (t) => t
    .replace(/\{big\}/g, String(rng.int(20, 90)))
    .replace(/\{biggest\}/g, String(rng.int(200, 900)))
    .replace(/\{a\}/g, show(dec(rng.int(11, 99), 1)))
    .replace(/\{b\}/g, show(dec(rng.int(11, 99), 1)))
    .replace(/\{n\}/g, String(rng.int(3, 8)));
  const text = fill(s.text);
  return choice(rng, text, s.want, WHY[s.want]);
}

function choice(rng, text, want, explain) {
  return {
    prompt: [T.prose(text)],
    text,
    answer: {
      type: 'choice',
      value: want,
      options: rng.shuffle([
        { id: 'estimate', label: 'An estimate is enough', note: 'round first, answer in your head' },
        { id: 'exact', label: 'It has to be exact', note: 'do the arithmetic in full' },
      ]),
    },
    visual: null,
    explain,
  };
}

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  const build = (lv) => {
    switch (lv) {
      case 0: return roundQuestion(rng, 0, false);
      case 1: return roundQuestion(rng, rng.int(1, 2), false);
      case 2: return roundQuestion(rng, rng.int(0, 2), true);
      case 3: return estimate(rng);
      case 4: return exactOrRough(rng);
      default: return roundQuestion(rng, 0, false);
    }
  };
  // The mixed level leaves out the strategy level, whose answer is a choice.
  const p = build(level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 2) : level);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
