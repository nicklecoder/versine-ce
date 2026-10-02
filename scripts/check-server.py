#!/usr/bin/env python3
"""
The server, exercised against a real database.

Every other check in this directory validates the *catalogue* -- the problems,
their answers, their pictures, the play loop. None of them touches the thing
that stores a student's work, and two faults lived there undetected until
somebody opened the database by hand:

  * `get_progress` served the stored level indices rather than re-deriving
    them from slugs, so inserting a level into a skill silently reattributed
    a student's history to different levels. It had already happened.
  * the skill gate read those same stale indices, so a finished skill read as
    unfinished and would have locked a student out of their own progress.

Both survived all six existing checks, because all six are about problems.
This one is about people's records.

Written in the same shape as the others: standard library only, no test
framework, run by `scripts/update.sh` before it will start a new version. A
server needs nothing installed beyond python3 to refuse a deploy that would
corrupt progress.

Usage: python3 scripts/check-server.py
"""
from __future__ import annotations

import json
import os
import sqlite3
import sys
import shutil
import tempfile
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Unlike its neighbours this check cannot be stdlib-only: it imports the
# server, and the server is a FastAPI app. Stubbing the framework out would
# mean testing a drawing of it -- the request models do validation that is
# itself under test here.
#
# So: use the project's virtualenv if this interpreter cannot see the
# framework, and if there is no venv either, skip rather than fail. That is
# the same bargain `update.sh` already strikes for the JavaScript checks --
# a machine without the runtime still gets every check that does not need it,
# and a missing tool must never be reported as a broken catalogue.
#
# This has to come before anything is created on disk: `execv` replaces the
# process, so a temp directory made above here would be abandoned by it and
# left behind on every run.
try:
    import fastapi                                   # noqa: F401
except ImportError:
    venv = ROOT / ".venv" / "bin" / "python"
    if venv.exists() and Path(sys.executable).resolve() != venv.resolve():
        os.execv(str(venv), [str(venv), str(Path(__file__).resolve())])
    print("server: skipped — the web framework is not installed for this interpreter")
    sys.exit(0)

WORK = Path(tempfile.mkdtemp(prefix="versine-check-"))

# db.py reads both of these at import time, so they have to be set first. The
# library directory is fabricated per test, which is what lets a catalogue
# change be simulated rather than argued about.
os.environ["VERSINE_DB"] = str(WORK / "test.db")
os.environ["VERSINE_LIBRARY"] = str(WORK / "library")
(WORK / "library").mkdir()

sys.path.insert(0, str(ROOT / "server"))

import app as api                                    # noqa: E402
import auth                                          # noqa: E402
import db                                            # noqa: E402
from fastapi import HTTPException, Response          # noqa: E402


# ── Harness ──────────────────────────────────────────────────────────────────
TESTS: list[tuple[str, callable]] = []
failures: list[str] = []


def test(name):
    def wrap(fn):
        TESTS.append((name, fn))
        return fn
    return wrap


class Failed(AssertionError):
    pass


def check(condition, message):
    if not condition:
        raise Failed(message)


def equal(got, want, what):
    if got != want:
        raise Failed(f"{what}: got {got!r}, wanted {want!r}")


def raises(status, fn, *a, **kw):
    """The endpoint must refuse with this HTTP status."""
    try:
        fn(*a, **kw)
    except HTTPException as exc:
        equal(exc.status_code, status, "status")
        return exc
    raise Failed(f"expected HTTP {status}, but the call succeeded")


def catalogue(order: dict[str, list[str]]) -> None:
    """Publish a level order, the way the library build does."""
    with open(WORK / "library" / "manifest.json", "w", encoding="utf-8") as fh:
        json.dump({"order": order}, fh)


def fresh(order: dict[str, list[str]] | None = None):
    """A brand-new database, and a catalogue to read it against."""
    path = WORK / "test.db"
    for suffix in ("", "-wal", "-shm"):
        Path(str(path) + suffix).unlink(missing_ok=True)
    db.DB_PATH = path
    db.init_db()
    catalogue(order if order is not None else {})
    auth._failures.clear()


def make_user(name="kid", pin="1234", role="student"):
    with db.cursor(commit=True) as conn:
        row = api.insert_user(conn, name=name, pin=pin, role=role,
                              icon=api.ICONS[0], accent=api.ACCENTS[0])
        return dict(row)


def summary(**kw):
    base = dict(solved=10, cleanSolved=10, answered=12, misses=2, accuracy=0.83,
                bestStreak=5, points=100, avgSeconds=4.0, passed=False)
    base.update(kw)
    return api.SummaryIn(**base)


def run(user, skill="alpha", level=0, slug=None, mode="trial", levels=3, **kw):
    """Submit a finished run, the way the client does."""
    return api.submit_run(
        api.RunIn(skill_id=skill, level=level, level_slug=slug, mode_id=mode,
                  level_count=levels, duration=kw.pop("duration", 0),
                  attempts=kw.pop("attempts", []), summary=summary(**kw)),
        user=user)


def record(user, skill="alpha"):
    with db.cursor() as conn:
        return db.get_progress(conn, user["id"])["skills"].get(skill, {})


# ── A catalogue that changes underneath stored progress ──────────────────────
# The class of fault that prompted this file. Slugs are the record; positions
# are re-derived on every read.

@test("a level inserted mid-skill does not reattribute cleared levels")
def _():
    fresh({"alpha": ["one", "two", "three"]})
    user = make_user()
    run(user, level=0, slug="one", passed=True, levels=3)
    run(user, level=1, slug="two", passed=True, levels=3)
    equal(record(user)["mastered"], [0, 1], "mastered before the catalogue changed")

    # A level arrives in the middle, exactly as "Above and Below Zero" did.
    catalogue({"alpha": ["one", "inserted", "two", "three"]})
    after = record(user)
    equal(after["mastered"], [0, 2], "mastered after the insert")
    check(1 not in after["mastered"],
          "credited the student with the level that was just inserted")


@test("a finished skill stays finished when the skill grows a level")
def _():
    fresh({"alpha": ["one", "two"]})
    user = make_user()
    run(user, level=0, slug="one", passed=True, levels=2)
    run(user, level=1, slug="two", passed=True, levels=2)
    equal(record(user)["mastered"], [0, 1], "both levels cleared")

    catalogue({"alpha": ["one", "inserted", "two"]})
    after = record(user)
    # The gate asks whether the LAST level is cleared. Under stale indices this
    # read as [0, 1] against a three-level skill: unfinished, and a student
    # locked out of everything downstream.
    check(2 in after["mastered"], "the last level must still read as cleared")


@test("a level inserted behind a student stays unlocked")
def _():
    fresh({"alpha": ["one", "two", "three"]})
    user = make_user()
    run(user, level=0, slug="one", passed=True, levels=3)
    run(user, level=1, slug="two", passed=True, levels=3)
    catalogue({"alpha": ["one", "two", "inserted", "three"]})
    after = record(user)
    check(after["level"] >= 2,
          f"level fell to {after['level']}; a level added behind them locked them out")


@test("level is never below the furthest level actually cleared")
def _():
    fresh({"alpha": ["one", "two", "three"]})
    user = make_user()
    for i, s in enumerate(["one", "two", "three"]):
        run(user, level=i, slug=s, passed=True, levels=3)
    after = record(user)
    equal(after["level"], max(after["mastered"]), "level against furthest cleared")


@test("progress falls back to stored positions when the catalogue is unreadable")
def _():
    fresh({"alpha": ["one", "two"]})
    user = make_user()
    run(user, level=0, slug="one", passed=True, levels=2)
    # A server that cannot read the manifest must still serve progress rather
    # than reporting everything as uncleared.
    (WORK / "library" / "manifest.json").unlink()
    equal(record(user)["mastered"], [0], "mastered with no manifest")
    catalogue({"alpha": ["one", "two"]})


@test("a skill missing from the catalogue keeps its stored positions")
def _():
    fresh({"alpha": ["one", "two"]})
    user = make_user()
    run(user, level=0, slug="one", passed=True, levels=2)
    catalogue({"beta": ["x"]})              # alpha is gone from the manifest
    equal(record(user)["mastered"], [0], "mastered for an unknown skill")


# ── Submitting a run ─────────────────────────────────────────────────────────

@test("a passed trial unlocks exactly the next level")
def _():
    fresh({"alpha": ["one", "two", "three"]})
    user = make_user()
    out = run(user, level=0, slug="one", passed=True, levels=3)
    equal(out["unlockedLevel"], 1, "unlocked level")
    equal(record(user)["level"], 1, "level after one pass")


@test("passing a level twice does not advance twice")
def _():
    fresh({"alpha": ["one", "two", "three"]})
    user = make_user()
    run(user, level=0, slug="one", passed=True, levels=3)
    out = run(user, level=0, slug="one", passed=True, levels=3)
    equal(out["unlockedLevel"], None, "second pass of the same level")
    equal(record(user)["level"], 1, "level after passing level 0 twice")


@test("a failed run unlocks nothing")
def _():
    fresh({"alpha": ["one", "two"]})
    user = make_user()
    out = run(user, level=0, slug="one", passed=False, levels=2)
    equal(out["unlockedLevel"], None, "unlocked on a failed run")
    equal(record(user).get("mastered", []), [], "mastered after failing")


@test("the last level does not unlock a level that does not exist")
def _():
    fresh({"alpha": ["one", "two"]})
    user = make_user()
    run(user, level=0, slug="one", passed=True, levels=2)
    out = run(user, level=1, slug="two", passed=True, levels=2)
    equal(out["unlockedLevel"], None, "unlocked past the last level")
    equal(record(user)["level"], 1, "level after clearing the last one")


@test("points are capped so the client cannot mint a leaderboard")
def _():
    fresh({"alpha": ["one"]})
    user = make_user()
    out = run(user, level=0, slug="one", answered=3, points=10 ** 9, levels=1)
    equal(out["points"], 3 * 800, "capped points")
    out = run(user, level=0, slug="one", answered=3, points=-50, levels=1)
    equal(out["points"], 0, "negative points")


@test("solved accumulates across runs, and mastered does not duplicate")
def _():
    fresh({"alpha": ["one", "two"]})
    user = make_user()
    run(user, level=0, slug="one", solved=7, passed=True, levels=2)
    run(user, level=0, slug="one", solved=5, passed=True, levels=2)
    r = record(user)
    equal(r["solved"], 12, "solved total")
    equal(r["mastered"], [0], "mastered after passing the same level twice")


@test("a personal best only moves upward")
def _():
    fresh({"alpha": ["one"]})
    user = make_user()
    first = run(user, level=0, slug="one", points=500, answered=40, levels=1)
    check(first["newBest"], "first score should be a personal best")
    worse = run(user, level=0, slug="one", points=100, answered=40, levels=1)
    check(not worse["newBest"], "a worse score claimed a personal best")
    with db.cursor() as conn:
        best = conn.execute("SELECT points FROM best_scores WHERE user_id=?",
                            (user["id"],)).fetchone()["points"]
    equal(best, 500, "stored best")


@test("attempts are stored against the level's slug, not only its position")
def _():
    fresh({"alpha": ["one", "two"]})
    user = make_user()
    run(user, level=1, slug="two", levels=2, attempts=[
        api.AttemptIn(prompt="2 + 2", expected="4", correct=True, ms=1200),
        api.AttemptIn(prompt="3 + 3", expected="6", correct=False, ms=3000),
    ])
    with db.cursor() as conn:
        rows = conn.execute("SELECT level_slug, correct FROM attempts ORDER BY id").fetchall()
    equal(len(rows), 2, "attempts recorded")
    equal([r["level_slug"] for r in rows], ["two", "two"], "attempt slugs")


@test("mastered slugs are kept in catalogue order, not the order they were cleared")
def _():
    fresh({"alpha": ["one", "two", "three"]})
    user = make_user()
    # Cleared out of order, which a student can do by replaying an earlier level.
    run(user, level=0, slug="one", passed=True, levels=3)
    run(user, level=1, slug="two", passed=True, levels=3)
    run(user, level=0, slug="one", passed=True, levels=3)
    with db.cursor() as conn:
        slugs = json.loads(conn.execute(
            "SELECT mastered_slugs FROM skill_progress WHERE user_id=?",
            (user["id"],)).fetchone()["mastered_slugs"])
    equal(slugs, ["one", "two"], "mastered slugs")


@test("a run with no slug falls back to the catalogue position")
def _():
    fresh({"alpha": ["one", "two"]})
    user = make_user()
    run(user, level=1, slug=None, passed=True, levels=2)      # an older client
    with db.cursor() as conn:
        stored = conn.execute("SELECT level_slug FROM runs WHERE user_id=?",
                              (user["id"],)).fetchone()["level_slug"]
    equal(stored, "two", "slug derived from position")


# ── Done for today ───────────────────────────────────────────────────────────

@test("a skill is done for the day only when its LAST level is cleared")
def _():
    fresh({"alpha": ["one", "two", "three"]})
    user = make_user()
    run(user, level=0, slug="one", passed=True, levels=3)
    check(not record(user)["doneToday"], "level 0 should not finish the skill")
    run(user, level=1, slug="two", passed=True, levels=3)
    run(user, level=2, slug="three", passed=True, levels=3)
    check(record(user)["doneToday"], "clearing the last level should finish the skill")


@test("practice does not finish a skill for the day, only a trial does")
def _():
    fresh({"alpha": ["one", "two"]})
    user = make_user()
    run(user, level=1, slug="two", mode="practice", passed=True, levels=2)
    check(not record(user)["doneToday"], "practice ticked the daily box")


@test("a failed trial on the last level does not finish the skill")
def _():
    fresh({"alpha": ["one", "two"]})
    user = make_user()
    run(user, level=1, slug="two", passed=False, levels=2)
    check(not record(user)["doneToday"], "a failed trial ticked the daily box")


@test("yesterday's clearance does not count as done today")
def _():
    fresh({"alpha": ["one", "two"]})
    user = make_user()
    run(user, level=1, slug="two", passed=True, levels=2)
    check(record(user)["doneToday"], "should be done today to begin with")
    yesterday = (date.today() - timedelta(days=1)).isoformat() + "T09:00:00+00:00"
    with db.cursor(commit=True) as conn:
        conn.execute("UPDATE runs SET ended_at = ?", (yesterday,))
    check(not record(user)["doneToday"], "yesterday's run still counts as today")


# ── Identity ─────────────────────────────────────────────────────────────────

@test("a PIN round-trips and a wrong one is refused")
def _():
    fresh()
    digest, salt = auth.hash_pin("4321")
    check(auth.verify_pin("4321", digest, salt), "correct PIN rejected")
    check(not auth.verify_pin("1234", digest, salt), "wrong PIN accepted")
    check(auth.valid_pin_format("0000"), "0000 should be a valid format")
    check(not auth.valid_pin_format("123"), "a 3-digit PIN should be refused")
    check(not auth.valid_pin_format("12a4"), "a non-numeric PIN should be refused")


@test("a PIN is never stored in the clear")
def _():
    fresh()
    user = make_user(pin="9876")
    check("9876" not in user["pin_hash"], "the PIN appears in its own hash")
    check(user["pin_hash"] != "9876", "the PIN is stored verbatim")
    check(len(user["pin_salt"]) >= 16, "salt looks too short to be one")


@test("five wrong PINs lock the account, and a good one clears the count")
def _():
    fresh()
    user = make_user(pin="1111")
    resp = Response()
    for _ in range(5):
        raises(401, api.login, api.LoginIn(user_id=user["id"], pin="0000"), resp)
    exc = raises(429, api.login, api.LoginIn(user_id=user["id"], pin="1111"), resp)
    check("Wait" in exc.detail, f"lockout message was {exc.detail!r}")

    auth._failures.clear()
    api.login(api.LoginIn(user_id=user["id"], pin="1111"), resp)
    equal(auth.seconds_locked_out(user["id"]), 0, "failures after a good login")


@test("a session token identifies its user and can be revoked")
def _():
    fresh()
    user = make_user()
    with db.cursor(commit=True) as conn:
        token = auth.create_session(conn, user["id"])
    equal(api.current_user(vs_session=token)["id"], user["id"], "user for token")
    with db.cursor(commit=True) as conn:
        auth.destroy_session(conn, token)
    raises(401, api.current_user, vs_session=token)


@test("an unknown or absent token is not signed in")
def _():
    fresh()
    make_user()
    raises(401, api.current_user, vs_session=None)
    raises(401, api.current_user, vs_session="not-a-real-token")


@test("a student cannot reach the teacher endpoints")
def _():
    fresh()
    student = make_user(name="kid", role="student")
    teacher = make_user(name="grown-up", role="teacher")
    raises(403, api.current_teacher, user=student)
    equal(api.current_teacher(user=teacher)["id"], teacher["id"], "teacher accepted")


@test("a profile made from the login screen is always a student")
def _():
    fresh()
    resp = Response()
    api.create_profile(api.NewProfileIn(name="new kid", pin="2222",
                                        icon=api.ICONS[1], accent=api.ACCENTS[1]), resp)
    with db.cursor() as conn:
        row = conn.execute("SELECT role FROM users WHERE name='new kid'").fetchone()
    equal(row["role"], "student", "role of a self-made profile")


@test("a profile is refused an icon or colour that is not on the list")
def _():
    fresh()
    resp = Response()
    raises(400, api.create_profile,
           api.NewProfileIn(name="a", pin="1234", icon="<script>", accent=api.ACCENTS[0]), resp)
    raises(400, api.create_profile,
           api.NewProfileIn(name="b", pin="1234", icon=api.ICONS[0], accent="red"), resp)
    raises(400, api.create_profile,
           api.NewProfileIn(name="c", pin="12", icon=api.ICONS[0], accent=api.ACCENTS[0]), resp)


@test("two people cannot take the same name")
def _():
    fresh()
    make_user(name="twin")
    resp = Response()
    raises(409, api.create_profile,
           api.NewProfileIn(name="twin", pin="1234",
                            icon=api.ICONS[0], accent=api.ACCENTS[0]), resp)


# ── The adaptive clock ───────────────────────────────────────────────────────

@test("failing loosens the clock, finishing with room to spare tightens it")
def _():
    fresh()
    loose = api.adapt_clock(duration=100, target=10, passed=False, time_left=0)
    check(loose > 100, f"a failed run should loosen the clock, got {loose}")
    tight = api.adapt_clock(duration=100, target=10, passed=True, time_left=40)
    check(tight < 100, f"finishing with 40s spare should tighten, got {tight}")
    same = api.adapt_clock(duration=100, target=10, passed=True, time_left=5)
    equal(same, 100, "a narrow finish should leave the clock alone")


@test("the clock never demands an impossible pace nor allows an idle one")
def _():
    fresh()
    target = 10
    floor = api.CLOCK["min_pace"] * target
    ceiling = api.CLOCK["max_pace"] * target
    fast = api.adapt_clock(duration=10, target=target, passed=True, time_left=9)
    check(fast >= floor, f"clock {fast} is under the {floor}s floor")
    slow = api.adapt_clock(duration=10_000, target=target, passed=False, time_left=0)
    check(slow <= ceiling, f"clock {slow} is over the {ceiling}s ceiling")


@test("a trial records the clock it earned for next time")
def _():
    fresh({"alpha": ["one"]})
    user = make_user()
    out = run(user, level=0, slug="one", mode="trial", duration=120, levels=1,
              passed=True, target=10, timeLeft=60)
    check(out["clockNext"] is not None, "no next clock was reported")
    check(out["clockNext"] < 120, "a comfortable win should tighten the clock")
    with db.cursor() as conn:
        stored = conn.execute("SELECT duration, runs FROM level_clocks WHERE user_id=?",
                              (user["id"],)).fetchone()
    equal(stored["duration"], out["clockNext"], "stored clock")
    equal(stored["runs"], 1, "clock run count")


@test("practice does not touch the trial clock")
def _():
    fresh({"alpha": ["one"]})
    user = make_user()
    out = run(user, level=0, slug="one", mode="practice", duration=120, levels=1)
    equal(out["clockNext"], None, "practice reported a clock change")
    with db.cursor() as conn:
        rows = conn.execute("SELECT COUNT(*) c FROM level_clocks").fetchone()["c"]
    equal(rows, 0, "practice wrote a clock row")


# ── What the Level is computed from ──────────────────────────────────────────

@test("accuracy describes recent answers, not a lifetime average")
def _():
    fresh({"alpha": ["one"]})
    user = make_user()
    # A bad start, then a long clean run. The headline figure should reflect
    # what they can do now, which is the whole argument for the Level.
    bad = [api.AttemptIn(prompt="q", expected="a", correct=False, ms=2000)] * 30
    good = [api.AttemptIn(prompt="q", expected="a", correct=True, ms=2000)] * 40
    run(user, level=0, slug="one", levels=1, attempts=bad)
    run(user, level=0, slug="one", levels=1, attempts=good)
    with db.cursor() as conn:
        stats = api.level_stats(conn, user["id"])[0]
    check(stats["accuracy"] > 0.9,
          f"recent accuracy was {stats['accuracy']:.2f}; the old failures are dragging it")
    check(stats["lifetimeAccuracy"] < 0.7,
          f"lifetime accuracy was {stats['lifetimeAccuracy']:.2f}; it should include them")


@test("pace is a median, so one interrupted problem cannot wreck it")
def _():
    fresh({"alpha": ["one"]})
    user = make_user()
    attempts = [api.AttemptIn(prompt="q", expected="a", correct=True, ms=2000)] * 9
    attempts.append(api.AttemptIn(prompt="q", expected="a", correct=True, ms=400_000))
    run(user, level=0, slug="one", levels=1, attempts=attempts)
    with db.cursor() as conn:
        stats = api.level_stats(conn, user["id"])[0]
    equal(stats["medianSeconds"], 2.0, "median pace")


@test("only correct answers count toward pace")
def _():
    fresh({"alpha": ["one"]})
    user = make_user()
    run(user, level=0, slug="one", levels=1, attempts=[
        api.AttemptIn(prompt="q", expected="a", correct=True, ms=2000),
        api.AttemptIn(prompt="q", expected="a", correct=False, ms=90_000),
        api.AttemptIn(prompt="q", expected="a", correct=True, ms=2000),
    ])
    with db.cursor() as conn:
        stats = api.level_stats(conn, user["id"])[0]
    equal(stats["medianSeconds"], 2.0, "median over correct answers only")


@test("a streak counts consecutive days and stops when one is missed")
def _():
    fresh()
    today = date.today()
    days = [(today - timedelta(days=i)).isoformat() for i in (0, 1, 2)]
    equal(api.streak_from_days(days), (3, 3), "three days in a row")

    broken = [(today - timedelta(days=i)).isoformat() for i in (0, 1, 4, 5, 6, 7)]
    current, best = api.streak_from_days(broken)
    equal(current, 2, "current streak after a gap")
    equal(best, 4, "best streak")

    stale = [(today - timedelta(days=i)).isoformat() for i in (5, 6, 7)]
    equal(api.streak_from_days(stale)[0], 0, "a streak already broken")
    equal(api.streak_from_days([]), (0, 0), "no practice at all")


# ── Scoping and deletion ─────────────────────────────────────────────────────

@test("one student's progress is never mixed with another's")
def _():
    fresh({"alpha": ["one", "two"]})
    a = make_user(name="a")
    b = make_user(name="b")
    run(a, level=0, slug="one", solved=9, passed=True, levels=2)
    equal(record(a)["solved"], 9, "the student who practised")
    equal(record(b).get("solved", 0), 0, "the student who did not")


@test("deleting a user takes their runs, attempts and progress with them")
def _():
    fresh({"alpha": ["one"]})
    teacher = make_user(name="grown-up", role="teacher")
    kid = make_user(name="kid")
    run(kid, level=0, slug="one", levels=1, passed=True,
        attempts=[api.AttemptIn(prompt="q", expected="a", correct=True, ms=1000)])
    api.delete_user(kid["id"], teacher=teacher)
    with db.cursor() as conn:
        for table in ("skill_progress", "runs", "attempts", "best_scores", "auth_sessions"):
            left = conn.execute(f"SELECT COUNT(*) c FROM {table} WHERE user_id=?",
                                (kid["id"],)).fetchone()["c"]
            equal(left, 0, f"rows left in {table}")


@test("a teacher cannot delete themselves")
def _():
    fresh()
    teacher = make_user(name="grown-up", role="teacher")
    raises(400, api.delete_user, teacher["id"], teacher=teacher)


# ── First run, and the shape of the front door ───────────────────────────────

@test("setup makes a teacher, and only ever once")
def _():
    fresh()
    resp = Response()
    out = api.setup(api.SetupIn(name="grown-up", pin="1234",
                                icon=api.ICONS[0], accent=api.ACCENTS[0]), resp)
    equal(out["me"]["role"], "teacher", "role created by setup")
    raises(409, api.setup, api.SetupIn(name="second", pin="1234",
                                       icon=api.ICONS[0], accent=api.ACCENTS[0]), resp)


@test("bootstrap says whether the app needs setting up, and who is signed in")
def _():
    fresh()
    equal(api.bootstrap(vs_session=None)["needs_setup"], True, "needs_setup when empty")
    user = make_user()
    boot = api.bootstrap(vs_session=None)
    equal(boot["needs_setup"], False, "needs_setup once someone exists")
    equal(boot["me"], None, "me with no cookie")
    with db.cursor(commit=True) as conn:
        token = auth.create_session(conn, user["id"])
    equal(api.bootstrap(vs_session=token)["me"]["id"], user["id"], "me with a cookie")


@test("no PIN or hash is ever handed to the client")
def _():
    fresh()
    user = make_user(pin="4321")
    payloads = [json.dumps(api.bootstrap(vs_session=None)),
                json.dumps(api.public_user(user))]
    teacher = make_user(name="grown-up", role="teacher")
    payloads.append(json.dumps(api.teacher_overview(_=teacher)))
    for blob in payloads:
        for secret in ("pin_hash", "pin_salt", "4321"):
            check(secret not in blob, f"{secret!r} reached the client in {blob[:60]}…")


@test("the server refuses to fill up past its ceiling")
def _():
    fresh()
    resp = Response()
    for i in range(api.MAX_USERS):
        make_user(name=f"kid{i}")
    raises(409, api.create_profile,
           api.NewProfileIn(name="one too many", pin="1234",
                            icon=api.ICONS[0], accent=api.ACCENTS[0]), resp)


@test("only a teacher can mint another teacher")
def _():
    fresh()
    teacher = make_user(name="grown-up", role="teacher")
    made = api.create_user(api.NewUserIn(name="colleague", pin="1234", role="teacher",
                                         icon=api.ICONS[0], accent=api.ACCENTS[0]),
                           _=teacher)
    equal(made["role"], "teacher", "role a teacher may create")
    raises(400, api.create_user,
           api.NewUserIn(name="odd", pin="1234", role="admin",
                         icon=api.ICONS[0], accent=api.ACCENTS[0]), _=teacher)


# ── What the console and the streak strip read ───────────────────────────────

@test("the teacher console sees students, and does not list teachers as pupils")
def _():
    fresh({"alpha": ["one"]})
    teacher = make_user(name="grown-up", role="teacher")
    kid = make_user(name="kid")
    run(kid, level=0, slug="one", levels=1, attempts=[
        api.AttemptIn(prompt="q", expected="a", correct=True, ms=1000),
        api.AttemptIn(prompt="q", expected="a", correct=False, ms=1000),
    ])
    rows = api.teacher_overview(_=teacher)
    equal([r["name"] for r in rows], ["kid"], "students listed")
    equal(rows[0]["attempts"], 2, "attempt count")
    equal(rows[0]["accuracy"], 0.5, "accuracy")


@test("the leaderboard ranks students only, best first")
def _():
    fresh({"alpha": ["one"]})
    teacher = make_user(name="grown-up", role="teacher")
    a = make_user(name="ana")
    b = make_user(name="bo")
    run(a, level=0, slug="one", mode="sprint", points=300, answered=40, levels=1)
    run(b, level=0, slug="one", mode="sprint", points=900, answered=40, levels=1)
    run(teacher, level=0, slug="one", mode="sprint", points=999, answered=40, levels=1)
    board = api.leaderboard(skill_id="alpha", mode_id="sprint", _=a)
    equal([r["name"] for r in board], ["bo", "ana"], "leaderboard order")


@test("the streak strip separates days practised from days completed")
def _():
    fresh({"alpha": ["one", "two"]})
    user = make_user()
    # Practised without finishing the skill.
    run(user, level=0, slug="one", levels=2, passed=True,
        attempts=[api.AttemptIn(prompt="q", expected="a", correct=True, ms=1000)])
    act = api.activity(skill_id="alpha", user=user)
    equal(act["practiceDays"], 1, "days practised")
    equal(act["completedDays"], 0, "days completed")
    check(not act["doneToday"], "not finished, but reported done")

    # Now clear the last level.
    run(user, level=1, slug="two", levels=2, passed=True,
        attempts=[api.AttemptIn(prompt="q", expected="a", correct=True, ms=1000)])
    act = api.activity(skill_id="alpha", user=user)
    equal(act["completedDays"], 1, "days completed after clearing the last level")
    check(act["doneToday"], "finished, but not reported done")


# requiem: server/day-is-local
@test("an evening run counts on the student's own day, not the UTC one")
def _():
    from datetime import datetime, time, timezone
    from zoneinfo import ZoneInfo

    fresh({"alpha": ["one", "two"]})
    user = make_user()
    run(user, level=1, slug="two", levels=2, passed=True,
        attempts=[api.AttemptIn(prompt="q", expected="a", correct=True, ms=1000)])

    # Move that run to 19:30 tonight in Denver -- already tomorrow in UTC.
    denver = ZoneInfo("America/Denver")
    tonight = datetime.combine(datetime.now(denver).date(), time(19, 30), denver)
    stamp = tonight.astimezone(timezone.utc).isoformat(timespec="seconds")
    with db.cursor(commit=True) as conn:
        conn.execute("UPDATE runs SET ended_at = ? WHERE user_id = ?", (stamp, user["id"]))
        conn.execute("UPDATE attempts SET at = ? WHERE user_id = ?", (stamp, user["id"]))

    local = tonight.date().isoformat()
    token = db.DAY_ZONE.set(denver)
    try:
        act = api.activity(skill_id="alpha", user=user)
        equal([d["day"] for d in act["days"]], [local], "the strip's day")
        check(act["doneToday"], "cleared this evening, but not reported done today")
        equal(act["currentStreak"], 1, "streak after clearing this evening")
        with db.cursor() as conn:
            equal(db.done_today(conn, user["id"]), {"alpha"}, "done_today this evening")
    finally:
        db.DAY_ZONE.reset(token)

    token = db.DAY_ZONE.set(timezone.utc)
    try:
        utc_day = api.activity(skill_id="alpha", user=user)["days"][0]["day"]
        check(utc_day != local, "the zone made no difference, so this check proves nothing")
    finally:
        db.DAY_ZONE.reset(token)


# requiem: server/day-is-local
@test("the browser's time zone header sets the day zone; a bad one is ignored")
def _():
    import asyncio

    seen = []

    async def inner(scope, receive, send):
        seen.append(db.DAY_ZONE.get())

    middleware = api.DayZoneMiddleware(inner)
    for name in (b"America/Denver", b"Not/AZone", b""):
        scope = {"type": "http", "headers": [(b"x-versine-time-zone", name)]}
        asyncio.run(middleware(scope, None, None))
    equal([str(z) if z else None for z in seen], ["America/Denver", None, None],
          "zones seen by the endpoint")
    equal(db.DAY_ZONE.get(), None, "day zone after the request")


@test("a percentile of a small sample picks a real value, not an average")
def _():
    fresh()
    values = [10, 20, 30, 40]
    check(api.percentile(values, 0.25) in values, "25th percentile is not one of the values")
    check(api.percentile(values, 0.75) in values, "75th percentile is not one of the values")
    equal(api.percentile([], 0.5), 0, "percentile of nothing")


# ── Schema care ──────────────────────────────────────────────────────────────

@test("init_db is safe to run again over an existing database")
def _():
    fresh({"alpha": ["one"]})
    user = make_user()
    run(user, level=0, slug="one", solved=4, passed=True, levels=1)
    db.init_db()                                   # as a redeploy does
    db.init_db()
    equal(record(user)["solved"], 4, "solved after re-running init_db")
    equal(record(user)["mastered"], [0], "mastered after re-running init_db")


@test("a database written before slugs existed is backfilled, not lost")
def _():
    fresh({"alpha": ["one", "two", "three"]})
    user = make_user()
    # An old row: positions only, no slugs -- what init_db has to migrate.
    with db.cursor(commit=True) as conn:
        conn.execute(
            "INSERT INTO skill_progress (user_id, skill_id, level, mastered, "
            "mastered_slugs, level_slug, solved, level_count) "
            "VALUES (?,?,?,?,?,?,?,?)",
            (user["id"], "alpha", 1, json.dumps([0, 1]), "[]", None, 20, 3))
    db.init_db()
    with db.cursor() as conn:
        row = conn.execute("SELECT mastered_slugs, level_slug FROM skill_progress "
                           "WHERE user_id=?", (user["id"],)).fetchone()
    equal(json.loads(row["mastered_slugs"]), ["one", "two"], "backfilled slugs")
    equal(row["level_slug"], "two", "backfilled level slug")


@test("the health check reports the database, not just the process")
def _():
    fresh()
    make_user()
    equal(api.health()["users"], 1, "health user count")
    db.DB_PATH = Path("/nonexistent/nowhere/progress.db")
    raises(503, api.health)
    db.DB_PATH = WORK / "test.db"


# ── Run them ─────────────────────────────────────────────────────────────────
for name, fn in TESTS:
    try:
        fn()
    except Failed as exc:
        failures.append(f"{name}\n      {exc}")
    except Exception as exc:                       # noqa: BLE001
        failures.append(f"{name}\n      unexpected {type(exc).__name__}: {exc}")

# rmtree, not a chain of rmdir: sqlite leaves -wal and -shm files beside the
# database and an rmdir chain that swallows its own errors quietly littered
# /tmp with a directory per run.
shutil.rmtree(WORK, ignore_errors=True)

if failures:
    print(f"{len(failures)} server check(s) failed:")
    for f in failures:
        print(f"  ✗ {f}")
    sys.exit(1)

print(f"server: {len(TESTS)} checks passed — progress across catalogue changes, runs, "
      "identity, clocks, the console and the schema")
