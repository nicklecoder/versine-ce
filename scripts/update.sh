#!/usr/bin/env bash
#
# Bring the running instance up to date with the git remote, safely.
#
# Run at boot and on a timer. The whole thing is built around one priority:
# a kid sitting down to practise must find a working app. An update that
# cannot be done safely is an update that does not happen -- this script
# fails open, leaving the previous version serving, and says why.
#
# Order matters:
#   1. back up the database BEFORE any new code can migrate it
#   2. fast-forward only, and stash/reapply local edits around it, so a
#      deployer's own tweaks (a different port, whatever their box needs)
#      are never clobbered and never block an update
#   3. start the new version and prove it healthy
#   4. if it is not healthy, put the old version back -- local edits included
#
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# Per-machine settings live in .env, which docker compose reads for the port it
# publishes. Read the VERSINE_* knobs from the same file so the health check
# looks where the container actually listens. As with compose, a variable
# already set in the environment wins over the file.
if [ -f "$ROOT/.env" ]; then
  while IFS='=' read -r key value || [ -n "$key" ]; do
    case "$key" in VERSINE_*) ;; *) continue ;; esac
    value="${value%$'\r'}"; value="${value%\"}"; value="${value#\"}"
    [ -n "${!key+x}" ] || export "$key=$value"
  done < "$ROOT/.env"
fi

BRANCH="${VERSINE_BRANCH:-$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo master)}"
PORT="${VERSINE_PORT:-8000}"
HEALTH="http://127.0.0.1:${PORT}/api/health"
HEALTH_TIMEOUT="${VERSINE_HEALTH_TIMEOUT:-90}"
KEEP_BACKUPS="${VERSINE_KEEP_BACKUPS:-10}"
DB="$ROOT/data/progress.db"

# git does not track empty directories, so a fresh clone may not have one.
mkdir -p "$ROOT/data"

log() { printf '%s  %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }
die() { log "ERROR: $*"; exit 1; }

# ── One at a time ────────────────────────────────────────────────────────────
# Boot and the timer can fire together; two concurrent rebuilds on the same
# checkout would interleave badly.
exec 9>"$ROOT/.update.lock"
flock -n 9 || { log "another update is already running; nothing to do"; exit 0; }

compose() { docker compose "$@"; }

# The commit this run intends to serve, exported so that every compose call --
# including the exit trap's -- agrees on it. Compose treats a changed
# environment as a changed container and recreates it, which is what makes an
# update actually take effect: web/ and server/ are bind-mounted, so the files
# change on disk the moment we pull, but the running Python process has already
# imported them and will not notice until it is replaced.
export VERSINE_VERSION="$(git rev-parse --short=8 HEAD 2>/dev/null || echo dev)"

# ── Always end with something serving ────────────────────────────────────────
# Whatever happens below, the app comes up. If the update failed we would
# rather run yesterday's version than nothing at all.
ensure_running() {
  # Only step in when nothing is serving. Without this check the trap fires
  # after a successful update and recreates the container a second time,
  # costing another restart and overwriting the version stamp.
  if [ -n "$(compose ps --status running --quiet 2>/dev/null)" ]; then return; fi
  log "nothing is serving; starting the container"
  compose up -d >/dev/null 2>&1 || log "WARNING: could not start the container"
}
trap ensure_running EXIT

wait_healthy() {
  local deadline=$(( SECONDS + HEALTH_TIMEOUT ))
  while (( SECONDS < deadline )); do
    if curl -fsS --max-time 5 "$HEALTH" >/dev/null 2>&1; then return 0; fi
    sleep 2
  done
  return 1
}

# ── Library validity ─────────────────────────────────────────────────────────
# The problem libraries are the catalogue. Their rows are meant to be corrected
# by hand -- fixing a bad problem in place beats debugging the generator that
# produced it -- so this deliberately does not check that a library still
# matches its generator. A hand-fixed library is supposed to have diverged.
#
# What it does check is that every row is still usable, because a malformed one
# does not crash: it serves a student a broken problem, which is the kind of
# fault that runs for weeks unnoticed.
libraries_valid() {
  local checker="$ROOT/scripts/check-library.py"
  # A version predating the libraries is not invalid, just older.
  [ -f "$checker" ] || { log "no library checker in this version; skipping validation"; return 0; }
  python3 "$checker" 2>&1 | while IFS= read -r line; do log "  $line"; done
  [ "${PIPESTATUS[0]}" = "0" ] || return 1

  # And that the answers are right, not merely well-formed -- re-derived here
  # in Python, knowing nothing about the generators that produced them.
  local answers="$ROOT/scripts/check-answers.py"
  if [ -f "$answers" ]; then
    python3 "$answers" 2>&1 | while IFS= read -r line; do log "  $line"; done
    [ "${PIPESTATUS[0]}" = "0" ] || return 1
  fi

  # The server itself, against a throwaway database. Every check above is
  # about the problems; this one is about the records, and a version that
  # would mis-read a student's progress must not start. It skips itself if
  # the web framework is not installed for this interpreter, the same bargain
  # the JavaScript checks strike below.
  local server="$ROOT/scripts/check-server.py"
  if [ -f "$server" ]; then
    python3 "$server" 2>&1 | while IFS= read -r line; do log "  $line"; done
    [ "${PIPESTATUS[0]}" = "0" ] || return 1
  fi

  # And the API the browser app relies on, spoken to over HTTP the way the
  # browser speaks to it: real server processes on throwaway databases and
  # spare ports, never the live one. Skips itself on the same terms.
  local contract="$ROOT/scripts/check-contract.py"
  if [ -f "$contract" ]; then
    python3 "$contract" 2>&1 | while IFS= read -r line; do log "  $line"; done
    [ "${PIPESTATUS[0]}" = "0" ] || return 1
  fi

  # The catalogue's shape as well as its contents -- but only if node is here.
  # A server without a JavaScript runtime still gets the library check above,
  # which is the one that catches a broken problem reaching a student.
  # check-imports goes first: every browser module parses and every import it
  # makes resolves, the one fault that otherwise shows only as a blank page.
  if command -v node >/dev/null 2>&1; then
    for check in check-imports.mjs check-catalogue.mjs check-reveal.mjs check-parser.mjs check-session.mjs; do
      [ -f "$ROOT/scripts/$check" ] || continue
      node "$ROOT/scripts/$check" 2>&1 | while IFS= read -r line; do log "  $line"; done
      [ "${PIPESTATUS[0]}" = "0" ] || return 1
    done
  fi
  return 0
}

# ── 1. Back up the database ──────────────────────────────────────────────────
# Before anything else, and before any new code gets a chance to run its
# migrations. sqlite's own backup API rather than cp, because the database
# runs in WAL mode and copying the file alone can capture a torn state.
backup_db() {
  [ -f "$DB" ] || { log "no database yet; nothing to back up"; return 0; }
  # The commit being left behind goes in the name: seconds alone collide when
  # two updates land close together, and "which version made this" is exactly
  # what you want to know when reaching for a backup.
  local dest="$ROOT/data/progress.backup-$(date '+%Y%m%d-%H%M%S')-pre-${OLD_REV:0:8}.db"
  python3 - "$DB" "$dest" <<'PY' || return 1
import sqlite3, sys
src, dest = sys.argv[1], sys.argv[2]
s = sqlite3.connect(f"file:{src}?mode=ro", uri=True)
d = sqlite3.connect(dest)
with d:
    s.backup(d)
d.close(); s.close()
PY
  log "database backed up to $(basename "$dest")"
}

prune_backups() {
  local old
  old=$(ls -1t "$ROOT"/data/progress.backup-*.db 2>/dev/null | tail -n +$((KEEP_BACKUPS + 1)))
  [ -n "$old" ] || return 0
  echo "$old" | xargs -r rm -f
  log "pruned $(echo "$old" | wc -l) old backup(s), keeping $KEEP_BACKUPS"
}

# ── 2. Fetch, and decide whether there is anything to do ─────────────────────
if ! git remote get-url origin >/dev/null 2>&1; then
  log "no git remote configured; starting the current checkout unchanged"
  exit 0
fi

OLD_REV="$(git rev-parse HEAD 2>/dev/null)" || die "repository has no commits yet"

if ! git fetch --quiet origin "$BRANCH" 2>/dev/null; then
  log "could not reach the remote; starting the current version unchanged"
  exit 0
fi

NEW_REV="$(git rev-parse "origin/$BRANCH")"
if [ "$OLD_REV" = "$NEW_REV" ]; then
  log "already up to date at ${OLD_REV:0:8}"
  exit 0
fi

# Uncommitted work on the server is normal here, not a mistake: every
# deployer's box is different (ports already taken, whatever else), and this
# script is what runs on machines we've never seen. So local edits are
# stashed out of the way for the pull and reapplied on top rather than
# blocking the update -- see abort_to_old_rev() below.
# flock above guarantees this run never overlaps another, so at most one
# stash ever exists at a time and plain `git stash` (no ref) is unambiguous.
STASHED=0
if ! git diff --quiet || ! git diff --cached --quiet; then
  # Name them. Carried-forward edits are invisible once they work, and a
  # server left running for months accumulates divergence nobody remembers.
  # The journal should be able to answer "what is different about this box".
  log "stashing local changes before updating:"
  git diff --name-only HEAD | while IFS= read -r f; do log "    $f"; done
  git stash push -m "versine-update: local changes as of ${OLD_REV:0:8}" >/dev/null 2>&1 \
    && STASHED=1 \
    || die "could not stash local changes; refusing to update over them"
fi

# Puts the checkout back exactly as it was before this run touched anything:
# code at OLD_REV, local edits reapplied. Only ever called with HEAD reset to
# OLD_REV first, which is exactly the tree the stash was taken from, so the
# pop is guaranteed to apply cleanly.
abort_to_old_rev() {
  git reset --hard "$OLD_REV" >/dev/null 2>&1 || log "WARNING: could not reset to $OLD_REV"
  [ "$STASHED" = 1 ] || return 0
  git stash pop >/dev/null 2>&1 || log "WARNING: could not reapply local changes; see 'git stash list'"
}

log "updating ${OLD_REV:0:8} -> ${NEW_REV:0:8} on $BRANCH"

backup_db || { abort_to_old_rev; die "database backup failed; refusing to update"; }

# --ff-only: if the branches have diverged this stops rather than merging.
if ! git merge --ff-only "origin/$BRANCH" >/dev/null 2>&1; then
  log "cannot fast-forward (the branches have diverged); leaving the checkout alone"
  abort_to_old_rev
  exit 0
fi

# Reapply local changes on top of the new commit now, before anything below
# reads the files they touch (compose config, health-check port, ...).
# `apply`, not `pop`: the stash stays available as a way back to a clean
# OLD_REV if a later step fails, and is only dropped once the new version is
# confirmed healthy.
if [ "$STASHED" = 1 ] && ! git stash apply >/dev/null 2>&1; then
  log "local changes conflict with ${NEW_REV:0:8}; leaving the checkout on ${OLD_REV:0:8}"
  log "  resolve by hand with: git stash show -p"
  abort_to_old_rev
  exit 0
fi

# ── 3. Refuse a version whose problem libraries are broken ───────────────────
if ! libraries_valid; then
  log "the problem libraries in ${NEW_REV:0:8} are not valid"
  log "  refusing to deploy; staying on ${OLD_REV:0:8}"
  abort_to_old_rev
  exit 1
fi

# ── 4. Rebuild only when the image actually changed ──────────────────────────
# web/ and server/ are bind-mounted, so most updates need no rebuild at all --
# only a dependency or image change does.
BUILD_ARGS=()
if git diff --name-only "$OLD_REV" "$NEW_REV" | grep -qE '^(Dockerfile|requirements\.txt|docker-compose\.yml)$'; then
  log "image inputs changed; rebuilding"
  BUILD_ARGS=(--build)
fi

VERSINE_VERSION="${NEW_REV:0:8}"
compose up -d "${BUILD_ARGS[@]}" || log "compose failed to start the new version"

# ── 5. Prove it works, or put the old one back ───────────────────────────────
if wait_healthy; then
  log "healthy on ${NEW_REV:0:8}"
  if [ "$STASHED" = 1 ]; then
    git stash drop >/dev/null 2>&1 || log "WARNING: could not drop the local-changes stash"
  fi
  prune_backups
  exit 0
fi

log "new version did not become healthy within ${HEALTH_TIMEOUT}s; rolling back"
abort_to_old_rev
VERSINE_VERSION="${OLD_REV:0:8}"
compose up -d "${BUILD_ARGS[@]}" >/dev/null 2>&1

if wait_healthy; then
  log "rolled back to ${OLD_REV:0:8} and healthy again"
else
  log "ERROR: rolled back to ${OLD_REV:0:8} but it is still not healthy -- needs a look"
fi
exit 1
