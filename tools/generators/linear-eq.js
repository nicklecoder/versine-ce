/**
 * Catalogue authoring tool: builds the problem library for linear equations.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 *
 * Every `text` names what the line was built from -- two points, a slope and
 * a point, or the equation -- in plain ASCII, so scripts/check-answers.py can
 * build the line again for itself.
 */
import * as T from '../terms.js';
import { minus, signed } from '../../web/ui/dom.js';
import { previewOf } from '../../web/ui/express.js';
import { ratio, show, plain, clip, lineText } from '../lines.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/linear-eq.js';

const SPAN = 10;
const PLANE = { xRange: [-SPAN, SPAN], yRange: [-SPAN, SPAN], grid: 1 };
const LINE = 'var(--vec-1)';
const pt = ([x, y]) => `(${minus(x)}, ${minus(y)})`;
const ptPlain = ([x, y]) => `(${x}, ${y})`;
/** An equation for a sentence: one unbroken piece of maths among the words. */
const terms = (src) => [T.math(previewOf(src).terms)];
const whole = (n) => ({ n, d: 1 });
/** How the slope is written in front of x: nothing for 1, a bracket round a fraction. */
const coef = (m) => (m.d === 1 ? (m.n === 1 ? '' : m.n === -1 ? '−' : minus(m.n)) : `(${show(m)})`);
// requiem: play/answers/line-form-asked-is-checked
// Every line here is asked for as y = mx + b (or y = …), so the same line
// left unexpanded is refused with a hint rather than marked right.
const lineAnswer = (m, b) => ({ type: 'linear', value: { m: ratio(m.n, m.d), b: ratio(b.n, b.d) }, requireSimplest: true });

/** A slope a student can count on a grid: whole, or over 2, 3 or 4. */
function slope(rng) {
  const d = rng.pick([1, 1, 1, 2, 2, 3, 4]);
  let n = rng.nonZero(-4, 4);
  if (d > 1) while (n % d === 0 || Math.abs(n) > 2 * d) n = rng.nonZero(-2 * d, 2 * d);
  return ratio(n, d);
}

/**
 * The slope and intercept, asked one at a time, from equations written in
 * every order a textbook writes them. The ones that matter are where the
 * order misleads: y = 4 − 2x, and y = −x, whose slope is a 1 nobody wrote.
 */
function readMB(rng) {
  const m = rng.chance(0.8) ? slope(rng) : whole(rng.nonZero(-9, 9));
  const b = whole(rng.int(-9, 9));
  const want = rng.chance(0.5) ? 'slope' : 'intercept';
  const mText = plain(m), bAbs = Math.abs(b.n);
  const x = mText === '1' ? 'x' : mText === '-1' ? '-x' : m.d === 1 ? `${m.n}x` : `${m.n}/${m.d}x`;
  const shapes = [
    () => (b.n === 0 ? `${x}` : `${x} ${b.n < 0 ? '-' : '+'} ${bAbs}`),
    () => (b.n === 0 ? `${x}` : `${b.n} ${x.startsWith('-') ? `- ${x.slice(1)}` : `+ ${x}`}`),
  ];
  const rhs = rng.pick(shapes)();
  const asked = want === 'slope' ? m : b;
  return {
    prompt: [T.prose(`What is the ${want === 'slope' ? 'slope' : 'y-intercept'} of`),
      ...terms(`y = ${rhs}`), T.prose('?')],
    text: `${want} of y = ${rhs}`,
    answer: { type: 'frac', value: asked, requireSimplest: false },
    visual: null,
    explain: want === 'slope'
      ? `The slope is the number multiplying x, whatever order the equation is written in. Here x is `
        + `multiplied by ${show(m)}${mText === '1' || mText === '-1' ? ', a 1 nobody writes' : ''}, so the slope is ${show(m)}.`
      : `The y-intercept is the number standing on its own: it is y when x is 0. Here that is ${show(b)}`
        + `${b.n === 0 ? ', because nothing is added' : ''}, so the line crosses the y-axis at (0, ${show(b)}).`,
  };
}

/** A line with a whole-number intercept, drawn with two lattice points on it marked. */
function fromGraph(rng) {
  const m = slope(rng);
  const b = rng.int(-6, 6);
  const step = rng.pick([1, 1, 2].filter((k) => Math.abs(b + k * m.n) <= 9));
  if (!step) return fromGraph(rng);
  const other = [step * m.d, b + step * m.n];
  if (Math.abs(other[0]) > 9) return fromGraph(rng);
  const seg = clip(m, whole(b), SPAN);
  const corner = [other[0], b];
  return {
    // requiem: catalogue/content/prompt-names-wanted-form
    prompt: [T.prose('What is the equation of this line? Write it in the form y = mx + b.')],
    text: `line from graph (0, ${b}) ${ptPlain(other)}`,
    answer: lineAnswer(m, whole(b)),
    visual: {
      kind: 'plane', ...PLANE,
      marks: [{ kind: 'segment', from: seg[0], to: seg[1], tone: LINE },
              { kind: 'point', at: [0, b], tone: LINE }, { kind: 'point', at: other, tone: LINE }],
      answer: [{ kind: 'point', at: [0, b], label: `b = ${minus(b)}` },
               { kind: 'segment', from: [0, b], to: corner, label: `run ${other[0]}` },
               { kind: 'segment', from: corner, to: other, label: `rise ${minus(other[1] - b)}` }],
    },
    explain: `It crosses the y-axis at (0, ${minus(b)}), so b = ${minus(b)}. From there to ${pt(other)} it goes `
      + `${other[0]} along and ${other[1] < b ? `${b - other[1]} down` : `${other[1] - b} up`}, `
      + `so m = ${minus(other[1] - b)}/${other[0]}`
      + `${show(m) === `${minus(other[1] - b)}/${other[0]}` ? '' : ` = ${show(m)}`}. `
      + `The equation is ${lineText(m, whole(b))}.`,
  };
}

/** A slope and one point. b is whatever makes the point fit. */
function slopeAndPoint(rng) {
  const m = slope(rng);
  const x = m.d * rng.nonZero(-4, 4);
  const b = rng.int(-9, 9);
  const y = (m.n * x) / m.d + b;
  if (Math.abs(y) > 15) return slopeAndPoint(rng);
  const mx = (m.n * x) / m.d;
  return {
    prompt: [T.prose(`A line has slope ${show(m)} and passes through ${pt([x, y])}. `
      + 'What is its equation, in the form y = mx + b?')],
    text: `line slope ${plain(m)} through ${ptPlain([x, y])}`,
    answer: lineAnswer(m, whole(b)),
    visual: null,
    explain: `Start from y = ${coef(m)}x + b and put the point in: `
      + `${minus(y)} = ${m.d === 1 ? minus(m.n) : `(${show(m)})`} × ${signed(x)} + b, so ${minus(y)} = ${minus(mx)} + b `
      + `and b = ${minus(y)} − ${signed(mx)} = ${minus(b)}. The equation is ${lineText(m, whole(b))}.`,
  };
}

/** Two points: the slope from them, then b from either. */
function twoPoints(rng) {
  const m = slope(rng);
  const b = rng.int(-8, 8);
  const xa = m.d * rng.int(-4, 3);
  const xb = xa + m.d * rng.int(1, 3);
  const pa = [xa, (m.n * xa) / m.d + b], pb = [xb, (m.n * xb) / m.d + b];
  if (Math.abs(pa[1]) > 15 || Math.abs(pb[1]) > 15) return twoPoints(rng);
  const [p1, p2] = rng.chance(0.5) ? [pa, pb] : [pb, pa];
  const rise = p2[1] - p1[1], run = p2[0] - p1[0];
  const mx = (m.n * p1[0]) / m.d;
  return {
    prompt: [T.prose(`What is the equation of the line through ${pt(p1)} and ${pt(p2)}, in the form y = mx + b?`)],
    text: `line through ${ptPlain(p1)} ${ptPlain(p2)}`,
    answer: lineAnswer(m, whole(b)),
    visual: null,
    explain: `Slope first: (${minus(p2[1])} − ${signed(p1[1])}) ÷ (${minus(p2[0])} − ${signed(p1[0])}) = `
      + `${minus(rise)}/${minus(run)}${`${minus(rise)}/${minus(run)}` === show(m) ? '' : ` = ${show(m)}`}. `
      + `Then put ${pt(p1)} into y = mx + b: `
      + `${minus(p1[1])} = ${minus(mx)} + b, so b = ${minus(b)}. The equation is ${lineText(m, whole(b))}.`,
  };
}

/**
 * Where a line crosses the x-axis: set y to 0. The answer is often a
 * fraction, which is the honest case -- most lines do not cross at a whole
 * number, and a level that only ever let them would teach otherwise.
 */
function xIntercept(rng) {
  const m = whole(rng.nonZero(-6, 6));
  const b = whole(rng.nonZero(-12, 12));
  const x = ratio(-b.n, m.n);
  if (x.d > 4) return xIntercept(rng);
  const rhs = lineText(m, b, { ascii: true }).slice(4);
  return {
    prompt: [T.prose('Where does'), ...terms(`y = ${rhs}`),
      T.prose('cross the x-axis? Give the value of x.')],
    text: `x-intercept of y = ${rhs}`,
    answer: { type: 'frac', value: x, requireSimplest: false },
    visual: null,
    explain: `Every point on the x-axis has y = 0, so set y to 0: 0 = ${lineText(m, b).slice(4)}. `
      + (m.n === 1 ? `${b.n > 0 ? `Take ${b.n} from` : `Add ${-b.n} to`} both sides: x = ${show(x)}. `
        : `Then ${m.n === -1 ? '−' : minus(m.n)}x = ${minus(-b.n)}, and x = ${minus(-b.n)} ÷ ${signed(m.n)} = ${show(x)}. `)
      + `It crosses at (${show(x)}, 0).`,
  };
}

const YESNO = [
  { id: 'yes', label: 'On the line', note: 'the equation comes out true' },
  { id: 'no', label: 'Not on the line', note: 'the equation comes out false' },
];

/**
 * Is the point on the line? The near-misses are the ones worth asking:
 * the coordinates swapped, or the right x with y off by the intercept's
 * sign -- each the result of a real misreading.
 */
function onLine(rng) {
  const m = whole(rng.nonZero(-5, 5));
  const b = whole(rng.int(-9, 9));
  const x = rng.int(-6, 6);
  const y = m.n * x + b.n;
  const kind = rng.pick(['on', 'on', 'swapped', 'sign']);
  let p = [x, y];
  if (kind === 'swapped') p = [y, x];
  if (kind === 'sign') p = [x, m.n * x - b.n];
  const yes = p[1] === m.n * p[0] + b.n;
  const rhs = lineText(m, b, { ascii: true }).slice(4);
  const at = m.n * p[0] + b.n;
  return {
    prompt: [T.prose('Does the line'), ...terms(`y = ${rhs}`), T.prose(`pass through ${pt(p)}?`)],
    text: `on line: ${ptPlain(p)} y = ${rhs}`,
    answer: { type: 'choice', value: yes ? 'yes' : 'no', options: YESNO },
    visual: null,
    explain: `Put x = ${minus(p[0])} into the equation: y = ${minus(m.n)} × ${signed(p[0])}`
      + `${b.n === 0 ? '' : ` ${b.n < 0 ? '−' : '+'} ${Math.abs(b.n)}`} = ${minus(at)}. `
      + (yes ? `That is the point's y, so ${pt(p)} is on the line.`
        : `The point's y is ${minus(p[1])}, not ${minus(at)}, so it is not on the line.`),
  };
}

const CONTENT = [readMB, fromGraph, slopeAndPoint, twoPoints, xIntercept, onLine];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  // The mixed level deals from every level. On the Line is the one choice,
  // and it asks a yes-or-no question in so many words, so its buttons give
  // nothing away that the question does not.
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
