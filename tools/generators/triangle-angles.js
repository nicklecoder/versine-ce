/**
 * Catalogue authoring tool: builds the problem library for triangles and polygons.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 *
 * Every `text` names the fact asked about and gives the angles, the number
 * of sides or the lengths, so scripts/check-answers.py can work the answer
 * again from (n − 2) × 180 and 360 alone.
 *
 * Triangles are drawn to scale from their angles; a regular polygon is
 * drawn when it has few enough sides to read. Irregular polygons are not
 * drawn: one whose angles are the given ones would have to be solved for,
 * and a picture that only roughly matches its numbers teaches nothing.
 */
import * as T from '../terms.js';
import { LINE, toward, FRAME, r2, angleMarks, fit, linear, ascii, sized, putIn } from './figures.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/triangle-angles.js';

const LETTERS = ['a', 'b', 'c', 'x', 'y', 'p', 'q'];
const deg = (n) => `${n}°`;
const sumOf = (xs) => xs.reduce((s, v) => s + v, 0);
const dirTo = (from, to) => (Math.atan2(to[1] - from[1], to[0] - from[0]) * 180) / Math.PI;

/** The interior angle at V of a figure going on to U and W, as [from, to] directions anticlockwise. */
function cornerAt(V, U, W) {
  let a = dirTo(V, U), b = dirTo(V, W);
  let span = (((b - a) % 360) + 360) % 360;
  if (span > 180) { [a, b] = [b, a]; span = 360 - span; }
  return [a, a + span];
}
const side = (from, to) => ({ kind: 'segment', from, to, tone: LINE });
/** A tick across the middle of a side, which says it matches another side with one. */
function tick(P, Q) {
  const m = [(P[0] + Q[0]) / 2, (P[1] + Q[1]) / 2], d = dirTo(P, Q) + 90;
  return { kind: 'segment', from: toward(d, 0.22, m), to: toward(d + 180, 0.22, m), tone: LINE };
}

/** A triangle with angles A at the left of its base, B at the right, C on top. */
function triangle(A, B) {
  const C = 180 - A - B, rad = Math.PI / 180;
  const base = 4.2;
  const b = (base * Math.sin(B * rad)) / Math.sin(C * rad);
  const P = [[0, 0], [base, 0], [r2(b * Math.cos(A * rad)), r2(b * Math.sin(A * rad))]];
  return { P, sizes: [A, B, C] };
}

/**
 * The marks for a triangle: three sides, and at each corner either a size,
 * a letter, or nothing. `labels[i]` is [label, asked, answer].
 */
function triangleFigure(P, labels, extra = [], extraReveal = []) {
  const parts = [side(P[0], P[1]), side(P[1], P[2]), side(P[2], P[0]), ...extra];
  const reveal = [...extraReveal];
  labels.forEach((l, i) => {
    if (!l) return;
    const [from, to] = cornerAt(P[i], P[(i + 1) % 3], P[(i + 2) % 3]);
    const short = Math.min(Math.hypot(P[(i + 1) % 3][0] - P[i][0], P[(i + 1) % 3][1] - P[i][1]),
      Math.hypot(P[(i + 2) % 3][0] - P[i][0], P[(i + 2) % 3][1] - P[i][1]));
    // A given right angle is marked as one; an asked one never is, or the
    // square would answer it.
    const right = !l[1] && Math.abs(to - from - 90) < 0.5;
    const m = angleMarks(from, to, { label: l[0], asked: l[1], answer: l[2] ?? null, c: P[i],
      maxOut: 0.4 * short, radius: Math.min(0.6, 0.25 * short), outside: true, right });
    parts.push(...m.marks);
    reveal.push(...m.reveal);
  });
  return fit({ ...FRAME, marks: parts, answer: reveal }, 1.2);
}

/** Three angles of a triangle, each at least `least`. */
function threeAngles(rng, least = 20) {
  for (;;) {
    const A = rng.int(least, 140), B = rng.int(least, 140);
    if (180 - A - B >= least) return [A, B, 180 - A - B];
  }
}

function angleSum(rng) {
  if (rng.chance(0.3)) return sumInX(rng);
  const [A, B, C] = threeAngles(rng, 15);
  const asked = rng.int(0, 2);
  const letter = rng.pick(LETTERS);
  const sizes = [A, B, C];
  const given = sizes.filter((_, i) => i !== asked);
  const { P } = triangle(A, B);
  const right = given.includes(90);
  return {
    prompt: [T.prose(`Two angles of a triangle are ${deg(given[0])} and ${deg(given[1])}. What is the third, ${letter}?`)],
    text: `triangle: ${given.join(', ')}`,
    answer: { type: 'int', value: sizes[asked] },
    visual: triangleFigure(P, sizes.map((s, i) => (i === asked ? [letter, true, deg(s)] : [deg(s), false]))),
    explain: `The angles of a triangle add to 180°. ${given[0]} + ${given[1]} = ${sumOf(given)}, `
      + `so ${letter} = 180 − ${sumOf(given)} = ${sizes[asked]}.${right ? ' (The 90° corner counts like any other.)' : ''} So ${letter} = ${deg(sizes[asked])}.`,
  };
}

/** Three angles as expressions in x that add to 180 at a whole x. */
function sumInX(rng) {
  for (;;) {
    const x = rng.int(5, 30);
    const [A, B, C] = threeAngles(rng, 15);
    const es = [A, B, C].map((v) => {
      const a = rng.int(1, 5);
      return [a, v - a * x];
    });
    if (es.some(([, b]) => Math.abs(b) > 40)) continue;
    const k = sumOf(es.map((e) => e[0])), c = sumOf(es.map((e) => e[1]));
    const { P } = triangle(A, B);
    const names = ['p', 'q', 'r'];
    return {
      prompt: [T.prose(`A triangle has angles p = ${sized(es[0])}, q = ${sized(es[1])} and r = ${sized(es[2])}. What is x?`)],
      text: `triangle in x: ${es.map((e) => ascii(...e)).join(', ')}`,
      answer: { type: 'int', value: x },
      visual: triangleFigure(P, [A, B, C].map((v, i) => [names[i], false, deg(v)])),
      explain: `The three add to 180°: ${es.map((e) => `(${linear(...e)})`).join(' + ')} = 180. `
        + `Collect: ${linear(k, c)} = 180${c === 0 ? '' : `, so ${linear(k, 0)} = ${180 - c}`}, and x = ${180 - c} ÷ ${k} = ${x}. `
        + `Check: ${es.map((e) => putIn(...e, x)).join(', ')} make ${A}, ${B} and ${C}, which add to 180. So x = ${x}.`,
    };
  }
}

function exterior(rng) {
  const [A, B, C] = threeAngles(rng, 20);
  const ext = 180 - B;
  const { P } = triangle(A, B);
  const end = [r2(P[1][0] + 2.6), 0];
  const letter = rng.pick(LETTERS);
  const [from, to] = [0, 180 - B];
  const askExt = rng.chance(0.6);
  const extMarks = angleMarks(from, to, askExt
    ? { label: letter, asked: true, answer: deg(ext), c: P[1] } : { label: deg(ext), c: P[1] });
  const remote = askExt ? null : rng.int(0, 1);
  // The two far angles are at corners 0 and 2; the near one, at 1, is never labelled.
  const labels = [
    remote === 0 ? [letter, true, deg(A)] : [deg(A), false],
    null,
    remote === 1 ? [letter, true, deg(C)] : [deg(C), false],
  ];
  const fig = triangleFigure(P, labels, [side(P[1], end), ...extMarks.marks], extMarks.reveal);
  if (askExt) {
    return {
      prompt: [T.prose(`One side of a triangle is extended. The two angles inside, away from it, are ${deg(A)} and ${deg(C)}. What is the exterior angle ${letter}?`)],
      text: `exterior angle: remote ${A}, ${C}`,
      answer: { type: 'int', value: ext },
      visual: fig,
      explain: `An exterior angle equals the two interior angles far from it, added: ${A} + ${C} = ${ext}. `
        + `It makes a straight line with the angle beside it, ${B}°, so it is 180 − ${B}; and the triangle’s three angles add to 180, so the far two are 180 − ${B} as well. `
        + `The angle beside it is never part of the sum. So ${letter} = ${deg(ext)}.`,
    };
  }
  const known = remote === 0 ? C : A, want = remote === 0 ? A : C;
  return {
    prompt: [T.prose(`One side of a triangle is extended, making an exterior angle of ${deg(ext)}. One of the two far interior angles is ${deg(known)}. What is the other, ${letter}?`)],
    text: `remote angle: exterior ${ext}, other ${known}`,
    answer: { type: 'int', value: want },
    visual: fig,
    explain: `The exterior angle is the two far interior angles added, so ${known} + ${letter} = ${ext}, `
      + `and ${letter} = ${ext} − ${known} = ${want}. So ${letter} = ${deg(want)}.`,
  };
}

/** An isosceles triangle's angles in x: two equal base angles, or a base angle and the apex. */
function isoscelesInX(rng) {
  for (;;) {
    const x = rng.int(4, 30);
    const base = rng.int(30, 80), apex = 180 - 2 * base;
    const a1 = rng.int(1, 5);
    const e1 = [a1, base - a1 * x];
    const pair = rng.chance(0.5);
    let a2 = rng.int(1, 5);
    if (pair && a2 === a1) continue;
    const e2 = [a2, (pair ? base : apex) - a2 * x];
    if (Math.abs(e1[1]) > 40 || Math.abs(e2[1]) > 40) continue;
    const { P } = triangle(base, base);
    const ticks = [tick(P[0], P[2]), tick(P[1], P[2])];
    const labels = pair ? [['p', false, deg(base)], ['q', false, deg(base)], null]
      : [['p', false, deg(base)], null, ['q', false, deg(apex)]];
    const work = pair
      ? `The base angles are equal: ${linear(...e1)} = ${linear(...e2)}. `
        + `${a1 > a2 ? `Take ${linear(a2, 0)} from both sides: ${linear(a1 - a2, e1[1])} = ${e2[1] < 0 ? `−${-e2[1]}` : e2[1]}`
          : `Take ${linear(a1, 0)} from both sides: ${e1[1] < 0 ? `−${-e1[1]}` : e1[1]} = ${linear(a2 - a1, e2[1])}`}, so x = ${x}. `
        + `Check: both come to ${base}.`
      : `There are two base angles, so 2(${linear(...e1)}) + (${linear(...e2)}) = 180. `
        + `Collect: ${linear(2 * a1 + a2, 2 * e1[1] + e2[1])} = 180, so x = ${180 - 2 * e1[1] - e2[1]} ÷ ${2 * a1 + a2} = ${x}. `
        + `Check: ${base} + ${base} + ${apex} = 180.`;
    return {
      prompt: [T.prose(pair
        ? `In an isosceles triangle the base angles are p = ${sized(e1)} and q = ${sized(e2)}. What is x?`
        : `In an isosceles triangle each base angle is p = ${sized(e1)}, and the angle between the equal sides is q = ${sized(e2)}. What is x?`)],
      text: `isosceles in x: base ${ascii(...e1)}, ${pair ? 'base' : 'apex'} ${ascii(...e2)}`,
      answer: { type: 'int', value: x },
      visual: triangleFigure(P, labels, ticks),
      explain: `${work} So x = ${x}.`,
    };
  }
}

function isosceles(rng) {
  if (rng.chance(0.35)) return isoscelesInX(rng);
  const letter = rng.pick(LETTERS);
  const fromApex = rng.chance(0.5);
  let apex, base;
  if (fromApex) {
    apex = 2 * rng.int(10, 65);
    base = (180 - apex) / 2;
  } else {
    base = rng.int(25, 80);
    apex = 180 - 2 * base;
  }
  if (apex === 60 && rng.chance(0.7)) return isosceles(rng);
  const { P } = triangle(base, base);
  const ticks = [tick(P[0], P[2]), tick(P[1], P[2])];
  const labels = fromApex
    ? [[letter, true, deg(base)], null, [deg(apex), false]]
    : [[deg(base), false], null, [letter, true, deg(apex)]];
  const equilateral = apex === 60;
  return {
    prompt: [T.prose(fromApex
      ? `In an isosceles triangle the angle between the two equal sides is ${deg(apex)}. What is each base angle, ${letter}?`
      : `In an isosceles triangle each base angle is ${deg(base)}. What is the angle ${letter} between the two equal sides?`)],
    text: fromApex ? `isosceles: apex ${apex}` : `isosceles: base ${base}`,
    answer: { type: 'int', value: fromApex ? base : apex },
    visual: triangleFigure(P, labels, ticks),
    explain: (fromApex
      ? `The two base angles are equal and the three angles add to 180°: the base angles share 180 − ${apex} = ${180 - apex}, so each is ${180 - apex} ÷ 2 = ${base}.`
      : `The base angles are equal, so both are ${base}°: together ${2 * base}. The third is 180 − ${2 * base} = ${apex}.`
        + ` (Not 180 − ${base}: there are two base angles to take away.)`)
      + (equilateral ? ' Every angle is 60°, so it is equilateral too.' : '')
      + ` So ${letter} = ${deg(fromApex ? base : apex)}.`,
  };
}

const NAMES = { 3: 'triangle', 4: 'quadrilateral', 5: 'pentagon', 6: 'hexagon', 7: 'heptagon', 8: 'octagon',
  9: 'nonagon', 10: 'decagon', 12: 'dodecagon' };
const named = (n) => (NAMES[n] ? `a ${NAMES[n]}` : `a ${n}-sided polygon`);
const triangles = (n) => (n === 3 ? 'A triangle’s angles add to 180°' : `${n} sides cut into ${n} − 2 = ${n - 2} triangles from one corner, so the angles add to ${n - 2} × 180 = ${(n - 2) * 180}°`);

/** A regular polygon on a circle, one corner at the bottom left. */
function regularPoints(n) {
  const R = 3;
  return Array.from({ length: n }, (_, i) => toward(-90 - 180 / n + (360 * i) / n, R));
}

function polygonSum(rng) {
  if (rng.chance(0.15)) return sidesFromSum(rng);
  if (rng.chance(0.2)) {
    const n = rng.int(3, 40);
    return {
      prompt: [T.prose(`What do the interior angles of ${named(n)} add to?`)],
      text: `interior sum: ${n}`,
      answer: { type: 'int', value: (n - 2) * 180 },
      visual: null,
      explain: `${triangles(n)}. (Not ${n} × 180: from one corner the two sides beside it start no triangle of their own.) So ${(n - 2) * 180}°.`,
    };
  }
  const n = rng.int(4, 8);
  const total = (n - 2) * 180;
  for (;;) {
    // Each angle under 180, so the polygon is convex.
    const angles = Array.from({ length: n - 1 }, () => rng.int(60, 175));
    const want = total - sumOf(angles);
    if (want < 40 || want >= 180) continue;
    const letter = rng.pick(LETTERS);
    return {
      prompt: [T.prose(`${named(n)[0].toUpperCase()}${named(n).slice(1)} has angles of ${angles.slice(0, -1).map(deg).join(', ')} and ${deg(angles[n - 2])}, and one more, ${letter}. What is ${letter}?`)],
      text: `missing interior: ${n} sides, ${angles.join(', ')}`,
      answer: { type: 'int', value: want },
      visual: null,
      explain: `${triangles(n)}. The ${n - 1} given add to ${sumOf(angles)}, so ${letter} = ${total} − ${sumOf(angles)} = ${want}. So ${letter} = ${deg(want)}.`,
    };
  }
}

/** The number of sides, from what the interior angles add to: the sum run backwards. */
function sidesFromSum(rng) {
  const n = rng.int(3, 40), total = (n - 2) * 180;
  return {
    prompt: [T.prose(`The interior angles of a polygon add to ${deg(total)}. How many sides does it have?`)],
    text: `sides from interior sum: ${total}`,
    answer: { type: 'int', value: n },
    visual: null,
    explain: `The sum is (n − 2) × 180, so first undo the × 180: ${total} ÷ 180 = ${n - 2} triangles. `
      + `That is n − 2, so n = ${n - 2} + 2 = ${n}. (Stopping at ${n - 2} counts the triangles, not the sides.) So ${n} sides.`,
  };
}

/** Sides for which a regular polygon's angles are whole. */
const WHOLE = [3, 4, 5, 6, 8, 9, 10, 12, 15, 18, 20, 24, 30, 36, 40, 45, 60, 72, 90, 120, 180];

function regularFigure(n, corner, label = 'a') {
  const P = regularPoints(n);
  const marks = P.map((p, i) => side(p, P[(i + 1) % n]));
  const m = angleMarks(...cornerAt(P[0], P[1], P[n - 1]), { label, asked: true, answer: deg(corner), c: P[0] });
  return fit({ ...FRAME, marks: [...marks, ...m.marks], answer: m.reveal }, 1.1);
}

const interior = (n) => 180 - 360 / n;
/** A regular polygon's name, one way throughout: a square, a regular hexagon, a regular 15-sided polygon. */
const SHAPE = (n) => (n === 3 ? 'equilateral triangle' : n === 4 ? 'square' : `regular ${NAMES[n] ?? `${n}-sided polygon`}`);
const aShape = (n) => `${/^[aeiou]/.test(SHAPE(n)) ? 'an' : 'a'} ${SHAPE(n)}`;
const COUNT = ['', 'one', 'two', 'three'];
/** Shapes counted the way a person says them: two regular octagons and a square. */
function shapesSaid(ns) {
  const kinds = [...new Set(ns)];
  const said = kinds.map((n) => {
    const k = ns.filter((m) => m === n).length;
    return k === 1 ? aShape(n) : `${COUNT[k]} ${SHAPE(n).replace(/polygon$/, 'polygons').replace(/(triangle|square|gon)$/, '$1s')}`;
  });
  return said.length === 1 ? said[0] : `${said.slice(0, -1).join(', ')} and ${said[said.length - 1]}`;
}

/** A regular n-gon with one corner at c, filling the angle from direction `from` round to from + its interior angle. */
function polygonAt(n, from, s, c = [0, 0]) {
  const P = [c];
  for (let i = 0; i < n - 1; i++) P.push(toward(from + (360 / n) * i, s, P[P.length - 1]));
  return P;
}

/**
 * Regular polygons meeting at one point, edge to edge, and the angle left
 * over to make a full turn: drawn, so the meeting is seen and not imagined.
 */
function gap(rng) {
  const pool = WHOLE.filter((k) => k <= 12);
  const count = rng.chance(0.6) ? 2 : 3;
  const ns = Array.from({ length: count }, () => rng.pick(pool)).sort((a, b) => a - b);
  const used = sumOf(ns.map(interior));
  const want = 360 - used;
  if (want < 20) return gap(rng);
  const list = shapesSaid(ns);
  const letter = rng.pick(LETTERS);
  // Each polygon takes its corner's share of the turn, one after the other.
  const marks = [];
  let at = 90 + want / 2;
  for (const n of ns) {
    const P = polygonAt(n, at, 2);
    marks.push(...P.map((p, i) => side(p, P[(i + 1) % n])));
    at += interior(n);
  }
  const m = angleMarks(at, at + want, { label: letter, asked: true, answer: deg(want), radius: 0.5 });
  return {
    prompt: [T.prose(`${list[0].toUpperCase()}${list.slice(1)} meet at a point, each with one corner there, edge to edge. What is the angle ${letter} left over to make a full turn?`)],
    text: `regular gap: ${ns.join(', ')}`,
    answer: { type: 'int', value: want },
    visual: fit({ ...FRAME, marks: [...marks, ...m.marks], answer: m.reveal }, 1),
    explain: `Each corner is the polygon’s interior angle, 180 − 360 ÷ n: ${[...new Set(ns)].map((n) => `${SHAPE(n)} ${interior(n)}°`).join(', ')}. `
      + `Together ${ns.map(interior).join(' + ')} = ${used}, and a full turn is 360°, so ${letter} = 360 − ${used} = ${want}. So ${letter} = ${deg(want)}.`,
  };
}

// requiem: catalogue/content/regular-polygons-core-first
// Each angle from n and n from an angle, inside and out, are the level; the
// polygons meeting at a point are the puzzle beside it, and the fewer.
function regular(rng) {
  if (rng.chance(0.08)) return gap(rng);
  const roll = rng.int(0, 6);
  const n = rng.pick(WHOLE.filter((k) => k <= 180 && (roll !== 2 || k > 3)));
  const each = 180 - 360 / n, ext = 360 / n;
  if (roll === 0) {
    return {
      prompt: [T.prose(`The interior angles of a regular polygon add to ${deg((n - 2) * 180)}. What is each one?`)],
      text: `regular from sum: ${(n - 2) * 180}`,
      answer: { type: 'int', value: each },
      visual: null,
      explain: `First the number of sides: the sum is (n − 2) × 180, and ${(n - 2) * 180} ÷ 180 = ${n - 2} triangles, so n − 2 = ${n - 2} and n = ${n}. `
        + `Then share it out: ${(n - 2) * 180} ÷ ${n} = ${each}. So ${deg(each)}.`,
    };
  }
  if (roll === 1) {
    return {
      prompt: [T.prose(`Each interior angle of a regular polygon is ${deg(each)}. How many sides does it have?`)],
      text: `regular sides from interior: ${each}`,
      answer: { type: 'int', value: n },
      visual: null,
      explain: `Each exterior angle is 180 − ${each} = ${ext}°, and the exterior angles add to 360°, `
        + `so there are 360 ÷ ${ext} = ${n} of them. So ${n} sides.`,
    };
  }
  if (roll === 2) {
    return {
      prompt: [T.prose(`Each exterior angle of a regular polygon is ${deg(ext)}. How many sides does it have?`)],
      text: `regular sides from exterior: ${ext}`,
      answer: { type: 'int', value: n },
      visual: null,
      explain: `The exterior angles of any polygon add to 360°, and a regular one has them all equal, so there are `
        + `360 ÷ ${ext} = ${n} of them, one at each corner. (Not 180 ÷ ${ext}: once around is 360°.) So ${n} sides.`,
    };
  }
  if (roll === 3) {
    return {
      prompt: [T.prose(`What is each exterior angle of ${aShape(n)}?`)],
      text: `regular exterior: ${n}`,
      answer: { type: 'int', value: ext },
      visual: null,
      explain: `The exterior angles of any polygon add to 360°, and ${aShape(n)} has ${n} equal ones: 360 ÷ ${n} = ${ext}. `
        + `(Not (n − 2) × 180 shared out: that is the interior angle, ${each}°.) So ${deg(ext)}.`,
    };
  }
  if (roll === 4) {
    const fromExt = rng.chance(0.5);
    return fromExt ? {
      prompt: [T.prose(`Each exterior angle of a regular polygon is ${deg(ext)}. What is each interior angle?`)],
      text: `regular interior from exterior: ${ext}`,
      answer: { type: 'int', value: each },
      visual: null,
      explain: `At each corner the interior and exterior angles make a straight line, so they add to 180°: 180 − ${ext} = ${each}. So ${deg(each)}.`,
    } : {
      prompt: [T.prose(`Each interior angle of a regular polygon is ${deg(each)}. What is each exterior angle?`)],
      text: `regular exterior from interior: ${each}`,
      answer: { type: 'int', value: ext },
      visual: null,
      explain: `At each corner the interior and exterior angles make a straight line, so they add to 180°: 180 − ${each} = ${ext}. `
        + `(It is 360 ÷ n as well: ${n} sides, 360 ÷ ${n} = ${ext}.) So ${deg(ext)}.`,
    };
  }
  return {
    prompt: [T.prose(`What is each interior angle of ${aShape(n)}?`)],
    text: `regular interior: ${n}`,
    answer: { type: 'int', value: each },
    visual: n <= 12 ? regularFigure(n, each) : null,
    explain: `${triangles(n)}. Regular means all ${n} are equal: ${(n - 2) * 180} ÷ ${n} = ${each}. `
      + `(Or: each exterior angle is 360 ÷ ${n} = ${ext}, and 180 − ${ext} = ${each}.) So ${deg(each)}.`,
  };
}

function exteriorSum(rng) {
  const roll = rng.int(0, 2);
  if (roll === 0) {
    const n = rng.pick(WHOLE.filter((k) => k <= 180));
    return {
      prompt: [T.prose(`Each exterior angle of a regular polygon is ${deg(360 / n)}. How many sides does it have?`)],
      text: `regular sides from exterior: ${360 / n}`,
      answer: { type: 'int', value: n },
      visual: null,
      explain: `Walking once around any polygon turns you a full 360°, one exterior angle at each corner. `
        + `With every turn ${360 / n}°, there are 360 ÷ ${360 / n} = ${n} corners. So ${n} sides.`,
    };
  }
  if (roll === 1) {
    const n = rng.pick(WHOLE.filter((k) => k <= 180));
    return {
      prompt: [T.prose(`What is each exterior angle of ${aShape(n)}?`)],
      text: `regular exterior: ${n}`,
      answer: { type: 'int', value: 360 / n },
      visual: null,
      explain: `The exterior angles of any polygon add to 360°, and ${aShape(n)} has ${n} equal ones: 360 ÷ ${n} = ${360 / n}. `
        + `(However many sides, the sum is 360, not (n − 2) × 180: that is the interior sum.) So ${deg(360 / n)}.`,
    };
  }
  const n = rng.int(3, 8);
  for (;;) {
    const angles = Array.from({ length: n - 1 }, () => rng.int(15, 120));
    const want = 360 - sumOf(angles);
    if (want < 10 || want >= 180) continue;
    const letter = rng.pick(LETTERS);
    return {
      prompt: [T.prose(`${named(n)[0].toUpperCase()}${named(n).slice(1)} has exterior angles of ${angles.slice(0, -1).map(deg).join(', ')}${n > 2 ? ' and ' : ''}${deg(angles[n - 2])}, and one more, ${letter}. What is ${letter}?`)],
      text: `missing exterior: ${angles.join(', ')}`,
      answer: { type: 'int', value: want },
      visual: null,
      explain: `The exterior angles of a polygon add to 360°, whatever its number of sides. The others make ${sumOf(angles)}, `
        + `so ${letter} = 360 − ${sumOf(angles)} = ${want}. So ${letter} = ${deg(want)}.`,
    };
  }
}

const VERDICTS = [
  { id: 'yes', label: 'Yes, they make a triangle' },
  { id: 'no', label: 'No' },
];

function inequality(rng, want = rng.pick(['yes', 'no'])) {
  const a = rng.int(2, 20), b = rng.int(2, 20);
  const lo = Math.abs(a - b), hi = a + b;
  let c;
  if (want === 'yes') {
    if (hi - lo < 3) return inequality(rng, want);
    c = rng.int(lo + 1, hi - 1);
  } else {
    // Mostly the near misses, just over the sum or just under the difference.
    // Exactly the sum, which lies flat, is kept but is the fewer: it is the
    // trick, and the idea is the gap closing.
    c = rng.pick([hi, hi + 1, hi + 1, hi + rng.int(2, 8), hi + rng.int(2, 8), lo, Math.max(1, lo - rng.int(1, 3)), Math.max(1, lo - rng.int(1, 3))]);
    if (c < 1) return inequality(rng, want);
  }
  const sides = rng.shuffle([a, b, c]);
  const [x, y, z] = [...sides].sort((p, q) => p - q);
  const ok = x + y > z;
  return {
    prompt: [T.prose(`Can sides of ${sides[0]}, ${sides[1]} and ${sides[2]} make a triangle?`)],
    text: `triangle sides: ${sides.join(', ')}`,
    answer: { type: 'choice', value: ok ? 'yes' : 'no', options: VERDICTS },
    visual: null,
    explain: `Only the longest side needs testing: are the other two, together, longer than it? ${x} + ${y} = ${x + y}, against ${z}. `
      + (ok ? `${x + y} is more than ${z}, so they meet above it. Yes.`
        : x + y === z ? `${x + y} is exactly ${z}, so the two shorter sides lie flat along the longest and close no gap. No.`
          : `${x + y} is less than ${z}, so the two shorter sides cannot reach across. No.`),
  };
}

// requiem: catalogue/content/third-side-range
/**
 * Two sides known, and the third side's range: more than their difference,
 * less than their sum. Asked as the longest or shortest whole length, since
 * the box takes one number.
 */
function thirdSide(rng) {
  const a = rng.int(2, 20), b = rng.int(2, 20);
  if (a === b && rng.chance(0.7)) return thirdSide(rng);
  const lo = Math.abs(a - b), hi = a + b;
  const reasons = `The third side has to be less than the other two added, ${a} + ${b} = ${hi}, or they could not reach around it; `
    + (lo ? `and more than their difference, ${Math.max(a, b)} − ${Math.min(a, b)} = ${lo}, or it could not reach across the gap between them. `
      : `and with two equal sides any length above 0 reaches across. `);
  // Mostly the range itself, written as the inequality it is.
  if (rng.chance(0.6)) {
    return {
      prompt: [T.prose(`Two sides of a triangle are ${a} and ${b}. What lengths can the third side, c, be? Write it as an inequality.`)],
      text: `third side range: ${a}, ${b}`,
      answer: { type: 'solutions', value: { letter: 'c', parts: [{ lo: { n: lo, d: 1 }, loIn: false, hi: { n: hi, d: 1 }, hiIn: false }] } },
      visual: null,
      explain: `${reasons}So ${lo} < c < ${hi}. (Neither end itself: at ${hi}${lo ? ` or ${lo}` : ''} the sides would lie flat.)`,
    };
  }
  const longest = rng.chance(0.5);
  const want = longest ? hi - 1 : lo + 1;
  return {
    prompt: [T.prose(`Two sides of a triangle are ${a} and ${b}. What is the ${longest ? 'longest' : 'shortest'} the third side can be, as a whole number?`)],
    text: `third side: ${a}, ${b}, ${longest ? 'longest' : 'shortest'}`,
    answer: { type: 'int', value: want },
    visual: null,
    explain: `${reasons}So ${lo} < third side < ${hi}, and the ${longest ? `longest whole length is ${hi} − 1 = ${want}. (${hi} itself would lie flat.)` : `shortest whole length is ${lo} + 1 = ${want}.${lo === 0 ? '' : ` (${lo} itself would lie flat.)`}`} So ${want}.`,
  };
}

const sides = (rng) => (rng.chance(0.3) ? thirdSide(rng) : inequality(rng));

const CONTENT = [angleSum, exterior, isosceles, polygonSum, regular, exteriorSum, sides];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}

