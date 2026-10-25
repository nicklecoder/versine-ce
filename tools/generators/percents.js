/**
 * Catalogue authoring tool: builds the problem library for percents.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 */
import * as T from '../terms.js';
import { reduce } from '../../web/math/frac.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/percents.js';

const dec = (n, places) => ({ n, d: 10 ** places });
const show = (v) => {
  const whole = Math.floor(Math.abs(v.n) / v.d), rem = Math.abs(v.n) - whole * v.d;
  const places = String(v.d).length - 1;
  const frac = rem ? '.' + String(rem).padStart(places, '0').replace(/0+$/, '') : '';
  return (v.n < 0 ? '−' : '') + whole + frac;
};

/** Percent means hundredths, read straight off. */
function outOfHundred(rng) {
  const p = rng.int(2, 99);
  const r = reduce({ n: p, d: 100 });
  return {
    prompt: [T.prose(`Write ${p}% as a fraction in lowest terms.`),
             T.frac(null, r.d, 2)],
    text: `${p}% = ?/${r.d}`,
    answer: { type: 'int', value: r.n },
    visual: {
      kind: 'evalmodel',
      lines: [`${p}%`, `${p}/100`, `${r.n}/${r.d}`],
      rules: ['percent means hundredths', 'in lowest terms'],
      hint: 'A hundred of what?',
    },
    explain: `${p}% is ${p} out of 100, `
      + (r.d === 100 ? `and ${p}/100 is already in lowest terms.` : `which simplifies to ${r.n}/${r.d}.`),
  };
}

/** Two places, and knowing why it is two. */
function asDecimal(rng) {
  const p = rng.chance(0.3) ? rng.int(1, 99) * 10 : rng.int(1, 99);
  return {
    prompt: [T.prose(`Write ${p}% as a decimal.`)],
    text: `${p}% as a decimal`,
    answer: { type: 'decimal', value: dec(p, 2) },
    visual: {
      kind: 'evalmodel',
      lines: [`${p}%`, `${p}/100`, `${p} ÷ 100`, show(dec(p, 2))],
      rules: ['percent means hundredths', 'which is a division', 'two places to the right'],
      hint: 'Dividing by a hundred moves the point how far?',
    },
    explain: `${p}% is ${p}/100. Dividing by 100 moves the point two places, `
      + `giving ${show(dec(p, 2))}.`,
  };
}

/** A part of a whole, when the whole is not a hundred. */
function percentOf(rng) {
  const p = rng.pick([5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90]);
  const base = rng.pick([20, 40, 60, 80, 120, 140, 160, 180, 200, 240, 300, 400, 500]);
  const value = (p * base) / 100;
  if (!Number.isInteger(value)) return percentOf(rng);
  return {
    prompt: [T.prose(`What is ${p}% of ${base}?`)],
    text: `${p}% of ${base}`,
    answer: { type: 'int', value },
    visual: {
      kind: 'evalmodel',
      lines: [`${p}% of ${base}`, `${p}/100 × ${base}`,
              `${base} ÷ 100 = ${show(dec(base, 2))}, then × ${p}`, String(value)],
      rules: ['percent means hundredths', 'one percent first', 'then that many'],
      hint: 'A hundred of what, this time?',
    },
    explain: `One percent of ${base} is ${show(dec(base, 2))}, so ${p}% is `
      + `${p} × ${show(dec(base, 2))} = ${value}.`,
  };
}

/** The question backwards. */
function whatPercent(rng) {
  const p = rng.pick([5, 10, 20, 25, 40, 50, 60, 75, 80]);
  const base = rng.pick([20, 40, 50, 60, 80, 100, 120, 200, 400]);
  const part = (p * base) / 100;
  if (!Number.isInteger(part) || part === 0) return whatPercent(rng);
  return {
    prompt: [T.prose(`${part} is what percent of ${base}?`)],
    text: `${part} is ?% of ${base}`,
    answer: { type: 'int', value: p },
    visual: {
      kind: 'evalmodel',
      lines: [`${part} out of ${base}`, `${part}/${base}`,
              `${part}/${base} × 100`, `${p}%`],
      rules: ['write the part over the whole', 'percent is per hundred, so × 100', 'which gives'],
      hint: 'Which number is the whole here?',
    },
    explain: `${part} out of ${base} is ${part}/${base}. Multiplying by 100 turns `
      + `that into hundredths: ${p}%.`,
  };
}

/** Increase and decrease -- and which whole each is of. */
function change(rng) {
  const p = rng.pick([10, 20, 25, 50, 5, 40, 75]);
  const base = rng.pick([20, 40, 60, 80, 120, 160, 200, 240, 400]);
  const delta = (p * base) / 100;
  if (!Number.isInteger(delta)) return change(rng);
  const up = rng.chance(0.55);
  const value = up ? base + delta : base - delta;
  return {
    prompt: [T.prose(`${base} ${up ? 'increased' : 'decreased'} by ${p}%. What is it now?`)],
    text: `${base} ${up ? 'up' : 'down'} ${p}%`,
    answer: { type: 'int', value },
    visual: {
      kind: 'evalmodel',
      lines: [`${p}% of ${base}`, String(delta),
              `${base} ${up ? '+' : '−'} ${delta}`, String(value)],
      rules: ['the change is a percent of the ORIGINAL', 'which is', 'so the new amount is'],
      hint: 'The percent is of which number?',
    },
    explain: `${p}% of ${base} is ${delta}, so ${base} ${up ? 'rises' : 'falls'} to ${value}. `
      + `Note the percent is of the original ${base} — going back the other way by ${p}% `
      + `would be ${p}% of ${value}, which is a different amount.`,
  };
}

/**
 * The change as a percentage of what it started from.
 *
 * 40 to 50 is a rise of 25%, not of 10, and the 10 is not a silly mistake --
 * it is the difference, which is the number in front of you. What makes it a
 * percentage is dividing it by the original, and the level exists because
 * that division is the step people skip.
 *
 * Both directions, because a fall of 10 from 50 is 20% and a rise of 10 from
 * 40 is 25%: the same difference, two percentages, and the reason is which
 * number the whole is. Only ever asking about rises would let a student read
 * the smaller number as the whole every time and never be caught.
 */
function byWhatPercent(rng) {
  const p = rng.pick([5, 10, 12, 15, 20, 25, 30, 40, 50, 60, 75, 80]);
  const base = rng.pick([20, 40, 50, 60, 80, 100, 120, 140, 160, 180, 200,
                         240, 250, 300, 400, 500, 600, 800]);
  const delta = (p * base) / 100;
  if (!Number.isInteger(delta) || delta === 0) return byWhatPercent(rng);
  const up = rng.chance(0.55);
  const now = up ? base + delta : base - delta;
  if (now <= 0) return byWhatPercent(rng);

  return {
    prompt: [T.prose(`Something goes from ${base} to ${now}. `
      + `What percent ${up ? 'increase' : 'decrease'} is that?`)],
    text: `${base} to ${now}, percent change`,
    answer: { type: 'int', value: p },
    visual: {
      kind: 'evalmodel',
      lines: [`${base} to ${now}`, `a change of ${delta}`, `${delta}/${base}`, `${p}%`],
      rules: ['find the difference', 'over what it STARTED from', 'as hundredths'],
      hint: 'The difference is easy. A percentage of what, though?',
    },
    explain: `The change is ${delta}. A percentage needs a whole to be a percentage `
      + `of, and it is the original ${base}, not the ${now}: ${delta}/${base} = ${p}%. `
      + `Dividing by ${now} instead would answer a different question.`,
  };
}

/**
 * The original, recovered from the figure after the change.
 *
 * The wrong move is to take the percent back off, and it is wrong in the
 * expensive direction: $60 after a 20% rise is not $60 − 20% = $48, it is
 * $50, because the 20% was of the smaller number. Saying so in the explain
 * is the whole level -- this is the point at which "a hundred of WHAT" stops
 * being a slogan and costs someone eight dollars.
 */
function workingBackwards(rng) {
  const p = rng.pick([5, 10, 12, 15, 20, 25, 30, 40, 50, 60, 75, 80]);
  const base = rng.pick([20, 40, 50, 60, 80, 100, 120, 140, 160, 180, 200,
                         240, 250, 300, 400, 500, 600, 800]);
  const up = rng.chance(0.6);
  const factor = up ? 100 + p : 100 - p;
  const now = (base * factor) / 100;
  if (!Number.isInteger(now) || now <= 0) return workingBackwards(rng);
  // In hundredths, so 80% off 324 is 64.8 and not 64.80000000000001.
  const naive = show(dec(up ? now * 100 - now * p : now * 100 + now * p, 2));

  return {
    prompt: [T.prose(`After ${up ? 'a rise' : 'a fall'} of ${p}% it is ${now}. `
      + 'What was it before?')],
    text: `${now} after ${up ? 'up' : 'down'} ${p}%, before`,
    answer: { type: 'int', value: base },
    visual: {
      kind: 'evalmodel',
      // The first line is the question as asked. "672 is 112% of the
      // original" is the step the level exists to teach, and it was on
      // screen before the student had answered.
      lines: [`after ${up ? 'a rise' : 'a fall'} of ${p}% it is ${now}`,
              `${now} is ${factor}% of the original`,
              `1% is ${now} ÷ ${factor} = ${show(dec(base, 2))}`, `100% is ${base}`],
      rules: ['name what the new figure is a percent OF', 'find one percent',
              'then a hundred of them'],
      hint: 'The new figure is what percent of the old one?',
    },
    explain: `The ${p}% was of the original, not of ${now}, so ${now} is ${factor}% of `
      + `what you want. One percent is ${now} ÷ ${factor} = ${show(dec(base, 2))}, so 100% is `
      + `${base}. Taking ${p}% ${up ? 'off' : 'on to'} ${now} instead gives ${naive}, `
      + `which is wrong — that is ${p}% of the wrong number.`,
  };
}

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  const build = (lv) => {
    switch (lv) {
      case 0: return outOfHundred(rng);
      case 1: return asDecimal(rng);
      case 2: return percentOf(rng);
      case 3: return whatPercent(rng);
      case 4: return change(rng);
      case 5: return byWhatPercent(rng);
      case 6: return workingBackwards(rng);
      default: return rng.pick([outOfHundred, asDecimal, percentOf, whatPercent, change,
                                byWhatPercent, workingBackwards])(rng);
    }
  };
  const p = build(level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
