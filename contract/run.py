"""Run the Versine API contract suite against an edition.

    python3 -m contract.run                      # the community edition
    python3 -m contract.run --edition PATH.py    # any other edition's adapter
    python3 -m contract.run --only clock         # tests whose name contains "clock"

requiem: server/api-contract

The browser app talks to its server only through this API, so any server
that passes this suite can serve it. The suite is HTTP and the standard
library only; the one edition-specific piece is an adapter -- a Python file
defining `Edition` -- that knows how to get a fresh group and add students:

    class Edition:
        name: str                     # for the report
        suites: set[str]              # "core", plus any optional suite it serves
        def new_group(self) -> Group  # isolated: a teacher signed in, no students
        def close(self) -> None

    class Group:
        url: str                      # the server this group lives on
        teacher: harness.Client       # signed in, with .me set
        def add_student(self, name=None, zone="UTC") -> harness.Client

An edition serving the "pin-accounts" suite also provides `empty_server()`
returning the URL of a server nobody has set up, and the `pin`, `icon` and
`accent` its sign-up accepts. One serving "time-travel" provides
`age(student, days)`, moving every timestamp it keeps for that student `days`
into the past, which lets rules that unfold over days -- review coming due,
growing, credit from dependent work -- be checked without waiting. See
contract/editions/community.py.
"""
from __future__ import annotations

import argparse
import importlib
import importlib.util
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from contract import harness                                  # noqa: E402

TEST_MODULES = ["basics", "runs", "clock", "activity", "leaderboard", "levels",
                "review", "review_timeline", "teacher", "pin_accounts"]


def load_edition(spec: str):
    if spec == "community":
        from contract.editions.community import Edition, Unavailable
        try:
            return Edition()
        except Unavailable as why:
            print(f"contract: skipped — {why}")
            sys.exit(0)
    path = Path(spec).resolve()
    module_spec = importlib.util.spec_from_file_location("edition_adapter", path)
    if module_spec is None or module_spec.loader is None:
        sys.exit(f"contract: no edition adapter at {path}")
    module = importlib.util.module_from_spec(module_spec)
    module_spec.loader.exec_module(module)
    return module.Edition()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--edition", default="community",
                        help="'community', or the path of an edition adapter")
    parser.add_argument("--only", help="run only tests whose name contains this")
    args = parser.parse_args(argv)

    for name in TEST_MODULES:
        importlib.import_module(f"contract.test_{name}")
    edition = load_edition(args.edition)
    try:
        failed = harness.run_all(edition, only=args.only)
    finally:
        edition.close()
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
