/**
 * The skill catalogue. Add a module here and it appears on the map --
 * nothing else in the engine needs to know it exists.
 */
import intAddSub from '../skills/int-addsub.js';
import intMulDiv from '../skills/int-muldiv.js';
import factors from '../skills/factors.js';
import fracAddSub from '../skills/frac-addsub.js';
import fracMulDiv from '../skills/frac-muldiv.js';
import fracMixed from '../skills/frac-mixed.js';
import fracEquiv from '../skills/frac-equiv.js';
import fracSigned from '../skills/frac-signed.js';
import ratio from '../skills/ratio.js';
import orderOps from '../skills/order-ops.js';
import exponents from '../skills/exponents.js';
import roots from '../skills/roots.js';
import coords from '../skills/coords.js';
import decimals from '../skills/decimals.js';
import rounding from '../skills/rounding.js';
import percents from '../skills/percents.js';
import simplify from '../skills/simplify.js';
import equations from '../skills/equations.js';
import equationsBoth from '../skills/equations-both.js';
import inequalities from '../skills/inequalities.js';

/** @type {any[]} */
export const SKILLS = [intAddSub, intMulDiv, factors, fracAddSub, fracMulDiv, fracMixed, fracEquiv, fracSigned,
  ratio, orderOps, exponents, roots, coords, decimals, rounding, percents, simplify, equations, equationsBoth, inequalities];

export const getSkill = (id) => SKILLS.find((s) => s.id === id);

/**
 * How the map is grouped, in two layers.
 *
 * A subject is the broad territory -- Arithmetic, Algebra, Geometry. A
 * category is a working group of three to ten skills inside it. Two layers
 * rather than one because "Trigonometry" and "Calculus" are territories, not
 * groups: filing every trigonometric skill under one heading would produce
 * exactly the twenty-skill bucket that tells a student nothing.
 *
 * A subject is where a category is *filed*, not a claim about which branch
 * owns it. The separation of arithmetic from algebra from geometry is an
 * accident of how textbooks are sold, and several categories genuinely sit in
 * two places: Coordinates is coordinate geometry and it is linear functions,
 * Powers & Roots is arithmetic and it is algebra. Each is filed once, where a
 * student is most likely to look for it, and the comments say where else it
 * belongs. Nothing in the engine treats a subject as ownership, so a skill is
 * never kept from anything by the box it sits in.
 *
 * Expressions and Equations are separate categories because that boundary is
 * real rather than a size cut: an expression is a thing you rearrange, an
 * equation is a claim you test.
 *
 * Categories and subjects with no skills yet are declared anyway. They cost a
 * line, they say what the catalogue is for, and they stop the next skill being
 * filed under whichever existing name is least wrong. Empty ones do not render.
 */
export const SUBJECTS = [
  { id: 'arithmetic', name: 'Arithmetic' },
  { id: 'algebra', name: 'Algebra' },
  { id: 'geometry', name: 'Geometry' },
  { id: 'trigonometry', name: 'Trigonometry' },
  { id: 'data', name: 'Chance & Data' },
];

/** Names are short: they sit in a card footer beside the solved count. */
export const CATEGORIES = [
  // ── Arithmetic ────────────────────────────────────────────────────────
  { id: 'integers', subject: 'arithmetic', name: 'Integers', glyph: '±' },
  { id: 'fractions', subject: 'arithmetic', name: 'Fractions', glyph: '½' },
  { id: 'decimals', subject: 'arithmetic', name: 'Decimals & Percents', glyph: '%' },
  // Also algebra: the exponent rules are the same rules with letters in them.
  { id: 'powers', subject: 'arithmetic', name: 'Powers & Roots', glyph: 'ⁿ' },
  { id: 'factors', subject: 'arithmetic', name: 'Factors & Multiples', glyph: '×' },
  // Also algebra, and also geometry: a rate is a slope, a proportion is a
  // linear equation with one unknown, and similar figures are a ratio held
  // constant. Filed under arithmetic because that is where it is first met.
  { id: 'ratio', subject: 'arithmetic', name: 'Ratio & Rate', glyph: '∷' },

  // ── Algebra ───────────────────────────────────────────────────────────
  { id: 'expressions', subject: 'algebra', name: 'Expressions', glyph: 'x' },
  { id: 'equations', subject: 'algebra', name: 'Equations', glyph: '=' },
  // Its own category rather than a third skill under Equations: an equation
  // is a claim you test and an inequality is a claim about a whole range,
  // and the one rule that differs -- the flip -- is the reason students who
  // are fluent with equations still get these wrong.
  { id: 'inequalities', subject: 'algebra', name: 'Inequalities', glyph: '<' },
  { id: 'sequences', subject: 'algebra', name: 'Sequences', glyph: '…' },
  // Also analysis: this is where calculus readiness is actually decided.
  { id: 'functions', subject: 'algebra', name: 'Functions', glyph: 'ƒ' },

  // ── Geometry ──────────────────────────────────────────────────────────
  // Also algebra: reading a point off a grid and graphing a line are one skill.
  { id: 'coordinates', subject: 'geometry', name: 'Coordinates', glyph: '⌗' },
  { id: 'angles', subject: 'geometry', name: 'Lines & Angles', glyph: '∠' },
  { id: 'shapes', subject: 'geometry', name: 'Shapes', glyph: '△' },
  { id: 'measure', subject: 'geometry', name: 'Area & Volume', glyph: '▭' },

  // ── Trigonometry ──────────────────────────────────────────────────────
  { id: 'right-triangles', subject: 'trigonometry', name: 'Right Triangles', glyph: '◺' },
  { id: 'unit-circle', subject: 'trigonometry', name: 'The Unit Circle', glyph: '◯' },
  { id: 'identities', subject: 'trigonometry', name: 'Identities', glyph: '≡' },

  // ── Chance & Data ─────────────────────────────────────────────────────
  { id: 'probability', subject: 'data', name: 'Probability', glyph: '⚄' },
  { id: 'statistics', subject: 'data', name: 'Statistics', glyph: '⌾' },
];

/** The subject a category is filed under. */
export const subjectOf = (categoryId) => {
  const cat = CATEGORIES.find((c) => c.id === categoryId);
  return SUBJECTS.find((s) => s.id === cat?.subject) ?? null;
};

/**
 * The learning graph.
 *
 * Nodes are exactly what a student sees: Skills, and the Levels inside them.
 * There is no separate vocabulary to maintain — the relationships are plain
 * many-to-many links between artefacts that already exist in the UI.
 *
 * `dependsOn` is deliberately soft. It says "this builds on that", not "this
 * is forbidden until that is finished". Level unlocking inside a Skill is a
 * separate, hard rule; these edges only inform and advise.
 *
 *   Skill.dependsOn  -> ['int-addsub', ...]                 coarse
 *   Level.dependsOn  -> [{ skill: 'int-addsub', level: 4 }] precise
 *
 * A Level may only depend on Skills its parent Skill already declares, so the
 * fine-grained edges can never contradict the coarse ones.
 */

/** @returns {string[]} skill ids this skill declares a dependency on */
export const dependenciesOf = (skill) => skill.dependsOn ?? [];

/** @returns {Array<{skill:string, level:number}>} */
export const levelDependencies = (skill, levelIndex) =>
  skill.levels[levelIndex]?.dependsOn ?? [];

/** Skills that declare a dependency on `skillId`. */
export const dependentsOf = (skillId) =>
  SKILLS.filter((s) => dependenciesOf(s).includes(skillId));

/**
 * The order the Map lays skills out in: nothing before what it builds on.
 *
 * Grouping alone got this wrong, and quietly. The Map walks subjects, then
 * categories, then the skills in each -- which put Factors & Multiples, where
 * lowest common multiple and greatest common factor are actually taught,
 * *after* the eight fraction skills that stand on it, and Ratio & Rate after
 * the Percents level that needs it. A student scrolling for the thing they
 * are missing passed everything that needs it first and reasonably concluded
 * it was not in the catalogue.
 *
 * So the walk is the same, with one rule added: a skill's dependencies are
 * laid out before it, recursively, and then the category it interrupted
 * carries on. Nothing is pushed back -- a skill only ever moves earlier, to
 * the first point where something needs it -- so the curated order survives
 * everywhere it was not actually wrong. In this catalogue two skills move.
 *
 * The cost is that a category is no longer guaranteed to be contiguous:
 * pulling Ratio & Rate forward to sit before Percents splits Decimals &
 * Percents into two runs. That is the right trade here, because the grid has
 * no headings -- every card names its own subject and category, so a split
 * category costs a student nothing, while a prerequisite filed after its
 * dependents costs them the skill.
 *
 * @returns {Array<{skill: any, cat: any}>}
 */
export function mapOrder() {
  const seed = SUBJECTS.flatMap((sub) =>
    CATEGORIES.filter((c) => c.subject === sub.id).flatMap((cat) =>
      SKILLS.filter((s) => s.category === cat.id).map((skill) => ({ skill, cat }))));
  const byId = new Map(seed.map((e) => [e.skill.id, e]));

  const out = [];
  const placed = new Set();
  const visit = (entry, trail) => {
    // `trail` guards a cycle. validateGraph fails the build over one, so this
    // cannot happen -- but a Map that hung would be a miserable way to find
    // out, and a skill drawn in a slightly odd place is not.
    if (placed.has(entry.skill.id) || trail.has(entry.skill.id)) return;
    trail.add(entry.skill.id);
    for (const id of dependenciesOf(entry.skill)) {
      const dep = byId.get(id);
      if (dep) visit(dep, trail);
    }
    trail.delete(entry.skill.id);
    placed.add(entry.skill.id);
    out.push(entry);
  };
  for (const entry of seed) visit(entry, new Set());
  return out;
}

/**
 * How deep a skill sits in the graph: the longest chain of dependencies
 * beneath it. Foundational skills are 0. Used to weight advanced work more
 * heavily than the basics it rests on.
 */
export function depthOf(skillId, seen = new Set()) {
  if (seen.has(skillId)) return 0;            // cycles are caught elsewhere
  const skill = SKILLS.find((s) => s.id === skillId);
  const deps = dependenciesOf(skill ?? {});
  if (!deps.length) return 0;
  const next = new Set([...seen, skillId]);
  return 1 + Math.max(...deps.map((d) => depthOf(d, next)));
}

/**
 * Check the graph is internally consistent. Called by the test suite; cheap
 * enough to call anywhere.
 * @returns {string[]} problems found, empty when the graph is sound
 */
/**
 * Has this skill been finished, ever?
 *
 * Finishing is clearing the *last* level against the clock, which is already
 * the app's own definition -- the "done for today" banner has meant exactly
 * this since before anything gated on it. The last level mixes every level
 * before it, so clearing it cannot be done without the rest, and nothing new
 * had to be recorded to support the gate below.
 */
export function skillCompleted(skillId, progress) {
  const skill = getSkill(skillId);
  if (!skill) return false;
  const mastered = progress?.skills?.[skillId]?.mastered ?? [];
  return mastered.includes(skill.levels.length - 1);
}

/**
 * The skills standing between a student and this one, unfinished.
 *
 * `dependsOn` used to be purely advisory -- "this builds on that", never
 * "this is forbidden until that is done". It is now the gate, which is a
 * deliberate reversal and changes what an edge costs: declaring one closes a
 * skill until the other is finished. Connective edges that are true but not
 * needed to *start* are therefore no longer free, and coords/steepness is the
 * one that had to give.
 *
 * Empty means the skill is open. Skills with no dependencies at all are the
 * roots, and are what a student sees on their first day.
 */
export function lockedBy(skillId, progress) {
  // Never close something already begun.
  //
  // The gate arrived after students did. One of them had eighty problems'
  // worth of Add & Subtract Fractions and had not finished Factors, so
  // switching it on would have taken away a skill they were in the middle
  // of -- which is not a gate doing its job, it is work disappearing.
  //
  // It matters beyond that migration: adding a dependency to a skill is a
  // normal thing to do, and it must not retroactively shut out the people
  // already working in it. A locked skill cannot be started, so the only way
  // to have progress in one is to have started before it was locked.
  const record = progress?.skills?.[skillId];
  if ((record?.mastered ?? []).length || record?.solved) return [];

  return dependenciesOf(getSkill(skillId) ?? {})
    .filter((id) => !skillCompleted(id, progress));
}

export function validateGraph() {
  const problems = [];
  const byId = new Map(SKILLS.map((s) => [s.id, s]));

  for (const skill of SKILLS) {
    for (const dep of dependenciesOf(skill)) {
      if (!byId.has(dep)) problems.push(`${skill.id} depends on unknown skill "${dep}"`);
      if (dep === skill.id) problems.push(`${skill.id} depends on itself`);
    }

    skill.levels.forEach((level, i) => {
      for (const link of levelDependencies(skill, i)) {
        const target = byId.get(link.skill);
        if (!target) {
          problems.push(`${skill.id}[${i}] depends on unknown skill "${link.skill}"`);
          continue;
        }
        if (!dependenciesOf(skill).includes(link.skill)) {
          problems.push(
            `${skill.id}[${i}] depends on ${link.skill} but ${skill.id} does not declare it`);
        }
        if (!(link.level >= 0 && link.level < target.levels.length)) {
          problems.push(`${skill.id}[${i}] depends on ${link.skill}[${link.level}], out of range`);
        }
      }
    });
  }

  // Something has to be playable on day one. With dependencies gating access,
  // a catalogue where every skill depends on another is one nobody can start
  // -- and a cycle check alone would not notice, because the graph could be
  // perfectly acyclic and still have no root.
  if (!SKILLS.some((s) => !dependenciesOf(s).length)) {
    problems.push('no skill has zero dependencies, so nothing is open on day one');
  }

  // No cycles. A hard requirement, not a preference, and the one rule here
  // that constrains how skills may be *shaped* rather than how they are
  // written down.
  //
  // Three things walk these edges and all three need an acyclic graph. The
  // Map lays skills out in dependency order, so a cycle is a set of skills
  // with no honest place to draw any of them. The unlock gate opens a skill
  // when what it builds on is finished, so a cycle is a set of skills each
  // waiting on the others, which no student can ever open. And depthOf
  // weights advanced work above the basics by measuring the chain beneath a
  // skill, which a loop makes meaningless.
  //
  // The fix is never to delete whichever edge happened to close the loop --
  // that edge is usually true, and deleting it leaves the catalogue lying
  // about what rests on what. The fix is to split. A cycle says two skills
  // each need the whole of the other, and that is almost always a sign that
  // one of them is two skills: the part needed early becomes its own skill,
  // and the rest depends on it. So a skill cannot grow past the point where
  // something it contains is needed by something it needs. That is a
  // mechanical ceiling on skill size, arrived at from a different direction
  // than the eight-level guide, and it is a feature rather than an obstacle
  // to route around.
  //
  // A proper three-colour walk: grey is on the current path, black is
  // finished. Marking a node finished only once its own dependencies are
  // explored is what keeps a cycle reachable by two routes from being
  // skipped on the second.
  const GREY = 1, BLACK = 2;
  const mark = new Map();
  const reported = new Set();
  const walk = (id, path) => {
    if (mark.get(id) === BLACK) return;
    if (mark.get(id) === GREY) {
      const loop = [...path.slice(path.indexOf(id)), id];
      // A skill depending on itself is reported above, precisely and by that
      // name. Saying "split one of them" about a loop of one would be advice
      // for a fault this is not.
      if (loop.length < 3) return;
      // One report per cycle however many routes reach it: the same loop
      // named five times reads like five faults.
      const key = [...new Set(loop)].sort().join(',');
      if (!reported.has(key)) {
        reported.add(key);
        problems.push(`cycle: ${loop.join(' -> ')} — these skills each wait on the others, `
          + 'so none can ever open and the map has nowhere to draw them. Split one of them: '
          + 'the part needed earlier becomes its own skill, and the rest depends on it');
      }
      return;
    }
    mark.set(id, GREY);
    for (const dep of dependenciesOf(byId.get(id) ?? {})) walk(dep, [...path, id]);
    mark.set(id, BLACK);
  };
  for (const s of SKILLS) walk(s.id, []);

  return problems;
}
