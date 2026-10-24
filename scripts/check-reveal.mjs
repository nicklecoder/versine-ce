/**
 * Reveal discipline, enforced across the whole catalogue.
 *
 * No visual may show the answer before one has been committed. That rule has
 * held by care and review; this checks it by machine. Every problem in every
 * library is rendered in ask-state and the output is searched for the answer.
 *
 * Two visuals cannot express their answer as a withheld field -- wholesmodel,
 * because which half is the question depends on `direction`, and evalmodel,
 * whose reveal is progressive rather than binary. They are the reason this
 * exists: withholding covers the six that can, and this covers all eight.
 *
 * Usage: node scripts/check-reveal.mjs
 */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// A DOM shim that records text, so "what would a student see" is inspectable.
class Node_ {
  constructor(tag) {
    this.tag = tag; this.children = []; this.cls = []; this.txt = '';
    this.attrs = {};
    this.classList = {
      add: (...c) => this.cls.push(...c.filter(Boolean)),
      remove: (...c) => { this.cls = this.cls.filter((x) => !c.includes(x)); },
      toggle: () => {}, contains: (c) => this.cls.includes(c),
    };
    this.style = { setProperty() {} };
  }
  setAttribute(k, v) {
    this.attrs[k] = String(v);
    if (k === 'class') this.cls.push(...String(v).split(/\s+/).filter(Boolean));
  }
  getAttribute(k) { return this.attrs[k]; }
  append(...kids) { for (const k of kids) if (k != null) this.children.push(k); }
  replaceChildren(...kids) { this.children = []; this.append(...kids); }
  querySelector() { return null; }
  set textContent(v) { this.txt = String(v); this.children = []; }
  get textContent() {
    return this.children.length
      ? this.children.map((k) => (k.textContent !== undefined ? k.textContent : String(k.t ?? k))).join(' ')
      : this.txt;
  }
  /** Every string a student could see, including attribute values. */
  get allText() {
    const mine = [this.txt, ...Object.values(this.attrs)].filter(Boolean).join(' ');
    return [mine, ...this.children.map((k) => (k.allText !== undefined ? k.allText : String(k.t ?? k)))].join(' ');
  }
  getBoundingClientRect() { return { width: 320, height: 120 }; }
  // SVG geometry the number line asks for when it animates a hop.
  getTotalLength() { return 100; }
  getPointAtLength() { return { x: 0, y: 0 }; }
  animate() { return { finished: Promise.resolve(), cancel() {} }; }
}
globalThis.Node = Node_;
globalThis.document = {
  createElement: (t) => new Node_(t),
  createElementNS: (ns, t) => new Node_(t),
  createTextNode: (t) => ({ textContent: String(t), allText: String(t) }),
  activeElement: null,
};
globalThis.ResizeObserver = class { observe() {} disconnect() {} };

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LIB = join(ROOT, 'web', 'library');
const { renderVisual, hasVisual, VISUALS, withheldUntilAnswered } = await import(join(ROOT, 'web/ui/visuals.js'));


/**
 * Two properties, both exact.
 *
 * A fuzzy search of the rendered output for the answer text was tried first
 * and abandoned: with a single-digit answer to "1/2 = ?/4" the digit 2 is
 * already on screen as part of the question, so the search cried leak on
 * thousands of correct problems. A check that cries wolf is worse than none.
 *
 *   1. Every field a schema marks `phase: 'answer'` is absent from the spec
 *      the renderer receives while the question is open. This is the property
 *      the withholding in visuals.js exists to guarantee, verified rather than
 *      assumed.
 *
 *   2. What a visual draws while asking differs from what it draws once the
 *      answer is committed. If the two are identical the visual held nothing
 *      back, which for a picture of a problem means it was showing the answer
 *      all along. This is what covers wholesmodel and evalmodel, whose answers
 *      cannot be expressed as a withheld field.
 */
let checked = 0, leaks = [];
for (const file of readdirSync(LIB)) {
  if (!file.endsWith('.json') || file.startsWith('manifest') || file.startsWith('schemas')) continue;
  const lib = JSON.parse(readFileSync(join(LIB, file), 'utf8'));
  for (const [i, p] of lib.problems.entries()) {
    if (!hasVisual(p.visual)) continue;
    const at = `${lib.skill} L${lib.level + 1} row ${i} (${p.visual.kind}): "${p.text}"`;

    const schema = VISUALS[p.visual.kind]?.schema ?? {};

    // (1) An answer-bearing field must not reach the renderer while asking.
    const handed = withheldUntilAnswered(p.visual, { reveal: 1 });
    for (const [field, rule] of Object.entries(schema)) {
      if (rule.phase === 'answer' && field in p.visual && field in handed) {
        leaks.push(`${at}: ${field} is answer-bearing but was handed to the renderer while asking`);
      }
    }

    const askNode = new Node_('div');
    let askText;
    try {
      renderVisual(askNode, p.visual, { reveal: 1, animateFrom: 0 });
      askText = askNode.allText;
    } catch (err) {
      leaks.push(`${at}: renderer threw while asking — ${err.message}`);
      continue;
    }
    const revealNode = new Node_('div');
    let revealText;
    try {
      renderVisual(revealNode, p.visual, { showAnswer: true, animateFrom: 1, verdict: 'ok' });
      revealText = revealNode.allText;
    } catch (err) {
      leaks.push(`${at}: renderer threw while revealing — ${err.message}`);
      continue;
    }
    checked++;

    // (2) What it draws while asking must differ from what it draws after.
    if (askText === revealText) {
      leaks.push(`${at}: looks identical before and after the answer — it is holding nothing back`);
    }
  }
}

// A figure drawn on the plane with `axes: false` -- an angle, a polygon --
// must draw no axes and no coordinates, or the picture claims positions the
// question never gave. And a text mark, which is how such a figure writes an
// angle's size inside it, must draw its words and only once answered when
// they are the answer.
{
  const figure = { kind: 'plane', xRange: [-4, 4], yRange: [-4, 4], grid: 0, axes: false,
    marks: [{ kind: 'segment', from: [0, 0], to: [3, 0] }, { kind: 'text', at: [1, 1], label: 'a' }],
    answer: [{ kind: 'text', at: [2, 2], label: '137°' }] };
  const classes = (n) => [...n.cls, ...n.children.flatMap((k) => (k.cls ? classes(k) : []))];
  const ask = new Node_('div'), shown = new Node_('div');
  renderVisual(ask, figure, { reveal: 1, animateFrom: 0 });
  renderVisual(shown, figure, { showAnswer: true, animateFrom: 1, verdict: 'ok' });
  if (classes(ask).some((c) => c === 'pl__axes' || c === 'pl__ticks')) leaks.push('plane: axes: false still draws axes');
  if (!/\ba\b/.test(ask.allText)) leaks.push('plane: a text mark did not draw its label');
  if (ask.allText.includes('137°') || !shown.allText.includes('137°')) {
    leaks.push('plane: an answer text mark is not held back until answered');
  }
}

if (leaks.length) {
  console.log(`${leaks.length} reveal problem(s):`);
  for (const l of leaks.slice(0, 20)) console.log('  ' + l);
  if (leaks.length > 20) console.log(`  ... and ${leaks.length - 20} more`);
  process.exit(1);
}
console.log(`${checked.toLocaleString()} visuals rendered both ways — every one holds its answer back`);
