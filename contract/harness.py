"""The contract suite's test harness and HTTP client.

Standard library only: the suite has to run against any server that claims
to implement the API, from any machine, so it can assume nothing but Python
(server/no-new-prod-deps-for-tests). It talks to the server exactly as the
browser does -- JSON over HTTP, a session cookie, a time zone header -- and
never reaches into its storage.
"""
from __future__ import annotations

import http.cookiejar
import json
import traceback
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from typing import Any, Callable

# ── Tests ────────────────────────────────────────────────────────────────────
#: Every server runs "core". Optional suites cover parts of the API that an
#: edition may legitimately replace -- an edition declares which it serves.
CORE = "core"
PIN_ACCOUNTS = "pin-accounts"

TESTS: list[tuple[str, str, Callable]] = []


def test(name: str, suite: str = CORE):
    def wrap(fn):
        TESTS.append((suite, name, fn))
        return fn
    return wrap


class ContractFailure(AssertionError):
    pass


def check(condition: bool, message: str) -> None:
    if not condition:
        raise ContractFailure(message)


def equal(got: Any, want: Any, what: str) -> None:
    if got != want:
        raise ContractFailure(f"{what}: got {got!r}, want {want!r}")


def has_keys(obj: Any, keys: set[str], what: str) -> None:
    check(isinstance(obj, dict), f"{what}: expected an object, got {type(obj).__name__}")
    missing = keys - obj.keys()
    check(not missing, f"{what}: missing {sorted(missing)}")


# ── HTTP ─────────────────────────────────────────────────────────────────────
@dataclass
class Reply:
    status: int
    body: Any
    content_type: str = ""
    headers: dict = field(default_factory=dict)       # lower-cased names

    def ok(self, what: str) -> Any:
        """The body of a 200, or a failure naming what was being attempted."""
        if self.status != 200:
            raise ContractFailure(f"{what}: HTTP {self.status} {self.body!r}")
        return self.body


class Client:
    """One browser: its own cookies, its own time zone."""

    def __init__(self, base_url: str, zone: str | None = "UTC"):
        self.base_url = base_url.rstrip("/")
        self.zone = zone
        self.me: dict | None = None
        self._opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))

    def call(self, method: str, path: str, body: Any = None, zone: str | None = ...,
             headers: dict | None = None) -> Reply:
        headers = dict(headers or {})
        zone = self.zone if zone is ... else zone
        if zone:
            headers["X-Versine-Time-Zone"] = zone
        data = None
        if body is not None:
            headers["Content-Type"] = "application/json"
            data = json.dumps(body).encode()
        request = urllib.request.Request(self.base_url + path, data=data,
                                         headers=headers, method=method)
        try:
            with self._opener.open(request, timeout=30) as res:
                return _reply(res.status, res.read(), res.headers)
        except urllib.error.HTTPError as err:
            return _reply(err.code, err.read(), err.headers)

    def get(self, path: str, **kw) -> Reply:
        return self.call("GET", path, **kw)

    def post(self, path: str, body: Any = None, **kw) -> Reply:
        return self.call("POST", path, {} if body is None else body, **kw)

    def delete(self, path: str, **kw) -> Reply:
        return self.call("DELETE", path, **kw)


def _reply(status: int, raw: bytes, message) -> Reply:
    headers = {k.lower(): v for k, v in message.items()}
    content_type = headers.get("content-type", "")
    if "json" in content_type:
        try:
            return Reply(status, json.loads(raw or b"null"), content_type, headers)
        except ValueError:
            pass
    return Reply(status, raw.decode("utf-8", "replace"), content_type, headers)


# ── Running ──────────────────────────────────────────────────────────────────
def run_all(edition, only: str | None = None) -> int:
    """Run every test the edition serves; return the number that failed."""
    from . import context
    context.EDITION = edition

    chosen = [(s, n, f) for s, n, f in TESTS
              if s in edition.suites and (only is None or only in n)]
    skipped = sorted({s for s, _, _ in TESTS} - set(edition.suites))
    failed = []
    for suite, name, fn in chosen:
        try:
            fn()
        except ContractFailure as exc:
            failed.append((suite, name, str(exc)))
        except Exception:                                     # noqa: BLE001
            failed.append((suite, name, traceback.format_exc(limit=3).strip()))

    if failed:
        print(f"{len(failed)} contract check(s) failed against {edition.name}:")
        for suite, name, why in failed:
            print(f"  ✗ [{suite}] {name}")
            for line in why.splitlines():
                print(f"      {line}")
    else:
        note = f"; not served: {', '.join(skipped)}" if skipped else ""
        print(f"contract: {len(chosen)} checks passed against {edition.name}"
              f" — suites {', '.join(sorted(edition.suites))}{note}")
    return len(failed)
