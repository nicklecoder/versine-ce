/**
 * Catalogue authoring tool: builds the problem library for area and circles.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 *
 * Every `text` names the shape and gives the lengths the answer comes from,
 * and says whether π is kept or taken as 3.14, so scripts/check-answers.py
 * can work the answer again exactly. A length the figure shows only to be
 * passed over -- a slanted side -- is in the text too, so two problems that
 * differ only in it are not taken for the same one.
 *
 * Shapes are drawn to scale, on the plane with no axes. Circles are drawn
 * the one size, which is the scale of nothing: a circle looks the same at
 * every size, and the labels say how big it is.
 */
import * as T from '../terms.js';
import { LINE, GIVEN, ASKED, FRAME, r2, toward, fit, text, outline, centroid, sideLabel, circlePath,
  UNITS, f, dec, len, dashed, rightMark, region, slant, answerText, under, over } from './figures.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/area.js';

const sq = (u) => `${u}²`;
/** The figure: marks, and what arrives with the answer, framed tightly. */
const figure = (marks, answer) => fit({ ...FRAME, marks, answer }, 1);

/**
 * Real lengths to drawing units. The longest dimension is drawn SPAN
 * units across, whatever it is; `mirror` turns the figure over left to
 * right, so not every slant leans the same way.
 */
const SPAN = 9;
function scaler(longest, width, mirror = false) {
  const k = SPAN / longest;
  return (p) => [r2((mirror ? width - p[0] : p[0]) * k), r2(p[1] * k)];
}


// ── Rectangles and parallelograms ───────────────────────────────────────

function rectangle(rng) {
  const u = rng.pick(UNITS);
  const isSquare = rng.chance(0.25);
  let W = len(rng, 2, 20), H = isSquare ? W : len(rng, 2, 20);
  if (!isSquare && W === H) H += 1;
  if (Math.max(W, H) / Math.min(W, H) > 4) return rectangle(rng);
  const A = W * H, k = scaler(Math.max(W, H), W);
  const P = [[0, 0], [W, 0], [W, H], [0, H]].map(k), mid = centroid(P);
  const marks = [...outline(P), sideLabel(P[0], P[1], `${f(W)} ${u}`, mid)];
  if (!isSquare) marks.push(sideLabel(P[3], P[0], `${f(H)} ${u}`, mid));
  return {
    prompt: [T.prose(isSquare
      ? `A square has sides of ${f(W)} ${u}. What is its area, in ${sq(u)}?`
      : `A rectangle is ${f(W)} ${u} long and ${f(H)} ${u} wide. What is its area, in ${sq(u)}?`)],
    text: isSquare ? `square area: side ${f(W)}` : `rectangle: ${f(W)} by ${f(H)}`,
    answer: dec(A),
    visual: figure(marks, [answerText(under(P), `${f(A)} ${sq(u)}`), region(P)]),
    explain: `Area counts the squares, 1 ${u} on a side, that cover the shape: ${f(H)} rows of ${f(W)}, `
      + `so ${isSquare ? 'side × side' : 'length × width'} = ${f(W)} × ${f(H)} = ${f(A)}. `
      + (2 * (W + H) === A ? '' : `(Not ${f(2 * (W + H))}: adding all four sides is the perimeter, a length in ${u} and not an area.) `)
      + `So ${f(A)} ${sq(u)}.`,
  };
}

function parallelogram(rng) {
  const u = rng.pick(UNITS);
  const [o, h, s] = slant(rng, 18);
  if (o > 24) return parallelogram(rng);
  const b = len(rng, Math.max(3, Math.ceil(o) + 1), 28, 0.35);
  const width = b + o;
  if (width / h > 4.5 || h / width > 2) return parallelogram(rng);
  const mirror = rng.chance(0.4), k = scaler(Math.max(width, h), width, mirror);
  const P = [[0, 0], [b, 0], [b + o, h], [o, h]].map(k), mid = centroid(P);
  const top = k([o, h]), foot = k([o, 0]);
  const A = b * h;
  // The height's length sits on the side of the dashed line away from the
  // slant it might be mistaken for.
  const away = k([o - 1, h / 2]);
  const marks = [...outline(P), dashed(top, foot), rightMark(foot, top, k([b, 0])),
    sideLabel(P[0], P[1], `${f(b)} ${u}`, mid), sideLabel(P[3], P[0], `${f(s)} ${u}`, mid),
    sideLabel(top, foot, `${f(h)} ${u}`, away)];
  return {
    prompt: [T.prose(`What is the area of this parallelogram, in ${sq(u)}?`)],
    text: `parallelogram: base ${f(b)}, height ${f(h)}, slant ${f(s)}`,
    answer: dec(A),
    visual: figure(marks, [answerText(under(P), `${f(A)} ${sq(u)}`), region(P)]),
    explain: `Cut the triangle off one end and slide it to the other: the parallelogram becomes a rectangle ${f(b)} by ${f(h)}, `
      + `so its area is base × height = ${f(b)} × ${f(h)} = ${f(A)}. `
      + `The height is the dashed line, straight across from base to top. The slanted side, ${f(s)}, leans and is longer than that: `
      + `${f(b)} × ${f(s)} = ${f(b * s)} is too big. So ${f(A)} ${sq(u)}.`,
  };
}

const rectangles = (rng) => (rng.chance(0.2) ? rectangle(rng) : parallelogram(rng));

// ── Triangles ───────────────────────────────────────────────────────────

function triangleArea(rng) {
  const u = rng.pick(UNITS);
  const kind = rng.pick(['right', 'acute', 'acute', 'obtuse', 'obtuse']);
  let b, h, e = 0, hyp = 0, apex;
  if (kind === 'right') {
    [b, h, hyp] = slant(rng, 20);
    apex = 0;
  } else {
    b = len(rng, 3, 20);
    h = len(rng, 2, 18);
    if (kind === 'acute') apex = r2(b * rng.pick([0.25, 0.35, 0.5, 0.6, 0.7]));
    else { e = len(rng, 1, Math.max(2, Math.floor(b * 0.8)), 0.15); apex = b + e; }
  }
  const width = Math.max(b, apex);
  if (width / h > 4.5 || h / width > 2.2) return triangleArea(rng);
  const mirror = rng.chance(0.5), k = scaler(Math.max(width, h), width, mirror);
  const P = [[0, 0], [b, 0], [apex, h]].map(k), mid = centroid(P);
  const top = P[2], foot = k([apex, 0]);
  const marks = [...outline(P), sideLabel(P[0], P[1], `${f(b)} ${u}`, mid)];
  if (kind === 'right') {
    marks.push(rightMark(P[0], P[1], P[2]), sideLabel(P[0], P[2], `${f(h)} ${u}`, mid), sideLabel(P[1], P[2], `${f(hyp)} ${u}`, mid));
  } else {
    if (kind === 'obtuse') marks.push(dashed(P[1], foot));
    marks.push(dashed(top, foot), rightMark(foot, top, P[0]),
      sideLabel(top, foot, `${f(h)} ${u}`, kind === 'obtuse' ? mid : k([apex - 1, h / 2])));
  }
  const A = (b * h) / 2;
  const how = {
    right: `The two sides at the right angle are a base and its height. The longest side, ${f(hyp)}, is not a height: it leans. `,
    acute: 'The height is the dashed line, from the top straight down to the base. ',
    obtuse: `The height is still from the top straight down to the line the base is on -- here it lands outside the triangle, past the end of the base. The base is still ${f(b)}, not ${f(b + e)}. `,
  }[kind];
  return {
    prompt: [T.prose(`What is the area of this triangle, in ${sq(u)}?`)],
    text: `triangle area: base ${f(b)}, height ${f(h)} (${kind}${kind === 'right' ? `, hypotenuse ${f(hyp)}` : kind === 'obtuse' ? `, ${f(e)} past the base` : `, top at ${f(apex)}`})`,
    answer: dec(A),
    visual: figure(marks, [answerText(under(P), `${f(A)} ${sq(u)}`), region(P)]),
    explain: `${how}A triangle is half the parallelogram on the same base and height, so its area is ½ × base × height: `
      + `½ × ${f(b)} × ${f(h)} = ${f(b * h)} ÷ 2 = ${f(A)}. (${f(b * h)} without halving is the whole parallelogram.) So ${f(A)} ${sq(u)}.`,
  };
}

// ── Trapezoids ──────────────────────────────────────────────────────────

function trapezoid(rng) {
  const u = rng.pick(UNITS);
  const right = rng.chance(0.35);
  let a, c, h, p, s = 0;
  if (right) {
    let over;
    [over, h, s] = slant(rng, 16);
    c = len(rng, 2, 16, 0.2);
    a = c + over;
    p = 0;
  } else {
    a = len(rng, 5, 24, 0.2);
    c = len(rng, 2, a - 1, 0.2);
    if (c >= a) return trapezoid(rng);
    h = len(rng, 2, 16);
    p = r2((a - c) * rng.pick([0.2, 0.35, 0.5, 0.65]));
  }
  if (a / h > 4.5 || h / a > 2) return trapezoid(rng);
  const mirror = rng.chance(0.5), k = scaler(Math.max(a, h), a, mirror);
  const P = [[0, 0], [a, 0], [p + c, h], [p, h]].map(k), mid = centroid(P);
  const marks = [...outline(P), sideLabel(P[0], P[1], `${f(a)} ${u}`, mid), sideLabel(P[2], P[3], `${f(c)} ${u}`, mid)];
  if (right) {
    marks.push(rightMark(P[0], P[1], P[3]), sideLabel(P[3], P[0], `${f(h)} ${u}`, mid), sideLabel(P[1], P[2], `${f(s)} ${u}`, mid));
  } else {
    const top = P[3], foot = k([p, 0]);
    marks.push(dashed(top, foot), rightMark(foot, top, P[1]), sideLabel(top, foot, `${f(h)} ${u}`, k([p - 1, h / 2])));
  }
  const A = ((a + c) * h) / 2;
  return {
    prompt: [T.prose(`What is the area of this trapezoid, in ${sq(u)}?`)],
    text: `trapezoid: ${f(a)}, ${f(c)}, height ${f(h)}${right ? `, slant ${f(s)}` : `, top from ${f(p)}`}`,
    answer: dec(A),
    visual: figure(marks, [answerText(under(P), `${f(A)} ${sq(u)}`), region(P)]),
    explain: `Two copies of a trapezoid, one turned upside down beside the other, make a parallelogram ${f(a)} + ${f(c)} = ${f(a + c)} long and ${f(h)} high. `
      + `One trapezoid is half of it: ½ × (${f(a)} + ${f(c)}) × ${f(h)} = ½ × ${f(a + c)} × ${f(h)} = ${f(A)}. `
      + `The two lengths added are the parallel sides${right ? `; the slanted side, ${f(s)}, is not used` : ''}, and the height is straight across between them. `
      + `So ${f(A)} ${sq(u)}.`,
  };
}

// ── Circles ─────────────────────────────────────────────────────────────

const R = 3.6;
/** A circle, its centre, and its radius or its diameter drawn and labelled. */
function circleMarks(label, diameter) {
  const marks = [circlePath([0, 0], R), { kind: 'point', at: [0, 0], tone: LINE }];
  if (diameter) {
    const A = toward(200, R), B = toward(20, R);
    marks.push({ kind: 'segment', from: A, to: B, tone: GIVEN }, sideLabel(A, B, label, [0.3, -1]));
  } else {
    const B = toward(35, R);
    marks.push({ kind: 'segment', from: [0, 0], to: B, tone: GIVEN }, sideLabel([0, 0], B, label, [1, -1]));
  }
  return marks;
}
const circleFigure = (marks, answer) => fit({ ...FRAME, marks, answer }, 1);

/** A radius or diameter: whole, now and then a half. */
const circleSize = (rng, lo, hi) => len(rng, lo, hi, 0.2);

// requiem: catalogue/content/pi-answers-as-a-coefficient
function circumference(rng) {
  const u = rng.pick(UNITS);
  const roll = rng.int(0, 9);
  if (roll >= 7) return circumferenceBack(rng, u);
  const exact = roll < 4;
  const useD = rng.chance(0.45);
  const g = circleSize(rng, 1, 25);
  const d = useD ? g : 2 * g, r = d / 2;
  const what = useD ? 'diameter' : 'radius';
  const C = exact ? d : 3.14 * d;
  const shown = exact ? `${f(d)}π` : f(C);
  const prompt = exact
    ? [T.prose(`A circle has a ${what} of ${f(g)} ${u}. What is its circumference, in ${u}? Keep π in the answer.`),
      T.letter('C'), T.op('='), T.blank(), T.letter('π')]
    : [T.prose(`A circle has a ${what} of ${f(g)} ${u}. What is its circumference, in ${u}? Use 3.14 for π.`)];
  const start = useD ? `C = πd = π × ${f(d)}` : `C = 2πr = 2 × π × ${f(r)} = π × ${f(d)}`;
  return {
    prompt,
    text: `circumference: ${what} ${f(g)} (${exact ? 'pi' : '3.14'})`,
    answer: dec(C),
    visual: circleFigure(circleMarks(`${f(g)} ${u}`, useD),
      [answerText([0, R + 0.7], `C = ${shown} ${u}`), circlePath([0, 0], R, null)]),
    explain: `The circumference is π times the diameter${useD ? '' : `, and the diameter is twice the radius, ${f(d)}`}: ${start}`
      + `${exact ? ` = ${f(d)}π` : ` ≈ 3.14 × ${f(d)} = ${f(C)}`}. `
      + `(${useD ? `Not π × ${f(d / 2)}: that halves the diameter, which C = πd never does.` : `Not π × ${f(r)}: the 2 in 2πr doubles the radius into the diameter.`} `
      + `And not πr², which is the area.) So ${shown} ${u}.`,
  };
}

function circumferenceBack(rng, u) {
  const exact = rng.chance(0.6);
  const d = exact ? circleSize(rng, 2, 40) : rng.int(1, 30);
  const wantR = rng.chance(0.55);
  const C = exact ? d : 3.14 * d;
  const want = wantR ? d / 2 : d;
  const name = wantR ? 'radius' : 'diameter';
  return {
    prompt: [T.prose(exact
      ? `A circle has a circumference of ${f(d)}π ${u}. What is its ${name}, in ${u}?`
      : `A circle has a circumference of ${f(C)} ${u}. What is its ${name}, in ${u}? Use 3.14 for π.`)],
    text: `${name} from circumference: ${f(C)} (${exact ? 'pi' : '3.14'})`,
    answer: dec(want),
    visual: circleFigure(circleMarks('?', !wantR),
      [answerText(wantR ? toward(35, R / 2 + 0.2, [0.55, 0.45]) : [0.75, -0.55], `${f(want)} ${u}`)]),
    explain: `C = πd, so the diameter is C ÷ π: ${exact ? `${f(d)}π ÷ π = ${f(d)}` : `${f(C)} ÷ 3.14 = ${f(d)}`}. `
      + (wantR ? `The radius is half of it: ${f(d)} ÷ 2 = ${f(want)}. (Stopping at ${f(d)} is the diameter, twice too much.) `
        : `(Halving it as well would give the radius, ${f(d / 2)}, which is not what was asked.) `)
      + `So ${f(want)} ${u}.`,
  };
}

const disc = (r = R) => region(circlePath([0, 0], r).points);

function circleArea(rng) {
  const u = rng.pick(UNITS);
  const roll = rng.int(0, 9);
  if (roll >= 8) return circleAreaBack(rng, u);
  const exact = roll < 4;
  const useD = rng.chance(0.45);
  const g = useD ? 2 * circleSize(rng, 1, 18) : circleSize(rng, 1, 25);
  const r = useD ? g / 2 : g;
  const A = exact ? r * r : 3.14 * r * r;
  const shown = exact ? `${f(r * r)}π` : f(A);
  const what = useD ? 'diameter' : 'radius';
  const prompt = exact
    ? [T.prose(`A circle has a ${what} of ${f(g)} ${u}. What is its area, in ${sq(u)}? Keep π in the answer.`),
      T.letter('A'), T.op('='), T.blank(), T.letter('π')]
    : [T.prose(`A circle has a ${what} of ${f(g)} ${u}. What is its area, in ${sq(u)}? Use 3.14 for π.`)];
  return {
    prompt,
    text: `circle area: ${what} ${f(g)} (${exact ? 'pi' : '3.14'})`,
    answer: dec(A),
    visual: circleFigure(circleMarks(`${f(g)} ${u}`, useD),
      [answerText(useD ? [-1.1, 2] : [0, -1.5], `${shown} ${sq(u)}`), disc()]),
    explain: `${useD ? `The formula wants the radius, half the diameter: ${f(g)} ÷ 2 = ${f(r)}. ` : ''}`
      + `A = πr² = π × ${f(r)} × ${f(r)} = ${f(r * r)}π${exact ? '' : ` ≈ 3.14 × ${f(r * r)} = ${f(A)}`}. `
      + (useD ? `(Squaring the diameter, ${f(g * g)}, gives four times the area.) `
        : `(Not π × 2 × ${f(r)}: r² is the radius times itself, not doubled. And 2πr is the circumference.) `)
      + `So ${shown} ${sq(u)}.`,
  };
}

function circleAreaBack(rng, u) {
  const r = rng.int(1, 20);
  const wantD = rng.chance(0.35);
  const want = wantD ? 2 * r : r;
  const name = wantD ? 'diameter' : 'radius';
  return {
    prompt: [T.prose(`A circle has an area of ${r * r}π ${sq(u)}. What is its ${name}, in ${u}?`)],
    text: `${name} from area: ${r * r} (pi)`,
    answer: dec(want),
    visual: circleFigure(circleMarks('?', wantD), [answerText(wantD ? [0.75, -0.55] : toward(35, R / 2 + 0.2, [0.55, 0.45]), `${want} ${u}`)]),
    explain: `A = πr², so πr² = ${r * r}π and r² = ${r * r}. The radius is the number that squares to it: √${r * r} = ${r}, since ${r} × ${r} = ${r * r}. `
      + `(Not ${r * r} ÷ 2 = ${f((r * r) / 2)}: r² is r times itself, so undoing it is a square root.) `
      + (wantD ? `The diameter is twice the radius: ${2 * r}. ` : '')
      + `So ${want} ${u}.`,
  };
}

// ── Composite figures ───────────────────────────────────────────────────

/** An L: a W by H rectangle with a w by h corner cut from its top right. */
function lShape(rng, u) {
  const W = rng.int(6, 22), H = rng.int(5, 20);
  if (W / H > 3 || H / W > 2) return lShape(rng, u);
  const w = rng.int(2, W - 2), h = rng.int(2, H - 2);
  const k = scaler(Math.max(W, H), W, rng.chance(0.5));
  const P = [[0, 0], [W, 0], [W, H - h], [W - w, H - h], [W - w, H], [0, H]].map(k);
  const inside = k([(W - w) / 2, (H - h) / 2]);
  const A = W * H - w * h;
  const marks = [...outline(P), sideLabel(P[0], P[1], `${W} ${u}`, inside), sideLabel(P[5], P[0], `${H} ${u}`, inside),
    sideLabel(P[4], P[5], `${W - w} ${u}`, inside), sideLabel(P[1], P[2], `${H - h} ${u}`, inside)];
  return {
    prompt: [T.prose(`The corners of this shape are all right angles. What is its area, in ${sq(u)}?`)],
    text: `composite (L): rect ${W} x ${H} - rect ${w} x ${h}`,
    answer: dec(A),
    // With the answer, the corner that was filled in and taken away again.
    visual: figure(marks, [answerText(under(P), `${A} ${sq(u)}`), region(P),
      { ...dashed(P[2], k([W, H])), tone: ASKED }, { ...dashed(k([W, H]), P[4]), tone: ASKED },
      text(k([W - w / 2, H - h / 2]), `${w * h}`, ASKED)]),
    explain: `Fill in the missing corner to make a ${W} by ${H} rectangle, then take the corner away. `
      + `The corner is ${W} − ${W - w} = ${w} across and ${H} − ${H - h} = ${h} high, so the area is ${W} × ${H} − ${w} × ${h} = ${W * H} − ${w * h} = ${A}. `
      + `(Splitting it into two rectangles gives the same: ${W - w} × ${H} + ${w} × ${H - h} = ${(W - w) * H} + ${w * (H - h)}. `
      + `Multiplying the outside lengths, ${W} × ${H}, counts the missing corner too.) So ${A} ${sq(u)}.`,
  };
}

/** A rectangle with a rectangle, or a circle, cut out of it. */
function hole(rng, u) {
  const W = rng.int(6, 24), H = rng.int(5, 20);
  if (W / H > 2.5 || H / W > 2) return hole(rng, u);
  const round = rng.chance(0.45);
  const k = scaler(Math.max(W, H), W);
  const P = [[0, 0], [W, 0], [W, H], [0, H]].map(k);
  const below = [P[1][0] / 2, -1.3];
  if (round) {
    const r = rng.int(1, Math.floor(Math.min(W, H) / 2) - 1);
    if (r < 1) return hole(rng, u);
    const c = k([W / 2, H / 2]), rr = r2(r * SPAN / Math.max(W, H));
    const A = W * H - 3.14 * r * r;
    const ring = circlePath(c, rr).points;
    const B = toward(30, rr, c);
    const marks = [...outline(P), circlePath(c, rr), { kind: 'point', at: c, tone: LINE },
      { kind: 'segment', from: c, to: B, tone: GIVEN }, sideLabel(c, B, `${r} ${u}`, [c[0] + 1, c[1] - 1]),
      sideLabel(P[0], P[1], `${W} ${u}`, P[2]), sideLabel(P[3], P[0], `${H} ${u}`, P[2])];
    return {
      prompt: [T.prose(`A circle is cut out of this rectangle. What area is left, in ${sq(u)}? Use 3.14 for π.`)],
      text: `composite (hole): rect ${W} x ${H} - circle radius ${r} (3.14)`,
      answer: dec(A),
      visual: figure(marks, [answerText(below, `${f(A)} ${sq(u)}`), region([...P, P[0], ring[0], ...ring.slice().reverse(), P[0]])]),
      explain: `What is left is the rectangle less the circle. Rectangle: ${W} × ${H} = ${W * H}. Circle: πr² ≈ 3.14 × ${r} × ${r} = ${f(3.14 * r * r)}. `
        + `Left: ${W * H} − ${f(3.14 * r * r)} = ${f(A)}. (Take the circle away -- adding it counts the hole as if it were filled.) So ${f(A)} ${sq(u)}.`,
    };
  }
  const w = rng.int(1, W - 3), h = rng.int(1, H - 3);
  const x0 = (W - w) / 2, y0 = (H - h) / 2;
  const Q = [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]].map(k), qc = centroid(Q);
  const A = W * H - w * h;
  const marks = [...outline(P), ...outline(Q), sideLabel(P[0], P[1], `${W} ${u}`, P[2]), sideLabel(P[3], P[0], `${H} ${u}`, P[2]),
    sideLabel(Q[0], Q[1], `${w} ${u}`, Q[2], GIVEN, 0.35), sideLabel(Q[1], Q[2], `${h} ${u}`, Q[0], GIVEN, 0.35)];
  return {
    prompt: [T.prose(`A rectangle is cut out of the middle of this one. What area is left, in ${sq(u)}?`)],
    text: `composite (hole): rect ${W} x ${H} - rect ${w} x ${h}`,
    answer: dec(A),
    visual: figure(marks, [answerText(below, `${A} ${sq(u)}`), region([...P, P[0], Q[0], Q[3], Q[2], Q[1], Q[0], P[0]])]),
    explain: `What is left is the big rectangle less the small one: ${W} × ${H} − ${w} × ${h} = ${W * H} − ${w * h} = ${A}. `
      + `(Adding the hole, ${W * H} + ${w * h}, counts space that is not there.) So ${A} ${sq(u)}.`,
  };
}

/** A rectangle with a triangle on top, like a house's end wall. */
function house(rng, u) {
  const W = rng.int(4, 20), H = rng.int(3, 16), t = rng.int(2, 12);
  if (W / (H + t) > 2.5 || (H + t) / W > 2.2) return house(rng, u);
  const k = scaler(Math.max(W, H + t), W);
  const apex = k([W / 2, H + t]), wallTop = k([W / 2, H]);
  const P = [[0, 0], [W, 0], [W, H], [W / 2, H + t], [0, H]].map(k);
  const rect = [[0, 0], [W, 0], [W, H], [0, H]].map(k), roof = [P[4], P[2], P[3]];
  const A = W * H + (W * t) / 2;
  const marks = [...outline(P), { kind: 'segment', from: P[4], to: P[2], tone: LINE, dashed: true },
    dashed(apex, wallTop), rightMark(wallTop, apex, P[2]),
    sideLabel(P[0], P[1], `${W} ${u}`, P[2]), sideLabel(P[1], P[2], `${H} ${u}`, P[0]), sideLabel(apex, wallTop, `${t} ${u}`, P[4], GIVEN, 0.4)];
  return {
    prompt: [T.prose(`This shape is a rectangle with a triangle on top. What is its area, in ${sq(u)}?`)],
    text: `composite (house): rect ${W} x ${H} + tri ${W} x ${t}`,
    answer: dec(A),
    visual: figure(marks, [answerText(under(P), `${f(A)} ${sq(u)}`), region(rect), region(roof, ASKED),
      answerText(centroid(rect), `${W * H}`), answerText([wallTop[0] + 0.9, (wallTop[1] * 2 + apex[1]) / 3], `${f((W * t) / 2)}`)]),
    explain: `Split it where the roof meets the walls. Rectangle: ${W} × ${H} = ${W * H}. Triangle: its base is the rectangle's top, ${W}, and its height ${t}, `
      + `so ½ × ${W} × ${t} = ${f((W * t) / 2)}. Together ${W * H} + ${f((W * t) / 2)} = ${f(A)}. `
      + `(Forgetting the ½ counts the roof twice over.) So ${f(A)} ${sq(u)}.`,
  };
}

/** A rectangle with a half circle on one side. */
function semi(rng, u) {
  const r = rng.int(1, 10), W = 2 * r, H = rng.int(2, 20);
  if (W / (H + r) > 2.5 || (H + r) / W > 2.5) return semi(rng, u);
  const k = scaler(Math.max(W, H + r), W);
  const P = [[0, 0], [W, 0], [W, H], [0, H]].map(k);
  const c = k([r, H]), rr = r2(r * SPAN / Math.max(W, H + r));
  const half = circlePath(c, rr, LINE, 0, 180);
  const A = W * H + (3.14 * r * r) / 2;
  // Three sides of the rectangle; the fourth, where the half circle sits, is dashed.
  const marks = [...outline(P).slice(0, 2), { kind: 'segment', from: P[3], to: P[0], tone: LINE },
    half, dashed(P[3], P[2]), sideLabel(P[0], P[1], `${W} ${u}`, P[2]), sideLabel(P[1], P[2], `${H} ${u}`, P[0])];
  return {
    prompt: [T.prose(`This shape is a rectangle with a half circle on top. What is its area, in ${sq(u)}? Use 3.14 for π.`)],
    text: `composite (semi): rect ${W} x ${H} + semicircle radius ${r} (3.14)`,
    answer: dec(A),
    visual: figure(marks, [answerText(under(P), `${f(A)} ${sq(u)}`), region(P), region(half.points, ASKED),
      answerText(centroid(P), `${W * H}`), answerText([c[0], c[1] + rr * 0.42], f((3.14 * r * r) / 2))]),
    explain: `Split it into the rectangle and the half circle. Rectangle: ${W} × ${H} = ${W * H}. `
      + `The half circle sits on the ${W} side, so ${W} is its diameter and its radius is ${r}: half of πr² ≈ ½ × 3.14 × ${r} × ${r} = ${f((3.14 * r * r) / 2)}. `
      + `Together ${W * H} + ${f((3.14 * r * r) / 2)} = ${f(A)}. (Using ${W} as the radius gives four times the half circle.) So ${f(A)} ${sq(u)}.`,
  };
}

function composite(rng) {
  const u = rng.pick(UNITS);
  return rng.pick([lShape, lShape, hole, house, semi])(rng, u);
}

// ── Missing dimension ───────────────────────────────────────────────────

function missing(rng) {
  const u = rng.pick(UNITS);
  const kind = rng.pick(['rectangle', 'square', 'triangle', 'triangle', 'parallelogram', 'trapezoid', 'trapezoid']);
  if (kind === 'square') {
    const s = rng.int(2, 25), A = s * s;
    const k = scaler(s, s), P = [[0, 0], [s, 0], [s, s], [0, s]].map(k), mid = centroid(P);
    return {
      prompt: [T.prose(`A square has an area of ${A} ${sq(u)}. How long is each side, in ${u}?`)],
      text: `missing: square area ${A}`,
      answer: dec(s),
      visual: figure([...outline(P), text(over(P), `area ${A} ${sq(u)}`), sideLabel(P[0], P[1], '?', mid, ASKED)],
        [sideLabel(P[0], P[1], `${s} ${u}`, mid, null, 1.1)]),
      explain: `A square's area is side × side, so the side is the number that times itself makes ${A}: √${A} = ${s}, since ${s} × ${s} = ${A}. `
        + `(Not ${A} ÷ 2 or ${A} ÷ 4: the side is multiplied by itself, not doubled.) So ${s} ${u}.`,
    };
  }
  if (kind === 'rectangle' || kind === 'parallelogram') {
    const b = len(rng, 2, 20, 0.2), h = len(rng, 2, 18, 0.2);
    const A = b * h;
    if (b / h > 4 || h / b > 2.2) return missing(rng);
    const askH = rng.chance(0.5);
    const o = kind === 'parallelogram' ? r2(Math.min(b * 0.6, h * 0.5)) : 0;
    const k = scaler(Math.max(b + o, h), b + o);
    const P = [[0, 0], [b, 0], [b + o, h], [o, h]].map(k), mid = centroid(P);
    const base = (lab, tone, gap) => sideLabel(P[0], P[1], lab, mid, tone, gap);
    const top = k([o, h]), foot = k([o, 0]);
    const hLabel = (lab, tone, gap) => (kind === 'parallelogram' ? sideLabel(top, foot, lab, k([o - 1, h / 2]), tone, gap) : sideLabel(P[3], P[0], lab, mid, tone, gap));
    const marks = [...outline(P), text(askH ? under(P) : over(P), `area ${f(A)} ${sq(u)}`),
      askH ? base(`${f(b)} ${u}`) : base('?', ASKED), askH ? hLabel('?', ASKED) : hLabel(`${f(h)} ${u}`)];
    if (kind === 'parallelogram') marks.push(dashed(top, foot), rightMark(foot, top, P[1]));
    const want = askH ? h : b, known = askH ? b : h;
    const knownName = kind === 'rectangle' ? (askH ? 'length' : 'width') : (askH ? 'base' : 'height');
    const wantName = kind === 'rectangle' ? (askH ? 'width' : 'length') : (askH ? 'height' : 'base');
    return {
      prompt: [T.prose(`A ${kind} has an area of ${f(A)} ${sq(u)} and a ${knownName} of ${f(known)} ${u}. What is its ${wantName}, in ${u}?`)],
      text: `missing: ${kind} area ${f(A)}, ${knownName} ${f(known)}`,
      answer: dec(want),
      visual: figure(marks, [askH ? hLabel(`${f(h)} ${u}`, null, 1.2) : base(`${f(b)} ${u}`, null, 1.1)]),
      explain: `Area = ${kind === 'rectangle' ? 'length × width' : 'base × height'}, so ${f(known)} × ? = ${f(A)}, and the missing length is ${f(A)} ÷ ${f(known)} = ${f(want)}. `
        + `(Area is a product, so dividing undoes it; ${f(A)} − ${f(known)} undoes nothing.) `
        + `${kind === 'parallelogram' ? 'The height is the dashed one, at right angles to the base. ' : ''}Check: ${f(b)} × ${f(h)} = ${f(A)}. So ${f(want)} ${u}.`,
    };
  }
  if (kind === 'triangle') {
    const b = rng.int(2, 24), h = len(rng, 2, 20, 0.3);
    if (b / h > 4.5 || h / b > 2.2) return missing(rng);
    const A = (b * h) / 2;
    const askH = rng.chance(0.6);
    const apex = r2(b * rng.pick([0.3, 0.5, 0.65]));
    const k = scaler(Math.max(b, h), b, rng.chance(0.5));
    const P = [[0, 0], [b, 0], [apex, h]].map(k), mid = centroid(P), foot = k([apex, 0]);
    const away = k([apex - 1, h / 2]);
    const marks = [...outline(P), dashed(P[2], foot), rightMark(foot, P[2], P[1]), text(askH ? under(P) : over(P), `area ${f(A)} ${sq(u)}`),
      sideLabel(P[0], P[1], askH ? `${b} ${u}` : '?', mid, askH ? GIVEN : ASKED), sideLabel(P[2], foot, askH ? '?' : `${f(h)} ${u}`, away, askH ? ASKED : GIVEN)];
    const want = askH ? h : b, known = askH ? b : h;
    return {
      prompt: [T.prose(`A triangle has an area of ${f(A)} ${sq(u)} and a ${askH ? 'base' : 'height'} of ${f(known)} ${u}. What is its ${askH ? 'height' : 'base'}, in ${u}?`)],
      text: `missing: triangle area ${f(A)}, ${askH ? 'base' : 'height'} ${f(known)}`,
      answer: dec(want),
      visual: figure(marks, [askH ? sideLabel(P[2], foot, `${f(h)} ${u}`, away, null, 1.25) : sideLabel(P[0], P[1], `${b} ${u}`, mid, null, 1.1)]),
      explain: `Area = ½ × base × height, so base × height is twice the area: 2 × ${f(A)} = ${f(2 * A)}. `
        + `Then ${f(2 * A)} ÷ ${f(known)} = ${f(want)}. (${f(A)} ÷ ${f(known)} = ${f(A / known)} forgets the ½, and comes out half as long.) `
        + `Check: ½ × ${f(b)} × ${f(h)} = ${f(A)}. So ${f(want)} ${u}.`,
    };
  }
  // Trapezoid: the height from the two parallel sides, or the other parallel side.
  const a = rng.int(4, 24), c = rng.int(2, a - 1), h = rng.int(2, 16);
  if (a / h > 4.5 || h / a > 2) return missing(rng);
  const A = ((a + c) * h) / 2;
  const askH = rng.chance(0.5);
  const p = r2((a - c) * rng.pick([0.3, 0.5]));
  const k = scaler(Math.max(a, h), a, rng.chance(0.5));
  const P = [[0, 0], [a, 0], [p + c, h], [p, h]].map(k), mid = centroid(P), top = P[3], foot = k([p, 0]);
  const away = k([p - 1, h / 2]);
  const marks = [...outline(P), dashed(top, foot), rightMark(foot, top, P[1]), text(under(P), `area ${f(A)} ${sq(u)}`),
    sideLabel(P[0], P[1], `${a} ${u}`, mid), sideLabel(P[2], P[3], askH ? `${c} ${u}` : '?', mid, askH ? GIVEN : ASKED),
    sideLabel(top, foot, askH ? '?' : `${h} ${u}`, away, askH ? ASKED : GIVEN)];
  if (askH) {
    return {
      prompt: [T.prose(`A trapezoid has an area of ${f(A)} ${sq(u)}, and parallel sides of ${a} ${u} and ${c} ${u}. What is its height, in ${u}?`)],
      text: `missing: trapezoid area ${f(A)}, sides ${a} and ${c}`,
      answer: dec(h),
      visual: figure(marks, [sideLabel(top, foot, `${h} ${u}`, away, null, 1.2)]),
      explain: `Area = ½ × (${a} + ${c}) × height = ½ × ${a + c} × height. Twice the area is ${f(2 * A)}, so ${a + c} × height = ${f(2 * A)}, `
        + `and the height is ${f(2 * A)} ÷ ${a + c} = ${h}. (Dividing ${f(A)} by ${a + c} without doubling forgets the ½.) So ${h} ${u}.`,
    };
  }
  return {
    prompt: [T.prose(`A trapezoid has an area of ${f(A)} ${sq(u)} and a height of ${h} ${u}. One parallel side is ${a} ${u}. How long is the other, in ${u}?`)],
    text: `missing: trapezoid area ${f(A)}, height ${h}, side ${a}`,
    answer: dec(c),
    visual: figure(marks, [sideLabel(P[2], P[3], `${c} ${u}`, mid, null, 1.1)]),
    explain: `Area = ½ × (sum of the parallel sides) × height. Twice the area is ${f(2 * A)}, and ${f(2 * A)} ÷ ${h} = ${a + c} is the two parallel sides together. `
      + `Take away the one you know: ${a + c} − ${a} = ${c}. (${a + c} is both sides, not the missing one.) Check: ½ × (${a} + ${c}) × ${h} = ${f(A)}. So ${c} ${u}.`,
  };
}

const CONTENT = [rectangles, triangleArea, trapezoid, circumference, circleArea, composite, missing];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
