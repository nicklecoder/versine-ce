/**
 * Materialise every level's problem space into a library.
 *
 * The point is not speed. It is that a drilling platform does not need to
 * *solve* anything: if the problems and their acceptable answers are written
 * down ahead of time, judging a student's answer is a lookup, and the whole
 * computer-algebra problem -- which is undecidable in general -- never arises.
 *
 * Two properties this build has to guarantee:
 *
 *   Determinism. An unchanged level must produce a byte-identical file, or
 *   every rebuild rewrites all 43 libraries and the diff is useless for
 *   review. Seeds are derived from the skill id and level, never from the
 *   clock or from iteration order.
 *
 *   Honesty about coverage. A level whose space is smaller than the cap is
 *   recorded as exhaustive; one that hits the cap is recorded as a sample.
 *   The difference decides whether problems can be dealt without replacement.
 *
 * Usage: node scripts/build-library.mjs [--cap N] [--check]
 *   --check  build into memory and report what differs from disk, without
 *            writing anything.
 *   --force  overwrite libraries that already exist. Without it, existing
 *            files are left alone: once a library has been reviewed and its
 *            bad rows corrected by hand, a rebuild must not silently throw
 *            that work away. Regenerating a level is a deliberate act.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// The generators reach for the DOM when they build prompt markup; none of it
// is inspected here, so a stub is enough to run them outside a browser.
const stub = () => ({
  classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
  setAttribute() {}, append() {}, addEventListener() {}, focus() {},
  style: { setProperty() {} },
});
globalThis.document = {
  createElement: stub, createElementNS: stub,
  createTextNode: (t) => ({ t }), activeElement: null,
};
globalThis.ResizeObserver = class { observe() {} disconnect() {} };

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'web', 'library');

/**
 * Everything whose contents can change what a library holds.
 *
 * Stamped into the manifest so that scripts/update.sh can tell, using nothing
 * but sha256sum, whether the committed libraries still match the generators
 * that produced them. Deliberately verifiable without Node: the server should
 * not need a JavaScript runtime installed to refuse a bad deploy.
 *
 * Keep this list and the one in update.sh identical.
 */
function sourceFiles() {
  const globbed = (dir, suffix) => readdirSync(join(ROOT, dir))
    .filter((f) => f.endsWith(suffix))
    .map((f) => `${dir}/${f}`);
  return [
    ...globbed('tools/generators', '.js'),
    ...globbed('web/skills', '.js'),
    ...globbed('web/math', '.js'),
    'web/engine/registry.js',
    'web/engine/rng.js',
    'scripts/build-library.mjs',
  ].sort();
}

/** Hash of every input, as `path\0contents\0` per file in sorted order. */
function fingerprint() {
  const h = createHash('sha256');
  for (const rel of sourceFiles()) {
    h.update(rel); h.update('\0');
    h.update(readFileSync(join(ROOT, rel))); h.update('\0');
  }
  return h.digest('hex');
}

const { SKILLS, validateGraph } = await import(join(ROOT, 'web/engine/registry.js'));

// The catalogue's own rules come first, and a cycle in the dependency graph is
// the one fault that makes everything downstream meaningless: there is no
// order to lay the skills out in and no way for a student to open any of them.
// Refuse here rather than write 52 MB of libraries for a catalogue that cannot
// be rendered. The deploy gate checks this too, but a fault should be caught
// by the tool that could have introduced it, not only by the one that ships.
const graphProblems = validateGraph();
if (graphProblems.length) {
  console.error(`${graphProblems.length} problem(s) in the catalogue graph; nothing was built:`);
  for (const p of graphProblems) console.error('  ' + p);
  process.exit(1);
}

/**
 * Generators live outside web/ because they are not part of the application.
 * A skill in web/skills/ describes what the student sees; the matching file in
 * tools/generators/ knows how to manufacture its problems, and is loaded only
 * here. Nothing the server serves imports it.
 */
const generators = new Map();
for (const skill of SKILLS) {
  const path = join(ROOT, 'tools/generators', `${skill.id}.js`);
  if (!existsSync(path)) throw new Error(`No generator for skill "${skill.id}" at tools/generators/${skill.id}.js`);
  generators.set(skill.id, (await import(path)).generate);
}
const { makeRng } = await import(join(ROOT, 'web/engine/rng.js'));
const { getType, TYPE_IDS } = await import(join(ROOT, 'web/math/answer.js'));
const { VISUALS } = await import(join(ROOT, 'web/ui/visuals.js'));
const { TERM_KINDS, BLANK_FIELDS } = await import(join(ROOT, 'web/ui/prompt.js'));

const args = process.argv.slice(2);
const CHECK = args.includes('--check');
const FORCE = args.includes('--force');
const capArg = args.indexOf('--cap');
const DEFAULT_CAP = capArg > -1 ? Number(args[capArg + 1]) : 1000;

/** Draws to make before accepting that a level's space has been exhausted. */
const PATIENCE = 40000;

/** A level with fewer problems than this is memorisable rather than drillable. */
const FLOOR = 50;

/** Stable numeric seed from a level's identity, so rebuilds are reproducible. */
function seedFor(skillId, level) {
  let h = 2166136261;
  for (const ch of `${skillId}:${level}`) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function buildLevel(skill, level) {
  const generate = generators.get(skill.id);
  const cap = skill.levels[level].libraryCap ?? DEFAULT_CAP;
  const rng = makeRng(seedFor(skill.id, level));
  const byText = new Map();
  let sinceNew = 0;

  for (let i = 0; i < PATIENCE && byText.size < cap; i++) {
    const p = generate(rng, level);
    if (byText.has(p.text)) { sinceNew++; continue; }
    const type = getType(p.answer.type);
    // The stated answer must survive its own parser -- the same check the
    // session makes when a student types it back.
    const round = type.parse(type.format(p.answer.value));
    if (!round.ok || !type.equals(round.value, p.answer.value)) {
      throw new Error(`${skill.id} L${level + 1}: "${p.text}" answer does not round-trip`);
    }
    byText.set(p.text, {
      ...p,
      answer: {
        ...p.answer,
        // Acceptable surface forms. Today every answer type has exactly one
        // canonical rendering, so this is a single entry; it exists as a list
        // because expression answers will have several (factored as well as
        // expanded) and the format should not have to change then.
        accept: [type.format(p.answer.value)],
      },
    });
    sinceNew = 0;
  }

  // Sort by text so the file is stable regardless of the order draws happened
  // to arrive in, which keeps diffs readable.
  const problems = [...byText.values()].sort((a, b) => (a.text < b.text ? -1 : a.text > b.text ? 1 : 0));

  // Whether this level ever asks for a negative answer, which decides which
  // keyboard an iPhone offers. It is a property of the LEVEL, deliberately:
  // choosing per problem would change the keyboard exactly when the answer is
  // negative, and a student would read the answer off the keyboard.
  const signed = problems.some((p) => {
    const v = p.answer.value;
    const n = v && typeof v === 'object' ? v.n : v;
    return typeof n === 'number' && n < 0;
  });
  return {
    skill: skill.id,
    level,
    slug: skill.levels[level].slug,
    levelName: skill.levels[level].name,
    count: problems.length,
    signed,
    // Exhaustive means: we stopped finding new problems long before the cap,
    // so this is the whole space and a run can deal without replacement.
    exhaustive: problems.length < cap && sinceNew > PATIENCE / 4,
    cap,
    problems,
  };
}

const manifest = [];
const warnings = [];
let changed = 0, written = 0, kept = 0, bytes = 0;
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

for (const skill of SKILLS) {
  for (let level = 0; level < skill.levels.length; level++) {
    const lib = buildLevel(skill, level);
    const json = JSON.stringify(lib) + '\n';
    const path = join(OUT, `${skill.id}-${level}.json`);
    const prev = existsSync(path) ? readFileSync(path, 'utf8') : null;

    if (prev !== json) {
      changed++;
      if (CHECK) {
        warnings.push(`DIFFERS  ${skill.id} L${level + 1} — generator output differs from the committed library`);
      } else if (prev !== null && !FORCE) {
        kept++;
        warnings.push(`KEPT     ${skill.id} L${level + 1} — exists already; --force to regenerate`);
      } else {
        writeFileSync(path, json);
        written++;
      }
    }
    bytes += json.length;
    if (lib.count < FLOOR) warnings.push(`THIN   ${skill.id} L${level + 1} "${lib.levelName}" — only ${lib.count} problems`);
    manifest.push({
      skill: skill.id, level, slug: lib.slug, name: lib.levelName,
      count: lib.count, exhaustive: lib.exhaustive, signed: lib.signed,
      file: `${skill.id}-${level}.json`,
    });
  }
}

// The presentation vocabulary, written out so the Python deploy gate can
// validate catalogue items against it without needing a JavaScript runtime.
// One source of truth: the renderers declare it, this exports it.
const schemasJson = JSON.stringify({
  visuals: Object.fromEntries(Object.entries(VISUALS).map(([k, v]) => [k, v.schema])),
  terms: TERM_KINDS,
  blankFields: BLANK_FIELDS,
  answerTypes: TYPE_IDS(),
}, null, 2) + '\n';
const schemasPath = join(OUT, 'schemas.json');
if (!existsSync(schemasPath) || readFileSync(schemasPath, 'utf8') !== schemasJson) {
  if (CHECK) warnings.push('DIFFERS  schemas.json');
  else writeFileSync(schemasPath, schemasJson);
}

// The order of a skill's levels, keyed by slug. The server has no way to read
// the catalogue -- it is JavaScript and the server is Python -- so the one
// thing it needs from it, which level follows which, is published here.
const order = {};
for (const skill of SKILLS) order[skill.id] = skill.levels.map((l) => l.slug);

const manifestJson = JSON.stringify({
  built: manifest.length,
  order,
  sources: fingerprint(),
  levels: manifest,
}, null, 2) + '\n';
const manifestPath = join(OUT, 'manifest.json');
const prevManifest = existsSync(manifestPath) ? readFileSync(manifestPath, 'utf8') : null;
if (prevManifest !== manifestJson) {
  if (CHECK) warnings.push('STALE  manifest.json');
  else writeFileSync(manifestPath, manifestJson);
}

const exhaustive = manifest.filter((m) => m.exhaustive).length;
console.log(`${manifest.length} levels, ${manifest.reduce((n, m) => n + m.count, 0).toLocaleString()} problems, ${(bytes / 1024 / 1024).toFixed(1)} MB`);
console.log(`${exhaustive} levels exhaustive (can deal without replacement), ${manifest.length - exhaustive} sampled at the cap`);
console.log(CHECK
  ? `${changed} file(s) would change`
  : `${written} written, ${kept} kept (already present), ${manifest.length - changed} unchanged`);
for (const w of warnings) console.log('  ' + w);
if (CHECK && changed) process.exit(1);
