import { api } from './engine/api.js';
import { unlockOnFirstGesture } from './engine/audio.js';
import { mount } from './ui/dom.js';
import { state, setRenderer, go, rerender } from './ui/router.js';
import { loginScreen, setupScreen } from './ui/auth.js';
import { mapScreen, skillScreen, modeScreen } from './ui/map.js';
import { blockersFor, signInScreen, screenFor, loadExtensions } from './engine/extensions.js';
import { el } from './ui/dom.js';
import { playScreen, summaryScreen } from './ui/play.js';
import { teacherScreen, studentScreen } from './ui/teacher.js';

const root = document.getElementById('app');

function render() {
  const r = state.route;
  // requiem: server/extensions/extension-points -- an extension may replace
  // sign-in; without one, this install's PIN profiles.
  if (!state.me) {
    const custom = signInScreen();
    if (custom) return mount(root, custom);
    return mount(root, state.needsSetup ? setupScreen() : loginScreen());
  }

  // The gate lives here rather than in each screen, because a locked skill
  // has three ways in and a guard on one of them is not a gate. The map
  // disables the tile, but a bookmark, a shared link or a typed URL routes
  // straight to a level or a mode picker -- and `play` would have started a
  // run in a skill the student cannot see. `skillScreen` renders the lock and
  // says what to finish first, so every route lands on the same explanation.
  //
  // Teachers are exempt: they are inspecting the catalogue, not working
  // through it, and they have no progress of their own to unlock anything.
  if (state.me.role !== 'teacher'
      && ['skill', 'mode', 'play'].includes(r.name)
      && blockersFor(r.skillId, state.progress).length) {
    return mount(root, skillScreen(r.skillId));
  }

  const extra = screenFor(r.name);
  if (extra) return mount(root, extra(r));

  switch (r.name) {
    case 'skill':   return mount(root, skillScreen(r.skillId));
    case 'mode':    return mount(root, modeScreen(r.skillId, r.level));
    case 'play':    return mount(root, playScreen(r));
    case 'summary': return mount(root, summaryScreen(r));
    case 'teacher': return mount(root, teacherScreen());
    case 'student': return mount(root, studentScreen(r.id));
    default:        return mount(root, mapScreen());
  }
}

setRenderer(render);
unlockOnFirstGesture();

(async function boot() {
  await loadExtensions({ api, state, go, rerender, el, mount });
  const data = await api.bootstrap();
  state.needsSetup = data.needs_setup;
  state.users = data.users;
  state.me = data.me;
  if (state.me) {
    state.progress = await api.progress();
    go({ name: state.me.role === 'teacher' ? 'teacher' : 'map' });
  } else {
    render();
  }
})();
