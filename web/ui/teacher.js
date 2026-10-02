import { api } from '../engine/api.js';
import { SKILLS, getSkill } from '../engine/registry.js';
import { trialSettings } from '../engine/modes.js';
import { computeRating } from '../engine/rating.js';
import { daysUntil } from '../engine/days.js';
import { el, mount } from './dom.js';
import { ICONS, ACCENTS } from './icons.js';
import { state, go } from './router.js';

const pct = (n) => `${Math.round(n * 100)}%`;
const skillName = (id) => SKILLS.find((s) => s.id === id)?.name ?? id;

/** Green when they're fine, red when they aren't. */
const heat = (missRate) =>
  missRate > 0.4 ? 'var(--hot)' : missRate > 0.2 ? 'var(--gold)' : 'var(--grow)';

/**
 * @param {string[]} headers  prefix a header with '#' to right-align its column
 * @param {Array<{cells:Array, onclick?:Function}>} rows
 */
function table(headers, rows) {
  const numeric = headers.map((h) => h.startsWith('#'));
  const head = el('tr', {}, headers.map((h, i) =>
    el(numeric[i] ? 'th.num' : 'th', {}, h.replace(/^#/, ''))));

  const body = rows.map((r) =>
    el('tr', {
      style: r.onclick ? { cursor: 'pointer' } : null,
      onclick: r.onclick,
    }, r.cells.map((c, i) => el(numeric[i] ? 'td.num' : 'td', {}, c))));

  return el('div.card.card--flush', {},
    el('div.table-wrap', {},
      el('table.table', {}, el('thead', {}, head), el('tbody', {}, body))));
}

function meter(fraction, missRate) {
  return el('div.meter', { style: { width: '70px' } },
    el('div.meter__fill', {
      style: { width: pct(fraction), background: heat(missRate) },
    }));
}

function header() {
  return el('div.topbar.topbar--wide', {},
    el('div', {},
      el('div.eyebrow', {}, 'Teacher console'),
      el('div.row__title', {}, state.me.name)),
    el('div.row-flex', {},
      el('button.btn.btn--sm.btn--ghost', { onclick: () => go({ name: 'map' }) }, 'Practise'),
      el('button.btn.btn--sm.btn--ghost', {
        onclick: async () => { await api.logout(); location.reload(); },
      }, 'Sign out')));
}

/** Everyone at a glance. */
export function teacherScreen() {
  const body = el('div.stack', {}, el('p.muted', {}, 'Loading…'));

  api.teacherOverview().then((students) => {
    const rows = students.map((s) => ({
      onclick: () => go({ name: 'student', id: s.id }),
      cells: [
        el('div.row-flex', {},
          el('div.avatar', { style: { '--accent': s.accent } }, s.icon),
          el('strong', {}, s.name)),
        el('div.row-flex', {},
          meter(s.accuracy, 1 - s.accuracy),
          el('span.tiny', {}, s.attempts ? pct(s.accuracy) : '—')),
        String(s.attempts),
        String(s.attemptsThisWeek),
        s.avgSeconds ? `${s.avgSeconds.toFixed(1)}s` : '—',
        s.reviewsDue
          ? el('span', { style: { color: 'var(--violet)' } }, String(s.reviewsDue))
          : '0',
        String(s.reviews30d),
        el('span.tiny.muted', {}, s.lastActive?.slice(0, 10) ?? 'never'),
        deleteButton(s),
      ],
    }));

    mount(body,
      students.length
        ? table(['Student', 'Accuracy', '#Answered', '#This week', '#Avg time',
                 '#Reviews due', '#Reviews, 30 days', 'Last active', ''], rows)
        : el('div.card', {},
            el('p.muted.center', {},
              'No students yet. They sign themselves up from the “New profile” '
              + 'tile on the sign-in screen.')),
      addTeacherCard());
  }).catch((e) => mount(body, el('p.feedback.is-wrong', {}, e.message)));

  return el('div.shell.shell--wide', {}, header(), body);
}

/**
 * Deleting a student erases every run and attempt they ever recorded, so it
 * asks twice. Students create their own accounts; only a teacher removes one.
 */
function deleteButton(student) {
  const btn = el('button.btn.btn--sm.btn--ghost.btn--danger', {}, 'Delete');
  let armed = false;

  btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (!armed) {
      armed = true;
      btn.textContent = 'Sure?';
      btn.classList.add('is-armed');
      setTimeout(() => {
        armed = false;
        btn.textContent = 'Delete';
        btn.classList.remove('is-armed');
      }, 4000);
      return;
    }
    btn.disabled = true;
    try {
      await api.deleteUser(student.id);
      location.reload();
    } catch (err) {
      btn.disabled = false;
      btn.textContent = err.message;
    }
  });

  return btn;
}

/** Students sign themselves up; this is only for adding another parent. */
function addTeacherCard() {
  const name = el('input.input', { placeholder: 'Name', maxlength: 16 });
  const pin = el('input.input', {
    placeholder: '4-digit PIN', inputmode: 'numeric', maxlength: 4,
    oninput: (e) => { e.target.value = e.target.value.replace(/\D/g, ''); },
  });
  const msg = el('div.feedback');

  const add = async () => {
    msg.className = 'feedback';
    try {
      await api.createUser({
        name: name.value, pin: pin.value, role: 'teacher',
        icon: ICONS[12], accent: ACCENTS[4],
      });
      location.reload();
    } catch (e) {
      msg.textContent = e.message;
      msg.className = 'feedback is-wrong';
    }
  };

  return el('div.card.stack--sm', {},
    el('div.eyebrow', {}, 'Add another teacher'),
    el('p.tiny.muted', {},
      'Students make their own profiles from the sign-in screen. Use this only '
      + 'to give another adult access to this console.'),
    el('div.row-flex', {}, name, pin,
      el('button.btn.btn--primary', { onclick: add }, 'Add teacher')),
    msg);
}

/** One student in detail: what they've done, and what keeps catching them out. */
export function studentScreen(id) {
  const body = el('div.stack', {}, el('p.muted', {}, 'Loading…'));

  api.teacherStudent(id).then((d) => {
    mount(body,
      studentHeader(d.student, levelLine(d)),
      reviewCard(d.reviewHealth),
      paceCard(d.levels, d.clocks),
      activityCard(d.daily),
      runsCard(d.runs));
  }).catch((e) => mount(body, el('p.feedback.is-wrong', {}, e.message)));

  return el('div.shell.shell--wide', {}, header(), body);
}

/**
 * Whether finished skills are getting reviewed, and whether the prompts are
 * what does it. This is the measure that decides review/turn-on-decay: a
 * student who reviews only by chance, or never while a skill is due, is the
 * case decay was meant for.
 *
 * requiem: review/measure-review-health
 */
function reviewCard(h) {
  if (!h?.finished) {
    return el('div.card.stack--sm', {},
      el('div.eyebrow', {}, 'Review'),
      el('p.tiny.muted', {}, 'No finished skills yet, so nothing to review.'));
  }
  const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
  const prompt = (started, passed) => (started ? `${started} started, ${passed} passed` : 'not used');
  const facts = [
    ['Finished', `${h.finished} · ${h.due} due`],
    [`Reviews, ${h.days} days`, h.reviews
      ? `${h.reviews} · ${h.reviewsWhenDue} while due`
        + (h.medianOverdueDays != null
          ? ` · median ${plural(h.medianOverdueDays, 'day')} overdue` : '')
      : 'none'],
    ['Start-of-day offer', prompt(h.offerStarted, h.offerPassed)],
    ['Warm-up prompt', prompt(h.warmupStarted, h.warmupPassed)],
  ];
  const rows = h.skills.map((r) => {
    const until = daysUntil(r.dueOn);
    return {
      cells: [
        skillName(r.skillId),
        r.due
          ? el('span', { style: { color: 'var(--violet)' } },
              r.overdueDays ? `due, ${plural(r.overdueDays, 'day')} overdue` : 'due today')
          : el('span.tiny.muted', {}, until === 1 ? 'tomorrow' : `in ${until} days`),
        `${r.intervalDays} days`,
        el('span.tiny.muted', {}, r.lastReviewedOn ?? 'not yet'),
      ],
    };
  });
  return el('div.stack--sm', {},
    el('div.card.stack--sm', {},
      el('div.eyebrow', {}, 'Review'),
      el('div.facts', {}, facts.map(([k, v]) =>
        el('div.fact', {}, el('div.stat__label', {}, k), el('div.fact__value', {}, v))))),
    table(['Finished skill', 'Next review', 'Interval', 'Last reviewed'], rows));
}

/** Their Level, recomputed the same way the student sees it. */
function levelLine(detail) {
  const { level, rating, ceiling } = computeRating(SKILLS, detail.progress, detail.levels ?? []);
  return `Level ${level} · ${rating.toFixed(1)} of ${ceiling.toFixed(0)} possible`;
}

function studentHeader(student, subtitle) {
  return el('div.between', {},
    el('div.row-flex', {},
      el('div.avatar.avatar--lg', { style: { '--accent': student.accent } }, student.icon),
      el('div', {},
        el('h2', {}, student.name),
        el('div.eyebrow', {}, subtitle))),
    el('button.btn.btn--sm.btn--ghost', {
      onclick: () => go({ name: 'teacher' }),
    }, '← All students'));
}

function activityCard(daily) {
  const max = Math.max(1, ...daily.map((d) => d.attempts));
  const bars = daily.map((day) =>
    el('div.spark__bar', {
      title: `${day.day}: ${day.attempts} answered, ${day.correct} correct`,
      style: {
        height: `${Math.max((day.attempts / max) * 100, 6)}%`,
        background: heat(1 - day.correct / day.attempts),
      },
    }));

  return el('div.card.stack--sm', {},
    el('div.eyebrow', {}, 'Last 30 days'),
    daily.length
      ? el('div.spark', {}, bars)
      : el('p.tiny.muted', {}, 'Nothing yet.'));
}

/**
 * Ability per level.
 *
 * This used to be a calibration instrument — "is this level's clock wrong?" —
 * but the clock now corrects itself, so that question answers itself. What is
 * left is the more useful one: how able is this student, measured against a
 * fixed standard that is the same for everybody?
 *
 * Two different numbers, and the difference matters:
 *   * measured median vs the level's fixed **standard** -> ability, comparable
 *     between students and over time;
 *   * their own settled **clock** -> where the adaptive gate landed for them,
 *     which is an ability readout in its own right.
 */
function paceCard(levels = [], clocks = {}) {
  if (!levels.length) {
    return el('div.card.stack--sm', {},
      el('div.eyebrow', {}, 'Pace by level'),
      el('p.tiny.muted', {}, 'No answers recorded yet.'));
  }

  const bySkill = new Map();
  for (const lvl of levels) {
    if (!bySkill.has(lvl.skillId)) bySkill.set(lvl.skillId, []);
    bySkill.get(lvl.skillId).push(lvl);
  }

  const sections = [...bySkill.entries()].map(([skillId, rows]) => {
    const skill = getSkill(skillId);
    return el('div.stack--sm', {},
      el('div.eyebrow', {}, skill?.name ?? skillId),
      el('div.levels', {}, rows.map((lvl) => levelRow(skill, lvl, clocks))));
  });

  return el('div.card.stack', {},
    el('div.between', {},
      el('div.eyebrow', {}, 'Ability by level'),
      el('span.tiny.muted', {},
        'median time on correct answers, against a fixed standard — not against their own clock')),
    ...sections);
}

function levelRow(skill, lvl, clocks = {}) {
  const levelDef = skill?.levels?.[lvl.level];
  const { duration, target } = trialSettings(levelDef);
  const standard = duration / target;          // the fixed yardstick, same for everyone
  const measured = lvl.medianSeconds;

  const own = clocks[`${lvl.skillId}:${lvl.level}`];

  // Ratio > 1 means slower than the standard. This is a statement about
  // ability, not about whether the clock is set correctly.
  const ratio = measured ? measured / standard : null;
  const verdict = ratio == null ? { label: '—', tone: 'idle' }
    : ratio <= 0.7 ? { label: 'fast', tone: 'good' }
    : ratio <= 1.0 ? { label: 'at standard', tone: 'ok' }
    : ratio <= 1.3 ? { label: 'near standard', tone: 'warn' }
    : { label: 'below standard', tone: 'bad' };

  return el('div.level-row', {},
    el('div.level-row__name', {},
      el('div.row__title', {}, levelDef?.name ?? `Level ${lvl.level + 1}`),
      el('div.row__sub', {}, `${lvl.attempts} answered · last ${lvl.lastSeen}`)),

    el('div.level-row__metric', {},
      el('div.metric__label', {}, 'Median'),
      el('div.metric__value', {}, measured ? `${measured.toFixed(1)}s` : '—'),
      el('div.metric__sub', {}, `standard ${standard.toFixed(1)}s`)),

    el('div.level-row__metric', {},
      el('div.metric__label', {}, 'Their clock'),
      el('div.metric__value', {},
        own ? `${(own.duration / target).toFixed(1)}s` : '—'),
      el('div.metric__sub', {},
        own ? `settled over ${own.runs} trial${own.runs === 1 ? '' : 's'}` : 'not set yet')),

    el('div.level-row__metric', {},
      el('div.metric__label', {}, 'Accuracy'),
      el('div.metric__value', {}, `${Math.round(lvl.accuracy * 100)}%`),
      el('div.meter', {}, el('div.meter__fill', {
        style: { width: pct(lvl.accuracy), background: heat(1 - lvl.accuracy) },
      }))),

    el('div.level-row__trend', {},
      el('div.metric__label', {}, 'Pace trend'),
      paceSpark(lvl.trend, standard)),

    el('span', { class: `verdict verdict--${verdict.tone}` }, verdict.label));
}

/** Bars are solve time; the dashed line is the fixed standard for the level. */
function paceSpark(trend = [], standard) {
  const points = trend.filter((t) => t.medianSeconds != null);
  if (!points.length) return el('p.tiny.muted', {}, 'not enough data');

  const max = Math.max(standard, ...points.map((t) => t.medianSeconds)) * 1.1;
  return el('div.pace-spark', {},
    el('div.pace-spark__line', { style: { bottom: `${(standard / max) * 100}%` } }),
    ...points.map((t) =>
      el('div.pace-spark__bar', {
        title: `${t.day}: ${t.medianSeconds.toFixed(1)}s median, `
          + `${Math.round(t.accuracy * 100)}% right over ${t.attempts}`,
        style: {
          height: `${(t.medianSeconds / max) * 100}%`,
          background: t.medianSeconds <= standard ? 'var(--grow)' : 'var(--hot)',
        },
      })));
}

function runsCard(runs) {
  const rows = runs.map((r) => ({
    cells: [
      el('span.tiny.muted', {}, r.ended_at?.slice(0, 16).replace('T', ' ') ?? ''),
      `${skillName(r.skill_id)} · T${r.level + 1}`,
      r.mode_id,
      String(r.points),
      `${r.solved}/${r.answered}`,
      r.passed
        ? el('span', { style: { color: 'var(--gold)' } }, '★ passed')
        : el('span.tiny.muted', {}, pct(r.accuracy)),
    ],
  }));
  return table(['When', 'Skill', 'Mode', '#Score', '#Solved', 'Result'], rows);
}
