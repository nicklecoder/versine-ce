/**
 * Catalogue authoring helpers for straight lines: exact slopes, and where a
 * line crosses the edge of the plane it is drawn on.
 *
 * NOT part of the running application -- the generators that draw lines
 * share it, and nothing served to a browser imports it.
 *
 * Everything is exact. A slope is a reduced fraction { n, d } with the sign
 * on top, never a float, so 2/3 stays 2/3 all the way into the library.
 */
import { minus } from '../web/ui/dom.js';

export const gcd = (a, b) => {
  a = Math.abs(a); b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
};

/** A reduced fraction with its sign on top. */
export function ratio(n, d) {
  if (d === 0) throw new Error('zero denominator');
  const g = gcd(n, d) * Math.sign(d);
  return { n: n / g, d: d / g };
}

/** 3/4, −2, 5 -- how a slope or intercept is read aloud in an explanation. */
export function show(f) {
  const r = ratio(f.n, f.d);
  return r.d === 1 ? minus(r.n) : `${r.n < 0 ? '−' : ''}${Math.abs(r.n)}/${r.d}`;
}

/** The plain-ASCII form the answer checker reads: 3/4, -2. */
export function plain(f) {
  const r = ratio(f.n, f.d);
  return r.d === 1 ? String(r.n) : `${r.n}/${r.d}`;
}

/**
 * The visible piece of y = m x + b inside the square [-span, span]^2: where
 * it enters and leaves. Worked out from the four edges rather than by
 * stepping, so a steep line is not drawn short.
 *
 * @param {{n:number, d:number}} m  @param {{n:number, d:number}} b
 * @returns {[[number, number], [number, number]] | null}
 */
export function clip(m, b, span) {
  const mv = m.n / m.d, bv = b.n / b.d;
  const hits = [];
  for (const x of [-span, span]) {
    const y = mv * x + bv;
    if (y >= -span - 1e-9 && y <= span + 1e-9) hits.push([x, y]);
  }
  if (mv !== 0) {
    for (const y of [-span, span]) {
      const x = (y - bv) / mv;
      if (x > -span + 1e-9 && x < span - 1e-9) hits.push([x, y]);
    }
  }
  if (hits.length < 2) return null;
  hits.sort((p, q) => p[0] - q[0]);
  return [hits[0], hits[hits.length - 1]];
}

/** y = mx + b in the notation a student writes, for prompts and explanations. */
export function lineText(m, b, { ascii = false } = {}) {
  const neg = ascii ? '-' : '−';
  const mr = ratio(m.n, m.d), br = ratio(b.n, b.d);
  // In running text a fractional slope is bracketed -- "1/2x" reads as one
  // over 2x -- while the ASCII form is what the parser and the preview take.
  const size = mr.d === 1 ? String(Math.abs(mr.n))
    : ascii ? `${Math.abs(mr.n)}/${mr.d}` : `(${Math.abs(mr.n)}/${mr.d})`;
  const slope = mr.n === 0 ? '' : `${mr.n < 0 ? neg : ''}${size === '1' ? '' : size}x`;
  const bSize = br.d === 1 ? String(Math.abs(br.n)) : `${Math.abs(br.n)}/${br.d}`;
  if (!slope) return `y = ${br.n < 0 ? neg : ''}${bSize}`;
  if (br.n === 0) return `y = ${slope}`;
  return `y = ${slope} ${br.n < 0 ? neg : '+'} ${bSize}`;
}
