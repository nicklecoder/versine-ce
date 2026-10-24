/**
 * Catalogue authoring tool: builds the problem library for circles.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 *
 * Every `text` names the rule's setting and lists what is given, so
 * scripts/check-answers.py can work the answer again: the share of 360°,
 * half the central angle, Pythagoras on a tangent, or the center and
 * radius read off an equation. Like the area skill, an arc or sector
 * question says whether π is kept in the answer or taken as 3.14, and a
 * 3.14 answer is asked to 1 decimal place.
 *
 * Figures are drawn true to their angles. The plane questions are drawn on
 * the grid, with the circle and its center revealed with the answer.
 */
import * as T from '../terms.js';
import { minus } from '../../web/ui/dom.js';
import {
  LINE, GIVEN, ASKED, FRAME, RAD, r2, fit, toward, text, linear, ascii, sized, circlePath, region, rightMark,
  sideLabel, cornerAt, under, dirTo, TRIPLES, cornerLabel, namePoints, piTimes,
} from './figures.js';
import { solve } from './congruence.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/circles.js';

const RESULT = 'var(--result)';
const num = (v) => minus(String(v));
const deg = (v) => `${num(v)}°`;
const R = 2.4;                                    // the drawn radius
const O = [0, 0];
const on = (a) => toward(a, R);
const pointName = (at, name, out = 0.42) => text(toward(dirTo(O, at), out, at), name, LINE);
const seg = (from, to, tone = LINE, extra = {}) => ({ kind: 'segment', from, to, tone, ...extra });
const draw = (marks, reveal, k = 1.2) => fit({ ...FRAME, marks, answer: reveal }, k);
const answerAt = (pts, label) => text(under(pts), label, RESULT);
const putX = ([a, b], x) => `${a === 1 ? `${x}` : `${a}(${x})`}${b === 0 ? '' : b > 0 ? ` + ${b}` : ` − ${-b}`}`;
const fitting = (value, x) => [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((a) => Math.abs(value - a * x) <= 40);
function expr(rng, value, x, not = []) {
  const a = rng.pick(fitting(value, x).filter((c) => !not.includes(c)));
  return [a, value - a * x];
}
function xFor(rng, values) {
  const top = Math.max(12, Math.ceil(Math.max(...values) / 6));
  for (;;) {
    const x = rng.int(2, top);
    if (values.every((v) => fitting(v, x).length >= 3)) return x;
  }
}
/** An angle's size or '?', inside the corner at V. */
function angleText(V, U, W, label, tone = GIVEN) {
  const [from, to] = cornerAt(V, U, W);
  const r = Math.min(1.3, Math.max(0.6, 0.28 / Math.sin(((to - from) / 2) * RAD)));
  return text(toward((from + to) / 2, r, V), label, tone);
}
/** An x-expression angle, written as the prompt writes it, (3x + 10)°, and fitted to its corner or set just outside it. */
const exprAngle = (V, U, W, e, away = O) => cornerLabel(V, U, W, sized(e), GIVEN, { k: 1.2, away });
function arcMark(V, U, W, tone = GIVEN) {
  const [from, to] = cornerAt(V, U, W);
  return { ...circlePath(V, 0.42, tone, from, to) };
}

// ── Exact decimals ──────────────────────────────────────────────────────

/** n/d as a decimal answer, when it ends. */
// requiem: catalogue/content/pi-coefficients-short
// At most two places: 125/8 = 15.625 of π is a fraction to work out, not a
// coefficient to type, so sizes are chosen that make 15.6 or 16, never 15.625.
function exactly(n, d) {
  for (let p = 0; p <= 2; p++) if ((n * 10 ** p) % d === 0) return { type: 'decimal', value: { n: (n * 10 ** p) / d, d: 10 ** p } };
  return null;
}
/** n/d to 1 decimal place, halves up, in whole numbers only. */
const tenths = (n, d) => Math.floor((20 * n + d) / (2 * d));
const shownTenths = (q) => `${Math.floor(q / 10)}.${q % 10}`;
const shownExact = (a) => num(a.value.n / a.value.d);
/** Too close to a rounding edge to ask honestly: the hundredths is a 5 with nothing after. */
const onEdge = (n, d) => (200 * n) % d === 0 && ((200 * n) / d) % 2 === 1;

const ANGLES = [30, 36, 40, 45, 60, 72, 80, 90, 100, 120, 135, 144, 150, 160, 180, 200, 210, 225, 240, 270, 288, 300, 315];
/** The sector AOB from angle 0 round to `t`, turned by `start`. */
/**
 * The sector AOB from angle 0 round to `t`, turned by `start`. An arc of
 * 180° or more is named by three letters, so its middle point C is drawn
 * and lettered; its size is written just inside the arc, by C, since the
 * angle at O of a major arc is no angle a student has met.
 */
function sectorFig(t, start, label, tone, reveal, shade) {
  const A = on(start), B = on(start + t), mid = start + t / 2;
  const pts = circlePath(O, R, LINE, start, start + t).points;
  const big = t >= 180;
  const marks = [circlePath(O, R), ...(shade ? [region([O, ...pts], GIVEN)] : []), { ...circlePath(O, R, GIVEN, start, start + t), dashed: false },
    seg(O, A), seg(O, B), { kind: 'point', at: O, label: '', tone: LINE }, text(toward(mid + 180, 0.4, O), 'O', LINE),
    pointName(A, 'A'), pointName(B, 'B'),
    ...(big ? [{ kind: 'point', at: on(mid), label: '', tone: LINE }, pointName(on(mid), 'C')] : []),
    text(toward(mid, big ? R - 0.75 : 0.75, O), label, tone)];
  return draw(marks, reveal);
}

function arcOrSector(rng, sector) {
  const usePi = rng.chance(0.55), byD = rng.chance(0.25);
  const mode = rng.pick(['find', 'find', 'find', 'angle', 'radius']);
  for (;;) {
    const t = rng.pick(ANGLES), r = rng.int(2, 18);
    const start = rng.int(0, 359);
    const share = `${t}/360`;
    // The coefficient of π: t·2r/360 for an arc, t·r²/360 for a sector.
    const [n, d] = sector ? [t * r * r, 360] : [t * r, 180];
    const what = sector ? 'sector' : 'arc';
    // requiem: catalogue/content/major-arcs-three-letters
    // Arc AB is the minor arc. An arc of 180° or more is named by three
    // letters, arc ACB, with C drawn on it; its size is the arc's measure,
    // never an "angle AOB" of more than 180°.
    const big = t >= 180;
    const arcName = big ? 'arc ACB' : 'arc AB', sectorName = big ? 'the sector bounded by OA, OB and arc ACB' : 'sector AOB';
    const thing = sector ? `the area of ${sectorName}` : `the length of ${arcName}`;
    const sizeSaid = big ? `${t === 180 ? 'arc ACB, a semicircle,' : 'major arc ACB'} measures ${t}°` : `∠AOB = ${t}°`;
    const whole = sector ? `A = πr² = π × ${r}² = ${r * r}π` : `C = 2πr = 2 × π × ${r} = ${2 * r}π`;
    const trap = sector ? `(The circumference 2πr gives an arc’s length, not a sector’s area${byD ? '; and r is half the diameter' : ''}.)`
      : `(πr² is the area, not the length round the edge${byD ? '; and r is half the diameter' : ''}.)`;
    const given = byD ? `diameter ${2 * r}` : `radius ${r}`;
    const rFrom = byD ? `The radius is half the diameter: ${r}. ` : '';
    const angleWord = big ? 'arc’s measure' : 'central angle';
    const labelAt = [on(0), on(90), on(180), on(270)];
    if (mode === 'find') {
      const a = exactly(n, d);
      if (usePi && !a) continue;
      if (!usePi && onEdge(314 * n, 100 * d)) continue;
      const q = tenths(314 * n, 100 * d);
      const answer = usePi ? a : { type: 'decimal', value: { n: q, d: 10, places: 1 } };
      const shown = usePi ? piTimes(a.value.n / a.value.d) : shownTenths(q);
      const letter = sector ? 'A' : 'L';
      const prompt = usePi
        ? [T.prose(`Circle O has ${given} cm, and ${sizeSaid}. What is ${thing}, in ${sector ? 'cm²' : 'cm'}? Keep π in the answer.`),
          T.letter(letter), T.op('='), T.blank(), T.letter('π')]
        : [T.prose(`Circle O has ${given} cm, and ${sizeSaid}. What is ${thing}, in ${sector ? 'cm²' : 'cm'}, to 1 decimal place? Use 3.14 for π.`)];
      const exactShown = exactly(n, d);
      const piWork = exactShown ? piTimes(exactShown.value.n / exactShown.value.d) : `${n}π/${d}`;
      return {
        prompt,
        text: `${what}: ${byD ? 'd' : 'r'} ${byD ? 2 * r : r}, angle ${t} ${usePi ? '(pi)' : '(3.14) to 1 dp'}`,
        answer,
        visual: sectorFig(t, start, `${t}°`, GIVEN, [answerAt(labelAt, `${shown}`)], sector),
        explain: `${rFrom}The ${what} is the ${angleWord}’s share of the whole circle, ${share}. The whole: ${whole}. `
          + `So ${share} × ${sector ? r * r : 2 * r}π = ${piWork}${usePi ? '' : ` ≈ ${exactShown ? `${shownExact(exactShown)} × 3.14` : `${n} × 3.14 ÷ ${d}`} = ${((314 * n) / (100 * d)).toFixed(4).replace(/\.?0+$/, '')}, which is ${shown} to 1 dp`}. `
          + `${trap} So ${shown}${sector ? ' cm²' : ' cm'}.`,
      };
    }
    // Back from a length or an area kept in π.
    const a = exactly(n, d);
    if (!a || !(Number.isInteger(n / d) || Number.isInteger((2 * n) / d))) continue;
    const coeff = shownExact(a), kept = piTimes(a.value.n / a.value.d);
    if (mode === 'angle') {
      const asked = big ? `the measure of ${t === 180 ? 'arc ACB' : 'major arc ACB'}` : '∠AOB';
      const said = big ? `arc ACB = ${t}°` : `∠AOB = ${t}°`;
      return {
        prompt: [T.prose(`Circle O has radius ${r} cm, and ${thing} is ${kept} ${sector ? 'cm²' : 'cm'}. What is ${asked}, in degrees?`)],
        text: `${what} angle: r ${r}, ${sector ? 'area' : 'length'} ${coeff} pi`,
        answer: { type: 'int', value: t },
        visual: sectorFig(t, start, '?', ASKED, [answerAt(labelAt, said)], sector),
        explain: `The whole circle’s ${sector ? `area is πr² = ${r * r}π` : `circumference is 2πr = ${2 * r}π`}, and the ${what} is ${kept} of it: `
          + `${coeff}/${sector ? r * r : 2 * r} of the circle. That share of 360° is ${coeff} ÷ ${sector ? r * r : 2 * r} × 360 = ${t}°. `
          + `(Not ${coeff} × 360: the share is the ${what} over the whole.) So ${said}.`,
      };
    }
    if (sector && t >= 300) continue;
    return {
      prompt: [T.prose(`In circle O, ${sizeSaid}, and ${thing} is ${kept} ${sector ? 'cm²' : 'cm'}. What is the radius, in cm?`)],
      text: `${what} radius: angle ${t}, ${sector ? 'area' : 'length'} ${coeff} pi`,
      answer: { type: 'int', value: r },
      visual: sectorFig(t, start, `${t}°`, GIVEN, [answerAt(labelAt, `r = ${r}`)], sector),
      explain: `The ${what} is ${share} of the whole, so the whole ${sector ? 'area' : 'circumference'} is ${kept} × 360/${t} = ${sector ? r * r : 2 * r}π. `
        + (sector ? `πr² = ${r * r}π, so r² = ${r * r} and r = ${r}. (Stopping at ${r * r} gives r², not r.)` : `2πr = ${2 * r}π, so r = ${2 * r} ÷ 2 = ${r}. (${2 * r} is the diameter.)`)
        + ` So r = ${r} cm.`,
    };
  }
}

// ── Central and inscribed angles ────────────────────────────────────────

function inscribed(rng) {
  for (;;) {
    const c = 2 * rng.int(16, 85);                 // the central angle on the minor arc AB
    const a0 = rng.int(200, 340), A = on(a0), B = on(a0 + c);
    const Cat = a0 + c + rng.int(30, 360 - c - 30), C = on(Cat);
    const Dat = a0 + rng.int(15, c - 15), D = on(Dat);
    // requiem: catalogue/content/circle-rules-before-equations
    // The rule is the new idea, so most rows give a number and ask for the
    // other angle, every way round; the x-equations are one mode of eight,
    // and the level's cap keeps them near a third of its library.
    const mode = rng.pick(['central', 'arc', 'inscribed', 'arc-back', 'minor', 'minor-back', 'opposite', 'x']);
    const half = c / 2;
    const base = [circlePath(O, R), seg(O, A), seg(O, B), text(toward(a0 + c / 2 + 180, 0.38, O), 'O', LINE),
      pointName(A, 'A'), pointName(B, 'B')];
    const atC = [seg(C, A), seg(C, B), pointName(C, 'C')];
    const fact = 'An inscribed angle is half the central angle standing on the same arc. ';
    if (mode === 'minor-back') {
      // From the angle at D, on the minor arc, back to the central angle.
      const gv = 180 - half;
      return {
        prompt: [T.prose(`A, B and D are on circle O, with D on the minor arc AB, and ∠ADB = ${deg(gv)}. What is ∠AOB, in degrees?`)],
        text: `inscribed minor: ADB ${gv}; find AOB`,
        answer: { type: 'int', value: c },
        visual: draw([...base, seg(D, A), seg(D, B), pointName(D, 'D'), angleText(D, A, B, deg(gv)), angleText(O, A, B, '?', ASKED)],
          [answerAt([on(0), on(180), on(270)], `∠AOB = ${deg(c)}`)]),
        explain: `${fact}∠ADB stands on the major arc AB, the one away from D, so that arc's central angle is 2 × ${gv} = ${2 * gv}°. `
          + `∠AOB is the rest of the way round: 360 − ${2 * gv} = ${c}°. (Doubling ${gv} gives the major arc, not ∠AOB.) So ∠AOB = ${deg(c)}.`,
      };
    }
    if (mode === 'opposite') {
      // C on the major arc and D on the minor: together they stand on the whole circle.
      const want = 180 - half;
      return {
        prompt: [T.prose(`A, B, C and D are on circle O, with C on the major arc AB and D on the minor arc AB, and ∠ACB = ${deg(half)}. What is ∠ADB, in degrees?`)],
        text: `inscribed opposite: ACB ${half}; find ADB`,
        answer: { type: 'int', value: want },
        visual: draw([...base, ...atC, seg(D, A), seg(D, B), pointName(D, 'D'), angleText(C, A, B, deg(half)), angleText(D, A, B, '?', ASKED)],
          [answerAt([on(0), on(180), on(270)], `∠ADB = ${deg(want)}`)]),
        explain: `${fact}∠ACB stands on the minor arc AB and ∠ADB on the major arc, and the two arcs make the whole 360°, so the two angles add to half of it, 180°: `
          + `∠ADB = 180 − ${half} = ${want}°. (ACBD is a cyclic quadrilateral, and these are its opposite angles; they are equal only when both are 90°.) So ∠ADB = ${deg(want)}.`,
      };
    }
    if (mode === 'arc-back') {
      return {
        prompt: [T.prose(`A, B and C are on circle O, with C on the major arc AB, and ∠ACB = ${deg(half)}. What is the measure of the minor arc AB, in degrees?`)],
        text: `inscribed: ACB ${half}; find arc AB`,
        answer: { type: 'int', value: c },
        visual: draw([...base, ...atC, { ...circlePath(O, R, ASKED, a0, a0 + c) }, angleText(C, A, B, deg(half))], [answerAt([on(0), on(180), on(270)], `arc AB = ${deg(c)}`)]),
        explain: `${fact}An arc measures its central angle, so the minor arc AB is twice ∠ACB: 2 × ${half} = ${c}°. (Halving goes the wrong way: the arc is twice the angle at the circle.) So ${deg(c)}.`,
      };
    }
    if (mode === 'minor') {
      const want = 180 - half;
      return {
        prompt: [T.prose(`A, B and D are on circle O, with D on the minor arc AB, and ∠AOB = ${deg(c)}. What is ∠ADB, in degrees?`)],
        text: `inscribed minor: central AOB ${c}; find ADB`,
        answer: { type: 'int', value: want },
        visual: draw([...base, seg(D, A), seg(D, B), pointName(D, 'D'), angleText(O, A, B, deg(c)), angleText(D, A, B, '?', ASKED)],
          [answerAt([on(0), on(180), on(270)], `∠ADB = ${deg(want)}`)]),
        explain: `${fact}∠ADB stands on the major arc AB, the one away from D, whose central angle is 360 − ${c} = ${360 - c}°. `
          + `So ∠ADB = ${360 - c} ÷ 2 = ${want}°. (Half of ${c} is the angle from the other side of the circle.) So ∠ADB = ${deg(want)}.`,
      };
    }
    if (mode === 'x') {
      const x = xFor(rng, [half, c]);
      const e1 = expr(rng, half, x), e2 = expr(rng, c, x);
      if (2 * e1[0] === e2[0]) continue;
      const s = solve([2 * e1[0], 2 * e1[1]], e2);
      return {
        prompt: [T.prose(`A, B and C are on circle O, with C on the major arc AB. ∠ACB = ${sized(e1)} and ∠AOB = ${sized(e2)}. What is x?`)],
        text: `inscribed: ACB ${ascii(...e1)}, AOB ${ascii(...e2)}; find x`,
        answer: { type: 'int', value: x },
        visual: draw([...base, ...atC, ...exprAngle(O, A, B, e2, C), ...exprAngle(C, A, B, e1)], [answerAt([on(0), on(180), on(270)], `x = ${x}`)]),
        explain: `${fact}So ∠AOB = 2∠ACB: 2(${linear(...e1)}) = ${linear(...e2)}, which is ${s.work} `
          + `Check: ∠ACB = ${putX(e1, x)} = ${half}° and ∠AOB = ${putX(e2, x)} = ${c}°. (Setting them equal forgets the half.) So x = ${x}.`,
      };
    }
    if (mode === 'inscribed') {
      return {
        prompt: [T.prose(`A, B and C are on circle O, with C on the major arc AB, and ∠ACB = ${deg(half)}. What is ∠AOB, in degrees?`)],
        text: `inscribed: ACB ${half}; find AOB`,
        answer: { type: 'int', value: c },
        visual: draw([...base, ...atC, angleText(C, A, B, deg(half)), angleText(O, A, B, '?', ASKED)], [answerAt([on(0), on(180), on(270)], `∠AOB = ${deg(c)}`)]),
        explain: `${fact}So the central angle is twice it: ∠AOB = 2 × ${half} = ${c}°. (Halving goes the wrong way: the angle at the center is the bigger one.) So ∠AOB = ${deg(c)}.`,
      };
    }
    const byArc = mode === 'arc';
    return {
      prompt: [T.prose(`A, B and C are on circle O, with C on the major arc AB, and ${byArc ? `the minor arc AB measures ${deg(c)}` : `∠AOB = ${deg(c)}`}. What is ∠ACB, in degrees?`)],
      text: `inscribed: ${byArc ? 'arc AB' : 'AOB'} ${c}; find ACB`,
      answer: { type: 'int', value: half },
      visual: draw([...base, ...atC, angleText(O, A, B, deg(c)), angleText(C, A, B, '?', ASKED)], [answerAt([on(0), on(180), on(270)], `∠ACB = ${deg(half)}`)]),
      explain: `${byArc ? `An arc’s measure is its central angle, so ∠AOB = ${c}°. ` : ''}${fact}∠ACB = ${c} ÷ 2 = ${half}°. `
        + `(It does not matter where C sits on the major arc: every such angle is the same.) So ∠ACB = ${deg(half)}.`,
    };
  }
}

// ── Semicircles and cyclic quadrilaterals ───────────────────────────────

function semicircle(rng) {
  const a = rng.int(18, 72);
  if (a === 45) return semicircle(rng);
  const turn = rng.int(-20, 20), A = on(180 + turn), B = on(turn);
  // ∠CAB = a puts C at 2a round from B: the inscribed angle at A stands on arc CB.
  const Cp = on(turn + 2 * a);
  const marks = [circlePath(O, R), seg(A, B), seg(A, Cp), seg(B, Cp), text(toward(turn - 90, 0.4, O), 'O', LINE),
    pointName(A, 'A'), pointName(B, 'B'), pointName(Cp, 'C')];
  const fact = 'AB is a diameter, so ∠ACB stands on a semicircle, whose central angle is 180°: ∠ACB = 90°. ';
  if (rng.chance(0.35)) {
    const x = xFor(rng, [90]), e = expr(rng, 90, x), s = solve(e, [0, 90]);
    return {
      prompt: [T.prose(`AB is a diameter of circle O, and C is on the circle. ∠ACB = ${sized(e)}. What is x?`)],
      text: `semicircle: AB diameter; angle ACB ${ascii(...e)}; find x`,
      answer: { type: 'int', value: x },
      visual: draw([...marks, ...exprAngle(Cp, A, B, e)], [answerAt([A, B, on(270)], `x = ${x}`)]),
      explain: `${fact}So ${s.work} Check: ${putX(e, x)} = 90. (It is half of 180°, not 180° itself.) So x = ${x}.`,
    };
  }
  const [given, asked] = rng.chance(0.5) ? ['CAB', 'CBA'] : ['CBA', 'CAB'];
  const gv = given === 'CAB' ? a : 90 - a, want = 90 - gv;
  const pts = { A, B, C: Cp };
  return {
    prompt: [T.prose(`AB is a diameter of circle O, and C is on the circle. ∠${given} = ${deg(gv)}. What is ∠${asked}, in degrees?`)],
    text: `semicircle: AB diameter; angle ${given} ${gv}; find angle ${asked}`,
    answer: { type: 'int', value: want },
    visual: draw([...marks, angleText(pts[given[1]], pts[given[0]], pts[given[2]], deg(gv)), angleText(pts[asked[1]], pts[asked[0]], pts[asked[2]], '?', ASKED)],
      [answerAt([A, B, on(270)], `∠${asked} = ${deg(want)}`)]),
    explain: `${fact}The angles of △ABC add to 180°, so ∠${asked} = 180 − 90 − ${gv} = ${want}°. (Without the right angle at C there would be nothing to go on.) So ∠${asked} = ${deg(want)}.`,
  };
}

function cyclic(rng) {
  for (;;) {
    const s = [0, 1, 2, 3].map(() => 2 * rng.int(22, 70));
    const total = s.reduce((p, q) => p + q, 0);
    if (total !== 360) {
      s[3] += 360 - total;
      if (s[3] < 44 || s[3] > 160 || s[3] % 2) continue;
    }
    const ang = { A: (s[1] + s[2]) / 2, B: (s[2] + s[3]) / 2, C: (s[3] + s[0]) / 2, D: (s[0] + s[1]) / 2 };
    if (Object.values(ang).some((v) => v === 90)) continue;
    const start = rng.int(180, 250);
    const at = [start, start + s[0], start + s[0] + s[1], start + s[0] + s[1] + s[2]];
    const P = at.map(on), names = 'ABCD';
    const marks = [circlePath(O, R), ...P.map((p, i) => seg(p, P[(i + 1) % 4])), ...P.map((p, i) => pointName(p, names[i]))];
    const corner = (v, l, tone) => { const i = names.indexOf(v); return angleText(P[i], P[(i + 1) % 4], P[(i + 3) % 4], l, tone); };
    const cornerE = (v, e) => { const i = names.indexOf(v); return exprAngle(P[i], P[(i + 1) % 4], P[(i + 3) % 4], e); };
    const fact = 'Opposite angles of a cyclic quadrilateral add to 180°: each is half the arc it stands on, and the two arcs make the whole 360°. ';
    if (rng.chance(0.4)) {
      const [v, u] = rng.pick([['A', 'C'], ['B', 'D']]);
      const x = xFor(rng, [ang[v], ang[u]]);
      const e1 = expr(rng, ang[v], x), e2 = expr(rng, ang[u], x, [e1[0]]);
      const sv = solve([e1[0] + e2[0], e1[1] + e2[1]], [0, 180]);
      return {
        prompt: [T.prose(`ABCD is a quadrilateral with all four corners on a circle. ∠${v} = ${sized(e1)} and ∠${u} = ${sized(e2)}. What is x?`)],
        text: `cyclic quadrilateral: angle ${v} ${ascii(...e1)}, angle ${u} ${ascii(...e2)}; find x`,
        answer: { type: 'int', value: x },
        visual: draw([...marks, ...cornerE(v, e1), ...cornerE(u, e2)], [answerAt(P, `x = ${x}`)]),
        explain: `${fact}So (${linear(...e1)}) + (${linear(...e2)}) = 180, which gathers to ${sv.work} Check: ${putX(e1, x)} = ${ang[v]} and ${putX(e2, x)} = ${ang[u]}, which add to 180. `
          + `(Opposite angles add to 180°; they are equal only when both are 90°.) So x = ${x}.`,
      };
    }
    const v = rng.pick([...names]), u = names[(names.indexOf(v) + 2) % 4];
    return {
      prompt: [T.prose(`ABCD is a quadrilateral with all four corners on a circle, and ∠${v} = ${deg(ang[v])}. What is ∠${u}, in degrees?`)],
      text: `cyclic quadrilateral: angle ${v} ${ang[v]}; find angle ${u}`,
      answer: { type: 'int', value: ang[u] },
      visual: draw([...marks, corner(v, deg(ang[v])), corner(u, '?', ASKED)], [answerAt(P, `∠${u} = ${deg(ang[u])}`)]),
      explain: `${fact}∠${u} is opposite ∠${v}, so ∠${u} = 180 − ${ang[v]} = ${ang[u]}°. (Not equal to it: that is a parallelogram’s rule.) So ∠${u} = ${deg(ang[u])}.`,
    };
  }
}

function sameArc(rng) {
  const c = 2 * rng.int(20, 80), half = c / 2;
  const a0 = rng.int(200, 320), A = on(a0), B = on(a0 + c);
  const room = 360 - c - 40;
  const t1 = rng.int(20, 20 + Math.floor(room / 2) - 10), t2 = rng.int(t1 + 20, 20 + room);
  const C = on(a0 + c + t1), D = on(a0 + c + t2);
  const marks = [circlePath(O, R), seg(C, A), seg(C, B), seg(D, A), seg(D, B), pointName(A, 'A'), pointName(B, 'B'), pointName(C, 'C'), pointName(D, 'D')];
  const x = xFor(rng, [half]);
  const e1 = expr(rng, half, x), e2 = expr(rng, half, x, [e1[0]]);
  const s = solve(e1, e2);
  return {
    prompt: [T.prose(`A, B, C and D are on a circle, with C and D on the same side of AB. ∠ACB = ${sized(e1)} and ∠ADB = ${sized(e2)}. What is x?`)],
    text: `same arc: angle ACB ${ascii(...e1)}, angle ADB ${ascii(...e2)}; find x`,
    answer: { type: 'int', value: x },
    visual: draw([...marks, ...exprAngle(C, A, B, e1), ...exprAngle(D, A, B, e2)], [answerAt([A, B, C, D], `x = ${x}`)]),
    explain: `∠ACB and ∠ADB both stand on arc AB from the same side, so each is half the same central angle: they are equal. ${s.work} `
      + `Check: both come to ${half}°. (Adding them to 180° is the rule for opposite corners of a cyclic quadrilateral, not for angles on the same arc.) So x = ${x}.`,
  };
}

// requiem: catalogue/content/circles-cyclic-level
const semicirclesCyclic =(rng) => rng.pick([semicircle, cyclic, cyclic, sameArc])(rng);

// ── Tangents ────────────────────────────────────────────────────────────

function tangentRadius(rng) {
  const [p, q, h] = rng.pick(TRIPLES);
  const k = rng.pick([1, 1, 2, 3, 4]);
  const [r, t, d] = rng.chance(0.5) ? [p * k, q * k, h * k] : [q * k, p * k, h * k];
  const ask = rng.pick(['OP', 'PT', 'OT']);
  // O at the middle, T on the circle, P along the tangent at T.
  const a = rng.int(60, 120), T0 = on(a), s = R / r;
  const dir = a - 90, P = toward(dir, t * s, T0);
  const vals = { OT: r, PT: t, OP: d };
  const shown = Object.keys(vals).filter((n) => n !== ask);
  const lab = { OT: () => sideLabel(O, T0, `${r}`, P), PT: () => sideLabel(T0, P, `${t}`, O), OP: () => sideLabel(O, P, `${d}`, T0) };
  const marks = [circlePath(O, R), seg(O, T0), seg(T0, P), seg(O, P), text(toward(a + 180, 0.4, O), 'O', LINE),
    pointName(T0, 'T'), text(toward(dir, 0.42, P), 'P', LINE), ...shown.map((n) => lab[n]())];
  if (rng.chance(0.4)) {
    // The angles of the right triangle OTP.
    const angO = rng.int(25, 65), P = toward(dir, Math.min(4.2, R * Math.tan(angO * RAD)), T0);
    const given = rng.pick(['TOP', 'TPO']), gv = given === 'TOP' ? angO : 90 - angO, asked = given === 'TOP' ? 'TPO' : 'TOP';
    const pts = { O, T: T0, P };
    return {
      prompt: [T.prose(`PT is tangent to circle O at T, and ∠${given} = ${deg(gv)}. What is ∠${asked}, in degrees?`)],
      text: `tangent angle: angle ${given} ${gv}; find angle ${asked}`,
      answer: { type: 'int', value: 90 - gv },
      visual: draw([circlePath(O, R), seg(O, T0), seg(T0, P), seg(O, P), text(toward(a + 180, 0.4, O), 'O', LINE), pointName(T0, 'T'),
        text(toward(dir, 0.42, P), 'P', LINE), angleText(pts[given[1]], pts[given[0]], pts[given[2]], deg(gv)),
        angleText(pts[asked[1]], pts[asked[0]], pts[asked[2]], '?', ASKED)], [rightMark(T0, O, P), answerAt([O, T0, P, on(270)], `∠${asked} = ${deg(90 - gv)}`)]),
      explain: `A tangent meets the radius at its point of contact at 90°, so ∠OTP = 90° and the other two angles of △OTP share the remaining 90°: `
        + `∠${asked} = 90 − ${gv} = ${90 - gv}°. (Taking it from 180° forgets the right angle at T.) So ∠${asked} = ${deg(90 - gv)}.`,
    };
  }
  const work = ask === 'OP' ? `OP² = ${r}² + ${t}² = ${r * r + t * t}, so OP = ${d}`
    : ask === 'PT' ? `PT² = ${d}² − ${r}² = ${d * d - r * r}, so PT = ${t}` : `OT² = ${d}² − ${t}² = ${d * d - t * t}, so OT = ${r}`;
  return {
    prompt: [T.prose(`PT is tangent to circle O at T. ${shown.map((n) => `${n} = ${vals[n]}`).join(' and ')}. How long is ${ask}?`)],
    text: `tangent: ${shown.map((n) => `${n} ${vals[n]}`).join(', ')}; find ${ask}`,
    answer: { type: 'int', value: vals[ask] },
    visual: draw(marks, [rightMark(T0, O, P), answerAt([O, T0, P, on(270)], `${ask} = ${vals[ask]}`)]),
    explain: `A tangent meets the radius at its point of contact at a right angle, so △OTP is right-angled at T, with OP the hypotenuse. `
      + `${work}. (${ask === 'OP' ? 'OP is the longest side, opposite the right angle.' : 'OP is the hypotenuse, so subtract: adding the squares would make it longer than OP.'}) So ${ask} = ${vals[ask]}.`,
  };
}

function twoTangents(rng) {
  const byAngle = rng.chance(0.6);
  const p = byAngle ? 2 * rng.int(15, 60) : 2 * rng.int(18, 40);
  const half = p / 2, dist = R / Math.sin(half * RAD), axis = rng.int(-30, 30);
  const P = toward(axis, dist), A = on(axis + (90 - half)), B = on(axis - (90 - half));
  const marks = [circlePath(O, R), seg(P, A), seg(P, B), seg(O, A), seg(O, B), text(toward(axis + 180, 0.4, O), 'O', LINE),
    pointName(A, 'A'), pointName(B, 'B'), text(toward(axis, 0.42, P), 'P', LINE)];
  if (byAngle) {
    const askAOB = rng.chance(0.6), want = askAOB ? 180 - p : p, gv = askAOB ? p : 180 - p;
    return {
      prompt: [T.prose(`PA and PB are tangent to circle O at A and B, and ∠${askAOB ? 'APB' : 'AOB'} = ${deg(gv)}. What is ∠${askAOB ? 'AOB' : 'APB'}, in degrees?`)],
      text: `two tangents: angle ${askAOB ? 'APB' : 'AOB'} ${gv}; find angle ${askAOB ? 'AOB' : 'APB'}`,
      answer: { type: 'int', value: want },
      visual: draw([...marks, rightMark(A, O, P), rightMark(B, O, P), askAOB ? angleText(P, A, B, deg(gv)) : angleText(O, A, B, deg(gv)),
        askAOB ? angleText(O, A, B, '?', ASKED) : angleText(P, A, B, '?', ASKED)], [answerAt([P, A, B, on(270)], `${want}°`)]),
      explain: `Each tangent meets its radius at 90°, so in quadrilateral OAPB two angles are 90° and the four add to 360°: `
        + `∠AOB + ∠APB = 180°. So it is 180 − ${gv} = ${want}°. (The two are supplementary, not equal.) So ${want}°.`,
    };
  }
  const L = rng.int(6, 40), x = xFor(rng, [L]);
  const e1 = expr(rng, L, x), e2 = expr(rng, L, x, [e1[0]]);
  const s = solve(e1, e2);
  const askLen = rng.chance(0.35);
  return {
    prompt: [T.prose(`PA and PB are tangent to circle O at A and B. PA = ${linear(...e1)} and PB = ${linear(...e2)}. ${askLen ? 'How long is PA?' : 'What is x?'}`)],
    text: `two tangents: PA ${ascii(...e1)}, PB ${ascii(...e2)}; find ${askLen ? 'PA' : 'x'}`,
    answer: { type: 'int', value: askLen ? L : x },
    visual: draw([...marks, sideLabel(P, A, linear(...e1), O), sideLabel(P, B, linear(...e2), O)], [answerAt([P, A, B, on(270)], askLen ? `PA = ${L}` : `x = ${x}`)]),
    explain: `Two tangents from the same point are equal: △OAP and △OBP are right triangles with the same hypotenuse OP and equal radii, so congruent (HL). `
      + `${s.work} ${askLen ? `Then PA = ${putX(e1, x)} = ${L}. (x is not the length: put it back in.)` : `Check: both come to ${L}.`} So ${askLen ? `PA = ${L}` : `x = ${x}`}.`,
  };
}

const tangents = (rng) => (rng.chance(0.6) ? tangentRadius(rng) : twoTangents(rng));

// ── The equation of a circle ────────────────────────────────────────────

const SPAN = 10;
const sq = (v) => (v === 0 ? 'x²' : `(x ${v > 0 ? '−' : '+'} ${Math.abs(v)})²`);
const sqY = (v) => (v === 0 ? 'y²' : `(y ${v > 0 ? '−' : '+'} ${Math.abs(v)})²`);
const sqA = (v, l) => (v === 0 ? `${l}^2` : `(${l} ${v > 0 ? '-' : '+'} ${Math.abs(v)})^2`);
const pt = ([x, y]) => `(${num(x)}, ${num(y)})`;
const pairOf = ([x, y]) => ({ type: 'pair', value: { x: { n: x, d: 1 }, y: { n: y, d: 1 } } });
function plane(h, k, r) {
  const lo = (c) => Math.floor(c - r - 2), hi = (c) => Math.ceil(c + r + 2);
  const span = Math.max(hi(h) - lo(h), hi(k) - lo(k));
  return { kind: 'plane', xRange: [Math.min(lo(h), 0), Math.max(lo(h) + span, 0)], yRange: [Math.min(lo(k), 0), Math.max(lo(k) + span, 0)], grid: 1 };
}

function equation(rng) {
  for (;;) {
    const h = rng.int(-6, 6), k = rng.int(-6, 6), r = rng.int(1, 7);
    if (h === 0 && k === 0) continue;
    const eq = `${sq(h)} + ${sqY(k)} = ${r * r}`, eqA = `${sqA(h, 'x')} + ${sqA(k, 'y')} = ${r * r}`;
    const circle = circlePath([h, k], r, LINE);
    const mode = rng.pick(['center', 'radius', 'through', 'where']);
    const reveal = [{ kind: 'point', at: [h, k], label: `center ${pt([h, k])}`, tone: RESULT }, seg([h, k], [h + r, k], RESULT)];
    const base = { ...plane(h, k, r) };
    if (mode === 'center') {
      return {
        prompt: [T.prose(`What is the center of the circle ${eq}?`)],
        text: `circle center: ${eqA}`,
        answer: pairOf([h, k]),
        visual: { ...base, marks: [], answer: [circle, ...reveal] },
        explain: `In (x − h)² + (y − k)² = r² the center is (h, k), the numbers that make each bracket zero. `
          + `${h === 0 ? 'x² is (x − 0)², so h = 0' : `${sq(h)} is zero at x = ${num(h)}`}, and ${k === 0 ? 'y² is (y − 0)², so k = 0' : `${sqY(k)} is zero at y = ${num(k)}`}. `
          + `(The signs flip: a plus inside the bracket means a negative coordinate.) So ${pt([h, k])}.`,
      };
    }
    if (mode === 'radius') {
      return {
        prompt: [T.prose(`What is the radius of the circle ${eq}?`)],
        text: `circle radius: ${eqA}`,
        answer: { type: 'int', value: r },
        visual: { ...base, marks: [], answer: [circle, ...reveal] },
        explain: `The right side is r², the radius squared: r² = ${r * r}, so r = √${r * r} = ${r}. (${r * r} itself is r², not the radius.) So r = ${r}.`,
      };
    }
    if (mode === 'through') {
      // A point on the circle, from a triple or along a grid line, so r² comes out whole either way.
      const [a, b] = rng.pick([[r, 0], [0, r], [3, 4], [4, 3], [-3, 4], [5, 12], [6, 8], [-4, -3], [1, 2], [2, -3], [-1, 5]]);
      const Q = [h + a, k + b], r2v = a * a + b * b;
      if (Math.abs(Q[0]) > SPAN || Math.abs(Q[1]) > SPAN) continue;
      return {
        prompt: [T.prose(`A circle has center ${pt([h, k])} and passes through ${pt(Q)}. Its equation is ${sq(h)} + ${sqY(k)} = r². What is r²?`)],
        text: `circle through: center (${h}, ${k}), point (${Q[0]}, ${Q[1]}); find r^2`,
        answer: { type: 'int', value: r2v },
        visual: { ...plane(h, k, Math.sqrt(r2v)), marks: [{ kind: 'point', at: [h, k], label: 'C', tone: LINE }, { kind: 'point', at: Q, label: 'P', tone: LINE }],
          answer: [circlePath([h, k], Math.sqrt(r2v), RESULT), seg([h, k], Q, RESULT)] },
        explain: `The radius is the distance from the center to the point, and r² is that distance squared: `
          + `(${num(Q[0])} − ${h < 0 ? `(${num(h)})` : num(h)})² + (${num(Q[1])} − ${k < 0 ? `(${num(k)})` : num(k)})² = ${a * a} + ${b * b} = ${r2v}. `
          + `(The equation wants r², so there is no square root to take.) So r² = ${r2v}.`,
      };
    }
    // Inside, on or outside: compare the squared distance with r².
    const [a, b] = rng.pick([[r, 0], [0, -r], [3, 4], [-4, 3], [1, 1], [2, -1], [r, 1], [r + 1, 0], [-2, r], [0, r - 1], [1, -2]]);
    const Q = [h + a, k + b], d2v = a * a + b * b, kind = d2v === r * r ? 'on' : d2v < r * r ? 'inside' : 'outside';
    if (Math.abs(Q[0]) > SPAN || Math.abs(Q[1]) > SPAN) continue;
    return {
      prompt: [T.prose(`Is the point ${pt(Q)} inside, on or outside the circle ${eq}?`)],
      text: `circle point: ${eqA}; point (${Q[0]}, ${Q[1]})`,
      answer: { type: 'choice', value: kind, options: [{ id: 'inside', label: 'Inside' }, { id: 'on', label: 'On the circle' }, { id: 'outside', label: 'Outside' }] },
      visual: { ...plane(h, k, Math.max(r, Math.sqrt(d2v))), marks: [{ kind: 'point', at: Q, label: 'P', tone: LINE }], answer: [circle, ...reveal] },
      explain: `Put the point into the left side: (${num(Q[0])} − ${h < 0 ? `(${num(h)})` : num(h)})² + (${num(Q[1])} − ${k < 0 ? `(${num(k)})` : num(k)})² = ${a * a} + ${b * b} = ${d2v}, `
        + `the squared distance from the center. Against r² = ${r * r}: ${d2v === r * r ? 'equal, so on the circle' : d2v < r * r ? 'less, so inside' : 'more, so outside'}. `
        + `(Compare with r² = ${r * r}, not with r = ${r}.) So ${kind === 'on' ? 'on the circle' : kind}.`,
    };
  }
}

// ── Completing the square ───────────────────────────────────────────────

const term = (c, v, first = false) => (c === 0 ? '' : `${c < 0 ? (first ? '−' : ' − ') : first ? '' : ' + '}${Math.abs(c) === 1 ? '' : Math.abs(c)}${v}`);
function general(rng) {
  for (;;) {
    const h = rng.int(-7, 7), k = rng.int(-7, 7), r = rng.int(2, 9);
    if (h === 0 || k === 0) continue;
    const m = rng.chance(0.2) ? 2 : 1;
    const D = -2 * h, E = -2 * k, F = h * h + k * k - r * r;
    const lhs = `${m === 1 ? '' : m}x² + ${m === 1 ? '' : m}y²${term(m * D, 'x')}${term(m * E, 'y')}${F === 0 ? '' : `${F < 0 ? ' − ' : ' + '}${Math.abs(m * F)}`}`;
    const lhsA = lhs.replace(/−/g, '-').replace(/²/g, '^2');
    const ask = rng.chance(0.55) ? 'center' : 'radius';
    const half = (c) => c / 2;
    const div = m === 2 ? `First divide every term by 2, so x² and y² stand alone: x² + y²${term(D, 'x')}${term(E, 'y')}${F === 0 ? '' : `${F < 0 ? ' − ' : ' + '}${Math.abs(F)}`} = 0. ` : '';
    const work = `${div}Gather the x terms and the y terms and move the number across: (x²${term(D, 'x')}) + (y²${term(E, 'y')}) = ${num(-F)}. `
      + `Half of ${num(D)} is ${num(half(D))}, squared ${h * h}; half of ${num(E)} is ${num(half(E))}, squared ${k * k}. Add both to each side: `
      + `${sq(h)} + ${sqY(k)} = ${num(-F)} + ${h * h} + ${k * k} = ${r * r}. `;
    return {
      prompt: [T.prose(`What is the ${ask} of the circle ${lhs} = 0?`)],
      text: `circle general: ${lhsA} = 0; find ${ask}`,
      answer: ask === 'center' ? pairOf([h, k]) : { type: 'int', value: r },
      visual: { ...plane(h, k, r), marks: [], answer: [circlePath([h, k], r, LINE), { kind: 'point', at: [h, k], label: `center ${pt([h, k])}`, tone: RESULT }, seg([h, k], [h + r, k], RESULT)] },
      explain: `${work}${ask === 'center'
        ? `The center is ${pt([h, k])}, the opposite signs to those in the brackets. (Half of ${num(D)} with its sign kept, ${num(half(D))}, gives the bracket, not the coordinate.)`
        : `So r² = ${r * r} and r = ${r}. (Taking r² = ${num(-F)} forgets the squares added to both sides.)`} `
        + `So ${ask === 'center' ? pt([h, k]) : `r = ${r}`}.`,
    };
  }
}

const CONTENT = [(rng) => arcOrSector(rng, false), (rng) => arcOrSector(rng, true), inscribed, semicirclesCyclic, tangents, equation, general];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  // The plane questions' points, and the center revealed with its circle, named clear of the circle.
  if (p.visual) p.visual = namePoints(p.visual);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
