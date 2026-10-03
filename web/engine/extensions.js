/**
 * Extension points: how another server adds to this browser app without
 * forking it.
 *
 * requiem: server/extensions/extension-points
 *
 * `extensions.json`, served beside the app, lists optional modules. This
 * project ships it empty, so a home install loads nothing and every socket
 * below keeps its default -- the app behaves exactly as if none of this
 * existed. A server that implements the same API (server/api-contract) can
 * serve its own list, and each module it names receives the sockets:
 *
 *   setSignIn(render)          replace the sign-in screen (default: PIN profiles)
 *   addScreen(name, render)    a screen reached by go({ name })
 *   addLink({ label, route, roles })  a link in the top bar, for those roles
 *   setGatePolicy(policy)      decide which skills a student may open
 *
 * A module is an ES module whose default export receives { extensions, api,
 * state, go, rerender, el, mount }. One that fails to load is reported on the
 * console and skipped: the app keeps its defaults rather than failing to start.
 */
import { lockedBy } from './registry.js';

const sockets = {
  signIn: null,
  screens: new Map(),
  links: [],
  gatePolicy: null,
};

/** Problems met loading extensions, kept for the console and for checks. */
export const extensionErrors = [];

export const extensions = {
  setSignIn(render) { sockets.signIn = render; },
  addScreen(name, render) { sockets.screens.set(name, render); },
  addLink(link) { sockets.links.push(link); },
  /**
   * requiem: server/extensions/gate-policy
   * `policy({ skillId, progress, blockers })` returns the skills still
   * blocking this one. `blockers` is what the gate itself says; return it
   * unchanged to keep the gate, or fewer to open more.
   */
  setGatePolicy(policy) { sockets.gatePolicy = policy; },
};

/** The skills blocking `skillId`: the gate's answer, unless a policy says otherwise. */
export function blockersFor(skillId, progress) {
  const blockers = lockedBy(skillId, progress);
  return sockets.gatePolicy ? sockets.gatePolicy({ skillId, progress, blockers }) : blockers;
}

/** An extension's sign-in screen, or null for the default. */
export function signInScreen() {
  return sockets.signIn ? sockets.signIn() : null;
}

/**
 * Whether an extension replaced sign-in. Screens that belong to this
 * install's own PIN accounts -- adding a teacher by PIN, the "New profile"
 * hint -- step aside when it did, since accounts are then the extension's.
 */
export function hasCustomSignIn() {
  return sockets.signIn !== null;
}

/** An extension's screen for a route name, or undefined. */
export function screenFor(name) {
  return sockets.screens.get(name);
}

/** Links for someone with this role. */
export function linksFor(role) {
  return sockets.links.filter((l) => !l.roles || l.roles.includes(role));
}

/**
 * Load every module `extensions.json` names, giving each the sockets.
 * @param {object} context  what a module receives besides the sockets
 * @param {Function} [fetcher]  for checks; the browser's fetch otherwise
 */
export async function loadExtensions(context, fetcher = globalThis.fetch) {
  let list = [];
  try {
    const res = await fetcher('/extensions.json', { cache: 'no-cache' });
    if (res.ok) list = (await res.json()).modules ?? [];
  } catch (err) {
    extensionErrors.push(`extensions.json: ${err.message}`);
  }
  for (const url of list) {
    try {
      const mod = await import(url);
      await mod.default?.({ extensions, ...context });
    } catch (err) {
      extensionErrors.push(`${url}: ${err.message}`);
    }
  }
  for (const problem of extensionErrors) console.error(`extension skipped — ${problem}`);
  return list.length;
}
