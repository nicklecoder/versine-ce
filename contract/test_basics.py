"""Health, the static app, and who may call what."""
from __future__ import annotations

from .context import a_skill, group, summary
from .harness import Client, check, equal, has_keys, test


@test("health answers without signing in and names the version serving")
def _():
    g = group()
    body = Client(g.url).get("/api/health").ok("health")
    equal(body.get("ok"), True, "health ok")
    check(isinstance(body.get("version"), str) and body["version"],
          f"health version: got {body.get('version')!r}")


@test("the browser app and its library are served from the same origin")
def _():
    g = group()
    page = Client(g.url).get("/")
    equal(page.status, 200, "GET /")
    check("html" in page.content_type, f"GET / content type: {page.content_type!r}")
    manifest = Client(g.url).get("/library/manifest.json").ok("the library manifest")
    has_keys(manifest, {"order"}, "manifest")
    check(manifest["order"] and all(isinstance(v, list) for v in manifest["order"].values()),
          "manifest order maps each skill to its list of level slugs")


@test("every student endpoint refuses a caller who is not signed in")
def _():
    g = group()
    skill, slugs = a_skill(g.teacher)
    stranger = Client(g.url)
    run = {"skill_id": skill, "level": 0, "level_slug": slugs[0],
           "level_count": len(slugs), "mode_id": "trial", "summary": summary()}
    for method, path, body in [
        ("GET", "/api/progress", None),
        ("POST", "/api/runs", run),
        ("GET", f"/api/activity?skill_id={skill}", None),
        ("GET", f"/api/leaderboard?skill_id={skill}&mode_id=trial", None),
        ("GET", "/api/teacher/overview", None),
        ("GET", f"/api/teacher/students/{g.teacher.me['id']}", None),
        ("DELETE", f"/api/teacher/users/{g.teacher.me['id']}", None),
    ]:
        equal(stranger.call(method, path, body).status, 401, f"{method} {path} signed out")


@test("teacher endpoints refuse a student")
def _():
    g = group()
    student = g.add_student()
    other = g.add_student()
    for method, path in [
        ("GET", "/api/teacher/overview"),
        ("GET", f"/api/teacher/students/{other.me['id']}"),
        ("DELETE", f"/api/teacher/users/{other.me['id']}"),
    ]:
        equal(student.call(method, path).status, 403, f"{method} {path} as a student")
    # And the refused delete really did nothing.
    equal(other.get("/api/progress").status, 200, "the other student still signed in")
