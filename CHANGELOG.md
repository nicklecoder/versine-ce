# Changelog

Versions are tagged on `main` as `vMAJOR.MINOR.PATCH`. The version describes the
API contract (`contract/`), since that is what any other server depends on:

- **MAJOR** — a server that passed the previous contract suite would fail the new one.
- **MINOR** — something added: skills, levels, optional contract suites, extension
  points with harmless defaults.
- **PATCH** — fixes.

Home installs keep following `main` through `scripts/update.sh`; a release is for
anyone who wants a known version, and these notes say what changed either way.

## Unreleased

**Scientific Notation**, a new skill under Powers & Roots, in eight levels: writing big
and small numbers, reading them back, tidying an untidy front number, comparing,
multiplying and dividing, and adding and taking away. `check-answers.py` re-derives
every one of its conversions and sums. `docs/catalogue-plan.md` lays out the skills
still to come and the state standards each covers.

Four more new skills finish pre-algebra:

- **Rational & Irrational** (Powers & Roots): fractions that end or repeat, repeating
  decimals back into fractions, which numbers are rational, comparing roots and π
  with decimals, pinning a root to one decimal place, and sums and products of roots.
- **Using Expressions** (Expressions): substituting numbers and negatives, formulas
  with several letters, words into symbols, choosing the expression a story
  describes, and telling equivalent expressions from ones that only look alike.
- **Proportional Relationships** (Ratio): testing a table, the constant of
  proportionality, y = kx in both directions, reading k off a graph, telling a
  proportional graph from a line that misses the origin, and converting units.
- **Writing Equations** (Equations): number puzzles, choosing the equation a story
  makes, fixed-plus-rate situations, parts of a whole, two quantities becoming
  equal, and at-least / at-most problems where the words decide the rounding.

Three existing skills gain a level each: **Absolute Value** in Integer Addition &
Subtraction, **No Answer or Every Answer** in Equations Both Sides, and **Unknowns
Both Sides** in Inequalities. Progress on the levels after each insertion is kept.

A new `table` visual draws a table of values. On reveal it can add a working
column, so "is this proportional?" shows y ÷ x for every row.

Phase 1, functions and linear algebra, is half built:

- **Functions** (Functions): one output for each input, the vertical line test, function
  notation, reading f off a graph, solving f(x) = k, domain and range, and what
  f(a) = b means in a situation.
- **Slope** (Coordinates): from a graph, rising and falling, from two points, zero and
  undefined, from a table, and as a rate with units.
- **Linear Equations** (Coordinates): reading m and b, the equation from a graph, from a
  slope and a point, from two points, where a line crosses the x-axis, and whether a
  point is on a line.
- **Forms of a Line** (Coordinates): point-slope and standard form back to y = mx + b,
  horizontal and vertical lines, parallel and perpendicular lines, telling which a pair
  is, and a strategy level on which form is quickest.
- **Linear Models** (Coordinates): start and rate from a situation, what m and b mean,
  a model from two readings, linear or not, simple interest, comparing a table with an
  equation, and reading a distance-time graph.
- **Systems of Equations** (Equations): where two lines cross, substitution, elimination,
  scaling first, none or infinitely many, from words, and a strategy level on which
  method is least work.

Two new answer types. **linear** takes a line typed as y = …, judged as a line: y = x/2 + 3,
y = 0.5x + 3 and y = 3 + 1/2x are all accepted, a curve is refused as not a line, and x = c
gives a vertical one. **pair** takes an ordered pair in two boxes, ( x , y ), each a whole
number, fraction or decimal. The expression preview now draws an equation, so y = 2x − 3
shows as typed.

Fixed: an expression answer with a leading minus, like −2x + 3, was refused when the stored
answer was written 3 − 2x. Signs are now lifted out of products before comparing.

Equations in a sentence are kept in one piece, negative numbers no longer split from their
sign at a line break, and a full stop or question mark after an equation stays with it.
A segment on the plane is labelled at its middle, so a run and a rise sharing a corner no
longer print over each other. `web/dev/lines.html` shows one problem from each line, pair
and graph level, asking and answered.

`check-answers.py` now re-derives every answer in the new skills by its own
route: exact surd arithmetic for rational or irrational, integer square roots
for rounding, sampling for equivalence, an independent table of unit
conversions, and readers for the story templates. It also checks choice
questions whose options are expressions or equations, accepting a row only
when exactly one option agrees with the story.

## 1.2.1 — 2026-10-04

**A lock note reaches the tile's own text.** 1.2.0 put an extension's lock note in a
locked tile's tooltip and on the skill screen, but the line on the tile itself still
read "finish X to open this"; it now shows the note too. Home installs are unchanged.

## 1.2.0 — 2026-10-04

**Lock notes.** An extension can explain a locked skill in its own words with
`setLockNote`, for a gate policy that closes skills for a reason other than unfinished
prerequisites; the tile and the skill screen then show that sentence instead of
"finish X first". A gate policy may now close skills as well as open them. Home
installs, with no extension, are unchanged.

## 1.1.1 — 2026-10-03

**The console steps aside for another edition's accounts.** When an extension replaces
sign-in, the teacher console no longer offers to add a teacher by PIN or tells students
to make their own profiles — accounts are then the extension's. Home installs, with no
extension, are unchanged.

## 1.1.0 — 2026-10-03

**Extension points.** `web/extensions.json` lists optional browser modules, and ships
empty: a home install loads nothing and behaves exactly as before. A server that
implements the same API can serve its own list, and each module can replace the sign-in
screen, add screens and top-bar links, and set a gate policy that decides which skills
open. A module that fails to load is skipped, so the app still starts.
`scripts/check-extensions.mjs` joins the deploy gate.

## 1.0.0 — 2026-10-03

The first release: everything since the project began, as it stands.

**The catalogue.** 20 skills and 144 levels, from integer arithmetic through
fractions, decimals, ratio, powers and roots to equations and inequalities, laid
out on the map in dependency order. A skill opens once everything it builds on is
finished, and the catalogue is refused if its skills ever wait on each other in a
circle. Every level is served from a library of pre-built problems whose answers
are re-derived independently before every deploy.

**Play.** Practice and Time Trial, with a clock that calibrates itself to each
student, lessons derived from each level's explanation, and done-for-the-day when a
skill's last level is cleared against the clock.

**The Level.** Computed fresh from present ability — weight times quality over the
last 40 answers at each cleared level — so it can fall as well as rise. Every skill
card shows what that skill is worth to it, and the best it has contributed.

**Review.** A finished skill comes due 7 days after its last-level Time Trial, then
14, 30, 60 and 120; any pass restarts the clock, a failure changes nothing, and work
in a skill that builds on it postpones it. At most two cards say "needs review",
and the most overdue is offered first thing on the map. The teacher console shows
each student's review health.

**Days are local.** Done for the day, streaks and review all count the student's
own calendar days, from the time zone their browser sends.

**The API contract.** `contract/` is a suite any server implementing the API must
pass: core behaviour, optional PIN accounts, and optional time-travel checks for
rules that unfold over days. `python3 -m contract.run --edition <adapter>` runs it.

**Deploys.** `scripts/update.sh` backs up, pulls, runs every check — library,
answers, server, contract, imports, catalogue — and rolls back if any fails or the
new version is not healthy. Browsers revalidate every file, so a deploy is live on
refresh and never mixes two versions.
