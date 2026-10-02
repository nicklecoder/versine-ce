"""What a contract test can reach: the edition under test, and helpers over it.

The edition adapter is the only edition-specific code. Everything a test
needs beyond it -- the catalogue, a finished run -- it gets through the API,
the same way the browser app does.
"""
from __future__ import annotations

from .harness import Client

#: Set by run_all() before any test runs.
EDITION = None

_manifest: dict | None = None


def group():
    """A fresh, isolated group: a teacher signed in and no students yet."""
    return EDITION.new_group()


def catalogue(client: Client) -> dict[str, list[str]]:
    """{skill_id: [level slug, ...]} as the server publishes it."""
    global _manifest
    if _manifest is None:
        _manifest = client.get("/library/manifest.json").ok("the library manifest")
    return _manifest["order"]


def a_skill(client: Client, levels: int = 3) -> tuple[str, list[str]]:
    """A real skill with at least `levels` levels, the same one every time."""
    for skill_id, slugs in sorted(catalogue(client).items()):
        if len(slugs) >= levels:
            return skill_id, slugs
    raise AssertionError(f"the catalogue has no skill with {levels} levels")


def summary(**kw) -> dict:
    base = dict(solved=10, cleanSolved=10, answered=12, misses=2, accuracy=0.83,
                bestStreak=5, points=100, avgSeconds=4.0, passed=False)
    base.update(kw)
    return base


def submit(client: Client, skill: str, slugs: list[str], level: int, *,
           mode: str = "trial", duration: int = 0, attempts: list[dict] | None = None,
           **summary_kw) -> dict:
    """Submit a finished run, the way the browser does, and return the reply."""
    body = {
        "skill_id": skill,
        "level": level,
        "level_slug": slugs[level],
        "level_count": len(slugs),
        "mode_id": mode,
        "duration": duration,
        "summary": summary(**summary_kw),
        "attempts": attempts or [],
    }
    return client.post("/api/runs", body).ok(f"submitting {skill} level {level}")


def answers(*correct: bool, ms: int = 1000) -> list[dict]:
    """Attempt rows, one per answer, in the order they were given."""
    return [{"prompt": f"q{i}", "expected": "a", "correct": c, "ms": ms}
            for i, c in enumerate(correct)]


def progress(client: Client) -> dict:
    return client.get("/api/progress").ok("reading progress")
