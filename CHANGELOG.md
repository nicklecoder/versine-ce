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

**Distributions**, a new skill under Statistics, in eight levels: reading box plots,
the share of data between any two of the five numbers, and the 1.5 × IQR rule;
histograms, counted bar by bar, as percents, and for the interval that holds the
median; shape, and where a skew puts the mean against the median; the standard
deviation, worked through on sets where it comes out whole; normal-curve percents
and counts by the 68-95-99.7 rule; z-scores, both ways and to compare across tests;
and which measure of spread fits. `check-answers.py` reads every box plot from its
five numbers, rebuilds every histogram as its values, and keeps its own table of the
normal curve's bands.

**Two-Variable Data**, a new skill under Statistics, in eight levels: positive,
negative or no association in a scatter plot or table; predicting from a line of
fit, forward and back; what its slope and intercept mean in context, and finding
them from two points; residuals, as actual minus predicted; how strong a
correlation coefficient is, and which plot fits which r; when a correlation shows a
cause; and two-way tables, filled in from their totals, read as joint, marginal and
conditional percents, and checked for an association. Scatter plots are drawn by a
new chart helper on the plane, with axes that start where the data does.
`check-answers.py` works out r from the points, every prediction and residual from
the line, and every table question from the four counts.

**Logical Reasoning**, a new skill under Shapes, in eight levels: the hypothesis and
conclusion of a conditional, however it is worded ("q if p", "p only if q"); the
converse, inverse and contrapositive, both built and judged true or false; which
statements must share a truth value; counterexamples; and biconditionals. Truth is
only asked about whole numbers, quadrilaterals and triangles, where it can be
tested; everyday statements appear only in questions about structure.
`check-answers.py` builds each form itself and tests it over every whole number
from 1 to 200 and every kind of quadrilateral and triangle, from their defining facts.

**Circles**, a new skill under Shapes, in eight levels: arc length and sector area as
the central angle's share of the circle, and back to the angle or radius; central and
inscribed angles; angles in a semicircle, on the same arc and in a cyclic
quadrilateral; tangents, by the right angle at the radius and equal tangents from a
point; the equation of a circle; and its center and radius found by completing the
square. `check-answers.py` re-derives every answer from the circle's rules and the
equations themselves.

**Quadrilaterals**, a new skill under Shapes, in eight levels: the sides and angles of a
parallelogram; diagonals that bisect each other, are equal in a rectangle and
perpendicular in a rhombus; chasing angles with diagonals; which special quadrilateral
a list of facts proves, if any; trapezoids and kites; the triangle midsegment; and
naming a quadrilateral from its coordinates. `check-answers.py` re-derives each
answer from the shapes' properties, builds the rectangle or rhombus to measure its
diagonal angles, and names coordinate shapes by exact slopes and lengths.

**Units & Conversions**, a new skill under Area & Volume, in eight levels: customary
length; customary weight and capacity; metric units; converting between the systems
with the factor given; temperature in °F and °C; chains of unit fractions and rates
(miles per hour into feet per second, dollars per pound into cents per ounce); and
square and cubic units, where the length factor is squared or cubed. A few rows on
each level ask which unit fits a familiar thing, or which of two amounts is more.
`check-answers.py` re-derives every answer from its own exact unit table, built on
the international definitions (1 in = 2.54 cm, 1 lb = 0.45359237 kg, 1 gal = 231 in³).

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

Phase 1, functions and linear algebra, is built:

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
- **Compound Inequalities** (Inequalities): between two numbers and either side, read off a
  number line or from words, solving a double inequality and an "or", a negative in the
  middle, and or or, and interval notation.
- **Absolute Value** (Inequalities): distance from zero, two cases, isolating the bars
  first, one two or no solutions, less than is between, greater than is outside, and a
  strategy level on the shape of the answer before solving.
- **Graphing Inequalities** (Inequalities): whether a point is a solution, dashed or solid
  and above or below, from standard form with a test point, the inequality from a graph,
  systems of inequalities, and budgets and targets from words.
- **Sequences** (Sequences): the common difference, any term and which term a number is,
  writing the nth-term rule, the common ratio, geometric terms, recursive rules, and a
  strategy level on telling arithmetic, geometric and neither apart.

Five new answer types. **linear** takes a line typed as y = …, judged as a line: y = x/2 + 3,
y = 0.5x + 3 and y = 3 + 1/2x are all accepted, a curve is refused as not a line, and x = c
gives a vertical one. **pair** takes an ordered pair in two boxes, ( x , y ), each a whole
number, fraction or decimal. **rule** takes an nth-term rule, judged by the terms it gives:
3 + 4(n − 1) and 4n − 1 are both accepted for 3, 7, 11, … **solutions** takes a set of numbers, judged as the set:
x < 3, 3 > x and (−∞, 3) are one answer, as are x = ±3 and 3, −3, and "no solution" and
"all real numbers" are answers too. A new `intervals` visual draws sets on a number line,
with filled and hollow ends and arrows for rays. **halfplane** takes an inequality in x and y, judged by the
half of the plane it keeps: y < 2x + 1 and 2x − y > −1 are one answer. The plane can shade a
region and draw a dashed line, and the expression preview draws an inequality as typed. The expression preview now draws an equation, so y = 2x − 3
shows as typed.

Fixed: an expression answer with a leading minus, like −2x + 3, was refused when the stored
answer was written 3 − 2x. Signs are now lifted out of products before comparing.

Phase 2:

- **Monomials** (Expressions): multiplying and dividing, a power of a monomial, zero and
  negative powers finished with positive powers only, simplest form, and choosing the right
  answer from the slips students actually make.
- **Polynomials** (Expressions): degree and standard form, adding, taking away, a monomial
  times a polynomial, binomial times binomial, the special products, and trinomial times
  binomial.
- **Factoring** (Expressions): a common factor out, x² + bx + c, negatives inside,
  difference of squares, perfect squares, and a strategy level on which pattern to look
  for first, including the polynomials that do not factor.
- **Factoring II** (Expressions): a leading number by trial and by the AC method, factoring
  completely, grouping four terms, and sums and differences of cubes.
- **Quadratic Equations** (Equations): the zero product property, solving by factoring,
  rearranging to zero first, square roots, and a strategy level on choosing square roots,
  factoring, or neither.
- **The Quadratic Formula** (Equations): making a square, completing the square, the
  formula, the discriminant, exact radical answers, and a strategy level on the least-work
  method of four.
- **Graphs of Quadratics** (Functions): which way a parabola opens, the vertex read from
  vertex form and found from −b/2a, the zeros from factored form, completing the square
  into vertex form, maxima in context (a thrown ball, a fenced pen, a shop's takings), and
  a strategy level on which form shows the vertex, the zeros or the y-intercept.
- **Exponential Functions** (Functions): growth or decay, reading a and b, a percent rate
  as a factor and back, compound interest, doubling and half-life, a strategy level on
  linear or exponential from a table or a story, and the asymptote of a·bˣ + k.
- **Transforming Functions** (Functions): moving x², |x|, √x and x³ up, down, left and
  right, stretching and squashing, reflecting, following a point through several moves at
  once, naming the parent of a moved graph, and even and odd functions.

That finishes Phase 2.

**The Pythagorean Theorem**, the first skill under Right Triangles, in eight levels: the
hypotenuse and a missing leg (as ladders, screens, walks and ramps too), whether three
sides make a right angle, exact answers in simplest radical form, distance between points
on a grid, the diagonal of a box, and spotting a scaled triple to skip the squaring.

**Center and Spread**, the first skill under Statistics, in eight levels: the mean, the
median from an unsorted list, a missing value or a next score from a mean, quartiles with
the IQR beside the range, the mean absolute deviation (its distances shown in a table on
reveal), whether a sample is representative and scaling a random one up to its
population, and which measure fits data with or without an outlier. That finishes the
Algebra 1 milestone.

**Angle Relationships**, the first skill under Lines & Angles and of Phase 3, in eight
levels: complementary and supplementary angles (in words and in figures, two or three
parts), vertical angles, angles around a point, parallel lines cut by a transversal,
solving for x from the relationship, and a strategy level on which equation a
relationship gives, including none when the lines are not parallel. The plane can now
draw a figure without axes (`axes: false`) and write text inside it (a `text` mark),
which check-reveal.mjs checks.

**Triangles and Polygons** (Lines & Angles), in eight levels: a triangle's angle sum, in
numbers and in x; the exterior angle as the two far angles added; isosceles triangles,
in numbers and in x; the interior sum of a polygon and a missing angle; regular polygons,
their angles, their sides from an angle, and the gap left where several meet at a point;
the exterior sum of 360°; and the triangle inequality as a yes or no.

**Area and Circles**, the first skill under Area & Volume, in eight levels: rectangles
and parallelograms, with the slanted side labelled so base times height is a choice;
triangles, the height falling outside an obtuse one; trapezoids; circumference and the
area of a circle, kept as a number of π or with 3.14, and run backwards to the radius;
composite figures (an L, a hole, a roof, a half circle); and a missing side from the
area. Shapes are drawn to scale with their heights dashed, and the area is shaded on
reveal.

**Volume and Surface Area** (Area & Volume), in eight levels: prisms (boxes, cubes and
right-triangle prisms, and a box's height from its volume); cylinders, and a height from
the volume; cones and pyramids as a third, with the slant drawn beside the height;
spheres and hemispheres, and a radius from the volume; the surface of boxes, cubes and
triangular prisms; of cylinders closed, open at the top or open at both ends; and of
cones, spheres and solid hemispheres, and a radius from the surface. Solids are drawn in
an oblique view with hidden edges dashed.

**Transformations** (Coordinates), in eight levels: translations, by words, by a rule, or
shown by one corner; reflections over the axes and over lines like x = 2; over y = x and
y = −x; rotations of 90°, 180° and 270° about the origin or another point; dilations by
whole and fractional factors about the origin or another point; sequences of two moves,
with the other order worked out when it differs; and naming a move from its picture, or
calling a rule or a sequence congruent, similar or neither. Each corner is asked about on a
drawn triangle, and the image arrives with the answer.

**Similar Figures** (Shapes), in eight levels: the scale factor between similar triangles,
either way round, from the one pair of sides that matches; a missing side; similar or not,
by two angles, three side ratios, or two ratios and the angle between; scale drawings,
maps and models, there and back, and a real area from a plan; areas by k² and volumes by
k³, and the length factor back from them; the side splitter, by pieces and by the whole
side; and the altitude to the hypotenuse as a geometric mean.

**Congruent Triangles**, the first skill under Shapes, in eight levels: corresponding
sides and angles read from a congruence statement, the second triangle turned and often
flipped; naming the congruence from tick and arc marks; choosing SSS, SAS, ASA, AAS or HL;
telling those from SSA and AAA, which prove nothing; the one fact still needed for a named
criterion; equal sides and equal angles in isosceles and equilateral triangles, solved
for x; and equations from corresponding parts.

**Coordinate Geometry** (Coordinates), in eight levels: midpoints, and an end from the
midpoint; perimeters on the grid, each slanted side by the distance formula, exact or to
one decimal place; a point that splits a segment in a ratio or a fraction of the way;
areas of triangles and tilted squares by the box around them; a missing coordinate that
makes two sides parallel or perpendicular; triangles classified as right, isosceles,
both or neither from their sides and slopes; and the fourth corner of a parallelogram.
Each is drawn on the grid, and the run and rise of every slanted side arrive with the
answer.
- **Rational Exponents** (Powers & Roots): the half power as a square root, other roots,
  root then power, negative fractional powers, a radical rewritten as one power, the
  exponent rules with fractions, and a strategy level on combining bases before the root.

Letters typed side by side are a product, as on paper: 6ab is 6·a·b and xy² is x·y², the
power on the last letter alone. A quotient's sign now comes out the way a product's does,
so −4/x², −(4/x²) and 4/(−x²) are one answer.

Fixed: factors drawn side by side lost their brackets, so (−2a³b⁴)(3b⁶) showed as one
run of symbols and 2(3) as 23. A typed bracket around a factor is now kept, and a number
following something is always bracketed. A power of a number keeps its bracket on the
base, so 500(1.04)ˣ is drawn as it is written.

Fixed: a decimal answer filling a blank in its question was shown as "[object Object]"
once answered, in Decimals, Rounding, Percents, Proportional Relationships and Scientific
Notation. And 57 scientific-notation answers, such as −0.00000276, were longer than the
decimal box let anyone type; the box now takes twelve characters and is wide enough to
show them, and `check-library.py` fails any answer longer than its box.

What a bracket holds is spaced like the rest of the line and kept on one line, a minus on
a letter is set against it (−n², not − n²), and a prompt with a long bracket or product in
it is set smaller so it fits the card.

A problem can list more than one accepted answer, and any of them is judged right:
(x + 3)² and (x + 3)(x + 3) are both a finished factorisation. The expression answer box
is a little wider.

A new answer type, **roots**, takes a quadratic's solutions exactly, with ±: x = (−3 ± √17)/4,
−3/4 ± √17/4 and (−6 ± √68)/8 are one answer, judged in exact arithmetic, and the preview
draws a ± read both ways.

Equations in a sentence are kept in one piece, negative numbers no longer split from their
sign at a line break, and a full stop or question mark after an equation stays with it.
Table headers keep their case, since x, y and aₙ are letters and a capital is a different one. A segment on the plane is labelled at its middle, so a run and a rise sharing a corner no
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
