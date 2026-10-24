/**
 * Catalogue authoring tool: builds the problem library for volume and
 * surface area.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 *
 * Every `text` names the solid and gives every length the figure shows --
 * a slant passed over included -- and whether π is kept or taken as 3.14,
 * so scripts/check-answers.py can work the answer again exactly.
 *
 * Solids are drawn in an oblique view on the plane with no axes: the front
 * face true to scale, depth going back up and to the right at half length,
 * and edges out of sight dashed. A round end is an ellipse with its back
 * half dashed. Sizes are chosen so the answer always terminates: a third or
 * four thirds of something always has a 3 in it to cancel.
 */
import * as T from '../terms.js';
import { LINE, GIVEN, ASKED, FRAME, r2, fit, text, sideLabel, circlePath, ellipsePath,
  f, dec, len, dashed, rightMark, slant, answerText, under,
  decTo, roundTo, shown, roundedSaid, piTimes, unitWord, clearLabel } from './figures.js';
/** Metric and US lengths alike: a yard as often as a meter. */
const UNITS = ['cm', 'm', 'in', 'ft', 'yd'];
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/volume.js';

const cu = (u) => `${u}³`;
const sq = (u) => `${u}²`;
const seg = (from, to, tone = LINE) => ({ kind: 'segment', from, to, tone });
const figure = (marks, answer) => fit({ ...FRAME, marks, answer }, 1);
const pts = (marks) => marks.flatMap((m) => [m.from, m.to, m.at, ...(m.points ?? [])].filter(Boolean));
/** The answer, written under the figure. */
const below = (marks, label) => answerText(under(pts(marks)), label);

// requiem: play/visuals/solids-in-oblique-view
/** How far back, and how far up, one unit of depth is drawn. */
const DX = 0.42, DY = 0.3;
/** A projection that fits a solid `x` wide, `y` high and `z` deep into about 8 units. */
function projector(x, y, z) {
  const k = 8 / Math.max(x + DX * z, y + DY * z);
  return ([a, b, c]) => [r2((a + DX * c) * k), r2((b + DY * c) * k)];
}
/** The π form, or 3.14: which the question says, and how the box is laid out. */
function asking(rng, sentence, unit, letter, exact) {
  return exact
    ? [T.prose(`${sentence}, in ${unit}? Keep π in the answer.`), T.letter(letter), T.op('='), T.blank(), T.letter('π')]
    : [T.prose(`${sentence}, in ${unit}? Use 3.14 for π and round to ${PLACES} decimal place.`)];
}
// requiem: catalogue/content/pi-as-3-14-rounds-to-a-place
/** With π as 3.14 the answer is rounded half up to one place, and the text says so. */
const PLACES = 1;
const form = (exact) => (exact ? ' (pi)' : ` (3.14) to ${PLACES} dp`);
/** The answer: the number of π, or 3.14 times it, rounded. */
const piAnswer = (coef, exact) => (exact ? dec(coef) : decTo(3.14 * coef, PLACES));
/** A number of π as it is written, and then, with 3.14, the decimal it comes to. */
const piEnd = (coef, exact) => (exact ? piTimes(coef)
  : `${piTimes(coef)} ≈ 3.14 × ${f(coef)} = ${roundedSaid(3.14 * coef, piAnswer(coef, false))}`);
const piShown = (coef, exact) => (exact ? piTimes(coef) : shown(piAnswer(coef, false)));

// ── The solids, drawn ───────────────────────────────────────────────────

/** A box, L across, H up and W back; `labels` is [L, W, H], each [text, tone] or null. */
function boxMarks(L, W, H, labels) {
  const p = projector(L, H, W);
  const v = (x, y, z) => p([x * L, y * H, z * W]);
  const front = [v(0, 0, 0), v(1, 0, 0), v(1, 1, 0), v(0, 1, 0)];
  const mid = [(front[0][0] + front[1][0]) / 2, (front[0][1] + front[2][1]) / 2];
  const marks = [
    seg(v(0, 0, 0), v(1, 0, 0)), seg(v(1, 0, 0), v(1, 1, 0)), seg(v(1, 1, 0), v(0, 1, 0)), seg(v(0, 1, 0), v(0, 0, 0)),
    seg(v(0, 1, 0), v(0, 1, 1)), seg(v(1, 1, 0), v(1, 1, 1)), seg(v(0, 1, 1), v(1, 1, 1)),
    seg(v(1, 0, 0), v(1, 0, 1)), seg(v(1, 0, 1), v(1, 1, 1)),
    dashed(v(0, 0, 0), v(0, 0, 1)), dashed(v(0, 0, 1), v(1, 0, 1)), dashed(v(0, 0, 1), v(0, 1, 1)),
  ];
  const at = {
    L: (lab, tone, gap) => sideLabel(v(0, 0, 0), v(1, 0, 0), lab, mid, tone, gap),
    W: (lab, tone, gap) => sideLabel(v(1, 0, 0), v(1, 0, 1), lab, v(0, 1, 0), tone, gap),
    H: (lab, tone, gap) => sideLabel(v(0, 0, 0), v(0, 1, 0), lab, mid, tone, gap),
  };
  ['L', 'W', 'H'].forEach((key, i) => { if (labels[i]) marks.push(at[key](...labels[i])); });
  return { marks, at };
}

/** A prism on a right triangle: legs a across and b up at the front, running `len` back. */
function triPrismMarks(a, b, c, depth, u) {
  const p = projector(a, b, depth);
  const v = (x, y, z) => p([x, y, z]);
  const F = [v(0, 0, 0), v(a, 0, 0), v(0, b, 0)];
  const mid = [(F[0][0] + F[1][0] + F[2][0]) / 3, (F[0][1] + F[1][1] + F[2][1]) / 3];
  return [
    seg(F[0], F[1]), seg(F[1], F[2]), seg(F[2], F[0]), rightMark(F[0], F[1], F[2], 0.32),
    seg(F[1], v(a, 0, depth)), seg(F[2], v(0, b, depth)), seg(v(a, 0, depth), v(0, b, depth)),
    dashed(F[0], v(0, 0, depth)), dashed(v(0, 0, depth), v(a, 0, depth)), dashed(v(0, 0, depth), v(0, b, depth)),
    sideLabel(F[0], F[1], `${f(a)} ${u}`, mid), sideLabel(F[0], F[2], `${f(b)} ${u}`, mid),
    // The longest side is labelled on the far end, where nothing crosses it:
    // across the near one run the hidden edges.
    sideLabel(v(a, 0, depth), v(0, b, depth), `${f(c)} ${u}`, F[0]),
    sideLabel(F[1], v(a, 0, depth), `${f(depth)} ${u}`, F[2]),
  ];
}

/** Scale for a round solid r across and h high. */
const roundScale = (r, h) => 8 / Math.max(2 * r, h + 0.6 * r);

/** A cylinder: its radius, or its diameter, across the top, and its height down the right. */
function cylinderMarks(r, h, rLabel, hLabel, useD) {
  const k = roundScale(r, h), rx = r2(r * k), ry = r2(0.3 * r * k), H = r2(h * k);
  const marks = [
    ellipsePath([0, H], rx, ry), ellipsePath([0, 0], rx, ry, 180, 360), ellipsePath([0, 0], rx, ry, 0, 180, { dashed: true }),
    seg([-rx, 0], [-rx, H]), seg([rx, 0], [rx, H]), { kind: 'point', at: [0, H], tone: LINE },
  ];
  if (rLabel) {
    const from = useD ? [-rx, H] : [0, H];
    // Clear of the ellipse it lies across: outside it, unless there is room inside.
    const gap = useD || ry < 0.8 ? ry + 0.3 : 0.3;
    marks.push(seg(from, [rx, H], GIVEN), sideLabel(from, [rx, H], rLabel[0], [rx / 2, H - 1], rLabel[1] ?? GIVEN, gap));
  }
  const hAt = (lab, tone, gap) => sideLabel([rx, 0], [rx, H], lab, [0, H / 2], tone, gap);
  if (hLabel) marks.push(hAt(...hLabel));
  return { marks, hAt };
}

/** A cone: radius along the base, height dashed up the middle, slant down the right. */
function coneMarks(r, h, s, u, useD, { showH = true, showS = true } = {}) {
  const k = roundScale(r, h), rx = r2(r * k), ry = r2(0.3 * r * k), H = r2(h * k);
  const apex = [0, H];
  const marks = [
    ellipsePath([0, 0], rx, ry, 180, 360), ellipsePath([0, 0], rx, ry, 0, 180, { dashed: true }),
    seg([-rx, 0], apex), seg([rx, 0], apex), { kind: 'point', at: [0, 0], tone: LINE },
  ];
  const from = useD ? [-rx, 0] : [0, 0];
  marks.push(seg(from, [rx, 0], GIVEN), sideLabel(from, [rx, 0], `${f(useD ? 2 * r : r)} ${u}`, [rx / 2, 1], GIVEN, useD || ry < 0.8 ? ry + 0.3 : 0.45));
  if (showS) marks.push(sideLabel([rx, 0], apex, `${f(s)} ${u}`, [0, 0]));
  if (showH) {
    // requiem: catalogue/content/height-drawn-clear-of-slants
    // The height in the color of a length, not of an edge, and its label
    // where no slant or rim runs through it.
    const height = { ...dashed(apex, [0, 0]), tone: GIVEN }, square = rightMark([0, 0], apex, [rx, 0], 0.3);
    marks.push(height, square, clearLabel(apex, [0, 0], `${f(h)} ${u}`, [...marks, height, square]));
  }
  return marks;
}

/** A pyramid on an L by W base, its height dashed from the top to the middle of the base. */
function pyramidMarks(L, W, H, u, slantH = 0) {
  const p = projector(L, H, W);
  const v = (x, y, z) => p([x, y, z]);
  const b = [v(0, 0, 0), v(L, 0, 0), v(L, 0, W), v(0, 0, W)], apex = v(L / 2, H, W / 2), foot = v(L / 2, 0, W / 2);
  const marks = [
    seg(b[0], b[1]), seg(b[1], b[2]), dashed(b[2], b[3]), dashed(b[3], b[0]),
    seg(apex, b[0]), seg(apex, b[1]), seg(apex, b[2]), dashed(apex, b[3]),
    sideLabel(b[0], b[1], `${f(L)} ${u}`, foot), sideLabel(b[1], b[2], `${f(W)} ${u}`, foot),
  ];
  // requiem: catalogue/content/height-drawn-clear-of-slants
  // The height is a length, colored as one and marked square to the base,
  // so it is not taken for the hidden edge beside it; its label goes where
  // no edge runs. A slant height runs up the middle of the right-hand face,
  // well away from it.
  const height = { ...dashed(apex, foot), tone: GIVEN }, square = rightMark(foot, apex, v(L, 0, W / 2), 0.3);
  marks.push(height, square);
  if (slantH) {
    const m = v(L, 0, W / 2), up = { ...dashed(apex, m), tone: GIVEN };
    marks.push(up, clearLabel(apex, m, `${f(slantH)} ${u}`, marks));
  }
  marks.push(clearLabel(apex, foot, `${f(H)} ${u}`, marks));
  return marks;
}

const R = 3.6;
/** A sphere, or the dome of a hemisphere: its outline, its equator, and a radius or diameter on it. */
function ballMarks(label, useD, hemi = false) {
  const marks = hemi
    ? [circlePath([0, 0], R, LINE, 0, 180), ellipsePath([0, 0], R, 0.3 * R, 180, 360), ellipsePath([0, 0], R, 0.3 * R, 0, 180, { dashed: true })]
    : [circlePath([0, 0], R), ellipsePath([0, 0], R, 0.3 * R, 180, 360), ellipsePath([0, 0], R, 0.3 * R, 0, 180, { dashed: true })];
  marks.push({ kind: 'point', at: [0, 0], tone: LINE });
  const from = useD ? [-R, 0] : [0, 0];
  const line = seg(from, [R, 0], GIVEN);
  // Clear of the dashed back rim and the center, which a label just over
  // the line would sit on.
  marks.push(line, clearLabel(from, [R, 0], label[0], [...marks, line], label[1] ?? GIVEN));
  return marks;
}

// ── Prisms ──────────────────────────────────────────────────────────────

function box(rng, u) {
  const cube = rng.chance(0.2);
  const L = len(rng, 2, 20, 0.2), W = cube ? L : len(rng, 2, 16, 0.2), H = cube ? L : len(rng, 2, 18, 0.2);
  if (Math.max(L, H) / Math.min(L, H) > 4) return box(rng, u);
  const V = L * W * H;
  const { marks } = boxMarks(L, W, H, cube ? [[`${f(L)} ${u}`]] : [[`${f(L)} ${u}`], [`${f(W)} ${u}`], [`${f(H)} ${u}`]]);
  return {
    prompt: [T.prose(cube ? `A cube has edges of ${f(L)} ${u}. What is its volume, in ${unitWord(u, 3)}?` : `What is the volume of this box, in ${unitWord(u, 3)}?`)],
    text: cube ? `cube volume: side ${f(L)}` : `box volume: ${f(L)} x ${f(W)} x ${f(H)}`,
    answer: dec(V),
    visual: figure(marks, [below(marks, `${f(V)} ${cu(u)}`)]),
    explain: `The base is ${f(L)} × ${f(W)} = ${f(L * W)} squares, and it is ${f(H)} layers of them high: `
      + `${f(L * W)} × ${f(H)} = ${f(V)}. (${f(L * W)} alone is one layer, the area of the base, in ${sq(u)}.) So ${f(V)} ${cu(u)}.`,
  };
}

function boxBack(rng, u) {
  const L = rng.int(2, 15), W = rng.int(2, 12), H = len(rng, 2, 15, 0.3);
  if (Math.max(L, H) / Math.min(L, H) > 4) return boxBack(rng, u);
  const V = L * W * H;
  const { marks, at } = boxMarks(L, W, H, [[`${L} ${u}`], [`${W} ${u}`], ['?', ASKED]]);
  return {
    prompt: [T.prose(`A box holds ${f(V)} ${cu(u)}. Its base is ${L} ${u} by ${W} ${u}. How tall is it, in ${unitWord(u)}?`)],
    text: `box height from volume: ${f(V)}, base ${L} x ${W}`,
    answer: dec(H),
    visual: figure(marks, [at.H(`${f(H)} ${u}`, null, 1.3)]),
    explain: `Volume = base × height, and the base is ${L} × ${W} = ${L * W}. So ${L * W} × height = ${f(V)}, and the height is ${f(V)} ÷ ${L * W} = ${f(H)}. `
      + `(Dividing by ${L} or ${W} alone leaves the other one still multiplied in.) Check: ${L} × ${W} × ${f(H)} = ${f(V)}. So ${f(H)} ${u}.`,
  };
}

function triPrism(rng, u) {
  const [a, b, c] = slant(rng, 14);
  const depth = len(rng, 3, 24, 0.2);
  // Not a stick: the end has to be big enough to read beside the length.
  if (Math.min(a, b) < 3 || depth > 2.5 * Math.max(a, b)) return triPrism(rng, u);
  const end = (a * b) / 2, V = end * depth;
  const marks = triPrismMarks(a, b, c, depth, u);
  return {
    prompt: [T.prose(`The ends of this prism are right triangles. What is its volume, in ${unitWord(u, 3)}?`)],
    text: `triangular prism volume: legs ${f(a)}, ${f(b)}, hypotenuse ${f(c)}, length ${f(depth)}`,
    answer: dec(V),
    visual: figure(marks, [below(marks, `${f(V)} ${cu(u)}`)]),
    explain: `A prism is the area of its end times its length. The end is a triangle with the two shorter sides at the right angle, `
      + `so ½ × ${f(a)} × ${f(b)} = ${f(end)}; times the length, ${f(end)} × ${f(depth)} = ${f(V)}. `
      + `(${f(a)} × ${f(b)} × ${f(depth)} = ${f(a * b * depth)} is the box around it, twice as much; the longest side, ${f(c)}, is not used.) So ${f(V)} ${cu(u)}.`,
  };
}

function prisms(rng) {
  const u = rng.pick(UNITS);
  return rng.pick([box, box, triPrism, triPrism, boxBack])(rng, u);
}

// ── Cylinders ───────────────────────────────────────────────────────────

function cylinder(rng) {
  const u = rng.pick(UNITS);
  if (rng.chance(0.25)) return cylinderBack(rng, u);
  const exact = rng.chance(0.55), useD = rng.chance(0.4);
  const r = len(rng, 1, 15, exact ? 0.25 : 0.15), h = len(rng, 1, 25, 0.2);
  if (h / r > 6) return cylinder(rng);
  const g = useD ? 2 * r : r, coef = r * r * h;
  const { marks } = cylinderMarks(r, h, [`${f(g)} ${u}`], [`${f(h)} ${u}`], useD);
  return {
    prompt: asking(rng, `A cylinder has a ${useD ? 'diameter' : 'radius'} of ${f(g)} ${u} and a height of ${f(h)} ${u}. What is its volume`, unitWord(u, 3), 'V', exact),
    text: `cylinder volume: ${useD ? 'diameter' : 'radius'} ${f(g)}, height ${f(h)}${form(exact)}`,
    answer: piAnswer(coef, exact),
    visual: figure(marks, [below(marks, `${piShown(coef, exact)} ${cu(u)}`)]),
    explain: `${useD ? `The radius is half the diameter, ${f(g)} ÷ 2 = ${f(r)}. ` : ''}The base is a circle, πr² = π × ${f(r)} × ${f(r)} = ${piTimes(r * r)}, `
      + `and the cylinder is ${f(h)} of those layers high: V = πr²h = ${piTimes(r * r)} × ${f(h)} = ${piEnd(coef, exact)}. `
      + `(${useD ? `Using the diameter as r makes it four times too big.` : `2πr × h is the curved side, an area, not the volume.`}) So ${piShown(coef, exact)} ${cu(u)}.`,
  };
}

function cylinderBack(rng, u) {
  const r = rng.int(1, 12), h = len(rng, 1, 25, 0.3);
  if (h / r > 6) return cylinderBack(rng, u);
  const coef = r * r * h;
  const { marks, hAt } = cylinderMarks(r, h, [`${r} ${u}`], ['?', ASKED], false);
  return {
    prompt: [T.prose(`A cylinder has a volume of ${piTimes(coef)} ${cu(u)} and a radius of ${r} ${u}. How tall is it, in ${unitWord(u)}?`)],
    text: `cylinder height from volume: ${f(coef)}, radius ${r} (pi)`,
    answer: dec(h),
    visual: figure(marks, [hAt(`${f(h)} ${u}`, null, 1.3)]),
    explain: `V = πr²h. The base is π × ${r} × ${r} = ${piTimes(r * r)}, so ${piTimes(r * r)} × h = ${piTimes(coef)}, and h = ${f(coef)} ÷ ${r * r} = ${f(h)}. `
      + `(Dividing by ${r} instead of ${r}² = ${r * r} leaves a radius still multiplied in.) So ${f(h)} ${u}.`,
  };
}

// ── Cones and pyramids ──────────────────────────────────────────────────

function pyramid(rng, u) {
  const withSlant = rng.chance(0.45);
  let L, W, H, s = 0;
  if (withSlant) {
    // A square base whose half and the height make a triple, so the slant
    // up the middle of a face is whole.
    let half;
    [half, H, s] = slant(rng, 16);
    L = W = 2 * half;
  } else {
    L = rng.int(2, 18); W = rng.int(2, 15); H = len(rng, 2, 18, 0.2);
  }
  if ((Math.round(8 * L * W * H)) % 3 !== 0 || Math.max(L, H) / Math.min(L, H) > 3.5) return pyramid(rng, u);
  // Deep from front to back, the hidden back edge would be drawn almost on
  // top of the height.
  if (W > 1.6 * L) return pyramid(rng, u);
  // Nor so tall and thin that the height's length has no room inside it.
  if (H > 1.4 * L) return pyramid(rng, u);
  const V = (L * W * H) / 3;
  const marks = pyramidMarks(L, W, H, u, s);
  return {
    prompt: [T.prose(`What is the volume of this pyramid, in ${unitWord(u, 3)}?`)],
    text: `pyramid volume: base ${f(L)} x ${f(W)}, height ${f(H)}${s ? `, slant ${f(s)}` : ''}`,
    answer: dec(V),
    visual: figure(marks, [below(marks, `${f(V)} ${cu(u)}`)]),
    explain: `A pyramid holds a third of the box it fits in. The base is ${f(L)} × ${f(W)} = ${f(L * W)}, so V = ⅓ × ${f(L * W)} × ${f(H)} = ${f(L * W * H)} ÷ 3 = ${f(V)}. `
      + `(${f(L * W * H)} without the ⅓ is the whole box.${s ? ` The height is the dashed line straight up the middle; the ${f(s)} up the face slopes, and is longer.` : ''}) So ${f(V)} ${cu(u)}.`,
  };
}

function cone(rng, u) {
  // Half the time the slant is drawn too, from a triple, as the length to
  // pass over; otherwise any radius and height whose third comes out.
  const withSlant = rng.chance(0.5);
  const [r, h, s] = withSlant ? slant(rng, 20) : [len(rng, 1, 15, 0.2), len(rng, 2, 24, 0.2), 0];
  const exact = rng.chance(0.55) || r % 1 !== 0 || h % 1 !== 0;
  const useD = rng.chance(0.35);
  if (r > 20 || h / r > 3 || r / h > 1.6 || Math.round(8 * r * r * h) % 3 !== 0) return cone(rng, u);
  const coef = (r * r * h) / 3, g = useD ? 2 * r : r;
  const marks = coneMarks(r, h, s, u, useD, { showS: withSlant });
  return {
    prompt: asking(rng, `What is the volume of this cone`, unitWord(u, 3), 'V', exact),
    text: `cone volume: ${useD ? 'diameter' : 'radius'} ${f(g)}, height ${f(h)}${withSlant ? `, slant ${f(s)}` : ''}${form(exact)}`,
    answer: piAnswer(coef, exact),
    visual: figure(marks, [below(marks, `${piShown(coef, exact)} ${cu(u)}`)]),
    explain: `${useD ? `The radius is half the diameter: ${f(r)}. ` : ''}A cone holds a third of the cylinder it fits in: V = ⅓πr²h = ⅓ × π × ${f(r)}² × ${f(h)} `
      + `= ${piTimes(r * r * h)} ÷ 3 = ${piEnd(coef, exact)}. `
      + (withSlant ? `The height is the dashed line, ${f(h)}, straight up the middle, not the slant ${f(s)} down the side. ` : '')
      + '(Without the ⅓ it is the whole cylinder.) '
      + `So ${piShown(coef, exact)} ${cu(u)}.`,
  };
}

function conesAndPyramids(rng) {
  const u = rng.pick(UNITS);
  return rng.chance(0.45) ? pyramid(rng, u) : cone(rng, u);
}

// ── Spheres ─────────────────────────────────────────────────────────────

/**
 * Radii that make four thirds of r³ come out, for an answer kept in π:
 * every one a multiple of 1.5. With 3.14 the answer is rounded, so any
 * whole or half radius will do.
 */
const BALL = Array.from({ length: 20 }, (_, i) => 1.5 * (i + 1));

/** n/d written out: exactly when it ends within six places, else to three and a "…". */
function written(n, d) {
  const N = BigInt(n), D = BigInt(d);
  for (let k = 0; k <= 6; k++) {
    if ((N * 10n ** BigInt(k)) % D === 0n) return f(Number((N * 10n ** BigInt(k)) / D) / 10 ** k);
  }
  const t = (N * 1000n) / D;
  return `${t / 1000n}.${String(t % 1000n).padStart(3, '0')}…`;
}

function sphere(rng) {
  const u = rng.pick(UNITS);
  const hemi = rng.chance(0.35);
  const name = hemi ? 'hemisphere' : 'sphere';
  if (rng.chance(0.2)) {
    // Backwards from the volume only up to 21: a cube root of a five-figure
    // number is not what this is practising.
    const r = rng.pick(BALL.slice(0, 14)), coef = ((hemi ? 2 : 4) * r ** 3) / 3;
    return {
      prompt: [T.prose(`A ${name} has a volume of ${piTimes(coef)} ${cu(u)}. What is its radius, in ${unitWord(u)}?`)],
      text: `${name} radius from volume: ${f(coef)} (pi)`,
      answer: dec(r),
      visual: figure(ballMarks(['?', ASKED], false, hemi), [sideLabel([0, 0], [R, 0], `${f(r)} ${u}`, [R / 2, -1], null, 1.1)]),
      explain: `V = ${hemi ? '⅔' : '4/3'}πr³, so ${hemi ? '⅔' : '4/3'} × r³ = ${f(coef)}. Undo the ${hemi ? '⅔' : '4/3'}: r³ = ${f(coef)} × ${hemi ? '3 ÷ 2' : '3 ÷ 4'} = ${f(r ** 3)}. `
        + `The radius is its cube root, the number that times itself three times makes ${f(r ** 3)}: ${f(r)} × ${f(r)} × ${f(r)} = ${f(r ** 3)}. `
        + `(A square root would undo r², not r³.) So ${f(r)} ${u}.`,
    };
  }
  const exact = rng.chance(0.55), useD = rng.chance(0.4);
  const r = exact ? rng.pick(BALL) : len(rng, 1, 20, 0.3), g = useD ? 2 * r : r;
  const coef = ((hemi ? 2 : 4) * r ** 3) / 3;
  const marks = ballMarks([`${f(g)} ${u}`], useD, hemi);
  if (!exact) {
    // 3.14 × k × r³ ÷ 3, with r = m/2: exactly 314·k·m³ / 2400, rounded once.
    const k = hemi ? 2 : 4, m = 2 * r, answer = roundTo(314 * k * m ** 3, 2400, PLACES);
    return {
      prompt: asking(rng, `A ${name} has a ${useD ? 'diameter' : 'radius'} of ${f(g)} ${u}. What is its volume`, unitWord(u, 3), 'V', false),
      text: `${name} volume: ${useD ? 'diameter' : 'radius'} ${f(g)}${form(false)}`,
      answer,
      visual: figure(marks, [below(marks, `${shown(answer)} ${cu(u)}`)]),
      explain: `${useD ? `The radius is half the diameter: ${f(r)}. ` : ''}A sphere is V = 4/3 πr³${hemi ? ', and a hemisphere half of it, ⅔πr³' : ''}. `
        + `r³ = ${f(r)} × ${f(r)} × ${f(r)} = ${f(r ** 3)}, so V ≈ ${k} × 3.14 × ${f(r ** 3)} ÷ 3 = ${roundedSaid(0, answer, written(314 * k * m ** 3, 2400))}. `
        + `(Round once, at the end: rounding along the way can move the last place. r³ is r three times over, not 3 × r.${useD ? ' Cubing the diameter makes it eight times too big.' : ''}) So ${shown(answer)} ${cu(u)}.`,
    };
  }
  return {
    prompt: asking(rng, `A ${name} has a ${useD ? 'diameter' : 'radius'} of ${f(g)} ${u}. What is its volume`, unitWord(u, 3), 'V', exact),
    text: `${name} volume: ${useD ? 'diameter' : 'radius'} ${f(g)}${form(exact)}`,
    answer: piAnswer(coef, exact),
    visual: figure(marks, [below(marks, `${piShown(coef, exact)} ${cu(u)}`)]),
    explain: `${useD ? `The radius is half the diameter: ${f(r)}. ` : ''}A sphere is V = 4/3 πr³${hemi ? ', and a hemisphere half of it, ⅔πr³' : ''}. `
      + `r³ = ${f(r)} × ${f(r)} × ${f(r)} = ${f(r ** 3)}, so V = ${hemi ? '2' : '4'} × ${f(r ** 3)} ÷ 3 × π = ${piEnd(coef, exact)}. `
      + `(r³ is r three times over, not 3 × r.${useD ? ' Cubing the diameter makes it eight times too big.' : ''}) So ${piShown(coef, exact)} ${cu(u)}.`,
  };
}

// ── Surface area: prisms ────────────────────────────────────────────────

function boxSurface(rng, u) {
  const cube = rng.chance(0.3);
  const L = len(rng, 2, 18, 0.15), W = cube ? L : len(rng, 2, 14, 0.15), H = cube ? L : len(rng, 2, 16, 0.15);
  if (Math.max(L, H) / Math.min(L, H) > 4) return boxSurface(rng, u);
  const S = 2 * (L * W + L * H + W * H);
  const { marks } = boxMarks(L, W, H, cube ? [[`${f(L)} ${u}`]] : [[`${f(L)} ${u}`], [`${f(W)} ${u}`], [`${f(H)} ${u}`]]);
  return {
    prompt: [T.prose(cube ? `A cube has edges of ${f(L)} ${u}. What is its surface area, in ${unitWord(u, 2)}?` : `What is the surface area of this box, in ${unitWord(u, 2)}?`)],
    text: cube ? `cube surface: side ${f(L)}` : `box surface: ${f(L)} x ${f(W)} x ${f(H)}`,
    answer: dec(S),
    visual: figure(marks, [below(marks, `${f(S)} ${sq(u)}`)]),
    explain: cube
      ? `A cube has six faces, each a ${f(L)} by ${f(L)} square: 6 × ${f(L * L)} = ${f(S)}. (${f(L ** 3)} is the volume, in ${cu(u)}.) So ${f(S)} ${sq(u)}.`
      : `A box has three pairs of matching faces: front and back ${f(L)} × ${f(H)} = ${f(L * H)}, top and bottom ${f(L)} × ${f(W)} = ${f(L * W)}, `
        + `the two ends ${f(W)} × ${f(H)} = ${f(W * H)}. Each twice: 2 × (${f(L * H)} + ${f(L * W)} + ${f(W * H)}) = 2 × ${f(S / 2)} = ${f(S)}. `
        + `(${f(S / 2)} counts only the three faces you can see.) So ${f(S)} ${sq(u)}.`,
  };
}

function triPrismSurface(rng, u) {
  const [a, b, c] = slant(rng, 14);
  const depth = len(rng, 3, 24, 0.2);
  if (Math.min(a, b) < 3 || depth > 2.5 * Math.max(a, b)) return triPrismSurface(rng, u);
  const ends = a * b, sides = (a + b + c) * depth, S = ends + sides;
  const marks = triPrismMarks(a, b, c, depth, u);
  return {
    prompt: [T.prose(`The ends of this prism are right triangles. What is its surface area, in ${unitWord(u, 2)}?`)],
    text: `triangular prism surface: legs ${f(a)}, ${f(b)}, hypotenuse ${f(c)}, length ${f(depth)}`,
    answer: dec(S),
    visual: figure(marks, [below(marks, `${f(S)} ${sq(u)}`)]),
    explain: `Two triangle ends, each ½ × ${f(a)} × ${f(b)} = ${f(ends / 2)}, make ${f(ends)}. `
      + `The three rectangles all run the length, ${f(depth)}, and are as wide as the three sides of the triangle: (${f(a)} + ${f(b)} + ${f(c)}) × ${f(depth)} = ${f(a + b + c)} × ${f(depth)} = ${f(sides)}. `
      + `Together ${f(ends)} + ${f(sides)} = ${f(S)}. (The slanted face is ${f(c)} wide, the longest side, and is easy to leave out.) So ${f(S)} ${sq(u)}.`,
  };
}

function prismSurface(rng) {
  const u = rng.pick(UNITS);
  return rng.chance(0.6) ? boxSurface(rng, u) : triPrismSurface(rng, u);
}

// ── Surface area: cylinders ─────────────────────────────────────────────

const ENDS = {
  closed: { n: 2, say: 'a closed cylinder', sentence: 'two circles' },
  open: { n: 1, say: 'a cylinder open at the top, like a can with no lid', sentence: 'one circle, the bottom' },
  'no ends': { n: 0, say: 'a tube open at both ends', sentence: 'no circles at all' },
};

function cylinderSurface(rng) {
  const u = rng.pick(UNITS);
  const ends = rng.pick(['closed', 'closed', 'closed', 'open', 'open', 'no ends']);
  const exact = rng.chance(0.55), useD = rng.chance(0.4);
  const r = len(rng, 1, 15, 0.2), h = len(rng, 1, 25, 0.2);
  if (h / r > 6) return cylinderSurface(rng);
  const g = useD ? 2 * r : r, e = ENDS[ends];
  const circles = e.n * r * r, side = 2 * r * h, coef = circles + side;
  const { marks } = cylinderMarks(r, h, [`${f(g)} ${u}`], [`${f(h)} ${u}`], useD);
  return {
    prompt: asking(rng, `This is ${e.say}, with a ${useD ? 'diameter' : 'radius'} of ${f(g)} ${u} and a height of ${f(h)} ${u}. What is its surface area`, unitWord(u, 2), 'S', exact),
    text: `cylinder surface: ${useD ? 'diameter' : 'radius'} ${f(g)}, height ${f(h)}, ${ends}${form(exact)}`,
    answer: piAnswer(coef, exact),
    visual: figure(marks, [below(marks, `${piShown(coef, exact)} ${sq(u)}`)]),
    explain: `${useD ? `The radius is half the diameter: ${f(r)}. ` : ''}Unrolled, the curved side is a rectangle ${f(h)} tall and as long as the circumference, 2π × ${f(r)} = ${piTimes(2 * r)}: `
      + `${piTimes(2 * r)} × ${f(h)} = ${piTimes(side)}. `
      + (e.n ? `${e.n === 2 ? `The ends are ${e.sentence}, πr² = ${piTimes(r * r)} each, so ${piTimes(circles)}` : `The end is ${e.sentence}, πr² = ${piTimes(r * r)}`}. `
        + `Together ${piTimes(side)} + ${piTimes(circles)} = ${piEnd(coef, exact)}. `
        : `There are ${e.sentence}, so that is all of it: ${piEnd(coef, exact)}. `)
      + (ends === 'closed' ? '(Counting one circle covers only the bottom.) ' : ends === 'open' ? '(No lid means one circle, not two.) ' : '(Adding circles would cover the open ends.) ')
      + `So ${piShown(coef, exact)} ${sq(u)}.`,
  };
}

// ── Surface area: cones and spheres ─────────────────────────────────────

function coneSurface(rng, u) {
  const [r, h, s] = slant(rng, 20);
  if (r > 20 || h / r > 3 || r / h > 1.6) return coneSurface(rng, u);
  const curvedOnly = rng.chance(0.3);
  const exact = rng.chance(0.6), useD = rng.chance(0.3);
  const curved = r * s, coef = curved + (curvedOnly ? 0 : r * r), g = useD ? 2 * r : r;
  const marks = coneMarks(r, h, s, u, useD);
  return {
    prompt: asking(rng, curvedOnly
      ? 'What is the area of the curved surface of this cone, leaving out its base'
      : 'What is the surface area of this cone, base included', unitWord(u, 2), 'S', exact),
    text: `cone surface: ${useD ? 'diameter' : 'radius'} ${f(g)}, slant ${f(s)}, height ${f(h)}, ${curvedOnly ? 'curved' : 'closed'}${form(exact)}`,
    answer: piAnswer(coef, exact),
    visual: figure(marks, [below(marks, `${piShown(coef, exact)} ${sq(u)}`)]),
    explain: `${useD ? `The radius is half the diameter: ${f(r)}. ` : ''}The curved part is πrl, with l the slant down the side: π × ${f(r)} × ${f(s)} = ${piTimes(curved)}. `
      + (curvedOnly ? '' : `The base is a circle, πr² = ${piTimes(r * r)}, so together ${piTimes(curved)} + ${piTimes(r * r)} = ${piTimes(coef)}. `)
      + `${exact ? '' : `With 3.14: 3.14 × ${f(coef)} = ${roundedSaid(3.14 * coef, piAnswer(coef, false))}. `}`
      + `(Not π × ${f(r)} × ${f(h)}: the height runs up the inside, and the surface lies along the slant.) So ${piShown(coef, exact)} ${sq(u)}.`,
  };
}

function ballSurface(rng, u) {
  const hemi = rng.chance(0.3);
  const name = hemi ? 'solid hemisphere' : 'sphere';
  if (!hemi && rng.chance(0.25)) {
    const r = len(rng, 1, 20, 0.2), coef = 4 * r * r;
    return {
      prompt: [T.prose(`A sphere has a surface area of ${piTimes(coef)} ${sq(u)}. What is its radius, in ${unitWord(u)}?`)],
      text: `sphere radius from surface: ${f(coef)} (pi)`,
      answer: dec(r),
      visual: figure(ballMarks(['?', ASKED], false), [sideLabel([0, 0], [R, 0], `${f(r)} ${u}`, [R / 2, -1], null, 1.1)]),
      explain: `S = 4πr², so 4r² = ${f(coef)} and r² = ${f(coef)} ÷ 4 = ${f(r * r)}. The radius is its square root: ${f(r)}, since ${f(r)} × ${f(r)} = ${f(r * r)}. `
        + `(Halving ${f(r * r)} instead of taking its root undoes a doubling that was never there.) So ${f(r)} ${u}.`,
    };
  }
  const exact = rng.chance(0.55), useD = rng.chance(0.4);
  const r = len(rng, 1, 20, 0.2), g = useD ? 2 * r : r;
  const coef = (hemi ? 3 : 4) * r * r;
  const marks = ballMarks([`${f(g)} ${u}`], useD, hemi);
  return {
    prompt: asking(rng, `A ${name} has a ${useD ? 'diameter' : 'radius'} of ${f(g)} ${u}. What is its surface area`, unitWord(u, 2), 'S', exact),
    text: `${hemi ? 'hemisphere' : 'sphere'} surface: ${useD ? 'diameter' : 'radius'} ${f(g)}${form(exact)}`,
    answer: piAnswer(coef, exact),
    visual: figure(marks, [below(marks, `${piShown(coef, exact)} ${sq(u)}`)]),
    explain: `${useD ? `The radius is half the diameter: ${f(r)}. ` : ''}`
      + (hemi
        ? `The dome is half a sphere's 4πr², so 2πr² = ${piTimes(2 * r * r)}, and the flat face is a circle, πr² = ${piTimes(r * r)}: together 3πr² = ${piEnd(coef, exact)}. `
          + '(The flat face is part of a solid hemisphere, and is the part left out most.) '
        : `A sphere's surface is four of the circles through its middle: 4πr² = 4 × π × ${f(r)}² = 4 × ${piTimes(r * r)} = ${piEnd(coef, exact)}. `
          + `(4/3πr³ is the volume.) `)
      + `So ${piShown(coef, exact)} ${sq(u)}.`,
  };
}

function conesAndSpheres(rng) {
  const u = rng.pick(UNITS);
  return rng.chance(0.5) ? coneSurface(rng, u) : ballSurface(rng, u);
}

const CONTENT = [prisms, cylinder, conesAndPyramids, sphere, prismSurface, cylinderSurface, conesAndSpheres];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
