#!/usr/bin/env python3
"""
Re-derive answers independently of the generators that produced them.

Every other check asks whether a problem is well-formed. This asks whether it
is *right* -- by solving it again, in a different language, with arithmetic
that knows nothing about how it was made. A generator that disagrees with
itself passes every structural check: x/3 = 4 once claimed x = 4 while its own
worked lines said x = 12, and only substitution caught it.

Exact rationals throughout, never floats.

Usage: python3 scripts/check-answers.py
"""
import json
import math
import re
import sys
from fractions import Fraction
from pathlib import Path

LIB = Path(__file__).resolve().parent.parent / "web" / "library"
VARS = "xynat"
problems: list[str] = []
checked = 0


class Evaluator:
    """
    A small, correct evaluator over exact rationals.

    Written properly rather than by translating the text into Python and
    calling eval, which was tried and produced three separate wrong answers
    from the checker itself: floats where rationals were meant, "1/2 ÷ 1/10"
    read as 1/2/1/10, and "2(a + 1)" split apart on its spaces. The last
    attempt got 10 ÷ 2 × 2 wrong -- which is the exact problem order-ops L2
    exists to teach.

        expr   := term (('+' | '-') term)*
        term   := frac (('×' | '÷' | '*') frac)*      left to right
        frac   := factor ('/' factor)*                binds tighter
        factor := '-' factor | power
        power  := atom ('^' factor)?
        atom   := number | '(' expr ')'

    The fraction bar and the division sign are two different operators here,
    and the bar binds tighter: "1/2 ÷ 1/10" is one half divided by one tenth,
    which is 5, not 1/20. Collapsing both to a slash loses that -- and reading
    it as a slash also makes "10 ÷ 2 × 2" come out as 5/2, which is the exact
    mistake order-ops L2 exists to teach.

    Juxtaposition is a multiplication, so 2(a + 1) works.
    """

    TOKEN = re.compile(r"\d+\.\d+|\d+|÷|[-+*/^()]")

    def __init__(self, src: str):
        text = src.replace("−", "-").replace("×", "*").replace("·", "*")
        self.t = self.TOKEN.findall(text)
        if "".join(self.t) != re.sub(r"\s+", "", text):
            raise ValueError(f"unreadable: {src}")
        self.i = 0

    def peek(self):
        return self.t[self.i] if self.i < len(self.t) else None

    def expr(self) -> Fraction:
        out = self.term()
        while self.peek() in ("+", "-"):
            op = self.t[self.i]; self.i += 1
            out = out + self.term() if op == "+" else out - self.term()
        return out

    def term(self) -> Fraction:
        out = self.frac()
        while True:
            nxt = self.peek()
            if nxt in ("*", "÷"):
                self.i += 1
                rhs = self.frac()
                out = out * rhs if nxt == "*" else out / rhs
            elif nxt == "(":                      # juxtaposition: 2(a + 1)
                out = out * self.frac()
            else:
                return out

    def frac(self) -> Fraction:
        out = self.factor()
        while self.peek() == "/":
            self.i += 1
            out /= self.factor()
        return out

    def factor(self) -> Fraction:
        if self.peek() == "-":
            self.i += 1
            return -self.factor()
        return self.power()

    def power(self) -> Fraction:
        base = self.atom()
        if self.peek() == "^":
            self.i += 1
            return base ** int(self.factor())
        return base

    def atom(self) -> Fraction:
        tok = self.peek()
        if tok is None:
            raise ValueError("ends early")
        if tok == "(":
            self.i += 1
            inner = self.expr()
            if self.peek() != ")":
                raise ValueError("unclosed bracket")
            self.i += 1
            return inner
        self.i += 1
        return Fraction(tok)


def evaluate(src: str, var: str | None = None, value=None) -> Fraction:
    text = src if var is None else src.replace(var, f"({value})")
    ev = Evaluator(text)
    out = ev.expr()
    if ev.i != len(ev.t):
        raise ValueError(f"trailing input in {src}")
    return out


def var_in(text: str) -> str | None:
    return next((c for c in VARS if c in text), None)


def as_fraction(v):
    """An answer value, whatever shape it was stored in, as an exact rational."""
    return Fraction(v["n"], v["d"]) if isinstance(v, dict) else Fraction(v)


def half_up(x: Fraction, places: int) -> Fraction:
    """Round to `places` decimals, halves going up, without ever touching a float."""
    scale = 10 ** places
    y = x * scale
    whole = y // 1
    return Fraction(int(whole) + (1 if (y - whole) * 2 >= 1 else 0), scale)


# Questions the evaluator cannot read as an expression: asked in words, or
# written with a blank in them. Both left whole levels resting on nothing but
# the generator agreeing with itself -- every prose-asked level, and, less
# obviously, every equivalence, since "2/3 = ?/12" is not an expression and
# fell through every branch below in silence. These re-derive the answer from
# the numbers in the question, by a different route than the generator took.
BY_RULE = (
    (re.compile(r"^GCF of (\d+) and (\d+)$"),
     lambda a, b: math.gcd(a, b)),
    (re.compile(r"^LCM of (\d+) and (\d+)$"),
     lambda a, b: a * b // math.gcd(a, b)),
    (re.compile(r"^smallest prime factor of (\d+)$"),
     lambda n: next(d for d in range(2, n + 1) if n % d == 0)),
    (re.compile(r"^(\d+) : (\d+) = (\d+) : \?$"),
     lambda a, b, c: Fraction(b * c, a)),
    (re.compile(r"^(\d+) : (\d+) = \? : (\d+)$"),
     lambda a, b, c: Fraction(a * c, b)),
    (re.compile(r"^(\d+) : (\d+) of (\d+), (first|second) share$"),
     lambda a, b, total, which: Fraction((a if which == "first" else b) * total, a + b)),
    (re.compile(r"^unit rate of (\d+) per (\d+)$"),
     lambda total, n: Fraction(total, n)),
    (re.compile(r"^(\d+) for (\d+), then (\d+)$"),
     lambda cost, n, want: Fraction(cost * want, n)),
    # Equivalent fractions, either part missing. Cross-multiplication, which
    # is not the route any generator takes: they all build outwards from a
    # base fraction and a multiplier.
    (re.compile(r"^(\d+)/(\d+) = \?/(\d+)$"),
     lambda n, d, big_d: Fraction(n * big_d, d)),
    (re.compile(r"^(\d+)/(\d+) = (\d+)/\?$"),
     lambda n, d, big_n: Fraction(big_n * d, n)),
    # Either part may carry a minus: a signed fraction is asked in exactly
    # this form, and the answer is the same fraction with the sign moved in
    # front, which Fraction does for itself.
    (re.compile(r"^(-?\d+)/(-?\d+) in lowest terms$"),
     lambda n, d: Fraction(int(n), int(d))),
    # Rounding, re-derived in exact rationals. Doing it in floats is the one
    # way to get this wrong that matters: 2.675 is not 2.675 as a double, so a
    # float check would call the correct 2.68 an error.
    (re.compile(r"^([\d.]+) to the nearest whole$"),
     lambda v: half_up(Fraction(v), 0)),
    (re.compile(r"^([\d.]+) to (\d) dp$"),
     lambda v, places: half_up(Fraction(v), places)),
    # Percent change and reverse percentage, each re-derived from the two
    # numbers rather than from the percent the generator started with.
    (re.compile(r"^(\d+) to (\d+), percent change$"),
     lambda a, b: Fraction(abs(b - a) * 100, a)),
    (re.compile(r"^(\d+) after (up|down) (\d+)%, before$"),
     lambda now, way, pct: Fraction(now * 100, 100 + pct if way == "up" else 100 - pct)),
    (re.compile(r"^estimate ([\d.]+) ([×+]) ([\d.]+)$"),
     lambda a, op, b: (half_up(Fraction(a), 0) * half_up(Fraction(b), 0) if op == "×"
                       else half_up(Fraction(a), 0) + half_up(Fraction(b), 0))),
    # Two amounts combined, each written in whichever form the question used:
    # a mixed number, a top-heavy fraction, a proper fraction or a whole. The
    # evaluator cannot read "1 1/10 + 2 1/2" -- a whole beside a fraction is
    # juxtaposition meaning addition, which is not what juxtaposition means
    # anywhere else in this notation -- so the conversion happens here, by the
    # same route a student takes.
    (re.compile(r"^(\d+ \d+/\d+|\d+/\d+|\d+) ([+\u2212×÷]) "
                r"(\d+ \d+/\d+|\d+/\d+|\d+)$"),
     lambda a, op, b: mixed_op(a, op, b)),
    # A linear inequality, solved from scratch -- including the flip, which is
    # derived here from the sign of the coefficient rather than copied from
    # the generator's own reasoning about it.
    # Scientific notation, each form re-derived in exact rationals: the power
    # between two numbers is found by counting tens, never by a logarithm.
    (re.compile(r"^(-?[\d.]+) = (-?[\d.]+) × 10\^\?$"),
     lambda a, b: power_between(Fraction(a), Fraction(b))),
    (re.compile(r"^(-?[\d.]+) × 10\^(-?\d+)$"),
     lambda f, e: sci(f, e)),
    (re.compile(r"^([\d.]+) × 10\^(-?\d+) = ([\d.]+) × 10\^\?$"),
     lambda f, e, want: power_between(sci(f, e), Fraction(want))),
    (re.compile(r"^\(([\d.]+) × 10\^(-?\d+)\) ([×÷]) \(([\d.]+) × 10\^(-?\d+)\) "
                r"= ([\d.]+) × 10\^\?$"),
     lambda af, ae, op, bf, be, want: sci_combine(af, ae, op, bf, be, None, want, None)),
    (re.compile(r"^([\d.]+) × 10\^(-?\d+) ([+-]) (?:([\d.]+) × 10\^(-?\d+)|([\d.]+)) "
                r"= \? × 10\^(-?\d+)$"),
     lambda af, ae, op, bf, be, plain, power: sci_combine(af, ae, op, bf, be, plain, None, power)),
    (re.compile(r"^(\u2212?)(\d*)([a-z])(?: ([+\u2212]) (\d+))? "
                r"([<>\u2265\u2264]) (\u2212?\d+), (largest|smallest)$"),
     lambda neg, coeff, _v, op, b, sign, rhs, want:
        solve_inequality(neg, coeff, op, b, sign, rhs, want)),
    # Absolute value, of one number or of a difference, and the distance
    # between two numbers -- worked out as a difference, then made positive.
    (re.compile(r"^\|(.+)\|$"),
     lambda inner: abs(evaluate(str(inner).replace("\u2212", "-")))),
    (re.compile(r"^distance from (\u2212?\d+) to (\u2212?\d+)$"),
     lambda a, b: abs(Fraction(str(b).replace("\u2212", "-")) - Fraction(str(a).replace("\u2212", "-")))),
    # Any other inequality asked for a whole-number end, letters on both
    # sides included: settled by trying whole numbers, not by solving.
    (re.compile(r"^(.+?) ([<>\u2264\u2265]) (.+?), (largest|smallest)$"),
     lambda lhs, sign, rhs, want: ray_end(lhs, sign, rhs, want)),
)


def sci(front: str, power) -> Fraction:
    """front x 10^power, exactly."""
    return Fraction(front) * Fraction(10) ** int(power)


def power_between(a: Fraction, b: Fraction) -> int:
    """The e with a = b x 10^e, found by counting tens rather than by logarithm."""
    ratio, e = a / b, 0
    while abs(ratio) >= 10 or (ratio.denominator != 1 and abs(ratio) < 1):
        if abs(ratio) >= 10:
            ratio, e = ratio / 10, e + 1
        else:
            ratio, e = ratio * 10, e - 1
    if ratio != 1:
        raise ValueError(f"{a} is not {b} times a power of ten")
    return e


def sci_combine(af, ae, op, bf, be, b_plain, want_front, want_power):
    """Scientific notation, combined, then the asked-for part read off the result."""
    x = sci(af, ae)
    y = sci(bf, be) if bf is not None else Fraction(b_plain)
    total = {"×": x * y, "÷": x / y, "+": x + y, "-": x - y}[op]
    if want_front is not None:           # given the front number, the power is asked
        return power_between(total, Fraction(want_front))
    return total / Fraction(10) ** int(want_power)


def ray_end(lhs: str, sign: str, rhs: str, want: str):
    """
    The largest or smallest whole number satisfying an inequality, found by
    trying every whole number in a wide window rather than by solving it --
    so no rearranging, and no flip, is taken on trust from anywhere.
    """
    lhs, rhs = str(lhs).replace("\u2212", "-"), str(rhs).replace("\u2212", "-")
    v = var_in(lhs + rhs)
    test = {"<": lambda a, b: a < b, ">": lambda a, b: a > b,
            "\u2264": lambda a, b: a <= b, "\u2265": lambda a, b: a >= b}[sign]
    works = [n for n in range(-400, 401) if test(evaluate(lhs, v, n), evaluate(rhs, v, n))]
    if not works or -400 in works and 400 in works:
        raise ValueError("not a ray inside the window")
    return max(works) if want == "largest" else min(works)


def solution_count(equation: str) -> str:
    """One, none or every: a linear difference sampled at two points decides it."""
    lhs, rhs = equation.replace("\u2212", "-").split(" = ")
    v = var_in(lhs + rhs)
    d0, d1 = (evaluate(lhs, v, t) - evaluate(rhs, v, t) for t in (0, 1))
    if d0 == d1:
        return "every" if d0 == 0 else "none"
    return "one"


SUPER = str.maketrans("\u2070\u00b9\u00b2\u00b3\u2074\u2075\u2076\u2077\u2078\u2079\u207b", "0123456789-")


def sci_bigger(a: str, b: str) -> str:
    """Which of two numbers written as front x 10^power is bigger, by value."""
    def value(s):
        front, power = s.split(" × 10")
        return sci(front, power.translate(SUPER))
    return a if value(a) > value(b) else b


# Choice answers, re-derived the same way: from the question, never from the
# generator's reasoning about it.
CHOICE_RULES = (
    (re.compile(r"^how many solutions: (.+)$"), solution_count),
    (re.compile(r"^bigger: ([\d.]+ × 10\S+) or ([\d.]+ × 10\S+)$"), sci_bigger),
)


def amount(text: str) -> Fraction:
    """"2 1/2", "5/2", "1/4" or "3" — all one number, read whichever way it is written."""
    text = str(text)
    if " " in text:
        whole, rest = text.split(" ")
        n, d = rest.split("/")
        return Fraction(int(whole) * int(d) + int(n), int(d))
    if "/" in text:
        n, d = text.split("/")
        return Fraction(int(n), int(d))
    return Fraction(int(text))


def mixed_op(a, op, b):
    """Two amounts combined, each converted to a single fraction first."""
    x, y = amount(a), amount(b)
    return {"+": x + y, "\u2212": x - y, "×": x * y, "÷": x / y}[op]


def solve_inequality(neg, coeff, op, b, sign, rhs, want):
    """kx + c  SIGN  rhs -> the largest or smallest whole number that satisfies it."""
    k = Fraction(int(coeff) if coeff else 1) * (-1 if neg else 1)
    c = Fraction(0 if b is None else (int(b) * (-1 if op == "\u2212" else 1)))
    right = Fraction(str(rhs).replace("\u2212", "-"))
    boundary = (right - c) / k
    strict = sign in ("<", ">")
    # Dividing by a negative turns the relation around, so which end of the
    # range is wanted turns around with it -- exactly the rule under test.
    if want == "largest":
        floor = boundary // 1
        return floor - 1 if strict and floor == boundary else floor
    ceil = -((-boundary) // 1)
    return ceil + 1 if strict and ceil == boundary else ceil


# --- Rational & Irrational -------------------------------------------------

def repeating(text: str) -> Fraction:
    """0.1(6), 0.(27): the bracketed digits repeat for ever. Exact, by place value."""
    m = re.fullmatch(r"(-?)(\d+)\.(\d*)\((\d+)\)", text)
    sign, whole, fixed, cycle = m.groups()
    head = Fraction(int(whole + fixed), 10 ** len(fixed))
    tail = Fraction(int(cycle), (10 ** len(cycle) - 1) * 10 ** len(fixed))
    return (head + tail) * (-1 if sign else 1)


def ends_or_repeats(n: str, d: str) -> str:
    """A fraction ends exactly when its lowest-terms bottom has no prime but 2 and 5."""
    bottom = Fraction(int(n), int(d)).denominator
    for p in (2, 5):
        while bottom % p == 0:
            bottom //= p
    return "ends" if bottom == 1 else "repeats"


def squarefree(n: int) -> tuple[int, int]:
    """n as k^2 * m with m squarefree: returns (k, m)."""
    k, m, f = 1, n, 2
    while f * f <= m:
        while m % (f * f) == 0:
            m //= f * f
            k *= f
        f += 1
    return k, m


class Surd:
    """
    A sum of rational multiples of square roots of squarefree whole numbers,
    {m: coefficient}, with m = 1 the rational part. Closed under +, - and x,
    so a sum or product of roots is decided by arithmetic rather than by
    recognising which shapes the catalogue happens to ask about.
    """

    def __init__(self, terms):
        self.t = {m: c for m, c in terms.items() if c != 0}

    @staticmethod
    def root(inside: Fraction) -> "Surd":
        # sqrt(p/q) = sqrt(pq)/q
        k, m = squarefree(inside.numerator * inside.denominator)
        return Surd({m: Fraction(k, inside.denominator)})

    def __add__(self, o):
        out = dict(self.t)
        for m, c in o.t.items():
            out[m] = out.get(m, 0) + c
        return Surd(out)

    def __neg__(self):
        return Surd({m: -c for m, c in self.t.items()})

    def __mul__(self, o):
        out = {}
        for m1, c1 in self.t.items():
            for m2, c2 in o.t.items():
                k, m = squarefree(m1 * m2)
                out[m] = out.get(m, 0) + c1 * c2 * k
        return Surd(out)

    def rational(self) -> bool:
        return set(self.t) <= {1}


def real_atom(text: str):
    text = text.replace("−", "-")
    if "π" in text or "gaps growing" in text:
        return None                                  # pi, or a decimal that never settles
    if text.startswith("√"):
        inside = text[1:].strip("()")
        return Surd.root(amount(inside) if "/" in inside else Fraction(inside))
    if "(" in text:
        return Surd({1: repeating(text)})
    return Surd({1: Fraction(text)})


def rational_or_not(text: str) -> str:
    # One operator at most, by construction of the questions: "2 + √10",
    # "√10 × √10", "0 × √10". pi is the one irrational not built from roots,
    # and nothing rational is ever added to or multiplied by it to cancel it.
    m = re.fullmatch(r"(.+?) ([+−×]) (.+)", text)
    if not m:
        a = real_atom(text)
        return "irrational" if a is None or not a.rational() else "rational"
    left, op, right = real_atom(m[1]), m[2], real_atom(m[3])
    if left is None or right is None:
        zero = (left or right)
        return "rational" if op == "×" and zero is not None and not zero.t else "irrational"
    value = left * right if op == "×" else left + (-right if op == "−" else right)
    return "rational" if value.rational() else "irrational"


PI_LOW, PI_HIGH = Fraction(314159265358, 10 ** 11), Fraction(314159265359, 10 ** 11)


def real_bigger(a: str, b: str) -> str:
    """Bigger of two reals, each a decimal, a fraction, a root or pi, compared exactly."""
    def bounds(s):
        if s == "π":
            return PI_LOW, PI_HIGH
        if s.startswith("√"):
            n = int(s[1:])
            r = math.isqrt(n)
            if r * r == n:
                return Fraction(r), Fraction(r)
            # Squares compare where roots cannot: narrow to 1/10^6.
            lo = Fraction(math.isqrt(n * 10 ** 12), 10 ** 6)
            return lo, lo + Fraction(1, 10 ** 6)
        v = amount(s) if "/" in s else Fraction(s)
        return v, v
    (alo, ahi), (blo, bhi) = bounds(a), bounds(b)
    if alo > bhi:
        return a
    if blo > ahi:
        return b
    raise ValueError(f"too close to call: {a} and {b}")


def root_to_1dp(n: int) -> Fraction:
    """sqrt(n) rounded to 1 dp: k is the tenths, and (k + 1/2)^2 against 100n decides up or down."""
    k = math.isqrt(100 * n)
    return Fraction(k + (1 if (2 * k + 1) ** 2 <= 400 * n else 0), 10)


# --- Using Expressions -----------------------------------------------------

def at(src: str, values: dict) -> Fraction:
    """An expression with every single-letter unknown replaced by its value."""
    text = re.sub(r"[A-Za-z]", lambda m: f"({values[m[0]]})", src.replace("−", "-"))
    return evaluate(text)


def substitute(expr: str, assignments: str) -> Fraction:
    values = dict(re.findall(r"([A-Za-z]) = (-?\d+)", assignments.replace("−", "-")))
    return at(expr, values)


SAMPLES = (-3, -1, 0, 2, 5, 7)


def same_everywhere(a: str, b: str, letter: str) -> bool:
    """Equal at six values for a polynomial of degree two or less means equal for all."""
    return all(at(a, {letter: v}) == at(b, {letter: v}) for v in SAMPLES)


def same_or_not(a: str, b: str) -> str:
    letter = re.search(r"[a-z]", a + b)[0]
    return "same" if same_everywhere(a, b, letter) else "different"


# The phrases, read into expressions by their own small grammar. Each is
# written from the English rather than from the generator's templates.
WORDS = (
    (r"(\d+) more than (\w)$", "{v} + {0}"),
    (r"(\d+) less than (\d+) times (\w)$", "{1}{v} - {0}"),
    (r"(\d+) less than (\w)$", "{v} - {0}"),
    (r"(\w) less than (\d+)$", "{1} - {v}"),
    (r"(\w) taken away from (\d+)$", "{1} - {v}"),
    (r"(\w) divided by (\d+), then (\d+) taken away$", "{v}/{1} - {2}"),
    (r"(\w) divided by (\d+)$", "{v}/{1}"),
    (r"the product of (\d+) and (\w)$", "{0}{v}"),
    (r"(\d+) times (\w), increased by (\d+)$", "{0}{v} + {2}"),
    (r"twice (\w), decreased by (\d+)$", "2{v} - {1}"),
    (r"the square of (\w), plus (\d+)$", "{v}^2 + {1}"),
)


def from_words(phrase: str, expr: str):
    for pattern, shape in WORDS:
        m = re.fullmatch(pattern, phrase)
        if m:
            groups = m.groups()
            letter = next(g for g in groups if g.isalpha())
            want = shape.format(*groups, v=letter)
            return "ok" if same_everywhere(want, expr, letter) else f"should be {want}"
    raise ValueError(f"unread phrase: {phrase}")


NUMBER_WORDS = {"Two": 2, "Three": 3, "Four": 4, "Five": 5, "Six": 6, "twice": 2, "three": 3,
                "four": 4, "five": 5, "six": 6, "Twice": 2, "Three times": 3, "Four times": 4,
                "Five times": 5, "Six times": 6}


def story_at(story: str):
    """
    The quantity a story asks for, as a function of its letter -- read from
    the story's own words, so a choice of expressions can be checked by
    comparing each against it.
    """
    n = [int(x) for x in re.findall(r"\d+", story)]
    if "spend" in story:
        return "w", lambda w: n[0] - n[1] * w
    if "Tickets cost" in story:
        return "t", lambda t: n[0] * t + n[1]
    if "Each box holds" in story:
        return "n", lambda x: n[0] * x + n[1]
    if "split a bill" in story:
        people = NUMBER_WORDS[story.split()[0]]
        return "b", lambda b: Fraction(b + n[0], people)
    if "the sum of n and" in story:
        k = NUMBER_WORDS[re.search(r"is (\w+)", story)[1]]
        return "n", lambda x: k * (x + n[0])
    if "rectangle" in story:
        return "w", lambda w: 2 * w + 2 * (w + n[0])
    raise ValueError(f"unread story: {story}")


def fits(story: str, options):
    letter, truth = story_at(story)
    right = [o for o in options if all(at(o, {letter: v}) == truth(v) for v in SAMPLES)]
    return right[0] if len(right) == 1 else f"{len(right)} options fit"


# --- Proportional Relationships --------------------------------------------

def pairs(text: str):
    return [(Fraction(x), Fraction(y)) for x, y in re.findall(r"([\d.]+)→([\d.]+)", text)]


def proportional_table(text: str) -> str:
    return "yes" if len({y / x for x, y in pairs(text)}) == 1 else "no"


def constant_from(text: str) -> Fraction:
    ks = {y / x for x, y in pairs(text)}
    if len(ks) != 1:
        raise ValueError("table is not proportional")
    return ks.pop()


def use_k(x0, y0, want, given):
    k = Fraction(y0) / Fraction(x0)
    return k * Fraction(given) if want == "y" else Fraction(given) / k


def graph_proportional(text: str) -> str:
    m = re.match(r"line through \((\d+), (\d+)\)", text)
    return "yes" if m and m[1] == "0" and m[2] == "0" else "no"


# How many of the smaller unit make one of the bigger, written out here
# rather than imported, so a wrong constant in the generator cannot agree
# with itself.
PER = {("m", "cm"): 100, ("km", "m"): 1000, ("kg", "g"): 1000, ("L", "mL"): 1000,
       ("h", "min"): 60, ("min", "s"): 60, ("ft", "in"): 12, ("yd", "ft"): 3,
       ("day", "h"): 24, ("cm", "mm"): 10}


def convert(amount_: str, a: str, b: str) -> Fraction:
    v = Fraction(amount_)
    return v * PER[(a, b)] if (a, b) in PER else v / PER[(b, a)]


# --- Writing Equations -----------------------------------------------------

def story_solution(story: str):
    """The unknown a word-equation story pins down: (letter, value), from its numbers."""
    n = [int(x) for x in re.findall(r"\d+", story)]
    if "taxi" in story:
        return "m", Fraction(n[2] - n[0], n[1])
    if "Two numbers add up to" in story:
        return "n", Fraction(n[0] - n[1], 2)
    if "the sum of a number and" in story:
        k = NUMBER_WORDS[story.split(" the sum")[0]]
        return "n", Fraction(n[1], k) - n[0]
    if "rectangle" in story:
        return "w", Fraction(n[1] - 2 * n[0], 4)
    if "saves" in story:
        return "t", Fraction(n[2] - n[0], n[1])
    if "less than" in story:
        return "n", Fraction(n[2] + n[0], n[1])
    raise ValueError(f"unread story: {story}")


def equation_for(story: str, options):
    letter, value = story_solution(story)
    def balances(eq):
        lhs, rhs = eq.replace("−", "-").split(" = ")
        return evaluate(lhs, letter, value) == evaluate(rhs, letter, value)
    right = [o for o in options if balances(o)]
    return right[0] if len(right) == 1 else f"{len(right)} options balance"


BY_RULE += (
    (re.compile(r"^(-?\d+\.\d*\(\d+\)) as a fraction$"), repeating),
    (re.compile(r"^√(\d+) to 1 dp$"), root_to_1dp),
    (re.compile(r"^k from (.+)$"), constant_from),
    (re.compile(r"^y = kx, ([\d.]+)→([\d.]+), ([xy]) at [xy] = ([\d.]+)$"),
     lambda x0, y0, want, given: use_k(x0, y0, want, given)),
    (re.compile(r"^graph through \((\d+), (\d+)\), y at x = ([\d.]+)$"),
     lambda a, b, x: Fraction(b, a) * Fraction(str(x))),
    (re.compile(r"^([\d.]+) ([A-Za-z]+) to ([A-Za-z]+)$"),
     lambda v, a, b: convert(str(v), a, b)),
    # Last: the most general shape, which the two above would otherwise fall into.
    (re.compile(r"^(.+) at ([A-Za-z] = .+)$"), substitute),
)

CHOICE_RULES += (
    (re.compile(r"^ends or repeats: (-?\d+)/(\d+)$"), ends_or_repeats),
    (re.compile(r"^rational or irrational: (.+)$"), rational_or_not),
    (re.compile(r"^bigger: (\S+) or (\S+)$"), real_bigger),
    (re.compile(r"^same: (.+) and (.+)$"), same_or_not),
    (re.compile(r"^proportional: (.+)$"), proportional_table),
    (re.compile(r"^graph proportional: (.+)$"), graph_proportional),
)

# Choices among written expressions or equations: the story says what the
# right one must equal, and exactly one option may agree with it.
OPTION_RULES = (
    (re.compile(r"^fits: (.+)$"), fits),
    (re.compile(r"^equation for: (.+)$"), equation_for),
)



# --- Slope -----------------------------------------------------------------

PT = r"\((-?\d+), (-?\d+)\)"


def rise_over_run(x1, y1, x2, y2) -> Fraction:
    return Fraction(int(y2) - int(y1), int(x2) - int(x1))


def table_slope(text: str) -> Fraction:
    rows = [(int(x), int(y)) for x, y in re.findall(r"(-?\d+)→(-?\d+)", text)]
    steps = {Fraction(b[1] - a[1], b[0] - a[0]) for a, b in zip(rows, rows[1:])}
    if len(steps) != 1:
        raise ValueError("table is not a line")
    return steps.pop()


def slope_kind(x1, y1, x2, y2) -> str:
    rise, run = int(y2) - int(y1), int(x2) - int(x1)
    if run == 0:
        return "undefined"
    if rise == 0:
        return "zero"
    return "positive" if (rise > 0) == (run > 0) else "negative"


BY_RULE += (
    (re.compile(rf"^slope from graph {PT} {PT}$"), rise_over_run),
    (re.compile(rf"^slope {PT} {PT}$"), rise_over_run),
    (re.compile(r"^slope table (.+)$"), table_slope),
    (re.compile(rf"^rate \w+ {PT} {PT}$"), rise_over_run),
)

CHOICE_RULES += (
    (re.compile(rf"^kind of slope {PT} {PT}$"), slope_kind),
)



# --- Linear Equations ------------------------------------------------------

def line_at(rhs: str, x) -> Fraction:
    return evaluate(rhs.replace("−", "-"), "x", x)


def slope_intercept(rhs: str):
    """The m and b of y = rhs, read off by evaluating it at 0 and 1 -- after checking it is a line."""
    b = line_at(rhs, 0)
    m = line_at(rhs, 1) - b
    if any(line_at(rhs, x) != m * x + b for x in (2, 3, -5)):
        raise ValueError(f"not a line: {rhs}")
    return m, b


def through(x1, y1, x2, y2):
    if int(x1) == int(x2):
        return "x", Fraction(int(x1))
    m = Fraction(int(y2) - int(y1), int(x2) - int(x1))
    return m, int(y1) - m * int(x1)


def slope_and_point(m, x, y):
    m = Fraction(str(m))
    return m, int(y) - m * int(x)


def on_line(x, y, rhs):
    return "yes" if line_at(rhs, int(x)) == int(y) else "no"


BY_RULE += (
    (re.compile(r"^slope of y = (.+)$"), lambda rhs: slope_intercept(rhs)[0]),
    (re.compile(r"^intercept of y = (.+)$"), lambda rhs: slope_intercept(rhs)[1]),
    (re.compile(r"^x-intercept of y = (.+)$"),
     lambda rhs: -slope_intercept(rhs)[1] / slope_intercept(rhs)[0]),
)

CHOICE_RULES += (
    (re.compile(rf"^on line: {PT} y = (.+)$"), on_line),
)

# Answers that are lines: (m, b), each compared exactly with the stored line.
LINE_RULES = (
    (re.compile(rf"^line from graph {PT} {PT}$"), through),
    (re.compile(rf"^line through {PT} {PT}$"), through),
    (re.compile(rf"^line slope (-?[\d/]+) through {PT}$"), slope_and_point),
)



# --- Forms of a Line -------------------------------------------------------

def at_xy(src: str, x, y) -> Fraction:
    text = src.replace("−", "-").replace("x", f"({x})").replace("y", f"({y})")
    return evaluate(text)


def as_line(equation: str):
    """
    Any linear equation in x and y, solved for y by evaluating
    left minus right at three points -- so point-slope, standard form and
    slope-intercept are all read by one route that shares nothing with the
    generator's rearranging.
    """
    left, right = equation.split(" = ")
    f = lambda x, y: at_xy(left, x, y) - at_xy(right, x, y)
    k = f(0, 0)
    a, b = f(1, 0) - k, f(0, 1) - k
    if f(2, 3) != k + 2 * a + 3 * b or f(-4, 5) != k - 4 * a + 5 * b:
        raise ValueError(f"not linear: {equation}")
    if b == 0:
        return "x", -k / a
    return -a / b, -k / b


def related(equation, x, y, perpendicular):
    m, _ = as_line(equation)
    if perpendicular:
        m = -1 / m
    return m, int(y) - m * int(x)


def relation_of(e1: str, e2: str) -> str:
    m1, _ = as_line(e1)
    m2, _ = as_line(e2)
    if m1 == m2:
        return "parallel"
    return "perpendicular" if m1 * m2 == -1 else "neither"


def form_for(key: str) -> str:
    if re.match(r"slope \S+, y-intercept", key):
        return "slope-intercept"
    if re.match(r"slope \S+, point|points ", key):
        return "point-slope"
    if key.startswith("intercepts of"):
        return "standard"
    raise ValueError(f"unread scenario: {key}")


LINE_RULES += (
    (re.compile(r"^point-slope (.+)$"), as_line),
    (re.compile(r"^standard (.+)$"), as_line),
    (re.compile(rf"^horizontal through {PT}$"), lambda x, y: (0, int(y))),
    (re.compile(rf"^vertical through {PT}$"), lambda x, y: ("x", Fraction(int(x)))),
    (re.compile(rf"^parallel to (.+) through {PT}$"), lambda e, x, y: related(e, x, y, False)),
    (re.compile(rf"^perpendicular to (.+) through {PT}$"), lambda e, x, y: related(e, x, y, True)),
)

CHOICE_RULES += (
    (re.compile(r"^relation: (y = .+) and (y = .+)$"), relation_of),
    (re.compile(r"^which form: (.+)$"), form_for),
)



# --- Linear Models ---------------------------------------------------------

def rows_of(text: str):
    return [(int(x), int(y)) for x, y in re.findall(r"(-?\d+)→(-?\d+)", text)]


def meaning_of(rhs: str, number: str) -> str:
    m, b = slope_intercept(rhs)
    n = Fraction(number.replace("−", "-"))
    if (n == m) == (n == b):
        raise ValueError("the number asked about is ambiguous")
    return "rate" if n == m else "start"


def linear_or_not(text: str) -> str:
    rows = rows_of(text)
    steps = {Fraction(b[1] - a[1], b[0] - a[0]) for a, b in zip(rows, rows[1:])}
    return "linear" if len(steps) == 1 else "not"


def compare_functions(ask: str, table: str, rhs: str) -> str:
    rows = rows_of(table)
    (x0, y0), (x1, y1) = rows[0], rows[1]
    ma = Fraction(y1 - y0, x1 - x0)
    if any(y != y0 + ma * (x - x0) for x, y in rows):
        raise ValueError("table is not a line")
    a = ma if ask == "rate" else y0 - ma * x0
    mb, bb = slope_intercept(rhs)
    b = mb if ask == "rate" else bb
    if a == b:
        raise ValueError("a tie")
    return "A" if a > b else "B"


def story_part(ask: str, corners: str) -> str:
    pts = [(int(x), int(y)) for x, y in re.findall(PT, corners)]
    slopes = [Fraction(b[1] - a[1], b[0] - a[0]) for a, b in zip(pts, pts[1:])]
    if ask == "fastest":
        top = max(abs(m) for m in slopes)
        found = [i for i, m in enumerate(slopes) if abs(m) == top]
    elif ask == "stopped":
        found = [i for i, m in enumerate(slopes) if m == 0]
    else:
        found = [i for i, m in enumerate(slopes) if m < 0]
    if len(found) != 1:
        raise ValueError(f"{len(found)} parts fit")
    return "ABC"[found[0]]


BY_RULE += (
    (re.compile(r"^interest (\d+) at (\d+)% for (\d+) (total|interest)$"),
     lambda P, r, t, what: Fraction(P * r * t, 100) + (P if what == "total" else 0)),
)

CHOICE_RULES += (
    (re.compile(r"^meaning: \w+ y = (.+), the (\S+)$"), meaning_of),
    (re.compile(r"^linear table: (.+)$"), linear_or_not),
    (re.compile(r"^compare (rate|start): (.+) vs y = (.+)$"), compare_functions),
    (re.compile(r"^story graph (fastest|stopped|returning): (.+)$"), story_part),
)

LINE_RULES += (
    (re.compile(r"^model \w+ start (-?\d+) rate (-?\d+)$"), lambda b, m: (int(m), int(b))),
    (re.compile(rf"^model from {PT} {PT}$"), through),
)



# --- Systems of Equations --------------------------------------------------

def coeffs(equation: str):
    """ax + by = c from any linear equation in x and y, by evaluating it."""
    left, right = equation.split(" = ")
    f = lambda x, y: at_xy(left, x, y) - at_xy(right, x, y)
    k = f(0, 0)
    a, b = f(1, 0) - k, f(0, 1) - k
    if f(2, 3) != k + 2 * a + 3 * b:
        raise ValueError(f"not linear: {equation}")
    return a, b, -k


def solve_system(e1: str, e2: str):
    """Cramer's rule, exactly: the route a generator built on elimination does not take."""
    (a1, b1, c1), (a2, b2, c2) = coeffs(e1), coeffs(e2)
    det = a1 * b2 - a2 * b1
    if det == 0:
        raise ValueError("no single solution")
    return (c1 * b2 - c2 * b1) / det, (a1 * c2 - a2 * c1) / det


def count_solutions(e1: str, e2: str) -> str:
    (a1, b1, c1), (a2, b2, c2) = coeffs(e1), coeffs(e2)
    if a1 * b2 != a2 * b1:
        return "one"
    # Same left side up to a factor: the right sides decide.
    return "infinite" if a1 * c2 == a2 * c1 and b1 * c2 == b2 * c1 else "none"


def method_for(e1: str, e2: str) -> str:
    if re.match(r"^[xy] = ", e1) or re.match(r"^[xy] = ", e2):
        return "substitution"
    (a1, b1, _), (a2, b2, _) = coeffs(e1), coeffs(e2)
    if abs(a1) == abs(a2) or abs(b1) == abs(b2):
        return "elimination"
    return "scale"


BY_RULE += (
    (re.compile(r"^words: (.+); (.+); ([xy])$"),
     lambda e1, e2, v: solve_system(e1, e2)["xy".index(v)]),
)

CHOICE_RULES += (
    (re.compile(r"^solutions of system: (.+); (.+)$"), count_solutions),
    (re.compile(r"^which method: (.+); (.+)$"), method_for),
)

PAIR_RULES = (
    (re.compile(r"^cross (.+); (.+)$"), solve_system),
    (re.compile(r"^system: (.+); (.+)$"), solve_system),
)


# --- Functions ---------------------------------------------------------------

def one_output(text: str) -> str:
    outputs = {}
    for x, y in re.findall(PT, text):
        outputs.setdefault(x, set()).add(y)
    return "yes" if all(len(ys) == 1 for ys in outputs.values()) else "no"


# Which drawn shapes give some x two y values: the definition, by shape.
TWO_VALUED = ("circle", "sideways parabola", "vertical line")


def solve_linear(k: str, src: str) -> Fraction:
    b, m = at(src, {"x": 0}), at(src, {"x": 1}) - at(src, {"x": 0})
    if at(src, {"x": 2}) != b + 2 * m or m == 0:
        raise ValueError(f"not a line with one solution: {src}")
    return (Fraction(k) - b) / m


def domain_range(ask: str, corners: str) -> int:
    pts = [(int(x), int(y)) for x, y in re.findall(PT, corners)]
    xs, ys = [x for x, _ in pts], [y for _, y in pts]
    return {"domain-low": min(xs), "domain-high": max(xs),
            "range-low": min(ys), "range-high": max(ys)}[ask]


def reading_of(a: str, b: str, in_unit: str, out_unit: str, ids):
    """The input, with its unit, named before the output with its: f(a) = b read in order."""
    unit = lambda n, u: rf"(?<![\d.]){n} ?{re.escape(u)}\b" if u[0].isalpha() else rf"(?<![\d.]){n}{re.escape(u)}"
    fit = [o for o in ids
           if (i := re.search(unit(a, in_unit), o)) and (j := re.search(unit(b, out_unit), o)) and i.start() < j.start()
           and "every" not in o]
    if len(fit) != 1:
        raise ValueError(f"{len(fit)} readings fit")
    return fit[0]


BY_RULE += (
    (re.compile(r"^\w\((-?\d+)\) for \w\(x\) = (.+)$"), lambda a, src: at(src, {"x": a})),
    (re.compile(r"^read f\((-?\d+)\) on y = (.+)$"), lambda a, src: at(src, {"x": a})),
    (re.compile(r"^solve f\(x\) = (-?\d+) for f\(x\) = (.+)$"), solve_linear),
    (re.compile(r"^((?:domain|range)-(?:low|high)) of (.+)$"), domain_range),
)

CHOICE_RULES += (
    (re.compile(r"^function\? (.+)$"), one_output),
    (re.compile(r"^vertical test: (.+)$"),
     lambda shape: "no" if shape.startswith(TWO_VALUED) else "yes"),
)

OPTION_RULES += (
    (re.compile(r"^means: \w\((\d+)\) = (\d+) \| (.+) \| (.+)$"), reading_of),
)


# --- Sequences ---------------------------------------------------------------

def terms_of(text: str):
    return [Fraction(t) for t in text.split(", ")]


def kind_of(text: str) -> str:
    t = terms_of(text)
    if len({b - a for a, b in zip(t, t[1:])}) == 1:
        return "arithmetic"
    if 0 not in t and len({b / a for a, b in zip(t, t[1:])}) == 1:
        return "geometric"
    return "neither"


def nth_term(n: str, text: str) -> Fraction:
    t, k = terms_of(text), int(n)
    kind = kind_of(text)
    if kind == "arithmetic":
        return t[0] + (k - 1) * (t[1] - t[0])
    if kind == "geometric":
        return t[0] * (t[1] / t[0]) ** (k - 1)
    raise ValueError(f"no rule for {text}")


def missing_term(text: str) -> Fraction:
    parts = text.split(", ")
    gap = parts.index("?")
    known = [(i, Fraction(v)) for i, v in enumerate(parts) if v != "?"]
    steps = {(b - a) / (j - i) for (i, a), (j, b) in zip(known, known[1:])}
    if len(steps) != 1:
        raise ValueError("not arithmetic")
    (i, v) = known[0]
    return v + (gap - i) * steps.pop()


def which_term(value: str, text: str) -> Fraction:
    t = terms_of(text)
    d = t[1] - t[0]
    n = (Fraction(value) - t[0]) / d + 1
    if kind_of(text) != "arithmetic" or n.denominator != 1 or n < 1:
        raise ValueError("not a term")
    return n


def recursive_term(starts: str, rule: str, n: str) -> Fraction:
    """Step the rule along: p is the term before, q the one before that."""
    t = [Fraction(v) for v in starts.split(", ")]
    while len(t) < int(n):
        t.append(at(rule, {"p": t[-1], "q": t[-2] if len(t) > 1 else 0}))
    return t[int(n) - 1]


def rule_for(text: str):
    t = terms_of(text)
    if kind_of(text) != "arithmetic":
        raise ValueError("no arithmetic rule")
    d = t[1] - t[0]
    return d, t[0] - d


BY_RULE += (
    (re.compile(r"^difference of (.+)$"),
     lambda text: (t := terms_of(text))[1] - t[0] if kind_of(text) == "arithmetic" else None),
    (re.compile(r"^missing in (.+)$"), missing_term),
    (re.compile(r"^which term is (-?\d+) in (.+)$"), which_term),
    (re.compile(r"^term (\d+) of (.+)$"), nth_term),
    (re.compile(r"^term (\d+) with a1 = (-?\d+) d = (-?\d+)$"),
     lambda n, a, d: int(a) + (n - 1) * int(d)),
    (re.compile(r"^term (\d+) with a1 = (-?\d+) r = (-?\d+)/(\d+)$"),
     lambda n, a, p, q: int(a) * Fraction(int(p), q) ** (n - 1)),
    (re.compile(r"^ratio of (.+)$"),
     lambda text: (t := terms_of(text))[1] / t[0] if kind_of(text) == "geometric" else None),
    (re.compile(r"^recursive (.+) \| (.+) \| term (\d+)$"),
     lambda starts, rule, n: recursive_term(str(starts), rule, str(n))),
)

CHOICE_RULES += (
    (re.compile(r"^kind of (.+)$"), kind_of),
)

RULE_RULES = (
    (re.compile(r"^rule for (.+)$"), rule_for),
)


# --- Compound Inequalities ---------------------------------------------------
#
# A set is a frozenset of the numbers in it, tested at sample points: every
# integer and half-integer from -40 to 40. Two sets with whole or half ends
# inside that range are equal exactly when they agree at every sample -- a
# test that shares nothing with the interval arithmetic the app does.

SAMPLES_ON_LINE = [Fraction(k, 2) for k in range(-80, 81)]
OPS = {"<": lambda a, b: a < b, "<=": lambda a, b: a <= b,
       ">": lambda a, b: a > b, ">=": lambda a, b: a >= b, "=": lambda a, b: a == b}


def at_any(src: str, x: Fraction) -> Fraction:
    """src at x, whatever its one letter is, with |...| worked out as distance."""
    every = {c: x for c in "abcdefghijklmnopqrstuvwxyz"}
    src = re.sub(r"\|([^|]+)\|", lambda m: f"({abs(at(m[1], every))})", src)
    return at(src, every)


def holds(relation: str, x: Fraction) -> bool:
    """One chain of comparisons, like -3 < 2x + 1 <= 7 or 2|x - 1| = 6, at one value of x."""
    bits = re.split(r"\s*(<=|>=|<|>|=)\s*", relation.strip())
    values = [at_any(b, x) for b in bits[0::2]]
    return all(OPS[op](values[i], values[i + 1]) for i, op in enumerate(bits[1::2]))


def piecewise(src: str):
    """src as c + a·x + b·|p·x + q|, read off by evaluating it, and checked at a
    point the reading did not use. Parsing once instead of at every sample
    is the difference between seconds and a minute on these levels."""
    bars = re.findall(r"\|([^|]+)\|", src)
    if len(bars) > 1:
        raise ValueError(f"two absolute values: {src}")
    every = lambda v: {c: v for c in "abcdefghijklmnopqrstuvwxyz"}
    inner = bars[0] if bars else "0"
    q = at(inner, every(0))
    p = at(inner, every(1)) - q
    if at(inner, every(2)) != q + 2 * p:
        raise ValueError(f"not linear inside the bars: {src}")
    outer = re.sub(r"\|[^|]+\|", "(u)", src)
    f = lambda x, u: at(outer, {**every(x), "u": u})
    c = f(0, 0)
    a, b = f(1, 0) - c, f(0, 1) - c
    if f(2, 3) != c + 2 * a + 3 * b:
        raise ValueError(f"not linear: {src}")
    return lambda x: c + a * x + b * abs(p * x + q)


def solve_set(text: str) -> frozenset:
    clauses = []
    for clause in text.split(" or "):
        chains = []
        for relation in clause.split(" and "):
            bits = re.split(r"\s*(<=|>=|<|>|=)\s*", relation.strip())
            chains.append(([piecewise(b) for b in bits[0::2]], bits[1::2]))
        clauses.append(chains)
    def holds_at(chains, x):
        for sides, ops in chains:
            values = [f(x) for f in sides]
            if not all(OPS[op](values[i], values[i + 1]) for i, op in enumerate(ops)):
                return False
        return True
    found = frozenset(x for x in SAMPLES_ON_LINE if any(holds_at(c, x) for c in clauses))
    # The reading above is checked against the plain one at a few points.
    for x in SAMPLES_ON_LINE[::37]:
        if (x in found) != any(all(holds(r, x) for r in clause.split(" and ")) for clause in text.split(" or ")):
            raise ValueError(f"piecewise reading disagrees at {x}: {text}")
    return found


def interval_set(text: str) -> frozenset:
    def inside(piece, x):
        m = re.fullmatch(r"([(\[])(-inf|-?\d+), (inf|-?\d+)([)\]])", piece.strip())
        lo, hi = m[2], m[3]
        ok_lo = lo == "-inf" or (x >= int(lo) if m[1] == "[" else x > int(lo))
        ok_hi = hi == "inf" or (x <= int(hi) if m[4] == "]" else x < int(hi))
        return ok_lo and ok_hi
    return frozenset(x for x in SAMPLES_ON_LINE if any(inside(p, x) for p in text.split(" U ")))


WORDS_REL = {"greater than": ">", "at least": ">=", "less than": "<", "at most": "<="}


def words_set(text: str) -> frozenset:
    """'x is at least -2 and less than 5', read as two relations."""
    body = text.removeprefix("x is ")
    rel = re.sub(r"(greater than|at least|less than|at most) (-?\d+)",
                 lambda m: f"x {WORDS_REL[m[1]]} {m[2]}", body)
    return solve_set(rel)


def answer_set(value) -> frozenset:
    def inside(p, x):
        lo, hi = p["lo"], p["hi"]
        ok_lo = lo is None or (x >= as_fraction(lo) if p["loIn"] else x > as_fraction(lo))
        ok_hi = hi is None or (x <= as_fraction(hi) if p["hiIn"] else x < as_fraction(hi))
        return ok_lo and ok_hi
    return frozenset(x for x in SAMPLES_ON_LINE if any(inside(p, x) for p in value["parts"]))


SET_RULES = (
    (re.compile(r"^solve: (.+)$"), solve_set),
    (re.compile(r"^combine: (.+)$"), solve_set),
    (re.compile(r"^graph set: (.+)$"), interval_set),
    (re.compile(r"^words: (x is .+)$"), words_set),
)


def notation_set(label: str) -> frozenset:
    """An option as the student reads it: (−∞, −6) ∪ [2, ∞) or −2 < x ≤ 5."""
    plain = (label.replace("−∞", "-inf").replace("∞", "inf").replace("∪", "U")
             .replace("−", "-").replace("≤", "<=").replace("≥", ">="))
    if plain.startswith(("(", "[")):
        if re.search(r"\[-inf|inf\]", plain):
            return frozenset({"never a set"})
        return interval_set(plain)
    return solve_set(plain)


def matching_option(given: str, ids):
    want = interval_set(given)
    fit = [o for o in ids if notation_set(o) == want]
    if len(fit) != 1:
        raise ValueError(f"{len(fit)} options are {given}")
    return fit[0]


OPTION_RULES += (
    (re.compile(r"^(?:interval|inequality) for: (.+)$"), matching_option),
)


# --- Absolute Value ----------------------------------------------------------
#
# Its equations and inequalities are solved by solve_set above, which reads
# the bars as a distance; only the shape question needs a rule of its own.

def shape_of(text: str) -> str:
    found = solve_set(text)
    if not found:
        return "none"
    if found == frozenset(SAMPLES_ON_LINE):
        return "all"
    ends = SAMPLES_ON_LINE[0] in found, SAMPLES_ON_LINE[-1] in found
    if ends == (True, True):
        return "outside"
    if ends == (False, False):
        inside = [x for x in SAMPLES_ON_LINE if min(found) <= x <= max(found)]
        if set(inside) == found:
            return "between"
    raise ValueError(f"no single shape: {text}")


CHOICE_RULES += (
    (re.compile(r"^shape of: (.+)$"), shape_of),
)


# --- Graphing Inequalities ---------------------------------------------------

def holds_xy(ineq: str, x, y) -> bool:
    left, op, right = re.split(r"\s*(<=|>=|<|>)\s*", ineq.strip())
    env = {"x": Fraction(x), "y": Fraction(y)}
    return OPS[op](at(left, env), at(right, env))


GRID = [(Fraction(i, 2), Fraction(j, 2)) for i in range(-20, 21) for j in range(-20, 21)]


def kept(ineq: str) -> frozenset:
    """The grid points an inequality keeps. Read once as a·x + b·y + c against
    zero -- after checking it is linear -- rather than parsed at every point."""
    left, op, right = re.split(r"\s*(<=|>=|<|>)\s*", ineq.strip())
    f = lambda x, y: at(left, {"x": x, "y": y}) - at(right, {"x": x, "y": y})
    c = f(0, 0)
    a, b = f(1, 0) - c, f(0, 1) - c
    if f(2, -3) != c + 2 * a - 3 * b:
        raise ValueError(f"not linear: {ineq}")
    return frozenset(p for p in GRID if OPS[op](a * p[0] + b * p[1] + c, 0))


def drawn_as(ineq: str) -> str:
    """Dashed or solid from the sign; above or below from a point far up the y-axis."""
    style = "solid" if re.search(r"<=|>=", ineq) else "dashed"
    return f"{style}-{'above' if holds_xy(ineq, 0, 10**6) else 'below'}"


def halfplane_text(v) -> str:
    """The stored answer back as an inequality the checker can test."""
    op = v["op"]
    if "x" in v:
        return f"x {op} {as_fraction(v['x'])}"
    return f"y {op} ({as_fraction(v['m'])})*x + ({as_fraction(v['b'])})"


def point_in_both(e1: str, e2: str, points: str, ids):
    named = dict((n, (int(x), int(y))) for n, x, y in re.findall(rf"([A-D]) {PT}", points))
    fit = [n for n, p in named.items() if holds_xy(e1, *p) and holds_xy(e2, *p)]
    if len(fit) != 1:
        raise ValueError(f"{len(fit)} points in both")
    return fit[0]


def extreme_y(kind: str, a: int, b: int, op: str, total: int, x: int) -> int:
    fits = [y for y in range(0, 1000) if OPS[op](a * x + b * y, total)]
    return max(fits) if kind == "most" else min(fits)


BY_RULE += (
    (re.compile(r"^(most|least) y: (\d+)x \+ (\d+)y (<=|>=) (\d+) with x = (\d+)$"), extreme_y),
)

CHOICE_RULES += (
    (re.compile(rf"^solution\? {PT} of (.+)$"),
     lambda x, y, ineq: "yes" if holds_xy(ineq, int(x), int(y)) else "no"),
    (re.compile(r"^drawn: (.+)$"), drawn_as),
)

OPTION_RULES += (
    (re.compile(r"^both: (.+); (.+) \| (.+)$"), point_in_both),
)

HALFPLANE_RULES = (
    (re.compile(r"^graph: (.+)$"), kept),
)


# --- Monomials ---------------------------------------------------------------
#
# An answer is right when it has the question's value at every choice of the
# letters -- two choices, with no letter 0 or 1 and different letters given
# different values, are enough for one term -- and is finished: one number,
# each letter once, and no zero or negative power left.

LETTER_VALUES = ({c: Fraction(v) for c, v in zip("abmnxy", (2, 3, 5, 7, 11, 13))},
                 {c: Fraction(v) for c, v in zip("abmnxy", (-3, 5, -2, 3, -5, 2))})
MONOMIAL = re.compile(r"^-?\d*(?:[a-z](?:\^\d+)?)*$")
OVER = re.compile(r"^-?\d*(?:[a-z](?:\^\d+)?)*/(?:\((?:[a-z](?:\^\d+)?)+\)|[a-z](?:\^\d+)?)$")


def same_value(a: str, b: str) -> bool:
    return all(at(a, v) == at(b, v) for v in LETTER_VALUES)


def finished_monomial(src: str, answer: str, allow_over: bool) -> str:
    if not same_value(src, answer):
        return f"has a different value from {src}"
    if not (MONOMIAL.match(answer) or (allow_over and OVER.match(answer))):
        return "is not one finished term"
    letters = re.findall(r"[a-z]", answer)
    if len(letters) != len(set(letters)) or "^0" in answer or "^1" in re.sub(r"\^1\d", "", answer):
        return "repeats a letter or leaves a power of 0 or 1 written"
    return "ok"


SUPERSCRIPT = str.maketrans("⁰¹²³⁴⁵⁶⁷⁸⁹", "0123456789")


def right_option(src: str, ids):
    plain = lambda label: re.sub(r"([a-z])([⁰¹²³⁴⁵⁶⁷⁸⁹]+)", lambda m: f"{m[1]}^{m[2].translate(SUPERSCRIPT)}", label)
    fit = [o for o in ids if same_value(src, plain(o))]
    if len(fit) != 1:
        raise ValueError(f"{len(fit)} options equal {src}")
    return fit[0]


OPTION_RULES += (
    (re.compile(r"^which is: (.+)$"), right_option),
)

EXPR_RULES = (
    (re.compile(r"^simplify: (.+)$"), lambda src, answer: finished_monomial(src, answer, False)),
    (re.compile(r"^positive powers: (.+)$"), lambda src, answer: finished_monomial(src, answer, True)),
)


# --- Rational Exponents ------------------------------------------------------
#
# A number to a fraction power is worked out exactly where it comes out
# rational -- the root found by search, not by the generator's construction --
# and as a float only where a product of irrational powers is claimed whole.
# A power of a letter is followed as an exponent: x stands for an object whose
# only property is its power of x, so x^(1/2)*x^(1/3) is read by the rules of
# Python's Fraction rather than by anything this skill wrote.

def exact_root(n: int, k: int):
    if n < 0:
        if k % 2 == 0:
            return None
        r = exact_root(-n, k)
        return None if r is None else -r
    r = round(n ** (1 / k))
    return next((c for c in (r - 1, r, r + 1) if c >= 0 and c ** k == n), None)


def xpow(base, e):
    base, e = Fraction(base), Fraction(e)
    top, bottom = exact_root(base.numerator, e.denominator), exact_root(base.denominator, e.denominator)
    if top is None or bottom is None:
        sign = -1 if base < 0 else 1
        return sign * abs(float(base)) ** float(e)
    return Fraction(top, bottom) ** e.numerator


def power_value(src: str, answer) -> str:
    # Each power becomes a call on its two parts, as text; what is left
    # around them is whole numbers and * and -, which Python reads as is.
    num = r"(\(-?[\d./]+\)|[\d.]+)"
    code = re.sub(num + r"\^" + num, lambda m: f"xpow('{m[1].strip('()')}', '{m[2].strip('()')}')", src)
    got = eval(code, {"xpow": xpow})
    want = as_fraction(answer)
    if isinstance(got, float):
        return "ok" if abs(got - float(want)) < 1e-9 * max(1, abs(got)) else f"is {got}, not {want}"
    return "ok" if got == want else f"is {got}, not {want}"


class Power:
    def __init__(self, e):
        self.e = Fraction(e)

    def __mul__(self, other):
        return Power(self.e + other.e)

    def __truediv__(self, other):
        return Power(self.e - other.e)

    def __rtruediv__(self, one):
        assert one == 1
        return Power(-self.e)

    def __pow__(self, k):
        return Power(self.e * Fraction(k))


def exponent_of(src: str) -> Fraction:
    code = re.sub(r"\d+", lambda m: f"Fraction({m[0]})", src).replace("^", "**")
    code = re.sub(r"root\((Fraction\(\d+\)), ", r"rt(\1, ", code)
    names = {"Fraction": Fraction, "sqrt": lambda p: p ** Fraction(1, 2),
             "rt": lambda n, p: p ** (1 / n)}
    names.update({v: Power(1) for v in "axyn"})
    return eval(code, names).e


ONE_POWER = re.compile(r"^([axyn])(?:\^(\d+|\(-?\d+\)|\(-?\d+/\d+\)))?$")


def one_power(src: str, answer: str) -> str:
    m = ONE_POWER.match(answer)
    if not m or m[1] not in src:
        return "is not one power of the letter"
    e = Fraction(m[2].strip("()")) if m[2] else Fraction(1)
    if m[2] and "/" in m[2] and (e.denominator == 1 or str(e) != m[2].strip("()")):
        return "is not written in lowest terms"
    want = exponent_of(src)
    return "ok" if e == want else f"has power {e}, not {want}"


EXPR_RULES += (
    (re.compile(r"^as a power: (.+)$"), one_power),
)


# --- Polynomials -------------------------------------------------------------
#
# A polynomial's coefficients are found by evaluating it at x = 0..7 and
# solving for them, so the question is read as the expression it is, brackets
# and all, and never by its terms. Two more points confirm the degree is under
# eight. An answer must have the same coefficients and be written expanded
# and collected: no brackets, each power once, no 0 or 1 left written.

def coefficients(src: str) -> list:
    letter = re.search(r"[a-z]", src)[0]
    xs = range(8)
    rows = [[Fraction(x) ** k for k in range(8)] + [at(src, {letter: Fraction(x)})] for x in xs]
    for i in range(8):
        pivot = next(r for r in range(i, 8) if rows[r][i] != 0)
        rows[i], rows[pivot] = rows[pivot], rows[i]
        rows[i] = [v / rows[i][i] for v in rows[i]]
        for r in range(8):
            if r != i and rows[r][i] != 0:
                rows[r] = [a - rows[r][i] * b for a, b in zip(rows[r], rows[i])]
    cs = [rows[k][8] for k in range(8)]
    for x in (8, 9):
        assert sum(c * x ** k for k, c in enumerate(cs)) == at(src, {letter: Fraction(x)}), f"degree of {src}"
    while len(cs) > 1 and cs[-1] == 0:
        cs.pop()
    return cs


POLY_TERM = re.compile(r"^(\d*)([a-z])(?:\^(\d+))?$|^(\d+)$")


def expanded(answer: str) -> bool:
    powers = []
    for t in re.split(r"(?<!^)\s*[+-]\s*", answer.strip().lstrip("-")):
        m = POLY_TERM.match(t.strip())
        if not m or m[1] in ("1", "0") or m[3] in ("0", "1") or m[4] == "0":
            return False
        powers.append(0 if m[4] else int(m[3] or 1))
    return len(powers) == len(set(powers))


def same_polynomial(src: str, answer: str) -> str:
    if coefficients(src) != coefficients(answer):
        return f"is not {src} multiplied out"
    return "ok" if expanded(answer) else "is not expanded and collected"


EXPR_RULES += (
    (re.compile(r"^polynomial: (.+)$"), same_polynomial),
)

BY_RULE += (
    (re.compile(r"^degree: (.+)$"), lambda src: len(coefficients(src)) - 1),
    (re.compile(r"^leading: (.+)$"), lambda src: coefficients(src)[-1]),
    (re.compile(r"^constant: (.+)$"), lambda src: coefficients(src)[0]),
    (re.compile(r"^coefficient of [a-z](?:\^(\d+))?: (.+)$"),
     lambda k, src: coefficients(src)[k or 1]),
)


# --- Factoring ---------------------------------------------------------------
#
# An answer is a factorisation when it multiplies back to the question --
# coefficients compared, as for Polynomials -- and is finished: a monomial in
# front, then brackets, each with no number left to take out and nothing in
# it that factors again. A bracket of degree two is tested by its
# discriminant: it factors over the integers exactly when that is a square.

FACTORED = re.compile(r"^(-?\d*(?:[a-z](?:\^\d+)?)?)((?:\([^()]+\)(?:\^\d+)?)+)$")


def is_square(n) -> bool:
    return n >= 0 and math.isqrt(int(n)) ** 2 == n


def finished_factor(inner: str) -> bool:
    cs = coefficients(inner)
    if len(cs) < 2 or math.gcd(*[int(c) for c in cs]) != 1 or any(c.denominator != 1 for c in cs):
        return False
    if len(cs) == 2:
        return True
    return len(cs) == 3 and not is_square(cs[1] ** 2 - 4 * cs[2] * cs[0])


def factored(src: str, answer: str) -> str:
    if coefficients(src) != coefficients(answer):
        return f"does not multiply back to {src}"
    m = FACTORED.match(answer.replace(" ", ""))
    if not m:
        return "is not a product of factors"
    if not all(finished_factor(g) for g in re.findall(r"\(([^()]+)\)", m[2])):
        return "has a factor that factors again"
    return "ok"


def pattern_of(src: str) -> str:
    cs = [int(c) for c in coefficients(src)]
    if math.gcd(*cs) > 1 or cs[0] == 0:
        return "common"
    c, b, a = (cs + [0, 0])[:3]
    if b == 0 and is_square(abs(a)) and is_square(abs(c)) and a * c < 0:
        return "squares"
    if a > 0 and c > 0 and is_square(a) and is_square(c) and b * b == 4 * a * c:
        return "perfect"
    return "trinomial" if is_square(b * b - 4 * a * c) else "prime"


EXPR_RULES += (
    (re.compile(r"^factor: (.+)$"), factored),
)

CHOICE_RULES += (
    (re.compile(r"^pattern: (.+)$"), pattern_of),
)


# --- Quadratic Equations -----------------------------------------------------
#
# Solved by the discriminant from the equation's coefficients, read as for
# Polynomials, whatever form it was written in: the roots are compared as an
# exact set of points with the answer's. Which Method is decided from the
# equation's shape -- a bracket squared, or no term in the letter, is square
# roots; otherwise it factors exactly when the discriminant is a square.

def quadratic_roots(equation: str) -> set:
    left, right = equation.split(" = ")
    letter = re.search(r"[a-z]", equation)[0]
    cs = coefficients(f"({left}) - ({right})".replace(letter, "x"))
    c, b, a = (cs + [Fraction(0)] * 3)[:3]
    if a == 0:
        return {-c / b}
    d = b * b - 4 * a * c
    if d < 0:
        return set()
    root = Fraction(math.isqrt(d.numerator), math.isqrt(d.denominator))
    assert root * root == d, f"irrational roots in {equation}"
    return {(-b + root) / (2 * a), (-b - root) / (2 * a)}


def answer_points(value):
    """The answer's solutions as a set of numbers, or None if it holds a range."""
    out = set()
    for p in value["parts"]:
        if p["lo"] is None or p["lo"] != p["hi"] or not (p["loIn"] and p["hiIn"]):
            return None
        out.add(as_fraction(p["lo"]))
    return out


def method_of(equation: str) -> str:
    left, right = equation.split(" = ")
    if re.fullmatch(r"\([^()]+\)\^2", left) and re.fullmatch(r"-?\d+", right):
        return "roots"
    cs = coefficients(f"({left}) - ({right})")
    c, b, a = (cs + [Fraction(0)] * 3)[:3]
    if b == 0:
        return "roots"
    return "factor" if is_square(b * b - 4 * a * c) else "neither"


CHOICE_RULES += (
    (re.compile(r"^method: (.+)$"), method_of),
)


# --- The Quadratic Formula ---------------------------------------------------
#
# Each claimed root p + q√r is put back into the equation in exact
# arithmetic: x² is p² + q²r + 2pq√r, so the equation holds when its
# rational part and its √r part are both zero. The number of roots must be
# what the discriminant says, so a root that satisfies the equation cannot
# hide a missing second one.

def abc(equation: str):
    left, right = equation.split(" = ")
    letter = re.search(r"[a-z]", equation)[0]
    cs = coefficients(f"({left}) - ({right})".replace(letter, "x"))
    c, b, a = (cs + [Fraction(0)] * 3)[:3]
    return a, b, c


def real_root_count(equation: str) -> int:
    a, b, c = abc(equation)
    d = b * b - 4 * a * c
    return 2 if d > 0 else 1 if d == 0 else 0


def roots_hold(equation: str, value) -> str:
    a, b, c = abc(equation)
    roots = value["roots"]
    seen = {(as_fraction(x["a"]), as_fraction(x["b"]), x["r"]) for x in roots}
    if len(seen) != len(roots) or len(roots) != real_root_count(equation):
        return f"has {len(roots)} roots, not {real_root_count(equation)}"
    for p, q, r in seen:
        if r > 1 and (q == 0 or any(r % (k * k) == 0 for k in range(2, math.isqrt(r) + 1))):
            return "has a root not in simplest form"
        if a * (p * p + q * q * r) + b * p + c != 0 or 2 * a * p * q + b * q != 0:
            return f"has {p} + {q}√{r}, which is not a root"
    return "ok"


def quickest(equation: str) -> str:
    a, b, c = abc(equation)
    if b == 0:
        return "roots"
    if is_square(b * b - 4 * a * c):
        return "factor"
    return "complete" if a == 1 and b.denominator == 1 and b.numerator % 2 == 0 else "formula"


BY_RULE += (
    (re.compile(r"^square: (.+)$"), lambda src: (coefficients(src)[1] / 2) ** 2),
    (re.compile(r"^real roots: (.+)$"), real_root_count),
)

CHOICE_RULES += (
    (re.compile(r"^quickest: (.+)$"), quickest),
)


# --- Graphs of Quadratics ----------------------------------------------------
#
# The parabola is read from its coefficients, found as for Polynomials, so
# whatever form a question is written in, its vertex is (−b/2a, f(−b/2a)),
# its zeros are the roots of y = 0 and it opens the way a's sign says. A
# vertex form typed as the answer must have the same coefficients and be
# written as a(x − h)² + k. Which Form Shows It is decided from how the
# question is written: a bracket squared is vertex form, a product of
# brackets factored, anything else standard.

def vertex_of(src: str):
    c, b, a = (coefficients(src) + [Fraction(0)] * 3)[:3]
    assert a != 0, f"{src} is not a quadratic"
    h = -b / (2 * a)
    return h, a * h * h + b * h + c


VERTEX_FORM = re.compile(r"^-?\d*\(x [+-] [1-9]\d*\)\^2(?: [+-] [1-9]\d*)?$")


def in_vertex_form(src: str, answer: str) -> str:
    if coefficients(answer) != coefficients(src):
        return f"is not equal to {src}"
    return "ok" if VERTEX_FORM.match(answer) else "is not written as a(x - h)^2 + k"


def highest(src: str, want: str) -> Fraction:
    assert coefficients(src)[2] < 0, f"{src} has no highest point"
    h, k = vertex_of(src)
    return k if want == "of" else h


def form_of(src: str) -> str:
    if re.search(r"\)\^2", src):
        return "vertex"
    if re.search(r"\)\(|^-?\d*x\(", src):
        return "factored"
    return "standard"


WAY_TO = {
    "vertex": {"vertex": "read", "zeros": "solve", "y-intercept": "zero-x"},
    "factored": {"vertex": "halfway", "zeros": "read", "y-intercept": "zero-x"},
    "standard": {"vertex": "formula", "zeros": "solve", "y-intercept": "read"},
}

CHOICE_RULES += (
    (re.compile(r"^opens: (.+)$"), lambda src: "up" if coefficients(src)[2] > 0 else "down"),
    (re.compile(r"^quickest (vertex|zeros|y-intercept): (.+)$"), lambda ask, src: WAY_TO[form_of(src)][ask]),
)

PAIR_RULES += (
    (re.compile(r"^vertex: (.+)$"), vertex_of),
)

EXPR_RULES += (
    (re.compile(r"^vertex form: (.+)$"), in_vertex_form),
)

BY_RULE += (
    (re.compile(r"^max (of|at): (.+)$"), lambda want, src: highest(src, want)),
)


# --- Exponential Functions ---------------------------------------------------
#
# A model is evaluated where it is asked about: its start at x = 0, its factor
# as f(1)/f(0), growth when that factor is above 1. y = a·bˣ + k is pinned by
# three points -- b from the ratio of successive differences, then a, then k
# -- so its asymptote is found without reading the k off the text. Stories
# are rebuilt from their numbers by repeated multiplication, exactly.

def model_at(src: str, x) -> Fraction:
    return at(src, {re.search(r"[a-z]", src)[0]: Fraction(x)})


def growth_factor(src: str) -> Fraction:
    return model_at(src, 1) / model_at(src, 0)


def offset_of(src: str) -> Fraction:
    f0, f1, f2 = (model_at(src, x) for x in (0, 1, 2))
    b = (f2 - f1) / (f1 - f0)
    a = (f1 - f0) / (b - 1)
    assert model_at(src, 3) == a * b ** 3 + f0 - a, f"{src} is not a·b^x + k"
    return f0 - a


def compounded(p, way, r, t) -> Fraction:
    b = 1 + Fraction(int(r), 100) * (1 if way == "up" else -1)
    return Fraction(int(p)) * b ** int(t)


def repeated(a, f, every, total) -> Fraction:
    steps, left = divmod(int(total), int(every))
    assert left == 0, f"{total} is not a whole number of steps of {every}"
    return Fraction(a) * Fraction(f) ** steps


def repeated_until(a, f, every, reach) -> Fraction:
    value, steps = Fraction(a), 0
    while value != Fraction(reach):
        value, steps = value * Fraction(f), steps + 1
        assert steps < 40, f"{a} never reaches {reach}"
    return steps * int(every)


def table_kind(text: str) -> str:
    ys = [Fraction(v) for v in text.split(", ")]
    gaps = {b - a for a, b in zip(ys, ys[1:])}
    ratios = {b / a for a, b in zip(ys, ys[1:])} if 0 not in ys else {None, 0}
    assert not (len(gaps) == 1 and len(ratios) == 1), f"{text} is both"
    return "linear" if len(gaps) == 1 else "exponential" if len(ratios) == 1 else "neither"


CHOICE_RULES += (
    (re.compile(r"^grows or decays: (.+)$"), lambda src: "growth" if growth_factor(src) > 1 else "decay"),
    (re.compile(r"^table kind: (.+)$"), table_kind),
    (re.compile(r"^change: ([+*-])"), lambda op: "exponential" if op == "*" else "linear"),
)

BY_RULE += (
    (re.compile(r"^start: (.+)$"), lambda src: model_at(src, 0)),
    (re.compile(r"^growth factor: (.+)$"), growth_factor),
    (re.compile(r"^value at (\d+): (.+)$"), lambda k, src: model_at(src, k)),
    (re.compile(r"^factor for: (up|down) (\d+)$"), lambda way, r: 1 + Fraction(r, 100) * (1 if way == "up" else -1)),
    (re.compile(r"^percent for: ([\d.]+)$"), lambda b: abs(Fraction(b) - 1) * 100),
    (re.compile(r"^compound: (\d+) (up|down) (\d+) for (\d+)$"), compounded),
    (re.compile(r"^repeated: ([\d.]+) times ([\d.]+) every (\d+) for (\d+)$"), repeated),
    (re.compile(r"^repeated until: ([\d.]+) times ([\d.]+) every (\d+) reach ([\d.]+)$"), repeated_until),
    (re.compile(r"^asymptote: (.+)$"), offset_of),
    (re.compile(r"^y-intercept: (.+)$"), lambda src: model_at(src, 0)),
)


# --- Transforming Functions --------------------------------------------------
#
# Each equation is worked out at points across the grid, in floating point
# since √ is rarely exact, and a move is tested on the functions themselves:
# up 3 when every height is 3 more, right 3 when g(x) = f(x − 3), reflected
# in the y-axis when g(x) = f(−x). The answer must be the one move that
# holds. A point followed through a·f(k(x − h)) + v is found by working the
# inside out as a line in x and the outside on the height alone, so it
# holds for every f through the point.

XS = [i / 2 for i in range(-40, 41)]


def as_function(src: str):
    py = src.replace("sqrt", "S").replace("^", "**")
    py = re.sub(r"\|([^|]+)\|", r"A(\1)", py)
    py = re.sub(r"(?<=[\dx)])\s*(?=[(xSA])", "*", py)
    assert re.fullmatch(r"[\dx+\-*/(). SA]+", py), f"cannot read {src}"
    code = compile(py, src, "eval")
    def f(x):
        try:
            return eval(code, {"__builtins__": {}, "S": math.sqrt, "A": abs, "x": x})
        except (ValueError, ZeroDivisionError):
            return None
    return f


def agree(g, h, xs=XS) -> bool:
    """g and h agree wherever both are defined, at enough points to mean it."""
    pairs = [(g(x), h(x)) for x in xs]
    pairs = [(a, b) for a, b in pairs if a is not None and b is not None]
    return len(pairs) >= 6 and all(abs(a - b) < 1e-9 for a, b in pairs)


def only(found: dict) -> str:
    hits = [k for k, ok in found.items() if ok]
    assert len(hits) == 1, f"{len(hits)} moves fit: {hits}"
    return hits[0]


def which_move(base: str, moved_: str) -> str:
    f, g = as_function(base), as_function(moved_)
    found = {}
    for n in range(1, 13):
        found[("up", n)] = agree(g, lambda x: None if f(x) is None else f(x) + n)
        found[("down", n)] = agree(g, lambda x: None if f(x) is None else f(x) - n)
        found[("right", n)] = agree(g, lambda x: f(x - n))
        found[("left", n)] = agree(g, lambda x: f(x + n))
    return only(found)[0]


def which_stretch(n: str, base: str, moved_: str) -> str:
    f, g, n = as_function(base), as_function(moved_), int(n)
    return only({
        "v-stretch": agree(g, lambda x: None if f(x) is None else n * f(x)),
        "v-squash": agree(g, lambda x: None if f(x) is None else f(x) / n),
        "h-stretch": agree(g, lambda x: f(x / n)),
        "h-squash": agree(g, lambda x: f(n * x)),
    })


def which_flip(base: str, moved_: str) -> str:
    f, g = as_function(base), as_function(moved_)
    if agree(g, f):
        return "same"
    return only({
        "x-axis": agree(g, lambda x: None if f(x) is None else -f(x)),
        "y-axis": agree(g, lambda x: f(-x)),
    })


def family_of(src: str) -> str:
    return "abs" if "|" in src else "sqrt" if "sqrt" in src else "cubic" if "^3" in src else "quadratic"


def parity(src: str) -> str:
    f = as_function(src)
    xs = [1, 2, 3, 0.5, 7]
    if all(f(-x) == f(x) for x in xs):
        return "even"
    return "odd" if all(f(-x) == -f(x) for x in xs) else "neither"


def landing(p, q, g: str):
    m = re.fullmatch(r"(.*)f\((.+)\)(.*)", g)
    front_, inner, tail_ = m.groups()
    u = as_function(inner)
    # The inside is a line in x: solve it equal to p.
    c0, slope = u(0), u(1) - u(0)
    x = (Fraction(p) - Fraction(c0).limit_denominator(100)) / Fraction(slope).limit_denominator(100)
    # Outside, only the height is changed: put q where f(...) stood.
    height = as_function(f"{front_}({q}){tail_}")
    return x, Fraction(height(0)).limit_denominator(100)


CHOICE_RULES += (
    (re.compile(r"^moved: (.+) -> (.+)$"), which_move),
    (re.compile(r"^stretched (\d+): (.+) -> (.+)$"), which_stretch),
    (re.compile(r"^reflected: (.+) -> (.+)$"), which_flip),
    (re.compile(r"^parent: (.+)$"), family_of),
    (re.compile(r"^parity: (.+)$"), parity),
)

PAIR_RULES += (
    (re.compile(r"^image of (-?\d+), (-?\d+): (.+)$"), landing),
)


# --- The Pythagorean Theorem -------------------------------------------------
#
# The sides are squared and added again. A whole answer must square to the
# sum exactly; an exact one, k√m, must have k²m equal to it with m left
# square-free, so √20 kept as √20, or written 4√(5/4), is not finished.

def whole_root(n) -> int:
    r = math.isqrt(n)
    assert r * r == n, f"√{n} is not whole"
    return r


def is_right(*sides) -> str:
    x, y, z = sorted(int(s) for s in sides)
    assert x + y > z, f"{sides} is not a triangle"
    return "yes" if x * x + y * y == z * z else "no"


def radical_holds(n: int, value) -> str:
    roots = value["roots"]
    if len(roots) != 1:
        return f"has {len(roots)} lengths, not one"
    a, b, r = as_fraction(roots[0]["a"]), as_fraction(roots[0]["b"]), roots[0]["r"]
    if r == 1:
        return "ok" if b == 0 and a >= 0 and a * a == n else f"is {a}, not √{n}"
    if a != 0 or b <= 0 or b.denominator != 1:
        return f"is not a positive multiple of a root"
    if any(r % (k * k) == 0 for k in range(2, math.isqrt(r) + 1)):
        return "is not in simplest form"
    return "ok" if b * b * r == n else f"is {b}√{r}, not √{n}"


RADICAL_RULES = (
    (re.compile(r"^exact hypotenuse: (\d+), (\d+)$"), lambda p, q: int(p) ** 2 + int(q) ** 2),
    (re.compile(r"^exact leg: (\d+), (\d+)$"), lambda c, k: int(c) ** 2 - int(k) ** 2),
    (re.compile(r"^distance: (-?\d+), (-?\d+), (-?\d+), (-?\d+)$"),
     lambda x1, y1, x2, y2: (int(x2) - int(x1)) ** 2 + (int(y2) - int(y1)) ** 2),
)

BY_RULE += (
    (re.compile(r"^hypotenuse: (\d+), (\d+)(?: \(\w+\))?$"), lambda p, q: whole_root(p * p + q * q)),
    (re.compile(r"^leg: (\d+), (\d+)(?: \(\w+\))?$"), lambda c, k: whole_root(c * c - k * k)),
    (re.compile(r"^box diagonal: (\d+), (\d+), (\d+)$"), lambda a, b, c: whole_root(a * a + b * b + c * c)),
)

CHOICE_RULES += (
    (re.compile(r"^is right: (\d+), (\d+), (\d+)$"), is_right),
)


# --- Older levels ------------------------------------------------------------
#
# Levels built before every level had to have a reader. Most are arithmetic
# the plain-expression branch skips because of a power, a superscript or a
# blank; the rest are strategy levels asked in prose, judged below situation
# by situation.

MINUS = str.maketrans({"−": "-"})


def signed(s: str) -> int:
    return int(str(s).translate(MINUS).replace("+", ""))


def is_prime(n: int) -> bool:
    return n > 1 and all(n % d for d in range(2, math.isqrt(n) + 1))


def exponent_by_search(base: int, value: Fraction) -> int:
    e = next((e for e in range(-20, 41) if Fraction(base) ** e == value), None)
    assert e is not None, f"{value} is not a power of {base}"
    return e


def repeated_factor(base, rest, again):
    factors = [int(base), *[int(f) for f in re.findall(r"\d+", rest)]]
    assert set(factors) == {int(again)}, f"{factors} are not all {again}"
    return len(factors)


def power_law(a, m, op, b, n, c):
    assert a == b == c, "the bases differ"
    value = (Fraction(a) ** m * Fraction(b) ** n if op == "×" else Fraction(a) ** m / Fraction(b) ** n)
    return exponent_by_search(c, value)


def digit_worth(number: str, place: str) -> Fraction:
    k = {"tenths": 1, "hundredths": 2, "thousandths": 3}[place]
    x = Fraction(number)
    return Fraction(int(x * 10 ** k) % 10, 10 ** k)


def whole(x: Fraction) -> int:
    assert x.denominator == 1, f"{x} is not whole"
    return int(x)


def prime_blank(n: int, rhs: str) -> int:
    """N = 2^4 × 3^2 × ?: the blank, from N's own prime factorisation."""
    own, m, p = {}, n, 2
    while m > 1:
        while m % p == 0:
            own[p] = own.get(p, 0) + 1
            m //= p
        p += 1
    terms = [t.split("^") for t in rhs.split(" × ")]
    shown = {int(t[0]): (int(t[1]) if len(t) > 1 and t[1] != "?" else (None if len(t) > 1 else 1))
             for t in terms if t[0] != "?"}
    blank = [t for t in terms if "?" in t]
    assert len(blank) == 1, "not one blank"
    if blank[0][0] == "?":
        missing = set(own) - set(shown)
        assert len(missing) == 1 and own[next(iter(missing))] == (int(blank[0][1]) if len(blank[0]) > 1 else 1)
        answer = missing.pop()
    else:
        answer = own[int(blank[0][0])]
        shown[int(blank[0][0])] = answer
        assert set(shown) == set(own)
    for prime, e in shown.items():
        assert own.get(prime) == e, f"{n} does not have {prime}^{e}"
    return answer


def cube_root(n: int) -> int:
    r = round(abs(n) ** (1 / 3))
    r = next(k for k in (r - 1, r, r + 1) if k ** 3 == abs(n))
    return r if n > 0 else -r


def cube_floor(n: int) -> int:
    r = next(k for k in range(0, 100) if (k + 1) ** 3 > n)
    assert r ** 3 != n, f"{n} is a cube, so its root does not lie just above anything"
    return r


def root_floor(n: int) -> int:
    assert not is_square(n), f"{n} is square, so its root does not lie just above anything"
    return math.isqrt(n)


def outside_root(n: int, inside: int) -> int:
    assert squarefree(inside) == (1, inside), f"√{inside} is not simplest"
    return whole_root(whole(Fraction(n, inside)))


def far(a: str, b: str) -> int:
    return abs(signed(b) - signed(a))


BY_RULE += (
    (re.compile(r"^point \((-?\d+), (-?\d+)\): ([xy])$"), lambda x, y, which: int(x if which == "x" else y)),
    (re.compile(r"^distance \((-?\d+),(-?\d+)\) to \((-?\d+),(-?\d+)\)$"),
     lambda x1, y1, x2, y2: whole_root((int(x2) - int(x1)) ** 2 + (int(y2) - int(y1)) ** 2)),
    (re.compile(r"^gradient \((-?\d+),(-?\d+)\) to \((-?\d+),(-?\d+)\)$"), rise_over_run),
    (re.compile(r"^(\d+)\^(-?\d+)$"), lambda a, b: Fraction(a) ** int(b)),
    (re.compile(r"^(\d+)((?: × \d+)*) = (\d+)\^\?$"), repeated_factor),
    (re.compile(r"^(\d+)\^(\d+) ([×÷]) (\d+)\^(\d+) = (\d+)\^\?$"), power_law),
    (re.compile(r"^\((\d+)\^(\d+)\)\^(\d+) = (\d+)\^\?$"),
     lambda a, m, n, c: power_law(a, m * n, "×", c, 0, c)),
    (re.compile(r"^([\d.]+): (tenths|hundredths|thousandths) digit worth$"), digit_worth),
    (re.compile(r"^([\d.]+) = \?/(\d+)$"), lambda x, d: whole(Fraction(x) * d)),
    (re.compile(r"^(\d+) × \? = (\d+)$"), lambda a, b: whole(Fraction(b, a))),
    (re.compile(r"^\? × (\d+) = (\d+)$"), lambda a, b: whole(Fraction(b, a))),
    (re.compile(r"^(\d+) = ((?:\S+ × )*\S+)$"), prime_blank),
    (re.compile(r"^(\d+/\d+) as a mixed number$"), amount),
    (re.compile(r"^(\d+ \d+/\d+) as an improper fraction$"), amount),
    (re.compile(r"^The (?:diver|lift|temperature|account) (−?\d+) then ([+−]\d+)$"),
     lambda a, b: signed(a) + signed(b)),
    (re.compile(r"^The (?:diver|lift|temperature|account) (−?\d+) to (−?\d+), how far$"), far),
    (re.compile(r"^(\d+) (?:m|£|°) down, (\d+) times$"), lambda k, n: -k * n),
    (re.compile(r"^−(\d+) shared over (\d+)$"), lambda a, n: whole(Fraction(-a, n))),
    (re.compile(r"^([\d ()+−]+[²³][\d ()+−²³]*)$"),
     lambda src: evaluate(src.replace("²", "^2").replace("³", "^3"))),
    (re.compile(r"^([\d.]+)% = \?/(\d+)$"), lambda p, d: whole(Fraction(p) / 100 * d)),
    (re.compile(r"^([\d.]+)% as a decimal$"), lambda p: Fraction(p) / 100),
    (re.compile(r"^([\d.]+)% of (\d+)$"), lambda p, n: Fraction(p) / 100 * n),
    (re.compile(r"^(\d+) is \?% of (\d+)$"), lambda a, b: Fraction(100 * a, b)),
    (re.compile(r"^(\d+) (up|down) (\d+)%$"),
     lambda n, way, p: n * (1 + Fraction(p if way == "up" else -p, 100))),
    (re.compile(r"^sqrt\((\d+)\)$"), whole_root),
    (re.compile(r"^sqrt\((\d+)\) lies just above \?$"), root_floor),
    (re.compile(r"^sqrt\((\d+)\) = \?sqrt\((\d+)\)$"), outside_root),
    (re.compile(r"^cube root of (−?\d+)$"), lambda n: cube_root(signed(n))),
    (re.compile(r"^cube root of (\d+) lies just above \?$"), cube_floor),
)


def quadrant(x, y) -> str:
    x, y = int(x), int(y)
    assert x and y, "a point on an axis is in no quadrant"
    return {(1, 1): "I", (-1, 1): "II", (-1, -1): "III", (1, -1): "IV"}[(x > 0) - (x < 0), (y > 0) - (y < 0)]


def first_move(k, c, r) -> str:
    # k(v + c) = r: dividing first leaves whole numbers only when k goes into r.
    return "divide" if int(r) % int(k) == 0 else "expand"


def gather_side(a, c) -> str:
    a, c = int(a or 1), int(c or 1)
    assert a != c, "the letters cancel"
    # Gathering on the side with more keeps the letter's count positive.
    return "left" if a > c else "right"


def flips(k: str) -> str:
    return "flip" if k.startswith("−") else "keep"


def sign_of(src: str) -> str:
    v = evaluate(src)
    assert v != 0
    return "positive" if v > 0 else "negative"


def which_way_in(n, d, to) -> str:
    n, d, to = int(n), int(d), int(to)
    if to % d == 0:
        return "scale"
    assert to % Fraction(n, d).denominator == 0, f"{n}/{d} has no equivalent over {to}"
    return "simplify"


def terminates(x: Fraction) -> bool:
    d = x.denominator
    for p in (2, 5):
        while d % p == 0:
            d //= p
    return d == 1


# The prose strategy levels: each situation, numbers taken out, with the form
# it calls for -- written from the situation, not copied from the generator.
JUDGED = {
    # decimals: a decimal to measure, place or compare; a fraction to stay exact
    "You need to compare # with #.": "decimal",
    # A price per gram, and a length measured out with a ruler: a ruler is
    # read in centimetres and millimetres, which are decimals of a metre,
    # whatever fraction of a metre was asked for.
    "One brand costs £# a gram and another costs £# a gram. You need to say which is cheaper.": "decimal",
    "You need to measure out #/# of a metre with a ruler.": "decimal",
    # Two measurements with their points lined up; as fractions they would
    # be over 100 and 1000 and need a common bottom first.
    "You need to add # kg and # kg.": "decimal",
    "You need to plot # on a number line.": "decimal",
    "You need to add #/# to #/#.": "fraction",
    # exponents: keep the power while an exponent rule applies to it
    "You need to add # to #.": "work out",
    "You need to divide # by #.": "keep",
    "You need to multiply # by #.": "keep",
    "You need to say whether # is bigger than #.": "work out",
    "You need to simplify # × # × #.": "keep",
    "You need to write # as the final answer to a counting problem.": "work out",
    # factors: the GCF fits inside both, the LCM is reached by both
    "# red counters and # blue ones, in rows of equal length, no row mixing colours. How long can a row be?": "gcf",
    "Two lights flash every # seconds and every # seconds. When do they next flash together?": "lcm",
    "Putting #/# into lowest terms — what do you divide by?": "gcf",
    "# pens and # pencils, split into identical packs with nothing left over.": "gcf",
    "Tiles # cm by # cm, laid out to make the smallest possible square.": "lcm",
    "Two buses set off together, then run every # and every # minutes. Next time together?": "lcm",
    "Buns come in packs of # and sausages in packs of #. Fewest packs to have equal numbers?": "lcm",
    "A # cm ribbon and a # cm ribbon, cut into equal pieces as long as possible.": "gcf",
    "The largest square tile that exactly fills a # cm by # cm rectangle.": "gcf",
    "Adding # and # — what should the denominator become?": "lcm",
    # mixed numbers: improper to compute with, mixed to read or report
    "You need to multiply # #/# by #.": "improper",
    "You need to work out # #/# × # #/#.": "improper",
    "You need to divide # #/# by #.": "improper",
    "You need to say whether #/# is more than #.": "mixed",
    "You want to know roughly how big #/# is, at a glance.": "mixed",
    "You need to write # #/# as the answer to a word problem about lengths.": "mixed",
    "You are telling someone how much juice is left in the jug.": "mixed",
    # roots: exact work wants the simplest radical, a physical length a decimal
    "You need to add √# to another radical.": "simplify",
    "You need to check whether √# equals another radical.": "simplify",
    "You need to give the exact answer to √#.": "simplify",
    "You need to cut a piece of wood √# inches long.": "estimate",
    "You need to plot √# on a number line.": "estimate",
    "You need to say whether √# is more than #.": "estimate",
    # rounding: money handed over and things cut to fit are exact
    "You are splitting a £# bill # ways and paying your share.": "exact",
    "You are cutting a shelf to fit a gap of # metres.": "exact",
    "You are checking that a bill of £# looks right before paying it.": "estimate",
    "You are checking that # × # on your calculator has its decimal point in the right place.": "estimate",
    "You are working out the change from £# and handing it over.": "exact",
    "You are recording a race time that decides who won.": "exact",
    "You have just divided and want to know if the answer is the right size.": "estimate",
    # brackets: opened to see terms, kept to divide or cancel them whole
    "You need to solve #(v + #) = # for v.": "keep",
    "You need to add #(v + #) to #v.": "open",
    "You need to cancel a factor of # from #(v + #) over #.": "keep",
    "You need to divide #(v + #) by # exactly.": "keep",
    "You need to check whether #(v + #) matches another expression written as #v + #.": "open",
    "You need the number in front of v in #(v + #).": "open",
}


def rounding_settles(a: Fraction, b: Fraction, b_rounds: bool, t: int) -> str:
    """
    Is a × b more than t, from the rounded values alone? Each rounded factor
    is within a half of the true one, so the product lies strictly between
    (A - 1/2)(B - 1/2) and (A + 1/2)(B + 1/2), B being b itself when b is a
    count. An estimate is enough exactly when t falls outside that range.
    """
    A = half_up(a, 0)
    B = half_up(b, 0) if b_rounds else b
    lo = (A - Fraction(1, 2)) * (B - (Fraction(1, 2) if b_rounds else 0))
    hi = (A + Fraction(1, 2)) * (B + (Fraction(1, 2) if b_rounds else 0))
    assert t not in (lo, hi), f"{t} sits on the edge of what rounding allows"
    return "exact" if lo < t < hi else "estimate"


def judged(text: str) -> str:
    # Rounding's comparisons: settled by an estimate only when rounding
    # cannot carry the product across the line.
    if m := re.match(r"^You want to know whether (\d+\.\d) × (\d+\.\d) is more than (\d+)\.$", text):
        return rounding_settles(Fraction(m[1]), Fraction(m[2]), True, int(m[3]))
    if m := re.match(r"^You are checking whether £(\d+) is enough for (\d+) tickets at £(\d+\.\d\d) each\.$", text):
        return rounding_settles(Fraction(m[3]), Fraction(int(m[2])), False, int(m[1]))
    # A fraction for exactness only where the decimal would not terminate.
    # An exact quotient of a decimal: fine as a decimal exactly when it ends.
    if m := re.match(r"^You need the exact answer to (\d+\.\d+) ÷ (\d+)\.$", text):
        return "decimal" if terminates(Fraction(m[1]) / int(m[2])) else "fraction"
    m = (re.match(r"^You need the exact value of (\d+/\d+) of something\.$", text)
         or re.match(r"^You need to multiply by (\d+/\d+) and keep the answer exact\.$", text)
         or re.match(r"^You need to divide (\d+ into \d+) equal shares, exactly\.$", text))
    if m:
        a, b = re.split(r"/| into ", m[1])
        x = Fraction(int(a), int(b))
        return "decimal" if terminates(x) else "fraction"
    if m := re.search(r"√(\d+)", text):
        n = int(m[1])
        assert not is_square(n), f"√{n} is whole"
        assert "simplify" not in JUDGED.get(re.sub(r"\d+", "#", text), "") or squarefree(n)[0] > 1, \
            f"√{n} does not simplify"
    shape = re.sub(r"(?<=#)(?:st|nd|rd|th)s", "", re.sub(r"[⁰¹²³⁴⁵⁶⁷⁸⁹]", "", re.sub(r"\d+(?:\.\d+)?", "#", text)))
    shape = re.sub(r"\b[anxyt]\b(?! factor)", "v", shape) if "(" in shape else shape
    return JUDGED.get(shape, f"unjudged: {shape}")


CHOICE_RULES += (
    (re.compile(r"^quadrant of \((-?\d+), (-?\d+)\)$"), quadrant),
    (re.compile(r"^first move for (\d+)\([a-z] \+ (\d+)\) = (\d+)$"), first_move),
    (re.compile(r"^first move for \d+[a-z] \+ \d+ = \d+$"), lambda: "subtract"),
    (re.compile(r"^which side for (\d*)([a-z]) \+ \d+ = (\d*)\2 \+ \d+$"), lambda a, v, c: gather_side(a, c)),
    (re.compile(r"^does (−?)\d+[a-z] [<>≤≥] −?\d+ flip$"), flips),
    (re.compile(r"^does [a-z] − \d+ [<>≤≥] −?\d+ flip$"), lambda: "keep"),
    (re.compile(r"^sign of (.+)$"), sign_of),
    (re.compile(r"^(\d+)/(\d+) = \?/(\d+), which way in$"), which_way_in),
    (re.compile(r"^(\d+) \w+ at £\d+, need (\d+)$"),
     lambda have, need: "scale" if int(need) % int(have) == 0 else "unit"),
    (re.compile(r"^(.+[.?])$"), judged),
)


def collected_or_factored(src: str, answer: str) -> str:
    # Already collected, the only thing left to do is take the factor out.
    plain = src.replace("-", "−").replace("−", "-")
    return factored(plain, answer) if expanded(plain) else same_polynomial(plain, answer)


EXPR_RULES += (
    (re.compile(r"^([\d ()+\-]*[a-z][\da-z +\-()]*)$"), collected_or_factored),
)


# requiem: catalogue/library/every-level-checked
# A problem no rule reads would pass by saying nothing: a prefix spelled one
# way in the generator and another here does that, and so does one new shape
# of question in a level whose other shapes are read. So every problem, not
# just every level, must be re-derived by something.
unread = []
for path in sorted(LIB.glob("*.json")):
    if path.name in ("manifest.json", "schemas.json"):
        continue
    lib = json.loads(path.read_text())
    row_before = None
    for i, p in enumerate(lib["problems"]):
        if row_before == checked:
            unread.append(f"{lib['skill']} L{lib['level'] + 1}: {lib['problems'][i - 1]['text']}")
        row_before = checked
        text, answer = p["text"], p["answer"]
        where = f"{lib['skill']} L{lib['level'] + 1} row {i}"

        if answer["type"] == "choice":
            ids = [o["id"] for o in answer["options"]]
            for rule, solve in OPTION_RULES:
                m = rule.match(text)
                if m:
                    checked += 1
                    want = solve(*m.groups(), ids)
                    if want != answer["value"]:
                        problems.append(f"{where}: {text} is {want}, not {answer['value']}")
                    break
            else:
                for rule, solve in CHOICE_RULES:
                    m = rule.match(text)
                    if m:
                        checked += 1
                        want = solve(*m.groups())
                        if want != answer["value"]:
                            problems.append(f"{where}: {text} is {want}, not {answer['value']}")
                        break
            continue

        # A line: built again from what the question gives, and compared as a line.
        if answer["type"] == "linear":
            rule = next((r for r in LINE_RULES if r[0].match(text)), None)
            if rule:
                checked += 1
                m, b = rule[1](*rule[0].match(text).groups())
                want = ("x", Fraction(b)) if m == "x" else (Fraction(m), Fraction(b))
                v = answer["value"]
                got = ("x", as_fraction(v["x"])) if "x" in v else (as_fraction(v["m"]), as_fraction(v["b"]))
                if got != want:
                    problems.append(f"{where}: {text} is {want}, not {v}")
            continue

        # An nth-term rule: rebuilt from the terms, and compared as m·n + b.
        if answer["type"] == "rule":
            rule = next((r for r in RULE_RULES if r[0].match(text)), None)
            if rule:
                checked += 1
                want = tuple(Fraction(v) for v in rule[1](*rule[0].match(text).groups()))
                v = answer["value"]
                if (as_fraction(v["m"]), as_fraction(v["b"])) != want:
                    problems.append(f"{where}: {text} is {want}, not {v}")
            continue

        # A set of numbers: solved again at points along the line, and compared there.
        # A length kept exact: squared, it must be the sum the sides give.
        if answer["type"] == "roots":
            rule = next((r for r in RADICAL_RULES if r[0].match(text)), None)
            if rule:
                checked += 1
                verdict = radical_holds(rule[1](*rule[0].match(text).groups()), answer["value"])
                if verdict != "ok":
                    problems.append(f"{where}: {answer['accept'][0]} {verdict}")
                continue

        if answer["type"] == "roots" and text.startswith("roots: "):
            checked += 1
            verdict = roots_hold(text[len("roots: "):], answer["value"])
            if verdict != "ok":
                problems.append(f"{where}: {answer['accept'][0]} {verdict}")
            continue

        if answer["type"] == "solutions" and text.startswith(("quadratic: ", "zeros: ")):
            checked += 1
            # A graph's zeros are the roots of y = 0.
            equation = text[len("quadratic: "):] if text.startswith("quadratic") else f"{text[len('zeros: '):]} = 0"
            want, got = quadratic_roots(equation), answer_points(answer["value"])
            if got != want:
                said = lambda xs: ", ".join(str(x) for x in sorted(xs))
                problems.append(f"{where}: {text} has roots {said(want)}, not {'a range' if got is None else said(got)}")
            continue

        if answer["type"] == "solutions":
            rule = next((r for r in SET_RULES if r[0].match(text)), None)
            if rule:
                checked += 1
                want = rule[1](*rule[0].match(text).groups())
                if answer_set(answer["value"]) != want:
                    problems.append(f"{where}: {text} is not {answer['value']}")
            continue

        # A half-plane: the points it keeps, compared with the points the answer keeps.
        if answer["type"] == "halfplane":
            rule = next((r for r in HALFPLANE_RULES if r[0].match(text)), None)
            if rule:
                checked += 1
                if kept(halfplane_text(answer["value"])) != rule[1](*rule[0].match(text).groups()):
                    problems.append(f"{where}: {text} does not keep the half {answer['value']} keeps")
            continue

        # An ordered pair: solved again from the equations, and compared exactly.
        if answer["type"] == "pair":
            rule = next((r for r in PAIR_RULES if r[0].match(text)), None)
            if rule:
                checked += 1
                want = tuple(Fraction(v) for v in rule[1](*rule[0].match(text).groups()))
                v = answer["value"]
                if (as_fraction(v["x"]), as_fraction(v["y"])) != want:
                    problems.append(f"{where}: {text} is {want}, not {v}")
            continue

        # A number to a fraction power, worked out exactly where it can be.
        if text.startswith("value: ") and answer["type"] in ("int", "frac"):
            checked += 1
            verdict = power_value(text[len("value: "):], answer["value"])
            if verdict != "ok":
                problems.append(f"{where}: {text} {verdict}")
            continue

        # A simplified expression: the same value as the question, and finished.
        if answer["type"] == "expr":
            rule = next((r for r in EXPR_RULES if r[0].match(text)), None)
            if rule:
                # Every form the level accepts is held to the same test.
                for form in dict.fromkeys([answer["value"], *answer.get("accept", [])]):
                    checked += 1
                    verdict = rule[1](*rule[0].match(text).groups(), form)
                    if verdict != "ok":
                        problems.append(f"{where}: {form} {verdict}")
                continue

        # An expression written from words: read the words independently and
        # compare by value, since any equivalent arrangement is accepted.
        if answer["type"] == "expr" and text.startswith("words: "):
            checked += 1
            verdict = from_words(text[len("words: "):], answer["value"])
            if verdict != "ok":
                problems.append(f"{where}: {text} {verdict}, not {answer['value']}")
            continue

        # Asked in words, or written with a blank: re-derive from the numbers.
        # Tried before the equation branch, since "3t - 2 at t = 3" and
        # "y = kx, 6→90, y at x = 9" carry an equals sign without being equations.
        rule = next((r for r in BY_RULE if r[0].match(text)), None)
        if rule:
            args = [g if g is None or not g.isdigit() else int(g)
                    for g in rule[0].match(text).groups()]
            want = Fraction(rule[1](*args))
            checked += 1
            if want != as_fraction(answer["value"]):
                problems.append(f"{where}: {text} is {want}, not {answer['value']}")
            continue

        # An equation: substitute the claimed solution and see if it balances.
        #
        # Fractional and negative solutions substitute the same way, since the
        # evaluator works in exact rationals and reads "10(-6/5)" as the
        # juxtaposed product it is. Restricting this to whole answers left
        # every non-whole solution in the catalogue -- a thousand rows of
        # equations-both -- checked by nothing at all.
        if " = " in text and answer["type"] in ("int", "frac", "decimal") and var_in(text):
            v = var_in(text)
            lhs, rhs = text.split(" = ", 1)
            if "?" in rhs or "?" in lhs:
                continue
            sub = as_fraction(answer["value"])
            try:
                checked += 1
                if evaluate(lhs, v, sub) != evaluate(rhs, v, sub):
                    problems.append(f"{where}: {text} does not balance at {v} = {sub}")
            except Exception:
                checked -= 1


        # A plain arithmetic expression: work it out and compare.
        elif answer["type"] in ("int", "frac", "decimal") and not var_in(text):
            if not re.fullmatch(r"[-−\d\s+×÷*/().]+", text):
                continue
            try:
                want = evaluate(text)
            except Exception:
                continue
            got = as_fraction(answer["value"])
            checked += 1
            if want != got:
                problems.append(f"{where}: {text} is {want}, not {got}")
    if row_before == checked:
        unread.append(f"{lib['skill']} L{lib['level'] + 1}: {lib['problems'][-1]['text']}")

for line in unread:
    problems.append(f"{line} -- no rule re-derives this answer")

if problems:
    print(f"{len(problems)} wrong answer(s):")
    for line in problems[:15]:
        print("  " + line)
    if len(problems) > 15:
        print(f"  ... and {len(problems) - 15} more")
    sys.exit(1)

print(f"answers: {checked:,} re-derived independently — all correct, every problem read")
