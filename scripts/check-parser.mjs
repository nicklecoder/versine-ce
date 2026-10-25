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
import { readFileSync, readdirSync } from 'node:fs';
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
const { promptText, answerTerm } = await import(join(ROOT, 'web/ui/prompt.js'));

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
// requiem: play/answers/side-by-side-keeps-brackets
// Factors set side by side keep the brackets that keep them apart.
// requiem: play/answers/power-bracket-on-base
for (const [src, want] of [['(-2a^3)(3b)', '(−2a^3)(3b)'], ['2(3)', '2(3)'], ['x(3)', 'x(3)'], ['2x(3)^2', '2x(3)^2'], ['500(1.04)^x', '500(1.04)^x']]) {
  const got = promptText(previewOf(src).terms);
  if (got !== want) fail.push(`${src} was drawn as ${got}, expected ${want}`);
}
for (const [src, mustNot] of [['4/8', '1/2'], ['2+3', '5'], ['sqrt(4)', '2'], ['2^3', '8']]) {
  if (canon(src) === canon(mustNot)) fail.push(`${src} was simplified to ${mustNot}`);
}

// ── 3. Judged the same, and judged apart ─────────────────────────────────
for (const [a, b] of [['x+1', '1+x'], ['2x', 'x*2'], ['x-1', '-1+x'],
                      ['5sqrt(2)', 'sqrt(2)*5'], ['a+b+c', 'c+b+a'], ['2.0', '2'],
                      // requiem: play/answers/signs-lifted-out
                      // A leading minus is read as (−2)·x, a subtraction as minus 2·x:
                      // the same expression, and once refused as a wrong answer.
                      ['-2x+3', '3-2x'], ['-(-x)', 'x'], ['10-3a', '-3a+10'],
                      // Letters side by side are a product, as on paper.
                      ['6ab', '6ba'], ['3xy^2', '3y^2x'], ['xyz', 'x*y*z'],
                      // And a quotient's sign comes out as a product's does.
                      ['-4/x^2', '-(4/x^2)'], ['-4/x^2', '4/(-x^2)']]) {
  if (canon(a) !== canon(b)) fail.push(`${a} and ${b} should be accepted for each other`);
}
for (const [a, b] of [['a-b', 'b-a'], ['1/2', '2^-1'], ['x-1', 'x+1'], ['2/x', 'x/2'], ['-3x', '3x'],
                      // The power is on the last letter alone.
                      ['xy^2', '(xy)^2']]) {
  if (canon(a) === canon(b)) fail.push(`${a} and ${b} should be told apart`);
}

// ── 4. Refuses nonsense, and says something useful ───────────────────────
for (const src of ['2+', '(1+2', 'sqrt 4', '2^', 'sqrtx', '1.2.3', '2)', 'sqrt(1,2)', '2 @ 3', '']) {
  const r = parseExpression(src);
  if (r.ok) fail.push(`"${src}" was accepted`);
  else if (!r.error || r.error.length < 8) fail.push(`"${src}" refused without a reason`);
}

// An answer filling the blank in its question is drawn in its own type's
// notation: a decimal held as {n, d} is 0.25, never "[object Object]".
for (const file of readdirSync(join(ROOT, 'web/library')).filter((f) => /-\d+\.json$/.test(f))) {
  const { problems } = JSON.parse(readFileSync(join(ROOT, 'web/library', file), 'utf8'));
  const p = problems[0];
  // A choice fills no blank, and its id may well be the word "undefined".
  if (p.answer.type === 'choice') continue;
  const drawn = promptText([answerTerm(p.answer.type, p.answer.value)].flat());
  if (/\[object|undefined|NaN/.test(drawn)) fail.push(`${file}: the answer ${p.answer.accept[0]} was drawn as "${drawn}"`);
  // A mixed number is held improper and must be drawn as the mixed number:
  // the reveal once read "117/20 = 117/20" where 5 17/20 was asked for.
  for (const q of problems.filter((q) => q.answer.type === 'mixed')) {
    const shown = promptText([answerTerm('mixed', q.answer.value)].flat());
    if (shown !== q.answer.accept[0]) {
      fail.push(`${file}: the mixed answer ${q.answer.accept[0]} was drawn as "${shown}"`);
      break;
    }
  }
  // requiem: catalogue/content/us-notation
  // A price answer is drawn in dollars and cents, ($4.50, $1.00, $0.75),
  // never as the fractions it is held as.
  for (const q of problems.filter((q) => q.answer.type === 'points' && q.answer.value.money)) {
    const shown = promptText([answerTerm('points', q.answer.value)].flat());
    if (!/^\(\$\d+\.\d\d, ?\$\d+\.\d\d, ?\$\d+\.\d\d\)$/.test(shown.replace(/\s+/g, ' ').replace(/ ,/g, ','))) {
      fail.push(`${file}: the price answer ${q.answer.accept[0]} was drawn as "${shown}"`);
      break;
    }
  }
}

if (fail.length) {
  console.log(`${fail.length} parser problem(s):`);
  for (const f of fail) console.log('  ' + f);
  process.exit(1);
}
console.log(`parser: ${rendered.toLocaleString()} expressions drawn, none evaluated — all checks pass`);
