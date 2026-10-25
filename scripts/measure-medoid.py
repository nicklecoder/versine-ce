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

Usage: python scripts/measure-medoid.py [skill ...] [--over 0.4]
  With no skills, every library. --over lists only levels above that share.
  Exits 1 when --over is given and some level is above it.
"""
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
    def stock_in(group: list[dict]) -> set:
        seen: dict[str, int] = {}
        for p in group:
            for label in {o["label"] for o in p["answer"]["options"]}:
                seen[label] = seen.get(label, 0) + 1
        return {label for label, n in seen.items() if n >= len(group) / 3}

    shapes: dict[str, list] = {}
    keys: dict[frozenset, set] = {}
    for p in rows:
        shapes.setdefault(re.split(r"[:;]", p["text"])[0], []).append(p)
        keys.setdefault(frozenset(o["label"] for o in p["answer"]["options"]), set()).add(key_label(p["answer"]))
    stock = stock_in(rows)
    for group in shapes.values():
        if len(group) >= 20:
            stock |= stock_in(group)
    return [p["answer"] for p in rows
            if len(keys[frozenset(o["label"] for o in p["answer"]["options"])]) == 1
            and sum(o["label"] not in stock for o in p["answer"]["options"]) >= 3]


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


def main(argv):
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
