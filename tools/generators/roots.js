/**
 * Catalogue authoring tool: builds the problem library for roots.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding -- when a
 * systematic fault affects too many rows to correct by hand, or when a level
 * is redesigned. Individual bad problems are fixed in the library directly.
 *
 * Run via: node scripts/build-library.mjs
 */
import * as T from '../terms.js';
import { minus } from '../../web/ui/dom.js';
import { LEVELS, LAST_LEVEL, PAR_SECONDS } from '../../web/skills/roots.js';

/**
 * Squares worth knowing on sight. Stops at 35 because past that the answer
 * comes from multiplying rather than from recall, which is a different skill.
 */
const ROOTS = Array.from({ length: 34 }, (_, i) => i + 2);   // 2..35

/**
 * Square-free multipliers. They must be square-free, or the "biggest square
 * that divides" would not be the one the problem was built from and the
 * prompt would disagree with its own working.
 */
const SQUARE_FREE = [2, 3, 5, 6, 7, 10, 11, 13, 14, 15, 17, 19, 21, 22, 23, 26, 29, 30];

/** The largest square dividing n, and what is left beside it. */
function pullOut(n) {
  let best = 1;
  for (let k = 2; k * k <= n; k++) if (n % (k * k) === 0) best = k;
  return { outside: best, inside: n / (best * best) };
}

/** Squares you should know, asked both ways. */
function perfect(rng) {
  const r = rng.pick(ROOTS);
  const sq = r * r;
  if (rng.chance(0.45)) {
    return {
      prompt: T.asks(T.pow(r, 2, 1)),
      text: `${r}^2`,
      answer: { type: 'int', value: sq },
      visual: {
        kind: 'evalmodel',
        lines: [`${r}²`, `${r} × ${r}`, String(sq)],
        rules: ['a square is the number times itself', 'work it out'],
        hint: 'What does squaring do?',
      },
      explain: `${r}² is ${r} × ${r} = ${sq}.`,
    };
  }
  return {
    prompt: T.asks(T.root(sq, undefined, 1)),
    text: `sqrt(${sq})`,
    answer: { type: 'int', value: r },
    visual: {
      kind: 'evalmodel',
      lines: [`√${sq}`, `what squared gives ${sq}?`, `${r} × ${r} = ${sq}`, String(r)],
      rules: ['a root asks the squaring question backwards', 'and this one fits', 'so the root is'],
      hint: 'What number, multiplied by itself, gives this?',
    },
    explain: `√${sq} asks what squared gives ${sq}. ${r} × ${r} = ${sq}, so the root is ${r}.`,
  };
}

/** Most roots are not whole. Where does this one sit? */
function between(rng) {
  // A number strictly between two consecutive squares.
  const low = rng.int(2, 20);
  const n = rng.int(low * low + 1, (low + 1) * (low + 1) - 1);
  // √n is nearer low + 1 exactly when n is past (low + ½)², which for whole
  // numbers is n > low² + low. Said, so that a student who estimated √440 as
  // almost 21 sees why 20 is still the answer.
  const nearer = n > low * low + low
    ? ` It is nearer ${low + 1}, but still below it.`
    : '';
  return {
    // Asked as the whole number below the root, not "just above": √440 is
    // 20.98, which no one would describe as just above 20.
    prompt: [T.prose('The whole number just below'), T.root(n, undefined, 1), T.prose('is'), T.blank()],
    text: `whole number just below sqrt(${n})`,
    answer: { type: 'int', value: low },
    visual: {
      kind: 'evalmodel',
      lines: [`√${n}`, `${low}² = ${low * low}, and ${low + 1}² = ${(low + 1) ** 2}`,
              `${low * low} < ${n} < ${(low + 1) ** 2}`,
              `so √${n} is between ${low} and ${low + 1}`],
      rules: ['find the squares either side', 'the number sits between them', 'so the root does too'],
      hint: 'Which two squares is this number between?',
    },
    explain: `${low}² = ${low * low} and ${low + 1}² = ${(low + 1) ** 2}. Since ${n} sits `
      + `between them, √${n} sits between ${low} and ${low + 1}, so the whole number just `
      + `below it is ${low}.${nearer}`,
  };
}

/** The smallest k whose square divides n, if it is not the biggest: the square a student spots first. */
function firstSpotted(n, outside) {
  for (let k = 2; k < outside; k++) if (n % (k * k) === 0) return k;
  return null;
}

/** A square hiding inside the root can come out of it. */
function simplify(rng, hard) {
  // Build the number from a square factor and a square-free remainder, so
  // there is always something to pull out and something left behind.
  const outside = rng.int(2, hard ? 12 : 8);
  const inside = rng.pick(hard ? SQUARE_FREE : SQUARE_FREE.slice(0, 8));
  const n = outside * outside * inside;
  if (n > 4000) return simplify(rng, hard);
  // Read the factorisation back off the number rather than trusting the one it
  // was built from: the prompt, the working and the answer then cannot
  // disagree, whatever the multiplier lists later become.
  const check = pullOut(n);
  const sq = check.outside * check.outside;
  const visual = {
    kind: 'evalmodel',
    lines: [`√${n}`, `√(${sq} × ${check.inside})`,
            `√${sq} × √${check.inside}`,
            `${check.outside}√${check.inside}`],
    rules: [`${sq} is the biggest square that divides ${n}`,
            'a root of a product splits', 'and the square root comes out whole'],
    hint: 'What is the biggest square that divides this?',
  };
  const working = `${n} = ${sq} × ${check.inside}, and √${sq} = ${check.outside}. `
    + `So √${n} = ${check.outside}√${check.inside}.`;
  if (!hard) {
    // Pulling Out Squares shows what is left under the root: the level is
    // about the move itself, so the coefficient is the whole question.
    return {
      prompt: [T.root(n, undefined, 1), T.op('='), T.root(check.inside, null, 2)],
      text: `sqrt(${n}) = ?sqrt(${check.inside})`,
      answer: { type: 'int', value: check.outside },
      visual,
      explain: working,
    };
  }
  // requiem: catalogue/content/simplest-radical-asks-whole-form
  // Simplest Radical Form asks for the whole radical. Showing √10 beside the
  // blank told the student what was left, so no one could stop at 2√250 and
  // the level tested nothing Pulling Out Squares had not.
  const k = firstSpotted(n, check.outside);
  const early = k
    ? ` Taking out only ${k * k} would leave ${k}√${n / (k * k)}, which still has a square inside.`
    : '';
  return {
    prompt: [T.prose('In simplest radical form,'), T.root(n, undefined, 1), T.op('='), T.blank()],
    text: `simplest radical: sqrt(${n})`,
    answer: { type: 'expr', value: `${check.outside}√${check.inside}` },
    visual,
    explain: working + early,
  };
}

/**
 * The strategic layer: an exact radical and a decimal are answers to different
 * questions. Exactness is for carrying on with; a decimal is for judging size
 * or reporting a measurement.
 *
 * No situation names the property that decides it ("exact"), and neither
 * option's note says what it is good for: the notes show what each form looks
 * like, so matching a word in the question to a word on a button gets nothing.
 */
const dp2 = (x) => (Math.round(x * 100) / 100).toFixed(2);
const times = (m) => (m === 1 ? '' : String(m));
const SITUATIONS = {
  simplify: [
    ({ r, o, i, rng }) => {
      const m = rng.int(1, 3);
      return {
        text: `You need to add ${r} to ${times(m)}√${i}.`,
        why: `${r} = ${o}√${i}, and only then do the two match: ${o}√${i} + ${times(m)}√${i} = `
          + `${o + m}√${i}. Decimals would give a rounded sum, not this one.`,
      };
    },
    ({ r, o, i, rng }) => {
      const m = o + rng.pick([-1, 0, 1]);
      return {
        text: `You need to check whether ${r} and ${times(m)}√${i} are the same number.`,
        why: `${r} simplifies to ${o}√${i}, so ${m === o ? 'they are the same'
          : `they are not: ${o}√${i} is not ${times(m)}√${i}`}. `
          + 'Two decimals that agree to a few places could still be different numbers.',
      };
    },
  ],
  estimate: [
    ({ r, v }) => ({
      text: `You need to cut a piece of wood ${r} inches long.`,
      why: `A tape measure does not read radicals: ${r} ≈ ${dp2(v)} inches is what you can mark.`,
    }),
    ({ r, v, rng }) => {
      const k = Math.floor(v) + rng.int(0, 1);
      return {
        text: `You need to say whether ${r} is more than ${k}.`,
        why: `${r} ≈ ${dp2(v)}, so it is ${v > k ? 'more' : 'less'} than ${k}. A simplified radical `
          + 'does not show its size at a glance.',
      };
    },
    ({ r, v }) => ({
      text: `You need to measure out ${r} meters of rope.`,
      why: `Rope is measured off a tape, so it needs a decimal: ${r} ≈ ${dp2(v)} meters.`,
    }),
    ({ r, v }) => {
      const k = Math.floor(v);
      return {
        text: `You need to say whether ${r} is nearer ${k} or ${k + 1}.`,
        why: `${r} ≈ ${dp2(v)}, so it is nearer ${v - k < 0.5 ? k : k + 1}. A simplified radical `
          + 'does not show its size at a glance.',
      };
    },
    ({ r, v }) => ({
      text: `You need to plot ${r} on a number line.`,
      why: `${r} ≈ ${dp2(v)}, and that is where the dot goes. The radical form does not say where on the line it is.`,
    }),
  ],
};

/**
 * Cubes, and cube roots.
 *
 * Asked in words rather than with a radical sign carrying a little three,
 * because the prompt vocabulary has one root term and it draws a square root.
 * Inventing a term kind for a level is the wrong way round -- the words are
 * perfectly clear, and a cube root written out is what a student will meet in
 * a question anyway.
 *
 * Small numbers only: the cubes up to 10 are the ones worth knowing on sight,
 * and 12³ is a different skill (arithmetic) wearing this one's clothes.
 */
const CUBES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

function cubes(rng) {
  const shape = rng.int(0, 2);

  if (shape === 0) {                             // r³
    const r = rng.pick(CUBES);
    const cube = r ** 3;
    return {
      prompt: T.asks(T.pow(r, 3, 1)),
      text: `${r}^3`,
      answer: { type: 'int', value: cube },
      visual: {
        kind: 'evalmodel',
        lines: [`${r}³`, `${r} × ${r} × ${r}`, `${r * r} × ${r}`, String(cube)],
        rules: ['a cube is three of them multiplied', 'two of them first', 'then the third'],
        hint: 'How many of them are multiplied together?',
      },
      explain: `${r}³ is ${r} × ${r} × ${r} = ${cube}. Squaring uses two; cubing uses three.`,
    };
  }

  if (shape === 1) {                             // an exact cube root, either sign
    // Negative cubes are the whole reason this level earns its place beside
    // the square-root ones. √(−27) does not exist; the cube root of −27 is
    // −3, because three negatives multiplied stay negative. An odd power
    // keeps the sign and an even one destroys it, and a student who has only
    // met square roots has been taught the opposite as if it were general.
    const r = rng.pick(CUBES) * (rng.chance(0.35) ? -1 : 1);
    const cube = r ** 3;
    return {
      prompt: [T.prose(`What is the cube root of ${minus(cube)}?`)],
      text: `cube root of ${minus(cube)}`,
      answer: { type: 'int', value: r },
      visual: {
        kind: 'evalmodel',
        lines: [`cube root of ${minus(cube)}`, `what cubed gives ${minus(cube)}?`,
                `${minus(r)} × ${minus(r)} × ${minus(r)} = ${minus(cube)}`, minus(r)],
        rules: ['a root asks the power question backwards', 'and this one fits',
                'so the root is'],
        hint: 'What number, multiplied by itself twice more, gives this?',
      },
      explain: `The cube root of ${minus(cube)} asks what cubed gives ${minus(cube)}. `
        + `${minus(r)} × ${minus(r)} × ${minus(r)} = ${minus(cube)}, so it is ${minus(r)}.`
        + (r < 0
          ? ' Three negatives multiplied stay negative, which is why a cube root of a '
            + 'negative exists at all — a square root of one does not.'
          : ''),
    };
  }

  // Not a perfect cube: which whole number does it sit just above?
  const r = rng.int(2, 9);
  const low = r ** 3;
  const n = rng.int(low + 1, (r + 1) ** 3 - 1);
  return {
    prompt: [T.prose(`The cube root of ${n} lies between two whole numbers. `
      + 'Which is the lower one?')],
    text: `cube root of ${n} lies just above ?`,
    answer: { type: 'int', value: r },
    visual: {
      kind: 'evalmodel',
      lines: [`cube root of ${n}`, `${r}³ = ${low} and ${r + 1}³ = ${(r + 1) ** 3}`,
              `${low} < ${n} < ${(r + 1) ** 3}`, String(r)],
      rules: ['find the cubes it sits between', 'and it does sit between them',
              'so the root starts with'],
      hint: 'Which cubes is it between?',
    },
    explain: `${r}³ = ${low} and ${r + 1}³ = ${(r + 1) ** 3}, and ${n} is between them, `
      + `so its cube root is between ${r} and ${r + 1}. Most cube roots are not whole — `
      + 'knowing which two it sits between is usually the useful part.',
  };
}

function whichForm(rng) {
  const o = rng.int(2, 6);
  const i = rng.pick([2, 3, 5, 6, 7]);
  const n = o * o * i;
  const want = rng.chance(0.5) ? 'simplify' : 'estimate';
  const situation = rng.pick(SITUATIONS[want])({ r: `√${n}`, o, i, v: Math.sqrt(n), rng });
  return {
    prompt: [T.prose(situation.text)],
    text: situation.text,
    answer: {
      type: 'choice',
      value: want,
      options: rng.shuffle([
        { id: 'simplify', label: 'Simplest radical form', note: 'a whole number times a root, like 3√5' },
        { id: 'estimate', label: 'A decimal estimate', note: 'a rounded number, like 6.71' },
      ]),
    },
    visual: null,
    explain: situation.why,
  };
}

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  const build = (lv) => {
    switch (lv) {
      case 0: return perfect(rng);
      case 1: return between(rng);
      case 2: return simplify(rng, false);
      case 3: return simplify(rng, true);
      case 4: return cubes(rng);
      case 5: return whichForm(rng);
      default: return rng.pick([perfect, between, (r) => simplify(r, true), cubes])(rng);
    }
  };
  const p = build(level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 2) : level);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
