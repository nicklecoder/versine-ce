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

Usage: python scripts/measure-medoid.py [skill ...] [--over 0.4]
  With no skills, every library. --over lists only levels above that share.
  Exits 1 when --over is given and some level is above it.
"""
# requiem: catalogue/content/decoys-crossed-not-centred
import json
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


def measure(path: Path):
    lib = json.loads(path.read_text())
    rows = [p for p in lib["problems"] if p["answer"]["type"] == "choice" and len(p["answer"]["options"]) >= 3]
    if not rows:
        return None
    mean = lambda f: sum(f(p["answer"]) for p in rows) / len(rows)
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
        print(f"{skill} L{level} {name}: key is the medoid in {medoid:.0%} of {n} choice rows (of {rows}); "
              f"chance {chance:.0%}; the outlier {outlier:.0%}, the longest {longest:.0%}")
    return 1 if over is not None and high else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
