/** Thin wrapper over the JSON API. Cookies carry the session. */

// requiem: server/day-is-local
// Every request names the browser's time zone, so the server counts the
// student's own calendar days rather than UTC ones.
const TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

async function request(method, path, body) {
  const headers = { 'X-Versine-Time-Zone': TIME_ZONE };
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      detail = (await res.json()).detail ?? detail;
    } catch { /* non-JSON error body */ }
    const err = new Error(detail);
    err.status = res.status;
    throw err;
  }
  return res.status === 204 ? null : res.json();
}

export const api = {
  bootstrap: () => request('GET', '/api/bootstrap'),
  setup: (name, pin, identity) => request('POST', '/api/setup', { name, pin, ...identity }),
  createProfile: (profile) => request('POST', '/api/profiles', profile),
  login: (user_id, pin) => request('POST', '/api/login', { user_id, pin }),
  logout: () => request('POST', '/api/logout'),
  progress: () => request('GET', '/api/progress'),
  submitRun: (run) => request('POST', '/api/runs', run),
  reportContributions: (contributions) =>
    request('POST', '/api/contributions', { contributions }),
  leaderboard: (skillId, modeId = 'trial') =>
    request('GET', `/api/leaderboard?skill_id=${encodeURIComponent(skillId)}&mode_id=${modeId}`),
  activity: (skillId) =>
    request('GET', `/api/activity?skill_id=${encodeURIComponent(skillId)}`),
  teacherOverview: () => request('GET', '/api/teacher/overview'),
  teacherStudent: (id) => request('GET', `/api/teacher/students/${id}`),
  createUser: (u) => request('POST', '/api/teacher/users', u),
  deleteUser: (id) => request('DELETE', `/api/teacher/users/${id}`),
};
