/**
 * Catalogue authoring tool: builds the problem library for order-ops.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding -- when a
 * systematic fault affects too many rows to correct by hand, or when a level
 * is redesigned. Individual bad problems are fixed in the library directly.
 *
 * Run via: node scripts/build-library.mjs
 */
import { evaluate, render } from '../../web/math/expression.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/order-ops.js';
import * as T from '../terms.js';
const OPS = ['+', '−'];
const MULOPS = ['×', '÷'];
/** Build a candidate expression for a level. Correctness is checked after. */
function shape(rng, level) {
  const n = (lo, hi) => rng.int(lo, hi);
  switch (level) {
    case 0:
      return rng.chance(0.5)
        ? [n(2, 12), rng.pick(OPS), n(2, 9), '×', n(2, 9)]
        : [n(2, 9), '×', n(2, 9), rng.pick(OPS), n(2, 12)];
    case 1: {
      // Build the dividend from the divisor, or the division is almost never
      // exact and every attempt falls through to the subtraction shape.
      const divisor = n(2, 6);
      return rng.chance(0.5)
        ? [divisor * n(2, 12), '÷', divisor, '×', n(2, 5)]
        : [n(10, 30), '−', n(2, 9), rng.pick(OPS), n(2, 9)];
    }
    case 2:
      return rng.chance(0.5)
        ? [[n(2, 12), rng.pick(OPS), n(2, 9)], rng.pick(MULOPS), n(2, 6)]
        : [n(2, 9), '×', [n(3, 14), rng.pick(OPS), n(2, 9)]];
    case 3:
      return rng.chance(0.5)
        ? [n(2, 20), rng.pick(OPS), n(2, 5), '^', rng.pick([2, 3])]
        : [[n(2, 6), rng.pick(OPS), n(1, 4)], '^', 2, rng.pick(OPS), n(2, 15)];
    default: return nested(rng);
  }
}
/**
 * Brackets inside brackets, where the inner one changes the answer: dropping
 * either pair of brackets in 3 × (10 − (2 + 4)) gives a different number, so
 * working from the inside out is the only way to get it right.
 */
function nested(rng) {
  const n = (lo, hi) => rng.int(lo, hi);
  switch (rng.int(0, 4)) {
    case 0: return [n(2, 6), '×', [n(12, 20), '−', [n(2, 5), '+', n(2, 5)]]];
    case 1: return [[n(10, 20), '−', [n(5, 9), '−', n(1, 4)]], '×', n(2, 4)];
    case 2: {
      // ((a + b) × c − d) ÷ e, with d chosen so the division comes out whole.
      const a = n(1, 6), b = n(1, 5), c = n(2, 4), e = n(2, 5);
      const d = (((a + b) * c) % e) + e * n(1, 2);
      return [[[a, '+', b], '×', c, '−', d], '÷', e];
    }
    case 3: {
      const e = n(2, 4), b = n(2, 5), c = n(1, 4), a = n(1, 4);
      const d = ((a * (b + c)) % e) + e * n(1, 2);
      return [[a, '×', [b, '+', c], '−', d], '÷', e];
    }
    default: return [n(2, 4), '×', [n(20, 40), '−', [n(1, 3), '+', n(1, 3)], '^', 2]];
  }
}
/**
 * A worked line as it is written by hand. evaluate() writes a negative
 * intermediate bare, so (2 − 4)² + 15 becomes −2² + 15 -- which, read by the
 * rule this skill teaches, is −4 + 15. A negative number raised to a power,
 * or following an operator, is bracketed: (−2)² + 15, 6 × (−2).
 */
const written = (line) => line
  .replace(/(^|[(\s])−(\d+)(?=[²³])/g, '$1(−$2)')
  .replace(/([×÷+−]) −(\d+)/g, '$1 (−$2)');
function build(rng, level) {
  let expression;
  let result;
  for (let i = 0; i < 60; i++) {
    expression = shape(rng, level);
    result = evaluate(expression);
    // Whole numbers only, at least two steps of work, nothing enormous.
    if (result.ok && result.lines.length >= 3 && Math.abs(result.value) <= 200) break;
  }
  const rules = [...new Set(result.rules)];
  const lines = result.lines.map(written);
  // Two operations of the same rank side by side: say which rule picks the
  // first, since "in order" alone does not say left to right.
  const [a, op1, b, op2] = expression;
  const sameRank = level !== 1 ? ''
    : `${op1 === op2 ? `Two ${op1} signs` : `${op1} and ${op2} are the same rank`}, `
      + `so go left to right: ${a} ${op1} ${b} first. `;
  return {
    prompt: T.asks(T.num(result.lines[0], 1)),
    text: result.lines[0],
    answer: { type: 'int', value: result.value },
    parSeconds: PAR_SECONDS[level],
    visual: { kind: 'evalmodel', lines, rules: result.rules },
    explain: `${sameRank}Work through it in order — ${rules.join(', then ')}. `
      + `${lines.join(', then ')}.`,
  };
}
/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */

  /** @param {import('../engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  if (level >= LAST_LEVEL) {
    const from = rng.int(0, LAST_LEVEL - 1);
    const problem = build(rng, from);
    problem.parSeconds = PAR_SECONDS[LAST_LEVEL];
    return problem;
  }
  return build(rng, level);
}
