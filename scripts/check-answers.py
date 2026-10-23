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


def solve_set(text: str) -> frozenset:
    return frozenset(x for x in SAMPLES_ON_LINE
                     if any(all(holds(r, x) for r in clause.split(" and "))
                            for clause in text.split(" or ")))


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


for path in sorted(LIB.glob("*.json")):
    if path.name in ("manifest.json", "schemas.json"):
        continue
    lib = json.loads(path.read_text())
    for i, p in enumerate(lib["problems"]):
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
        if answer["type"] == "solutions":
            rule = next((r for r in SET_RULES if r[0].match(text)), None)
            if rule:
                checked += 1
                want = rule[1](*rule[0].match(text).groups())
                if answer_set(answer["value"]) != want:
                    problems.append(f"{where}: {text} is not {answer['value']}")
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

if problems:
    print(f"{len(problems)} wrong answer(s):")
    for line in problems[:15]:
        print("  " + line)
    if len(problems) > 15:
        print(f"  ... and {len(problems) - 15} more")
    sys.exit(1)

print(f"answers: {checked:,} re-derived independently — all correct")
