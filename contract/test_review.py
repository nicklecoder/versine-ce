"""Review state as the browser reads it.

Only what can be seen without waiting is pinned here: the suite cannot make
a week pass on a server it reaches over HTTP. How the schedule moves over
time -- coming due, growing, credit from dependent work, the cap on tags --
is checked in check-server.py, which can age a student's history.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from .context import a_skill, group, progress, submit
from .harness import equal, has_keys, test

REVIEW_KEYS = {"dueOn", "intervalDays", "lastReviewedOn", "due", "overdueDays", "tagged"}


def finish(student, skill, slugs):
    for level in range(len(slugs)):
        submit(student, skill, slugs, level, passed=True)


def today_in(zone: str) -> date:
    return datetime.now(ZoneInfo(zone)).date()


# requiem: review/skill-review-schedule
@test("a skill not yet finished has no review, and nothing is offered")
def _():
    student = group().add_student()
    skill, slugs = a_skill(student)
    submit(student, skill, slugs, 0, passed=True)
    data = progress(student)
    has_keys(data, {"reviewOffer"}, "progress")
    equal(data["reviewOffer"], None, "reviewOffer")
    equal(data["skills"][skill]["review"], None, "review of an unfinished skill")


# requiem: review/skill-review-schedule
@test("finishing a skill makes it due for review a week later, in the student's own days")
def _():
    for zone in ("UTC", "Pacific/Kiritimati", "Pacific/Pago_Pago"):
        student = group().add_student(zone=zone)
        skill, slugs = a_skill(student)
        finish(student, skill, slugs)
        r = progress(student)["skills"][skill]["review"]
        has_keys(r, REVIEW_KEYS, "review")
        equal(r, {"dueOn": (today_in(zone) + timedelta(days=7)).isoformat(),
                  "intervalDays": 7, "lastReviewedOn": None, "due": False,
                  "overdueDays": 0, "tagged": False}, f"review just after finishing, in {zone}")
        equal(progress(student)["reviewOffer"], None, f"reviewOffer just after finishing, {zone}")


# requiem: review/pass-restarts-review-clock
@test("passing the last level again the same day changes nothing")
def _():
    student = group().add_student()
    skill, slugs = a_skill(student)
    finish(student, skill, slugs)
    before = progress(student)["skills"][skill]["review"]
    reply = submit(student, skill, slugs, len(slugs) - 1, passed=True)
    equal(reply["progress"]["skills"][skill]["review"], before, "review in the run's reply")
