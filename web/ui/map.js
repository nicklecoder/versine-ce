import { api } from '../engine/api.js';
import { SKILLS, subjectOf, getSkill, dependenciesOf, levelDependencies,
  skillCompleted, mapOrder } from '../engine/registry.js';
import { blockersFor, linksFor, lockNoteFor } from '../engine/extensions.js';
import { MODES, MODE_ORDER, trialSettings, formatDuration } from '../engine/modes.js';
import { computeRating, biggestGain, skillValues } from '../engine/rating.js';
import { clockFor, clockExplanation } from '../engine/clock.js';
import { localDay } from '../engine/days.js';
import { soundEnabled, setSoundEnabled } from '../engine/audio.js';
import { openWalkthrough } from './walkthrough.js';
import { el, mount } from './dom.js';
import { state, go, rerender } from './router.js';

const recordFor = (skillId) =>
  state.progress?.skills?.[skillId] ?? { level: 0, mastered: [], solved: 0, best: {} };

/** Mute. Per device, not per account — it is about where you are sitting. */
export function soundToggle() {
  const btn = el('button.btn.btn--sm.btn--ghost.sound-toggle', {
    title: 'Sound on or off',
    'aria-label': 'Sound on or off',
    // Never pull focus out of the answer field mid-run.
    onmousedown: (e) => e.preventDefault(),
  }, soundEnabled() ? '🔊' : '🔇');
  btn.addEventListener('click', () => {
    setSoundEnabled(!soundEnabled());
    btn.textContent = soundEnabled() ? '🔊' : '🔇';
  });
  return btn;
}

/** Level, recomputed from what the student can currently do. */
export const currentRating = () =>
  computeRating(SKILLS, state.progress, state.progress?.levels ?? []);

export function topbar({ wide = false } = {}) {
  const { level, rating } = currentRating();
  const into = rating - Math.floor(rating);
  return el(`div.topbar${wide ? '.topbar--wide' : ''}`, {},
    el('div.whoami', {},
      el('div.avatar', { style: { '--accent': state.me.accent } }, state.me.icon),
      el('div', {},
        el('div.row__title', {}, state.me.name),
        el('div.eyebrow', {}, `Level ${level} · ${Math.round(into * 100)}% to Level ${level + 1}`))),
    el('div.row-flex', {},
      soundToggle(),
      state.me.role === 'teacher' &&
        el('button.btn.btn--sm.btn--ghost', { onclick: () => go({ name: 'teacher' }) }, 'Console'),
      ...extensionLinks(),
      el('button.btn.btn--sm.btn--ghost', {
        onclick: async () => { await api.logout(); location.reload(); },
      }, 'Sign out')));
}

/** Top-bar links an extension added for this person's role (extension-points). */
export function extensionLinks() {
  return linksFor(state.me?.role).map((link) =>
    el('button.btn.btn--sm.btn--ghost', { onclick: () => go(link.route) }, link.label));
}

/**
 * Breadcrumb trail. Every screen inside a skill shows where it sits and how to
 * get back out -- previously the only route back to a skill was a button
 * labelled "Change mode", which nobody reads as "return to Integer Add &
 * Subtract".
 *
 * @param {Array<{label:string, go?:Function}>} items  last item is the current page
 */
export function crumbs(items) {
  const nodes = [];
  items.forEach((item, i) => {
    if (i) nodes.push(el('span.crumb-sep', {}, '/'));
    nodes.push(item.go
      ? el('button.crumb', {
          onclick: item.go,
          onmousedown: (e) => e.preventDefault(),  // never steal focus mid-run
        }, item.label)
      : el('span.crumb.is-here', {}, item.label));
  });
  return el('nav.crumbs', {}, nodes);
}

/**
 * Page heading with a plain back button. Navigation is forward/back by
 * default; the breadcrumb trail above is there for when you want to skip
 * several levels at once.
 */
export function pageHead(backLabel, onBack, title, sub) {
  return el('div.page-head', {},
    el('button.btn.btn--sm.btn--ghost.btn--back', { onclick: onBack }, backLabel),
    el('div.page-head__text', {},
      el('h2', {}, title),
      sub ? el('p.tiny.muted', {}, sub) : null));
}

export function levelBar() {
  const { level, rating, ceiling } = currentRating();
  const into = rating - Math.floor(rating);
  return el('div.xp', {},
    el('span.xp__level', {}, `LV ${level}`),
    el('div.xp__track', {}, el('div.xp__fill', { style: { width: `${into * 100}%` } })),
    el('span.tiny.muted', {}, `${rating.toFixed(1)} of ${ceiling.toFixed(0)} possible`));
}

/** The map: every skill, with how far in you are. */
/**
 * Why the Level is what it is. Shown on the Map because a number that can go
 * *down* has to be explainable, or it just feels arbitrary and unfair.
 */
function levelBreakdown() {
  const result = currentRating();
  if (!result.rows.length) {
    return el('div.card.stack--sm', {},
      el('div.eyebrow', {}, 'Your level'),
      el('p.tiny.muted', {},
        'Clear a level in a Time Trial and it starts counting towards your Level.'));
  }

  // Only the handful that matter by default. Every cleared level appears here
  // otherwise, which is 24 rows already and grows with the catalogue -- long
  // enough to bury the skills it is meant to support.
  const SHOWN = 5;
  const worthShowing = result.rows.filter((r) => r.contribution > 0);
  let expanded = false;

  const rowFor = (r) => {
    const share = r.contribution / r.weight;          // 0..1 of what it could be
    const reason = share > 0.9 ? 'as good as it gets'
      : r.accuracy < 0.9 ? `accuracy ${Math.round(r.accuracy * 100)}%`
      : `${r.medianSeconds?.toFixed(1)}s vs ${r.allowedSeconds.toFixed(1)}s allowed`;

    return el('div.contrib', {},
      el('div.contrib__name', {},
        el('div.row__title', {}, r.levelName),
        el('div.row__sub', {}, r.skillName)),
      el('div.contrib__bar', {},
        el('div.contrib__fill', {
          style: { width: `${share * 100}%`, background: share > 0.8
            ? 'var(--grow)' : share > 0.5 ? 'var(--gold)' : 'var(--hot)' },
        })),
      el('div.contrib__value', {}, `+${r.contribution.toFixed(2)}`),
      el('div.contrib__why', {}, reason));
  };

  const list = el('div.contribs');
  const more = el('button.btn.btn--sm.btn--ghost');
  const paint = () => {
    const shown = expanded ? worthShowing : worthShowing.slice(0, SHOWN);
    mount(list, shown.map(rowFor));
    more.textContent = expanded
      ? 'Show fewer'
      : `Show all ${worthShowing.length}`;
  };
  more.addEventListener('click', () => { expanded = !expanded; paint(); });
  paint();

  const best = biggestGain(result);
  return el('div.card.stack--sm', {},
    el('div.between', {},
      el('div.eyebrow', {}, 'Why you are this level'),
      el('span.tiny.muted', {},
        'only your latest answers count — nothing drops just from time passing')),
    list,
    worthShowing.length > SHOWN ? more : null,
    best && best.headroom > 0.15
      ? el('p.tiny.muted', {},
          `Biggest gain available: ${best.levelName} in ${best.skillName} `
          + `(+${best.headroom.toFixed(2)} if you nail it).`)
      : null);
}

// ── The review offer ─────────────────────────────────────────────────────────
// requiem: review/offer-card-atop-map
// The first card on the map when a review is due. "Not today" is remembered
// per student, per device, until their next local day: a convenience, so
// browser storage is enough, and losing it only means seeing the offer again.
const notTodayKey = () => `versine.review.notToday.${state.me?.id}`;

function dismissedToday() {
  try {
    return localStorage.getItem(notTodayKey()) === localDay();
  } catch {
    return false;
  }
}

function reviewOffer() {
  const skill = getSkill(state.progress?.reviewOffer);
  if (!skill || dismissedToday()) return null;
  const last = skill.levels[skill.levels.length - 1];
  const card = el('div.card.review-offer.stack--sm', {},
    el('div.eyebrow', {}, '↻ Start with a review'),
    el('div.review-offer__name', {}, `${skill.name} · ${last.name}`),
    el('p.tiny.muted', {},
      'One Time Trial. Passing it also finishes the skill for today.'),
    el('div.review-offer__actions', {},
      el('button.btn', { onclick: () => startReview(skill, 'review-offer') }, 'Start'),
      el('button.btn.btn--ghost', {
        onclick: () => {
          try { localStorage.setItem(notTodayKey(), localDay()); } catch { /* private mode */ }
          card.remove();
        },
      }, 'Not today')));
  return card;
}

export function mapScreen() {
  // One continuous grid rather than a grid per group. A heading above each
  // would force a row break, so with two skills per category every row held
  // two cards and left a track empty. Grouping still keeps a subject's skills
  // together and its categories in order -- it just travels on the card
  // instead of above it.
  //
  // The order is the catalogue's, and it is a dependency order rather than a
  // filing order: see mapOrder(). Reading down the grid never reaches a skill
  // before the skills it builds on.
  const ordered = mapOrder();
  const values = skillValues(SKILLS, currentRating());
  recordBests(values);

  return el('div.shell', {},
    topbar(),
    reviewOffer(),
    el('div.card.stack--sm', {}, el('div.eyebrow', {}, 'Progress'), levelBar()),
    el('div.eyebrow', {}, 'Skills'),
    el('div.grid.grid--skills', {}, ordered.map(({ skill, cat }) =>
      skillTile(skill, cat, values.get(skill.id)))),
    levelBreakdown(),
    el('p.tiny.muted.center', {},
      'Finish a skill\u2019s last level to open what depends on it.'));
}

/**
 * A skill on the map: open, locked, or open and never yet finished.
 *
 * "New" marks a skill whose every level has not yet been cleared -- not one
 * that has merely been started. It is shown only on open skills: on a locked
 * one it would be noise, since the thing it invites cannot be done yet.
 */
function skillTile(skill, cat, value) {
  const rec = recordFor(skill.id);
  const blocking = blockersFor(skill.id, state.progress);
  const locked = blocking.length > 0;
  const isNew = !locked && rec.mastered.length < skill.levels.length;
  const names = blocking.map((id) => getSkill(id)?.name ?? id);
  const note = locked ? lockNoteFor(skill.id, blocking) : null;

  return el('button.tile', {
    class: `${rec.doneToday ? 'tile--done ' : ''}${locked ? 'tile--locked ' : ''}cat-${skill.category}`,
    disabled: locked,
    title: locked ? (note ?? `Finish ${names.join(' and ')} first`) : '',
    onclick: () => go({ name: 'skill', skillId: skill.id }),
  },
    el('div.tile__head', {},
      el('div.tile__glyph', {}, locked ? '🔒' : skill.glyph),
      el('div.grow', {},
        el('div.tile__name', {}, skill.name,
          isNew ? el('span.badge-new', { title: 'Not every level cleared yet' }, 'new') : null,
          // requiem: review/review-tags-capped -- the server tags at most two.
          rec.review?.tagged
            ? el('span.badge-review', { title: 'Pass its last level in a Time Trial to review it' },
                'needs review')
            : null),
        // Subject then category, so the broad territory is readable without a
        // heading -- headings would force a row break per group and leave the
        // grid full of gaps, which is what the one continuous grid avoids.
        el('div.eyebrow', {},
          cat
            ? `${cat.glyph} ${subjectOf(cat.id)?.name ?? ''} · ${cat.name} · ${rec.solved} solved`
            : `${rec.solved} solved`)),
      rec.doneToday ? el('div.done-tick', { title: 'Done for today' }, '✓') : null),
    el('div.tile__blurb', {}, locked
      ? (note ?? `Finish ${names.join(' and ')} to open this.`)
      : skill.blurb),
    el('div.pips', {}, skill.levels.map((_, i) =>
      el('div', {
        class: `pip ${rec.mastered.includes(i) ? 'is-mastered' : i <= rec.level ? 'is-open' : ''}`,
      }))),
    worthLine(rec, value));
}

/**
 * What the skill is worth to the Level, in Level units: "+7.4 of 10.2" once
 * any level counts, "worth up to +10.2" before -- locked skills included, so
 * the value of what lies ahead is visible. Not "points": that word means a
 * run's score.
 *
 * requiem: review/card-shows-points
 */
function worthLine(rec, value) {
  if (!value) return null;
  const n = (x) => x.toFixed(1);
  if (!rec.mastered.length) {
    return el('div.tile__worth', {}, 'worth up to ', el('b', {}, `+${n(value.possible)}`), ' Level');
  }
  const best = rec.contributionBest;
  return el('div.tile__worth', {},
    'Level ', el('b', {}, `+${n(value.contribution)}`), ` of ${n(value.possible)}`,
    best != null && best >= value.contribution + 0.05
      ? el('span.tile__best', {}, ` · best +${n(best)}`) : null);
}

/**
 * Report any skill now contributing more than its stored best, so the best
 * is kept by the server. Fire and forget: nothing on screen waits for it,
 * and a failed report is simply made again on the next visit to the map.
 *
 * requiem: review/contribution-best-reported
 */
function recordBests(values) {
  if (state.me?.role === 'teacher' || !state.progress?.skills) return;
  const better = {};
  for (const [skillId, v] of values) {
    const rec = state.progress.skills[skillId];
    if (!rec || v.contribution <= 0) continue;
    if (rec.contributionBest == null || v.contribution > rec.contributionBest + 0.005) {
      better[skillId] = Math.round(v.contribution * 100) / 100;
    }
  }
  if (!Object.keys(better).length) return;
  api.reportContributions(better).then(({ bests }) => {
    for (const [skillId, best] of Object.entries(bests)) {
      if (state.progress.skills[skillId]) state.progress.skills[skillId].contributionBest = best;
    }
  }).catch(() => { /* reported again next time */ });
}

/** Last 28 days of practice on this skill, as a strip. */
function streakCard(skillId) {
  const card = el('div.card.stack--sm', {},
    el('div.eyebrow', {}, 'Your streak'),
    el('p.tiny.muted', {}, 'Loading…'));

  api.activity(skillId).then((a) => {
    const byDay = new Map(a.days.map((d) => [d.day, d]));
    const today = new Date();
    const cells = [];

    for (let i = 27; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      // requiem: server/day-is-local -- the server keys days locally, so must this.
      const key = localDay(d);
      const hit = byDay.get(key);
      const accuracy = hit?.attempts ? hit.correct / hit.attempts : 0;
      const done = hit?.completed;
      cells.push(el('div.day', {
        class: `${hit ? 'is-on' : ''} ${done ? 'is-done' : ''}`,
        title: !hit ? `${key}: nothing`
          : hit.attempts
            ? `${key}: ${hit.attempts} answered, ${Math.round(accuracy * 100)}% right`
              + (done ? ' — finished' : ' — practised, not finished')
            : `${key}: finished`,
        style: hit && !done
          ? { background: heatColor(accuracy), opacity: 0.3 + Math.min(hit.attempts / 30, 1) * 0.35 }
          : null,
      }));
    }

    const headline = a.currentStreak > 0
      ? `${a.currentStreak} day${a.currentStreak === 1 ? '' : 's'} in a row`
      : a.completedDays > 0 ? 'Streak broken — start a new one' : 'No finished days yet';

    mount(card,
      el('div.between', {},
        el('div.eyebrow', {}, 'Finishing streak'),
        el('span.tiny.muted', {},
          `best ${a.bestStreak} · finished ${a.completedDays} of ${a.practiceDays} days practised`)),
      el('div.streak-headline', {}, el('span.streak-flame', {}, '🔥'), headline),
      el('div.days', {}, cells),
      el('p.tiny.muted', {},
        'A day only counts once you clear the last level against the clock. '
        + 'Faded squares are days you practised without finishing.'),
      a.levelsCleared.length
        ? el('div.stack--sm', {},
            el('div.eyebrow', {}, 'Levels cleared'),
            el('div.chips', {}, a.levelsCleared.map((t) =>
              el('span.chip', { style: { cursor: 'default' } },
                `T${t.level + 1} · ${t.day}`))))
        : null);
  }).catch(() => mount(card,
    el('div.eyebrow', {}, 'Your streak'),
    el('p.tiny.muted', {}, 'Unavailable.')));

  return card;
}

const heatColor = (accuracy) =>
  accuracy >= 0.85 ? 'var(--grow)' : accuracy >= 0.6 ? 'var(--gold)' : 'var(--hot)';

/**
 * "Done for today" is the headline state of a skill. It is earned only by
 * clearing the last level in a Time Trial -- grinding level 1 all afternoon
 * does not count.
 */
function dailyBanner(skill, rec) {
  const lastLevel = skill.levels.length - 1;
  const unlocked = rec.level >= lastLevel;

  if (rec.doneToday) {
    return el('div.banner.banner--gold', {},
      el('span', {}, '✓'),
      el('span', {}, `${skill.name} is done for today.`));
  }
  if (!unlocked) {
    return el('div.banner.banner--violet', {},
      el('span', {}, '🔒'),
      el('span', {},
        `Work up to ${skill.levels[lastLevel].name} — clearing it against the `
        + 'clock is what finishes this skill for the day.'));
  }
  return el('div.banner.banner--cool', {},
    el('span', {}, '◷'),
    el('span', {},
      `Not finished today. Clear ${skill.levels[lastLevel].name} in a Time Trial.`));
}

/** Step one of the wizard: pick a level. */
export function skillScreen(skillId) {
  const skill = SKILLS.find((s) => s.id === skillId);
  const rec = recordFor(skillId);

  // The map disables a locked tile, but a bookmarked or hand-typed URL routes
  // straight here. The gate has to live where the skill is entered, not only
  // where it is drawn.
  const blocking = blockersFor(skillId, state.progress);
  if (blocking.length) {
    const names = blocking.map((id) => getSkill(id)?.name ?? id);
    // requiem: server/extensions/lock-note -- an extension that closed this
    // skill for its own reason says why, and "finish X" would be untrue.
    const note = lockNoteFor(skillId, blocking);
    if (note) {
      return el('div.shell', {},
        topbar(),
        crumbs([{ label: 'Map', go: () => go({ name: 'map' }) }, { label: skill.name }]),
        el('div.card.stack--sm', {},
          el('div.banner.banner--violet', {}, el('span', {}, '🔒'), el('span', {}, note))));
    }
    return el('div.shell', {},
      topbar(),
      crumbs([{ label: 'Map', go: () => go({ name: 'map' }) }, { label: skill.name }]),
      el('div.card.stack--sm', {},
        el('div.banner.banner--violet', {},
          el('span', {}, '🔒'),
          el('span', {}, `${skill.name} opens once you have finished `
            + `${names.join(' and ')}.`)),
        el('p.tiny.muted', {},
          'Finishing a skill means clearing its last level against the clock — '
          + 'that level mixes every level before it, so there is nothing else to do first.'),
        ...blocking.map((id) => el('button.btn.btn--sm', {
          onclick: () => go({ name: 'skill', skillId: id }),
        }, `Go to ${getSkill(id)?.name ?? id}`))));
  }

  const levelRows = el('div.card.card--flush', {},
    el('div.rows', {}, skill.levels.map((t, i) => {
      const locked = i > rec.level;
      const isLastLevel = i === skill.levels.length - 1;
      const isStrategy = t.kind === 'strategy';
      return el('button', {
        class: `row ${rec.mastered.includes(i) ? 'is-mastered' : ''}`
          + `${isLastLevel ? ' is-last-level' : ''}`
          + `${isStrategy ? ' is-strategy' : ''}`,
        disabled: locked,
        onclick: () => go({ name: 'mode', skillId, level: i }),
      },
        el('div.row__n', {}, locked ? '🔒' : i + 1),
        el('div.row__main', {},
          el('div.row__title', {}, t.name,
            isStrategy ? el('span.row__kind', {}, 'judgement') : null),
          el('div.row__sub', {},
            locked ? 'Clear the Time Trial on the level above to unlock' : t.blurb),
          leansOn(skill, i)),
        isLastLevel && rec.doneToday ? el('div.row__right', {}, '✓ today')
          : rec.mastered.includes(i) ? el('div.row__right', {}, '★') : null,
        locked ? null : el('div.row__go', {}, '›'));
    })));

  return el('div.shell', {},
    topbar(),
    crumbs([
      { label: 'Map', go: () => go({ name: 'map' }) },
      { label: skill.name },
    ]),
    pageHead('← Map', () => go({ name: 'map' }), skill.name, skill.blurb),
    buildsOn(skill),
    dailyBanner(skill, rec),
    el('div.eyebrow', {}, 'Pick a level'),
    levelRows,
    streakCard(skillId));
}

/**
 * "Builds on" — a soft note about what this skill leans on. Never a gate:
 * a student who wants to jump straight in is allowed to.
 */
/** The precise edges: which level of which other skill this one leans on. */
function leansOn(skill, index) {
  const links = levelDependencies(skill, index);
  if (!links.length) return null;
  const text = links.map((l) => {
    const other = getSkill(l.skill);
    return `${other?.name ?? l.skill} · ${other?.levels[l.level]?.name ?? `Level ${l.level + 1}`}`;
  }).join(', ');
  return el('div.row__leans', {}, `leans on ${text}`);
}

function buildsOn(skill) {
  const deps = dependenciesOf(skill);
  if (!deps.length) return null;
  const names = deps.map((id) => getSkill(id)?.name ?? id);
  return el('p.tiny.muted.builds-on', {},
    el('span.builds-on__label', {}, 'Builds on'),
    names.join(', '));
}

/**
 * If a skill this one builds on is due for review, offer that review first. A
 * suggestion with a one-tap route, never a lock: a student who wants to press
 * on is allowed to.
 *
 * requiem: review/skill-tags-replace-level-flags
 */
function warmUpPrompt(skill) {
  const due = dependenciesOf(skill).map(getSkill)
    .filter((dep) => dep && recordFor(dep.id).review?.due);
  if (!due.length) return null;
  const dep = due[0];
  return el('div.banner.banner--violet', {},
    el('span', {}, '↻'),
    el('span.grow', {},
      `${dep.name} is due for review. Reviewing it first will make this easier.`),
    el('button.btn.btn--sm.btn--ghost', { onclick: () => startReview(dep, 'review-warmup') }, 'Review'));
}

/**
 * Straight into a finished skill's last level, against the clock. `origin`
 * says which prompt it came from, so the teacher can see whether the prompts
 * are what get reviews done (review/measure-review-health).
 */
function startReview(skill, origin) {
  go({ name: 'play', skillId: skill.id, level: skill.levels.length - 1, modeId: 'trial', origin });
}

/**
 * A way in for someone who hasn't met this yet. Deliberately a banner rather
 * than a third mode card: the choice between Practice and Time Trial was cut
 * to two on purpose, and this is not a third way to practise — it is the thing
 * you do before you practise at all.
 */
function lessonPrompt(skill, level) {
  return el('div.banner.banner--cool.lesson-prompt', {},
    el('span', {}, '▶'),
    el('span.grow', {}, `New to ${skill.levels[level].name}? Walk through one first.`),
    el('button.btn.btn--sm.btn--ghost', {
      onclick: () => openWalkthrough({ skill, level }),
    }, 'Show me'));
}

/** Step two: pick how to practise it. Choosing here starts the run. */
export function modeScreen(skillId, level) {
  const skill = SKILLS.find((s) => s.id === skillId);
  const rec = recordFor(skillId);
  const levelDef = skill.levels[level];
  const clock = clockFor(levelDef, state.progress, skillId, level);
  const atLastLevel = level === skill.levels.length - 1;

  const cards = MODE_ORDER.map((id) => {
    const mode = MODES[id];
    const blurb = mode.gate && atLastLevel
      ? 'Solve enough before the clock runs out to finish this skill for the '
        + 'day. Mistakes cost you time, not lives.'
      : mode.blurb;
    // A trial needs a clock, and a clock is earned by practising first.
    const locked = mode.gate && clock.source === 'unready';

    return el('button.tile.tile--mode', {
      class: locked ? 'tile--locked' : '',
      disabled: locked,
      onclick: () => go({ name: 'play', skillId, level, modeId: id }),
    },
      el('div.tile__head', {},
        el('div.tile__glyph', {}, locked ? '🔒' : mode.glyph),
        el('div.tile__name', {}, mode.name)),
      el('div.tile__blurb', {}, blurb),
      mode.target
        ? el('div.stack--sm', {},
            el('div.eyebrow', {},
              locked ? 'Locked'
                : `${clock.target} correct in ${formatDuration(clock.duration)}`
                  + (rec.best[id] ? ` · best ${rec.best[id]}` : '')),
            el('div.clock-note', {}, clockExplanation(clock)))
        : null,
      el('div.tile__cta', {}, locked ? 'Practise first' : 'Start ›'));
  });

  return el('div.shell', {},
    topbar(),
    crumbs([
      { label: 'Map', go: () => go({ name: 'map' }) },
      { label: skill.name, go: () => go({ name: 'skill', skillId }) },
      { label: levelDef.name },
    ]),
    pageHead('← Levels', () => go({ name: 'skill', skillId }), levelDef.name, levelDef.blurb),
    warmUpPrompt(skill),
    lessonPrompt(skill, level),
    el('div.eyebrow', {}, 'How do you want to practise?'),
    el('div.grid.grid--modes', {}, cards));
}
