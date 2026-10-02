"""Versine API.

One household, a handful of accounts, two roles. Everything is scoped to the
logged-in user except the teacher endpoints, which can read every student.
"""
from __future__ import annotations

import json
import os
import sqlite3
import statistics
from datetime import date, timedelta
from pathlib import Path

from contextlib import asynccontextmanager

from fastapi import Cookie, Depends, FastAPI, HTTPException, Response
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

import auth
import db
import review

WEB_DIR = Path(__file__).resolve().parent.parent / "web"
COOKIE = "vs_session"

# Mirrors web/ui/icons.js. Validated server-side as an allowlist so a profile
# icon can never become an injection vector.
ICONS = [
    "🦊", "🐺", "🦉", "🐙", "🦅", "🐝",
    "🦖", "🐬", "🦁", "🐼", "🦈", "🐉",
    "🚀", "⚡", "🔥", "🌙", "⭐", "🎯",
]
ACCENTS = ["#ff5f6d", "#35d6ff", "#ffd93d", "#4ade80", "#c084fc", "#ff9f45"]

# A home LAN, but anyone on it can make a profile -- so put a ceiling on it.
MAX_USERS = 20

@asynccontextmanager
async def lifespan(_: FastAPI):
    db.init_db()
    yield


app = FastAPI(title="Versine", docs_url=None, redoc_url=None, lifespan=lifespan)


# requiem: server/day-is-local
# The browser names its IANA time zone on every request; every day the server
# works out during that request is a day in that zone. A missing or unknown
# name falls back to the server's own zone rather than failing the request.
ZONE_HEADER = b"x-versine-time-zone"


class DayZoneMiddleware:
    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.inner(scope, receive, send)
        name = dict(scope["headers"]).get(ZONE_HEADER, b"").decode("latin-1")
        token = db.DAY_ZONE.set(db.zone_named(name))
        try:
            await self.inner(scope, receive, send)
        finally:
            db.DAY_ZONE.reset(token)


app.add_middleware(DayZoneMiddleware)


# ── Auth plumbing ────────────────────────────────────────────────────────────
def current_user(vs_session: str | None = Cookie(default=None)):
    with db.cursor() as conn:
        user = auth.user_for_token(conn, vs_session)
    if user is None:
        raise HTTPException(401, "Not signed in")
    return dict(user)


def current_teacher(user=Depends(current_user)):
    if user["role"] != "teacher":
        raise HTTPException(403, "Teachers only")
    return user


# ── Health ───────────────────────────────────────────────────────────────────
@app.get("/api/health")
def health():
    """
    Unauthenticated, cheap, and it touches the database on purpose.

    The auto-update path uses this to decide whether a freshly pulled version
    is actually serving before it commits to it. A check that only proved the
    process was listening would happily bless a build whose migrations blew up,
    which is the failure that matters.
    """
    try:
        with db.cursor() as conn:
            users = conn.execute("SELECT COUNT(*) AS n FROM users").fetchone()["n"]
    except Exception as exc:  # noqa: BLE001 - the reason is the useful part
        raise HTTPException(503, f"Database unavailable: {exc}") from exc
    return {"ok": True, "users": users, "version": os.environ.get("VERSINE_VERSION", "dev")}


def public_user(row) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "role": row["role"],
        "accent": row["accent"],
        "icon": row["icon"],
    }


# ── Models ───────────────────────────────────────────────────────────────────
class SetupIn(BaseModel):
    name: str = Field(min_length=1, max_length=16)
    pin: str
    icon: str = ICONS[0]
    accent: str = ACCENTS[4]


class NewProfileIn(BaseModel):
    """Self-serve signup. Always creates a student."""
    name: str = Field(min_length=1, max_length=16)
    pin: str
    icon: str
    accent: str


class LoginIn(BaseModel):
    user_id: int
    pin: str


class NewUserIn(BaseModel):
    name: str = Field(min_length=1, max_length=16)
    pin: str
    role: str = "teacher"
    icon: str = ICONS[0]
    accent: str = ACCENTS[4]


class AttemptIn(BaseModel):
    prompt: str
    expected: str
    correct: bool
    ms: int


class SummaryIn(BaseModel):
    solved: int
    cleanSolved: int
    answered: int
    misses: int
    accuracy: float
    bestStreak: int
    points: int
    avgSeconds: float
    passed: bool = False
    endReason: str | None = None
    target: int | None = None        # correct answers the trial demanded
    timeLeft: int | None = None      # seconds still on the clock at the end


class RunIn(BaseModel):
    skill_id: str
    level: int
    # The level's identity. `level` is its position, which is only meaningful
    # against a particular version of the catalogue; the slug survives levels
    # being inserted above it. Optional so an older client still submits.
    level_slug: str | None = None
    duration: int = 0            # the clock this run actually used, in seconds
    level_count: int = 0          # how many levels, so the last one can be identified
    mode_id: str
    summary: SummaryIn
    attempts: list[AttemptIn] = []
    # Where the run was started from, if from a review prompt (review.ORIGINS).
    # Anything else is stored as nothing rather than refused: it is a measure,
    # and an older or newer client must never lose a run over it.
    origin: str | None = None


# ── Session / identity ───────────────────────────────────────────────────────
@app.get("/api/bootstrap")
def bootstrap(vs_session: str | None = Cookie(default=None)):
    with db.cursor() as conn:
        users = conn.execute(
            "SELECT * FROM users ORDER BY role DESC, name"
        ).fetchall()
        me = auth.user_for_token(conn, vs_session)
        return {
            "needs_setup": len(users) == 0,
            "users": [public_user(u) for u in users],
            "me": public_user(me) if me else None,
        }


@app.post("/api/setup")
def setup(body: SetupIn, response: Response):
    """First run only: create the teacher account."""
    validate_new_user(body.pin, body.icon, body.accent)
    with db.cursor(commit=True) as conn:
        if conn.execute("SELECT COUNT(*) c FROM users").fetchone()["c"]:
            raise HTTPException(409, "Already set up")
        user = insert_user(conn, name=body.name, pin=body.pin, role="teacher",
                           icon=body.icon, accent=body.accent)
        token = auth.create_session(conn, user["id"])
    set_cookie(response, token)
    return {"me": public_user(user)}


#: How the Time Trial clock reacts to a result. Asymmetric on purpose: relief
#: arrives faster than pressure, so a struggling student is helped quickly
#: while a strong one is squeezed gently.
CLOCK = {
    "loosen": 1.15,      # failed: give 15% more time next attempt
    "tighten": 0.90,     # finished with room to spare: take 10% away
    "spare": 0.20,       # "room to spare" means this much clock left unused
    "min_pace": 3,       # never demand faster than 3s per problem
    "max_pace": 40,      # never allow slower than 40s per problem
    "step": 5,           # clocks are shown to the second; keep them tidy
}


def adapt_clock(duration: int, target: int, passed: bool, time_left: int | None) -> int:
    """The next clock for this student on this level.

    Three outcomes, one signal each:
      * ran out of time      -> loosen
      * finished comfortably -> tighten
      * finished narrowly    -> leave it, this is the right level of hard
    """
    if not passed:
        nxt = duration * CLOCK["loosen"]
    else:
        margin = (time_left or 0) / max(duration, 1)
        nxt = duration * CLOCK["tighten"] if margin > CLOCK["spare"] else duration

    # Round to a tidy value first, then clamp -- clamping first lets the
    # rounding step slip back past the bound.
    step = CLOCK["step"]
    low = -(-target * CLOCK["min_pace"] // step) * step     # ceil to a step
    high = (target * CLOCK["max_pace"] // step) * step      # floor to a step
    nxt = round(nxt / step) * step
    return int(max(low, min(high, nxt)))


def validate_new_user(pin: str, icon: str, accent: str) -> None:
    if not auth.valid_pin_format(pin):
        raise HTTPException(400, "PIN must be 4 digits")
    if icon not in ICONS:
        raise HTTPException(400, "Pick one of the offered icons")
    if accent not in ACCENTS:
        raise HTTPException(400, "Pick one of the offered colours")


def insert_user(conn, *, name: str, pin: str, role: str, icon: str, accent: str):
    pin_hash, salt = auth.hash_pin(pin)
    try:
        cur = conn.execute(
            """INSERT INTO users (name, role, pin_hash, pin_salt, icon, accent, created_at)
               VALUES (?,?,?,?,?,?,?)""",
            (name.strip(), role, pin_hash, salt, icon, accent, db.now()),
        )
    except sqlite3.IntegrityError:
        raise HTTPException(409, "That name is taken")
    return conn.execute("SELECT * FROM users WHERE id = ?", (cur.lastrowid,)).fetchone()


def set_cookie(response: Response, token: str) -> None:
    # No `secure` flag: this is served over plain HTTP on a home LAN.
    response.set_cookie(
        COOKIE, token, httponly=True, samesite="lax", max_age=60 * 60 * 24 * 365
    )


@app.post("/api/profiles")
def create_profile(body: NewProfileIn, response: Response):
    """Anyone at the login screen can make themselves a student profile.

    No auth: a kid shouldn't have to find a parent to start practising. Only
    students can be created this way, so nobody can grant themselves the
    teacher role (and with it the power to delete other people's accounts).
    """
    validate_new_user(body.pin, body.icon, body.accent)
    with db.cursor(commit=True) as conn:
        if conn.execute("SELECT COUNT(*) c FROM users").fetchone()["c"] >= MAX_USERS:
            raise HTTPException(409, "This server is full")
        user = insert_user(conn, name=body.name, pin=body.pin, role="student",
                           icon=body.icon, accent=body.accent)
        token = auth.create_session(conn, user["id"])
    set_cookie(response, token)
    return {"me": public_user(user)}


@app.post("/api/login")
def login(body: LoginIn, response: Response):
    locked = auth.seconds_locked_out(body.user_id)
    if locked:
        raise HTTPException(429, f"Too many tries. Wait {locked}s.")

    with db.cursor(commit=True) as conn:
        user = conn.execute("SELECT * FROM users WHERE id = ?", (body.user_id,)).fetchone()
        if user is None or not auth.verify_pin(body.pin, user["pin_hash"], user["pin_salt"]):
            auth.record_failure(body.user_id)
            raise HTTPException(401, "Wrong PIN")
        auth.clear_failures(body.user_id)
        token = auth.create_session(conn, user["id"])
    set_cookie(response, token)
    return {"me": public_user(user)}


@app.post("/api/logout")
def logout(response: Response, vs_session: str | None = Cookie(default=None)):
    with db.cursor(commit=True) as conn:
        auth.destroy_session(conn, vs_session)
    response.delete_cookie(COOKIE)
    return {"ok": True}


# ── Progress ─────────────────────────────────────────────────────────────────
@app.get("/api/progress")
def progress(user=Depends(current_user)):
    """Progress plus the per-level pace/accuracy the client needs for Level."""
    with db.cursor() as conn:
        data = db.get_progress(conn, user["id"])
        data["levels"] = level_stats(conn, user["id"])
        data["clocks"] = db.get_clocks(conn, user["id"])
    return data


@app.post("/api/runs")
def submit_run(body: RunIn, user=Depends(current_user)):
    """Record a finished run and apply its consequences (XP, bests, unlocks)."""
    s = body.summary

    # The client is trusted to score itself, but not blindly: cap the award at
    # a generous per-problem ceiling so a devtools console can't mint a
    # leaderboard. Not security, just a speed bump against casual cheating.
    ceiling = max(s.answered, 1) * 800
    points = max(0, min(s.points, ceiling))
    mode_is_trial = body.mode_id == "trial"
    # Fall back to the catalogue order when an older client sends no slug.
    slug = body.level_slug
    if slug is None:
        order = db.level_order().get(body.skill_id, [])
        slug = order[body.level] if 0 <= body.level < len(order) else None

    with db.cursor(commit=True) as conn:
        cur = conn.execute(
            """INSERT INTO runs (user_id, skill_id, level, level_slug, mode_id, points, solved,
                                 answered, misses, accuracy, best_streak, avg_seconds,
                                 passed, end_reason, ended_at, origin)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (user["id"], body.skill_id, body.level, slug, body.mode_id, points, s.solved,
             s.answered, s.misses, s.accuracy, s.bestStreak, s.avgSeconds,
             int(s.passed), s.endReason, db.now(),
             body.origin if body.origin in review.ORIGINS else None),
        )
        run_id = cur.lastrowid

        conn.executemany(
            """INSERT INTO attempts (run_id, user_id, skill_id, level, level_slug, prompt,
                                     expected, correct, ms, at)
               VALUES (?,?,?,?,?,?,?,?,?,?)""",
            [(run_id, user["id"], body.skill_id, body.level, slug, a.prompt, a.expected,
              int(a.correct), a.ms, db.now())
             for a in body.attempts],
        )

        conn.execute(
            """INSERT INTO skill_progress (user_id, skill_id, solved, level_count)
               VALUES (?, ?, ?, ?)
               ON CONFLICT(user_id, skill_id)
               DO UPDATE SET solved = solved + excluded.solved,
                             level_count = MAX(skill_progress.level_count, excluded.level_count)""",
            (user["id"], body.skill_id, s.solved, body.level_count),
        )

        # Personal best for this skill+mode?
        prev = conn.execute(
            "SELECT points FROM best_scores WHERE user_id=? AND skill_id=? AND mode_id=?",
            (user["id"], body.skill_id, body.mode_id),
        ).fetchone()
        new_best = points > (prev["points"] if prev else 0)
        if new_best:
            conn.execute(
                """INSERT INTO best_scores (user_id, skill_id, mode_id, level, level_slug,
                                           points, achieved_at)
                   VALUES (?,?,?,?,?,?,?)
                   ON CONFLICT(user_id, skill_id, mode_id)
                   DO UPDATE SET points=excluded.points, level=excluded.level,
                                 level_slug=excluded.level_slug,
                                 achieved_at=excluded.achieved_at""",
                (user["id"], body.skill_id, body.mode_id, body.level, slug, points, db.now()),
            )

        # A passed Mastery Check unlocks the next level.
        #
        # Which level is "next" comes from the catalogue order published in the
        # library manifest, not from adding one to an index: an index is only
        # meaningful against the version of the catalogue that produced it.
        unlocked = None
        if s.passed:
            row = conn.execute(
                "SELECT level, level_slug, mastered, mastered_slugs FROM skill_progress "
                "WHERE user_id=? AND skill_id=?",
                (user["id"], body.skill_id),
            ).fetchone()
            order = db.level_order().get(body.skill_id, [])
            mastered = sorted(set(json.loads(row["mastered"]) + [body.level]))
            mastered_slugs = json.loads(row["mastered_slugs"] or "[]")
            if slug and slug not in mastered_slugs:
                mastered_slugs.append(slug)
            # Keep the list in catalogue order, so it reads the way the map does.
            if order:
                mastered_slugs = [x for x in order if x in set(mastered_slugs)]

            level = row["level"]
            at_slug = row["level_slug"]
            last = (body.level_count - 1) if body.level_count else body.level
            if level == body.level and level < last:
                level += 1
                unlocked = level
            next_slug = at_slug
            if order and slug and at_slug == slug:
                here = order.index(slug) if slug in order else -1
                if 0 <= here < len(order) - 1:
                    next_slug = order[here + 1]
            elif at_slug is None:
                next_slug = order[level] if 0 <= level < len(order) else None

            conn.execute(
                "UPDATE skill_progress SET level=?, level_slug=?, mastered=?, mastered_slugs=? "
                "WHERE user_id=? AND skill_id=?",
                (level, next_slug, json.dumps(mastered), json.dumps(mastered_slugs),
                 user["id"], body.skill_id),
            )

        # requiem: review/skill-review-schedule
        # If that run finished the skill, its review clock starts now.
        review.start_clocks(conn, user["id"])

        # Adapt the clock from what just happened, before reading progress back.
        next_clock = None
        at_floor = False
        if mode_is_trial and body.duration > 0:
            target = s.target or 1
            next_clock = adapt_clock(body.duration, target, bool(s.passed), s.timeLeft)
            step = CLOCK["step"]
            clock_floor = -(-target * CLOCK["min_pace"] // step) * step
            at_floor = next_clock <= clock_floor
            conn.execute(
                """INSERT INTO level_clocks (user_id, skill_id, level, level_slug,
                                            duration, runs, updated_at)
                   VALUES (?,?,?,?,?,1,?)
                   ON CONFLICT(user_id, skill_id, level) DO UPDATE SET
                     level_slug = excluded.level_slug,
                     duration = excluded.duration,
                     runs = level_clocks.runs + 1,
                     updated_at = excluded.updated_at""",
                (user["id"], body.skill_id, body.level, slug, next_clock, db.now()),
            )

        data = db.get_progress(conn, user["id"])
        data["levels"] = level_stats(conn, user["id"])
        data["clocks"] = db.get_clocks(conn, user["id"])

    return {"newBest": new_best, "unlockedLevel": unlocked, "points": points,
            "clockWas": body.duration or None, "clockNext": next_clock,
            "clockAtFloor": bool(at_floor) if mode_is_trial and body.duration > 0 else False,
            "progress": data}


def streak_from_days(days: list[str]) -> tuple[int, int]:
    """Current and best run of consecutive practice days.

    The current streak counts only if the most recent day is today or
    yesterday -- otherwise you'd still be shown a streak you already broke.
    """
    if not days:
        return 0, 0
    dates = sorted({date.fromisoformat(d) for d in days})

    best = run = 1
    for prev, cur in zip(dates, dates[1:]):
        run = run + 1 if (cur - prev).days == 1 else 1
        best = max(best, run)

    today = db.today()
    if (today - dates[-1]).days > 1:
        return 0, best

    current = 1
    for prev, cur in zip(reversed(dates[:-1]), reversed(dates[1:])):
        if (cur - prev).days != 1:
            break
        current += 1
    return current, best


@app.get("/api/activity")
def activity(skill_id: str, user=Depends(current_user)):
    """Per-day history for one skill, for the streak strip.

    Two different things are tracked per day, and the difference matters:
    *practised* means any attempt at all, *completed* means the last level
    was cleared in a Time Trial. The streak counts completed days only -- that
    is what "done for the day" means for a skill.
    """
    with db.cursor() as conn:
        row = conn.execute(
            "SELECT level_count FROM skill_progress WHERE user_id = ? AND skill_id = ?",
            (user["id"], skill_id),
        ).fetchone()
        level_count = row["level_count"] if row else 0
        cutoff = (db.today() - timedelta(days=27)).isoformat()

        recent = [dict(r) for r in conn.execute(
            """SELECT local_day(at) day, COUNT(*) attempts, SUM(correct) correct
               FROM attempts
               WHERE user_id = ? AND skill_id = ? AND local_day(at) >= ?
               GROUP BY day ORDER BY day""",
            (user["id"], skill_id, cutoff),
        )]

        completed = [r["day"] for r in conn.execute(
            """SELECT DISTINCT local_day(ended_at) day FROM runs
               WHERE user_id = ? AND skill_id = ? AND mode_id = 'trial'
                 AND passed = 1 AND ? > 0 AND level = ? - 1""",
            (user["id"], skill_id, level_count, level_count),
        )]

        practised = [r["day"] for r in conn.execute(
            "SELECT DISTINCT local_day(at) day FROM attempts WHERE user_id = ? AND skill_id = ?",
            (user["id"], skill_id),
        )]

        levels_cleared = [dict(r) for r in conn.execute(
            """SELECT local_day(ended_at) day, MAX(level) level FROM runs
               WHERE user_id = ? AND skill_id = ? AND passed = 1
               GROUP BY day ORDER BY day DESC LIMIT 5""",
            (user["id"], skill_id),
        )]

    done = set(completed)
    for d in recent:
        d["completed"] = d["day"] in done

    # A cleared day must show even if no attempt rows landed on it -- the two
    # come from different tables, and the strip should never contradict the
    # streak count sitting right above it.
    seen = {d["day"] for d in recent}
    for day in sorted(done - seen):
        if day >= cutoff:
            recent.append({"day": day, "attempts": 0, "correct": 0, "completed": True})
    recent.sort(key=lambda d: d["day"])

    current, best = streak_from_days(completed)
    today = db.today().isoformat()
    return {
        "days": recent,
        "currentStreak": current,
        "bestStreak": best,
        "practiceDays": len(practised),
        "completedDays": len(completed),
        "doneToday": today in done,
        "levelCount": level_count,
        "levelsCleared": levels_cleared,
    }


@app.get("/api/leaderboard")
def leaderboard(skill_id: str, mode_id: str = "sprint", _=Depends(current_user)):
    with db.cursor() as conn:
        rows = conn.execute(
            """SELECT u.name, u.accent, b.points, b.level
               FROM best_scores b JOIN users u ON u.id = b.user_id
               WHERE b.skill_id = ? AND b.mode_id = ? AND u.role = 'student'
               ORDER BY b.points DESC""",
            (skill_id, mode_id),
        ).fetchall()
    return [dict(r) for r in rows]


# ── Teacher console ──────────────────────────────────────────────────────────
@app.get("/api/teacher/overview")
def teacher_overview(_=Depends(current_teacher)):
    with db.cursor() as conn:
        students = conn.execute(
            "SELECT * FROM users WHERE role='student' ORDER BY name"
        ).fetchall()
        out = []
        for st in students:
            totals = conn.execute(
                """SELECT COUNT(*) attempts, SUM(correct) correct,
                          AVG(ms) avg_ms, MAX(at) last_at
                   FROM attempts WHERE user_id = ?""",
                (st["id"],),
            ).fetchone()
            week = conn.execute(
                """SELECT COUNT(*) c FROM attempts
                   WHERE user_id = ? AND at >= datetime('now', '-7 days')""",
                (st["id"],),
            ).fetchone()["c"]
            info = public_user(st)
            health = review.health(conn, st["id"])
            info |= {
                "reviewsDue": health["due"],
                "reviews30d": health["reviews"],
                "attempts": totals["attempts"] or 0,
                "correct": totals["correct"] or 0,
                "accuracy": (totals["correct"] or 0) / (totals["attempts"] or 1),
                "avgSeconds": (totals["avg_ms"] or 0) / 1000,
                "lastActive": totals["last_at"],
                "attemptsThisWeek": week,
            }
            out.append(info)
    return out


def percentile(values: list[int], q: float) -> int:
    """Nearest-rank percentile. Small samples, so no interpolation needed."""
    if not values:
        return 0
    ordered = sorted(values)
    idx = min(int(q * len(ordered)), len(ordered) - 1)
    return ordered[idx]


#: How many recent answers define "what they can currently do". Deliberately a
#: count, not a time window: a level nobody has touched for months keeps its
#: last demonstrated standard rather than decaying to zero on the calendar.
RECENT_WINDOW = 40


def level_stats(conn, user_id: int) -> list[dict]:
    """Pace and accuracy per (skill, level), with a day-by-day trend.

    Headline `accuracy` and `medianSeconds` describe the **last
    RECENT_WINDOW answers** at that level, because Level is meant to reflect
    what a student can do now, not an average dragged around by how they
    performed six months ago. Lifetime figures are reported alongside.

      * accuracy = share of *answers* that were right. Every attempt is
        logged, so answering wrong twice then right counts 1 of 3.
      * pace = median milliseconds on *correct* answers. Median, not mean:
        one interrupted problem produces a 400-second outlier that would
        drag an average into nonsense.
    """
    # `id DESC` as the tiebreaker, not decoration: `at` is stored to the
    # second and every attempt in a run is written in the same one, so
    # ordering by it alone leaves "the most recent forty answers" undefined
    # -- sqlite is free to hand back the oldest. A student who had a bad run
    # and then a long clean one could have their headline accuracy computed
    # from the bad half. The id is insertion order and settles it exactly.
    rows = conn.execute(
        """SELECT skill_id, level, correct, ms, local_day(at) day
           FROM attempts WHERE user_id = ?
           ORDER BY at DESC, id DESC LIMIT 20000""",
        (user_id,),
    ).fetchall()

    buckets: dict[tuple, dict] = {}
    for r in rows:
        key = (r["skill_id"], r["level"])
        b = buckets.setdefault(key, {
            "skill_id": r["skill_id"], "level": r["level"],
            "attempts": 0, "correct": 0, "times": [], "days": {},
            "recent": [], "recent_times": [],
            "first": r["day"], "last": r["day"],
        })
        b["attempts"] += 1
        b["correct"] += r["correct"]
        if r["correct"]:
            b["times"].append(r["ms"])

        # rows arrive newest-first, so the first ones seen are the recent ones
        if len(b["recent"]) < RECENT_WINDOW:
            b["recent"].append(r["correct"])
            if r["correct"]:
                b["recent_times"].append(r["ms"])

        d = b["days"].setdefault(r["day"], {"day": r["day"], "attempts": 0, "correct": 0, "times": []})
        d["attempts"] += 1
        d["correct"] += r["correct"]
        if r["correct"]:
            d["times"].append(r["ms"])

        # rows arrive newest-first
        b["first"] = min(b["first"], r["day"])
        b["last"] = max(b["last"], r["day"])

    out = []
    for b in buckets.values():
        times = b["times"]
        trend = []
        for d in sorted(b["days"].values(), key=lambda x: x["day"])[-30:]:
            trend.append({
                "day": d["day"],
                "attempts": d["attempts"],
                "accuracy": d["correct"] / d["attempts"],
                "medianSeconds": (statistics.median(d["times"]) / 1000) if d["times"] else None,
            })

        recent = b["recent"]
        recent_times = b["recent_times"]
        out.append({
            "skillId": b["skill_id"],
            "level": b["level"],
            "attempts": b["attempts"],
            "correct": b["correct"],
            # headline figures describe the most recent answers
            "accuracy": (sum(recent) / len(recent)) if recent else 0.0,
            "medianSeconds": (statistics.median(recent_times) / 1000) if recent_times else None,
            "sampleSize": len(recent),
            # lifetime, for the dashboard
            "lifetimeAccuracy": b["correct"] / b["attempts"],
            "fastSeconds": percentile(times, 0.25) / 1000 if times else None,
            "slowSeconds": percentile(times, 0.75) / 1000 if times else None,
            "firstSeen": b["first"],
            "lastSeen": b["last"],
            "trend": trend,
        })

    out.sort(key=lambda x: (x["skillId"], x["level"]))
    return out


@app.get("/api/teacher/students/{student_id}")
def teacher_student(student_id: int, _=Depends(current_teacher)):
    with db.cursor() as conn:
        user = conn.execute("SELECT * FROM users WHERE id=?", (student_id,)).fetchone()
        if user is None:
            raise HTTPException(404, "No such student")

        by_skill = [dict(r) for r in conn.execute(
            """SELECT skill_id, level, COUNT(*) attempts, SUM(correct) correct,
                      AVG(ms) avg_ms
               FROM attempts WHERE user_id = ?
               GROUP BY skill_id, level ORDER BY skill_id, level""",
            (student_id,),
        )]

        # `id DESC` breaks ties for the same reason level_stats needs it:
        # ended_at is stored to the second, so runs ending together would
        # otherwise come back in whatever order sqlite likes.
        runs = [dict(r) for r in conn.execute(
            """SELECT skill_id, level, mode_id, points, solved, answered, accuracy,
                      passed, ended_at
               FROM runs WHERE user_id = ? ORDER BY ended_at DESC, id DESC LIMIT 20""",
            (student_id,),
        )]


        daily = [dict(r) for r in conn.execute(
            """SELECT local_day(at) day, COUNT(*) attempts, SUM(correct) correct
               FROM attempts WHERE user_id = ? AND at >= datetime('now', '-30 days')
               GROUP BY day ORDER BY day""",
            (student_id,),
        )]

        progress = db.get_progress(conn, student_id)
        levels = level_stats(conn, student_id)
        clocks = db.get_clocks(conn, student_id)
        review_health = review.health(conn, student_id)

    return {"student": public_user(user), "bySkill": by_skill, "runs": runs,
            "daily": daily, "progress": progress,
            "levels": levels, "clocks": clocks, "reviewHealth": review_health}


@app.post("/api/teacher/users")
def create_user(body: NewUserIn, _=Depends(current_teacher)):
    """Students sign themselves up; this exists to add a second teacher."""
    validate_new_user(body.pin, body.icon, body.accent)
    if body.role not in ("student", "teacher"):
        raise HTTPException(400, "Bad role")
    with db.cursor(commit=True) as conn:
        user = insert_user(conn, name=body.name, pin=body.pin, role=body.role,
                           icon=body.icon, accent=body.accent)
    return public_user(user)


@app.delete("/api/teacher/users/{user_id}")
def delete_user(user_id: int, teacher=Depends(current_teacher)):
    if user_id == teacher["id"]:
        raise HTTPException(400, "You can't delete yourself")
    with db.cursor(commit=True) as conn:
        conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
    return {"ok": True}


# ── Static app (must be mounted last so /api/* wins) ─────────────────────────
# requiem: server/static-always-revalidated
# Every file of the app is served "no-cache": the browser keeps its copy but
# asks before using it, and the ETag makes an unchanged file a 304. Without a
# Cache-Control header browsers guess how long to reuse a module, and after a
# deploy one can run a fresh map.js against a stale rating.js -- an import
# that no longer resolves, and a blank page.
REVALIDATE = {"Cache-Control": "no-cache"}


class RevalidatedFiles(StaticFiles):
    def file_response(self, *args, **kwargs):
        response = super().file_response(*args, **kwargs)
        response.headers.update(REVALIDATE)
        return response


@app.get("/")
def index():
    return FileResponse(WEB_DIR / "index.html", headers=REVALIDATE)


app.mount("/", RevalidatedFiles(directory=WEB_DIR), name="web")
