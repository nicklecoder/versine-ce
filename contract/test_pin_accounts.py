"""PIN sign-in: first-run setup, self-serve profiles, login, lockout, logout.

Optional: an edition may replace sign-in through the browser app's
authentication provider (server/extensions/extension-points), and then
serves the core suite without this one. These tests need a server nobody
has set up yet, and the PIN, icon and colour the edition accepts.
"""
from __future__ import annotations

from . import context
from .harness import PIN_ACCOUNTS, Client, check, equal, test


def fresh():
    e = context.EDITION
    return Client(e.empty_server()), e


def account(e, name, **kw):
    return {"name": name, "pin": e.pin, "icon": e.icon, "accent": e.accent, **kw}


@test("an empty server asks for setup, and setup makes the first account a teacher", PIN_ACCOUNTS)
def _():
    client, e = fresh()
    equal(client.get("/api/bootstrap").ok("bootstrap"),
          {"needs_setup": True, "users": [], "me": None}, "bootstrap on an empty server")
    me = client.post("/api/setup", account(e, "Mum")).ok("setup")["me"]
    equal((me["name"], me["role"]), ("Mum", "teacher"), "the first account")
    boot = client.get("/api/bootstrap").ok("bootstrap after setup")
    equal((boot["needs_setup"], boot["me"]["id"]), (False, me["id"]), "bootstrap after setup")
    equal(Client(client.base_url).post("/api/setup", account(e, "Dad")).status, 409,
          "a second setup")


@test("a new account needs a 4-digit PIN and one of the offered icons and colours", PIN_ACCOUNTS)
def _():
    client, e = fresh()
    for what, body in [("a 3-digit PIN", account(e, "x", pin="123")),
                       ("a PIN of letters", account(e, "x", pin="abcd")),
                       ("an icon not offered", account(e, "x", icon="<script>")),
                       ("a colour not offered", account(e, "x", accent="#000001"))]:
        equal(client.post("/api/setup", body).status, 400, what)
    for what, body in [("an empty name", account(e, "")),
                       ("a name over 16 characters", account(e, "x" * 17))]:
        equal(client.post("/api/setup", body).status, 422, what)
    equal(client.get("/api/bootstrap").ok("bootstrap")["needs_setup"], True,
          "nothing was created")


# requiem: server/accounts-self-serve-students
@test("anyone can make a profile, and a profile is always a student", PIN_ACCOUNTS)
def _():
    client, e = fresh()
    client.post("/api/setup", account(e, "Mum")).ok("setup")
    kid = Client(client.base_url)
    me = kid.post("/api/profiles", account(e, "kid", role="teacher")).ok("profile")["me"]
    equal(me["role"], "student", "a self-made profile's role")
    equal(kid.get("/api/progress").status, 200, "the new profile is signed in")
    equal(Client(client.base_url).post("/api/profiles", account(e, "kid")).status, 409,
          "a name already taken")


@test("the user list puts teachers first, then everyone by name", PIN_ACCOUNTS)
def _():
    client, e = fresh()
    client.post("/api/setup", account(e, "Zoe")).ok("setup")
    for name in ("bo", "ana"):
        Client(client.base_url).post("/api/profiles", account(e, name)).ok(f"profile {name}")
    users = Client(client.base_url).get("/api/bootstrap").ok("bootstrap")["users"]
    equal([(u["name"], u["role"]) for u in users],
          [("Zoe", "teacher"), ("ana", "student"), ("bo", "student")], "the user list")
    check(all(set(u) == {"id", "name", "role", "accent", "icon"} for u in users),
          f"users carry only their public fields: {users}")


# requiem: server/pin-threat-model
@test("signing in takes the right PIN, and five wrong tries lock the account", PIN_ACCOUNTS)
def _():
    client, e = fresh()
    teacher = client.post("/api/setup", account(e, "Mum")).ok("setup")["me"]
    wrong = "0000" if e.pin != "0000" else "1111"
    door = Client(client.base_url)
    equal(door.post("/api/login", {"user_id": teacher["id"], "pin": wrong}).status, 401,
          "a wrong PIN")
    me = door.post("/api/login", {"user_id": teacher["id"], "pin": e.pin}).ok("login")["me"]
    equal(me["id"], teacher["id"], "signed in as")
    equal(door.get("/api/teacher/overview").status, 200, "the session works")

    for _ in range(5):
        door.post("/api/login", {"user_id": teacher["id"], "pin": wrong})
    equal(door.post("/api/login", {"user_id": teacher["id"], "pin": e.pin}).status, 429,
          "the right PIN after five wrong ones")


@test("signing out ends the session", PIN_ACCOUNTS)
def _():
    client, e = fresh()
    client.post("/api/setup", account(e, "Mum")).ok("setup")
    client.post("/api/logout").ok("logout")
    equal(client.get("/api/bootstrap").ok("bootstrap")["me"], None, "me after signing out")
    equal(client.get("/api/progress").status, 401, "progress after signing out")


@test("a teacher can add another teacher, and only a known role", PIN_ACCOUNTS)
def _():
    client, e = fresh()
    client.post("/api/setup", account(e, "Mum")).ok("setup")
    added = client.post("/api/teacher/users", account(e, "Dad", role="teacher")).ok("add teacher")
    equal(added["role"], "teacher", "the added account's role")
    equal(client.post("/api/teacher/users", account(e, "Gran", role="admin")).status, 400,
          "an unknown role")
