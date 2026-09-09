# Versine

Math practice for people who are going somewhere with it.

A self-hosted practice game covering arithmetic, algebra, geometry and trig as
one connected subject rather than four separate ones. The measure of success is
simple: a student who is proficient across this catalogue is genuinely ready to
begin calculus.

Runs on a machine on your own network. Kids reach it from a laptop or a phone
with nothing to install; parents get a console to see how it is going.

> The **versine** is an old trigonometric function, `versin θ = 1 − cos θ`. It
> filled the navigation tables that got ships across oceans, and then quietly
> fell out of use when calculators arrived. It seemed a fitting name for a
> project about the parts of mathematics that are worth knowing in your bones.

MIT licensed. Use it however you like.

## Vocabulary

One name per thing, used in the code, the database, the UI and in conversation.
If a word appears here, it does not have a synonym anywhere else.

| Term | Means |
|---|---|
| **Skill** | A named area of practice, e.g. *Integer Add & Subtract*. Contains Levels. Listed on the Map. |
| **Level** | One step inside a Skill, teaching one idea. The unit of practice, progress, unlocking and scheduling. |
| **Last level** | Exactly what it says: the final Level of a Skill. By convention it mixes every Level before it, and clearing it in a Time Trial finishes the Skill for the day. Not a separate kind of thing — a position. |
| **Mode** | How a Level is practised: *Practice* or *Time Trial*. |
| **Run** | One session of one Level in one Mode. |
| **Attempt** | One answer to one Problem. Every attempt is recorded. |
| **Problem** | A single generated question. |
| **Map** | The screen listing every Skill. |
| **Student / Teacher** | The two roles. Teachers see the console. |
| **depends_on** | A soft "builds on" link. Never a gate. |

There is no *tier*. It was renamed to Level everywhere — including the database
columns — precisely so that no one has to translate between what the code says
and what the screen says.

There is deliberately no *capstone* either. "Capstone" has established meanings
in education, and this vocabulary should not spend that word on "the last item
in a list" when plain words do the job.

Built for two teenagers who are past the age where a cartoon mascot helps.

It runs on one machine on the home network. The kids reach it from their
laptops or phones with a browser — nothing to install on their devices.

## Running it

On the server (needs only Docker):

```bash
git clone <your-repo> versine && cd versine
docker compose up -d
```

Then open `http://<server-ip>:8000` from any device on the LAN.

## Accounts

The very first screen creates the **teacher** account — that's the one that can
see everyone's progress and remove people.

After that, anyone signs themselves up: the sign-in screen has a **New profile**
tile, and whoever taps it picks an icon and a colour, types a name, and chooses
a 4-digit PIN. No grown-up needed to get started. Self-serve profiles are always
students, so nobody can grant themselves the teacher role.

A teacher can **delete** a student from the console (which erases that student's
entire history, so it asks twice), and can add a second teacher for another
adult. PINs are hashed, never stored in the clear, and rate-limited after five
wrong tries — enough to stop a bored sibling, which is the actual threat model
on a home network.

To update:

```bash
git pull                      # frontend changes are live on a browser refresh
docker compose restart        # …and backend changes after this
```

`web/` and `server/` are bind-mounted, so a rebuild is only needed when
`requirements.txt` changes (`docker compose up -d --build`). Progress lives in
`data/progress.db` on the host and is never touched by either.

## Staying up to date

The server updates itself. At boot, and again at 04:30, it checks the git
remote and — if there is something new and it can be applied safely — pulls it,
restarts, and confirms the result actually works.

```
scripts/install-autoupdate.sh     # run once, on the server
```

That checks prerequisites, installs a systemd timer and service, and starts
them. After that there is nothing to do: pushing to the remote is how the
server gets new code.

```
systemctl list-timers versine-update.timer   # when it next runs
journalctl -u versine-update.service -n 50   # what it did last time
sudo systemctl start versine-update.service  # do it now
curl localhost:8000/api/health                    # which commit is serving
```

### What it does, in order

1. **Takes a lock.** Boot and the nightly run can overlap; only one proceeds.
2. **Fetches.** No remote, no network, or nothing new — it logs that and stops.
   The app keeps running either way.
3. **Backs up the database**, before any new code can migrate it, using
   sqlite's backup API rather than `cp` — the database runs in WAL mode and
   copying the file alone can capture a torn state. Ten backups are kept, each
   named for the commit it was taken ahead of.
4. **Fast-forwards only.** Uncommitted edits on the server, or a diverged
   branch, mean it declines rather than merging or discarding.
5. **Rebuilds only if it must.** `web/` and `server/` are bind-mounted, so most
   updates need no image build — only a change to `Dockerfile`,
   `requirements.txt`, or `docker-compose.yml` triggers one.
6. **Proves it works.** It polls `/api/health`, which opens the database and
   counts users, so a build whose migrations failed cannot pass. If it does not
   come up healthy within 90 seconds, the checkout is reset to the previous
   commit and restarted.

### The rule it follows

**A kid sitting down to practise must find a working app.** Every decision
above falls out of that. The update is an improvement on a running system, not
a precondition for one — `restart: unless-stopped` has the container up long
before the timer fires, so an unreachable remote or a failed update costs
nothing but staying on yesterday's version. When the script declines to update
it exits 0, because declining is correct behaviour; a non-zero exit means a
genuine failure worth looking at in `systemctl status`.

### Knobs

Set these in the unit file if the defaults do not suit:

| Variable | Default | |
|---|---|---|
| `VERSINE_BRANCH` | current branch | branch to track |
| `VERSINE_PORT` | `8000` | where to health-check |
| `VERSINE_HEALTH_TIMEOUT` | `90` | seconds to wait before rolling back |
| `VERSINE_KEEP_BACKUPS` | `10` | pre-update backups to retain |

### Before any of this works

The repository needs a remote to pull from, and at least one commit:

```
git add -A && git commit -m "Initial commit"
git remote add origin <url>
git push -u origin master
```

Until then the timer installs and runs happily, finds no remote, and leaves the
checkout alone.

## Backing up

Everything — accounts, XP, unlocked tiers, every attempt ever answered — is in
the single file `data/progress.db`. It is gitignored, so it exists in exactly
one place unless you copy it.

```bash
cp data/progress.db "data/progress.backup-$(date +%F).db"
```

SQLite runs in WAL mode, so copy it while the server is stopped, or use
`sqlite3 data/progress.db ".backup data/backup.db"` to copy it safely while
it's running.

### Developing

```bash
./dev.sh          # venv + uvicorn with auto-reload on http://localhost:8000
```

No build step and no frontend toolchain — the browser loads the ES modules in
`web/` directly, so a change is live on refresh.

## How it fits together

Two skills are built: **Integer Add & Subtract** and **Integer Multiply &
Divide**, six tiers each.

```
server/           FastAPI + SQLite. No ORM; the queries are the interesting part.
  app.py          routes, auth gating, run recording
  db.py           schema and progress queries
  auth.py         PIN hashing, session tokens, lockout
web/
  engine/         mode-agnostic game machinery
    session.js    one run: serving, scoring, retry queue, end conditions
    modes.js      Practice / Sprint / Survival / Mastery as policy objects
    scoring.js    points, XP, level curve
    rng.js        seeded RNG, so a run can be replayed from its seed
  math/answer.js  answer *types* — parsing, comparison, formatting
  ui/             screens and the shared visual widgets
    visuals.js    registry: skill names a visual kind, this dispatches it
  skills/         one module per skill  ← this is where new content goes
```

The engine knows nothing about any particular skill. A skill module is
responsible for three things and nothing else: generating a problem, saying
what a correct answer looks like, and describing how to picture it.

## Adding a skill

Three files, in this order.

**`web/skills/<id>.js`** — what the student sees. Levels with their names,
slugs, blurbs and par times, and the skill's identity. It imports nothing and
computes nothing; it is data.

```js
export const LEVELS = [
  { name: 'Same Denominator', slug: 'same-denominator', blurb: '…' },
  { name: 'All Together', slug: 'all-together', blurb: '…' },
];
export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [12, 22];

export default {
  id: 'frac-addsub',
  name: 'Add & Subtract Fractions',
  category: 'parts',            // must be one the registry declares
  glyph: '⁄',
  blurb: 'Matching the pieces before you combine them.',
  answerInput: 'frac',
  dependsOn: ['int-addsub'],
  levels: LEVELS,
};
```

**`tools/generators/<id>.js`** — how its library gets written. Build-time only;
nothing served to a browser imports it.

```js
export function generate(rng, level) {
  return {
    prompt: T.asks(T.frac(1, 2, 1), T.op('+'), T.frac(1, 3, 2)),
    text: '1/2 + 1/3',                        // plain text, for the attempt log
    answer: { type: 'frac', value: { n: 5, d: 6 }, requireSimplest: true },
    parSeconds: PAR_SECONDS[level],
    visual: { kind: 'barmodel', /* … */ },    // or null
    explain: 'Rewrite both over 6 first…',    // sentences become lesson steps
  };
}
```

**`web/engine/registry.js`** — one import and one array entry.

Then `node scripts/build-library.mjs` writes the library and warns about levels
too small to be worth drilling. Nothing else in the codebase needs to change.

Eight levels is the guide length. A skill much longer than that is usually two
skills that were never separated, and the split to make is by depth — the
foundations stay, the harder work becomes a skill that depends on them — so a
student finishes something rather than grinding down a list that never ends.
It is a guide and not a law: a skill may run longer if it declares
`longerBecause: '…'`, and `check-catalogue.mjs` then prints the reason on
success instead of failing. Without a reason it still fails. The point is that
the exception is written where the next person reads it, since a rule that can
be broken silently is decoration.

### Where a new skill goes on the map

Two layers. A **subject** is the broad territory — Arithmetic, Algebra,
Geometry, Trigonometry, Chance & Data. A **category** is a working group of
three to ten skills inside it.

Two rather than one because "Trigonometry" and "Calculus" are territories, not
groups. Filing every trigonometric skill under a single heading produces
exactly the twenty-skill bucket that tells a student nothing, which is the
failure the split exists to avoid. `check-catalogue.mjs` fails a category that
grows past ten.

**A subject is where a category is filed, not a claim about which branch owns
it.** The separation of arithmetic from algebra from geometry is an accident of
how textbooks are sold, and several categories genuinely sit in two places:
Coordinates is coordinate geometry *and* it is linear functions; Powers &
Roots is arithmetic *and* it is algebra. Each is filed once, where a student is
most likely to look, and a comment beside it says where else it belongs.
Nothing in the engine treats a subject as ownership, so no skill is kept from
anything by the box it sits in.

Expressions and Equations are separate categories because that boundary is
real rather than a size cut. An expression is a thing you rearrange; an
equation is a claim you test. Blurring the two is behind a great deal of what
later looks like carelessness.

The subject and category travel on the card rather than as headings above the
grid: a heading per group forces a row break, and with two skills in a group
every row would leave a track empty.

**The grid is ordered by dependency, not by filing.** Walking subjects, then
categories, then skills is how the catalogue is *filed*, and reading it out in
that order put Factors & Multiples — where lowest common multiple and greatest
common factor are taught — after all eight fraction skills that stand on it,
and Ratio & Rate after the Percents level that needs it. A student scrolling
for the thing they are missing passed everything that needs it first and could
reasonably conclude it was not in the catalogue at all.

`mapOrder()` in the registry walks the same filing order with one rule added:
a skill's dependencies are laid out before it, recursively, and then the
category it interrupted carries on. Nothing is ever pushed back — a skill only
moves earlier, to the first point where something needs it — so the curated
order survives everywhere it was not actually wrong. The cost is that a
category may no longer be contiguous, which is affordable precisely because
the grid has no headings: every card names its own subject and category, so a
split category costs a student nothing while a prerequisite filed after its
dependents costs them the skill. `check-catalogue.mjs` fails a map order that
draws a skill before something it builds on.

Categories and subjects with no skills yet are declared anyway. They cost a
line, they say what the catalogue is for, and they stop the next skill being
filed under whichever existing name is least wrong. Empty ones do not render.

A skill filed under a category the registry does not declare — or a category
under an undeclared subject — would not appear on the map at all, silently,
because the map is built by walking subjects and then categories. That is a
typo away at any time, so both are failing checks.

### Answer types

`web/math/answer.js` exists so that fractions and expressions are not
string-compared. The input widget follows the *problem*, not the skill —
Improper & Mixed Numbers asks for three boxes one moment and two the next, and
the play screen swaps them without knowing what either is. `Enter` always
submits; `/` and Space move between boxes.

A level may set `requireSimplest`, and the engine enforces it: an answer that
is the right *value* in the wrong *form* is refused with the reason — *"3/9 is
right, but it isn't in lowest terms yet."* Value and form are separate checks,
so a level can demand one without the other.

`int`, `frac`, `mixed`, `decimal`, `choice` and `expr` are defined. Decimals
are held as an integer over a power of ten rather than as a float, because
0.1 + 0.2 is not 0.3 in binary and a drill that marks a correct answer wrong
once has lost the student for the session.

## The learning graph

Nodes are exactly what a student sees — Skills, and the Levels inside them.
There is no separate vocabulary of tags or concepts to keep in sync, because
the things being related are the same things the UI already renders.

```js
// in a skill module
dependsOn: ['int-addsub'],                     // Skill -> Skills, coarse

levels: [
  { name: 'Sign Rules',
    dependsOn: [{ skill: 'int-addsub', level: 1 }] },   // Level -> Level, precise
]
```

**`depends_on` is the gate.** A Skill is closed until every Skill it depends
on has been *finished* — which means clearing that skill's last level against
the clock, the same thing the "done for today" banner has always meant. The
last level mixes every level before it, so it cannot be cleared without the
rest, and nothing new had to be recorded to support this.

This reverses an earlier rule, and the reversal is worth recording because
the original reasoning was not wrong so much as incomplete. The edges were
advisory on the grounds that a student who wants to jump ahead should be
allowed to. What that missed is what a beginner actually sees: twenty skills
at once, no indication of where to start, and no way to tell which of them
they have the arithmetic for. Gating costs the confident student almost
nothing — clearing a foundational skill's last level once is quick if you can
already do it, and if it is *not* quick then the gate has just told them
something true. It is a placement test that happens to also be practice.

Levels inside a Skill unlock in order and stay unlocked: `level` is a
high-water mark that never regresses, so a student returns to a finished skill
and plays only its last level, which is what marks the skill done for that day.
A skill that has not had *every* level cleared carries a **new** badge, so
"there is more in here than you have seen" is visible from the map.

A Level may only depend on Skills its parent Skill already declares, so the
precise edges can never contradict the coarse ones. Access is decided by the
coarse edges alone — a level-precise edge never gates a skill, or one level
deep inside a skill could close the whole thing. `validateGraph()` in
`web/engine/registry.js` checks that, plus unknown ids, out-of-range levels,
cycles, and that at least one Skill has no dependencies at all; without a root,
nothing is open on day one and the catalogue is unplayable. `check-catalogue`
then drives the real gate from an empty account and fails if any Skill can
never be reached.

**The graph must be acyclic. This one is a requirement, not a guide.** Three
separate things walk these edges and none of them means anything on a looped
graph: the map lays skills out in dependency order, so a cycle is a set of
skills with no honest place to draw any of them; the gate opens a skill when
what it builds on is finished, so a cycle is a set of skills each waiting on
the others, which nobody can ever open; and `depthOf` weights advanced work
above the basics by measuring the chain beneath a skill, which a loop makes
meaningless. `validateGraph()` reports a cycle by name, `check-catalogue.mjs`
fails on it, and `build-library.mjs` refuses to write anything at all — a
fault should be caught by the tool that could have introduced it, not only by
the one that ships.

`check-catalogue` checks the same property one layer down, over Levels rather
than Skills, by peeling every level off in dependency order. That one is
derivable — a level may only depend on skills its own skill declares, so every
fine edge lies over a coarse one — but it is checked anyway, because a derived
guarantee stops holding silently the moment the rule beneath it is relaxed,
and because the fine graph carries edges the coarse one does not: levels
unlock in order, so each waits on the one before it.

The fix is **never** to delete whichever edge closed the loop. That edge is
usually true, and deleting it leaves the catalogue lying about what rests on
what. The fix is to split: a cycle says two skills each need the whole of the
other, which is nearly always a sign that one of them is two skills. The part
that is genuinely needed earlier becomes its own skill, and the rest depends
on it. A skill therefore cannot grow past the point where something inside it
is needed by something it needs — a mechanical ceiling on how large a skill
can get, arrived at from a completely different direction than the eight-level
guide, and one to work *with* rather than around.

Since an edge now costs access, a connective edge is no longer free. Coordinates
had one to Ratio — a gradient is a unit rate, which is true and worth saying —
and it put reading a point off a grid behind eight skills. The edge went; the
sentence stayed, in the explanation a student reads when they get one wrong.
Declare an edge when the second skill is genuinely needed to *do* the first;
say the rest in words.

The edges worth the most are the ones that say **this is that move again**.
Scaling a ratio is building an equivalent fraction, putting a ratio in
simplest form is dividing out the greatest common factor, and taking a share
of a total is multiplying by a fraction — three notations over one piece of
arithmetic. Left undeclared, a student meets each a second time as a new
topic and learns it twice, which is most of what "bad at fractions" turns out
to mean. So the edge is declared and, where it matters, the *picture* is the
same picture: `quantitymodel` and `ratiomodel` draw the same bar because
`3/8 × 24` and "3 : 5 of 24, first share" are the same question.

An earlier design described problems with a faceted tag vocabulary
(`rule:sub-a-negative` and so on). It was removed: it needed its own grammar,
its own curation policy, and it invited a combinatorial explosion of
relationships between attributes. The graph above says the same useful things
using artefacts that already exist. Every Attempt still stores the literal
problem text, so finer-grained analysis remains possible after the fact if it
is ever actually needed.

## Generators are authoring tools, not runtime code

The catalogue is the set of problem libraries in `web/library/`. Those files
are what students are served, and they are the thing to edit when a problem is
wrong: correcting one row is immediate and reviewable, where debugging the code
that produced it is neither.

Generators exist to write a library's first draft — nobody hand-authors a
thousand problems — and to rebuild one wholesale on the rare occasion that is
warranted. They live in `tools/generators/`, outside `web/`, and **nothing the
server serves imports them**.

```
tools/generators/frac-addsub.js   how to manufacture the problems   build time only
web/skills/frac-addsub.js         levels, names, dependencies       shipped
web/library/frac-addsub-*.json    the problems themselves           shipped
```

A skill file in `web/skills/` now imports nothing at all: it is level metadata
and the graph edges, no logic. `scripts/check-catalogue.mjs` fails the build if
one starts exposing `generate()` again.

### When is a generator still worth running?

Rarely, and that is the point. Reach for one when a fault is *systematic* —
when the same flaw affects too many rows to fix by hand, or a level is being
redesigned. A single bad problem is fixed in the library.

Because of that, `build-library.mjs` will not overwrite a library that already
exists; it reports what it would change and leaves the file alone. Regenerating
is deliberate:

```
node scripts/build-library.mjs            # write libraries that do not exist yet
node scripts/build-library.mjs --check    # report what the generators would change
node scripts/build-library.mjs --force    # regenerate, discarding hand corrections
```

Determinism is designed in: seeds come from the skill id and level, and rows
are sorted before writing, so an unchanged level produces a byte-identical file
and a diff shows only what really moved.

### What is checked before a deploy

`scripts/update.sh` runs both before it will start a new version, and rolls
back if either fails:

- `scripts/check-library.py` — every row usable: required fields, a known
  answer type, non-empty accepted forms, no duplicate problems, sane par
  times, and for a choice row that its correct option is among the options.
  Python, so a server needs no JavaScript runtime to refuse a bad deploy.
- `scripts/check-catalogue.mjs` — the learning graph, and the rules for where a
  strategy level may sit. Skipped when node is absent.

Neither checks a library against its generator. A hand-fixed library is
*supposed* to have diverged, and a check like that would refuse to deploy the
very correction someone had just made.

## Strategy levels

Most levels drill a procedure. A **strategy level** drills the choice *between*
procedures — which form to convert to, which method to reach for, when a
shortcut is worth taking and when it is a trap. It is marked `kind: 'strategy'`
and shows a "judgement" tag on the map.

Being able to convert both ways and having no idea which one the situation
wants is most of what "bad at fractions" actually means. The same is true
further up: expanding and factoring are both easy, and knowing that you factor
to solve and expand to evaluate is the part that decides whether algebra feels
like a machine or a mystery.

### Where they go

Two rules, and the second is the one that is easy to get wrong.

**Place a strategy level where the choice first costs something.** That is
usually *not* the skill that introduced the concept. Converting between
improper and mixed numbers is taught in `frac-mixed`, but the choice only
starts to matter once you are multiplying — so the strategy level sits after
both the conversions and the multiplication, at the first point where picking
wrong is expensive.

**Never let a strategy level be where a topic is first met.** Working a
judgement question in early, by referring to something the student has not
covered, buys the strategic layer at the cost of teaching the topic badly. If a
strategy level needs a topic, the skill must depend on it — and the level
declares a level-precise `dependsOn` naming the skill that creates the need.
`validateGraph()` enforces that the level's dependencies are declared by its
skill, so this cannot drift silently.

Placed correctly, the level lands close to the need and the ideas link
together. Placed early, it is trivia.

### Answering them

Strategy levels use the `choice` answer type: two or more options, picked with
the number keys or the arrows, submitted with Enter like everything else. They
carry **no visual** — every model leans toward one representation, and a
leaning model answers a question that is entirely about which way to lean.

## Level

A student's Level is **not accumulated experience**. XP in games measures how
long you have played rather than what you can do, and it can only ever go up —
which misrepresents arithmetic, because a skill you stop practising genuinely
does get slower and less accurate.

So Level is computed fresh from present ability, and it can fall:

```
for every level the student has cleared:
    contribution = weight × quality
Level = floor(sum of contributions) + 1
```

- **weight** — harder material counts for more. Depth in the dependency graph
  (`+0.5` per step) times position within the skill (`+0.15` per level).
- **quality** — how well they perform it *now*, measured over the **last 40
  answers** at that level. Accuracy **multiplies** rather than averages, so
  being fast can never rescue being wrong.

Note what is absent: **time**. The Level never drifts down because a student
stopped playing. Decaying on the calendar would be a guess about what happened
while nobody was looking, and this number is meant to record what was actually
demonstrated. The Level falls only when a lower standard is genuinely shown,
and rises again the moment a better one is.

Because `quality` is measured over the last *N answers* rather than the last
*N days*, a level nobody has touched for months keeps its last demonstrated
standard rather than collapsing to zero.

## The Time Trial clock calibrates itself

Nobody sets a clock by hand — not the teacher, not the student, not the author
of a skill. It arrives one of three ways:

1. **Not yet.** A level with no history keeps its Time Trial locked. You must
   practise it first; Practice quietly times you while you learn it.
2. **Seeded.** After 8 answers, the clock is set to the pace you actually
   practised at: `median × target`. Keep up your own practice pace and you pass
   exactly.
3. **Adapted.** After every trial the clock moves, stored per student per
   level in `level_clocks`.

The controller reads one signal from each outcome:

| Outcome | Clock next time |
|---|---|
| Ran out of time | **+15%** |
| Finished with more than 20% of the clock unused | **−10%** |
| Finished narrowly | unchanged — this is the right level of hard |

Asymmetric on purpose: relief arrives faster than pressure, so a struggling
student is helped quickly while a strong one is squeezed gently. Bounded to
3–40 seconds per problem so it can never reach an absurd value, and rounded to
5 seconds so it reads like a clock rather than a measurement.

Accuracy needs no separate rule here — wrong answers eat the clock, so
inaccuracy shows up as failing to finish, and the clock loosens in response.

### Why the Level does not use this clock

`rating.js` measures quality against the level's **authored reference pace**,
not the student's personal clock. If it used the personal clock, every student
would be measured against their own moving bar, everyone would converge on
similar Levels regardless of ability, and comparing two students would become
meaningless. So the gate adapts; the yardstick does not.

## Review, not decay

Time still matters — it just asks a different question: *is this worth
revisiting?* rather than *should this count for less?*

A cleared level is `fresh`, `due` (14 days untouched) or `stale` (35 days).
That state never touches the Level. It drives two suggestions:

- the Map flags levels that have gone quiet, and notes that revisiting them
  re-establishes where the student stands;
- opening a skill whose **direct dependency** has gone stale offers a one-tap
  warm-up on that specific level.

Both are prompts, never locks — `depends_on` is soft, so a student who wants
to press on may. Targeting the warm-up at direct dependencies keeps the
suggestion small and relevant, rather than blocking everything behind a chore
list of everything that has aged.

Full activity history is still recorded for the teacher console; it simply
isn't what determines the Level.

## Lessons

A lesson is a **worked example stepped at the student's pace**, using the
level's own visual. Nothing extra had to be written for it: `explain` was
already the sentences of an argument, so splitting it gives the commentary,
and the visual holds its *asking* state until the final sentence — the moment
the answer is being explained rather than merely shown.

```
1/2 + 2/5   [two bars, different pieces]   "Both sides rewritten before they combine."
     ↓      [still asking]                 "2 and 5 both divide into 10…"
     ↓      [bars re-divide, result fills] "Now the pieces match: 9/10."
```

Because of that, every level has a lesson today — 36 of them, averaging three
steps — with no per-level authoring. A skill can override with its own
`lesson(problem, level)` when the derived version isn't good enough.

That also imposes a rule on the prose: **an explanation must end on its
conclusion**, since the last sentence is the one the reveal lands on. Two
skills had explanations trailing off into an aside after the answer; both were
reordered.

### Video, when you want it

A level can point at a recording instead:

```js
{ name: 'Unlike Denominators', lesson: { video: 'lessons/unlike.mp4' } }
```

Where a file exists it is offered; where none does, the walkthrough runs. Videos
can be recorded one level at a time, whenever, with nothing to rework in
between and no level ever left without something.

### Where it appears

- a slim **banner on the mode screen**, above Practice and Time Trial —
  deliberately not a third mode card, since that choice was cut to two on
  purpose and this is what you do *before* practising;
- the **"Why?" button inside Practice**, which now steps through the problem
  actually on screen.

It is an overlay, not a screen, so a run never loses its state because someone
asked how something works. It captures the keyboard while open — `Enter` or
`Space` advances, `Escape` closes — and hands it back on close.

## Modes

Two, deliberately. Every extra mode is another decision standing between a kid
and the maths.

| Mode | Shape |
|---|---|
| **Practice** | Untimed, unlimited, explanations on tap. Wrong answers just come back around. The place to learn something. |
| **Time Trial** | Solve the target before the clock runs out and the next tier unlocks. Mistakes cost seconds, not lives. The place to prove it. |

Time Trial is the gate — there's no separate mastery test to sit. A wrong
answer is never fatal in either mode: you get another go, and in a Trial the
penalty is simply the time it took.

Scoring gives the speed bonus only on a first-try solve, so guessing fast is
always worse than answering slowly and correctly. Missed problems return a few
questions later in the same session.

## Levels, the last level, and "done for the day"

Every skill ends with a **last level** that mixes all the levels before it, in
random order with no warning which shape is coming. Earlier levels teach one
idea at a time; the last level checks you can tell them apart.

A skill is **not done for the day** until that last level is cleared in a Time
Trial. Practising an easy level all afternoon does not tick the box, and
neither does practising the last level without the clock, nor failing the
trial.
That single rule is what the streak counts: consecutive days *finished*, not
days merely touched. The day strip shows both — solid gold for a finished day,
faded for a day practised without finishing.

The skill's tier count travels with each submitted run, so the server knows
which level is last without hardcoding anything per skill. Add a seventh level
to a skill and it becomes the new finish line automatically.

## Visuals

Each skill names the kind of picture its problems want, and `web/ui/visuals.js`
dispatches on it. The play screen never learns what kinds exist, so adding a
bar model for fractions means adding one entry to that registry.

Twelve exist so far:

- **`numberline`** — integer addition and subtraction. Chained hops.
- **`signmodel`** — multiplying and dividing with signs. Splits the problem
  into the two questions it really is: what *sign* is the answer, and how *big*
  is it? Kids who "can't do negatives" can nearly always do 3 × 4; what they
  lose track of is the sign, so the widget separates the two and answers
  neither until the student has. The size row prints whatever it is handed, so
  the same picture serves signed fractions unchanged — the argument it makes
  was never about integers, and −2/3 × 3/4 wants exactly the same split.
- **`areamodel`** — multiplying fractions. One square is one whole; the first
  fraction shades a strip of the width, the second a strip of the height, and
  the product is where they cross. It carries the two things students most
  often miss: why you multiply top-by-top and bottom-by-bottom (the grid holds
  `d1 × d2` pieces, the overlap `n1 × n2`), and why multiplying by a proper
  fraction makes the answer *smaller*.
- **`fitsmodel`** — dividing fractions. No area can show division, so this uses
  length: the dividend laid along a whole, then chopped into copies of the
  divisor and counted. Getting that idea first is what stops "flip the second
  one" being a spell.
- **`wholesmodel`** — improper fractions and mixed numbers. Each bar is one
  whole. Going *to* a mixed number, the ask shows one piece and says how many
  of them you have — laying them all out would be the answer. Going the other
  way, the wholes are drawn as **undivided blocks**: you can see two wholes and
  a third, but counting thirds means knowing a whole is three of them, which is
  the arithmetic.
- **`equivmodel`** — equivalent fractions and simplifying. The same length of
  bar cut into different pieces. Only the fraction you were *given* is drawn
  while the question is open; the second bar would let you count the answer
  straight off it, so it arrives with the reveal, aligned underneath, where
  both shadings stopping in the same place is the whole point. A third bar
  appears for the awkward case: `4/6 = ?/9` has no whole number to multiply
  by, so the route runs down through lowest terms and back up, and the picture
  draws that detour rather than captioning itself with a factor of 1.5.
- **`evalmodel`** — order of operations. The working written out line by line,
  each labelled with the rule that justified it. While the question is open
  only the first line shows — that line *is* the question; everything after it
  is the answer. The stepped lesson uses the same renderer with one more line
  each press, which is what makes a walkthrough of this skill worth having.
- **`plane`** — coordinates. An x/y grid with the marks a problem asks about;
  anything that would answer the question is withheld until one is committed,
  so the renderer is never handed the point it would otherwise plot.
- **`ratiomodel`** — ratio and proportion. One bar cut into every part with the
  first share shaded, so 3 : 5 is eight cells with three filled. One bar rather
  than two on purpose: bars drawn together are stacked and each flexes to the
  full width, so three parts and five parts would come out the same length — a
  picture of a ratio that gets the ratio wrong. Cutting one bar keeps the
  proportions honest and puts both readings on screen at once, 3 to 5 against
  the unshaded part and 3 of 8 against the whole, which is the confusion the
  skill exists to settle. It takes the same middle bar as `equivmodel` when
  neither ratio is a whole number of times the other. It was also the first
  entry to be an *adapter* over the shared segments primitive rather than a
  renderer of its own, which is what the naming lesson below was for.
- **`quantitymodel`** — a fraction of a quantity. The whole cut into the
  denominator's parts with the numerator's worth shaded, and what one part is
  worth withheld until an answer is in, since it is one multiplication from
  the answer. The second adapter, and it is drawn to look like the ratio bar
  deliberately: `3/8 × 24` and "they are in the ratio 3 : 5, how many of the
  24 are red" are one question in two notations, and a student shown two
  different diagrams learns them as two topics.
- **`comparemodel`** — comparing two fractions. The bar model's ask-state in
  a second job: two bars of identical length cut by their own denominators,
  because you cannot see whether a third beats three eighths unless the
  wholes are the same length. Recutting both into the common denominator *is*
  the answer — once the pieces match you only have to count them — so the
  recut bars arrive with the reveal.

  With `hold` it draws nothing at all until an answer is in. Two bars of the
  same length are too good a picture of this question: you can see which one
  reaches further without ever finding a common denominator, which is what
  the level with the picture is *for* and useless as a check that the method
  took. So the comparison is asked twice, with the bars and then without
  them, and in the held version the recut bars arrive afterwards as the
  explanation rather than as the method.
- **`barmodel`** — adding and subtracting fractions. Two bars of *identical*
  length, divided by their own denominators. That alignment is the point: it
  makes visible that a half and a third are different-sized pieces, which is
  the misconception behind `1/2 + 1/3 = 2/5`. Research consistently points at
  aligned rectangles rather than pie charts for exactly this — you cannot
  compare a third against three eighths by eye on a circle. On reveal both bars
  re-divide into the common denominator and a result bar appears.

They all obey the same rule: nothing derived from the answer is drawn until an
answer has been committed. It is structural rather than remembered — a schema
marks the answer-bearing fields and `visuals.js` strips them before the
renderer is called, so a renderer cannot leak a field it was never given.

## The number line

While a problem is being *asked*, only the first hop is drawn: `0 → a`. That
anchors where you start without handing over where you finish.

Once an answer is committed, the second hop is drawn from `a` to the result,
the answer lands as a gold dot, and a green tick or red cross says how it went.

This distinction matters. An earlier version drew the whole chain up front,
which quietly turned the teaching aid into an answer key — you could read the
result off the picture without doing any arithmetic.

## Getting back

Every screen inside a skill carries a breadcrumb trail — `Map / Integer Add &
Subtract / Adding Negatives` — and each part is clickable, from the run screen
and from the summary alike. Leaving a run part-way through still files it away
first, so nothing practised is ever lost by navigating away.

## Sound

Every sound is synthesised with the Web Audio API — no files to download,
nothing to go missing offline, and the whole palette costs a few hundred bytes
rather than a folder of samples.

| Moment | Sound |
|---|---|
| Countdown | three beeps at 660 Hz, then 990 Hz for *go* |
| Correct | two rising notes, 880 → 1319 Hz |
| Wrong | a short low buzz, 174 Hz |
| Final five seconds | a clock tick each second |
| Trial cleared | a rising four-note arpeggio |
| Ran out of time | two falling notes |

Two rules shape it. **Short** — these fire dozens of times a session, and
anything with a tail is unbearable by the twentieth problem. And the
wrong-answer sound is deliberately **soft**: a harsh buzzer every time a child
makes a mistake teaches them to fear the mistake, which is the opposite of what
Practice is for.

Mute lives in the top bar of every screen *including mid-run*, since that is
when you would most want it. It is stored per device rather than per account —
it is about the room you are sitting in — and the button suppresses mousedown
so it never pulls focus out of the answer field.

## Answer syntax

Committed to, and not to be revised casually: a notation a student half-learns
is worse than either alternative.

| meaning | typed as | also accepted |
|---|---|---|
| exponent | `x^2`, `x^(n+1)` | `x**2` |
| square root | `sqrt(2)` | `√2` |
| other roots | `root(3, x)` | |
| fraction | `1/2`, `(x+1)/2` | |
| multiplication | `2x`, `2(x+1)` | `2*x` |
| constants | `pi`, `e` | |
| absolute value | `abs(x)` | |
| grouping | `(` `)` | |

`^` rather than Python's `**` because `^` is what Desmos, WolframAlpha, a
TI-84 and LaTeX all use; Python is the outlier, and `**` is an easy thing to
meet later for someone who already understands `^`. Square brackets and braces
are deliberately not accepted as grouping — they are wanted for intervals and
sets.

Input is permissive, display is not. Several spellings are accepted and
exactly one is drawn, which is the same split the libraries already make: an
answer stores a list of acceptable forms and one canonical rendering.

### Structured entry, driven by the same keys

Most answers are typed into shaped fields rather than a single box — a
fraction has a numerator above a denominator, a power has a raised exponent.
That is not only kinder on a phone keyboard, where `^` sits two layers deep;
it puts the structure of the answer in front of the student, which for
notation being learned is part of the teaching.

The keys that move between those fields are the syntax itself. `/` moves from
numerator to denominator, `^` moves into the exponent, `sqrt` opens a radical.
So a student who types `3/4` or `2^5` gets the right shape without knowing
they typed anything, and the same keystrokes work later when the fields go
away. Nothing has to be unlearned.

### Where the scaffolding comes off

Shaped fields tell a student the shape of the answer, which is fine while the
shape is a property of the *level* — every answer on "Multiplying Powers" is a
single power, and one problem teaches that. It stops being fine when the shape
varies within a level, which is also usually a sign the level is doing two
things at once.

Unstructured entry is a skill in itself, and one worth having: a calculator,
Desmos and a physics problem set all want a typed expression. So a level may
declare `entry: 'free'` and take a single box instead. Used sparingly, and
late — the same move as the "All Together" level that removes the topic
scaffolding, applied to the input instead.

Free entry makes the `accept` list load-bearing: with shaped fields, `2^5` and
`32` are told apart by which box was filled, and in a single box they are two
strings that both have to be judged. That is the form-versus-value question
again, and `requireSimplest` already models it.

### Show what was understood, while it is being typed

Unstructured entry is unnerving because nothing tells you whether the system
read what you meant. So a level using `entry: 'free'` renders the input back
as notation while the student types.

**It renders structure, and never evaluates.** This is the rule the feature
lives or dies by:

| typed | renders | not |
|---|---|---|
| `2^1/2` | `2¹/2` | `√2` |
| `4/8` | `4/8` | `1/2` |
| `2+3` | `2+3` | `5` |

The first row is the whole point — it shows the exponent bound tightly, which
is the ambiguity worth surfacing. The other two are the trap. A preview that
simplifies or evaluates does the student's work and hands back the answer, and
it would be easy to build by accident: a parser that returns a *value* is more
natural to write than one that returns a faithful *tree*. The bug would look
like a nice feature until you noticed nobody was learning anything.

Rendering only what was typed also keeps the preview clear of reveal
discipline. It reflects the student's own input, so there is nothing in it to
leak.

It goes in a strip immediately above the answer box, not in the blank slot of
the prompt. Two reasons. The screen runs prompt, visual, input, keyboard, so
anything below the input can end up under the keyboard, and anything as far up
as the prompt is a real head-move while typing. And the blank slot already has
a job -- it is where the correct answer lands on reveal -- so putting live
input there would give one place two meanings, mutating from "what I typed"
into "what was right" at exactly the moment a student got it wrong.

While typing, be forgiving: `2^` is not an error, it is somebody mid-keystroke.
Hold the last thing that parsed, or show a muted placeholder. Never flash red
before submit -- a preview that scolds you while you are still typing teaches
people to stop looking at it.

The renderer for this already exists: `renderPrompt` turns terms into notation
today, so a parser emitting terms feeds it directly. The preview is the parser
plus a little wiring, and it doubles as the parser's test surface -- a page
listing input strings against their rendered interpretations, in the shape of
`web/dev/prompts.html`, is how precedence and grouping get verified before a
student meets them.

### One constraint on how small a field can be

The answer box is `clamp(1.6rem, 6vw, 2.2rem)` with 8px of padding — around 45
to 55px tall, comfortably above the 44px that counts as a reliable touch
target. A display exponent is set at `.55em`, which as an input would be 15 to
19px: too small to hit on a phone.

So an exponent field shrinks its *font* and raises its baseline, but keeps a
tappable box. The size ratio does the notational work; the target stays
fingerable.

## Keyboard first

The answer field keeps focus for the whole run: buttons suppress mousedown so
they can't steal it, clicking the card returns it, and any stray keystroke puts
it back. `Enter` submits, `Enter` again skips the reveal, `?` explains, `Esc`
quits. On the summary, `Enter` runs it again and `Esc` steps back.

## Measuring ability

The teacher console's **Ability by level** panel answers one question: how able
is this student, on a yardstick that is the same for everybody?

For each level, per student:

- **median** seconds on correct answers, against the level's fixed **standard**
- **their clock** — where the self-adjusting Time Trial gate has settled for
  them, and over how many trials
- **accuracy** — share of answers that were right
- a **trend**: one bar per day, green below the standard and red above it, with
  the standard drawn as a dashed line

Median rather than mean, deliberately: one interrupted problem produces a
400-second outlier that drags an average into nonsense.

The verdict chip reads `fast` / `at standard` / `near standard` /
`below standard`. Note what it is *not*: a warning that the clock is set wrong.
The clock corrects itself now, so that question answers itself. This is a
statement about the student.

The two numbers are different on purpose. A student's own clock adapts to them,
so it can never tell you whether they are strong or weak — everyone eventually
passes their own bar. The median against the fixed standard can, and it stays
comparable between siblings and across months.

## Roadmap

Skills the engine is built for but that aren't written yet: scientific
notation, sequences, functions, and then the three subjects the map declares
and nothing yet fills — geometry beyond coordinates, trigonometry, and chance
and data. Ratio and gradient are the rungs trigonometry stands on and both are
in, so that is the order to take them in.

Two things worth not repeating. Negatives were taught in the Integers category
and then never used again: for a long stretch the catalogue held tens of
thousands of problems across fractions, decimals, percents, ratio and
equations without a single negative answer among them, so a student drilled to
fluency on −7 + 3 had still never solved `x + 7 = 3`. Nothing caught it,
because every check asks whether a problem is well-formed or right and none of
them asks what the catalogue as a whole never does. A gap of that shape is
invisible to a test suite and shows up only by counting — which is worth doing
deliberately, now and then, along whichever axis a skill might have been
quarantined on.

The second is narrower and has the same cause. A skill can teach every idea
it names and still never present some ordinary *shape* of the problem, and a
student meeting that shape for the first time in an exam has effectively met
a new topic. Adding fractions never once summed to exactly one. Solving
equations never had an answer of nought. Nothing anywhere did arithmetic on a
mixed number, though a strategy level asked which form to use before dividing
2 1/2 by 2 — a judgement about an operation the catalogue could not perform.
None of these are bugs and no check will ever find them, because each level
does correctly what it says it does. They are found by asking, of a skill you
believe is finished, what it never asks.

Ideas parked for later: live head-to-head races over the LAN (the server is
already the right shape for it), a spaced-repetition "daily mix" across skills,
and cosmetic unlocks bought with XP.

A Survival mode (three lives, escalating difficulty) was built and then removed
when the mode list got too long. It's in the git history if it's ever wanted
back.
