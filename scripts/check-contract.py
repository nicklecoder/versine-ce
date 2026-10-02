#!/usr/bin/env python3
"""The API contract suite, against this checkout's own server.

requiem: server/api-contract

check-server.py tests the server's internals by calling it as Python; this
runs the server for real and talks to it only as the browser does, over
HTTP. Any other edition's server has to pass the same suite (contract/run.py
--edition <adapter>), which is what lets the browser app and the library be
shared without forking.

Like check-server.py it needs the web framework, from this interpreter or
the project's virtualenv, and skips rather than fails without it.
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from contract.run import main  # noqa: E402

if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
