import { el } from './dom.js';
import { previewOf } from './express.js';
import { getType } from '../math/answer.js';
import { setTerms } from '../math/solutions.js';
import { rootTerms } from '../math/surds.js';

/**
 * Rendering a problem's prompt.
 *
 * A prompt is a list of terms — data the system understands — rather than a
 * string of markup it merely echoes. That buys four things:
 *
 *   Notation can be restyled everywhere at once. Changing how a fraction is
 *   set is a change here, not a rewrite of 27,000 catalogue rows.
 *
 *   Nothing from the catalogue reaches innerHTML. Terms become elements with
 *   textContent, so a stray angle bracket in a problem is a character, not
 *   markup.
 *
 *   Prompts can be checked. A term naming a type that does not exist, or
 *   missing a field, is caught by the deploy gate rather than rendering as
 *   nothing in front of a student.
 *
 *   New notation is available to the whole catalogue at once. Adding a term
 *   type here — a radical, an exponent, a coordinate pair — lets every level
 *   use it immediately, which is the point of a shared vocabulary.
 *
 * Slots (`s`) carry the accent colour a term is drawn in, matching the visual
 * beside it: the first operand and its bar are the same hue. They are
 * presentation, not meaning.
 */

/**
 * A part of a term: a scalar, a blank, or a nested list of terms.
 *
 * Nesting is what lets a typed expression be drawn at all -- (x+1)/2 has a
 * whole expression above the line, and 2^(n+1) has one in the exponent. A
 * vocabulary that only took numbers there could describe the catalogue's own
 * problems and nothing a student typed.
 */
function part(v, cls) {
  if (v === null || v === undefined) return el(`span.${cls}.is-blank`, {}, '?');
  if (Array.isArray(v)) return el(`span.${cls}`, {}, v.map(drawTerm));
  // A negative number is drawn with a real minus sign rather than a hyphen,
  // the same as everywhere else in the app. The catalogue stores numbers here
  // -- the deploy gate insists on it, and refuses a pre-formatted string --
  // so the formatting has to happen at the point of drawing.
  if (typeof v === 'number' && v < 0) return el(`span.${cls}`, {}, `−${Math.abs(v)}`);
  return el(`span.${cls}`, {}, String(v));
}

/** A fraction, or a blank where a number is being asked for. */
function fracNode(n, d, cls) {
  return el(`span.frac-term${cls}`, {}, part(n, 'fn'), el('span.fl'), part(d, 'fd'));
}

const TERMS = {
  /** A plain number or short expression: `2`, `(−2)`, `10 + 2 × 2`. */
  num: (t) => el(`span.t${t.s ?? 1}`, {}, String(t.v)),

  /** A fraction. `n` or `d` may be null to show a blank for the unknown. */
  frac: (t) => fracNode(t.n, t.d, `.t${t.s ?? 1}`),

  /** A whole number beside a fraction. */
  mixed: (t) => el(`span.t${t.s ?? 1}.mixed-term`, {},
    String(t.w), fracNode(t.n, t.d, '')),

  /** An operator or relation between terms. */
  op: (t) => el('span.op', {}, String(t.v)),

  /** Where the answer goes. */
  blank: () => el('span.q', {}, '?'),

  /**
   * A power. `e` may be null to ask for the exponent, which is what the
   * exponent rules actually drill: 2³ × 2⁴ = 2^? is a question about adding
   * exponents, and asking for 128 instead would let a student multiply their
   * way past the rule without using it.
   */
  pow: (t) => el(`span.t${t.s ?? 1}.pow-term`, {},
    Array.isArray(t.b) ? el('span', {}, t.b.map(drawTerm)) : String(t.b),
    t.e === null || t.e === undefined
      ? el('sup.is-blank', {}, '?')
      : Array.isArray(t.e) ? el('sup', {}, t.e.map(drawTerm)) : el('sup', {}, String(t.e))),

  /**
   * A square root, optionally with a coefficient in front. Either part may be
   * null to ask for it: √50 = ?√2 asks for the coefficient, which is the whole
   * of what simplifying a radical is.
   */
  root: (t) => el(`span.t${t.s ?? 1}.root-term`, {},
    t.c === undefined ? null
      : t.c === null ? el('span.is-blank', {}, '?')
      : Array.isArray(t.c) ? el('span', {}, t.c.map(drawTerm)) : el('span', {}, String(t.c)),
    // An index sits in the crook of the sign: the 3 of a cube root.
    t.i === undefined ? null : el('span.root-term__index', {}, String(t.i)),
    el('span.root-term__sign', {}, '√'),
    part(t.v, 'root-term__body')),

  /** A variable, set in italic as convention requires. */
  var: (t) => el(`span.t${t.s ?? 1}.var-term`, {}, String(t.v)),

  /**
   * Terms set touching, for a product written without a sign. `2x` was typed
   * with nothing between the 2 and the x and should not gain the gap that
   * separates the parts of `2 + x`.
   */
  juxt: (t) => el(`span.t${t.s ?? 1}.juxt-term`, {}, (t.terms ?? []).map(drawTerm)),

  /** Brackets around a nested expression, drawn full height. */
  group: (t) => el(`span.t${t.s ?? 1}.group-term`, {},
    el('span.group-term__b', {}, '('),
    el('span', {}, (t.terms ?? []).map(drawTerm)),
    el('span.group-term__b', {}, ')')),

  /** A sentence rather than an expression — strategy levels ask in words. */
  prose: (t) => el(`span.t${t.s ?? 1}.situation`, {}, String(t.v)),

  /**
   * One equation or expression inside a sentence, kept in one piece. Without
   * it the prompt wraps wherever a line runs out, and "−3x − 3y = −24" can
   * end a line on the equals sign and start the next on the answer side.
   */
  math: (t) => el('span.math-term', {}, (t.terms ?? []).map(drawTerm)),
};

export const TERM_KINDS = Object.keys(TERMS);

/**
 * Which fields of which terms, when null, mean "the student fills this in".
 *
 * Exported so the deploy gate can tell whether a prompt has anywhere for the
 * answer to go without keeping its own copy of the rule. The first version of
 * that check knew only about `blank` and fractions, and the moment powers and
 * roots arrived it declared 2,034 correct problems broken -- which is the
 * right failure, but only once.
 */
export const BLANK_FIELDS = { frac: ['n', 'd'], pow: ['e'], root: ['c', 'v'] };

/**
 * Where the answer goes in a prompt, and how to put it there.
 *
 * A blank is not always a term of its own. "1/10 = ?/20" asks for a numerator
 * *inside* a fraction, and "2⁵ × 2³ = 2^?" asks for an exponent inside a
 * power — in both the question would read as nonsense if the gap were lifted
 * out into a separate `?`. So a term may carry its own blank, and filling one
 * means rewriting that term rather than replacing it.
 *
 * @returns {object|null} the term with its blank filled, or null if it has none
 */
function fillBlank(term, shown) {
  switch (term?.t) {
    case 'frac':
      if (term.n === null) return { ...term, n: shown };
      if (term.d === null) return { ...term, d: shown };
      return null;
    case 'pow':
      return term.e === null || term.e === undefined ? { ...term, e: shown } : null;
    case 'root':
      if (term.c === null) return { ...term, c: shown };
      if (term.v === null) return { ...term, v: shown };
      return null;
    default:
      return null;
  }
}

/**
 * @param {HTMLElement} node   where the prompt goes
 * @param {Array<object>} terms
 * @param {{blankAs?: object, shown?: string|number}} [opts]  what to show once
 *        an answer is committed: `blankAs` is a whole term replacing a `blank`,
 *        `shown` is a scalar filling a blank carried inside a term.
 *        Substituting terms rather than rewriting markup means the answer is
 *        set in the same notation the question was asked in.
 */
/** An expression string as terms, or as plain text if it will not parse. */
function exprTerms(src) {
  const r = previewOf(String(src));
  return r.ok ? r.terms : [{ t: 'num', v: String(src) }];
}

/** One term to one element, used by the nested parts above and by the loop. */
function drawTerm(t) {
  const make = TERMS[t?.t];
  return make ? make(t) : el('span.t1.is-unknown', {}, '⚠');
}

export function renderPrompt(node, terms, opts = {}) {
  let filled = false;
  // flatMap, because an expression answer is several terms rather than one.
  node.replaceChildren(...(terms ?? []).flatMap((t) => {
    if (!filled && t?.t === 'blank' && opts.blankAs) {
      const list = Array.isArray(opts.blankAs) ? opts.blankAs : [opts.blankAs];
      const nodes = list.filter((x) => TERMS[x?.t]).map((x) => {
        const n = TERMS[x.t](x);
        n.classList.add('a');
        return n;
      });
      if (nodes.length) { filled = true; return nodes; }
    }
    if (!filled && opts.shown !== undefined) {
      const done = fillBlank(t, opts.shown);
      if (done) {
        filled = true;
        const n = TERMS[done.t](done);
        n.classList.add('a');
        return n;
      }
    }
    const make = TERMS[t?.t];
    // A term the system does not know is a catalogue fault, not a student's.
    // Show a marker rather than nothing, so it is obvious on sight.
    return make ? make(t) : el('span.t1.is-unknown', {}, '⚠');
  }));
  // Punctuation on its own -- the full stop after an equation, a question
  // mark -- belongs to what it follows. As a flex item of its own it can be
  // wrapped onto a line by itself, which reads as a stray mark.
  for (const n of [...node.children]) {
    const prev = n.previousElementSibling;
    if (prev && n.classList.contains('situation') && /^[.,;:?!]+$/.test(n.textContent.trim())) {
      prev.append(el('span.tail', {}, n.textContent.trim()));
      n.remove();
    }
  }
  // requiem: play/ui/long-pieces-set-smaller
  // A bracket or a product set side by side cannot break across a line, so
  // a long one is set smaller rather than run off the card: (x + 5)(x² − 3x
  // + 2) is one piece. Measured from the question, so a reveal never resizes.
  const widest = Math.max(0, ...(terms ?? []).filter((t) => t?.t === 'juxt' || t?.t === 'group')
    .map((t) => promptText([t]).length));
  node.classList.toggle('is-long', widest > 11 && widest <= 16);
  node.classList.toggle('is-longer', widest > 16);
}

/**
 * The term that shows a committed answer, in the notation of its type.
 * @param {string} type  an answer type id
 * @param {any} value
 */
export function answerTerm(type, value) {
  switch (type) {
    // Drawn by the same path as the live preview, so the answer a student is
    // shown is set exactly as their own typing was a moment earlier. Returned
    // as a list rather than wrapped: wrapping made the whole answer as tight
    // as a product, so "5a + 4" lost the spacing its question had.
    case 'expr': return exprTerms(value);
    // A line, a rule and a pair are shown in the notation their own type
    // writes, which the expression preview can draw: y = 3/4x − 2, 4n − 1, (3, −2).
    case 'linear':
    case 'halfplane':
    case 'rule': return exprTerms(getType(type).format(value).replace(/−/g, '-'));
    case 'pair': return { t: 'num', v: getType('pair').format(value) };
    case 'solutions': return setTerms(value);
    case 'roots': return rootTerms(value);
    case 'frac': return { t: 'frac', n: value.n, d: value.d };
    case 'mixed': return value.w !== undefined && value.w !== 0
      ? { t: 'mixed', w: value.w, n: value.n, d: value.d }
      : { t: 'frac', n: value?.n ?? value, d: value?.d ?? 1 };
    default: return { t: 'num', v: String(value) };
  }
}

/**
 * The same terms as plain text, for aria labels, logs and the attempt record.
 */
const flat = (v) => (Array.isArray(v) ? promptText(v) : v === null || v === undefined ? '?' : String(v));

export function promptText(terms) {
  return (terms ?? []).map((t) => {
    switch (t?.t) {
      case 'num': return String(t.v);
      case 'frac': return `${flat(t.n)}/${flat(t.d)}`;
      case 'mixed': return `${flat(t.w)} ${flat(t.n)}/${flat(t.d)}`;
      case 'pow': return `${flat(t.b)}^${t.e === null ? '?' : flat(t.e)}`;
      case 'root': return `${t.c === undefined ? '' : (t.c === null ? '?' : flat(t.c))}`
        + `${t.i === undefined ? 'sqrt' : `root${t.i}`}(${flat(t.v)})`;
      case 'var': return String(t.v);
      case 'group': return `(${promptText(t.terms)})`;
      case 'juxt': return promptText(t.terms).replace(/ /g, '');
      case 'math': return ` ${promptText(t.terms)} `;
      case 'op': return ` ${t.v} `;
      case 'blank': return '?';
      case 'prose': return String(t.v);
      default: return '';
    }
  }).join('').replace(/\s+/g, ' ').trim();
}
