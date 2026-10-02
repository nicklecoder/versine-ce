"""SQLite schema and access helpers.

Deliberately plain sqlite3 rather than an ORM: the schema is small, the
queries are the interesting part, and there is nothing here an ORM would
make clearer.
"""
from __future__ import annotations

import json
import os
import sqlite3
from contextlib import contextmanager
from contextvars import ContextVar
from datetime import date, datetime, timezone, tzinfo
from pathlib import Path
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

DB_PATH = Path(os.environ.get("VERSINE_DB", "data/progress.db"))

SCHEMA = """
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    role        TEXT NOT NULL CHECK (role IN ('student', 'teacher')),
    pin_hash    TEXT NOT NULL,
    pin_salt    TEXT NOT NULL,
    accent      TEXT NOT NULL DEFAULT '#35d6ff',
    icon        TEXT NOT NULL DEFAULT '🦊',
    xp          INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL
);

-- Highest level unlocked per skill, plus which levels were passed outright.
CREATE TABLE IF NOT EXISTS skill_progress (
    user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_id  TEXT    NOT NULL,
    level      INTEGER NOT NULL DEFAULT 0,
    mastered  TEXT    NOT NULL DEFAULT '[]',
    solved    INTEGER NOT NULL DEFAULT 0,
    level_count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, skill_id)
);

CREATE TABLE IF NOT EXISTS best_scores (
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_id    TEXT    NOT NULL,
    mode_id     TEXT    NOT NULL,
    level        INTEGER NOT NULL,
    points      INTEGER NOT NULL,
    achieved_at TEXT    NOT NULL,
    PRIMARY KEY (user_id, skill_id, mode_id)
);

-- One row per completed run.
CREATE TABLE IF NOT EXISTS runs (
    id          INTEGER PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_id    TEXT    NOT NULL,
    level        INTEGER NOT NULL,
    mode_id     TEXT    NOT NULL,
    points      INTEGER NOT NULL,
    solved      INTEGER NOT NULL,
    answered    INTEGER NOT NULL,
    misses      INTEGER NOT NULL,
    accuracy    REAL    NOT NULL,
    best_streak INTEGER NOT NULL,
    avg_seconds REAL    NOT NULL,
    passed      INTEGER NOT NULL DEFAULT 0,
    end_reason  TEXT,
    ended_at    TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_runs_user_time ON runs(user_id, ended_at DESC);

-- Append-only: one row per problem answered, ever. Nothing reads this yet
-- beyond the teacher console, but it is the only record that cannot be
-- reconstructed after the fact.
CREATE TABLE IF NOT EXISTS attempts (
    id        INTEGER PRIMARY KEY,
    run_id    INTEGER NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_id  TEXT    NOT NULL,
    level      INTEGER NOT NULL,
    prompt    TEXT    NOT NULL,
    expected  TEXT    NOT NULL,
    correct   INTEGER NOT NULL,
    ms        INTEGER NOT NULL,
    tags      TEXT    NOT NULL DEFAULT '[]',
    at        TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_attempts_user_skill ON attempts(user_id, skill_id);

-- The Time Trial clock, per student per level. Seeded from how fast they
-- practised, then nudged after every trial. Never hand-set.
CREATE TABLE IF NOT EXISTS level_clocks (
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_id   TEXT    NOT NULL,
    level      INTEGER NOT NULL,
    duration   INTEGER NOT NULL,
    runs       INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT    NOT NULL,
    PRIMARY KEY (user_id, skill_id, level)
);

CREATE TABLE IF NOT EXISTS auth_sessions (
    token      TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL
);

-- When each finished skill's review clock started. The only review state
-- stored: due dates, intervals and tags are replayed from runs (review.py).
CREATE TABLE IF NOT EXISTS review_clocks (
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_id   TEXT    NOT NULL,
    started_at TEXT    NOT NULL,
    PRIMARY KEY (user_id, skill_id)
);
"""


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


# ── Days ─────────────────────────────────────────────────────────────────────
# requiem: server/day-is-local
# Timestamps are stored in UTC, but a "day" is the student's own calendar day:
# done for the day, streaks and the streak strip all count local days. The
# browser names its time zone on every request (app.py sets it here); without
# one -- the checks, a script -- the server's own zone stands in.
#
# Every day computed anywhere goes through local_day(), registered into SQL as
# well, so a query and the Python around it can never disagree about the date.
DAY_ZONE: ContextVar[tzinfo | None] = ContextVar("day_zone", default=None)


def zone_named(name: str | None) -> tzinfo | None:
    """The zone an IANA name refers to, or None if it is missing or unknown."""
    if not name:
        return None
    try:
        return ZoneInfo(name)
    except (ZoneInfoNotFoundError, ValueError):
        return None


def day_zone() -> tzinfo:
    return DAY_ZONE.get() or datetime.now().astimezone().tzinfo


def local_day(ts: str | None) -> str | None:
    """The local calendar day ('YYYY-MM-DD') a stored UTC timestamp falls on."""
    if ts is None:
        return None
    moment = datetime.fromisoformat(ts)
    if moment.tzinfo is None:            # every row is written UTC by now()
        moment = moment.replace(tzinfo=timezone.utc)
    return moment.astimezone(day_zone()).date().isoformat()


def today() -> date:
    return datetime.now(day_zone()).date()


def connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.create_function("local_day", 1, local_day)
    return conn


@contextmanager
def cursor(commit: bool = False):
    conn = connect()
    try:
        yield conn
        if commit:
            conn.commit()
    finally:
        conn.close()


def ensure_column(conn: sqlite3.Connection, table: str, column: str, decl: str) -> None:
    """Add a column to an existing table if it isn't there yet.

    CREATE TABLE IF NOT EXISTS silently skips tables that already exist, so
    schema additions need this to reach databases created by older versions.
    """
    existing = {r["name"] for r in conn.execute(f"PRAGMA table_info({table})")}
    if column not in existing:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {decl}")


# ── The catalogue, as much of it as the server needs ─────────────────────────
# The catalogue is JavaScript and this is Python, so the server cannot read it.
# What it needs is only the order of each skill's levels, which the library
# build publishes into the manifest.
LIBRARY_DIR = Path(os.environ.get("VERSINE_LIBRARY", Path(__file__).parent.parent / "web" / "library"))


def level_order() -> dict[str, list[str]]:
    """{skill_id: [slug, ...]} in catalogue order, or empty if unavailable."""
    return _manifest().get("order", {})


def library_graph() -> dict[str, dict]:
    """{skill_id: {"dependsOn": [skill_id, ...], "levels": {slug: [skill_id, ...]}}}.

    What builds on what, for review scheduling; empty if unavailable.
    """
    return _manifest().get("graph", {})


def _manifest() -> dict:
    try:
        with open(LIBRARY_DIR / "manifest.json", encoding="utf-8") as fh:
            return json.load(fh)
    except (OSError, ValueError):
        return {}


def _backfill_slugs(conn: sqlite3.Connection, table: str) -> int:
    """Fill level_slug from the level index, once.

    Level identity used to be positional, which meant inserting a level into a
    skill silently reattributed a student's history to different levels. This
    converts what is already stored, and is safe to run repeatedly because it
    only touches rows whose slug is still NULL. It reads the order as it is
    *now*, which is correct precisely because every existing row was written
    against that same order -- so this migration has to happen before any level
    is ever inserted, not after.
    """
    order = level_order()
    if not order:
        return 0
    filled = 0
    for skill_id, slugs in order.items():
        for index, slug in enumerate(slugs):
            cur = conn.execute(
                f"UPDATE {table} SET level_slug=? "
                f"WHERE skill_id=? AND level=? AND level_slug IS NULL",
                (slug, skill_id, index),
            )
            filled += cur.rowcount
    return filled


def init_db() -> None:
    with cursor(commit=True) as conn:
        conn.executescript(SCHEMA)
        ensure_column(conn, "users", "icon", "TEXT NOT NULL DEFAULT '🦊'")
        ensure_column(conn, "skill_progress", "level_count", "INTEGER NOT NULL DEFAULT 0")

        # Level identity by slug rather than position.
        for table in ("skill_progress", "best_scores", "runs", "attempts", "level_clocks"):
            ensure_column(conn, table, "level_slug", "TEXT")
            _backfill_slugs(conn, table)
        ensure_column(conn, "skill_progress", "mastered_slugs", "TEXT NOT NULL DEFAULT '[]'")
        _backfill_mastered(conn)

        # Skills finished before review existed get a clock from today, after
        # the slugs above are in place, since finished is read from them.
        import review                                 # review imports db
        review.start_clocks(conn)


def _backfill_mastered(conn: sqlite3.Connection) -> None:
    """Convert each mastered index list into a list of slugs, once."""
    order = level_order()
    if not order:
        return
    rows = conn.execute(
        "SELECT user_id, skill_id, mastered, mastered_slugs FROM skill_progress"
    ).fetchall()
    for row in rows:
        if row["mastered_slugs"] not in (None, "", "[]"):
            continue
        slugs = order.get(row["skill_id"], [])
        try:
            indices = json.loads(row["mastered"] or "[]")
        except ValueError:
            indices = []
        converted = [slugs[i] for i in indices if 0 <= i < len(slugs)]
        conn.execute(
            "UPDATE skill_progress SET mastered_slugs=? WHERE user_id=? AND skill_id=?",
            (json.dumps(converted), row["user_id"], row["skill_id"]),
        )


def row_to_dict(row: sqlite3.Row | None) -> dict | None:
    return dict(row) if row is not None else None


def done_today(conn: sqlite3.Connection, user_id: int) -> set[str]:
    """Skills finished for the day.

    A skill counts as done only once its last level -- the mixed review that draws on
    every earlier level -- has been cleared in a Time Trial today. Practising
    an easy level all afternoon does not tick the box.
    """
    rows = conn.execute(
        """SELECT DISTINCT r.skill_id
           FROM runs r JOIN skill_progress p
             ON p.user_id = r.user_id AND p.skill_id = r.skill_id
           WHERE r.user_id = ? AND r.mode_id = 'trial' AND r.passed = 1
             AND p.level_count > 0 AND r.level = p.level_count - 1
             AND local_day(r.ended_at) = ?""",
        (user_id, today().isoformat()),
    )
    return {r["skill_id"] for r in rows}


def get_clocks(conn: sqlite3.Connection, user_id: int) -> dict:
    """Personal Time Trial clocks, keyed "skill:level"."""
    return {
        f"{r['skill_id']}:{r['level']}": {"duration": r["duration"], "runs": r["runs"]}
        for r in conn.execute(
            "SELECT skill_id, level, duration, runs FROM level_clocks WHERE user_id = ?",
            (user_id,),
        )
    }


def get_progress(conn: sqlite3.Connection, user_id: int) -> dict:
    """Everything the client needs to draw the map for one user.

    Positions are re-derived from slugs on the way out, every time.

    A level index is only meaningful against the version of the catalogue that
    produced it, which is why `mastered_slugs` and `level_slug` exist -- but
    the index columns were being served as stored, so inserting a level into a
    skill silently reattributed a student's history. A real record read
    [0,1,2,3,4,5] against a skill that had since grown a level in the middle:
    it credited them with a level they had never opened and dropped the one
    they had actually finished. The slugs were right the whole time and nobody
    was reading them.

    The index columns are now a cache of the last write, and the slugs are the
    record. Anything that has to be true across a catalogue change reads this.
    """
    finished = done_today(conn, user_id)
    order = level_order()
    skills: dict[str, dict] = {}
    for r in conn.execute(
        "SELECT skill_id, level, level_slug, mastered, mastered_slugs, solved, level_count "
        "FROM skill_progress WHERE user_id = ?",
        (user_id,),
    ):
        slugs = json.loads(r["mastered_slugs"] or "[]")
        ids = order.get(r["skill_id"], [])
        mastered = (sorted(ids.index(s) for s in slugs if s in ids)
                    if ids and slugs else json.loads(r["mastered"]))
        # The furthest level opened. A level inserted *behind* where a student
        # had already reached stays open to them, which is the point of
        # keeping this as a high-water mark rather than a count.
        level = ids.index(r["level_slug"]) if ids and r["level_slug"] in ids else r["level"]
        if mastered:
            level = max(level, max(mastered))
        skills[r["skill_id"]] = {
            "level": level,
            "mastered": mastered,
            "solved": r["solved"],
            "levelCount": r["level_count"],
            "doneToday": r["skill_id"] in finished,
            "best": {},
        }

    for r in conn.execute(
        "SELECT skill_id, mode_id, points FROM best_scores WHERE user_id = ?", (user_id,)
    ):
        skills.setdefault(
            r["skill_id"],
            {"level": 0, "mastered": [], "solved": 0, "levelCount": 0,
             "doneToday": False, "best": {}},
        )["best"][r["mode_id"]] = r["points"]

    # requiem: review/skill-review-schedule
    # Every finished skill carries its review state; anything else, None.
    import review                                     # review imports db
    reviews = review.schedule(conn, user_id)
    for skill_id, entry in skills.items():
        entry["review"] = reviews[skill_id].public() if skill_id in reviews else None

    xp = conn.execute("SELECT xp FROM users WHERE id = ?", (user_id,)).fetchone()["xp"]
    return {"xp": xp, "skills": skills, "reviewOffer": review.offer(reviews)}
