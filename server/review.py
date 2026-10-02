"""When a finished skill is due for review.

Nothing here is stored but the moment each skill's review clock started
(review_clocks). Everything else is replayed from the runs already recorded,
so the rules below are the whole of review: change one and every student's
schedule follows it, with no stored state left believing the old rule.

    requiem: review/skill-review-schedule

  * Passing a finished skill's last level in a Time Trial is a review. The
    interval steps through 7, 14, 30, 60 and 120 days.
  * Any such pass restarts the clock, due or not -- but the interval grows
    at most once per interval, so a student replaying a skill daily keeps it
    fresh without inflating it (review/pass-restarts-review-clock).
  * A failed or quit attempt changes nothing; the skill stays due until it is
    passed (review/failed-review-leaves-due).
  * A day with a passed Time Trial in a skill that directly depends on this
    one postpones it, capped so it still gets a direct review eventually
    (review/dependent-work-credit).
  * At most two skills are tagged at once, most overdue first, and the most
    overdue of those is the one offered at the start of a session
    (review/review-tags-capped, review/review-opens-the-day).

Days are the student's local days (server/day-is-local).
"""
from __future__ import annotations

import json
import sqlite3
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone

import db

INTERVALS = (7, 14, 30, 60, 120)
#: Postponement per day of dependent work, as a share of the current interval.
CREDIT_SKILL_EDGE = 0.25      # the dependent skill builds on this one
CREDIT_LEVEL_EDGE = 0.50      # the level passed names this one outright
#: Postponement never exceeds the interval, so due is at most 2x away.
CREDIT_CAP = 1.0
MAX_TAGS = 2


@dataclass
class Review:
    due_on: date
    interval: int
    last_reviewed: date | None
    due: bool
    overdue_days: int
    tagged: bool = False
    #: Every review since the clock started, as (day, days past due that day);
    #: negative for a review done before it was due.
    history: list[tuple[date, int]] = field(default_factory=list)

    def public(self) -> dict:
        return {
            "dueOn": self.due_on.isoformat(),
            "intervalDays": self.interval,
            "lastReviewedOn": self.last_reviewed.isoformat() if self.last_reviewed else None,
            "due": self.due,
            "overdueDays": self.overdue_days,
            "tagged": self.tagged,
        }


def finished_skills(conn: sqlite3.Connection, user_id: int,
                    order: dict[str, list[str]]) -> set[str]:
    """Skills whose every level, as the catalogue stands now, is mastered.

    requiem: review/migrate-reads-slugs -- read from the slugs against the
    deployed order, never the integer list or level_count, both of which can
    be stale after a catalogue change.
    """
    done = set()
    for row in conn.execute(
            "SELECT skill_id, mastered_slugs FROM skill_progress WHERE user_id = ?", (user_id,)):
        slugs = order.get(row["skill_id"])
        if slugs and set(slugs) <= set(json.loads(row["mastered_slugs"] or "[]")):
            done.add(row["skill_id"])
    return done


def start_clocks(conn: sqlite3.Connection, user_id: int | None = None) -> int:
    """Give every finished skill that has no review clock one, starting now.

    requiem: review/migrate-without-loss

    On the first deploy that is every skill finished before review existed,
    so they are seeded from the deploy date rather than from when they were
    last played -- which would make most of them overdue at once -- and
    staggered a day apart, oldest finish first, so they come due one at a
    time. After that the only skill ever missing a clock is the one a run has
    just finished, and it starts at that moment. Safe to run repeatedly.
    """
    order = db.level_order()
    if not order:
        return 0
    users = ([user_id] if user_id is not None
             else [r["id"] for r in conn.execute("SELECT id FROM users")])
    now = datetime.now(timezone.utc).replace(microsecond=0)
    started = 0
    for uid in users:
        have = {r["skill_id"] for r in conn.execute(
            "SELECT skill_id FROM review_clocks WHERE user_id = ?", (uid,))}
        missing = finished_skills(conn, uid, order) - have
        if not missing:
            continue
        first_pass = {}
        for skill_id in missing:
            row = conn.execute(
                """SELECT MIN(ended_at) at FROM runs
                   WHERE user_id = ? AND skill_id = ? AND mode_id = 'trial' AND passed = 1
                     AND level_slug = ?""",
                (uid, skill_id, order[skill_id][-1])).fetchone()
            first_pass[skill_id] = row["at"] or "~"          # never passed: last
        for k, skill_id in enumerate(sorted(missing, key=lambda s: (first_pass[s], s))):
            conn.execute(
                "INSERT INTO review_clocks (user_id, skill_id, started_at) VALUES (?, ?, ?)",
                (uid, skill_id, (now + timedelta(days=k)).isoformat()))
            started += 1
    return started


def schedule(conn: sqlite3.Connection, user_id: int) -> dict[str, Review]:
    """The review state of every finished skill with a clock, keyed by skill."""
    order = db.level_order()
    graph = db.library_graph()
    if not order:
        return {}
    finished = finished_skills(conn, user_id, order)
    clocks = {r["skill_id"]: r["started_at"] for r in conn.execute(
        "SELECT skill_id, started_at FROM review_clocks WHERE user_id = ?", (user_id,))}

    # Every passed Time Trial, as (skill, level slug, local day).
    passes = [(r["skill_id"], r["level_slug"], date.fromisoformat(db.local_day(r["ended_at"])))
              for r in conn.execute(
                  """SELECT skill_id, level_slug, ended_at FROM runs
                     WHERE user_id = ? AND mode_id = 'trial' AND passed = 1
                     ORDER BY ended_at, id""", (user_id,))]

    today = db.today()
    out: dict[str, Review] = {}
    for skill_id in finished & clocks.keys():
        out[skill_id] = _replay(skill_id, order[skill_id][-1],
                                date.fromisoformat(db.local_day(clocks[skill_id])),
                                passes, graph, today)

    due = sorted((s for s, r in out.items() if r.due),
                 key=lambda s: (-out[s].overdue_days, out[s].due_on, s))
    for skill_id in due[:MAX_TAGS]:
        out[skill_id].tagged = True
    return out


def offer(reviews: dict[str, Review]) -> str | None:
    """The one review offered at the start of a session: the most overdue."""
    tagged = [s for s, r in reviews.items() if r.tagged]
    return min(tagged, key=lambda s: (-reviews[s].overdue_days, reviews[s].due_on, s),
               default=None)


# requiem: review/prompts-record-origin
#: Where a run was started from, when it was started from a review prompt.
#: Recorded so the teacher can see whether the offer is what gets reviews done.
ORIGINS = ("review-offer", "review-warmup")
HEALTH_DAYS = 30


def health(conn: sqlite3.Connection, user_id: int) -> dict:
    """How review is going for one student, for the teacher console.

    requiem: review/measure-review-health

    The measure that decides review/turn-on-decay: whether finished skills
    get reviewed, and whether they are reviewed while due or only by chance.
    Replayed like everything else here, so it covers the time before this
    view existed as well as after.
    """
    reviews = schedule(conn, user_id)
    today = db.today()
    since = today - timedelta(days=HEALTH_DAYS)
    recent = [(skill_id, day, overdue) for skill_id, r in reviews.items()
              for day, overdue in r.history if day > since]
    when_due = sorted(o for _, _, o in recent if o >= 0)

    offer_runs = [dict(r) for r in conn.execute(
        """SELECT origin, passed, ended_at FROM runs
           WHERE user_id = ? AND origin IS NOT NULL""", (user_id,))]
    offer_runs = [r for r in offer_runs
                  if date.fromisoformat(db.local_day(r["ended_at"])) > since]

    def started(origin):
        return sum(r["origin"] == origin for r in offer_runs)

    def passed(origin):
        return sum(r["origin"] == origin and r["passed"] for r in offer_runs)

    return {
        "days": HEALTH_DAYS,
        "finished": len(reviews),
        "due": sum(r.due for r in reviews.values()),
        "reviews": len(recent),
        "reviewsWhenDue": len(when_due),
        "medianOverdueDays": when_due[len(when_due) // 2] if when_due else None,
        "offerStarted": started("review-offer"),
        "offerPassed": passed("review-offer"),
        "warmupStarted": started("review-warmup"),
        "warmupPassed": passed("review-warmup"),
        "skills": sorted(({"skillId": s, **r.public()} for s, r in reviews.items()),
                         key=lambda x: (not x["due"], -x["overdueDays"], x["dueOn"], x["skillId"])),
    }


def _replay(skill_id: str, last_slug: str, start: date, passes, graph, today: date) -> Review:
    step = 0
    anchor = start           # the clock runs from here
    grown = start            # when the interval last stepped up
    credit = 0.0             # days of postponement earned since the anchor
    reviewed = None
    history: list[tuple[date, int]] = []

    by_day: dict[date, list[tuple[str, str]]] = {}
    for s, slug, day in passes:
        if day > start:
            by_day.setdefault(day, []).append((s, slug))

    for day in sorted(by_day):
        interval = INTERVALS[step]
        runs = by_day[day]
        if (skill_id, last_slug) in runs:
            due_then = anchor + timedelta(days=interval + int(credit))
            history.append((day, (day - due_then).days))
            # requiem: review/pass-restarts-review-clock
            if (day - grown).days >= interval:
                step = min(step + 1, len(INTERVALS) - 1)
                grown = day
            anchor, credit, reviewed = max(anchor, day), 0.0, day
            continue
        if day <= anchor:
            continue
        # requiem: review/dependent-work-credit
        weights = [CREDIT_LEVEL_EDGE if skill_id in graph.get(s, {}).get("levels", {}).get(slug, [])
                   else CREDIT_SKILL_EDGE
                   for s, slug in runs if skill_id in graph.get(s, {}).get("dependsOn", [])]
        if weights:
            credit = min(credit + max(weights) * interval, CREDIT_CAP * interval)

    interval = INTERVALS[step]
    due_on = anchor + timedelta(days=interval + int(credit))
    overdue = (today - due_on).days
    return Review(due_on=due_on, interval=interval, last_reviewed=reviewed,
                  due=overdue >= 0, overdue_days=max(overdue, 0), history=history)
