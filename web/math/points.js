/**
 * A set of points: where two curves meet, or the one solution of a system
 * in three letters.
 *
 * Written the way it is on paper -- (−3, 4), (3, 4) for two points, (2, −1, 3)
 * for x, y and z -- and judged as a set: the points in any order, each
 * coordinate a whole number, a fraction or a decimal compared exactly. Where
 * the curves do not meet, none or no solution is the empty set, as the
 * solutions box reads it. A point is ordered, so (3, 4) is not (4, 3), and
 * every point of one answer has the same number of coordinates.
 *
 * Value: { dim, pts }, pts a sorted list of points, each a list of {n, d}.
 */
import { previewOf } from '../ui/express.js';

const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const reduce = (n, d) => {
  if (d < 0) { n = -n; d = -d; }
  const g = gcd(n, d) || 1;
  return { n: n / g, d: d / g };
};

// requiem: catalogue/content/none-offered-on-every-row
// The prompt says "or none if they do not meet", so the box reads it that way.
const NOTHING = /^(?:(?:there (?:is|are) )?(?:no (?:real )?(?:solutions?|points?)|none|no answer)|they do not meet|nothing|empty( set)?|∅|\{\s*\})$/;

/** A coordinate: −3, 5/2, 0.25. */
function coordinate(text) {
  const s = text.trim().replace(/[−–—]/g, '-');
  let m = s.match(/^([+-]?\d+)\/(\d+)$/);
  if (m) return +m[2] === 0 ? null : reduce(parseInt(m[1], 10), parseInt(m[2], 10));
  m = s.match(/^([+-]?)(\d*)(?:\.(\d+))?$/);
  if (!m || (m[2] === '' && !m[3])) return null;
  const d = 10 ** (m[3] ?? '').length;
  const n = parseInt(m[2] || '0', 10) * d + (m[3] ? parseInt(m[3], 10) : 0);
  return reduce(m[1] === '-' ? -n : n, d);
}

const cmp = (p, q) => {
  for (let i = 0; i < p.length; i++) {
    const diff = p[i].n * q[i].d - q[i].n * p[i].d;
    if (diff) return diff;
  }
  return 0;
};

/**
 * Read the typed points.
 * @returns {{ok: true, value: {dim: number|null, pts: Array}, texts: string[][]} | {ok: false, hint: string}}
 */
export function parsePoints(raw) {
  const s = String(raw).trim().toLowerCase().replace(/\s+/g, ' ');
  if (!s) return { ok: false, hint: 'Give each point in brackets, like (3, −2).' };
  if (NOTHING.test(s.replace(/[.!]$/, ''))) return { ok: true, value: { dim: null, pts: [] }, texts: [] };
  const groups = [...s.matchAll(/\(([^()]*)\)/g)];
  // Between the points: commas, semicolons, and or or.
  const between = s.replace(/\([^()]*\)/g, ' ').replace(/\b(?:and|or)\b|[,;]/g, ' ').trim();
  if (!groups.length || between) {
    return { ok: false, hint: /[a-z]\s*=/.test(s)
      ? 'Write each point as its coordinates in brackets, like (3, −2), not as x = 3.'
      : 'Give each point in brackets, like (3, −2), or none if there are none.' };
  }
  const pts = [], texts = [];
  for (const [, inside] of groups) {
    const parts = inside.split(',');
    const coords = parts.map(coordinate);
    if (parts.length < 2 || coords.some((c) => !c)) return { ok: false, hint: 'Each point is numbers in brackets with commas between, like (3, −2).' };
    pts.push(coords);
    texts.push(parts.map((p) => p.trim()));
  }
  const dim = pts[0].length;
  if (pts.some((p) => p.length !== dim)) return { ok: false, hint: 'Every point needs the same number of coordinates.' };
  const unique = [];
  for (const p of pts.sort(cmp)) if (!unique.length || cmp(unique[unique.length - 1], p)) unique.push(p);
  return { ok: true, value: { dim, pts: unique }, texts };
}

/** The same points, in any order: an empty set equals an empty set of any size. */
export function samePoints(a, b) {
  if (a.pts.length !== b.pts.length) return false;
  if (!a.pts.length) return true;
  if (a.dim !== b.dim) return false;
  return a.pts.every((p, i) => cmp(p, b.pts[i]) === 0);
}

const coordText = (c) => (c.d === 1 ? String(c.n) : `${c.n}/${c.d}`).replace('-', '−');

/** (−3, 4), (3, 4) · none */
export function formatPoints(v) {
  if (!v.pts.length) return 'none';
  return v.pts.map((p) => `(${p.map(coordText).join(', ')})`).join(', ');
}

/** The typed points drawn as written, a fraction stacked, nothing worked out. */
export function previewPoints(raw) {
  const r = parsePoints(raw);
  if (!r.ok) return { ok: false, error: r.hint };
  if (!r.texts.length) return { ok: true, terms: [{ t: 'prose', v: 'none' }] };
  const terms = [];
  for (const [i, coords] of r.texts.entries()) {
    if (i) terms.push({ t: 'prose', v: 'and' });
    const inside = [];
    for (const [j, c] of coords.entries()) {
      const drawn = previewOf(c);
      if (!drawn.ok) return drawn;
      if (j) inside.push({ t: 'prose', v: ',' });
      inside.push(...drawn.terms);
    }
    terms.push({ t: 'group', terms: inside });
  }
  return { ok: true, terms };
}

/** One point typed where the answer has more: right so far, and told so. */
export function partOf(v, key) {
  return v.pts.length > 0 && v.pts.length < key.pts.length && v.dim === key.dim
    && v.pts.every((p) => key.pts.some((q) => cmp(p, q) === 0));
}
