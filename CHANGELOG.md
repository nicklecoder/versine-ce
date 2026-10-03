# Changelog

Versions are tagged on `main` as `vMAJOR.MINOR.PATCH`. The version describes the
API contract (`contract/`), since that is what any other server depends on:

- **MAJOR** — a server that passed the previous contract suite would fail the new one.
- **MINOR** — something added: skills, levels, optional contract suites, extension
  points with harmless defaults.
- **PATCH** — fixes.

Home installs keep following `main` through `scripts/update.sh`; a release is for
anyone who wants a known version, and these notes say what changed either way.

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
