/**
 * Catalogue authoring tool: builds the problem library for congruent
 * triangles.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 *
 * Every `text` gives the congruence statement or the marked parts in the
 * first triangle's letters, so scripts/check-answers.py can work out the
 * matching, the criterion or the equation again from the letters alone.
 *
 * Both triangles are drawn to scale, the second turned and often flipped,
 * so the picture never hands over the matching by position. Equal sides
 * carry the same number of ticks, equal angles the same number of arcs.
 */
import * as T from '../terms.js';
import { minus } from '../../web/ui/dom.js';
import {
  LINE, GIVEN, ASKED, FRAME, fit, outline, centroid, sideLabel, rightMark, text, toward, linear, ascii, sized,
  fromAngles, fromSides, beside, cornerNames, ticks, arcs, cornerText, under,
} from './figures.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/congruence.js';

const RESULT = 'var(--result)';
export const ABC = 'ABC';
export const SECOND = ['DEF', 'PQR', 'XYZ', 'JKL', 'RST', 'LMN'];
export const SIDES = [[0, 1], [1, 2], [2, 0]];
export const PERMS = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
const num = (v) => minus(String(v));
const deg = (v) => `${v}°`;
const third = (i, j) => 3 - i - j;
/** The side between corners i and j, written in the order they come round: AB, BC, CA. */
export const sideName = (names, i, j) => ((j - i + 3) % 3 === 1 ? names[i] + names[j] : names[j] + names[i]);
const sideKey = (i, j) => sideName(ABC, i, j);

/** Three different angles, none tiny and none right, far enough apart to tell by eye. */
export function scalene(rng, top = 105) {
  for (;;) {
    const a = rng.int(32, top), b = rng.int(32, top), c = 180 - a - b;
    const all = [a, b, c];
    if (c < 32 || c > top || all.includes(90)) continue;
    if (Math.min(Math.abs(a - b), Math.abs(b - c), Math.abs(c - a)) < 12) continue;
    return all;
  }
}
/** Whole sides of a scalene triangle, no angle under about 25°. */
export function wholeSides(rng) {
  for (;;) {
    const s = [rng.int(4, 16), rng.int(4, 16), rng.int(4, 16)];
    if (new Set(s).size < 3) continue;
    const [x, y, z] = [...s].sort((p, q) => p - q);
    if (x + y < z + 3) continue;
    // Smallest angle, opposite the shortest side.
    const cos = (y * y + z * z - x * x) / (2 * y * z);
    if (cos > 0.9) continue;
    return s;   // AB, BC, CA
  }
}

/**
 * A pair of congruent triangles: the first, ABC, drawn with its corners
 * placed at random; the second its copy turned and maybe flipped, beside
 * it, corner i lettered by the matching `perm`.
 */
export function pair(rng, P, { second = rng.pick(SECOND), perm = rng.pick(PERMS.slice(1)), scale = 1 } = {}) {
  const turn = rng.pick([45, 60, 90, 120, 150, 180, 210, 240, 270, 300]) + rng.int(-10, 10), flip = rng.chance(0.5);
  const Q = beside(P, P, { turn, flip, scale });
  const names2 = perm.map((k) => second[k]);
  return { P, Q, second, perm, names2, flip, statement: names2.join('') };
}
/** The corners of ABC laid out from three positions, so A is not always bottom left. */
export function placed(rng, points, angles) {
  const order = rng.shuffle([0, 1, 2]);
  return { P: order.map((k) => points[k]), angles: angles && order.map((k) => angles[k]) };
}
/** A scalene triangle with whole sides, its corners placed at random: P, and L its sides AB, BC, CA. */
export function sided(rng) {
  const lens = wholeSides(rng), pts = fromSides(...lens);
  const { P } = placed(rng, pts);
  const L = SIDES.map(([i, j]) => {
    const key = [pts.indexOf(P[i]), pts.indexOf(P[j])].sort().join('');
    return { '01': lens[0], '12': lens[1], '02': lens[2] }[key];
  });
  return { P, L };
}
/** A scalene triangle from its angles, its corners placed at random: P, and the angle at each corner. */
export function angled(rng, angles = scalene(rng)) {
  return placed(rng, fromAngles(angles[0], angles[1]), angles);
}

/** Marks on one triangle T for a part: a side's ticks, an angle's arcs, a right angle's square. */
function partMarks(T, part, n, tone) {
  if (part.side) return ticks(T[part.side[0]], T[part.side[1]], n, tone);
  const v = part.angle ?? part.right, u = (v + 1) % 3, w = (v + 2) % 3;
  if (part.right !== undefined) return [{ ...rightMark(T[v], T[u], T[w]), ...(tone ? { tone } : {}) }];
  return arcs(T[v], T[u], T[w], n, tone);
}
const partKey = (part) => (part.side ? sideKey(...part.side) : `${part.right !== undefined ? 'right angle' : 'angle'} ${ABC[part.angle ?? part.right]}`);
const partWords = (names, part) => (part.side ? sideName(names, ...part.side) : `∠${names[part.angle ?? part.right]}`);

export function drawing(f, marks, reveal, k = 1.15) {
  const { P, Q, names2 } = f;
  return fit({ ...FRAME, marks: [...outline(P), ...outline(Q), ...cornerNames(P, ABC), ...cornerNames(Q, names2), ...marks],
    answer: reveal }, k);
}
/** The same part marked on both triangles: corner i of the first is corner i of the second. */
const both = (f, part, n, tone = LINE) => [...partMarks(f.P, part, n, tone), ...partMarks(f.Q, part, n, tone)];
export const matching = (f) => [0, 1, 2].map((i) => `${ABC[i]}↔${f.names2[i]}`).join(', ');

/** Solving a1·x + b1 = a2·x + b2, written out. */
export function solve(e1, e2) {
  const a1 = e1[0], a2 = e2[0];
  const [hi, lo] = a1 > a2 ? [e1, e2] : [e2, e1];
  const a = hi[0] - lo[0], rhs = lo[1] - hi[1], x = rhs / a;
  const lin = (e) => (e[0] === 0 ? num(e[1]) : linear(...e));
  const steps = [];
  if (lo[0] !== 0) steps.push(`take ${linear(lo[0], 0)} from both sides: ${linear(a, hi[1])} = ${num(lo[1])}`);
  if (hi[1] !== 0) steps.push(`${hi[1] > 0 ? `take away ${hi[1]}` : `add ${-hi[1]}`}: ${linear(a, 0)} = ${num(rhs)}`);
  if (a !== 1) steps.push(`divide by ${a}: x = ${num(x)}`);
  const told = steps.join('; ');
  return { x, work: `${lin(e1)} = ${lin(e2)}. ${told.charAt(0).toUpperCase()}${told.slice(1)}.` };
}
const valueAt = ([a, b], x) => a * x + b;
const putX = ([a, b], x) => `${a === 1 ? `${x}` : `${a}(${x})`}${b === 0 ? '' : b > 0 ? ` + ${b}` : ` − ${-b}`}`;
/** An expression in x worth `value` at `x`, with a coefficient other than `not`. */
function expr(rng, value, x, not = []) {
  const a = rng.pick(fitting(value, x).filter((c) => !not.includes(c)));
  return [a, value - a * x];
}
/** The coefficients that write `value` at `x` with a number part no bigger than 40. */
const fitting = (value, x) => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter((a) => Math.abs(value - a * x) <= 40);
/** An x that every one of `values` can be written in, three ways each, so the expressions can differ. */
function xFor(rng, values) {
  for (;;) {
    const x = rng.int(2, 12);
    if (values.every((v) => fitting(v, x).length >= 3)) return x;
  }
}

// ── Corresponding parts ─────────────────────────────────────────────────

function angleCorresponding(rng) {
  const { P, angles } = angled(rng);
  const f = pair(rng, P);
  const hidden = rng.int(0, 2), shown = [0, 1, 2].filter((v) => v !== hidden);
  const ask = rng.chance(0.4) ? hidden : rng.pick(shown);
  const value = angles[ask], name2 = f.names2[ask];
  const at = (T, v) => [T[v], T[(v + 1) % 3], T[(v + 2) % 3]];
  const labels = shown.map((v) => cornerText(...at(P, v), deg(angles[v])));
  const [s1, s2] = shown;
  const reach = ask === hidden
    ? `∠${ABC[ask]} is not given, but a triangle’s angles add to 180°: ∠${ABC[ask]} = 180 − ${angles[s1]} − ${angles[s2]} = ${value}°. `
    : `∠${ABC[ask]} is ${value}°. `;
  return {
    prompt: [T.prose(`△ABC ≅ △${f.statement}. ∠${ABC[s1]} = ${deg(angles[s1])} and ∠${ABC[s2]} = ${deg(angles[s2])}. What is ∠${name2}, in degrees?`)],
    text: `corresponding: ABC = ${f.statement}; angle ${ABC[s1]} ${angles[s1]}, angle ${ABC[s2]} ${angles[s2]}; find angle ${name2}`,
    answer: { type: 'int', value },
    visual: drawing(f, [...labels, ...arcs(...at(f.Q, ask), 1, ASKED), cornerText(...at(f.Q, ask), '?', ASKED)],
      [text_(under([...P, ...f.Q]), `∠${name2} = ${deg(value)}`)]),
    explain: `The order of the letters is the matching: ${matching(f)}. ${name2} is the partner of ${ABC[ask]}. ${reach}`
      + `(Not the angle that sits in the same place on the page: the second triangle is turned${f.flip ? ' and flipped' : ''}.) So ∠${name2} = ${value}°.`,
  };
}

function corresponds(rng) {
  return rng.chance(0.5) ? sideCorresponding(rng) : angleCorresponding(rng);
}

function sideCorresponding(rng) {
  const { P, L } = sided(rng);
  const f = pair(rng, P);
  const asked = rng.pick(SIDES), [i, j] = rng.chance(0.5) ? asked : [asked[1], asked[0]];
  const name2 = f.names2[i] + f.names2[j], value = L[SIDES.indexOf(asked)];
  const own = sideName(ABC, i, j);
  const c1 = centroid(P), c2 = centroid(f.Q);
  const labels = SIDES.map(([p, q], s) => sideLabel(P[p], P[q], `${L[s]}`, c1));
  return {
    prompt: [T.prose(`△ABC ≅ △${f.statement}. AB = ${L[0]}, BC = ${L[1]} and CA = ${L[2]}. What is ${name2}?`)],
    text: `corresponding: ABC = ${f.statement}; AB ${L[0]}, BC ${L[1]}, CA ${L[2]}; find ${name2}`,
    answer: { type: 'int', value },
    visual: drawing(f, [...labels, sideLabel(f.Q[i], f.Q[j], '?', c2, ASKED)], [sideLabel(f.Q[i], f.Q[j], `${value}`, c2, RESULT, 1.05)]),
    explain: `The order of the letters is the matching: ${matching(f)}. ${name2} joins the partners of ${ABC[i]} and ${ABC[j]}, `
      + `so it matches ${own}, which is ${value}. `
      + `(Matching by where the sides sit on the page goes wrong once the second triangle is turned or flipped.) So ${name2} = ${value}.`,
  };
}

// ── Name the congruence ─────────────────────────────────────────────────

function nameIt(rng) {
  const { P } = angled(rng);
  const perm = rng.chance(0.15) ? PERMS[0] : rng.pick(PERMS.slice(1));
  const f = pair(rng, P, { perm });
  const counts = rng.shuffle([1, 2, 3]);
  const bySides = rng.chance(0.5);
  const sec = f.second, alpha = sec;
  // The second triangle's own parts, in its letters' order, with their marks.
  const at = (T, v) => [T[v], T[(v + 1) % 3], T[(v + 2) % 3]];
  const marks = [];
  let said, work;
  if (bySides) {
    SIDES.forEach(([i, j], s) => marks.push(...ticks(P[i], P[j], counts[s]), ...ticks(f.Q[i], f.Q[j], counts[s])));
    // Side (i, j) of the second is between names2[i] and names2[j].
    const own = [[0, 1], [1, 2], [2, 0]].map(([p, q]) => {
      const i = f.names2.indexOf(sec[p]), j = f.names2.indexOf(sec[q]);
      return `${sec[p]}${sec[q]} ${counts[SIDES.findIndex(([a, b]) => (a === i && b === j) || (a === j && b === i))]}`;
    });
    said = `name the congruence: sides AB ${counts[0]}, BC ${counts[1]}, CA ${counts[2]}; ${own.join(', ')}`;
    const tickWord = (n) => `${n} tick${n > 1 ? 's' : ''}`;
    const corner = (v) => {
      const s1 = SIDES.findIndex(([a, b]) => a === v || b === v), s2 = SIDES.findIndex(([a, b], k) => k !== s1 && (a === v || b === v));
      return `${ABC[v]} is between the sides with ${tickWord(counts[s1])} and ${tickWord(counts[s2])}, and so is ${f.names2[v]}`;
    };
    work = `Each corner sits between two sides, so pair the corners by the marks on their sides. ${[0, 1, 2].map(corner).join('; ')}.`;
  } else {
    [0, 1, 2].forEach((v) => marks.push(...arcs(...at(P, v), counts[v]), ...arcs(...at(f.Q, v), counts[v])));
    const own = [0, 1, 2].map((k) => `${sec[k]} ${counts[f.names2.indexOf(sec[k])]}`);
    said = `name the congruence: angles A ${counts[0]}, B ${counts[1]}, C ${counts[2]}; ${own.join(', ')}`;
    work = `Equal arcs mark equal angles: ${[0, 1, 2].map((v) => `∠${ABC[v]} and ∠${f.names2[v]} both have ${counts[v]}`).join(', ')}.`;
  }
  const others = rng.shuffle(PERMS.map((p) => p.map((k) => sec[k]).join('')).filter((s) => s !== f.statement && s !== alpha));
  const ids = rng.shuffle([f.statement, ...(f.statement === alpha ? others.slice(0, 3) : [alpha, ...others.slice(0, 2)])]);
  return {
    prompt: [T.prose(`The marks show which parts of the two triangles are equal. Which congruence statement is right?`)],
    text: said,
    answer: { type: 'choice', value: f.statement, options: ids.map((id) => ({ id, label: `△ABC ≅ △${id}` })) },
    visual: drawing(f, marks, [text_(under([...P, ...f.Q]), `△ABC ≅ △${f.statement}`)]),
    explain: `${work} So A, B, C pair with ${f.names2.join(', ')}, written in that order. `
      + (f.statement === alpha
        ? `(Here the letters happen to come in alphabetical order, but only the marks can say so.) `
        : `(△ABC ≅ △${alpha}, in alphabetical order, would pair A with ${alpha[0]}, which the marks do not.) `)
      + `So △ABC ≅ △${f.statement}.`,
  };
}
const text_ = (at, label) => text(at, label, RESULT);

// ── Criteria ─────────────────────────────────────────────────────────────

const CRITERIA = ['sss', 'sas', 'asa', 'aas', 'hl'];
const OPTIONS = [
  { id: 'sss', label: 'SSS' }, { id: 'sas', label: 'SAS' }, { id: 'asa', label: 'ASA' },
  { id: 'aas', label: 'AAS' }, { id: 'hl', label: 'HL' },
];
const NONE = { id: 'none', label: 'Not enough' };

/** A triangle for a criterion, and the three parts it marks. */
function marked(rng, crit) {
  const side = (i, j) => ({ side: [Math.min(i, j), Math.max(i, j)].sort((a, b) => a - b) });
  const norm = (i, j) => SIDES.find(([a, b]) => (a === i && b === j) || (a === j && b === i));
  for (;;) {
    let angles;
    if (crit === 'hl') {
      const a = rng.int(28, 62);
      if (Math.abs(a - 45) < 8) continue;
      angles = rng.shuffle([90, a, 90 - a]);
    } else {
      angles = scalene(rng);
    }
    const pl = angled(rng, angles), pts = pl.P;
    angles = pl.angles;
    const v = rng.int(0, 2), u = (v + 1) % 3, w = (v + 2) % 3;
    const S = (i, j) => ({ side: norm(i, j) }), A = (i) => ({ angle: i });
    let parts, info = { v, u, w, angles };
    if (crit === 'sss') parts = [S(0, 1), S(1, 2), S(2, 0)];
    else if (crit === 'sas') parts = [S(v, u), S(v, w), A(v)];
    else if (crit === 'asa') parts = [A(v), A(u), S(v, u)];
    else if (crit === 'aas') {
      // Two angles, v and u, and a side not between them: opposite one of them.
      parts = [A(v), A(u), rng.chance(0.5) ? S(u, w) : S(v, w)];
    } else if (crit === 'hl') {
      const r = angles.indexOf(90), [p, q] = [(r + 1) % 3, (r + 2) % 3], leg = rng.pick([p, q]);
      parts = [{ right: r }, S(p, q), S(r, leg)];
      info = { r, hyp: norm(p, q), leg: norm(r, leg) };
    } else if (crit === 'ssa') {
      // requiem: catalogue/content/ssa-only-when-ambiguous
      // The angle at v, a side from it, and the side facing it -- shorter than
      // the first, so a second triangle really does fit the same marks.
      if (angles[v] >= 90) continue;
      const far = angles[u] > angles[w] ? u : w, near = far === u ? w : u;
      if (angles[v] >= angles[far]) continue;
      parts = [A(v), S(v, near), S(near, far)];
      info = { v, near, far, angles };
    } else {
      parts = [A(0), A(1), A(2)];
    }
    return { pts, angles, parts: rng.shuffle(parts), info };
  }
}

function criterionWork(crit, parts) {
  const sides = parts.filter((p) => p.side).map((p) => sideKey(...p.side));
  const angs = parts.filter((p) => p.angle !== undefined).map((p) => p.angle);
  const between = (i, j) => sideKey(i, j);
  if (crit === 'sss') return 'All three pairs of sides are marked equal. That is SSS.';
  if (crit === 'sas') {
    const [v] = angs;
    return `Two sides, ${sides[0]} and ${sides[1]}, are marked, and the marked angle, ∠${ABC[v]}, is at the corner where they meet: `
      + 'the angle between them. That is SAS. (An angle at another corner would make it SSA, which proves nothing.)';
  }
  if (crit === 'asa') {
    const [i, j] = angs;
    return `Two angles, ∠${ABC[i]} and ∠${ABC[j]}, are marked, and the marked side ${sides[0]} joins their corners: `
      + 'the side between them. That is ASA. (A side not between them would make it AAS.)';
  }
  if (crit === 'aas') {
    const [i, j] = angs;
    return `Two angles, ∠${ABC[i]} and ∠${ABC[j]}, are marked, and the marked side ${sides[0]} is not the one between them, `
      + `which would be ${between(i, j)}. That is AAS. (Two angles fix the third, so AAS proves as much as ASA.)`;
  }
  if (crit === 'hl') {
    const r = parts.find((p) => p.right !== undefined).right;
    const hyp = sideKey(...SIDES.find(([a, b]) => a !== r && b !== r));
    const leg = sides.find((s) => s !== hyp);
    return `Both are right triangles, the right angle at ${ABC[r]}. The marked sides are the hypotenuse ${hyp}, opposite the right angle, `
      + `and a leg ${leg}. That is HL. (Two sides and an angle not between them is usually not enough, but with a right angle `
      + 'Pythagoras fixes the third side.)';
  }
  if (crit === 'ssa') {
    const [v] = angs;
    const shared = sides.map((s) => s.split('')).flat().find((c, k, all) => all.indexOf(c) !== k);
    const facing = sides.find((s) => !s.includes(ABC[v]));
    return `Two sides, ${sides[0]} and ${sides[1]}, are marked, and the marked angle, ∠${ABC[v]}, is not between them: SSA, which is not a criterion. `
      + `${facing} can swing about ${shared} and meet the other arm of ∠${ABC[v]} in two places, `
      + 'so two different triangles carry the same marks.';
  }
  return 'Three angles are marked and no side: AAA. That fixes the shape but not the size, so one triangle could be an enlargement '
    + 'of the other: similar, not necessarily congruent.';
}
const VERDICT = { sss: 'SSS', sas: 'SAS', asa: 'ASA', aas: 'AAS', hl: 'HL', ssa: 'not enough', aaa: 'not enough' };

function criterion(rng, enough, crit) {
  const m = marked(rng, crit);
  const f = pair(rng, m.pts);
  const marks = [];
  let count = { side: 0, angle: 0 };
  for (const part of m.parts) {
    const n = part.side ? ++count.side : part.angle !== undefined ? ++count.angle : 1;
    marks.push(...both(f, part, n));
  }
  const id = crit === 'ssa' || crit === 'aaa' ? 'none' : crit;
  const listed = m.parts.map(partKey).join(', ');
  return {
    prompt: [T.prose(enough
      ? `The marks show which parts of △ABC and △${f.statement} are equal. Do they prove the triangles congruent, and by which criterion?`
      : `The marks show which parts of △ABC and △${f.statement} are equal. Which criterion proves the triangles congruent?`)],
    text: `${enough ? 'enough' : 'criterion'}: ABC = ${f.statement}; ${listed}`,
    answer: { type: 'choice', value: id, options: enough ? [...OPTIONS, NONE] : OPTIONS },
    visual: drawing(f, marks, [text_(under([...f.P, ...f.Q]), VERDICT[crit] === 'not enough' ? 'Not enough' : VERDICT[crit])]),
    explain: `${criterionWork(crit, m.parts)} So ${VERDICT[crit] === 'not enough' ? 'not enough' : VERDICT[crit]}.`,
  };
}
const whichCriterion = (rng) => criterion(rng, false, rng.pick(CRITERIA));
function enoughOrNot(rng) {
  // Half of them fall short; most of the rest are the look-alikes, SAS and AAS.
  const crit = rng.chance(0.5) ? (rng.chance(0.65) ? 'ssa' : 'aaa') : rng.pick(['sas', 'sas', 'asa', 'aas', 'aas', 'hl', 'sss']);
  return criterion(rng, true, crit);
}

// ── The missing fact ────────────────────────────────────────────────────

function missing(rng) {
  const crit = rng.pick(CRITERIA);
  const norm = (i, j) => SIDES.find(([a, b]) => (a === i && b === j) || (a === j && b === i));
  for (;;) {
    let angles;
    if (crit === 'hl') {
      const a = rng.int(28, 62);
      if (Math.abs(a - 45) < 8) continue;
      angles = rng.shuffle([90, a, 90 - a]);
    } else angles = scalene(rng);
    const pl = angled(rng, angles), pts = pl.P;
    angles = pl.angles;
    const v = rng.int(0, 2), u = (v + 1) % 3, w = (v + 2) % 3;
    const S = (i, j) => ({ side: norm(i, j) }), A = (i) => ({ angle: i });
    let given, need, why, right = null;
    const nm = (p) => (p.side ? sideKey(...p.side) : `∠${ABC[p.angle]}`);
    if (crit === 'sss') {
      given = [S(v, u), S(u, w)]; need = S(w, v);
      why = `SSS needs all three pairs of sides, and two are known. The third is ${nm(need)}.`;
    } else if (crit === 'sas' && rng.chance(0.5)) {
      given = [S(v, u), S(v, w)]; need = A(v);
      why = `SAS needs the angle between the two known sides, at the corner where ${nm(given[0])} and ${nm(given[1])} meet: ∠${ABC[v]}. `
        + `(Another angle would be SSA, which proves nothing, and ${sideKey(u, w)} would be SSS, a different criterion.)`;
    } else if (crit === 'sas') {
      const o = rng.pick([u, w]), x = third(v, o);
      given = [A(v), S(v, o)]; need = S(v, x);
      why = `SAS needs two sides with the known angle between them. ∠${ABC[v]} sits between ${sideKey(v, o)} and ${sideKey(v, x)}, `
        + `so the other side is ${sideKey(v, x)}. (${sideKey(o, x)} does not touch ∠${ABC[v]}: that would be SSA.)`;
    } else if (crit === 'asa' && rng.chance(0.5)) {
      given = [A(v), A(u)]; need = S(v, u);
      why = `ASA needs the side between the two known angles, joining ${ABC[v]} and ${ABC[u]}: ${sideKey(v, u)}. `
        + '(Another side would make it AAS, a different criterion.)';
    } else if (crit === 'asa') {
      const o = rng.pick([u, w]);
      given = [A(v), S(v, o)]; need = A(o);
      why = `ASA needs the angles at both ends of the known side. ${sideKey(v, o)} runs from ${ABC[v]} to ${ABC[o]}, so ∠${ABC[o]}. `
        + `(∠${ABC[third(v, o)]} would leave the side not between the angles: AAS.)`;
    } else if (crit === 'aas') {
      const o = rng.pick([u, w]), x = third(v, o);
      given = [A(v), S(v, o)]; need = A(x);
      why = `AAS needs a second angle with the known side not between the two. ${sideKey(v, o)} runs from ${ABC[v]} to ${ABC[o]}, `
        + `so ∠${ABC[o]} would put it between them (ASA). The other, ∠${ABC[x]}, leaves it out.`;
    } else {
      right = angles.indexOf(90);
      const [p, q] = [(right + 1) % 3, (right + 2) % 3], leg = rng.pick([p, q]);
      given = [S(right, leg)]; need = S(p, q);
      why = `HL needs the hypotenuse and a leg. ${sideKey(right, leg)} touches the right angle at ${ABC[right]}, so it is a leg; `
        + `the hypotenuse is the side opposite the right angle, ${sideKey(p, q)}. (The other leg would make it SAS, not HL.)`;
    }
    const f = pair(rng, pts);
    const all = [S(0, 1), S(1, 2), S(2, 0), A(0), A(1), A(2)].filter((p) => p.angle !== right);
    const key = (p) => (p.side ? sideKey(...p.side) : `angle ${ABC[p.angle]}`);
    const taken = given.map(key);
    const options = all.filter((p) => !taken.includes(key(p)));
    const equal = (p) => `${partWords(ABC, p)} = ${partWords(f.names2, p)}`;
    const marks = [];
    let count = { side: 0, angle: 0 };
    for (const part of given) marks.push(...both(f, part, part.side ? ++count.side : ++count.angle));
    if (right !== null) marks.push(...both(f, { right }, 1));
    const needMarks = both(f, need, need.side ? count.side + 1 : count.angle + 1, ASKED);
    const label = { sss: 'SSS', sas: 'SAS', asa: 'ASA', aas: 'AAS', hl: 'HL' }[crit];
    return {
      prompt: [T.prose(right !== null
        ? `△ABC and △${f.statement} are right triangles, with the right angles at ${ABC[right]} and ${f.names2[right]}. `
          + `To prove them congruent by HL, you know ${equal(given[0])}. What else do you need?`
        : `To prove △ABC ≅ △${f.statement} by ${label}, you know ${equal(given[0])} and ${equal(given[1])}. What else do you need?`)],
      text: `missing for ${label}: ABC = ${f.statement}; ${right !== null ? `right angle ${ABC[right]}, ` : ''}${taken.join(', ')}`,
      answer: { type: 'choice', value: key(need), options: rng.shuffle(options).map((p) => ({ id: key(p), label: equal(p) })) },
      visual: drawing(f, marks, needMarks),
      explain: `${why} So ${equal(need)}.`,
    };
  }
}

// ── Isosceles and equilateral ───────────────────────────────────────────

/** An isosceles triangle with its apex lettered `apex`: legs `leg` long, base `base`. */
function isoTriangle(rng, leg, base) {
  const pts = fromSides(base, leg, leg);       // corners 0, 1 at the base, 2 the apex
  const apex = rng.int(0, 2), rest = [0, 1, 2].filter((v) => v !== apex);
  const order = rng.chance(0.5) ? rest : [rest[1], rest[0]];
  // Corner `apex` of ABC goes on top, the others along the base.
  const P = [];
  P[order[0]] = pts[0]; P[order[1]] = pts[1]; P[apex] = pts[2];
  return { P, apex, feet: order };
}

function isosceles(rng) {
  const kind = rng.pick(['sides', 'sides', 'angles', 'angles', 'equal', 'equal-angle']);
  const named = (i, j) => sideName(ABC, i, j);
  if (kind === 'equal-angle') {
    const x = xFor(rng, [60]), e = expr(rng, 60, x);
    const v = rng.int(0, 2);
    const P = fromSides(5, 5, 5);
    const c = centroid(P);
    const marks = [...outline(P), ...cornerNames(P, ABC), ...SIDES.flatMap(([i, j]) => ticks(P[i], P[j], 1)),
      cornerText(P[v], P[(v + 1) % 3], P[(v + 2) % 3], sized(e))];
    const s = solve(e, [0, 60]);
    return {
      prompt: [T.prose(`△ABC is equilateral, and ∠${ABC[v]} = ${sized(e)}. What is x?`)],
      text: `equilateral: angle ${ABC[v]} ${ascii(...e)}; find x`,
      answer: { type: 'int', value: x },
      visual: fit({ ...FRAME, marks, answer: [text_(under(P), `x = ${x}`)] }, 1.2),
      explain: `All three sides are equal, so all three angles are too, and they share 180°: each is 60°. So ${s.work} `
        + `Check: ${putX(e, x)} = 60. So x = ${x}.`,
    };
  }
  if (kind === 'equal') {
    const L = rng.int(6, 40), x = xFor(rng, [L]);
    const [i, j] = rng.pick(SIDES), [k, l] = rng.pick(SIDES.filter(([a, b]) => a !== i || b !== j));
    const e1 = expr(rng, L, x), e2 = expr(rng, L, x, [e1[0]]);
    const P = fromSides(5, 5, 5);
    const c = centroid(P);
    const askLen = rng.chance(0.3);
    const s = solve(e1, e2);
    const marks = [...outline(P), ...cornerNames(P, ABC), ...SIDES.flatMap(([p, q]) => ticks(P[p], P[q], 1)),
      sideLabel(P[i], P[j], linear(...e1), c), sideLabel(P[k], P[l], linear(...e2), c)];
    return {
      prompt: [T.prose(`△ABC is equilateral, with ${named(i, j)} = ${linear(...e1)} and ${named(k, l)} = ${linear(...e2)}. `
        + `${askLen ? `How long is each side?` : 'What is x?'}`)],
      text: `equilateral: ${named(i, j)} ${ascii(...e1)}, ${named(k, l)} ${ascii(...e2)}; find ${askLen ? 'side' : 'x'}`,
      answer: { type: 'int', value: askLen ? L : x },
      visual: fit({ ...FRAME, marks, answer: [text_(under(P), askLen ? `each side ${L}` : `x = ${x}`)] }, 1.2),
      explain: `Every side of an equilateral triangle is the same length, so ${s.work} `
        + (askLen ? `Then each side is ${putX(e1, x)} = ${L}. (x is not the answer: put it back in.) So each side is ${L}.`
          : `Check: both sides come to ${L}. So x = ${x}.`),
    };
  }
  // Isosceles: two legs of length L and a base, told by equal sides or equal angles.
  for (;;) {
    const L = rng.int(6, 36), B = rng.int(Math.ceil(0.55 * L), Math.floor(1.6 * L));
    if (B === L) continue;
    const x = xFor(rng, [L, B]);
    const { P, apex, feet } = isoTriangle(rng, L, B);
    const c = centroid(P);
    const [f1, f2] = feet;
    const e1 = expr(rng, L, x), e2 = expr(rng, L, x, [e1[0]]);
    const legs = [[apex, f1], [apex, f2]];
    const askLen = rng.chance(0.3);
    const s = solve(e1, e2);
    const leg1 = named(apex, f1), leg2 = named(apex, f2), base = named(f1, f2);
    if (kind === 'sides') {
      const marks = [...outline(P), ...cornerNames(P, ABC), ...legs.flatMap(([p, q]) => ticks(P[p], P[q], 1)),
        sideLabel(P[apex], P[f1], linear(...e1), c), sideLabel(P[apex], P[f2], linear(...e2), c), sideLabel(P[f1], P[f2], `${B}`, c)];
      return {
        prompt: [T.prose(`In △ABC, ${leg1} = ${leg2}. ${leg1} = ${linear(...e1)}, ${leg2} = ${linear(...e2)} and ${base} = ${B}. `
          + `${askLen ? `How long is ${leg1}?` : 'What is x?'}`)],
        text: `isosceles sides: ${leg1} = ${leg2}; ${leg1} ${ascii(...e1)}, ${leg2} ${ascii(...e2)}, ${base} ${B}; find ${askLen ? leg1 : 'x'}`,
        answer: { type: 'int', value: askLen ? L : x },
        visual: fit({ ...FRAME, marks, answer: [text_(under(P), askLen ? `${leg1} = ${L}` : `x = ${x}`)] }, 1.2),
        explain: `The marked sides are equal: ${s.work} `
          + (askLen ? `Then ${leg1} = ${putX(e1, x)} = ${L}. ` : `Check: both come to ${L}. `)
          + `(${base} = ${B} is the base, which need not match the other two.) So ${askLen ? `${leg1} = ${L}` : `x = ${x}`}.`,
      };
    }
    // Equal base angles: the sides facing them are the equal ones.
    const eB = expr(rng, B, x, [e1[0], e2[0]]);
    const at = (v) => [P[v], P[(v + 1) % 3], P[(v + 2) % 3]];
    const marks = [...outline(P), ...cornerNames(P, ABC), ...arcs(...at(f1), 1), ...arcs(...at(f2), 1),
      sideLabel(P[apex], P[f1], linear(...e1), c), sideLabel(P[apex], P[f2], linear(...e2), c), sideLabel(P[f1], P[f2], linear(...eB), c)];
    const parts = rng.shuffle([[leg1, e1], [leg2, e2], [base, eB]]);
    return {
      prompt: [T.prose(`In △ABC, ∠${ABC[f1]} = ∠${ABC[f2]}. ${parts.map(([n, e]) => `${n} = ${linear(...e)}`).join(', ').replace(/, ([^,]*)$/, ' and $1')}. `
        + `${askLen ? `How long is ${leg1}?` : 'What is x?'}`)],
      text: `isosceles angles: ${ABC[f1]} = ${ABC[f2]}; ${parts.map(([n, e]) => `${n} ${ascii(...e)}`).join(', ')}; find ${askLen ? leg1 : 'x'}`,
      answer: { type: 'int', value: askLen ? L : x },
      visual: fit({ ...FRAME, marks, answer: [text_(under(P), askLen ? `${leg1} = ${L}` : `x = ${x}`)] }, 1.2),
      explain: `Equal angles face equal sides. The side facing ∠${ABC[f1]} is ${leg2}, and the side facing ∠${ABC[f2]} is ${leg1}, so ${s.work} `
        + (askLen ? `Then ${leg1} = ${putX(e1, x)} = ${L}. ` : `Check: both come to ${L}. `)
        + `(${base} joins the two equal angles; it is the base, not one of the equal sides.) So ${askLen ? `${leg1} = ${L}` : `x = ${x}`}.`,
    };
  }
}

// ── Use the congruence ──────────────────────────────────────────────────

function useIt(rng) {
  const bySide = rng.chance(0.6);
  let P, values;
  if (bySide) ({ P, L: values } = sided(rng));            // AB, BC, CA
  else ({ P, angles: values } = angled(rng));             // at A, B, C
  const f = pair(rng, P);
  const parts = bySide ? SIDES : [0, 1, 2];
  const k = rng.int(0, 2), d = rng.pick([0, 1, 2].filter((i) => i !== k));
  const name1 = (i) => (bySide ? sideKey(...SIDES[i]) : `∠${ABC[i]}`);
  const name2 = (i) => (bySide ? sideName(f.names2, ...SIDES[i]) : `∠${f.names2[i]}`);
  const plain = (n) => n.replace('∠', 'angle ');
  const x = xFor(rng, [values[k], values[d]]);
  const e1 = expr(rng, values[k], x), e2 = expr(rng, values[k], x, [e1[0]]), e3 = expr(rng, values[d], x, [e1[0]]);
  const askPart = rng.chance(0.35);
  const s = solve(e1, e2);
  const show = (e) => (bySide ? linear(...e) : sized(e));
  const listed = rng.shuffle([[name2(k), e2], [name2(d), e3]]);
  const c1 = centroid(P), c2 = centroid(f.Q);
  const at = (T, v) => [T[v], T[(v + 1) % 3], T[(v + 2) % 3]];
  const label = (T, i, e, c) => (bySide ? sideLabel(T[SIDES[i][0]], T[SIDES[i][1]], linear(...e), c) : cornerText(...at(T, i), `${linear(...e)}°`));
  const marks = [label(P, k, e1, c1), label(f.Q, k, e2, c2), label(f.Q, d, e3, c2)];
  const value = values[k];
  const unit = bySide ? '' : '°';
  return {
    prompt: [T.prose(`△ABC ≅ △${f.statement}. ${name1(k)} = ${show(e1)}, ${listed[0][0]} = ${show(listed[0][1])} and `
      + `${listed[1][0]} = ${show(listed[1][1])}. ${askPart ? `What is ${name2(k)}${bySide ? '' : ', in degrees'}?` : 'What is x?'}`)],
    text: `use congruence: ABC = ${f.statement}; ${plain(name1(k))} ${ascii(...e1)}, ${listed.map(([n, e]) => `${plain(n)} ${ascii(...e)}`).join(', ')}; `
      + `find ${askPart ? plain(name2(k)) : 'x'}`,
    answer: { type: 'int', value: askPart ? value : x },
    visual: drawing(f, marks, [text_(under([...P, ...f.Q]), askPart ? `${name2(k)} = ${value}${unit}` : `x = ${x}`)]),
    explain: `The order of the letters is the matching: ${matching(f)}. So ${name1(k)} matches ${name2(k)}, and corresponding parts of `
      + `congruent triangles are equal: ${s.work} `
      + (askPart ? `Then ${name2(k)} = ${putX(e2, x)} = ${value}${unit}. ` : `Check: both come to ${value}${unit}. `)
      + `(${name2(d)} matches ${name1(d)}, not ${name1(k)}.) So ${askPart ? `${name2(k)} = ${value}${unit}` : `x = ${x}`}.`,
  };
}

const CONTENT = [corresponds, nameIt, whichCriterion, enoughOrNot, missing, isosceles, useIt];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
