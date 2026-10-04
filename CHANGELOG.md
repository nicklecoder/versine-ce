# Changelog

Versions are tagged on `main` as `vMAJOR.MINOR.PATCH`. The version describes the
API contract (`contract/`), since that is what any other server depends on:

- **MAJOR** — a server that passed the previous contract suite would fail the new one.
- **MINOR** — something added: skills, levels, optional contract suites, extension
  points with harmless defaults.
- **PATCH** — fixes.

Home installs keep following `main` through `scripts/update.sh`; a release is for
anyone who wants a known version, and these notes say what changed either way.

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
