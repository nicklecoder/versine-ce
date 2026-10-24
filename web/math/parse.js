/**
 * Parsing a typed expression.
 *
 * Produces a *tree*, never a value. Nothing here evaluates anything, and that
 * is the point rather than an omission: the tree is what gets rendered back to
 * a student so they can see how their input was read, and a parser that
 * returned a number would hand them the answer.
 *
 * The syntax is the one committed to in the README. `^` rather than Python's
 * `**` because `^` is what Desmos, WolframAlpha, a TI-84 and LaTeX all use;
 * `**` is accepted anyway, since taking both costs nothing.
 *
 *   expr   := term (('+' | '−') term)*
 *   term   := unary (('×' | '/' | juxtaposition) unary)*
 *   unary  := '−' unary | power
 *   power  := atom ('^' unary)?          right-associative
 *   atom   := number | name | call | '(' expr ')'
 *
 * `−2^2` parses as `−(2²)` and `2^3^2` as `2^(3²)`, both the usual reading.
 *
 * @typedef {object} Node
 * @property {'num'|'var'|'const'|'bin'|'neg'|'call'} t
 */

/** Functions, and how many arguments each takes. */
export const FUNCTIONS = { sqrt: 1, abs: 1, root: 2 };
export const CONSTANTS = new Set(['pi', 'e']);

const isDigit = (c) => c >= '0' && c <= '9';
const isAlpha = (c) => (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z');

/** @returns {{ok:true, tokens:Array}|{ok:false, error:string, at:number}} */
function tokenize(src) {
  const tokens = [];
  let i = 0;
  const s = String(src)
    .replace(/[−–—]/g, '-')      // the dashes a keyboard or a paste can produce
    .replace(/[×·]/g, '*')
    .replace(/÷/g, '/')
    .replace(/\*\*/g, '^')       // Python's spelling
    ;

  while (i < s.length) {
    const c = s[i];
    if (c === ' ' || c === '\t') { i++; continue; }
    if (isDigit(c) || (c === '.' && isDigit(s[i + 1]))) {
      let j = i;
      while (j < s.length && (isDigit(s[j]) || s[j] === '.')) j++;
      const text = s.slice(i, j);
      if ((text.match(/\./g) ?? []).length > 1) {
        return { ok: false, error: `"${text}" has more than one decimal point`, at: i };
      }
      tokens.push({ k: 'num', v: text, at: i });
      i = j;
      continue;
    }
    if (isAlpha(c)) {
      let j = i;
      while (j < s.length && isAlpha(s[j])) j++;
      // Letters side by side are a product, as they are on paper: 6ab is
      // 6·a·b and xy^2 is x·y², the power on the last letter alone. So a run
      // is split into single letters, except where a name the parser knows
      // -- sqrt, pi -- starts, which is taken whole.
      const run = s.slice(i, j).toLowerCase();
      const names = [...Object.keys(FUNCTIONS), ...CONSTANTS].filter((n) => n.length > 1)
        .sort((a, b) => b.length - a.length);
      for (let k = 0; k < run.length;) {
        const name = names.find((n) => run.startsWith(n, k)) ?? run[k];
        tokens.push({ k: 'name', v: name, at: i + k });
        k += name.length;
      }
      i = j;
      continue;
    }
    // A bare radical sign binds to the atom after it: √9 is sqrt(9), and
    // √9^2 is (√9)^2. With no bar over it there is no other reading to give,
    // and the preview shows which one was taken.
    if (c === '√') { tokens.push({ k: 'radical', at: i }); i++; continue; }
    if ('+-*/^(),'.includes(c)) { tokens.push({ k: c, at: i }); i++; continue; }
    return { ok: false, error: `"${c}" is not something I understand`, at: i };
  }
  return { ok: true, tokens };
}

class Parser {
  constructor(tokens) { this.t = tokens; this.i = 0; }
  peek() { return this.t[this.i]; }
  next() { return this.t[this.i++]; }
  at(k) { return this.peek()?.k === k; }

  /** True when what comes next could begin an atom, so juxtaposition applies. */
  startsAtom() {
    const k = this.peek()?.k;
    return k === 'num' || k === 'name' || k === '(' || k === 'radical';
  }

  expr() {
    let node = this.term();
    while (this.at('+') || this.at('-')) {
      const op = this.next().k;
      node = { t: 'bin', op, a: node, b: this.term() };
    }
    return node;
  }

  term() {
    let node = this.unary();
    for (;;) {
      if (this.at('*') || this.at('/')) {
        const op = this.next().k;
        node = { t: 'bin', op, a: node, b: this.unary() };
      } else if (this.startsAtom()) {
        // Juxtaposition: 2x, 3(x+1), 2sqrt(5). Marked so it can be drawn the
        // way it was written, without a times sign that was never typed.
        node = { t: 'bin', op: '*', implicit: true, a: node, b: this.unary() };
      } else {
        return node;
      }
    }
  }

  unary() {
    if (this.at('-')) { this.next(); return { t: 'neg', a: this.unary() }; }
    if (this.at('+')) { this.next(); return this.unary(); }
    return this.power();
  }

  power() {
    const base = this.at('radical')
      ? (this.next(), { t: 'call', fn: 'sqrt', args: [this.atom()] })
      : this.atom();
    if (this.at('^')) {
      this.next();
      return { t: 'bin', op: '^', a: base, b: this.unary() };
    }
    return base;
  }

  atom() {
    const tok = this.peek();
    if (!tok) throw new SyntaxError('it stops before it finishes');
    if (tok.k === 'num') { this.next(); return { t: 'num', v: tok.v }; }
    if (tok.k === '(') {
      this.next();
      const inner = this.expr();
      if (!this.at(')')) throw new SyntaxError('a bracket is left open');
      this.next();
      // Remembered for drawing only: (−2a)(3b) set side by side loses its
      // meaning without them, and canonical() never looks.
      return inner.t === 'bin' || inner.t === 'neg' ? { ...inner, paren: true } : inner;
    }
    if (tok.k === 'name') {
      this.next();
      const arity = FUNCTIONS[tok.v];
      if (arity !== undefined) {
        if (!this.at('(')) throw new SyntaxError(`${tok.v} needs a bracket after it`);
        this.next();
        const args = [this.expr()];
        while (this.at(',')) { this.next(); args.push(this.expr()); }
        if (!this.at(')')) throw new SyntaxError('a bracket is left open');
        this.next();
        if (args.length !== arity) {
          throw new SyntaxError(`${tok.v} takes ${arity} ${arity === 1 ? 'thing' : 'things'}, not ${args.length}`);
        }
        return { t: 'call', fn: tok.v, args };
      }
      if (CONSTANTS.has(tok.v)) return { t: 'const', v: tok.v };
      if (tok.v.length > 1) throw new SyntaxError(`I do not know "${tok.v}"`);
      return { t: 'var', v: tok.v };
    }
    throw new SyntaxError('something is missing here');
  }
}

/**
 * @param {string} src
 * @returns {{ok:true, ast:Node}|{ok:false, error:string}}
 */
export function parseExpression(src) {
  if (!String(src).trim()) return { ok: false, error: 'nothing typed yet' };
  const lexed = tokenize(src);
  if (!lexed.ok) return { ok: false, error: lexed.error };
  const p = new Parser(lexed.tokens);
  try {
    const ast = p.expr();
    if (p.i < p.t.length) return { ok: false, error: 'there is something extra on the end' };
    return { ok: true, ast };
  } catch (err) {
    if (err instanceof SyntaxError) return { ok: false, error: err.message };
    throw err;
  }
}


/**
 * A canonical string for a parsed expression.
 *
 * Order-insensitive, and nothing more. `x+1` and `1+x` agree because addition
 * commutes; `2+3` and `5` do not, because collapsing them would be arithmetic,
 * and judging whether a student did the arithmetic is the entire job. This is
 * the "normalise, then look up" half of answering without a computer algebra
 * system: the catalogue stores the canonical forms it will accept, and a typed
 * answer is canonicalised and compared against them.
 *
 * Sums and products sort their parts. Subtraction is rewritten as adding a
 * negative first -- `x−1` and `−1+x` are the same expression, and refusing
 * one would be wrong rather than cautious. Division is left alone: `a/b` is
 * not reordered, and is deliberately not turned into `a·b^-1`, which would
 * make `1/2` and `2^-1` the same answer when a level may well want to tell
 * them apart.
 */
export function canonical(node) {
  const [negative, body] = signed(node);
  return negative ? `-(${body})` : body;
}

// requiem: play/answers/signs-lifted-out
/**
 * A node's canonical body, with its sign lifted out to the front.
 *
 * Signs are pulled out of products and double negations before anything is
 * sorted, because the parser reads `−2x` as (−2)·x and `3 − 2x` as 3 minus
 * 2·x, and those must agree: a student who writes −2x + 3 for 3 − 2x has
 * written the same expression, and refusing it once was a real bug.
 *
 * @returns {[boolean, string]}
 */
function signed(node) {
  switch (node.t) {
    case 'num': {
      // 2 and 2.0 and 2.00 are one number; 0.50 and 0.5 likewise.
      const v = node.v.includes('.')
        ? node.v.replace(/0+$/, '').replace(/\.$/, '')
        : node.v;
      return [false, v.replace(/^0+(?=\d)/, '')];
    }
    case 'var': return [false, node.v];
    case 'const': return [false, node.v];
    case 'neg': {
      const [negative, body] = signed(node.a);
      return [!negative, body];
    }
    case 'call': return [false, `${node.fn}(${node.args.map(canonical).join(',')})`];
    case 'bin': {
      if (node.op === '*') {
        const parts = [];
        let negative = false;
        const gather = (n) => {
          if (n.t === 'bin' && n.op === '*') { gather(n.a); gather(n.b); return; }
          const [neg, body] = signed(n);
          if (neg) negative = !negative;
          parts.push(body);
        };
        gather(node);
        parts.sort();
        return [negative, `(${parts.join('*')})`];
      }
      if (node.op === '+' || node.op === '-') {
        const parts = [];
        const gather = (n, negated) => {
          if (n.t === 'bin' && (n.op === '+' || n.op === '-')) {
            gather(n.a, negated);
            gather(n.b, n.op === '-' ? !negated : negated);
          } else if (n.t === 'neg') {
            gather(n.a, !negated);
          } else {
            const [neg, body] = signed(n);
            parts.push(neg !== negated ? `-(${body})` : body);
          }
        };
        gather(node, false);
        parts.sort();
        return [false, `(${parts.join('+')})`];
      }
      // A quotient's sign comes out the same way a product's does: −4/x²,
      // −(4/x²) and 4/(−x²) are one answer.
      if (node.op === '/') {
        const [na, a] = signed(node.a);
        const [nb, b] = signed(node.b);
        return [na !== nb, `(${a}/${b})`];
      }
      return [false, `(${canonical(node.a)}${node.op}${canonical(node.b)})`];
    }
    default: return [false, '?'];
  }
}
