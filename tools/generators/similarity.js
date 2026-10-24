/**
 * Catalogue authoring tool: builds the problem library for similar figures.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 *
 * Every `text` gives the similarity statement or the lengths, angles and
 * scale, so scripts/check-answers.py can work the factor and the answer
 * again from the numbers alone.
 *
 * Similar triangles are drawn to scale, the second turned and often
 * flipped. Scale drawings and the area and volume level are asked in words:
 * a picture of two similar solids adds nothing the numbers do not say.
 */
import * as T from '../terms.js';
import { minus } from '../../web/ui/dom.js';
import {
  LINE, ASKED, FRAME, fit, outline, centroid, sideLabel, rightMark, text, toward, dec, f, under,
  fromAngles, fromSides, cornerNames, cornerText, dirTo, dashed,
} from './figures.js';
import { ABC, SIDES, sideName, wholeSides, placed, pair, drawing, matching } from './congruence.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/similarity.js';

const RESULT = 'var(--result)';
// requiem: catalogue/content/us-notation
// What the student reads groups thousands with commas; the text field keeps
// the bare number for the checker.
const num = (v) => minus(f(v)).replace(/^(−?\d+)(\d{3})(?!\d)/, '$1,$2');
const deg = (v) => `${v}°`;
/** True when v needs no more than one decimal place. */
const tidy = (v) => Math.abs(v * 10 - Math.round(v * 10)) < 1e-9;
/** a ÷ b written out: exact when it ends within four places (7 ÷ 112 = 0.0625), otherwise rounded with ≈. */
function quotient(a, b) {
  const q = a / b;
  return Math.abs(q * 10000 - Math.round(q * 10000)) < 1e-9 ? `${num(a)} ÷ ${num(b)} = ${num(q)}` : `${num(a)} ÷ ${num(b)} ≈ ${num(Math.round(q * 100) / 100)}`;
}
const result = (at, label) => text(at, label, RESULT);
const sideKey = (i, j) => sideName(ABC, i, j);

/** Factors that end, both ways round: 2 and 0.5, 2.5 and 0.4, 1.25 and 0.8. */
const FACTORS = [0.4, 0.5, 0.8, 1.25, 1.5, 2, 2.5];
const ENDS = (k) => [0.4, 0.5, 0.8, 1.25, 2, 2.5].includes(k);

/**
 * A pair of similar triangles, ABC with whole sides and its image scaled by
 * `r` (second over first). Both drawn so the larger is about the usual size.
 */
function similarPair(rng, r) {
  const lens = wholeSides(rng);
  const longest = Math.min(5, 5 / r);
  const pts = fromSides(...lens, longest);
  const { P } = placed(rng, pts);
  const L = SIDES.map(([i, j]) => {
    const key = [pts.indexOf(P[i]), pts.indexOf(P[j])].sort().join('');
    return { '01': lens[0], '12': lens[1], '02': lens[2] }[key];
  });
  const fp = pair(rng, P, { scale: r });
  return { ...fp, L, L2: L.map((v) => v * r) };
}

// ── Scale factor ────────────────────────────────────────────────────────

function scaleFactor(rng) {
  for (;;) {
    const fromFirst = rng.chance(0.6);
    const s = fromFirst ? rng.pick(FACTORS) : rng.pick(FACTORS.filter(ENDS));
    const r = fromFirst ? s : 1 / s;          // second triangle over first
    const fp = similarPair(rng, r);
    if (!fp.L2.every(tidy)) continue;
    const k = rng.int(0, 2), others = [0, 1, 2].filter((i) => i !== k);
    const [d1, d2] = rng.shuffle(others);
    const n1 = (i) => sideKey(...SIDES[i]), n2 = (i) => sideName(fp.names2, ...SIDES[i]);
    const c1 = centroid(fp.P), c2 = centroid(fp.Q);
    const label = (T, i, v, c) => sideLabel(T[SIDES[i][0]], T[SIDES[i][1]], num(v), c);
    const marks = [label(fp.P, k, fp.L[k], c1), label(fp.P, d1, fp.L[d1], c1), label(fp.Q, k, fp.L2[k], c2), label(fp.Q, d2, fp.L2[d2], c2)];
    const [first, second] = [`△ABC`, `△${fp.statement}`];
    const [from, to] = fromFirst ? [first, second] : [second, first];
    const [top, bottom] = fromFirst ? [fp.L2[k], fp.L[k]] : [fp.L[k], fp.L2[k]];
    return {
      prompt: [T.prose(`△ABC ∼ △${fp.statement}. ${n1(k)} = ${num(fp.L[k])}, ${n1(d1)} = ${num(fp.L[d1])}, `
        + `${n2(k)} = ${num(fp.L2[k])} and ${n2(d2)} = ${num(fp.L2[d2])}. What is the scale factor from ${from} to ${to}?`)],
      text: `scale factor: ABC ~ ${fp.statement}; ${n1(k)} ${f(fp.L[k])}, ${n1(d1)} ${f(fp.L[d1])}, ${n2(k)} ${f(fp.L2[k])}, `
        + `${n2(d2)} ${f(fp.L2[d2])}; from ${fromFirst ? 'ABC' : fp.statement}`,
      answer: dec(s),
      visual: drawing(fp, marks, [result(under([...fp.P, ...fp.Q]), `factor ${num(s)}`)], 1),
      explain: `The letters give the matching: ${matching(fp)}. So ${n2(k)} matches ${n1(k)}, and those are the only matching pair given `
        + `(${n2(d2)} matches ${n1(d2)}, which is not given). The factor from ${from} to ${to} is a side of ${to} divided by `
        + `the side it matches in ${from}: ${quotient(top, bottom)}. (Dividing the other way, ${num(bottom)} ÷ ${num(top)}, gives the factor `
        + `from ${to} back to ${from}.) So ${num(s)}.`,
    };
  }
}

// ── Missing side ────────────────────────────────────────────────────────

function missingSide(rng) {
  for (;;) {
    const r = rng.pick([0.5, 0.75, 1.5, 2, 2.5, 3, 1.25].filter((v) => v <= 2.5));
    const fp = similarPair(rng, r);
    if (!fp.L2.every(tidy)) continue;
    const k = rng.int(0, 2), m = rng.pick([0, 1, 2].filter((i) => i !== k));
    const backward = rng.chance(0.35);       // given the second triangle's two sides, find one of the first's
    const n1 = (i) => sideKey(...SIDES[i]), n2 = (i) => sideName(fp.names2, ...SIDES[i]);
    const c1 = centroid(fp.P), c2 = centroid(fp.Q);
    const label = (T, i, v, c, tone) => sideLabel(T[SIDES[i][0]], T[SIDES[i][1]], v, c, tone);
    const [known, other] = backward ? [fp.L2, fp.L] : [fp.L, fp.L2];
    const [nk, no] = backward ? [n2, n1] : [n1, n2];
    const [Tk, To, ck, co] = backward ? [fp.Q, fp.P, c2, c1] : [fp.P, fp.Q, c1, c2];
    const factor = other[k] / known[k], value = other[m];
    // Going back to the first triangle, the factor may not end (1 ÷ 1.5), so divide by the forward one instead.
    const ends = Math.abs(factor * 1000 - Math.round(factor * 1000)) < 1e-9;
    const step = ends ? `${num(known[m])} × ${num(factor)} = ${num(value)}` : `${num(known[m])} ÷ ${num(known[k] / other[k])} = ${num(value)}`;
    const how = ends ? `${quotient(other[k], known[k])} times its match`
      : `its match divided by ${quotient(known[k], other[k]).split(' = ')[1]} (${num(known[k])} ÷ ${num(other[k])})`;
    const marks = [label(Tk, k, num(known[k]), ck), label(Tk, m, num(known[m]), ck), label(To, k, num(other[k]), co),
      label(To, m, '?', co, ASKED)];
    const given = [[nk(k), known[k]], [nk(m), known[m]], [no(k), other[k]]];
    return {
      prompt: [T.prose(`△ABC ∼ △${fp.statement}. ${given.map(([n, v]) => `${n} = ${num(v)}`).join(', ').replace(/, ([^,]*)$/, ' and $1')}. `
        + `What is ${no(m)}?`)],
      text: `similar missing: ABC ~ ${fp.statement}; ${given.map(([n, v]) => `${n} ${f(v)}`).join(', ')}; find ${no(m)}`,
      answer: dec(value),
      visual: drawing(fp, marks, [label(To, m, num(value), co, RESULT, 1.05)], 1),
      explain: `The letters give the matching: ${matching(fp)}. ${no(k)} matches ${nk(k)}, so every side of the `
        + `${backward ? 'first' : 'second'} triangle is ${how}. ${no(m)} matches ${nk(m)}: ${step}. `
        + `(Adding the difference, ${num(known[m])} ${other[k] < known[k] ? '−' : '+'} ${num(Math.abs(other[k] - known[k]))}, keeps the gap the same, not the shape.) So ${no(m)} = ${num(value)}.`,
    };
  }
}

// ── Similar or not ──────────────────────────────────────────────────────

const YESNO = [{ id: 'yes', label: 'Similar' }, { id: 'no', label: 'Not similar' }];

function threeAngles(rng) {
  for (;;) {
    const a = rng.int(30, 110), b = rng.int(30, 110), c = 180 - a - b;
    if (c < 30 || c > 110 || new Set([a, b, c]).size < 3 || [a, b, c].includes(90)) continue;
    return [a, b, c];
  }
}

function similarOrNot(rng) {
  const yes = rng.chance(0.5);
  const kind = rng.pick(['aa', 'aa', 'aa', 'sss', 'sss', 'sas']);
  const second = rng.pick(['DEF', 'PQR', 'XYZ', 'JKL']);
  if (kind === 'aa') {
    for (;;) {
      const one = threeAngles(rng);
      const shown1 = rng.shuffle([0, 1, 2]).slice(0, 2);
      let two = rng.shuffle([...one]);
      if (!yes) {
        const i = rng.int(0, 2), j = (i + 1) % 3, d = rng.pick([-1, 1]) * rng.int(4, 12);
        two = two.map((v, k) => (k === i ? v + d : k === j ? v - d : v));
        const sorted = (xs) => [...xs].sort((p, q) => p - q).join();
        if (two.some((v) => v < 30 || v > 110 || v === 90) || sorted(two) === sorted(one)) continue;
      }
      const shown2 = rng.shuffle([0, 1, 2]).slice(0, 2);
      const g1 = shown1.map((i) => one[i]), g2 = shown2.map((i) => two[i]);
      const t1 = 180 - g1[0] - g1[1], t2 = 180 - g2[0] - g2[1];
      const set = (xs) => [...xs].sort((p, q) => p - q).map(deg).join(', ');
      const P = fromAngles(one[0], one[1], 4.2), Q0 = fromAngles(two[0], two[1], 4.2 * rng.pick([0.7, 0.8, 1.2, 1.35]));
      const Q = moveBeside(P, Q0, rng);
      const at = (Tr, v) => [Tr[v], Tr[(v + 1) % 3], Tr[(v + 2) % 3]];
      const marks = [...outline(P), ...outline(Q), ...cornerNames(P, ABC), ...cornerNames(Q, second),
        ...shown1.map((v) => cornerText(...at(P, v), deg(one[v]))), ...shown2.map((v) => cornerText(...at(Q, v), deg(two[v])))];
      const same = yes;
      return {
        prompt: [T.prose(`In △ABC, ∠${ABC[shown1[0]]} = ${deg(g1[0])} and ∠${ABC[shown1[1]]} = ${deg(g1[1])}. `
          + `In △${second}, ∠${second[shown2[0]]} = ${deg(g2[0])} and ∠${second[shown2[1]]} = ${deg(g2[1])}. Are the triangles similar?`)],
        text: `similar aa: ${g1.join(', ')}; ${g2.join(', ')}`,
        answer: { type: 'choice', value: yes ? 'yes' : 'no', options: YESNO },
        visual: fit({ ...FRAME, marks, answer: [result(under([...P, ...Q]), yes ? 'Similar (AA)' : 'Not similar')] }, 1.1),
        explain: `Find each third angle: △ABC has 180 − ${g1[0]} − ${g1[1]} = ${t1}°, so its angles are ${set([...g1, t1])}; `
          + `△${second} has 180 − ${g2[0]} − ${g2[1]} = ${t2}°, so ${set([...g2, t2])}. `
          + (same ? 'The angles match, so the shapes do: two equal angles are enough, since the third must follow. Similar (AA).'
            : 'They do not all match, so the shapes differ. (One equal angle is not enough.) Not similar.'),
      };
    }
  }
  if (kind === 'sss') {
    for (;;) {
      const one = wholeSides(rng), r = rng.pick([0.5, 1.5, 2, 2.5, 3]);
      let two = one.map((v) => v * r);
      if (!yes) {
        const i = rng.int(0, 2);
        two = two.map((v, k) => (k === i ? v + rng.pick([-2, -1, 1, 2]) : v));
      }
      if (!two.every(tidy)) continue;
      const [x, y, z] = two;
      if (x + y <= z + 1 || y + z <= x + 1 || x + z <= y + 1) continue;
      const s1 = [...one].sort((p, q) => p - q), s2 = [...two].sort((p, q) => p - q);
      const shown2 = rng.shuffle(two);
      const P = fromSides(...one, 3.6), Q = moveBeside(P, fromSides(...two, 3.6 * Math.min(1.35, Math.max(0.7, r))), rng);
      const c1 = centroid(P), c2 = centroid(Q);
      const marks = [...outline(P), ...outline(Q), ...cornerNames(P, ABC), ...cornerNames(Q, second),
        ...SIDES.map(([i, j], k) => sideLabel(P[i], P[j], num(one[k]), c1)), ...SIDES.map(([i, j], k) => sideLabel(Q[i], Q[j], num(two[k]), c2))];
      const ratios = s1.map((v, k) => quotient(s2[k], v));
      return {
        prompt: [T.prose(`△ABC has sides ${one.map(num).join(', ').replace(/, ([^,]*)$/, ' and $1')}. `
          + `△${second} has sides ${shown2.map(num).join(', ').replace(/, ([^,]*)$/, ' and $1')}. Are the triangles similar?`)],
        text: `similar sss: ${one.map(f).join(', ')}; ${shown2.map(f).join(', ')}`,
        answer: { type: 'choice', value: yes ? 'yes' : 'no', options: YESNO },
        visual: fit({ ...FRAME, marks, answer: [result(under([...P, ...Q]), yes ? 'Similar (SSS)' : 'Not similar')] }, 1.1),
        explain: `Match shortest with shortest, middle with middle, longest with longest (pair the sides by size; the order they are `
          + `listed in is not the matching), and divide: ${ratios.join(', ')}. `
          + (yes ? 'One ratio for all three pairs: similar (SSS).'
            : 'The ratios are not all the same, so one triangle is not a scaled copy of the other. Not similar.'),
      };
    }
  }
  for (;;) {
    // Two sides and the angle between them, at A and at the first letter of the second.
    const c = rng.int(4, 14), b = rng.int(4, 14), A = rng.int(35, 110);
    if (c === b || A === 90) continue;
    const r = rng.pick([0.5, 1.5, 2, 2.5, 3]);
    let c2 = c * r, b2 = b * r, A2 = A;
    const how = yes ? 'same' : rng.pick(['angle', 'side']);
    if (how === 'angle') A2 = A + rng.pick([-1, 1]) * rng.int(6, 15);
    if (how === 'side') b2 += rng.pick([-2, -1, 1, 2]);
    if (!tidy(c2) || !tidy(b2) || A2 >= 150 || A2 === 90) continue;
    // Paired the other way round, the sides might still be in one ratio: then it is similar after all.
    if (!yes && A2 === A && Math.abs(c2 * c - b2 * b) < 1e-9) continue;
    const tri = (cc, bb, ang, k) => {
      const s = (3.6 * k) / Math.max(cc, bb);
      return [[0, 0], [cc * s, 0], [bb * s * Math.cos(ang * Math.PI / 180), bb * s * Math.sin(ang * Math.PI / 180)]];
    };
    const P = tri(c, b, A, 1), Q = moveBeside(P, tri(c2, b2, A2, Math.min(1.35, Math.max(0.7, r))), rng);
    const c1 = centroid(P), cq = centroid(Q);
    const marks = [...outline(P), ...outline(Q), ...cornerNames(P, ABC), ...cornerNames(Q, second),
      sideLabel(P[0], P[1], num(c), c1), sideLabel(P[0], P[2], num(b), c1), cornerText(P[0], P[1], P[2], deg(A)),
      sideLabel(Q[0], Q[1], num(c2), cq), sideLabel(Q[0], Q[2], num(b2), cq), cornerText(Q[0], Q[1], Q[2], deg(A2))];
    const [s0, s1, s2] = second;
    const ra = quotient(c2, c), rb = quotient(b2, b);
    return {
      prompt: [T.prose(`In △ABC, AB = ${num(c)}, AC = ${num(b)} and ∠A = ${deg(A)}. In △${second}, ${s0}${s1} = ${num(c2)}, `
        + `${s0}${s2} = ${num(b2)} and ∠${s0} = ${deg(A2)}. Are the triangles similar?`)],
      text: `similar sas: ${c}, ${b}, angle ${A}; ${f(c2)}, ${f(b2)}, angle ${A2}`,
      answer: { type: 'choice', value: yes ? 'yes' : 'no', options: YESNO },
      visual: fit({ ...FRAME, marks, answer: [result(under([...P, ...Q]), yes ? 'Similar (SAS)' : 'Not similar')] }, 1.1),
      explain: `The angles given are the ones between the two sides. Compare the sides around them: ${ra} and ${rb}. `
        + (how === 'same' ? `One ratio, and the angles between them are both ${deg(A)}: similar (SAS).`
          : how === 'angle' ? `The ratios match, but the angles between the sides, ${deg(A)} and ${deg(A2)}, do not. Not similar.`
            : 'The two ratios differ, so the sides are not scaled by one factor. Not similar.'),
    };
  }
}

/** A second triangle placed to the right of the first, turned a little, maybe flipped. */
function moveBeside(P, Q0, rng) {
  const c = centroid(Q0), t = (rng.int(-25, 25) * Math.PI) / 180, flip = rng.chance(0.4) ? -1 : 1;
  const moved = Q0.map(([x, y]) => {
    const dx = flip * (x - c[0]), dy = y - c[1];
    return [dx * Math.cos(t) - dy * Math.sin(t), dx * Math.sin(t) + dy * Math.cos(t)];
  });
  const right = Math.max(...P.map((p) => p[0])), left = Math.min(...moved.map((p) => p[0]));
  const mid = (Math.min(...P.map((p) => p[1])) + Math.max(...P.map((p) => p[1]))) / 2;
  const own = (Math.min(...moved.map((p) => p[1])) + Math.max(...moved.map((p) => p[1]))) / 2;
  return moved.map(([x, y]) => [Math.round((x - left + right + 1.8) * 100) / 100, Math.round((y - own + mid) * 100) / 100]);
}

// ── Scale drawings ──────────────────────────────────────────────────────

// requiem: catalogue/content/units-both-systems
// Every plan in both systems: centimeters on the paper standing for meters
// or kilometers, and inches standing for feet or miles, as a US road map and
// a US house plan are drawn. `on` is the unit measured on the paper.
/** "1 inch", "3.5 inches". */
const inches = (n) => `${n} ${n === '1' ? 'inch' : 'inches'}`;
const CM = { on: 'cm', one: 'centimeter', many: 'cm', plural: 'centimeters', say: (n) => `${n} cm` };
const INCH = { on: 'in', one: 'inch', many: 'inches', plural: 'inches', say: inches };
const PLANS = [
  { what: 'map', paper: CM, unit: 'km', per: [2, 5, 10, 20, 25, 50], thing: (n) => `Two towns are ${n} cm apart on the map`,
    ask: 'How far apart are they', real: (n) => `Two towns are ${n} km apart`, back: 'How far apart are they on the map', size: [2, 500] },
  { what: 'floor plan', paper: CM, unit: 'm', per: [0.5, 1.5, 2, 2.5, 3, 4, 5], thing: (n) => `A wall is ${n} cm long on the plan`,
    ask: 'How long is the real wall', real: (n) => `A wall is ${n} m long`, back: 'How long is it on the plan', size: [2, 30] },
  { what: 'drawing of a garden', paper: CM, unit: 'm', per: [0.5, 2, 2.5, 4, 5], thing: (n) => `A path is ${n} cm long on the drawing`,
    ask: 'How long is the real path', real: (n) => `A path is ${n} m long`, back: 'How long is it on the drawing', size: [2, 60] },
  { what: 'map', paper: INCH, unit: 'mi', per: [5, 10, 20, 25, 50], thing: (n) => `Two towns are ${inches(n)} apart on the map`,
    ask: 'How far apart are they', real: (n) => `Two towns are ${n} miles apart`, back: 'How far apart are they on the map', size: [2, 500] },
  { what: 'floor plan', paper: INCH, unit: 'ft', per: [2, 4, 5, 8, 10], thing: (n) => `A wall is ${inches(n)} long on the plan`,
    ask: 'How long is the real wall', real: (n) => `A wall is ${n} ft long`, back: 'How long is it on the plan', size: [2, 30] },
  { what: 'drawing of a garden', paper: INCH, unit: 'ft', per: [2, 4, 5, 10], thing: (n) => `A path is ${inches(n)} long on the drawing`,
    ask: 'How long is the real path', real: (n) => `A path is ${n} ft long`, back: 'How long is it on the drawing', size: [2, 60] },
];
// A room is a few meters or a few tens of feet across, so the area question
// keeps to the scales a house plan uses: 1 cm for 10 m made a 1,400 m² room.
const ROOMS = [{ paper: CM, unit: 'm', per: [0.5, 1, 1.5, 2] }, { paper: INCH, unit: 'ft', per: [2, 4, 5] }];
// requiem: catalogue/content/believable-sizes
// Each model's scale with the sizes the real thing comes in, in meters, so the
// model's own length is drawn from what that makes: a 1 : 24 car is 6 to 9
// inches, never 1 inch (a 2 ft car) or 60 cm (a 14 m one).
const MODELS = [['car', 24, 'long', 3.5, 5.5], ['ship', 200, 'long', 40, 250], ['plane', 72, 'long', 12, 70],
  ['train car', 87, 'long', 15, 26], ['house', 20, 'tall', 6, 12], ['bridge', 500, 'long', 100, 1200], ['tower', 250, 'tall', 30, 300]];
const WORD = { km: 'kilometers', m: 'meters', mi: 'miles', ft: 'feet' };
/** A model's two units: the one it is measured in, the bigger one, and how many of the first make one of the second. */
const MODEL_UNITS = [
  { small: 'cm', smallWord: 'centimeters', big: 'm', bigWord: 'meters', per: 100, perSay: 'There are 100 cm in a meter', perMeter: 100 },
  { small: 'in', smallWord: 'inches', big: 'ft', bigWord: 'feet', per: 12, perSay: 'There are 12 inches in a foot', perMeter: 1 / 0.0254 },
];

function scaleDrawing(rng) {
  const kind = rng.pick(['out', 'out', 'back', 'per', 'model', 'area']);
  if (kind === 'model') {
    for (;;) {
      const [thing, n, way, lo, hi] = rng.pick(MODELS);
      const u = rng.pick(MODEL_UNITS), inBig = rng.chance(0.5);
      // Every whole or half model length that makes a real one in range, with an answer to two places.
      const fits = [];
      for (let m2 = Math.ceil((2 * lo * u.perMeter) / n); m2 <= (2 * hi * u.perMeter) / n; m2++) {
        if (tidy((((m2 / 2) * n) / (inBig ? u.per : 1)) * 10)) fits.push(m2 / 2);
      }
      const whole = fits.filter(Number.isInteger);
      if (!fits.length) continue;
      const model = rng.pick(whole.length && rng.chance(0.7) ? whole : fits);
      const real = model * n;
      const value = inBig ? real / u.per : real;
      const said = u.small === 'in' ? inches(num(model)) : `${num(model)} cm`;
      return {
        prompt: [T.prose(`A model ${thing} is built to a scale of 1 : ${n}. The model is ${said} ${way}. `
          + `How ${way} is the real ${thing}, in ${inBig ? u.bigWord : u.smallWord}?`)],
        text: `scale model: 1:${n}; ${f(model)} ${u.small}; in ${inBig ? u.big : u.small}`,
        answer: dec(value),
        visual: null,
        explain: `1 : ${n} means every length on the real ${thing} is ${n} times the model’s, in the same unit. `
          + `${num(model)} × ${n} = ${num(real)} ${u.small}. `
          + (inBig ? `${u.perSay}: ${num(real)} ÷ ${u.per} = ${num(value)}. (The scale has no units of its own, so the answer comes out in ${u.smallWord} first.) So ${num(value)} ${u.big}.`
            : `(Not ${num(model)} ÷ ${n}: the real ${thing} is the bigger one.) So ${num(value)} ${u.small}.`),
      };
    }
  }
  if (kind === 'area') {
    const room = rng.pick(ROOMS), per = rng.pick(room.per), unit = room.unit, on = room.paper.on;
    for (;;) {
      const w = rng.int(2, 9) / (rng.chance(0.3) ? 2 : 1), h = rng.int(2, 9) / (rng.chance(0.3) ? 2 : 1);
      if (w === h) continue;
      const W = w * per, H = h * per, area = W * H;
      // A room 2 to 9 m (6 to 30 ft) each way, not 0.5 m by 3 m.
      const [least, most] = unit === 'ft' ? [6, 30] : [2, 9];
      if (!tidy(W) || !tidy(H) || !tidy(area * 10) || Math.min(W, H) < least || Math.max(W, H) > most) continue;
      return {
        prompt: [T.prose(`On a floor plan, 1 ${room.paper.one} stands for ${num(per)} ${unit}. A room is drawn `
          + `${num(w)} ${on} by ${num(h)} ${on}. What is its real floor area, in ${unit}²?`)],
        text: `scale area: 1 ${on} = ${f(per)} ${unit}; ${f(w)} ${on} by ${f(h)} ${on}`,
        answer: dec(area),
        visual: null,
        explain: `Scale each length first: ${num(w)} × ${num(per)} = ${num(W)} ${unit} and ${num(h)} × ${num(per)} = ${num(H)} ${unit}. `
          + `Then the area: ${num(W)} × ${num(H)} = ${num(area)} ${unit}². (Scaling the drawn area, ${num(w * h)} × ${num(per)}, `
          + `multiplies by the scale only once, but an area has two lengths in it.) So ${num(area)} ${unit}².`,
      };
    }
  }
  const plan = rng.pick(PLANS), per = rng.pick(plan.per), unit = plan.unit, paper = plan.paper, on = paper.on;
  for (;;) {
    const drawn = rng.int(2, 40) / (rng.chance(0.4) ? 2 : 1) / (rng.chance(0.3) ? 5 : 1);
    if (!tidy(drawn)) continue;
    const real = drawn * per;
    // A real wall or path its own size (a floor-plan wall in feet up to 100 ft).
    const [least, most] = plan.size.map((v) => (unit === 'ft' ? v * 3 : v));
    if (!tidy(real) || real < least || real > most) continue;
    if (kind === 'out') {
      return {
        prompt: [T.prose(`On a ${plan.what}, 1 ${paper.one} stands for ${num(per)} ${unit}. ${plan.thing(num(drawn))}. ${plan.ask}, in ${unit}?`)],
        text: `scale drawing: 1 ${on} = ${f(per)} ${unit}; ${f(drawn)} ${on} out`,
        answer: dec(real),
        visual: null,
        explain: `Each ${paper.one} on the ${plan.what} is ${num(per)} ${unit}, so ${paper.say(num(drawn))} is ${num(drawn)} × ${num(per)} = ${num(real)} ${unit}. `
          + `(Dividing would make the real thing smaller than its picture.) So ${num(real)} ${unit}.`,
      };
    }
    if (kind === 'back') {
      return {
        prompt: [T.prose(`On a ${plan.what}, 1 ${paper.one} stands for ${num(per)} ${unit}. ${plan.real(num(real))}. `
          + `${plan.back}, in ${paper.many}?`)],
        text: `scale drawing: 1 ${on} = ${f(per)} ${unit}; ${f(real)} ${unit} back`,
        answer: dec(drawn),
        visual: null,
        explain: `Every ${num(per)} ${unit} takes 1 ${paper.one}, so count how many ${num(per)}s fit in ${num(real)}: ${quotient(real, per)}. `
          + `(Multiplying, ${num(real)} × ${num(per)}, scales the wrong way.) So ${paper.say(num(drawn))}.`,
      };
    }
    // The scale from one measured line.
    const drawnLine = rng.int(2, 8), perCm = per;
    const realLine = drawnLine * perCm;
    if (!tidy(realLine)) continue;
    return {
      prompt: [T.prose(`On a ${plan.what}, a line ${drawnLine} ${paper.many} long stands for ${num(realLine)} ${unit}. How many ${WORD[unit]} does 1 ${paper.one} stand for?`)],
      text: `scale drawing: ${drawnLine} ${on} = ${f(realLine)} ${unit}; per ${on}`,
      answer: dec(perCm),
      visual: null,
      explain: `Share the real length among the ${paper.plural}: ${quotient(realLine, drawnLine)} ${unit} for each ${paper.one}. `
        + `(${drawnLine} ÷ ${num(realLine)} would be ${paper.plural} per ${unit}, the other way round.) So 1 ${paper.one} stands for ${num(perCm)} ${unit}.`,
    };
  }
}

// ── Area and volume scale ───────────────────────────────────────────────

const FLAT = ['triangles', 'rectangles', 'hexagons', 'pentagons', 'trapezoids', 'kites'];
const SOLID = ['cylinders', 'cones', 'prisms', 'pyramids', 'boxes', 'cans'];
const PAIRS = [[1, 2], [1, 3], [2, 3], [2, 5], [4, 5], [1, 4], [3, 4], [1, 5], [3, 5], [2, 1], [3, 2], [5, 2], [5, 4], [5, 3], [4, 1]];

function areaVolume(rng) {
  const solid = rng.chance(0.45), power = solid ? 3 : 2, word = solid ? 'volume' : 'area';
  const sq = solid ? '³' : '²', shape = rng.pick(solid ? SOLID : FLAT);
  const kind = rng.pick(['up', 'up', 'down', 'factor', 'side']);
  // requiem: catalogue/content/units-both-systems
  // Measured in centimeters or in inches, half each.
  const [cm, cms] = rng.pick([['cm', 'cm'], ['in', 'inches']]);
  const long = (v) => (cm === 'in' ? inches(num(v)) : `${num(v)} cm`);
  if (kind === 'up' || kind === 'down') {
    for (;;) {
      const k = rng.pick([2, 3, 4, 5, 1.5, 2.5].filter((v) => !solid || v <= 4));
      const small = rng.int(2, 30), big = small * k ** power;
      if (!tidy(big) || big > 5000) continue;
      const up = kind === 'up';
      const value = up ? big : small;
      return {
        prompt: [T.prose(`Two similar ${shape} have a scale factor of ${num(k)} from the smaller to the larger. `
          + `The ${up ? 'smaller' : 'larger'} has ${word === 'area' ? 'an area' : 'a volume'} of ${num(up ? small : big)} ${cm}${sq}. `
          + `What is the ${word} of the ${up ? 'larger' : 'smaller'}, in ${cm}${sq}?`)],
        text: `${word} scale: factor ${f(k)}; ${word} ${f(up ? small : big)}; ${up ? 'larger' : 'smaller'}`,
        answer: dec(value),
        visual: null,
        explain: `${solid ? 'A volume has three lengths multiplied in it' : 'An area has two lengths multiplied in it'}, so it grows by the factor `
          + `${solid ? 'cubed' : 'squared'}: ${num(k)}${sq} = ${num(k ** power)}. `
          + (up ? `${num(small)} × ${num(k ** power)} = ${num(big)}.` : `${num(big)} ÷ ${num(k ** power)} = ${num(small)}.`)
          + ` (${up ? `${num(small)} × ${num(k)}` : `${num(big)} ÷ ${num(k)}`} scales it like a length.) So ${num(value)} ${cm}${sq}.`,
      };
    }
  }
  for (;;) {
    const [u, v] = rng.pick(PAIRS), s = rng.int(1, solid ? 5 : 12);
    const a = s * u ** power, b = s * v ** power, k = v / u;
    if (!tidy(k * 10) || a === b) continue;
    if (kind === 'factor') {
      return {
        prompt: [T.prose(`Two similar ${shape} have ${word}s of ${a} ${cm}${sq} and ${b} ${cm}${sq}. `
          + `What is the scale factor for lengths from the first to the second?`)],
        text: `length from ${word}s: ${a}, ${b}`,
        answer: dec(k),
        visual: null,
        explain: `The ${word}s are in the ratio ${quotient(b, a)}, which is the length factor ${solid ? 'cubed' : 'squared'}. `
          + `Undo that with a ${solid ? 'cube' : 'square'} root: ${solid ? '∛' : '√'}${num(b / a)} = ${num(k)}. `
          + `(${num(b / a)} itself is the ${word} factor, not the length one.) So ${num(k)}.`,
      };
    }
    const side = rng.int(2, 12) * (rng.chance(0.3) ? 0.5 : 1), other = side * k;
    if (!tidy(other)) continue;
    return {
      prompt: [T.prose(`Two similar ${shape} have ${word}s of ${a} ${cm}${sq} and ${b} ${cm}${sq}. A side of the first is ${long(side)}. `
        + `How long is the matching side of the second, in ${cms}?`)],
      text: `side from ${word}s: ${a}, ${b}; side ${f(side)}`,
      answer: dec(other),
      visual: null,
      explain: `The ${word}s are in the ratio ${quotient(b, a)}: the length factor ${solid ? 'cubed' : 'squared'}. So lengths scale by `
        + `${solid ? '∛' : '√'}${num(b / a)} = ${num(k)}, and the side is ${num(side)} × ${num(k)} = ${num(other)}. `
        + `(Multiplying by ${num(b / a)} would scale it like ${word === 'area' ? 'an area' : 'a volume'}.) So ${long(other)}.`,
    };
  }
}

// ── Side splitter ───────────────────────────────────────────────────────

/** An arrowhead a third of the way along a segment, pointing from P toward Q: it is parallel to another with the same. */
function arrows(P, Q, tone = LINE) {
  const d = dirTo(P, Q), m = [P[0] + (Q[0] - P[0]) * 0.3, P[1] + (Q[1] - P[1]) * 0.3];
  return [{ kind: 'path', tone, points: [toward(d + 150, 0.24, m), m, toward(d - 150, 0.24, m)] }];
}

function sideSplitter(rng) {
  const kind = rng.pick(['EC', 'AE', 'DE', 'DB']);
  for (;;) {
    const AD = rng.int(2, 12), DB = rng.int(2, 12), s = rng.pick([0.5, 0.75, 1, 1.25, 1.5, 2, 2.5]);
    const AE = AD * s, EC = DB * s, AB = AD + DB, AC = AE + EC;
    if (!tidy(AE) || !tidy(EC) || AD === DB && rng.chance(0.7) || Math.max(AD, DB) > 2 * Math.min(AD, DB)) continue;
    // BC: given when DE or DB is asked; otherwise only drawn.
    const BC = rng.int(Math.max(3, Math.ceil(Math.abs(AB - AC)) + 2), Math.floor(AB + AC) - 2);
    const DE = (BC * AD) / AB;
    if ((kind === 'DE' || kind === 'DB') && !tidy(DE)) continue;
    const pts = fromSides(BC, AC, AB, 5);      // B, C, A: A on top
    const [B, C, A] = pts;
    // Each angle at least 25°, so the figure reads.
    const ang = (V, U, W) => Math.abs(((dirTo(V, U) - dirTo(V, W) + 540) % 360) - 180);
    if ([ang(A, B, C), ang(B, A, C), ang(C, A, B)].some((x) => x < 40)) continue;
    // D and E are lettered inside the small triangle, in the corner at each,
    // since the side's lengths are written just outside them.
    const between = (V, U, W) => {
      const u = [U[0] - V[0], U[1] - V[1]], w = [W[0] - V[0], W[1] - V[1]];
      const lu = Math.hypot(...u), lw = Math.hypot(...w), b = [u[0] / lu + w[0] / lw, u[1] / lu + w[1] / lw], lb = Math.hypot(...b);
      return [V[0] + (0.42 * b[0]) / lb, V[1] + (0.42 * b[1]) / lb];
    };
    const at = (from, to, t) => [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t];
    const D = at(A, B, AD / AB), E = at(A, C, AE / AC);
    const c = centroid([A, B, C]);
    const lab = (P, Q, v, tone, gap) => sideLabel(P, Q, v, c, tone, gap);
    const given = {
      EC: [['AD', AD], ['DB', DB], ['AE', AE]], AE: [['AD', AD], ['DB', DB], ['EC', EC]],
      DE: [['AD', AD], ['DB', DB], ['BC', BC]], DB: [['AD', AD], ['DE', DE], ['BC', BC]],
    }[kind];
    const value = { EC, AE, DE, DB }[kind];
    const seg = { AD: [A, D], DB: [D, B], AE: [A, E], EC: [E, C], BC: [B, C], DE: [D, E] };
    const place = (name, v, tone, gap) => (name === 'DE'
      ? sideLabel(D, E, v, [(B[0] + C[0]) / 2, (B[1] + C[1]) / 2], tone, gap)
      : lab(...seg[name], v, tone, gap));
    const marks = [...outline([A, B, C]), { kind: 'segment', from: D, to: E, tone: LINE }, ...arrows(D, E), ...arrows(B, C),
      ...cornerNames([A, B, C], 'ABC'), text(between(D, A, E), 'D', LINE), text(between(E, A, D), 'E', LINE),
      ...given.map(([n, v]) => place(n, num(v))), place(kind, '?', ASKED)];
    const sentence = given.map(([n, v]) => `${n} = ${num(v)}`).join(', ').replace(/, ([^,]*)$/, ' and $1');
    let work;
    if (kind === 'EC') {
      work = `A line parallel to one side splits the other two in the same ratio: AD/DB = AE/EC. So ${num(AD)}/${num(DB)} = ${num(AE)}/EC, `
        + `and EC = ${num(AE)} × ${num(DB)} ÷ ${num(AD)} = ${num(EC)}. Check: AE is ${num(s)} times AD, and EC is ${num(s)} times DB.`;
    } else if (kind === 'AE') {
      work = `A line parallel to one side splits the other two in the same ratio: AD/DB = AE/EC. So ${num(AD)}/${num(DB)} = AE/${num(EC)}, `
        + `and AE = ${num(AD)} × ${num(EC)} ÷ ${num(DB)} = ${num(AE)}. Check: EC is ${num(s)} times DB, and AE is ${num(s)} times AD.`;
    } else if (kind === 'DE') {
      work = `DE ∥ BC makes △ADE similar to △ABC: they share ∠A, and the parallel lines make the other angles equal. So DE/BC = AD/AB, `
        + `where AB is the whole side, ${num(AD)} + ${num(DB)} = ${num(AB)}. DE = ${num(BC)} × ${num(AD)} ÷ ${num(AB)} = ${num(DE)}. `
        + `(AD/DB compares a piece with a piece; DE goes with the whole side.)`;
    } else {
      work = `DE ∥ BC makes △ADE similar to △ABC, so DE/BC = AD/AB. The whole side AB = ${num(AD)} × ${num(BC)} ÷ ${num(DE)} = ${num(AB)}, `
        + `and the piece DB = ${num(AB)} − ${num(AD)} = ${num(DB)}. (AB is the whole side; DB is only the part below D.)`;
    }
    return {
      prompt: [T.prose(`In △ABC, D is on AB and E is on AC, with DE parallel to BC. ${sentence}. What is ${kind}?`)],
      text: `side splitter: ${given.map(([n, v]) => `${n} ${f(v)}`).join(', ')}; find ${kind}`,
      answer: dec(value),
      visual: fit({ ...FRAME, marks, answer: [place(kind, num(value), RESULT, 1.1)] }, 1.2),
      explain: `${work} So ${kind} = ${num(value)}.`,
    };
  }
}

// ── Altitude to the hypotenuse ──────────────────────────────────────────

function altitude(rng) {
  const kind = rng.pick(['CD', 'CD', 'piece', 'leg', 'leg', 'foot']);
  const nearA = rng.chance(0.5);
  for (;;) {
    let p, q;       // AD and DB
    if (kind === 'CD' || kind === 'piece') {
      // requiem: catalogue/content/altitude-pieces-not-only-whole
      // s may be a half, so the pieces can be 2.5 and 10 (CD 5) as well as 4 and 9.
      const s = rng.int(1, 10) / 2, u = rng.int(1, 5), v = rng.int(1, 6);
      if (u === v) continue;
      p = s * u * u; q = s * v * v;
    } else {
      // A leg squared is its piece times the whole hypotenuse: piece s·u², whole s·w².
      const s = rng.int(1, 8) / 2, u = rng.int(1, 4), w = rng.int(u + 1, 6);
      const piece = s * u * u, whole = s * w * w;
      [p, q] = nearA ? [piece, whole - piece] : [whole - piece, piece];
    }
    const c = p + q, h = Math.sqrt(p * q), AC = Math.sqrt(p * c), BC = Math.sqrt(q * c);
    if (c > 120 || p < 1 || q < 1 || Math.max(p, q) / Math.min(p, q) > 6) continue;
    const scale = 7 / c;
    const A = [0, 0], B = [7, 0], D = [p * scale, 0], C = [p * scale, h * scale];
    const named = { AD: p, DB: q, AB: c, CD: h, AC, BC };
    let given, ask, work;
    const [seg, other, leg] = nearA ? ['AD', 'DB', 'AC'] : ['DB', 'AD', 'BC'];
    if (kind === 'CD') {
      given = ['AD', 'DB']; ask = 'CD';
      work = `The altitude cuts △ABC into two triangles similar to each other, △ACD and △CBD. Matching their sides, AD/CD = CD/DB, `
        + `so CD² = AD × DB = ${num(p)} × ${num(q)} = ${num(p * q)}, and CD = √${num(p * q)} = ${num(h)}. `
        + `(Not the average, (${num(p)} + ${num(q)}) ÷ 2: the altitude is the geometric mean of the two pieces.)`;
    } else if (kind === 'piece') {
      given = ['CD', seg]; ask = other;
      work = `The two small triangles, △ACD and △CBD, are similar, so AD/CD = CD/DB: CD² = AD × DB. `
        + `${num(h)}² = ${num(h * h)}, so ${other} = ${num(h * h)} ÷ ${num(named[seg])} = ${num(named[other])}.`;
    } else if (kind === 'leg') {
      given = [seg, 'AB']; ask = leg;
      work = `△${nearA ? 'ACD' : 'BCD'} is similar to △ABC: they share ∠${nearA ? 'A' : 'B'}, and each has a right angle. `
        + `So ${seg}/${leg} = ${leg}/AB, and ${leg}² = ${seg} × AB = ${num(named[seg])} × ${num(c)} = ${num(named[seg] * c)}. `
        + `${leg} = √${num(named[seg] * c)} = ${num(named[leg])}. (AB is the whole hypotenuse, not the other piece.)`;
    } else {
      given = [leg, 'AB']; ask = seg;
      work = `△${nearA ? 'ACD' : 'BCD'} is similar to △ABC, so ${seg}/${leg} = ${leg}/AB, and ${seg} = ${leg}² ÷ AB = `
        + `${num(named[leg] ** 2)} ÷ ${num(c)} = ${num(named[seg])}. (The piece next to a leg is its own: ${leg} goes with ${seg}.)`;
    }
    const value = named[ask];
    if (![...given, ask].every((n) => tidy(named[n]))) continue;
    // requiem: catalogue/content/similarity-roots-known-on-sight
    // A root taken here should be one known on sight: nothing past 20².
    // A root the student takes comes out whole: √(2.5 × 10) = 5, never √20.25.
    if (kind === 'CD' || kind === 'piece' ? h > 20 : named[leg] > 20) continue;
    if ((kind === 'CD' && !Number.isInteger(h)) || (kind === 'leg' && !Number.isInteger(named[leg]))) continue;
    const segs = { AD: [A, D, 0.45], DB: [D, B, 0.45], AB: [A, B, 1.15], CD: [C, D, 0.45], AC: [A, C, 0.45], BC: [C, B, 0.45] };
    const place = (n, v, tone, extra = 0) => {
      const [P, Q, gap] = segs[n];
      const inside = n === 'CD' ? (nearA ? B : A) : n === 'AB' || n === 'AD' || n === 'DB' ? C : D;
      return sideLabel(P, Q, v, inside, tone, gap + extra);
    };
    const marks = [...outline([A, B, C]), dashed(C, D), rightMark(C, A, B), rightMark(D, B, C),
      text([-0.4, -0.3], 'A', LINE), text([7.4, -0.3], 'B', LINE), text([C[0], C[1] + 0.45], 'C', LINE), text([D[0], -0.45], 'D', LINE),
      ...given.map((n) => place(n, num(named[n]))), place(ask, '?', ASKED)];
    return {
      prompt: [T.prose(`△ABC has a right angle at C, and CD is the altitude to the hypotenuse AB. `
        + `${given.map((n) => `${n} = ${num(named[n])}`).join(' and ')}. What is ${ask}?`)],
      text: `altitude: ${given.map((n) => `${n} ${f(named[n])}`).join(', ')}; find ${ask}`,
      answer: dec(value),
      visual: fit({ ...FRAME, marks, answer: [place(ask, num(value), RESULT, 0.55)] }, 1),
      explain: `${work} So ${ask} = ${num(value)}.`,
    };
  }
}

const CONTENT = [scaleFactor, missingSide, similarOrNot, scaleDrawing, areaVolume, sideSplitter, altitude];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
