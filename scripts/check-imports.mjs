/**
 * Every module of the browser app loads: it parses, and every import it
 * makes resolves to a file that exports that name.
 *
 * The other checks import the engine, the maths and a few UI modules, but
 * nothing ever loads the app's screens outside a browser -- so a screen
 * importing a name that no longer exists passed every check and reached the
 * browser as a blank page. That happened: rating.js lost an export map.js
 * still imported, and the only symptom was an empty screen.
 *
 * Read statically rather than by importing, because importing a screen runs
 * it, and screens reach for the DOM, the network and the router at load. The
 * forms matched are the ones this codebase writes -- named and default
 * imports, and exports declared on a function, class or binding -- and a
 * form it does not recognise is reported rather than silently skipped, so
 * the check cannot quietly stop covering a file.
 *
 * Usage: node scripts/check-imports.mjs
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, resolve } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WEB = join(ROOT, 'web');

/** Every .js file under web/, except the generated problem libraries. */
function modules(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return path === join(WEB, 'library') ? [] : modules(path);
    return name.endsWith('.js') ? [path] : [];
  });
}

const IMPORT = /^import\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"]/gm;
const BARE_IMPORT = /^import\s+['"]([^'"]+)['"]/gm;
const EXPORT_DECL = /^export\s+(?:async\s+)?(?:function\*?|class|const|let|var)\s+([A-Za-z_$][\w$]*)/gm;
const EXPORT_DEFAULT = /^export\s+default\b/m;
const EXPORT_OTHER = /^export\s+(?!(?:async\s+)?(?:function\*?|class|const|let|var|default)\b)/m;

const fail = [];
const files = modules(WEB).sort();
const exportsOf = new Map();

for (const file of files) {
  const rel = relative(ROOT, file);
  try {
    // On stdin as a module, not `node --check file.js`: with no package.json
    // saying "module", Node 24 checks a .js file that uses `export` not at
    // all and exits 0 whatever it holds -- an unclosed brace included.
    execFileSync(process.execPath, ['--input-type=module', '--check'],
                 { input: readFileSync(file), stdio: 'pipe' });
  } catch (err) {
    const lines = String(err.stderr).split('\n');
    const at = lines[0].match(/:(\d+)\s*$/)?.[1];
    const why = lines.find((l) => /^\w*Error\b/.test(l)) ?? lines[0];
    fail.push(`${rel}${at ? `:${at}` : ''}: does not parse — ${why.trim()}`);
    continue;
  }
  const src = readFileSync(file, 'utf8');
  if (EXPORT_OTHER.test(src)) fail.push(`${rel}: an export form this check cannot read`);
  exportsOf.set(file, {
    names: new Set([...src.matchAll(EXPORT_DECL)].map((m) => m[1])),
    hasDefault: EXPORT_DEFAULT.test(src),
  });
}

let checked = 0;
for (const file of files) {
  const src = readFileSync(file, 'utf8');
  const rel = relative(ROOT, file);
  const targets = [
    ...[...src.matchAll(IMPORT)].map((m) => ({ clause: m[1], spec: m[2] })),
    ...[...src.matchAll(BARE_IMPORT)].map((m) => ({ clause: '', spec: m[1] })),
  ];
  for (const { clause, spec } of targets) {
    if (!spec.startsWith('.')) continue;                 // not a file in this app
    const target = resolve(dirname(file), spec);
    const where = `${rel} imports ${spec}`;
    if (!existsSync(target)) { fail.push(`${where}: no such file`); continue; }
    const exp = exportsOf.get(target);
    if (!exp) continue;                                  // already reported as unparseable

    // `def, { a, b as c }`, `{ a }`, `def`, or `* as ns`.
    const named = clause.match(/\{([\s\S]*)\}/);
    const outside = clause.replace(/\{[\s\S]*\}/, '').replace(/,/g, ' ').trim();
    if (outside && !outside.startsWith('*')) {
      checked++;
      if (!exp.hasDefault) fail.push(`${where}: it has no default export`);
    }
    if (named) {
      for (const part of named[1].split(',').map((p) => p.trim()).filter(Boolean)) {
        const name = part.split(/\s+as\s+/)[0].trim();
        checked++;
        if (!exp.names.has(name)) fail.push(`${where}: it does not export ${name}`);
      }
    }
  }
}

if (fail.length) {
  console.log(`${fail.length} import problem(s) in the browser app:`);
  for (const f of fail) console.log(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`imports: ${files.length} modules parse, ${checked} imported names all resolve`);
