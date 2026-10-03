"""Submitting runs, and the progress they leave behind."""
from __future__ import annotations

from .context import a_skill, group, progress, submit
from .harness import check, equal, has_keys, test

REPLY_KEYS = {"newBest", "unlockedLevel", "points", "clockWas", "clockNext",
              "clockAtFloor", "progress"}
SKILL_KEYS = {"level", "mastered", "solved", "levelCount", "doneToday", "best", "review",
              "contributionBest"}


@test("a new student has no progress yet")
def _():
    student = group().add_student()
    data = progress(student)
    has_keys(data, {"xp", "skills", "levels", "clocks", "reviewOffer"}, "progress")
    check(isinstance(data["xp"], int), f"xp is an integer, got {data['xp']!r}")
    equal(data["skills"], {}, "skills")
    equal(data["levels"], [], "levels")
    equal(data["clocks"], {}, "clocks")


@test("passing the level a student is on opens the next one")
def _():
    student = group().add_student()
    skill, slugs = a_skill(student)
    reply = submit(student, skill, slugs, 0, passed=True)
    has_keys(reply, REPLY_KEYS, "run reply")
    equal(reply["unlockedLevel"], 1, "unlockedLevel")
    entry = reply["progress"]["skills"][skill]
    has_keys(entry, SKILL_KEYS, "skill progress")
    equal(entry["level"], 1, "level after passing level 0")
    equal(entry["mastered"], [0], "mastered after passing level 0")
    equal(entry["levelCount"], len(slugs), "levelCount")
    equal(progress(student)["skills"][skill], entry, "progress read back after the run")


@test("a failed run opens nothing and masters nothing")
def _():
    student = group().add_student()
    skill, slugs = a_skill(student)
    reply = submit(student, skill, slugs, 0, passed=False)
    equal(reply["unlockedLevel"], None, "unlockedLevel after a failed run")
    entry = progress(student)["skills"][skill]
    equal(entry["level"], 0, "level after a failed run")
    equal(entry["mastered"], [], "mastered after a failed run")


@test("passing every level in order opens each next one and never runs past the last")
def _():
    student = group().add_student()
    skill, slugs = a_skill(student)
    last = len(slugs) - 1
    for level in range(len(slugs)):
        reply = submit(student, skill, slugs, level, passed=True)
        equal(reply["unlockedLevel"], level + 1 if level < last else None,
              f"unlockedLevel after passing level {level}")
    entry = progress(student)["skills"][skill]
    equal(entry["level"], last, "level after passing the last level")
    equal(entry["mastered"], list(range(len(slugs))), "every level mastered")


@test("passing an earlier level again opens nothing new")
def _():
    student = group().add_student()
    skill, slugs = a_skill(student)
    submit(student, skill, slugs, 0, passed=True)
    reply = submit(student, skill, slugs, 0, passed=True)
    equal(reply["unlockedLevel"], None, "unlockedLevel on a repeat pass")
    equal(progress(student)["skills"][skill]["level"], 1, "level after a repeat pass")


@test("the reported level is never below the highest level mastered")
def _():
    student = group().add_student()
    skill, slugs = a_skill(student)
    submit(student, skill, slugs, 2, passed=True)
    entry = progress(student)["skills"][skill]
    check(2 in entry["mastered"], f"level 2 mastered: {entry['mastered']}")
    check(entry["level"] >= 2, f"level {entry['level']} is below mastered level 2")


@test("awarded points are capped at 800 per problem answered, and never negative")
def _():
    student = group().add_student()
    skill, slugs = a_skill(student)
    equal(submit(student, skill, slugs, 0, answered=2, points=99_999)["points"], 1600,
          "points for 2 answers claiming 99,999")
    equal(submit(student, skill, slugs, 0, answered=0, points=99_999)["points"], 800,
          "points for 0 answers claiming 99,999")
    equal(submit(student, skill, slugs, 0, answered=5, points=-50)["points"], 0,
          "points claiming a negative score")


@test("a personal best is kept per skill and mode, and only a higher score replaces it")
def _():
    student = group().add_student()
    skill, slugs = a_skill(student)
    equal(submit(student, skill, slugs, 0, points=300)["newBest"], True, "first scored run")
    equal(submit(student, skill, slugs, 0, points=200)["newBest"], False, "a lower score")
    equal(submit(student, skill, slugs, 0, points=300)["newBest"], False, "an equal score")
    equal(submit(student, skill, slugs, 0, mode="practice", points=150)["newBest"], True,
          "first practice score, though lower than the trial best")
    equal(progress(student)["skills"][skill]["best"], {"trial": 300, "practice": 150},
          "bests by mode")
    equal(submit(student, skill, slugs, 0, points=450)["newBest"], True, "a higher score")
    equal(progress(student)["skills"][skill]["best"]["trial"], 450, "the trial best")


@test("problems solved add up across runs")
def _():
    student = group().add_student()
    skill, slugs = a_skill(student)
    submit(student, skill, slugs, 0, solved=10)
    submit(student, skill, slugs, 0, mode="practice", solved=5)
    equal(progress(student)["skills"][skill]["solved"], 15, "solved")


@test("a skill is done for the day only when its last level is passed in a Time Trial")
def _():
    student = group().add_student()
    skill, slugs = a_skill(student)
    last = len(slugs) - 1
    done = lambda: progress(student)["skills"][skill]["doneToday"]   # noqa: E731

    submit(student, skill, slugs, 0, passed=True)
    equal(done(), False, "done after passing the first level")
    submit(student, skill, slugs, last, mode="practice", passed=True)
    equal(done(), False, "done after passing the last level in practice")
    submit(student, skill, slugs, last, passed=False)
    equal(done(), False, "done after failing the last level's Time Trial")
    submit(student, skill, slugs, last, passed=True)
    equal(done(), True, "done after passing the last level's Time Trial")


def report(student, contributions):
    return student.post("/api/contributions", {"contributions": contributions}).ok("report")["bests"]


# requiem: review/contribution-best-reported
@test("a skill's best contribution to the Level only ever rises")
def _():
    student = group().add_student()
    skill, slugs = a_skill(student)
    submit(student, skill, slugs, 0, passed=True)
    equal(progress(student)["skills"][skill]["contributionBest"], None, "before any report")
    equal(report(student, {skill: 2.5}), {skill: 2.5}, "the first report")
    equal(report(student, {skill: 1.0}), {skill: 2.5}, "a lower report")
    equal(report(student, {skill: 3.0}), {skill: 3.0}, "a higher report")
    equal(progress(student)["skills"][skill]["contributionBest"], 3.0, "best in progress")


@test("a contribution for an unknown skill, or below zero, or absurdly large, is ignored")
def _():
    student = group().add_student()
    skill, _ = a_skill(student)
    equal(report(student, {"no-such-skill": 1.0, skill: -1.0}), {}, "unknown and negative")
    equal(report(student, {skill: 1e9}), {}, "absurdly large")
