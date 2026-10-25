import { frac, reduce } from './frac.js';

/**
 * Evaluating a parsed expression exactly, over fractions.
 *
 * The parser never evaluates, and still must not: the preview has to show
 * what was typed. This is the other half, used only where a level is judged
 * by *value* rather than by form -- a line is the same line whether it is
 * written x/2 + 3 or 0.5x + 3, and the slope is the thing being asked for,
 * not the spelling of it.
 *
 * Exact, never floating: 0.1x judged against x/10 must agree, and a float
 * comparison is one rounding away from telling a student a right answer is
 * wrong. Anything that cannot stay rational -- a root, pi, a fractional power
 * -- comes back null, and the caller treats that as "not something this
 * answer can be".
 *
 * @typedef {import('./frac.js').Frac} Frac
 */

/** "0.25" -> 1/4, "3" -> 3/1. */
function number(text) {
  const [whole, part = ''] = text.split('.');
  const d = 10 ** part.length;
  return reduce(frac(parseInt(whole || '0', 10) * d + (part ? parseInt(part, 10) : 0), d));
}

const add = (a, b) => reduce(frac(a.n * b.d + b.n * a.d, a.d * b.d));
const sub = (a, b) => add(a, { n: -b.n, d: b.d });
const mul = (a, b) => reduce(frac(a.n * b.n, a.d * b.d));
const div = (a, b) => (b.n === 0 ? null : reduce(frac(a.n * b.d, a.d * b.n)));

/**
 * @param {object} node  a tree from parseExpression
 * @param {Record<string, Frac>} env  a value for every letter
 * @returns {Frac|null}
 */
export function valueAt(node, env) {
  switch (node.t) {
    case 'num': return number(node.v);
    case 'var': return env[node.v] ?? null;
    case 'neg': {
      const a = valueAt(node.a, env);
      return a && { n: -a.n, d: a.d };
    }
    case 'bin': {
      const a = valueAt(node.a, env);
      const b = valueAt(node.b, env);
      if (!a || !b) return null;
      if (node.op === '+') return add(a, b);
      if (node.op === '-') return sub(a, b);
      if (node.op === '*') return mul(a, b);
      if (node.op === '/') return div(a, b);
      if (node.op === '^') {
        // Whole-number powers only, and small ones: a line never needs more.
        if (b.d !== 1 || Math.abs(b.n) > 12) return null;
        let out = { n: 1, d: 1 };
        for (let i = 0; i < Math.abs(b.n); i++) out = mul(out, a);
        return b.n < 0 ? div({ n: 1, d: 1 }, out) : out;
      }
      return null;
    }
    default: return null;
  }
}

/** Every letter an expression uses. */
export function lettersIn(node, out = new Set()) {
  if (node.t === 'var') out.add(node.v);
  for (const k of ['a', 'b']) if (node[k]) lettersIn(node[k], out);
  for (const arg of node.args ?? []) lettersIn(arg, out);
  return out;
}
