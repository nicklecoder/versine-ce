import { parseExpression } from '../math/parse.js';

/**
 * Turning a parsed expression into terms the prompt renderer can draw.
 *
 * The brackets it draws are *derived from precedence*, not copied from what
 * was typed. That is deliberate and is the whole value of the preview: typing
 * `2^1/2` shows `2¹⁄2` with the exponent bound tightly, which is how it was
 * read, whether or not the student expected it. Redundant brackets they typed
 * disappear, and brackets they omitted appear.
 *
 * Nothing here evaluates. `4/8` draws as `4/8` and `2+3` as `2+3`. A preview
 * that simplified would do the student's work and hand back the answer, and it
 * would be an easy thing to build by accident, because a walk that returns a
 * number is more natural to write than one that returns a faithful picture.
 */

/** Binding strength, for deciding when a child needs brackets around it. */
const PREC = { '+': 1, '-': 1, '*': 2, '/': 2, '^': 4 };
const precOf = (n) => (n.t === 'bin' ? PREC[n.op] : n.t === 'neg' ? 3 : 9);

const wrap = (terms) => [{ t: 'group', terms }];

/** Draw `node` as the child of something binding at `need`, bracketing if looser. */
function child(node, need, { rightOf = null } = {}) {
  const terms = termsFor(node);
  const mine = precOf(node);
  // Same strength on the right of a left-associative operator still needs
  // brackets: a − (b − c) is not (a − b) − c.
  const tight = rightOf && mine === need && (rightOf === '-' || rightOf === '/');
  return mine < need || tight ? wrap(terms) : terms;
}

/** @param {object} node @returns {Array<object>} prompt terms */
export function termsFor(node) {
  switch (node.t) {
    case 'num': return [{ t: 'num', v: node.v }];
    case 'var': return [{ t: 'var', v: node.v }];
    case 'const': return [{ t: 'var', v: node.v === 'pi' ? 'π' : node.v }];

    case 'neg':
      // A negative number is one thing, −24, not an operator and a number:
      // drawn apart, a line can break between them.
      if (node.a.t === 'num') return [{ t: 'num', v: `−${node.a.v}` }];
      return [{ t: 'op', v: '−' }, ...child(node.a, 3)];

    case 'call':
      if (node.fn === 'sqrt') return [{ t: 'root', v: termsFor(node.args[0]) }];
      if (node.fn === 'root') {
        return [{ t: 'root', i: flatten(node.args[0]), v: termsFor(node.args[1]) }];
      }
      // abs, and anything added later, as bars around its argument.
      return [{ t: 'op', v: '|' }, ...termsFor(node.args[0]), { t: 'op', v: '|' }];

    case 'bin': {
      if (node.op === '/') {
        // Division is drawn as a fraction, which is why its parts never need
        // brackets: the bar does the grouping that brackets would have to.
        return [{ t: 'frac', n: termsFor(node.a), d: termsFor(node.b) }];
      }
      if (node.op === '^') {
        return [{ t: 'pow', b: child(node.a, 5), e: termsFor(node.b) }];
      }
      const need = PREC[node.op];
      const left = child(node.a, need);
      const right = child(node.b, need, { rightOf: node.op });
      // Juxtaposition is drawn as juxtaposition: 2x was typed without a times
      // sign, so it gains neither a sign nor the gap that separates the parts
      // of a sum.
      if (node.op === '*' && node.implicit) {
        return [{ t: 'juxt', terms: [...left, ...right] }];
      }
      const sign = node.op === '*'
        ? { t: 'op', v: '×' }
        : { t: 'op', v: node.op === '-' ? '−' : '+' };
      return [...left, sign, ...right];
    }
    default:
      return [{ t: 'num', v: '?' }];
  }
}

/** A node as plain text, for the small places a term list will not fit. */
function flatten(node) {
  switch (node.t) {
    case 'num': case 'var': return node.v;
    case 'const': return node.v === 'pi' ? 'π' : node.v;
    case 'neg': return `−${flatten(node.a)}`;
    default: return '·';
  }
}

/**
 * Parse and convert in one step.
 * @returns {{ok:true, terms:Array}|{ok:false, error:string}}
 */
export function previewOf(src) {
  // An equation is two expressions either side of one equals sign, drawn
  // side by side: a line is typed as y = 2x − 3, and the preview should show
  // it as typed rather than give up at the "=". An inequality is the same
  // with a different sign between, and <= is drawn as the ≤ it means.
  const sides = String(src).split(/(<=|>=|≤|≥|<|>|=)/);
  if (sides.length === 3) {
    const left = previewOf(sides[0]);
    const right = previewOf(sides[2]);
    if (!left.ok) return left;
    if (!right.ok) return right;
    const sign = { '<=': '≤', '>=': '≥' }[sides[1]] ?? sides[1];
    return { ok: true, terms: [...left.terms, { t: 'op', v: sign }, ...right.terms] };
  }
  const parsed = parseExpression(src);
  if (!parsed.ok) return parsed;
  return { ok: true, terms: termsFor(parsed.ast) };
}
