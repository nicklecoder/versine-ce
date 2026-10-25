/**
 * Catalogue authoring tool: builds the problem library for radians.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 *
 * An exact answer keeps π: the student gives the number in front of it, a
 * fraction, after "θ = ▢π". Every `text` gives the angle as asked -- in
 * degrees, or as a multiple of π (`5/6 pi`), or as plain radians -- and
 * scripts/check-answers.py converts and measures again in exact fractions,
 * with the calculator's π only where the answer is a rounded decimal.
 */
import * as T from '../terms.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/radians.js';
import { fracAnswer, fracText, reduce } from './chance.js';
import { toward, text, LINE, GIVEN } from './figures.js';
import { at4, safeRound, roundedAnswer, roundedText, placeWords, placeText } from './trig.js';

/** k·π as written, for k = n/d: π, 2π, π/6, 5π/6, 0. */
function piText(n, d = 1) {
  const q = reduce(n, d);
  if (q.n === 0) return '0';
  const top = `${q.n === 1 ? '' : q.n === -1 ? '−' : String(q.n).replace('-', '−')}π`;
  return q.d === 1 ? top : `${top}/${q.d}`;
}
// requiem: catalogue/content/radian-coefficients-as-fractions
/** The prompt's "θ = ▢π". */
const piBlank = (letter) => [T.letter(letter), T.op('='), T.blank(), T.letter('π')];
const SPECIAL = [15, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330, 360];
const UNITS = ['cm', 'in', 'ft', 'm'];
const exactDec = (x) => { for (let d = 1; d <= 1000; d *= 10) { const n = Math.round(x * d); if (Math.abs(n - x * d) < 1e-9) return { type: 'decimal', value: { n, d } }; } throw new Error(String(x)); };
const said = (x) => String(Math.round(x * 1e6) / 1e6);

// ── Degrees to Radians ──────────────────────────────────────────────────

function toRadians(rng) {
  const deg = rng.chance(0.6) ? rng.pick(SPECIAL) * (rng.chance(0.15) ? 2 : 1) : rng.int(1, 72) * 5;
  const q = reduce(deg, 180);
  return {
    prompt: [T.prose(`Convert ${deg}° to radians, as a multiple of π.`), ...piBlank('θ')],
    text: `deg to rad: ${deg}`,
    answer: fracAnswer(deg, 180),
    visual: null,
    explain: `180° is π radians, so multiply by π/180: ${deg} × π/180 = ${deg}π/180 = ${piText(q.n, q.d)}. `
      + `(Multiplying by 180/π goes the wrong way and gives a huge number.) So θ = ${piText(q.n, q.d)}, and the box takes ${fracText(deg, 180)}.`,
  };
}

// ── Radians to Degrees ──────────────────────────────────────────────────

function toDegrees(rng) {
  if (rng.chance(0.7)) {
    const deg = rng.chance(0.6) ? rng.pick(SPECIAL) * (rng.chance(0.15) ? 2 : 1) : rng.int(1, 72) * 5;
    const q = reduce(deg, 180);
    return {
      prompt: [T.prose(`Convert ${piText(q.n, q.d)} radians to degrees.`)],
      text: `rad to deg: ${q.n}/${q.d} pi`,
      answer: { type: 'int', value: deg },
      visual: null,
      explain: `π radians is 180°, so put 180° in for π: ${piText(q.n, q.d)} = ${q.n === 1 && q.d === 1 ? '' : `${q.n === 1 ? '' : `${q.n} × `}180°${q.d === 1 ? '' : ` ÷ ${q.d}`} = `}${deg}°. `
        + `(π is not 3.14 degrees; it stands for half a turn.) So ${deg}°.`,
    };
  }
  for (;;) {
    const r = rng.int(1, 60) / 10;
    const x = (r * 180) / Math.PI;
    const q = safeRound(x, 1, (r * 180) / 3.1416);
    if (q === null) continue;
    return {
      prompt: [T.prose(`Convert ${said(r)} radian${r === 1 ? '' : 's'} to degrees, ${placeWords(1)}.`)],
      text: `rad to deg: ${said(r)}${placeText(1)}`,
      answer: roundedAnswer(q, 1),
      visual: null,
      explain: `Multiply by 180/π: ${said(r)} × 180/π ≈ ${at4(x)}°, which is ${roundedText(q, 1)}° ${placeWords(1)}. `
        + `(There is no π in ${said(r)}, so this one does not come out whole: a radian is about 57.3°.) So ${roundedText(q, 1)}°.`,
    };
  }
}

// ── Coterminal Angles ───────────────────────────────────────────────────

function coterminal(rng) {
  if (rng.chance(0.55)) {
    const base = rng.int(1, 359);
    const turns = rng.pick([-2, -1, 1, 2, 3]);
    const deg = base + 360 * turns;
    return {
      prompt: [T.prose(`Find the angle between 0° and 360° that is coterminal with ${String(deg).replace('-', '−')}°.`)],
      text: `coterminal deg: ${deg}`,
      answer: { type: 'int', value: base },
      visual: null,
      explain: `${turns > 0 ? `Take away ${turns === 1 ? 'one full turn' : `${turns} full turns`}` : `Add ${-turns === 1 ? 'one full turn' : `${-turns} full turns`}`}: `
        + `${String(deg).replace('-', '−')}° ${turns > 0 ? '−' : '+'} ${Math.abs(turns) * 360}° = ${base}°. `
        + `(${turns < 0 ? `Dropping the minus sign does not land on the same side; ${-deg}° turns the other way.` : 'One turn is 360°, so take turns off until the angle is under 360°.'}) So ${base}°.`,
    };
  }
  const d = rng.pick([2, 3, 4, 6]);
  let n = rng.int(1, 2 * d - 1);
  while (reduce(n, d).d !== d) n = rng.int(1, 2 * d - 1);
  const turns = rng.pick([-2, -1, 1, 2]);
  const N = n + 2 * d * turns;
  return {
    prompt: [T.prose(`Find the angle between 0 and 2π that is coterminal with ${piText(N, d)}, as a multiple of π.`), ...piBlank('θ')],
    text: `coterminal rad: ${N}/${d}`,
    answer: fracAnswer(n, d),
    visual: null,
    explain: `One turn is 2π = ${2 * d}π/${d}. ${turns > 0 ? 'Take away' : 'Add'} ${Math.abs(turns) === 1 ? 'one turn' : `${Math.abs(turns)} turns`}: `
      + `${String(N).replace('-', '−')}π/${d} ${turns > 0 ? '−' : '+'} ${Math.abs(turns) * 2 * d}π/${d} = ${n}π/${d}${reduce(n, d).d !== d ? ` = ${piText(n, d)}` : ''}. `
      + `(A turn is 2π, not π: taking off π lands on the opposite side.) So ${piText(n, d)}.`,
  };
}

// ── Reference Angles ────────────────────────────────────────────────────

/** An arc from `from` to `to` degrees, a point every 20° or so. */
const sweep = (from, to, r, tone) => {
  const n = Math.max(2, Math.ceil(Math.abs(to - from) / 20));
  return { kind: 'path', tone, points: Array.from({ length: n + 1 }, (_, i) => toward(from + ((to - from) * i) / n, r)) };
};

/** A sweep that may pass a full turn: the radius grows as it goes, so the turns do not overlap. */
const spiral = (to, tone) => {
  const n = Math.max(2, Math.ceil(Math.abs(to) / 20));
  return { kind: 'path', tone, points: Array.from({ length: n + 1 }, (_, i) => toward((to * i) / n, 0.5 + (0.35 * i) / n)) };
};

function referenceFigure(deg, ref, label, refLabel) {
  const t = ((deg % 360) + 360) % 360;
  const quad = Math.floor(t / 90);
  // The reference angle runs from the terminal side to the nearer side of the x-axis.
  const axis = quad === 1 || quad === 2 ? 180 : quad === 3 ? 360 : 0;
  const end = toward(t, 2.6);
  const turn = deg < 0 || deg > 360 ? spiral(deg, GIVEN) : sweep(0, t, 0.6, GIVEN);
  return {
    kind: 'plane', xRange: [-3.2, 3.2], yRange: [-3.2, 3.2], grid: 0, axes: true,
    marks: [{ kind: 'segment', from: [0, 0], to: end, tone: LINE }, turn, text(toward(deg > 360 ? 45 : deg / 2, 1.15), label, GIVEN)],
    answer: [sweep(Math.min(axis, t), Math.max(axis, t), 1.5, 'var(--result)'), text(toward((axis + t) / 2, 2.05), refLabel, 'var(--result)')],
  };
}

// requiem: catalogue/content/reference-angles-any-angle
/**
 * Mostly an angle in one turn, past quadrant I; in about a quarter of rows
 * a negative angle or one past a full turn, in degrees or radians, whose
 * terminal side is found first.
 */
function reference(rng) {
  for (;;) {
    const wide = rng.chance(0.18);
    const deg = wide
      ? (rng.chance(0.5) ? -rng.int(1, 71) * 5 : 360 + rng.int(1, 71) * 5)
      : rng.chance(0.6) ? rng.int(91, 359) : rng.pick([120, 135, 150, 210, 225, 240, 300, 315, 330]);
    if (deg % 90 === 0) continue;
    const t = ((deg % 360) + 360) % 360;
    const quad = Math.floor(t / 90) + 1;
    const ref = quad === 1 ? t : quad === 2 ? 180 - t : quad === 3 ? t - 180 : 360 - t;
    const rule = quad === 1 ? `${t}°` : quad === 2 ? `180° − ${t}°` : quad === 3 ? `${t}° − 180°` : `360° − ${t}°`;
    const roman = ['I', 'II', 'III', 'IV'][quad - 1];
    const D = (x) => `${String(x).replace('-', '−')}°`;
    const first = t === deg ? '' : `${D(deg)} is coterminal with ${D(t)} (${deg < 0 ? 'add' : 'take away'} 360°), and `;
    if (deg % 15 === 0 && rng.chance(0.5)) {
      const q = reduce(deg, 180), r = reduce(ref, 180), tq = reduce(t, 180);
      const ruleR = quad === 1 ? piText(tq.n, tq.d) : quad === 2 ? `π − ${piText(tq.n, tq.d)}` : quad === 3 ? `${piText(tq.n, tq.d)} − π` : `2π − ${piText(tq.n, tq.d)}`;
      const firstR = t === deg ? '' : `${piText(q.n, q.d)} is coterminal with ${piText(tq.n, tq.d)} (${deg < 0 ? 'add' : 'take away'} 2π), and `;
      return {
        prompt: [T.prose(`What is the reference angle of ${piText(q.n, q.d)}, as a multiple of π?`), ...piBlank('θ′')],
        text: `reference rad: ${q.n}/${q.d}`,
        answer: fracAnswer(ref, 180),
        visual: referenceFigure(deg, ref, piText(q.n, q.d), piText(r.n, r.d)),
        explain: `${firstR}${piText(tq.n, tq.d)} is ${t}°, in quadrant ${roman}, so the reference angle is the gap to the x-axis: ${ruleR} = ${piText(r.n, r.d)}. `
          + `(It is measured to the x-axis, never the y-axis.) So ${piText(r.n, r.d)}.`,
      };
    }
    return {
      prompt: [T.prose(`What is the reference angle of ${D(deg)}?`)],
      text: `reference deg: ${deg}`,
      answer: { type: 'int', value: ref },
      visual: referenceFigure(deg, ref, D(deg), `${ref}°`),
      explain: `${first}${D(t)} is in quadrant ${roman}, so the reference angle is the acute gap between its terminal side and the x-axis: ${rule} = ${ref}°. `
        + `(It is measured to the x-axis, never the y-axis, and it is never more than 90°.) So ${ref}°.`,
    };
  }
}

// ── Arc Length and Sector Area ──────────────────────────────────────────

/** An angle as asked: a multiple of π, plain radians, or degrees. */
function angleAsked(rng) {
  const form = rng.pick(['pi', 'pi', 'plain', 'deg']);
  if (form === 'plain') {
    const v = rng.pick([0.5, 0.8, 1.2, 1.5, 2, 2.5, 3]);
    return { form, v, said: `${said(v)} radians`, text: `theta ${said(v)}`, k: null };
  }
  const deg = rng.pick([30, 45, 60, 90, 120, 135, 150, 180, 210, 240, 270, 300, 20, 40, 72, 100]);
  const q = reduce(deg, 180);
  return form === 'pi'
    ? { form, k: q, said: `${piText(q.n, q.d)} radians`, text: `theta ${q.n}/${q.d} pi`, deg }
    : { form, k: q, said: `${deg}°`, text: `degrees ${deg}`, deg };
}

function arcOrSector(rng, sector) {
  const r = rng.int(2, 20);
  const unit = rng.pick(UNITS);
  const letter = sector ? 'A' : 's';
  const what = sector ? 'sector area' : 'arc length';
  const sq = sector ? { in: 'square inches', ft: 'square feet', cm: 'square centimeters', m: 'square meters' }[unit] : { in: 'inches', ft: 'feet', cm: 'centimeters', m: 'meters' }[unit];
  if (!sector && rng.chance(0.2)) {
    const s = rng.int(2, 60);
    return {
      prompt: [T.prose(`On a circle of radius ${r} ${unit}, a central angle cuts off an arc ${s} ${unit} long. What is the central angle, in radians?`)],
      text: `arc angle: s ${s}, r ${r}`,
      answer: fracAnswer(s, r),
      visual: null,
      explain: `s = rθ, so θ = s/r = ${s}/${r}${reduce(s, r).d !== r ? ` = ${fracText(s, r)}` : ''} ${s === r ? 'radian' : 'radians'}: the arc is that many radii long. `
        + `(r/s = ${r}/${s} is upside down.) So ${fracText(s, r)}.`,
    };
  }
  const A = angleAsked(rng);
  const formula = sector ? `A = ½r²θ` : `s = rθ`;
  const factor = sector ? (r * r) / 2 : r;
  const factorSaid = sector ? `½ × ${r}²` : `${r}`;
  if (A.form === 'plain') {
    const v = factor * A.v;
    return {
      prompt: [T.prose(`A circle has radius ${r} ${unit}, and a central angle of ${A.said}. What is the ${what}, in ${sq}?`)],
      text: `${what}: r ${r}, ${A.text}`,
      answer: exactDec(v),
      visual: null,
      explain: `The angle is in radians, so ${formula} directly: ${letter} = ${factorSaid} × ${said(A.v)} = ${said(v)}. `
        + `(No π: ${said(A.v)} radians is a number of radii, not a multiple of π.) So ${said(v)} ${v === 1 ? sq.replace(/s$/, '').replace('feet', 'foot').replace('inche', 'inch') : sq}.`,
    };
  }
  const coef = reduce(factor * 2 * A.k.n, 2 * A.k.d);
  const convert = A.form === 'deg' ? `First the angle in radians: ${A.deg}° × π/180 = ${piText(A.k.n, A.k.d)}. ` : '';
  return {
    prompt: [T.prose(`A circle has radius ${r} ${unit}, and a central angle of ${A.said}. Give the exact ${what}, in ${sq}, as a multiple of π.`), ...piBlank(letter)],
    text: `${what}: r ${r}, ${A.text}`,
    answer: fracAnswer(coef.n, coef.d),
    visual: null,
    explain: `${convert}${formula}: ${letter} = ${factorSaid} × ${piText(A.k.n, A.k.d)} = ${piText(coef.n, coef.d)}. `
      + `(${A.form === 'deg' ? `Using ${A.deg} for θ without converting gives ${sector ? 'a sector' : 'an arc'} far too big.` : sector ? 'The ½ and the square are on r, not on θ.' : `rθ needs θ in radians, which ${piText(A.k.n, A.k.d)} already is.`}) So ${letter} = ${piText(coef.n, coef.d)} ${sq}.`,
  };
}

// ── Angular Speed ───────────────────────────────────────────────────────

const RIM = [
  { r: 'in', want: 'ft per s', per: 12, wordR: 'inches', wordV: 'feet per second', toS: 60 },
  { r: 'cm', want: 'm per s', per: 100, wordR: 'centimeters', wordV: 'meters per second', toS: 60 },
];

function angularSpeed(rng) {
  const kind = rng.pick(['rad per min', 'rad per s', 'rim', 'rim', 'wheel', 'r omega']);
  if (kind === 'rad per min' || kind === 'rad per s') {
    const rpm = kind === 'rad per s' ? rng.pick([15, 30, 45, 60, 75, 90, 120, 150, 180, 240]) : rng.int(2, 60) * 5;
    const coef = kind === 'rad per s' ? reduce(2 * rpm, 60) : reduce(2 * rpm, 1);
    return {
      prompt: [T.prose(`A wheel turns at ${rpm} revolutions per minute. What is its angular speed, in radians per ${kind === 'rad per s' ? 'second' : 'minute'}, as a multiple of π?`), ...piBlank('ω')],
      text: `angular: rpm ${rpm}, want ${kind}`,
      answer: fracAnswer(coef.n, coef.d),
      visual: null,
      explain: `Each revolution is 2π radians, so ${rpm} revolutions a minute is ${2 * rpm}π radians a minute${kind === 'rad per s' ? `, and over 60 seconds that is ${2 * rpm}π/60 = ${piText(coef.n, coef.d)} per second` : ''}. `
        + `(${rpm} alone counts turns, not radians.) So ${piText(coef.n, coef.d)}.`,
    };
  }
  if (kind === 'r omega') {
    // requiem: catalogue/content/believable-sizes
    // A thing that really turns at that size and speed: a merry-go-round a
    // few meters across turns slowly, a fan blade fast.
    const [thing, r, w, U] = rng.pick([
      () => ['a merry-go-round', ...(rng.chance(0.5) ? [rng.int(4, 12), rng.int(1, 2), ['ft', 'feet']] : [rng.int(2, 5), rng.int(1, 2), ['m', 'meters']])],
      () => ['a fan blade', ...(rng.chance(0.5) ? [rng.int(6, 20), rng.int(10, 40), ['in', 'inches']] : [rng.int(15, 50), rng.int(10, 40), ['cm', 'centimeters']])],
      () => ['a bicycle wheel', ...(rng.chance(0.5) ? [rng.int(10, 14), rng.int(5, 25), ['in', 'inches']] : [rng.int(25, 35), rng.int(5, 25), ['cm', 'centimeters']])],
      () => ['a car tire', ...(rng.chance(0.5) ? [rng.int(12, 15), rng.int(20, 90), ['in', 'inches']] : [rng.int(30, 38), rng.int(20, 90), ['cm', 'centimeters']])],
    ])();
    return {
      prompt: [T.prose(`A point on the edge of ${thing} ${r} ${U[1]} in radius turns at ${w} ${w === 1 ? 'radian' : 'radians'} per second. How fast is the point moving, in ${U[1]} per second?`)],
      text: `rim speed: r ${r}, omega ${w}`,
      answer: { type: 'int', value: r * w },
      visual: null,
      explain: `Radians measure arc in radii, so each second the point covers ${w} radii: v = rω = ${r} × ${w} = ${r * w}. `
        + `(No 2π: ω is already in radians.) So ${r * w} ${U[1]} per second.`,
    };
  }
  for (;;) {
    if (kind === 'rim') {
      const R = rng.pick(RIM);
      const r = rng.int(4, 30), rpm = rng.int(4, 60) * 10;
      const x = (2 * Math.PI * r * rpm) / R.toS / R.per;
      const q = safeRound(x, 1, (2 * 3.1416 * r * rpm) / R.toS / R.per);
      if (q === null || x > 200) continue;
      return {
        prompt: [T.prose(`A wheel of radius ${r} ${R.wordR} turns at ${rpm} revolutions per minute. How fast does a point on its rim move, in ${R.wordV}, ${placeWords(1)}?`)],
        text: `linear speed: r ${r} ${R.r}, rpm ${rpm}, want ${R.want}${placeText(1)}`,
        answer: roundedAnswer(q, 1),
        visual: null,
        explain: `ω = ${rpm} × 2π = ${2 * rpm}π radians per minute, so v = rω = ${r} × ${2 * rpm}π ${R.r} per minute. `
          + `Per second, ÷ 60; in ${R.r === 'in' ? 'feet, ÷ 12' : 'meters, ÷ 100'}: ${2 * r * rpm}π ÷ 60 ÷ ${R.per} ≈ ${at4(x)}, which is ${roundedText(q, 1)} ${placeWords(1)}. `
          + `(Leaving out the 2π counts turns, not distance.) So ${roundedText(q, 1)} ${R.wordV}.`,
      };
    }
    const mph = rng.chance(0.5);
    const dia = mph ? rng.pick([16, 20, 24, 26, 27, 28, 29]) : rng.pick([50, 60, 65, 70, 75]);
    const rpm = rng.int(10, 40) * 10;
    // Distance per turn is the circumference, πd.
    const perHour = Math.PI * dia * rpm * 60;
    const x = mph ? perHour / 63360 : perHour / 100000;
    const q = safeRound(x, 1, (3.1416 * dia * rpm * 60) / (mph ? 63360 : 100000));
    if (q === null || x > 120) continue;
    return {
      prompt: [T.prose(`A bicycle wheel ${dia} ${mph ? 'inches' : 'centimeters'} across turns at ${rpm} revolutions per minute. How fast is the bicycle going, in ${mph ? 'miles' : 'kilometers'} per hour, ${placeWords(1)}?`)],
      text: `wheel speed: diameter ${dia} ${mph ? 'in' : 'cm'}, rpm ${rpm}, want ${mph ? 'mi' : 'km'} per h${placeText(1)}`,
      answer: roundedAnswer(q, 1),
      visual: null,
      explain: `Each turn rolls one circumference, π × ${dia} ${mph ? 'in' : 'cm'}. Per hour: π × ${dia} × ${rpm} × 60 ${mph ? 'in' : 'cm'}, and ${mph ? 'a mile is 63,360 in' : 'a kilometer is 100,000 cm'}: `
        + `≈ ${at4(x)}, which is ${roundedText(q, 1)} ${placeWords(1)}. (The wheel's diameter, not its radius, goes with π here.) So ${roundedText(q, 1)} ${mph ? 'miles' : 'kilometers'} per hour.`,
    };
  }
}

const CONTENT = [toRadians, toDegrees, coterminal, reference, (rng) => arcOrSector(rng, false), (rng) => arcOrSector(rng, true), angularSpeed];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
