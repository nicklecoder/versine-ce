import { trialSettings } from './modes.js';

/**
 * The Time Trial clock, per student per level.
 *
 * Nobody sets this by hand. It arrives one of three ways, in order:
 *
 *   1. an adapted clock the server has stored, from previous trials;
 *   2. a seed derived from how fast the student actually practised;
 *   3. nothing — the level is not ready for a trial yet.
 *
 * The authored `trial: { duration }` on a level is *not* used as the clock.
 * It stays a fixed reference pace for the Level calculation, so that adapting
 * one student's clock never changes what their Level means relative to
 * anyone else's.
 */

/** Practice answers needed before a median is worth trusting. */
export const SEED_SAMPLE = 8;

/**
 * Bounds on seconds-per-problem. Mirrors CLOCK in server/app.py, which applies
 * the same limits when it adapts. They matter here too: a student who blitzes
 * a level they already know can produce a median low enough to seed a clock of
 * nearly zero.
 */
const MIN_PACE = 3;
const MAX_PACE = 40;
const STEP = 5;

/** Round to a tidy value, then hold it inside the bounds. */
function tidy(seconds, target) {
  const low = Math.ceil((target * MIN_PACE) / STEP) * STEP;
  const high = Math.floor((target * MAX_PACE) / STEP) * STEP;
  return Math.max(low, Math.min(high, Math.round(seconds / STEP) * STEP));
}

/**
 * @param {object} levelDef
 * @param {object} progress      /api/progress payload
 * @param {string} skillId
 * @param {number} level
 * @returns {{duration:number|null, target:number, source:'adapted'|'seeded'|'unready',
 *            runs:number, reference:number}}
 */
export function clockFor(levelDef, progress, skillId, level) {
  const { duration: reference, target } = trialSettings(levelDef);
  const key = `${skillId}:${level}`;

  const stored = progress?.clocks?.[key];
  if (stored?.duration) {
    return { duration: stored.duration, target, source: 'adapted',
             runs: stored.runs ?? 0, reference };
  }

  const stat = (progress?.levels ?? [])
    .find((s) => s.skillId === skillId && s.level === level);

  if (stat && stat.attempts >= SEED_SAMPLE && stat.medianSeconds) {
    // Keep up the pace you practiced at and you pass exactly.
    return { duration: tidy(stat.medianSeconds * target, target), target,
             source: 'seeded', runs: 0, reference };
  }

  return { duration: null, target, source: 'unready',
           runs: 0, reference, have: stat?.attempts ?? 0, need: SEED_SAMPLE };
}

/** Plain-English account of where a clock came from. */
export function clockExplanation(clock) {
  switch (clock.source) {
    case 'adapted':
      return `Set from your last ${clock.runs} time trial${clock.runs === 1 ? '' : 's'} `
        + 'on this level — it moves as you do.';
    case 'seeded':
      return 'Set from the pace you practiced at. It adjusts after your first trial.';
    default:
      return `Practise this level first — ${clock.need - (clock.have ?? 0)} more answers `
        + 'and the clock can be set from your own pace.';
  }
}
