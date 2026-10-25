/**
 * A vector in the plane, written in component form ⟨a, b⟩.
 *
 * Angle brackets are on no keyboard, so the box reads < and > for them, as
 * its key guide says: <3, -4> is ⟨3, −4⟩. Each component is a whole number,
 * a fraction or a decimal, compared exactly, so ⟨3/5, −4/5⟩ and
 * ⟨0.6, −0.8⟩ are one vector. The unit-vector form 3i − 4j is read too,
 * since a textbook writes it that way as often. A pair in round brackets,
 * (3, −4), is a point: it is refused with the hint to use angle brackets,
 * and not marked, because it answers in the wrong notation rather than with
 * the wrong vector.
 *
 * Value: { x, y }, each a fraction { n, d }.
 */
import { previewOf } from '../ui/express.js';

const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const reduce = (n, d) => {
  if (d < 0) { n = -n; d = -d; }
  const g = gcd(n, d) || 1;
  return { n: n / g, d: d / g };
};

/** A component: −3, 5/2, 0.25, or a bare sign for i or j alone. */
function component(text) {
  const s = text.replace(/\s+/g, '');
  let m = s.match(/^([+-]?\d+)\/(\d+)$/);
  if (m) return +m[2] === 0 ? null : reduce(parseInt(m[1], 10), parseInt(m[2], 10));
  m = s.match(/^([+-]?)(\d*)(?:\.(\d+))?$/);
  if (!m || (m[2] === '' && !m[3])) return null;
  const d = 10 ** (m[3] ?? '').length;
  const n = parseInt(m[2] || '0', 10) * d + (m[3] ? parseInt(m[3], 10) : 0);
  return reduce(m[1] === '-' ? -n : n, d);
}

const ANGLE = /^[<⟨〈]\s*([^,<>⟨⟩〈〉]+?)\s*,\s*([^,<>⟨⟩〈〉]+?)\s*[>⟩〉]$/;

/**
 * ai + bj in any order and any spelling a student reaches for: 3i − 4j,
 * −4j + 3i, 3i + −4j, 3i + (−4)j, (3/5)i + (4/5)j, i − j, 2j. Each term is
 * a sign (or two, + − read as −), a coefficient bare or in brackets, and
 * i or j; each letter at most once, and an absent one is 0.
 */
// requiem: play/answers/vector-unit-form-any-order
function unitForm(s) {
  const t = s.replace(/\s+/g, '');
  if (!/[ij]/.test(t)) return null;
  const TERM = /([+-]*)(?:\(([+-]?[\d./]+)\)|([\d./]*))\*?([ij])/y;
  const out = {};
  let at = 0;
  while (at < t.length) {
    TERM.lastIndex = at;
    const m = TERM.exec(t);
    if (!m) return null;
    // The first term may be unsigned; every later one needs its sign.
    if (at > 0 && !m[1]) return null;
    if (m[4] in out) return null;
    const negs = (m[1].match(/-/g) ?? []).length;
    const body = m[2] ?? m[3];
    let c = body === '' ? { n: 1, d: 1 } : component(body);
    if (!c) return null;
    if (negs % 2) c = { n: -c.n, d: c.d };
    out[m[4]] = c;
    at = TERM.lastIndex;
  }
  return { x: out.i ?? { n: 0, d: 1 }, y: out.j ?? { n: 0, d: 1 } };
}

/**
 * Read a typed vector.
 * @returns {{ok: true, value: {x, y}, texts: string[]} | {ok: false, hint: string}}
 */
export function parseVector(raw) {
  const s = String(raw).trim().replace(/[−–—]/g, '-');
  if (!s) return { ok: false, hint: 'Write the vector in angle brackets, like <3, −4>.' };
  const m = s.match(ANGLE);
  if (m) {
    const x = component(m[1]), y = component(m[2]);
    if (!x || !y) return { ok: false, hint: 'Each component is a number, like <3, −4> or <3/5, −4/5>.' };
    return { ok: true, value: { x, y }, texts: [m[1].trim(), m[2].trim()], decimal: /\./.test(s) };
  }
  const u = unitForm(s.toLowerCase());
  if (u) return { ok: true, value: u, texts: [fracText(u.x), fracText(u.y)], decimal: /\./.test(s) };
  if (/^\(.*\)$/.test(s) && s.split(',').length === 2) {
    return { ok: false, hint: 'A vector is written in angle brackets, not round ones: type <3, −4> for ⟨3, −4⟩.' };
  }
  if (/^[<⟨〈][^,]*[>⟩〉]$/.test(s) || /^[<⟨〈].*,.*,.*[>⟩〉]$/.test(s)) {
    return { ok: false, hint: 'A vector here has two components with a comma between, like <3, −4>.' };
  }
  return { ok: false, hint: 'Write the vector in angle brackets, like <3, −4>.' };
}

/** Whether a fraction is a decimal that ends: its denominator only 2s and 5s. */
const ends = (c) => { let d = c.d; while (d % 2 === 0) d /= 2; while (d % 5 === 0) d /= 5; return d === 1; };

/**
 * A decimal typed where a component of the answer is a fraction with no
 * ending decimal (5/13) is a rounding, near it and never equal: asked again
 * for the exact form, as the roots box asks again for a rounded root, rather
 * than marked wrong. Decided from the question alone: the same typing is
 * refused whether its digits are right or not.
 */
// requiem: play/answers/vector-decimal-asked-exactly
export function inexactHint(parsed, spec) {
  if (!parsed.decimal) return null;
  const v = spec.value;
  return ends(v.x) && ends(v.y) ? null : 'Give it exactly, with fractions like <5/13, −12/13>, not decimals.';
}

export const sameVector = (a, b) => a.x.n * b.x.d === b.x.n * a.x.d && a.y.n * b.y.d === b.y.n * a.y.d;

const fracText = (c) => (c.d === 1 ? String(c.n) : `${c.n}/${c.d}`);

/** ⟨3, −4⟩ · ⟨3/5, −4/5⟩ */
export const formatVector = (v) => `⟨${fracText(v.x).replace('-', '−')}, ${fracText(v.y).replace('-', '−')}⟩`;

/** The typed vector drawn as written, each component as the expression box draws it. */
export function previewVector(raw) {
  const r = parseVector(raw);
  if (!r.ok) return { ok: false, error: r.hint };
  const inside = [];
  for (const [j, c] of r.texts.entries()) {
    const drawn = previewOf(c);
    if (!drawn.ok) return drawn;
    if (j) inside.push({ t: 'prose', v: ',' });
    inside.push(...drawn.terms);
  }
  return { ok: true, terms: [{ t: 'prose', v: '⟨' }, ...inside, { t: 'prose', v: '⟩' }] };
}
