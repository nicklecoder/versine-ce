/**
 * Term builders for prompts.
 *
 * Authoring-time only: generators compose these into the term arrays stored in
 * the catalogue. The matching renderer is web/ui/prompt.js, which is the half
 * that ships. Keep the two in step — the term kinds here are the ones it knows.
 */
export const num = (v, s = 1) => ({ t: 'num', v: String(v), s });
export const frac = (n, d, s = 1) => ({ t: 'frac', n, d, s });
export const mixed = (w, n, d, s = 1) => ({ t: 'mixed', w, n, d, s });
/** A power. Pass e: null to ask for the exponent. */
export const pow = (b, e, s = 1) => ({ t: 'pow', b: String(b), e, s });
/**
 * A square root. Omit `c` for a bare root, pass null to ask for the
 * coefficient, or a number to show one.
 */
export const root = (v, c, s = 1) => (c === undefined
  ? { t: 'root', v, s }
  : { t: 'root', c, v, s });
/** A variable. Named `letter` because `var` is a reserved word. */
export const letter = (v, s = 1) => ({ t: 'var', v: String(v), s });
export const op = (v) => ({ t: 'op', v });
/**
 * Brackets around a nested list of terms.
 *
 * Needed the moment a negative operand follows an operator: `1/2 − −3/4` is
 * unreadable and `1/2 − (−3/4)` is how it is written everywhere else.
 */
export const group = (terms, s = 1) => ({ t: 'group', terms, s });
export const blank = () => ({ t: 'blank' });
export const prose = (v, s = 1) => ({ t: 'prose', v: String(v), s });
/** An equation or expression set inside a sentence, kept in one unbroken piece. */
export const math = (terms) => ({ t: 'math', terms });

/** The common shape: terms, an equals, and the space for an answer. */
export const asks = (...terms) => [...terms, op('='), blank()];
