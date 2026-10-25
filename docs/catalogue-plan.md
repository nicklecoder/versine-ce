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
simplified radicals (a√b), ordered pairs, intervals, complex numbers (the `complex`
type, built with that skill), degrees.
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
| `laws-sines-cosines` (Right Triangles) | Sines: Side · Sines: Angle · Cosines: Side · Cosines: Angle · ½ab sin C & the Proofs · Which Law (strategy) | G-SRT.9–11, TEKS P.4G,H |
| `radians` (Unit Circle) | Degrees ↔ Radians · Coterminal · Reference Angles · Arc Length s = rθ · Angular Speed | F-TF.1, TEKS P.4B–D |
| `unit-circle` (Unit Circle) | Special Angles · Signs by Quadrant · Tangent · sec/csc/cot · From One Ratio, the Rest | F-TF.2–4,8 |
| `trig-graphs` (Unit Circle) | Amplitude · Period · Midline · Phase Shift · Equation From a Graph · Sinusoidal Models | F-TF.5, TEKS P.2O |
| `identities` (Identities) | Pythagorean · Reciprocal & Quotient · Even/Odd · Cofunction · Sum & Difference · Double Angle · Identity or Not? · Next Step in a Proof | F-TF.8–9, TEKS P.5M |
| `trig-equations` (Identities) | arcsin/arccos/arctan · Solve on [0, 2π) · General Solutions · Multiple Angles · Quadratic-Type | F-TF.6–7, TEKS P.2H, P.5N |
| `domain-range` (Functions) | Domain of √ and Fractions · From a Graph · Ranges of Parents · Piecewise · Step Functions | F-IF.5, F-IF.7b, TEKS A2.7I |
| `composition` (Functions) | (f + g)(x) · f(g(2)) · f(g(x)) · Not Commutative · Decompose · Domain of f(g(x)) | F-BF.1, TEKS P.2A–C |
| `inverses` (Functions) | Undo a Function · Solve for x ↔ y · Check by Composing · Restrict the Domain · Graph Reflection | F-BF.4, TEKS A2.2B–D |
| `radical-eq` (Equations) | Isolate & Square · Extraneous Roots · Both Sides Radical · Square Twice · Cube Roots · Rational Exponents | A-REI.2, TEKS A2.4F,G, 6B, 7H |
| `rational-expr` (Expressions) | Simplify · Excluded Values · Multiply & Divide · Common Denominator · Unlike Denominators · Complex Fractions | A-APR.6–7, TEKS A2.7F |
| `rational-eq` (Equations) | Clear Denominators · Extraneous · Proportions With x · Inverse Variation · Work & Rate | A-REI.2, TEKS A2.6H–J,L |
| `rational-functions` (Functions) | Vertical Asymptotes · Horizontal by Degree · Holes · Oblique · End Behavior · Intercepts · Match the Graph | F-IF.7d, TEKS A2.6K, P.2J–L |
| `poly-division` (Expressions) | Long Division · Synthetic · Remainder Theorem · Factor Theorem · Rational Root Theorem · All Zeros From One | A-APR.2,6, TEKS A2.7C,D |
| `poly-functions` (Functions) | Zeros & Multiplicity · End Behavior · Sketch From Factors · Turning Points · Polynomial & Quadratic Inequalities · Rational Inequalities | A-APR.3, TEKS A2.4H, P.5K |
| `complex` (Powers) | Powers of i · Add & Subtract · Multiply · Conjugates & Divide · Complex Roots of Quadratics | N-CN.1–3,7 |
| `logarithms` (Powers) | Log as Exponent · Evaluate · Product/Quotient/Power · ln & Change of Base · Solve Exponential Equations · Solve Log Equations · Log Functions | F-LE.4, F-BF.4–5, F-IF.7e, TEKS A2.5 |
| `series` (Sequences) | Arithmetic Sums · Finite Geometric · Sigma Notation · Infinite Geometric | A-SSE.4, TEKS P.5A–E |
| `binomial` (Sequences) | Pascal's Triangle · Coefficients by Combinations · A Given Term · Full Expansion | A-APR.5, TEKS P.5F |
| `systems-2` (Equations) | Line Meets Parabola · How Many Intersections · Three Variables · Three-Variable Word Problems | A-REI.7, TEKS A2.3 |
| `conics` (Coordinates) | Which Conic · Parabola Focus & Directrix · Ellipses · Hyperbolas | G-GPE.2–3, TEKS P.3F–I |
| `vectors` (Vectors & Polar) | Components · Magnitude & Direction · Adding · Scalar Multiples · Dot Product · Resultants | TEKS P.4I–K |
| `parametric-polar` (Vectors & Polar) | Plot Parametric · Eliminate the Parameter · Polar Points · Convert · Polar Graphs | TEKS P.3A–E |

`trig-ratios` is built, in the plan's eight levels and All Together, which
makes nine; the skill says why with `longerBecause`. Calculator answers round
only at the end, and a problem is kept only where 4-place working agrees with
the exact value. 45-45-90 depends on the Pythagorean theorem's Exact Answers.
30-60-90 asks for x and lets the figure's 30° or 60° mark say which leg it
is, and Complementary sin/cos keeps solve-for-x equations to about four rows
in ten.
`laws-sines-cosines` is built, as Sines: Side · Sines: Angle · Cosines: Side
· Cosines: Angle · Which Law? (strategy) · How Many Triangles? · ½ab sin C &
the Proofs · All Together. The proofs of both laws (G-SRT.10) are folded into
the area level, which rests on the same altitude, rather than made a ninth
level: about four rows in ten pick the next line of a proof from the height,
checked on concrete triangles. Which Law? depends on trig-ratios' Missing Side, where a tool is
first chosen by the sides in play. How Many Triangles? is added for the
ambiguous case, with an obtuse angle and no triangle among its rows. About
30% of Sines: Angle rows are the two-triangle case, and those name the one
meant; the rest say nothing about the count.
`radians` is built, as Degrees to Radians · Radians to Degrees · Coterminal
Angles · Reference Angles · Arc Length s = rθ · Sector Area ½r²θ · Angular
Speed · All Together. The plan's Degrees ↔ Radians is two levels, one each
way, and Sector Area is added beside Arc Length; the two depend on the
circles skill's Arc Length and Sector Area, where both are taken in degrees. Exact answers are the
coefficient of π, as a fraction. Reference Angles takes negative angles and
angles past a full turn in about a quarter of its rows. Nothing in the skill
takes a sine, so it does not depend on trig-ratios.
`unit-circle` is built, as Special Angles · Signs by Quadrant · Around the
Circle · Tangent · sec, csc, cot · From One Ratio, the Rest · All Together.
Around the Circle is added between the first-quadrant values and tangent,
for any angle by its reference angle, and depends on radians' Reference
Angles; Special Angles depends on trig-ratios' 30-60-90. Signs by Quadrant
and Tangent ask only about sin, cos and tan, leaving the reciprocals to their
own level, and every number on a level is typed in the roots box, so the box
never gives the form of the answer away.
`trig-graphs` is built, as Amplitude · Period · Midline · Phase Shift ·
Equation From a Graph · Sinusoidal Models · All Together, in the plan's
levels. Phase Shift depends on transforming functions' Left and Right, and
asks the shift as a choice so that the unfactored amount and the wrong
direction can both be offered. A drawn wave is ticked at multiples of
π/(2b), so every peak sits on a tick, and a Ferris wheel's equation is printed
only where a height is to be worked from it.
`identities` is built, as Pythagorean · Reciprocal & Quotient · Even & Odd ·
Cofunction · Sum & Difference · Double Angle · Identity or Not? · Next Step in
a Proof · All Together. Identity or Not? is added before the proofs, and
makes nine levels, which the skill explains with `longerBecause`: it asks
whether an equation holds wherever both sides are defined, half the rows
identities and half the slips the earlier levels warn against, many of
which hold at special angles, and about a quarter of its rows ask at which
of four angles a false one fails, so that one counterexample disproves and
agreeing angles prove nothing. Cofunction depends on trig-ratios'
Complementary sin/cos, so the skill depends on trig-ratios as well as the
unit circle. Exact values with two radicals are asked as choices, since the
roots input holds one, and Next Step in a Proof is capped at 300 problems,
drawn from 44 proofs, seven of which derive the sum, difference and
double-angle formulas (F-TF.9), cos(α − β) from a chord of the unit circle. Its wrong options are slips, and in about half the
rows a line already written, equal but a step back; the question says the
next line must be new.

`trig-equations` is built, as arcsin, arccos, arctan · Solve in Degrees ·
Solve on [0, 2π) · General Solutions · Multiple Angles · Quadratic-Type ·
All Together. Solve in Degrees and Multiple Angles are added: a set of
angles is typed only in degrees, where each is a number the solutions
input reads, and on [0, 2π) the set is chosen from four, as is every
general solution. Multiple Angles solves sin 2x, sin 3x and sin(x/2) over
the turns the argument makes. Rows on an axis or with no solution are
held to about a fifth of each solving level, so most need the reference
angle. arcsin, arccos, arctan depends on the unit circle's Special Angles
and From One Ratio, the Rest, Solve in Degrees on its Around the Circle,
General Solutions and Multiple Angles on the graphs' Period, and
Quadratic-Type on the identities' Pythagorean and quadratic equations'
By Factoring.

`domain-range` is built, as Domain of √ and Fractions · From a Graph ·
Ranges of Parents · Piecewise · Step Functions · Domain in Context · All
Together. Domain in Context is added for F-IF.5: whether the input is
counted or measured, and where a story starts and stops. From a Graph
depends on functions' Domain and Range, Ranges of Parents on
transforming functions' Combined, and Domain of √ and Fractions on
inequalities' The Flip and quadratic equations' By Factoring. Piecewise
and Step Functions mostly ask for a value, typed as a number, and in
about three rows in ten for a domain or range as a set (a step
function's range is separate values); the question says which, so the
levels and All Together mix them.

`composition` is built, as (f + g)(x) · f(g(2)) · f(g(x)) · Not
Commutative · Decompose · Domain of f(g(x)) · All Together. Its first
level depends on functions' Function Notation and polynomials' Trinomial
Times Binomial, and Domain of f(g(x)) on domain and range's Domain of √
and Fractions. f(g(2)) is typed in the whole-number box, a domain in the
solutions box and every formula in the expression box; the question says
which, so All Together deals from all six levels. Inverse functions, F-BF.4, are not
here: they are `inverses`, next in the plan, whose Check by Composing builds on this.

`inverses` is built, as Undo a Function · Solve for x ↔ y · Check by
Composing · Restrict the Domain · Graph Reflection · All Together. Undo a
Function depends on functions' Function Notation, Solve for x ↔ y on
equations' Two Steps, Check by Composing on composition's f(g(x)),
Restrict the Domain on functions' Vertical Line Test and quadratic graphs'
Vertex Form, and Graph Reflection on functions' Reading f off a Graph;
Undo a Function and Solve for x ↔ y also on roots' Cubes and Cube Roots,
since x³ + b and ∛(x − b) undo each other there, beside lines, fractional
slopes, a − bx and (ax + b)/(cx + d). A number goes in the fraction box, a
formula in the equivalent box, judged by value, and a reflected point in
the pair box; the question says which.

Log functions are not in `inverses`: they are a level of `logarithms`,
which builds on this skill's Graph Reflection (US courses teach inverses
first and the log as the inverse of bˣ), so `inverses` waits for nothing
in logarithms.

`radical-eq` is built, as Isolate & Square · Extraneous Roots · Both Sides
Radical · Square Twice · Cube Roots · Rational Exponents · All Together.
Square Twice is added: a root left after the first squaring is isolated
and squared again, and about a quarter of its rows let in an answer the
check throws out. Isolate & Square
depends on equations' Two Steps and roots' Perfect Squares, Extraneous
Roots on quadratic equations' By Factoring, Cube Roots on roots' Cubes and
Cube Roots, and Rational Exponents on rational exponents' Root, Then
Power. Every answer is a set, so a row whose candidates are all
extraneous is answered "no solution", and every prompt says there may be
none.

`rational-expr` is built, as Simplify · Excluded Values · Multiply &
Divide · Common Denominator · Unlike Denominators · Complex Fractions ·
Opposite Factors · All Together. Simplify depends on factoring's x² + bx
+ c, Excluded Values on quadratic equations' Zero Product, Multiply &
Divide on fraction multiplication's Dividing Fractions, and the two adding
levels on fraction addition's Same Denominator and Unlike Denominators.
Every answer but the excluded values is judged by value, so any finished
form is right; Unlike Denominators includes denominators that share a
factor, so the common one is not always their product.

`rational-eq` is built, in the plan's five levels and All Together. Clear
Denominators depends on rational expressions' Unlike Denominators and
equations' Two Steps, Extraneous on rational expressions' Excluded Values
and quadratic equations' By Factoring, Proportions With x on quadratic
equations' Rearrange to Zero First, Inverse Variation on proportional
relationships' Using y = kx, and Work & Rate on writing equations' Two
Things Equal and ratio's Unit Rate. As in radical-eq, the Extraneous level
keeps one answer in about three rows of five, both in one and neither in
one, and every equation in the skill offers none, so the wording never
says which rows need the excluded-value check. Work & Rate answers are
whole numbers, halves or thirds, a fifth being a decimal a student types
and a fraction box refuses.

`rational-functions` is built, in the plan's five levels, Intercepts,
Match the Graph and All Together. Vertical Asymptotes depends on rational
expressions' Excluded Values and domain and range's Domain of √ and
Fractions, Horizontal by Degree on polynomials' Degree and Standard Form,
Holes on rational expressions' Simplify, and Oblique on polynomial
division's Long Division. End Behavior, Intercepts and Match the Graph
build on this skill's own levels; an asymptote is met on Vertical
Asymptotes, so the skill no longer waits on exponential functions.
Vertical Asymptotes counts multiplicity, (x − 2)/(x − 2)² still having
one at 2; Intercepts makes a zero the top shares with the bottom a hole
rather than an intercept; Match the Graph draws f with its hole and asks
which formula it is, the asymptotes drawn once it is answered.

`poly-division` is built, in the plan's five levels, Rational Root
Theorem before All Zeros From One, and All Together. Long Division
depends on monomials' Dividing and polynomials' Binomial Times Binomial,
Remainder Theorem on using expressions' Substitute a Negative, and All
Zeros From One on quadratic equations' By Factoring. Long Division
divides by ax − b and by quadratics as well as x − c. A quotient is
typed, and judged by value, only when the division is exact; otherwise
every answer is a choice, a number or a set of zeros.

`poly-functions` is built, in the plan's five levels, Rational
Inequalities and All Together. Zeros & Multiplicity depends on graphs of
quadratics' Zeros From Factored Form and factoring's Common Factor Out,
End Behavior on polynomials' Degree and Standard Form and graphs of
quadratics' Up or Down, Sketch From Factors on functions' Reading f off a
Graph, Polynomial & Quadratic Inequalities on compound inequalities'
Either Side and quadratic equations' By Factoring, and Rational
Inequalities on rational expressions' Excluded Values. Rational
inequalities sit here rather than in rational-functions because they are
the sign chart of the level before with the bottom's zeros added, and
rational-functions has eight levels already. Graphs are drawn with every whole-number height
in the window listed, and the checker reads them from those heights.

`complex` is built, in the plan's five levels, Square Roots of Negatives
before them, and All Together. Square Roots of Negatives depends on roots'
Pulling Out Squares, Powers of i on exponents' Multiplying Powers and Zero
and Negative, Add & Subtract on polynomials' Adding, Multiply on Binomial
Times Binomial, Conjugates & Divide on Special Products, and Complex Roots
of Quadratics on the quadratic formula's The Discriminant. Answers are the
new `complex` type, judged by exact real and imaginary parts rather than by
`expr` or `equivalent`, neither of which knows that i² is −1. Every root of
a negative is made an i before it is multiplied, so √−4 · √−9 = −6; a root
that is not whole, √−18 = 3i√2, is a choice, since the box takes no root.

`logarithms` is built, in the plan's six levels and All Together. Log as
Exponent depends on exponents' Zero and Negative, Evaluate on rational
exponents' Negative Fractional Powers and exponential functions' e and
Continuous Growth (Evaluate is where ln, the log to base e, is first
used), Product, Quotient & Power on exponents' Dividing Powers and Power of
a Power, Solve Exponential Equations on solving equations' Two Steps and
exponential functions' Doubling and Half-Life and e and Continuous Growth,
whose models its time-to-grow stories (F-LE.4) solve for t, and Solve Log
Equations on quadratic equations' By Factoring and radical equations'
Extraneous Roots. ln & Change of Base builds on this skill's own Evaluate.
Exact answers are fractions; rounded ones are decimals to the places the
question names. Product, Quotient & Power both condenses and expands, and
every choice's decoys cross two misreadings, so the key is not the option
nearest all the others.

`logarithms` has a Log Functions level, before All Together, depending on
inverse functions' Graph Reflection: y = log_b x as the inverse of bˣ, the
x-intercept and the point at a height of log_b(x − h) + k (the key points
(1, 0) and (b, 1) moved), the range of a log or a power and the domain of
an inverse as the range of f, the domain and asymptote of the log of a line,
rising or falling (bases below 1, −log_b x, log_b(−x)), the four
reflections, vertical stretches including log₄ x = (1/2) log₂ x, matching a
drawn graph to its equation, and the inverse as a choice whose four options
are keyed by four functions in turn. Swapping a point's coordinates is a
tenth of it. The log of x² − c² is left out: its domain needs a quadratic
inequality, which is poly-functions', not a dependency here.

`exponential` gained e and Continuous Growth for this, as its ninth level
with a `longerBecause`: e as what compounding ever more often tends to,
then P(1 + r/n)^(nt), P·e^(rt), and a·e^(kt) read for its rate, its factor
each step and its value.

`systems-2` is built, as Line Meets Parabola · How Many Intersections ·
Line Meets Circle · Two Curves · Three Variables · No Solution or
Infinitely Many · Three-Variable Word Problems · All Together. Line Meets
Circle, Two Curves and No Solution or Infinitely Many are added: a line
and a circle centered anywhere, two parabolas, a circle and a parabola,
xy = k and a line, and the systems in three letters that do not fix one
point. Line Meets Parabola depends on systems' Substitution and quadratic
equations' By Factoring, How Many Intersections on the quadratic
formula's The Discriminant, Line Meets Circle on circles' Equation of a
Circle, Three Variables on systems' Elimination, No
Solution or Infinitely Many on systems' None or Infinitely Many, and the
word problems on systems' From Words. The points where curves meet, and the
solution (x, y, z), go in a new `points` box that judges them as a set;
How Many Intersections asks its count as a choice and a tangent's k as a
number, each said by its question. Two Curves is capped at 450 rows, since
a circle and a parabola meeting at whole points run out at a few hundred.
Two Curves also meets a circle with x² − y² = B, and two circles, where
subtracting one equation from the other takes x² out. The word problems add
three items priced two at a time and a bakery's batches from what it used,
so two rows in three need all three equations; prices are answered in
dollars, ($4.50, $1.00, $0.75). Where curves meet, the answer brings both
curves and the meeting points on a plane, drawn only once answered. The
explanations show the substitution before simplifying, a fraction cleared,
and every elimination step; How Many Intersections counts a line and a
circle by the discriminant.

`binomial` is built, as Pascal's Triangle · Coefficients by Combinations ·
A Given Term · Full Expansion · The Constant Term · Binomial Probability ·
All Together. The Constant Term and Binomial Probability are added: the
term of (x² + 1/x)ⁿ where the powers cancel, and exactly, at least or at
most k successes in n tries. Coefficients by Combinations depends on
counting's Combinations, A Given Term on monomials' A Power of a Monomial,
Full Expansion on polynomials' Special Products, The Constant Term on
exponents' negative-exponent and power-of-a-power levels, and Binomial
Probability on probability's independent events. Counts and coefficients
are whole-number box answers, an expansion an expression, and a
probability a fraction, each said by its question. The Constant Term is
capped at 520 rows, since its constant terms run out at a few hundred.
Pascal's Triangle draws the rows above the asked one as a table, the asked
row its answer, so its next-row and coefficient questions stop at row 8.
Coefficients by Combinations cancels C(n, k) from the smaller side, and A
Given Term, Full Expansion and Binomial Probability keep their numbers to
hand size; Full Expansion reaches fifth and sixth powers.

`series` is built, as Arithmetic Sums · Finite Geometric · Sigma Notation ·
Infinite Geometric · Series in Context · Working Backward · All Together.
Series in Context and Working Backward are added: stories of seats, stacks,
savings, pay, a pendulum and a bouncing ball, and the formulas read the
other way, how many terms make a total, a difference or a first term from
the sum, and aₙ = Sₙ − Sₙ₋₁. Arithmetic Sums depends on sequences' Any
Term, Finite Geometric on its Geometric Terms, and Working Backward on
quadratic equations' By Factoring, since the count of terms is a root of a
quadratic in n. Every answer is a fraction box answer, whole or not, so the
box says nothing of the form. Sigma notation is drawn by a new `sigma`
prompt term with stacked limits, and is only ever read, never typed, so no
Σ key is needed. An infinite series with no sum is asked as a choice of
four series, half the rows asking which has a sum and half which has none.
Sigma Notation also asks writing a series in sigma, as a choice of four
one-line sigmas (Σ from k = 1 to 10 of (2k + 1)), since choice labels cannot
stack limits, their wrong options crossing a slip at each limit, and the sum
rules Σc = nc, Σc·aₖ = cΣaₖ, Σk = n(n + 1)/2 and Σk² = n(n + 1)(2n + 1)/6.
Working Backward's count of terms factors at By Factoring's size once its
common factor is divided out, and the explanation factors it. Every geometric
sum is worked as a₁(1 − rⁿ)/(1 − r), and every series answer fits the
fraction box, four characters top and bottom.

`conics` is built, as Which Conic? · Parabola Focus & Directrix ·
Ellipses · Hyperbolas · Writing the Equation · Completing the Square ·
Match the Graph · All Together. Writing the Equation, Completing the
Square and Match the Graph are added: an ellipse or hyperbola from its
center, a vertex and a focus (or both vertices and both foci), the center
or vertex out of general form, and the equation of a drawn conic. Writing
the Equation also starts from the definition: the foci and the constant
sum (an ellipse) or difference (a hyperbola) of the distances to them,
which is 2a (G-GPE.3, TEKS P.3G). Circles
from general form are not repeated, since circles' Complete the Square for
Center already asks them; a circle is one of the four answers to Which
Conic?. Which Conic? depends on circles' Equation of a Circle, Parabola
Focus & Directrix on graphs of quadratics' Vertex Form, and Completing the
Square on circles' Complete the Square for Center. Foci and vertices are
exact points, two in the points box and one in the pair box, so the
ellipses and hyperbolas whose foci are asked are built on Pythagorean
triples; lengths, slopes and a directrix's number go in the fraction box.
Rows about foci, a directrix or asymptotes carry the graph, which the
checker holds to the equation read back as a polynomial; rows about
vertices carry none, since the vertices could be read off it.

`vectors` and `parametric-polar` are TEKS-only and come last, in a new
category, Vectors & Polar, under Trigonometry: both are worked with cos θ
and sin θ throughout.

`vectors` is built, as Components · Magnitude & Direction · From Magnitude &
Direction · Adding & Subtracting · Scalar Multiples · Unit Vectors · Dot
Product · Resultants · All Together, nine levels with a declared reason:
the dot product, the angle between two vectors and orthogonality are a
technique of their own that calculus and physics use. Magnitude & Direction builds on the Pythagorean
theorem's distance and trig ratios' Missing Angle, with angles past 90° from
the unit circle's reference angles; From Magnitude & Direction on trig
ratios' Missing Side. A vector is typed in its own box as <3, −4>, read as
⟨3, −4⟩, with 3i − 4j read too and a round-bracket pair asked again as a
point, in any order and with bracketed coefficients. Every direction is
counterclockwise from the positive x-axis, 0° to 360°, or a bearing
clockwise from north, and every question says which; a quarter of
Resultants is on bearings and depends on trig ratios' Elevation &
Bearings. An exact length is asked "with any radical in simplest form"
whether it has one or not, and previews as |v| =; unit vectors are built
on Pythagorean triples so their components are fractions, every unit
vector question says "exactly", and a decimal typed for a fraction with no
ending decimal is asked again; a rounded component, angle or resultant
agrees to 1 dp with its trig values copied to 4 places.

`parametric-polar` is built, as Plot Parametric · Eliminate the Parameter ·
Parametric Motion · Polar to Rectangular · Rectangular to Polar · Converting
Equations · Polar Graphs · All Together. Eliminate the Parameter builds on
conics' Ellipses, Plot Parametric on the unit circle's Special Angles (only
the angles on the axes), Parametric Motion on vectors' From Magnitude &
Direction and the quadratic formula, Polar to Rectangular on the unit
circle's Around the Circle (120°, 300°, 7π/6) and radians, Rectangular to Polar on vectors' Magnitude &
Direction, and Converting Equations on circles' Equation of a Circle. A
point goes in the pair box, an eliminated line in the line box as y in
terms of x, an exact coordinate or r in simplest radical form, an angle or
a thrown ball's height, distance or time to 1 dp; an eliminated curve, a
converted equation and a drawn polar graph are chosen from four options
crossing two slips, and a curve's name from Circle, Cardioid, Limaçon and
Rose. Every question in degrees says so, and every polar angle is from 0°
to 360°. Polar to Rectangular gives negative r as well as positive, and
plots a point on a polar grid (rings and 15° spokes), which drawn polar
graphs use too; Rectangular to Polar asks r > 0, an exact polar form at a
special angle in degrees or radians, and another name for one point (a
negative r half a turn round, or a whole turn). Plot Parametric asks which
way a curve runs; Parametric Motion asks only times before the ball lands,
prints the path in half its rows, asks the range and the greatest height,
and asks which equations model a throw (TEKS P.3C).

## Category sizes when complete

Functions 9, Equations 9, Expressions 8, Coordinates 8, Powers 7; everything
else under 6, Vectors & Polar 2. `logarithms` is filed under Powers (a logarithm is an exponent)
and `linear-models` under Coordinates to keep Functions under the cap.

## Sources

- Common Core State Standards for Mathematics: https://www.thecorestandards.org/Math/
- TEKS via Cornell LII: https://www.law.cornell.edu/regulations/texas/19-Tex-Admin-Code-SS-111-39
  (and §111.28, §111.40, §111.41, §111.42)
- ESSA's limits on federal curriculum control:
  https://educationcounsel.com/our_work/latestcounsel/consistent-with-applicable-law-critical-statutory-constraints-on-president-trump-s-executive-order-about-k-12-curricula
