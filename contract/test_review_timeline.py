"""Review as it unfolds over days and weeks.

Optional ("time-travel"): an edition serving it can move a student's history
into the past (Edition.age), so a test plays a timeline out in order -- finish
a skill, age a week, pass something -- and reads the schedule as of now. That
is what lets any server be held to the same review rules, not only the one
whose database the community checks can open.

Every student here sends UTC as their time zone, so a day is a UTC day and a
daylight-saving change can never move a boundary under a test. The skills are
real catalogue ones, chosen for their edges: Integer Multiply & Divide builds
on Integer Add & Subtract, and some of its levels name it outright; The
Coordinate Plane, Integer Multiply & Divide and Add & Subtract Fractions do
not build on one another.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from . import context
from .context import answers, catalogue, group, progress, submit
from .harness import TIME_TRAVEL, equal, check, test

BASE, NEXT = "int-addsub", "int-muldiv"
UNRELATED = ("coords", "int-muldiv", "frac-addsub")


def age(student, days):
    context.EDITION.age(student, days)


def slugs_of(client, skill):
    return catalogue(client)[skill]


def finish(student, skill):
    slugs = slugs_of(student, skill)
    for level in range(len(slugs)):
        submit(student, skill, slugs, level, passed=True)


def last_pass(student, skill, passed=True, **kw):
    slugs = slugs_of(student, skill)
    submit(student, skill, slugs, len(slugs) - 1, passed=passed, **kw)


def review(student, skill=BASE):
    return progress(student)["skills"][skill]["review"]


def in_days(n):
    return (datetime.now(timezone.utc).date() + timedelta(days=n)).isoformat()


def level_naming(client, skill, named, names=True):
    """A level of `skill` whose level-precise edges do (or do not) name `named`."""
    manifest = client.get("/library/manifest.json").ok("manifest")
    levels = manifest["graph"][skill]["levels"]
    for i, slug in enumerate(manifest["order"][skill]):
        if (named in levels.get(slug, [])) == names:
            return i, slug
    raise AssertionError(f"no level of {skill} {'naming' if names else 'not naming'} {named}")


# requiem: review/skill-review-schedule
@test("a finished skill comes due after its interval, is tagged, and is offered", TIME_TRAVEL)
def _():
    student = group().add_student()
    finish(student, BASE)
    age(student, 8)
    r = review(student)
    equal((r["due"], r["overdueDays"], r["tagged"]), (True, 1, True), "a day overdue")
    equal(progress(student)["reviewOffer"], BASE, "the offer")


# requiem: review/pass-restarts-review-clock
@test("any last-level pass restarts the clock, but the interval grows once per interval",
      TIME_TRAVEL)
def _():
    student = group().add_student()
    finish(student, BASE)
    for day in range(1, 21):
        age(student, 1)
        last_pass(student, BASE)
        check(not review(student)["due"], f"due on day {day} of daily review")
    r = review(student)
    equal((r["intervalDays"], r["dueOn"], r["lastReviewedOn"]), (14, in_days(14), in_days(0)),
          "after twenty days of daily review")


@test("a review passed once the interval has run steps the interval up", TIME_TRAVEL)
def _():
    student = group().add_student()
    finish(student, BASE)
    age(student, 9)
    last_pass(student, BASE)
    r = review(student)
    equal((r["due"], r["intervalDays"], r["dueOn"], r["tagged"]), (False, 14, in_days(14), False),
          "after the first review")
    equal(progress(student)["reviewOffer"], None, "the offer after reviewing")


# requiem: review/failed-review-leaves-due
@test("a failed or quit review leaves the skill due and the interval as it was", TIME_TRAVEL)
def _():
    student = group().add_student()
    finish(student, BASE)
    age(student, 10)
    last_pass(student, BASE, passed=False, endReason="time")
    last_pass(student, BASE, passed=False, endReason="quit")
    r = review(student)
    equal((r["due"], r["overdueDays"], r["intervalDays"]), (True, 3, 7), "after failing")


# requiem: review/dependent-work-credit
@test("a pass in a skill built on this one postpones its review, more when a level names it",
      TIME_TRAVEL)
def _():
    g = group()
    for names, extra in ((False, 1), (True, 3)):        # 0.25 x 7 and 0.5 x 7, in whole days
        student = g.add_student()
        finish(student, BASE)
        age(student, 1)
        level, slug = level_naming(student, NEXT, BASE, names)
        submit(student, NEXT, slugs_of(student, NEXT), level, passed=True)
        equal(review(student)["dueOn"], in_days(6 + extra),
              f"due after a pass at {slug} ({'naming' if names else 'not naming'} {BASE})")


@test("dependent credit is capped at one interval, and only passed trials earn it", TIME_TRAVEL)
def _():
    g = group()
    student = g.add_student()
    finish(student, BASE)
    level, _ = level_naming(student, NEXT, BASE, True)
    next_slugs = slugs_of(student, NEXT)
    for _ in range(6):
        age(student, 1)
        submit(student, NEXT, next_slugs, level, passed=True)
        submit(student, NEXT, next_slugs, level, passed=False)
        submit(student, NEXT, next_slugs, level, mode="practice", passed=True)
    equal(review(student)["dueOn"], in_days(-6 + 7 + 7), "due after six days of credit")

    student = g.add_student()
    finish(student, BASE)
    age(student, 1)
    submit(student, NEXT, next_slugs, level, passed=False)
    submit(student, NEXT, next_slugs, level, mode="practice", passed=True)
    equal(review(student)["dueOn"], in_days(6), "due after work that earns nothing")


# requiem: review/review-tags-capped
@test("at most two skills are tagged, most overdue first, and the most overdue is offered",
      TIME_TRAVEL)
def _():
    student = group().add_student()
    first, second, third = UNRELATED
    finish(student, first)
    age(student, 2)
    finish(student, second)
    age(student, 2)
    finish(student, third)
    age(student, 10)
    skills = progress(student)["skills"]
    equal({s: skills[s]["review"]["tagged"] for s in UNRELATED},
          {first: True, second: True, third: False}, "tagged")
    check(skills[third]["review"]["due"], "the third is due, just not tagged")
    equal(progress(student)["reviewOffer"], first, "the offer")


# requiem: review/measure-review-health
@test("review health counts the last 30 days of reviews, and how overdue they were", TIME_TRAVEL)
def _():
    g = group()
    student = g.add_student()
    finish(student, BASE)
    age(student, 9)                                   # due at 7: two days overdue
    last_pass(student, BASE)
    age(student, 3)                                   # next due in 14: early
    last_pass(student, BASE)
    health = lambda: g.teacher.get(                   # noqa: E731
        f"/api/teacher/students/{student.me['id']}").ok("detail")["reviewHealth"]
    h = health()
    equal((h["finished"], h["due"], h["reviews"], h["reviewsWhenDue"], h["medianOverdueDays"]),
          (1, 0, 2, 1, 2), "finished, due, reviews, while due, median overdue")
    age(student, 40)
    h = health()
    equal((h["reviews"], h["reviewsWhenDue"], h["medianOverdueDays"], h["due"]),
          (0, 0, None, 1), "a month and more later")


@test("a review on the very day it falls due counts as done while due", TIME_TRAVEL)
def _():
    g = group()
    student = g.add_student()
    finish(student, BASE)
    age(student, 7)
    last_pass(student, BASE, attempts=answers(True))
    h = g.teacher.get(f"/api/teacher/students/{student.me['id']}").ok("detail")["reviewHealth"]
    equal((h["reviewsWhenDue"], h["medianOverdueDays"]), (1, 0), "while due, median overdue")
