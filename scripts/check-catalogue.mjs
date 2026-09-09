/**
 * Validate the catalogue's structure: the learning graph, and the rules that
 * govern where a strategy level may sit.
 *
 * Most of what follows is law -- a catalogue that breaks it is broken. A
 * couple of rules are guidance instead, and those may be broken by a skill
 * that declares its reason; they are reported on success rather than
 * enforced, so the exception is visible in the deploy log.
 *
 * Complements scripts/check-library.py, which validates the problems
 * themselves. This one checks the shape of the catalogue around them, and
 * deliberately loads only what the browser loads -- if this passes but the app
 * breaks, the difference is a clue.
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const stub = () => ({
  classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
  setAttribute() {}, append() {}, addEventListener() {}, focus() {},
  style: { setProperty() {} },
});
globalThis.document = { createElement: stub, createTextNode: (t) => ({ t }), activeElement: null };

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { SKILLS, CATEGORIES, SUBJECTS, validateGraph, lockedBy, skillCompleted, mapOrder } =
  await import(join(ROOT, 'web/engine/registry.js'));

const fail = [];
// Rules that are guidance rather than law: a skill may break one, but it has
// to say so in the catalogue rather than in someone's memory. Reported on
// success so a deliberate exception stays visible instead of going quiet.
const note = [];

for (const p of validateGraph()) fail.push(`graph: ${JSON.stringify(p)}`);

// Generation belongs to tools/generators. A skill that still carries it would
// ship generation logic to students and invite a silent second source of
// problems alongside the reviewed library.
for (const s of SKILLS) {
  if (typeof s.generate === 'function') {
    fail.push(`${s.id}: still exposes generate(); generators belong in tools/generators/`);
  }
}

// The map is built by walking the categories and collecting each one's skills,
// so a skill filed under a name that is not declared does not appear on it --
// silently, with no error anywhere. That is a typo away at any time.
const known = new Set(CATEGORIES.map((c) => c.id));
for (const s of SKILLS) {
  if (!known.has(s.category)) {
    fail.push(`${s.id}: category "${s.category}" is not declared, so the skill would not appear on the map`);
  }
}
const ids = CATEGORIES.map((c) => c.id);
if (new Set(ids).size !== ids.length) fail.push('two categories share an id');
const subjectIds = new Set(SUBJECTS.map((s) => s.id));
for (const c of CATEGORIES) {
  if (!subjectIds.has(c.subject)) {
    fail.push(`category "${c.id}": subject "${c.subject}" is not declared, so its skills would not appear on the map`);
  }
}
// A skill long enough to be two skills is usually a sign the split was not
// made. Split it by depth rather than by size: the foundational levels stay,
// the harder ones become a skill that depends on them. A student then
// finishes something, rather than grinding down a list that never ends.
//
// Eight is a guide, though, not a law. Some skills have a genuine reason to
// run longer -- an idea taught twice, once with a scaffold and once without,
// is two levels that only make sense side by side, and splitting the skill
// to obey a number would put them in different places on the map for nothing.
// So a longer skill is allowed, on the one condition that it says why:
// `longerBecause` on the skill, in words, where the next person reads it.
// A rule that can be broken silently is not guidance, it is decoration.
const GUIDE_LEVELS = 8;
for (const s of SKILLS) {
  if (s.levels.length <= GUIDE_LEVELS) continue;
  const why = typeof s.longerBecause === 'string' ? s.longerBecause.trim() : '';
  if (!why) {
    fail.push(`${s.id} has ${s.levels.length} levels, past the guide of ${GUIDE_LEVELS}; `
      + 'either split it — foundations in one skill, the harder work in another that '
      + 'depends on it — or declare longerBecause: "<why this one earns the extra length>"');
  } else {
    note.push(`${s.id} runs to ${s.levels.length} levels, past the guide of ${GUIDE_LEVELS}: ${why}`);
  }
}

// The Map reads top to bottom, so it must never reach a skill before the
// skills it builds on. That is what mapOrder() is for, and it is checked
// rather than trusted: the failure it prevents is silent -- Factors &
// Multiples sat below every fraction skill that needs it for as long as the
// grid was ordered by where things are filed, and nothing anywhere said so.
{
  const order = mapOrder();
  if (order.length !== SKILLS.length) {
    fail.push(`the map lays out ${order.length} skills but the catalogue holds ${SKILLS.length}`);
  }
  const at = new Map(order.map((e, i) => [e.skill.id, i]));
  for (const { skill } of order) {
    for (const dep of skill.dependsOn ?? []) {
      if (!at.has(dep)) continue;             // an undeclared id is validateGraph's to report
      if (at.get(dep) > at.get(skill.id)) {
        fail.push(`the map draws ${skill.id} before ${dep}, which it builds on`);
      }
    }
  }
}

// A category big enough to be a subject is a sign the split was not made.
for (const c of CATEGORIES) {
  const n = SKILLS.filter((s) => s.category === c.id).length;
  if (n > 10) fail.push(`category "${c.id}" holds ${n} skills; split it, a category is a working group of three to ten`);
}

// A level's slug is its identity in the database. Positions used to be, which
// meant inserting a level silently reattributed every student's history to
// different levels. Slugs must therefore exist, be unique within their skill,
// and look like slugs -- and once published they must not be edited, which no
// check can enforce but the comment beside them says.
for (const s of SKILLS) {
  const seen = new Set();
  s.levels.forEach((l, i) => {
    const at = `${s.id} L${i + 1} "${l.name}"`;
    if (!l.slug) { fail.push(`${at}: has no slug; it is the level's identity in the database`); return; }
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(l.slug)) fail.push(`${at}: slug "${l.slug}" is not lower-case-kebab`);
    if (seen.has(l.slug)) fail.push(`${at}: slug "${l.slug}" is already used in this skill`);
    seen.add(l.slug);
  });
}

// Strategy levels drill which method to reach for. They must sit where the
// choice first costs something -- never first (nothing to choose between yet),
// never last (that slot is the skill's combined final level), and never
// leaning on a skill their own skill has not declared.
for (const s of SKILLS) {
  s.levels.forEach((l, i) => {
    if (l.kind !== 'strategy') return;
    const at = `${s.id} L${i + 1} "${l.name}"`;
    if (i === 0) fail.push(`${at}: a strategy level cannot be a skill's first level`);
    if (i === s.levels.length - 1) fail.push(`${at}: a strategy level cannot be the last level`);
    if (!Array.isArray(l.dependsOn) || !l.dependsOn.length) {
      fail.push(`${at}: must name the skill whose need it arbitrates`);
    }
    for (const d of l.dependsOn ?? []) {
      if (!(s.dependsOn ?? []).includes(d.skill)) {
        fail.push(`${at}: leans on ${d.skill}, which ${s.id} does not declare`);
      }
    }
  });
}

let gateInfo = '';
// Every skill has to be reachable from a standing start.
//
// `validateGraph` already rules out cycles and insists a root exists, which
// between them make this true by construction -- but this drives the real
// `lockedBy` from an empty account rather than reasoning about the graph, so
// a mistake in the gate itself is caught rather than argued away. A student
// who cannot get to a skill by any route has a skill that does not exist.
{
  const progress = { skills: {} };
  let reached = 0, passes = 0;
  for (;;) {
    const open = SKILLS.filter((s) => !skillCompleted(s.id, progress)
      && !lockedBy(s.id, progress).length);
    if (!open.length) break;
    for (const s of open) progress.skills[s.id] = { mastered: s.levels.map((_, i) => i) };
    reached += open.length;
    passes++;
  }
  if (reached !== SKILLS.length) {
    const stuck = SKILLS.filter((s) => !skillCompleted(s.id, progress)).map((s) => s.id);
    fail.push(`${stuck.length} skill(s) can never be opened: ${stuck.join(', ')}`);
  }
  // Finishing a skill means clearing its LAST level. Anything less must not
  // open what depends on it, or the gate is checking attendance.
  const [root] = SKILLS.filter((s) => !(s.dependsOn ?? []).length);
  const dependent = SKILLS.find((s) => (s.dependsOn ?? []).includes(root?.id));
  if (root && dependent) {
    const short = { skills: { [root.id]: { mastered: root.levels.map((_, i) => i).slice(0, -1) } } };
    if (!lockedBy(dependent.id, short).length) {
      fail.push(`${dependent.id} opened without ${root.id}'s last level being cleared`);
    }
  }
  gateInfo = `${passes} passes from a standing start`;
}

const levels = SKILLS.reduce((n, s) => n + s.levels.length, 0);
const filled = CATEGORIES.filter((c) => SKILLS.some((s) => s.category === c.id)).length;
const subjectsUsed = SUBJECTS.filter((sub) =>
  CATEGORIES.some((c) => c.subject === sub.id && SKILLS.some((s) => s.category === c.id))).length;
const strategy = SKILLS.flatMap((s) => s.levels.filter((l) => l.kind === 'strategy')).length;

if (fail.length) {
  console.log(`${fail.length} problem(s):`);
  for (const f of fail) console.log('  ' + f);
  process.exit(1);
}
console.log(`${SKILLS.length} skills, ${levels} levels (${strategy} strategy), `
  + `${filled}/${CATEGORIES.length} categories in ${subjectsUsed}/${SUBJECTS.length} subjects, `
  + `all reachable in ${gateInfo} — catalogue valid`);
for (const n of note) console.log(`  by exception: ${n}`);
