#!/usr/bin/env python3
"""
Validate the problem libraries before they are allowed to serve students.

The libraries are the catalogue. Their rows are meant to be edited by hand --
finding a bad problem and correcting it in place is far better than debugging
the generator that produced it -- so this deliberately does NOT check that a
library still matches its generator. A hand-fixed library is *supposed* to
diverge from the code that first produced it.

What it checks instead is that every row is still usable: the structural
mistakes an editor actually makes. Written in Python because the server has it
and should not need a JavaScript runtime installed to refuse a bad deploy.

Usage: python3 scripts/check-library.py [--floor N]
Exits non-zero, with reasons, if anything would break a run.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LIB = ROOT / "web" / "library"
# Filled from schemas.json, which the build writes from the renderers and
# the answer types themselves. Kept as a fallback for a library built
# before the list was published.
KNOWN_TYPES = {"int", "frac", "mixed", "choice"}

# The presentation vocabulary, exported from the renderers by
# scripts/build-library.mjs. A catalogue item may only ask for a picture the
# system knows how to draw, with parameters that renderer can actually use.
SCHEMAS = {}
TERM_KINDS = set()
BLANK_FIELDS = {}
_schema_path = LIB / "schemas.json"
if _schema_path.is_file():
    try:
        _v = json.loads(_schema_path.read_text())
        SCHEMAS = _v.get("visuals", {})
        TERM_KINDS = set(_v.get("terms", []))
        BLANK_FIELDS = _v.get("blankFields", {})
        if _v.get("answerTypes"):
            KNOWN_TYPES = set(_v["answerTypes"])
    except json.JSONDecodeError:
        pass


# A prompt is a list of terms the renderer knows, not a string of markup. A
# term naming a kind that does not exist would render as a warning glyph in
# front of a student, so it is caught here instead.
TERM_FIELDS = {
    "num": ("v",), "frac": ("n", "d"), "mixed": ("w", "n", "d"),
    "op": ("v",), "blank": (), "prose": ("v",),
    "pow": ("b", "e"), "root": ("v",),
    "var": ("v",), "group": (), "juxt": (), "math": (),
    "sigma": ("lo", "hi", "terms"),
}


def has_somewhere_for_the_answer(prompt):
    """A prompt needs a gap. It can be a `blank` term, a null field inside a
    term (the exponent in 2^?, the numerator in ?/20), or a strategy level's
    prose, where the question is the sentence and the answer is a choice."""
    for t in prompt:
        if not isinstance(t, dict):
            continue
        kind = t.get("t")
        if kind in ("blank", "prose"):
            return True
        for field in BLANK_FIELDS.get(kind, ()):
            if field in t and t[field] is None:
                return True
    return False


def check_prompt(prompt, where, out):
    if isinstance(prompt, str):
        out.append(f"{where}: prompt is markup, not terms — rebuild this library")
        return
    if not isinstance(prompt, list) or not prompt:
        out.append(f"{where}: prompt should be a non-empty list of terms")
        return
    if not has_somewhere_for_the_answer(prompt):
        out.append(f"{where}: prompt has nowhere for the answer to go")
    check_terms(prompt, where, "prompt", out)


def check_terms(terms, where, path, out):
    """
    Validate a list of terms, descending into nested ones.

    A term's parts may themselves be term lists -- (x+1)/2 has an expression
    above the bar, x/10 has a variable there -- so a check that insisted on
    scalars would reject every prompt built from a typed expression. It did:
    the first equations build produced 992 complaints about a numerator that
    was perfectly good.
    """
    NESTED = {"frac": ("n", "d"), "pow": ("b", "e"), "root": ("c", "v"),
              "group": ("terms",), "juxt": ("terms",), "math": ("terms",),
              "sigma": ("terms",)}
    for i, term in enumerate(terms):
        at = f"{where}: {path}[{i}]"
        if not isinstance(term, dict):
            out.append(f"{at} is not a term object")
            continue
        kind = term.get("t")
        if TERM_KINDS and kind not in TERM_KINDS:
            out.append(f"{at} is kind {kind!r}, which nothing can render")
            continue
        for field in NESTED.get(kind, ()):
            value = term.get(field)
            if isinstance(value, list):
                check_terms(value, where, f"{path}[{i}].{field}", out)
        for field in TERM_FIELDS.get(kind, ()):
            if field not in term:
                out.append(f"{at} ({kind}) is missing {field!r}")
            elif field in ("n", "d", "w") and term[field] is not None \
                    and not isinstance(term[field], (int, list)):
                out.append(f"{at} ({kind}) has a {type(term[field]).__name__} {field!r}, "
                           f"which is neither a number nor a nested term list")


def check_field(value, rule, where, field, out):
    """Validate one field against its declared rule. Additive by design: an
    unknown type passes, so a renderer can declare something richer than this
    understands without blocking a deploy."""
    t = rule.get("type", "any")
    if t == "int":
        if not isinstance(value, int) or isinstance(value, bool):
            out.append(f"{where}: {field} should be a whole number, got {value!r}")
            return
    elif t == "number":
        if not isinstance(value, (int, float)) or isinstance(value, bool):
            out.append(f"{where}: {field} should be a number, got {value!r}")
            return
    elif t == "string":
        if not isinstance(value, str):
            out.append(f"{where}: {field} should be text, got {value!r}")
            return
    elif t == "bool":
        if not isinstance(value, bool):
            out.append(f"{where}: {field} should be true or false, got {value!r}")
            return
    elif t == "frac":
        if not isinstance(value, dict) or not isinstance(value.get("n"), int) \
                or not isinstance(value.get("d"), int):
            out.append(f"{where}: {field} should be a fraction {{n, d}}, got {value!r}")
            return
        if value["d"] == 0:
            out.append(f"{where}: {field} has a zero denominator")
    elif t == "enum":
        if value not in rule.get("values", []):
            out.append(f"{where}: {field} is {value!r}, not one of {rule.get('values')}")
            return
    elif t == "array":
        if not isinstance(value, list):
            out.append(f"{where}: {field} should be a list, got {value!r}")
            return
        of = rule.get("of")
        if of:
            for i, item in enumerate(value):
                check_field(item, of, where, f"{field}[{i}]", out)
    elif t == "object":
        if not isinstance(value, dict):
            out.append(f"{where}: {field} should be an object, got {value!r}")
            return

    if isinstance(value, (int, float)) and not isinstance(value, bool):
        if "min" in rule and value < rule["min"]:
            out.append(f"{where}: {field} is {value}, below the minimum of {rule['min']}")
        if "max" in rule and value > rule["max"]:
            out.append(f"{where}: {field} is {value}, above the maximum of {rule['max']}")


def check_visual(visual, where, out):
    if visual is None:
        return
    if not isinstance(visual, dict):
        out.append(f"{where}: visual should be an object or null")
        return
    kind = visual.get("kind")
    if not kind:
        out.append(f"{where}: visual has no kind")
        return
    if not SCHEMAS:
        return                      # no vocabulary exported; nothing to check against
    schema = SCHEMAS.get(kind)
    if schema is None:
        out.append(f"{where}: visual kind {kind!r} is not one the system can draw")
        return
    for field, rule in schema.items():
        if field not in visual:
            if rule.get("required"):
                out.append(f"{where}: visual {kind} is missing required field {field!r}")
            continue
        check_field(visual[field], rule, where, f"visual.{field}", out)
    for field in visual:
        if field != "kind" and field not in schema:
            out.append(f"{where}: visual {kind} has unknown field {field!r}")
REQUIRED = ("text", "prompt", "answer", "parSeconds")

floor = 20
if "--floor" in sys.argv:
    floor = int(sys.argv[sys.argv.index("--floor") + 1])

problems: list[str] = []


BOX_LENGTH = {"int": 7, "decimal": 12}


# requiem: catalogue/content/us-notation
# What a student reads is written for a US classroom: dollars and cents, and
# US spelling. A pound sign or a "metre" is a second thing to decode on top
# of the maths, and one generator slipping back would otherwise go unseen.
NOT_US = re.compile(
    r"£|€|\bpence\b|\b(?:centi|milli|kilo)?metres?\b|\b(?:milli)?litres?\b|\bcolours?\b"
    r"|\bcentres?\b|\bneighbours?\b|\bfavourites?\b|\bgrey\b|\bsweets\b|\btrolley\b"
    r"|\bthe lift\b|\ba lift\b|\brecognis(?:e|ed|es|ing)\b|\bmaths\b",
    re.I)


def read_aloud(row):
    """Every string a student sees: the prompt, picture, explanation and choices."""
    seen = {k: row.get(k) for k in ("prompt", "visual", "explain")}
    seen["options"] = (row.get("answer") or {}).get("options")
    return json.dumps(seen, ensure_ascii=False)


def fail(msg: str) -> None:
    problems.append(msg)


manifest_path = LIB / "manifest.json"
if not manifest_path.is_file():
    print("no library manifest; nothing to validate")
    sys.exit(0)

try:
    manifest = json.loads(manifest_path.read_text())
except json.JSONDecodeError as exc:
    print(f"manifest.json is not valid JSON: {exc}")
    sys.exit(1)

levels = manifest.get("levels", [])
if not levels:
    fail("manifest lists no levels")

checked = 0
for entry in levels:
    name = f"{entry.get('skill')} L{entry.get('level', -1) + 1}"
    path = LIB / entry.get("file", "")
    if not path.is_file():
        fail(f"{name}: library file {entry.get('file')} is missing")
        continue
    try:
        lib = json.loads(path.read_text())
    except json.JSONDecodeError as exc:
        fail(f"{name}: {path.name} is not valid JSON — {exc}")
        continue

    rows = lib.get("problems", [])
    if len(rows) != entry.get("count"):
        fail(f"{name}: manifest says {entry.get('count')} problems, file holds {len(rows)}")
    if len(rows) < floor:
        fail(f"{name}: only {len(rows)} problems — a student would memorise it")

    seen: set[str] = set()
    for i, row in enumerate(rows):
        where = f"{name} row {i}"
        missing = [k for k in REQUIRED if k not in row]
        if missing:
            fail(f"{where}: missing {', '.join(missing)}")
            continue
        if not str(row["text"]).strip():
            fail(f"{where}: empty text")
        if row["text"] in seen:
            fail(f"{where}: duplicate problem {row['text']!r}")
        seen.add(row["text"])

        ans = row["answer"]
        if not isinstance(ans, dict):
            fail(f"{where}: answer is not an object")
            continue
        if ans.get("type") not in KNOWN_TYPES:
            fail(f"{where}: unknown answer type {ans.get('type')!r}")
        if "value" not in ans:
            fail(f"{where}: answer has no value")
        accept = ans.get("accept")
        if not isinstance(accept, list) or not accept:
            fail(f"{where}: answer has no accepted forms")
        elif any(not isinstance(a, str) or not a.strip() for a in accept):
            fail(f"{where}: an accepted form is empty or not a string")
        # requiem: catalogue/library/answer-fits-its-box
        # The number boxes stop typing at a length (web/ui/answerinput.js): an
        # answer longer than that could never be entered.
        room = BOX_LENGTH.get(ans.get("type"))
        if room and isinstance(accept, list) and accept and len(str(accept[0]).replace("\u2212", "-")) > room:
            fail(f"{where}: {accept[0]} is longer than the {room} characters its box takes")
        if ans.get("type") == "choice":
            opts = ans.get("options") or []
            ids = [o.get("id") for o in opts if isinstance(o, dict)]
            if len(opts) < 2:
                fail(f"{where}: a choice needs at least two options")
            if ans.get("value") not in ids:
                fail(f"{where}: the correct option is not among the options")
        if not isinstance(row["parSeconds"], (int, float)) or row["parSeconds"] <= 0:
            fail(f"{where}: parSeconds is not a positive number")
        check_prompt(row.get("prompt"), where, problems)
        check_visual(row.get("visual"), where, problems)
        if m := NOT_US.search(read_aloud(row)):
            fail(f"{where}: {m[0]!r} is not US notation or spelling")
    checked += len(rows)

if problems:
    print(f"{len(problems)} problem(s) found in the libraries:")
    for line in problems[:25]:
        print(f"  {line}")
    if len(problems) > 25:
        print(f"  ... and {len(problems) - 25} more")
    sys.exit(1)

kinds = len(SCHEMAS)
print(f"{len(levels)} levels, {checked:,} problems, {kinds} visual kinds, {len(TERM_KINDS)} term kinds — all valid")
