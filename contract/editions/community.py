"""The community edition, as the contract suite sees it.

An edition adapter answers two questions the API itself cannot: how to get a
fresh, isolated group (a teacher signed in, no students), and how to add a
student to it. Everything else the suite does through the API.

The community edition serves one household per install
(server/one-household-per-install), so a fresh group is a fresh server: a
real uvicorn process over a throwaway database, the same code the home
server runs. That costs a second or so per group, which is the price of
testing the thing itself rather than a drawing of it.
"""
from __future__ import annotations

import atexit
import itertools
import os
import shutil
import socket
import sqlite3
import subprocess
import sys
import tempfile
import time
import urllib.request
from datetime import datetime, timedelta
from pathlib import Path

from ..harness import CORE, PIN_ACCOUNTS, TIME_TRAVEL, Client

ROOT = Path(__file__).resolve().parents[2]
PIN = "1234"
ICON = "🦊"
ACCENT = "#35d6ff"


class Unavailable(RuntimeError):
    """The server cannot be started here (no framework installed)."""


def _interpreter() -> str:
    """A Python that can import the server's framework."""
    probe = "import fastapi, uvicorn"
    for candidate in (sys.executable, str(ROOT / ".venv" / "bin" / "python")):
        if Path(candidate).exists() and subprocess.run(
                [candidate, "-c", probe], capture_output=True).returncode == 0:
            return candidate
    raise Unavailable("the web framework is not installed for this interpreter")


def _free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


class Server:
    def __init__(self, python: str):
        self.work = Path(tempfile.mkdtemp(prefix="versine-contract-"))
        self.port = _free_port()
        self.url = f"http://127.0.0.1:{self.port}"
        env = dict(os.environ, VERSINE_DB=str(self.work / "progress.db"),
                   VERSINE_VERSION="contract")
        self.log = open(self.work / "server.log", "wb")
        self.proc = subprocess.Popen(
            [python, "-m", "uvicorn", "app:app", "--host", "127.0.0.1",
             "--port", str(self.port), "--log-level", "warning"],
            cwd=ROOT / "server", env=env, stdout=self.log, stderr=subprocess.STDOUT)

    def wait(self, timeout: float = 30) -> None:
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            if self.proc.poll() is not None:
                raise RuntimeError(f"server exited: {(self.work / 'server.log').read_text()}")
            try:
                urllib.request.urlopen(self.url + "/api/health", timeout=1)
                return
            except OSError:
                time.sleep(0.05)
        raise RuntimeError(f"server did not answer within {timeout}s")

    def stop(self) -> None:
        self.proc.terminate()
        try:
            self.proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            self.proc.kill()
        self.log.close()
        shutil.rmtree(self.work, ignore_errors=True)


class Group:
    def __init__(self, url: str):
        self.url = url
        self._names = itertools.count(1)
        self.teacher = Client(url)
        reply = self.teacher.post("/api/setup", {"name": "teacher", "pin": PIN,
                                                 "icon": ICON, "accent": ACCENT})
        self.teacher.me = reply.ok("setting up the teacher")["me"]

    def add_student(self, name: str | None = None, zone: str | None = "UTC") -> Client:
        student = Client(self.url, zone=zone)
        reply = student.post("/api/profiles", {
            "name": name or f"student{next(self._names)}",
            "pin": PIN, "icon": ICON, "accent": ACCENT})
        student.me = reply.ok("adding a student")["me"]
        return student


class Edition:
    name = "the community edition"
    suites = {CORE, PIN_ACCOUNTS, TIME_TRAVEL}

    # PIN-account details the pin-accounts suite needs to drive sign-up.
    pin = PIN
    icon = ICON
    accent = ACCENT

    def __init__(self, spare: int = 3):
        self.python = _interpreter()
        self.servers: list[Server] = []
        # Servers are started ahead of need, so a test rarely waits on one.
        self.spare = spare
        self.ready: list[Server] = []
        atexit.register(self.close)
        self._top_up()

    def _top_up(self) -> None:
        while len(self.ready) < self.spare:
            server = Server(self.python)
            self.servers.append(server)
            self.ready.append(server)

    def empty_server(self) -> str:
        """The URL of a server nobody has set up yet."""
        server = self.ready.pop(0)
        self._top_up()
        server.wait()
        return server.url

    # Every timestamp the server keeps for a student, as (table, column).
    AGED = (("runs", "ended_at"), ("attempts", "at"), ("review_clocks", "started_at"),
            ("contribution_bests", "achieved_at"))

    def age(self, student: Client, days: int) -> None:
        """Move every timestamp of this student `days` into the past.

        The time-travel suite plays a timeline out in order -- finish a
        skill, age a week, pass something -- and reads the result as of now.
        Done in the server's own database, which is what only an edition's
        adapter can reach.
        """
        server = next(s for s in self.servers if s.url == student.base_url)
        conn = sqlite3.connect(server.work / "progress.db", timeout=10)
        try:
            for table, col in self.AGED:
                rows = conn.execute(f"SELECT rowid, {col} FROM {table} WHERE user_id = ?",
                                    (student.me["id"],)).fetchall()
                for rowid, stamp in rows:
                    moved = datetime.fromisoformat(stamp) - timedelta(days=days)
                    conn.execute(f"UPDATE {table} SET {col} = ? WHERE rowid = ?",
                                 (moved.isoformat(timespec="seconds"), rowid))
            conn.commit()
        finally:
            conn.close()

    def new_group(self) -> Group:
        return Group(self.empty_server())

    def close(self) -> None:
        for server in self.servers:
            server.stop()
        self.servers.clear()
        self.ready.clear()
