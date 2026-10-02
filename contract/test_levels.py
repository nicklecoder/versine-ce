"""Per-level pace and accuracy, the figures the browser computes Level from."""
from __future__ import annotations

from .context import a_skill, answers, group, progress, submit
from .harness import equal, has_keys, test

LEVEL_KEYS = {"skillId", "level", "attempts", "correct", "accuracy", "medianSeconds",
              "sampleSize", "lifetimeAccuracy", "fastSeconds", "slowSeconds",
              "firstSeen", "lastSeen", "trend"}


def stats(student, skill, level=0):
    for row in progress(student)["levels"]:
        if (row["skillId"], row["level"]) == (skill, level):
            return row
    raise AssertionError(f"no level stats for {skill} level {level}")


@test("headline accuracy describes the last 40 answers, in the order they were given")
def _():
    # rating/rating-weights-and-quality: 'last 40' is insertion order, and every
    # answer in one run shares a timestamp, so time alone cannot order them.
    student = group().add_student()
    skill, slugs = a_skill(student)
    submit(student, skill, slugs, 0, attempts=answers(*[False] * 40 + [True] * 40))
    row = stats(student, skill)
    has_keys(row, LEVEL_KEYS, "level stats")
    equal((row["attempts"], row["correct"]), (80, 40), "lifetime attempts and correct")
    equal(row["sampleSize"], 40, "sampleSize")
    equal(row["accuracy"], 1.0, "accuracy over the last 40 answers")
    equal(row["lifetimeAccuracy"], 0.5, "lifetime accuracy")


@test("pace is the median time of correct answers, so a wrong answer or outlier cannot drag it")
def _():
    # rating/median-not-mean
    student = group().add_student()
    skill, slugs = a_skill(student)
    attempts = [{"prompt": "q", "expected": "a", "correct": c, "ms": ms}
                for c, ms in [(True, 1000), (True, 2000), (True, 900_000), (False, 50)]]
    submit(student, skill, slugs, 0, attempts=attempts)
    row = stats(student, skill)
    equal(row["medianSeconds"], 2.0, "median seconds")
    equal(len(row["trend"]), 1, "trend days")
    has_keys(row["trend"][0], {"day", "attempts", "accuracy", "medianSeconds"}, "trend day")
    equal((row["trend"][0]["attempts"], row["trend"][0]["accuracy"]), (4, 0.75),
          "trend attempts and accuracy")


@test("a level with no correct answers has no pace rather than a zero one")
def _():
    student = group().add_student()
    skill, slugs = a_skill(student)
    submit(student, skill, slugs, 0, attempts=answers(False, False))
    row = stats(student, skill)
    equal((row["medianSeconds"], row["fastSeconds"], row["slowSeconds"], row["accuracy"]),
          (None, None, None, 0.0), "pace and accuracy with nothing right")
