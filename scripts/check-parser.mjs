/**
 * The expression parser, checked against the syntax the README commits to.
 *
 * Four properties, in the order they matter:
 *
 *   1. It reads things the way every other tool does. `2^1/2` binds the
 *      exponent tightly, `−2^2` is −(2²), `2^3^2` is right-associative.
 *   2. It never evaluates. Every operand that goes in comes out.
 *   3. Two spellings of one expression are judged the same, and two different
 *      expressions are not.
 *   4. Nonsense is refused, with something a person could act on.
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const stub = () => ({
  classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
  setAttribute() {}, append() {}, addEventListener() {}, focus() {},
  style: { setProperty() {} },
});
globalThis.document = { createElement: stub, createTextNode: (t) => ({ t }) };

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { parseExpression, canonical } = await import(join(ROOT, 'web/math/parse.js'));
const { previewOf } = await import(join(ROOT, 'web/ui/express.js'));
const { promptText } = await import(join(ROOT, 'web/ui/prompt.js'));

const fail = [];
const canon = (s) => { const r = parseExpression(s); return r.ok ? canonical(r.ast) : null; };

// ── 1. Reads the way the rest of the world reads ─────────────────────────
for (const [src, want] of [
  ['2^1/2', '((2^1)/2)'], ['2^(1/2)', '(2^(1/2))'],
  ['-2^2', '-((2^2))'], ['2^3^2', '(2^(3^2))'],
  ['2x+1', '((2*x)+1)'], ['1/2/3', '((1/2)/3)'],
  ['2**5', '(2^5)'], ['√50', 'sqrt(50)'],
]) {
  const got = canon(src);
  if (got !== want) fail.push(`${src} reads as ${got}, expected ${want}`);
}

// ── 2. Never evaluates ───────────────────────────────────────────────────
// A preview that simplified would do the student's work, and it is the kind
// of thing that gets built by accident.
let rendered = 0;
for (let a = 1; a <= 12; a++) {
  for (let b = 1; b <= 12; b++) {
    for (const op of ['+', '-', '*', '/', '^']) {
      const src = `${a}${op}${b}`;
      const r = previewOf(src);
      rendered++;
      if (!r.ok) { fail.push(`${src} would not parse`); continue; }
      const digits = promptText(r.terms).replace(/[^0-9]/g, '');
      if (!digits.includes(String(a)) || !digits.includes(String(b))) {
        fail.push(`${src} lost an operand: drew "${promptText(r.terms)}"`);
      }
    }
  }
}
for (const [src, mustNot] of [['4/8', '1/2'], ['2+3', '5'], ['sqrt(4)', '2'], ['2^3', '8']]) {
  if (canon(src) === canon(mustNot)) fail.push(`${src} was simplified to ${mustNot}`);
}

// ── 3. Judged the same, and judged apart ─────────────────────────────────
for (const [a, b] of [['x+1', '1+x'], ['2x', 'x*2'], ['x-1', '-1+x'],
                      ['5sqrt(2)', 'sqrt(2)*5'], ['a+b+c', 'c+b+a'], ['2.0', '2'],
                      // A leading minus is read as (−2)·x, a subtraction as minus 2·x:
                      // the same expression, and once refused as a wrong answer.
                      ['-2x+3', '3-2x'], ['-(-x)', 'x'], ['10-3a', '-3a+10']]) {
  if (canon(a) !== canon(b)) fail.push(`${a} and ${b} should be accepted for each other`);
}
for (const [a, b] of [['a-b', 'b-a'], ['1/2', '2^-1'], ['x-1', 'x+1'], ['2/x', 'x/2'], ['-3x', '3x']]) {
  if (canon(a) === canon(b)) fail.push(`${a} and ${b} should be told apart`);
}

// ── 4. Refuses nonsense, and says something useful ───────────────────────
for (const src of ['2+', '(1+2', 'sqrt 4', '2^', 'xyz', '1.2.3', '2)', 'sqrt(1,2)', '2 @ 3', '']) {
  const r = parseExpression(src);
  if (r.ok) fail.push(`"${src}" was accepted`);
  else if (!r.error || r.error.length < 8) fail.push(`"${src}" refused without a reason`);
}

if (fail.length) {
  console.log(`${fail.length} parser problem(s):`);
  for (const f of fail) console.log('  ' + f);
  process.exit(1);
}
console.log(`parser: ${rendered.toLocaleString()} expressions drawn, none evaluated — all checks pass`);
