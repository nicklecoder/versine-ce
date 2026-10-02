"""The streak strip's per-day history, and whose calendar a day belongs to."""
from __future__ import annotations

from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from .context import a_skill, answers, group, progress, submit
from .harness import check, equal, has_keys, test

ACTIVITY_KEYS = {"days", "currentStreak", "bestStreak", "practiceDays", "completedDays",
                 "doneToday", "levelCount", "levelsCleared"}


def activity(client, skill, **kw):
    return client.get(f"/api/activity?skill_id={skill}", **kw).ok(f"activity for {skill}")


def utc_today() -> str:
    return datetime.now(timezone.utc).date().isoformat()


@test("a skill never played has an empty history")
def _():
    student = group().add_student()
    skill, _ = a_skill(student)
    act = activity(student, skill)
    has_keys(act, ACTIVITY_KEYS, "activity")
    equal((act["days"], act["currentStreak"], act["bestStreak"], act["practiceDays"],
           act["completedDays"], act["doneToday"], act["levelsCleared"]),
          ([], 0, 0, 0, 0, False, []), "an untouched skill")


@test("practising without finishing counts as a day practised, not a day completed")
def _():
    student = group().add_student()
    skill, slugs = a_skill(student)
    submit(student, skill, slugs, 0, passed=True, attempts=answers(True, False, True))
    act = activity(student, skill)
    equal((act["practiceDays"], act["completedDays"], act["currentStreak"], act["doneToday"]),
          (1, 0, 0, False), "practice days, completed days, streak, done")
    equal(act["days"], [{"day": utc_today(), "attempts": 3, "correct": 2, "completed": False}],
          "the strip")
    equal(act["levelsCleared"], [{"day": utc_today(), "level": 0}], "levels cleared")


@test("passing the last level's Time Trial completes the day and starts a streak")
def _():
    student = group().add_student()
    skill, slugs = a_skill(student)
    submit(student, skill, slugs, len(slugs) - 1, passed=True, attempts=answers(True))
    act = activity(student, skill)
    equal((act["completedDays"], act["currentStreak"], act["bestStreak"], act["doneToday"]),
          (1, 1, 1, True), "completed days, streak, best streak, done")
    equal(act["levelCount"], len(slugs), "levelCount")
    check(act["days"] and act["days"][-1]["completed"], f"today's cell completed: {act['days']}")


@test("a completed day shows on the strip even when no answers were recorded")
def _():
    # The strip and the streak count above it must never contradict each other.
    student = group().add_student()
    skill, slugs = a_skill(student)
    submit(student, skill, slugs, len(slugs) - 1, passed=True)
    equal(activity(student, skill)["days"],
          [{"day": utc_today(), "attempts": 0, "correct": 0, "completed": True}], "the strip")


def a_zone_on_another_date() -> tuple[str, str]:
    """A time zone whose calendar date differs from UTC's right now."""
    for name in ("Pacific/Kiritimati", "Pacific/Pago_Pago"):        # UTC+14, UTC-11
        local = datetime.now(ZoneInfo(name)).date().isoformat()
        if local != utc_today():
            return name, local
    raise AssertionError("no zone on another date; the clock is wrong")


# requiem: server/day-is-local
@test("a day is the student's local day, from the time zone their browser sends")
def _():
    student = group().add_student()
    skill, slugs = a_skill(student)
    zone, local = a_zone_on_another_date()
    submit(student, skill, slugs, len(slugs) - 1, passed=True, attempts=answers(True))

    there = activity(student, skill, zone=zone)
    equal([d["day"] for d in there["days"]], [local], f"the strip's day in {zone}")
    equal(there["levelsCleared"][0]["day"], local, f"the cleared day in {zone}")
    equal(there["doneToday"], True, f"done today in {zone}")
    equal(progress_in(student, zone)["skills"][skill]["doneToday"], True,
          f"progress done today in {zone}")
    equal(progress_in(student, zone)["levels"][0]["lastSeen"], local, f"lastSeen in {zone}")

    equal([d["day"] for d in activity(student, skill, zone="UTC")["days"]], [utc_today()],
          "the strip's day in UTC")


def progress_in(student, zone):
    return student.get("/api/progress", zone=zone).ok(f"progress in {zone}")
