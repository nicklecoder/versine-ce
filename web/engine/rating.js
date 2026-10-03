import { depthOf } from './registry.js';
import { trialSettings } from './modes.js';

/**
 * The student's Level.
 *
 * Deliberately *not* accumulated experience. XP in games measures how long
 * you have played, not what you can do, and it can only ever go up — which
 * misrepresents a real skill, because arithmetic you stop practising genuinely
 * does get slower and less accurate.
 *
 * So Level is computed from present ability, and it can fall:
 *
 *   for every level the student has cleared:
 *     contribution = weight × quality
 *   Level = floor(sum of contributions) + 1
 *
 * Roughly, your Level is "how many levels' worth of maths you can currently do
 * well", counting harder material for more.
 *
 * Note what is *absent*: time. The Level never drifts down because a student
 * stopped playing. Decaying on the calendar would be a guess about what
 * happened while nobody was looking, and this number is supposed to be a
 * record of what was actually demonstrated. `quality` is measured over the
 * most recent answers, so the Level falls only when a lower standard is
 * genuinely shown — and rises again the moment a better one is.
 *
 * Time still matters, but as a separate question, answered per skill by the
 * server: when a finished skill is due for review (server/review.py). It
 * changes what the app suggests, never what the Level is.
 */

/** Tuning. Kept together and named so it can be argued with. */
export const RATING = {
  depthBonus: 0.5,      // per step of dependency depth: advanced work counts more
  levelBonus: 0.15,     // per level index within a skill: later levels count more
  accFloor: 0.60,       // accuracy at or below this contributes nothing
  accCeil: 0.95,        // accuracy at or above this is full marks
  paceFloor: 1.40,      // this many times over the clock's budget scores nothing
  paceCeil: 0.60,       // this fraction of the budget is full marks
  speedShare: 0.40,     // how much of quality is speed; the rest is accuracy
};

const clamp01 = (x) => Math.max(0, Math.min(1, x));

/** How much this level is worth if performed perfectly. */
export function weightOf(skill, levelIndex) {
  return (1 + RATING.depthBonus * depthOf(skill.id))
       * (1 + RATING.levelBonus * levelIndex);
}

/**
 * How well they currently perform it, 0..1.
 * Accuracy multiplies rather than averages: being fast cannot rescue being
 * wrong, which is the same rule the scoring uses.
 */
export function qualityOf(accuracy, medianSeconds, allowedSeconds) {
  const acc = clamp01((accuracy - RATING.accFloor) / (RATING.accCeil - RATING.accFloor));
  if (medianSeconds == null) return acc * (1 - RATING.speedShare);
  const ratio = medianSeconds / allowedSeconds;
  const spd = clamp01((RATING.paceFloor - ratio) / (RATING.paceFloor - RATING.paceCeil));
  return acc * ((1 - RATING.speedShare) + RATING.speedShare * spd);
}

/**
 * @param {object[]} skills           the skill catalogue
 * @param {object} progress           /api/progress payload
 * @param {object[]} levelStats       per-level accuracy/pace, from the server
 * @returns {{level:number, rating:number, ceiling:number, rows:object[]}}
 */
export function computeRating(skills, progress, levelStats = []) {
  const stats = new Map(levelStats.map((s) => [`${s.skillId}:${s.level}`, s]));
  const rows = [];
  let rating = 0;
  let ceiling = 0;

  for (const skill of skills) {
    const record = progress?.skills?.[skill.id];
    const cleared = record?.mastered ?? [];

    skill.levels.forEach((levelDef, i) => {
      const weight = weightOf(skill, i);
      ceiling += weight;
      if (!cleared.includes(i)) return;

      const stat = stats.get(`${skill.id}:${i}`);
      const { duration, target } = trialSettings(levelDef);
      const allowed = duration / target;

      const accuracy = stat?.accuracy ?? 0;
      const median = stat?.medianSeconds ?? null;

      const quality = qualityOf(accuracy, median, allowed);
      const contribution = weight * quality;

      rating += contribution;
      rows.push({
        skillId: skill.id, skillName: skill.name, level: i, levelName: levelDef.name,
        weight, accuracy, medianSeconds: median, allowedSeconds: allowed,
        sampleSize: stat?.sampleSize ?? 0,
        quality, contribution,
      });
    });
  }

  rows.sort((a, b) => b.contribution - a.contribution);
  // Everyone starts at Level 1. A beginner who has just cleared their first
  // level should not be greeted with "Level 0".
  return { level: Math.floor(rating) + 1, rating, ceiling, rows };
}

/** The single most effective thing they could do to move the number. */
export function biggestGain(result) {
  const candidates = result.rows
    .map((r) => ({ ...r, headroom: r.weight - r.contribution }))
    .sort((a, b) => b.headroom - a.headroom);
  return candidates[0] ?? null;
}

/**
 * What each skill is worth to the Level: what it contributes now, and the
 * most it could. `possible` counts every level, cleared or not, so it is
 * also what an unfinished skill is "worth up to".
 *
 * requiem: review/card-shows-points
 * @returns {Map<string, {contribution:number, possible:number}>}
 */
export function skillValues(skills, result) {
  const values = new Map(skills.map((skill) => [skill.id, {
    contribution: 0,
    possible: skill.levels.reduce((sum, _, i) => sum + weightOf(skill, i), 0),
  }]));
  for (const row of result.rows) {
    const v = values.get(row.skillId);
    if (v) v.contribution += row.contribution;
  }
  return values;
}
