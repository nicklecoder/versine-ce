/**
 * A set of real numbers written the ways a student writes one.
 *
 * Inequalities, compound inequalities and absolute value all answer with a
 * set on the number line: one interval (−2 < x ≤ 5), two (x < −1 or x > 3),
 * a pair of points (x = ±3), everything, or nothing. Students write the same
 * set many ways -- 3 > x for x < 3, interval notation, "and" spelled out --
 * and the set, not the spelling, is what was asked for. So every form is read
 * into one canonical list of intervals, sorted and merged, and two answers
 * are equal exactly when their lists are.
 *
 * An interval is { lo, loIn, hi, hiIn }: each end a fraction { n, d }, or
 * null for no end at all, and whether the end itself is in. A point is an
 * interval whose ends meet and are both in.
 *
 * @typedef {{n:number, d:number}} Frac
 * @typedef {{lo:Frac|null, loIn:boolean, hi:Frac|null, hiIn:boolean}} Part
 */

const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
function frac(n, d) {
  const g = gcd(n, d) || 1;
  return d < 0 ? { n: -n / g, d: -d / g } : { n: n / g, d: d / g };
}
/** Negative, zero or positive as a is below, at or above b. */
const cmp = (a, b) => a.n * b.d - b.n * a.d;

/** "3", "-2.5", "7/2": exact, or null. */
function number(text) {
  let m = text.match(/^([+-]?\d+)\/(\d+)$/);
  if (m) return +m[2] === 0 ? null : frac(+m[1], +m[2]);
  m = text.match(/^([+-]?)(\d*)(?:\.(\d+))?$/);
  if (!m || (m[2] === '' && !m[3])) return null;
  const d = 10 ** (m[3] ?? '').length;
  const n = parseInt(m[2] || '0', 10) * d + (m[3] ? parseInt(m[3], 10) : 0);
  return frac(m[1] === '-' ? -n : n, d);
}

const ALL = [{ lo: null, loIn: false, hi: null, hiIn: false }];
const point = (v) => ({ lo: v, loIn: true, hi: v, hiIn: true });

/** Is the lower end of a below that of b? Open below closed at a tie. */
function lowerFirst(a, b) {
  if (a.lo === null || b.lo === null) return a.lo === null ? (b.lo === null ? 0 : -1) : 1;
  return cmp(a.lo, b.lo) || (a.loIn === b.loIn ? 0 : a.loIn ? -1 : 1);
}

/** Sorted, with overlapping and touching intervals merged, and empty ones gone. */
export function normalize(parts) {
  const live = parts.filter((p) => p.lo === null || p.hi === null || cmp(p.lo, p.hi) < 0
    || (cmp(p.lo, p.hi) === 0 && p.loIn && p.hiIn));
  const sorted = live.slice().sort(lowerFirst);
  const out = [];
  for (const p of sorted) {
    const last = out[out.length - 1];
    const meets = last && (last.hi === null || p.lo === null || cmp(p.lo, last.hi) < 0
      || (cmp(p.lo, last.hi) === 0 && (last.hiIn || p.loIn)));
    if (!meets) { out.push({ ...p }); continue; }
    if (last.hi === null) continue;
    if (p.hi === null || cmp(p.hi, last.hi) > 0) { last.hi = p.hi; last.hiIn = p.hiIn; }
    else if (cmp(p.hi, last.hi) === 0) last.hiIn = last.hiIn || p.hiIn;
  }
  return out;
}

function intersect(as, bs) {
  const out = [];
  for (const a of as) {
    for (const b of bs) {
      const lo = a.lo === null ? b : b.lo === null ? a : cmp(a.lo, b.lo) > 0 ? a : cmp(a.lo, b.lo) < 0 ? b : null;
      const hi = a.hi === null ? b : b.hi === null ? a : cmp(a.hi, b.hi) < 0 ? a : cmp(a.hi, b.hi) > 0 ? b : null;
      out.push({
        lo: (lo ?? a).lo, loIn: lo ? lo.loIn : a.loIn && b.loIn,
        hi: (hi ?? a).hi, hiIn: hi ? hi.hiIn : a.hiIn && b.hiIn,
      });
    }
  }
  return normalize(out);
}

// requiem: catalogue/content/none-offered-on-every-row
// A prompt says "or say there is none", so the box reads it said that way.
const NOTHING = /^(?:(?:there (?:is|are) )?(?:no (?:real )?solutions?|none|no answer)|nothing|empty( set)?|∅|\{\s*\})$/;
const EVERYTHING = /^(all real numbers|all reals|all numbers|every number|any number|everything|r|ℝ|\(-inf, ?\+?inf\))$/;

/** One end of an interval in interval notation. */
const end = (t) => (/^[+-]?inf$/.test(t) ? null : number(t));

/**
 * One relation, or a chain of two: x > 3, 3 > x, −2 < x ≤ 5, x = ±3, x ≠ 1.
 * @returns {{ok:true, parts:Part[], letter:string|null}|{ok:false, hint?:string}}
 */
function relation(text) {
  const bits = text.split(/\s*(<=|>=|!=|<|>|=)\s*/).filter((b) => b !== '');
  // A bare number, or ±3, is the solution itself.
  if (bits.length === 1) {
    const pm = bits[0].match(/^\+-(.+)$/);
    const v = number(pm ? pm[1] : bits[0]);
    if (!v) return { ok: false };
    return { ok: true, letter: null, parts: pm ? [point({ n: -v.n, d: v.d }), point(v)] : [point(v)] };
  }
  const isLetter = (b) => /^[a-z]$/.test(b);
  if (bits.length === 3) {
    let [l, op, r] = bits;
    if (isLetter(r) && !isLetter(l)) {
      [l, r] = [r, l];
      op = { '<': '>', '>': '<', '<=': '>=', '>=': '<=' }[op] ?? op;
    }
    if (!isLetter(l)) return { ok: false };
    const pm = r.match(/^\+-(.+)$/);
    const v = number(pm ? pm[1] : r);
    if (!v) return { ok: false };
    // x ≠ ±2 leaves out both.
    if (pm && op === '!=') {
      const both = [{ n: -v.n, d: v.d }, v].sort(cmp);
      return { ok: true, letter: l, parts: complement(both.map(point)) };
    }
    if (pm && op !== '=') return { ok: false, hint: '± goes with = or ≠, like x = ±3.' };
    const parts = {
      '=': pm ? [point({ n: -v.n, d: v.d }), point(v)] : [point(v)],
      '!=': [{ lo: null, loIn: false, hi: v, hiIn: false }, { lo: v, loIn: false, hi: null, hiIn: false }],
      '<': [{ lo: null, loIn: false, hi: v, hiIn: false }],
      '<=': [{ lo: null, loIn: false, hi: v, hiIn: true }],
      '>': [{ lo: v, loIn: false, hi: null, hiIn: false }],
      '>=': [{ lo: v, loIn: true, hi: null, hiIn: false }],
    }[op];
    return { ok: true, letter: l, parts };
  }
  if (bits.length === 5) {
    const [a, op1, x, op2, b] = bits;
    if (!isLetter(x)) return { ok: false };
    const lo = number(a), hi = number(b);
    if (!lo || !hi) return { ok: false };
    const up = (op) => op === '<' || op === '<=';
    const down = (op) => op === '>' || op === '>=';
    if (up(op1) && up(op2)) {
      return { ok: true, letter: x, parts: [{ lo, loIn: op1 === '<=', hi, hiIn: op2 === '<=' }] };
    }
    if (down(op1) && down(op2)) {
      return { ok: true, letter: x, parts: [{ lo: hi, loIn: op2 === '>=', hi: lo, hiIn: op1 === '>=' }] };
    }
    return { ok: false, hint: 'Both signs in a chain point the same way, like −2 < x ≤ 5.' };
  }
  return { ok: false };
}

/**
 * Read a set as a student types it.
 * @returns {{ok:true, value:{letter:string, parts:Part[]}}|{ok:false, hint?:string}}
 */
export function parseSet(raw) {
  let text = String(raw).trim().toLowerCase()
    .replace(/[−–—]/g, '-').replace(/≤|=<|⩽/g, '<=').replace(/≥|=>|⩾/g, '>=')
    // requiem: play/answers/symbols-typed-on-a-keyboard
    // ≠ is on no keyboard: != is the spelling taught beside the box, and =/=,
    // /= and <> are the other ones people reach for.
    .replace(/≠|=\/=|\/=|<>/g, '!=')
    .replace(/±|\+\/-/g, '+-').replace(/∞|infinity/g, 'inf').replace(/∪/g, ' u ')
    .replace(/\s+/g, ' ')
    // "x = ± 3" is x = ±3, and a sentence's full stop is not part of it.
    .replace(/\+- /g, '+-').replace(/\.$/, '')
    // An angle asked in degrees may be typed with its sign: 30° is 30.
    .replace(/°/g, '');
  if (!text) return { ok: false };
  if (NOTHING.test(text)) return { ok: true, value: { letter: 'x', parts: [] } };
  if (EVERYTHING.test(text)) return { ok: true, value: { letter: 'x', parts: ALL } };

  // Interval notation: (−2, 5], [4, ∞), joined by U or "or".
  // (−1, 0), (1, 0) are the points where a graph crosses, not intervals:
  // a list of them, joined by commas, where intervals are joined by U or
  // "or". One alone, (−3, 0), is an interval.
  if (/^\(\s*[+-]?[\d./]+\s*,\s*0\s*\)(\s*,\s*\(\s*[+-]?[\d./]+\s*,\s*0\s*\))+$/.test(text)) {
    return { ok: false, hint: 'Give the x-values where it crosses, like x = −1 or x = 1.' };
  }
  if (/^[([]/.test(text)) {
    const parts = [];
    const pieces = text.split(/\s*(?:\bu\b|\bor\b)\s*/);
    for (const piece of pieces) {
      const m = piece.match(/^([([])\s*([+-]?[\d./]+|-inf)\s*,\s*(\+?inf|[+-]?[\d./]+)\s*([)\]])$/);
      if (!m) return { ok: false, hint: 'An interval is two ends in brackets, like (−2, 5].' };
      const lo = end(m[2]), hi = end(m[3]);
      if ((lo === null && m[1] === '[') || (hi === null && m[4] === ']')) {
        return { ok: false, hint: 'Infinity is never included: it takes a round bracket.' };
      }
      if ((lo === null && !/inf/.test(m[2])) || (hi === null && !/inf/.test(m[3]))) return { ok: false };
      parts.push({ lo, loIn: m[1] === '[', hi, hiIn: m[4] === ']' });
    }
    return { ok: true, value: { letter: 'x', parts: normalize(parts) }, pieces: pieces.length };
  }

  // Inequalities and equations: clauses joined by "or" (or commas), each
  // perhaps several joined by "and".
  //
  // A comma lists solutions -- x = −1, x = 1 -- but between inequalities it
  // could as well mean "and" as "or", and reading it as "or" silently made
  // x > −2, x < 5 every number. So there it is refused with a question back.
  //
  // requiem: play/answers/set-comma-after-not-equal
  // Beside a ≠, though, a comma can only mean "and": x ≠ −2, 6 leaves out
  // two numbers, and x ≥ −1, x ≠ 1 is a ray with a hole. Read that way when
  // a ≠ is there and at most one other inequality, so nothing is guessed.
  const listed = text.split(/\s*[,;]\s*/);
  if (listed.length > 1 && /!=/.test(text) && !/\bor\b/.test(text)
    && listed.filter((q) => /[<>]|(^|[^!<>])=/.test(q) && !/!=/.test(q)).length <= 1) {
    text = listed.join(' and ');
  }
  const clauses = text.split(/\s*(?:\bor\b|,|;)\s*/);
  if (/,|;/.test(text) && /[<>]|!=/.test(text)) {
    return { ok: false, hint: 'Join inequalities with "and" or "or": a comma could mean either.' };
  }
  let letter = null;
  let parts = [];
  let written = 0;
  for (const clause of clauses) {
    let set = ALL;
    const pieces = clause.split(/\s*\band\b\s*/);
    written += pieces.length;
    // x = 3 and x = −3 is how solutions are often listed aloud, but read as
    // written it is no number at all. Said back, not marked wrong.
    if (pieces.length > 1 && pieces.every((q) => !/[<>]|!=/.test(q))) {
      return { ok: false, hint: 'x cannot be both at once: join the solutions with "or", like x = 3 or x = −3.' };
    }
    let after = null;
    for (const piece of pieces) {
      // x ≠ −2 and 6: a number alone after a ≠ is one more left out.
      const bare = after && /^[+-]?[\d./]+$/.test(piece.trim());
      const r = relation(bare ? `${after} != ${piece.trim()}` : piece.trim());
      after = r.ok && /!=/.test(piece) ? r.letter : bare ? after : null;
      if (!r.ok) return { ok: false, hint: r.hint ?? 'Write it like −2 < x ≤ 5, or x < −1 or x > 3.' };
      if (r.letter && letter && r.letter !== letter) return { ok: false, hint: 'Use one letter throughout.' };
      letter = letter ?? r.letter;
      set = intersect(set, r.parts);
    }
    parts = parts.concat(set);
  }
  return { ok: true, value: { letter: letter ?? 'x', parts: normalize(parts) }, pieces: written, typedLetter: letter };
}

/**
 * Written in no more pieces than the set needs: one interval per run, and
 * one for no solution or every number. x < −1 and x < −2 is two pieces for
 * a set that is one ray, so it is the question copied back, not combined.
 * `pieces` is how many relations or intervals were typed, from parseSet.
 */
// requiem: play/answers/set-simplest-form-refused-copy
export function combined(value, pieces) {
  return pieces == null || pieces <= Math.max(1, value.parts.length);
}

/** Every number the parts leave out, as parts. */
export function complement(parts) {
  const set = normalize(parts);
  const out = [];
  let lo = null, loIn = false;
  for (const p of set) {
    if (p.lo !== null) out.push({ lo, loIn, hi: p.lo, hiIn: !p.loIn });
    if (p.hi === null) return normalize(out);
    lo = p.hi; loIn = !p.hiIn;
  }
  out.push({ lo, loIn, hi: null, hiIn: false });
  return normalize(out);
}

/** The points every number but which the set is, or null: x ≠ −2 and x ≠ 6. */
function allBut(set) {
  if (set.length < 2 || set[0].lo !== null || set[set.length - 1].hi !== null) return null;
  const holes = [];
  for (let i = 0; i < set.length - 1; i++) {
    const p = set[i], q = set[i + 1];
    if (p.hiIn || q.loIn || cmp(p.hi, q.lo) !== 0) return null;
    holes.push(p.hi);
  }
  return holes;
}

/** Whether a set is a few numbers, rather than a stretch of the line. */
const pointsOnly = (set) => set.length > 0 && set.every((p) => p.lo !== null && p.hi !== null && cmp(p.lo, p.hi) === 0);

/**
 * Typed exactly the other way round: every number but the excluded ones,
 * for the excluded ones, or the reverse. Told only where one of the two is
 * a few numbers -- the hint would hand over the answer to an inequality.
 */
// requiem: play/answers/set-complement-told
export function isComplement(typed, want) {
  const a = normalize(typed.parts), b = normalize(want.parts);
  if (!pointsOnly(a) && !pointsOnly(b)) return false;
  return sameSet({ parts: a }, { parts: complement(b) });
}

export function sameSet(a, b) {
  const x = normalize(a.parts), y = normalize(b.parts);
  const same = (p, q) => (p === null ? q === null : q !== null && cmp(p, q) === 0);
  return x.length === y.length && x.every((p, i) => {
    const q = y[i];
    return same(p.lo, q.lo) && same(p.hi, q.hi)
      && (p.lo === null || p.loIn === q.loIn) && (p.hi === null || p.hiIn === q.hiIn);
  });
}

const show = (f) => {
  const body = f.d === 1 ? String(Math.abs(f.n)) : `${Math.abs(f.n)}/${f.d}`;
  return f.n < 0 ? `−${body}` : body;
};

/** −2 < x ≤ 5 · x < −1 or x > 3 · x = −3 or x = 3 · all real numbers · no solution. */
export function formatSet({ letter = 'x', parts }) {
  const set = normalize(parts);
  if (!set.length) return 'no solution';
  // requiem: play/answers/set-all-but-points-shown
  // Every number but a few is said as what it is, x ≠ −2 and x ≠ 6, not as
  // the three rays and gaps between.
  const holes = allBut(set);
  if (holes) return holes.map((h) => `${letter} ≠ ${show(h)}`).join(' and ');
  return set.map((p) => {
    if (p.lo === null && p.hi === null) return 'all real numbers';
    if (p.lo === null) return `${letter} ${p.hiIn ? '≤' : '<'} ${show(p.hi)}`;
    if (p.hi === null) return `${letter} ${p.loIn ? '≥' : '>'} ${show(p.lo)}`;
    if (cmp(p.lo, p.hi) === 0) return `${letter} = ${show(p.lo)}`;
    return `${show(p.lo)} ${p.loIn ? '≤' : '<'} ${letter} ${p.hiIn ? '≤' : '<'} ${show(p.hi)}`;
  }).join(' or ');
}

/**
 * The same text as prompt terms, so the preview and the reveal draw a set
 * in the type the rest of the maths is set in.
 */
export function setTerms(value) {
  return formatSet(value).split(' ').map((w) => {
    if (/^[a-z]$/.test(w)) return { t: 'var', v: w };
    if (/^[<>≤≥=≠]$/.test(w)) return { t: 'op', v: w };
    if (/^−?[\d/]+$/.test(w)) return { t: 'num', v: w };
    return { t: 'prose', v: w };
  });
}

/**
 * What the student typed, set as notation: <= drawn as ≤, - as −, and
 * nothing else changed. The preview must not tidy a set into its canonical
 * form -- shown "all real numbers" for x > −2 or x < 5, a student would be
 * told their "or" was wrong before submitting it.
 */
export function previewSet(raw) {
  const parsed = parseSet(raw);
  if (!parsed.ok) return { ok: false, error: parsed.hint ?? 'Not a set of numbers yet.' };
  const text = String(raw).trim()
    .replace(/<=|=</g, '≤').replace(/>=|=>/g, '≥').replace(/!=|=\/=|\/=|<>/g, '≠').replace(/\+\/-|\+-/g, '±')
    .replace(/-/g, '−').replace(/\b(inf|infinity)\b/gi, '∞').replace(/\s*([<>≤≥=≠])\s*/g, ' $1 ');
  const terms = text.split(/\s+/).filter(Boolean).map((w) => {
    if (/^[a-z]$/i.test(w)) return { t: 'var', v: w };
    if (/^[<>≤≥=≠]$/.test(w)) return { t: 'op', v: w };
    if (/^[±−]?[\d./]+$/.test(w)) return { t: 'num', v: w };
    return { t: 'prose', v: w };
  });
  return { ok: true, terms };
}
