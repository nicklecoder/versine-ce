# Catalogue plan

The skills still to build, from finishing pre-algebra to being ready for
calculus, and where each one came from. Researched October 2026 against
published state standards. Built in phase order.

## Where the milestones come from

There is no federal curriculum. ESSA requires every state to adopt
"challenging" mathematics standards and forbids federal direction of what they
contain, so the requirements are the states'.

- **Common Core** (CCSS-M) is the baseline: most states use it or a light
  revision of it. Every content standard for grades 6–8 and high school
  (N, A, F, G, S) was checked.
- **Texas TEKS** (19 TAC Ch. 111: §111.28 Grade 8, §111.39 Algebra I, §111.41
  Geometry, §111.40 Algebra II, §111.42 Precalculus) is the largest non-Common
  Core framework and asks for more in places: polynomial division in Algebra I,
  logarithms in Algebra II, logic and probability in Geometry, and conics,
  vectors, parametric/polar and series in Precalculus.
- Florida B.E.S.T. and Virginia 2023 SOL were not checked: both sites refused
  automated fetches. Common Core plus TEKS is expected to cover them.

A standard counts as covered when its computational content is asked by some
level. Common Core (+) standards are included where TEKS requires them or
calculus needs them.

## What a drill cannot ask

Writing two-column proofs, compass-and-straightedge constructions, running
regressions with technology, drawing data displays and designing simulations
do not fit a typed-answer drill. Their reasoning is covered by choice levels
where it can be (which congruence criterion, which conditional is equivalent,
which spread measure). The rest is out of scope unless a different kind of
activity is built for it.

## Rules every entry follows

From `.requiem/catalogue/`: about eight levels a skill, split by depth when
longer; the last level mixes all the others (assumed below, never listed);
strategy levels are never where a topic is first met; Expressions and
Equations stay apart; ten skills at most to a category; a `dependsOn` edge only
when the earlier skill is genuinely needed to do the later one.

That last rule is what keeps the road to Algebra short: geometry, data and
trigonometry never gate the algebra spine, so a student starting at
pre-algebra walks straight up it.

## Engine work the later phases need

Answer types beyond `int frac mixed decimal choice expr`: exact multiples of π,
simplified radicals (a√b), ordered pairs, intervals, complex numbers, degrees.
Visuals for function graphs, triangles and circles (the plane already exists).

## Phase 0 — finish pre-algebra

**Built.** Every skill and level below is in the catalogue, with its library
built and its answers re-derived by `scripts/check-answers.py`.

Levels added to existing skills:

| Skill | New level | Standard |
|---|---|---|
| `int-addsub` | Absolute Value: distance from 0, and \|p − q\| | 6.NS.7, 7.NS.1c |
| `equations-both` | No Answer or Every Answer | 8.EE.7a |
| `inequalities` | Unknowns Both Sides | 7.EE.4b, A-REI.3 |

| Skill (category) | Levels as built | Covers |
|---|---|---|
| `sci-notation` (Powers) | Big Numbers · Small Numbers · Back to Standard · Tidy It Up · Which Is Bigger · Multiplying & Dividing · Adding & Taking Away · All Together | 8.EE.3–4, TEKS 8.2C |
| `real-numbers` (Powers) | Ends or Repeats · Repeating Into Fractions · Rational or Not · Which Is Bigger · Pin It Down (√n to 1 dp) · Sums & Products · All Together | 8.NS.1–2, N-RN.3, TEKS 8.2A,B,D |
| `evaluate` (Expressions) | Substitute a Number · Substitute a Negative · Formulas · Words Into Symbols · Which Expression Fits · Equivalent or Not · All Together | 6.EE.2–4, 7.EE.2, A-SSE.1 |
| `proportional` (Ratio) | Is It Proportional · The Constant · Using y = kx · Reading the Graph · Proportional or Not: Graphs · Converting Units · All Together | 7.RP.2, 6.RP.3d, 8.EE.5, TEKS A.2D |
| `word-equations` (Equations) | Number Puzzles · Which Equation · Fixed Plus Per-Unit · Parts of a Whole · Two Things Equal · At Least, At Most · All Together | 7.EE.4, A-CED.1, TEKS 8.8A |

Engine work this phase needed: a `table` visual (`web/ui/table.js`), with an
answer-phase `working` column so a question about the whole table can show
the row-by-row step on reveal.

## Units — added ahead of the rest of Phase 3

Students should be fluent in both US customary and metric units and in
converting between them: it is the setup chemistry, physics, geology and
astronomy assume (requiem `catalogue/content/units-both-systems`). `proportional`
already has Converting Units, a one-step conversion read as a constant of
proportionality; this skill goes further, and is built next because it is
pre-algebra.

| Skill (category) | Levels | Covers |
|---|---|---|
| `units` (Area & Volume) | Customary Length · Customary Weight & Capacity · Metric Units · Between the Systems · Temperature · Unit Fractions (chains and rates) · Square & Cubic Units | 4.MD.1, 5.MD.1, 6.RP.3d, N-Q.1, TEKS 6.4H |

Customary: in, ft, yd, mi; oz, lb, ton; fl oz, cup, pint, quart, gallon.
Metric: mm, cm, m, km; mg, g, kg; mL, L. Cross-system factors are given in
the question (1 in = 2.54 cm, 1 mi ≈ 1.61 km, 1 kg ≈ 2.2 lb, 1 gal ≈ 3.79 L).

`units` is built, as Customary Length · Customary Weight & Capacity · Metric
Units · Between the Systems · Temperature · Unit Fractions · Square & Cubic
Units · All Together. It does not depend on `proportional`: a conversion
here is read as a fact and a factor, and needs nothing of a constant of
proportionality. Its edges are decimals, signed fractions (for Temperature),
unit rate (for the rates) and the first levels of area and volume (for
square and cubic units). Each level keeps a minority of choice rows that
build a feel for size: which unit fits a familiar thing, and which of two
amounts is more.
Temperature is °F ↔ °C both ways, with the benchmarks 32/212 and 0/100.

Every student-facing string uses US notation, dollars and cents, and US
spelling (requiem `catalogue/content/us-notation`).

## Phase 1 — functions and linear algebra

**Built.** `functions` (with What f(a) = b Means added), `slope`, `linear-eq`,
`line-forms` (as Forms of a Line, with a Parallel, Perpendicular or Neither level added),
`linear-models` (with From Two Readings added), `systems`, `sequences` (with Writing the
Rule added; a geometric rule waits for an answer box that takes powers of n),
`compound-ineq` (with Solving an Or and A Negative in the Middle added), `abs-value` (with
a Between or Outside? strategy level added), and `ineq-graphs` (with Is It a Solution? and
From Words added, and Solid or Dashed and Which Side asked as one choice). Engine work
done for it: the `linear`, `pair`, `rule`, `solutions` and `halfplane` answer types, the
`intervals` visual, shaded regions and dashed lines on the plane, and the `math` prompt
term.

| Skill (category) | Levels | Covers |
|---|---|---|
| `functions` (Functions) | One Output Each · Vertical Line · Function Notation · Reading f off a Graph · Solve f(x) = k · Domain & Range · What f(a) = b Means | 8.F.1, F-IF.1–2, F-IF.5, TEKS A.12A,B |
| `slope` (Coordinates) | From a Graph · From Two Points · Negative Slope · Zero & Undefined · From a Table · Rate With Units | 8.EE.6, F-IF.6, TEKS A.3A,B |
| `linear-eq` (Coordinates) | Reading m and b · From a Graph · Slope and a Point · Two Points · Intercepts & Zeros | 8.F.3–4, A-CED.2, TEKS A.3C |
| `line-forms` (Coordinates) | Point-Slope · Standard Form · Horizontal & Vertical · Parallel · Perpendicular · Which Form (strategy) | TEKS A.2B,E–G, G-GPE.5 |
| `linear-models` (Coordinates) | Start & Rate From Words · What m and b Mean · Linear or Not · Simple Interest · Comparing Two Functions · Reading a Graph's Story | 8.F.2–5, F-LE.1,5 |
| `systems` (Equations) | Where Lines Cross · Substitution · Elimination · Scale First · None or Infinitely Many · From Words · Which Method (strategy) | 8.EE.8, A-REI.5–6, TEKS A.2I, A.5C |
| `compound-ineq` (Inequalities) | Between Two Numbers · Either Side · Solving Double · And or Or · Interval Notation | A-REI.3, TEKS A2.7I |
| `abs-value` (Inequalities) | \|x\| = a · Isolate First · No Solution · \|x − a\| < b · \|x − a\| > b | TEKS A2.6D–F |
| `ineq-graphs` (Inequalities) | Solid or Dashed · Which Side · Inequality From a Graph · Systems of Inequalities | A-REI.12, TEKS A.3D,H |
| `sequences` (Sequences) | Common Difference · Arithmetic nth Term · Common Ratio · Geometric nth Term · Recursive Rules · Which Kind (strategy) | F-IF.3, F-BF.2, F-LE.2, TEKS A.12C,D |

## Phase 2 — polynomials, factoring, quadratics, exponentials

**Built.** `monomials`, with The Usual Mistakes (a choice
between the right answer and the rule-for-rule slips) and All Together; and
`rational-exponents`, as The Half Power · Other Roots · Root, Then Power ·
Negative Fractional Powers · Radical to Power · Rules With Fractions · Combine
First (strategy, on real-numbers' Sums and Products); and `polynomials`, with
Taking Away for subtracting and All Together; and `factoring`, with Which
Pattern? (strategy, on polynomials' Special Products) and All Together; and
`factoring-2`, as ax² + bx + c · The AC Method · Factor Completely · Grouping
Four Terms · Sums and Differences of Cubes · All Together; and `quadratic-eq`,
as Zero Product · By Factoring · Rearrange to Zero First · Square Roots · Which
Method? (strategy, on factoring's Which Pattern?) · All Together; and
`quadratic-formula`, as Make a Square · Completing the Square · The Formula ·
The Discriminant · Exact Radical Answers · Which Method? (strategy) · All Together;
and `quadratic-graphs`, as Up or Down · Vertex Form · Zeros From Factored Form ·
Vertex From −b/2a · Into Vertex Form · Max and Min in Context · Which Form Shows
It? (strategy, on quadratic-formula's Which Method?) · All Together; and
`exponential`, as Growth or Decay · Reading a and b · Percent to Factor ·
Compound Interest · Doubling and Half-Life · Linear or Exponential? (strategy,
on sequences' Which Kind?) · The Asymptote · All Together; and
`transformations-f`, as Up and Down · Left and Right · Stretch and Squash ·
Reflect · Combined · Name the Parent · Even or Odd · All Together.

| Skill (category) | Levels | Covers |
|---|---|---|
| `monomials` (Expressions) | Multiplying · Dividing · Powers of Monomials · Negative Exponents With Letters · Simplest Form | TEKS A.11B |
| `rational-exponents` (Powers) | √ as ½ · ∛ as ⅓ · 8^(2/3) · Radical ↔ Exponent · Rules With Fractions | N-RN.1–2 |
| `polynomials` (Expressions) | Degree & Standard Form · Adding · Subtracting · Monomial × Polynomial · Binomial × Binomial · Special Products · Trinomial × Binomial | A-APR.1, TEKS A.10A,B,D |
| `factoring` (Expressions) | Common Factor Out · x² + bx + c · Negatives Inside · Difference of Squares · Perfect Squares · Which Pattern (strategy) | A-SSE.2, TEKS A.10E,F |
| `factoring-2` (Expressions) | ax² + bx + c · AC Method · Factor Completely · Four-Term Grouping · Sum & Difference of Cubes | TEKS A2.7E |
| `quadratic-eq` (Equations) | Zero Product · By Factoring · Rearrange to Zero First · Square Roots · Which Method (strategy) | A-REI.4 |
| `quadratic-formula` (Equations) | Completing the Square · The Formula · Discriminant · Exact Radical Answers · Which Method | A-REI.4, TEKS A.8A |
| `quadratic-graphs` (Functions) | Vertex Form · Opens Up or Down · Zeros From Factored Form · Vertex From −b/2a · Into Vertex Form · Max/Min in Context · Which Form Shows It (strategy) | F-IF.7–8, TEKS A.6–7 |
| `exponential` (Functions) | Growth or Decay · Reading a and b · Percent Rate → b · Compound Interest · Doubling & Half-life · Linear or Exponential · Asymptote | F-LE.1–3,5, TEKS A.9, 8.12D |
| `transformations-f` (Functions) | Up/Down · Left/Right · Stretch · Reflect · Combined · Name the Parent · Even or Odd | F-BF.3, TEKS A.3E, A.7C |

**Algebra 1 milestone:** Phases 0–2 plus `pythagoras` and `data-center`
complete Common Core and TEKS Algebra I. `pythagoras` is built, as The
Hypotenuse · A Missing Leg · Is It Right? · Exact Answers · Distance Between
Points · The 3D Diagonal · Spot the Triple · All Together. `data-center` is
built, as The Mean · The Median · Missing Value for a Mean · Quartiles and the
IQR · Mean Absolute Deviation · Samples (representative or biased, and scaling
a random sample up) · Which Measure? · All Together. Which Measure? is a
choice level rather than a strategy level: everything it chooses between is
taught in the same skill, so there is no earlier skill whose need it
arbitrates. That completes the milestone.

## Phase 3 — geometry, chance and data

`angles` is built, as Complementary · Supplementary · Vertical Angles · Around
a Point · Parallel Lines · Solve for x · Which Equation? (strategy, on
equations-both's Gather Then Undo) · All Together. Its figures are drawn on
the plane with no axes, which the plane now allows.
`triangle-angles` is built, as Angle Sum · Exterior Angle · Isosceles
Triangles · Polygon Angle Sum · Regular Polygons · The Exterior Sum · Triangle
Inequality · All Together.
`area` is built, as Rectangles and Parallelograms · Triangles · Trapezoids ·
Circumference · Area of a Circle · Composite Figures · Missing Dimension · All
Together, with no strategy level: whether π is kept or taken as 3.14 is said
in each question, not chosen.
`volume` is built, as Prisms · Cylinders · Cones and Pyramids · Spheres ·
Surface Area: Prisms · Surface Area: Cylinders · Surface Area: Cones and Spheres · All
Together.
`transformations-g` is built, as Translate · Reflect Over an Axis · Reflect
Over y = x · Rotate · Dilate · Sequences · Which Transformation? · All
Together. Sequences of moves get a level of their own, and Congruent or
Similar is asked inside Which Transformation?, beside naming the move, since
both sort moves by what they keep.
`coord-geometry` is built, as Midpoint · Perimeter on a Grid · Partition in
a Ratio · Area on a Grid · Slopes in Shapes · Classify a Triangle · Complete
the Parallelogram · All Together. The distance formula is practised as
perimeters, since a lone distance is pythagoras's Distance Between Points
level; classifying triangles and completing a parallelogram are where
slopes and lengths prove things about a shape (G-GPE.4).
`congruence` is built, as Corresponding Parts · Name the Congruence · Which
Criterion · Enough or Not · The Missing Fact · Isosceles & Equilateral · Use
the Congruence · All Together. Not Enough (SSA) became Enough or Not, which
mixes SSA and AAA with the criteria that do work, so the choice is a real
one; its SSA triangles are always the ambiguous case. Naming the congruence
and the missing fact are added for TEKS G.6B's applying the criteria.
`similarity` is built, as Scale Factor · Missing Side · Similar or Not? ·
Scale Drawings · Area & Volume Scale · Side Splitter · Altitude to
Hypotenuse · All Together. AA or Not became Similar or Not?, which asks SSS
and SAS similarity beside AA (G-SRT.5). Only the altitude level
takes a square root, and it depends on roots' Perfect Squares.
`quadrilaterals` is built, as Parallelogram Properties · Diagonals · Angles
with Diagonals · Which Special Quadrilateral · Trapezoids & Kites · Triangle
Midsegment · Verify on Coordinates · All Together. Angles with Diagonals
chases the isosceles triangles a rectangle's or rhombus's diagonals make,
and Trapezoids & Kites adds the trapezoid midsegment, isosceles trapezoid
and kite angles beside the triangle midsegment. Which Special Quadrilateral
asks what a list of facts proves (TEKS G.6E), including when it proves
nothing; every naming question gives the same answer under the inclusive
and exclusive definitions of trapezoid and kite.
`circles` is built, as Arc Length · Sector Area · Central & Inscribed
Angles · Semicircles & Cyclic Quadrilaterals · Tangents · Equation of a
Circle · Complete the Square for Center · All Together. Semicircles and
cyclic quadrilaterals get a level of their own (G-C.3), as the inscribed
angle theorem's two consequences. Like area, each arc and sector question
says whether π is kept or taken as 3.14, and a 3.14 answer is to 1 dp.
`reasoning` is built, as Hypothesis & Conclusion · Converse · Inverse ·
Contrapositive · Which Is Equivalent · Counterexample · Biconditional · All
Together. Hypothesis & Conclusion is added first, since "q if p" and "p only
if q" have to be read before a form can be built. Each form level both builds
the form and asks whether it is true; truth is only asked about whole numbers,
quadrilaterals and triangles, where it can be tested, and everyday statements
appear only in questions about structure.
`bivariate` is built, as Association · Line-of-Fit Predictions · Slope &
Intercept in Context · Residuals · Correlation Strength · Correlation vs
Causation · Two-Way Tables · All Together. Residuals is added for S-ID.6b:
actual minus predicted, and which side of the line a point is on. Describing
r is only asked of values well inside a band, since texts disagree on where
"strong" begins, and only a randomized experiment is treated as showing a
cause.
`distributions` is built, as Box Plots · Histograms · Shape & Center ·
Standard Deviation · Normal Curve Percents · z-Scores · Which Spread · All
Together. Shape & Center is added for S-ID.3: skew is named for its tail, and
a tail pulls the mean past the median. Normal-curve questions stay at whole
numbers of standard deviations, using the 68-95-99.7 rule. The standard
deviation divides by n, and every set comes out whole.
`probability` is built, as Likelihood · Single Event · Complement · Sample
Spaces · Independent "And" · Expected Frequency · Experimental vs
Theoretical · All Together. Likelihood is added for 7.SP.5, and asks only
about probabilities clear of the edge between likely and unlikely. Fractions
are accepted in any equivalent form, since simplifying is taught by the
fractions skills.
`counting` is built, as Multiplication Principle · Factorials · Permutations ·
Combinations · Does Order Matter? (strategy) · Restrictions · Probability by
Counting · All Together. Does Order Matter? depends on probability's Sample
Spaces, where heads then tails first counts apart from tails then heads.
Restrictions is added for S-CP.9's harder counts: fill the limited place
first. No level has a visual; three numbers multiplied teach the count better
than a tree too big to draw.
`probability-2` is built, as Venn Diagrams · Addition Rule · Conditional From
a Table · Without Replacement · P(A | B) · Independent or Not · All
Together. Venn Diagrams is added, for S-CP.1's unions, intersections and
complements, and its library is capped at 500 to keep the diagrams cheap.
Conditional From a Table depends on bivariate's Two-Way Tables. Its tables
have no column of row totals, so the revealed working column fits a phone.
With it, Phase 3 is built.

| Skill (category) | Levels | Covers |
|---|---|---|
| `pythagoras` (Right Triangles) | Hypotenuse · A Leg · Is It Right · Exact Answers · Distance Between Points · 3D Diagonal · Triples | 8.G.6–8 |
| `angles` (Lines & Angles) | Complementary · Supplementary · Vertical · Around a Point · Parallel Lines & Transversals · Solve for x · Which Relationship (strategy) | 7.G.5, 8.G.5, G-CO.9 |
| `triangle-angles` (Lines & Angles) | Angle Sum · Exterior Angle · Isosceles · Polygon Interior Sum · Regular Polygons · Exterior Sum · Triangle Inequality | G-CO.10, TEKS G.5D |
| `area` (Area & Volume) | Rectangles & Parallelograms · Triangles · Trapezoids · Circumference · Circle Area · Composite Figures · Missing Dimension | 6.G.1, 7.G.4,6 |
| `volume` (Area & Volume) | Prisms · Cylinders · Cones & Pyramids · Spheres · Surface Area: Prisms · Surface Area: Cylinders · Cones & Spheres | 6.G.2,4, 8.G.9, G-GMD.3, TEKS G.11 |
| `transformations-g` (Coordinates) | Translate · Reflect Over an Axis · Reflect Over y = x · Rotate · Dilate · Which Transformation · Congruent or Similar | 8.G.1–4, G-CO.2–5 |
| `coord-geometry` (Coordinates) | Midpoint · Distance Formula · Partition in a Ratio · Area on a Grid · Parallel/Perpendicular by Slope | G-GPE.4–7 |
| `congruence` (Shapes) | Corresponding Parts · Which Criterion · Not Enough (SSA) · Isosceles & Equilateral · Use the Congruence | G-CO.7–8, TEKS G.6B,C |
| `similarity` (Shapes) | Scale Factor · Missing Side · AA or Not · Scale Drawings · Area & Volume Scale · Side Splitter · Altitude to Hypotenuse | 7.G.1, G-SRT.1–5, TEKS G.8, G.10B |
| `quadrilaterals` (Shapes) | Parallelogram Properties · Diagonals · Angles with Diagonals · Which Special Quadrilateral · Trapezoids & Kites · Triangle Midsegment · Verify on Coordinates | G-CO.11, TEKS G.6E |
| `circles` (Shapes) | Arc Length · Sector Area · Central & Inscribed Angles · Semicircles & Cyclic Quadrilaterals · Tangents · Equation of a Circle · Complete the Square for Center | G-C.2,5, G-GPE.1 |
| `reasoning` (Shapes) | Converse · Inverse · Contrapositive · Which Is Equivalent · Counterexample · Biconditional | TEKS G.4A–C |
| `data-center` (Statistics) | Mean · Median · Missing Value for a Mean · Quartiles & IQR · MAD · Representative Sample · Which Measure (strategy) | 6.SP, 7.SP.1–2 |
| `bivariate` (Statistics) | Association · Line-of-Fit Predictions · Slope & Intercept in Context · Correlation Strength · Correlation vs Causation · Two-Way Tables | 8.SP, S-ID.5–9, TEKS A.4 |
| `distributions` (Statistics) | Box Plots · Histograms · Standard Deviation · Normal Curve Percents · z-Scores · Which Spread | S-ID.1–4 |
| `probability` (Probability) | Single Event · Complement · Sample Spaces · Independent "And" · Expected Frequency · Experimental vs Theoretical | 7.SP.5–8 |
| `counting` (Probability) | Multiplication Principle · Factorials · Permutations · Combinations · Does Order Matter (strategy) · Probability by Counting | S-CP.9, TEKS G.13A |
| `probability-2` (Probability) | Addition Rule · Conditional From a Table · Without Replacement · P(A\|B) · Independent or Not | S-CP.1–8, TEKS G.13C–E |

## Phase 4 — trigonometry and precalculus

| Skill (category) | Levels | Covers |
|---|---|---|
| `trig-ratios` (Right Triangles) | Opposite & Adjacent · Ratios · Missing Side · Missing Angle · 45-45-90 · 30-60-90 · Complementary sin/cos · Elevation & Bearings | G-SRT.6–8, TEKS G.9 |
| `laws-sines-cosines` (Right Triangles) | Sines: Side · Sines: Angle · Cosines: Side · Cosines: Angle · ½ab sin C · Which Law (strategy) | G-SRT.9–11, TEKS P.4G,H |
| `radians` (Unit Circle) | Degrees ↔ Radians · Coterminal · Reference Angles · Arc Length s = rθ · Angular Speed | F-TF.1, TEKS P.4B–D |
| `unit-circle` (Unit Circle) | Special Angles · Signs by Quadrant · Tangent · sec/csc/cot · From One Ratio, the Rest | F-TF.2–4,8 |
| `trig-graphs` (Unit Circle) | Amplitude · Period · Midline · Phase Shift · Equation From a Graph · Sinusoidal Models | F-TF.5, TEKS P.2O |
| `identities` (Identities) | Pythagorean · Reciprocal & Quotient · Even/Odd · Cofunction · Sum & Difference · Double Angle · Next Step in a Proof | F-TF.8–9, TEKS P.5M |
| `trig-equations` (Identities) | arcsin/arccos/arctan · Solve on [0, 2π) · General Solutions · Quadratic-Type | F-TF.6–7, TEKS P.2H, P.5N |
| `domain-range` (Functions) | Domain of √ and Fractions · From a Graph · Ranges of Parents · Piecewise · Step Functions | F-IF.5, F-IF.7b, TEKS A2.7I |
| `composition` (Functions) | (f + g)(x) · f(g(2)) · f(g(x)) · Not Commutative · Decompose | F-BF.1, TEKS P.2A–C |
| `inverses` (Functions) | Undo a Function · Solve for x ↔ y · Check by Composing · Restrict the Domain · Graph Reflection | F-BF.4, TEKS A2.2B–D |
| `radical-eq` (Equations) | Isolate & Square · Extraneous Roots · Both Sides Radical · Cube Roots · Rational Exponents | A-REI.2, TEKS A2.4F,G, 6B, 7H |
| `rational-expr` (Expressions) | Simplify · Excluded Values · Multiply & Divide · Common Denominator · Unlike Denominators · Complex Fractions | A-APR.6–7, TEKS A2.7F |
| `rational-eq` (Equations) | Clear Denominators · Extraneous · Proportions With x · Inverse Variation · Work & Rate | A-REI.2, TEKS A2.6H–J,L |
| `rational-functions` (Functions) | Vertical Asymptotes · Horizontal by Degree · Holes · Oblique · End Behavior | TEKS A2.6K, P.2J–L |
| `poly-division` (Expressions) | Long Division · Synthetic · Remainder Theorem · Factor Theorem · All Zeros From One | A-APR.2,6, TEKS A2.7C,D |
| `poly-functions` (Functions) | Zeros & Multiplicity · End Behavior · Sketch From Factors · Turning Points · Polynomial & Quadratic Inequalities | A-APR.3, TEKS A2.4H, P.5K |
| `complex` (Powers) | Powers of i · Add & Subtract · Multiply · Conjugates & Divide · Complex Roots of Quadratics | N-CN.1–3,7 |
| `logarithms` (Powers) | Log as Exponent · Evaluate · Product/Quotient/Power · ln & Change of Base · Solve Exponential Equations · Solve Log Equations | F-LE.4, F-BF.5, TEKS A2.5 |
| `series` (Sequences) | Arithmetic Sums · Finite Geometric · Sigma Notation · Infinite Geometric | A-SSE.4, TEKS P.5A–E |
| `binomial` (Sequences) | Pascal's Triangle · Coefficients by Combinations · A Given Term · Full Expansion | A-APR.5, TEKS P.5F |
| `systems-2` (Equations) | Line Meets Parabola · How Many Intersections · Three Variables · Three-Variable Word Problems | A-REI.7, TEKS A2.3 |
| `conics` (Coordinates) | Which Conic · Parabola Focus & Directrix · Ellipses · Hyperbolas | G-GPE.2–3, TEKS P.3F–I |
| `vectors` (TBD) | Components · Magnitude & Direction · Adding · Scalar Multiples · Resultants | TEKS P.4I–K |
| `parametric-polar` (TBD) | Plot Parametric · Eliminate the Parameter · Polar Points · Convert · Polar Graphs | TEKS P.3A–E |

`trig-ratios` is built, in the plan's eight levels and All Together, which
makes nine; the skill says why with `longerBecause`. Calculator answers round
only at the end, and a problem is kept only where 4-place working agrees with
the exact value. 45-45-90 depends on the Pythagorean theorem's Exact Answers.
`laws-sines-cosines` is built, as Sines: Side · Sines: Angle · Cosines: Side
· Cosines: Angle · Which Law? (strategy) · How Many Triangles? · ½ab sin C ·
All Together. Which Law? depends on trig-ratios' Missing Side, where a tool is
first chosen by the sides in play. How Many Triangles? is added for the
ambiguous case, and every Sines: Angle question names its triangle.
`radians` is built, as Degrees to Radians · Radians to Degrees · Coterminal
Angles · Reference Angles · Arc Length s = rθ · Sector Area ½r²θ · Angular
Speed · All Together. The plan's Degrees ↔ Radians is two levels, one each
way, and Sector Area is added beside Arc Length; the two depend on the
circles skill's Arc Length and Sector Area, where both are taken in degrees. Exact answers are the
coefficient of π, as a fraction.
`unit-circle` is built, as Special Angles · Signs by Quadrant · Around the
Circle · Tangent · sec, csc, cot · From One Ratio, the Rest · All Together.
Around the Circle is added between the first-quadrant values and tangent,
for any angle by its reference angle, and depends on radians' Reference
Angles; Special Angles depends on trig-ratios' 30-60-90.
`trig-graphs` is built, as Amplitude · Period · Midline · Phase Shift ·
Equation From a Graph · Sinusoidal Models · All Together, in the plan's
levels. Phase Shift depends on transforming functions' Left and Right, and
asks the shift as a choice so that the unfactored amount and the wrong
direction can both be offered.
`identities` is built, as Pythagorean · Reciprocal & Quotient · Even & Odd ·
Cofunction · Sum & Difference · Double Angle · Next Step in a Proof · All
Together, in the plan's levels. Cofunction depends on trig-ratios'
Complementary sin/cos, so the skill depends on trig-ratios as well as the
unit circle. Exact values with two radicals are asked as choices, since the
roots input holds one, and Next Step in a Proof is capped at 300 problems.
`trig-equations` is built, as arcsin, arccos, arctan · Solve in Degrees ·
Solve on [0, 2π) · General Solutions · Quadratic-Type · All Together. Solve
in Degrees is added: a set of angles is typed only in degrees, where each
is a number the solutions input reads, and on [0, 2π) the set is chosen
from four, as is every general solution. Solve in Degrees depends on the
unit circle's Around the Circle, General Solutions on the graphs' Period,
and Quadratic-Type on the identities' Pythagorean.

`vectors` and `parametric-polar` are TEKS-only and come last; they need a
category, perhaps under Trigonometry.

## Category sizes when complete

Functions 9, Equations 9, Expressions 8, Coordinates 8, Powers 7; everything
else under 6. `logarithms` is filed under Powers (a logarithm is an exponent)
and `linear-models` under Coordinates to keep Functions under the cap.

## Sources

- Common Core State Standards for Mathematics: https://www.thecorestandards.org/Math/
- TEKS via Cornell LII: https://www.law.cornell.edu/regulations/texas/19-Tex-Admin-Code-SS-111-39
  (and §111.28, §111.40, §111.41, §111.42)
- ESSA's limits on federal curriculum control:
  https://educationcounsel.com/our_work/latestcounsel/consistent-with-applicable-law-critical-statutory-constraints-on-president-trump-s-executive-order-about-k-12-curricula
