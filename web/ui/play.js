import { api } from '../engine/api.js';
import { SKILLS } from '../engine/registry.js';
import { MODES, trialSettings } from '../engine/modes.js';
import { clockFor } from '../engine/clock.js';
import { daysUntil } from '../engine/days.js';
import { play as sound } from '../engine/audio.js';
import { openWalkthrough } from './walkthrough.js';
import { Session } from '../engine/session.js';
import { loadLevel, dealer } from '../engine/library.js';
import { el, mount, minus } from './dom.js';
import { getType } from '../math/answer.js';
import { renderVisual, hasVisual } from './visuals.js';
import { renderPrompt, answerTerm } from './prompt.js';
import { makeAnswerInput } from './answerinput.js';
import { state, go } from './router.js';
import { topbar, crumbs, soundToggle } from './map.js';

const CORRECT_PAUSE = 850;
const REVEAL_PAUSE = 1900;

/** @param {{skillId:string, level:number, modeId:string, duration?:number}} route */
export function playScreen(route) {
  const skill = SKILLS.find((s) => s.id === route.skillId);
  const mode = MODES[route.modeId];
  // Derived here rather than carried in the route, so it can never go stale.
  const trial = clockFor(skill.levels[route.level], state.progress, skill.id, route.level);
  /**
   * What stopping is called. Only a timed run can be abandoned; Practice has
   * no clock and no target, so you leave it when you have had enough — that is
   * finishing, not giving up, and the button should not suggest otherwise.
   */
  const stopLabel = mode.gate ? 'Quit' : 'Done';
  /** The same act, as a verb, for the keyboard hint. */
  const stopVerb = mode.gate ? 'quit' : 'finish';

  // ── Elements ────────────────────────────────────────────────────────────
  const hud = el('div.hud');
  const timeFill = el('div.timebar__fill');
  const timebar = el('div.timebar', {}, timeFill);
  const problemEl = el('div.problem');
  const retryFlag = el('div.retry-flag.hidden', {}, '↻ Second look');
  // Whatever picture this skill wants lives here; the play screen never needs
  // to know whether it's a number line, a sign model, or something later.
  const visualBox = el('div.visual');
  const feedback = el('div.feedback');
  // The widget is chosen by the skill's answer type -- an integer box, or
  // stacked numerator over denominator for fractions. This screen never needs
  // to know which: every widget offers the same small surface.
  const answerSlot = el('div.answer-slot');
  const hintEl = el('p.tiny.muted.center');
  let answer = null;
  let answerKind = null;

  /** Swap the input widget when a problem asks for a different kind of answer. */
  // Set once the level's library arrives; until then the numeric pad is the
  // safe default, since a run cannot start before the library has loaded.
  let levelSigned = false;

  function useAnswerWidget(kind, spec) {
    // Choice widgets carry their options, which change every problem, so they
    // are rebuilt each time rather than only when the kind changes.
    if (kind === answerKind && kind !== 'choice') return;
    answerKind = kind;
    answer = makeAnswerInput(kind, spec, { signed: levelSigned });
    hintEl.textContent = keyboardHint();
      mount(answerSlot, answer.node);
  }
  useAnswerWidget(skill.answerInput ?? 'int', null);

  // Keyboard-first: a button that grabs focus is a button that breaks the
  // flow. Suppressing mousedown's default keeps focus in the answer field
  // while still firing the click.
  const noSteal = { onmousedown: (e) => e.preventDefault() };

  const explainBtn = mode.allowExplain
    ? el('button.btn.btn--sm.btn--ghost', { onclick: showExplain, ...noSteal }, 'Why?')
    : null;
  const checkBtn = el('button.btn.btn--primary', { onclick: submit, ...noSteal }, 'Check');

  let locked = false;         // between answering and the next problem
  let timerId = null;
  let lessonOpen = false;     // a walkthrough overlay owns the keyboard

  // The number line draws at 1:1 pixel scale, so visuals are redrawn whenever
  // the box changes width -- including the first layout, since playScreen
  // builds the tree before it is mounted.
  let lastDraw = null;
  let lastWidth = 0;
  const paintVisual = (spec, opts) => {
    lastDraw = { spec, opts };
    lastWidth = Math.round(visualBox.getBoundingClientRect().width);
    renderVisual(visualBox, spec, opts);
  };
  const observer = new ResizeObserver(() => {
    const w = Math.round(visualBox.getBoundingClientRect().width);
    if (!lastDraw || w === lastWidth || w === 0) return;
    lastWidth = w;
    renderVisual(visualBox, lastDraw.spec, { ...lastDraw.opts, animateFrom: null });
  });
  observer.observe(visualBox);

  // ── Session ─────────────────────────────────────────────────────────────
  const session = new Session({
    skill, level: route.level, mode,
    duration: mode.duration ? trial.duration : undefined,
    target: mode.target ? trial.target : undefined,
    onEvent: handleEvent,
  });

  // Fetch the level's pre-built library. Problems dealt from it come without
  // replacement, so a run cannot repeat one until the whole deck has been
  // through -- which matters most on the small levels, where drawing at
  // random shows a student the same sums several times in one sitting.
  //
  // Started here rather than at `begin`, so the countdown covers the fetch.
  let libraryError = null;
  const libraryReady = loadLevel(skill.id, route.level)
    .then((lib) => {
      const deck = dealer(lib.problems);
      session.deal = () => deck.next();
      levelSigned = !!lib.signed;
    })
    .catch((err) => {
      // Nothing to fall back to, by design: problems in a library have been
      // reviewed and generated ones have not. Better a clear failure than a
      // run quietly served from an unreviewed source.
      libraryError = err;
    });

  function handleEvent(e) {
    switch (e.type) {
      case 'problem': return showProblem(e.problem, e.isRetry);
      case 'tick':    return paintTime();
      case 'levelUp':  return flash(`▲ Level up — ${e.name}`, 'is-info');
      case 'end':     return finish(e.summary);
      default:        paintHud();
    }
  }

  // ── Rendering ───────────────────────────────────────────────────────────
  function paintHud() {
    const stats = [];
    if (session.timed) {
      const m = Math.floor(session.timeLeft / 60);
      const s = session.timeLeft % 60;
      stats.push(['Time', m ? `${m}:${String(s).padStart(2, '0')}` : `${s}`,
        'time', session.timeLeft <= 10]);
    }
    if (session.target) {
      stats.push(['Goal', `${session.solved}/${session.target}`, 'goal', false]);
    } else {
      stats.push(['Solved', session.solved, 'score', false]);
    }
    if (mode.scored) stats.push(['Score', session.points, 'score', false]);
    stats.push(['Streak', session.streak, 'streak', false]);

    mount(hud, stats.map(([label, value, kind, urgent]) =>
      el(`div.stat.stat--${kind}${urgent ? '.is-urgent' : ''}`, {},
        el('div.stat__label', {}, label),
        el('div.stat__value', {}, String(value)))));
  }

  function paintTime() {
    paintHud();
    if (!session.timed) return;
    const pct = (session.timeLeft / session.totalTime) * 100;
    timeFill.style.width = `${pct}%`;
    timeFill.classList.toggle('is-urgent', session.timeLeft <= 10);
    // The last few seconds tick audibly, so you feel the clock without
    // having to look away from the problem.
    if (session.timeLeft > 0 && session.timeLeft <= 5) sound('tick');
  }

  function showProblem(problem, isRetry) {
    locked = false;
    useAnswerWidget(problem.answer.type, problem.answer);
    renderPrompt(problemEl, problem.prompt);
    retryFlag.classList.toggle('hidden', !isRetry);
    feedback.textContent = '';
    feedback.className = 'feedback';
    answer.clear();
    answer.setState(null);
    checkBtn.disabled = false;
    if (explainBtn) explainBtn.disabled = false;

    if (hasVisual(problem.visual)) {
      visualBox.classList.remove('hidden');
      // Ask-state: number lines draw only their opening hop, the sign model
      // holds both answers back. Neither leaks the result.
      paintVisual(problem.visual, { reveal: 1, animateFrom: 0 });
    } else {
      visualBox.classList.add('hidden');
    }

    paintHud();
    answer.focus();
  }

  /** Called only once an answer is committed. @param {'ok'|'bad'} verdict */
  function revealAnswer(verdict) {
    const p = session.problem;
    const type = getType(p.answer.type);
    renderPrompt(problemEl, p.prompt, {
      blankAs: answerTerm(p.answer.type, p.answer.value),
      shown: type.format(p.answer.value),
    });
    if (hasVisual(p.visual)) {
      visualBox.classList.remove('hidden');
      paintVisual(p.visual, { showAnswer: true, animateFrom: 1, verdict });
    }
  }

  /**
   * The stepped version of "why?", walking this very problem. It runs in an
   * overlay so the run underneath keeps its state, and focus-stealing is
   * paused while it is open or the answer field would fight it for the caret.
   */
  function showExplain() {
    if (!session.problem || lessonOpen) return;
    lessonOpen = true;
    openWalkthrough({
      skill,
      level: route.level,
      problem: session.problem,
      onClose: () => { lessonOpen = false; refocus(); },
    });
  }

  const flash = (text, cls) => {
    feedback.textContent = text;
    feedback.className = `feedback ${cls}`;
  };

  // ── Input ───────────────────────────────────────────────────────────────
  function submit() {
    if (locked || session.over) return;
    const result = session.submit(answer.value());

    if (result.status === 'invalid') {
      flash(result.hint ?? 'Type a number first.', 'is-info');
      return;
    }

    if (result.status === 'correct') {
      locked = true;
      answer.setState('right');
      checkBtn.disabled = true;
      sound('correct');
      const bonus = result.gained ? ` +${result.gained}` : '';
      flash(session.streak >= 3 ? `${session.streak} in a row!${bonus}` : `Correct${bonus}`, 'is-correct');
      revealAnswer('ok');
      queueNext(CORRECT_PAUSE);
      return;
    }

    // Wrong: always another go. The cost is time, never a life.
    sound('wrong');
    answer.setState('wrong');
    setTimeout(() => answer.setState(null), 360);
    flash(result.hint ?? 'Not quite — try again', 'is-wrong');
    paintHud();
  }

  let pendingNext = null;
  function queueNext(delay) {
    clearTimeout(pendingNext);
    pendingNext = setTimeout(advanceNow, delay);
  }

  /** Don't make a fast kid wait out the animation. */
  function advanceNow() {
    clearTimeout(pendingNext);
    pendingNext = null;
    if (!session.over) session.nextProblem();
  }

  // Ordinary typing goes straight into the input, so every platform's native
  // keyboard just works. This handles the rest.
  const onKeyDown = (e) => {
    if (e.key === 'Escape') { quit(); return; }
    if (e.key === '?' && mode.allowExplain) { showExplain(); return; }
    if (e.key === 'Enter') {
      e.preventDefault();
      // During the reveal pause Enter means "go on then"; otherwise it submits.
      if (pendingNext) advanceNow();
      else submit();
      return;
    }
    // Any other keystroke means they meant to type an answer.
    if (!e.ctrlKey && !e.metaKey && !e.altKey) refocus();
  };
  document.addEventListener('keydown', onKeyDown);

  /** The answer field keeps focus for the whole run. */
  function refocus() {
    if (lessonOpen || session.over) return;
    if (!answer.contains(document.activeElement)) answer.focus();
  }
  answer.node.addEventListener('focusout', () => setTimeout(refocus, 0));

  function teardown() {
    document.removeEventListener('keydown', onKeyDown);
    observer.disconnect();
    clearInterval(timerId);
    clearTimeout(pendingNext);
    clearTimeout(countdownTimer);
    pendingNext = null;
  }

  /** Where to land after the run is filed away; null means the summary. */
  let exitTo = null;

  function leave(dest) {
    if (session.over) { teardown(); go(dest); return; }
    if (session.answered > 0) {
      // Save what they did, then honour where they asked to go.
      exitTo = dest;
      session.end('quit');
    } else {
      teardown();
      go(dest);
    }
  }

  /** Stopping shows the summary, since they didn't ask for anywhere in particular. */
  function quit() {
    if (session.answered > 0 && !session.over) session.end('quit');
    else { teardown(); go({ name: 'skill', skillId: route.skillId }); }
  }

  // ── End of run ──────────────────────────────────────────────────────────
  async function finish(summary) {
    teardown();
    if (mode.gate) sound(summary.passed ? 'pass' : 'fail');
    let outcome = null;
    // The review as it stood before this run, so the summary can say whether
    // the run was a review that was due, an early one, or the finish itself.
    const reviewBefore = state.progress?.skills?.[skill.id]?.review ?? null;
    try {
      outcome = await api.submitRun({
        skill_id: skill.id, level: session.baseLevel, mode_id: mode.id,
        // The level's identity, which survives levels being inserted above it.
        // `level` still goes along for ordering and for older records.
        level_slug: skill.levels[session.baseLevel]?.slug ?? null,
        level_count: skill.levels.length,
        duration: mode.duration ? trial.duration : 0,
        summary: { ...summary, endReason: summary.endReason },
        attempts: session.log,
        origin: route.origin ?? null,
      });
      state.progress = outcome.progress;
    } catch {
      /* Server unreachable: the run still gets shown, it just isn't saved. */
    }
    if (exitTo) { go(exitTo); return; }
    go({ name: 'summary', skillId: skill.id, level: session.baseLevel,
         modeId: mode.id, summary, outcome, reviewBefore });
  }

  /** What the keys do, phrased for whichever input this skill uses. */
  function keyboardHint() {
    const tail = (mode.allowExplain ? ', ? to explain' : '')
      + `, Esc to ${stopVerb}.`;
    if (answerKind === 'mixed') {
      return 'Whole number, then / for the fraction. Enter answers' + tail;
    }
    if (answerKind === 'frac') {
      // Enter moves down rather than submitting, because submitting a
      // half-typed fraction would cost an attempt. A whole number therefore
      // takes two presses, which is worth saying out loud.
      return 'Type the top, then / for the bottom. Enter answers' + tail;
    }
    return 'Type and press Enter. Minus key for negatives' + tail;
  }

  // ── Go ──────────────────────────────────────────────────────────────────
  let countdownTimer = null;

  function begin() {
    paintHud();
    // The countdown has usually covered the fetch already; the timeout is for
    // the case where it has not. A timed run must never wait on the network.
    Promise.race([libraryReady, new Promise((r) => setTimeout(r, 1500))]).then(() => {
      if (libraryError) return failed(libraryError);
      session.start();
      if (session.timed) timerId = setInterval(() => session.tick(), 1000);
      setTimeout(refocus, 0);
    });
  }

  /**
   * The level's problems could not be loaded, so there is no run to have.
   * Say so plainly and offer the way back, rather than leaving a student
   * looking at a prompt box that will never fill.
   */
  function failed(err) {
    problemEl.innerHTML = "";
    problemEl.append(el('div.load-failed', {},
      el('div.load-failed__title', {}, 'This level could not load'),
      el('div.load-failed__body', {},
        `Its problem library is missing or unreadable. Nothing is wrong with `
        + `your progress — the level itself needs a look.`),
      el('div.load-failed__detail', {}, String(err?.message ?? err))));
    renderVisual(visualBox, null);
  }

  /** Three beats before the clock starts, so nobody loses seconds to surprise. */
  function countdownThen(done) {
    const num = el('div.countdown__num', {}, '3');
    const overlay = el('div.countdown', {},
      el('div.countdown__label', {}, mode.name),
      num,
      el('div.countdown__hint', {}, `${trial.target} correct to clear this level`));
    card.append(overlay);

    let n = 3;
    const step = () => {
      n -= 1;
      if (n === 0) {
        sound('go');
        num.textContent = 'GO';
        num.className = 'countdown__num is-go';
        countdownTimer = setTimeout(() => { overlay.remove(); done(); }, 450);
        return;
      }
      sound('beep');
      num.textContent = String(n);
      num.className = 'countdown__num';
      void num.offsetWidth;              // restart the pulse animation
      num.classList.add('is-pulse');
      countdownTimer = setTimeout(step, 800);
    };
    sound('beep');
    num.classList.add('is-pulse');
    countdownTimer = setTimeout(step, 800);
  }

  // Named so the countdown overlay has something to sit on.
  const card = el('div.card.stack', { onclick: refocus },
    retryFlag,
    problemEl,
    visualBox,
    feedback,
    el('div.answer-row', {}, answerSlot, checkBtn, explainBtn));

  paintHud();
  if (session.timed) countdownThen(begin);
  else begin();

  return el('div.shell', {},
    el('div.topbar', {},
      el('div', {},
        crumbs([
          { label: 'Map', go: () => leave({ name: 'map' }) },
          { label: skill.name, go: () => leave({ name: 'skill', skillId: skill.id }) },
          { label: skill.levels[route.level].name },
        ]),
        // The crumb carries the level, so the heading carries the mode.
        el('div.row__title', {}, mode.name)),
      el('div.row-flex', {},
        soundToggle(),
        el('button.btn.btn--sm.btn--ghost', { onclick: quit, ...noSteal }, stopLabel))),
    hud,
    session.timed ? timebar : null,
    card,
    hintEl);
}

/** Post-run screen: what happened, and what it earned. */
/**
 * After passing a finished skill's last level against the clock: when the
 * next review is. A review should land as a win, not a chore paid off
 * (review/review-opens-the-day), so it says what the pass bought.
 *
 * requiem: review/skill-review-schedule
 */
function reviewBanner(skill, route) {
  const { summary, outcome, reviewBefore } = route;
  const after = outcome?.progress?.skills?.[skill.id]?.review;
  const isLast = route.level === skill.levels.length - 1;
  if (!MODES[route.modeId]?.gate || !summary.passed || !isLast || !after) return null;

  const days = daysUntil(after.dueOn);
  const when = days === 1 ? 'tomorrow' : `in ${days} days`;
  const text = !reviewBefore
    ? `Skill finished. Its first review is ${when}.`
    : reviewBefore.due
      ? `Review done. The next one is ${when}.`
      : `Kept fresh. Next review ${when}.`;
  return el('div.banner.banner--violet', {}, el('span', {}, '↻'), el('span', {}, text));
}

export function summaryScreen(route) {
  const { summary, outcome } = route;
  const skill = SKILLS.find((s) => s.id === route.skillId);
  const mode = MODES[route.modeId];

  const verdict = mode.gate
    ? (summary.passed ? 'Level cleared' : 'Out of time')
    : 'Session ended';

  const stat = (label, value) =>
    el('div.stat', {}, el('div.stat__label', {}, label), el('div.stat__value', {}, String(value)));

  const fmt = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

  // A trial that did not come off is very often one a student wants straight
  // away, and the only way back in was four screens of navigation. The clock
  // is re-derived here rather than carried over from the run just finished:
  // the server adapts it on every trial, and `state.progress` already holds
  // the new one by the time this screen is built. So "try again" always means
  // the clock they have now, not the one they just lost on.
  const retryable = mode.gate && !summary.passed;
  const retryClock = retryable
    ? clockFor(skill.levels[route.level], state.progress, skill.id, route.level)
    : null;

  const banners = [];
  if (outcome?.unlockedLevel != null && skill.levels[outcome.unlockedLevel]) {
    banners.push(el('div.banner.banner--gold', {},
      `★ Level unlocked — ${skill.levels[outcome.unlockedLevel].name}`));
  }
  if (outcome?.newBest && mode.scored) {
    banners.push(el('div.banner.banner--cool', {}, '⚡ New personal best'));
  }
  if (outcome?.clockNext && outcome.clockWas) {
    const delta = outcome.clockNext - outcome.clockWas;
    if (delta !== 0) {
      banners.push(el('div.banner.banner--cool', {},
        el('span', {}, delta > 0 ? '⏱' : '⚡'),
        el('span', {}, delta > 0
          ? `More time next go: ${fmt(outcome.clockNext)}. The clock follows you.`
          : `Tighter next go: ${fmt(outcome.clockNext)}. You had time to spare.`)));
    } else {
      banners.push(el('div.banner.banner--cool', {},
        el('span', {}, '⏱'),
        el('span', {}, outcome.clockAtFloor
          ? `Clock stays at ${fmt(outcome.clockNext)} — as tight as this level goes.`
          : `Clock stays at ${fmt(outcome.clockNext)} — that was about right.`)));
    }
  }
  const reviewed = reviewBanner(skill, route);
  if (reviewed) banners.push(reviewed);
  if (!outcome) {
    banners.push(el('div.banner.banner--violet', {}, '⚠ Not saved — server unreachable'));
  }

  /** Out to the levels list. */
  const dismiss = () => { cleanup(); go({ name: 'skill', skillId: route.skillId }); };

  /** Straight back into the same level and mode, on the freshly set clock. */
  const retry = () => {
    cleanup();
    go({ name: 'play', skillId: route.skillId, level: route.level, modeId: route.modeId });
  };

  // Enter is deaf for a moment first -- the keystroke that finished the last
  // problem often arrives just after the run ends, and would skip the score.
  let armed = false;
  setTimeout(() => { armed = true; }, 700);

  const onKey = (e) => {
    // R rather than Enter: a run ends on a keystroke, and Enter restarting a
    // timed run would drop a student into a countdown they never asked for.
    if (retryable && (e.key === 'r' || e.key === 'R')
        && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      retry();
      return;
    }
    if (e.key === 'Enter' || e.key === 'Escape') {
      e.preventDefault();
      if (e.key === 'Enter' && !armed) return;
      dismiss();
    }
  };
  const cleanup = () => document.removeEventListener('keydown', onKey);
  document.addEventListener('keydown', onKey);

  return el('div.shell', { style: { maxWidth: '560px' } },
    topbar(),
    crumbs([
      { label: 'Map', go: () => { cleanup(); go({ name: 'map' }); } },
      { label: skill.name, go: dismiss },
      { label: `${skill.levels[route.level].name} · ${mode.name}` },
    ]),
    el('div.card.summary', {},
      el('div', { class: `summary__verdict ${mode.gate ? (summary.passed ? 'is-pass' : 'is-fail') : ''}` }, verdict),
      el('div.summary__score', {}, String(mode.scored ? summary.points : summary.solved)),
      el('div.eyebrow', {}, mode.scored ? 'points' : 'problems solved'),
      mode.gate
        ? el('p.muted', {},
            summary.passed
              ? `${summary.solved} solved with ${summary.timeLeft ?? 0}s to spare.`
              : `${summary.solved} of ${summary.target} solved. Close the gap and the level is yours.`)
        : null,
      el('div.summary__grid', {},
        stat('Solved', summary.solved),
        stat('First try', `${Math.round(summary.accuracy * 100)}%`),
        stat('Best run', summary.bestStreak),
        stat('Avg', `${summary.avgSeconds.toFixed(1)}s`)),
      ...banners,
      retryable
        ? el('div.summary__actions', {},
            el('div.row-flex', {},
              el('button.btn.btn--go.btn--ok', { onclick: retry },
                retryClock?.duration
                  ? `↻ Try again · ${fmt(retryClock.duration)}`
                  : '↻ Try again'),
              el('button.btn.btn--ghost', { onclick: dismiss }, 'Levels ⏎')),
            el('p.tiny.muted', {}, 'R to go again · Enter for the levels list'))
        : el('button.btn.btn--go.btn--ok', { onclick: dismiss }, 'OK ⏎')));
}
