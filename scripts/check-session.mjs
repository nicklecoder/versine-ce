/**
 * The play loop, driven headlessly.
 *
 * Everything else checks a part: that a problem is well-formed, that a picture
 * holds its answer back, that an expression parses. Nothing checked that a run
 * actually runs -- and the prompt vocabulary, the visual dispatcher, the answer
 * types, level identity and the map's grouping have all been rebuilt underneath
 * it. A loop that no longer works would pass every other check in the repo.
 *
 * So this plays real levels from real libraries: deals problems, answers them
 * correctly and incorrectly, and holds the loop to what a student would notice.
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const stub = () => ({
  classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
  setAttribute() {}, append() {}, addEventListener() {}, focus() {},
  style: { setProperty() {} }, replaceChildren() {}, querySelector: () => null,
});
globalThis.document = { createElement: stub, createElementNS: stub, createTextNode: (t) => ({ t }) };
globalThis.performance ??= { now: () => Date.now() };

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { SKILLS } = await import(join(ROOT, 'web/engine/registry.js'));
const { Session } = await import(join(ROOT, 'web/engine/session.js'));
const { MODES } = await import(join(ROOT, 'web/engine/modes.js'));
const { dealer } = await import(join(ROOT, 'web/engine/library.js'));
const { getType } = await import(join(ROOT, 'web/math/answer.js'));
const { lessonFor } = await import(join(ROOT, 'web/engine/lesson.js'));

const fail = [];
const libOf = (skill, level) => {
  const path = join(ROOT, 'web/library', `${skill.id}-${level}.json`);
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null;
};

let played = 0, answered = 0, lessons = 0;
for (const skill of SKILLS) {
  for (let level = 0; level < skill.levels.length; level++) {
    const lib = libOf(skill, level);
    if (!lib) { fail.push(`${skill.id} L${level + 1}: no library`); continue; }

    const deck = dealer(lib.problems, () => 0.5);
    const session = new Session({
      skill, level, mode: MODES.practice, seed: 7, deal: () => deck.next(),
    });
    session.start();
    played++;

    // Answer ten problems correctly; the loop must serve and accept each.
    for (let i = 0; i < 10; i++) {
      const p = session.problem;
      if (!p) { fail.push(`${skill.id} L${level + 1}: ran out of problems at ${i}`); break; }
      const type = getType(p.answer.type);
      const raw = type.format(p.answer.value);
      const res = session.submit(raw);
      answered++;
      if (res.status !== 'correct') {
        fail.push(`${skill.id} L${level + 1}: its own answer "${raw}" to "${p.text}" was judged ${res.status}`
          + (res.hint ? ` — ${res.hint}` : ''));
        break;
      }
      session.nextProblem();
    }

    // A wrong answer must be refused rather than accepted or thrown on.
    const p = session.problem;
    if (p) {
      const type = getType(p.answer.type);
      const wrong = p.answer.type === 'choice'
        ? (p.answer.options.find((o) => o.id !== p.answer.value)?.id ?? 'nope')
        : type.format(p.answer.value) + '9';
      let res;
      try { res = session.submit(wrong); }
      catch (err) { fail.push(`${skill.id} L${level + 1}: threw on a wrong answer — ${err.message}`); }
      if (res && res.status === 'correct') {
        fail.push(`${skill.id} L${level + 1}: accepted "${wrong}" for "${p.text}"`);
      }
    }

    // And gibberish must be rejected as unreadable, not counted as wrong.
    if (session.problem && session.problem.answer.type !== 'choice') {
      const res = session.submit('%%%');
      if (res.status !== 'invalid') {
        fail.push(`${skill.id} L${level + 1}: judged gibberish as ${res.status} rather than unreadable`);
      }
    }

    // Every problem must also be explainable. A skill may author its own
    // lesson steps, and an authored lesson reads the problem -- so one written
    // against a level's usual shape crashes on the level that differs. Two
    // skills shipped a lesson that destructured a visual their strategy level
    // does not have, and every other check in the repo passed: nothing here
    // opened a lesson, and a student tapping "Why?" is what found it.
    for (const problem of lib.problems.slice(0, 40)) {
      try {
        const steps = lessonFor(skill, level, problem).steps;
        if (!steps.length) fail.push(`${skill.id} L${level + 1}: "${problem.text}" has no lesson steps`);
        else lessons++;
      } catch (err) {
        fail.push(`${skill.id} L${level + 1}: lesson threw on "${problem.text}" — ${err.message}`);
        break;
      }
    }

    session.end('quit');
    const s = session.summary();
    if (typeof s.solved !== 'number' || s.solved < 1) {
      fail.push(`${skill.id} L${level + 1}: summary reports ${s.solved} solved after ten correct`);
    }
  }
}

// requiem: play/answers/rule-judged-by-value
// The spellings a student writes for one rule, which the loop above never
// types: it only submits the stored answer in its own format.
{
  const rule = getType('rule');
  const want = rule.parse('4n - 1').value;
  for (const raw of ['3 + 4(n - 1)', 'aₙ = 4n − 1', 'a_n = -1 + 4n', '4(n - 1) + 3']) {
    const got = rule.parse(raw);
    if (!got.ok || !rule.equals(got.value, want)) fail.push(`rule: "${raw}" was not accepted for 4n − 1`);
  }
  for (const raw of ['n^2 + 3', '2^n']) {
    const got = rule.parse(raw);
    if (got.ok || !got.hint) fail.push(`rule: "${raw}" was not refused with a hint`);
  }
}

// requiem: play/answers/set-judged-as-set
// One set, every way a student writes it; and the near misses refused.
{
  const sets = getType('solutions');
  const same = (raw, want) => {
    const a = sets.parse(raw), b = sets.parse(want);
    return a.ok && b.ok && sets.equals(a.value, b.value);
  };
  const SAME = [['5 >= x > -2', '-2 < x <= 5'], ['(-2, 5]', '-2 < x ≤ 5'], ['x > -2 and x <= 5', '-2 < x <= 5'],
    ['3, -3', 'x = ±3'], ['(-inf, -1) U (3, inf)', 'x < -1 or x > 3'], ['x > -2 or x < 5', 'all real numbers'],
    ['x < 3 and x > 5', 'no solution']];
  for (const [raw, want] of SAME) if (!same(raw, want)) fail.push(`solutions: "${raw}" was not read as ${want}`);
  for (const [raw, want] of [['-2 <= x <= 5', '-2 < x <= 5'], ['x = 3', 'x = ±3'], ['x > 3', 'x >= 3']]) {
    if (same(raw, want)) fail.push(`solutions: "${raw}" was accepted for ${want}`);
  }
  if (sets.parse('[-inf, 2)').ok) fail.push('solutions: a closed bracket at −∞ was accepted');
}

// requiem: play/answers/halfplane-judged-as-region
{
  const half = getType('halfplane');
  const want = half.parse('y < 2x + 1').value;
  for (const raw of ['2x + 1 > y', '2x - y > -1', '-2y > -4x - 2']) {
    const got = half.parse(raw);
    if (!got.ok || !half.equals(got.value, want)) fail.push(`halfplane: "${raw}" was not accepted for y < 2x + 1`);
  }
  for (const raw of ['y <= 2x + 1', 'y > 2x + 1', '-y < 2x + 1']) {
    const got = half.parse(raw);
    if (got.ok && half.equals(got.value, want)) fail.push(`halfplane: "${raw}" was accepted for y < 2x + 1`);
  }
  if (half.parse('y = 2x + 1').ok) fail.push('halfplane: an equation was accepted as a region');
}

// requiem: play/answers/roots-judged-exactly
// The spellings of one pair of roots, and the near misses: a decimal that is
// close, the wrong denominator, and one root of the two.
{
  const roots = getType('roots');
  const want = roots.parse('x = (-3 ± sqrt(17))/4').value;
  for (const raw of ['(-3 +- √17)/4', '-3/4 ± sqrt(17)/4', 'x = (-3 + sqrt(17))/4 or x = (-3 - sqrt(17))/4', '(-6 ± sqrt(68))/8']) {
    const got = roots.parse(raw);
    if (!got.ok || !roots.equals(got.value, want)) fail.push(`roots: "${raw}" was not accepted for (−3 ± √17)/4`);
  }
  for (const raw of ['x = 0.28 or x = -1.78', '(-3 ± sqrt(17))/2', 'x = (-3 + sqrt(17))/4']) {
    const got = roots.parse(raw);
    if (got.ok && roots.equals(got.value, want)) fail.push(`roots: "${raw}" was accepted for (−3 ± √17)/4`);
  }
  if (!roots.parse('no real solutions').ok) fail.push('roots: "no real solutions" was not read');
}

// requiem: play/answers/accepted-forms-judged
// A second accepted form is right: (x + 3)(x + 3) for (x + 3)². The loop
// above only ever types the stored value.
{
  const skill = SKILLS.find((s) => s.id === 'factoring');
  const lib = libOf(skill, 4);
  const deck = dealer(lib.problems.filter((p) => p.answer.accept.length > 1), () => 0.5);
  const session = new Session({ skill, level: 4, mode: MODES.practice, seed: 7, deal: () => deck.next() });
  session.start();
  const p = session.problem;
  const other = p.answer.accept.find((a) => a !== p.answer.value);
  const res = session.submit(other);
  if (res.status !== 'correct') fail.push(`accept: "${other}" for "${p.text}" was judged ${res.status}`);
  session.nextProblem();
  const q = session.problem;
  const wrong = q.answer.value.replace('^2', '').replace(/\)$/, ')(x)');
  if (session.submit(wrong).status === 'correct') fail.push(`accept: "${wrong}" was accepted for "${q.text}"`);
}

// A vertex form is judged as written: the same terms in another order are
// right, and the same quadratic multiplied out is not the form asked for.
{
  const expr = getType('expr');
  const want = expr.parse('-(x - 5)^2 - 4').value;
  const judged = (raw) => { const got = expr.parse(raw); return got.ok && expr.equals(got.value, want); };
  if (!judged('-4 - (x - 5)^2')) fail.push('vertex form: "-4 - (x - 5)^2" was not accepted for -(x - 5)^2 - 4');
  for (const raw of ['-x^2 + 10x - 29', '-(x + 5)^2 - 4']) {
    if (judged(raw)) fail.push(`vertex form: "${raw}" was accepted for -(x - 5)^2 - 4`);
  }
}

// The walkthrough steps through an explanation sentence by sentence, and
// must lose none of it: matching runs of non-stops once dropped everything
// before a decimal point, so "0.002 is two thousandths." showed as "002."
const { sentences } = await import(join(ROOT, 'web/engine/lesson.js'));
for (const skill of SKILLS) {
  for (let level = 0; level < skill.levels.length; level++) {
    const lib = libOf(skill, level);
    for (const p of lib?.problems ?? []) {
      const said = sentences(p.explain).join(' ').replace(/\s+/g, ' ');
      if (said !== String(p.explain ?? '').replace(/\s+/g, ' ').trim()) {
        fail.push(`${skill.id} L${level + 1}: the walkthrough drops part of "${p.explain.slice(0, 60)}"`);
        break;
      }
    }
  }
}

// Simplest radical form is judged as typed: √20 is the right length and,
// where a level asks for simplest form, not finished.
{
  const roots = getType('roots');
  for (const [raw, simplest] of [['2sqrt(5)', true], ['sqrt(20)', false], ['(-8 +- sqrt(32))/2', false],
    ['(4 +- 2sqrt(3))/2', false], ['2 +- sqrt(3)', true], ['(-3 +- sqrt(17))/4', true], ['5', true]]) {
    const r = roots.parse(raw);
    if (!r.ok || roots.isSimplest(r.value) !== simplest) fail.push(`roots: "${raw}" should ${simplest ? '' : 'not '}be simplest`);
  }
}

// Opening the walkthrough shows the answer, so the answer after it is solved
// but is not a first try.
{
  const skill = SKILLS.find((s) => s.id === 'int-addsub');
  const lib = libOf(skill, 0);
  const s = new Session({ skill, level: 0, mode: MODES.practice, onEvent() {} });
  const deck = dealer(lib.problems);
  s.deal = () => deck.next();
  s.start();
  s.explained();
  s.submit(getType(s.problem.answer.type).format(s.problem.answer.value));
  if (s.cleanSolved !== 0 || s.streak !== 0) fail.push('an answer after the walkthrough counted as a first try');
}

// requiem: play/answers/rounding-keeps-places
// Rounded to 2 decimal places, 1.60 is the answer and 1.6 is told why it isn't.
{
  const skill = SKILLS.find((s) => s.id === 'rounding');
  const lib = libOf(skill, 1);
  const p = lib.problems.find((q) => q.answer.accept[0].endsWith('0'));
  const short = p.answer.accept[0].replace(/0+$/, '').replace(/\.$/, '');
  const play = (raw) => {
    const s = new Session({ skill, level: 1, mode: MODES.practice, onEvent() {} });
    s.deal = () => p;
    s.start();
    return s.submit(raw);
  };
  const cut = play(short);
  if (cut.status !== 'wrong' || !cut.hint?.includes(p.answer.accept[0])) fail.push(`rounding: "${short}" for ${p.answer.accept[0]} not told about the zero`);
  if (play(p.answer.accept[0]).status !== 'correct') fail.push(`rounding: "${p.answer.accept[0]}" refused`);
}

// requiem: play/answers/set-simplest-form-refused-copy
// Asked for the simplest form, the two conditions copied back are refused
// with a hint, and the combined set is accepted.
{
  const skill = SKILLS.find((s) => s.id === 'compound-ineq');
  const lib = libOf(skill, 5);
  const p = lib.problems.find((q) => q.answer.requireSimplest && q.text.startsWith('combine: '));
  const copy = p.text.slice('combine: '.length);
  const play = (raw) => {
    const s = new Session({ skill, level: 5, mode: MODES.practice, onEvent() {} });
    s.deal = () => p;
    s.start();
    return s.submit(raw);
  };
  const back = play(copy);
  if (back.status !== 'wrong' || !back.hint?.includes('simplest form')) fail.push(`compound-ineq: "${copy}" copied back was not told to combine it`);
  if (play(p.answer.accept[0]).status !== 'correct') fail.push(`compound-ineq: "${p.answer.accept[0]}" refused`);
}

// requiem: play/answers/line-form-asked-is-checked
// Asked for y = mx + b, the point-slope form expanded is accepted and left
// unexpanded is told so.
{
  const skill = SKILLS.find((s) => s.id === 'line-forms');
  const lib = libOf(skill, 0);
  const p = lib.problems.find((q) => q.text.startsWith('point-slope '));
  const [left, right] = p.text.slice('point-slope '.length).split(' = ');
  // y + 1 = −1/2(x + 2) → y = −1/2(x + 2) − 1: moved, not expanded.
  const k = left.match(/^y ([+-]) (\d+)$/);
  const moved = k ? `y = ${right} ${k[1] === '+' ? '-' : '+'} ${k[2]}` : `y = ${right}`;
  const play = (raw) => {
    const s = new Session({ skill, level: 0, mode: MODES.practice, onEvent() {} });
    s.deal = () => p;
    s.start();
    return s.submit(raw);
  };
  const r = play(moved);
  if (r.status !== 'wrong' || !r.hint?.includes('y = mx + b')) fail.push(`line-forms: "${moved}" not told to expand (${r.status})`);
  if (play(p.answer.accept[0]).status !== 'correct') fail.push(`line-forms: "${p.answer.accept[0]}" refused`);
}

// requiem: play/answers/set-letter-told
// The right set in the wrong letter is told which letter, not marked right.
{
  const skill = SKILLS.find((s) => s.id === 'inequalities');
  let found = null;
  for (let level = 0; level < skill.levels.length && !found; level++) {
    const p = libOf(skill, level).problems.find((q) => q.answer.type === 'solutions'
      && /^[a-z] /.test(q.answer.accept[0]));
    if (p) found = { p, level };
  }
  const { p, level } = found;
  const other = p.answer.value.letter === 'y' ? 'x' : 'y';
  const play = (raw) => {
    const s = new Session({ skill, level, mode: MODES.practice, onEvent() {} });
    s.deal = () => p;
    s.start();
    return s.submit(raw);
  };
  const r = play(p.answer.accept[0].replace(/^[a-z]/, other));
  if (r.status !== 'wrong' || !r.hint?.includes(`with ${p.answer.value.letter}`)) fail.push(`inequalities: "${other}" for ${p.answer.value.letter} not told the letter`);
  if (play(p.answer.accept[0]).status !== 'correct') fail.push(`inequalities: "${p.answer.accept[0]}" refused`);
}

// requiem: play/answers/thousands-comma-read
// The decimal box reads 4,800 as grouped thousands and 4,8 as a decimal comma.
{
  const { decimalTyped } = await import(join(ROOT, 'web/ui/answerinput.js'));
  for (const [raw, want] of [['4,800', '4800'], ['12,000', '12000'], ['1,234,567.5', '1234567.5'],
    ['4,8', '4.8'], ['-0,25', '-0.25'], ['4,80', '4.80'], ['14062.5', '14062.5']]) {
    if (decimalTyped(raw) !== want) fail.push(`decimal box: "${raw}" read as ${decimalTyped(raw)}, not ${want}`);
  }
}

// requiem: play/answers/decimal-in-a-fraction-box
// A right decimal in the fraction boxes is told to be a fraction; a wrong one is wrong.
// requiem: play/answers/percent-typed-as-decimal
// Asked for a percent, the same amount as a decimal is told so.
{
  const skill = SKILLS.find((s) => s.id === 'frac-addsub');
  const play = (problem, raw) => {
    const s = new Session({ skill, level: 0, mode: MODES.practice, onEvent() {} });
    s.deal = () => problem;
    s.start();
    return s.submit(raw);
  };
  const quarter = { ...libOf(skill, 0).problems[0], answer: { type: 'frac', value: { n: 1, d: 4 }, accept: ['1/4'] } };
  const right = play(quarter, '0.25');
  if (right.status !== 'wrong' || !/as a fraction/.test(right.hint ?? '')) fail.push('frac box: a right 0.25 was not told to be a fraction');
  if (play(quarter, '0.3').hint) fail.push('frac box: a wrong decimal was given the fraction hint');
  const pct = { ...quarter, answer: { type: 'decimal', value: { n: 34, d: 1 }, accept: ['34'], percent: true } };
  const r = play(pct, '0.34');
  if (r.status !== 'wrong' || !/asks for a percent/.test(r.hint ?? '')) fail.push('percent: 0.34 for 34% was not told it is the decimal');
  if (play(pct, '34').status !== 'correct') fail.push('percent: 34 refused');
}

if (fail.length) {
  console.log(`${fail.length} problem(s) in the play loop:`);
  for (const f of fail.slice(0, 20)) console.log('  ' + f);
  if (fail.length > 20) console.log(`  ... and ${fail.length - 20} more`);
  process.exit(1);
}
console.log(`play loop: ${played} levels played, ${answered} answers submitted, `
  + `${lessons.toLocaleString()} lessons stepped — all accepted, wrong answers refused, `
  + `gibberish rejected`);
