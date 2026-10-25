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
ROUNDED_TO = re.compile(r" to (?:the nearest whole|(\d) dp)$")

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
    # The negative of a bracketed fraction: the same number, minus in front.
    (re.compile(r"^-\((\d+)/(\d+)\) in lowest terms$"),
     lambda n, d: -Fraction(n, d)),
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
    recognizing which shapes the catalogue happens to ask about.
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
    if text.startswith("-√"):
        return -real_atom(text[1:])
    if text.startswith("∛"):
        n = int(text[1:])
        r = round(n ** (1 / 3))
        cube = next((k for k in (r - 1, r, r + 1) if k ** 3 == n), None)
        return None if cube is None else Surd({1: Fraction(cube)})  # None: irrational, as for pi
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
    m = re.fullmatch(r"(.+?) ([+−×÷]) (.+)", text)
    if not m:
        a = real_atom(text)
        return "irrational" if a is None or not a.rational() else "rational"
    left, op, right = real_atom(m[1]), m[2], real_atom(m[3])
    if left is None or right is None:
        zero = (left or right)
        return "rational" if op == "×" and zero is not None and not zero.t else "irrational"
    if op == "÷":
        # Only ever one root divided by another, so its inverse is one term too.
        assert len(right.t) == 1, f"{m[3]} is not a single term"
        (r, c), = right.t.items()
        right = Surd({r: 1 / (c * r)})                  # 1/(c√r) = √r/(c·r)
    value = left * right if op in "×÷" else left + (-right if op == "−" else right)
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
    if "pizzas are shared equally between p people" in story:
        return "p", lambda p: Fraction(n[0], p)
    if "How old will Sam be in" in story:
        return "a", lambda a: a + n[0]
    raise ValueError(f"unread story: {story}")


def fits(story: str, options):
    letter, truth = story_at(story)
    # Away from zero, where a share between p people is undefined.
    right = [o for o in options if all(at(o, {letter: v}) == truth(v) for v in SAMPLES if v)]
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
       ("day", "h"): 24, ("cm", "mm"): 10, ("lb", "oz"): 16, ("gal", "qt"): 4}


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
    # Parallel to a line already in slope-intercept form, with b given: m is
    # read off the given line and b is told, so y = mx + b is written at once.
    m = re.match(r"parallel to (y = .+), y-intercept -?\d+$", key)
    if m:
        slope_intercept(m[1].removeprefix("y = "))  # the given line must be one
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
    # Scaling is only the clear winner when no equation divides down to a
    # letter with 1 in front: 3x + 3y = 0 is y = -x, and substituting that
    # is as quick, so such a system has no single right answer.
    for e in (e1, e2):
        a, b, c = coeffs(e)
        g = math.gcd(math.gcd(int(a), int(b)), int(c))
        if g and (abs(a) == g or abs(b) == g):
            raise ValueError(f"{e} divides down to a lone letter")
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
    # A unit in words may be singular for one: "after 1 second".
    unit = lambda n, u: (rf"(?<![\d.]){n} ?{re.escape(u.removesuffix('s'))}s?\b" if u[0].isalpha()
                         else rf"(?<![\d.]){n}{re.escape(u)}")
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
# integer and half-integer from -60 to 60. Two sets with whole or half ends
# inside that range are equal exactly when they agree at every sample -- a
# test that shares nothing with the interval arithmetic the app does.

SAMPLES_ON_LINE = [Fraction(k, 2) for k in range(-120, 121)]
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


def answer_set(value, samples=None) -> frozenset:
    """The answer's set at the sample points: the number line's halves, or
    the grid a rule names when its numbers lie elsewhere (angles to 360°)."""
    def inside(p, x):
        lo, hi = p["lo"], p["hi"]
        ok_lo = lo is None or (x >= as_fraction(lo) if p["loIn"] else x > as_fraction(lo))
        ok_hi = hi is None or (x <= as_fraction(hi) if p["hiIn"] else x < as_fraction(hi))
        return ok_lo and ok_hi
    return frozenset(x for x in (samples or SAMPLES_ON_LINE) if any(inside(p, x) for p in value["parts"]))


class OnGrid(frozenset):
    """A rule's set at its own sample points, which it carries as .samples."""


def on_grid(points, samples) -> OnGrid:
    out = OnGrid(points)
    out.samples = samples
    return out


def extent(which: str, corners: str) -> frozenset:
    """An unbroken graph through these corners, ends filled, covers every x
    from its first corner to its last, and every y from its lowest to its
    highest: the domain or the range as a set."""
    pts = [(int(x), int(y)) for x, y in re.findall(PT, corners)]
    vals = [x for x, _ in pts] if which == "domain" else [y for _, y in pts]
    if [x for x, _ in pts] != sorted({x for x, _ in pts}):
        raise ValueError("not a graph of a function left to right")
    return frozenset(v for v in SAMPLES_ON_LINE if min(vals) <= v <= max(vals))


SET_RULES = (
    (re.compile(r"^solve: (.+)$"), solve_set),
    (re.compile(r"^(domain|range) of ((?:\(-?\d+, -?\d+\) ?)+)$"), extent),
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


CHOICE_RULES += (
    (re.compile(rf"^solution\? {PT} of (.+)$"),
     lambda x, y, ineq: "yes" if holds_xy(ineq, int(x), int(y)) else "no"),
    (re.compile(r"^drawn: (.+)$"), drawn_as),
)

OPTION_RULES += (
    (re.compile(r"^both: (.+); (.+) \| (.+)$"), point_in_both),
)

def halfplane_form(ineq: str):
    """
    a·x + b·y + c op 0, scaled so the first of b, a that is not zero is 1
    (the sign turning if that meant dividing by a negative). Two inequalities
    keep the same half of the plane exactly when these agree -- including
    halves whose edge lies far off the grid kept() samples, where the large
    totals of a budget put it.
    """
    left, op, right = re.split(r"\s*(<=|>=|<|>)\s*", ineq.strip())
    f = lambda x, y: at(left, {"x": x, "y": y}) - at(right, {"x": x, "y": y})
    c = f(0, 0)
    a, b = f(1, 0) - c, f(0, 1) - c
    if f(2, -3) != c + 2 * a - 3 * b or f(-5, 7) != c - 5 * a + 7 * b:
        raise ValueError(f"not linear: {ineq}")
    lead = b if b != 0 else a
    if lead == 0:
        raise ValueError(f"no x or y left: {ineq}")
    if lead < 0:
        op = {"<": ">", "<=": ">=", ">": "<", ">=": "<="}[op]
    return a / lead, b / lead, c / lead, op


WORDS_LIMIT = {"most": "<=", "least": ">="}


def budget(a: str, b: str, limit: str, total: str) -> str:
    """'9 per x, 4 per y, at most 60': each x adds 9, each y adds 4, and the
    sum is held at most (or at least) to the total."""
    return f"{a}*x + {b}*y {WORDS_LIMIT[limit]} {total}"


HALFPLANE_RULES = (
    (re.compile(r"^graph: (.+)$"), kept),
    # Compared by exact form, not by sampled points: see halfplane_form.
    (re.compile(r"^words: (\d+) per x, (\d+) per y, at (most|least) (\d+)$"), budget),
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
        # x² − 16 = 0 factors as fast as it roots: no one method is right.
        assert not (right == "0" and c < 0 and is_square(-c / a)), f"{equation} is a difference of squares"
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
    # With no real roots there is nothing to solve, so no method is right.
    assert b * b - 4 * a * c >= 0, f"{equation} has no real roots to find"
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


# A 1 written in front, or a k of 0 written as + 0, is still the form.
VERTEX_FORM = re.compile(r"^-?\d*\(x [+-] [1-9]\d*\)\^2(?: [+-] \d+)?$")


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

def way_to(ask: str, src: str) -> str:
    # The way to the zeros of a parabola that has none is no way at all.
    c, b, a = (coefficients(src) + [Fraction(0)] * 3)[:3]
    assert ask != "zeros" or b * b - 4 * a * c >= 0, f"{src} has no zeros to find"
    return WAY_TO[form_of(src)][ask]


CHOICE_RULES += (
    (re.compile(r"^opens: (.+)$"), lambda src: "up" if coefficients(src)[2] > 0 else "down"),
    (re.compile(r"^quickest (vertex|zeros|y-intercept): (.+)$"), lambda ask, src: way_to(ask, src)),
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


# An exact answer that is not a whole root of a whole number -- sin 60° is
# √3/2, a 45-45-90 leg 5√2/2 -- is checked against the calculator: the rule
# works the value out in floating point by its own route, and the stored
# a + b√r must be within 1e-9 of it, with r free of square factors.
def exact_holds(want: float, value) -> str:
    roots = value["roots"]
    if len(roots) != 1:
        return f"has {len(roots)} values, not one"
    a, b, r = as_fraction(roots[0]["a"]), as_fraction(roots[0]["b"]), roots[0]["r"]
    if r > 1 and any(r % (k * k) == 0 for k in range(2, math.isqrt(r) + 1)):
        return "is not in simplest form"
    got = float(a) + float(b) * math.sqrt(r)
    return "ok" if abs(got - want) < 1e-9 else f"is {got}, not {want}"


EXACT_RULES = ()

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


def radical_form(n: str, answer: str) -> str:
    # k√m, or k*sqrt(m): squared it must give n back, with m left square-free.
    m = re.fullmatch(r"(\d*)\s*\*?\s*(?:√(\d+)|sqrt\((\d+)\))", answer.strip())
    if not m:
        return "is not a whole number times a root"
    k, r = int(m[1] or 1), int(m[2] or m[3])
    if k * k * r != int(n):
        return f"is not √{n}"
    return "ok" if r > 1 and squarefree(r) == (1, r) else "is not in simplest radical form"


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
    (re.compile(r"^The (?:diver|elevator|temperature|account) (−?\d+) then ([+−]\d+)$"),
     lambda a, b: signed(a) + signed(b)),
    (re.compile(r"^The (?:diver|elevator|temperature|account) (−?\d+) to (−?\d+), how far$"), far),
    (re.compile(r"^(\d+) (?:m|ft|\$|°) down, (\d+) times$"), lambda k, n: -k * n),
    (re.compile(r"^−(\d+) shared over (\d+)$"), lambda a, n: whole(Fraction(-a, n))),
    (re.compile(r"^([\d ()+−×÷]+[²³][\d ()+−×÷²³]*)$"),
     lambda src: evaluate(src.replace("²", "^2").replace("³", "^3"))),
    (re.compile(r"^([\d.]+)% = \?/(\d+)$"), lambda p, d: whole(Fraction(p) / 100 * d)),
    (re.compile(r"^([\d.]+)% as a decimal$"), lambda p: Fraction(p) / 100),
    (re.compile(r"^([\d.]+)% of (\d+)$"), lambda p, n: Fraction(p) / 100 * n),
    (re.compile(r"^(\d+) is \?% of (\d+)$"), lambda a, b: Fraction(100 * a, b)),
    (re.compile(r"^(\d+) (up|down) (\d+)%$"),
     lambda n, way, p: n * (1 + Fraction(p if way == "up" else -p, 100))),
    (re.compile(r"^sqrt\((\d+)\)$"), whole_root),
    (re.compile(r"^whole number just below sqrt\((\d+)\)$"), root_floor),
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


def subtract_first(k, c) -> str:
    # kv + c = r: subtracting c first keeps whole numbers. Dividing first is
    # as clean when k goes into c (2a + 10 = 14 is a + 5 = 7), and then both
    # moves are right, which a one-answer question must not ask.
    assert int(c) % int(k), f"dividing by {k} first is as clean as subtracting {c}"
    return "subtract"


def gather_side(a, c) -> str:
    a, c = int(a or 1), int(c or 1)
    assert a != c, "the letters cancel"
    # Gathering on the side with more keeps the letter's count positive.
    return "left" if a > c else "right"


def flips(left: str) -> str:
    """Whether solving left op number turns the sign: what multiplies the letter
    in the end, found by evaluating the left side at 0 and 1, not by where a
    minus sign happens to stand -- 12 − 3x flips, x − 7 does not."""
    v = var_in(left)
    k = evaluate(left.replace("−", "-"), v, 1) - evaluate(left.replace("−", "-"), v, 0)
    if k == 0:
        raise ValueError(f"no letter to solve for: {left}")
    return "flip" if k < 0 else "keep"


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
    # A price per ounce, and a length measured out with a ruler: a ruler is
    # read in centimeters and millimeters, which are decimals of a meter,
    # whatever fraction of a meter was asked for.
    "One brand costs $# an ounce and another costs $# an ounce. You need to say which is cheaper.": "decimal",
    "You need to measure out #/# of a meter with a ruler.": "decimal",
    # Two measurements with their points lined up; as fractions they would
    # be over 100 and 1000 and need a common bottom first.
    "You need to add # kg and # kg.": "decimal",
    "You need to plot # on a number line.": "decimal",
    "You need to add #/# to #/#.": "fraction",
    # exponents: a count is reported as a number (combining powers is judged
    # by power_job, which needs the sizes)
    "You need to write # as the final answer to a counting problem.": "work out",
    # factors: the GCF fits inside both, the LCM is reached by both
    "# red counters and # blue ones, in rows of equal length, no row mixing colors. How long can a row be?": "gcf",
    "Two lights flash every # seconds and every # seconds. When do they next flash together?": "lcm",
    "Putting #/# into lowest terms — what do you divide by?": "gcf",
    "# pens and # pencils, split into identical packs with nothing left over. What is the greatest number of packs?": "gcf",
    # The fewest pens is a count both box sizes reach; the fewest rows is the
    # longest row, which fits inside both colors.
    "Pens come in boxes of # and pencils in boxes of #. What is the fewest pens you can buy and still have exactly as many pencils?": "lcm",
    "Ribbons come # inches and # inches long. Laid end to end, what is the shortest length both kinds can make exactly?": "lcm",
    "# red counters and # blue ones, in rows of equal length, no row mixing colors. What is the fewest rows there can be?": "gcf",
    "Two classes of # and # pupils are split into teams of the same size, no team mixing classes. What is the largest team size?": "gcf",
    "Tiles # cm by # cm, laid out to make the smallest possible square.": "lcm",
    "Two buses set off together, then run every # and every # minutes. Next time together?": "lcm",
    "Buns come in packs of # and sausages in packs of #. Fewest packs to have equal numbers?": "lcm",
    "A #-inch ribbon and a #-inch ribbon, cut into equal pieces as long as possible.": "gcf",
    "The largest square tile that exactly fills a # cm by # cm rectangle.": "gcf",
    "Adding # and # — what should the denominator become?": "lcm",
    # mixed numbers: improper to compute with, mixed to read or report
    # Whichever form the number is given in: multiplying by, or dividing by,
    # a whole and a bit needs a single fraction, and reading a size needs the
    # whole number out in front.
    "You need to work out # #/# × # #/#.": "improper",
    "You need to work out #/# × # #/#.": "improper",
    "You need to work out # #/# ÷ # #/#.": "improper",
    "You need to work out #/# ÷ # #/#.": "improper",
    "You need to work out # ÷ # #/#.": "improper",
    "You need to work out # ÷ #/#.": "improper",
    "You need to say whether #/# is more than #.": "mixed",
    "You need to say whether # #/# is more than #.": "mixed",
    "You want to know roughly how big #/# is, at a glance.": "mixed",
    "You want to know roughly how big # #/# is, at a glance.": "mixed",
    "You need to give #/# m as the answer to a word problem about lengths.": "mixed",
    "You need to give # #/# m as the answer to a word problem about lengths.": "mixed",
    "There are #/# cups of flour left, and you are telling someone how much.": "mixed",
    "There are # #/# cups of flour left, and you are telling someone how much.": "mixed",
    # roots: exact work wants the simplest radical, a physical length a decimal
    "You need to add √# to √#.": "simplify",
    "You need to add √# to #√#.": "simplify",
    "You need to check whether √# and √# are the same number.": "simplify",
    "You need to check whether √# and #√# are the same number.": "simplify",
    "You need to cut a piece of wood √# inches long.": "estimate",
    "You need to plot √# on a number line.": "estimate",
    "You need to measure out √# meters of rope.": "estimate",
    "You need to say whether √# is nearer # or #.": "estimate",
    "You need to say whether √# is more than #.": "estimate",
    # rounding: money handed over and things cut to fit are exact
    "You are splitting a $# bill # ways and paying your share.": "exact",
    "You are cutting a shelf to fit a gap of # meters.": "exact",
    "You are cutting a board to fit a gap of # feet.": "exact",
    "You are checking that a bill of $# looks right before paying it.": "estimate",
    "You are checking that # × # on your calculator has its decimal point in the right place.": "estimate",
    "You are working out the change from $# and handing it over.": "exact",
    "You are recording a race time that decides who won.": "exact",
    "You have just divided and want to know if the answer is the right size.": "estimate",
    # brackets: kept to divide, cancel or set to zero whole; opened when the
    # terms must meet other terms
    "You need to solve #(v + #) = # for v.": "keep",
    "You need to cancel a factor of # from #(v + #) over #.": "keep",
    "You need to divide #(v + #) by # exactly.": "keep",
    "You need to find the value of v that makes #(v + #) equal to zero.": "keep",
    "You need to add #(v + #) to #v.": "open",
    "You need to take v away from #(v + #).": "open",
    "You need to take #v away from #(v + #).": "open",
    "You need to check whether #(v + #) matches another expression written as #v + #.": "open",
    "You need to add #(v + #) to #(v + #).": "open",
}


POWER = r"(\d+)([⁰¹²³⁴⁵⁶⁷⁸⁹]+)"


def power_job(job: str, text: str) -> str:
    """Leave as a power, or work out: from the sizes of the numbers involved."""
    powers = [(int(b), int(e.translate(SUPERSCRIPT))) for b, e in re.findall(POWER, text)]
    if job in ("multiply", "divide", "simplify"):
        assert len({b for b, _ in powers}) == 1, "the bases differ"
        # Combining powers of one base: either way gives the answer while the
        # values are small, so the level must only ask where they are not.
        assert max(b ** e for b, e in powers) > 10 ** 6, f"{text} can be worked out either way"
        return "keep"
    if job == "add":
        # No exponent rule adds; the values are needed, and must be workable.
        assert all(b ** e <= 10 ** 4 for b, e in powers), f"{text} is too big to work out"
        return "work out"
    # Bigger than a number that is not a power of the base: only the value says.
    base, e = powers[0]
    k = int(re.search(r"than (\d+)\.$", text)[1])
    assert all(base ** j != k for j in range(40)), f"{k} is a power of {base}"
    return "work out"


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
    if m := re.match(r"^You are checking whether \$(\d+) is enough for (\d+) tickets at \$(\d+\.\d\d) each\.$", text):
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
    (re.compile(r"^first move for (\d+)[a-z] \+ (\d+) = \d+$"), subtract_first),
    (re.compile(r"^which side for (\d*)([a-z]) \+ \d+ = (\d*)\2 \+ \d+$"), lambda a, v, c: gather_side(a, c)),
    (re.compile(r"^does (.+) [<>≤≥] −?\d+ flip$"), flips),
    (re.compile(r"^sign of (.+)$"), sign_of),
    (re.compile(r"^(\d+)/(\d+) = \?/(\d+), which way in$"), which_way_in),
    # One step when either is a whole number of lots of the other: 4 of 12
    # is the price divided by 3, as surely as 24 of 12 is it doubled.
    (re.compile(r"^(\d+) \w+ at \$\d+, need (\d+)$"),
     lambda have, need: "scale" if int(have) != int(need) and (int(need) % int(have) == 0
                                                                or int(have) % int(need) == 0) else "unit"),
    (re.compile(r"^(You need to (multiply|divide|simplify|add|say whether) .*\d[⁰¹²³⁴⁵⁶⁷⁸⁹].*\.)$"),
     lambda text, job: power_job(job, text)),
)

# Asked in prose: tried only once every other choice rule has passed, so a
# skill added later is never shadowed by a catch-all it did not know about.
PROSE_RULE = re.compile(r"^(.+[.?])$")


def collected_or_factored(src: str, answer: str) -> str:
    # Already collected, the only thing left to do is take the factor out.
    plain = src.replace("-", "−").replace("−", "-")
    return factored(plain, answer) if expanded(plain) else same_polynomial(plain, answer)


EXPR_RULES += (
    (re.compile(r"^simplest radical: sqrt\((\d+)\)$"), radical_form),
    (re.compile(r"^([\d ()+\-]*[a-z][\da-z +\-()]*)$"), collected_or_factored),
)


# --- Center and Spread -------------------------------------------------------
#
# The data is read back as the question lists it, unsorted, and every measure
# is worked again from it: sorted here, never trusted to arrive in order.
# Quartiles split at the median, the middle value of an odd count in neither
# half. Which measure fits is decided by the 1.5 × IQR test for an outlier,
# and a sample stands for its population only if it was drawn from all of
# it and by chance.

def data_of(listing: str) -> list:
    return [int(v) for v in listing.split(", ")]


def median_of(ys: list) -> Fraction:
    ys = sorted(ys)
    n = len(ys)
    return Fraction(ys[n // 2]) if n % 2 else Fraction(ys[n // 2 - 1] + ys[n // 2], 2)


def quartiles_of(listing: str):
    ys = sorted(data_of(listing))
    h = len(ys) // 2
    return median_of(ys[:h]), median_of(ys[len(ys) - h:])


def mean_deviation(listing: str) -> Fraction:
    xs = data_of(listing)
    center = Fraction(sum(xs), len(xs))
    return sum(abs(x - center) for x in xs) / len(xs)


def has_outlier(listing: str) -> bool:
    q1, q3 = quartiles_of(listing)
    fence = Fraction(3, 2) * (q3 - q1)
    return any(x < q1 - fence or x > q3 + fence for x in data_of(listing))


def missing_value(mean: str, n: int, listing: str) -> Fraction:
    return Fraction(mean) * n - sum(data_of(listing))


BY_RULE += (
    (re.compile(r"^mean: (-?\d+(?:, -?\d+)*)$"), lambda xs: Fraction(sum(data_of(xs)), len(data_of(xs)))),
    (re.compile(r"^median: (-?\d+(?:, -?\d+)*)$"), lambda xs: median_of(data_of(xs))),
    (re.compile(r"^q1: (-?\d+(?:, -?\d+)*)$"), lambda xs: quartiles_of(xs)[0]),
    (re.compile(r"^q3: (-?\d+(?:, -?\d+)*)$"), lambda xs: quartiles_of(xs)[1]),
    (re.compile(r"^iqr: (-?\d+(?:, -?\d+)*)$"), lambda xs: quartiles_of(xs)[1] - quartiles_of(xs)[0]),
    (re.compile(r"^range: (-?\d+(?:, -?\d+)*)$"), lambda xs: max(data_of(xs)) - min(data_of(xs))),
    (re.compile(r"^mad: (-?\d+(?:, -?\d+)*)$"), mean_deviation),
    (re.compile(r"^missing for mean: mean (-?\d+(?:\.5)?) over (\d+), given (-?\d+(?:, -?\d+)*)$"), missing_value),
    (re.compile(r"^next to reach: (\d+) at (\d+), want (\d+)$"), lambda n, now, goal: (n + 1) * goal - n * now),
    (re.compile(r"^add to mean: (\d+) at (\d+), add (\d+)$"), lambda n, now, new: Fraction(n * now + new, n + 1)),
    (re.compile(r"^sample estimate: (\d+) of (\d+), population (\d+)$"), lambda c, k, pop: Fraction(c * pop, k)),
)

CHOICE_RULES += (
    (re.compile(r"^center: (-?\d+(?:, -?\d+)*)$"), lambda xs: "median" if has_outlier(xs) else "mean"),
    (re.compile(r"^spread: (-?\d+(?:, -?\d+)*)$"), lambda xs: "iqr" if has_outlier(xs) else "mad"),
    (re.compile(r"^sample \((\w+), \d+, [fu]\d+, \d+\): from (all|part), by (chance|choice)$"),
     lambda _, frame, by: "yes" if frame == "all" and by == "chance" else "no"),
)



# --- Angle Relationships -----------------------------------------------------
#
# Each relationship applied again from what the text says: a right angle,
# a straight line and a full turn take away what is given; where two lines
# cross, angles an even number of places round are equal and the rest make
# 180; on parallel lines TR and BL are one size and TL and BR the other, at
# both crossings. An equation in x is solved again from the relationship's
# name, and the choice of equation is read from the words alone.

def angle_sum(listing) -> list:
    return [int(v) for v in str(listing).split(", ")]


def transversal_angle(given: int, at: str, find: str) -> int:
    one_size = lambda spot: spot in ("TR", "BL")
    return given if one_size(at) == one_size(find) else 180 - given


ANGLE_RELATION = {"vertical": "equal", "corresponding": "equal", "alternate interior": "equal",
                  "linear pair": 180, "same-side interior": 180, "complementary": 90}


def linear_in_x(src: str):
    m = re.fullmatch(r"(\d*)x(?: ([+-]) (\d+))?", src)
    assert m, f"cannot read {src}"
    a = int(m.group(1) or 1)
    b = int(m.group(3) or 0) * (-1 if m.group(2) == "-" else 1)
    return a, b


def angle_equation(relation: str, e1: str, e2: str, find: str) -> Fraction:
    (a1, b1), (a2, b2) = linear_in_x(e1), linear_in_x(e2)
    rule = ANGLE_RELATION[relation]
    x = Fraction(b2 - b1, a1 - a2) if rule == "equal" else Fraction(rule - b1 - b2, a1 + a2)
    if find == "x":
        return x
    a, b = linear_in_x(find)
    return a * x + b


def equation_from_relation(words: str) -> str:
    if "not parallel" in words or "share a vertex" in words:
        return "none"
    if "complementary" in words or "right angle" in words:
        return "90"
    if "linear pair" in words or "supplementary" in words or "same-side" in words:
        return "180"
    assert re.search(r"vertical|corresponding|alternate", words), words
    return "equal"


BY_RULE += (
    (re.compile(r"^complement: (\d+(?:, \d+)*) \(\w+\)$"), lambda xs: 90 - sum(angle_sum(xs))),
    (re.compile(r"^supplement: (\d+(?:, \d+)*) \(\w+\)$"), lambda xs: 180 - sum(angle_sum(xs))),
    (re.compile(r"^around a point: (\d+(?:, \d+)*)$"), lambda xs: 360 - sum(angle_sum(xs))),
    (re.compile(r"^crossing: (\d+) at ([0-3]), find ([0-3])$"),
     lambda g, i, j: g if (i - j) % 2 == 0 else 180 - g),
    (re.compile(r"^parallel: (\d+) at (?:top|bottom) (TL|TR|BL|BR), find (?:top|bottom) (TL|TR|BL|BR)$"),
     transversal_angle),
    (re.compile(r"^angle equation: ([a-z -]+), (\d*x(?: [+-] \d+)?), (\d*x(?: [+-] \d+)?), find (x|\d*x(?: [+-] \d+)?)$"),
     angle_equation),
)

CHOICE_RULES += (
    (re.compile(r"^which equation: ([a-z -]+), \d*x(?: [+-] \d+)?, \d*x(?: [+-] \d+)?$"), equation_from_relation),
)


# --- Triangles and Polygons --------------------------------------------------
#
# Everything from two facts, applied again: a polygon of n sides has angles
# adding to (n - 2) × 180, and its exterior angles add to 360. An exterior
# angle of a triangle is 180 less the angle beside it, which is the two far
# ones added. Three lengths make a triangle when the two shorter add to more
# than the longest.

def polygon_sum(n: int) -> int:
    return (n - 2) * 180


def regular_each(n: int) -> Fraction:
    return Fraction(polygon_sum(n), n)


def sides_from_exterior(each) -> Fraction:
    return Fraction(360) / Fraction(each)


def triangle_in_x(listing: str) -> Fraction:
    terms = [linear_in_x(t) for t in listing.split(", ")]
    return Fraction(180 - sum(b for _, b in terms), sum(a for a, _ in terms))


def isosceles_in_x(e1: str, other: str, e2: str) -> Fraction:
    (a1, b1), (a2, b2) = linear_in_x(e1), linear_in_x(e2)
    if other == "base":
        return Fraction(b2 - b1, a1 - a2)
    return Fraction(180 - 2 * b1 - b2, 2 * a1 + a2)


def makes_triangle(listing: str) -> str:
    x, y, z = sorted(angle_sum(listing))
    return "yes" if x + y > z else "no"


def sides_with_sum(total: int) -> int:
    """The polygon whose angles add to `total`, found by trying each, not by undoing the formula."""
    return next(n for n in range(3, 400) if polygon_sum(n) == total)


def regular_with_interior(each: int) -> int:
    return next(n for n in range(3, 400) if regular_each(n) == each)


def third_side_range(a: str, b: str) -> frozenset:
    """Every length on the line that closes a triangle with a and b, tried one by one."""
    def closes(c):
        x, y, z = sorted((Fraction(a), Fraction(b), c))
        return x > 0 and x + y > z
    return frozenset(c for c in SAMPLES_ON_LINE if closes(c))


def third_side(a: int, b: int, which: str) -> int:
    """The longest or shortest whole third side, by trying every length against the inequality."""
    fits = [c for c in range(1, a + b + 2) if makes_triangle(f"{a}, {b}, {c}") == "yes"]
    return max(fits) if which == "longest" else min(fits)


BY_RULE += (
    (re.compile(r"^triangle: (\d+, \d+)$"), lambda xs: 180 - sum(angle_sum(xs))),
    (re.compile(r"^triangle in x: (\d*x(?: [+-] \d+)?(?:, \d*x(?: [+-] \d+)?){2})$"), triangle_in_x),
    (re.compile(r"^exterior angle: remote (\d+), (\d+)$"), lambda a, c: a + c),
    (re.compile(r"^remote angle: exterior (\d+), other (\d+)$"), lambda e, k: e - k),
    (re.compile(r"^isosceles: apex (\d+)$"), lambda apex: Fraction(180 - apex, 2)),
    (re.compile(r"^isosceles: base (\d+)$"), lambda base: 180 - 2 * base),
    (re.compile(r"^isosceles in x: base (\d*x(?: [+-] \d+)?), (base|apex) (\d*x(?: [+-] \d+)?)$"), isosceles_in_x),
    (re.compile(r"^interior sum: (\d+)$"), polygon_sum),
    (re.compile(r"^missing interior: (\d+) sides, (\d+(?:, \d+)*)$"), lambda n, xs: polygon_sum(n) - sum(angle_sum(xs))),
    (re.compile(r"^regular interior: (\d+)$"), regular_each),
    (re.compile(r"^regular from sum: (\d+)$"), lambda total: Fraction(total, total // 180 + 2)),
    (re.compile(r"^regular sides from interior: (\d+)$"), lambda each: sides_from_exterior(180 - each)),
    (re.compile(r"^regular gap: (\d+(?:, \d+)*)$"), lambda ns: 360 - sum(regular_each(n) for n in angle_sum(ns))),
    (re.compile(r"^regular exterior: (\d+)$"), lambda n: Fraction(360, n)),
    (re.compile(r"^regular sides from exterior: (\d+)$"), sides_from_exterior),
    (re.compile(r"^missing exterior: (\d+(?:, \d+)*)$"), lambda xs: 360 - sum(angle_sum(xs))),
    (re.compile(r"^sides from interior sum: (\d+)$"), sides_with_sum),
    (re.compile(r"^regular interior from exterior: (\d+)$"), lambda e: regular_each(sides_from_exterior(e))),
    (re.compile(r"^regular exterior from interior: (\d+)$"), lambda i: Fraction(360, regular_with_interior(i))),
    (re.compile(r"^third side: (\d+), (\d+), (longest|shortest)$"), third_side),
)

CHOICE_RULES += (
    (re.compile(r"^triangle sides: (\d+, \d+, \d+)$"), makes_triangle),
)

SET_RULES += (
    (re.compile(r"^third side range: (\d+), (\d+)$"), third_side_range),
)

# --- Area and Circles ---------------------------------------------------------
#
# Base times height for a parallelogram, half that for a triangle, the mean
# of the parallel sides times the height for a trapezoid. C = πd and A = πr²,
# answered either as the number of π or with π taken as 3.14, which the text
# says. Composites are added or taken away piece by piece, and a missing
# length runs a formula backwards. Exact throughout: 3.14 is 314/100.

LENGTH = r"(\d+(?:\.\d+)?)"
PI_FORM = r"\((pi|3\.14)\)"


def pi_as(form: str) -> Fraction:
    """π as the answer counts it: kept, so the answer is a number of π, or 3.14."""
    return Fraction(1) if form == "pi" else Fraction("3.14")


def circumference_of(what: str, g: str, form: str) -> Fraction:
    d = Fraction(g) * (2 if what == "radius" else 1)
    return pi_as(form) * d


def circle_area_of(what: str, g: str, form: str) -> Fraction:
    r = Fraction(g) / (1 if what == "radius" else 2)
    return pi_as(form) * r * r


def length_from_circumference(what: str, c: str, form: str) -> Fraction:
    d = Fraction(c) / pi_as(form)
    return d / 2 if what == "radius" else d


def length_from_area(what: str, k: str) -> Fraction:
    r = math.isqrt(int(k))
    assert r * r == int(k), k
    return Fraction(r * (2 if what == "diameter" else 1))


def rect_less_circle(W: str, H: str, r: str) -> Fraction:
    return Fraction(W) * Fraction(H) - Fraction("3.14") * Fraction(r) ** 2


def rect_and_half_circle(W: str, H: str, r: str) -> Fraction:
    assert Fraction(W) == 2 * Fraction(r), (W, r)        # the half circle spans the side
    return Fraction(W) * Fraction(H) + Fraction("3.14") * Fraction(r) ** 2 / 2


def side_of_square(a: str) -> Fraction:
    s = math.isqrt(int(a))
    assert s * s == int(a), a
    return Fraction(s)


BY_RULE += (
    (re.compile(rf"^rectangle: {LENGTH} by {LENGTH}$"), lambda w, h: Fraction(w) * Fraction(h)),
    (re.compile(rf"^square area: side {LENGTH}$"), lambda s: Fraction(s) ** 2),
    (re.compile(rf"^parallelogram: base {LENGTH}, height {LENGTH}, slant {LENGTH}$"),
     lambda b, h, s: Fraction(b) * Fraction(h)),
    (re.compile(rf"^triangle area: base {LENGTH}, height {LENGTH} \((?:right|acute|obtuse)[^)]*\)$"),
     lambda b, h: Fraction(b) * Fraction(h) / 2),
    (re.compile(rf"^trapezoid: {LENGTH}, {LENGTH}, height {LENGTH}, (?:slant|top from) {LENGTH}$"),
     lambda a, c, h, _: (Fraction(a) + Fraction(c)) * Fraction(h) / 2),
    (re.compile(rf"^circumference: (radius|diameter) {LENGTH} {PI_FORM}$"), circumference_of),
    (re.compile(rf"^(radius|diameter) from circumference: {LENGTH} {PI_FORM}$"), length_from_circumference),
    (re.compile(rf"^circle area: (radius|diameter) {LENGTH} {PI_FORM}$"), circle_area_of),
    (re.compile(rf"^(radius|diameter) from area: (\d+) \(pi\)$"), length_from_area),
    (re.compile(rf"^composite \((?:L|hole)\): rect {LENGTH} x {LENGTH} - rect {LENGTH} x {LENGTH}$"),
     lambda W, H, w, h: Fraction(W) * Fraction(H) - Fraction(w) * Fraction(h)),
    (re.compile(rf"^composite \(hole\): rect {LENGTH} x {LENGTH} - circle radius {LENGTH} \(3\.14\)$"), rect_less_circle),
    (re.compile(rf"^composite \(house\): rect {LENGTH} x {LENGTH} \+ tri {LENGTH} x {LENGTH}$"),
     lambda W, H, b, t: Fraction(W) * Fraction(H) + Fraction(b) * Fraction(t) / 2),
    (re.compile(rf"^composite \(semi\): rect {LENGTH} x {LENGTH} \+ semicircle radius {LENGTH} \(3\.14\)$"), rect_and_half_circle),
    (re.compile(r"^missing: square area (\d+)$"), side_of_square),
    (re.compile(rf"^missing: (?:rectangle|parallelogram) area {LENGTH}, (?:length|width|base|height) {LENGTH}$"),
     lambda a, k: Fraction(a) / Fraction(k)),
    (re.compile(rf"^missing: triangle area {LENGTH}, (?:base|height) {LENGTH}$"),
     lambda a, k: 2 * Fraction(a) / Fraction(k)),
    (re.compile(rf"^missing: trapezoid area {LENGTH}, sides {LENGTH} and {LENGTH}$"),
     lambda a, p, q: 2 * Fraction(a) / (Fraction(p) + Fraction(q))),
    (re.compile(rf"^missing: trapezoid area {LENGTH}, height {LENGTH}, side {LENGTH}$"),
     lambda a, h, p: 2 * Fraction(a) / Fraction(h) - Fraction(p)),
)

# --- Volume and Surface Area -------------------------------------------------
#
# A prism or cylinder is its base times its height, a pyramid or cone a third
# of that, a sphere 4/3 πr³ and a hemisphere half. Surfaces are every face
# added: a box's three pairs, a cylinder's circles and the rectangle as long
# as its circumference, πrl round a cone with l the slant, 4πr² round a
# sphere and 3πr² over a solid hemisphere. A slant and a height both given
# must make a right triangle with the radius, or the figure is impossible.

def radius_of(what: str, g: str) -> Fraction:
    return Fraction(g) / (2 if what == "diameter" else 1)


def right_triangle(a, b, c) -> None:
    assert Fraction(a) ** 2 + Fraction(b) ** 2 == Fraction(c) ** 2, (a, b, c)


def cone_volume(what: str, g: str, h: str, s, form: str) -> Fraction:
    r = radius_of(what, g)
    if s is not None:
        right_triangle(r, h, s)
    return pi_as(form) * r * r * Fraction(h) / 3


def pyramid_volume(L: str, W: str, H: str, s) -> Fraction:
    if s is not None:                                  # up the middle of a face
        assert L == W, (L, W)
        right_triangle(Fraction(L) / 2, H, s)
    return Fraction(L) * Fraction(W) * Fraction(H) / 3


def ball_volume(solid: str, what: str, g: str, form: str) -> Fraction:
    r = radius_of(what, g)
    return pi_as(form) * Fraction(4 if solid == "sphere" else 2, 3) * r ** 3


def ball_radius(solid: str, k: str) -> Fraction:
    cube = Fraction(k) * 3 / (4 if solid == "sphere" else 2)
    r = Fraction(round(float(cube) ** (1 / 3) * 2), 2)          # radii here are whole or halves
    assert r ** 3 == cube, k
    return r


def tri_prism(a: str, b: str, c: str, length: str, what: str) -> Fraction:
    right_triangle(a, b, c)
    a, b, c, length = map(Fraction, (a, b, c, length))
    return a * b / 2 * length if what == "volume" else a * b + (a + b + c) * length


CYLINDER_ENDS = {"closed": 2, "open": 1, "no ends": 0}


def cylinder_surface(what: str, g: str, h: str, ends: str, form: str) -> Fraction:
    r = radius_of(what, g)
    return pi_as(form) * (CYLINDER_ENDS[ends] * r * r + 2 * r * Fraction(h))


def cone_surface(what: str, g: str, s: str, h: str, part: str, form: str) -> Fraction:
    r = radius_of(what, g)
    right_triangle(r, h, s)
    return pi_as(form) * (r * Fraction(s) + (r * r if part == "closed" else 0))


def ball_surface(solid: str, what: str, g: str, form: str) -> Fraction:
    r = radius_of(what, g)
    return pi_as(form) * (4 if solid == "sphere" else 3) * r * r


def radius_from_sphere_surface(k: str) -> Fraction:
    square = Fraction(k) / 4
    r = Fraction(round(float(square) ** 0.5 * 2), 2)
    assert r * r == square, k
    return r


BY_RULE += (
    (re.compile(rf"^box volume: {LENGTH} x {LENGTH} x {LENGTH}$"),
     lambda L, W, H: Fraction(L) * Fraction(W) * Fraction(H)),
    (re.compile(rf"^cube volume: side {LENGTH}$"), lambda s: Fraction(s) ** 3),
    (re.compile(rf"^box height from volume: {LENGTH}, base {LENGTH} x {LENGTH}$"),
     lambda V, L, W: Fraction(V) / (Fraction(L) * Fraction(W))),
    (re.compile(rf"^triangular prism (volume|surface): legs {LENGTH}, {LENGTH}, hypotenuse {LENGTH}, length {LENGTH}$"),
     lambda what, a, b, c, L: tri_prism(a, b, c, L, what)),
    (re.compile(rf"^cylinder volume: (radius|diameter) {LENGTH}, height {LENGTH} {PI_FORM}$"),
     lambda what, g, h, form: pi_as(form) * radius_of(what, g) ** 2 * Fraction(h)),
    (re.compile(rf"^cylinder height from volume: {LENGTH}, radius {LENGTH} \(pi\)$"),
     lambda k, r: Fraction(k) / Fraction(r) ** 2),
    (re.compile(rf"^pyramid volume: base {LENGTH} x {LENGTH}, height {LENGTH}(?:, slant {LENGTH})?$"), pyramid_volume),
    (re.compile(rf"^cone volume: (radius|diameter) {LENGTH}, height {LENGTH}(?:, slant {LENGTH})? {PI_FORM}$"), cone_volume),
    (re.compile(rf"^(sphere|hemisphere) volume: (radius|diameter) {LENGTH} {PI_FORM}$"), ball_volume),
    (re.compile(rf"^(sphere|hemisphere) radius from volume: {LENGTH} \(pi\)$"), ball_radius),
    (re.compile(rf"^box surface: {LENGTH} x {LENGTH} x {LENGTH}$"),
     lambda L, W, H: 2 * (Fraction(L) * Fraction(W) + Fraction(L) * Fraction(H) + Fraction(W) * Fraction(H))),
    (re.compile(rf"^cube surface: side {LENGTH}$"), lambda s: 6 * Fraction(s) ** 2),
    (re.compile(rf"^cylinder surface: (radius|diameter) {LENGTH}, height {LENGTH}, (closed|open|no ends) {PI_FORM}$"),
     cylinder_surface),
    (re.compile(rf"^cone surface: (radius|diameter) {LENGTH}, slant {LENGTH}, height {LENGTH}, (closed|curved) {PI_FORM}$"),
     cone_surface),
    (re.compile(rf"^(sphere|hemisphere) surface: (radius|diameter) {LENGTH} {PI_FORM}$"), ball_surface),
    (re.compile(rf"^sphere radius from surface: {LENGTH} \(pi\)$"), radius_from_sphere_surface),
)


# requiem: catalogue/content/pi-as-3-14-rounds-to-a-place
# With π taken as 3.14 an area or volume is rounded to the place the question
# names, and its text ends "to 1 dp". Each 3.14 rule is read again for that
# text: the same exact working, then rounded half up -- never the generator's
# float rounded. ROUNDED_TO then holds the stored places to the same place.
def rounded(solve):
    return lambda *groups: half_up(Fraction(solve(*groups[:-1])), int(groups[-1]))


BY_RULE += tuple((re.compile(rule.pattern[:-1] + r" to (\d) dp$"), rounded(solve))
                 for rule, solve in BY_RULE if r"3\.14" in rule.pattern)

# --- Transformations ---------------------------------------------------------
#
# Each move is applied again from its own rule: a translation adds, a
# reflection over an axis changes one sign and over x = k keeps the distance
# to the line, y = x swaps, a rotation about a centre turns the offset from
# it, and a dilation scales that offset. A figure is named from coordinates
# alone -- sides scaled, then turned over, then pointing the same way -- and
# a rule or sequence is congruent when it keeps every length, similar when it
# scales them all alike, and neither otherwise.

POINT = r"\((-?\d+), (-?\d+)\)"


def as_point(x, y) -> tuple:
    return Fraction(x), Fraction(y)


def reflect_over(line: str):
    if line == "x-axis":
        return lambda x, y: (x, -y)
    if line == "y-axis":
        return lambda x, y: (-x, y)
    if line == "y = x":
        return lambda x, y: (y, x)
    if line == "y = -x":
        return lambda x, y: (-y, -x)
    axis, k = re.fullmatch(r"([xy]) = (-?\d+)", line).groups()
    k = Fraction(k)
    return (lambda x, y: (2 * k - x, y)) if axis == "x" else (lambda x, y: (x, 2 * k - y))


QUARTER_TURNS = {"90 ccw": 1, "180": 2, "90 cw": 3, "270 ccw": 3}


def turned(x, y, quarters: int) -> tuple:
    for _ in range(quarters):                          # a quarter turn counterclockwise each time
        x, y = -y, x
    return x, y


def rotate_about(x, y, turn: str, h, k) -> tuple:
    a, b = turned(Fraction(x) - Fraction(h), Fraction(y) - Fraction(k), QUARTER_TURNS[turn])
    return a + Fraction(h), b + Fraction(k)


def dilate_about(x, y, factor: str, h, k) -> tuple:
    f, h, k = Fraction(factor), Fraction(h), Fraction(k)
    return h + f * (Fraction(x) - h), k + f * (Fraction(y) - k)


def move_step(step: str):
    """One step of a sequence, in the text's words, as a function of a point."""
    if step.startswith("reflect "):
        return reflect_over(step[len("reflect "):])
    if step.startswith("rotate "):
        q = QUARTER_TURNS[step[len("rotate "):]]
        return lambda x, y: turned(x, y, q)
    if step.startswith("dilate "):
        f = Fraction(step[len("dilate "):])
        return lambda x, y: (f * x, f * y)
    a, b = re.fullmatch(rf"translate {POINT}", step).groups()
    return lambda x, y: (x + Fraction(a), y + Fraction(b))


def after_steps(steps: str):
    moves = [move_step(s) for s in steps.split("; ")]

    def go(x, y):
        for m in moves:
            x, y = m(x, y)
        return x, y
    return go


def points_of(listing: str) -> list:
    return [as_point(x, y) for x, y in re.findall(POINT, listing)]


def name_the_move(before: str, after: str) -> str:
    P, Q = points_of(before), points_of(after)
    side = lambda A, B: (B[0] - A[0], B[1] - A[1])
    length2 = lambda v: v[0] ** 2 + v[1] ** 2
    ratios = {length2(side(Q[i], Q[j])) / length2(side(P[i], P[j])) for i, j in ((0, 1), (1, 2), (2, 0))}
    assert len(ratios) == 1, (before, after)           # every side scaled alike, or it is no single move
    if ratios != {1}:
        return "dilation"
    area = lambda T: (T[1][0] - T[0][0]) * (T[2][1] - T[0][1]) - (T[1][1] - T[0][1]) * (T[2][0] - T[0][0])
    if (area(P) > 0) != (area(Q) > 0):
        return "reflection"
    return "translation" if side(P[0], P[1]) == side(Q[0], Q[1]) and side(P[1], P[2]) == side(Q[1], Q[2]) else "rotation"


def kind_of_map(go) -> str:
    """Congruent, similar or neither, from where the map sends three points."""
    o, e1, e2 = go(Fraction(0), Fraction(0)), go(Fraction(1), Fraction(0)), go(Fraction(0), Fraction(1))
    a, c = e1[0] - o[0], e1[1] - o[1]
    b, d = e2[0] - o[0], e2[1] - o[1]
    far = go(Fraction(2), Fraction(3))
    assert far == (o[0] + 2 * a + 3 * b, o[1] + 2 * c + 3 * d)     # a straight-line map, as all of these are
    if a * b + c * d != 0 or a * a + c * c != b * b + d * d:
        return "neither"
    return "congruent" if a * a + c * c == 1 else "similar"


def kind_of_rule(rule: str) -> str:
    inner = rule.strip()[1:-1]
    depth, cut = 0, None
    for i, ch in enumerate(inner):
        depth += ch == "("
        depth -= ch == ")"
        if ch == "," and depth == 0:
            cut = i
    fx, fy = inner[:cut], inner[cut + 1:]
    return kind_of_map(lambda x, y: (at_xy(fx, x, y), at_xy(fy, x, y)))


PAIR_RULES += (
    (re.compile(rf"^translate {POINT} by {POINT}$"),
     lambda x, y, a, b: (Fraction(x) + Fraction(a), Fraction(y) + Fraction(b))),
    (re.compile(rf"^translate {POINT} like {POINT} -> {POINT}$"),
     lambda x, y, x0, y0, x1, y1: (Fraction(x) + Fraction(x1) - Fraction(x0), Fraction(y) + Fraction(y1) - Fraction(y0))),
    (re.compile(rf"^reflect {POINT} over (x-axis|y-axis|y = x|y = -x|[xy] = -?\d+)$"),
     lambda x, y, line: reflect_over(line)(*as_point(x, y))),
    (re.compile(rf"^rotate {POINT} by (90 ccw|180|90 cw|270 ccw) about {POINT}$"), rotate_about),
    (re.compile(rf"^dilate {POINT} by (\d+(?:/\d+)?) about {POINT}$"), dilate_about),
    (re.compile(rf"^sequence {POINT}: (.+)$"), lambda x, y, steps: after_steps(steps)(*as_point(x, y))),
)

CHOICE_RULES += (
    (re.compile(r"^which move: (.+) -> (.+)$"), name_the_move),
    (re.compile(r"^congruent or similar: \(x, y\) -> (\(.+\))$"), kind_of_rule),
    (re.compile(r"^congruent or similar: ([a-z].+)$"),
     lambda steps: kind_of_map(after_steps(steps))),
)

# --- Coordinate Geometry -----------------------------------------------------
#
# Worked from the coordinates alone: a midpoint is the average of the ends,
# a partition the start plus m/(m + n) of the trip, a perimeter the sum of
# the side lengths, an area by the shoelace formula, a missing coordinate
# from equal or negative-reciprocal slopes, a triangle classified by its
# squared sides and the dot products at its corners, and a parallelogram's
# fourth corner as A + C - B. A perimeter that is not whole is rounded from
# square roots taken in integers, far past the place asked for.

GRID_POINT = r"\((-?\d+), (-?\d+)\)"


def grid_points(listing: str) -> list:
    return [(Fraction(x), Fraction(y)) for x, y in re.findall(GRID_POINT, listing)]


def mid_of(listing: str) -> tuple:
    (ax, ay), (bx, by) = grid_points(listing)
    return (ax + bx) / 2, (ay + by) / 2


def far_end(listing: str) -> tuple:
    (ax, ay), (mx, my) = grid_points(listing)
    return 2 * mx - ax, 2 * my - ay


def split_at(listing: str, m: int, n: int) -> tuple:
    (ax, ay), (bx, by) = grid_points(listing)
    t = Fraction(m, m + n)
    return ax + t * (bx - ax), ay + t * (by - ay)


def perimeter_of(listing: str, rounded) -> Fraction:
    P = grid_points(listing)
    squares = [int((P[i][0] - P[i - 1][0]) ** 2 + (P[i][1] - P[i - 1][1]) ** 2) for i in range(len(P))]
    if rounded is None:
        roots = [math.isqrt(s) for s in squares]
        assert all(r * r == s for r, s in zip(roots, squares)), listing       # asked exactly, so every side is whole
        return Fraction(sum(roots))
    scale = 10 ** 15
    total = sum(math.isqrt(s * scale * scale) for s in squares)              # each within 1 of the true root, scaled
    tenths, rest = divmod(total * 10, scale)
    # Far from the rounding edge, so the few units of error cannot matter.
    assert abs(rest - scale // 2) > 100, listing
    return Fraction(tenths + (1 if rest > scale // 2 else 0), 10)


def polygon_area(listing: str) -> Fraction:
    P = grid_points(listing)
    twice = sum(P[i - 1][0] * P[i][1] - P[i][0] * P[i - 1][1] for i in range(len(P)))
    return abs(twice) / 2


def missing_k(relation: str, listing: str, x: int) -> Fraction:
    (ax, ay), (bx, by), (cx, cy) = grid_points(listing)
    slope = (by - ay) / (bx - ax)
    want = slope if relation == "parallel" else -1 / slope
    return cy + want * (Fraction(x) - cx)


def triangle_kind(listing: str) -> str:
    P = grid_points(listing)
    sq = lambda p, q: (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2
    sides = {sq(P[0], P[1]), sq(P[1], P[2]), sq(P[2], P[0])}
    corner = lambda o, p, q: (p[0] - o[0]) * (q[0] - o[0]) + (p[1] - o[1]) * (q[1] - o[1])
    right = any(corner(P[i], P[i - 1], P[i - 2]) == 0 for i in range(3))
    isosceles = len(sides) < 3
    return {(True, True): "right-isosceles", (False, True): "isosceles", (True, False): "right"}.get((right, isosceles), "scalene")


def fourth_corner(listing: str) -> tuple:
    (ax, ay), (bx, by), (cx, cy) = grid_points(listing)
    return ax + cx - bx, ay + cy - by


BY_RULE += (
    (re.compile(rf"^perimeter: ({GRID_POINT}(?:, {GRID_POINT})+)( to 1 dp)?$"),
     lambda listing, *rest: perimeter_of(listing, rest[-1])),
    (re.compile(rf"^area of polygon: ({GRID_POINT}(?:, {GRID_POINT})+)$"), lambda listing, *_: polygon_area(listing)),
    (re.compile(rf"^k for (parallel|perpendicular): ({GRID_POINT}, {GRID_POINT}, {GRID_POINT}), x = (-?\d+)$"),
     lambda rel, listing, *rest: missing_k(rel, listing, rest[-1])),
)

PAIR_RULES += (
    (re.compile(rf"^midpoint: ({GRID_POINT}, {GRID_POINT})$"), lambda listing, *_: mid_of(listing)),
    (re.compile(rf"^endpoint: ({GRID_POINT}), midpoint ({GRID_POINT})$"),
     lambda a, ax, ay, m, mx, my: far_end(f"{a}, {m}")),
    (re.compile(rf"^partition: ({GRID_POINT}) to ({GRID_POINT}), (\d+):(\d+)$"),
     lambda a, ax, ay, b, bx, by, m, n: split_at(f"{a}, {b}", int(m), int(n))),
    (re.compile(rf"^fraction of the way: (\d+)/(\d+) from ({GRID_POINT}) to ({GRID_POINT})$"),
     lambda p, q, a, ax, ay, b, bx, by: split_at(f"{a}, {b}", int(p), int(q) - int(p))),
    (re.compile(rf"^fourth vertex: ({GRID_POINT}, {GRID_POINT}, {GRID_POINT})$"), lambda listing, *_: fourth_corner(listing)),
)

CHOICE_RULES += (
    (re.compile(rf"^classify triangle: ({GRID_POINT}, {GRID_POINT}, {GRID_POINT})$"), lambda listing, *_: triangle_kind(listing)),
)

# --- Congruent Triangles -----------------------------------------------------
#
# Worked from the letters: a congruence statement pairs corners by position
# in the name, a criterion is read from where the marked angle or side sits
# (between the other two parts or not), the missing fact is whichever one
# remaining part completes the named criterion, and the equations come from
# setting matched parts equal. Lengths and angles in x are a·x + b.

TRI_SIDES = {frozenset("AB"): "AB", frozenset("BC"): "BC", frozenset("CA"): "CA"}
LINEAR_X = re.compile(r"^(\d*)x(?: ([+-]) (\d+))?$")


def lin_x(s: str) -> tuple:
    m = LINEAR_X.match(s.strip())
    assert m, s
    a = int(m[1]) if m[1] else 1
    b = 0 if m[2] is None else (int(m[3]) if m[2] == "+" else -int(m[3]))
    return Fraction(a), Fraction(b)


def equate(e1: tuple, e2: tuple) -> Fraction:
    (a1, b1), (a2, b2) = e1, e2
    assert a1 != a2, (e1, e2)
    return (b2 - b1) / (a1 - a2)


def partner_of(statement: str, part: str) -> str:
    """The second triangle's part matching one of ABC's, named in the second's letters."""
    pairs = dict(zip("ABC", statement))
    if part.startswith("angle "):
        return "angle " + pairs[part[-1]]
    return "".join(pairs[c] for c in part)


def same_part(p: str, q: str) -> bool:
    if p.startswith("angle ") or q.startswith("angle "):
        return p == q
    return set(p) == set(q)


def corresponding_side(statement: str, ab: int, bc: int, ca: int, asked: str) -> int:
    back = {c: "ABC"[i] for i, c in enumerate(statement)}
    return {"AB": ab, "BC": bc, "CA": ca}[TRI_SIDES[frozenset(back[c] for c in asked)]]


def corresponding_angle(statement: str, v1: str, a1: int, v2: str, a2: int, asked: str) -> int:
    known = {v1: a1, v2: a2}
    own = "ABC"[statement.index(asked)]
    return known.get(own, 180 - a1 - a2)


def named_congruence(kind: str, first: str, second: str) -> str:
    def counts(listing):
        return {name: int(n) for name, n in (item.split(" ") for item in listing.split(", "))}
    one, two = counts(first), counts(second)
    if kind == "angles":
        by = lambda marks: {v: n for v, n in marks.items()}
        key1, key2 = by(one), by(two)
    else:
        # A corner is known by the marks on the two sides that meet at it.
        corner = lambda marks: {c: frozenset(n for s, n in marks.items() if c in s)
                                for c in {c for s in marks for c in s}}
        key1, key2 = corner(one), corner(two)
    found = "".join(next(c for c, k in key2.items() if k == key1[v]) for v in "ABC")
    assert len(set(found)) == 3, (first, second)
    return found


def criterion_of(listing: str) -> str:
    parts = listing.split(", ")
    sides = {frozenset(p) for p in parts if not p.startswith(("angle", "right"))}
    angles = {p[-1] for p in parts if p.startswith(("angle", "right"))}
    right = next((p[-1] for p in parts if p.startswith("right angle ")), None)
    if right is not None and len(sides) == 2 and len(angles) == 1 and frozenset("ABC") - {right} in sides:
        return "hl"
    if len(sides) == 3:
        return "sss"
    if len(sides) == 2 and len(angles) == 1:
        a, b = sides
        return "sas" if a & b == set(angles) else "none"
    if len(sides) == 1 and len(angles) == 2:
        (s,) = sides
        return "asa" if s == frozenset(angles) else "aas"
    return "none"


def missing_fact(crit: str, listing: str) -> str:
    given = listing.split(", ")
    right = next((p[-1] for p in given if p.startswith("right angle ")), None)
    pool = ["AB", "BC", "CA"] + [f"angle {v}" for v in "ABC" if v != right]
    fits = [p for p in pool if p not in given and criterion_of(", ".join(given + [p])) == crit.lower()]
    assert len(fits) == 1, (crit, listing, fits)
    return fits[0]


def parts_in_x(listing: str) -> list:
    out = []
    for item in listing.split(", "):
        m = re.match(r"^(angle [A-Z]|[A-Z]{2}) (.+)$", item)
        out.append((m[1], lin_x(m[2])))
    return out


def isosceles_sides(e1: str, e2: str, pairs: str, asked: str) -> Fraction:
    have = dict(parts_in_x(pairs.rsplit(", ", 1)[0]))
    x = equate(have[e1], have[e2])
    assert len(set(e1) & set(e2)) == 1, (e1, e2)                 # the two legs meet at the apex
    if asked == "x":
        return x
    a, b = have[asked]
    return a * x + b


def isosceles_angles(v1: str, v2: str, listing: str, asked: str) -> Fraction:
    have = parts_in_x(listing)
    legs = [next(e for name, e in have if v not in name) for v in (v1, v2)]   # the side facing each equal angle
    x = equate(*legs)
    if asked == "x":
        return x
    a, b = next(e for name, e in have if set(name) == set(asked))
    return a * x + b


def equilateral(listing: str, asked: str) -> Fraction:
    have = parts_in_x(listing)
    if have[0][0].startswith("angle"):
        x = equate(have[0][1], (Fraction(0), Fraction(60)))       # every angle is 180 / 3
    else:
        x = equate(have[0][1], have[1][1])
    if asked == "x":
        return x
    a, b = have[0][1]
    return a * x + b


def use_congruence(statement: str, listing: str, asked: str) -> Fraction:
    (own, e1), *rest = parts_in_x(listing)
    match = partner_of(statement, own)
    pick = [e for name, e in rest if same_part(name, match)]
    assert len(pick) == 1, (statement, listing)
    x = equate(e1, pick[0])
    if asked == "x":
        return x
    a, b = next(e for name, e in rest if same_part(name, asked))
    return a * x + b


BY_RULE += (
    (re.compile(r"^corresponding: ABC = ([A-Z]{3}); AB (\d+), BC (\d+), CA (\d+); find ([A-Z]{2})$"), corresponding_side),
    (re.compile(r"^corresponding: ABC = ([A-Z]{3}); angle ([ABC]) (\d+), angle ([ABC]) (\d+); find angle ([A-Z])$"),
     corresponding_angle),
    (re.compile(r"^isosceles sides: ([A-C]{2}) = ([A-C]{2}); (.+); find (x|[A-C]{2})$"), isosceles_sides),
    (re.compile(r"^isosceles angles: ([ABC]) = ([ABC]); (.+); find (x|[A-C]{2})$"), isosceles_angles),
    (re.compile(r"^equilateral: (.+); find (x|side)$"), equilateral),
    (re.compile(r"^use congruence: ABC = ([A-Z]{3}); (.+); find (x|angle [A-Z]|[A-Z]{2})$"), use_congruence),
)

CHOICE_RULES += (
    (re.compile(r"^name the congruence: (sides|angles) ([^;]+); (.+)$"), named_congruence),
    (re.compile(r"^(?:criterion|enough): ABC = [A-Z]{3}; (.+)$"), criterion_of),
    (re.compile(r"^missing for (SSS|SAS|ASA|AAS|HL): ABC = [A-Z]{3}; (.+)$"), missing_fact),
)

# --- Similar Figures ---------------------------------------------------------
#
# Worked from the statement and the numbers: the scale factor is one
# triangle's side over the side it matches, read through the letters; a
# missing side is its match times that factor; similarity is tested by
# third angles, by sorted side ratios, or by two side ratios and the angle
# between; a scale multiplies out and divides back; areas go by k² and
# volumes by k³; a parallel line splits two sides in one ratio t = AD/AB;
# and the altitude to the hypotenuse gives CD² = AD·DB and AC² = AD·AB.

NAMED_LENGTH = re.compile(r"^(angle [A-Z]|[A-Z]{2}) (\d+(?:\.\d+)?)$")


def named_lengths(listing: str) -> list:
    out = []
    for item in listing.split(", "):
        m = NAMED_LENGTH.match(item)
        assert m, item
        out.append((m[1], Fraction(m[2])))
    return out


def in_first(name: str) -> bool:
    return set(name) <= set("ABC")


def factor_from(statement: str, parts: list) -> Fraction:
    """Second triangle over first, from the one given pair that matches."""
    pairs = [(v1, v2) for n1, v1 in parts if in_first(n1)
             for n2, v2 in parts if not in_first(n2) and same_part(partner_of(statement, n1), n2)]
    assert len(pairs) == 1, (statement, parts)
    v1, v2 = pairs[0]
    return v2 / v1


def scale_factor(statement: str, listing: str, start: str) -> Fraction:
    k = factor_from(statement, named_lengths(listing))
    return k if start == "ABC" else 1 / k


def similar_missing(statement: str, listing: str, asked: str) -> Fraction:
    parts = named_lengths(listing)
    k = factor_from(statement, parts)
    if in_first(asked):
        match = partner_of(statement, asked)
        return next(v for n, v in parts if same_part(n, match)) / k
    back = {c: "ABC"[i] for i, c in enumerate(statement)}
    match = "".join(back[c] for c in asked)
    return next(v for n, v in parts if same_part(n, match)) * k


def similar_by_angles(listing: str) -> str:
    (a, b), (c, d) = ([int(v) for v in half.split(", ")] for half in listing.split("; "))
    return "yes" if sorted([a, b, 180 - a - b]) == sorted([c, d, 180 - c - d]) else "no"


def similar_by_sides(listing: str) -> str:
    one, two = (sorted(Fraction(v) for v in half.split(", ")) for half in listing.split("; "))
    return "yes" if len({q / p for p, q in zip(one, two)}) == 1 else "no"


def similar_by_sas(c1, b1, a1, c2, b2, a2) -> str:
    c1, b1, c2, b2 = (Fraction(v) for v in (c1, b1, c2, b2))
    if a1 != a2:
        return "no"
    # The angle sits between the two sides either way round, so either pairing will do.
    return "yes" if c2 / c1 == b2 / b1 or c2 / b1 == b2 / c1 else "no"


def scale_out_back(per: str, unit: str, length: str, way: str) -> Fraction:
    per, length = Fraction(per), Fraction(length)
    return length * per if way == "out" else length / per


# How many of a model's own unit make the bigger unit it may be asked in.
MODEL_BIG = {("cm", "m"): 100, ("in", "ft"): 12}


def scale_model(n: int, model: str, small: str, unit: str) -> Fraction:
    real = Fraction(model) * n
    return real if unit == small else real / MODEL_BIG[(small, unit)]


def area_scale(what: str, k: str, amount: str, which: str) -> Fraction:
    power = 2 if what == "area" else 3
    grow = Fraction(k) ** power
    return Fraction(amount) * grow if which == "larger" else Fraction(amount) / grow


def fraction_root(x: Fraction, n: int) -> Fraction:
    def r(v):
        g = round(v ** (1 / n))
        for c in (g - 1, g, g + 1):
            if c ** n == v:
                return c
        raise AssertionError((x, n))
    return Fraction(r(x.numerator), r(x.denominator))


def length_from(what: str, a: str, b: str, side: str = None) -> Fraction:
    k = fraction_root(Fraction(b) / Fraction(a), 2 if what == "areas" else 3)
    return k if side is None else Fraction(side) * k


def side_splitter(listing: str, asked: str) -> Fraction:
    v = dict(named_lengths(listing))
    if "AD" in v and "DB" in v:
        t = v["AD"] / (v["AD"] + v["DB"])          # AD/AB, the same for AE/AC and DE/BC
    else:
        t = v["DE"] / v["BC"]
    if asked == "EC":
        return v["AE"] / t - v["AE"]
    if asked == "AE":
        return v["EC"] / (1 - t) * t
    if asked == "DE":
        return v["BC"] * t
    return v["AD"] / t - v["AD"]                  # DB


def altitude_part(listing: str, asked: str) -> Fraction:
    v = dict(named_lengths(listing))
    sq = lambda x: fraction_root(x, 2)
    rules = [
        ("AB", ("AD", "DB"), lambda d: d["AD"] + d["DB"]),
        ("DB", ("AB", "AD"), lambda d: d["AB"] - d["AD"]),
        ("AD", ("AB", "DB"), lambda d: d["AB"] - d["DB"]),
        ("CD", ("AD", "DB"), lambda d: sq(d["AD"] * d["DB"])),
        ("DB", ("CD", "AD"), lambda d: d["CD"] ** 2 / d["AD"]),
        ("AD", ("CD", "DB"), lambda d: d["CD"] ** 2 / d["DB"]),
        ("AC", ("AD", "AB"), lambda d: sq(d["AD"] * d["AB"])),
        ("AD", ("AC", "AB"), lambda d: d["AC"] ** 2 / d["AB"]),
        ("BC", ("DB", "AB"), lambda d: sq(d["DB"] * d["AB"])),
        ("DB", ("BC", "AB"), lambda d: d["BC"] ** 2 / d["AB"]),
    ]
    # A length on the way that is not a whole root (CD when only AC is asked)
    # is left out rather than guessed at; the answer must not need it.
    tried = set()
    while asked not in v:
        found = next(((k, out, fn) for k, (out, ins, fn) in enumerate(rules)
                      if k not in tried and out not in v and all(i in v for i in ins)), None)
        assert found, (listing, asked)
        k, out, fn = found
        tried.add(k)
        try:
            v[out] = fn(v)
        except AssertionError:
            continue
    return v[asked]


NUMBER = r"(\d+(?:\.\d+)?)"

BY_RULE += (
    (re.compile(r"^scale factor: ABC ~ ([A-Z]{3}); (.+); from (ABC|[A-Z]{3})$"), scale_factor),
    (re.compile(r"^similar missing: ABC ~ ([A-Z]{3}); (.+); find ([A-Z]{2})$"), similar_missing),
    # Centimeters on the paper for meters or kilometers, inches for feet or miles.
    (re.compile(rf"^scale drawing: 1 (?:cm|in) = {NUMBER} (km|m|mi|ft); {NUMBER} (?:cm|in|km|m|mi|ft) (out|back)$"),
     scale_out_back),
    (re.compile(rf"^scale drawing: (\d+) (?:cm|in) = {NUMBER} (?:km|m|mi|ft); per (?:cm|in)$"),
     lambda n, real: Fraction(real) / n),
    (re.compile(rf"^scale model: 1:(\d+); {NUMBER} (cm|in); in (m|cm|ft|in)$"), scale_model),
    (re.compile(rf"^scale area: 1 (?:cm|in) = {NUMBER} (?:m|ft); {NUMBER} (?:cm|in) by {NUMBER} (?:cm|in)$"),
     lambda per, w, h: Fraction(w) * Fraction(per) * Fraction(h) * Fraction(per)),
    (re.compile(rf"^(area|volume) scale: factor {NUMBER}; (?:area|volume) {NUMBER}; (larger|smaller)$"), area_scale),
    (re.compile(rf"^length from (areas|volumes): {NUMBER}, {NUMBER}$"), length_from),
    (re.compile(rf"^side from (areas|volumes): {NUMBER}, {NUMBER}; side {NUMBER}$"), length_from),
    (re.compile(r"^side splitter: (.+); find (EC|AE|DE|DB)$"), side_splitter),
    (re.compile(r"^altitude: (.+); find (AD|DB|CD|AC|BC)$"), altitude_part),
)

CHOICE_RULES += (
    (re.compile(r"^similar aa: (\d+, \d+; \d+, \d+)$"), similar_by_angles),
    (re.compile(rf"^similar sss: ({NUMBER}, {NUMBER}, {NUMBER}; {NUMBER}, {NUMBER}, {NUMBER})$"),
     lambda listing, *_: similar_by_sides(listing)),
    (re.compile(rf"^similar sas: {NUMBER}, {NUMBER}, angle (\d+); {NUMBER}, {NUMBER}, angle (\d+)$"), similar_by_sas),
)

# --- Units and Conversions ---------------------------------------------------
#
# Every unit is held here by its exact size under the international
# definitions (1 in = 2.54 cm, 1 lb = 0.45359237 kg, 1 gal = 231 in³), so a
# conversion within a system divides two sizes, and comparing across the
# systems compares true sizes. Where a question gives a rounded factor
# between the systems (1 mi ≈ 1.61 km), that factor is used, as the student
# is told to. Estimates are judged against a table of typical sizes kept
# here, apart from the generator's.

_IN = Fraction(254, 10000)                           # meters
_LB = Fraction(45359237, 10 ** 8)                    # kilograms
_IN3_L = _IN ** 3 * 1000                             # liters in a cubic inch
_GAL = 231 * _IN3_L
UNIT_SIZE = {
    # length, in meters
    "in": ("length", "us", _IN), "ft": ("length", "us", 12 * _IN), "yd": ("length", "us", 36 * _IN),
    "mi": ("length", "us", 63360 * _IN),
    "mm": ("length", "metric", Fraction(1, 1000)), "cm": ("length", "metric", Fraction(1, 100)),
    "m": ("length", "metric", Fraction(1)), "km": ("length", "metric", Fraction(1000)),
    # weight, in kilograms
    "oz": ("weight", "us", _LB / 16), "lb": ("weight", "us", _LB), "ton": ("weight", "us", 2000 * _LB),
    "mg": ("weight", "metric", Fraction(1, 10 ** 6)), "g": ("weight", "metric", Fraction(1, 1000)),
    "kg": ("weight", "metric", Fraction(1)),
    # capacity and volume, in liters
    "floz": ("capacity", "us", _GAL / 128), "cup": ("capacity", "us", _GAL / 16), "pt": ("capacity", "us", _GAL / 8),
    "qt": ("capacity", "us", _GAL / 4), "gal": ("capacity", "us", _GAL),
    "mL": ("capacity", "metric", Fraction(1, 1000)), "L": ("capacity", "metric", Fraction(1)),
    "cm3": ("capacity", "metric", Fraction(1, 1000)), "m3": ("capacity", "metric", Fraction(1000)),
    "in3": ("capacity", "us", _IN3_L), "ft3": ("capacity", "us", 1728 * _IN3_L), "yd3": ("capacity", "us", 46656 * _IN3_L),
    # area, in square meters
    "in2": ("area", "us", _IN ** 2), "ft2": ("area", "us", (12 * _IN) ** 2), "yd2": ("area", "us", (36 * _IN) ** 2),
    "mm2": ("area", "metric", Fraction(1, 10 ** 6)), "cm2": ("area", "metric", Fraction(1, 10 ** 4)),
    "m2": ("area", "metric", Fraction(1)),
    # time, in seconds; money, in cents
    "s": ("time", "both", Fraction(1)), "min": ("time", "both", Fraction(60)), "h": ("time", "both", Fraction(3600)),
    "day": ("time", "both", Fraction(86400)), "week": ("time", "both", Fraction(604800)),
    "cent": ("money", "both", Fraction(1)), "usd": ("money", "both", Fraction(100)),
}


def size_of(unit: str) -> Fraction:
    return UNIT_SIZE[unit][2]


def within(v, a: str, b: str) -> Fraction:
    """v of unit a in unit b, both of one system (or a unit both systems share)."""
    assert UNIT_SIZE[a][0] == UNIT_SIZE[b][0], (a, b)
    assert "both" in (UNIT_SIZE[a][1], UNIT_SIZE[b][1]) or UNIT_SIZE[a][1] == UNIT_SIZE[b][1], (a, b)
    return Fraction(v) * size_of(a) / size_of(b)


def across(v, a: str, b: str, p: str, k, q: str) -> Fraction:
    """v of a in b, crossing the systems with the factor the question gives: 1 p = k q."""
    k = Fraction(k)
    if UNIT_SIZE[a][1] == UNIT_SIZE[p][1]:
        return within(within(v, a, p) * k, q, b)
    return within(within(v, a, q) / k, p, b)


def round_at(x: Fraction, place: int) -> Fraction:
    """Half up to a place: 1 for tenths, 0 for wholes, -2 for hundreds."""
    return half_up(x, place) if place >= 0 else half_up(x / 10 ** -place, 0) * 10 ** -place


def place_of(rounded) -> int | None:
    if rounded is None:
        return None
    m = re.fullmatch(r" to (?:(\d) dp|the nearest (whole|\d+))", rounded)
    assert m, rounded
    return int(m[1]) if m[1] else 0 if m[2] == "whole" else -round(math.log10(int(m[2])))


# requiem: catalogue/content/rounded-factor-precision
def units_given(v, a, b, p, k, q, rounded) -> Fraction:
    given = across(v, a, b, p, k, q)
    place = place_of(rounded)
    if place is None:
        assert Fraction(k) * size_of(q) == size_of(p), (p, k, q)     # only an exact factor is asked exactly
        return given
    # A rounded factor is asked only to a place where the true sizes agree.
    true = Fraction(v) * size_of(a) / size_of(b)
    assert round_at(given, place) == round_at(true, place), (v, a, b, given, true, place)
    return round_at(given, place)


def to_degrees(v, a: str, b: str, rounded) -> Fraction:
    v = Fraction(v)
    out = v * Fraction(9, 5) + 32 if (a, b) == ("C", "F") else (v - 32) * Fraction(5, 9)
    return half_up(out, 1) if rounded else out


def rate_of(v, top: str, bottom: str, top2: str, bottom2: str, given) -> Fraction:
    if given:
        # 1 mi = 1.61 km, as the question gives it; the hours are unchanged.
        # The true mile must round the same way, or knowing it would be marked wrong.
        assert bottom == bottom2 == "h"
        given_ = half_up(across(v, top, top2, "mi", Fraction("1.61"), "km"), 0)
        assert given_ == half_up(Fraction(v) * size_of(top) / size_of(top2), 0), (v, top, top2)
        return given_
    return within(v, top, top2) / within(1, bottom, bottom2)


def rectangle_area(w, u, h, u2, sq: str) -> Fraction:
    assert u == u2
    return within(w, u, sq[:-1]) * within(h, u, sq[:-1])


def which_is_more(a, ua: str, b, ub: str) -> str:
    assert UNIT_SIZE[ua][0] == UNIT_SIZE[ub][0], (ua, ub)
    qa, qb = Fraction(a) * size_of(ua), Fraction(b) * size_of(ub)
    return "same" if qa == qb else "first" if qa > qb else "second"


def which_is_warmer(a, ua: str, b, ub: str) -> str:
    c = lambda v, u: Fraction(v) if u == "C" else (Fraction(v) - 32) * Fraction(5, 9)
    ca, cb = c(a, ua), c(b, ub)
    assert ca != cb
    return "first" if ca > cb else "second"


# Typical sizes, in meters, kilograms and liters, for judging an estimate.
TYPICAL = {
    "the height of a door": 2.03, "the length of a new pencil": 0.19, "the length of a car": 4.6,
    "the width of a fingernail": 0.011, "the length of a football field": 91.44, "the height of a basketball hoop": 3.05,
    "the distance run in a marathon": 42195, "the length of a paper clip": 0.032,
    "the weight of an apple": 0.18, "the weight of a car": 1400, "the weight of a paper clip": 0.001,
    "the weight of a newborn baby": 3.3, "the weight of a dictionary": 1.4, "the weight of a grain of rice": 0.000025,
    "the water in a full bathtub": 280, "the juice in a glass": 0.24, "the gas a car’s tank holds": 55,
    "the medicine in a teaspoon": 0.0049, "the milk in a large jug": 3.79,
    "the water in a bottle": 0.5, "the water in a bucket": 10,
}
# requiem: catalogue/content/benchmark-decoys-clearly-wrong
# What each really is, as a range in °C: the key must sit in it, and every
# decoy must be at least 15°C outside the whole of it.
TYPICAL_C = {
    "a cold winter night": (-30, 5), "a cool spring morning": (3, 17), "a room": (18, 25), "a hot summer day": (28, 43),
    "a swimming pool": (24, 30), "a warm bath": (36, 42), "freezing water": (0, 0), "boiling water": (100, 100),
    "a healthy person": (36, 38), "a cup of hot cocoa": (50, 80), "a fridge": (1, 5), "a freezer": (-25, -15),
    "an oven baking bread": (175, 250),
}


# requiem: catalogue/content/units-familiarity-rows
def nearest_estimate(what: str, listing: str) -> str:
    true = TYPICAL[what]
    off = {}
    for item in listing.split(", "):
        n, unit = item.split(" ")
        size = float(n) * float(size_of(unit))
        off[item] = abs(math.log10(size / true))
    ranked = sorted(off, key=off.get)
    # Only a fair question: the right choice is close, and every other one far.
    assert off[ranked[0]] < math.log10(1.7) and off[ranked[1]] > math.log10(2.5), (what, listing, off)
    return ranked[0]


def nearest_temperature(what: str, listing: str) -> str:
    lo, hi = TYPICAL_C[what]
    off = {}
    for item in listing.split(", "):
        v, unit = item.split(" ")
        c = float(v) if unit == "C" else (float(v) - 32) * 5 / 9
        off[v] = max(lo - c, c - hi, 0)
    ranked = sorted(off, key=off.get)
    assert off[ranked[0]] <= 1 and off[ranked[1]] >= 15, (what, listing, off)
    return ranked[0]


UNIT_NAME = r"([A-Za-z]+[23]?)"
AMOUNT = r"(-?\d+(?:\.\d+)?)"

BY_RULE += (
    (re.compile(rf"^units: {AMOUNT} {UNIT_NAME} to {UNIT_NAME}$"), within),
    (re.compile(rf"^units: {AMOUNT} {UNIT_NAME} \+ {AMOUNT} {UNIT_NAME} to {UNIT_NAME}$"),
     lambda v, a, w, b, c: within(v, a, c) + within(w, b, c)),
    (re.compile(rf"^units: {AMOUNT} {UNIT_NAME} to {UNIT_NAME} given 1 {UNIT_NAME} = {AMOUNT} {UNIT_NAME}"
                rf"( to \d dp| to the nearest (?:whole|10|100|1000|10000))?$"), units_given),
    (re.compile(rf"^temperature: {AMOUNT} ([CF]) to ([CF])( to 1 dp)?$"), to_degrees),
    (re.compile(rf"^rate: {AMOUNT} {UNIT_NAME}/{UNIT_NAME} to {UNIT_NAME}/{UNIT_NAME}"
                rf"( given 1 mi = 1\.61 km to the nearest whole)?$"), rate_of),
    (re.compile(rf"^area: {AMOUNT} {UNIT_NAME} by {AMOUNT} {UNIT_NAME} to {UNIT_NAME}$"), rectangle_area),
)

CHOICE_RULES += (
    (re.compile(rf"^which is more: {AMOUNT} {UNIT_NAME} or {AMOUNT} {UNIT_NAME}$"), which_is_more),
    (re.compile(rf"^which is warmer: {AMOUNT} ([CF]) or {AMOUNT} ([CF])$"), which_is_warmer),
    (re.compile(r"^benchmark: ([^;]+); (.+)$"), nearest_estimate),
    (re.compile(r"^benchmark temperature: ([^;]+); (.+)$"), nearest_temperature),
)

# --- Quadrilaterals ----------------------------------------------------------
#
# Each shape's properties are written here as relations between its parts:
# opposite sides and angles equal, neighboring angles adding to 180°, the
# halves of a diagonal, a midsegment the average of the bases. The answer is
# solved again from those, never read from the question. The diagonal-angle
# questions are worked by building the shape itself and measuring it, and
# the coordinate questions by exact slopes and squared lengths.

def quad_expr(s: str) -> tuple:
    """A part's value: a number, or a·x + b."""
    s = s.strip()
    if re.fullmatch(r"-?\d+", s):
        return Fraction(0), Fraction(int(s))
    return lin_x(s)


def quad_parts(listing: str) -> dict:
    out = {}
    for item in listing.split(", "):
        m = re.fullmatch(r"(angle [A-E]{1,3}|[A-Z]{2}) (.+)", item)
        assert m, item
        out[m[1]] = quad_expr(m[2])
    return out


def quad_relation(vals: dict, terms: list, total, target: str) -> Fraction:
    """
    Solve Σ c·part = total, where each part is known (a number or a·x + b)
    or is the target itself, then give the target: x, or a part's value.
    """
    total = Fraction(total)
    missing = [c for name, c in terms if name not in vals]
    if missing:
        assert len(missing) == 1 and target not in vals and target != "x", (terms, target)
        known = sum(c * vals[n][1] for n, c in terms if n in vals)
        assert all(vals[n][0] == 0 for n, _ in terms if n in vals)
        return (total - known) / missing[0]
    a = sum(c * vals[n][0] for n, c in terms)
    b = sum(c * vals[n][1] for n, c in terms)
    assert a != 0, (terms, vals)
    x = (total - b) / a
    if target == "x":
        return x
    return vals[target][0] * x + vals[target][1]


QUAD_OPPOSITE = {"AB": "CD", "CD": "AB", "BC": "DA", "DA": "BC",
                 "angle A": "angle C", "angle C": "angle A", "angle B": "angle D", "angle D": "angle B"}


def parallelogram_part(listing: str, target: str) -> Fraction:
    vals = quad_parts(listing)
    # Opposite parts are equal; neighboring angles add to 180°.
    relations = []
    names = list(vals)
    for i, p in enumerate(names):
        for q in names[i + 1:]:
            if QUAD_OPPOSITE[p] == q:
                relations.append(([(p, 1), (q, -1)], 0))
            elif p.startswith("angle") and q.startswith("angle"):
                relations.append(([(p, 1), (q, 1)], 180))
    with_x = [r for r in relations if sum(c * vals[n][0] for n, c in r[0]) != 0]
    x = quad_relation(vals, *with_x[0], "x") if with_x else None
    for terms, total in with_x[1:]:
        assert quad_relation(vals, terms, total, "x") == x
    if target == "x":
        return x
    value = lambda n: vals[n][0] * (x or 0) + vals[n][1]
    if target in vals:
        return value(target)
    if QUAD_OPPOSITE[target] in vals:
        return value(QUAD_OPPOSITE[target])
    assert target.startswith("angle")
    beside = next(n for n in vals if n.startswith("angle"))
    return 180 - value(beside)


QUAD_HALF = {"AE": ("AC", 1), "EC": ("AC", 1), "BE": ("BD", 1), "ED": ("BD", 1), "AC": ("AC", 2), "BD": ("BD", 2)}


def diagonal_part(shape: str, listing: str, target: str) -> Fraction:
    vals = quad_parts(listing)
    if len(vals) == 1:
        (name, e), = vals.items()
        assert shape == "rhombus" and re.fullmatch(r"angle [A-D]E[A-D]", name), (shape, name)
        return quad_relation(vals, [(name, 1)], 90, target)          # the diagonals cross at right angles
    (n1, _), (n2, _) = vals.items()
    (d1, m1), (d2, m2) = QUAD_HALF[n1], QUAD_HALF[n2]
    # Halves of one diagonal are equal (they bisect each other); in a
    # rectangle the two diagonals are equal too.
    assert d1 == d2 or shape == "rectangle", (shape, n1, n2)
    x = quad_relation(vals, [(n1, m2), (n2, -m1)], 0, "x")
    if target == "x":
        return x
    half = (vals[n1][0] * x + vals[n1][1]) / m1
    dt, mt = QUAD_HALF[target]
    assert dt == d1 or shape == "rectangle"
    return half * mt


def quad_built(shape: str, t: float) -> dict:
    if shape == "rectangle":                 # t is the height of a rectangle 1 wide
        P = {"A": (0, 0), "B": (1, 0), "C": (1, t), "D": (0, t)}
    else:                                    # t is the angle at A of a rhombus of side 1
        c, s = math.cos(math.radians(t)), math.sin(math.radians(t))
        P = {"A": (0, 0), "B": (1, 0), "C": (1 + c, s), "D": (c, s)}
    P["E"] = ((P["A"][0] + P["C"][0]) / 2, (P["A"][1] + P["C"][1]) / 2)
    return P


def quad_angle(P: dict, name: str) -> float:
    (ux, uy), (vx, vy), (wx, wy) = P[name[0]], P[name[1]], P[name[2]]
    a = math.atan2(uy - vy, ux - vx) - math.atan2(wy - vy, wx - vx)
    return abs(math.degrees((a + math.pi) % (2 * math.pi) - math.pi))


def diagonal_angle(shape: str, given: str, value: int, asked: str) -> Fraction:
    """Build every rectangle or rhombus with the given angle, and measure the asked one in each."""
    grid = ([math.tan(math.radians(d / 10)) for d in range(5, 900)] if shape == "rectangle"
            else [d / 10 for d in range(5, 1800)])
    f = lambda t: quad_angle(quad_built(shape, t), given) - value
    found = []
    for lo, hi in zip(grid, grid[1:]):
        if f(lo) == 0 or f(lo) * f(hi) < 0:
            for _ in range(60):
                m = (lo + hi) / 2
                lo, hi = (lo, m) if f(lo) * f(m) <= 0 else (m, hi)
            found.append(quad_angle(quad_built(shape, lo), asked))
    assert found, (shape, given, value)
    assert all(abs(a - found[0]) < 1e-6 for a in found), found
    assert abs(found[0] - round(found[0])) < 1e-6, found
    return Fraction(round(found[0]))


# requiem: catalogue/content/quadrilateral-names-both-readings
# The most specific name the facts prove, by the theorems that prove it.
def special_name(name: str, listing: str) -> str:
    facts = set(listing.split(", "))
    parallelogram = bool(facts & {"opp-par", "opp-eq", "diag-bis", "pair-eq-par", "opp-ang", "all-right", "all-eq"})
    # A parallel pair makes neighboring angles co-interior, so one equal pair of
    # opposite angles brings the other pair with it.
    parallelogram |= {"pair-par", "pair-opp-ang"} <= facts
    rectangle = "all-right" in facts or (parallelogram and bool(facts & {"right", "diag-eq"}))
    rhombus = "all-eq" in facts or (parallelogram and bool(facts & {"adj-eq", "diag-perp", "diag-bis-ang"}))
    if rectangle and rhombus:
        return "square"
    if rectangle:
        return "rectangle"
    if rhombus:
        return "rhombus"
    if parallelogram:
        return "parallelogram"
    if "one-par" in facts:
        return "trapezoid"
    # A diagonal bisected at right angles by the other has it as its perpendicular
    # bisector: two pairs of equal neighboring sides.
    if "kite-sides" in facts or {"one-diag-bis", "diag-perp"} <= facts:
        return "kite"
    return "none"


def trapezoid_mid(listing: str, target: str) -> Fraction:
    vals = quad_parts(listing)
    return quad_relation(vals, [("MN", 2), ("AB", -1), ("DC", -1)], 0, target)


def iso_trapezoid(listing: str, target: str) -> Fraction:
    vals = quad_parts(listing)
    same_base = lambda p, q: {p[-1], q[-1]} in ({"A", "B"}, {"C", "D"})
    names = list(vals)
    if len(names) == 2:
        p, q = names
        terms, total = ([(p, 1), (q, -1)], 0) if same_base(p, q) else ([(p, 1), (q, 1)], 180)
        return quad_relation(vals, terms, total, target)
    (p,) = names
    v = vals[p][1]
    return v if same_base(p, target) else 180 - v


def kite_part(listing: str, target: str) -> Fraction:
    vals = quad_parts(listing)
    if "angle B" in vals and "angle D" in vals:
        return quad_relation(vals, [("angle B", 1), ("angle D", -1)], 0, target)
    # B and D, between the unequal sides, are equal; all four add to 360°.
    v = {n[-1]: vals[n][1] for n in vals}
    if "B" in v or "D" in v:
        v["B"] = v["D"] = v.get("B", v.get("D"))
    if target[-1] in "BD":
        return (360 - v["A"] - v["C"]) / 2
    return 360 - sum(v[k] for k in "ABD") if target[-1] == "C" else 360 - sum(v[k] for k in "BCD")


def triangle_midsegment(d_side: str, e_side: str, listing: str, target: str) -> Fraction:
    shared = set(d_side) & set(e_side)
    assert len(shared) == 1
    third = "".join(sorted((set(d_side) | set(e_side)) - shared))
    vals = quad_parts(listing)
    if any(n.startswith("angle") for n in vals):
        assert (d_side, e_side) == ("AB", "AC")
        b = vals["angle ABC"][1]
        return {"angle ADE": b, "angle BDE": 180 - b}[target]
    return quad_relation(vals, [(third, 1), ("DE", -2)], 0, target)


def quad_points(listing: str) -> list:
    return [(int(x), int(y)) for x, y in re.findall(r"\((-?\d+), (-?\d+)\)", listing)]


def quadrilateral_kind(listing: str) -> str:
    P = quad_points(listing)
    assert len(P) == 4
    side = [(P[(i + 1) % 4][0] - P[i][0], P[(i + 1) % 4][1] - P[i][1]) for i in range(4)]
    sq = [dx * dx + dy * dy for dx, dy in side]
    parallel = lambda u, v: u[0] * v[1] == u[1] * v[0]
    turns = [side[i][0] * side[(i + 1) % 4][1] - side[i][1] * side[(i + 1) % 4][0] for i in range(4)]
    assert all(t > 0 for t in turns) or all(t < 0 for t in turns), "not a convex quadrilateral in order"
    right = [side[i][0] * side[(i + 1) % 4][0] + side[i][1] * side[(i + 1) % 4][1] == 0 for i in range(4)]
    pairs = parallel(side[0], side[2]) + parallel(side[1], side[3])
    if pairs == 2:
        if all(right) and len(set(sq)) == 1:
            return "square"
        if all(right):
            return "rectangle"
        if len(set(sq)) == 1:
            return "rhombus"
        return "parallelogram"
    if pairs == 1:
        return "trapezoid"
    if (sq[0] == sq[1] and sq[2] == sq[3]) or (sq[1] == sq[2] and sq[3] == sq[0]):
        return "kite"
    return "none"


QUAD_PART = r"(x|[A-Z]{2}|angle [A-E]{1,3})"
BY_RULE += (
    (re.compile(rf"^parallelogram: ((?:(?:angle )?[A-D]{{1,2}} [^,;]+)(?:, (?:angle )?[A-D]{{1,2}} [^,;]+)*); find {QUAD_PART}$"),
     parallelogram_part),
    (re.compile(rf"^diagonals: (parallelogram|rectangle|rhombus) ABCD, E; (.+); find {QUAD_PART}$"), diagonal_part),
    (re.compile(r"^diagonal angles: (rectangle|rhombus) ABCD, E; angle ([A-E]{3}) (\d+); find angle ([A-E]{3})$"), diagonal_angle),
    (re.compile(rf"^trapezoid midsegment: (.+); find {QUAD_PART}$"), trapezoid_mid),
    (re.compile(rf"^isosceles trapezoid: AB par DC, AD = BC; (.+); find {QUAD_PART}$"), iso_trapezoid),
    (re.compile(rf"^kite: AB = AD, CB = CD; (.+); find {QUAD_PART}$"), kite_part),
    (re.compile(rf"^triangle midsegment: D mid ([A-C]{{2}}), E mid ([A-C]{{2}}); (.+); find {QUAD_PART}$"), triangle_midsegment),
    (re.compile(r"^midpoint triangle: AB (\d+), BC (\d+), CA (\d+); find perimeter$"), lambda a, b, c: Fraction(a + b + c, 2)),
)

CHOICE_RULES += (
    (re.compile(r"^special quadrilateral ([A-Z]{4}): ([a-z, -]+)$"), special_name),
    (re.compile(r"^classify quadrilateral: (.+)$"), quadrilateral_kind),
)

# --- Circles -----------------------------------------------------------------
#
# Arcs and sectors are the angle's share of 360° of the circumference 2πr
# or the area πr², kept as a multiple of π or taken with π as 3.14. The
# angle rules are the inscribed angle theorem and its consequences; the
# tangent rules are the right angle at the radius and equal tangents; the
# plane rules read h, k and r² from (x − h)² + (y − k)² = r², completing the
# square first when the equation comes expanded.

def circle_parts(listing: str) -> dict:
    out = {}
    for item in listing.split(", "):
        m = re.fullmatch(r"(angle [A-Z]{1,3}|[A-Z]{2,3}) (.+)", item)
        assert m, item
        out[m[1]] = quad_expr(m[2])
    return out


def circle_part(kind: str, key: str, size: str, angle: int, how: str) -> Fraction:
    r = Fraction(size) / (2 if key == "d" else 1)
    whole = 2 * r if kind == "arc" else r * r            # times π
    share = Fraction(angle, 360) * whole
    return share if how == "(pi)" else half_up(share * Fraction(314, 100), 1)


def circle_angle_back(kind: str, r: int, coeff: str) -> Fraction:
    whole = 2 * r if kind == "arc" else r * r
    return Fraction(coeff) / whole * 360


def circle_radius_back(kind: str, angle: int, coeff: str) -> Fraction:
    whole = Fraction(coeff) * 360 / angle                 # 2r for an arc, r² for a sector
    return whole / 2 if kind == "arc" else fraction_root(Fraction(whole), 2)


def inscribed_angle(listing: str, target: str) -> Fraction:
    vals = circle_parts(listing.replace("arc AB", "AOB"))
    # Central = 2 × inscribed on the same arc, from the major-arc side.
    return quad_relation(vals, [("AOB", 1), ("ACB", -2)], 0, target)


CIRCLE_PART = r"(x|angle [A-Z]{1,3}|[A-Z]{2,3})"

BY_RULE += (
    (re.compile(r"^(arc|sector): (r|d) (\d+), angle (\d+) (\(pi\)|\(3\.14\) to 1 dp)$"), circle_part),
    (re.compile(r"^(arc|sector) angle: r (\d+), (?:length|area) ([\d.]+) pi$"), circle_angle_back),
    (re.compile(r"^(arc|sector) radius: angle (\d+), (?:length|area) ([\d.]+) pi$"), circle_radius_back),
    (re.compile(rf"^inscribed: (.+); find {CIRCLE_PART}$"), inscribed_angle),
    # From the minor-arc side the angle stands on the major arc, 360° less the central angle.
    (re.compile(r"^inscribed minor: central AOB (\d+); find ADB$"), lambda c: Fraction(360 - c, 2)),
    # Back the other way: twice the angle at D is the major arc, and AOB the rest of 360°.
    (re.compile(r"^inscribed minor: ADB (\d+); find AOB$"), lambda d: Fraction(360 - 2 * d)),
    # C and D on opposite arcs stand on arcs that make the whole circle: their angles add to 180°.
    (re.compile(r"^inscribed opposite: ACB (\d+); find ADB$"), lambda c: Fraction(180 - c)),
    # An arc measures its central angle, twice the inscribed angle on it.
    (re.compile(r"^inscribed: ACB (\d+); find arc AB$"), lambda c: Fraction(2 * c)),
    (re.compile(rf"^semicircle: AB diameter; (.+); find {CIRCLE_PART}$"),
     lambda listing, target: quad_relation(circle_parts(listing), [("angle ACB", 1)], 90, target) if "ACB" in listing
     else 90 - circle_parts(listing)[next(iter(circle_parts(listing)))][1]),
    # Two neighboring corners given: the asked one is 180° less the given corner opposite it.
    (re.compile(r"^cyclic quadrilateral pair: angle ([A-D]) (\d+), angle ([A-D]) (\d+); find angle ([A-D])$"),
     lambda p, a, q, b, t: Fraction(180 - {p: a, q: b}["ABCD"[("ABCD".index(t) + 2) % 4]])),
    (re.compile(rf"^cyclic quadrilateral: (.+); find {CIRCLE_PART}$"),
     lambda listing, target: (lambda v: quad_relation(v, [(n, 1) for n in v], 180, target) if len(v) == 2
                              else 180 - next(iter(v.values()))[1])(circle_parts(listing))),
    # Each inscribed angle on arc AB is half of it.
    (re.compile(r"^same arc: angle ACB (\d+); find arc AB$"), lambda c: Fraction(2 * c)),
    (re.compile(r"^same arc: arc AB (\d+); find angle (?:ACB|ADB)$"), lambda c: Fraction(c, 2)),
    (re.compile(rf"^same arc: (.+); find {CIRCLE_PART}$"),
     lambda listing, target: quad_relation(circle_parts(listing), [("angle ACB", 1), ("angle ADB", -1)], 0, target)),
    (re.compile(rf"^tangent: (.+); find {CIRCLE_PART}$"), lambda listing, target: tangent_side(circle_parts(listing), target)),
    # The tangent's right angle at T leaves 90° for the other two angles of △OTP.
    (re.compile(r"^tangent angle: angle (TOP|TPO) (\d+); find angle (TOP|TPO)$"), lambda g, v, t: Fraction(90 - v)),
    (re.compile(rf"^two tangents: (.+); find {CIRCLE_PART}$"), lambda listing, target: two_tangents(circle_parts(listing), target)),
    (re.compile(r"^circle radius: (.+) = (\d+)$"), lambda left, rr: fraction_root(Fraction(Fraction(rr)), 2)),
    (re.compile(rf"^circle through: center ({GRID_POINT}), point ({GRID_POINT}); find r\^2$"),
     lambda c, cx, cy, p, px, py: Fraction((int(px) - int(cx)) ** 2 + (int(py) - int(cy)) ** 2)),
    (re.compile(r"^circle general: (.+) = 0; find radius$"), lambda eq: circle_from_general(eq)[1]),
)


def tangent_side(vals: dict, target: str) -> Fraction:
    # The radius meets the tangent at a right angle: OT² + PT² = OP².
    v = {n: vals[n][1] for n in vals}
    if target == "OP":
        return fraction_root(Fraction(v["OT"] ** 2 + v["PT"] ** 2), 2)
    other = "PT" if target == "OT" else "OT"
    return fraction_root(Fraction(v["OP"] ** 2 - v[other] ** 2), 2)


def two_tangents(vals: dict, target: str) -> Fraction:
    if "PA" in vals:
        return quad_relation(vals, [("PA", 1), ("PB", -1)], 0, target)   # tangents from one point are equal
    # Two right angles at A and B: the other two angles of OAPB add to 180°.
    (name, (_, v)), = vals.items()
    return 180 - v


def circle_center_of(eq: str) -> tuple:
    m = re.fullmatch(r"(x\^2|\(x ([+-]) (\d+)\)\^2) \+ (y\^2|\(y ([+-]) (\d+)\)\^2)", eq)
    assert m, eq
    h = 0 if m[2] is None else (-int(m[3]) if m[2] == "+" else int(m[3]))
    k = 0 if m[5] is None else (-int(m[6]) if m[5] == "+" else int(m[6]))
    return Fraction(h), Fraction(k)


def circle_from_general(eq: str) -> tuple:
    """a·x² + a·y² + D·x + E·y + F = 0, read term by term, then the square completed."""
    terms = re.findall(r"([+-]?)\s*(\d*)(x\^2|y\^2|x|y|)", eq.replace(" ", " "))
    coef = {"x^2": 0, "y^2": 0, "x": 0, "y": 0, "": 0}
    for sign, n, var in terms:
        if not n and not var:
            continue
        c = int(n) if n else 1
        coef[var] += -c if sign == "-" else c
    a = coef["x^2"]
    assert a == coef["y^2"] and a != 0, eq
    D, E, F = (Fraction(coef[v], a) for v in ("x", "y", ""))
    h, k = -D / 2, -E / 2
    return (h, k), fraction_root(Fraction(h * h + k * k - F), 2)


PAIR_RULES += (
    (re.compile(r"^circle center: (.+) = \d+$"), circle_center_of),
    (re.compile(r"^circle general: (.+) = 0; find center$"), lambda eq: circle_from_general(eq)[0]),
)


def circle_point(eq: str, rr: str, px: str, py: str) -> str:
    h, k = circle_center_of(eq)
    d2 = (int(px) - h) ** 2 + (int(py) - k) ** 2
    return "on" if d2 == int(rr) else "inside" if d2 < int(rr) else "outside"


CHOICE_RULES += (
    (re.compile(r"^circle point: (.+) = (\d+); point \((-?\d+), (-?\d+)\)$"), circle_point),
)

# --- Logical reasoning -------------------------------------------------------
#
# A statement p -> q is a pair of literals; the converse, inverse and
# contrapositive are built from it here. Truth is tested over every case of
# the domain with definitions kept here: whole numbers 1 to 200, and the
# kinds of quadrilateral and triangle described by their measurable facts
# (equal sides, right angles, parallel sides, diagonals), from which each
# named property follows.

def logic_number(atom: str, n: int) -> bool:
    if atom.startswith("div"):
        return n % int(atom[3:]) == 0
    if atom in ("ends0", "ends5"):
        return n % 10 == int(atom[4:])
    digits = [int(c) for c in str(n)]
    return {
        "even": n % 2 == 0, "odd": n % 2 == 1,
        "prime": n > 1 and all(n % k for k in range(2, int(n ** 0.5) + 1)),
        "square": int(n ** 0.5) ** 2 == n,
        # The same tests stated another way, read from the digits or the factors.
        "evenend": digits[-1] in (0, 2, 4, 6, 8), "oddend": digits[-1] in (1, 3, 5, 7, 9),
        "ends05": digits[-1] in (0, 5),
        "digits3": sum(digits) % 3 == 0, "digits9": sum(digits) % 9 == 0,
        "by2and3": n % 2 == 0 and n % 3 == 0, "by3and4": n % 3 == 0 and n % 4 == 0,
        "twofactors": sum(1 for k in range(1, n + 1) if n % k == 0) == 2,
        "by2and5": n % 2 == 0 and n % 5 == 0,
    }[atom]


# Each quadrilateral by its facts: (all four sides equal, four right angles,
# pairs of parallel sides, diagonals perpendicular, diagonals equal).
LOGIC_QUADS = {
    "square": (True, True, 2, True, True), "rectangle": (False, True, 2, False, True),
    "rhombus": (True, False, 2, True, False), "parallelogram": (False, False, 2, False, False),
    "isotrap": (False, False, 1, False, True), "kite": (False, False, 0, True, False),
}


def logic_quad(atom: str, kind: str) -> bool:
    eq4, right4, pairs, perp, diageq = LOGIC_QUADS[kind]
    return {
        "eq4": eq4, "right4": right4, "perp": perp, "diageq": diageq,
        "para": pairs == 2, "oppang": pairs == 2,          # opposite angles equal exactly in a parallelogram
        "par1": pairs >= 1, "rect": right4, "rhom": eq4, "sq": eq4 and right4,
        "par2": pairs == 2, "bisect": pairs == 2,          # diagonals bisect each other exactly in a parallelogram
        "rhomright": eq4 and right4, "rectperp": right4 and perp, "paradiag": pairs == 2 and diageq,
    }[atom]


# Each triangle by how many sides are equal (1 = none) and its largest angle.
LOGIC_TRIS = {
    "equilateral": (3, "acute"), "isosceles-acute": (2, "acute"), "isosceles-obtuse": (2, "obtuse"),
    "right-isosceles": (2, "right"), "right-scalene": (1, "right"), "acute-scalene": (1, "acute"), "obtuse-scalene": (1, "obtuse"),
}


def logic_tri(atom: str, kind: str) -> bool:
    equal, largest = LOGIC_TRIS[kind]
    return {
        "equi": equal == 3, "iso": equal >= 2, "ang3": equal == 3, "ang2": equal >= 2,   # equal sides face equal angles
        "acute": largest == "acute", "right": largest == "right", "obtuse": largest == "obtuse",
        "comp": largest == "right", "ang60": equal == 3,                         # the other two make 90 degrees exactly when the third does
    }[atom]


LOGIC_DOMAINS = {
    "numbers": (range(1, 201), logic_number),
    "quadrilaterals": (list(LOGIC_QUADS), logic_quad),
    "triangles": (list(LOGIC_TRIS), logic_tri),
}


def logic_lit(s: str) -> tuple:
    s = s.strip()
    return (s[4:], True) if s.startswith("not ") else (s, False)


def logic_cond(s: str) -> tuple:
    a, b = s.split(" -> ")
    return logic_lit(a), logic_lit(b)


def logic_form(form: str, cond: tuple) -> tuple:
    (p, pn), (q, qn) = cond
    return {
        "original": ((p, pn), (q, qn)),
        "converse": ((q, qn), (p, pn)),
        "inverse": ((p, not pn), (q, not qn)),
        "contrapositive": ((q, not qn), (p, not pn)),
    }[form]


def logic_holds(domain: str, cond: tuple) -> bool:
    cases, test = LOGIC_DOMAINS[domain]
    val = lambda lit, c: test(lit[0], c) != lit[1]
    return all(val(cond[1], c) for c in cases if val(cond[0], c))


def logic_options(listing: str) -> dict:
    return dict(item.split("=", 1) for item in listing.split(", "))


def logic_part(part: str, form: str, domain: str, cond: str, listing: str) -> str:
    # However it is worded, p is the hypothesis and q the conclusion.
    p, q = logic_cond(cond)
    want = p if part == "hypothesis" else q
    return next(k for k, v in logic_options(listing).items() if logic_lit(v) == want)


def logic_pick(form: str, domain: str, cond: str, listing: str) -> str:
    want = logic_form(form, logic_cond(cond))
    found = [k for k, v in logic_options(listing).items() if logic_cond(v) == want]
    assert len(found) == 1, (form, cond, listing)
    return found[0]


def logic_same_truth(of: str, domain: str, cond: str, listing: str) -> str:
    # A statement agrees with its contrapositive; the converse with its own contrapositive, the inverse.
    shown = logic_form(of, logic_cond(cond))
    want = logic_form("contrapositive", shown)
    found = [k for k, v in logic_options(listing).items() if logic_cond(v) == want]
    assert len(found) == 1
    return found[0]


def logic_follows(known: str, truth: str, asked: str) -> str:
    tied = {frozenset({"original", "contrapositive"}), frozenset({"converse", "inverse"})}
    return truth if frozenset({known, asked}) in tied else "unknown"


def logic_follows_said(known: str, truth: str, asked: str) -> str:
    # Two sentences share their truth exactly when one is the other's contrapositive.
    k, a = logic_cond(known), logic_cond(asked)
    assert a in [logic_form(f, k) for f in ("converse", "inverse", "contrapositive")], (known, asked)
    return truth if logic_form("contrapositive", k) == a else "unknown"


def logic_counterexample(domain: str, cond: str, listing: str) -> str:
    cases, test = LOGIC_DOMAINS[domain]
    (p, pn), (q, qn) = logic_cond(cond)
    as_case = (lambda s: int(s)) if domain == "numbers" else (lambda s: s)
    found = [k for k, v in logic_options(listing).items() if test(p, as_case(v)) != pn and test(q, as_case(v)) == qn]
    assert len(found) == 1, (cond, listing)
    return found[0]


CHOICE_RULES += (
    (re.compile(r"^(hypothesis|conclusion) of (if-then|q-if-p|p-only-if-q): (\w+) (.+ -> .+); options (.+)$"), logic_part),
    (re.compile(r"^truth of (converse|inverse|contrapositive): (\w+) (.+ -> .+)$"),
     lambda form, domain, cond: "true" if logic_holds(domain, logic_form(form, logic_cond(cond))) else "false"),
    (re.compile(r"^(converse|inverse|contrapositive) of: (\w+) (.+ -> [^;]+); options (.+)$"), logic_pick),
    (re.compile(r"^same truth as (original|converse): (\w+) (.+ -> [^;]+); options (.+)$"), logic_same_truth),
    (re.compile(r"^truth follows: (original|converse|inverse|contrapositive) (true|false); find (original|converse|inverse|contrapositive)$"), logic_follows),
    (re.compile(r"^truth follows: life (.+ -> .+) is (true|false); find (.+ -> .+)$"), logic_follows_said),
    (re.compile(r"^counterexample: (\w+) (.+ -> [^;]+); options (.+)$"), logic_counterexample),
    (re.compile(r"^biconditional: (\w+) (.+ -> .+)$"),
     lambda domain, cond: "yes" if all(logic_holds(domain, logic_form(f, logic_cond(cond))) for f in ("original", "converse")) else "no"),
)

# --- Two-variable data ------------------------------------------------------
#
# Worked from the data and the line as the question gives them: r from the
# points by its definition, predictions and residuals from y = mx + b, and
# every two-way question from the four counts, its totals added here. The
# bands for describing r are strong from 0.7, moderate 0.4 to 0.7, weak 0.1
# to 0.4 and none below 0.1, and a value within 0.05 of an edge is reported
# rather than judged.

BIV_NUM = r"-?\d+(?:\.\d+)?"
BIV_LINE = rf"y = ({BIV_NUM})x \+ ({BIV_NUM})"
BIV_PT = rf"\(({BIV_NUM}), ({BIV_NUM})\)"


def biv_points(listing: str) -> list:
    return [(Fraction(a), Fraction(b)) for a, b in re.findall(BIV_PT, listing)]


def biv_r(pts: list) -> float:
    n = len(pts)
    mx = sum(p[0] for p in pts) / n
    my = sum(p[1] for p in pts) / n
    sxy = sum((x - mx) * (y - my) for x, y in pts)
    sxx = sum((x - mx) ** 2 for x, _ in pts)
    syy = sum((y - my) ** 2 for _, y in pts)
    return float(sxy) / math.sqrt(float(sxx) * float(syy))


def biv_direction(listing: str) -> str:
    r = biv_r(biv_points(listing))
    if r >= 0.6:
        return "positive"
    if r <= -0.6:
        return "negative"
    assert abs(r) <= 0.3, f"r = {r:.2f} is neither clear nor absent"
    return "none"


def biv_options(listing: str) -> dict:
    return dict(item.split("=", 1) for item in listing.split(", "))


def biv_band(r: str) -> str:
    v = abs(Fraction(r))
    edges = (Fraction(1, 10), Fraction(4, 10), Fraction(7, 10))
    assert all(abs(v - e) > Fraction(5, 100) for e in edges), f"r = {r} is too near the edge of a band"
    if v < edges[0]:
        return "none"
    side = "positive" if Fraction(r) > 0 else "negative"
    return f"{'weak' if v < edges[1] else 'moderate' if v < edges[2] else 'strong'}-{side}"


def biv_meaning(v: str, m: str, b: str, listing: str) -> str:
    v, m, b = Fraction(v), Fraction(m), Fraction(b)
    assert (v == m) != (v == b)
    meaning = "start" if v == b else "rate-up" if m > 0 else "rate-down"
    return next(k for k, w in biv_options(listing).items() if w == meaning)


def biv_closest(listing: str, options: str) -> str:
    r = biv_r(biv_points(listing))
    gaps = sorted((abs(float(Fraction(v)) - r), k) for k, v in biv_options(options).items())
    assert gaps[1][0] - gaps[0][0] > 0.2, (r, gaps)
    return gaps[0][1]


def biv_cause(design: str, r: str, listing: str) -> str:
    # Random assignment is what shows a cause; without it, only an association.
    v = abs(Fraction(r))
    if v <= Fraction(1, 10):
        want = "none"
    else:
        assert v >= Fraction(1, 2)
        want = "cause" if design == "experiment" else "associated"
    return next(k for k, w in biv_options(listing).items() if w == want)


def biv_table(counts: str) -> tuple:
    a, b, d, e = (int(v) for v in re.findall(r"\d+", counts))
    return ((a, b, a + b), (d, e, d + e), (a + d, b + e, a + b + d + e))


def biv_missing(grid: str) -> int:
    cells = [row.split() for row in grid.split(" / ")]
    (i, j), = [(i, j) for i in range(3) for j in range(3) if cells[i][j] == "?"]
    v = lambda r, c: int(cells[r][c])
    # A total is the sum of its line; an inside cell is its row total less the other.
    if j == 2:
        return v(i, 0) + v(i, 1)
    if i == 2:
        return v(0, j) + v(1, j)
    return v(i, 2) - v(i, 1 - j)


def biv_percent(kind: str, counts: str, rounded) -> Fraction:
    t = biv_table(counts)
    if kind.startswith("cell"):
        i, j = (int(x) - 1 for x in re.findall(r"\d", kind))
        part, whole = t[i][j], t[2][2]
    elif kind.endswith("of all"):
        k = int(re.findall(r"\d", kind)[0]) - 1
        part, whole = (t[k][2] if kind.startswith("row") else t[2][k]), t[2][2]
    elif " within row " in kind:
        j, i = (int(x) - 1 for x in re.findall(r"\d", kind))
        part, whole = t[i][j], t[i][2]
    else:
        i, j = (int(x) - 1 for x in re.findall(r"\d", kind))
        part, whole = t[i][j], t[2][j]
    exact = Fraction(100 * part, whole)
    if rounded:
        assert (exact * 10).denominator != 1
        return half_up(exact, 1)
    assert (exact * 10).denominator == 1
    return exact


def biv_relative(by: str, grid: str) -> Fraction:
    cells = [row.split() for row in grid.split(" / ")]
    (i, j), = [(i, j) for i in range(2) for j in range(2) if cells[i][j] == "?"]
    # Each row (or column) of a relative frequency table adds to 100%.
    other = cells[i][1 - j] if by == "row" else cells[1 - i][j]
    return 100 - Fraction(other)


def biv_relative_linked(by: str, grid: str) -> str:
    (a, b), (d, e) = ([Fraction(v) for v in row.split()] for row in grid.split(" / "))
    assert (a + b == d + e == 100) if by == "row" else (a + d == b + e == 100)
    gap = abs(a - d) if by == "row" else abs(a - b)
    if gap >= 10:
        return "yes"
    assert gap <= 5
    return "no"


def biv_fit_error(pts: list, degree: int) -> Fraction:
    # Squared error of the least-squares polynomial (degree 1 or 2), solved
    # exactly by Cramer's rule on the normal equations.
    k = degree + 1
    s = [sum(x ** p for x, _ in pts) for p in range(2 * k - 1)]
    t = [sum(y * x ** p for x, y in pts) for p in range(k)]
    m = [[s[i + j] for j in range(k)] for i in range(k)]

    def det(a):
        if len(a) == 1:
            return a[0][0]
        return sum((-1) ** c * a[0][c] * det([row[:c] + row[c + 1:] for row in a[1:]]) for c in range(len(a)))

    d = det(m)
    coef = [det([row[:c] + [t[i]] + row[c + 1:] for i, row in enumerate(m)]) / d for c in range(k)]
    return sum((y - sum(c * x ** p for p, c in enumerate(coef))) ** 2 for x, y in pts)


def biv_fit_at(pts: list, x0) -> Fraction:
    # The least-squares quadratic through pts, evaluated at x0.
    s = [sum(x ** p for x, _ in pts) for p in range(5)]
    t = [sum(y * x ** p for x, y in pts) for p in range(3)]
    m = [[s[i + j] for j in range(3)] for i in range(3)]

    def det3(a):
        return (a[0][0] * (a[1][1] * a[2][2] - a[1][2] * a[2][1]) - a[0][1] * (a[1][0] * a[2][2] - a[1][2] * a[2][0])
                + a[0][2] * (a[1][0] * a[2][1] - a[1][1] * a[2][0]))

    d = det3(m)
    coef = [det3([row[:c] + [t[i]] + row[c + 1:] for i, row in enumerate(m)]) / d for c in range(3)]
    return coef[0] + coef[1] * x0 + coef[2] * x0 * x0


def biv_feature(listing: str) -> str:
    # requiem: catalogue/content/scatter-features-from-points
    # Read from the points alone: a wide empty band in x splits two clusters;
    # one point far from the quadratic through all the others is an outlier;
    # a quadratic far closer than a line is a curve; else one straight line.
    pts = biv_points(listing)
    xs = sorted(x for x, _ in pts)
    gaps = [(b - a, i) for i, (a, b) in enumerate(zip(xs, xs[1:]))]
    widest, at = max(gaps)
    share = widest / (xs[-1] - xs[0])
    if share >= Fraction(1, 4):
        assert at + 1 >= 4 and len(xs) - at - 1 >= 4, f"a cluster of fewer than 4 points: {listing}"
        return "clusters"
    assert share <= Fraction(3, 20), f"x gap of {float(share):.2f} is neither clusters nor none"
    worst = 0.0
    for i, (x, y) in enumerate(pts):
        rest = pts[:i] + pts[i + 1:]
        rms = math.sqrt(float(biv_fit_error(rest, 2)) / len(rest))
        worst = max(worst, abs(float(y - biv_fit_at(rest, x))) / rms)
    if worst >= 6:
        return "outlier"
    assert worst <= 4, f"a point {worst:.1f} misses out is neither an outlier nor not: {listing}"
    ratio = biv_fit_error(pts, 2) / biv_fit_error(pts, 1)
    if ratio <= Fraction(3, 10):
        return "curved"
    assert ratio >= Fraction(1, 2), f"a curve ratio of {float(ratio):.2f} is unclear: {listing}"
    assert abs(biv_r(pts)) >= 0.85, f"not a clear straight line: {listing}"
    return "linear"


def biv_linked(counts: str) -> str:
    t = biv_table(counts)
    gap = abs(Fraction(100 * t[0][0], t[0][2]) - Fraction(100 * t[1][0], t[1][2]))
    if gap >= 10:
        return "yes"
    assert gap <= 5
    return "no"


BY_RULE += (
    (re.compile(rf"^predict y at x=({BIV_NUM}): {BIV_LINE}$"),
     lambda x, m, b: Fraction(str(m)) * Fraction(str(x)) + Fraction(str(b))),
    (re.compile(rf"^predict x at y=({BIV_NUM}): {BIV_LINE}$"),
     lambda y, m, b: (Fraction(str(y)) - Fraction(str(b))) / Fraction(str(m))),
    (re.compile(rf"^slope through {BIV_PT} {BIV_PT}$"),
     lambda x1, y1, x2, y2: (Fraction(str(y2)) - Fraction(str(y1))) / (Fraction(str(x2)) - Fraction(str(x1)))),
    (re.compile(rf"^intercept through {BIV_PT} {BIV_PT}$"),
     lambda x1, y1, x2, y2: Fraction(str(y1)) - Fraction(str(x1)) * (Fraction(str(y2)) - Fraction(str(y1))) / (Fraction(str(x2)) - Fraction(str(x1)))),
    (re.compile(rf"^residual: {BIV_LINE} at {BIV_PT}$"),
     lambda m, b, x, y: Fraction(str(y)) - (Fraction(str(m)) * Fraction(str(x)) + Fraction(str(b)))),
    (re.compile(r"^two-way missing: ((?:[\d?]+ ){2}[\d?]+(?: / (?:[\d?]+ ){2}[\d?]+){2})$"), biv_missing),
    (re.compile(r"^two-way percent (.+?): (\d+ \d+ / \d+ \d+)( to 1 dp)?$"), biv_percent),
    (re.compile(r"^two-way relative missing: (row|col) ([\d?]+ [\d?]+ / [\d?]+ [\d?]+)$"), biv_relative),
)

CHOICE_RULES += (
    (re.compile(rf"^association: ({BIV_PT}(?: {BIV_PT})+)$"), lambda listing, *_: biv_direction(listing)),
    (re.compile(rf"^scatter feature: ({BIV_PT}(?: {BIV_PT})+)$"), lambda listing, *_: biv_feature(listing)),
    (re.compile(rf"^meaning of ({BIV_NUM}) in {BIV_LINE}; options (.+)$"), biv_meaning),
    (re.compile(rf"^fit check: {BIV_LINE} at {BIV_PT}$"),
     lambda m, b, x, y: "above" if Fraction(y) > Fraction(m) * Fraction(x) + Fraction(b) else "below"),
    (re.compile(rf"^describe r=({BIV_NUM}); options (.+)$"),
     lambda r, listing: next(k for k, w in biv_options(listing).items() if w == biv_band(r))),
    (re.compile(r"^strongest r: (.+)$"),
     lambda listing: max(biv_options(listing).items(), key=lambda kv: abs(Fraction(kv[1])))[0]),
    (re.compile(rf"^closest r: ({BIV_PT}(?: {BIV_PT})+); options (.+)$"), lambda listing, *rest: biv_closest(listing, rest[-1])),
    (re.compile(rf"^causation: design=(experiment|observational) r=({BIV_NUM}); options (.+)$"), biv_cause),
    (re.compile(r"^design for cause \([a-z ]+\): options (.+)$"),
     lambda listing: next(k for k, w in biv_options(listing).items() if w == "experiment")),
    (re.compile(r"^two-way association: (\d+ \d+ / \d+ \d+)$"), biv_linked),
    (re.compile(r"^two-way relative association: (row|col) (\d+ \d+ / \d+ \d+)$"), biv_relative_linked),
)

# --- Distributions ----------------------------------------------------------
#
# A box plot is read from its five numbers, each part a quarter of the data.
# A histogram is rebuilt as every value standing at its bar's midpoint, which
# is what its shape, mean and median are judged by: a tail to the right pulls
# the mean above the median. The standard deviation divides by n and must
# come out exact. The normal curve's shares are the 68-95-99.7 rule, kept
# here as the share of each one-SD band on one side of the mean.

DIST_NUM = r"-?\d+(?:\.\d+)?"
DIST_HIST = r"from (\d+) width (\d+) counts (\d+(?: \d+)+)"
DIST_FIVE = ("min", "q1", "median", "q3", "max")
DIST_BANDS = (Fraction(34), Fraction(27, 2), Fraction(47, 20), Fraction(3, 20))


def dist_five(listing: str) -> list:
    five = [int(v) for v in listing.split()]
    assert len(five) == 5 and five == sorted(five)
    return five


def dist_box(part: str, listing: str) -> int:
    f = dist_five(listing)
    if part == "iqr":
        return f[3] - f[1]
    if part == "range":
        return f[4] - f[0]
    return f[DIST_FIVE.index(part)]


def dist_values(start, width, counts) -> list:
    """Every value of a histogram at its bar's midpoint."""
    start, width = int(start), int(width)
    cs = [int(c) for c in str(counts).split()]
    return [Fraction(2 * start + width * (2 * i + 1), 2) for i, c in enumerate(cs) for _ in range(c)]


def dist_bars(lo, hi, start, width, counts) -> int:
    start, width = int(start), int(width)
    cs = [int(c) for c in str(counts).split()]
    i, j = Fraction(Fraction(str(lo)) - start, width), Fraction(Fraction(str(hi)) - start, width)
    assert i.denominator == j.denominator == 1
    return sum(cs[int(i):int(j)])


def dist_hist_percent(lo, hi, start, width, counts, rounded) -> Fraction:
    exact = Fraction(100 * dist_bars(lo, hi, start, width, counts), sum(int(c) for c in str(counts).split()))
    return half_up(exact, 1) if rounded else exact


def dist_shape(start, width, counts) -> str:
    cs = str(counts).split()
    xs = dist_values(start, width, counts)
    mean, med = sum(xs) / len(xs), median_of(xs)
    if cs == cs[::-1]:
        assert mean == med
        return "symmetric"
    assert abs(mean - med) >= Fraction(int(width), 4), (counts, mean, med)
    return "right" if mean > med else "left"


def dist_median_bin(start, width, counts, listing: str) -> str:
    cs = [int(c) for c in str(counts).split()]
    n = sum(cs)
    def bar(pos):
        run = 0
        for i, c in enumerate(cs):
            run += c
            if pos <= run:
                return i + 1
    lo, hi = bar((n + 1) // 2), bar((n + 2) // 2)
    assert lo == hi
    return next(k for k, v in (item.split("=") for item in listing.split(", ")) if int(v) == lo)


def dist_sd(xs: list) -> Fraction:
    xs = [Fraction(x) for x in xs]
    mean = sum(xs) / len(xs)
    var = sum((x - mean) ** 2 for x in xs) / len(xs)
    root = fraction_root(var, 2)
    assert root is not None and root * root == var, var
    return root


def dist_normal(mean, sd, lo, hi) -> Fraction:
    mean, sd = Fraction(str(mean)), Fraction(str(sd))
    k = lambda v, edge: edge if v in ("inf", "-inf") else (Fraction(v) - mean) / sd
    a, b = k(lo, -4), k(hi, 4)
    assert Fraction(a).denominator == Fraction(b).denominator == 1 and -4 <= a < b <= 4
    return sum(DIST_BANDS[-z - 1 if z < 0 else z] for z in range(int(a), int(b)))


def dist_z(x, mean, sd) -> Fraction:
    return (Fraction(str(x)) - Fraction(str(mean))) / Fraction(str(sd))


def dist_halves(xs: list) -> tuple:
    ys = sorted(xs)
    h = len(ys) // 2
    return median_of(ys[:h]), median_of(ys[len(ys) - h:])


def dist_outlying(xs: list) -> bool:
    q1, q3 = dist_halves(xs)
    fence = Fraction(3, 2) * (q3 - q1)
    return any(x < q1 - fence or x > q3 + fence for x in xs)


def dist_spread(listing: str) -> str:
    # An outlier or a clear skew takes the IQR; a set that mirrors itself
    # about its middle, with no outlier, takes the standard deviation.
    xs = sorted(int(v) for v in listing.split())
    if dist_outlying(xs):
        return "iqr"
    if len({a + b for a, b in zip(xs, reversed(xs))}) == 1:
        return "sd"
    q1, q3 = dist_halves(xs)
    mean, med = Fraction(sum(xs), len(xs)), median_of(xs)
    assert abs(mean - med) >= (q3 - q1) / 4, f"{listing} is neither symmetric nor clearly skewed"
    return "iqr"


BY_RULE += (
    (re.compile(r"^box plot (min|q1|median|q3|max|iqr|range): (\d+ \d+ \d+ \d+ \d+)$"), dist_box),
    (re.compile(r"^box plot percent from (min|q1|median|q3) to (q1|median|q3|max): \d+ \d+ \d+ \d+ \d+$"),
     lambda a, b: 25 * (DIST_FIVE.index(b) - DIST_FIVE.index(a))),
    (re.compile(rf"^histogram total: {DIST_HIST}$"), lambda start, width, counts: len(dist_values(start, width, counts))),
    (re.compile(rf"^histogram count from ({DIST_NUM}) to ({DIST_NUM}): {DIST_HIST}$"), dist_bars),
    (re.compile(rf"^histogram percent from ({DIST_NUM}) to ({DIST_NUM}): {DIST_HIST}( to 1 dp)?$"), dist_hist_percent),
    (re.compile(r"^sd: (\d+(?: \d+)+)$"), lambda listing: dist_sd(str(listing).split())),
    (re.compile(rf"^normal percent: mean ({DIST_NUM}) sd ({DIST_NUM}), from (-inf|{DIST_NUM}) to (inf|{DIST_NUM})$"), dist_normal),
    (re.compile(rf"^normal count: (\d+) values, mean ({DIST_NUM}) sd ({DIST_NUM}), from (-inf|{DIST_NUM}) to (inf|{DIST_NUM})$"),
     lambda n, mean, sd, lo, hi: dist_normal(mean, sd, lo, hi) * int(n) / 100),
    (re.compile(rf"^z of ({DIST_NUM}): mean ({DIST_NUM}) sd ({DIST_NUM})$"), dist_z),
    (re.compile(rf"^value at z=({DIST_NUM}): mean ({DIST_NUM}) sd ({DIST_NUM})$"),
     lambda z, mean, sd: Fraction(str(mean)) + Fraction(str(z)) * Fraction(str(sd))),
)

CHOICE_RULES += (
    (re.compile(r"^box plots greater (iqr|range|median): A (\d+ \d+ \d+ \d+ \d+) / B (\d+ \d+ \d+ \d+ \d+)$"),
     lambda part, a, b: "A" if dist_box(part, a) > dist_box(part, b) else "B"),
    (re.compile(r"^wider by (iqr|range): A (\d+ \d+ \d+ \d+ \d+) / B (\d+ \d+ \d+ \d+ \d+)$"),
     lambda part, a, b: "A" if dist_box(part, a) > dist_box(part, b) else "B"),
    (re.compile(r"^outlier rule: q1 (\d+) q3 (\d+), value (\d+)$"),
     lambda q1, q3, v: "yes" if not (Fraction(q1) - Fraction(3, 2) * (int(q3) - int(q1)) <= int(v) <= Fraction(q3) + Fraction(3, 2) * (int(q3) - int(q1))) else "no"),
    (re.compile(rf"^histogram median bin: {DIST_HIST}; options (.+)$"), dist_median_bin),
    (re.compile(rf"^histogram shape: {DIST_HIST}$"), dist_shape),
    (re.compile(rf"^histogram mean or median: {DIST_HIST}$"),
     lambda *h: {"symmetric": "equal", "right": "mean", "left": "median"}[dist_shape(*h)]),
    (re.compile(rf"^histogram center: {DIST_HIST}$"), lambda *h: "mean" if dist_shape(*h) == "symmetric" else "median"),
    (re.compile(rf"^histogram spread: {DIST_HIST}$"), lambda *h: "sd" if dist_shape(*h) == "symmetric" else "iqr"),
    (re.compile(r"^sd change: sd \d+, (times|plus) \d+; options same, plus, times$"),
     lambda how: "times" if how == "times" else "same"),
    (re.compile(r"^greater sd: A (\d+(?: \d+)+) / B (\d+(?: \d+)+)$"),
     lambda a, b: "A" if dist_sd(a.split()) > dist_sd(b.split()) else "B"),
    (re.compile(rf"^better z: a=(\d+) mean (\d+) sd (\d+), b=(\d+) mean (\d+) sd (\d+)$"),
     lambda x1, m1, s1, x2, m2, s2: "a" if dist_z(x1, m1, s1) > dist_z(x2, m2, s2) else "b"),
    (re.compile(r"^spread measure: (\d+(?: \d+)+)$"), dist_spread),
)

# --- Probability ------------------------------------------------------------
#
# Equally likely outcomes, counted again: the outcomes are listed in the text,
# the event is named by a code read with the definitions here, and the
# probability is the count over the whole. Two dice and n coins are listed
# out in full here rather than trusted to a formula.

def chance_test(code: str):
    m = re.fullmatch(r"(gt|lt|at least|at most|multiple of) (\d+)", code)
    if m:
        k = int(m[2])
        return {"gt": lambda x: int(x) > k, "lt": lambda x: int(x) < k, "at least": lambda x: int(x) >= k,
                "at most": lambda x: int(x) <= k, "multiple of": lambda x: int(x) % k == 0}[m[1]]
    m = re.fullmatch(r"is (\w+)(?: or (\w+))?", code)
    if m:
        return lambda x: x in (m[1], m[2])
    return {"even": lambda x: int(x) % 2 == 0, "odd": lambda x: int(x) % 2 == 1,
            "prime": lambda x: int(x) > 1 and all(int(x) % k for k in range(2, int(x)))}[code]


def chance_of(outcomes: str, code: str) -> Fraction:
    xs = outcomes.split()
    return Fraction(sum(1 for x in xs if chance_test(code)(x)), len(xs))


def chance_likely(n: str, d: str) -> str:
    p = Fraction(int(n), int(d))
    if p == 0:
        return "impossible"
    if p == 1:
        return "certain"
    if p == Fraction(1, 2):
        return "even"
    # Unlikely below 1/4 and likely above 3/4, strictly: nothing in between is asked.
    assert p < Fraction(1, 4) or p > Fraction(3, 4), p
    return "likely" if p > Fraction(1, 2) else "unlikely"


def chance_dice(ask: str) -> Fraction:
    rolls = [(a, b) for a in range(1, 7) for b in range(1, 7)]
    m = re.fullmatch(r"sum (at least |at most )?(\d+)", ask)
    if m:
        k = int(m[2])
        ok = [r for r in rolls if {"at least ": sum(r) >= k, "at most ": sum(r) <= k, None: sum(r) == k}[m[1]]]
    else:
        assert ask == "doubles"
        ok = [r for r in rolls if r[0] == r[1]]
    return Fraction(len(ok), len(rolls))


def chance_coins(n, how: str, k) -> Fraction:
    import itertools
    flips = list(itertools.product("HT", repeat=int(n)))
    heads = [f.count("H") for f in flips]
    ok = [h for h in heads if (h >= int(k) if how == "at least" else h == int(k))]
    return Fraction(len(ok), len(flips))


def chance_space(steps: str) -> list:
    import itertools
    return ["".join(o) for o in itertools.product(*(s.split() for s in steps.split(" x ")))]


def chance_list(steps: str, listing: str) -> str:
    # The sample space is every outcome of the steps, each exactly once.
    want = sorted(chance_space(steps))
    found = [k for k, v in (item.split("=") for item in listing.split(", ")) if sorted(v.split()) == want]
    assert len(found) == 1, (steps, listing)
    return found[0]


def chance_missing(steps: str, listed: str, listing: str) -> str:
    gone = set(chance_space(steps)) - set(listed.split())
    assert len(gone) == 1 and len(listed.split()) == len(chance_space(steps)) - 1
    return next(k for k, v in (item.split("=") for item in listing.split(", ")) if v in gone)


def chance_results(listing: str) -> dict:
    return {face: int(c) for face, c in (item.split(":") for item in listing.split())}


BY_RULE += (
    (re.compile(r"^single: ([\w ]+); event (.+)$"), chance_of),
    (re.compile(r"^complement: (\d+)/(\d+)$"), lambda n, d: 1 - Fraction(n, d)),
    (re.compile(r"^complement: (\d+)%$"), lambda p: 100 - p),
    (re.compile(r"^complement: (0\.\d+)$"), lambda p: 1 - Fraction(p)),
    (re.compile(r"^complement: ([\w ]+); event (.+)$"), lambda xs, code: 1 - chance_of(xs, code)),
    (re.compile(r"^sample space: (\d+) x (\d+)$"), lambda a, b: a * b),
    (re.compile(r"^sample space: (\d+) x (\d+) x (\d+)$"), lambda a, b, c: a * b * c),
    (re.compile(r"^two dice: (sum (?:at (?:least|most) )?\d+|doubles)$"), chance_dice),
    (re.compile(r"^coins (\d+): (exactly|at least) (\d+) heads$"), chance_coins),
    (re.compile(r"^and: ([\w ]+); event (.+?) \| ([\w ]+); event (.+)$"),
     lambda a, ea, b, eb: chance_of(a, ea) * chance_of(b, eb)),
    (re.compile(r"^with replacement: ([\w ]+); (\w+) then (\w+)$"),
     lambda xs, first, second: chance_of(xs, f"is {first}") * chance_of(xs, f"is {second}")),
    (re.compile(r"^expected: ([\w ]+); event (.+); trials (\d+)$"), lambda xs, code, n: chance_of(xs, code) * int(n)),
    (re.compile(r"^expected from results: (\d+) of (\d+); trials (\d+)$"), lambda k, m, n: Fraction(k * n, m)),
    (re.compile(r"^experimental: ((?:\w+:\d+ ?)+); outcome (\w+)$"),
     lambda listing, face: Fraction(chance_results(listing)[str(face)], sum(chance_results(listing).values()))),
)

CHOICE_RULES += (
    (re.compile(r"^likelihood: (\d+)/(\d+) as (?:fraction|decimal|percent|bag)$"), chance_likely),
    (re.compile(r"^sample list: ((?:\w(?: \w)*)(?: x \w(?: \w)*)+); options (.+)$"), chance_list),
    (re.compile(r"^sample missing: ((?:\w(?: \w)*)(?: x \w(?: \w)*)+); listed ([\w ]+); options (.+)$"), chance_missing),
    (re.compile(r"^compare experimental: ((?:\w+:\d+ ?)+); outcome (\w+)$"),
     lambda listing, face: (lambda r: {1: "higher", -1: "lower", 0: "equal"}[
         (r[face] * len(r) > sum(r.values())) - (r[face] * len(r) < sum(r.values()))])(chance_results(listing))),
    (re.compile(r"^more trials: .+; options (.+)$"),
     lambda listing: next(k for k, v in (item.split("=") for item in listing.split(", ")) if v == "closer")),
)

# --- Counting ---------------------------------------------------------------
# requiem: catalogue/content/counting-restricted-counts-listed
#
# The plain counts are counted with math's own perm and comb; everything with
# a restriction, and every probability, is counted by listing each
# arrangement or group with itertools and testing it, so a slip in the
# explanation's shortcut cannot hide behind the same shortcut here.

def count_product(choices: str) -> int:
    return math.prod(int(c) for c in choices.split())


def count_factorial_ratio(n, k) -> int:
    return math.factorial(n) // math.factorial(k)


def count_code(length, repeat: str, rules: str) -> int:
    import itertools
    pool = itertools.product(range(10), repeat=length) if repeat == "repeat" else itertools.permutations(range(10), length)
    tests = {"first not zero": lambda c: c[0] != 0, "ends even": lambda c: c[-1] % 2 == 0, "ends odd": lambda c: c[-1] % 2 == 1}
    wanted = [tests[r] for r in rules.split(", ") if r]
    return sum(1 for c in pool if all(t(c) for t in wanted))


def count_small_code(length, top, repeat: str, parity: str) -> int:
    import itertools
    digits = range(1, top + 1)
    pool = itertools.product(digits, repeat=length) if repeat == "repeat" else itertools.permutations(digits, length)
    return sum(1 for c in pool if c[-1] % 2 == (0 if parity == "even" else 1))


def count_row(n, rule: str) -> int:
    import itertools
    # Person 0 is A and person 1 is B.
    tests = {"A first": lambda r: r[0] == 0, "A at an end": lambda r: 0 in (r[0], r[-1]),
             "A and B together": lambda r: abs(r.index(0) - r.index(1)) == 1,
             "A and B apart": lambda r: abs(r.index(0) - r.index(1)) > 1}
    return sum(1 for r in itertools.permutations(range(n)) if tests[rule](r))


def count_committee(n, r, rule: str) -> int:
    import itertools
    test = {"includes A": lambda c: 0 in c, "excludes A": lambda c: 0 not in c}[rule]
    return sum(1 for c in itertools.combinations(range(n), r) if test(c))


def count_chance_pair(n, r) -> Fraction:
    import itertools
    groups = list(itertools.combinations(range(n), r))
    return Fraction(sum(1 for c in groups if 0 in c and 1 in c), len(groups))


def count_chance_seniors(g, j, r, k) -> Fraction:
    import itertools
    groups = list(itertools.combinations(range(g + j), r))
    return Fraction(sum(1 for c in groups if sum(1 for x in c if x < g) == k), len(groups))


def count_chance_lottery(r, n) -> Fraction:
    import itertools
    draws = list(itertools.combinations(range(1, n + 1), r))
    return Fraction(sum(1 for c in draws if c == tuple(range(1, r + 1))), len(draws))


def count_chance_row(n) -> Fraction:
    import itertools
    rows = list(itertools.permutations(range(n)))
    return Fraction(sum(1 for r in rows if abs(r.index(0) - r.index(1)) == 1), len(rows))


def count_chance_race(n) -> Fraction:
    import itertools
    finishes = list(itertools.permutations(range(n), 2))
    return Fraction(sum(1 for f in finishes if f == (0, 1)), len(finishes))


BY_RULE += (
    (re.compile(r"^multiply choices: ([\d ]+); (?:menu|code|plate|pegs|quiz|coins)$"), lambda choices: count_product(choices)),
    (re.compile(r"^(?:factorial|arrange) (\d+)(?:; \w+)?$"), math.factorial),
    (re.compile(r"^factorial ratio (\d+) (\d+)$"), count_factorial_ratio),
    (re.compile(r"^permutations (\d+) (\d+); (\w+)$"), lambda n, r, what: math.perm(n, r) if what in COUNT_ORDERED else None),
    (re.compile(r"^combinations (\d+) (\d+); (\w+)$"), lambda n, r, what: math.comb(n, r) if what in COUNT_UNORDERED else None),
    (re.compile(r"^code: length (\d+), digits, (repeat|no repeat)(?:, )?(.*)$"), count_code),
    (re.compile(r"^code: length (\d+), digits 1 to (\d+), (repeat|no repeat), ends (even|odd)$"), count_small_code),
    (re.compile(r"^row: (\d+) people, (A first|A at an end|A and B together|A and B apart)$"), count_row),
    (re.compile(r"^committee: (\d+) people, (\d+) chosen, (includes A|excludes A)$"), count_committee),
    (re.compile(r"^committee chance: (\d+) people, (\d+) chosen, includes A and B$"), count_chance_pair),
    (re.compile(r"^committee chance: (\d+) seniors (\d+) juniors, (\d+) chosen, exactly (\d+) seniors$"), count_chance_seniors),
    (re.compile(r"^lottery: (\d+) of (\d+)$"), count_chance_lottery),
    (re.compile(r"^row chance: (\d+) people, A and B together$"), count_chance_row),
    (re.compile(r"^race chance: (\d+) runners, A first and B second$"), count_chance_race),
)

# Whether a selection's order matters is a property of what is chosen: a
# place or a job makes it a permutation, a group with no first a combination.
# Each setting comes both ways: medals in a race and the runners who qualify.
COUNT_ORDERED = {"medals", "officers", "chairs", "row", "sequence", "ranking", "seats", "shelf", "deal", "route"}
COUNT_UNORDERED = {"qualify", "planners", "committee", "trip", "download", "toppings", "group", "set", "hand", "passes"}

CHOICE_RULES += (
    (re.compile(r"^order matters: n \d+ r \d+; selection is (\w+)$"),
     lambda what: "perm" if what in COUNT_ORDERED else ("comb" if what in COUNT_UNORDERED else None)),
)

# --- Compound probability ---------------------------------------------------
#
# Venn regions and table cells are summed by which events each one belongs
# to, the deck is all 52 cards listed, two draws from a bag are every ordered
# pair of different marbles, and independence is tested by multiplying.

def compound_venn(counts: str, ask: str) -> Fraction:
    # The regions in order: A only, both, B only, neither, as (in A, in B).
    regions = list(zip(((True, False), (True, True), (False, True), (False, False)), map(int, counts.split())))
    test = {"or": lambda a, b: a or b, "and": lambda a, b: a and b, "neither": lambda a, b: not a and not b,
            "only": lambda a, b: a and not b, "not": lambda a, b: not a}[ask]
    return Fraction(sum(n for (a, b), n in regions if test(a, b)), sum(n for _, n in regions))


def compound_deck():
    suits = ("heart", "diamond", "club", "spade")
    ranks = ("ace", "2", "3", "4", "5", "6", "7", "8", "9", "10", "jack", "queen", "king")
    return [(s, r) for s in suits for r in ranks]


def compound_card(code: str):
    if code in ("heart", "diamond", "club", "spade"):
        return lambda c: c[0] == code
    if code == "red":
        return lambda c: c[0] in ("heart", "diamond")
    if code == "black":
        return lambda c: c[0] in ("club", "spade")
    if code == "face":
        return lambda c: c[1] in ("jack", "queen", "king")
    return lambda c: c[1] == str(code)


def compound_deck_or(x, y) -> Fraction:
    deck = compound_deck()
    return Fraction(sum(1 for c in deck if compound_card(x)(c) or compound_card(y)(c)), len(deck))


def compound_deck_two(code) -> Fraction:
    import itertools
    pairs = list(itertools.permutations(compound_deck(), 2))
    return Fraction(sum(1 for p in pairs if all(compound_card(code)(c) for c in p)), len(pairs))


def compound_bag_two(bag: str, ask: str) -> Fraction:
    import itertools
    marbles = [color for item in bag.split() for color in [item.split(":")[0]] * int(item.split(":")[1])]
    pairs = list(itertools.permutations(range(len(marbles)), 2))
    drawn = [(marbles[i], marbles[j]) for i, j in pairs]
    m = re.fullmatch(r"(\w+) then (\w+)", ask)
    if m:
        ok = [d for d in drawn if d == (m[1], m[2])]
    elif ask.startswith("both "):
        ok = [d for d in drawn if d == (ask[5:], ask[5:])]
    else:
        m = re.fullmatch(r"one (\w+) one (\w+)", ask)
        ok = [d for d in drawn if sorted(d) == sorted((m[1], m[2]))]
    return Fraction(len(ok), len(drawn))


def compound_table(a, b, d, e, want: str, given: str) -> Fraction:
    cells = {("r1", "c1"): a, ("r1", "c2"): b, ("r2", "c1"): d, ("r2", "c2"): e}
    inside = lambda key, label: label == "all" or label in key
    wanted = lambda key: all(part in key for part in want.split())
    whole = sum(n for k, n in cells.items() if inside(k, given))
    return Fraction(sum(n for k, n in cells.items() if inside(k, given) and wanted(k)), whole)


def compound_exclusive_or(pa, pb) -> Fraction:
    # Exclusive events have no overlap, so they cannot add past 1.
    assert Fraction(pa) + Fraction(pb) <= 1, (pa, pb)
    return Fraction(pa) + Fraction(pb)


def compound_or(pa, pb, pab) -> Fraction:
    pa, pb, pab = Fraction(pa), Fraction(pb), Fraction(pab)
    assert pab <= min(pa, pb), (pa, pb, pab)
    return pa + pb - pab


def compound_independent(pa, pb, pab) -> str:
    return "yes" if Fraction(pa) * Fraction(pb) == Fraction(pab) else "no"


def compound_independent_table(a, b, d, e) -> str:
    # Independent when the first column's share is the same in both rows.
    a, b, d, e = map(int, (a, b, d, e))
    return "yes" if Fraction(a, a + b) == Fraction(d, d + e) else "no"


BY_RULE += (
    (re.compile(r"^venn: ([\d ]+); ask (or|and|neither|only|not)$"), compound_venn),
    (re.compile(r"^deck: (\w+) or (\w+)$"), compound_deck_or),
    (re.compile(r"^or counts: total (\d+), a (\d+), b (\d+), both (\d+)$"), lambda t, a, b, k: Fraction(a + b - k, t)),
    (re.compile(r"^or exclusive: ([\d.]+) ([\d.]+)$"), compound_exclusive_or),
    (re.compile(r"^or: ([\d.]+) ([\d.]+) ([\d.]+)$"), compound_or),
    (re.compile(r"^both from or: ([\d.]+) ([\d.]+) ([\d.]+)$"), lambda pa, pb, por: Fraction(pa) + Fraction(pb) - Fraction(por)),
    (re.compile(r"^table chance: (\d+) (\d+) / (\d+) (\d+); want ([rc]\d(?: [rc]\d)?) given (r\d|c\d|all)$"), compound_table),
    (re.compile(r"^deck two: both (\w+)$"), compound_deck_two),
    (re.compile(r"^without replacement: ((?:\w+:\d+ ?)+); (.+)$"), compound_bag_two),
    (re.compile(r"^conditional: ([\d.]+) ([\d.]+); (?:sport|cloudy|coffee|phone|letters)$"), lambda pab, pb: Fraction(pab) / Fraction(pb)),
    (re.compile(r"^and from conditional: ([\d.]+) ([\d.]+); (?:sport|cloudy|coffee|phone|letters)$"), lambda pb, q: Fraction(pb) * Fraction(q)),
)

CHOICE_RULES += (
    (re.compile(r"^independent: ([\d.]+) ([\d.]+) ([\d.]+)$"), compound_independent),
    (re.compile(r"^independent given: ([\d.]+) ([\d.]+)$"), lambda pa, pagb: "yes" if Fraction(pa) == Fraction(pagb) else "no"),
    (re.compile(r"^independent table: (\d+) (\d+) / (\d+) (\d+)$"), compound_independent_table),
    # Exclusive: P(A and B) is 0, which is the product only if one of them is impossible.
    (re.compile(r"^independent exclusive: ([\d.]+) ([\d.]+)$"),
     lambda pa, pb: compound_independent(pa, pb, "0") if Fraction(pa) + Fraction(pb) <= 1 else None),
)

# --- Trigonometric ratios ---------------------------------------------------
#
# Sides are named again from the letters, ratios rebuilt from the side
# lengths (a missing one found by the Pythagorean theorem), and missing
# sides and angles worked from a triangle with hypotenuse 1, whose legs are
# sin θ and cos θ. Every rounded answer is also worked the way a student
# copies a calculator down, with the trig value to 4 places, and the two
# must round alike. Exact answers are compared with the calculator's value.

TRIG_PAIRS = {"sin": ("opposite", "hypotenuse"), "cos": ("adjacent", "hypotenuse"), "tan": ("opposite", "adjacent")}


def trig_name(right: str, angle: str, third: str, role: str) -> str:
    pair = lambda p, q: "".join(sorted(p + q))
    return {"opposite": pair(right, third), "adjacent": pair(angle, right), "hypotenuse": pair(angle, third)}[role]


def trig_role(right: str, angle: str, third: str, name: str) -> str:
    return next(r for r in ("opposite", "adjacent", "hypotenuse") if trig_name(right, angle, third, r) == name)


def trig_ratio(fn: str, angle: str, right: str, listing: str) -> Fraction:
    lengths = {name: int(v) for name, v in (item.split() for item in listing.split(", "))}
    third = (set("".join(lengths)) - {angle, right}).pop()
    side = {r: lengths.get(trig_name(right, angle, third, r)) for r in ("opposite", "adjacent", "hypotenuse")}
    if side["hypotenuse"] is None:
        side["hypotenuse"] = fraction_root(Fraction(side["opposite"] ** 2 + side["adjacent"] ** 2), 2)
    for leg, other in (("opposite", "adjacent"), ("adjacent", "opposite")):
        if side[leg] is None:
            side[leg] = fraction_root(Fraction(side["hypotenuse"] ** 2 - side[other] ** 2), 2)
    top, bottom = TRIG_PAIRS[fn]
    return Fraction(side[top]) / Fraction(side[bottom])


def trig_unit(theta: float) -> dict:
    t = math.radians(theta)
    return {"opposite": math.sin(t), "adjacent": math.cos(t), "hypotenuse": 1.0}


# requiem: catalogue/content/trig-rounding-agrees
def trig_agree(exact: float, four_place: float, places: int) -> Fraction:
    rounded = half_up(Fraction(exact), places)
    assert half_up(Fraction(four_place), places) == rounded, f"{exact} and its 4-place working {four_place} round apart"
    return rounded


def trig_side(theta, known_role, known, want_role, places) -> Fraction:
    s = trig_unit(theta)
    x = known * s[want_role] / s[known_role]
    fn = next(f for f, pair in TRIG_PAIRS.items() if set(pair) == {known_role, want_role})
    top, bottom = TRIG_PAIRS[fn]
    v4 = round(s[top] / s[bottom], 4)
    return trig_agree(x, known * v4 if want_role == top else known / v4, places)


def trig_angle(role1, n1, role2, n2, places) -> Fraction:
    sides = {role1: n1, role2: n2}
    fn = next(f for f, pair in TRIG_PAIRS.items() if set(pair) == set(sides))
    top, bottom = TRIG_PAIRS[fn]
    inverse = {"sin": math.asin, "cos": math.acos, "tan": math.atan}[fn]
    r = sides[top] / sides[bottom]
    return trig_agree(math.degrees(inverse(r)), math.degrees(inverse(round(r, 4))), places)


def trig_bearing(b, d, want, places) -> Fraction:
    # East is d·sin(bearing) and north d·cos(bearing): the bearing turns from north.
    t = math.radians(b)
    exact = d * (math.sin(t) if want == "east" else math.cos(t))
    four = d * round(math.sin(t) if want == "east" else math.cos(t), 4)
    return trig_agree(exact, four, places)


def trig_surd_value(written: str) -> float:
    m = re.fullmatch(r"(\d*)√(\d+)", written)
    return (int(m[1]) if m[1] else 1) * math.sqrt(int(m[2])) if m else float(written)


def trig_special(kind, given_role, given, want_role) -> float:
    # The special triangles from their angles: with hypotenuse 1, a 45-45-90's
    # legs are sin 45°, and a 30-60-90's legs are sin 30° and sin 60°.
    unit = ({"leg": math.sin(math.radians(45)), "hypotenuse": 1.0} if kind == "45"
            else {"short": math.sin(math.radians(30)), "long": math.sin(math.radians(60)), "hypotenuse": 1.0})
    return trig_surd_value(given) / unit[given_role] * unit[want_role]


def trig_cofunction(f, t, g) -> int:
    fn = {"sin": math.sin, "cos": math.cos}
    hits = [x for x in range(1, 90) if abs(fn[f](math.radians(t)) - fn[g](math.radians(x))) < 1e-12]
    assert len(hits) == 1, hits
    return hits[0]


def trig_cofunction_value(f, p, q, g) -> Fraction:
    # A from its ratio, B = 90° − A, and g of B on the calculator.
    r = int(p) / int(q)
    A = {"sin": math.asin, "cos": math.acos, "tan": math.atan}[f](r)
    v = {"sin": math.sin, "cos": math.cos, "tan": math.tan}[g](math.pi / 2 - A)
    return Fraction(v).limit_denominator(1000)


# requiem: catalogue/content/special-triangle-leg-from-the-mark
def trig_special_marked(theta, given_role, given, want_role) -> float:
    # The leg is named by its place from the marked angle, as the figure shows
    # it, and worked from a hypotenuse-1 triangle with that angle.
    unit = trig_unit(int(theta))
    return trig_surd_value(given) / unit[given_role] * unit[want_role]


def trig_cofunction_solve(f, a, b, g, c, d) -> int:
    a, b, c, d = int(a), int(b), int(c), int(d)
    fn = {"sin": math.sin, "cos": math.cos}
    hits = [x for x in range(-90, 91) if 0 < a * x + b < 90 and 0 < c * x + d < 90
            and abs(fn[f](math.radians(a * x + b)) - fn[g](math.radians(c * x + d))) < 1e-12]
    assert len(hits) == 1, hits
    return hits[0]


TRIG_ROLE = r"(opposite|adjacent|hypotenuse)"

BY_RULE += (
    (re.compile(r"^trig ratio: (sin|cos|tan) ([A-Z]); right ([A-Z]); ((?:[A-Z]{2} \d+(?:, )?)+)$"), trig_ratio),
    (re.compile(rf"^(?:missing side|elevation|depression|ladder): angle (\d+), {TRIG_ROLE} (\d+), want {TRIG_ROLE} to (\d) dp$"), trig_side),
    (re.compile(rf"^missing angle: {TRIG_ROLE} (\d+), {TRIG_ROLE} (\d+) to the nearest whole$"),
     lambda r1, n1, r2, n2: trig_angle(r1, n1, r2, n2, 0)),
    (re.compile(r"^sun angle: height (\d+), shadow (\d+) to the nearest whole$"),
     lambda h, s: trig_angle("opposite", h, "adjacent", s, 0)),
    (re.compile(r"^bearing: (\d+), distance (\d+), want (east|north) to (\d) dp$"), trig_bearing),
    (re.compile(r"^bearing from legs: east (\d+), north (\d+) to the nearest whole$"),
     lambda e, n: trig_agree(math.degrees(math.atan2(e, n)), math.degrees(math.atan(round(e / n, 4))), 0)),
    (re.compile(r"^cofunction: (sin|cos) (\d+) = (sin|cos) \?$"), trig_cofunction),
    (re.compile(r"^cofunction value: (sin|cos|tan) A (\d+)/(\d+), want (sin|cos|tan) B$"), trig_cofunction_value),
    (re.compile(r"^cofunction solve: (sin|cos)\((\d+)x \+ (-?\d+)\) = (sin|cos)\((\d+)x \+ (-?\d+)\)$"), trig_cofunction_solve),
)

EXACT_RULES += (
    (re.compile(r"^special (45): (leg|hypotenuse) (\d*√?\d+), want (leg|hypotenuse)$"), trig_special),
    (re.compile(rf"^special 30: angle (30|60), {TRIG_ROLE} (\d*√?\d+), want {TRIG_ROLE}$"), trig_special_marked),
)

CHOICE_RULES += (
    (re.compile(r"^side name: right ([A-Z]), angle ([A-Z]), third ([A-Z]), want (opposite|adjacent|hypotenuse)$"),
     lambda right, angle, third, want: trig_name(right, angle, third, want)),
    (re.compile(r"^side role: right ([A-Z]), angle ([A-Z]), third ([A-Z]), side ([A-Z]{2})$"), trig_role),
)

# --- Laws of sines and cosines ------------------------------------------------
#
# Each triangle is built again on coordinates -- from its angles by two rays
# meeting, or from its sides and the angle between them -- and the asked
# side or angle measured off it, so neither law is used to check itself. The
# 4-place working beside each is the law the student uses, and the two must
# round alike (trig_agree).

def laws_points_from_angles(A, B):
    # A at the origin, B at (1, 0); C where the rays at A and at B meet.
    ta, tb = math.radians(A), math.radians(180 - B)
    # A + s(cos ta, sin ta) = B + u(cos tb, sin tb)
    det = math.cos(ta) * math.sin(tb) - math.sin(ta) * math.cos(tb)
    s = (1 * math.sin(tb)) / det
    return (0.0, 0.0), (1.0, 0.0), (s * math.cos(ta), s * math.sin(ta))


def laws_sides(P) -> dict:
    A, B, C = P
    d = lambda p, q: math.hypot(p[0] - q[0], p[1] - q[1])
    return {"a": d(B, C), "b": d(C, A), "c": d(A, B)}


def laws_angle_at(P, which: str) -> float:
    A, B, C = P
    v, u, w = {"A": (A, B, C), "B": (B, C, A), "C": (C, A, B)}[which]
    t = math.atan2(u[1] - v[1], u[0] - v[0]) - math.atan2(w[1] - v[1], w[0] - v[0])
    t = abs(math.degrees(t)) % 360
    return 360 - t if t > 180 else t


def laws_sines_side(x, ax, y, ay, known, k, want, places) -> Fraction:
    angles = {x: ax, y: ay}
    angles[({"A", "B", "C"} - set(angles)).pop()] = 180 - ax - ay
    s = laws_sides(laws_points_from_angles(angles["A"], angles["B"]))
    exact = k * s[want] / s[known]
    four = k * round(math.sin(math.radians(angles[want.upper()])), 4) / round(math.sin(math.radians(angles[known.upper()])), 4)
    return trig_agree(exact, four, places)


# requiem: catalogue/content/ssa-says-which-triangle
def laws_sines_angle(A, a, b, which, places) -> Fraction:
    # A at the origin, C at distance b along the ray at A; B on the base line
    # at distance a from C. Every such B is listed, and the angle measured.
    C = (b * math.cos(math.radians(A)), b * math.sin(math.radians(A)))
    disc = a * a - C[1] ** 2
    xs = [x for x in {C[0] + math.sqrt(disc), C[0] - math.sqrt(disc)} if x > 1e-9] if disc > 0 else []
    angles = [laws_angle_at(((0.0, 0.0), (x, 0.0), C), "B") for x in xs]
    # A question that names no triangle must have only one; one that names
    # the acute or the obtuse B must have two to choose between.
    assert (len(angles) == 1) == (which is None), (A, a, b, which, angles)
    picked = angles if which is None else [t for t in angles if (t < 90) == (which == "acute")]
    assert len(picked) == 1, (A, a, b, angles)
    which = which or ("acute" if picked[0] < 90 else "obtuse")
    s4 = round(b * round(math.sin(math.radians(A)), 4) / a, 4)
    four = math.degrees(math.asin(s4))
    return trig_agree(picked[0], four if which == "acute" else 180 - four, places)


def laws_cosines_side(a, b, C, places) -> Fraction:
    P = ((b, 0.0), (a * math.cos(math.radians(C)), a * math.sin(math.radians(C))))
    exact = math.hypot(P[0][0] - P[1][0], P[0][1] - P[1][1])
    four = math.sqrt(a * a + b * b - 2 * a * b * round(math.cos(math.radians(C)), 4))
    return trig_agree(exact, four, places)


def laws_cosines_angle(a, b, c, want, places) -> Fraction:
    # A at the origin, B at (c, 0), C found from its distances to both.
    x = (b * b + c * c - a * a) / (2 * c)
    P = ((0.0, 0.0), (float(c), 0.0), (x, math.sqrt(b * b - x * x)))
    sides = {"A": (b, c, a), "B": (a, c, b), "C": (a, b, c)}[want]
    four = math.degrees(math.acos(round((sides[0] ** 2 + sides[1] ** 2 - sides[2] ** 2) / (2 * sides[0] * sides[1]), 4)))
    return trig_agree(laws_angle_at(P, want), four, places)


def laws_count(A, a, b) -> str:
    # The same construction as laws_sines_angle, counting the places B can go.
    if A == 30 and 2 * a == b:
        return "1"
    if A >= 90:
        return "1" if a > b else "0"
    h = b * math.sin(math.radians(A))
    assert abs(a - h) > 0.2, (A, a, b)
    if a < h:
        return "0"
    base = b * math.cos(math.radians(A))
    xs = [x for x in (base + math.sqrt(a * a - h * h), base - math.sqrt(a * a - h * h)) if x > 1e-9]
    return str(len(xs))


def laws_area(a, b, C, places) -> Fraction:
    # The shoelace formula on the triangle's corners.
    P = [(0.0, 0.0), (float(b), 0.0), (a * math.cos(math.radians(C)), a * math.sin(math.radians(C)))]
    exact = abs(sum(P[i][0] * P[(i + 1) % 3][1] - P[(i + 1) % 3][0] * P[i][1] for i in range(3))) / 2
    return trig_agree(exact, 0.5 * a * b * round(math.sin(math.radians(C)), 4), places)


def laws_which(listing: str, want: str) -> str:
    known = {k: int(v) for k, v in (item.split() for item in listing.split(", "))}
    angles = {k for k in known if k.isupper()}
    if any(known[k] == 90 for k in angles):
        return "right"
    # Two angles give the third, and then every angle has its side's partner.
    paired = len(angles) >= 2 or any(k.lower() in known for k in angles)
    return "sines" if paired else "cosines"


BY_RULE += (
    (re.compile(r"^sines side: ([ABC]) (\d+), ([ABC]) (\d+), ([abc]) (\d+); want ([abc]) to (\d) dp$"), laws_sines_side),
    (re.compile(r"^sines angle: A (\d+), a (\d+), b (\d+); want (?:(acute|obtuse) )?B to the nearest whole$"),
     lambda A, a, b, which: laws_sines_angle(A, a, b, which, 0)),
    (re.compile(r"^cosines side: a (\d+), b (\d+), C (\d+); want c to (\d) dp$"), laws_cosines_side),
    (re.compile(r"^cosines angle: a (\d+), b (\d+), c (\d+); want ([ABC]) to the nearest whole$"),
     lambda a, b, c, want: laws_cosines_angle(a, b, c, want, 0)),
    (re.compile(r"^triangle area: a (\d+), b (\d+), C (\d+) to (\d) dp$"), laws_area),
)

# requiem: catalogue/content/laws-proved-from-the-altitude
# A proof of a law is checked on concrete triangles, acute and obtuse, built
# on coordinates: h is the distance from the named corner to the line of the
# other two, and x the signed distance along it from the corner named in
# x = PD to the foot D. A line follows when it holds on every triangle, so
# the altitude facts (h = b sin A, x = b cos A) are measured, not assumed.
# The goal and every line so far must hold, and exactly one option must hold
# that is not a line already written.
LAW_TRIANGLES = [((0.0, 0.0), (c, 0.0), (px, py)) for c, px, py in
                 ((5.0, 1.7, 3.1), (7.0, 6.2, 2.4), (4.0, -1.3, 2.2), (6.0, 8.1, 1.9), (3.0, 1.5, 4.6),
                  (9.0, 2.2, 0.8), (2.5, 3.9, 3.3), (8.0, -2.4, 5.5))]


def laws_at(P, R: str, foot_from: str) -> dict:
    corner = dict(zip("ABC", P))
    env = {k.lower(): v for k, v in laws_sides(P).items()}
    env.update({k: math.radians(laws_angle_at(P, k)) for k in "ABC"})
    (ux, uy), (vx, vy) = corner[foot_from], corner[({"A", "B", "C"} - {R, foot_from}).pop()]
    rx, ry = corner[R]
    length = math.hypot(vx - ux, vy - uy)
    env["x"] = ((rx - ux) * (vx - ux) + (ry - uy) * (vy - uy)) / length
    env["h"] = abs((rx - ux) * (vy - uy) - (ry - uy) * (vx - ux)) / length
    return env


def laws_line_holds(line: str, R: str, foot_from: str) -> bool:
    import ast
    left, right = (ast.parse(side.replace("^", "**"), mode="eval") for side in line.split(" = "))
    for P in LAW_TRIANGLES:
        env = laws_at(P, R, foot_from)
        x, y = idn_value(left, env), idn_value(right, env)
        if abs(x - y) > 1e-9 * max(1.0, abs(x)):
            return False
    return True


def laws_proof(goal: str, R: str, foot_from: str, so_far: str, options: str) -> str:
    lines = so_far.split("; ")
    if not all(laws_line_holds(line, R, foot_from) for line in [goal, *lines]):
        return "the goal or a line so far does not hold"
    fits = [oid for oid, opt in tg_options(options).items() if laws_line_holds(opt, R, foot_from) and opt not in lines]
    return fits[0] if len(fits) == 1 else f"fits {fits}"


CHOICE_RULES += (
    (re.compile(r"^law proof: goal (.+?); altitude from ([ABC]), x = ([ABC])D; so far (.+?); options (.+)$"), laws_proof),
    (re.compile(r"^ssa count: A (\d+), a (\d+), b (\d+)$"), lambda A, a, b: laws_count(int(A), int(a), int(b))),
    (re.compile(r"^which law: ((?:[ABCabc] \d+(?:, )?)+); want ([ABCabc])$"), laws_which),
)

# --- Radians -----------------------------------------------------------------
#
# A multiple of π is held as its coefficient, a fraction, and converted with
# 180° = π in exact arithmetic; a turn is 2π, or 360°. A coterminal or
# reference angle is found by stepping round the circle a degree, or a
# twelfth of π, at a time rather than by the subtraction the explanation
# uses. Rounded answers use the calculator's π, worked again with 3.1416
# (trig_agree).

# requiem: catalogue/content/radian-coefficients-as-fractions
def rad_coef(written: str) -> Fraction:
    n, d = written.split("/")
    return Fraction(int(n), int(d))


def rad_coterminal_deg(deg) -> int:
    hits = [t for t in range(0, 360) if (t - deg) % 360 == 0]
    assert len(hits) == 1
    return hits[0]


def rad_coterminal_rad(written: str) -> Fraction:
    k = rad_coef(written)
    # Every candidate in [0, 2) on a grid fine enough for any denominator here.
    hits = [Fraction(j, 120) for j in range(240) if (Fraction(j, 120) - k) % 2 == 0]
    assert len(hits) == 1
    return hits[0]


# requiem: catalogue/content/reference-angles-any-angle
def rad_reference_deg(deg) -> int:
    # Round to one turn by stepping (rad_coterminal_deg), then the angle
    # between the terminal side and the nearer half of the x-axis.
    deg = rad_coterminal_deg(int(deg))
    return min(abs(deg - 0), abs(deg - 180), abs(deg - 360))


def rad_arc(kind: str, r, how: str, value: str) -> Fraction:
    # θ in radians: a coefficient of π, plain radians, or degrees converted.
    value = str(value)
    if how == "degrees":
        theta = Fraction(int(value), 180)
    elif value.endswith(" pi"):
        theta = rad_coef(value[:-3])
    else:
        theta = Fraction(value)
    factor = Fraction(r * r, 2) if kind == "sector area" else Fraction(r)
    return factor * theta


def rad_linear(r, unit, rpm, places) -> Fraction:
    per = {"in": 12 * 60, "cm": 100 * 60}[unit]
    return trig_agree(2 * math.pi * r * rpm / per, 2 * 3.1416 * r * rpm / per, places)


def rad_wheel(dia, unit, rpm, out, places) -> Fraction:
    per = {"mi": 63360, "km": 100000}[out]
    return trig_agree(math.pi * dia * rpm * 60 / per, 3.1416 * dia * rpm * 60 / per, places)


BY_RULE += (
    (re.compile(r"^deg to rad: (\d+)$"), lambda deg: Fraction(deg, 180)),
    (re.compile(r"^rad to deg: (\d+/\d+) pi$"), lambda k: rad_coef(k) * 180),
    (re.compile(r"^rad to deg: ([\d.]+) to (\d) dp$"),
     lambda r, places: trig_agree(float(r) * 180 / math.pi, float(r) * 180 / 3.1416, places)),
    (re.compile(r"^coterminal deg: (-?\d+)$"), lambda deg: rad_coterminal_deg(int(deg))),
    (re.compile(r"^coterminal rad: (-?\d+/\d+)$"), rad_coterminal_rad),
    (re.compile(r"^reference deg: (-?\d+)$"), lambda deg: rad_reference_deg(int(deg))),
    (re.compile(r"^reference rad: (-?\d+/\d+)$"), lambda k: Fraction(rad_reference_deg(rad_coef(k) * 180), 180)),
    (re.compile(r"^(arc length|sector area): r (\d+), (theta|degrees) ([\d./]+(?: pi)?)$"), rad_arc),
    (re.compile(r"^arc angle: s (\d+), r (\d+)$"), lambda s, r: Fraction(s, r)),
    (re.compile(r"^angular: rpm (\d+), want rad per (min|s)$"), lambda rpm, per: Fraction(2 * rpm, 60 if per == "s" else 1)),
    (re.compile(r"^rim speed: r (\d+), omega (\d+)$"), lambda r, w: r * w),
    (re.compile(r"^linear speed: r (\d+) (in|cm), rpm (\d+), want (?:ft|m) per s to (\d) dp$"), rad_linear),
    (re.compile(r"^wheel speed: diameter (\d+) (in|cm), rpm (\d+), want (mi|km) per h to (\d) dp$"), rad_wheel),
)

# requiem: catalogue/content/probabilities-within-0-and-1
# No probability lies outside 0 to 1: not a key, and not one given in a
# question. The keys are every fraction in the chance skills and every
# decimal in compound probability; the given ones are compound
# probability's decimals, written in its texts.
CHANCE_SKILLS = ("probability", "probability-2", "counting")


def chance_out_of_range() -> list:
    found = []
    for path in sorted(LIB.glob("*.json")):
        lib = json.loads(path.read_text()) if path.name not in ("manifest.json", "schemas.json") else None
        if not lib or lib["skill"] not in CHANCE_SKILLS:
            continue
        for i, p in enumerate(lib["problems"]):
            a = p["answer"]
            keyed = a["type"] == "frac" or (lib["skill"] == "probability-2" and a["type"] == "decimal")
            given = [Fraction(v) for v in re.findall(r"\d+\.\d+", p["text"])] if lib["skill"] == "probability-2" else []
            values = ([as_fraction(a["value"])] if keyed else []) + given
            if any(not 0 <= v <= 1 for v in values):
                found.append(f"{lib['skill']} L{lib['level'] + 1} row {i}: {p['text']} has a probability outside 0 to 1")
    return found


# --- The Unit Circle ---------------------------------------------------------
#
# Every exact value is worked out again with the calculator, from the angle
# the text gives in degrees or as a multiple of π, and the stored a + b√r
# must agree (exact_holds). A sign or a quadrant is read off the calculator's
# value; a ratio from a point is y/x and the rest, after checking the point
# is on the circle. A value from one ratio places θ in its quadrant with the
# inverse function and evaluates the other there, with no triangle.

UC_ANGLE = r"(-?\d+(?:/\d+ pi)?)"
UC = {
    "sin": math.sin, "cos": math.cos, "tan": math.tan,
    "sec": lambda t: 1 / math.cos(t), "csc": lambda t: 1 / math.sin(t), "cot": lambda t: math.cos(t) / math.sin(t),
}
ROMAN = {"I": 1, "II": 2, "III": 3, "IV": 4}


def uc_angle(written: str) -> float:
    """Radians, from 210 (degrees) or 7/6 pi."""
    written = str(written)
    if written.endswith(" pi"):
        return float(Fraction(written[:-3])) * math.pi
    return math.radians(int(written))


def uc_quadrant_signs(q: int) -> tuple:
    """(cos, sin) signs at the middle of quadrant q."""
    t = math.radians(45 + 90 * (q - 1))
    return (math.cos(t) > 0, math.sin(t) > 0)


def uc_sign(fn: str, angle: str) -> str:
    v = UC[fn](uc_angle(angle))
    assert abs(v) > 1e-9, f"{fn} {angle} is zero"
    return "positive" if v > 0 else "negative"


def uc_sign_in_quadrant(fn: str, q: str) -> str:
    return "positive" if UC[fn](math.radians(45 + 90 * (ROMAN[q] - 1))) > 0 else "negative"


def uc_quadrant_from_signs(f: str, sf: str, g: str, sg: str) -> str:
    fits = [name for name, q in ROMAN.items()
            if (UC[f](math.radians(45 + 90 * (q - 1))) > 0) == (sf == "+")
            and (UC[g](math.radians(45 + 90 * (q - 1))) > 0) == (sg == "+")]
    return fits[0] if len(fits) == 1 else f"ambiguous {fits}"


def uc_defined(fn: str, angle: str) -> str:
    t = uc_angle(angle)
    below = math.cos(t) if fn == "tan" else math.sin(t)
    if abs(below) < 1e-12:
        return "undefined"
    return str(round(UC[fn](t)))


def uc_from_point(fn: str, x: str, y: str) -> Fraction:
    X, Y = Fraction(x), Fraction(y)
    assert X * X + Y * Y == 1, f"({x}, {y}) is not on the unit circle"
    return {"sin": Y, "cos": X, "tan": Y / X, "sec": 1 / X, "csc": 1 / Y, "cot": X / Y}[fn]


# requiem: catalogue/content/one-ratio-fixes-the-quadrant
def uc_from_ratio(fn: str, value: str, q: str, want: str) -> float:
    v = Fraction(value)
    t0 = {"sin": math.asin, "cos": math.acos, "tan": math.atan}[fn](abs(float(v)))
    t = [t0, math.pi - t0, math.pi + t0, 2 * math.pi - t0][ROMAN[q] - 1]
    if (UC[fn](t) > 0) != (v > 0):
        return math.nan  # the given ratio cannot have that sign in that quadrant
    return UC[want](t)


EXACT_RULES += (
    (re.compile(rf"^exact: (sin|cos|tan|sec|csc|cot) {UC_ANGLE}$"), lambda f, a: UC[f](uc_angle(a))),
    (re.compile(rf"^point coordinate: (x|y), {UC_ANGLE}$"), lambda c, a: (math.cos if c == "x" else math.sin)(uc_angle(a))),
    (re.compile(r"^from ratio: (sin|cos|tan) (-?\d+/\d+), quadrant (I|II|III|IV), want (\w+)$"), uc_from_ratio),
    # A rational value goes in the roots box too, so the box tells nothing.
    (re.compile(r"^ratio from point: (tan|sec|csc|cot), (-?\d+/\d+), (-?\d+/\d+)$"), lambda f, x, y: float(uc_from_point(f, x, y))),
)

BY_RULE += (
    (re.compile(r"^ratio from point: (tan|sec|csc|cot), (-?\d+/\d+), (-?\d+/\d+)$"), uc_from_point),
    # A rational value from one ratio: the calculator's value, which is a
    # fraction with a small denominator when the sides are a triple.
    (re.compile(r"^from ratio: (sin|cos|tan) (-?\d+/\d+), quadrant (I|II|III|IV), want (\w+)$"),
     lambda *g: Fraction(uc_from_ratio(*g)).limit_denominator(1000)),
)

CHOICE_RULES += (
    (re.compile(rf"^sign: (sin|cos|tan|sec|csc|cot) {UC_ANGLE}$"), uc_sign),
    (re.compile(r"^sign in quadrant: (sin|cos|tan|sec|csc|cot) (I|II|III|IV)$"), uc_sign_in_quadrant),
    (re.compile(r"^quadrant from signs: (\w+) ([+-]), (\w+) ([+-])$"), uc_quadrant_from_signs),
    (re.compile(rf"^defined: (tan|cot) {UC_ANGLE}$"), uc_defined),
)


# requiem: catalogue/content/reciprocals-after-their-level
# sec, csc and cot are taught on sec, csc, cot (L5): Signs by Quadrant (L2)
# and Tangent (L4) ask only about sin, cos and tan.
for level in (1, 3):
    path = LIB / f"unit-circle-{level}.json"
    if path.exists():
        for i, p in enumerate(json.loads(path.read_text())["problems"]):
            if re.search(r"\b(sec|csc|cot)\b", p["text"]):
                problems.append(f"unit-circle L{level + 1} row {i}: {p['text']} asks about a reciprocal before L5")


# --- Graphs of Sine & Cosine -------------------------------------------------
#
# The equation in each text is the one the student reads, and it is evaluated
# here as written, with nothing taken from the generator's parameters: the
# period is the smallest shift that maps the wave onto itself, the maximum
# and minimum are found by searching one period, and the amplitude and
# midline follow from those. A phase shift is tested by sliding (or lifting)
# the parent wave and comparing, and exactly one option may fit. A model is
# turned into its wave and measured the same way.

TG_SAFE = re.compile(r"^[\d\s+\-*/().xπsincopi]+$")


def tg_wave(rhs: str):
    """y as a function of x, from '−3 sin(2x) + 1' written in ASCII."""
    s = rhs.replace("pi", "π")
    assert TG_SAFE.match(s), f"unexpected characters in {rhs!r}"
    # A bare argument, sin 2x, is read as sin(2x), as on paper.
    s = re.sub(r"\b(sin|cos) (\d*x)\b", r"\1(\2)", s)
    s = re.sub(r"(?<=[\dxπ)])\s*(?=[xπ(]|sin|cos)", "*", s).replace("π", "pi")
    return eval(f"lambda x: {s}", {"__builtins__": {}, "sin": math.sin, "cos": math.cos, "pi": math.pi})


TG_TESTS = (0.31, 1.07, 2.42, 3.71, 5.23, 7.9, -1.6, 11.3)
TG_PERIODS = sorted(
    [(n / d * math.pi, ("pi", Fraction(n, d))) for d in (1, 2, 3, 4, 6, 8, 12) for n in range(1, 8 * d + 1)]
    + [(n / d, ("plain", Fraction(n, d))) for d in (1, 2, 4, 5, 10) for n in range(1, 30 * d + 1)]
)


def tg_period(f):
    for p, kind in TG_PERIODS:
        if all(abs(f(x + p) - f(x)) < 1e-9 for x in TG_TESTS):
            return p, kind
    raise AssertionError("no period found")


def tg_extreme(f, p: float, top: bool) -> Fraction:
    sign = 1 if top else -1
    n = 720
    xs = [p * i / n for i in range(n)]
    best = max(xs, key=lambda x: sign * f(x))
    lo, hi = best - p / n, best + p / n
    for _ in range(80):  # golden-section search near the best sample
        m1, m2 = lo + (hi - lo) * 0.382, lo + (hi - lo) * 0.618
        if sign * f(m1) < sign * f(m2):
            lo = m1
        else:
            hi = m2
    v = f((lo + hi) / 2)
    q = Fraction(round(v * 12), 12)
    assert abs(v - q) < 1e-6, f"extreme {v} is not a twelfth"
    return q


def tg_feature(f, want: str) -> Fraction:
    p, (kind, coef) = tg_period(f)
    if want.startswith("period"):
        assert (kind == "pi") == want.endswith("(pi)"), f"period {p} asked {want}"
        return coef
    top, bottom = tg_extreme(f, p, True), tg_extreme(f, p, False)
    return {"amplitude": (top - bottom) / 2, "midline": (top + bottom) / 2, "max": top, "min": bottom}[want]


def tg_options(written: str) -> dict:
    return dict(part.split(": ", 1) for part in written.split(" | "))


def tg_shift(rhs: str, base_rhs: str, options: str) -> str:
    f, base = tg_wave(rhs), tg_wave(base_rhs)
    fits = []
    for oid, opt in tg_options(options).items():
        way, amount = opt.split(" ", 1)
        v = float(Fraction(amount.removesuffix(" pi"))) * math.pi
        moved = {"right": lambda x: base(x - v), "left": lambda x: base(x + v),
                 "up": lambda x: base(x) + v, "down": lambda x: base(x) - v}[way]
        if all(abs(f(x) - moved(x)) < 1e-9 for x in TG_TESTS):
            fits.append(oid)
    return fits[0] if len(fits) == 1 else f"fits {fits}"


def tg_from_graph(x1: str, top: str, x2: str, bottom: str, options: str) -> str:
    """The one sinusoid with a peak at (x1, top) and the next trough at (x2, bottom)."""
    a, b = float(Fraction(x1)) * math.pi, float(Fraction(x2)) * math.pi
    hi, lo = int(top), int(bottom)
    drawn = lambda x: (hi + lo) / 2 + (hi - lo) / 2 * math.cos(math.pi * (x - a) / (b - a))
    fits = [oid for oid, opt in tg_options(options).items()
            if all(abs(tg_wave(opt.removeprefix("y = "))(x) - drawn(x)) < 1e-9 for x in TG_TESTS)]
    return fits[0] if len(fits) == 1 else f"fits {fits}"


def tg_ferris(dia, unit, center, turn, want) -> Fraction:
    r = Fraction(dia, 2)
    f = lambda t: center - float(r) * math.cos(2 * math.pi * t / turn)
    return 2 / tg_feature(f, "period") if want == "b (pi)" else tg_feature(f, want)


def tg_ferris_height(dia, unit, center, turn, t, places) -> Fraction:
    t = float(t)
    angle = 2 * math.pi * t / turn
    x = center - dia / 2 * math.cos(angle)
    if places is None:
        q = Fraction(round(x))
        assert abs(x - q) < 1e-9, f"height {x} is not whole"
        return q
    return trig_agree(x, center - dia / 2 * round(math.cos(angle), 4), int(places))


def tg_tide(high, unit, low, half, want) -> Fraction:
    h = float(half)
    f = lambda t: (high + low) / 2 + (high - low) / 2 * math.cos(math.pi * t / h)
    return tg_feature(f, want)


def tg_cycle(lo, hi, period, want) -> Fraction:
    p = Fraction(str(period))
    f = lambda t: (hi + lo) / 2 + (hi - lo) / 2 * math.cos(2 * math.pi * t / float(p))
    return 2 / tg_feature(f, "period") if want == "b (pi)" else tg_feature(f, want)


BY_RULE += (
    (re.compile(r"^wave(?: graph)?: y = (.+); want (amplitude|midline|max|min|period(?: \(pi\))?)$"),
     lambda rhs, want: tg_feature(tg_wave(rhs), want)),
    (re.compile(r"^ferris: diameter (\d+) (ft|m), center (\d+), turn (\d+) min; want (amplitude|midline|max|min|period|b \(pi\))$"), tg_ferris),
    (re.compile(r"^ferris: diameter (\d+) (ft|m), center (\d+), turn (\d+) min; want height at ([\d.]+)(?: to (\d) dp)?$"), tg_ferris_height),
    (re.compile(r"^tide: high (\d+) (ft|m), low (\d+), half cycle ([\d.]+) h; want (amplitude|midline|period)$"), tg_tide),
    (re.compile(r"^temperature: low (-?\d+), high (\d+) (?:C|F); want (amplitude|midline|period|b \(pi\))$"),
     lambda lo, hi, want: tg_cycle(int(lo), hi, 12, want)),
    (re.compile(r"^spring: between (\d+) and (\d+) (?:cm|in), cycle ([\d.]+) s; want (amplitude|midline|period|b \(pi\))$"), tg_cycle),
)

CHOICE_RULES += (
    (re.compile(r"^shift: y = (.+) from y = (.+); options (.+)$"), tg_shift),
    (re.compile(r"^graph equation: peak \((-?\d+/\d+) pi, (-?\d+)\), trough \((-?\d+/\d+) pi, (-?\d+)\); options (.+)$"), tg_from_graph),
)


# requiem: catalogue/content/wave-graphs-drawn-from-their-equation
# A graph is the student's only copy of the wave, so every point drawn must
# lie on the equation the text names (the stored option, for Equation From a
# Graph): x is drawn on exact tenths, so y may differ by the 0.05 of its own
# rounding and no more, and every dot is a true peak or trough.
for path in sorted(LIB.glob("trig-graphs-*.json")):
    for i, p in enumerate(json.loads(path.read_text())["problems"]):
        if not p.get("visual"):
            continue
        where = f"trig-graphs L{int(path.stem.rsplit('-', 1)[1]) + 1} row {i}"
        m = re.match(r"^wave graph: y = (.+?);", p["text"])
        if m:
            rhs = m[1]
        else:
            rhs = tg_options(p["text"].split("; options ", 1)[1])[p["answer"]["value"]].removeprefix("y = ")
        f = tg_wave(rhs)
        period, _ = tg_period(f)
        hi, lo = tg_extreme(f, period, True), tg_extreme(f, period, False)
        curves = [mk for mk in p["visual"]["marks"] if mk["kind"] == "path"]
        assert len(curves) == 1, where
        off = [pt for pt in curves[0]["points"] if abs(f(pt[0]) - pt[1]) > 0.0501]
        if off:
            problems.append(f"{where}: the drawn wave leaves y = {rhs} at {off[0]}")
        for dot in (mk["at"] for mk in p["visual"]["marks"] if mk["kind"] == "point"):
            if min(abs(dot[1] - float(hi)), abs(dot[1] - float(lo))) > 0.0501 or abs(f(dot[0]) - dot[1]) > 0.1:
                problems.append(f"{where}: the dot at {dot} is not a peak or trough of y = {rhs}")
        # requiem: catalogue/content/wave-ticks-fit-b
        # Every peak and trough is read off the x-axis, so each sits on a tick
        # (or on the y-axis): a dot between two ticks cannot be read.
        ticks = [mk["from"][0] for mk in p["visual"]["marks"]
                 if mk["kind"] == "segment" and mk["from"][0] == mk["to"][0] and abs(mk["from"][1] + 0.12) < 1e-9]
        for dot in (mk["at"] for mk in p["visual"]["marks"] if mk["kind"] == "point"):
            if abs(dot[0]) > 0.051 and all(abs(dot[0] - x) > 0.051 for x in ticks):
                problems.append(f"{where}: the dot at {dot} of y = {rhs} falls between the ticks")


# requiem: catalogue/content/special-triangle-leg-from-the-mark
# A 30-60-90 question names no leg, so the figure must: its marked angle is
# the one in the text, and the given length and the x sit on the sides the
# text places them, read off the drawing (the side not touching the marked
# corner is opposite; of the two touching it, the one meeting the right
# angle is adjacent).
for path in sorted(LIB.glob("trig-ratios-*.json")):
    for i, p in enumerate(json.loads(path.read_text())["problems"]):
        m = re.match(r"^special 30: angle (30|60), (\w+) (\S+), want (\w+)$", p["text"])
        if not m:
            continue
        where = f"trig-ratios L{int(path.stem.rsplit('-', 1)[1]) + 1} row {i}"
        marks = p["visual"]["marks"]
        sides = [(tuple(mk["from"]), tuple(mk["to"])) for mk in marks if mk["kind"] == "segment"][:3]
        corners = {c for seg in sides for c in seg}
        labels = {mk["label"]: mk["at"] for mk in marks if mk["kind"] == "text"}
        d = lambda u, v: math.hypot(u[0] - v[0], u[1] - v[1])
        if f"{m[1]}°" not in labels or "x" not in labels or m[3] not in labels:
            problems.append(f"{where}: the figure does not mark {m[1]}°, {m[3]} and x")
            continue
        A = min(corners, key=lambda c: d(c, labels[f"{m[1]}°"]))
        def right_angle(c):
            u, v = [q for seg in sides if c in seg for q in seg if q != c]
            return abs((u[0] - c[0]) * (v[0] - c[0]) + (u[1] - c[1]) * (v[1] - c[1])) < 1e-6
        R = next(c for c in corners if right_angle(c))
        role = {}
        for seg in sides:
            role[seg] = "opposite" if A not in seg else "adjacent" if R in seg else "hypotenuse"
        near = lambda at: role[min(sides, key=lambda seg: d(at, ((seg[0][0] + seg[1][0]) / 2, (seg[0][1] + seg[1][1]) / 2)))]
        if A == R or near(labels[m[3]]) != m[2] or near(labels["x"]) != m[4]:
            problems.append(f"{where}: the figure does not put {m[3]} on the {m[2]} and x on the {m[4]}")


# --- Trig Identities ---------------------------------------------------------
#
# Each expression is the ASCII the student's version is drawn from, evaluated
# here at seven angles (t for θ). A "simplify" question, or a proof's next
# step, must have exactly one option equal to the expression (or to the
# proof's last line), and every line of a proof must equal the one before.
# A value is worked out at an angle placed in its quadrant by the inverse
# function; one that needs no quadrant is evaluated at both angles the given
# ratio allows, and they must agree.

ID_NAMES = {
    "sin": math.sin, "cos": math.cos, "tan": math.tan,
    "sec": lambda x: 1 / math.cos(x), "csc": lambda x: 1 / math.sin(x), "cot": lambda x: math.cos(x) / math.sin(x),
    "sqrt": math.sqrt, "pi": math.pi,
}
ID_TESTS = (0.37, 0.91, 1.23, 2.05, 2.71, 4.0, 5.3)


def id_expr(written: str):
    words = set(re.findall(r"[a-z]+", written))
    assert words <= set(ID_NAMES) | {"t", "a", "b"}, f"unexpected names in {written!r}"
    assert re.fullmatch(r"[\w\s+\-*/().^]+", written), f"unexpected characters in {written!r}"
    return eval(f"lambda t=0, a=0, b=0: {written.replace('^', '**')}", {"__builtins__": {}, **ID_NAMES})


# α and β beside each θ, for the proofs of the sum formulas.
ID_AB = ((0.53, 1.37), (2.2, -0.41), (1.05, 0.88), (-1.6, 2.9), (4.4, 0.3), (0.12, -2.75), (3.3, 1.71))


def id_same(e1: str, e2: str) -> bool:
    f, g = id_expr(e1), id_expr(e2)
    return all(abs(f(t, a, b) - g(t, a, b)) <= 1e-9 * max(1, abs(f(t, a, b))) for t, (a, b) in zip(ID_TESTS, ID_AB))


# requiem: catalogue/content/identity-choices-have-one-equal-option
def id_pick(expr: str, options: str) -> str:
    fits = [oid for oid, opt in tg_options(options).items() if id_same(expr, opt)]
    return fits[0] if len(fits) == 1 else f"fits {fits}"


# requiem: catalogue/content/proof-step-is-new-and-equal
def id_proof(goal: str, so_far: str, options: str) -> str:
    left, right = goal.split(" = ")
    lines = so_far.split(" = ")
    if not id_same(left, right):
        return "the goal is not an identity"
    if lines[0] != left or any(not id_same(x, y) for x, y in zip(lines, lines[1:])):
        return "a line so far is not equal to the one before"
    # The next line is equal to the last and new: an equal option that is a
    # line already written is a step back, which the question rules out.
    fits = [oid for oid, opt in tg_options(options).items() if id_same(lines[-1], opt) and opt not in lines]
    return fits[0] if len(fits) == 1 else f"fits {fits}"


def id_place(fn: str, value: str, q: str) -> float:
    """An angle in quadrant q with fn of it equal to value."""
    v = Fraction(value)
    t0 = {"sin": math.asin, "cos": math.acos, "tan": math.atan}[fn](abs(float(v)))
    t = [t0, math.pi - t0, math.pi + t0, 2 * math.pi - t0][ROMAN[q] - 1]
    assert (ID_NAMES[fn](t) > 0) == (v > 0), f"{fn} = {value} cannot be in quadrant {q}"
    return t


def id_either(fn: str, value: str, want: str) -> float:
    """want, which must not depend on which angle with fn = value is meant."""
    v = float(Fraction(value))
    t0 = {"sin": math.asin, "cos": math.acos, "tan": math.atan}[fn](v)
    t1 = {"sin": math.pi - t0, "cos": -t0, "tan": t0 + math.pi}[fn]
    f = id_expr(want)
    x, y = f(t0), f(t1)
    assert abs(x - y) < 1e-9, f"{want} differs between the two angles with {fn} = {value}"
    return x


def id_reciprocal(f: str, v: str, g, w, want: str) -> float:
    if g is None:
        assert want == {"sin": "csc", "cos": "sec", "tan": "cot"}[f], f"{want} needs more than {f}"
        return id_either(f, v, f"{want}(t)")
    s, c = Fraction(v), Fraction(w)
    assert s * s + c * c == 1, f"sin {v} and cos {w} are not on the unit circle"
    return ID_NAMES[want](math.atan2(float(s), float(c)))


def id_cofunction_pair(f: str, a: int, g: str) -> int:
    fits = [x for x in range(1, 90) if abs(ID_NAMES[g](math.radians(x)) - ID_NAMES[f](math.radians(a))) < 1e-9]
    assert len(fits) == 1, f"{f} {a} = {g} of {fits}"
    return fits[0]


def id_cofunction_rad(f: str, n: int, d: int, g: str) -> Fraction:
    want = ID_NAMES[f](math.pi * n / d)
    fits = {Fraction(k, m) for m in range(1, 37) for k in range(1, m) if Fraction(k, m) < Fraction(1, 2)
            and abs(ID_NAMES[g](math.pi * k / m) - want) < 1e-9}
    assert len(fits) == 1, f"{f} {n}/{d} pi = {g} of {fits}"
    return fits.pop()


def id_exact_choice(f: str, angle: str, options: str) -> str:
    want = ID_NAMES[f](uc_angle(angle))
    fits = [oid for oid, opt in tg_options(options).items() if abs(id_expr(opt)() - want) < 1e-9]
    return fits[0] if len(fits) == 1 else f"fits {fits}"


def id_sum(f: str, v: str, q: str, g: str, w: str, r: str, want: str) -> float:
    return id_expr(want)(a=id_place(f, v, q), b=id_place(g, w, r))


def id_double(f: str, v: str, q: str, want: str) -> float:
    return id_expr(want)(t=id_place(f, v, q))


id_ratio = lambda solve: lambda *g: Fraction(solve(*g)).limit_denominator(100000)
ID_VALUE = r"^identity value: (.+) at (-?\d+(?:/\d+ pi)?)$"

EXACT_RULES += (
    (re.compile(ID_VALUE), lambda e, a: id_expr(e)(uc_angle(a))),
)

BY_RULE += (
    (re.compile(ID_VALUE), id_ratio(lambda e, a: id_expr(e)(uc_angle(a)))),
    (re.compile(r"^reciprocal: (sin|cos|tan) (-?\d+/\d+)(?:, (cos) (-?\d+/\d+))?, want (\w+)$"), id_ratio(id_reciprocal)),
    (re.compile(r"^(?:even odd|cofunction of): (sin|cos|tan) (-?\d+/\d+), want (.+)$"), id_ratio(id_either)),
    (re.compile(r"^cofunction pair: (\w+) (\d+) = (\w+) \?$"), id_cofunction_pair),
    (re.compile(r"^cofunction rad: (\w+) (\d+)/(\d+) pi = (\w+) \?$"), id_cofunction_rad),
    (re.compile(r"^sum: (sin) a (-?\d+/\d+) quadrant (I|II|III|IV), (cos) b (-?\d+/\d+) quadrant (I|II|III|IV), want (.+)$"), id_ratio(id_sum)),
    (re.compile(r"^double: (sin|cos|tan) (-?\d+/\d+), quadrant (I|II|III|IV), want (.+)$"), id_ratio(id_double)),
)

CHOICE_RULES += (
    (re.compile(r"^trig simplify: (.+?); options (.+)$"), id_pick),
    (re.compile(r"^proof: goal (.+?); so far (.+?); options (.+)$"), id_proof),
    (re.compile(r"^exact choice: (sin|cos|tan) (-?\d+(?:/\d+ pi)?); options (.+)$"), id_exact_choice),
)

# --- Trig Equations ----------------------------------------------------------
#
# Every root is found here numerically, with no table of special angles: the
# equation is evaluated in degrees at every 2.5° (where each exact solution
# falls), and between every 0.25° a change of sign that is not a jump across
# tangent's asymptote is narrowed to a root by bisection. A typed set must be
# exactly those roots, an option set the one of four that is, and a general
# solution's members over two turns either way must be the roots there.

from decimal import Decimal, ROUND_HALF_UP  # noqa: E402

TE_DEG = {
    "sin": lambda t: math.sin(math.radians(t)), "cos": lambda t: math.cos(math.radians(t)),
    "tan": lambda t: math.tan(math.radians(t)), "sqrt": math.sqrt,
}
# Every quarter degree in one turn: each exact solution, and any slip near one.
TE_TURN = [Fraction(k, 4) for k in range(1440)]


def te_f(equation: str):
    lhs, rhs = equation.split(" = ")
    assert re.fullmatch(r"[\w\s+\-*/().^]+", equation.replace("=", "")), equation
    assert set(re.findall(r"[a-z]+", equation)) <= set(TE_DEG) | {"x"}, equation
    src = f"lambda x: ({lhs}) - ({rhs})".replace("^", "**")
    return eval(src, {"__builtins__": {}, **TE_DEG})


def te_roots(equation: str, lo: float, hi: float) -> list:
    f = te_f(equation)
    roots = []
    add = lambda r: roots.append(r) if not any(abs(r - s) < 1e-6 for s in roots) else None
    k = math.ceil(lo / 2.5)
    while k * 2.5 < hi:
        if abs(f(k * 2.5)) < 1e-9:
            add(k * 2.5)
        k += 1
    step = 0.25
    a = lo
    while a < hi - 1e-12:
        b = min(a + step, hi)
        fa, fb = f(a), f(b)
        if fa * fb < 0 and abs(fa - fb) < 10:
            x0, x1 = a, b
            for _ in range(60):
                m = (x0 + x1) / 2
                if f(x0) * f(m) <= 0:
                    x1 = m
                else:
                    x0 = m
            if lo <= x0 < hi:
                add(x0)
        a = b
    return sorted(roots)


def te_on_turn(equation: str) -> OnGrid:
    roots = te_roots(equation, 0, 360)
    hits = {g for g in TE_TURN if any(abs(float(g) - r) < 1e-6 for r in roots)}
    assert len(hits) == len(roots), f"{equation}: a root off the quarter-degree grid in {roots}"
    return on_grid(hits, TE_TURN)


def te_options(listing: str) -> dict:
    out = {}
    for part in listing.split(" | "):
        oid, body = part.split(": ", 1)
        out[oid] = body
    return out


def te_radians(equation: str, listing: str) -> str:
    roots = te_roots(equation, 0, 360)
    fit = []
    for oid, body in te_options(listing).items():
        xs = [] if body == "none" else sorted(float(Fraction(c)) * 180 for c in body.split(", "))
        if len(xs) == len(roots) and all(abs(a - b) < 1e-6 for a, b in zip(xs, roots)):
            fit.append(oid)
    return fit[0] if len(fit) == 1 else f"{len(fit)} options are the roots {roots}"


def te_general(equation: str, listing: str) -> str:
    roots = te_roots(equation, -720, 720)
    fit = []
    for oid, body in te_options(listing).items():
        members = set()
        for fam in body.split(", "):
            b, p = fam.split("@")
            base, period = float(Fraction(b)) * 180, float(Fraction(p)) * 180
            x = base - 8 * 360
            while x < 720 - 1e-9:
                if x >= -720 - 1e-9:
                    members.add(round(x, 6))
                x += period
        xs = sorted(members)
        if len(xs) == len(roots) and all(abs(a - b) < 1e-6 for a, b in zip(xs, roots)):
            fit.append(oid)
    return fit[0] if len(fit) == 1 else f"{len(fit)} options are the roots {roots}"


TE_INV = {"sin": math.asin, "cos": math.acos, "tan": math.atan}


def te_value(written) -> float:
    written = str(written)
    assert re.fullmatch(r"[-\d*/()sqrt]+", written), written
    return eval(written, {"__builtins__": {}, "sqrt": math.sqrt})


def te_inverse(unit: str, fn: str, written: str) -> Fraction:
    t = TE_INV[fn](te_value(written))
    if unit == "rad":
        k = Fraction(t / math.pi).limit_denominator(12)
        assert abs(float(k) * math.pi - t) < 1e-9, f"a{fn}({written}) is not a multiple of π"
        return k
    d = round(math.degrees(t))
    assert abs(math.degrees(t) - d) < 1e-9, f"a{fn}({written}) is not a whole degree"
    return Fraction(d)


def te_calc(unit: str, fn: str, x: str, places: int) -> Fraction:
    t = TE_INV[fn](float(x))
    v = t if unit == "rad" else math.degrees(t)
    return Fraction(Decimal(repr(v)).quantize(Decimal(1).scaleb(-places), rounding=ROUND_HALF_UP))


def te_undo(unit: str, fn: str, angle) -> Fraction:
    """sin⁻¹(sin θ) by the calculator: the inverse of the value, not θ."""
    angle = str(angle)
    t = float(Fraction(angle[:-3])) * math.pi if angle.endswith(" pi") else math.radians(int(angle))
    v = {"sin": math.sin, "cos": math.cos, "tan": math.tan}[fn](t)
    out = TE_INV[fn](v)
    if unit == "rad":
        k = Fraction(out / math.pi).limit_denominator(12)
        assert abs(float(k) * math.pi - out) < 1e-9, f"a{fn}({fn}({angle})) is not a multiple of π"
        return k
    d = round(math.degrees(out))
    assert abs(math.degrees(out) - d) < 1e-9
    return Fraction(d)


def te_compose(outer: str, fn: str, n, d) -> Fraction:
    v = {"sin": math.sin, "cos": math.cos, "tan": math.tan}[outer](TE_INV[fn](int(n) / int(d)))
    out = Fraction(v).limit_denominator(1000)
    assert abs(float(out) - v) < 1e-9, f"{outer}(a{fn}({n}/{d})) is not rational"
    return out


def te_on_window(lo: str, hi: str, equation: str) -> OnGrid:
    """The roots from lo to hi degrees, on that window's quarter degrees."""
    grid = [Fraction(k, 4) for k in range(4 * int(lo), 4 * int(hi))]
    roots = te_roots(equation, int(lo), int(hi))
    hits = {g for g in grid if any(abs(float(g) - r) < 1e-6 for r in roots)}
    assert len(hits) == len(roots), f"{equation}: a root off the quarter-degree grid in {roots}"
    return on_grid(hits, grid)


SET_RULES += (
    (re.compile(r"^solve degrees: (.+)$"), te_on_turn),
    (re.compile(r"^solve degrees from (-?\d+) to (-?\d+): (.+)$"), te_on_window),
)

CHOICE_RULES += (
    (re.compile(r"^solve radians: (.+); options (.+)$"), te_radians),
    (re.compile(r"^general: (.+); options (.+)$"), te_general),
)

BY_RULE += (
    (re.compile(r"^inverse (rad|deg): a(sin|cos|tan)\((.+)\)$"), te_inverse),
    (re.compile(r"^inverse calc (rad|deg): a(sin|cos|tan)\((-?[\d.]+)\) to (\d) dp$"), te_calc),
    (re.compile(r"^undo (rad|deg): a(sin|cos|tan)\((?:sin|cos|tan)\((-?\d+(?:/\d+ pi)?)\)\)$"), te_undo),
    (re.compile(r"^compose: (sin|cos|tan)\(a(sin|cos|tan)\((-?\d+)/(\d+)\)\)$"), te_compose),
)

# requiem: catalogue/content/choice-labels-distinct
# Two options that read the same are one option shown twice: the right one
# twice made a free guess of a half, a wrong one twice a decoy wasted. Held
# for every skill: options built from sets, lists and numbers print alike
# more often than anyone expects (2 + 2 and 2 × 2, two slips leaving one list).
for path in sorted(LIB.glob("*.json")):
    if path.name in ("manifest.json", "schemas.json"):
        continue
    for i, p in enumerate(json.loads(path.read_text())["problems"]):
        if p["answer"]["type"] != "choice":
            continue
        labels = [json.dumps(o["label"], ensure_ascii=False) for o in p["answer"]["options"]]
        if len(set(labels)) != len(labels):
            problems.append(f"{path.stem} row {i}: two options read the same, {labels}")

# --- Domain & Range ----------------------------------------------------------
#
# A formula's domain is found by trying it, in exact rationals, at every
# twelfth from −40 to 40: a negative under a square root or a zero
# denominator leaves that x out. A range is found from the values: the
# formula is evaluated every 1/64 from −40 to 40 and at points doubling
# rightward from there (where √x keeps climbing), each step whose midpoint
# lies between its ends (so not a leap across an asymptote) covers every
# height between them, and a height counts only where some step covers it.
# A graph's domain and range come from walking its pieces, and a piecewise
# value from the one piece whose condition holds.

DR_X = [Fraction(k, 12) for k in range(-480, 481)]
DR_Y = [Fraction(k, 2) for k in range(-40, 41)]


def dr_root(v):
    if v < 0:
        raise ValueError("negative under a root")
    return math.sqrt(v)


def dr_cbrt(v):
    return math.copysign(abs(float(v)) ** (1 / 3), float(v))


DR_NAMES = {"sqrt": dr_root, "cbrt": dr_cbrt, "abs": abs, "floor": math.floor, "ceil": math.ceil}


def dr_fn(expr: str, var: str = "x"):
    assert re.fullmatch(r"[\w\s+\-*/().]+", expr), expr
    assert set(re.findall(r"[a-z]+", expr)) <= set(DR_NAMES) | {var}, expr
    return eval(f"lambda {var}: {expr}", {"__builtins__": {}, **DR_NAMES})


def dr_defined(f, x) -> bool:
    try:
        v = f(x)
    except (ValueError, ZeroDivisionError, OverflowError):
        return False
    return not isinstance(v, complex)


def dr_domain(expr: str) -> OnGrid:
    f = dr_fn(expr)
    return on_grid({x for x in DR_X if dr_defined(f, x)}, DR_X)


def dr_range(expr: str) -> OnGrid:
    f = dr_fn(expr)
    # Every 1/64 near the middle, then doubling to the right, so a slow riser like
    # √x still climbs past every height sampled.
    far = [40 * 2 ** j for j in range(1, 20)]
    xs = [k / 64 for k in range(-40 * 64, 40 * 64 + 1)] + far
    def val(x):
        try:
            v = float(f(Fraction(x)))
        except (ValueError, ZeroDivisionError, OverflowError, TypeError):
            return None
        return v

    spans = []
    prev = None
    for x in xs:
        v = val(x)
        if v is not None and prev is not None and prev[1] is not None:
            m = val((prev[0] + x) / 2)
            lo, hi = sorted((prev[1], v))
            if m is not None and lo - 1e-12 <= m <= hi + 1e-12:
                spans.append((lo, hi))
        prev = (x, v)
    return on_grid({y for y in DR_Y if any(lo <= y <= hi for lo, hi in spans)}, DR_Y)


DR_PIECE = re.compile(r"^(closed|open|arrow) ((?:\(-?\d+, -?\d+\) ?)+) (closed|open|arrow)$")


def dr_pieces(listing: str) -> list:
    out = []
    for part in listing.split(" | "):
        m = DR_PIECE.match(part)
        assert m, part
        pts = [(int(x), int(y)) for x, y in re.findall(PT, m[2])]
        assert [x for x, _ in pts] == sorted({x for x, _ in pts}), f"not a function: {part}"
        out.append((m[1], pts, m[3]))
    return out


def dr_in_domain(pieces, x) -> bool:
    for left, pts, right in pieces:
        x0, xn = pts[0][0], pts[-1][0]
        ok_lo = left == "arrow" or x > x0 or (x == x0 and left == "closed")
        ok_hi = right == "arrow" or x < xn or (x == xn and right == "closed")
        if ok_lo and ok_hi:
            return True
    return False


def dr_in_range(pieces, y) -> bool:
    for left, pts, right in pieces:
        n = len(pts)
        for i in range(n - 1):
            (xa, ya), (xb, yb) = pts[i], pts[i + 1]
            lo, hi = min(ya, yb), max(ya, yb)
            if i == 0 and left == "arrow" and ya != yb:
                lo, hi = (-math.inf, hi) if ya < yb else (lo, math.inf)
            if i == n - 2 and right == "arrow" and ya != yb:
                lo, hi = (lo, math.inf) if yb > ya else (-math.inf, hi)
            if not lo <= y <= hi:
                continue
            # Reached only at an open end of the piece is not reached.
            only_a = ya != yb and y == ya and not (i == 0 and left == "arrow")
            only_b = ya != yb and y == yb and not (i == n - 2 and right == "arrow")
            if only_a and i == 0 and left == "open":
                continue
            if only_b and i == n - 2 and right == "open":
                continue
            return True
    return False


def dr_graph(which: str, listing: str) -> frozenset:
    pieces = dr_pieces(listing)
    test = dr_in_domain if which == "domain" else dr_in_range
    return frozenset(v for v in SAMPLES_ON_LINE if test(pieces, v))


def dr_piecewise(listing: str, at) -> Fraction:
    x = int(at)
    hits = []
    for piece in listing.split("; "):
        expr, cond = piece.split(" if ")
        assert re.fullmatch(r"[-\d\s<=>x]+", cond), cond
        if eval(cond, {"__builtins__": {}}, {"x": x}):
            hits.append(dr_fn(expr)(Fraction(x)))
    assert len(hits) == 1, f"{len(hits)} pieces hold at x = {x} in {listing}"
    return Fraction(hits[0])


def dr_graph_value(listing: str, at) -> Fraction:
    x = int(at)
    hits = set()
    for left, pts, right in dr_pieces(listing):
        for i in range(len(pts) - 1):
            (xa, ya), (xb, yb) = pts[i], pts[i + 1]
            if not xa <= x <= xb:
                continue
            if (x == pts[0][0] and left == "open") or (x == pts[-1][0] and right == "open"):
                continue
            hits.add(Fraction(ya) + Fraction(yb - ya, xb - xa) * (x - xa))
    assert len(hits) == 1, f"{len(hits)} values at x = {x} on {listing}"
    return hits.pop()


def dr_step(expr: str) -> Fraction:
    exact = re.sub(r"\d+\.\d+", lambda m: f"Fraction('{m[0]}')", expr)
    return Fraction(eval(exact, {"__builtins__": {}, "Fraction": Fraction, **DR_NAMES}))


def dr_each(each, per, amount) -> Fraction:
    return Fraction(int(each) * math.ceil(Fraction(int(amount), int(per))), 100)


def dr_first(first, each, per, amount) -> Fraction:
    more = max(0, math.ceil(Fraction(int(amount) - int(per), int(per))))
    return Fraction(int(first) + int(each) * more, 100)


def dr_context(expr: str) -> frozenset:
    f = dr_fn(expr, "t")
    return frozenset(t for t in SAMPLES_ON_LINE if t >= 0 and f(t) >= 0)


DR_COUNTED = {"bags", "boxes", "bottles", "rolls", "cans", "coils"}
DR_MEASURED = {"pounds", "kilograms", "liters", "yards", "gallons", "meters"}


def dr_kind(unit: str, most: str, each: str, listing: str) -> str:
    assert unit in DR_COUNTED | DR_MEASURED, unit
    want = f"{'whole' if unit in DR_COUNTED else 'real'} {most}"
    fit = [oid for oid, body in te_options(listing).items() if body == want]
    return fit[0] if len(fit) == 1 else f"{len(fit)} options are {want}"


# requiem: catalogue/content/piecewise-and-step-ask-domain-range
def dr_rules(listing: str) -> list:
    """Each piece's rule and its condition, a chain like -3 <= x < 2."""
    out = []
    for piece in listing.split("; "):
        expr, cond = piece.split(" if ")
        assert re.fullmatch(r"-?\d+ <=? x <=? -?\d+", cond), cond
        out.append((dr_fn(expr), cond))
    return out


def dr_holds(cond: str, x) -> bool:
    return eval(cond, {"__builtins__": {}}, {"x": x})


def dr_piecewise_domain(listing: str) -> frozenset:
    rules = dr_rules(listing)
    return frozenset(x for x in SAMPLES_ON_LINE if any(dr_holds(c, x) for _, c in rules))


def dr_values(listing: str) -> OnGrid:
    """Every height f reaches, found by trying it at every twelfth its
    conditions allow: a line's height at a half is reached at a twelfth, a
    floor's at the first x of its step, and nothing else is reached."""
    seen = set()
    for f, cond in dr_rules(listing):
        for x in DR_X:
            if dr_holds(cond, x):
                seen.add(Fraction(f(x)))
    return on_grid(seen & set(DR_Y), DR_Y)


SET_RULES += (
    (re.compile(r"^domain: (.+)$"), dr_domain),
    (re.compile(r"^piecewise domain: (.+)$"), dr_piecewise_domain),
    (re.compile(r"^piecewise range: (.+)$"), dr_values),
    (re.compile(r"^step range: (.+)$"), dr_values),
    (re.compile(r"^range: (.+)$"), dr_range),
    (re.compile(r"^graph (domain|range): (.+)$"), dr_graph),
    (re.compile(r"^context domain: (.+) >= 0, t >= 0$"), dr_context),
)

BY_RULE += (
    (re.compile(r"^piecewise: (.+); at (-?\d+)$"), dr_piecewise),
    (re.compile(r"^piecewise graph: (.+); at (-?\d+)$"), dr_graph_value),
    (re.compile(r"^step value: (.+)$"), dr_step),
    (re.compile(r"^each started: (\d+) per (\d+), amount (\d+)$"), dr_each),
    (re.compile(r"^first then each: (\d+) then (\d+) per (\d+), amount (\d+)$"), dr_first),
)

CHOICE_RULES += (
    (re.compile(r"^context domain: (\w+), at most (\d+), each (\d+); options (.+)$"), dr_kind),
)

# requiem: catalogue/content/graph-pieces-drawn-as-told
# A graph is the student's only copy of the function, so each piece is drawn
# exactly as the text gives it: its corners in order, and at each end a
# filled dot, an open dot, or an arrowhead, never anything else.
for path in sorted(LIB.glob("domain-range-*.json")):
    for i, p in enumerate(json.loads(path.read_text())["problems"]):
        m = re.match(r"^(?:graph (?:domain|range)|piecewise graph): (.+?)(?:; at -?\d+)?$", p["text"])
        if not m:
            continue
        where = f"domain-range L{int(path.stem.rsplit('-', 1)[1]) + 1} row {i}"
        marks = p["visual"]["marks"]
        drawn_dots = sorted((tuple(mk["at"]), bool(mk.get("open"))) for mk in marks if mk["kind"] == "point")
        want_dots = []
        for left, pts, right in dr_pieces(m[1]):
            if not any([list(map(float, q)) for q in pts] == mk["points"] for mk in marks if mk["kind"] == "path"):
                problems.append(f"{where}: no curve is drawn through {pts}")
            for end, tip in ((left, pts[0]), (right, pts[-1])):
                if end == "arrow":
                    if not any(mk["kind"] == "path" and len(mk["points"]) == 3 and mk["points"][1] == list(map(float, tip)) for mk in marks):
                        problems.append(f"{where}: no arrowhead at {tip}")
                else:
                    want_dots.append(((float(tip[0]), float(tip[1])), end == "open"))
        if drawn_dots != sorted(want_dots):
            problems.append(f"{where}: dots drawn {drawn_dots}, not {sorted(want_dots)}")

# --- Combining Functions -----------------------------------------------------
#
# f and g are read from the text and combined or composed here, by putting
# one formula into the other as a string -- every x in f replaced by "(g)" --
# so the evaluator does the algebra and no rule for multiplying out is shared
# with the generator. A polynomial answer is compared by its coefficients and
# must be expanded and collected; a number is a whole number in its own box.
# A domain is found by trying f(g(x)) itself, unsimplified, along the line.

def cf_into(outer: str, inner: str) -> str:
    return re.sub(r"x", f"({inner})", outer)


def cf_combine(f: str, g: str, op: str, answer: str) -> str:
    return same_polynomial(f"({f}) {op} ({g})", answer)


def cf_compose(f: str, g: str, outer: str, inner: str, answer: str) -> str:
    fs = {"f": f, "g": g}
    return same_polynomial(cf_into(fs[outer], fs[inner]), answer)


# f(g(2)) is a whole number, typed in the whole-number box.
def cf_at(f: str, g: str, outer: str, inner: str, a) -> Fraction:
    fs = {"f": f, "g": g}
    return at(fs[outer], {"x": at(fs[inner], {"x": Fraction(int(a))})})


def cf_table(f: str, g: str, outer: str, inner: str, a) -> Fraction:
    fs = {"f": [int(v) for v in f.split(", ")], "g": [int(v) for v in g.split(", ")]}
    return Fraction(fs[outer][fs[inner][int(a)]])


# requiem: catalogue/content/composition-domain-level
def cf_domain(f: str, g: str) -> OnGrid:
    """Every twelfth at which f(g(x)), written out with g in brackets in
    place of f's x, can be worked out: g's own limits and f's on g(x) come
    from the evaluation itself, never from simplifying."""
    h = dr_fn(cf_into(f, g))
    return on_grid({x for x in DR_X if dr_defined(h, x)}, DR_X)


def cf_coefficients(src: str) -> list:
    """coefficients(), with a plain number allowed: an option can be one."""
    return coefficients(src) if re.search(r"[a-z]", src) else [evaluate(src)]


def cf_which(f: str, g: str, listing: str) -> str:
    want = cf_coefficients(cf_into(f, g))
    fit = [oid for oid, body in te_options(listing).items() if cf_coefficients(body) == want]
    return fit[0] if len(fit) == 1 else f"{len(fit)} options are f(g(x))"


# Equal at more points than the degree of the cross-multiplied difference --
# eight -- is equal everywhere; a point where either side divides by zero is
# skipped, and there are enough left over.
CF_POINTS = [Fraction(n, 3) for n in range(-30, 31)]


def cf_equal(a: str, b: str) -> bool:
    agreed = 0
    for x in CF_POINTS:
        try:
            u, v = at(a, {"x": x}), at(b, {"x": x})
        except ZeroDivisionError:
            continue
        if u != v:
            return False
        agreed += 1
    return agreed >= 20


def cf_finished(answer: str) -> bool:
    """Expanded and collected, or a number over x: no brackets left in it."""
    return expanded(answer) or bool(re.fullmatch(r"\d+/x", answer.strip()))


# requiem: catalogue/content/decompose-every-inside-accepted
def cf_inner(h: str, f: str, answer: str) -> str:
    if not cf_equal(cf_into(f, answer), h):
        return "is not an inside that gives h"
    return "ok" if cf_finished(answer) else "is not simplified"


def cf_outer(h: str, g: str, answer: str) -> str:
    if not cf_equal(cf_into(answer, g), h):
        return "is not an outside that gives h"
    return "ok" if cf_finished(answer) else "is not simplified"


def cf_same(f: str, g: str) -> str:
    # By value, since x³ inside x⁴ is past the degree coefficients() reads.
    return "a" if cf_equal(cf_into(f, g), cf_into(g, f)) else "b"


EXPR_RULES += (
    (re.compile(r"^combine: f\(x\) = (.+); g\(x\) = (.+); \(f ([-+*]) g\)\(x\)$"), cf_combine),
    (re.compile(r"^compose: f\(x\) = (.+); g\(x\) = (.+); ([fg])\(([fg])\(x\)\)$"), cf_compose),
    (re.compile(r"^decompose inner: h\(x\) = (.+); f\(x\) = (.+)$"), cf_inner),
    (re.compile(r"^decompose outer: h\(x\) = (.+); g\(x\) = (.+)$"), cf_outer),
)

BY_RULE += (
    (re.compile(r"^compose at: f\(x\) = (.+); g\(x\) = (.+); ([fg])\(([fg])\((-?\d+)\)\)$"), cf_at),
    (re.compile(r"^compose table: f ([\d, ]+) \| g ([\d, ]+); ([fg])\(([fg])\((\d)\)\)$"), cf_table),
)

SET_RULES += (
    (re.compile(r"^compose domain: f\(x\) = (.+); g\(x\) = (.+)$"), cf_domain),
)

CHOICE_RULES += (
    (re.compile(r"^which composition: f\(x\) = (.+); g\(x\) = (.+); f\(g\(x\)\); options (.+)$"), cf_which),
    (re.compile(r"^same composition: f\(x\) = (.+); g\(x\) = (.+); options a: same \| b: different$"), cf_same),
)

# --- Identity or Not? ----------------------------------------------------------
#
# Each equation is classified on its own: both sides evaluated at a few
# hundred angles (and pairs of angles, for α and β), by an evaluator of its
# own that calls a value undefined where a denominator, a tangent's cosine
# or a cotangent's sine is within 1e-9 of zero, or a square root's argument
# is negative. It is an identity when the sides agree wherever both are
# defined, and not one when they differ by more than a millionth somewhere;
# an equation whose sides only ever differ by less is reported. A stated counterexample must be an angle
# where both sides are defined and differ, and a "fails where" question must
# have exactly one such angle among its options.

class IdnUndefined(Exception):
    pass


def idn_value(node, env):
    import ast
    if isinstance(node, ast.Expression):
        return idn_value(node.body, env)
    if isinstance(node, ast.Constant):
        return float(node.value)
    if isinstance(node, ast.Name):
        return math.pi if node.id == "pi" else env[node.id]
    if isinstance(node, ast.UnaryOp) and isinstance(node.op, ast.USub):
        return -idn_value(node.operand, env)
    if isinstance(node, ast.BinOp):
        x, y = idn_value(node.left, env), idn_value(node.right, env)
        if isinstance(node.op, ast.Add):
            return x + y
        if isinstance(node.op, ast.Sub):
            return x - y
        if isinstance(node.op, ast.Mult):
            return x * y
        if isinstance(node.op, ast.Div):
            if abs(y) < 1e-9:
                raise IdnUndefined
            return x / y
        if isinstance(node.op, ast.Pow):
            return x ** y
    if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and len(node.args) == 1:
        x = idn_value(node.args[0], env)
        s, c = math.sin(x), math.cos(x)
        f = node.func.id
        if f == "sqrt":
            if x < -1e-12:
                raise IdnUndefined
            return math.sqrt(max(x, 0.0))
        if f in ("tan", "sec") and abs(c) < 1e-9 or f in ("cot", "csc") and abs(s) < 1e-9:
            raise IdnUndefined
        return {"sin": s, "cos": c, "tan": s / c if f == "tan" else 0, "sec": 1 / c if f == "sec" else 0,
                "csc": 1 / s if f == "csc" else 0, "cot": c / s if f == "cot" else 0}[f]
    raise ValueError(f"cannot read {ast.dump(node)}")


def idn_at(equation: str, t: float, a: float = 0.0, b: float = 0.0) -> str:
    """'holds', 'fails' or 'undefined', the equation at angle t (and α = a, β = b)."""
    import ast
    left, right = (ast.parse(side.replace("^", "**"), mode="eval") for side in equation.split(" = "))
    try:
        x, y = idn_value(left, {"t": t, "a": a, "b": b}), idn_value(right, {"t": t, "a": a, "b": b})
    except IdnUndefined:
        return "undefined"
    if abs(x - y) <= 1e-9 * max(1.0, abs(x), abs(y)):
        return "holds"
    # Near a crossing the sides differ by little; only a clear gap counts as failing.
    return "fails" if abs(x - y) > 1e-6 else "near"


IDN_ANGLES = [-2 * math.pi + k * math.pi / 97 + 0.0137 for k in range(388)] + [k * math.pi / 12 for k in range(-24, 25)]


def idn_classify(equation: str) -> str:
    seen = set()
    for i, t in enumerate(IDN_ANGLES):
        # α and β wander independently of θ, for the equations in two angles.
        seen.add(idn_at(equation, t, IDN_ANGLES[(7 * i + 3) % len(IDN_ANGLES)], IDN_ANGLES[(31 * i + 11) % len(IDN_ANGLES)]))
    assert seen - {"undefined"}, f"{equation} is never defined"
    assert "near" not in seen or "fails" in seen, f"{equation} differs only slightly"
    return "not" if "fails" in seen else "always"


def idn_angle(written: str) -> float:
    return float(Fraction(written[:-3])) * math.pi if written.endswith(" pi") else math.radians(int(written))


# requiem: catalogue/content/identity-or-not-by-counterexample
def idn_identity(equation: str, counter) -> str:
    kind = idn_classify(equation)
    if counter is not None:
        at = [idn_angle(x) for x in counter.split(", ")]
        if kind != "not" or idn_at(equation, at[0], *at) != "fails":
            return f"the counterexample {counter} is not one"
    elif kind == "not":
        return "not, with no counterexample given"
    return kind


def idn_fails_where(equation: str, options: str) -> str:
    if idn_classify(equation) != "not":
        return "an identity, which fails nowhere"
    fits = [oid for oid, d in tg_options(options).items() if idn_at(equation, idn_angle(d)) == "fails"]
    # At least one of the others must make it true, so that one angle tried can mislead.
    if not any(idn_at(equation, idn_angle(d)) == "holds" for d in tg_options(options).values()):
        return "no option where it holds"
    return fits[0] if len(fits) == 1 else f"fits {fits}"


CHOICE_RULES += (
    (re.compile(r"^identity or not: (.+? = .+?)(?:; fails at (.+))?$"), idn_identity),
    (re.compile(r"^fails where: (.+? = .+?); options (.+)$"), idn_fails_where),
)

# --- Inverse Functions --------------------------------------------------------
#
# f is read from the text and undone here by a route of this section's own:
# solving f(x) = c by trying inputs, or composing f with the answer and
# asking that only x is left, in exact rationals where f has no root and in
# floats to a billionth where it does. A table and a graph are read backwards
# from their own entries.

def iv_into(outer: str, inner: str) -> str:
    return re.sub(r"x", f"({inner})", outer)


def iv_cbrt(v: float) -> float:
    return -((-v) ** (1 / 3)) if v < 0 else v ** (1 / 3)


def iv_float(expr: str, x: float) -> float:
    """expr at x in floats, for formulas with a square or cube root in them."""
    py = expr.replace("root(3, ", "cbrt(").replace("^", "**")
    py = re.sub(r"(\d)\s*(?=[x(sc])", r"\1*", py)
    py = re.sub(r"\)\s*(?=[x(sc])", ")*", py)
    return eval(py, {"__builtins__": {}, "sqrt": math.sqrt, "cbrt": iv_cbrt, "x": x})  # noqa: S307 -- our own text


def iv_rooted(*texts: str) -> bool:
    return any("sqrt" in t or "root" in t for t in texts)


IV_TRY = [Fraction(n, 2) for n in range(-240, 241)]


def iv_solve(f: str, c, ok=lambda x: True) -> Fraction:
    """The one input, among halves from -120 to 120, that f sends to c."""
    hits = []
    for x in IV_TRY:
        if not ok(x):
            continue
        try:
            y = at(f, {"x": x}) if not iv_rooted(f) else iv_float(f, float(x))
        except (ValueError, ZeroDivisionError):
            continue
        if abs(y - Fraction(c)) < 1e-9:
            hits.append(x)
    assert len(hits) == 1, f"{f} = {c} at {hits}"
    return hits[0]


def iv_value(f: str, c: str) -> Fraction:
    return iv_solve(f, int(c))


def iv_table(xs: str, fs: str, c: str) -> Fraction:
    pairs = [(int(a), int(b)) for a, b in zip(xs.split(", "), fs.split(", "))]
    hits = [a for a, b in pairs if b == int(c)]
    assert len(hits) == 1, f"{c} appears {len(hits)} times in the table"
    return Fraction(hits[0])


IV_OPS = {"plus": lambda v, k: v + k, "minus": lambda v, k: v - k,
          "times": lambda v, k: v * k, "divide": lambda v, k: v / k}


def iv_run(steps: str, v: Fraction) -> Fraction:
    for step in steps.split(", "):
        op, k = step.split(" ")
        v = IV_OPS[op](v, Fraction(int(k)))
    return v


def iv_steps(f: str, listing: str) -> str:
    fit = [oid for oid, body in te_options(listing).items()
           if all(iv_run(body, iv_run(f, Fraction(v))) == v for v in (-7, -1, 0, 2, 5, 11))]
    return fit[0] if len(fit) == 1 else f"{len(fit)} options undo {f}"


IV_POINTS = [Fraction(n, 3) for n in range(-24, 25)]


def iv_undoes(f: str, g: str) -> bool:
    """g(f(x)) = x and f(g(x)) = x wherever both are defined, at enough points."""
    agreed = 0
    for x in IV_POINTS:
        try:
            if iv_rooted(f, g):
                # A cube root is irrational at most points: floats, to a billionth.
                if abs(iv_float(iv_into(f, g), float(x)) - x) > 1e-9 or abs(iv_float(iv_into(g, f), float(x)) - x) > 1e-9:
                    return False
            elif at(iv_into(f, g), {"x": x}) != x or at(iv_into(g, f), {"x": x}) != x:
                return False
        except ZeroDivisionError:
            continue
        agreed += 1
    return agreed >= 20


# requiem: catalogue/content/inverse-formula-judged-by-value
def iv_formula(f: str, answer: str) -> str:
    return "ok" if iv_undoes(f, answer) else f"does not undo {f}"


def iv_pair(f: str, g: str) -> str:
    return "a" if iv_undoes(f, g) else "b"


def iv_compose(f: str, g: str, answer: str) -> str:
    return same_polynomial(iv_into(f, g), answer)


def iv_in(branch: str):
    m = re.fullmatch(r"x (>=|<=) (-?\d+)", branch)
    if branch == "all":
        return lambda x: True
    lim = int(m[2])
    return (lambda x: x >= lim) if m[1] == ">=" else (lambda x: x <= lim)


def iv_restricted(f: str, branch: str, c: str) -> Fraction:
    return iv_solve(f, int(c), iv_in(branch))


def iv_one_to_one(f: str, listing: str) -> str:
    fit = []
    for oid, body in te_options(listing).items():
        seen = {}
        inside = [x for x in IV_TRY if iv_in(body)(x)]
        if all(seen.setdefault(at(f, {"x": x}), x) == x for x in inside):
            fit.append(oid)
    return fit[0] if len(fit) == 1 else f"{len(fit)} domains are one-to-one"


def iv_restricted_formula(f: str, branch: str, listing: str) -> str:
    keep = iv_in(branch)
    # f's outputs: the values it takes on its own domain.
    outputs = sorted({float(at(f, {"x": x})) for x in IV_TRY if keep(x)})[:60]
    fit = []
    for oid, body in te_options(listing).items():
        good = True
        for y in outputs:
            try:
                back = iv_float(body, y)
            except ValueError:
                good = False
                break
            if not keep(Fraction(back).limit_denominator(10 ** 6)) or abs(iv_float(f, back) - y) > 1e-9:
                good = False
                break
        if good:
            fit.append(oid)
    return fit[0] if len(fit) == 1 else f"{len(fit)} options undo {f} on {branch}"


IV_PT = re.compile(r"\((-?\d+), (-?\d+)\)")


def iv_graph(listing: str, k: str) -> Fraction:
    pts = [(int(a), int(b)) for a, b in IV_PT.findall(listing)]
    k = Fraction(int(k))
    hits = set()
    for (x1, y1), (x2, y2) in zip(pts, pts[1:]):
        if min(y1, y2) <= k <= max(y1, y2) and y1 != y2:
            hits.add(x1 + (k - y1) * Fraction(x2 - x1, y2 - y1))
    assert len(hits) == 1, f"height {k} reached at {hits}"
    return hits.pop()


BY_RULE += (
    (re.compile(r"^inverse value: f\(x\) = (.+); at (-?\d+)$"), iv_value),
    (re.compile(r"^inverse table: x ([-\d, ]+) \| f ([-\d, ]+); at (-?\d+)$"), iv_table),
    (re.compile(r"^restricted inverse: f\(x\) = (.+); (x (?:>=|<=) -?\d+); at (-?\d+)$"), iv_restricted),
    (re.compile(r"^graph inverse: ((?:\(-?\d+, -?\d+\) ?)+); at (-?\d+)$"), iv_graph),
)

EXPR_RULES += (
    (re.compile(r"^inverse formula: f\(x\) = (.+)$"), iv_formula),
    (re.compile(r"^inverse compose: f\(x\) = (.+); g\(x\) = (.+); f\(g\(x\)\)$"), iv_compose),
)

CHOICE_RULES += (
    (re.compile(r"^undo steps: (.+?); options (.+)$"), iv_steps),
    (re.compile(r"^inverse pair: f\(x\) = (.+); g\(x\) = (.+); options a: inverses \| b: not inverses$"), iv_pair),
    (re.compile(r"^one-to-one: f\(x\) = (.+); options (.+)$"), iv_one_to_one),
    (re.compile(r"^restricted formula: f\(x\) = (.+); (x (?:>=|<=) -?\d+); options (.+)$"), iv_restricted_formula),
)

PAIR_RULES += (
    (re.compile(r"^reflect point: \((-?\d+), (-?\d+)\)$"), lambda a, b: (b, a)),
    (re.compile(r"^reflect value: f\((-?\d+)\) = (-?\d+)$"), lambda a, b: (b, a)),
)

# The graph is the student's only copy of f: it must be the path the text
# lists, its two ends filled dots.
for path in sorted(LIB.glob("inverses-*.json")):
    for i, p in enumerate(json.loads(path.read_text())["problems"]):
        m = re.match(r"^graph inverse: ((?:\(-?\d+, -?\d+\) ?)+); at -?\d+$", p["text"])
        if not m:
            continue
        where = f"inverses L{int(path.stem.rsplit('-', 1)[1]) + 1} row {i}"
        corners = [[float(a), float(b)] for a, b in IV_PT.findall(m[1])]
        marks = p["visual"]["marks"]
        if not any(mk["kind"] == "path" and mk["points"] == corners for mk in marks):
            problems.append(f"{where}: the graph drawn is not {corners}")
        dots = sorted(mk["at"] for mk in marks if mk["kind"] == "point")
        if dots != sorted([corners[0], corners[-1]]):
            problems.append(f"{where}: end dots {dots}, not at {corners[0]} and {corners[-1]}")

# --- Radical Equations --------------------------------------------------------
#
# Each equation is read as written, sqrt(), root(3, ) and ^(p/q) included,
# and its solutions are found by trying every whole number from -1000 to
# 1000 in the original equation: an extraneous answer is left out because it
# fails there, not because a rule says so. A real power is taken the way the
# textbook does: an odd root of a negative is negative, an even one is not a
# real number. A sign change between two whole numbers, where neither is a
# solution, would mean a solution off the grid, and fails the check.

def re_pow(base: float, p: int, q: int) -> float:
    if base < 0:
        if q % 2 == 0:
            raise ValueError("even root of a negative")
        return (-((-base) ** (1 / q))) ** p
    return (base ** (1 / q)) ** p


def re_cbrt(v: float) -> float:
    return -((-v) ** (1 / 3)) if v < 0 else v ** (1 / 3)


def re_side(src: str):
    py = src.replace("root(3, ", "cbrt(")
    py = re.sub(r"(\([^()]*\)|x)\^\((\d+)/(\d+)\)", r"rpow(\1, \2, \3)", py)
    py = py.replace("^", "**")
    py = re.sub(r"(\d)\s*(?=[x(scr])", r"\1*", py)
    py = re.sub(r"\)\s*(?=[x(])", ")*", py)
    fn = eval(f"lambda x: {py}", {"__builtins__": {}, "sqrt": math.sqrt, "cbrt": re_cbrt, "rpow": re_pow})  # noqa: S307
    return fn


RE_GRID = [Fraction(n) for n in range(-1000, 1001)]


# requiem: catalogue/content/extraneous-level-mixes-outcomes
def re_solutions(lhs: str, rhs: str) -> OnGrid:
    L, R = re_side(lhs), re_side(rhs)

    def gap(x):
        try:
            return L(x) - R(x)
        except (ValueError, ZeroDivisionError):
            return None

    hits, prev = set(), None
    for x in range(-1000, 1001):
        g = gap(float(x))
        if g is not None and abs(g) < 1e-7 * max(1.0, abs(R(float(x)))):
            hits.add(Fraction(x))
        elif g is not None and prev is not None and prev[1] is not None and abs(prev[1]) >= 1e-7 and (g > 0) != (prev[1] > 0):
            raise AssertionError(f"{lhs} = {rhs} changes sign between {prev[0]} and {x}")
        prev = (x, g)
    return on_grid(hits, RE_GRID)


SET_RULES += (
    (re.compile(r"^radical: (.+) = (.+)$"), re_solutions),
)

# The search above only sees whole numbers from -1000 to 1000, so every key
# must be one of those: a lone whole number inside that range.
for path in sorted(LIB.glob("radical-eq-*.json")):
    for i, p in enumerate(json.loads(path.read_text())["problems"]):
        where = f"radical-eq L{int(path.stem.rsplit('-', 1)[1]) + 1} row {i}"
        for part in p["answer"]["value"]["parts"]:
            lo, hi = part["lo"], part["hi"]
            if lo != hi or lo["d"] != 1 or not -1000 <= lo["n"] <= 1000:
                problems.append(f"{where}: key {part} is outside the whole numbers -1000 to 1000 the check searches")

# --- Rational Expressions -----------------------------------------------------
#
# The question's expression and the answer are compared by value at rational
# points, skipping any that divide by zero, and the answer must be finished:
# one fraction whose top and bottom share no factor (their polynomial gcd is a
# constant), or a polynomial written expanded. Excluded values are the zeros
# of every denominator in the question as written, found by trying it.

RA_POINTS = [Fraction(n, 7) for n in range(-70, 71)]


def ra_equal(a: str, b: str) -> bool:
    agreed = 0
    for x in RA_POINTS:
        try:
            u, v = at(a, {"x": x}), at(b, {"x": x})
        except ZeroDivisionError:
            continue
        if u != v:
            return False
        agreed += 1
    return agreed >= 40


def ra_split(expr: str):
    """expr as (top, bottom) at its last division outside every bracket, or (expr, None)."""
    depth, cut = 0, None
    for i, ch in enumerate(expr):
        depth += ch == "("
        depth -= ch == ")"
        if ch == "/" and depth == 0:
            cut = i
    if cut is None:
        return expr, None
    return expr[:cut], expr[cut + 1:]


def ra_coefficients(src: str) -> list:
    return coefficients(src) if re.search(r"[a-z]", src) else [evaluate(src)]


def ra_trim(r: list) -> list:
    while r and r[-1] == 0:
        r = r[:-1]
    return r


def ra_gcd_degree(p: list, q: list) -> int:
    """The degree of gcd(p, q), coefficients lowest power first, by Euclid."""
    p, q = ra_trim(list(p)), ra_trim(list(q))
    while q:
        r = list(p)
        while len(r) >= len(q):
            k, shift = r[-1] / q[-1], len(r) - len(q)
            for i, c in enumerate(q):
                r[i + shift] -= k * c
            r = ra_trim(r)
        p, q = q, r
    return len(p) - 1


# requiem: catalogue/content/rational-answer-finished-by-value
def ra_finished(answer: str) -> bool:
    top, bottom = ra_split(answer.strip())
    if bottom is None:
        return expanded(answer) or bool(re.fullmatch(r"-?\d+", answer.strip()))
    if not re.search(r"x", bottom):
        return False
    return ra_gcd_degree(ra_coefficients(top), ra_coefficients(bottom)) == 0


def ra_simplified(src: str, answer: str) -> str:
    if not ra_equal(src, answer):
        return f"is not equal to {src}"
    return "ok" if ra_finished(answer) else "is not simplified: its top and bottom share a factor"


def ra_excluded(src: str) -> frozenset:
    # Where any denominator written in the question is zero, evaluating it divides by zero.
    zeros = set()
    for x in SAMPLES_ON_LINE:
        try:
            at(src, {"x": x})
        except ZeroDivisionError:
            zeros.add(x)
    return frozenset(zeros)


EXPR_RULES += (
    (re.compile(r"^rational: (.+)$"), ra_simplified),
)

SET_RULES += (
    (re.compile(r"^excluded: (.+)$"), ra_excluded),
)

# --- Rational Equations -------------------------------------------------------
#
# Each side is read into an exact quotient of two polynomials, the sides are
# subtracted over one denominator, and the numerator's zeros are found
# exactly: every p/q the rational root theorem allows is tried, and what is
# left once those are divided out must have no real zeros at all. A zero
# counts only if the question as written, evaluated there in exact
# arithmetic, divides by nothing that is 0 and has both sides equal. Work,
# rate and variation questions are written here as such an equation, from
# their numbers alone, and solved the same way.

def qe_trim(c: list) -> list:
    c = list(c)
    while len(c) > 1 and c[-1] == 0:
        c.pop()
    return c


def qe_plus(p: list, q: list) -> list:
    n = max(len(p), len(q))
    return qe_trim([(p[i] if i < len(p) else 0) + (q[i] if i < len(q) else 0) for i in range(n)])


def qe_times(p: list, q: list) -> list:
    out = [Fraction(0)] * (len(p) + len(q) - 1)
    for i, a in enumerate(p):
        for j, b in enumerate(q):
            out[i + j] += a * b
    return qe_trim(out)


class QeRat:
    """num/den, each a list of Fraction coefficients from x^0 up."""

    def __init__(self, num, den=(Fraction(1),)):
        self.num, self.den = qe_trim(num), qe_trim(den)

    @staticmethod
    def of(v):
        return v if isinstance(v, QeRat) else QeRat([Fraction(v)])

    def __add__(self, o):
        o = QeRat.of(o)
        return QeRat(qe_plus(qe_times(self.num, o.den), qe_times(o.num, self.den)), qe_times(self.den, o.den))

    __radd__ = __add__

    def __neg__(self):
        return QeRat([-a for a in self.num], self.den)

    def __pos__(self):
        return self

    def __sub__(self, o):
        return self + -QeRat.of(o)

    def __rsub__(self, o):
        return QeRat.of(o) - self

    def __mul__(self, o):
        o = QeRat.of(o)
        return QeRat(qe_times(self.num, o.num), qe_times(self.den, o.den))

    __rmul__ = __mul__

    def __truediv__(self, o):
        o = QeRat.of(o)
        assert o.num != [0], "a division by the zero polynomial"
        return QeRat(qe_times(self.num, o.den), qe_times(self.den, o.num))

    def __rtruediv__(self, o):
        return QeRat.of(o) / self

    def __pow__(self, k):
        out = QeRat([Fraction(1)])
        for _ in range(int(k)):
            out = out * self
        return out


def qe_py(src: str) -> str:
    py = src.replace("^", "**")
    py = re.sub(r"(\d)\s*(?=[x(])", r"\1*", py)
    py = re.sub(r"\)\s*(?=[x(\d])", ")*", py)
    py = re.sub(r"x\s*(?=[(\d])", "x*", py)
    return re.sub(r"(?<![\w.])(\d+)", r"F(\1)", py)


def qe_eval(src: str, x):
    return eval(qe_py(src), {"__builtins__": {}, "F": Fraction, "x": x})  # noqa: S307


def qe_at(c: list, r: Fraction) -> Fraction:
    return sum((a * r ** i for i, a in enumerate(c)), Fraction(0))


def qe_deflate(c: list, r: Fraction) -> list:
    hi = c[::-1]
    out = [hi[0]]
    for a in hi[1:-1]:
        out.append(a + out[-1] * r)
    return out[::-1]


def qe_divisors(n: int) -> list:
    n = abs(n)
    return [d for d in range(1, math.isqrt(n) + 1) if n % d == 0 for d in {d, n // d}]


def qe_zeros(c: list) -> set:
    """Every real zero of the polynomial, each of which must be rational."""
    c = qe_trim(c)
    assert c != [0], "the two sides are the same for every x"
    zeros = set()
    while len(c) > 1 and c[0] == 0:
        zeros.add(Fraction(0))
        c = c[1:]
    scale = math.lcm(*(a.denominator for a in c))
    ints = [int(a * scale) for a in c]
    cands = {s * Fraction(p, q) for p in qe_divisors(ints[0]) for q in qe_divisors(ints[-1]) for s in (1, -1)}
    for r in sorted(cands):
        while len(c) > 1 and qe_at(c, r) == 0:
            zeros.add(r)
            c = qe_deflate(c, r)
    deg = len(c) - 1
    assert deg == 0 or (deg == 2 and c[1] ** 2 - 4 * c[0] * c[2] < 0), f"zeros that are not rational are left in {c}"
    return zeros


# requiem: catalogue/content/rational-extraneous-mixes-outcomes
def qe_roots(lhs: str, rhs: str) -> set:
    x = QeRat([Fraction(0), Fraction(1)])
    gap = QeRat.of(qe_eval(lhs, x)) - QeRat.of(qe_eval(rhs, x))
    out = set()
    for r in qe_zeros(gap.num):
        try:
            if qe_eval(lhs, r) == qe_eval(rhs, r):
                out.add(r)
        except ZeroDivisionError:
            pass  # a denominator in the question is 0 there: extraneous
    return out


def qe_solutions(lhs: str, rhs: str) -> OnGrid:
    roots = qe_roots(lhs, rhs)
    return on_grid(roots, sorted(set(SAMPLES_ON_LINE) | roots))


def qe_only(roots: set, keep=lambda r: True) -> Fraction:
    hits = [r for r in roots if keep(r)]
    assert len(hits) == 1, f"{len(hits)} answers fit: {sorted(hits)}"
    return hits[0]


def qe_over(v: Fraction) -> str:
    return f"({v.numerator})/({v.denominator})"


def qe_variation(y1, x1, _y, xa, _x, yb, _k) -> Fraction:
    # y = k/x: k is the one number that makes y1 = k/x1 true.
    k = qe_only(qe_roots(f"({y1})", f"x/({x1})"))
    if _k:
        return k
    if _y:
        return qe_eval(f"{qe_over(k)}/({xa})", None)
    return qe_only(qe_roots(f"({yb})", f"{qe_over(k)}/x"))


def qe_together(a, b) -> Fraction:
    return qe_only(qe_roots(f"1/({a}) + 1/({b})", "1/x"), lambda r: r > 0)


def qe_alone(t, a) -> Fraction:
    return qe_only(qe_roots(f"1/({a}) + 1/x", f"1/({t})"), lambda r: r > 0)


def qe_fill(a, b) -> Fraction:
    return qe_only(qe_roots(f"1/({a}) - 1/({b})", "1/x"), lambda r: r > 0)


def qe_current(v, down, up) -> Fraction:
    return qe_only(qe_roots(f"({down})/({v} + x)", f"({up})/({v} - x)"), lambda r: 0 < r < int(v))


SET_RULES += (
    (re.compile(r"^rational eq: (.+) = (.+)$"), qe_solutions),
)

BY_RULE += (
    (re.compile(r"^inverse variation: y = (-?\d+) when x = (-?\d+); (?:(y) when x = (-?\d+)|(x) when y = (-?\d+)|(k))$"), qe_variation),
    (re.compile(r"^work together: (\d+), (\d+)$"), qe_together),
    (re.compile(r"^printers together: (\d+), (\d+)$"), qe_together),
    (re.compile(r"^work alone: together (\d+), (\d+)$"), qe_alone),
    (re.compile(r"^fill drain: (\d+), (\d+)$"), qe_fill),
    (re.compile(r"^current: speed (\d+), downstream (\d+), upstream (\d+)$"), qe_current),
)

# The sets above are read at the half-steps from -60 to 60 and at the roots
# found, so a key anywhere else would go unread: every key must be one of
# those half-steps.
QE_LINE = set(SAMPLES_ON_LINE)
for path in sorted(LIB.glob("rational-eq-*.json")):
    for i, p in enumerate(json.loads(path.read_text())["problems"]):
        if p["answer"]["type"] != "solutions":
            continue
        where = f"rational-eq L{int(path.stem.rsplit('-', 1)[1]) + 1} row {i}"
        for part in p["answer"]["value"]["parts"]:
            if part["lo"] != part["hi"] or as_fraction(part["lo"]) not in QE_LINE:
                problems.append(f"{where}: key {part} is not a lone half-step from -60 to 60")

# --- Rational Functions -------------------------------------------------------
#
# f is read from "TOP over BOTTOM" into two exact polynomials. A zero of the
# bottom is a vertical asymptote when it divides the bottom more times than
# the top, and a hole otherwise, its height read from both with that factor
# divided out. Far out f is evaluated, in exact arithmetic, at x = ±10^12:
# it settles on a number, or it does not, and a slant line is the one that
# f stays within a hair of at ±10^9. None of this compares degrees, which
# is the generator's route.

def rf_poly(src: str) -> list:
    v = QeRat.of(qe_eval(src, QeRat([Fraction(0), Fraction(1)])))
    assert v.den == [1], f"{src} is not a polynomial"
    return v.num


def rf_split(f: str) -> tuple:
    top, bottom = f.split(" over ")
    return rf_poly(top), rf_poly(bottom)


def rf_times(c: list, r: Fraction) -> int:
    k = 0
    while len(c) > 1 and qe_at(c, r) == 0:
        c, k = qe_deflate(c, r), k + 1
    return k


# requiem: catalogue/content/asymptote-or-hole-by-multiplicity
def rf_vertical(f: str) -> OnGrid:
    top, bottom = rf_split(f)
    found = {r for r in qe_zeros(bottom) if rf_times(bottom, r) > rf_times(top, r)}
    return on_grid(found, sorted(set(SAMPLES_ON_LINE) | found))


def rf_hole(f: str) -> tuple:
    top, bottom = rf_split(f)
    shared = [r for r in qe_zeros(bottom) if rf_times(top, r) >= rf_times(bottom, r)]
    assert len(shared) == 1, f"{len(shared)} holes"
    r = shared[0]
    for _ in range(rf_times(bottom, r)):
        top, bottom = qe_deflate(top, r), qe_deflate(bottom, r)
    return r, qe_at(top, r) / qe_at(bottom, r)


def rf_far(top: list, bottom: list, x: int):
    """f at x: a Fraction, or 'inf' / '-inf' when it is past any bound."""
    v = qe_at(top, Fraction(x)) / qe_at(bottom, Fraction(x))
    if abs(v) > 10 ** 6:
        return "inf" if v > 0 else "-inf"
    return v


def rf_pick(listing: str, fits) -> str:
    hits = [oid for oid, body in te_options(listing).items() if fits(body)]
    assert len(hits) == 1, f"{len(hits)} options fit"
    return hits[0]


def rf_near(v, body: str) -> bool:
    if isinstance(v, str):
        return body == v
    return body not in ("inf", "-inf", "none") and abs(Fraction(body) - v) < Fraction(1, 10 ** 5)


def rf_horizontal(f: str, listing: str) -> str:
    top, bottom = rf_split(f)
    right, left = rf_far(top, bottom, 10 ** 12), rf_far(top, bottom, -(10 ** 12))
    if isinstance(right, str) or isinstance(left, str):
        return rf_pick(listing, lambda body: body == "none")
    return rf_pick(listing, lambda body: body.startswith("y = ") and rf_near(right, body[4:]) and rf_near(left, body[4:]))


def rf_oblique(f: str, listing: str) -> str:
    top, bottom = rf_split(f)

    def fits(body):
        line = rf_poly(body[4:])
        return all(abs(qe_at(top, Fraction(x)) / qe_at(bottom, Fraction(x)) - qe_at(line, Fraction(x))) < Fraction(1, 1000)
                   for x in (10 ** 9, -(10 ** 9)))
    return rf_pick(listing, fits)


def rf_ends(f: str, way: str, listing: str) -> str:
    top, bottom = rf_split(f)
    v = rf_far(top, bottom, 10 ** 12 if way == "inf" else -(10 ** 12))
    return rf_pick(listing, lambda body: rf_near(v, body))


SET_RULES += (
    (re.compile(r"^vertical asymptotes: (.+ over .+)$"), rf_vertical),
)

PAIR_RULES += (
    (re.compile(r"^hole: (.+ over .+)$"), rf_hole),
)

CHOICE_RULES += (
    (re.compile(r"^horizontal asymptote: (.+ over .+); options (.+)$"), rf_horizontal),
    (re.compile(r"^oblique asymptote: (.+ over .+); options (.+)$"), rf_oblique),
    (re.compile(r"^end behavior: (.+ over .+); x to (-?inf); options (.+)$"), rf_ends),
)

# An x-intercept is a number at which f is 0, so f must be defined there:
# a zero of the top that also makes the bottom 0 is no intercept, whatever
# cancels. The y-intercept is f(0), read from the formula as written.
# requiem: catalogue/content/x-intercept-needs-the-domain
def rf_xint(f: str) -> OnGrid:
    top, bottom = rf_split(f)
    found = {r for r in (qe_zeros(top) if len(qe_trim(top)) > 1 else set()) if qe_at(bottom, r) != 0}
    return on_grid(found, sorted(set(SAMPLES_ON_LINE) | found))


def rf_yint(f: str) -> tuple:
    top, bottom = rf_split(f)
    assert qe_at(bottom, Fraction(0)) != 0, "0 is not in the domain"
    return Fraction(0), qe_at(top, Fraction(0)) / qe_at(bottom, Fraction(0))


# requiem: catalogue/content/rational-graph-read-from-features
# Match the Graph: an option fits when its own graph, worked out from its
# formula alone, has the readings the text lists -- the x-intercepts, the
# holes, each vertical asymptote with the way f goes just left and just
# right of it, and the level far out. Exactly one may fit. The drawing is
# then held to that option below, point by point.
def rf_value(top: list, bottom: list, x: Fraction):
    """f at x, with any factor the top and bottom share there cancelled first."""
    while qe_at(bottom, x) == 0 and qe_at(top, x) == 0:
        top, bottom = qe_deflate(top, x), qe_deflate(bottom, x)
    return None if qe_at(bottom, x) == 0 else qe_at(top, x) / qe_at(bottom, x)


def rf_readings(f: str) -> tuple:
    top, bottom = rf_split(f)
    poles = sorted(r for r in qe_zeros(bottom) if rf_times(bottom, r) > rf_times(top, r))
    holes = sorted(r for r in qe_zeros(bottom) if rf_times(bottom, r) <= rf_times(top, r))
    zeros = sorted(r for r in (qe_zeros(top) if len(qe_trim(top)) > 1 else set()) if qe_at(bottom, r) != 0)
    tiny = Fraction(1, 10 ** 6)
    side = lambda v: "up" if v > 0 else "down"
    turns = [(v, side(rf_value(top, bottom, v - tiny)), side(rf_value(top, bottom, v + tiny))) for v in poles]
    right, left = rf_far(top, bottom, 10 ** 12), rf_far(top, bottom, -(10 ** 12))
    assert not isinstance(right, str) and not isinstance(left, str), f"{f} does not level off"
    level = round(right)
    assert abs(right - level) < Fraction(1, 10 ** 5) and abs(left - level) < Fraction(1, 10 ** 5), f"{f} levels at {right}, {left}"
    return zeros, holes, turns, level


RF_GRAPH = re.compile(r"^match graph: zeros (none|-?\d+(?:, -?\d+)*); holes (none|-?\d+(?:, -?\d+)*); asymptotes (.+), y = (-?\d+); options (.+)$")


def rf_listed(xs: str) -> list:
    return [] if xs == "none" else [Fraction(int(v)) for v in xs.split(", ")]


def rf_said(zeros: str, holes: str, asymptotes: str, level: str) -> tuple:
    turns = [(Fraction(int(v)), l, r) for v, l, r in re.findall(r"x = (-?\d+) \((up|down), (up|down)\)", asymptotes)]
    return rf_listed(zeros), rf_listed(holes), turns, int(level)


def rf_match(zeros: str, holes: str, asymptotes: str, level: str, listing: str) -> str:
    said = rf_said(zeros, holes, asymptotes, level)
    return rf_pick(listing, lambda body: rf_readings(body) == said)


SET_RULES += (
    (re.compile(r"^x-intercepts: (.+ over .+)$"), rf_xint),
)

PAIR_RULES += (
    (re.compile(r"^y-intercept: (.+ over .+)$"), rf_yint),
)

CHOICE_RULES += (
    (re.compile(r"^match graph: zeros (none|-?\d+(?:, -?\d+)*); holes (none|-?\d+(?:, -?\d+)*); asymptotes (.+), y = (-?\d+); options (.+)$"), rf_match),
)

# The graph is the student's copy of f: every point of the curve drawn must
# lie on the formula the readings pick (to the thousandths the points are
# written to), each dot on the x-axis must be an intercept and each open
# circle a hole at its height, and once answered the dashed lines must be
# that formula's asymptotes.
for path in sorted(LIB.glob("rational-functions-*.json")):
    for i, p in enumerate(json.loads(path.read_text())["problems"]):
        if not p["text"].startswith("match graph: "):
            continue
        where = f"rational-functions L{int(path.stem.rsplit('-', 1)[1]) + 1} row {i}"
        m = RF_GRAPH.match(p["text"])
        fit = [b for b in te_options(m[5]).values() if rf_readings(b) == rf_said(m[1], m[2], m[3], m[4])]
        if len(fit) != 1:
            continue  # the choice rule above reports it
        body = fit[0]
        top, bottom = rf_split(body)
        zeros, holes, turns, level = rf_readings(body)
        marks, shown = p["visual"]["marks"], p["visual"]["answer"]
        drawn = [pt for mk in marks if mk["kind"] == "path" for pt in mk["points"]]
        if len(drawn) < 40:
            problems.append(f"{where}: only {len(drawn)} points of curve drawn")
        far = 0
        for x, y in drawn:
            v = rf_value(top, bottom, Fraction(str(x)))
            if v is None or abs(v - Fraction(str(y))) > Fraction(6, 100):
                far += 1
        if far:
            problems.append(f"{where}: {far} drawn points are not on {body}")
        dots = sorted(Fraction(str(mk["at"][0])) for mk in marks if mk["kind"] == "point" and not mk.get("open"))
        if dots != zeros or any(mk["at"][1] != 0 for mk in marks if mk["kind"] == "point" and not mk.get("open")):
            problems.append(f"{where}: intercept dots at {dots}, but {body} crosses at {zeros}")
        circles = [mk["at"] for mk in marks if mk["kind"] == "point" and mk.get("open")]
        if sorted(Fraction(str(a)) for a, _ in circles) != holes:
            problems.append(f"{where}: open circles at {circles}, but {body} has holes at {holes}")
        for a, b in circles:
            v = rf_value(top, bottom, Fraction(str(a)))
            if v is None or abs(v - Fraction(str(b))) > Fraction(1, 1000):
                problems.append(f"{where}: the hole at x = {a} is drawn at height {b}")
        lines = [mk for mk in shown if mk["kind"] == "segment" and mk.get("dashed")]
        upright = sorted(Fraction(str(mk["from"][0])) for mk in lines if mk["from"][0] == mk["to"][0])
        flat = [mk["from"][1] for mk in lines if mk["from"][1] == mk["to"][1]]
        if upright != [v for v, _, _ in turns] or flat != [level]:
            problems.append(f"{where}: asymptotes drawn at x = {upright}, y = {flat}, but {body} has x = {[v for v, _, _ in turns]}, y = {level}")

# The asymptote sets are read at the half-steps from -60 to 60 and at the
# zeros found, so every key must be a lone half-step there.
for path in sorted(LIB.glob("rational-functions-*.json")):
    for i, p in enumerate(json.loads(path.read_text())["problems"]):
        if p["answer"]["type"] != "solutions":
            continue
        where = f"rational-functions L{int(path.stem.rsplit('-', 1)[1]) + 1} row {i}"
        for part in p["answer"]["value"]["parts"]:
            if part["lo"] != part["hi"] or as_fraction(part["lo"]) not in QE_LINE:
                problems.append(f"{where}: key {part} is not a lone half-step from -60 to 60")

# --- Polynomial Division ------------------------------------------------------
#
# P is read from the text into exact coefficients and divided again by long
# division, from the top term down: each step takes the leading term over x,
# multiplies x - c back and subtracts. That is a different route from the
# synthetic division the generator uses. A remainder, a factor and k are
# settled from that division; every zero comes from the rational root search
# of the Rational Equations section, with nothing irrational left over.

def pd_long(P: list, c: Fraction) -> tuple:
    """Quotient (from x^0 up) and remainder of P / (x - c), by long division."""
    rest = list(P)
    q = [Fraction(0)] * max(len(P) - 1, 1)
    for p in range(len(P) - 1, 0, -1):
        lead = rest[p]
        q[p - 1] = lead
        rest[p] -= lead           # lead x^(p-1) times x
        rest[p - 1] += lead * c   # lead x^(p-1) times -c, taken away
    return qe_trim(q), rest[0]


def pd_divisor(d: str) -> Fraction:
    m = re.fullmatch(r"x ([+-]) (\d+)", d)
    assert m, f"divisor {d}"
    return Fraction(int(m[2])) * (1 if m[1] == "-" else -1)


# requiem: catalogue/content/long-division-beyond-monic
def pd_divide(P: list, D: list) -> tuple:
    """Quotient and remainder of P / D for any divisor, by long division from
    the top term: the leading term over D's, times D, taken away."""
    rest, D = list(P), qe_trim(list(D))
    m = len(D) - 1
    q = [Fraction(0)] * max(len(P) - m, 1)
    for p in range(len(P) - 1, m - 1, -1):
        lead = rest[p] / D[m]
        q[p - m] = lead
        for j in range(m + 1):
            rest[p - m + j] -= lead * D[j]
    return qe_trim(q), qe_trim(rest[:m] or [Fraction(0)])


def pd_parse_quotient(body: str) -> tuple:
    m = re.fullmatch(r"(.+), remainder (.+)", body)
    return rf_poly(m[1]), qe_trim(rf_poly(m[2]))


def pd_long_choice(src: str, d: str, listing: str) -> str:
    q, r = pd_divide(rf_poly(src), rf_poly(d))
    assert len(r) < len(qe_trim(rf_poly(d))), "the remainder's degree is not below the divisor's"
    return rf_pick(listing, lambda body: pd_parse_quotient(body) == (q, r))


def pd_synthetic(src: str, d: str, listing: str) -> str:
    q, r = pd_long(rf_poly(src), pd_divisor(d))
    row = [*reversed(q), r]

    def fits(body):
        nums, rem = body.split(" r ")
        return [Fraction(int(v)) for v in nums.split(", ")] + [Fraction(int(rem))] == row
    return rf_pick(listing, fits)


def pd_remainder(src: str, d: str) -> Fraction:
    return pd_long(rf_poly(src), pd_divisor(d))[1]


def pd_is_factor(src: str, d: str, listing: str) -> str:
    r = pd_long(rf_poly(src), pd_divisor(d))[1]
    return rf_pick(listing, lambda body: body == ("yes" if r == 0 else "no"))


def pd_k(src: str, d: str) -> Fraction:
    # The remainder is linear in k: read it at k = 0 and k = 1, and solve for 0.
    c = pd_divisor(d)
    r0, r1 = (pd_long(rf_poly(re.sub(r"\bk", f"({v})", src)), c)[1] for v in (0, 1))
    assert r1 != r0, "k does not move the remainder"
    return -r0 / (r1 - r0)


def pd_zeros(src: str, given: str) -> OnGrid:
    P = rf_poly(src)
    assert qe_at(P, Fraction(int(given))) == 0, f"{given} is not a zero"
    found = qe_zeros(P)
    return on_grid(found, sorted(set(SAMPLES_ON_LINE) | found))


# requiem: catalogue/content/quotient-typed-when-exact
def pd_quotient(src: str, d: str, form: str) -> str:
    q, r = pd_divide(rf_poly(src), rf_poly(d))
    if r != [0]:
        return f"leaves a remainder of {r}, so it does not divide exactly"
    return "ok" if rf_poly(form) == q else f"is not the quotient {q}"


# requiem: catalogue/content/rational-root-candidates-listed
# The theorem's list is built from the divisors of the constant term and
# the leading coefficient, and every rational zero is found by putting each
# candidate into P exactly. A question that says P has exactly one rational
# zero is held to that; one that asks which option the theorem rules out
# must have exactly one option off the list.
def pd_candidates(P: list) -> set:
    a0, an = int(P[0]), int(P[-1])
    assert a0 != 0, "the constant term is 0"
    return {s * Fraction(n, d) for n in qe_divisors(a0) for d in qe_divisors(an) for s in (1, -1)}


def pd_rational_zero(src: str) -> Fraction:
    P = rf_poly(src)
    hits = [r for r in pd_candidates(P) if qe_at(P, r) == 0]
    assert len(hits) == 1, f"{len(hits)} rational zeros"
    return hits[0]


def pd_ruled_out(src: str, listing: str) -> str:
    allowed = pd_candidates(rf_poly(src))
    return rf_pick(listing, lambda body: Fraction(body) not in allowed)


EXPR_RULES += (
    (re.compile(r"^quotient: (.+); ([^;]+)$"), pd_quotient),
)

CHOICE_RULES += (
    (re.compile(r"^long division: (.+); ([^;]+); options (.+)$"), pd_long_choice),
    (re.compile(r"^not a candidate: (.+); options (.+)$"), pd_ruled_out),
    (re.compile(r"^synthetic: (.+); (x [+-] \d+); options (.+)$"), pd_synthetic),
    (re.compile(r"^is factor: (.+); (x [+-] \d+); options (.+)$"), pd_is_factor),
)

BY_RULE += (
    (re.compile(r"^remainder: (.+); (x [+-] \d+)$"), pd_remainder),
    (re.compile(r"^factor k: (.+); (x [+-] \d+)$"), pd_k),
    (re.compile(r"^rational zero: (.+)$"), pd_rational_zero),
)

SET_RULES += (
    (re.compile(r"^all zeros: (.+); given (-?\d+)$"), pd_zeros),
)

for path in sorted(LIB.glob("poly-division-*.json")):
    for i, p in enumerate(json.loads(path.read_text())["problems"]):
        if p["answer"]["type"] != "solutions":
            continue
        where = f"poly-division L{int(path.stem.rsplit('-', 1)[1]) + 1} row {i}"
        for part in p["answer"]["value"]["parts"]:
            if part["lo"] != part["hi"] or as_fraction(part["lo"]) not in QE_LINE:
                problems.append(f"{where}: key {part} is not a lone half-step from -60 to 60")

# --- Polynomial Functions -----------------------------------------------------
#
# A formula is read into exact coefficients: its zeros from the rational root
# search, a multiplicity by dividing out x - a until it no longer goes, the
# ends from its sign at x = +-10^9, and an inequality from its sign at every
# half-step from -60 to 60. A drawn graph is read from the heights at the
# whole numbers its text lists: an option is the graph only if it takes
# every one of those heights, and for turning points the polynomial is
# rebuilt from the heights by interpolation and the sign changes of its
# derivative are counted. None of this uses the factors the generator chose.

PF_PT = re.compile(r"\((-?\d+), (-?\d+)\)")


def pf_readings(listing: str) -> list:
    return [(Fraction(int(x)), Fraction(int(y))) for x, y in PF_PT.findall(listing)]


def pf_interpolate(pts: list) -> list:
    """The polynomial of least degree through every point, by Lagrange."""
    total = [Fraction(0)]
    for i, (xi, yi) in enumerate(pts):
        term = [yi]
        for j, (xj, _) in enumerate(pts):
            if j != i:
                term = qe_times(term, [-xj / (xi - xj), 1 / (xi - xj)])
        total = qe_plus(total, term)
    return qe_trim(total)


def pf_turns(c: list, lo: Fraction, hi: Fraction) -> int:
    d = qe_trim([i * a for i, a in enumerate(c)][1:]) if len(c) > 1 else [Fraction(0)]
    signs = []
    steps = int((hi - lo) * 100)
    for k in range(steps + 1):
        v = qe_at(d, lo + Fraction(k, 100))
        if v != 0:
            signs.append(v > 0)
    return sum(1 for a, b in zip(signs, signs[1:]) if a != b)


def pf_zeros(src: str) -> OnGrid:
    found = qe_zeros(rf_poly(src))
    return on_grid(found, sorted(set(SAMPLES_ON_LINE) | found))


def pf_multiplicity(src: str, a) -> Fraction:
    c = rf_poly(src)
    m = rf_times(c, Fraction(int(a)))
    assert m > 0, f"{a} is not a zero"
    return Fraction(m)


def pf_cross(src: str, a, listing: str) -> str:
    m = rf_times(rf_poly(src), Fraction(int(a)))
    assert m > 0, f"{a} is not a zero"
    return rf_pick(listing, lambda body: body == ("crosses" if m % 2 else "touches"))


def pf_end_sign(c: list, x: int) -> str:
    return "up" if qe_at(c, Fraction(x)) > 0 else "down"


def pf_ends(src: str, listing: str) -> str:
    c = rf_poly(src)
    said = f"{pf_end_sign(c, -(10 ** 9))} {pf_end_sign(c, 10 ** 9)}"
    return rf_pick(listing, lambda body: body == said)


def pf_sketch(listing: str, options: str) -> str:
    pts = pf_readings(listing)
    return rf_pick(options, lambda body: all(qe_at(rf_poly(body), x) == y for x, y in pts))


def pf_most(src: str) -> Fraction:
    return Fraction(len(rf_poly(src)) - 2)


def pf_count(listing: str) -> Fraction:
    pts = pf_readings(listing)
    return Fraction(pf_turns(pf_interpolate(pts), pts[0][0], pts[-1][0]))


def pf_least(listing: str) -> Fraction:
    pts = pf_readings(listing)
    c = pf_interpolate(pts)
    n = pf_turns(c, pts[0][0], pts[-1][0]) + 1
    same_way = pf_end_sign(c, -(10 ** 9)) == pf_end_sign(c, 10 ** 9)
    if (n % 2 == 0) != same_way:
        n += 1
    return Fraction(n)


PF_TEST = {">": lambda v: v > 0, "<": lambda v: v < 0, ">=": lambda v: v >= 0, "<=": lambda v: v <= 0}


def pf_inequality(src: str, op: str) -> frozenset:
    c = rf_poly(src)
    return frozenset(x for x in SAMPLES_ON_LINE if PF_TEST[op](qe_at(c, x)))


# requiem: catalogue/content/rational-inequality-sign-chart
# A rational inequality is read at every half-step from -60 to 60 by putting
# that x into both sides as written: where a denominator is 0 the x is out,
# whatever the sign, and elsewhere it is in when the two sides compare as
# asked. No sign chart, no moving terms over, no factoring.
def pf_rational_ineq(lhs: str, op: str, rhs: str) -> frozenset:
    def keeps(x):
        try:
            return PF_TEST[op](qe_eval(lhs, x) - qe_eval(rhs, x))
        except ZeroDivisionError:
            return False
    return frozenset(x for x in SAMPLES_ON_LINE if keeps(x))


SET_RULES += (
    (re.compile(r"^poly zeros: (.+)$"), pf_zeros),
    (re.compile(r"^rational ineq: (.+) (>=|<=|>|<) (-?\d+)$"), pf_rational_ineq),
    (re.compile(r"^poly ineq: (.+) (>=|<=|>|<) 0$"), pf_inequality),
)

BY_RULE += (
    (re.compile(r"^multiplicity: (.+); at (-?\d+)$"), pf_multiplicity),
    (re.compile(r"^most turning points: (.+)$"), pf_most),
    (re.compile(r"^turning count: graph ((?:\(-?\d+, -?\d+\) ?)+)$"), pf_count),
    (re.compile(r"^least degree: graph ((?:\(-?\d+, -?\d+\) ?)+)$"), pf_least),
)

CHOICE_RULES += (
    (re.compile(r"^cross or touch: (.+); at (-?\d+); options (.+)$"), pf_cross),
    (re.compile(r"^poly ends: (.+); options (.+)$"), pf_ends),
    (re.compile(r"^sketch: graph ((?:\(-?\d+, -?\d+\) ?)+); options (.+)$"), pf_sketch),
)

# The graph is the student's only copy of P: every height the text lists
# must be on the drawn curve, the zeros must be the labelled dots, and the
# set answers' ends must be half-steps the sets above are read at.
for path in sorted(LIB.glob("poly-functions-*.json")):
    for i, p in enumerate(json.loads(path.read_text())["problems"]):
        where = f"poly-functions L{int(path.stem.rsplit('-', 1)[1]) + 1} row {i}"
        if p["answer"]["type"] == "solutions":
            for part in p["answer"]["value"]["parts"]:
                for end in (part["lo"], part["hi"]):
                    if end is not None and as_fraction(end) not in QE_LINE:
                        problems.append(f"{where}: key end {end} is not a half-step from -60 to 60")
        m = re.match(r"^(?:sketch|turning count|least degree): graph ((?:\(-?\d+, -?\d+\) ?)+)", p["text"])
        if not m:
            continue
        drawn_pts = {(round(a, 1), round(b, 1)) for mk in p["visual"]["marks"] if mk["kind"] == "path" for a, b in mk["points"]}
        for x, y in pf_readings(m[1]):
            if (float(x), float(y)) not in drawn_pts:
                problems.append(f"{where}: ({x}, {y}) is in the text but not on the curve drawn")
        dots = sorted(mk["at"][0] for mk in p["visual"]["marks"] if mk["kind"] == "point")
        zeros_read = sorted(float(x) for x, y in pf_readings(m[1]) if y == 0)
        if dots != zeros_read:
            problems.append(f"{where}: zero dots {dots}, but the heights are 0 at {zeros_read}")
        # The turning points marked once answered are the ones the heights give.
        marked = sum(1 for mk in p["visual"]["answer"] if mk["kind"] == "point")
        if marked != pf_count(m[1]):
            problems.append(f"{where}: {marked} turning points marked, but the heights turn {pf_count(m[1])} times")

# --- Complex Numbers ----------------------------------------------------------
#
# The question's expression is evaluated again in exact complex arithmetic:
# pairs of Fractions with i * i = -1 built in, so i^27, a product, a sum or
# a quotient comes out as a real and an imaginary part with nothing rounded.
# A quadratic's complex roots come from its own discriminant, whose square
# root must be exact, as the conjugate pair -b/2a +- (sqrt(-D)/2a)i.

class Cx:
    def __init__(self, re, im=0):
        self.re, self.im = Fraction(re), Fraction(im)

    @staticmethod
    def of(v):
        return v if isinstance(v, Cx) else Cx(v)

    def __add__(self, o):
        o = Cx.of(o)
        return Cx(self.re + o.re, self.im + o.im)

    __radd__ = __add__

    def __neg__(self):
        return Cx(-self.re, -self.im)

    def __pos__(self):
        return self

    def __sub__(self, o):
        return self + -Cx.of(o)

    def __rsub__(self, o):
        return Cx.of(o) - self

    def __mul__(self, o):
        o = Cx.of(o)
        return Cx(self.re * o.re - self.im * o.im, self.re * o.im + self.im * o.re)

    __rmul__ = __mul__

    def __truediv__(self, o):
        o = Cx.of(o)
        m = o.re * o.re + o.im * o.im
        assert m != 0, "division by 0"
        return Cx((self.re * o.re + self.im * o.im) / m, (self.im * o.re - self.re * o.im) / m)

    def __rtruediv__(self, o):
        return Cx.of(o) / self

    def __pow__(self, k):
        k = int(k)
        out = Cx(1)
        for _ in range(abs(k)):
            out = out * self
        return Cx(1) / out if k < 0 else out


def cx_eval(src: str) -> Cx:
    py = src.replace("^", "**")
    py = re.sub(r"(\d)\s*(?=[i(])", r"\1*", py)
    py = re.sub(r"\)\s*(?=[i(\d])", ")*", py)
    py = re.sub(r"i\s*(?=[(\d])", "i*", py)
    py = re.sub(r"(?<![\w.])(\d+)", r"F(\1)", py)
    return Cx.of(eval(py, {"__builtins__": {}, "F": Fraction, "i": Cx(0, 1)}))  # noqa: S307


def cx_value(src: str) -> tuple:
    z = cx_eval(src)
    return z.re, z.im, False


def cx_conjugate(src: str) -> tuple:
    z = cx_eval(src)
    return z.re, -z.im, False


def cx_exact_root(v: Fraction) -> Fraction:
    n, d = math.isqrt(v.numerator), math.isqrt(v.denominator)
    assert n * n == v.numerator and d * d == v.denominator, f"sqrt({v}) is not exact"
    return Fraction(n, d)


# requiem: catalogue/content/complex-judged-exactly
def cx_roots(lhs: str, rhs: str) -> tuple:
    c = qe_plus(rf_poly(lhs), [-a for a in rf_poly(rhs)])
    assert len(c) == 3, "not a quadratic"
    c0, c1, c2 = c
    D = c1 * c1 - 4 * c2 * c0
    assert D < 0, "the roots are real"
    return -c1 / (2 * c2), cx_exact_root(-D) / (2 * abs(c2)), True


def cx_nature(src: str, listing: str) -> str:
    c = rf_poly(src)
    D = c[1] ** 2 - 4 * c[2] * c[0]
    kind = "two real" if D > 0 else "one real" if D == 0 else "two complex"
    return rf_pick(listing, lambda body: body == kind)


COMPLEX_RULES = (
    (re.compile(r"^complex: (.+)$"), cx_value),
    (re.compile(r"^conjugate: (.+)$"), cx_conjugate),
    (re.compile(r"^complex roots: (.+) = (.+)$"), cx_roots),
)

CHOICE_RULES += (
    (re.compile(r"^nature of roots: (.+) = 0; options (.+)$"), cx_nature),
)

# --- Logarithms -----------------------------------------------------------------
#
# An exact log is found from prime factors: log_b v is the one ratio between
# v's exponents and b's, prime by prime, and there is no such log if the
# ratio is not the same for every prime. A number is held as r * e^t, so ln
# is the e exponent. Logs to one base added or subtracted are combined into
# one log of a product first, so log_6(4) + log_6(9) is log_6(36), worked out
# without either half. A rounded log comes from Python's own logarithms. A
# log equation is cleared into a polynomial -- logs added multiply, logs
# subtracted divide, equal logs are of equal numbers -- whose rational zeros
# are kept only where every log in the question is of a positive number.

LG_TERM = re.compile(r"([+-])?\s*(\d*)(log_(\d+)|log|ln)\(((?:[^()]|\([^()]*\))*)\)")


def lg_factor(n: int) -> dict:
    out, p = {}, 2
    while p * p <= n:
        while n % p == 0:
            out[p] = out.get(p, 0) + 1
            n //= p
        p += 1
    if n > 1:
        out[n] = out.get(n, 0) + 1
    return out


def lg_exponents(q: Fraction) -> dict:
    assert q > 0, f"log of {q}"
    top, bottom = lg_factor(q.numerator), lg_factor(q.denominator)
    return {**top, **{p: -k for p, k in bottom.items()}}


def lg_num(s: str) -> tuple:
    """A log's argument as (r, t), the number r * e^t."""
    s = s.replace(" ", "")
    if s == "e":
        return Fraction(1), Fraction(1)
    if s == "sqrt(e)":
        return Fraction(1), Fraction(1, 2)
    m = re.fullmatch(r"root\(e,(\d+)\)", s)
    if m:
        return Fraction(1), Fraction(1, int(m[1]))
    m = re.fullmatch(r"(1/)?e\^\(?(-?\d+)\)?", s)
    if m:
        return Fraction(1), Fraction(int(m[2])) * (-1 if m[1] else 1)
    m = re.fullmatch(r"(\d+)\^\(?(-?\d+)\)?", s)
    if m:
        return Fraction(int(m[1])) ** int(m[2]), Fraction(0)
    return Fraction(s), Fraction(0)


def lg_base(name: str, digits) -> object:
    return "e" if name == "ln" else 10 if name == "log" else int(digits)


def lg_exact(base, r: Fraction, t: Fraction) -> Fraction:
    if base == "e":
        assert r == 1, f"ln of {r} e^{t} is not exact"
        return t
    assert t == 0, "e in a log that is not ln"
    if r == 1:
        return Fraction(0)
    fb, fr = lg_exponents(Fraction(base)), lg_exponents(r)
    assert set(fb) == set(fr), f"log_{base}({r}) is not exact"
    ratios = {Fraction(fr[p], fb[p]) for p in fb}
    assert len(ratios) == 1, f"log_{base}({r}) is not exact"
    return ratios.pop()


def lg_terms(expr: str) -> list:
    """[(sign * coefficient, base, argument)] for every log in expr, which must be nothing else."""
    out, used = [], ""
    for m in LG_TERM.finditer(expr):
        k = int(m[2]) if m[2] else 1
        out.append((-k if m[1] == "-" else k, lg_base(m[3], m[4]), m[5]))
        used += m[0]
    assert used.replace(" ", "") == expr.replace(" ", ""), f"{expr} is not only logs"
    return out


def lg_value(expr: str) -> Fraction:
    by_base = {}
    for k, base, arg in lg_terms(expr):
        r, t = lg_num(arg)
        r0, t0 = by_base.get(base, (Fraction(1), Fraction(0)))
        by_base[base] = (r0 * r ** k, t0 + t * k)
    return sum((lg_exact(b, r, t) for b, (r, t) in by_base.items()), Fraction(0))


def lg_float(base, arg: str) -> float:
    r, t = lg_num(arg)
    natural = math.log(r) + float(t)
    return natural if base == "e" else natural / math.log(base)


def lg_near(v: float) -> Fraction:
    q = Fraction(v).limit_denominator(1000)
    assert abs(float(q) - v) < 1e-9, f"{v} is not a plain number"
    return q


def lg_raise(base: str, k: str, name: str, digits, arg: str) -> Fraction:
    """B^(k log_c(v)), by calculator."""
    b = math.e if base == "e" else float(base)
    return lg_near(b ** (int(k or 1) * lg_float(lg_base(name, digits), str(arg))))


def lg_rounded(v: float, places: int) -> Fraction:
    return Fraction(Decimal(repr(v)).quantize(Decimal(1).scaleb(-places), rounding=ROUND_HALF_UP))


def lg_change(b, v, places) -> Fraction:
    return lg_rounded(math.log(v) / math.log(b), places)


def lg_claim(body: str) -> bool:
    m = re.fullmatch(r"\(?(-?\d+(?:/\d+)?)\)?\^\(?(-?\d+)\)? = (-?\d+(?:/\d+)?)", body)
    if m:
        b, e, v = Fraction(m[1]), int(m[2]), Fraction(m[3])
        if b == 0 and e <= 0:
            return False
        return b ** e == v
    m = re.fullmatch(r"log_(\d+)\((-?\d+(?:/\d+)?)\) = (-?\d+)", body)
    assert m, f"cannot read {body}"
    b, v, e = int(m[1]), Fraction(m[2]), int(m[3])
    return b > 1 and v > 0 and Fraction(b) ** e == v


def lg_form(given: str, listing: str) -> str:
    assert lg_claim(given), f"{given} is not true"
    nums = lambda s: sorted(re.findall(r"\d+(?:/\d+)?", s))  # noqa: E731
    return rf_pick(listing, lambda body: lg_claim(body) and nums(body) == nums(given))


LG_POINTS = ({"x": 2, "y": 3, "z": 5}, {"x": 7, "y": 11, "z": 13})


def lg_monomial(arg: str, at: dict) -> Fraction:
    py = arg.replace("^", "**")
    py = re.sub(r"(\d+)", r"F(\1)", py)
    return eval(py, {"__builtins__": {}, "F": Fraction}, {k: Fraction(v) for k, v in at.items()})  # noqa: S307


def lg_condense(expr: str, listing: str) -> str:
    terms = lg_terms(expr)
    bases = {b for _, b, _ in terms}
    assert len(bases) == 1
    base = bases.pop()
    letters = sorted({a for _, _, a in terms})
    points = [dict(zip(letters, p.values())) for p in LG_POINTS]

    def fits(body):
        [(k, b, arg)] = lg_terms(body)
        if k != 1 or b != base:
            return False
        for at in points:
            want = Fraction(1)
            for c, _, a in terms:
                want *= Fraction(at[a]) ** c
            if lg_monomial(arg, at) != want:
                return False
        return True

    return rf_pick(listing, fits)


def lg_which(b, v, listing: str) -> str:
    want = math.log(int(v)) / math.log(int(b))
    calc = {"ln": math.log, "log": math.log10}

    def value(body):
        return eval(re.sub(r"(ln|log)\(", r"\1(", body), {"__builtins__": {}}, calc)  # noqa: S307

    return rf_pick(listing, lambda body: abs(value(body) - want) < 1e-9)


def lg_exp_exact(base, exponent, v) -> Fraction:
    c = rf_poly(exponent or "x")
    assert len(c) == 2, "not linear"
    e = lg_exact(int(base), Fraction(v), Fraction(0))
    return (e - c[0]) / c[1]


def lg_exp_rounded(k, base, a, v, places) -> Fraction:
    ln_b = 1.0 if base == "e" else math.log(int(base))
    return lg_rounded(math.log(int(v) / int(k or 1)) / (int(a or 1) * ln_b), int(places))


def lg_side(side: str) -> tuple:
    """A side of a log equation: its logs [(sign, base, polynomial)] and its constant."""
    logs = [((-1 if m[1] == "-" else 1) * (int(m[2]) if m[2] else 1), lg_base(m[3], m[4]), rf_poly(m[5]))
            for m in LG_TERM.finditer(side)]
    rest = LG_TERM.sub("", side).replace(" ", "")
    const = Fraction(rest) if rest else Fraction(0)
    return logs, const


# requiem: catalogue/content/log-equation-domain-checked
def lg_equation(lhs: str, rhs: str) -> OnGrid:
    left, k_left = lg_side(lhs)
    right, k_right = lg_side(rhs)
    logs = left + [(-k, b, p) for k, b, p in right]
    bases = {b for _, b, _ in logs}
    assert len(bases) == 1, "logs to more than one base"
    base = bases.pop()
    power = k_right - k_left
    assert power.denominator == 1
    top, bottom = [Fraction(1)], [Fraction(1)]
    for k, _, p in logs:
        assert abs(k) == 1
        if k > 0:
            top = qe_times(top, p)
        else:
            bottom = qe_times(bottom, p)
    scale = Fraction(base) ** int(power)
    poly = qe_trim(qe_plus(top, [-scale * a for a in bottom]))
    found = {x for x in qe_zeros(poly) if all(qe_at(p, x) > 0 for _, _, p in logs)}
    return on_grid(found, sorted(set(SAMPLES_ON_LINE) | found))


BY_RULE += (
    (re.compile(r"^log value: (e|\d+)\^\((-?\d*)(log_(\d+)|log|ln)\((\d+)\)\)$"), lg_raise),
    (re.compile(r"^log value: (-?\d*(?:log|ln).*)$"), lg_value),
    (re.compile(r"^change of base: log_(\d+)\((\d+)\) to (\d) dp$"), lg_change),
    (re.compile(r"^exp eq: (?:(\d+)\*)?(\d+|e)\^(?:x|\((\d+)x\)) = (\d+) to (\d) dp$"), lg_exp_rounded),
    (re.compile(r"^exp eq: (\d+)\^(?:x|\((.+)\)) = (\d+(?:/\d+)?)$"), lg_exp_exact),
)

CHOICE_RULES += (
    (re.compile(r"^log form: (.+?); options (.+)$"), lg_form),
    (re.compile(r"^condense: (.+?); options (.+)$"), lg_condense),
    (re.compile(r"^change of base: log_(\d+)\((\d+)\); options (.+)$"), lg_which),
)

SET_RULES += (
    (re.compile(r"^log eq: (.+) = (.+)$"), lg_equation),
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
                else:
                    if PROSE_RULE.match(text):
                        checked += 1
                        want = judged(text)
                        if want != answer["value"]:
                            problems.append(f"{where}: {text} is {want}, not {answer['value']}")
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

        if answer["type"] == "roots":
            rule = next((r for r in EXACT_RULES if r[0].match(text)), None)
            if rule:
                checked += 1
                verdict = exact_holds(rule[1](*rule[0].match(text).groups()), answer["value"])
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
                if answer_set(answer["value"], getattr(want, "samples", None)) != want:
                    problems.append(f"{where}: {text} is not {answer['value']}")
            continue

        # A half-plane: the points it keeps, compared with the points the answer keeps.
        if answer["type"] == "halfplane":
            rule = next((r for r in HALFPLANE_RULES if r[0].match(text)), None)
            if rule:
                checked += 1
                want = rule[1](*rule[0].match(text).groups())
                got = halfplane_text(answer["value"])
                same = halfplane_form(got) == halfplane_form(want) if isinstance(want, str) else kept(got) == want
                if not same:
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

        # requiem: catalogue/content/complex-judged-exactly
        # A complex number: worked out again in exact complex arithmetic and
        # compared part by part, a conjugate pair as its real part and the
        # size of its imaginary part.
        if answer["type"] == "complex":
            rule = next((r for r in COMPLEX_RULES if r[0].match(text)), None)
            if rule:
                checked += 1
                re_, im, pm = rule[1](*rule[0].match(text).groups())
                if pm:
                    im = abs(im)
                v = answer["value"]
                got = (as_fraction(v["re"]), as_fraction(v["im"]), bool(v.get("pm")))
                if got != (re_, im, pm):
                    problems.append(f"{where}: {text} is {(re_, im, pm)}, not {v}")
                for part in ("re", "im"):
                    n, d = v[part]["n"], v[part]["d"]
                    if d <= 0 or math.gcd(n, d) != 1:
                        problems.append(f"{where}: {part} {v[part]} is not in lowest terms")
            continue

        # A number to a fraction power, worked out exactly where it can be.
        if text.startswith("value: ") and answer["type"] in ("int", "frac"):
            checked += 1
            verdict = power_value(text[len("value: "):], answer["value"])
            if verdict != "ok":
                problems.append(f"{where}: {text} {verdict}")
            continue

        # A simplified expression: the same value as the question, and finished.
        # An answer judged by value (equivalent) is held to the same rules.
        if answer["type"] in ("expr", "equivalent"):
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
            # Every accepted way of writing it, not only the stored one.
            for form in dict.fromkeys([answer["value"], *answer.get("accept", [])]):
                checked += 1
                verdict = from_words(text[len("words: "):], form)
                if verdict != "ok":
                    problems.append(f"{where}: {text} {verdict}, not {form}")
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
            # requiem: play/answers/rounding-keeps-places
            # Rounded to a stated place, the answer is written to that place:
            # the stored places and the first accepted form both say so.
            asked = ROUNDED_TO.search(text)
            if asked:
                places = 0 if asked[1] is None else int(asked[1])
                shown = answer.get("accept", [""])[0].replace("−", "-")
                if answer["value"].get("places") != places or len(shown.partition(".")[2]) != places:
                    problems.append(f"{where}: {text} is written {shown!r}, not to {places} places")
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
problems += chance_out_of_range()

if problems:
    print(f"{len(problems)} wrong answer(s):")
    for line in problems[:15]:
        print("  " + line)
    if len(problems) > 15:
        print(f"  ... and {len(problems) - 15} more")
    sys.exit(1)

print(f"answers: {checked:,} re-derived independently — all correct, every problem read")
