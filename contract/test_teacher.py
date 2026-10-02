"""The teacher console: the group's students, one student in detail, removal."""
from __future__ import annotations

from .context import a_skill, answers, group, submit
from .harness import check, equal, has_keys, test

OVERVIEW_KEYS = {"id", "name", "role", "accent", "icon", "attempts", "correct", "accuracy",
                 "avgSeconds", "lastActive", "attemptsThisWeek", "reviewsDue", "reviews30d"}
DETAIL_KEYS = {"student", "bySkill", "runs", "daily", "progress", "levels", "clocks",
               "reviewHealth"}


def overview(g):
    return g.teacher.get("/api/teacher/overview").ok("teacher overview")


@test("the overview lists the group's students, by name, and no teachers")
def _():
    g = group()
    bo, ana = g.add_student("bo"), g.add_student("ana")
    skill, slugs = a_skill(ana)
    submit(ana, skill, slugs, 0, attempts=answers(True, True, False, True, ms=2000))
    rows = overview(g)
    for row in rows:
        has_keys(row, OVERVIEW_KEYS, "overview row")
    equal([r["name"] for r in rows], ["ana", "bo"], "overview names")
    a, b = rows
    equal((a["attempts"], a["correct"], a["accuracy"], a["avgSeconds"], a["attemptsThisWeek"]),
          (4, 3, 0.75, 2.0, 4), "ana's totals")
    check(isinstance(a["lastActive"], str), f"ana's lastActive: {a['lastActive']!r}")
    equal((b["attempts"], b["accuracy"], b["lastActive"]), (0, 0.0, None),
          "bo, who has not played")
    equal(bo.me["id"], b["id"], "bo's id")


@test("a student's detail carries their runs, history, progress, levels and clocks")
def _():
    g = group()
    student = g.add_student()
    skill, slugs = a_skill(student)
    submit(student, skill, slugs, 0, passed=True, duration=100, target=10, timeLeft=0,
           attempts=answers(True, False))
    detail = g.teacher.get(f"/api/teacher/students/{student.me['id']}").ok("student detail")
    has_keys(detail, DETAIL_KEYS, "student detail")
    equal(detail["student"]["id"], student.me["id"], "the student")
    equal(len(detail["runs"]), 1, "runs")
    equal([(r["skill_id"], r["level"], r["attempts"], r["correct"]) for r in detail["bySkill"]],
          [(skill, 0, 2, 1)], "by skill")
    equal([(d["attempts"], d["correct"]) for d in detail["daily"]], [(2, 1)], "daily")
    equal(detail["progress"]["skills"][skill]["mastered"], [0], "progress")
    equal(len(detail["levels"]), 1, "levels")
    equal(list(detail["clocks"]), [f"{skill}:0"], "clocks")


@test("a student's detail shows their 20 latest runs, newest first")
def _():
    # Submitted back to back, most of these end within the same second, so
    # the order has to come from more than the timestamp.
    g = group()
    student = g.add_student()
    skill, slugs = a_skill(student)
    for points in range(1, 22):
        submit(student, skill, slugs, 0, points=points)
    detail = g.teacher.get(f"/api/teacher/students/{student.me['id']}").ok("student detail")
    equal([r["points"] for r in detail["runs"]], list(range(21, 1, -1)),
          "runs shown, by the points that tell them apart")


@test("a teacher cannot see a student outside their group")
def _():
    mine, theirs = group(), group()
    stranger = theirs.add_student()
    equal(mine.teacher.get(f"/api/teacher/students/{stranger.me['id']}").status, 404,
          "another group's student")
    equal(mine.teacher.get("/api/teacher/students/999999").status, 404, "a student who never was")
    equal(overview(mine), [], "my overview")


@test("removing a student erases them and ends their session")
def _():
    g = group()
    student = g.add_student()
    skill, slugs = a_skill(student)
    submit(student, skill, slugs, 0, attempts=answers(True))
    equal(g.teacher.delete(f"/api/teacher/users/{student.me['id']}").status, 200, "delete")
    equal(overview(g), [], "overview after removal")
    equal(g.teacher.get(f"/api/teacher/students/{student.me['id']}").status, 404,
          "detail after removal")
    equal(student.get("/api/progress").status, 401, "the removed student's session")


@test("a teacher cannot remove themselves")
def _():
    g = group()
    equal(g.teacher.delete(f"/api/teacher/users/{g.teacher.me['id']}").status, 400,
          "deleting yourself")
    equal(g.teacher.get("/api/teacher/overview").status, 200, "still signed in")
