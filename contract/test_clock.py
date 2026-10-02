"""The Time Trial clock: how it adapts to each result, and where it is kept.

The numbers are pinned exactly. A second server that calibrated clocks a
little differently would quietly make the same level harder or easier for
a student depending on which edition they use (play/clock/asymmetric-adaptation).
"""
from __future__ import annotations

from .context import a_skill, group, progress, submit
from .harness import equal, test


def trial(student, *, duration, passed, time_left=None, target=10, level=0):
    skill, slugs = a_skill(student)
    return submit(student, skill, slugs, level, duration=duration, passed=passed,
                  target=target, timeLeft=time_left)


@test("running out of time loosens the clock by 15%")
def _():
    reply = trial(group().add_student(), duration=100, passed=False, time_left=0)
    equal(reply["clockWas"], 100, "clockWas")
    equal(reply["clockNext"], 115, "clock after running out of time")


@test("finishing with more than 20% of the clock to spare tightens it by 10%")
def _():
    equal(trial(group().add_student(), duration=100, passed=True, time_left=30)["clockNext"],
          90, "clock after finishing with 30% spare")


@test("finishing with 20% or less to spare leaves the clock alone")
def _():
    equal(trial(group().add_student(), duration=100, passed=True, time_left=20)["clockNext"],
          100, "clock after finishing with exactly 20% spare")


@test("the clock is rounded to a multiple of 5 seconds")
def _():
    # 47s * 1.15 = 54.05s, which shows as 55.
    equal(trial(group().add_student(), duration=47, passed=False, time_left=0)["clockNext"],
          55, "clock after loosening 47s")


@test("the clock never demands faster than 3s a problem, and says when it is there")
def _():
    # 30s for 10 problems is the floor; tightening would take it to 27 -> 25.
    reply = trial(group().add_student(), duration=30, passed=True, time_left=20)
    equal(reply["clockNext"], 30, "clock tightened at the floor")
    equal(reply["clockAtFloor"], True, "clockAtFloor at the floor")
    equal(trial(group().add_student(), duration=100, passed=False, time_left=0)["clockAtFloor"],
          False, "clockAtFloor well above the floor")


@test("the clock never allows slower than 40s a problem")
def _():
    # 400s for 10 problems is the ceiling; loosening would take it to 460.
    equal(trial(group().add_student(), duration=400, passed=False, time_left=0)["clockNext"],
          400, "clock loosened at the ceiling")


@test("each student's clock is kept per level and counts the trials behind it")
def _():
    student = group().add_student()
    skill, _ = a_skill(student)
    trial(student, duration=100, passed=False, time_left=0)
    equal(progress(student)["clocks"], {f"{skill}:0": {"duration": 115, "runs": 1}},
          "clocks after one trial")
    trial(student, duration=115, passed=True, time_left=50)
    equal(progress(student)["clocks"][f"{skill}:0"], {"duration": 105, "runs": 2},
          "clock after a second trial")


@test("practice and untimed runs leave the clock untouched")
def _():
    student = group().add_student()
    skill, slugs = a_skill(student)
    practice = submit(student, skill, slugs, 0, mode="practice", duration=100, passed=True)
    equal((practice["clockWas"], practice["clockNext"], practice["clockAtFloor"]),
          (100, None, False), "clock fields after a practice run")
    untimed = submit(student, skill, slugs, 0, duration=0, passed=True)
    equal((untimed["clockWas"], untimed["clockNext"], untimed["clockAtFloor"]),
          (None, None, False), "clock fields after an untimed trial")
    equal(progress(student)["clocks"], {}, "clocks")
