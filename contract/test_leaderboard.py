"""Leaderboards: students only, best score first, and never beyond the group."""
from __future__ import annotations

from .context import a_skill, group, submit
from .harness import equal, has_keys, test


def board(client, skill, mode="trial"):
    return client.get(f"/api/leaderboard?skill_id={skill}&mode_id={mode}").ok("leaderboard")


@test("a leaderboard ranks the group's students by their best score")
def _():
    g = group()
    ana, bo, cy = (g.add_student(n) for n in ("ana", "bo", "cy"))
    skill, slugs = a_skill(ana)
    submit(ana, skill, slugs, 0, points=300)
    submit(bo, skill, slugs, 0, points=500)
    submit(cy, skill, slugs, 0, points=100)
    submit(cy, skill, slugs, 0, points=400)          # cy's best replaces their first
    submit(cy, skill, slugs, 0, points=50)           # and a worse run changes nothing
    rows = board(ana, skill)
    for row in rows:
        has_keys(row, {"name", "accent", "points", "level"}, "leaderboard row")
    equal([(r["name"], r["points"]) for r in rows], [("bo", 500), ("cy", 400), ("ana", 300)],
          "leaderboard")


@test("teachers are never on a leaderboard")
def _():
    g = group()
    student = g.add_student("ana")
    skill, slugs = a_skill(student)
    submit(g.teacher, skill, slugs, 0, points=999)
    submit(student, skill, slugs, 0, points=100)
    equal([r["name"] for r in board(student, skill)], ["ana"], "leaderboard names")


@test("a leaderboard is per mode")
def _():
    g = group()
    student = g.add_student("ana")
    skill, slugs = a_skill(student)
    submit(student, skill, slugs, 0, mode="practice", points=100)
    equal(board(student, skill, "trial"), [], "trial leaderboard after only practice")
    equal([r["points"] for r in board(student, skill, "practice")], [100], "practice leaderboard")


# requiem: play/comparisons-stay-in-the-group
@test("a leaderboard never shows students from another group")
def _():
    mine, theirs = group(), group()
    me = mine.add_student("ana")
    stranger = theirs.add_student("zed")
    skill, slugs = a_skill(me)
    submit(stranger, skill, slugs, 0, points=999)
    submit(me, skill, slugs, 0, points=100)
    equal([r["name"] for r in board(me, skill)], ["ana"], "my group's leaderboard")
    equal([r["name"] for r in board(stranger, skill)], ["zed"], "their group's leaderboard")
