/**
 * The extension points: with nothing loaded the app behaves exactly as
 * before, each socket does what it says, and a broken extension is skipped
 * rather than stopping the app.
 *
 * requiem: server/extensions/extension-points
 *
 * Extensions are fed in as data: URLs through a stand-in fetch, so this needs
 * no server and no browser.
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ext = await import(join(ROOT, 'web/engine/extensions.js'));
const { lockedBy, SKILLS } = await import(join(ROOT, 'web/engine/registry.js'));

const fail = [];
const check = (ok, what) => { if (!ok) fail.push(what); };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const fetchList = (modules, ok = true) => async () => ({ ok, json: async () => ({ modules }) });
const moduleUrl = (src) => `data:text/javascript,${encodeURIComponent(src)}`;
const errorsBefore = () => ext.extensionErrors.length;

// Some progress: the first skill finished, nothing else begun.
const first = SKILLS[0];
const progress = { skills: { [first.id]: { mastered: first.levels.map((_, i) => i), solved: 50 } } };

// ── Nothing loaded: every default is the app as it was ──────────────────────
// (versine-ce ships extensions.json with no modules.)
const loaded = await ext.loadExtensions({}, fetchList([]));
check(loaded === 0, 'an empty list loads no modules');
for (const skill of SKILLS) {
  check(same(ext.blockersFor(skill.id, progress), lockedBy(skill.id, progress)),
    `with no gate policy, ${skill.id}'s blockers are the gate's`);
}
check(ext.signInScreen() === null, 'with no extension, sign-in is the default');
check(ext.hasCustomSignIn() === false, 'with no extension, the PIN-account screens stay');
check(ext.screenFor('billing') === undefined, 'with no extension, no extra screens');
check(ext.linksFor('teacher').length === 0, 'with no extension, no extra links');
check(SKILLS.every((s) => ext.lockNoteFor(s.id, ['x']) === null), 'with no extension, locks read as the gate says');

// A missing or unreadable list is no list.
await ext.loadExtensions({}, async () => ({ ok: false }));
check(ext.signInScreen() === null, 'a missing extensions.json changes nothing');

// ── A broken extension is skipped, and the rest still load ──────────────────
const before = errorsBefore();
await ext.loadExtensions({ marker: 1 }, fetchList([
  moduleUrl('export default () => { throw new Error("boom"); };'),
  moduleUrl('export default ({ extensions, marker }) => {'
    + ' extensions.addLink({ label: "Billing", route: { name: "billing" }, roles: ["teacher"] });'
    + ' extensions.addScreen("billing", () => "billing screen");'
    + ' extensions.setSignIn(() => "family sign-in"); };'),
]));
check(ext.extensionErrors.length === before + 1 && /boom/.test(ext.extensionErrors.at(-1)),
  'a module that throws is reported and skipped');

// ── Each socket does what it says ───────────────────────────────────────────
check(ext.signInScreen() === 'family sign-in', 'setSignIn replaces the sign-in screen');
check(ext.hasCustomSignIn() === true, 'with sign-in replaced, the PIN-account screens step aside');
check(ext.screenFor('billing')?.() === 'billing screen', 'addScreen adds a screen by route name');
check(ext.linksFor('teacher').map((l) => l.label).join() === 'Billing', 'a teacher sees the link');
check(ext.linksFor('student').length === 0, 'a link for teachers is not shown to a student');

// requiem: server/extensions/gate-policy
const locked = SKILLS.find((s) => lockedBy(s.id, progress).length);
check(locked, 'the catalogue has a skill the gate keeps closed');
ext.extensions.setGatePolicy(({ blockers }) => blockers);
check(same(ext.blockersFor(locked.id, progress), lockedBy(locked.id, progress)),
  'a policy returning the blockers keeps the gate');
ext.extensions.setGatePolicy(() => []);
check(ext.blockersFor(locked.id, progress).length === 0, 'a policy can open a skill the gate keeps closed');
ext.extensions.setGatePolicy(() => [first.id]);
check(ext.blockersFor(SKILLS[0].id, progress).length === 1, 'a policy can close a skill the gate leaves open');

// requiem: server/extensions/lock-note
ext.extensions.setLockNote(({ skillId }) => (skillId === locked.id ? 'Opens in the full version.' : null));
check(ext.lockNoteFor(locked.id, ['x']) === 'Opens in the full version.', 'a lock note replaces the wording');
check(ext.lockNoteFor(first.id, ['x']) === null, 'a note returning null keeps the app\'s own wording');

if (fail.length) {
  console.log(`${fail.length} extension check(s) failed:`);
  for (const f of fail) console.log(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`extensions: defaults change nothing across ${SKILLS.length} skills; every socket works; a broken module is skipped`);
