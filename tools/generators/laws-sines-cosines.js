/**
 * Catalogue authoring tool: builds the problem library for the laws of sines
 * and cosines.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 *
 * Triangles are ABC with side a across from A, b from B and c from C. Every
 * `text` lists what is known by those names, and scripts/check-answers.py
 * solves the triangle again: by coordinates for a side or an angle, so it
 * does not share the law the explanation uses, and with 4-place working
 * alongside to check the rounding.
 */
import * as T from '../terms.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/laws-sines-cosines.js';
import {
  sinD, cosD, asinD, acosD, four, at4, safeRound, roundedAnswer, roundedText, placeWords, placeText, triangleFigure,
} from './trig.js';

const UNITS = ['cm', 'm', 'in', 'ft'];
const SQUARE = { cm: 'square centimeters', m: 'square meters', in: 'square inches', ft: 'square feet', yd: 'square yards' };
const OPP = { a: 'A', b: 'B', c: 'C', A: 'a', B: 'b', C: 'c' };
const ANGLES = ['A', 'B', 'C'];
const sidesFrom = (A, B, C, k) => ({ a: k * sinD(A), b: k * sinD(B), c: k * sinD(C) });

// ── Sines: Side ─────────────────────────────────────────────────────────

function sinesSide(rng) {
  for (;;) {
    const [X, Y] = rng.shuffle(ANGLES).slice(0, 2);
    const Z = ANGLES.find((v) => v !== X && v !== Y);
    const ang = { [X]: rng.int(25, 110), [Y]: rng.int(20, 80) };
    ang[Z] = 180 - ang[X] - ang[Y];
    // Every angle at least 22°, so the figure is a triangle and not a sliver.
    if (Math.min(ang.A, ang.B, ang.C) < 22) continue;
    // The known side is across from one of the given angles (AAS) or from the
    // third angle (ASA, which needs 180° first).
    const knownSide = OPP[rng.pick([X, Y, Z])];
    const wantSide = OPP[rng.pick(ANGLES.filter((v) => v !== OPP[knownSide]))];
    const known = rng.int(5, 40);
    const k = known / sinD(ang[OPP[knownSide]]);
    const S = sidesFrom(ang.A, ang.B, ang.C, k);
    const x = S[wantSide];
    const alt = (known * four(sinD(ang[OPP[wantSide]]))) / four(sinD(ang[OPP[knownSide]]));
    const q = safeRound(x, 1, alt);
    if (q === null) continue;
    const unit = rng.pick(UNITS);
    const third = OPP[knownSide] === Z || OPP[wantSide] === Z;
    const KA = OPP[knownSide], WA = OPP[wantSide];
    return {
      prompt: [T.prose(`In triangle ABC, ${X} = ${ang[X]}°, ${Y} = ${ang[Y]}° and ${knownSide} = ${known} ${unit}. Find ${wantSide}, ${placeWords(1)}.`)],
      text: `sines side: ${X} ${ang[X]}, ${Y} ${ang[Y]}, ${knownSide} ${known}; want ${wantSide}${placeText(1)}`,
      answer: roundedAnswer(q, 1),
      visual: triangleFigure(S.a, S.b, S.c, { angles: { [X]: `${ang[X]}°`, [Y]: `${ang[Y]}°` }, sides: { [knownSide]: `${known} ${unit}`, [wantSide]: '?' }, asked: wantSide, reveal: `${roundedText(q, 1)} ${unit}` }),
      explain: `${third ? `First the third angle: ${Z} = 180° − ${ang[X]}° − ${ang[Y]}° = ${ang[Z]}°. ` : ''}`
        + `${knownSide} is across from ${KA} and ${wantSide} across from ${WA}, so the law of sines pairs them: ${wantSide}/sin ${WA} = ${knownSide}/sin ${KA}. `
        + `${wantSide} = ${known} × sin ${ang[WA]}° ÷ sin ${ang[KA]}° ≈ ${at4(x)}, which is ${roundedText(q, 1)} ${placeWords(1)}. `
        + `(Each side goes over the sine of the angle across from it, not one beside it.) So ${wantSide} ≈ ${roundedText(q, 1)} ${unit}.`,
    };
  }
}

// ── Sines: Angle ────────────────────────────────────────────────────────

// requiem: catalogue/content/ssa-says-which-triangle
/**
 * About 30% of rows are the ambiguous case, two triangles, split between
 * asking for the acute B and the obtuse one; those name the triangle meant.
 * The rest have one triangle and say nothing about it: with one triangle
 * "find B" has one answer, and a sentence saying so would do the a ≥ b
 * check for the student.
 */
function sinesAngle(rng) {
  const ask = rng.chance(0.3) ? rng.pick(['acute', 'obtuse']) : 'one';
  for (;;) {
    // Known: angle A, side a across from it, and side b; wanted: B.
    const A = ask === 'one' ? rng.int(25, 120) : rng.int(22, 65);
    const a = rng.int(6, 40), b = rng.int(4, 40);
    const s = (b * sinD(A)) / a;
    if (s >= 0.98) continue;
    const acute = asinD(s);
    // a ≥ b, or A not acute, leaves one triangle: B is the acute value.
    // Otherwise there are two.
    if (A >= 90 && a <= b) continue;
    const one = a >= b || A >= 90;
    if (one !== (ask === 'one')) continue;
    const which = one ? 'acute' : ask;
    const B = which === 'acute' ? acute : 180 - acute;
    if (A + B >= 175 || (!one && 180 - acute <= 90 + 2)) continue;
    const alt = which === 'acute' ? asinD(four((b * four(sinD(A))) / a)) : 180 - asinD(four((b * four(sinD(A))) / a));
    const q = safeRound(B, 0, alt);
    if (q === null) continue;
    const C = 180 - A - B;
    if (B < 20 || C < 20) continue;
    const unit = rng.pick(UNITS);
    const k = a / sinD(A);
    const ask2 = one ? `Find B, ${placeWords(0, true)}.`
      : `Two triangles fit these measurements. Find B in the one where B is ${which}, ${placeWords(0, true)}.`;
    return {
      prompt: [T.prose(`In triangle ABC, A = ${A}°, a = ${a} ${unit} and b = ${b} ${unit}. ${ask2}`)],
      text: `sines angle: A ${A}, a ${a}, b ${b}; want ${one ? '' : `${which} `}B${placeText(0)}`,
      answer: roundedAnswer(q, 0),
      visual: triangleFigure(k * sinD(A), k * sinD(B), k * sinD(C), { angles: { A: `${A}°`, B: '?' }, sides: { a: `${a} ${unit}`, b: `${b} ${unit}` }, asked: 'B', reveal: `${q}°` }),
      explain: `a is across from A and b from B, so sin B/${b} = sin ${A}°/${a}, and sin B = ${b} × sin ${A}° ÷ ${a} ≈ ${at4(s)}. `
        + `sin⁻¹(${at4(s)}) ≈ ${at4(acute)}°${which === 'obtuse' ? `, and the obtuse angle with the same sine is 180° − ${at4(acute)}° ≈ ${at4(B)}°` : ''}, which is ${q}° ${placeWords(0, true)}. `
        + `(${which === 'obtuse' ? 'The calculator gives only the acute angle; its supplement has the same sine.' : one ? `The supplement 180° − B also has this sine, but ${A >= 90 ? `with A = ${A}° already obtuse` : `with a ≥ b, B is no bigger than A, so`} it would leave no room for the triangle.` : 'The obtuse supplement is the other triangle, not this one.'}) So B ≈ ${q}°.`,
    };
  }
}

// ── Cosines: Side ───────────────────────────────────────────────────────

// requiem: catalogue/content/believable-sizes
// Each scene has its own units and sizes: a lake is hundreds of feet or
// meters across, boats go miles or kilometers, a drawn triangle any unit.
const SCENES = [
  { units: [['ft', 'feet', 10], ['m', 'meters', 5], ['yd', 'yards', 5]],
    say: (p, q, t, u) => `A surveyor stands where she can see both ends of a lake. One end is ${p} ${u} away and the other ${q} ${u}, and the angle between her lines of sight is ${t}°. How long is the lake, in ${u}, ${placeWords(1)}?` },
  { units: [['mi', 'miles', 1], ['km', 'kilometers', 1]],
    say: (p, q, t, u) => `Two boats leave a dock together. One travels ${p} ${u} and the other ${q} ${u}, on courses ${t}° apart. How far apart are they, in ${u}, ${placeWords(1)}?` },
];

function cosinesSide(rng) {
  const scene = rng.chance(0.3) ? rng.pick(SCENES) : null;
  const [unit, word, scale] = scene ? rng.pick(scene.units) : [rng.pick(UNITS), null, 1];
  for (;;) {
    const C = rng.int(20, 150);
    const a = rng.int(4, 40) * scale, b = rng.int(4, 40) * scale;
    if (Math.max(a, b) > 3 * Math.min(a, b)) continue;
    const c2 = a * a + b * b - 2 * a * b * cosD(C);
    const c = Math.sqrt(c2), alt = Math.sqrt(a * a + b * b - 2 * a * b * four(cosD(C)));
    const q = safeRound(c, 1, alt);
    if (q === null) continue;
    const prompt = scene ? scene.say(a, b, C, word)
      : `In triangle ABC, a = ${a} ${unit}, b = ${b} ${unit} and C = ${C}°. Find c, ${placeWords(1)}.`;
    return {
      prompt: [T.prose(prompt)],
      text: `cosines side: a ${a}, b ${b}, C ${C}; want c${placeText(1)}`,
      answer: roundedAnswer(q, 1),
      visual: triangleFigure(a, b, c, { angles: { C: `${C}°` }, sides: { a: `${a} ${unit}`, b: `${b} ${unit}`, c: '?' }, asked: 'c', reveal: `${roundedText(q, 1)} ${unit}` }),
      explain: `The ${C}° angle is between the two known sides, so no angle-side pair is known and the law of cosines is the tool: `
        + `c² = ${a}² + ${b}² − 2 × ${a} × ${b} × cos ${C}° ≈ ${at4(c2)}, and c ≈ ${at4(c)}, which is ${roundedText(q, 1)} ${placeWords(1)}. `
        + `(${C > 90 ? `cos ${C}° is negative, so the subtraction adds: the side across from an obtuse angle is the longest.` : `Subtract 2ab cos C from a² + b² before taking the root, not after.`}) So c ≈ ${roundedText(q, 1)} ${unit}.`,
    };
  }
}

// ── Cosines: Angle ──────────────────────────────────────────────────────

function cosinesAngle(rng) {
  for (;;) {
    const s = [rng.int(4, 30), rng.int(4, 30), rng.int(4, 30)].sort((x, y) => x - y);
    if (s[0] + s[1] <= s[2] + 1) continue;
    const [a, b, c] = rng.shuffle(s);
    const want = rng.pick(ANGLES);
    const opp = { A: a, B: b, C: c }[want];
    const [p, r] = want === 'A' ? [b, c] : want === 'B' ? [a, c] : [a, b];
    const cosv = (p * p + r * r - opp * opp) / (2 * p * r);
    const x = acosD(cosv), alt = acosD(four(cosv));
    const q = safeRound(x, 0, alt);
    const least = Math.min(...[[a, b, c], [b, c, a], [c, a, b]].map(([u, v, w]) => acosD((u * u + v * v - w * w) / (2 * u * v))));
    if (q === null || least < 18) continue;
    const unit = rng.pick(UNITS);
    return {
      prompt: [T.prose(`In triangle ABC, a = ${a} ${unit}, b = ${b} ${unit} and c = ${c} ${unit}. Find ${want}, ${placeWords(0, true)}.`)],
      text: `cosines angle: a ${a}, b ${b}, c ${c}; want ${want}${placeText(0)}`,
      answer: roundedAnswer(q, 0),
      visual: triangleFigure(a, b, c, { angles: { [want]: '?' }, sides: { a: `${a}`, b: `${b}`, c: `${c}` }, asked: want, reveal: `${q}°` }),
      explain: `With all three sides, the law of cosines solved for the angle: cos ${want} = (${p}² + ${r}² − ${opp}²) / (2 × ${p} × ${r}) = ${String(p * p + r * r - opp * opp).replace('-', '−')}/${2 * p * r} ≈ ${at4(cosv)}. `
        + `${want} = cos⁻¹(${at4(cosv)}) ≈ ${at4(x)}°, which is ${q}° ${placeWords(0, true)}. `
        + `(The side squared and subtracted is the one across from ${want}: ${opp}. ${cosv < 0 ? 'A negative cosine means the angle is obtuse.' : ''}) So ${want} ≈ ${q}°.`.replace(' )', ')'),
    };
  }
}

// ── Which Law? ──────────────────────────────────────────────────────────

const LAW_OPTIONS = [
  { id: 'right', label: 'Right-triangle ratios (SOH CAH TOA)' },
  { id: 'sines', label: 'The law of sines' },
  { id: 'cosines', label: 'The law of cosines' },
];

function whichLaw(rng) {
  const kind = rng.pick(['AAS', 'ASA', 'SSA', 'SAS', 'SSS', 'right']);
  const n = () => rng.int(4, 30), t = () => rng.int(25, 75);
  let given, want, law, why;
  if (kind === 'right') {
    given = { C: 90, A: t(), c: n() }; want = 'a'; law = 'right';
    why = 'C is a right angle, so a is opposite A and c is the hypotenuse: sin A = a/c does it in one step';
  } else if (kind === 'AAS') {
    given = { A: t(), B: t(), a: n() }; want = 'b'; law = 'sines';
    why = 'A and its opposite side a are both known, a full pair, so the law of sines gives b from B';
  } else if (kind === 'ASA') {
    given = { A: t(), B: t(), c: n() }; want = 'a'; law = 'sines';
    why = 'C = 180° − A − B, which pairs with c: a full angle-side pair, so the law of sines';
  } else if (kind === 'SSA') {
    const b = n();
    given = { A: t(), a: b + rng.int(1, 10), b }; want = 'B'; law = 'sines';
    why = 'A and a are a full pair, so the law of sines gives sin B from b';
  } else if (kind === 'SAS') {
    given = { a: n(), b: n(), C: rng.pick([rng.int(20, 80), rng.int(100, 140)]) }; want = 'c'; law = 'cosines';
    why = 'C is between the two known sides, and no angle is known with the side across from it, so the law of cosines';
  } else {
    const s = [n(), n()];
    given = { a: s[0], b: s[1], c: rng.int(Math.abs(s[0] - s[1]) + 2, s[0] + s[1] - 2) }; want = rng.pick(ANGLES); law = 'cosines';
    why = 'Only sides are known, no angle at all, so the law of cosines solved for an angle';
  }
  const say = Object.entries(given).map(([k, v]) => `${k} = ${v}${/[A-Z]/.test(k) ? '°' : ''}`);
  const trap = law === 'cosines' ? 'The law of sines needs an angle and the side across from it; here there is none.'
    : law === 'sines' ? 'The law of cosines would work only after more steps; the known pair makes sines direct.'
      : 'The laws work too, but a right angle makes the plain ratio the shortest way.';
  return {
    prompt: [T.prose(`In triangle ABC, ${say.slice(0, -1).join(', ')} and ${say[say.length - 1]}. Which is the most direct way to find ${want}?`)],
    text: `which law: ${Object.entries(given).map(([k, v]) => `${k} ${v}`).join(', ')}; want ${want}`,
    answer: { type: 'choice', value: law, options: LAW_OPTIONS },
    visual: null,
    explain: `${why}. (${trap}) So ${LAW_OPTIONS.find((o) => o.id === law).label.replace(/^The/, 'the').replace(/^Right/, 'right')}.`,
  };
}

// ── How Many Triangles? ─────────────────────────────────────────────────

const COUNT_OPTIONS = [{ id: '0', label: 'No triangle' }, { id: '1', label: 'Exactly one' }, { id: '2', label: 'Two' }];

function howMany(rng) {
  // An obtuse A in about a quarter of rows, with no triangle as often as
  // one; an acute A split among none, one and two.
  const [want, obtuse] = rng.pick([['0', false], ['1', false], ['2', false], ['2', false], ['0', false], ['1', false], ['0', true], ['1', true]]);
  for (;;) {
    const A = obtuse ? rng.int(95, 130) : rng.int(20, 70);
    const b = rng.int(6, 30);
    const h = b * sinD(A);
    let a;
    if (A >= 90) a = want === '1' ? rng.int(b + 1, b + 15) : rng.int(Math.max(2, b - 10), b);
    else if (want === '0') a = rng.int(2, Math.max(2, Math.floor(h)));
    else if (want === '2') a = rng.int(Math.ceil(h), b - 1);
    else if (rng.chance(0.25) && A === 30 && b % 2 === 0) a = b / 2;
    else a = rng.int(b, b + 15);
    // Clear of the edges: a must not be within 0.3 of the height unless it is exactly it.
    const exact = A === 30 && 2 * a === b;
    if (!exact && Math.abs(a - h) < 0.3) continue;
    const count = A >= 90 ? (a > b ? '1' : '0') : exact ? '1' : a < h ? '0' : a >= b ? '1' : '2';
    if (count !== want) continue;
    const unit = rng.pick(UNITS);
    const story = A >= 90
      ? (count === '1' ? `A is obtuse, so a must be the longest side; ${a} > ${b}, so one triangle.` : `A is obtuse, so a must be longer than b; ${a} ≤ ${b}, so none.`)
      : `The height from C to the base is b sin A = ${b} × sin ${A}° ${exact ? `= ${h}` : `≈ ${at4(h)}`}. `
        + (count === '0' ? `a = ${a} is shorter than that, so it cannot reach the base: no triangle.`
          : exact ? `a = ${a} is exactly that height, so it meets the base at a right angle: one triangle.`
            : count === '1' ? `a = ${a} is at least b = ${b}, so it reaches the base only once on the far side: one triangle.`
              : `a = ${a} is longer than the height but shorter than b = ${b}, so it can swing to meet the base in two places: two triangles.`);
    return {
      prompt: [T.prose(`In triangle ABC, A = ${A}°, a = ${a} ${unit} and b = ${b} ${unit}. How many triangles have these measurements?`)],
      text: `ssa count: A ${A}, a ${a}, b ${b}`,
      answer: { type: 'choice', value: count, options: COUNT_OPTIONS },
      visual: null,
      explain: `${story} (Two sides and an angle not between them do not fix a triangle the way SAS does.) So ${COUNT_OPTIONS.find((o) => o.id === count).label.toLowerCase()}.`,
    };
  }
}

// ── ½ab sin C ───────────────────────────────────────────────────────────

const FIELD = [
  (a, b, t, u) => `A triangular garden has two sides of ${a} ${u} and ${b} ${u} meeting at a ${t}° angle. What is its area, in square ${u === 'ft' ? 'feet' : u === 'yd' ? 'yards' : 'meters'}, ${placeWords(1)}?`,
];

function area(rng) {
  for (;;) {
    const C = rng.int(20, 160);
    const a = rng.int(3, 30), b = rng.int(3, 30);
    if (Math.max(a, b) > 3 * Math.min(a, b)) continue;
    const x = 0.5 * a * b * sinD(C), alt = 0.5 * a * b * four(sinD(C));
    const q = safeRound(x, 1, alt);
    if (q === null) continue;
    const story = rng.chance(0.3);
    const unit = story ? rng.pick(['ft', 'm', 'yd']) : rng.pick(UNITS);
    const c = Math.sqrt(a * a + b * b - 2 * a * b * cosD(C));
    return {
      prompt: [T.prose(story ? FIELD[0](a, b, C, unit) : `In triangle ABC, a = ${a} ${unit}, b = ${b} ${unit} and C = ${C}°. Find its area, in ${SQUARE[unit]}, ${placeWords(1)}.`)],
      text: `triangle area: a ${a}, b ${b}, C ${C}${placeText(1)}`,
      answer: roundedAnswer(q, 1),
      visual: triangleFigure(a, b, c, { angles: { C: `${C}°` }, sides: { a: `${a} ${unit}`, b: `${b} ${unit}` }, asked: 'area', reveal: `${roundedText(q, 1)} ${unit}²` }),
      explain: `With the base ${a}, the height is ${b} sin ${C}°, so the area is ½ × ${a} × ${b} × sin ${C}° ≈ ${at4(x)}, which is ${roundedText(q, 1)} ${placeWords(1)}. `
        + `(½ × ${a} × ${b} = ${(a * b) / 2} is the area only when C is 90°; the angle must be the one between the two sides.) So ${roundedText(q, 1)} ${unit}².`,
    };
  }
}

// ── Proving the laws ────────────────────────────────────────────────────

/**
 * The two derivations from the altitude, written for corners P, Q, R: the
 * altitude h from R meets line PQ at D, and x = PD, signed, so that every
 * line holds in an obtuse triangle too. Each step is the line, the reason
 * it follows, and the slips a student makes at that step. The first line is
 * given; the student picks each one after it.
 */
const LAW_PROOFS = {
  sines: {
    goal: 'p/sin(P) = q/sin(Q)',
    steps: [
      ['sin(P) = h/q', 'In right triangle PDR, h is opposite P and q = PR is the hypotenuse', []],
      ['h = q*sin(P)', 'Multiply both sides by q', ['h = sin(P)/q', 'h = q*cos(P)', 'h = q/sin(P)']],
      ['sin(Q) = h/p', 'In right triangle QDR, h is opposite Q and p = QR is the hypotenuse', ['sin(Q) = h/q', 'sin(Q) = p/h', 'cos(Q) = h/p', 'sin(Q) = h/r']],
      ['h = p*sin(Q)', 'Multiply both sides by p', ['h = sin(Q)/p', 'h = p*cos(Q)', 'h = q*sin(Q)', 'h = p/sin(Q)']],
      ['q*sin(P) = p*sin(Q)', 'Both lines are h, so they are equal', ['p*sin(P) = q*sin(Q)', 'q*cos(P) = p*cos(Q)', 'q*sin(Q) = p*sin(P)', 'q + sin(P) = p + sin(Q)']],
      ['p/sin(P) = q/sin(Q)', 'Divide both sides by sin P sin Q', ['p/sin(Q) = q/sin(P)', 'p*sin(P) = q*sin(Q)', 'sin(P)/p = q/sin(Q)', 'p/q = sin(Q)/sin(P)']],
    ],
  },
  cosines: {
    goal: 'p^2 = q^2 + r^2 - 2*q*r*cos(P)',
    steps: [
      ['q^2 = x^2 + h^2', 'Pythagoras in right triangle PDR', []],
      ['p^2 = (r - x)^2 + h^2', 'Pythagoras in right triangle QDR, where DQ = r − x', ['p^2 = (r + x)^2 + h^2', 'p^2 = r^2 + h^2', 'p^2 = (r - x)^2 - h^2', 'p^2 = x^2 + h^2']],
      ['p^2 = r^2 - 2*r*x + x^2 + h^2', 'Square out (r − x)²', ['p^2 = r^2 + x^2 + h^2', 'p^2 = r^2 - x^2 + h^2', 'p^2 = r^2 - r*x + x^2 + h^2', 'p^2 = r^2 + 2*r*x + x^2 + h^2']],
      ['p^2 = q^2 + r^2 - 2*r*x', 'x² + h² = q², the first line', ['p^2 = q^2 + r^2', 'p^2 = r^2 - 2*r*x + h^2', 'p^2 = r^2 - 2*r*x - q^2', 'p^2 = q^2 - r^2 - 2*r*x']],
      ['x = q*cos(P)', 'In right triangle PDR, cos P = x/q', ['x = q*sin(P)', 'x = r*cos(P)', 'x = cos(P)/q', 'x = p*cos(P)']],
      ['p^2 = q^2 + r^2 - 2*q*r*cos(P)', 'Put x = q cos P into the line before last', ['p^2 = q^2 + r^2 + 2*q*r*cos(P)', 'p^2 = q^2 + r^2 - q*r*cos(P)', 'p^2 = q^2 + r^2 - 2*q*r*sin(P)', 'p^2 = q^2 + r^2 - 2*r*cos(P)']],
    ],
  },
};
const LAW_NAME = { sines: 'the law of sines', cosines: 'the law of cosines' };

/** Corners P, Q, R renamed to A, B and C in some order, sides with them. */
const relabel = (s, m) => s.replace(/\b[PQRpqr]\b/g, (ch) => (ch === ch.toUpperCase() ? m[ch] : m[ch.toUpperCase()].toLowerCase()))
  // In alphabetical order where order is free: b² + c², 2bc.
  .replace(/\b([abc])\^2 \+ ([abc])\^2/g, (w, u, v) => (u < v ? w : `${v}^2 + ${u}^2`))
  .replace(/\b([abc])\*([abc])\b/g, (w, u, v) => (u < v ? w : `${v}*${u}`));
/** sin(A) → sin A, 2*b*c → 2bc, ^2 → ², - → −. */
const lawText = (s) => s.replace(/(sin|cos)\(([A-C])\)/g, '$1 $2').replace(/\*(?=sin|cos)/g, ' ').replace(/\*/g, '')
  .replace(/\^2/g, '²').replace(/-/g, '−');

// requiem: catalogue/content/laws-proved-from-the-altitude
function lawProof(rng) {
  const law = rng.pick(['sines', 'cosines']);
  // The law of sines pairs P with Q, so those two are taken in order.
  const R = rng.pick(ANGLES);
  const [P, Q] = law === 'sines' ? ANGLES.filter((v) => v !== R) : rng.shuffle(ANGLES.filter((v) => v !== R));
  const m = { P, Q, R };
  const { goal, steps } = LAW_PROOFS[law];
  const i = rng.int(1, steps.length - 1);
  const lines = steps.slice(0, i).map((s) => relabel(s[0], m));
  const [next0, reason0, slips] = steps[i];
  const next = relabel(next0, m), reason = relabel(reason0, m);
  const back = rng.chance(0.5) ? rng.pick(lines) : null;
  const wrong = [...(back ? [back] : []), ...rng.shuffle(slips.map((e) => relabel(e, m)))].slice(0, 3);
  const all = rng.shuffle([next, ...wrong]);
  const opts = all.map((e, j) => ({ id: ['a', 'b', 'c', 'd'][j], e }));
  const g = relabel(goal, m);
  const setup = `Drop the altitude h from ${R} to line ${[P, Q].sort().join('')}, meeting it at D${law === 'cosines' ? `, and let x = ${P}D (negative if D falls beyond ${P}), so D${Q} = ${lawText(relabel('r - x', m))}` : ''}.`;
  return {
    prompt: [T.prose(`Prove ${LAW_NAME[law]}, ${lawText(g)}, in triangle ABC. ${setup} So far: ${lines.map(lawText).join('; ')}. `
      + 'Which line comes next? It must follow from the lines so far and be new, a step on toward the law, not one already written.')],
    text: `law proof: goal ${g}; altitude from ${R}, x = ${P}D; so far ${lines.join('; ')}; options ${opts.map((o) => `${o.id}: ${o.e}`).join(' | ')}`,
    answer: { type: 'choice', value: opts[all.indexOf(next)].id, options: opts.map((o) => ({ id: o.id, label: lawText(o.e) })) },
    visual: null,
    explain: `${reason}: ${lawText(next)}. `
      + `(${back ? `${lawText(back)} is true too, but it is a line already written, a step back. The others` : 'The other choices'} swap a sine for a cosine, a side for the wrong one, or a sign, so they do not follow.) So ${lawText(next)}.`,
  };
}

/** The area, or (about four rows in ten) a step in proving a law from the same height. */
const heightLevel = (rng) => (rng.chance(0.4) ? lawProof(rng) : area(rng));

const CONTENT = [sinesSide, sinesAngle, cosinesSide, cosinesAngle, whichLaw, howMany, heightLevel];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
