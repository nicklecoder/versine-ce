/**
 * Catalogue authoring tool: builds the problem library for trigonometric
 * ratios.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 *
 * Every `text` gives the triangle as the question does -- an angle and the
 * sides by role, or a named triangle and its sides by letters -- and
 * scripts/check-answers.py works the answer out again from the definitions:
 * it decides which side is opposite from the letters, and checks an exact
 * answer against the calculator's value.
 */
import * as T from '../terms.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/trig-ratios.js';
import { fracAnswer, fracText, fracWork } from './chance.js';
import { r2 } from './figures.js';
import {
  sinD, cosD, tanD, asinD, acosD, atanD, four, at4, safeRound, roundedAnswer, roundedText, placeWords, placeText,
  rootAnswer, rootText, rightCorners, rightFigure,
} from './trig.js';

const NAMES = [['A', 'B', 'C'], ['P', 'Q', 'R'], ['X', 'Y', 'Z'], ['D', 'E', 'F'], ['J', 'K', 'L'], ['M', 'N', 'P']];
const side = (p, q) => [p, q].sort().join('');
const UNITS = ['cm', 'm', 'in', 'ft'];
const ROLE_WORD = { opposite: 'opposite', adjacent: 'adjacent', hypotenuse: 'hypotenuse' };
const RATIO = { sin: ['opposite', 'hypotenuse'], cos: ['adjacent', 'hypotenuse'], tan: ['opposite', 'adjacent'] };
const ratioOf = (a, b) => Object.keys(RATIO).find((k) => RATIO[k].includes(a) && RATIO[k].includes(b));
const VALUE = { sin: sinD, cos: cosD, tan: tanD };
const INVERSE = { sin: asinD, cos: acosD, tan: atanD };
const NAME = { sin: 'sine', cos: 'cosine', tan: 'tangent' };

// ── Opposite & Adjacent ─────────────────────────────────────────────────

const ROLE_OPTIONS = [{ id: 'opposite', label: 'Opposite' }, { id: 'adjacent', label: 'Adjacent' }, { id: 'hypotenuse', label: 'Hypotenuse' }];

function naming(rng) {
  const [V, R, W] = rng.shuffle(rng.pick(NAMES));
  const P = rightCorners(rng.int(28, 62), rng.chance(0.5));
  const sides = { opposite: side(R, W), adjacent: side(V, R), hypotenuse: side(V, W) };
  const figure = (role) => rightFigure(P, { angle: '', names: [V, R, W], highlight: role });
  const why = {
    opposite: `${sides.opposite} is across the triangle from ${V}: it is the one side that does not touch ${V}`,
    adjacent: `${sides.adjacent} touches ${V} and is not the hypotenuse: it runs from ${V} to the right angle at ${R}`,
    hypotenuse: `${sides.hypotenuse} faces the right angle at ${R}, and is the longest side`,
  };
  const trap = {
    opposite: `(${sides.hypotenuse} does not touch ${R}, but it is the hypotenuse; opposite is named from ${V}.)`,
    adjacent: `(${sides.hypotenuse} touches ${V} too, but it is the hypotenuse, so it is never called adjacent.)`,
    hypotenuse: `(The hypotenuse is named from the right angle, not from ${V}, so it is the same whichever acute angle is used.)`,
  };
  if (rng.chance(0.55)) {
    const role = rng.pick(['opposite', 'opposite', 'adjacent', 'adjacent', 'hypotenuse']);
    const options = Object.values(sides).sort().map((s) => ({ id: s, label: s }));
    return {
      prompt: [T.prose(`Triangle ${[V, R, W].sort().join('')} has its right angle at ${R}. Which side is ${role === 'hypotenuse' ? 'the hypotenuse' : `${role} to angle ${V}`}?`)],
      text: `side name: right ${R}, angle ${V}, third ${W}, want ${role}`,
      answer: { type: 'choice', value: sides[role], options },
      visual: figure(role),
      explain: `${why[role]}. ${trap[role]} So ${sides[role]}.`,
    };
  }
  const role = rng.pick(['opposite', 'adjacent', 'adjacent', 'hypotenuse', 'opposite']);
  // From the other acute angle, the two legs swap names.
  const from = rng.chance(0.5) ? V : W;
  const named = from === V ? sides : { opposite: sides.adjacent, adjacent: sides.opposite, hypotenuse: sides.hypotenuse };
  const s = named[role];
  return {
    prompt: [T.prose(`Triangle ${[V, R, W].sort().join('')} has its right angle at ${R}. To angle ${from}, what is side ${s}?`)],
    text: `side role: right ${R}, angle ${from}, third ${from === V ? W : V}, side ${s}`,
    answer: { type: 'choice', value: role, options: ROLE_OPTIONS },
    visual: rightFigure(P, { angle: from === V ? '' : null, names: [V, R, W], highlight: Object.keys(sides).find((k) => sides[k] === s) }),
    explain: `${s} ${role === 'hypotenuse' ? `faces the right angle at ${R}` : role === 'opposite' ? `does not touch ${from}` : `touches ${from} and ends at the right angle`}. `
      + `(${from === V ? 'Opposite and adjacent are named from the angle you stand at' : `From ${from}, not ${V}: the legs that are opposite and adjacent to ${V} swap names at ${from}`}.) So ${role}.`,
  };
}

// ── Ratios ──────────────────────────────────────────────────────────────

const PRIMITIVE = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29], [12, 35, 37]];

function ratios(rng) {
  const [p, q, c0] = rng.pick(PRIMITIVE);
  const k = rng.int(1, Math.max(1, Math.floor(45 / c0)));
  const [o, a] = rng.chance(0.5) ? [p * k, q * k] : [q * k, p * k];
  const h = c0 * k;
  const [V, R, W] = rng.shuffle(rng.pick(NAMES));
  const len = { [side(R, W)]: o, [side(V, R)]: a, [side(V, W)]: h };
  const fn = rng.pick(['sin', 'cos', 'tan']);
  const missing = rng.chance(0.3) ? rng.pick([side(R, W), side(V, R), side(V, W)]) : null;
  const given = Object.entries(len).filter(([s]) => s !== missing);
  const P = rightCorners(atanD(o / a), rng.chance(0.5));
  const roleOf = { opposite: side(R, W), adjacent: side(V, R), hypotenuse: side(V, W) };
  const [top, bottom] = RATIO[fn];
  const val = { opposite: o, adjacent: a, hypotenuse: h };
  const label = (role) => (roleOf[role] === missing ? null : String(val[role]));
  const findMissing = missing
    ? `First the missing side, by the Pythagorean theorem: ${missing === roleOf.hypotenuse ? `${missing} = √(${o}² + ${a}²) = √${o * o + a * a} = ${h}` : `${missing} = √(${h}² − ${missing === roleOf.opposite ? a : o}²) = √${h * h - (missing === roleOf.opposite ? a * a : o * o)} = ${missing === roleOf.opposite ? o : a}`}. `
    : '';
  const wrong = fn === 'sin' ? `${a}/${h} is cos ${V}` : fn === 'cos' ? `${o}/${h} is sin ${V}` : `${a}/${o} is tan ${W}, from the other angle`;
  return {
    prompt: [T.prose(`In right triangle ${[V, R, W].sort().join('')}, the right angle is at ${R}. What is ${fn} ${V}?`)],
    text: `trig ratio: ${fn} ${V}; right ${R}; ${given.map(([s, v]) => `${s} ${v}`).join(', ')}`,
    answer: fracAnswer(val[top], val[bottom]),
    visual: rightFigure(P, { angle: '', names: [V, R, W], sides: { opposite: label('opposite'), adjacent: label('adjacent'), hypotenuse: label('hypotenuse') }, note: `${fn} ${V} = ${val[top]}/${val[bottom]}` }),
    explain: `${findMissing}From ${V}, ${roleOf.opposite} = ${o} is opposite, ${roleOf.adjacent} = ${a} is adjacent, and ${roleOf.hypotenuse} = ${h} is the hypotenuse. `
      + `${fn} = ${top}/${bottom} = ${fracWork(val[top], val[bottom])}. (${wrong}.) So ${fracText(val[top], val[bottom])}.`,
  };
}

// ── Missing Side ────────────────────────────────────────────────────────

/** One missing side by role: x from `known`, at angle theta, or null when rounding is near an edge. */
function sideSolve(theta, knownRole, known, wantRole) {
  const fn = ratioOf(knownRole, wantRole);
  const [top] = RATIO[fn];
  const v = VALUE[fn](theta), v4 = four(v);
  const up = wantRole === top;
  const x = up ? known * v : known / v, alt = up ? known * v4 : known / v4;
  const q = safeRound(x, 1, alt);
  return q === null ? null : { fn, up, x, q };
}

function sideWork(theta, knownRole, known, wantRole, S, unit = '', letter = 'x') {
  const { fn, up, x, q } = S;
  const [top, bottom] = RATIO[fn];
  const eq = `${fn} ${theta}° = ${top === wantRole ? letter : known}/${bottom === wantRole ? letter : known}`;
  const solve = up ? `${letter} = ${known} × ${fn} ${theta}°` : `${letter} = ${known} ÷ ${fn} ${theta}°`;
  const other = up ? `${known} ÷ ${fn} ${theta}°` : `${known} × ${fn} ${theta}°`;
  return `${letter} is ${ROLE_WORD[wantRole] === 'hypotenuse' ? 'the hypotenuse' : `${wantRole} to the ${theta}°`} and ${known}${unit} is ${knownRole === 'hypotenuse' ? 'the hypotenuse' : knownRole}, so ${NAME[fn]} joins them: ${eq}. `
    + `So ${solve} ≈ ${at4(x)}, which is ${roundedText(q, 1)} ${placeWords(1)}. `
    + `(${other} puts ${known} on the wrong side of the fraction; and round only at the end.)`;
}

function missingSide(rng) {
  for (;;) {
    const theta = rng.int(20, 70);
    const [knownRole, wantRole] = rng.shuffle(['opposite', 'adjacent', 'hypotenuse']).slice(0, 2);
    const known = rng.int(4, 40);
    const unit = rng.pick(UNITS);
    const S = sideSolve(theta, knownRole, known, wantRole);
    if (!S || S.x < 0.5 || S.x > 200) continue;
    const P = rightCorners(theta, rng.chance(0.5));
    const sides = { [knownRole]: `${known} ${unit}`, [wantRole]: 'x' };
    return {
      prompt: [T.prose(`In the right triangle, find x, ${placeWords(1)}.`)],
      text: `missing side: angle ${theta}, ${knownRole} ${known}, want ${wantRole}${placeText(1)}`,
      answer: roundedAnswer(S.q, 1),
      visual: rightFigure(P, { angle: `${theta}°`, sides, asked: wantRole, reveal: `${roundedText(S.q, 1)} ${unit}` }),
      explain: `${sideWork(theta, knownRole, known, wantRole, S, ` ${unit}`)} So x ≈ ${roundedText(S.q, 1)} ${unit}.`,
    };
  }
}

// ── Missing Angle ───────────────────────────────────────────────────────

/** The angle from two sides by role, rounded to a whole degree, or null near an edge. */
function angleSolve(sides) {
  const roles = Object.keys(sides);
  const fn = ratioOf(...roles);
  const [top, bottom] = RATIO[fn];
  const r = sides[top] / sides[bottom];
  const x = INVERSE[fn](r), alt = INVERSE[fn](four(r));
  const q = safeRound(x, 0, alt);
  return q === null ? null : { fn, top, bottom, r, x, q };
}

function missingAngle(rng) {
  for (;;) {
    const roles = rng.shuffle(['opposite', 'adjacent', 'hypotenuse']).slice(0, 2);
    const sides = Object.fromEntries(roles.map((role) => [role, rng.int(3, 30)]));
    if (sides.hypotenuse !== undefined && Math.max(sides.opposite ?? 0, sides.adjacent ?? 0) >= sides.hypotenuse) continue;
    const S = angleSolve(sides);
    if (!S || S.x < 15 || S.x > 75) continue;
    const unit = rng.pick(UNITS);
    const P = rightCorners(S.x, rng.chance(0.5));
    const labels = Object.fromEntries(roles.map((role) => [role, `${sides[role]} ${unit}`]));
    return {
      prompt: [T.prose(`In the right triangle, find angle θ, ${placeWords(0, true)}.`)],
      text: `missing angle: ${roles.map((role) => `${role} ${sides[role]}`).join(', ')}${placeText(0)}`,
      answer: roundedAnswer(S.q, 0),
      visual: rightFigure(P, { angle: 'θ', sides: labels, asked: 'angle', reveal: `${S.q}°` }),
      explain: `${sides[S.top]} is ${S.top === 'hypotenuse' ? 'the hypotenuse' : S.top} and ${sides[S.bottom]} is ${S.bottom === 'hypotenuse' ? 'the hypotenuse' : S.bottom}, so ${S.fn} θ = ${sides[S.top]}/${sides[S.bottom]}. `
        + `The inverse undoes it: θ = ${S.fn}⁻¹(${sides[S.top]}/${sides[S.bottom]}) ≈ ${at4(S.x)}°, which is ${S.q}° ${placeWords(0, true)}. `
        + `(${S.fn} θ = ${at4(S.r)} is the ratio, not the angle; the calculator must be in degrees.) So θ ≈ ${S.q}°.`,
    };
  }
}

// ── 45-45-90 ────────────────────────────────────────────────────────────

function special45(rng) {
  const mode = rng.pick(['leg', 'leg', 'hyp root', 'hyp whole']);
  const P = rightCorners(45, rng.chance(0.5));
  if (mode === 'leg') {
    const L = rng.int(2, 30);
    return {
      prompt: [T.prose(`A 45-45-90 triangle has legs of ${L}. Give the exact length of the hypotenuse, x.`)],
      text: `special 45: leg ${L}, want hypotenuse`,
      answer: rootAnswer('x', L, 1, 2),
      visual: rightFigure(P, { angle: '45°', sides: { adjacent: String(L), opposite: String(L), hypotenuse: 'x' }, asked: 'hypotenuse', reveal: rootText(L, 1, 2) }),
      explain: `In a 45-45-90 triangle the hypotenuse is a leg times √2, since x² = ${L}² + ${L}² = 2 × ${L}². So x = ${rootText(L, 1, 2)}. `
        + `(Not ${2 * L}: the two legs add up to more than the hypotenuse.) So ${rootText(L, 1, 2)}.`,
    };
  }
  const k = rng.int(2, 30);
  const H = mode === 'hyp root' ? rootText(k, 1, 2) : String(k);
  const leg = mode === 'hyp root' ? [k, 1, 1] : [k, 2, 2];
  return {
    prompt: [T.prose(`A 45-45-90 triangle has a hypotenuse of ${H}. Give the exact length of each leg, x.`)],
    text: `special 45: hypotenuse ${H}, want leg`,
    answer: rootAnswer('x', ...leg),
    visual: rightFigure(P, { angle: '45°', sides: { adjacent: 'x', hypotenuse: H }, asked: 'adjacent', reveal: rootText(...leg) }),
    explain: `The hypotenuse is a leg times √2, so x√2 = ${H} and x = ${H} ÷ √2${mode === 'hyp root' ? ` = ${k}` : ` = ${k}/√2 = ${k}√2/2${leg[1] === 2 && k % 2 === 0 ? ` = ${rootText(...leg)}` : ''}`}. `
      + `(${mode === 'hyp root' ? `Multiplying by √2 gives ${2 * k}, longer than the hypotenuse` : `Halving gives ${k}/2, the leg only if the triangle were flat; and ${k}/√2 is rationalized by multiplying top and bottom by √2`}.) So ${rootText(...leg)}.`,
  };
}

// ── 30-60-90 ────────────────────────────────────────────────────────────

function special30(rng) {
  // The short leg as (n/d)√r; everything else follows from it.
  const mode = rng.pick(['short', 'short', 'hypotenuse', 'long root', 'long whole']);
  const k = rng.int(2, 12);
  let short, givenRole, givenText;
  if (mode === 'short') { short = [k, 1, 1]; givenRole = 'short'; givenText = String(k); }
  else if (mode === 'hypotenuse') { short = [k, 1, 1]; givenRole = 'hypotenuse'; givenText = String(2 * k); }
  else if (mode === 'long root') { short = [k, 1, 1]; givenRole = 'long'; givenText = rootText(k, 1, 3); }
  else { short = [k, 3, 3]; givenRole = 'long'; givenText = String(k); }
  const [n, d, r] = short;
  // long = short × √3; hypotenuse = 2 × short.
  const long = r === 1 ? [n, d, 3] : [n * 3, d, 1];
  const hyp = [2 * n, d, r];
  const value = { short, long, hypotenuse: hyp };
  const want = rng.pick(['short', 'long', 'hypotenuse'].filter((x) => x !== givenRole));
  const at60 = rng.chance(0.4);
  // θ at the drawn corner: 30° puts the short leg opposite it, 60° the long leg.
  const P = rightCorners(at60 ? 60 : 30, rng.chance(0.5));
  const roleAt = at60 ? { short: 'adjacent', long: 'opposite', hypotenuse: 'hypotenuse' } : { short: 'opposite', long: 'adjacent', hypotenuse: 'hypotenuse' };
  const sides = { [roleAt[givenRole]]: givenText, [roleAt[want]]: 'x' };
  const W = { short: 'the short leg', long: 'the long leg', hypotenuse: 'the hypotenuse' };
  const shortWork = givenRole === 'short' ? `The short leg is ${givenText}.`
    : givenRole === 'hypotenuse' ? `The hypotenuse is twice the short leg, so the short leg is ${givenText} ÷ 2 = ${rootText(...short)}.`
      : `The long leg is the short leg times √3, so the short leg is ${givenText} ÷ √3 = ${rootText(...short)}${mode === 'long whole' ? `, rationalized: ${k}/√3 = ${k}√3/3` : ''}.`;
  const wantWork = want === 'short' ? '' : want === 'long' ? ` The long leg is ${rootText(...short)} × √3 = ${rootText(...long)}.` : ` The hypotenuse is 2 × ${rootText(...short)} = ${rootText(...hyp)}.`;
  const trap = want === 'long' || givenRole === 'long' ? 'The long leg is the one facing the 60° angle, and it is the √3 one, not the 2.' : 'The hypotenuse faces the right angle and is exactly twice the short leg.';
  return {
    prompt: [T.prose(`In this 30-60-90 triangle, ${W[givenRole]} is ${givenText}. Give the exact length of ${W[want]}, x.`)],
    text: `special 30: ${givenRole} ${givenText}, want ${want}`,
    answer: rootAnswer('x', ...value[want]),
    visual: rightFigure(P, { angle: at60 ? '60°' : '30°', sides, asked: roleAt[want], reveal: rootText(...value[want]) }),
    explain: `A 30-60-90 triangle's sides are s, s√3 and 2s. ${shortWork}${wantWork} (${trap}) So x = ${rootText(...value[want])}.`,
  };
}

// ── Complementary sin/cos ───────────────────────────────────────────────

function signed(a, b) { return `${a === 1 ? '' : a}x${b === 0 ? '' : b > 0 ? ` + ${b}` : ` − ${-b}`}`; }

function cofunction(rng) {
  const mode = rng.pick(['angle', 'angle', 'value', 'solve']);
  if (mode === 'angle') {
    const t = rng.int(5, 85);
    const [f, g] = rng.chance(0.5) ? ['sin', 'cos'] : ['cos', 'sin'];
    return {
      prompt: [T.prose(`sin and cos of complementary angles are equal. If ${f} ${t}° = ${g} x°, with x between 0 and 90, what is x?`)],
      text: `cofunction: ${f} ${t} = ${g} ?`,
      answer: { type: 'int', value: 90 - t },
      visual: null,
      explain: `In a right triangle with acute angles ${t}° and ${90 - t}°, the side opposite one is adjacent to the other, so ${f} ${t}° = ${g} ${90 - t}°. `
        + `x = 90 − ${t} = ${90 - t}. (${t} itself would make it ${f} and ${g} of the same angle, which are equal only at 45°.) So ${90 - t}.`,
    };
  }
  if (mode === 'value') {
    const [p, q, c] = rng.pick(PRIMITIVE);
    const [o, a] = rng.chance(0.5) ? [p, q] : [q, p];
    const f = rng.pick(['sin', 'cos', 'tan']);
    const given = { sin: [o, c], cos: [a, c], tan: [o, a] }[f];
    // From B, A's opposite is adjacent: sin A = cos B, cos A = sin B, tan A = 1/tan B.
    const g = { sin: 'cos', cos: 'sin', tan: 'tan' }[f];
    const want = f === 'tan' ? [a, o] : given;
    return {
      prompt: [T.prose(`In right triangle ABC, the right angle is at C, and ${f} A = ${given[0]}/${given[1]}. What is ${g} B?`)],
      text: `cofunction value: ${f} A ${given[0]}/${given[1]}, want ${g} B`,
      answer: fracAnswer(...want),
      visual: null,
      explain: `A and B share the same three sides, with opposite and adjacent swapped: the side opposite A is adjacent to B. `
        + (f === 'tan' ? `So tan B = adjacent/opposite from A, the reciprocal: ${a}/${o}. (tan B is not tan A; the legs trade places.)` : `So ${g} B = ${f} A = ${given[0]}/${given[1]}. (${g} B is not 1 − ${given[0]}/${given[1]}; the complement here is of the angle, not the value.)`)
        + ` So ${fracText(...want)}.`,
    };
  }
  for (;;) {
    const x = rng.int(4, 15);
    const a = rng.int(1, 4), c = rng.int(1, 4);
    const b = rng.int(-10, 20);
    const d = 90 - (a + c) * x - b;
    const A = a * x + b, B = c * x + d;
    if (A <= 0 || B <= 0 || Math.abs(d) > 40 || d % 1) continue;
    const [f, g] = rng.chance(0.5) ? ['sin', 'cos'] : ['cos', 'sin'];
    return {
      prompt: [T.prose(`${f}(${signed(a, b)})° = ${g}(${signed(c, d)})°, and both angles are acute. What is x?`)],
      text: `cofunction solve: ${f}(${a}x + ${b}) = ${g}(${c}x + ${d})`,
      answer: { type: 'int', value: x },
      visual: null,
      explain: `${f} of one angle equals ${g} of another when the angles are complementary, so they add to 90: (${signed(a, b)}) + (${signed(c, d)}) = 90. `
        + `${b + d === 0 ? `${a + c}x = 90` : `${a + c}x ${b + d > 0 ? '+' : '−'} ${Math.abs(b + d)} = 90, so ${a + c}x = ${90 - b - d}`}, and x = ${x}. (Setting them equal is for ${f} = ${f}.) So ${x}.`,
    };
  }
}

// ── Elevation & Bearings ────────────────────────────────────────────────

const LENGTH = [{ u: 'ft', word: 'feet', one: 'foot' }, { u: 'm', word: 'meters', one: 'meter' }, { u: 'yd', word: 'yards', one: 'yard' }];
const ROAD = [{ u: 'mi', word: 'miles' }, { u: 'km', word: 'kilometers' }];

function applied(rng) {
  const kind = rng.pick(['elevation', 'depression', 'ladder', 'sun', 'bearing', 'bearing angle']);
  for (;;) {
    if (kind === 'bearing' || kind === 'bearing angle') {
      const U = rng.pick(ROAD);
      if (kind === 'bearing') {
        const b = rng.int(10, 80), d = rng.int(5, 60);
        const want = rng.pick(['east', 'north']);
        const role = want === 'east' ? 'opposite' : 'adjacent';
        const S = sideSolve(b, 'hypotenuse', d, role);
        if (!S) continue;
        const n = d * cosD(b), e = d * sinD(b), k = 4.2 / d;
        const P = [[0, 0], [0, r2(n * k)], [r2(e * k), r2(n * k)]];
        return {
          prompt: [T.prose(`A ship sails ${d} ${U.word} on a bearing of ${String(b).padStart(3, '0')}° (measured clockwise from north). How far ${want} of its start is it, in ${U.word}, ${placeWords(1)}?`)],
          text: `bearing: ${b}, distance ${d}, want ${want}${placeText(1)}`,
          answer: roundedAnswer(S.q, 1),
          visual: rightFigure(P, { angle: `${b}°`, sides: { hypotenuse: `${d} ${U.u}`, [role]: '?' }, asked: role, reveal: `${roundedText(S.q, 1)} ${U.u}` }),
          explain: `The bearing is measured from north, so the ${b}° angle sits between the north line and the course. The ${want === 'east' ? 'east distance is opposite it' : 'north distance is adjacent to it'}, and ${d} is the hypotenuse: `
            + `${want} = ${d} × ${S.fn} ${b}° ≈ ${at4(S.x)}, which is ${roundedText(S.q, 1)} ${placeWords(1)}. (A bearing is not measured from east, so ${S.fn === 'sin' ? 'cos' : 'sin'} would give the other distance.) So ${roundedText(S.q, 1)} ${U.word}.`,
        };
      }
      const e = rng.int(3, 40), n = rng.int(3, 40);
      const S = angleSolve({ opposite: e, adjacent: n });
      if (!S || S.x < 8 || S.x > 82) continue;
      const k = 4.2 / Math.max(e, n);
      const P = [[0, 0], [0, r2(n * k)], [r2(e * k), r2(n * k)]];
      return {
        prompt: [T.prose(`A hiker walks ${n} ${U.word} north and then ${e} ${U.word} east. What is the bearing from the start to where the hiker ends, ${placeWords(0, true)}?`)],
        text: `bearing from legs: east ${e}, north ${n}${placeText(0)}`,
        answer: roundedAnswer(S.q, 0),
        visual: rightFigure(P, { angle: 'θ', sides: { adjacent: `${n} ${U.u}`, opposite: `${e} ${U.u}` }, asked: 'angle', reveal: `${S.q}°` }),
        explain: `A bearing is measured clockwise from north, so θ is at the start, between north and the straight line to the end. East (${e}) is opposite θ and north (${n}) adjacent: tan θ = ${e}/${n}. `
          + `θ = tan⁻¹(${e}/${n}) ≈ ${at4(S.x)}°, ${S.q}° ${placeWords(0, true)}. (tan⁻¹(${n}/${e}) is the angle from east, not a bearing.) So ${String(S.q).padStart(3, '0')}°, a bearing of ${S.q}°.`,
      };
    }
    const U = rng.pick(LENGTH);
    if (kind === 'sun') {
      const h = rng.int(5, 60), s = rng.int(5, 80);
      const S = angleSolve({ opposite: h, adjacent: s });
      if (!S || S.x < 10 || S.x > 80) continue;
      return {
        prompt: [T.prose(`A ${h}-${U.one} pole casts a shadow ${s} ${U.word} long on level ground. What is the angle of elevation of the sun, ${placeWords(0, true)}?`)],
        text: `sun angle: height ${h}, shadow ${s}${placeText(0)}`,
        answer: roundedAnswer(S.q, 0),
        visual: rightFigure(rightCorners(S.x, true), { angle: 'θ', sides: { opposite: `${h} ${U.u}`, adjacent: `${s} ${U.u}` }, asked: 'angle', reveal: `${S.q}°` }),
        explain: `The pole is opposite the sun's angle at the shadow's tip, and the shadow is adjacent: tan θ = ${h}/${s}. θ = tan⁻¹(${h}/${s}) ≈ ${at4(S.x)}°, ${S.q}° ${placeWords(0, true)}. `
          + `(tan⁻¹(${s}/${h}) is the angle at the top of the pole.) So ${S.q}°.`,
      };
    }
    const theta = rng.int(12, 75);
    const L = rng.int(6, 120);
    let knownRole, wantRole, prompt, say;
    if (kind === 'elevation') {
      [knownRole, wantRole] = ['adjacent', 'opposite'];
      prompt = `From a point ${L} ${U.word} from the base of a tree, the angle of elevation to its top is ${theta}°. How tall is the tree, in ${U.word}, ${placeWords(1)}?`;
      say = `The distance along the ground is adjacent to the ${theta}° and the height is opposite`;
    } else if (kind === 'depression') {
      [knownRole, wantRole] = ['opposite', 'adjacent'];
      prompt = `From the top of a cliff ${L} ${U.word} high, the angle of depression to a boat is ${theta}°. How far is the boat from the base of the cliff, in ${U.word}, ${placeWords(1)}?`;
      say = `The angle of depression from the top equals the angle of elevation from the boat (alternate angles), so at the boat the height ${L} is opposite the ${theta}° and the distance is adjacent`;
    } else {
      wantRole = rng.pick(['opposite', 'adjacent']);
      knownRole = 'hypotenuse';
      prompt = `A ladder ${L} ${U.word} long leans against a wall, making a ${theta}° angle with the ground. How ${wantRole === 'opposite' ? 'high up the wall does it reach' : 'far is its foot from the wall'}, in ${U.word}, ${placeWords(1)}?`;
      say = `The ladder is the hypotenuse, and the ${wantRole === 'opposite' ? 'height up the wall is opposite' : 'distance from the wall is adjacent to'} the ${theta}° at the ground`;
    }
    const S = sideSolve(theta, knownRole, L, wantRole);
    if (!S || S.x > 2.5 * L || S.x < 1) continue;
    const { fn, up, x, q } = S;
    return {
      prompt: [T.prose(prompt)],
      text: `${kind}: angle ${theta}, ${knownRole} ${L}, want ${wantRole}${placeText(1)}`,
      answer: roundedAnswer(q, 1),
      visual: rightFigure(rightCorners(theta, kind === 'depression'), { angle: `${theta}°`, sides: { [knownRole]: `${L} ${U.u}`, [wantRole]: '?' }, asked: wantRole, reveal: `${roundedText(q, 1)} ${U.u}` }),
      explain: `${say}, so ${NAME[fn]}: ${up ? `${L} × ${fn} ${theta}°` : `${L} ÷ ${fn} ${theta}°`} ≈ ${at4(x)}, which is ${roundedText(q, 1)} ${placeWords(1)}. `
        + `(${up ? `${L} ÷ ${fn} ${theta}°` : `${L} × ${fn} ${theta}°`} puts the known side on the wrong side of the ratio.) So ${roundedText(q, 1)} ${U.word}.`,
    };
  }
}

const CONTENT = [naming, ratios, missingSide, missingAngle, special45, special30, cofunction, applied];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
