/**
 * Shared app state and the world's smallest router. Screens import from here
 * rather than from app.js so there is no import cycle.
 */
export const state = {
  me: null,
  users: [],
  needsSetup: false,
  progress: null,
  route: { name: 'login' },
};

let renderer = () => {};
export const setRenderer = (fn) => { renderer = fn; };
export const rerender = () => renderer();

/**
 * Every move is a history entry, so the browser's back button and Android's
 * back gesture step back through the app instead of out of it -- leaving
 * mid-run used to lose the run unsaved.
 *
 * A screen with something to finish first (a run in progress) registers a
 * guard, and a back press goes through it: the play screen files the run,
 * then goes where the press pointed.
 */
let leaveGuard = null;
export const setLeaveGuard = (fn) => { leaveGuard = fn; };
let fromHistory = false;

/** @param {{replace?: boolean}} [opts] replace the current entry rather than add one */
export function go(route, { replace = false } = {}) {
  state.route = route;
  try {
    // A move made in answer to a back press is already in history.
    if (fromHistory || replace) history.replaceState({ route }, '');
    else history.pushState({ route }, '');
  } catch { /* a route that cannot be cloned is still a route */ }
  fromHistory = false;
  renderer();
  window.scrollTo(0, 0);
}

window.addEventListener('popstate', (e) => {
  const route = e.state?.route;
  if (!route || !state.me) return;
  fromHistory = true;
  if (leaveGuard) leaveGuard(route);
  else go(route);
});
