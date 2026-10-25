"""
How often a choice level's key can be picked without the mathematics.

When every wrong option is the key with one feature changed, the key is the
option the others differ from least: the medoid, the option whose labels sum
to the smallest edit distance from the rest. A student who never reads the
question can find it by comparing the options alone. This measures, for each
choice level with three or more options, how often the key is that medoid
(a tie for least shares the row among the tied options), against the chance
rate of one over the number of options. Beside it, how often the key is the
outlier, the option farthest from the rest, and the longest label: a key
that is rarely the medoid can still stand out the other way.

Only rows whose options were written for the row are measured (see
rows_written_for): a fixed menu -- Higher / Lower / Equal, Inside / On /
Outside -- has a medoid set by its wording, and what matters there is that
the key moves among its options, not where the decoys sit. check-answers.py
loads this file and fails a level above 40% on at least 20 measured rows.

The fixed menus left out here are measured another way (menu_keys): every
option of a menu should be the key in some rows, and check-answers.py fails
a level where one offered in 50 rows or more never is.

Usage: python scripts/measure-medoid.py [skill ...] [--over 0.4]
       python scripts/measure-medoid.py [skill ...] --menus
  With no skills, every library. --over lists only levels above that share.
  Exits 1 when --over is given and some level is above it. --menus lists
  each level's menu options offered in 50 rows or more and never the key.
"""
# requiem: catalogue/content/fixed-menu-key-moves
# requiem: catalogue/content/decoys-crossed-not-centred
# requiem: catalogue/content/decoys-cross-two-slips
import json
import re
import sys
from pathlib import Path

LIB = Path(__file__).resolve().parent.parent / "web" / "library"


def distance(a: str, b: str) -> int:
    """Levenshtein distance between two labels, by characters."""
    if len(a) < len(b):
        a, b = b, a
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def share(answer: dict, score, pick=min) -> float:
    """The key's share of the option that score picks out: 1, 0, or 1/k when k tie."""
    labels = {o["id"]: o["label"] for o in answer["options"]}
    scores = {i: score(i, labels) for i in labels}
    best = pick(scores.values())
    tied = [i for i, v in scores.items() if v == best]
    return 1 / len(tied) if answer["value"] in tied else 0.0


def total(i, labels):
    return sum(distance(labels[i], m) for j, m in labels.items() if j != i)


def medoid_share(answer: dict) -> float:
    """The key's share of the medoid, the option nearest all the others."""
    return share(answer, total)


def outlier_share(answer: dict) -> float:
    """The key's share of the option farthest from the others: a rate far
    under chance on the medoid can mean the key stands apart instead."""
    return share(answer, total, max)


def longest_share(answer: dict) -> float:
    """The key's share of the longest label."""
    return share(answer, lambda i, labels: len(labels[i]), max)


def key_label(answer: dict) -> str:
    return next(o["label"] for o in answer["options"] if o["id"] == answer["value"])


# requiem: catalogue/content/decoys-cross-two-slips
def rows_written_for(rows: list[dict]) -> list[dict]:
    """The answers of the choice rows whose options were written for the row,
    not drawn from a fixed menu.

    Read from the library, not listed by hand. A row is left out when its
    label set recurs with another key (the key moves among a fixed menu), or
    when fewer than three of its labels are its own once stock labels are set
    aside. A stock label is in a third or more of the level's choice rows, or
    of the rows sharing its question's shape (the text before the first ':'
    or ';') where that shape has 20 rows or more: "They are the same", or
    "It will most likely get closer to the theoretical probability" in a
    level that asks that question beside others.
    """
    stock, keys = stock_labels(rows), keys_by_label_set(rows)
    return [p["answer"] for p in rows
            if len(keys[frozenset(o["label"] for o in p["answer"]["options"])]) == 1
            and sum(o["label"] not in stock for o in p["answer"]["options"]) >= 3]


def stock_labels(rows: list[dict]) -> set:
    """Labels in a third or more of the rows, or of the rows sharing a
    question's shape (the text before the first ':' or ';') where that shape
    has 20 rows or more."""
    def stock_in(group: list[dict]) -> set:
        seen: dict[str, int] = {}
        for p in group:
            for label in {o["label"] for o in p["answer"]["options"]}:
                seen[label] = seen.get(label, 0) + 1
        return {label for label, n in seen.items() if n >= len(group) / 3}

    shapes: dict[str, list] = {}
    for p in rows:
        shapes.setdefault(re.split(r"[:;]", p["text"])[0], []).append(p)
    stock = stock_in(rows)
    for group in shapes.values():
        if len(group) >= 20:
            stock |= stock_in(group)
    return stock


def keys_by_label_set(rows: list[dict]) -> dict[frozenset, set]:
    """Each set of option labels in the rows, and the labels it was keyed by."""
    keys: dict[frozenset, set] = {}
    for p in rows:
        keys.setdefault(frozenset(o["label"] for o in p["answer"]["options"]), set()).add(key_label(p["answer"]))
    return keys


# requiem: catalogue/content/fixed-menu-key-moves
def menu_keys(rows: list[dict]) -> dict[str, tuple[int, int]]:
    """For each label of a level's fixed menus, how many rows offer it and in
    how many it is the key.

    A menu label is a stock label (see stock_labels: They are the same, Not
    enough, the five likelihood words) or a label of a label set the level
    keys more than one way (Up 3 / Down 3 / Left 3 / Right 3). Options written
    for their row are left out: a decoy made for one row is never its key, and
    that is not a tell. A menu label that is never the key is one: a student
    can strike it without reading the question.
    """
    menu = stock_labels(rows)
    for labels, keyed in keys_by_label_set(rows).items():
        if len(keyed) > 1:
            menu |= labels
    out: dict[str, list] = {}
    for p in rows:
        key = key_label(p["answer"])
        for label in {o["label"] for o in p["answer"]["options"]} & menu:
            seen = out.setdefault(label, [0, 0])
            seen[0] += 1
            seen[1] += label == key
    return {label: (n, k) for label, (n, k) in out.items()}


def all_choice_rows(lib: dict) -> list[dict]:
    """A library's choice problems with two or more options."""
    return [p for p in lib["problems"] if p["answer"]["type"] == "choice" and len(p["answer"]["options"]) >= 2]


def choice_rows(lib: dict) -> list[dict]:
    """A library's choice problems with three or more options."""
    return [p for p in lib["problems"] if p["answer"]["type"] == "choice" and len(p["answer"]["options"]) >= 3]


def measure(path: Path):
    lib = json.loads(path.read_text())
    rows = rows_written_for(choice_rows(lib))
    if not rows:
        return None
    mean = lambda f: sum(f(a) for a in rows) / len(rows)
    return (lib["skill"], lib["level"], lib["levelName"], len(rows), len(lib["problems"]),
            mean(medoid_share), mean(lambda a: 1 / len(a["options"])), mean(outlier_share), mean(longest_share))


def never_keyed(lib: dict, least: int = 50) -> list[tuple[str, int]]:
    """A level's menu labels offered in `least` rows or more and never the key."""
    return sorted((label, n) for label, (n, k) in menu_keys(all_choice_rows(lib)).items() if n >= least and k == 0)


def main(argv):
    if "--menus" in argv:
        # Each level's menu labels never keyed, and each menu label's share of the keys.
        argv = [a for a in argv if a != "--menus"]
        for f in sorted(LIB.glob("*-[0-9]*.json")):
            if argv and f.stem.rsplit("-", 1)[0] not in argv:
                continue
            lib = json.loads(f.read_text())
            for label, n in never_keyed(lib):
                print(f"{lib['skill']} L{lib['level']} {lib['levelName']}: {label!r} offered in {n} rows, never the key")
        return 0
    over = None
    if "--over" in argv:
        k = argv.index("--over")
        over = float(argv[k + 1])
        argv = argv[:k] + argv[k + 2:]
    files = sorted(LIB.glob("*-[0-9]*.json"), key=lambda p: (p.stem.rsplit("-", 1)[0], int(p.stem.rsplit("-", 1)[1])))
    if argv:
        files = [f for f in files if f.stem.rsplit("-", 1)[0] in argv]
    high = 0
    for f in files:
        m = measure(f)
        if not m:
            continue
        skill, level, name, n, rows, medoid, chance, outlier, longest = m
        if over is not None and medoid <= over:
            continue
        high += medoid > (over or 1)
        print(f"{skill} L{level} {name}: key is the medoid in {medoid:.0%} of {n} choice rows written for the row (of {rows}); "
              f"chance {chance:.0%}; the outlier {outlier:.0%}, the longest {longest:.0%}")
    return 1 if over is not None and high else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
